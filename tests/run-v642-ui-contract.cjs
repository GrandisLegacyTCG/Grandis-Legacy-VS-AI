'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');
const must=(v,m)=>{if(!v)throw new Error(m)};
const read=r=>fs.readFileSync(path.join(ROOT,r),'utf8');
const ctx={};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);vm.runInContext(read('shared-ui/battlefield-ui.js'),ctx,{filename:'shared-ui/battlefield-ui.js'});
const ui=ctx.GL_SHARED_BATTLEFIELD_UI;
must(ui&&ui.version==='v2.53','Shared Battlefield UI v2.53 missing');
must(ui.visual_baseline==='VS AI v6.42','visual baseline must remain VS AI v6.42');
must(ui.previewPointerEvents==='none','preview pointer contract must be none');
must(ui.counterAssetScope==='mana-regen-only','Counter assets must remain Mana Regen-only');
must(ui.deckCountPresentation==='compact-top-corner-badge','deck/pile count presentation mismatch');
must(ui.statusCountPresentation==='individual-bottom-right-badge','Status badge presentation mismatch');
must(ui.attachmentCountPresentation==='compact-top-corner-badge','Attachment badge presentation mismatch');
must(ui.warningPresentation==='persistent-icon-hover-detail','warning presentation mismatch');
for(const [w,h,protectedBottom] of [[1440,900,310],[1280,800,270],[1600,1000,340]]){
  const p=ui.desktopPreviewPosition(w,h,250,350,protectedBottom);
  must(p.x>=8&&p.y>=8&&p.x+250<=w-8+1&&p.y+350<=h-8+1,`field preview out of viewport ${w}x${h}`);
  must(p.x>w/2,`field preview not in lower-right region ${w}x${h}`);
  must(p.y>=protectedBottom+11,`field preview overlaps protected Turn/Phase/Next-Phase region ${w}x${h}: ${p.y} < ${protectedBottom}`);
}
const played=ui.cardPlayedPreviewPosition({left:1160,right:1240,top:390,bottom:500,width:80,height:110},1440,900,250,350);
must(played.x+250<=1160,'Card Played preview must prefer LEFT of Card Played');
const modalLeft=ui.contextualPreviewPosition({left:120,right:220,top:280,bottom:420,width:100,height:140},1440,900,250,350);
must(modalLeft.placement==='right','left-side modal card must prefer RIGHT contextual preview');
const modalRight=ui.contextualPreviewPosition({left:1180,right:1280,top:280,bottom:420,width:100,height:140},1440,900,250,350);
must(modalRight.placement==='left','right-side modal card must prefer LEFT contextual preview');
const modalAbove=ui.contextualPreviewPosition({left:610,right:710,top:500,bottom:640,width:100,height:140},900,800,400,300);
must(['above','below','left','right'].includes(modalAbove.placement),'contextual preview returned invalid placement');
must(modalAbove.x>=8&&modalAbove.y>=8&&modalAbove.x+400<=892&&modalAbove.y+300<=792,'contextual preview must clamp into viewport');
const css=read('shared-ui/battlefield-ui.css')+'\n'+read('shared-app/app.css');
must(/is-v253-readable-preview\{[^}]*pointer-events:none!important/i.test(css),'v2.53 readable preview CSS must be non-interactive');
must(/width:250px!important/.test(css)&&/height:350px!important/.test(css),'desktop preview must remain 250x350');
must(/\.gl-count-badge,.gl-status-count,.gl-attachment-count\{/.test(css),'shared compact badge family missing');
must(/negative-status-indicator \.gl-status-count\{[^}]*bottom:-5px/i.test(css),'per-Status bottom-right badge placement missing');
must(/slot\.filled>\.gl-attachment-count\{[^}]*top:-7px/i.test(css),'Attachment top-corner badge placement missing');
for(const rel of ['index.html','tutorial/index.html']){
  const h=read(rel);
  must(/shared-ui\/battlefield-ui\.js/.test(h),rel+' missing shared UI JS');
  must(/shared-ui\/battlefield-ui\.css/.test(h),rel+' missing shared UI CSS');
  must(/shared-app\/app\.bundle\.js/.test(h),rel+' does not consume the shared application source');
  must(/shared-app\/app\.css/.test(h),rel+' does not consume shared common battlefield CSS');
  must(/shared-app\/battlefield-authority\.css/.test(h),rel+' missing neutral battlefield authority stylesheet');
  must(!/lab-authority\.css/.test(h),rel+' still loads retired Playtest Lab stylesheet name');
}
const sharedApp=read('shared-app/app.bundle.js'),deployment=read('shared-app/active-starters.js')+sharedApp;
must(read('js/app.bundle.js')===deployment&&read('tutorial/js/app.bundle.js')===deployment,'generated app deployment mirrors drift from active-starter prelude + one editable shared source');
must(read('css/app.css')===read('shared-app/app.css')&&read('tutorial/css/app.css')===read('shared-app/app.css'),'generated common CSS mirrors drift from one editable shared source');
for(const rel of ['shared-app/app.bundle.js','js/app.bundle.js','tutorial/js/app.bundle.js']){
  const s=read(rel);
  must(s.includes('v253OpenDesktopPreview'),'v2.53 universal preview implementation missing in '+rel);
  must(s.includes('v253BindDelegatedReadablePreview'),'dynamic modal/list preview delegation missing in '+rel);
  must(s.includes("anchor,'card-played'"),'Card Played LEFT special preview path missing in '+rel);
  must(s.includes("box.style.pointerEvents='none'"),'preview pointer-events runtime guard missing in '+rel);
  must(s.includes("pointerleave',function(ev){if(!ev||ev.pointerType!=='touch')v94HoverZoomHide();"),'source-card immediate mouseleave missing in '+rel);
  must(!s.includes('id="deckSetupButton"')&&!s.includes('id="mobileDeckSetupButton"'),'battlefield Deck Setup button markup still active in '+rel);
  must(s.includes('showDeckSetup()')&&s.includes("$('startFromControl')"),'pre-match Deck Setup system missing in '+rel);
  must(s.includes('gl-count-badge gl-resource-count'),'compact deck/pile numeric badge renderer missing in '+rel);
  must(s.includes('gl-status-count'),'individual Status badge renderer missing in '+rel);
  must(s.includes('gl-attachment-count'),'Attachment badge renderer missing in '+rel);
  must(!/gl-status-die/.test(s),'Status still uses graphical Counter asset in '+rel);
}
console.log('PASS Shared Battlefield UI v2.53: lower-right protected field preview, Card Played left preview, contextual modal preview, shared compact badges, persistent warning contract, and one-source deployment parity.');
