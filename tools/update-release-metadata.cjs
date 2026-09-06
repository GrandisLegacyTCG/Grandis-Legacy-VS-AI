'use strict';
const crypto=require('crypto'),fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
const ROOT_HASH='eb89ea56f2351f093fffbd7f7e47628f1cf0cd2b793c6efdfb82c9c9e798b868';
const TUTORIAL_HASH='5d362f3c1dd785af82f12297d6ab1ecea4f6c43508a7b0f48319e846dd61139c';
const HERO_HASH='487aa2620b5be99480a81d462082f1a35ee637ec2cc38ebf42b1bcf1103d06c9';
const sha=rel=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,rel))).digest('hex');
const writeJSON=(rel,val)=>fs.writeFileSync(path.join(ROOT,rel),JSON.stringify(val,null,2)+'\n');
const rootLock={
 version:'v2.52',schema_version:'2.52-consumer',policy:'RUNTIME_FIRST_FAIL_CLOSED_SYNC',application:'VS AI v6.27',local_ai:'v6.27',tutorial:'v0.53',pvp_reference:'v3.38',
 canonical_registry_hash:ROOT_HASH,hero_component_registry_hash:HERO_HASH,one_source_authority:'v1.7.4',application_runtime_sync:'v2.52',runtime_foundation:'v1.90',runtime_core:'v0.58',runtime_data:'v0.14.3',effect_recipe:'v0.13.3',effect_checkpoint:'v0.13.3',legality_map:'v0.11.10',hero_component_authority:'v1.0.0',shared_runtime_manual:'v1.46',source_stack_bundle:'v1.7.4',conditional_follow_up_schema:'v1.0.0',response_commit_payment_framework:'v1.0',starter60:'v1.4',ui_design_lock:'v2.49',
 shared_gameplay_sha256:sha('js/app.bundle.js'),runtime_authority_sha256:sha('js/runtime-authority.js'),runtime_source_browser_sha256:sha('runtime-source/runtime/browser/runtime-authority.browser.js'),static_data_sha256:sha('js/static-data.js'),shared_ui_css_sha256:sha('css/app.css'),mobile_app_nav_sha256:sha('js/mobile-app-nav.js'),
 audio_assets:{coin_flip:{path:'assets/audio/Coin Flip.mp3',sha256:sha('assets/audio/Coin Flip.mp3')},card_sound:{path:'assets/audio/Card Sound.mp3',sha256:sha('assets/audio/Card Sound.mp3')}}, exp_stack_assets:{exp_100:{path:'assets/exp/Stack-100-EXP.png',sha256:sha('assets/exp/Stack-100-EXP.png')},exp_200:{path:'assets/exp/Stack-200-EXP.png',sha256:sha('assets/exp/Stack-200-EXP.png')}},
 consumerAdoptionStatus:{currentApplicationsRebuiltInThisDelivery:true,currentAI:'VS AI v6.27',currentPvP:'PvP v3.38 authoritative consumer',currentTutorial:'Tutorial v0.53 GitHub Pages (visual-only EXP stack update)',revisedSeason1:'ADOPTED',heroComponents:'ADOPTED',responseCommitPaymentFramework:'ADOPTED'},
 conditionalFollowUpFramework:'GENERIC_POST_PRIMARY_SEPARATE_RESOLUTION',audioPlaybackPolicy:'RETAIN_ACTIVE_CLONES_UNTIL_ENDED_OR_ERROR',activeNormalMatchNavigationGuard:'BEFOREUNLOAD_ONLY_NATIVE_MOBILE_SCROLL'
};
writeJSON('sync/runtime-sync-lock.v2.52.json',rootLock);
for(const old of ['sync/runtime-sync-lock.v2.51.json','sync/runtime-sync-lock.v2.47.json','sync/runtime-sync-lock.v2.46.json','sync/runtime-sync-lock.v2.44.json']){const f=path.join(ROOT,old);if(fs.existsSync(f))fs.unlinkSync(f);}
const tutorialLock={
 version:'v0.53',tutorial:'v0.53',delivery:'GitHub Pages',base_vs_ai:'v6.24',runtime_foundation:'v1.89',runtime_core:'v0.57',runtime_data:'v0.14.2',effect_recipe:'v0.13.2',legality_map:'v0.11.9',hero_component_authority:'v1.0.0',canonical_registry_hash:TUTORIAL_HASH,hero_component_registry_hash:HERO_HASH,ui_design_lock:'v2.49',scope:'Tutorial v0.53 keeps the prior VS AI v6.24 / Source Stack v1.7.3 gameplay baseline; this delivery adds only the physical four-slot Tribute EXP presentation.',
 app_bundle_sha256:sha('tutorial/js/app.bundle.js'),tutorial_guide_sha256:sha('tutorial/js/tutorial-guide.js'),tutorial_css_sha256:sha('tutorial/css/tutorial-guide.css'),runtime_authority_sha256:sha('tutorial/js/runtime-authority.js'),static_data_sha256:sha('tutorial/js/static-data.js'),audio_assets:{coin_flip:{path:'assets/audio/Coin Flip.mp3',sha256:sha('tutorial/assets/audio/Coin Flip.mp3')},card_sound:{path:'assets/audio/Card Sound.mp3',sha256:sha('tutorial/assets/audio/Card Sound.mp3')}}, exp_stack_assets:{exp_100:{path:'assets/exp/Stack-100-EXP.png',sha256:sha('tutorial/assets/exp/Stack-100-EXP.png')},exp_200:{path:'assets/exp/Stack-200-EXP.png',sha256:sha('tutorial/assets/exp/Stack-200-EXP.png')}}
};
writeJSON('tutorial/sync/tutorial-github-lock.v0.53.json',tutorialLock);
for(const old of ['tutorial/sync/tutorial-github-lock.v0.52.json','tutorial/sync/tutorial-github-lock.v0.51.json','tutorial/sync/tutorial-github-lock.v0.42.json','tutorial/sync/tutorial-github-lock.v0.41.json','tutorial/sync/tutorial-github-lock.v0.40.json']){const f=path.join(ROOT,old);if(fs.existsSync(f))fs.unlinkSync(f);}
console.log('PASS: VS AI v6.27 / Tutorial v0.53 visual EXP stack release locks updated; gameplay Source Stack baselines preserved.');
