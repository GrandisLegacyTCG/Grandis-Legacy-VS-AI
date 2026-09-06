
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
for(const base of [root,path.join(root,'tutorial')]){
  const app=fs.readFileSync(path.join(base,'js/app.bundle.js'),'utf8');
  const css=fs.readFileSync(path.join(base,'css/app.css'),'utf8');
  assert.ok(app.includes("var expCards=(hero&&Array.isArray(hero.exp_cards)?hero.exp_cards:[]).slice(0,4);"),'EXP rail must read exact hero.exp_cards and cap visual slots at 4');
  assert.ok(app.includes("value=tributeExpValue(expCard)>=200?200:100"),'100/200 EXP strip selection must derive from actual EXP-card value');
  assert.ok(app.includes('hero-card-composition'),'Hero + EXP rail structural composition missing');
  assert.ok(app.includes('assets/exp/Stack-100-EXP.png')&&app.includes('assets/exp/Stack-200-EXP.png'),'EXP strip assets not referenced');
  assert.ok(css.includes('grid-template-columns:max-content 28px!important'),'EXP rail width must be reserved before any Tribute occurs');
  assert.ok(css.includes('grid-template-columns:repeat(4,7px)!important'),'EXP rail must expose exactly four fixed slots');
  assert.ok(css.includes('align-self:stretch!important'),'EXP rail must match Hero-card composition height');
  assert.ok(!css.includes('.hero-stage.has-exp'),'Old dynamic has-exp padding layout remains');
  assert.ok(fs.existsSync(path.join(base,'assets/exp/Stack-100-EXP.png'))&&fs.existsSync(path.join(base,'assets/exp/Stack-200-EXP.png')),'EXP assets missing from consumer package');
}
console.log('PASS VS AI v6.27 / Tutorial v0.53: Tribute EXP uses a fixed four-slot physical 100/200 EXP rail beside the Hero, driven by exact EXP card instances.');
