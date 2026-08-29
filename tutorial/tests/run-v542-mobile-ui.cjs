'use strict';
const fs=require('fs'),path=require('path');
const {loadLocalAI}=require('./vm-local-ai-harness.cjs');
const root=path.resolve(__dirname,'..');
const ctx=loadLocalAI(root);
const fn=ctx.GL_V542_MOBILE_UI_QA_SELF_TEST;
if(typeof fn!=='function')throw new Error('v5.42 mobile UI QA self-test missing');
const r=fn();
if(!r||r.ok!==true)throw new Error('v5.42 mobile UI QA failed: '+JSON.stringify(r));
const app=fs.readFileSync(path.join(root,'js/app.bundle.js'),'utf8');
const css=fs.readFileSync(path.join(root,'css/app.css'),'utf8');
const builder=fs.readFileSync(path.join(root,'deck-builder/css/app.css'),'utf8');
for(const token of [
  'racialTokensBesideMainDeck',
  'racialTokensVertical',
  'mobileFooterNoTrailingGap',
  'desktopMobileIsolation',
  'mobileHpCardAnchored'
]) if(!app.includes(token)) throw new Error('missing v5.42 QA token '+token);
if(!app.includes('mobileRacialResourceZone')||!app.includes('Racial-Token-Head.webp')||!app.includes('Racial-Token-Tail.webp'))throw new Error('Racial Tokens are not rendered by the mobile resource flow');
if(!css.includes('mobile-racial-token-stack')||!css.includes('grid-template-rows:repeat(2'))throw new Error('vertical Racial Token lock missing');
if(!css.includes('@media(min-width:761px)')||!css.includes('.v96-app .mobile-player-footer')||!css.includes('.v96-app .desktop-player-footer{display:flex'))throw new Error('desktop/mobile isolation guard missing');
if(!css.includes('.v96-app .gl-app{padding-bottom:0!important'))throw new Error('mobile footer trailing gap removal missing');
if(!css.includes('padding:22px 3px 2px')||!css.includes('width:18px!important;height:18px'))throw new Error('compact mobile Hero controls missing');
if(!builder.includes('width:120px')||!builder.includes('Deck Builder v2.1'))throw new Error('Deck Builder v2.1 Formation preview lock missing');
console.log('PASS Grandis Legacy VS AI v5.42 mobile compaction, Main Deck Racial Tokens, footer flow, and desktop isolation.');
console.log(JSON.stringify(r));
