'use strict';
const {assert}=require('../_helpers.cjs');
const {PvPAdapterContract}=require('../../../runtime-source/runtime/adapters/pvp-adapter.js');

const adapter=new PvPAdapterContract({submitIntent:(state)=>({state,events:[],errors:[]})});
const state={
  game_id:'hidden-info-test',
  players:{
    P1:{
      player_id:'P1',
      hand:['P1-OWN-HAND-SECRET'],
      main_deck:['P1-DECK-SECRET'],
      main_deck_card_counts:{'P1-DECK-SECRET':1},
      mana_pool_cards:[{mana_id:'P1-OWN-SHARD-SECRET',kind:'CLASS',class_name:'Archer'}],
      mana_deck:[{mana_id:'P1-DECK-SHARD-SECRET',kind:'GENERIC'}],
      mana_deck_ultimate_card_ids:['P1-ULT-SECRET']
    },
    P2:{
      player_id:'P2',
      hand:['P2-HAND-SECRET-A','P2-HAND-SECRET-B'],
      main_deck:['P2-DECK-SECRET'],
      main_deck_card_counts:{'P2-DECK-SECRET':1},
      mana_pool_cards:[{mana_id:'P2-SHARD-SECRET',kind:'CLASS',class_name:'Warrior'}],
      mana_deck:[{mana_id:'P2-DECK-SHARD-SECRET',kind:'GENERIC'}],
      mana_deck_ultimate_card_ids:['P2-ULT-SECRET']
    }
  },
  pending:{
    requires_opponent_hand_choice:true,
    opponent_hand_blind_mapping:[1,0],
    selected_opponent_hand_index:1,
    selected_opponent_hand_opaque_index:0,
    opponent_mana_blind_mapping:[0],
    selected_opponent_mana_indices:[0],
    selected_opponent_mana_opaque_indices:[0],
    server_blind_seed:'SERVER-SEED-SECRET'
  },
  continuation_queue:[{drawn_card_id:'P2-HAND-SECRET-A'}],
  event_log:[{player_id:'P2',card_id:'P2-HAND-SECRET-A',payload:{returned_card_id:'P2-HAND-SECRET-B'}}]
};

const p1=adapter.serializeForPlayer(state,'P1');
const p1Text=JSON.stringify(p1);
assert(p1.players.P1.hand[0]==='P1-OWN-HAND-SECRET','player should retain own Hand identity');
assert(p1.players.P1.mana_pool_cards[0].mana_id==='P1-OWN-SHARD-SECRET','player should retain own visible Shard Pool identity');
assert(p1.players.P2.hand.length===2&&p1.players.P2.hand.every(x=>x.hidden_identity),'opponent Hand must be masked');
assert(p1.players.P2.mana_pool_cards.length===1&&p1.players.P2.mana_pool_cards[0].hidden_identity,'opponent Shard Pool must be masked');
assert(!p1Text.includes('P2-HAND-SECRET-A')&&!p1Text.includes('P2-HAND-SECRET-B'),'opponent Hand identity leaked to P1');
assert(!p1Text.includes('P2-SHARD-SECRET'),'opponent hidden Shard identity leaked to P1');
assert(!p1Text.includes('SERVER-SEED-SECRET'),'server seed leaked to P1');
assert(!('opponent_hand_blind_mapping' in p1.pending)&&!('opponent_mana_blind_mapping' in p1.pending),'blind mapping leaked to P1');
assert(!('selected_opponent_hand_index' in p1.pending)&&!('selected_opponent_mana_indices' in p1.pending),'real selected indices leaked to P1');
assert(Array.isArray(p1.event_log)&&p1.event_log.length===0,'authoritative event log must not be exposed wholesale');
assert(Array.isArray(p1.continuation_queue)&&p1.continuation_queue.length===0,'authority continuation queue must not expose hidden identity');
assert(p1.players.P1.main_deck[0].hidden_identity&&p1.players.P1.mana_deck[0].hidden_identity,'own ordered Deck identities must remain hidden');

const p2=adapter.serializeForPlayer(state,'P2');
const p2Text=JSON.stringify(p2);
assert(p2.players.P2.hand[0]==='P2-HAND-SECRET-A','P2 should retain own Hand identity');
assert(!p2Text.includes('P1-OWN-HAND-SECRET'),'P1 Hand identity leaked to P2');
assert(!p2Text.includes('P1-OWN-SHARD-SECRET'),'P1 Shard identity leaked to P2');

const spectator=adapter.serializeForSpectator(state);
const spectatorText=JSON.stringify(spectator);
for(const secret of ['P1-OWN-HAND-SECRET','P2-HAND-SECRET-A','P2-HAND-SECRET-B','P1-OWN-SHARD-SECRET','P2-SHARD-SECRET','SERVER-SEED-SECRET']) {
  assert(!spectatorText.includes(secret),`spectator leaked ${secret}`);
}

const defaultView=adapter.serializeState(state);
assert(JSON.stringify(defaultView)===JSON.stringify(spectator),'serializeState without viewer must be spectator-safe');
const server=adapter.serializeAuthoritativeState(state);
assert(server.players.P2.hand[0]==='P2-HAND-SECRET-A'&&server.pending.opponent_hand_blind_mapping[0]===1,'authoritative server state must retain hidden data internally');

console.log('PASS viewer-safe PvP serialization hides opponent Hand/Shard identities, blind mappings, and seeds');
