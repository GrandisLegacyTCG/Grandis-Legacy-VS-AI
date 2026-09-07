'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
for(const base of [root,path.join(root,'tutorial')]){
  const app=fs.readFileSync(path.join(base,'js/app.bundle.js'),'utf8');
  const css=fs.readFileSync(path.join(base,'css/app.css'),'utf8');
  assert.ok(app.includes("var expCards=(hero&&Array.isArray(hero.exp_cards)?hero.exp_cards:[]).slice(0,4);"),'EXP rail must read exact hero.exp_cards and cap visual slots at 4');
  assert.ok(app.includes("value=tributeExpValue(expCard)>=200?200:100"),'100/200 EXP sprite selection must derive from actual EXP-card value');
  assert.ok(app.includes('v628SyncHeroExpStackGeometry'),'Hero artwork-height synchronization missing');
  assert.ok(app.includes("visibleH=Math.min(boxH,boxW*(naturalH/naturalW))"),'EXP height must use actual contained Hero artwork, not the taller object-fit box');
  assert.ok(!app.includes('Stack-100-EXP.png')&&!app.includes('Stack-200-EXP.png'),'obsolete split EXP asset references remain');
  assert.ok(css.includes('grid-template-columns:max-content 28px!important'),'EXP rail width must remain reserved before Tribute');
  assert.ok(css.includes('grid-template-columns:repeat(4,7px)!important'),'EXP rail must expose exactly four fixed slots');
  assert.ok(css.includes('height:var(--gl-exp-stack-height,100%)!important'),'EXP rail must consume synchronized visible-Hero height');
  assert.ok(css.includes('Stack 100-200EXP.png')&&css.includes('background-size:200% 100%!important'),'single 100/200 EXP master sprite slicing missing');
  assert.ok(css.includes('.hero-exp-slot[data-exp-value="200"]::before{background-position:right center!important}'),'200 EXP sprite half mapping missing');
  assert.ok(!css.includes('.hero-exp-slot>img'),'old stretched IMG implementation remains');
  assert.ok(fs.existsSync(path.join(base,'assets/exp/Stack 100-200EXP.png')),'master EXP sprite missing');
  assert.ok(!fs.existsSync(path.join(base,'assets/exp/Stack-100-EXP.png'))&&!fs.existsSync(path.join(base,'assets/exp/Stack-200-EXP.png')),'old split EXP assets must be removed');
}
console.log('PASS VS AI v6.30 / Tutorial v0.56: transparent master 100/200 EXP sprite, fixed four-slot rail, and rail height synchronized to the visible Hero artwork.');
