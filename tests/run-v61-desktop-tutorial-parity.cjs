'use strict';
const fs=require('fs');
const assert=require('assert');
const read=p=>fs.readFileSync(p,'utf8');
const vs=read('css/app.css'), tut=read('tutorial/css/app.css'), app=read('js/app.bundle.js'), tapp=read('tutorial/js/app.bundle.js');
for(const [name,css] of [['VS AI',vs],['Tutorial',tut]]){
  assert.ok(css.includes('@media(max-width:1450px)'),name+' missing approved 1440 desktop anchor breakpoint');
  assert.ok(css.includes('width:min(100vw,1920px)'),name+' missing centered 1920 desktop cap');
  assert.ok(css.includes('.v96-app .hand-card .mini-action{height:18px!important;min-height:18px!important;flex-basis:18px!important}'),name+' desktop PLAY/TRIBUTE is not 18px');
  assert.ok(css.includes('.v96-app .hand-card .mini-action{height:16px!important;min-height:16px!important;flex:0 0 16px!important}'),name+' mobile PLAY/TRIBUTE is not 16px');
}
assert.ok(!vs.includes('Desktop adaptive-fit policy'),'VS AI must keep v6 standard desktop composition, not legacy transform scaling');
assert.ok(!tut.includes('Desktop adaptive-fit policy'),'Tutorial legacy adaptive-fit drift remains');
assert.ok(tapp.includes('var GL_BATTLE_FEEDBACK_QUEUE=')&&tapp.includes('var GL_CASTING_PAIR_COLORS='),'Tutorial missing VS AI presentation parity engines');
assert.ok(app.includes('https://grandislegacytcg.github.io/pvp/'),'VS AI PvP navigation does not use public frontend');
console.log('PASS VS AI v6.3 / Tutorial v0.40 desktop standards, Hand actions, and presentation parity');
