'use strict';
const {assert}=require('../_helpers.cjs');
const b=require('../../Authority/Digital/Blind-Choice/opponent-blind-selection.js');
const hand=['A','B','C','D','E','F'], copy=[...hand], deck=['S1','S2','S3'];
const e1=b.createSelectionEvent({owner_id:'P2',selector_id:'P1',zone:'Hand',candidates:hand,seed:123,event_id:'E1'});
assert(e1.randomized===true,'opponent hand randomization');
assert(JSON.stringify(hand)===JSON.stringify(copy),'must not reorder hidden state');
assert(e1.opaque_choices.every(x=>x.face==='CARD_BACK'&&!('candidate' in x)),'identity leaked before commit');
const seq1=e1.opaque_choices.map(x=>e1.resolve(x.choice_id));
const seq1again=e1.opaque_choices.map(x=>e1.resolve(x.choice_id));
assert(JSON.stringify(seq1)===JSON.stringify(seq1again),'same event mapping must be stable for multi-select');
assert(JSON.stringify(seq1)!==JSON.stringify(hand),'blind mapping must not preserve full identity for >1 candidates');
for(let seed=0;seed<100;seed++){
  const p=b.shuffledIndexes(4,seed);
  assert(!b.isIdentityPermutation(p),`seed ${seed} produced forbidden identity mapping`);
}
const e2=b.createSelectionEvent({owner_id:'P2',selector_id:'P1',zone:'Hand',candidates:hand,seed:124,event_id:'E2'});
const seq2=e2.opaque_choices.map(x=>e2.resolve(x.choice_id));
assert(JSON.stringify(seq1)!==JSON.stringify(seq2),'new event should produce fresh permutation for deterministic regression seeds');
const own=b.createSelectionEvent({owner_id:'P1',selector_id:'P1',zone:'Hand',candidates:hand,seed:123,event_id:'OWN'});
assert(own.randomized===false,'own hand no randomization requirement');
const shard=b.createSelectionEvent({owner_id:'P2',selector_id:'P1',zone:'Shard Pool',candidates:['X','Y','Z'],seed:99,event_id:'SP'});
assert(shard.randomized===true,'opponent shard pool randomization');
assert(JSON.stringify(deck)===JSON.stringify(['S1','S2','S3']),'Shard Deck must not be touched');
console.log('PASS opponent blind selection with non-identity mapping');
