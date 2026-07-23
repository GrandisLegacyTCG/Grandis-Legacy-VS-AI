'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const data=require(path.join(root,'data/season1/cards.runtime.v0.12.6.json'));
const recipes=require(path.join(root,'data/season1/effect-recipes.runtime.v0.11.6.json'));
const legality=require(path.join(root,'data/season1/legality-map.runtime.v0.11.5.json'));
const preview=require(path.join(root,'data/season1/card-preview.generated.v1.4.0.json'));
const H='5812e107dbe82cef660975e091388eae1ad5a852c7be066c7443a5a321188bab';
for(const doc of [data,recipes,legality,preview]){
  assert.strictEqual(doc.canonical_registry_hash,H,'canonical registry hash');
  assert.strictEqual(doc.count,198,'198 record parity');
}
const expectedKinds=new Set([
  'add_to_hand','apply_exhaust','area_defense_exception_damage_reduction','attach_attack_damage_modifier',
  'attach_healing_received_modifier','attach_next_attack_status_buff','attach_targeting_filter','attach_untargetable_and_draw',
  'attack_connected_conditional_damage','attack_restriction','block_damage','buff','buff_duration','buff_value','cancel_card',
  'cancel_response_skill','conditional_attack_modifier','create_active_effect','create_active_effect_or_event_attachment','damage_immunity',
  'deal_attack_damage','defeat_target_if_hp_threshold','discard_exp_from_opponent_hero','discard_then_draw','dodge_incoming_attack_damage',
  'dodge_incoming_damage','dodge_then_reposition','draw_cards','gain_mana','gain_racial_token','heal','heal_allied_heroes',
  'heal_target_hero','inflict_status','look_and_reorder_top_deck','move_cards','move_this_card_to_discard','negate',
  'negate_incoming_attack','no_source_exhaust','on_hit_draw','on_hit_mana_remove','on_hit_mana_remove_per_hit','on_hit_mana_steal',
  'opponent_hand_select_back_to_deck','opponent_hand_select_back_to_discard','optional_post_attack_reposition','pending_casting',
  'pending_casting_draw_counter','remove_exhaust','remove_negative_status','remove_selected_negative_status','remove_status',
  'remove_status_before_damage','response_redirect_reposition','return_attack_card_to_owner_hand','return_card_from_discard_to_hand',
  'return_to_hand','reveal_opponent_hand','revive','revive_defeated_hero','revive_hero','search_deck_add_to_hand',
  'search_top_deck','self_status','shuffle_remaining_hand_into_deck','source_structured_effect_json','team_damage_immunity',
  'tribute_skill_from_hand_to_hero_exp','untargetable'
]);
const statusNames=new Set(['Poison','Burn','Bleed','Freeze','Stun']);
const seen=new Map();
function hasNumber(v){return Number.isFinite(Number(v));}
function fail(card,e,msg){throw new Error(`${card.card_id} ${card.name} / ${e.kind}: ${msg}`)}
for(const card of data.cards){
  assert.ok(card.card_id&&card.name,'card identity');
  assert.ok(card.canonical_hash,'canonical card hash');
  assert.deepStrictEqual(card.effects||[],card.effect||[],'effect/effects mirror '+card.card_id);
  const serialized=JSON.stringify(card);
  if(/\bundefined\b|null 2|\[object Object\]/i.test(serialized))throw new Error('invalid serialized semantic value '+card.card_id);
  for(const effect of card.effects||[]){
    if(!effect||typeof effect.kind!=='string'||!effect.kind.trim())fail(card,effect||{},'missing kind');
    if(!expectedKinds.has(effect.kind))fail(card,effect,'unreviewed effect kind');
    seen.set(effect.kind,1+(seen.get(effect.kind)||0));
    if(effect.kind==='inflict_status'||effect.kind==='self_status'||effect.kind==='attach_next_attack_status_buff'||effect.kind==='remove_status_before_damage'){
      if(!statusNames.has(effect.status))fail(card,effect,'missing/invalid explicit status');
      if(effect.kind!=='remove_status_before_damage' && !hasNumber(effect.duration_turns) && !effect.duration_by_class)fail(card,effect,'missing status duration');
    }
    if(effect.kind==='draw_cards'&&!hasNumber(effect.count)&&!hasNumber(effect.amount))fail(card,effect,'missing draw count');
    if(effect.kind==='discard_then_draw'&&(!hasNumber(effect.discard_count)||!hasNumber(effect.draw_count)))fail(card,effect,'missing discard/draw count');
    if(effect.kind==='on_hit_draw'&&!hasNumber(effect.draw_count))fail(card,effect,'missing on-hit draw count');
    if(effect.kind==='pending_casting'&&(!hasNumber(effect.casting_turns)||!effect.tick_phase||!effect.host))fail(card,effect,'incomplete casting lifecycle');
    if(effect.kind==='pending_casting_draw_counter'&&(!hasNumber(effect.counters_required)||!effect.counter_gain_trigger||!effect.host))fail(card,effect,'incomplete draw-counter casting lifecycle');
    if(effect.kind==='optional_post_attack_reposition'&&(!effect.condition||!effect.reposition_model||effect.requires_controller_choice!==true))fail(card,effect,'incomplete post-attack choice');
    if(effect.kind==='revive'&&!hasNumber(effect.set_hp||effect.amount))fail(card,effect,'missing revive HP');
    if(effect.kind==='revive_hero'&&!hasNumber(effect.set_hp))fail(card,effect,'missing revive HP');
    if(effect.kind==='revive_defeated_hero'&&!hasNumber(effect.revive_hp))fail(card,effect,'missing revive HP');
    if(effect.kind==='heal'&&!hasNumber(effect.amount)&&!effect.amount_by_class)fail(card,effect,'missing heal amount');
    if(effect.kind==='heal_target_hero'&&!effect.amount_by_class)fail(card,effect,'missing class heal map');
    if(effect.kind==='heal_allied_heroes'&&!effect.amount_by_class)fail(card,effect,'missing team heal map');
    if(effect.kind==='block_damage'&&!hasNumber(effect.amount)&&!effect.amount_by_class)fail(card,effect,'missing block amount');
    if(effect.kind==='attach_attack_damage_modifier'&&(!hasNumber(effect.amount)||!effect.damage_type))fail(card,effect,'incomplete attack modifier');
    if(effect.kind==='attach_healing_received_modifier'&&!hasNumber(effect.amount))fail(card,effect,'missing healing modifier');
    if(effect.kind==='gain_mana'&&!hasNumber(effect.amount)&&!hasNumber(effect.raw_value))fail(card,effect,'missing Mana amount');
    if(effect.kind==='gain_racial_token'&&!hasNumber(effect.amount))fail(card,effect,'missing token amount');
    if(effect.kind==='search_deck_add_to_hand'&&(!effect.filter||!hasNumber(effect.count)))fail(card,effect,'incomplete deck search');
    if(effect.kind==='look_and_reorder_top_deck'&&!hasNumber(effect.count))fail(card,effect,'missing top-deck count');
    if(effect.kind==='return_card_from_discard_to_hand'&&(!effect.filter||!hasNumber(effect.count)))fail(card,effect,'incomplete discard return');
  }
  const cost=card.canonical_cost||card.cost||{};
  if(cost.additional_discard_from_hand && !hasNumber(cost.additional_discard_from_hand.count))throw new Error('invalid additional discard '+card.card_id);
  if(Array.isArray(cost.additional_costs))for(const add of cost.additional_costs){if(add.kind==='discard_from_hand'&&!hasNumber(add.count||((add.exact_card_ids||[]).length)))throw new Error('invalid canonical discard '+card.card_id)}
}
assert.deepStrictEqual([...seen.keys()].sort(),[...expectedKinds].sort(),'all reviewed effect kinds represented');
const byId=new Map(data.cards.map(c=>[c.card_id,c]));
const recipeById=new Map(recipes.effect_recipes.map(r=>[r.card_id,r]));
assert.strictEqual(recipeById.size,198,'198 effect recipes');
for(const [id,card] of byId){
  const recipe=recipeById.get(id);assert.ok(recipe,'missing recipe '+id);assert.strictEqual(recipe.canonical_hash,card.canonical_hash,'recipe hash '+id);
  assert.ok(Array.isArray(recipe.effects),'recipe effect array '+id);
  if(recipe.dispatcher_ready){assert.strictEqual(recipe.dispatcher_enabled,true,'ready recipe enabled '+id);assert.ok(recipe.dispatch_handler,'ready recipe handler '+id)}
}
const nonNormal=[...seen.entries()].filter(([kind])=>kind!=='deal_attack_damage');
console.log(`PASS One Source non-normal effect coverage: ${data.cards.length} cards, ${seen.size} reviewed effect kinds, ${nonNormal.length} non-normal kinds, ${recipes.effect_recipes.length} recipes; status/cost/draw/heal/response/attachment/casting/revive/search/reposition schemas fail closed.`);
