'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
for(const base of [root,path.join(root,'tutorial')]){
  const app=fs.readFileSync(path.join(base,'js/app.bundle.js'),'utf8');
  const css=fs.readFileSync(path.join(base,'css/app.css'),'utf8');
  assert.ok(app.includes("hero-card-physical-stack '+(h.exhausted?'is-exhausted':'is-ready')+'"),'Hero physical-stack Exhaust state binding missing');
  assert.ok(!app.includes("h.exhausted?'exhausted-card'"),'Hero image must no longer own Exhaust rotation independently of EXP');
  assert.ok(app.includes("composition.querySelector('.hero-card-physical-stack>.hero-card.hero-main>img.heroImg')"),'EXP geometry must measure the Hero inside the shared physical stack');
  assert.ok(css.includes('.v96-app .hero-card-physical-stack.is-exhausted{')&&css.includes('transform:rotate(-90deg) scale(.86)!important'),'shared Hero+EXP Exhaust transform missing');
  assert.ok(css.includes('.v96-app .hero-card-physical-stack>.hero-exp-stack{'),'EXP rail must be physically parented to the shared Exhaust transform group');
  assert.ok(css.includes('position:absolute!important')&&css.includes('left:100%!important'),'EXP rail must stay attached to the Hero right edge before group rotation');
  assert.ok(css.includes('grid-template-columns:max-content 28px!important'),'outer composition must reserve the four-slot EXP width before Tribute');
  assert.ok(app.includes("</button>'+expStack+'</div>'+health+'</div>"),'HP overlay must remain outside the rotating physical stack');
}
console.log('PASS VS AI v6.29 / Tutorial v0.55: Hero artwork + EXP rail rotate as one physical stack on Exhaust; HP/status presentation remains upright.');
