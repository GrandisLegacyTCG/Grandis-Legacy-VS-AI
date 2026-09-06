
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const runtimeData=require(path.join(root,'data/season1/cards.runtime.v0.14.3.json'));
const recipes=require(path.join(root,'data/season1/effect-recipes.runtime.v0.13.3.json'));
const {createInitialRuntimeState,submitIntent,getLegalActions}=require(path.join(root,'runtime-source/runtime/core/reducer.js'));
const cardsById=Object.fromEntries(runtimeData.cards.map(c=>[c.card_id,c]));
function deck(ids=['S1-WAR-H001']){return{starting_hero_ids:['Left','Center','Right'].map((slot,i)=>({slot,card_id:ids[i]||ids[0]})),main_deck_card_counts:{'S1-EVT-001':12,'S1-WAR-001':2},legacy_deck_card_ids:[]}}
function fresh(){const s=createInitialRuntimeState({runtime_data:{cards_by_id:cardsById,effect_recipes:recipes},player_deck:deck(['S1-WAR-H001']),opponent_deck:deck(['S1-ARC-H001'])});s.phase='Battle';s.active_player_id='PLAYER';s.players.PLAYER.mana_pool=99;s.players.AI.mana_pool=99;return{s}}
function ok(b,intent){const r=submitIntent(b.s,intent);assert.deepStrictEqual(r.errors||[],[],JSON.stringify({intent,errors:r.errors}));b.s=r.state;return r}
function attack(b){ok(b,{type:'PLAY_CARD',player_id:'PLAYER',card_id:'S1-WAR-001'});if(b.s.pending?.source_required)ok(b,{type:'SELECT_SOURCE',player_id:'PLAYER',source_slot:'Left'});if(b.s.pending?.target_required)ok(b,{type:'SELECT_TARGET_SLOT',player_id:'PLAYER',target_player_id:'AI',target_slot:'Left'});ok(b,{type:'CONFIRM_ACTION',player_id:'PLAYER'});}
for(const cardId of ['S1-ITM-012','S1-ARC-003']){
  const unavailable=fresh();unavailable.s.players.PLAYER.hand=['S1-WAR-001'];unavailable.s.players.AI.hand=[cardId];attack(unavailable);
  assert.ok(!getLegalActions(unavailable.s,'AI').some(a=>a.type==='DECLARE_RESPONSE'&&a.card_id===cardId),`${cardId} must be unavailable without another card to pay`);
  const b=fresh();b.s.players.PLAYER.hand=['S1-WAR-001'];b.s.players.AI.hand=[cardId,cardId,'S1-EVT-001'];attack(b);
  assert.ok(getLegalActions(b.s,'AI').some(a=>a.type==='DECLARE_RESPONSE'&&a.card_id===cardId),`${cardId} must be available with another exact card instance`);
  ok(b,{type:'DECLARE_RESPONSE',player_id:'AI',card_id:cardId,source_slot:'Left',hand_index:0});
  ok(b,{type:'CONFIRM_RESPONSE',player_id:'AI'});
  assert.ok(!b.s.response_window&&b.s.response_payment&&b.s.response_payment.committed,'Confirm Response must close the old Response Window and enter mandatory payment');
  const self=submitIntent(b.s,{type:'SELECT_RESPONSE_COST_CARD',player_id:'AI',hand_index:0,card_id:cardId});
  assert.ok((self.errors||[]).some(x=>/cannot discard itself/i.test(x)),`${cardId} source instance incorrectly paid for itself`);
  ok(b,{type:'SELECT_RESPONSE_COST_CARD',player_id:'AI',hand_index:1,card_id:cardId});
  ok(b,{type:'CONFIRM_RESPONSE_PAYMENT',player_id:'AI'});
  assert.ok(b.s.response_window&&b.s.response_priority_player_id==='PLAYER','counter-Response priority did not open only after payment');
  assert.strictEqual(b.s.players.AI.hand.filter(x=>x===cardId).length,0,'committed Response + same-ID payment copy were not removed from Hand');
}
const app=fs.readFileSync(path.join(root,'js/app.bundle.js'),'utf8');
assert.ok(app.includes('function beginResponsePayment(state,rw,responseOption)')&&app.includes('function openCommittedResponseCounterWindow(state,attackWindow,responseOption,incomingFamily)'),'application UI is not using generic committed payment framework');
console.log('PASS VS AI v6.28: SGH and Escape Arrow use one generic Confirm -> close Response -> mandatory payment -> new counter-Response hierarchy, including exact-instance self exclusion.');
