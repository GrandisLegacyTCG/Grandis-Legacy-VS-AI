'use strict';
const crypto=require('crypto'),fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
const H='ce79e5a97c115507f68734887160b575840899056e1533488e3fddd3a11fec1f';
const HH='487aa2620b5be99480a81d462082f1a35ee637ec2cc38ebf42b1bcf1103d06c9';
const sha=rel=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,rel))).digest('hex');
const write=(rel,v)=>{fs.mkdirSync(path.dirname(path.join(ROOT,rel)),{recursive:true});fs.writeFileSync(path.join(ROOT,rel),JSON.stringify(v,null,2)+'\n')};
const terminology={deck:'Shard Deck',standardShard:'Mana Shard',classShard:'Class Shard',pool:'Shard Pool'};
const shared={
  canonical_registry_hash:H,hero_component_registry_hash:HH,
  source_stack_bundle:'v1.8.2',one_source_authority:'v1.8.2',runtime_foundation:'v1.93',runtime_core:'v0.61',
  runtime_data:'v0.15.0',effect_recipe:'v0.14.0',effect_checkpoint:'v0.14.0',legality_map:'v1.5.0',
  hero_component_authority:'v1.0.0',shared_runtime_manual:'v1.49',application_runtime_sync:'v2.57',starter60:'v1.5',ui_design_lock:'v2.51',
  responseCommitPaymentFramework:'1.0',manualRepositionLimit:'1.0',publicResourceTerminology:terminology
};
const counters={};for(let i=1;i<=6;i++)counters[String(i)]=sha(`assets/counters/Counter-${i}.png`);
const rootLock={
  schema:'GL-APPLICATION-RUNTIME-SYNC-2.57',version:'v2.57',policy:'RUNTIME_FIRST_FAIL_CLOSED_SYNC',date:'2026-09-13',
  canonicalRegistryHash:H,runtimeSourceTreeHash:'3e6a451fb5b2a3c1d5b294329bd557894d5c07581aa637d98996576d179e0e77',heroComponentRegistryHash:HH,
  requiredSourceStack:{sourceAuthorityStack:'1.8.2',oneSourceAuthority:'1.8.2',runtimeData:'0.15.0',effectCheckpoint:'0.14.0',effectRecipe:'0.14.0',legalityMap:'1.5.0',runtimeCore:'0.61',runtimeFoundation:'1.93',heroComponentAuthority:'1.0.0',uiLock:'2.51',sharedManual:'1.49',starter60:'1.5',applicationRuntimeSync:'2.57'},
  gameplayAuthority:'Source Stack v1.8.2 / Shard payment-batch correction',authorityVerified:true,
  authorityStatement:'Source Stack v1.8.2 corrects Shard return ordering per payment batch and preserves Playtest v0.14 gameplay promotion. VS AI v6.37 and Tutorial v0.63 preserve the gameplay corrections and add responsive mobile/tablet UI fixes.',
  stableApplications:{vsAI:'v6.37',tutorial:'v0.63'},publicResourceTerminology:terminology,
  ...shared,local_ai:'v6.37',tutorial:'v0.63',pvp_reference:'v3.42',
  shared_gameplay_sha256:sha('js/app.bundle.js'),runtime_authority_sha256:sha('js/runtime-authority.js'),runtime_source_browser_sha256:sha('runtime-source/runtime/browser/runtime-authority.browser.js'),
  static_data_sha256:sha('js/static-data.js'),shared_ui_css_sha256:sha('css/app.css'),lab_authority_css_sha256:sha('css/lab-authority.css'),mobile_app_nav_sha256:sha('js/mobile-app-nav.js'),
  counter_asset_sha256:counters,blade_asset_sha256:sha('assets/battle/Blade.png'),
  consumerAdoptionStatus:{currentApplicationsRebuiltInThisDelivery:true,currentAI:'VS AI v6.37',currentTutorial:'Tutorial v0.63',sourceStack:'v1.8.2',playtestV014Promotion:'ADOPTED',publicResourceTerminology:'ADOPTED'},
  exp_stack_assets:{master:{path:'assets/exp/Stack 100-200EXP.png',sha256:sha('assets/exp/Stack 100-200EXP.png'),sprite_halves:{left:100,right:200}}}
};
for(const f of fs.readdirSync(path.join(ROOT,'sync')))if(/^runtime-sync-lock\.v/.test(f))fs.unlinkSync(path.join(ROOT,'sync',f));
write('sync/runtime-sync-lock.v2.57.json',rootLock);
const tutorialLock={
  schema:'GL-TUTORIAL-GITHUB-LOCK-0.63',version:'v0.63',tutorial:'v0.63',delivery:'GitHub Pages',base_vs_ai:'v6.37',date:'2026-09-13',
  ...shared,scope:'Tutorial v0.63 shares Source Stack v1.8.2 gameplay with VS AI v6.37 and explicitly teaches Shard Deck, Shard Pool, Mana Shard, Class Shard, Starting Shards, Mana Regen, payment-batch return ordering, Ultimate-derived Class Shards, and matching-Class-Shard Ultimate Tribute.',
  app_bundle_sha256:sha('tutorial/js/app.bundle.js'),tutorial_guide_sha256:sha('tutorial/js/tutorial-guide.js'),tutorial_css_sha256:sha('tutorial/css/tutorial-guide.css'),
  runtime_authority_sha256:sha('tutorial/js/runtime-authority.js'),static_data_sha256:sha('tutorial/js/static-data.js'),runtime_source_browser_sha256:sha('tutorial/runtime-source/runtime/browser/runtime-authority.browser.js'),
  counter_asset_sha256:Object.fromEntries(Array.from({length:6},(_,i)=>[String(i+1),sha(`tutorial/assets/counters/Counter-${i+1}.png`)])),blade_asset_sha256:sha('tutorial/assets/battle/Blade.png'),
  audio_assets:{coin_flip:{path:'assets/audio/Coin Flip.mp3',sha256:sha('tutorial/assets/audio/Coin Flip.mp3')},card_sound:{path:'assets/audio/Card Sound.mp3',sha256:sha('tutorial/assets/audio/Card Sound.mp3')}},
  exp_stack_assets:{master:{path:'assets/exp/Stack 100-200EXP.png',sha256:sha('tutorial/assets/exp/Stack 100-200EXP.png'),sprite_halves:{left:100,right:200}}}
};
const tsync=path.join(ROOT,'tutorial','sync');fs.mkdirSync(tsync,{recursive:true});for(const f of fs.readdirSync(tsync))if(/^tutorial-github-lock\.v/.test(f))fs.unlinkSync(path.join(tsync,f));
write('tutorial/sync/tutorial-github-lock.v0.63.json',tutorialLock);
console.log('PASS: VS AI v6.37 / Tutorial v0.63 release locks updated for Source Stack v1.8.2 and Shard terminology.');
