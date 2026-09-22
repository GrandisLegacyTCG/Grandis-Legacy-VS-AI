'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const ROOT=path.resolve(__dirname,'..');
const read=r=>fs.readFileSync(path.join(ROOT,r),'utf8');
const json=r=>JSON.parse(read(r));
const app=read('shared-app/app.bundle.js');
const appCss=read('shared-app/app.css');
const fieldCss=read('shared-app/battlefield-authority.css');
const allCss=appCss+'\n'+fieldCss;
const rootIndex=read('index.html'),tutorialIndex=read('tutorial/index.html');
const pkg=json('package.json'),tpkg=json('tutorial/package.json');
assert.strictEqual(pkg.version,'6.42.0');
assert.strictEqual(tpkg.version,'0.68.0');

// Locked authority/runtime baseline stays unchanged by this UI-only correction.
const stack=json('data/config/active-runtime-source-stack.v1.95.json');
assert.deepStrictEqual(
  {osa:stack.source_authority,shared:stack.shared_runtime,data:stack.runtime_data,recipe:stack.effect_recipe,checkpoint:stack.effect_checkpoint,sync:stack.application_runtime_sync,ui:stack.ui_contract,starter:stack.starter60},
  {osa:'v1.9.5',shared:'v1.94.2',data:'v0.16.2',recipe:'v0.15.2',checkpoint:'v0.15.2',sync:'v2.63',ui:'v2.53',starter:'v1.6.1'}
);

// Existing gameplay authority safeguards remain intact.
const cards=json('data/season1/cards.runtime.v0.16.2.json').cards;
const persistent=cards.filter(c=>c?.staging?.requires_attachment_slot===true);
assert.strictEqual(persistent.length,24,'Expected 24 authority-defined persistent attachment cards');
assert(!/triple_shot_bind/i.test(app),'Stale Triple Shot physical-card binding remains');
assert(!/remaining_count\s*\|\|\s*1/.test(app),'Unsafe remaining_count || 1 fallback remains');
assert.strictEqual((app.match(/var legacyWarning=/g)||[]).length,1,'Legacy warning must have exactly one render source');
assert(!/touch-tablet-preview|gl-tablet-hand-actions/.test(app+allCss),'Obsolete tablet Preview button/portal implementation remains');
assert(!/isTouchTabletPortraitViewport|v642TabletPortraitHandCardTap|GL_TABLET_PORTRAIT_HAND_TAP_STATE|resetTabletPortraitHandTapState/.test(app),'Obsolete Tablet Portrait armed/two-tap implementation remains');

// One canonical Tablet Landscape touch router: Hand -> Battlefield, plus Shard before generic inspection.
assert(/function v642TabletLandscapeHandTap\(el\)/.test(app),'Tablet Landscape Hand touch translation missing');
assert(/return v59HandHoverZoomShow\(cardId,cardEl\)/.test(app),'Tablet Hand does not reuse existing Desktop Hand hover machinery');
assert(/function v642TabletBattlefieldCardTap\(el\)/.test(app),'Tablet Battlefield touch translation missing');
assert(/GL_TABLET_BATTLEFIELD_TAP_STATE=\{anchor:null\}/.test(app),'Tablet Battlefield instance state missing');
assert(/GL_TABLET_BATTLEFIELD_TAP_STATE\.anchor===el/.test(app)&&/zoom\._glAnchor===el/.test(app),'Battlefield second tap is not tied to the same DOM instance');
assert(/v253OpenDesktopPreview\(fullFor\(cardId\),cardName\(card\(cardId\)\),el,'field',true\)/.test(app),'Battlefield first tap does not reuse shared preview renderer with touch enabled');
assert(/function v642TabletShardTap\(el\)/.test(app),'Tablet Shard quick-preview route missing');
assert(/v642DesktopAssetPreviewShow\(src,el\.getAttribute\('data-shard-preview-label'\)\|\|'Face-up Shard',el,true\)/.test(app),'Shard touch does not reuse existing asset preview renderer');
const router=app.match(/var tabletShard=ev\.target\.closest\('\[data-shard-preview-src\]'\);[\s\S]*?var zoomCard=ev\.target\.closest\('\[data-preview\]'\);[\s\S]*?showPreview\(zoomCard\.getAttribute\('data-preview'\)\); return;/)?.[0]||'';
assert(router,'Canonical delegated Tablet preview route missing');
assert(router.indexOf('v642TabletLandscapeHandTap(zoomCard)')<router.indexOf('v642TabletBattlefieldCardTap(zoomCard)'),'Hand must route before Battlefield');
assert(router.indexOf('v642TabletBattlefieldCardTap(zoomCard)')<router.indexOf("showPreview(zoomCard.getAttribute('data-preview'))"),'Generic inspection must remain after Tablet-specific routing');

// Responsive readable preview: viewport-relative on Tablet Landscape, Desktop constants remain fallback only.
assert(/function v642TabletLandscapePreviewSize\(\)/.test(app),'Responsive Tablet preview sizing helper missing');
assert(/Math\.min\(vw\*\.21,\(vh\*\.50\)\*\(5\/7\)\)/.test(app),'Tablet preview is not viewport-relative');
assert(/h=w\*\(7\/5\)/.test(app),'Tablet preview 5:7 aspect calculation missing');
assert(/tabletSize\?tabletSize\.w:250/.test(app)&&/tabletSize\?tabletSize\.h:350/.test(app),'Desktop fixed size is no longer isolated as fallback');
assert(/--gl-tablet-preview-w/.test(fieldCss)&&/--gl-tablet-preview-h/.test(fieldCss),'Tablet responsive preview CSS variables missing');
assert(/aspect-ratio:5\/7!important/.test(fieldCss),'Tablet preview/card 5:7 aspect authority missing');

// Resource strip fit-to-space replaces the obsolete card-size ratio gate.
assert.strictEqual((fieldCss.match(/html\.gl-ui-tablet\.gl-tablet-landscape-desktop \.gl-lab-mana-card\s*\{/g)||[]).length,1,'Tablet Landscape Shard sizing must have one canonical rule');
const shardRule=fieldCss.match(/html\.gl-ui-tablet\.gl-tablet-landscape-desktop \.gl-lab-mana-card\s*\{[\s\S]*?\}/)?.[0]||'';
assert(/height:66%!important/.test(shardRule),'Tablet Shard height is not derived from resource-strip height');
assert(/width:auto!important/.test(shardRule)&&/aspect-ratio:5\/7!important/.test(shardRule),'Tablet Shard width/aspect does not follow fit-to-space height');
assert(!/var\(--lab-card-[wh]\)/.test(shardRule),'Tablet Shard still depends on unrelated Hand/Hero card-size variables');
assert(!/transform\s*:\s*scale/i.test(shardRule),'Tablet Shard sizing uses transform-only scaling');
const racialRule=fieldCss.match(/html\.gl-ui-tablet\.gl-tablet-landscape-desktop \.gl-lab-racial\s*\{[\s\S]*?\}/)?.[0]||'';
assert(/height:66%!important/.test(racialRule),'Tablet Racial Token stack is not derived from resource-strip height');
assert(/\.gl-lab-racial \.coin\{[\s\S]*?aspect-ratio:1\/1!important/.test(fieldCss),'Racial Token circles do not preserve circular aspect ratio');
assert(!/calc\(var\(--lab-card-w\)\s*\*\s*\.66\)/.test(fieldCss),'Obsolete Shard card-width ratio rule remains active');

// Portrait Phase Tracker uses the compact internally-consistent rule; obsolete 52px lock is gone.
assert(/grid-template-rows:18px 30px 58px!important/.test(appCss),'Compact Portrait Phase Panel rows missing');
assert(/\.v96-app \.phase-actions\{grid-template-rows:24px 30px!important;gap:3px!important\}/.test(appCss),'Compact Portrait Phase Actions geometry missing');
assert(/\.v96-app \.phase-actions \.next-phase\{height:30px!important;min-height:30px!important/.test(appCss),'Compact Portrait Next Phase height missing');
assert(!/grid-template-rows:38px 52px/.test(appCss),'Obsolete Portrait 38px/52px Phase Actions lock remains');
assert(!/\.phase-actions \.next-phase\s*\{\s*height:52px!important/.test(appCss),'Obsolete Portrait 52px Next Phase lock remains');

// Modal/inspection openings clear stale Tablet Landscape Hand hover via the existing cleanup path.
assert(/function showDiscard\(side\)\{\s*if\(isTouchTabletViewport\(\)\)v94HoverZoomHide\(\)/.test(app),'Discard modal does not clear Tablet Landscape touch preview');
assert(/function showLegacyDeck\(side\)\{[\s\S]*?if\(isTouchTabletViewport\(\)\)v94HoverZoomHide\(\)/.test(app),'Legacy modal does not clear Tablet Landscape touch preview');
assert(/function showInfo\(title, body\)\{ if\(isTouchTabletViewport\(\)\)v94HoverZoomHide\(\)/.test(app),'Info modal does not clear Tablet Landscape touch preview');

// Candidate cache refresh is production-entry consistent without changing public versions.
for(const [name,text] of [['root',rootIndex],['tutorial',tutorialIndex]]){
  assert(/gl-shared-v642-068-c12/.test(text),`${name} Candidate 12 shared cache-buster missing`);
  assert(/gl-authority-v642-068-c12/.test(text),`${name} Candidate 12 authority cache-buster missing`);
  assert(!/v642-068-c11/.test(text),`${name} stale Candidate 11 cache-buster remains`);
}

// Active browser suite must no longer enforce obsolete historical tablet behavior.
const browserSuite=read('tests/run-v642-browser-suite.cjs');
assert(/run-v642-candidate12-browser\.cjs/.test(browserSuite),'Candidate 12 real-touch browser gate is not active');
for(const old of ['candidate6-browser','candidate7-browser','candidate8-browser','candidate10-browser']) assert(!browserSuite.includes(old),`Obsolete ${old} remains an active release gate`);

console.log('PASS Candidate (12) authority/UI architecture: canonical touch routing, viewport-relative previews, resource-strip fit, compact Portrait Phase geometry, stale-state cleanup, cache refresh, and locked gameplay/runtime authority preserved.');
