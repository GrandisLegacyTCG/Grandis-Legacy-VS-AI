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

const stack=json('data/config/active-runtime-source-stack.v1.95.json');
assert.deepStrictEqual(
  {osa:stack.source_authority,shared:stack.shared_runtime,data:stack.runtime_data,recipe:stack.effect_recipe,checkpoint:stack.effect_checkpoint,sync:stack.application_runtime_sync,ui:stack.ui_contract,starter:stack.starter60},
  {osa:'v1.9.5',shared:'v1.94.2',data:'v0.16.2',recipe:'v0.15.2',checkpoint:'v0.15.2',sync:'v2.63',ui:'v2.53',starter:'v1.6.1'}
);
assert(!/GL_TABLET_PORTRAIT_HAND_TAP_STATE|v642TabletPortraitHandCardTap|portrait second-tap armed/i.test(app),'Obsolete Tablet Portrait Hand armed/two-tap logic reappeared');

// Tablet Portrait exception is Shard-only and reuses the shared preview node/renderer.
assert(/function isPhysicalTabletPortrait\(\)/.test(app),'Physical Tablet Portrait classifier missing');
assert(/mode==='tablet-portrait-shard'/.test(app),'Tablet Portrait Shard preview mode missing');
assert(/v642DesktopAssetPreviewShow\(src,[\s\S]*isPhysicalTabletPortrait\(\)\?'tablet-portrait-shard':'field'/.test(app),'Portrait/Landscape Shard route does not reuse shared asset preview renderer');
assert(/is-tablet-portrait-shard-preview/.test(app+fieldCss),'Portrait Shard readable-preview class/style missing');
assert(!/portraitShardPreview\(|tabletPortraitPreviewRenderer\(|portraitShardModal\(/.test(app),'Duplicate Portrait Shard renderer introduced');

// Landscape Hand: selected-card state is the deterministic second-tap authority.
assert(/function v642TabletLandscapeHandTap\(target,cardEl\)/.test(app),'Tablet Landscape Hand routing helper missing');
assert(/zoom\._glAnchor===cardEl/.test(app)&&/cardEl\.classList\.contains\('hand-hover-active'\)/.test(app),'Hand second tap is not tied to the same physical Hand DOM card');
assert(/if\(sameSelected\)\{v94HoverZoomHide\(\);showPreview\(cardId,'tablet-hand-detail'\);return true;\}/.test(app),'Hand second tap does not open Detail deterministically');
assert(/target\.closest\('\.hand-actions,\[data-play-index\],\[data-tribute-index\]'\)/.test(app),'Hand action area exclusion missing');
const bodyRouter=app.match(/document\.body\.addEventListener\('click',[\s\S]*?\n    \}\);/)?.[0]||'';
assert(bodyRouter,'Canonical delegated click router missing');
for(const token of ["var play=ev.target.closest('[data-play-index]')","var tribute=ev.target.closest('[data-tribute-index]')","var tabletHand=ev.target.closest('.gl-lab-hand .hand-card[data-card-id]')","var tabletShard=ev.target.closest('[data-shard-preview-src]')","var zoomCard=ev.target.closest('[data-preview]')"]){assert(bodyRouter.includes(token),'Router token missing: '+token);}
assert(bodyRouter.indexOf("var play=ev.target.closest('[data-play-index]')")<bodyRouter.indexOf("var tabletHand=ev.target.closest('.gl-lab-hand .hand-card[data-card-id]')"),'Play must precede Hand second-tap routing');
assert(bodyRouter.indexOf("var tribute=ev.target.closest('[data-tribute-index]')")<bodyRouter.indexOf("var tabletHand=ev.target.closest('.gl-lab-hand .hand-card[data-card-id]')"),'Tribute must precede Hand second-tap routing');
assert(bodyRouter.indexOf("var tabletHand=ev.target.closest('.gl-lab-hand .hand-card[data-card-id]')")<bodyRouter.indexOf("var zoomCard=ev.target.closest('[data-preview]')"),'Hand route must precede generic inspection');

// Battlefield two-stage logic remains the existing physical-DOM implementation.
assert(/GL_TABLET_BATTLEFIELD_TAP_STATE=\{anchor:null\}/.test(app));
assert(/GL_TABLET_BATTLEFIELD_TAP_STATE\.anchor===el/.test(app)&&/zoom\._glAnchor===el/.test(app),'Battlefield same physical card authority changed');

// Candidate 12 responsive policy is enlarged by 25%, still viewport-relative and 5:7.
assert(/Math\.min\(vw\*\.2625,\(vh\*\.625\)\*\(5\/7\)\)/.test(app),'Landscape preview desired size is not Candidate 12 × 1.25');
assert(/function tabletPortraitShardPreviewSize\(\)/.test(app),'Portrait Shard responsive preview size helper missing');
assert(/h=w\*\(7\/5\)/.test(app),'5:7 preview aspect calculation missing');
assert(/--gl-tablet-preview-w/.test(fieldCss)&&/--gl-tablet-preview-h/.test(fieldCss),'Shared Tablet preview CSS variables missing');

// Shard remains pool-based but grows from 66% to 82.5%; Racial Token stays locked at 66%.
assert.strictEqual((fieldCss.match(/html\.gl-ui-tablet\.gl-tablet-landscape-desktop \.gl-lab-mana-card\s*\{/g)||[]).length,1,'Landscape Shard sizing must have one canonical rule');
const shardRule=fieldCss.match(/html\.gl-ui-tablet\.gl-tablet-landscape-desktop \.gl-lab-mana-card\s*\{[\s\S]*?\}/)?.[0]||'';
assert(/height:82\.5%!important/.test(shardRule),'Landscape Shard pool occupancy target missing');
assert(/max-height:84%!important/.test(shardRule)&&/aspect-ratio:5\/7!important/.test(shardRule),'Landscape Shard clamp/aspect missing');
assert(!/var\(--lab-card-[wh]\)/.test(shardRule),'Landscape Shard regressed to Hand/Hero card-size variables');
assert(!/transform\s*:\s*scale/i.test(shardRule),'Landscape Shard uses transform-only scaling');
const racialRule=fieldCss.match(/html\.gl-ui-tablet\.gl-tablet-landscape-desktop \.gl-lab-racial\s*\{[\s\S]*?\}/)?.[0]||'';
assert(/height:66%!important/.test(racialRule),'Racial Token sizing changed outside scope');

// Compact Tablet display is deterministic JS logic, not CSS text-overflow truncation.
assert(/function compactTabletAbilityLabel\(fullName\)/.test(app),'Compact ability label helper missing');
assert(/words\.length>1\?words\[0\]\+'\.\.\.'/.test(app),'Compact label does not implement first-word + ellipsis');
assert(/data-full-ability-label/.test(app)&&/title=/.test(app)&&/aria-label=/.test(app),'Full canonical ability name is not preserved on compact controls');
assert(/tablet-ability-label-full/.test(fieldCss)&&/tablet-ability-label-compact/.test(fieldCss),'Tablet ability label visibility CSS missing');
assert(!/text-overflow:ellipsis!important/.test(fieldCss.match(/\/\* Tablet-landscape Class\/Racial labels:[\s\S]*?\/\* Tablet-landscape resource strip/)?.[0]||''),'Compact label still relies on CSS ellipsis');

for(const [name,text] of [['root',rootIndex],['tutorial',tutorialIndex]]){
  assert(/gl-shared-v642-068-c13/.test(text),`${name} Candidate 13 shared cache-buster missing`);
  assert(/gl-authority-v642-068-c13/.test(text),`${name} Candidate 13 authority cache-buster missing`);
  assert(!/v642-068-c12/.test(text),`${name} stale Candidate 12 cache-buster remains`);
}
const browserSuite=read('tests/run-v642-browser-suite.cjs');
assert(/run-v642-candidate13-browser\.cjs/.test(browserSuite),'Candidate 13 browser gate is not active');
assert(!/run-v642-candidate12-browser\.cjs/.test(browserSuite),'Candidate 12 browser gate remains active');
console.log('PASS Candidate (13) authority/UI architecture: Portrait Shard-only quick preview, Hand same-DOM second-tap Detail, +25% responsive preview, pool-based larger Shard, deterministic compact Tablet labels, and locked gameplay authority.');
