'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
for(const base of [root,path.join(root,'tutorial')]){
  const app=fs.readFileSync(path.join(base,'js/app.bundle.js'),'utf8');
  const css=fs.readFileSync(path.join(base,'css/app.css'),'utf8');
  assert.ok(app.includes("hero-card-physical-stack '+(h.exhausted?'is-exhausted':'is-ready')+'"),'Hero orientation state binding missing');
  assert.ok(app.includes("visibleW=Math.min(boxW,boxH*(naturalW/naturalH))"),'visible Hero width geometry missing');
  assert.ok(app.includes("--gl-exp-exhausted-stack-width"),'Exhausted EXP width synchronization missing');
  assert.ok(app.includes("--gl-exp-exhausted-half-height"),'Exhausted Hero upper-edge synchronization missing');
  assert.ok(css.includes('.v96-app .hero-card-physical-stack.is-exhausted>.hero-card.hero-main{')&&css.includes('transform:rotate(-90deg) scale(.86)!important'),'only Hero artwork must rotate on Exhaust');
  assert.ok(!css.includes('.v96-app .hero-card-physical-stack.is-exhausted{\n  transform:rotate(-90deg)'),'whole physical group must not be blindly rotated');
  assert.ok(css.includes('.v96-app .hero-card-physical-stack.is-exhausted>.hero-exp-stack{'),'Exhausted EXP layout missing');
  assert.ok(css.includes('bottom:calc(50% + var(--gl-exp-exhausted-half-height,0px))!important'),'EXP rail must anchor to the visual Hero upper edge');
  assert.ok(css.includes('flex-direction:column-reverse!important'),'Exhausted EXP slots must stack bottom-to-top');
  assert.ok(css.includes('.v96-app .hero-card-physical-stack.is-exhausted .hero-exp-slot::before{')&&css.includes('rotate(-90deg)!important'),'EXP card edge artwork must rotate horizontal on Exhaust');
  assert.ok(css.includes('grid-template-columns:max-content 28px!important'),'four-slot width must remain reserved before Tribute');
  assert.ok(css.includes('.v96-app .hero-card-physical-stack.is-ready>.hero-exp-stack{')&&css.includes('left:100%!important'),'Ready EXP must remain on Hero right edge');
}
console.log('PASS VS AI v6.30 / Tutorial v0.56: Ready EXP stays right; Exhausted EXP anchors above Hero and stacks bottom-to-top.');
