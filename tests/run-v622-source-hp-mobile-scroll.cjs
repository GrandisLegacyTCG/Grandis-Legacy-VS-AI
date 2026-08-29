
'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const data=require('../data/season1/cards.runtime.v0.14.2.json');
const by=Object.fromEntries(data.cards.map(c=>[c.card_id,c]));
const hp={"S1-ARC-H001":90,"S1-ARC-H002":110,"S1-ARC-H003":130,"S1-WAR-H001":90,"S1-WAR-H002":120,"S1-WAR-H003":150,"S1-WAR-H004":100,"S1-WAR-H005":120,"S1-WAR-H006":150};
assert.strictEqual(data.canonical_registry_hash,'5d362f3c1dd785af82f12297d6ab1ecea4f6c43508a7b0f48319e846dd61139c');
for(const [id,v] of Object.entries(hp)) assert.strictEqual(by[id].hp,v,`${id} HP`);
for(const rel of ['../css/app.css','../tutorial/css/app.css']){const css=fs.readFileSync(require('path').join(__dirname,rel),'utf8');assert(css.includes('html.gl-mobile-game-scroll-active #app{'));assert(css.includes('overflow-y:auto!important'));assert(css.includes('touch-action:pan-x pan-y pinch-zoom!important'));assert(css.includes('#app::after'));assert(!css.includes('\\n'),'literal escaped newline remains in CSS');}
for(const rel of ['../js/app.bundle.js','../tutorial/js/app.bundle.js']){const app=fs.readFileSync(require('path').join(__dirname,rel),'utf8');assert(app.includes("document.getElementById('app')"));assert(app.includes('setMobileGameplayScrollMode(true)'));assert(!app.includes("document.addEventListener('touchmove'"),'native mobile touchmove must not be cancelled');}
assert.strictEqual(require('../package.json').version,'6.22.0');assert.strictEqual(require('../tutorial/package.json').version,'0.50.0');
console.log('PASS v6.22/v0.50 Source Stack v1.7.3 Hero HP + permanent #app mobile scroll contract');
