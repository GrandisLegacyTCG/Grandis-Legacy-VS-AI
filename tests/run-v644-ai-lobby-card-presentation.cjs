'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert');
const ROOT=path.resolve(__dirname,'..');
const read=r=>fs.readFileSync(path.join(ROOT,r),'utf8');
const json=r=>JSON.parse(read(r));
const sha=r=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,r))).digest('hex');
const app=read('shared-app/app.bundle.js'),css=read('shared-app/app.css'),index=read('index.html');
assert.strictEqual(json('package.json').version,'6.44.0');
assert.strictEqual(json('tutorial/package.json').version,'0.68.0');
const stack=json('data/config/active-runtime-source-stack.v1.95.json');
assert.strictEqual(stack.vs_ai,'v6.44');assert.strictEqual(stack.tutorial,'v0.68');assert.strictEqual(stack.card_count,200);assert.strictEqual(stack.active_starter_count,5);
assert(index.includes('shared-app/app.bundle.js?v=gl-vs-ai-644-ai-lobby-card-presentation'),'Root does not load canonical v6.44 shared-app bundle');
// AI and Player deliberately share the approved v6.43 Style 1 component family.
const swapFn=app.match(/function swapSetupFormation\(side,leftLane,rightLane\)\{[\s\S]*?\n  \}/)?.[0]||'';
const rankFn=app.match(/function cycleSetupRank\(side,delta\)\{[\s\S]*?\n  \}/)?.[0]||'';
assert(swapFn.includes("(side!=='PLAYER'&&side!=='AI')"),'AI setup formation is not admitted by shared swap owner');
assert(rankFn.includes("(side!=='PLAYER'&&side!=='AI')"),'AI Rank preview is not admitted by shared rank owner');
assert(app.includes('data-vsai-side="'+"'"+'+esc(side)+'+"'"+'"')||app.includes('data-vsai-side="'), 'Shared side metadata missing from Lobby controls');
assert(/data-vsai-rank-side/.test(app));
assert(/id=!IS_TUTORIAL_APP\?setupRankHeroId\(d,rankOne,previewRank\):setupRankTwoId/.test(app),'AI/Player non-Tutorial rank preview does not share current Hero data path');
assert(/aiFormation:clone\(\(decks\.AI&&decks\.AI\.default_formation\)\|\|\{\}\)/.test(app),'AI Lobby formation not exposed for regression verification');
assert(/aiRankPreview:setupRankView\('AI'\)/.test(app),'Independent AI Rank state not exposed');
assert(/GL_SETUP_RANK_VIEW\[side\]=1/.test(app),'Deck-change Rank reset missing');
assert(/decks\[side\]=clone\(STARTER_DECK_OPTIONS\[key\]\.deck\)/.test(app),'Deck selection does not reset to selected deck canonical clone');
// Passive Quick Preview shell: remove only decorative frame, not functional target feedback.
const previewRule=css.match(/\.hover-card-zoom img\{[\s\S]*?\}/)?.[0]||'';
for(const t of ['border:0','outline:0','background:transparent','box-shadow:none'])assert(previewRule.includes(t),'Passive Quick Preview cleanup missing '+t);
assert(!/\.hover-card-zoom\.is-modal-zoom img\s*\{/.test(css),'Modal Quick Preview still adds its own image frame');
for(const functional of ['.targetLegal{outline:2px solid','.targetBlocked{outline:2px solid','.targetSelected{outline:2px solid'])assert(css.includes(functional),'Functional gameplay outline removed: '+functional);
// Opponent hand was already clean in approved source; preserve the winning reset.
const opp=css.match(/\.v96-app \.opponent-hand-slot \.back\{[^}]+\}/)?.[0]||'';
for(const t of ['border:0!important','outline:0!important','background:transparent!important','box-shadow:none!important'])assert(opp.includes(t),'Opponent-hand clean presentation missing '+t);
// Phone Card Played uses the equal-size implementation adapted from current PvP.
const phoneStart=css.indexOf('.v96-app .combined-played-card{',css.indexOf('@media(max-width:760px)'));
const phoneSlice=phoneStart>=0?css.slice(phoneStart,phoneStart+700):'';
for(const t of ['width:25px!important','min-width:25px!important','height:35px!important','min-height:35px!important','flex:0 0 25px!important','aspect-ratio:63/88!important'])assert(phoneSlice.includes(t),'Phone Card Played equal-size token missing '+t);
assert(!/combined-played-card[^}]*transform\s*:\s*scale\s*\(/i.test(css),'Card Played uses scale() depth shrink');
// No image assets were invented for the controls.
assert(!/vsai-v643-(?:swap-button|rank-control)[^\n]*(?:\.svg|\.png|\.webp)/i.test(app+css),'New Hero swap/Rank asset invented');
// Tutorial-specific controller is a hard lock for this release.
assert.strictEqual(sha('tutorial/js/tutorial-guide.js'),'7a5f56729cd20bd173321cef7958c78ee7c6c652ec17f56fa2f01c6121e3a367','Tutorial-specific guide changed');
assert.strictEqual(sha('tutorial/css/tutorial-guide.css'),'ef2c532b3eccb2c43a5810f4538c897862bd54051e31805e81d5553a9bbdcc2f','Tutorial-specific guide CSS changed');
console.log('PASS VS AI v6.44 static AI Lobby parity + passive card presentation + equal-size phone Card Played + Tutorial-specific hard lock.');
