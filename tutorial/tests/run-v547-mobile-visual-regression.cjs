const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'js/app.bundle.js'),'utf8');
const css=fs.readFileSync(path.join(root,'css/app.css'),'utf8');
function need(ok,msg){if(!ok)throw new Error(msg)}
need(app.includes('bindMobileHandLongPress'),'Android custom long-press binding missing');
need(app.includes("el.addEventListener('contextmenu',function(ev){ev.preventDefault();})"),'Hand context-menu suppression missing');
need(app.includes('prepareImageForPaint(img).then(function(){nextVisualFrame(startVisualAnimation);});'),'Single card motion does not wait for decode');
need(app.includes('Promise.all(prepared.map(function(entry){return entry.ready;}))'),'Parallel card motion does not wait for decode');
need(app.includes('installVisualDecodeObserver(); preloadCriticalVisualAssets(); render(); bind();'),'Decode observer/preload boot order missing');
need(app.includes('Racial-Token-Head.webp')&&app.includes('Racial-Token-Tail.webp'),'Optimized Racial Token assets not referenced');
need(!app.includes('Racial-Token-Head.png')&&!app.includes('Racial-Token-Tail.png'),'Old Racial Token PNG references remain');
need(css.includes('Opponent only: restore the compact fan'),'Mobile opponent fan lock missing');
need(css.includes('margin-left:var(--fan-overlap)!important'),'Opponent fan overlap missing');
need(css.includes('.v96-app .zone--mana em{')&&css.includes('bottom:2px!important'),'Mobile Mana Regen raised/pinned rule missing');
need(css.includes('.v96-app .hand-card .hand-art img{')&&css.includes('pointer-events:none!important'),'Android image callout prevention missing');
need(css.includes('.gl-decode-pending{visibility:hidden!important}'),'Decode-before-display visibility lock missing');
for(const file of ['assets/cards/ui/Racial-Token-Head.webp','assets/cards/ui/Racial-Token-Tail.webp']){
  const stat=fs.statSync(path.join(root,file));
  need(stat.size<100000,`${file} is not optimized (${stat.size} bytes)`);
}
need(!fs.existsSync(path.join(root,'assets/cards/ui/Racial-Token-Head.png')),'Old Head PNG still packaged');
need(!fs.existsSync(path.join(root,'assets/cards/ui/Racial-Token-Tail.png')),'Old Tail PNG still packaged');
console.log('PASS v5.47 Android/mobile visual regression');
