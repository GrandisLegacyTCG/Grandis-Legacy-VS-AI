'use strict';
const path=require('path');
const {loadLocalAI}=require('./vm-local-ai-harness.cjs');
const root=path.resolve(__dirname,'..','..');
const ctx=loadLocalAI(root),b=ctx.GL_LOCAL_AI_BRIDGE;
function need(v,m){if(!v)throw Error(m)}
const keys=Object.keys(b.getStarterDeckOptions());need(keys.length>=2,'starter decks unavailable');
b.setRenderSuppressed(true);b.setDeckSelections(keys[0],keys[1]);b.startSharedMatch({playerDeckKey:keys[0],player2DeckKey:keys[1]});b.completeOpeningFlow('PLAYER',{choice:'HEADS',outcome:'HEADS'});
let snap=b.getSnapshot(),s=snap.appState;
// Deterministic Deploy action using the new physical Mana Pool, not the legacy scalar-only fixture.
s.turn='PLAYER';s.phase='Deploy';s.pending=null;s.responseWindow=null;s.playerHand=['S1-EVT-002'];
s.playerManaPoolCards=[0,1,2,3].map(i=>({uid:'TEST:GENERIC:'+i,kind:'GENERIC',class_name:'',owner_side:'PLAYER',bottom_locked:false}));s.mana=4;
s.playerDeck=['S1-EVT-001','S1-EVT-001','S1-EVT-001','S1-EVT-001'];s.playerDeckCount=4;s.playerDiscard=[];s.aiHand=[];s.aiDiscard=[];
for(const lane of ['LEFT','CENTER','RIGHT']){if(s.playerHeroes[lane])s.playerHeroes[lane].exhausted=false;}
need(b.importSnapshot(snap,{silent:true})!==false,'snapshot import failed');
let r=b.applyServerIntent('beginPlayFromHand',[0]);need(r.ok,'Market Bargain begin failed: '+r.error);need(r.snapshot.appState.pending&&r.snapshot.appState.pending.type==='source_selection','Market Bargain source validation did not open');
r=b.applyServerIntent('chooseHeroFromBoard',['PLAYER','LEFT']);need(r.ok,'Market Bargain source commit failed: '+r.error);s=r.snapshot.appState;
need(s.pending===null,'Market Bargain remained pending after legal source');
need(s.playerDiscard.includes('S1-EVT-002'),'Market Bargain did not resolve to Discard');
need(s.mana===2&&s.playerManaPoolCards.length===2,'2-Mana payment did not consume exactly two physical Mana Shards');
need(s.playerHand.length===2&&s.playerDeck.length===2,'Market Bargain Draw 2 did not resolve');
need(s.playerHeroes.LEFT.exhausted===true,'validated Event source did not Exhaust as current authority requires');
console.log('PASS physical-Mana gameplay smoke: a real Deploy action validates source, spends two physical Mana Shards, resolves Draw 2, Discards the Event, and Exhausts its source.');
