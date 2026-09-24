'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const ROOT=path.resolve(__dirname,'..');
const read=r=>fs.readFileSync(path.join(ROOT,r),'utf8');
const json=r=>JSON.parse(read(r));
const app=read('shared-app/app.bundle.js'),fieldCss=read('shared-app/battlefield-authority.css');
const rootIndex=read('index.html'),tutorialIndex=read('tutorial/index.html');
assert.strictEqual(json('package.json').version,'6.43.0');
assert.strictEqual(json('tutorial/package.json').version,'0.68.0');
const stack=json('data/config/active-runtime-source-stack.v1.95.json');
assert.deepStrictEqual({osa:stack.source_authority,shared:stack.shared_runtime,data:stack.runtime_data,recipe:stack.effect_recipe,checkpoint:stack.effect_checkpoint,sync:stack.application_runtime_sync,ui:stack.ui_contract,starter:stack.starter60},{osa:'v1.9.5',shared:'v1.94.2',data:'v0.16.2',recipe:'v0.15.2',checkpoint:'v0.15.2',sync:'v2.63',ui:'v2.53',starter:'v1.6.1'});

// Candidate 14 transient-lock fix remains intact and Landscape-only.
assert(/function v642TabletLandscapePassiveShardPreviewTarget\(target\)/.test(app),'Landscape passive Shard target classifier missing');
assert(/function v642TabletLandscapeShardPreviewSafeDuringTransientLock\(target\)/.test(app),'Candidate 14 transient-lock safety helper missing');
assert(/gameplayInputLocked\(\)&&!safeDuringLock&&!passiveLandscapeShardDuringLock/.test(app),'Candidate 14 input-lock exception regressed');

// Candidate 15: one owner per input mode. Desktop focus/blur stays; touch-first blur cannot hide tap-owned Shard preview.
const shardBinding=app.match(/Array\.prototype\.forEach\.call\(document\.querySelectorAll\('\[data-shard-preview-src\]'\)[\s\S]*?\}\);\n    Array\.prototype\.forEach\.call\(document\.querySelectorAll\('\.hand-card\[data-card-id\]'\)/)?.[0]||'';
assert(shardBinding,'Shard focus/pointer binding block missing');
assert(/focus[^\n]*!isTouchFirstViewport\(\)/.test(shardBinding),'Desktop-only Shard focus ownership missing');
assert(/blur[^\n]*!isTouchFirstViewport\(\)[^\n]*v94HoverZoomHide\(\)/.test(shardBinding),'Touch-first Shard blur still owns preview dismissal');
assert.strictEqual((app.match(/document\.body\.addEventListener\('click'/g)||[]).length,1,'A competing body click router was added');
assert(!/setTimeout\([^)]*(300|350)/.test(app.slice(app.indexOf('function v642TabletLandscapePassiveShardPreviewTarget'),app.indexOf('var GL_V253_DELEGATED_READABLE_PREVIEW_BOUND'))),'Timing workaround introduced into Shard interaction');

// Phone now reuses the same canonical touch Shard tap route and shared readable-preview node.
assert(/function v642TabletShardTap\(el\)/.test(app),'Canonical Shard tap route missing');
assert(/isTouchFirstViewport\(\)/.test(app.match(/function v642TabletShardTap\(el\)[\s\S]*?\n  \}/)?.[0]||''),'Shard tap route is not touch-first scoped');
assert(/physicalResponsiveDeviceFamily\(\)==='mobile'&&responsiveDeviceFamily\(\)==='mobile'/.test(app),'Phone Shard touch route missing');
assert(/phone\?'phone-shard':'field'/.test(app),'Phone does not reuse canonical Shard preview opener');
assert(/mode==='phone-shard'/.test(app),'Phone Shard preview mode is not integrated into shared geometry');
assert(/is-phone-shard-preview/.test(app),'Phone Shard preview marker missing');
assert(/html\.gl-ui-mobile:not\(\.gl-device-tablet\)[\s\S]*#hoverCardZoom\.is-v253-readable-preview\.is-phone-shard-preview/.test(fieldCss),'Phone Shard readable-preview visibility rule missing');

// Approved dimensions stay unchanged.
assert(/Math\.min\(vw\*\.2625,\(vh\*\.625\)\*\(5\/7\)\)/.test(app),'Approved Candidate 14 Tablet Landscape preview sizing changed');
const shardRule=fieldCss.match(/html\.gl-ui-tablet\.gl-tablet-landscape-desktop \.gl-lab-mana-card\s*\{[\s\S]*?\}/)?.[0]||'';
assert(/height:82\.5%!important/.test(shardRule)&&/max-height:84%!important/.test(shardRule)&&/aspect-ratio:5\/7!important/.test(shardRule),'Candidate 14 physical Shard sizing changed');

// Legacy Effect now shares the exact Tablet Landscape Hero-control Y authority with Class/Racial.
assert(/\.heroActions:has\(\.racialAbilityAction,\.classAbilityAction,\.legacyAbilityAction\)\{top:calc\(15\.428% \+ 11px\)!important;\}/.test(fieldCss),'Legacy Effect is not using shared Class/Racial Tablet Landscape position authority');
assert(/html\.gl-ui-tablet\.gl-tablet-landscape-desktop \.gl-lab-positions \.heroActions\{right:3px!important;top:3px!important;max-width:32%!important;width:min\(92px,32%\)!important;\}/.test(fieldCss),'Hero-control X/width baseline changed');
assert(/function compactTabletAbilityLabel\(fullName\)/.test(app),'Compact Class/Racial label logic changed');

assert(/gl-vs-ai-643-lobby/.test(rootIndex),'root VS AI v6.43 shared Lobby cache-buster missing');
assert(/gl-shared-v642-068-c15/.test(tutorialIndex),'Tutorial Candidate 15 shared cache-buster changed');
for(const [name,text] of [['root',rootIndex],['tutorial',tutorialIndex]]){
  assert(/gl-authority-v642-068-c15/.test(text),`${name} Candidate 15 authority cache-buster missing`);
  assert(!/gl-(?:shared|authority)-v642-068-c14/.test(text),`${name} stale Candidate 14 production cache-buster remains`);
}
const pkg=json('package.json'),suite=read('tests/run-v642-browser-suite.cjs');
assert(/run-v642-candidate15-authority-ui\.cjs/.test(pkg.scripts['test:current']),'Candidate 15 authority gate not active');
assert(!/run-v642-candidate14-authority-ui\.cjs/.test(pkg.scripts['test:current']),'Candidate 14 authority gate still active');
assert(/run-v642-candidate15-browser\.cjs/.test(suite),'Candidate 15 browser gate not active');
assert(!/run-v642-candidate14-browser\.cjs/.test(suite),'Candidate 14 browser gate still active');
console.log('PASS Candidate (15) authority/UI architecture: touch-first Shard tap owns preview lifecycle without blur races, Phone reuses the shared Shard preview pipeline, Candidate 14 sizing/input-lock fixes remain locked, and Legacy Effect shares the approved Class/Racial Tablet Landscape Hero-control position.');
