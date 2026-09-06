'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const data=require(path.join(root,'data/season1/cards.runtime.v0.14.3.json'));
const by=Object.fromEntries(data.cards.map(c=>[c.card_id,c]));
const hp={"S1-ARC-H001":90,"S1-ARC-H002":110,"S1-ARC-H003":130,"S1-WAR-H001":90,"S1-WAR-H002":120,"S1-WAR-H003":150,"S1-WAR-H004":100,"S1-WAR-H005":120,"S1-WAR-H006":150};
assert.strictEqual(data.canonical_registry_hash,'eb89ea56f2351f093fffbd7f7e47628f1cf0cd2b793c6efdfb82c9c9e798b868');
for(const [id,v] of Object.entries(hp))assert.strictEqual(by[id].hp,v,`${id} HP authority changed`);
for(const rel of ['css/app.css','tutorial/css/app.css']){
  const css=fs.readFileSync(path.join(root,rel),'utf8');
  assert(css.includes('native document scrolling'),'native document scroll marker missing');
  assert(css.includes('html.gl-mobile-game-scroll-active #app{'));
  assert(css.includes('height:auto!important')&&css.includes('overflow:visible!important'),'#app must remain in document flow');
  assert(css.includes('.hand-area--player .handPanel')&&css.includes('touch-action:pan-x pan-y!important'),'Hand touch contract missing');
  assert(!css.includes('touch-action:pan-x pan-y pinch-zoom!important'),'pinch zoom remains in mobile touch contract');
  assert(!css.includes('height:var(--gl-mobile-viewport-height'),'custom mobile viewport scroller remains');
  assert(css.includes('@media(min-width:761px){html.gl-animation-scroll-locked,body.gl-animation-scroll-locked'),'animation page lock must be desktop-only');
  assert(css.includes('body.gl-animation-scroll-locked{overflow-x:clip!important;overflow-y:visible!important'),'stale mobile animation lock must not create nested body scroller');
}
for(const rel of ['js/app.bundle.js','tutorial/js/app.bundle.js']){
  const app=fs.readFileSync(path.join(root,rel),'utf8');
  assert(app.includes('document.scrollingElement||document.documentElement||document.body'),'native document scroller missing');
  assert(!app.includes("function mobileGameplayScroller(){if(typeof document==='undefined')return null;return document.getElementById('app');}"),'#app still owns mobile page scroll');
  assert(!app.includes("document.addEventListener('touchmove'"),'global touchmove preventDefault hook must remain absent');
  assert(app.includes("if(isMobileViewport()){\n      GL_ANIMATION_SCROLL_LOCKED=false;"),'mobile animation lock must be purged defensively');
}
for(const rel of ['index.html','tutorial/index.html']){
  const html=fs.readFileSync(path.join(root,rel),'utf8');
  assert(html.includes('maximum-scale=1')&&html.includes('user-scalable=no'),'gameplay pinch zoom is not disabled');
  assert(html.includes('favicon.png'),'Grandis favicon missing');
}
function deck(rel){return JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));}
const s1=deck('starter_deck_examples/starter_01_elemental_lord_conqueror_renegade_GL_DECK_1_0.json');
const s2=deck('starter_deck_examples/starter_02_saint_crusader_grand_ranger_GL_DECK_1_0.json');
assert.strictEqual(s1.main_deck.reduce((n,x)=>n+x.quantity,0),60);assert.strictEqual(s2.main_deck.reduce((n,x)=>n+x.quantity,0),60);
const c2=Object.fromEntries(s2.main_deck.map(x=>[x.card_id,x.quantity]));assert.strictEqual(c2['S1-ARC-006'],1);assert.strictEqual(c2['S1-ARC-014'],1);
assert(String(s1.format).includes('Starter60 v1.4')&&String(s2.format).includes('Starter60 v1.4'));
assert.strictEqual(require('../package.json').version,'6.29.0');assert.strictEqual(require('../tutorial/package.json').version,'0.55.0');
console.log('PASS v6.23/v0.51 native mobile document scrolling + Starter60 v1.4 replacement + Source Stack v1.7.4 HP guard');
