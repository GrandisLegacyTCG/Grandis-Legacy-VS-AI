'use strict';
const {assert}=require('../_helpers.cjs');
const {reducer,stateWith,submit}=require('../_runtime_fixture.cjs');
function base(){const s=stateWith('S1-ARC-H001',['S1-WAR-H001']);s.phase='Deploy';s.players.P1.hand=['S1-ITM-020'];s.players.P1.board.Center.hero.exhausted=false;return s;}
function start(s){return submit(s,{type:'PLAY_CARD',player_id:'P1',card_id:'S1-ITM-020'});}
// Full real path: Hand -> target -> confirm -> dispatcher/reducer -> Freeze + Discard.
let s=start(base());
let actions=reducer.getLegalActions(s,'P1');
assert(actions.some(a=>a.type==='SELECT_TARGET_SLOT'&&a.target_player_id==='P2'&&a.target_slot==='Center'),'Freeze Bomb must expose legal opponent Hero target');
s=submit(s,{type:'SELECT_TARGET_SLOT',player_id:'P1',target_player_id:'P2',target_slot:'Center'});
s=submit(s,{type:'CONFIRM_ACTION',player_id:'P1'});
const status=(s.players.P2.board.Center.hero.statuses||[]).find(x=>String(x.status||x.name||'').toLowerCase()==='freeze');
assert(status&&Number(status.duration_turns)===1,'Freeze Bomb must apply Freeze duration 1 through actual reducer');
assert(s.players.P1.discard_pile.includes('S1-ITM-020'),'Freeze Bomb must resolve to Discard');
assert(!s.pending,'Freeze Bomb pending action must close');
assert(s.players.P1.board.Center.hero.exhausted===false,'Normal Item use must not Exhaust a Hero merely because the Item resolved');
assert((s.event_log||[]).some(e=>e.card_id==='S1-ITM-020'&&e.event==='STATUS_APPLIED'&&e.payload&&e.payload.status==='Freeze'),'Freeze Bomb must use generic STATUS_APPLIED runtime path');
assert((s.event_log||[]).some(e=>e.card_id==='S1-ITM-020'&&e.payload&&e.payload.dispatcher_handler==='resolve_freeze_bomb'),'Freeze Bomb must record actual dispatcher-backed status resolution');

// Invalid ownership: own Hero.
s=start(base());let r=reducer.submitIntent(s,{type:'SELECT_TARGET_SLOT',player_id:'P1',target_player_id:'P1',target_slot:'Center'});
assert(r.errors.some(e=>/opponent Hero/i.test(e)),'Freeze Bomb must reject own Hero target');
assert(!s.players.P1.discard_pile.includes('S1-ITM-020'),'Invalid pre-commit target must not discard Freeze Bomb');

// Invalid Legacy target.
s=base();s.players.P2.board.Center={slot:'Center',slot_mode:'LEGACY',hero:null,legacy_card_id:'S1-WAR-L001'};s=start(s);r=reducer.submitIntent(s,{type:'SELECT_TARGET_SLOT',player_id:'P1',target_player_id:'P2',target_slot:'Center'});
assert(r.errors.some(e=>/HERO slot|Hero/i.test(e)),'Freeze Bomb must reject Legacy target');

// Invalid empty target.
s=base();s.players.P2.board.Center={slot:'Center',slot_mode:'EMPTY',hero:null};s=start(s);r=reducer.submitIntent(s,{type:'SELECT_TARGET_SLOT',player_id:'P1',target_player_id:'P2',target_slot:'Center'});
assert(r.errors.some(e=>/HERO slot|Hero/i.test(e)),'Freeze Bomb must reject empty target');

// Invalid defeated Hero target.
s=base();s.players.P2.board.Center.hero.defeated=true;s.players.P2.board.Center.hero.hp=0;s=start(s);r=reducer.submitIntent(s,{type:'SELECT_TARGET_SLOT',player_id:'P1',target_player_id:'P2',target_slot:'Center'});
assert(r.errors.some(e=>/non-defeated|Hero/i.test(e)),'Freeze Bomb must reject defeated Hero target');
console.log('PASS Freeze Bomb actual reducer integration and invalid-target validation');
