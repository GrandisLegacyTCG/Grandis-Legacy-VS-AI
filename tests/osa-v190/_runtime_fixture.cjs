'use strict';
const reducer=require('../../runtime-source/runtime/core/reducer.js');
const cards=require('../../data/season1/cards.runtime.v0.16.2.json');
const recipes=require('../../data/season1/effect-recipes.runtime.v0.15.2.json');
function stateWith(sourceHero='S1-ARC-H001', opponentHeroes=['S1-WAR-H001']){
  const oppSlots=opponentHeroes.length===1?['Center']:['Left','Center','Right'];
  const s=reducer.createInitialRuntimeState({player_id:'P1',opponent_id:'P2',runtime_data:{cards:cards.cards,effect_recipes:recipes},player_deck:{starting_hero_ids:[{slot:'Center',card_id:sourceHero}]},opponent_deck:{starting_hero_ids:opponentHeroes.map((card_id,i)=>({slot:oppSlots[i]||'Center',card_id}))}});
  s.round=2;s.active_player_id='P1';s.players.P1.mana_pool=99;s.players.P1.mana_deck_initialized=false;s.players.P2.mana_pool=99;s.players.P2.mana_deck_initialized=false;return s;
}
function submit(state,intent){const r=reducer.submitIntent(state,intent);if(r.errors&&r.errors.length)throw new Error(`${intent.type}: ${r.errors.join('; ')}`);return r.state;}
function resolveAttack(state){let s=state, guard=20;while(s.pending_attack_resolution&&guard--){const pid=s.response_priority_player_id||s.active_player_id;const acts=reducer.getLegalActions(s,pid);const pass=acts.find(a=>a.type==='PASS_RESPONSE_PRIORITY');s=submit(s,pass||{type:'RESOLVE_PENDING',player_id:pid});}if(guard<=0)throw new Error('attack resolution guard');return s;}
function playAttack(state,cardId,{source='Center',target='Center'}={}){let s=state;s.phase='Battle';s.players.P1.board[source].hero.exhausted=false;s.players.P1.hand.push(cardId);s=submit(s,{type:'PLAY_CARD',player_id:'P1',card_id:cardId});s=submit(s,{type:'SELECT_SOURCE',player_id:'P1',source_slot:source});if(s.pending&&s.pending.target_required)s=submit(s,{type:'SELECT_TARGET_SLOT',player_id:'P1',target_player_id:'P2',target_slot:target});s=submit(s,{type:'CONFIRM_ACTION',player_id:'P1'});return s;}
module.exports={reducer,cards,recipes,stateWith,submit,resolveAttack,playAttack};
