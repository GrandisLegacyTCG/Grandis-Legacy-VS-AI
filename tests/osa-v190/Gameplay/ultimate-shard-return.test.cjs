'use strict';
const {read,assert}=require('../_helpers.cjs');
const d=read('Authority/Game/Cards/cards.canonical.v1.6.0.json');let n=0;
for(const c of d.cards){const t=c.rules?.execution?.tribute?.additional_cost;if(t&&t.kind==='matching_class_shard'){n++;assert(t.destination_after_use==='bottom_of_owner_shard_deck_payment_batch_matching_class_last',`${c.card_id} obsolete return`)}}
assert(n===10,`expected 10 Ultimate class-shard costs, got ${n}`); console.log('PASS Ultimate Shard return: 10 cards');
