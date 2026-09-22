'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const ROOT=path.resolve(__dirname,'..');
const read=r=>fs.readFileSync(path.join(ROOT,r),'utf8');
const json=r=>JSON.parse(read(r));
const app=read('shared-app/app.bundle.js'),fieldCss=read('shared-app/battlefield-authority.css');
const rootIndex=read('index.html'),tutorialIndex=read('tutorial/index.html');
assert.strictEqual(json('package.json').version,'6.42.0');
assert.strictEqual(json('tutorial/package.json').version,'0.68.0');
const stack=json('data/config/active-runtime-source-stack.v1.95.json');
assert.deepStrictEqual({osa:stack.source_authority,shared:stack.shared_runtime,data:stack.runtime_data,recipe:stack.effect_recipe,checkpoint:stack.effect_checkpoint,sync:stack.application_runtime_sync,ui:stack.ui_contract,starter:stack.starter60},{osa:'v1.9.5',shared:'v1.94.2',data:'v0.16.2',recipe:'v0.15.2',checkpoint:'v0.15.2',sync:'v2.63',ui:'v2.53',starter:'v1.6.1'});

// Issue #1: fix the existing gate. Passive Landscape Shard preview is allowed only through transient presentation locks.
assert(/function v642TabletLandscapePassiveShardPreviewTarget\(target\)/.test(app),'Landscape passive Shard target classifier missing');
assert(/el\.closest\('\.gl-lab-mana-pool'\)/.test(app),'Landscape passive Shard classifier is not scoped to the battlefield resource strip');
assert(/\[data-mana-spend\].*\[data-response-mana-uid\].*\[data-mana-class-uid\].*\[data-opponent-mana-choice\]/.test(app),'Explicit Shard gameplay targets are not excluded from passive preview bypass');
assert(/function v642TabletLandscapeShardPreviewSafeDuringTransientLock\(target\)/.test(app),'Transient-lock Shard safety helper missing');
assert(/animationBusy\(\).*drawPresentationPending/.test(app),'Shard lock bypass is not restricted to transient presentation locks');
assert(/appState&&appState\.preGame/.test(app),'Pre-game lock is not protected');
const router=app.match(/document\.body\.addEventListener\('click',[\s\S]*?\n    \}\);/)?.[0]||'';assert(router,'Canonical body click router missing');
assert(/var passiveLandscapeShardDuringLock=v642TabletLandscapeShardPreviewSafeDuringTransientLock\(ev\.target\)/.test(router),'Canonical lock gate does not classify passive Landscape Shard preview');
assert(/gameplayInputLocked\(\)&&!safeDuringLock&&!passiveLandscapeShardDuringLock/.test(router),'Transient-lock exception is not integrated into the existing gate');
assert(/var tabletShard=passiveLandscapeShardDuringLock\|\|ev\.target\.closest\('\[data-shard-preview-src\]'\)/.test(router),'Shard route does not reuse the lock-approved target');
assert.strictEqual((app.match(/document\.body\.addEventListener\('click'/g)||[]).length,1,'A competing body click router was added');
assert(!/setTimeout\([^)]*(300|350)/.test(app.slice(app.indexOf('v642TabletLandscapePassiveShardPreviewTarget'),app.indexOf('var GL_V253_DELEGATED_READABLE_PREVIEW_BOUND'))),'Timing suppression hack introduced into Shard route');

// Locked preview and physical Shard dimensions remain Candidate (13).
assert(/Math\.min\(vw\*\.2625,\(vh\*\.625\)\*\(5\/7\)\)/.test(app),'Approved Candidate 13 Tablet Landscape preview sizing changed');
const shardRule=fieldCss.match(/html\.gl-ui-tablet\.gl-tablet-landscape-desktop \.gl-lab-mana-card\s*\{[\s\S]*?\}/)?.[0]||'';
assert(/height:82\.5%!important/.test(shardRule)&&/max-height:84%!important/.test(shardRule)&&/aspect-ratio:5\/7!important/.test(shardRule),'Candidate 13 Shard physical sizing changed');
const racialRule=fieldCss.match(/html\.gl-ui-tablet\.gl-tablet-landscape-desktop \.gl-lab-racial\s*\{[\s\S]*?\}/)?.[0]||'';assert(/height:66%!important/.test(racialRule),'Racial Token sizing changed');

// Issue #2: Landscape-only opponent labels use the approved Player-side vertical hierarchy; count rules are untouched.
assert(/html\.gl-ui-tablet\.gl-tablet-landscape-desktop \.gl-lab-side--opponent \.gl-lab-zone>\.gl-lab-zone-label\{top:auto!important;bottom:3px!important;\}/.test(fieldCss),'Opponent Landscape label-bottom rule missing');
assert(/\.gl-lab-side--opponent \.gl-lab-zone-label\{top:3px;\}/.test(fieldCss),'Desktop/global opponent label baseline was altered instead of narrowed to Tablet Landscape');
assert(/\.gl-lab-side--opponent \.gl-lab-zone\[data-zone-type="Main Deck"\] \.zoneCard b,[\s\S]*top:-3px!important;bottom:auto!important;right:-3px!important/.test(fieldCss),'Opponent count baseline rule changed');

// Issue #3: only Class/Racial heroActions containers move vertically; X/width and compact label logic remain intact.
assert(/html\.gl-ui-tablet\.gl-tablet-landscape-desktop \.gl-lab-positions \.heroActions\{right:3px!important;top:3px!important;max-width:32%!important;width:min\(92px,32%\)!important;\}/.test(fieldCss),'Tablet heroActions X/width baseline changed');
assert(/\.heroActions:has\(\.racialAbilityAction,\.classAbilityAction\)\{top:calc\(15\.428% \+ 11px\)!important;\}/.test(fieldCss),'HP-relative Tablet Class/Racial Y rule missing');
assert(/function compactTabletAbilityLabel\(fullName\)/.test(app)&&/words\.length>1\?words\[0\]\+'\.\.\.'/.test(app),'Compact Class/Racial label logic changed');

for(const [name,text] of [['root',rootIndex],['tutorial',tutorialIndex]]){
  assert(/gl-shared-v642-068-c14/.test(text),`${name} Candidate 14 shared cache-buster missing`);
  assert(/gl-authority-v642-068-c14/.test(text),`${name} Candidate 14 authority cache-buster missing`);
  assert(!/gl-(?:shared|authority)-v642-068-c13/.test(text),`${name} stale Candidate 13 production cache-buster remains`);
}
const pkg=json('package.json'),suite=read('tests/run-v642-browser-suite.cjs');
assert(/run-v642-candidate14-authority-ui\.cjs/.test(pkg.scripts['test:current']),'Candidate 14 authority gate not active');
assert(!/run-v642-candidate13-authority-ui\.cjs/.test(pkg.scripts['test:current']),'Candidate 13 authority gate still active');
assert(/run-v642-candidate14-browser\.cjs/.test(suite),'Candidate 14 browser gate not active');
assert(!/run-v642-candidate13-browser\.cjs/.test(suite),'Candidate 13 browser gate still active');
console.log('PASS Candidate (14) authority/UI architecture: transient-lock-safe passive Landscape Shard preview in the canonical router, Landscape-only opponent label-bottom placement, HP-relative Class/Racial Y placement, and Candidate 13 dimensions/Portrait/gameplay authority preserved.');
