'use strict';
const fs=require('fs');
const path=require('path');
const {loadLocalAI}=require('./vm-local-ai-harness.cjs');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'js/app.bundle.js'),'utf8');
const css=fs.readFileSync(path.join(root,'css/app.css'),'utf8');
const ctx=loadLocalAI(root);
const uiFn=ctx.GL_LOCAL_AI_V523_UI_QA_SELF_TEST;
if(typeof uiFn!=='function') throw new Error('v5.35 UI self-test missing');
const uiResult=uiFn();
if(!uiResult||uiResult.ok!==true) throw new Error('v5.35 UI self-test failed: '+JSON.stringify(uiResult));
const castingFn=ctx.GL_LOCAL_AI_V523_CASTING_CARD_PLAYED_QA_SELF_TEST;
if(typeof castingFn!=='function') throw new Error('v5.35 Casting Card Played self-test missing');
const castingResult=castingFn();
if(!castingResult||castingResult.ok!==true) throw new Error('v5.35 Casting Card Played self-test failed: '+JSON.stringify(castingResult));

const finalBlock=css.slice(css.lastIndexOf('Local AI v5.23'));
const inheritedV524Block=css.slice(css.lastIndexOf('Local AI v5.24'));
const v528Block=css.slice(css.lastIndexOf('Local AI v5.30 / PvP Railway v2.5.9 — compact HP overlay correction'));
const v525Block=css.slice(css.lastIndexOf('Mobile resource visual centering — Local AI v5.30'));
const requiredCss=[
  '.hero-health-row.hero-health-overlay',
  '--hp-ratio',
  'width:46px!important',
  'width:32px!important',
  'height:5px!important',
  'font-size:9px!important',
  'background:rgba(1,8,14,.88)!important',
  '.hero-row--opponent .hero-card-anchor',
  '.hero-row--player .hero-card-anchor',
  '.turn-ai:not(.response-active) .hand-card:hover .hand-art'
];
for(const token of requiredCss) if(!finalBlock.includes(token)) throw new Error('missing inherited v5.23 CSS lock '+token);
if(!/top\s*:\s*-5px\s*!important/.test(finalBlock)||!/right\s*:\s*-10px\s*!important/.test(finalBlock)) throw new Error('HP overlay was not moved up/right');
if(!/transform:scaleX\(var\(--hp-ratio,1\)\)\s*!important/.test(finalBlock)) throw new Error('short HP progress bar ratio missing');
if(!/filter:brightness\(1\.08\) drop-shadow/.test(finalBlock)) throw new Error('AI-turn non-moving hover feedback missing');

if(!inheritedV524Block.includes('hover-card-zoom.is-hand-hover')) throw new Error('AI-turn enlarged Hand hover preview CSS missing');
if(!app.includes('Opponent/AI turn locks the original Hand card position')) throw new Error('AI-turn hover preview guard was not removed');
if(/if\(appState&&appState\.turn==='AI'&&!localResponseActive\) return false/.test(app)) throw new Error('AI-turn Hand hover zoom is still blocked');
for(const token of ["url('../assets/Background.png')","background:#151f32","deck-setup-screen.runtime-ui-v14-setup .deck-side"]) if(!inheritedV524Block.includes(token)) throw new Error('Deck Setup Grandis theme missing '+token);

if(!css.includes('.mobile-match-menu-overlay.open')) throw new Error('mobile Match Menu lock missing');
if(!css.includes('.zone[data-zone-type="Discard Pile"] .zoneCard>b')) throw new Error('Discard count alignment lock missing');
if(!css.includes('Mobile resource visual centering — Local AI v5.30')||!css.includes('transform:translate(-50%,-50%)!important')) throw new Error('mobile resource artwork is not centered');
for(const token of ['width:46px!important','height:21px!important','font-size:10px!important','width:34px!important','height:5px!important','left:calc(71.6% - 4px)!important','top:calc(9.8% + 7px)!important','transform-origin:left bottom!important','scale(.94)']) if(!v528Block.includes(token)) throw new Error('missing v5.30 compact HP lock '+token);

const requiredApp=[
  'recordCastingStartEvent',
  'recordCastingExitEvent',
  "casting_stage:'STARTED'",
  "casting_stage:resolved?'RESOLVED':'CANCELED'",
  'related_casting_start_event_id',
  "cancelCasting('Canceled by Stun.'",
  "recordCastingExitEvent(state,releaseEventPc,'RESOLVED'",
  'GL_LOCAL_AI_V523_CASTING_CARD_PLAYED_QA_SELF_TEST',
  'hero-card-anchor',
  'hero-status-overlay',
  'mobileMatchMenuButton',
  'mobileMatchMenuOverlay',
  "state.turn==='AI'?'turn-ai':'turn-player'"
];
for(const token of requiredApp) if(!app.includes(token)) throw new Error('missing v5.30 application lock '+token);
if(!/setProperty\('z-index',String\(GL_MODAL_STACK_SEQUENCE\),'important'\)/.test(app)) throw new Error('newest popup cannot override CSS important z-index');
if(!/showPreview\(btn\.getAttribute\('data-preview'\),'response'\)/.test(app)) throw new Error('Response Window Card Review missing');
if(!/nextVisualFrame\(function\(\)\{\s*playOpeningCoinSound\(\)/.test(app)) throw new Error('coin sound/animation frame sync missing');
if(!/nextVisualFrame\(function\(\)\{\s*if\(item\.play_sound!==false\) playCardMotionSound\(\)/.test(app)) throw new Error('draw sound/card-flight frame sync missing');

if(!css.includes('grid-template-columns:minmax(0,1fr)!important')||!css.includes('.gl-turn-announcement-ribbon')) throw new Error('full-width Deck Setup or turn ribbon CSS missing');
if(!app.includes('maybeShowPlayerTurnBanner(state)')||!app.includes("state.turn!=='PLAYER'||state.phase!=='Draw'")||!app.includes("title.textContent='YOUR TURN'")) throw new Error('local-only Draw Phase turn announcement missing');
if(!app.includes('scaleX(.04)')||!app.includes('setTimeout(onComplete,1000)')||!app.includes("coin.style.filter='none'")||!app.includes('setLocalCoinFaceElement(coin,outcome)')) throw new Error('smooth unfiltered held coin result missing');

console.log('PASS Local AI v5.35 UI locks: 46x21 compact HP, 10px number, 34x5 line, global X -4px / Y +5px anchor, stable Hand, resource alignment and mobile Match Menu.');
console.log('PASS Local AI v5.35 Casting Card Played lifecycle: start plus resolved/canceled Attachment-exit entry, including Stun.');
console.log(JSON.stringify({uiResult,castingResult}));
