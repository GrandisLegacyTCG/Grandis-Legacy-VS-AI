'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HASH = 'f5de57e66f0191522537b6e2b66539dd1c3c2a9737e59bac76c48044c38a21c1';
const HERO_HASH = '487aa2620b5be99480a81d462082f1a35ee637ec2cc38ebf42b1bcf1103d06c9';

function sha(relativePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, relativePath))).digest('hex');
}

function writeJSON(relativePath, value) {
  fs.writeFileSync(path.join(ROOT, relativePath), `${JSON.stringify(value, null, 2)}\n`);
}

const rootLock = {
  version: 'v2.48',
  schema_version: '2.48-consumer',
  policy: 'RUNTIME_FIRST_FAIL_CLOSED_SYNC',
  application: 'VS AI v6.15',
  local_ai: 'v6.15',
  tutorial: 'v0.43',
  pvp_reference: 'v3.12',
  canonical_registry_hash: HASH,
  hero_component_registry_hash: HERO_HASH,
  one_source_authority: 'v1.7.0',
  application_runtime_sync: 'v2.48',
  runtime_foundation: 'v1.86',
  runtime_core: 'v0.54',
  runtime_data: 'v0.14.0',
  effect_recipe: 'v0.13.0',
  effect_checkpoint: 'v0.13.0',
  legality_map: 'v0.11.9',
  hero_component_authority: 'v1.0.0',
  shared_runtime_manual: 'v1.42',
  source_stack_bundle: 'v1.7.0',
  conditional_follow_up_schema: 'v1.0.0',
  starter60: 'v1.3',
  ui_design_lock: 'v2.48',
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
    currentAI: 'VS AI v6.15',
    currentPvP: 'PvP v3.12 canonical-defense/navigation consumer',
    currentTutorial: 'Tutorial v0.43 GitHub Pages',
    revisedSeason1: 'ADOPTED',
    heroComponents: 'ADOPTED',
    pendingStateAudit: 'ADOPTED'
  },
  conditionalFollowUpFramework: 'GENERIC_POST_PRIMARY_SEPARATE_RESOLUTION',
  audioPlaybackPolicy: 'RETAIN_ACTIVE_CLONES_UNTIL_ENDED_OR_ERROR',
  activeNormalMatchNavigationGuard: 'BEFOREUNLOAD_AND_TOP_EDGE_PULL_TO_REFRESH_ONLY'
};
writeJSON('sync/runtime-sync-lock.v2.48.json', rootLock);

const tutorialLock = {
  version: 'v0.43',
  tutorial: 'v0.43',
  delivery: 'GitHub Pages',
  base_vs_ai: 'v6.15',
  runtime_foundation: 'v1.86',
  runtime_core: 'v0.54',
  runtime_data: 'v0.14.0',
  effect_recipe: 'v0.13.0',
  legality_map: 'v0.11.9',
  hero_component_authority: 'v1.0.0',
  canonical_registry_hash: HASH,
  hero_component_registry_hash: HERO_HASH,
  ui_design_lock: 'v2.48',
  scope: 'Tutorial v0.43 on VS AI v6.15 shared gameplay/runtime authority; tutorial-only guidance and mobile behavior retained.',
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
writeJSON('tutorial/sync/tutorial-github-lock.v0.43.json', tutorialLock);

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

console.log('PASS: VS AI v6.15 and Tutorial v0.43 release locks updated.');
