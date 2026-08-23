'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HASH = 'b185307752fd523d6c1e4a450f8bdd82b96b4d4cbfbb884fca8a619e8c5c8057';
const HERO_HASH = '487aa2620b5be99480a81d462082f1a35ee637ec2cc38ebf42b1bcf1103d06c9';

function sha(relativePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, relativePath))).digest('hex');
}

function writeJSON(relativePath, value) {
  fs.writeFileSync(path.join(ROOT, relativePath), `${JSON.stringify(value, null, 2)}\n`);
}

const rootLock = {
  version: 'v2.47',
  schema_version: '2.47-consumer',
  policy: 'RUNTIME_FIRST_FAIL_CLOSED_SYNC',
  application: 'VS AI v6.9',
  local_ai: 'v6.9',
  tutorial: 'v0.40',
  pvp_reference: 'v3.07',
  canonical_registry_hash: HASH,
  hero_component_registry_hash: HERO_HASH,
  one_source_authority: 'v1.6.1',
  application_runtime_sync: 'v2.47',
  runtime_foundation: 'v1.85',
  runtime_core: 'v0.53',
  runtime_data: 'v0.13.1',
  effect_recipe: 'v0.12.1',
  effect_checkpoint: 'v0.12.1',
  legality_map: 'v0.11.9',
  hero_component_authority: 'v1.0.0',
  shared_runtime_manual: 'v1.41',
  starter60: 'v1.3',
  ui_design_lock: 'v2.48',
  shared_gameplay_sha256: sha('js/app.bundle.js'),
  runtime_authority_sha256: sha('js/runtime-authority.js'),
  runtime_source_browser_sha256: sha('runtime-source/runtime/browser/runtime-authority.browser.js'),
  static_data_sha256: sha('js/static-data.js'),
  shared_ui_css_sha256: sha('css/app.css'),
  consumerAdoptionStatus: {
    currentApplicationsRebuiltInThisDelivery: true,
    currentAI: 'VS AI v6.9',
    currentPvP: 'PvP v3.07 parity target',
    currentTutorial: 'Tutorial v0.40 GitHub Pages',
    revisedSeason1: 'ADOPTED',
    heroComponents: 'ADOPTED',
    pendingStateAudit: 'ADOPTED'
  }
};
writeJSON('sync/runtime-sync-lock.v2.47.json', rootLock);

const tutorialLock = {
  version: 'v0.40',
  tutorial: 'v0.40',
  delivery: 'GitHub Pages',
  base_vs_ai: 'v6.9',
  runtime_foundation: 'v1.85',
  runtime_core: 'v0.53',
  runtime_data: 'v0.13.1',
  effect_recipe: 'v0.12.1',
  legality_map: 'v0.11.9',
  hero_component_authority: 'v1.0.0',
  canonical_registry_hash: HASH,
  hero_component_registry_hash: HERO_HASH,
  ui_design_lock: 'v2.48',
  scope: 'Tutorial v0.40 on VS AI v6.9 shared gameplay/runtime authority; tutorial-only guidance and mobile behavior retained.',
  app_bundle_sha256: sha('tutorial/js/app.bundle.js'),
  tutorial_guide_sha256: sha('tutorial/js/tutorial-guide.js'),
  tutorial_css_sha256: sha('tutorial/css/tutorial-guide.css'),
  runtime_authority_sha256: sha('tutorial/js/runtime-authority.js'),
  static_data_sha256: sha('tutorial/js/static-data.js')
};
writeJSON('tutorial/sync/tutorial-github-lock.v0.40.json', tutorialLock);

const obsoleteRootLock = path.join(ROOT, 'sync/runtime-sync-lock.v2.44.json');
if (fs.existsSync(obsoleteRootLock)) fs.unlinkSync(obsoleteRootLock);
const supersededRootLock = path.join(ROOT, 'sync/runtime-sync-lock.v2.46.json');
if (fs.existsSync(supersededRootLock)) fs.unlinkSync(supersededRootLock);
const supersededTutorialLock = path.join(ROOT, 'tutorial/sync/tutorial-github-lock.v0.39.json');
if (fs.existsSync(supersededTutorialLock)) fs.unlinkSync(supersededTutorialLock);

console.log('PASS: VS AI v6.9 and Tutorial v0.40 release locks updated.');
