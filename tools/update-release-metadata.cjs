'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HASH = '5d362f3c1dd785af82f12297d6ab1ecea4f6c43508a7b0f48319e846dd61139c';
const HERO_HASH = '487aa2620b5be99480a81d462082f1a35ee637ec2cc38ebf42b1bcf1103d06c9';

function sha(relativePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, relativePath))).digest('hex');
}

function writeJSON(relativePath, value) {
  fs.writeFileSync(path.join(ROOT, relativePath), `${JSON.stringify(value, null, 2)}\n`);
}

const rootLock = {
  version: 'v2.51',
  schema_version: '2.51-consumer',
  policy: 'RUNTIME_FIRST_FAIL_CLOSED_SYNC',
  application: 'VS AI v6.23',
  local_ai: 'v6.23',
  tutorial: 'v0.51',
  pvp_reference: 'v3.20',
  canonical_registry_hash: HASH,
  hero_component_registry_hash: HERO_HASH,
  one_source_authority: 'v1.7.3',
  application_runtime_sync: 'v2.51',
  runtime_foundation: 'v1.89',
  runtime_core: 'v0.57',
  runtime_data: 'v0.14.2',
  effect_recipe: 'v0.13.2',
  effect_checkpoint: 'v0.13.2',
  legality_map: 'v0.11.9',
  hero_component_authority: 'v1.0.0',
  shared_runtime_manual: 'v1.45',
  source_stack_bundle: 'v1.7.3',
  conditional_follow_up_schema: 'v1.0.0',
  starter60: 'v1.4',
  ui_design_lock: 'v2.49',
  shared_gameplay_sha256: sha('js/app.bundle.js'),
  runtime_authority_sha256: sha('js/runtime-authority.js'),
  runtime_source_browser_sha256: sha('runtime-source/runtime/browser/runtime-authority.browser.js'),
  static_data_sha256: sha('js/static-data.js'),
  shared_ui_css_sha256: sha('css/app.css'),
  mobile_app_nav_sha256: sha('js/mobile-app-nav.js'),
  audio_assets: {
    coin_flip: { path: 'assets/audio/Coin Flip.mp3', sha256: sha('assets/audio/Coin Flip.mp3') },
    card_sound: { path: 'assets/audio/Card Sound.mp3', sha256: sha('assets/audio/Card Sound.mp3') }
  },
  consumerAdoptionStatus: {
    currentApplicationsRebuiltInThisDelivery: true,
    currentAI: 'VS AI v6.23',
    currentPvP: 'PvP v3.20 redirect-response consumer',
    currentTutorial: 'Tutorial v0.51 GitHub Pages',
    revisedSeason1: 'ADOPTED',
    heroComponents: 'ADOPTED',
    pendingStateAudit: 'ADOPTED'
  },
  conditionalFollowUpFramework: 'GENERIC_POST_PRIMARY_SEPARATE_RESOLUTION',
  audioPlaybackPolicy: 'RETAIN_ACTIVE_CLONES_UNTIL_ENDED_OR_ERROR',
  activeNormalMatchNavigationGuard: 'BEFOREUNLOAD_ONLY_NATIVE_MOBILE_SCROLL'
};
writeJSON('sync/runtime-sync-lock.v2.51.json', rootLock);

const tutorialLock = {
  version: 'v0.50',
  tutorial: 'v0.51',
  delivery: 'GitHub Pages',
  base_vs_ai: 'v6.23',
  runtime_foundation: 'v1.89',
  runtime_core: 'v0.57',
  runtime_data: 'v0.14.2',
  effect_recipe: 'v0.13.2',
  legality_map: 'v0.11.9',
  hero_component_authority: 'v1.0.0',
  canonical_registry_hash: HASH,
  hero_component_registry_hash: HERO_HASH,
  ui_design_lock: 'v2.49',
  scope: 'Tutorial v0.51 on VS AI v6.23 shared gameplay/runtime authority; native mobile document scrolling restored while tutorial-only guidance and current gameplay remain intact.',
  app_bundle_sha256: sha('tutorial/js/app.bundle.js'),
  tutorial_guide_sha256: sha('tutorial/js/tutorial-guide.js'),
  tutorial_css_sha256: sha('tutorial/css/tutorial-guide.css'),
  runtime_authority_sha256: sha('tutorial/js/runtime-authority.js'),
  static_data_sha256: sha('tutorial/js/static-data.js'),
  audio_assets: {
    coin_flip: { path: 'assets/audio/Coin Flip.mp3', sha256: sha('tutorial/assets/audio/Coin Flip.mp3') },
    card_sound: { path: 'assets/audio/Card Sound.mp3', sha256: sha('tutorial/assets/audio/Card Sound.mp3') }
  }
};
writeJSON('tutorial/sync/tutorial-github-lock.v0.51.json', tutorialLock);

const obsoleteRootLock = path.join(ROOT, 'sync/runtime-sync-lock.v2.44.json');
if (fs.existsSync(obsoleteRootLock)) fs.unlinkSync(obsoleteRootLock);
const supersededRootLock = path.join(ROOT, 'sync/runtime-sync-lock.v2.46.json');
if (fs.existsSync(supersededRootLock)) fs.unlinkSync(supersededRootLock);
const priorRootLock = path.join(ROOT, 'sync/runtime-sync-lock.v2.47.json');
if (fs.existsSync(priorRootLock)) fs.unlinkSync(priorRootLock);
const supersededTutorialLock = path.join(ROOT, 'tutorial/sync/tutorial-github-lock.v0.40.json');
if (fs.existsSync(supersededTutorialLock)) fs.unlinkSync(supersededTutorialLock);
const priorTutorialLock = path.join(ROOT, 'tutorial/sync/tutorial-github-lock.v0.41.json');
if (fs.existsSync(priorTutorialLock)) fs.unlinkSync(priorTutorialLock);
const previousTutorialLock = path.join(ROOT, 'tutorial/sync/tutorial-github-lock.v0.42.json');
if (fs.existsSync(previousTutorialLock)) fs.unlinkSync(previousTutorialLock);

console.log('PASS: VS AI v6.23 and Tutorial v0.51 release locks updated.');
