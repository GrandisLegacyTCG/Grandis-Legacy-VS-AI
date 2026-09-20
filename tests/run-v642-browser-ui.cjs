'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert'),{spawn,spawnSync}=require('child_process');
const ROOT=path.resolve(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function findChrome(){for(const c of ['chromium','chromium-browser','google-chrome','google-chrome-stable']){const r=spawnSync('bash',['-lc',`command -v ${c}`],{encoding:'utf8'});if(r.status===0&&r.stdout.trim())return r.stdout.trim();}throw new Error('Chromium/Chrome is required for the v6.42 browser UI verification.');}
class CDP{
  constructor(ws){this.ws=ws;this.id=0;this.wait=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&this.wait.has(m.id)){this.wait.get(m.id)(m);this.wait.delete(m.id);}};}
  send(method,params={}){return new Promise((resolve,reject)=>{const id=++this.id;this.wait.set(id,resolve);this.ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(this.wait.has(id)){this.wait.delete(id);reject(new Error('CDP timeout: '+method));}},30000);});}
  async eval(expr){const r=await this.send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});if(r.result&&r.result.exceptionDetails)throw new Error('Browser eval failed: '+JSON.stringify(r.result.exceptionDetails));return r.result&&r.result.result&&r.result.result.value;}
}
(async()=>{
  const chromePath=findChrome(),port=9237,profile='/tmp/grandis-v642-browser-profile';fs.rmSync(profile,{recursive:true,force:true});
  const chrome=spawn(chromePath,['--headless=new','--no-sandbox','--disable-gpu',`--user-data-dir=${profile}`,`--remote-debugging-port=${port}`,'--remote-allow-origins=*','about:blank'],{stdio:'ignore'});
  let ws=null;
  try{
    let tabs=null;for(let i=0;i<80;i++){try{const res=await fetch(`http://127.0.0.1:${port}/json`);tabs=await res.json();if(tabs&&tabs.length)break;}catch{}await sleep(100);}if(!tabs||!tabs.length)throw new Error('Could not connect to headless Chromium DevTools endpoint.');
    ws=new WebSocket(tabs[0].webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});const c=new CDP(ws);await c.send('Runtime.enable');await c.send('Page.enable');await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
    let html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8').replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi,'');
    await c.eval('document.open();document.write('+JSON.stringify(html)+');document.close();');
    const css=['shared-app/app.css','shared-app/battlefield-authority.css','shared-ui/battlefield-ui.css'].map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n');
    await c.eval("(()=>{const s=document.createElement('style');s.textContent="+JSON.stringify(css)+";document.head.appendChild(s);return true;})()");
    await c.eval(`window.GL_APP_MODE='LOCAL_AI'; window.__GL_PHYSICAL_DEVICE_FAMILY='desktop'; const __glNativeMM=window.matchMedia.bind(window); window.matchMedia=(q)=>{ if(String(q).includes('hover: none')||String(q).includes('pointer: coarse')) return {matches:false,media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}}; return __glNativeMM(q); };`);
    for(const f of ['shared-ui/battlefield-ui.js','js/static-data.js','js/runtime-authority.js','shared-app/active-starters.js','shared-app/app.bundle.js','js/mobile-app-nav.js']){const src=fs.readFileSync(path.join(ROOT,f),'utf8');const r=await c.send('Runtime.evaluate',{expression:src+`\n//# sourceURL=${f}`});if(r.result&&r.result.exceptionDetails)throw new Error('Browser script error '+f+': '+JSON.stringify(r.result.exceptionDetails));}
    await sleep(100);
    assert((await c.eval('document.body.classList.contains("gl-ui-desktop")'))===true,'desktop responsive mode not active');
    assert((await c.eval('!!document.querySelector("#startMatchButton")'))===true,'pre-match Deck Setup must remain present');
    await c.eval('GL_LOCAL_AI_BRIDGE.startSharedMatch({}); GL_LOCAL_AI_BRIDGE.completeOpeningFlow("PLAYER",{choice:"HEADS",outcome:"HEADS",firstPlayer:"PLAYER",completed:true}); GL_LOCAL_AI_BRIDGE.importSnapshot(GL_LOCAL_AI_BRIDGE.getSnapshot(),{skipImportAnimations:true}); true');
    await sleep(100);
    assert((await c.eval('document.querySelectorAll(".hand-card[data-card-id]").length'))>0,'opening Hand did not render in browser');
    assert.strictEqual(await c.eval('!!document.getElementById("deckSetupButton")'),false,'battlefield Deck Setup button must be absent');
    const hero=await c.eval(`(()=>{const el=document.querySelector('.hero-panel[data-side="PLAYER"] [data-preview]'); if(!el)return null;el.dispatchEvent(new PointerEvent('pointerenter',{pointerType:'mouse'}));const z=document.getElementById('hoverCardZoom'),r=z.getBoundingClientRect();return{hidden:z.hidden,left:r.left,right:r.right,width:r.width,height:r.height,pointer:getComputedStyle(z).pointerEvents,vw:innerWidth,count:document.querySelectorAll('#hoverCardZoom').length,src:document.getElementById('hoverCardZoomImage').src};})()`);
    assert(hero&&!hero.hidden,'Hero hover preview did not open');assert.strictEqual(hero.width,250);assert.strictEqual(hero.height,350);assert(hero.left>hero.vw/2,'desktop preview is not on the right-side UI region');assert.strictEqual(hero.pointer,'none');assert.strictEqual(hero.count,1);
    assert.strictEqual(await c.eval(`(()=>{const el=document.querySelector('.hero-panel[data-side="PLAYER"] [data-preview]');el.dispatchEvent(new PointerEvent('pointerleave',{pointerType:'mouse'}));return document.getElementById('hoverCardZoom').hidden;})()`),true,'Hero source mouseleave did not hide preview immediately');
    const hand=await c.eval(`(()=>{const cards=[...document.querySelectorAll('.hand-card[data-card-id]')];const el=cards[0];el.dispatchEvent(new PointerEvent('pointerenter',{pointerType:'mouse'}));const z=document.getElementById('hoverCardZoom'),img=document.getElementById('hoverCardZoomImage'),first=img.src,r=z.getBoundingClientRect();if(cards[1]){cards[0].dispatchEvent(new PointerEvent('pointerleave',{pointerType:'mouse'}));cards[1].dispatchEvent(new PointerEvent('pointerenter',{pointerType:'mouse'}));}return{hidden:z.hidden,left:r.left,width:r.width,pointer:getComputedStyle(z).pointerEvents,first,second:img.src};})()`);
    assert(hand&&!hand.hidden&&hand.left>700&&hand.width===250&&hand.pointer==='none','Hand desktop right-side preview contract failed');
    if(hand.first&&hand.second)assert.notStrictEqual(hand.first,hand.second,'Card A -> Card B hover did not update preview image');
    assert.strictEqual(await c.eval(`(()=>{const cards=[...document.querySelectorAll('.hand-card[data-card-id]')];const el=cards[1]||cards[0];el.dispatchEvent(new PointerEvent('pointerleave',{pointerType:'mouse'}));return document.getElementById('hoverCardZoom').hidden;})()`),true,'Current Hand source mouseleave did not hide preview immediately');

    // Exercise the remaining readable face-up preview sources through actual rendered DOM.
    await c.eval(`(()=>{
      const snap=GL_LOCAL_AI_BRIDGE.getSnapshot(),s=snap.appState;
      s.playerHeroes.LEFT={card_id:'S1-WAR-L001',side:'PLAYER',lane:'LEFT',mode:'LEGACY',legacy_mode:true,active_legacy_card_id:'S1-WAR-L001',hp:1,maxHp:1,exhausted:false,exp_cards:[],exp_total:0,attachments:[null,null],statuses:[],defeated_hero_snapshot:{card_id:'S1-WAR-H001',hp:0,maxHp:100,attachments:[null,null],statuses:[]}};
      s.playerHeroes.CENTER.attachments=['S1-ARC-013',null];
      s.playerHeroes.RIGHT.attachments=['S1-MAG-010',null];
      s.activeAttachments=[
        {attachment_id:'BROWSER_ATT',card_id:'S1-ARC-013',side:'PLAYER',lane:'CENTER',slot:0,remaining_count:2},
        {attachment_id:'BROWSER_CAST',card_id:'S1-MAG-010',side:'PLAYER',lane:'RIGHT',slot:0,remaining_count:1}
      ];
      s.pendingCastings=[{card_id:'S1-MAG-010',side:'PLAYER',source_lane:'RIGHT',original_source_lane:'RIGHT',target_side:'AI',target_lane:'CENTER',locked_target_lane:'CENTER',attachmentSlot:0,counters:1}];
      const played={id:'browser-played-1',card_id:'S1-WAR-001',title:'Rage Swing',label:'ATK',timestamp:Date.now(),source_side:'PLAYER',source_lane:'CENTER',target_side:'AI',target_lane:'CENTER'};
      s.playerPlayedEvents=[played];
      s.pvpActionEventsBySide=s.pvpActionEventsBySide||{PLAYER:[],AI:[]};s.pvpActionEventsBySide.PLAYER=[played];
      return GL_LOCAL_AI_BRIDGE.importSnapshot(snap,{skipImportAnimations:true});
    })()`);
    await sleep(100);
    async function verifyPreviewSource(selector,label){
      const result=await c.eval(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return{missing:true};el.dispatchEvent(new PointerEvent('pointerenter',{pointerType:'mouse'}));const z=document.getElementById('hoverCardZoom'),img=document.getElementById('hoverCardZoomImage'),r=z.getBoundingClientRect();const opened={missing:false,hidden:z.hidden,left:r.left,width:r.width,height:r.height,pointer:getComputedStyle(z).pointerEvents,src:img.src,alt:img.alt};el.dispatchEvent(new PointerEvent('pointerleave',{pointerType:'mouse'}));opened.hiddenAfterLeave=z.hidden;return opened;})()`);
      assert(result&&!result.missing,label+' preview source did not render');
      assert.strictEqual(result.hidden,false,label+' hover preview did not open');
      assert(result.left>700,label+' preview did not use right-side region');
      assert.strictEqual(result.width,250,label+' preview width mismatch');
      assert.strictEqual(result.height,350,label+' preview height mismatch');
      assert.strictEqual(result.pointer,'none',label+' preview must not capture pointer events');
      assert.strictEqual(result.hiddenAfterLeave,true,label+' source mouseleave did not hide immediately');
      return result;
    }
    await verifyPreviewSource('.hero-panel[data-side="PLAYER"][data-lane="LEFT"] .hero-main[data-preview="S1-WAR-L001"]','Legacy');
    await verifyPreviewSource('.slot[data-attachment-side="PLAYER"][data-attachment-lane="CENTER"] [data-preview="S1-ARC-013"]','Attachment');
    await verifyPreviewSource('.slot[data-attachment-side="PLAYER"][data-attachment-lane="RIGHT"] [data-preview="S1-MAG-010"]','Casting');
    await verifyPreviewSource('.combined-played-card[data-preview="S1-WAR-001"]','Card Played');
    const shardPreview=await verifyPreviewSource('.gl-lab-mana-card[data-mana-side="PLAYER"][data-shard-preview-src]','Face-up Shard');
    assert(shardPreview.src,'Face-up Shard preview has no image source');
    assert.strictEqual(await c.eval(`document.querySelectorAll('.gl-lab-mana-card[data-mana-side="AI"][data-shard-preview-src]').length`),0,'Opponent hidden Shard identity was exposed through preview metadata');

    async function mode(family,w,h,expectClass){await c.send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:family!=='desktop'});await c.eval(`window.__GL_PHYSICAL_DEVICE_FAMILY=${JSON.stringify(family)};window.dispatchEvent(new Event('resize'));true`);await sleep(120);assert.strictEqual(await c.eval(`document.body.classList.contains(${JSON.stringify(expectClass)})`),true,`${family} ${w}x${h} responsive class missing`);}
    await mode('mobile',390,844,'gl-ui-mobile');
    await mode('tablet',820,1180,'gl-tablet-portrait-mobile');
    await mode('tablet',1180,820,'gl-tablet-landscape-desktop');
    console.log('PASS Chromium browser UI: actual v6.42 DOM renders right-side 250x350 non-interactive hover preview with immediate mouseleave, pre-match Deck Setup preserved/battlefield button removed, and phone/tablet responsive modes retained.');
  } finally {try{if(ws)ws.close();}catch{}chrome.kill('SIGTERM');}
})().then(()=>process.exit(0)).catch(err=>{console.error(err&&err.stack||err);process.exit(1);});
