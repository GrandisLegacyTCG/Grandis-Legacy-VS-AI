'use strict';
const {assert}=require('../_helpers.cjs');
const {reducer,cards,recipes,stateWith,submit,playAttack,resolveAttack}=require('../_runtime_fixture.cjs');
const positioning=require('../../../runtime-source/runtime/core/positioning-policy.js');
function freeze(hero,d=1){hero.statuses=[{status:'Freeze',duration_turns:d}];}
function twoHeroState(){const s=reducer.createInitialRuntimeState({player_id:'P1',opponent_id:'P2',runtime_data:{cards:cards.cards,effect_recipes:recipes},player_deck:{starting_hero_ids:[{slot:'Left',card_id:'S1-WAR-H001'},{slot:'Center',card_id:'S1-ARC-H001'}]},opponent_deck:{starting_hero_ids:[{slot:'Center',card_id:'S1-MAG-H001'}]}});s.round=2;s.active_player_id='P1';s.phase='Deploy';s.players.P1.mana_pool=99;s.players.P2.mana_pool=99;s.players.P1.mana_deck_initialized=false;s.players.P2.mana_deck_initialized=false;return s;}


// Existing Freeze-producing Attack Skill must use the same generic Status path.
let s=stateWith('S1-MAG-H001',['S1-WAR-H001']);
s=playAttack(s,'S1-MAG-002',{source:'Center',target:'Center'});s=resolveAttack(s);
let attackFreeze=(s.players.P2.board.Center.hero.statuses||[]).find(x=>String(x.status||x.name||'').toLowerCase()==='freeze');
assert(attackFreeze&&Number(attackFreeze.duration_turns)===1,'Ice Lance must apply Freeze through generic attack Status handling');
assert((s.event_log||[]).some(e=>e.card_id==='S1-MAG-002'&&e.event==='STATUS_APPLIED'&&e.payload&&e.payload.status==='Freeze'),'Ice Lance Freeze must emit the same generic STATUS_APPLIED event');

// Manual/normal Reposition: reject before state mutation or limit consumption.
s=twoHeroState();freeze(s.players.P1.board.Left.hero);const before=JSON.stringify(s.players.P1.board);let r=reducer.submitIntent(s,{type:'REPOSITION',player_id:'P1',first_slot:'Left',second_slot:'Center'});
assert(r.errors.some(e=>/Frozen Hero|Freeze/i.test(e)),'Frozen Hero must be rejected from normal/manual Reposition');
assert(JSON.stringify(r.state.players.P1.board)===before,'Rejected Frozen manual Reposition must not mutate board');
assert(!r.state.players.P1.manual_reposition_used_turn_key,'Rejected Frozen manual Reposition must not consume manual Reposition limit');

// Skill-effect movement: real Soul Blast Shot path must not offer/apply post-hit movement to a Frozen target.
s=reducer.createInitialRuntimeState({player_id:'P1',opponent_id:'P2',runtime_data:{cards:cards.cards,effect_recipes:recipes},player_deck:{starting_hero_ids:[{slot:'Center',card_id:'S1-ARC-H002'}]},opponent_deck:{starting_hero_ids:[{slot:'Center',card_id:'S1-WAR-H001'},{slot:'Right',card_id:'S1-CLE-H001'}]}});s.round=2;s.active_player_id='P1';s.players.P1.mana_pool=99;s.players.P2.mana_pool=99;s.players.P1.mana_deck_initialized=false;s.players.P2.mana_deck_initialized=false;freeze(s.players.P2.board.Center.hero);const targetId=s.players.P2.board.Center.hero.card_id;
s=playAttack(s,'S1-ARC-016',{source:'Center',target:'Center'});s=resolveAttack(s);
assert(s.players.P2.board.Center.hero.card_id===targetId,'Frozen Hero must not change position from Skill-effect post-hit movement');
assert(!(s.event_log||[]).some(e=>e.card_id==='S1-ARC-016'&&e.payload&&e.payload.result==='POST_ATTACK_REPOSITION_CHOICE_OPENED'),'Frozen Skill-movement target must not produce a legal reposition choice');

// Dodge blocked; Block remains legal. Use a Frozen Marksman defending a Physical Attack.
s=reducer.createInitialRuntimeState({player_id:'P1',opponent_id:'P2',runtime_data:{cards:cards.cards,effect_recipes:recipes},player_deck:{starting_hero_ids:[{slot:'Center',card_id:'S1-WAR-H001'}]},opponent_deck:{starting_hero_ids:[{slot:'Center',card_id:'S1-ARC-H002'}]}});s.round=2;s.active_player_id='P1';s.players.P1.mana_pool=99;s.players.P2.mana_pool=99;s.players.P1.mana_deck_initialized=false;s.players.P2.mana_deck_initialized=false;freeze(s.players.P2.board.Center.hero);s.players.P2.hand=['S1-ARC-011','S1-ARC-012'];s=playAttack(s,'S1-WAR-001',{source:'Center',target:'Center'});
let legal=reducer.getLegalActions(s,'P2');
assert(!legal.some(a=>a.type==='DECLARE_RESPONSE'&&a.card_id==='S1-ARC-011'),'Frozen Hero must not have Dodge response available');
assert(legal.some(a=>a.type==='DECLARE_RESPONSE'&&a.card_id==='S1-ARC-012'),'Freeze alone must not disable legal Block response');
r=reducer.submitIntent(s,{type:'DECLARE_RESPONSE',player_id:'P2',card_id:'S1-ARC-011',source_slot:'Center',hand_index:0});
assert(r.errors.some(e=>/Frozen Hero cannot use Dodge/i.test(e)),'Explicit Dodge attempt with Frozen Hero must be rejected before commitment');
assert(r.state.players.P2.hand.includes('S1-ARC-011'),'Rejected Frozen Dodge must not consume the response card');
r=reducer.submitIntent(s,{type:'DECLARE_RESPONSE',player_id:'P2',card_id:'S1-ARC-012',source_slot:'Center',hand_index:1});
assert(!r.errors.length,'Freeze alone must not reject Block');

// Freeze must NOT become universal movement lock: Warp Scroll Item can still move a Frozen allied Hero.
s=twoHeroState();freeze(s.players.P1.board.Left.hero);s.players.P1.hand=['S1-ITM-019'];const frozenHeroId=s.players.P1.board.Left.hero.card_id;s=submit(s,{type:'PLAY_CARD',player_id:'P1',card_id:'S1-ITM-019'});s=submit(s,{type:'SELECT_TARGET_SLOT',player_id:'P1',target_player_id:'P1',target_slot:'Left'});s=submit(s,{type:'SELECT_TARGET_SLOT',player_id:'P1',target_player_id:'P1',target_slot:'Center'});s=submit(s,{type:'CONFIRM_ACTION',player_id:'P1'});
assert(s.players.P1.board.Center.hero.card_id===frozenHeroId,'Freeze must not block Warp Scroll Item movement solely because Hero is Frozen');
assert((s.players.P1.board.Center.hero.statuses||[]).some(x=>String(x.status||x.name||'').toLowerCase()==='freeze'),'Freeze status must move with Hero through Warp Scroll');

// Automatic Center is system movement and must ignore Freeze.
const a=twoHeroState().players.P1,b=twoHeroState().players.P2;a.board.Center={slot:'Center',slot_mode:'EMPTY',hero:null};a.board.Right={slot:'Right',slot_mode:'EMPTY',hero:null};freeze(a.board.Left.hero);b.board.Left={slot:'Left',slot_mode:'EMPTY',hero:null};b.board.Right={slot:'Right',slot_mode:'EMPTY',hero:null};
const auto=positioning.autoCenterOneVsOne(a,b);assert(auto.applied===true&&a.board.Center.hero,'Automatic 1v1 Center movement must not be blocked by Freeze');assert((a.board.Center.hero.statuses||[]).some(x=>String(x.status||x.name||'').toLowerCase()==='freeze'),'Freeze must move with Hero during automatic Center');

// Generic stacking and owner-End-Phase expiration via actual status runtime.
s=stateWith('S1-ARC-H001',['S1-WAR-H001']);s.phase='Deploy';s.players.P1.hand=['S1-ITM-020','S1-ITM-020'];
for(let i=0;i<2;i++){s=submit(s,{type:'PLAY_CARD',player_id:'P1',card_id:'S1-ITM-020'});s=submit(s,{type:'SELECT_TARGET_SLOT',player_id:'P1',target_player_id:'P2',target_slot:'Center'});s=submit(s,{type:'CONFIRM_ACTION',player_id:'P1'});}
let f=(s.players.P2.board.Center.hero.statuses||[]).find(x=>String(x.status||x.name||'').toLowerCase()==='freeze');assert(f&&Number(f.duration_turns)===2,'Freeze reapplication must stack 1 + 1 = 2');
let tick=reducer.resolveEndPhaseStatuses(s,'P1');f=(tick.state.players.P2.board.Center.hero.statuses||[]).find(x=>String(x.status||x.name||'').toLowerCase()==='freeze');assert(f&&Number(f.duration_turns)===2,'Freeze must not decrement on the wrong player End Phase');
tick=reducer.resolveEndPhaseStatuses(tick.state,'P2');f=(tick.state.players.P2.board.Center.hero.statuses||[]).find(x=>String(x.status||x.name||'').toLowerCase()==='freeze');assert(f&&Number(f.duration_turns)===1,'Freeze must decrement on owner Hero End Phase');
tick=reducer.resolveEndPhaseStatuses(tick.state,'P2');assert(!(tick.state.players.P2.board.Center.hero.statuses||[]).some(x=>String(x.status||x.name||'').toLowerCase()==='freeze'),'Freeze must expire when duration reaches 0');
console.log('PASS generic Freeze runtime: Reposition/Skill/Dodge/Block/Warp/AutoCenter/duration/stacking');
