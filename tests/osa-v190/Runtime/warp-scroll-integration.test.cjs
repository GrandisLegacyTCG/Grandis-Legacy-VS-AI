'use strict';
const {assert}=require('../_helpers.cjs');
const {reducer,cards,recipes,submit}=require('../_runtime_fixture.cjs');
function makeState(){
  const s=reducer.createInitialRuntimeState({
    player_id:'P1',opponent_id:'P2',runtime_data:{cards:cards.cards,effect_recipes:recipes},
    player_deck:{starting_hero_ids:[
      {slot:'Left',card_id:'S1-WAR-H001'},
      {slot:'Center',card_id:'S1-ARC-H001'},
      {slot:'Right',card_id:'S1-CLE-H001'}
    ]},
    opponent_deck:{starting_hero_ids:[{slot:'Center',card_id:'S1-MAG-H001'}]}
  });
  s.round=2;s.active_player_id='P1';s.phase='Deploy';s.players.P1.mana_pool=99;s.players.P1.mana_deck_initialized=false;
  s.players.P1.hand=['S1-ITM-019'];
  s.players.P1.board.Left.hero.hp=73;s.players.P1.board.Left.hero.exhausted=false;s.players.P1.board.Left.hero.statuses=[{name:'Poison',duration_turns:2}];
  s.players.P1.board.Right.hero.hp=41;s.players.P1.board.Right.hero.exhausted=true;
  s.players.P1.attachments=[{attachment_id:'test-a',card_id:'S1-ITM-006',owner_id:'P1',source_slot:'Left',host_slot:'Left',attachment_state:'ONGOING_EFFECT'}];
  s.players.P1.manual_reposition_used_turn_key=`${s.round}|P1`;
  return s;
}
let s=makeState();
let r=reducer.submitIntent(s,{type:'PLAY_CARD',player_id:'P1',card_id:'S1-ITM-019'});
assert(!r.errors.length,`Warp Scroll should be playable with 2+ allied Heroes: ${r.errors.join('; ')}`);s=r.state;
let actions=reducer.getLegalActions(s,'P1');
let choices=actions.filter(a=>a.type==='SELECT_TARGET_SLOT'&&a.resolver_choice==='WARP_SCROLL_ALLIED_HERO');
assert(choices.length===3,'Warp Scroll should expose each active allied Hero as an opaque resolver choice');
assert(!actions.some(a=>a.type==='CONFIRM_ACTION'),'Warp Scroll must not confirm before two Hero choices');
s=submit(s,{type:'SELECT_TARGET_SLOT',player_id:'P1',target_player_id:'P1',target_slot:'Left'});
actions=reducer.getLegalActions(s,'P1');assert(!actions.some(a=>a.type==='CONFIRM_ACTION'),'Warp Scroll must still wait after first Hero choice');
s=submit(s,{type:'SELECT_TARGET_SLOT',player_id:'P1',target_player_id:'P1',target_slot:'Right'});
actions=reducer.getLegalActions(s,'P1');assert(actions.some(a=>a.type==='CONFIRM_ACTION'),'Warp Scroll should confirm after exactly two Hero choices');
s=submit(s,{type:'CONFIRM_ACTION',player_id:'P1'});
assert(s.players.P1.board.Left.hero.card_id==='S1-CLE-H001'&&s.players.P1.board.Right.hero.card_id==='S1-WAR-H001','Warp Scroll did not swap selected Heroes through actual reducer');
assert(s.players.P1.board.Right.hero.hp===73&&s.players.P1.board.Right.hero.statuses.some(x=>x.name==='Poison'),'Hero state must move with the Hero');
assert(s.players.P1.board.Left.hero.hp===41&&s.players.P1.board.Left.hero.exhausted===true&&s.players.P1.board.Right.hero.exhausted===false,'Warp Scroll must preserve pre-existing Exhaust/HP state and not add Reposition Exhaust');
assert(s.players.P1.attachments.some(a=>a.attachment_id==='test-a'&&a.host_slot==='Right'&&a.source_slot==='Right'),'Hero-hosted Attachment must move with swapped Hero');
assert(s.players.P1.manual_reposition_used_turn_key===`${s.round}|P1`,'Warp Scroll must not alter/consume manual Reposition turn state');
assert(s.players.P1.discard_pile.includes('S1-ITM-019'),'Warp Scroll must go to Discard after resolution');
assert(!s.pending,'Warp Scroll pending state must close after resolution');
assert((s.event_log||[]).some(e=>e.card_id==='S1-ITM-019'&&e.payload&&e.payload.result==='WARP_SCROLL_SWAP_RESOLVED'),'Warp Scroll runtime must log concrete swap resolution');
// Direct integration path: CONFIRM_ACTION may supply the resolver-owned two-slot package.
s=makeState();s=submit(s,{type:'PLAY_CARD',player_id:'P1',card_id:'S1-ITM-019'});s=submit(s,{type:'CONFIRM_ACTION',player_id:'P1',target_slots:['Left','Center']});
assert(s.players.P1.board.Left.hero.card_id==='S1-ARC-H001'&&s.players.P1.board.Center.hero.card_id==='S1-WAR-H001','Warp Scroll direct resolver choice package failed');
// Play validation: fewer than two active allied Heroes is illegal.
s=makeState();s.players.P1.board.Left={slot:'Left',slot_mode:'EMPTY',hero:null};s.players.P1.board.Right={slot:'Right',slot_mode:'EMPTY',hero:null};
r=reducer.submitIntent(s,{type:'PLAY_CARD',player_id:'P1',card_id:'S1-ITM-019'});assert(r.errors.some(e=>/at least 2 active allied Heroes/i.test(e)),'Warp Scroll must reject if fewer than two allied Heroes are active');
console.log('PASS Warp Scroll integration through actual reducer');
