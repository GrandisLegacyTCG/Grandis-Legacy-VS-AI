'use strict';
const fs=require('fs'),path=require('path');
const {loadLocalAI}=require('./vm-local-ai-harness.cjs');
const root=path.resolve(__dirname,'..','..'),ctx=loadLocalAI(root);
function need(v,m){if(!v)throw Error(m)}
need(typeof ctx.GL_LAB_V014_RULE_SYNC_QA_SELF_TEST==='function','v0.14 QA hook missing');
const qa=ctx.GL_LAB_V014_RULE_SYNC_QA_SELF_TEST();need(qa&&qa.ok,'v0.14 runtime QA failed: '+JSON.stringify(qa));
const app=fs.readFileSync(path.join(root,'js/app.bundle.js'),'utf8'),css=fs.readFileSync(path.join(root,'css/lab-authority.css'),'utf8');
need(/then 3 Starting Shards into its Shard Pool/.test(app),'Starting Shards initialization log is not current');
need(!app.includes('Player hand is empty.'),'empty Hand placeholder text must stay removed');
need(app.includes("type:'opponent_mana_selection'")&&app.includes('Face-down Shard'),'blind opponent Shard selector missing');
need(app.includes("mode:'REMOVE_AND_GAIN_OWN'")&&app.includes('drawManaCards(state,p.side,removed.length'),'Mana take effect is not remove + own-deck gain');
need(app.includes('attackGainsRangeFromSource')&&app.includes('attackHasRangeForSource')&&app.includes('attackActsAsAreaForSource'),'generic Range + Area helpers missing');
need(app.includes('Triple Shot requires Poison Arrow or Burning Arrow in hand'),'Triple Shot legal precheck missing');
need(app.includes("eligible===defeatedBase"),'Legacy selection is not Base Class authority');
for(let n=1;n<=6;n++)need(fs.existsSync(path.join(root,'assets/counters/Counter-'+n+'.png')),'Counter-'+n+' missing');
need(css.includes('width:13px!important;height:13px!important')&&css.includes('width:17px!important;height:17px!important')&&css.includes('.gl-lab-mana-regen img{display:block!important;width:24px!important;height:24px!important'),'counter context sizing drifted from approved v0.14 revised proportions');
console.log('PASS v0.14 rule sync:',qa);
