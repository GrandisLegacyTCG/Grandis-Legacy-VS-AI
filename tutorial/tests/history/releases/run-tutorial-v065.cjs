'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm');
const {loadLocalAI}=require('./vm-local-ai-harness.cjs');
const root=path.resolve(__dirname,'..');
const must=(cond,msg)=>{if(!cond)throw new Error(msg)};
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const sha=rel=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex');

const pkg=require('../package.json');
const index=read('index.html');
const app=read('js/app.bundle.js');
const guide=read('js/tutorial-guide.js');
const guideCss=read('css/tutorial-guide.css');
const appCss=read('css/app.css');
const staticData=read('js/static-data.js');

must(pkg.version==='0.65.0','Tutorial package must be v0.65.0');
must(index.includes('gl-tutorial-0.65'),'Tutorial v0.65 cache marker missing');
must(index.includes('Non-Scripted Tutorial Gameplay'),'Tutorial page title missing');
must(app.includes('Grandis Legacy Tutorial v0.65 GitHub Pages'),'Tutorial app marker missing');
must(app.includes('VS AI v6.39 Base'),'VS AI v6.39 shared base marker missing');
must(app.includes('One Source v1.8.2')&&app.includes('Runtime Data v0.15.0'),'current source/runtime markers missing');
must(guide.startsWith('/* Grandis Legacy Tutorial Guide v0.65'), 'Tutorial guide v0.65 marker missing');
must(guideCss.includes('Grandis Legacy Tutorial Guide v0.65'),'Tutorial CSS v0.65 marker missing');

for(const term of [
  'Opening Hand + Starting Shards','3 Starting Shards','Shard Deck always contains <b>12 Shards</b>',
  'Mana Shard and Class Shard','matching Class Shard','Mana Regen starts at 1',
  'top of your Shard Deck','Shard Pool maximum of 12','each payment returns as one <b>batch</b>',
  'matching Class Shard returns last/deepest','later payment batch goes below the entire earlier batch',
  'maximum <b>1 per Class</b>','<b>3 Class Shards total</b>',
  'requires <b>1 matching Class Shard</b> from the Shard Pool'
]) must(guide.includes(term),'Shard tutorial lesson missing: '+term);

for(const rel of ['index.html','js/app.bundle.js','js/static-data.js','js/tutorial-guide.js','css/app.css','css/lab-authority.css','css/tutorial-guide.css']){
  const text=read(rel);
  must(!text.includes('Mana Pool'),rel+': obsolete Mana Pool terminology remains');
  must(!text.includes('Mana Deck'),rel+': obsolete Mana Deck terminology remains');
  must(!text.includes('Generic Mana Shard'),rel+': obsolete Generic Mana Shard terminology remains');
}
must(appCss.includes('data-zone-type="Shard Pool"'),'Shard Pool CSS selector missing');
must(staticData.includes('"local_ai":"v6.39"')&&staticData.includes('"tutorial":"v0.65"')&&staticData.includes('"pvp_railway":"v3.42"'),'release metadata in static data is stale');
must(staticData.includes('"deck_builder":"v1.30'), 'Deck Builder v1.30 cross-release metadata missing');
must(staticData.includes('"pool":"Shard Pool"'),'Shard Pool source-stack terminology missing');

const ctx=loadLocalAI(root,'TUTORIAL');
for(const name of ['GL_LAB_V014_RULE_SYNC_QA_SELF_TEST','GL_LAB_V012_OPENING_ARBALEST_QA_SELF_TEST','GL_LAB_V011_ROOT_FIX_QA_SELF_TEST','GL_LAB_V07_PAYMENT_RACIAL_QA_SELF_TEST']){
  const fn=ctx[name]; must(typeof fn==='function',name+' missing from Tutorial bundle');
  const result=fn(); must(result&&result.ok!==false,name+' failed: '+JSON.stringify(result));
}
const v014=ctx.GL_LAB_V014_RULE_SYNC_QA_SELF_TEST();
for(const key of ['legacyBaseClassChoice','rankedHeroBaseClassIdentity','simultaneousLegacyQueue','blindManaSelection','manaTakeOwnDeck','removeManaBlind','tripleShotMandatoryBind','rangeAreaNoTarget','rangeAreaAllLanes']) must(v014[key]===true,'v0.14 Tutorial parity failed: '+key);
must(v014.startingMana===3,'Tutorial runtime Starting Shards/Mana opening value must be 3');
const aiQa=ctx.GL_LOCAL_AI_V634_ACTIVE_STRATEGY_QA_SELF_TEST&&ctx.GL_LOCAL_AI_V634_ACTIVE_STRATEGY_QA_SELF_TEST();
must(aiQa&&aiQa.ok&&aiQa.aurexDeployHeal&&aiQa.humanAmbitionThreshold===2&&aiQa.primalStrikeFinisher===20&&aiQa.magicalSurgeAlwaysOnUnlessOverkill&&aiQa.stonebloodAlwaysOn,'Tutorial enhanced AI strategy parity failed: '+JSON.stringify(aiQa));

vm.runInContext(guide,ctx,{filename:'js/tutorial-guide.js'});
const bridge=ctx.GL_TUTORIAL_BRIDGE,qa=ctx.GL_TUTORIAL_GUIDE_QA;
must(bridge&&typeof bridge.getState==='function','Tutorial bridge failed to initialize');
must(qa&&typeof qa.practiceCategory==='function'&&typeof qa.classifyPracticeBoundary==='function','Tutorial guide QA bridge failed to initialize');
must(qa.practiceCategory('S1-ARC-008')==='Attack','Tutorial card-category teaching bridge regressed');
must(qa.practiceCategory('S1-CLE-005')==='Support','Tutorial Support category bridge regressed');
must(qa.practiceCategory('S1-MAG-006')==='Tactical','Tutorial Tactical category bridge regressed');
must(qa.practiceCategory('S1-EVT-002')==='Event','Tutorial Event category bridge regressed');
must(qa.practiceCategory('S1-ITM-001')==='Item','Tutorial Item category bridge regressed');

const lockPath='sync/tutorial-github-lock.v0.65.json';
must(fs.existsSync(path.join(root,lockPath)),'Tutorial v0.65 release lock missing');
const lock=JSON.parse(read(lockPath));
must(lock.tutorial==='v0.65'&&lock.base_vs_ai==='v6.39'&&lock.source_stack_bundle==='v1.8.2','Tutorial v0.65 lock metadata mismatch');
must(lock.publicResourceTerminology&&lock.publicResourceTerminology.deck==='Shard Deck'&&lock.publicResourceTerminology.pool==='Shard Pool','Tutorial lock terminology mismatch');
for(const [rel,key] of [['js/app.bundle.js','app_bundle_sha256'],['js/tutorial-guide.js','tutorial_guide_sha256'],['css/tutorial-guide.css','tutorial_css_sha256'],['js/runtime-authority.js','runtime_authority_sha256'],['js/static-data.js','static_data_sha256']]) must(sha(rel)===lock[key],rel+' release-lock hash mismatch');

must(app.includes('isRuntimePresentationBusy:function()'),'Tutorial bridge must expose actual runtime presentation busy state');
must(guide.includes('openingShardTypesPending=true'),'Shard type explanation must defer after Start Game');
must(guide.includes('runtimePresentationBusy(state)'),'Draw lesson must wait for runtime presentation completion');
must(guide.includes('interactionStateCheck:function()'),'Next Phase tutorial step must verify actual phase transition');
console.log('PASS Grandis Legacy Tutorial v0.65: VS AI v6.39 / Playtest Lab v0.14 parity, interactive Shard teaching, current terminology, and release lock verified.');
