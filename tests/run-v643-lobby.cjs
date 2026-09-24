'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert');
const ROOT=path.resolve(__dirname,'..');
const read=r=>fs.readFileSync(path.join(ROOT,r),'utf8');
const json=r=>JSON.parse(read(r));
const sha=r=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,r))).digest('hex');
const app=read('shared-app/app.bundle.js'),css=read('shared-app/app.css'),index=read('index.html'),tutorialIndex=read('tutorial/index.html');
assert.strictEqual(json('package.json').version,'6.45.0');
assert.strictEqual(json('tutorial/package.json').version,'0.68.0');
const stack=json('data/config/active-runtime-source-stack.v1.95.json');
assert.strictEqual(stack.vs_ai,'v6.45');assert.strictEqual(stack.tutorial,'v0.68');assert.strictEqual(stack.card_count,200);assert.strictEqual(stack.active_starter_count,5);
assert(/shared-app\/app\.bundle\.js\?v=gl-vs-ai-645-opponent-hand-ai-reposition/.test(index),'Root Lobby does not load canonical shared-app bundle');
assert(/window\.GL_APP_MODE="LOCAL_AI"/.test(index));assert(/window\.GL_APP_MODE="TUTORIAL"/.test(tutorialIndex));
// Navigation authority.
for(const url of ['https://grandislegacytcg.github.io/','https://grandislegacytcg.github.io/Grandis-Legacy-Deck-Builder/style-1/','https://grandislegacytcg.github.io/pvp/']) assert(index.includes(url),`Missing route ${url}`);
assert(!index.includes('Grandis-Legacy-Deck-Builder/style-2/'),'VS AI mobile navigation still points at Deck Builder Style 2');
assert(/<a class="ai-lobby-logo" href="https:\/\/grandislegacytcg\.github\.io\/" aria-label="Grandis Legacy homepage">/.test(app),'Lobby logo semantic Home link missing');
assert(app.includes('href="https://grandislegacytcg.github.io/Grandis-Legacy-Deck-Builder/style-1/"'),'Desktop Deck Builder Style 1 link missing');
assert(app.includes('href="https://grandislegacytcg.github.io/Grandis-Legacy-VS-AI/tutorial/"'),'Desktop Tutorial link missing');
assert(app.includes('href="https://grandislegacytcg.github.io/pvp/"'),'Desktop PvP link missing');
const lobbyHeader=app.slice(app.indexOf('function renderStartupDeckSetup'),app.indexOf('function playerTurnBannerKey'));
assert(!/target="_blank"/.test(lobbyHeader),'Home/Deck Builder/PvP/Tutorial Lobby navigation must be same-tab');
// Formation + rank implementation.
assert(/vsai-v643-formation-grid/.test(app));assert(/vsai-v643-swap-button/.test(app));assert(/data-vsai-swap-left/.test(app));
assert(/function swapSetupFormation\(side,leftLane,rightLane\)/.test(app));
assert(/formation\[leftLane\]=right;formation\[rightLane\]=left/.test(app),'Formation swap does not mutate actual selected deck formation');
assert(/GL_SETUP_RANK_VIEW\[side\]=1/.test(app),'Starter/import Rank reset missing');
const rankFn=app.match(/function cycleSetupRank\(side,delta\)\{[\s\S]*?\n  \}/)?.[0]||'';
assert(rankFn&&/GL_SETUP_RANK_VIEW\[side\]=next;render\(\)/.test(rankFn),'Rank local preview state missing');
assert(!/WebSocket|applyServerIntent|postMessage|startMatch|appState\s*=/.test(rankFn),'Rank preview gained gameplay/network mutation');
// Exact Style 1 component language.
for(const token of [
  'grid-template-columns:minmax(0,1fr) 27px minmax(0,1fr) 27px minmax(0,1fr)',
  'width:27px;height:27px;padding:0;display:grid;place-items:center;border:0;border-radius:50%;background:#0aa8f6;color:#fff;font-size:17px;font-weight:900',
  'width:max-content;margin:17px auto 0;display:grid;grid-template-columns:31px 74px 31px;align-items:center;border:1px solid #40424c;border-radius:7px;background:#121318;overflow:hidden',
  'height:31px;padding:0;border:0;border-radius:0;background:transparent;color:#fff;font-size:22px',
  'text-align:center;color:#f0d27f;font-size:10px'
]) assert(css.includes(token),`Deck Builder Style 1 token missing: ${token}`);
assert(!/vsai-v643[^\n]*(?:\.svg|\.png|\.webp)/i.test(app+css),'New Rank/swap image asset invented');
// Candidate 15 Battlefield + Tutorial-specific controller hard locks.
const locked={
  'shared-ui/battlefield-ui.js':'110394df12e3052bbcc961de24dad29b5734af65d0a7c0afdd2c8ffdaf8a81cb',
  'shared-ui/battlefield-ui.css':'2b70d63c74081a8809b2a2d456ec1b620a9a078ab84f597c0607a928503a9378',
  'shared-app/battlefield-authority.css':'ddc769fed48f8f9ad7de15e5630d7babc7d60cfb6365db5eb30b9415932a15a0',
  'tutorial/js/tutorial-guide.js':'7a5f56729cd20bd173321cef7958c78ee7c6c652ec17f56fa2f01c6121e3a367'
};
for(const [f,h] of Object.entries(locked))assert.strictEqual(sha(f),h,`${f} hard lock changed`);
assert.strictEqual(json('tutorial/package.json').version,'0.68.0');
assert(!/vsai-v643-(?:formation-grid|swap-button|rank-control)/.test(tutorialIndex),'Tutorial HTML unexpectedly owns VS AI Lobby controls');
// Generated mirrors must stay synchronized to canonical shared source architecture.
assert.strictEqual(sha('js/app.bundle.js'),sha('tutorial/js/app.bundle.js'),'Generated JS deployment mirrors diverged');
assert.strictEqual(sha('css/app.css'),sha('tutorial/css/app.css'),'Generated CSS deployment mirrors diverged');
console.log('PASS VS AI v6.45 static Lobby authority: canonical active bundle, navigation repair, Style 1 formation/Rank controls, local-only Rank preview, locked Battlefield/Tutorial controller, and synchronized generated mirrors.');
