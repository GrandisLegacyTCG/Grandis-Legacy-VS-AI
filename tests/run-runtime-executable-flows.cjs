'use strict';
const assert=require('assert');
const path=require('path');
const root=path.resolve(__dirname,'..');
const runtimeData=require(path.join(root,'data/season1/cards.runtime.v0.12.6.json'));
const recipes=require(path.join(root,'data/season1/effect-recipes.runtime.v0.11.6.json'));
const {createInitialRuntimeState,submitIntent,getLegalActions}=require(path.join(root,'runtime-source/runtime/core/reducer.js'));
const cardsById=Object.fromEntries(runtimeData.cards.map(c=>[c.card_id,c]));
function deck(ids=['S1-WAR-H001'],legacy=[]){return{starting_hero_ids:['Left','Center','Right'].map((slot,i)=>({slot,card_id:ids[i]||ids[0]})),main_deck_card_counts:{'S1-EVT-001':12,'S1-THF-003':1,'S1-WAR-001':2},legacy_deck_card_ids:legacy}}
function fresh(player=['S1-WAR-H001'],ai=['S1-WAR-H001'],legacy=[]){const s=createInitialRuntimeState({runtime_data:{cards_by_id:cardsById,effect_recipes:recipes},player_deck:deck(player),opponent_deck:deck(ai,legacy)});s.phase='Battle';s.active_player_id='PLAYER';s.players.PLAYER.mana_pool=99;s.players.AI.mana_pool=99;return{s}}
function ok(box,intent){const r=submitIntent(box.s,intent);assert.deepStrictEqual(r.errors||[],[],JSON.stringify({intent,errors:r.errors}));box.s=r.state;return r}
function attack(box,card,source='Center',target='Center',targetPlayer='AI'){
  ok(box,{type:'PLAY_CARD',player_id:'PLAYER',card_id:card});
  if(box.s.pending&&box.s.pending.source_required)ok(box,{type:'SELECT_SOURCE',player_id:'PLAYER',source_slot:source});
  if(box.s.pending&&box.s.pending.target_required)ok(box,{type:'SELECT_TARGET_SLOT',player_id:'PLAYER',target_player_id:targetPlayer,target_slot:target});
  ok(box,{type:'CONFIRM_ACTION',player_id:'PLAYER'});
}
function passAll(box){let guard=0;while(box.s.response_window&&guard++<20)ok(box,{type:'PASS_RESPONSE_PRIORITY',player_id:box.s.response_priority_player_id});assert.ok(guard<20,'response guard');}
// Status payload and duration.
{
  const b=fresh(['S1-ARC-H001']);b.s.players.PLAYER.hand=['S1-ARC-002'];attack(b,'S1-ARC-002');passAll(b);
  const poison=b.s.players.AI.board.Center.hero.statuses.find(x=>String(x.status||x.name)==='Poison');assert.ok(poison&&Number(poison.duration_turns)===2,'Poison Arrow status payload');
}
// Escape Arrow: exact other card is selected and both cards move to Discard; attack is Dodged.
{
  const b=fresh(['S1-WAR-H001'],['S1-ARC-H001']);b.s.players.PLAYER.hand=['S1-WAR-001'];b.s.players.AI.hand=['S1-ARC-003','S1-EVT-001'];attack(b,'S1-WAR-001','Left','Left');
  assert.ok(getLegalActions(b.s,'AI').some(a=>a.type==='DECLARE_RESPONSE'&&a.card_id==='S1-ARC-003'),'Escape Arrow legal response');
  ok(b,{type:'DECLARE_RESPONSE',player_id:'AI',card_id:'S1-ARC-003',source_slot:'Left'});
  ok(b,{type:'SELECT_RESPONSE_COST_CARD',player_id:'AI',hand_index:1,card_id:'S1-EVT-001'});
  ok(b,{type:'CONFIRM_RESPONSE',player_id:'AI'});ok(b,{type:'PASS_RESPONSE_PRIORITY',player_id:'PLAYER'});
  assert.ok(!b.s.players.AI.hand.includes('S1-ARC-003')&&!b.s.players.AI.hand.includes('S1-EVT-001'));
  assert.ok(b.s.players.AI.discard_pile.includes('S1-ARC-003')&&b.s.players.AI.discard_pile.includes('S1-EVT-001'));
  assert.strictEqual(b.s.players.AI.board.Left.hero.hp,100,'Escape Arrow Dodged damage');
}
// Venom Detonation: targetless poisoned-Hero sequence, no Dodge, legal Magical Block, Poison removed before damage and remains removed at 0 damage.
{
  const b=fresh(['S1-THF-H002'],['S1-MAG-H001']);b.s.players.PLAYER.hand=['S1-THF-018'];b.s.players.AI.hand=['S1-MAG-004','S1-MAG-005'];
  for(const slot of ['Left','Center'])b.s.players.AI.board[slot].hero.statuses=[{status:'Poison',duration_turns:2}];
  attack(b,'S1-THF-018','Left',null);
  const legal=getLegalActions(b.s,'AI').filter(a=>a.type==='DECLARE_RESPONSE').map(a=>a.card_id);
  assert.ok(legal.includes('S1-MAG-004'),'Magical Block legal');assert.ok(!legal.includes('S1-MAG-005'),'Dodge illegal');
  ok(b,{type:'DECLARE_RESPONSE',player_id:'AI',card_id:'S1-MAG-004',source_slot:'Left'});ok(b,{type:'CONFIRM_RESPONSE',player_id:'AI'});ok(b,{type:'PASS_RESPONSE_PRIORITY',player_id:'PLAYER'});
  if(b.s.response_window)ok(b,{type:'PASS_RESPONSE_PRIORITY',player_id:b.s.response_priority_player_id});
  assert.strictEqual(b.s.players.AI.board.Left.hero.hp,100,'blocked Venom target');assert.strictEqual(b.s.players.AI.board.Center.hero.hp,80,'unblocked Venom target');
  assert.strictEqual(b.s.players.AI.board.Left.hero.statuses.length,0);assert.strictEqual(b.s.players.AI.board.Center.hero.statuses.length,0);
}
// Multi-heal and modifier.
{
  const b=fresh(['S1-CLE-H002']);b.s.phase='Deploy';for(const [slot,hp] of [['Left',20],['Center',30],['Right',40]])b.s.players.PLAYER.board[slot].hero.hp=hp;b.s.players.PLAYER.hand=['S1-CLE-016'];attack(b,'S1-CLE-016','Center',null);
  assert.deepStrictEqual(['Left','Center','Right'].map(x=>b.s.players.PLAYER.board[x].hero.hp),[70,80,90]);
}
// Resurrection policy is Class-row specific.
for(const [sourceId,expectedExhausted] of [['S1-CLE-H002',true],['S1-CLE-H003',false]]){
  const b=fresh([sourceId],['S1-WAR-H001'],['S1-WAR-L001']);b.s.phase='Deploy';const slot=b.s.players.PLAYER.board.Left;slot.defeated_hero_snapshot={...slot.hero,hp:0,defeated:true,exp_cards:[]};slot.slot_mode='LEGACY';slot.active_legacy_card_id='S1-CLE-L001';slot.hero={...slot.hero,hp:0,defeated:true};b.s.players.PLAYER.hand=['S1-CLE-015'];attack(b,'S1-CLE-015','Center','Left','PLAYER');assert.strictEqual(b.s.players.PLAYER.board.Left.hero.hp,40);assert.strictEqual(b.s.players.PLAYER.board.Left.hero.exhausted,expectedExhausted);
}
// Binding Light counters committed Defend Skills, including Smoke Screen.
{
  const b=fresh(['S1-CLE-H002'],['S1-THF-H001']);b.s.players.PLAYER.hand=['S1-CLE-001','S1-CLE-012'];b.s.players.AI.hand=['S1-THF-004'];attack(b,'S1-CLE-001','Center','Center');
  ok(b,{type:'DECLARE_RESPONSE',player_id:'AI',card_id:'S1-THF-004',source_slot:'Center'});ok(b,{type:'CONFIRM_RESPONSE',player_id:'AI'});
  assert.ok(getLegalActions(b.s,'PLAYER').some(a=>a.type==='DECLARE_RESPONSE'&&a.card_id==='S1-CLE-012'),'Binding Light offered against Smoke Screen');
  ok(b,{type:'DECLARE_RESPONSE',player_id:'PLAYER',card_id:'S1-CLE-012',source_slot:'Center'});ok(b,{type:'CONFIRM_RESPONSE',player_id:'PLAYER'});passAll(b);
  assert.ok(b.s.players.AI.discard_pile.includes('S1-THF-004'));assert.ok(b.s.players.PLAYER.discard_pile.includes('S1-CLE-012'));assert.ok(b.s.players.AI.board.Center.hero.hp<100,'original attack continues');
}
// Post-attack swap is mandatory pending choice with choose/skip actions.
{
  const b=fresh(['S1-WAR-H002']);b.s.players.PLAYER.hand=['S1-WAR-015'];attack(b,'S1-WAR-015','Center','Left');passAll(b);assert.ok(b.s.pending&&b.s.pending.type==='post_attack_reposition_choice');const actions=getLegalActions(b.s,'PLAYER');assert.ok(actions.some(a=>a.type==='SELECT_REPOSITION_TARGET'));assert.ok(actions.some(a=>a.type==='SKIP_REPOSITION'));
}
console.log('PASS current runtime executable flows: statuses, Escape Arrow, Venom Detonation, Binding Light, Class-row Resurrection, multi-heal and post-attack choice.');
