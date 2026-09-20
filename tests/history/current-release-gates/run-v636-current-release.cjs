'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm');
const {loadLocalAI}=require('./promotion-v014/vm-local-ai-harness.cjs');
const root=path.resolve(__dirname,'..');
const must=(v,m)=>{if(!v)throw new Error(m)};
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const sha=rel=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex');
const pkg=require('../package.json'),tutPkg=require('../tutorial/package.json');
must(pkg.version==='6.36.0','VS AI package must be v6.36.0');
must(tutPkg.version==='0.62.0','Tutorial package must be v0.62.0');
const app=read('js/app.bundle.js'),css=read('css/app.css'),labCss=read('css/lab-authority.css'),staticData=read('js/static-data.js'),index=read('index.html');
must(app.includes('Grandis Legacy VS AI v6.36'),'VS AI v6.36 marker missing');
must(app.includes('One Source v1.8.2')&&app.includes('Runtime Data v0.15.0'),'current authority marker missing');
must(index.includes('gl-vs-ai-6.36'),'VS AI v6.36 cache marker missing');
for(const [rel,text] of [['index.html',index],['js/app.bundle.js',app],['js/static-data.js',staticData],['css/app.css',css],['css/lab-authority.css',labCss]]){
  for(const old of ['Mana Pool','Mana Deck','Generic Mana Shard','Mana Card']) must(!text.includes(old),rel+': obsolete resource terminology remains: '+old);
}
must(!app.includes('Player hand is empty.'),'empty Hand placeholder returned');

must(app.includes('mobile-restored-layout')&&app.includes("root.innerHTML=isMobileViewport()?mobileMarkup:desktopMarkup"),'responsive mobile render branch missing');
must(app.includes('function mobileShardPoolRow')&&css.includes('mobile-shard-pool'),'mobile Shard Pool rail missing');
must(app.includes('function isTouchTabletViewport')&&app.includes("cardEl.classList.contains('touch-selected')")&&labCss.includes('.hand-card.touch-selected'),'touch-first tablet Hand selection missing');
must(app.includes("GL_LAB_MANA_DECK_SIZE=12, GL_LAB_START_MANA_CARDS=3"),'12-card Shard Deck / 3 Starting Shards constants missing');
must(app.includes('manaRegen:1')&&app.includes('aiManaRegen:1'),'Mana Regen 1 initialization missing');
must(app.includes('response_payment_choice')&&app.includes('committed_response_counter:true'),'committed Response/payment framework missing');
must(app.includes('manualRepositionUsedThisTurn')&&app.includes('manualRepositionAvailable'),'manual Reposition limit authority missing');
must(app.includes('hero-card-physical-stack')&&css.includes('flex-direction:column-reverse!important'),'EXP side-stack/exhaust orientation authority missing');
must(app.includes('attackActsAsAreaForSource')&&app.includes('attackHasRangeForSource'),'generic Range + Area authority missing');
must(app.includes("eligible===defeatedBase"),'Base-Class Legacy selection authority missing');
must(app.includes("type:'opponent_mana_selection'")&&app.includes('Face-down opponent Shard'),'blind opponent-Shard selection missing');
for(let n=1;n<=6;n++)must(fs.existsSync(path.join(root,`assets/counters/Counter-${n}.png`)),`Counter-${n}.png missing`);
must(fs.existsSync(path.join(root,'assets/battle/Blade.png')),'Blade.png missing');
for(const [name,expected] of Object.entries({
  'Coin Flip.mp3':'b4842f9a3f2d25004223313f5473bef74afd79915b6af9bdb35c70f6df8c2b50',
  'Card Sound.mp3':'1c04e41918b392a643c22d6c02ef34eeab0341c70d46b7d517078725b79d8ee4'
})){
  const rel='assets/audio/'+name; must(fs.existsSync(path.join(root,rel)),name+' missing'); must(sha(rel)===expected,name+' hash mismatch'); must(app.includes(rel),name+' runtime route missing');
}
const data=JSON.parse(read('data/season1/cards.runtime.v0.15.0.json'));
must(data.cards.length===200,'Season 1 runtime must contain 200 cards');
for(const id of ['S1-ITM-019','S1-ITM-020'])must(data.cards.some(c=>c.card_id===id),id+' missing');
const sourceCtx={window:{}};vm.createContext(sourceCtx);vm.runInContext(staticData,sourceCtx);
const stack=sourceCtx.window.GL_SOURCE_STACK||{};
must(stack.local_ai==='v6.36'&&stack.tutorial==='v0.62'&&stack.pvp_railway==='v3.41','cross-release metadata stale');
must(String(stack.deck_builder||'').startsWith('v1.30'),'Deck Builder v1.30 metadata missing');
must(stack.resource_terminology&&stack.resource_terminology.deck==='Shard Deck'&&stack.resource_terminology.pool==='Shard Pool','Shard terminology metadata mismatch');
const ctx=loadLocalAI(root);
const qa=ctx.GL_LAB_V014_RULE_SYNC_QA_SELF_TEST&&ctx.GL_LAB_V014_RULE_SYNC_QA_SELF_TEST();
must(qa&&qa.ok&&qa.startingMana===3&&qa.simultaneousLegacyQueue&&qa.blindManaSelection&&qa.rangeAreaNoTarget&&qa.rangeAreaAllLanes,'Playtest Lab v0.14 runtime self-test failed: '+JSON.stringify(qa));
const aiQa=ctx.GL_LOCAL_AI_V634_ACTIVE_STRATEGY_QA_SELF_TEST&&ctx.GL_LOCAL_AI_V634_ACTIVE_STRATEGY_QA_SELF_TEST();
must(aiQa&&aiQa.ok&&aiQa.aurexDeployHeal&&aiQa.quickReloadAlwaysOn&&aiQa.magicalSurgeAlwaysOnUnlessOverkill&&aiQa.stonebloodAlwaysOn,'Enhanced AI active ability/racial strategy self-test failed: '+JSON.stringify(aiQa));

must(app.includes("sideHand(state,'PLAYER')||[]")&&app.includes('Triple Shot requires Poison Arrow or Burning Arrow in hand'),'player Triple Shot pre-play validator missing');
must(app.includes('function returnManaPaymentBatchToOwnerDeck')&&app.includes('generic.concat(nonmatching,matching)'),'Shard payment-batch return implementation missing');
must(!app.includes('Class Shards are the deepest bottom segment'),'obsolete permanent deepest-Class-Shard rule remains');
const manaQA=ctx.GL_LOCAL_AI_BRIDGE&&ctx.GL_LOCAL_AI_BRIDGE.testPlaytestManaRules&&ctx.GL_LOCAL_AI_BRIDGE.testPlaytestManaRules();
must(manaQA&&manaQA.ok&&manaQA.paymentBatchOrder&&manaQA.laterBatchBelowEarlier&&manaQA.matchingClassLast,'Shard payment-batch QA failed: '+JSON.stringify(manaQA));

console.log('PASS VS AI v6.36 current release: Source Stack v1.8.2, corrected Shard payment batches, Triple Shot pre-play validation, 200 cards, current assets and gameplay locks.');
