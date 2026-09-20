'use strict';
const assert=require('assert');
const path=require('path');
const fs=require('fs');
const ROOT=path.resolve(__dirname,'..');
const blind=require(path.join(ROOT,'runtime-source/runtime/digital/opponent-blind-selection.js'));
const {serializeViewerSafeState}=require(path.join(ROOT,'runtime-source/runtime/adapters/pvp-adapter.js'));

const candidates=['A','B','C','D'];
const a=blind.createSelectionEvent({owner_id:'P2',selector_id:'P1',zone:'HAND',candidates,seed:'seed-A',event_id:'evt-A'});
assert.strictEqual(a.randomized,true);
assert(a.opaque_choices.every(x=>x.face==='CARD_BACK' && !Object.prototype.hasOwnProperty.call(x,'candidate')));
const mappedA=a.opaque_choices.map(x=>a.resolve(x.choice_id));
assert.notDeepStrictEqual(mappedA,candidates,'opponent mapping must not be full identity');
assert.deepStrictEqual(a.opaque_choices.map(x=>a.resolve(x.choice_id)),mappedA,'one event mapping must stay stable');
let mappedB=null;
for(const seed of ['seed-B','seed-C','seed-D','seed-E']){
  const b=blind.createSelectionEvent({owner_id:'P2',selector_id:'P1',zone:'HAND',candidates,seed,event_id:'evt-'+seed});
  const m=b.opaque_choices.map(x=>b.resolve(x.choice_id));
  if(m.join('|')!==mappedA.join('|')){mappedB=m;break;}
}
assert(mappedB,'fresh event seeds should be able to produce a fresh mapping');
const own=blind.createSelectionEvent({owner_id:'P1',selector_id:'P1',zone:'HAND',candidates,seed:'ignored',event_id:'own'});
assert.strictEqual(own.randomized,false);
assert.deepStrictEqual(own.opaque_choices.map(x=>x.candidate),candidates);

const state={
  players:{
    P1:{hand:['P1-A','P1-B'],mana_pool_cards:[{uid:'P1-S',kind:'CLASS',class_name:'Warrior'}],main_deck:['P1-D1'],mana_deck:[{uid:'P1-MD',kind:'GENERIC'}]},
    P2:{hand:['P2-A','P2-B'],mana_pool_cards:[{uid:'P2-S',kind:'CLASS',class_name:'Mage'}],main_deck:['P2-D1'],mana_deck:[{uid:'P2-MD',kind:'GENERIC'}]}
  },
  pending:{opponent_hand_blind_mapping:['secret'],opponent_mana_blind_mapping:['secret'],blind_seed:'secret-seed',server_seed:'server-only',hidden_candidate_id:'CID'},
  event_log:[{private_card_id:'P2-A'}],continuation_queue:[{secret:true}]
};
const p1=serializeViewerSafeState(state,{role:'player',viewer_id:'P1'});
assert.deepStrictEqual(p1.players.P1.hand,['P1-A','P1-B'],'owner hand should remain visible to owner');
assert(p1.players.P2.hand.every(x=>x.card_back&&x.hidden_identity),'opponent hand identities must be hidden');
assert(p1.players.P2.mana_pool_cards.every(x=>x.card_back&&x.hidden_identity),'opponent hidden Shard identities must be hidden');
assert(!('opponent_hand_blind_mapping' in p1.pending));
assert(!('opponent_mana_blind_mapping' in p1.pending));
assert(!('blind_seed' in p1.pending));
assert(!('server_seed' in p1.pending));
assert(!('hidden_candidate_id' in p1.pending));
assert.deepStrictEqual(p1.event_log,[]);
assert.deepStrictEqual(p1.continuation_queue,[]);
const p2=serializeViewerSafeState(state,{role:'player',viewer_id:'P2'});
assert(p2.players.P1.hand.every(x=>x.card_back&&x.hidden_identity),'player B view must hide player A hand');
const spectator=serializeViewerSafeState(state,{role:'spectator'});
assert(spectator.players.P1.hand.every(x=>x.card_back));
assert(spectator.players.P2.hand.every(x=>x.card_back));

for(const rel of ['js/app.bundle.js','tutorial/js/app.bundle.js']){
  const src=fs.readFileSync(path.join(ROOT,rel),'utf8');
  assert(!/blind_seed/i.test(src),rel+' must not accept a production player-controlled blind seed');
}
console.log('PASS v6.42 runtime security: opponent blind mapping is opaque/non-identity, own zones are not forced blind, and viewer-safe serialization hides opponent/server-only information.');
