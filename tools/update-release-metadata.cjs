'use strict';
const crypto=require('crypto'),fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
const H='85d25ebda9bb2bc260983a566e6d430dde97bfc7a32e8042ec2fddfeaff1b42f';
const HH='f36f1cc83eb9845743176c3af71f7823125353eae73e832588e9d8b42c6818be';
const OSA_RUNTIME_TREE_HASH='b0224acbb1bfd716c5917eabab804e551b307abd1b6fb72025b97d5007d04bb3';
const sha=rel=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,rel))).digest('hex');
const write=(rel,v)=>{fs.mkdirSync(path.dirname(path.join(ROOT,rel)),{recursive:true});fs.writeFileSync(path.join(ROOT,rel),JSON.stringify(v,null,2)+'\n')};
const terminology={deck:'Shard Deck',standardShard:'Mana Shard',classShard:'Class Shard',pool:'Shard Pool'};
const shared={
  source_authority:'v1.9.3',canonical_card_authority:'v1.6.0',shared_runtime:'v1.94.1',runtime_data:'v0.16.0',effect_recipe:'v0.15.0',effect_checkpoint:'v0.15.0',hero_component_authority:'v1.1.0',starter60:'v1.6.1',starter_deck_authority:'v1.6.1',ui_contract:'v2.53',application_runtime_sync:'v2.61',canonical_registry_hash:H,hero_component_registry_hash:HH,publicResourceTerminology:terminology
};
function moveIfExists(rel,destRel){const src=path.join(ROOT,rel);if(!fs.existsSync(src))return;const dest=path.join(ROOT,destRel);fs.mkdirSync(path.dirname(dest),{recursive:true});if(!fs.existsSync(dest))fs.renameSync(src,dest);else fs.rmSync(src,{force:true});}
moveIfExists('sync/runtime-sync-lock.v2.57.json','sync/history/runtime-sync-lock.v2.57.json');
moveIfExists('sync/runtime-sync-lock.v2.58.json','sync/history/runtime-sync-lock.v2.58.json');
moveIfExists('tutorial/sync/tutorial-github-lock.v0.67.json','tutorial/sync/history/tutorial-github-lock.v0.67.json');
const counters={};for(let i=1;i<=6;i++)counters[String(i)]=sha(`assets/counters/Counter-${i}.png`);
const rootLock={
  schema:'GL-APPLICATION-RUNTIME-SYNC-2.61-CONSUMER',version:'v2.61',date:'2026-09-21',policy:'REFERENCE_OSA_CANONICAL_AUTHORITY_DO_NOT_REDEFINE',
  ...shared,
  applications:{vs_ai:'v6.42',tutorial:'v0.68',deck_builder:'v1.31',pvp_reference:'v3.42',website_reference:'v1.31'},
  visual_battlefield_baseline:'VS AI v6.42',runtime_source_tree:{osa_expected_hash:OSA_RUNTIME_TREE_HASH,files:68},
  shared_gameplay_sha256:sha('shared-app/app.bundle.js'),shared_gameplay_deployment_sha256:sha('js/app.bundle.js'),active_starters_sha256:sha('data/starter-decks/active-starters.v1.json'),active_starter_count:5,active_starter_reference:'OSA v1.9.3 / Starter Deck Authority v1.6.1 (unchanged compositions)',runtime_authority_sha256:sha('js/runtime-authority.js'),runtime_source_browser_sha256:sha('runtime-source/runtime/browser/runtime-authority.browser.js'),
  static_data_sha256:sha('js/static-data.js'),shared_battlefield_ui_js_sha256:sha('shared-ui/battlefield-ui.js'),shared_battlefield_ui_css_sha256:sha('shared-ui/battlefield-ui.css'),mobile_app_nav_sha256:sha('js/mobile-app-nav.js'),counter_asset_sha256:counters,
  current_authority_status:'OSA v1.9.3 / Starter Deck Authority v1.6.1 / Shared Runtime v1.94.1 / UI Contract v2.53',playtest_lab_v014:'HISTORICAL_ONLY_NOT_ACTIVE_AUTHORITY'
};
moveIfExists('sync/runtime-sync-lock.v2.59.json','sync/history/runtime-sync-lock.v2.59.json');
moveIfExists('sync/runtime-sync-lock.v2.60.json','sync/history/runtime-sync-lock.v2.60.json');
write('sync/runtime-sync-lock.v2.61.json',rootLock);
const tutorialCounters={};for(let i=1;i<=6;i++)tutorialCounters[String(i)]=sha(`tutorial/assets/counters/Counter-${i}.png`);
const tutorialLock={
  schema:'GL-TUTORIAL-GITHUB-LOCK-0.68',version:'v0.68',tutorial:'v0.68',base_vs_ai:'v6.42',delivery:'GitHub Pages',date:'2026-09-21',...shared,
  visual_battlefield_baseline:'VS AI v6.42 / Shared Battlefield UI v2.53',runtime_source_role:'GENERATED_MIRROR_OF_ROOT_RUNTIME_SOURCE',
  shared_app_bundle_sha256:sha('shared-app/app.bundle.js'),app_bundle_sha256:sha('tutorial/js/app.bundle.js'),active_starters_sha256:sha('data/starter-decks/active-starters.v1.json'),active_starter_count:5,tutorial_guide_sha256:sha('tutorial/js/tutorial-guide.js'),tutorial_css_sha256:sha('tutorial/css/tutorial-guide.css'),runtime_authority_sha256:sha('tutorial/js/runtime-authority.js'),static_data_sha256:sha('tutorial/js/static-data.js'),runtime_source_browser_sha256:sha('tutorial/runtime-source/runtime/browser/runtime-authority.browser.js'),shared_battlefield_ui_js_sha256:sha('shared-ui/battlefield-ui.js'),shared_battlefield_ui_css_sha256:sha('shared-ui/battlefield-ui.css'),counter_asset_sha256:tutorialCounters,
  tutorial_scope:'Tutorial overlay/controller on the shared VS AI v6.42 battlefield/runtime baseline; lessons remain tutorial-specific.'
};
write('tutorial/sync/tutorial-github-lock.v0.68.json',tutorialLock);
console.log('PASS: current runtime sync v2.61 and Tutorial v0.68 consumer locks regenerated for OSA v1.9.3 / Shared Runtime v1.94.1 / UI v2.53.');
