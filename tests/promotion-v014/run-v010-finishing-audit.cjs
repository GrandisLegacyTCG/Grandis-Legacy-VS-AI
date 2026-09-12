'use strict';
const fs=require('fs'),path=require('path');
const {loadLocalAI}=require('./vm-local-ai-harness.cjs');
const root=path.resolve(__dirname,'..','..');
function need(v,m){if(!v)throw Error(m)}
const ctx=loadLocalAI(root),qa=ctx.GL_LAB_V010_FINISH_QA_SELF_TEST();need(qa&&qa.ok,'runtime finishing self-test failed: '+JSON.stringify(qa));
need(qa.checks.arbalestStableInfo&&qa.checks.arbalestNoBattlefieldDie,'Arbalest stable Hero Information presentation failed');
const app=fs.readFileSync(path.join(root,'js/app.bundle.js'),'utf8'),css=fs.readFileSync(path.join(root,'css/lab-authority.css'),'utf8');
need(app.includes('Class Shard contribution:')&&app.includes('Remaining Mana:'),'truthful Mana payment summaries missing');
need(app.includes("button.classList.remove('mana-confirm-ready','mana-confirm-insufficient','mana-confirm-waiting')"),'Mana confirmation class reset missing');
need(css.includes('mana-confirm-ready')&&css.includes('mana-confirm-insufficient')&&css.includes('mana-confirm-waiting'),'Mana confirm visual states missing');
for(let n=1;n<=6;n++)need(fs.existsSync(path.join(root,'assets/counters/Counter-'+n+'.png')),'Counter-'+n+' asset missing');
need(!fs.existsSync(path.join(root,'assets/dice/Die-1.png')),'obsolete v0.12 die asset remains');
need(app.includes('events.slice(0,6)'),'six-event Card Played source contract missing');
need(css.includes('top:-20px!important')&&css.includes('bottom:7px!important'),'Hand action dual-state positioning missing');
console.log('PASS v0.10 finishing audit: staged counters/composition, truthful Mana confirmation, approved Counter.png 1-6 set, bright Hand actions, and Card Played contract.');
