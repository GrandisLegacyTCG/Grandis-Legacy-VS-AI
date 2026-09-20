'use strict';
const {assert}=require('../_helpers.cjs');
const {reducer,stateWith,submit}=require('../_runtime_fixture.cjs');

let injectedSeed='default';
reducer.__test.setBlindSelectionSeedProviderForTests((_state,zone)=>`${injectedSeed}:${zone}`);
function setSeed(seed){injectedSeed=String(seed);}

function handEvent(seed,card='S1-ARC-004',untrustedBlindSeed){
  setSeed(seed);
  let s=stateWith(card==='S1-ARC-004'?'S1-ARC-H001':'S1-ARC-H006',['S1-WAR-H001']);
  s.phase='Deploy';
  s.players.P1.hand=[card];
  s.players.P2.hand=['A','B','C','D','E'];
  s.players.P2.main_deck=[];
  const original=s.players.P2.hand.slice();
  const intent={type:'PLAY_CARD',player_id:'P1',card_id:card};
  if(untrustedBlindSeed!==undefined) intent.blind_seed=untrustedBlindSeed;
  s=submit(s,intent);
  s=submit(s,{type:'SELECT_SOURCE',player_id:'P1',source_slot:'Center'});
  return{s,original};
}

let {s,original}=handEvent(123);
const map1=s.pending.opponent_hand_blind_mapping.slice();
assert(JSON.stringify(map1)!==JSON.stringify([0,1,2,3,4]),'mapping must be randomized before opponent choice and cannot be full identity');
assert(JSON.stringify(s.players.P2.hand)===JSON.stringify(original),'real Hand must not be reordered before commit');
const actions=reducer.getLegalActions(s,'P1').filter(a=>a.type==='SELECT_OPPONENT_HAND_CARD');
assert(actions.length===5&&actions.every(a=>a.card_back&&a.identity_masked&&!('card_id' in a)),'precommit legal actions must be opaque');
assert(JSON.stringify(s.pending.opponent_hand_blind_mapping)===JSON.stringify(map1),'same event must retain one mapping');
s=submit(s,{type:'SELECT_OPPONENT_HAND_CARD',player_id:'P1',hand_index:0});
const chosenReal=map1[0],chosen=original[chosenReal];
assert(JSON.stringify(s.players.P2.hand)===JSON.stringify(original),'selection commit must not mutate Hand before effect resolution');
s=submit(s,{type:'CONFIRM_ACTION',player_id:'P1'});
assert(!s.players.P2.hand.includes(chosen),'mapped chosen card must resolve after commit');
assert(s.players.P2.hand.every((id,i)=>id===original.filter(x=>x!==chosen)[i]),'remaining Hand order must stay canonical');

const e2=handEvent(124).s.pending.opponent_hand_blind_mapping;
assert(JSON.stringify(e2)!==JSON.stringify(map1),'new blind event must create a fresh mapping');

// Player intent cannot choose/bias the production mapping. With the same
// internal authoritative test seed, different malicious intent seeds must not matter.
const maliciousA=handEvent(777,'S1-ARC-004','client-chosen-A').s.pending.opponent_hand_blind_mapping;
const maliciousB=handEvent(777,'S1-ARC-004','client-chosen-B').s.pending.opponent_hand_blind_mapping;
assert(JSON.stringify(maliciousA)===JSON.stringify(maliciousB),'client-supplied blind_seed must be ignored by production reducer path');

// Calculated Plan uses the same pre-selection mapping contract.
let cp=handEvent(321,'S1-THF-028');
assert(cp.s.pending.opponent_hand_blind_mapping.length===5,'Calculated Plan must use blind mapping before selection');

// Opponent Shard Pool: map before choice, do not reorder Pool or touch Shard Deck before commit.
setSeed(99);
let m=stateWith('S1-THF-H001',['S1-WAR-H001']);
m.phase='Deploy';
m.players.P1.hand=['S1-THF-005'];
m.players.P1.mana_deck_initialized=true;
m.players.P1.mana_pool_cards=[];
m.players.P1.mana_pool=0;
m.players.P1.mana_deck=[{mana_id:'own-top',owner_id:'P1',kind:'GENERIC'}];
m.players.P2.mana_deck_initialized=true;
m.players.P2.mana_pool_cards=[{mana_id:'x',owner_id:'P2',kind:'GENERIC'},{mana_id:'y',owner_id:'P2',kind:'CLASS',class_name:'Warrior'},{mana_id:'z',owner_id:'P2',kind:'GENERIC'}];
m.players.P2.mana_pool=3;
m.players.P2.mana_deck=[{mana_id:'deck-stays',owner_id:'P2',kind:'GENERIC'}];
const poolBefore=m.players.P2.mana_pool_cards.map(x=>x.mana_id),deckBefore=JSON.stringify(m.players.P2.mana_deck);
m=submit(m,{type:'PLAY_CARD',player_id:'P1',card_id:'S1-THF-005',blind_seed:'malicious-client-value'});
m=submit(m,{type:'SELECT_SOURCE',player_id:'P1',source_slot:'Center'});
const shardMap=m.pending.opponent_mana_blind_mapping.slice();
assert(shardMap.length===3&&JSON.stringify(shardMap)!==JSON.stringify([0,1,2]),'opponent Shard mapping must randomize before choice and cannot be full identity');
let shardActs=reducer.getLegalActions(m,'P1').filter(a=>a.type==='SELECT_OPPONENT_SHARD');
assert(shardActs.every(a=>a.card_back&&a.identity_masked&&!('mana_id' in a)),'Shard choices must be opaque');
m=submit(m,{type:'SELECT_OPPONENT_SHARD',player_id:'P1',shard_index:0});
assert(JSON.stringify(m.players.P2.mana_pool_cards.map(x=>x.mana_id))===JSON.stringify(poolBefore),'Shard Pool order must not change before effect resolution');
assert(JSON.stringify(m.players.P2.mana_deck)===deckBefore,'Shard Deck must never be shuffled by blind selection');
m=submit(m,{type:'CONFIRM_ACTION',player_id:'P1'});
assert(JSON.stringify(m.players.P2.mana_deck.slice(0,1))===JSON.stringify([{mana_id:'deck-stays',owner_id:'P2',kind:'GENERIC'}]),'existing Shard Deck order must remain; removed Shard returns to bottom');

// Own resources are not forced into opponent-blind flow.
let own=stateWith('S1-ARC-H001',['S1-WAR-H001']);
own.phase='Deploy';
own.players.P1.hand=['S1-ARC-013','S1-ARC-002'];
own=submit(own,{type:'PLAY_CARD',player_id:'P1',card_id:'S1-ARC-013'});
assert(!own.pending.requires_opponent_hand_choice&&!own.pending.requires_opponent_mana_choice,'own normal actions must not get opponent blind randomization');

console.log('PASS opponent blind selection integration through reducer with authoritative seed security');
