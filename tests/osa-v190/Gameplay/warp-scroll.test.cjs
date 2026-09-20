'use strict';
const {assert,read}=require('../_helpers.cjs');
const bucket=require('../../Authority/Runtime/Shared/effects/recipe-bucket-engine.js');
const cards=read('Authority/Game/Cards/cards.canonical.v1.6.0.json');
const card=cards.cards.find(c=>c.card_id==='S1-ITM-019');
assert(card,'Warp Scroll canonical card missing');
assert(card.printed.rows.some(r=>r.text==='Swap the positions of 2 of your heroes.'),'Warp Scroll printed text changed unexpectedly');
assert(card.rules.execution.dispatch.handler==='resolve_warp_scroll_swap','Warp Scroll handler mismatch');
assert(card.rules.execution.dispatch.enabled===true,'Warp Scroll dispatch must be enabled');
assert(card.rules.execution.effects.some(e=>e.kind==='reposition_swap'&&e.allow_non_adjacent_swap===true&&e.manual_reposition_limit_exempt===true),'Warp Scroll structured swap semantics missing');
const board={
 Left:{slot:'Left',slot_mode:'HERO',hero:{card_id:'H1',defeated:false,exhausted:false,hp:70}},
 Center:{slot:'Center',slot_mode:'LEGACY',legacy_card_id:'L1'},
 Right:{slot:'Right',slot_mode:'HERO',hero:{card_id:'H2',defeated:false,exhausted:true,hp:40}}
};
let r=bucket.resolve_warp_scroll_swap({board,selected_slots:['Left','Right']});
assert(r.legal===true,'Warp Scroll should allow non-adjacent allied Hero swap');
assert(r.board.Left.hero.card_id==='H2'&&r.board.Right.hero.card_id==='H1','Warp Scroll board swap failed');
assert(r.board.Left.hero.exhausted===true&&r.board.Right.hero.exhausted===false,'Warp Scroll must preserve existing Exhaust state rather than applying Reposition Exhaust');
assert(r.exhaust_from_reposition===false&&r.manual_reposition_limit_exempt===true,'Warp Scroll must not Exhaust or consume manual Reposition limit');
r=bucket.resolve_warp_scroll_swap({board,selected_slots:['Left','Center']});
assert(r.legal===false,'Warp Scroll must reject Legacy as one of the two Hero choices');
r=bucket.resolve_warp_scroll_swap({board,selected_slots:['Left']});
assert(r.legal===false,'Warp Scroll must require exactly two choices');
console.log('PASS Warp Scroll canonical/handler semantics');
