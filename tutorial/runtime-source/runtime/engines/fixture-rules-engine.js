'use strict';

const { CONNECT_RESULT } = require('../core/constants');
const { dealsDamage, inflictsOnConnect, calculateBaseDamageWithBuffs } = require('./damage-engine');

function shouldAetherRemoveMana(finalDamage) {
  return dealsDamage(finalDamage);
}

function shouldPoisonVialApply(connectResult) {
  return inflictsOnConnect(connectResult);
}

function hasThreeUsedHeroes(playerState) {
  return Array.isArray(playerState && playerState.used_hero_ids) && playerState.used_hero_ids.filter(Boolean).length >= 3;
}

function defensiveFormationScope(context) {
  const affectedSlots = Array.isArray(context && context.affected_allied_slots) ? context.affected_allied_slots : [];
  const playerState = context && context.player_state;
  const isAreaAttack = Boolean(context && context.is_area_attack);
  if (!isAreaAttack) return { legal: false, covered_slots: [], reason: 'Defensive Formation activates only against Area Attack.' };
  if (!hasThreeUsedHeroes(playerState)) return { legal: false, covered_slots: [], reason: 'Requires 3 used Heroes from match start.' };
  return { legal: true, covered_slots: affectedSlots.slice(), reason: 'Area Attack response covers all affected allied Heroes.' };
}

function coordinationAttackEligible(playerState) {
  return {
    legal: hasThreeUsedHeroes(playerState),
    used_hero_ids: Array.isArray(playerState && playerState.used_hero_ids) ? playerState.used_hero_ids.slice() : [],
    includes_legacy_represented_heroes: true
  };
}

function lucienSurgeResolution(input) {
  const attackType = input && input.selected_attack_type;
  const availableMana = Number(input && input.available_mana || 0);
  const spendExtraMana = Boolean(input && input.spend_extra_mana);
  const applies = attackType === 'Magical Attack' && spendExtraMana && availableMana >= 1;
  return {
    applies,
    mana_spent: applies ? 1 : 0,
    scope: applies ? 'selected_attack_only' : 'none'
  };
}

function chargedShotResolution(input) {
  const baseDamage = Number(input && input.base_damage || 0);
  const hasRangeProperty = Boolean(input && input.has_range_property);
  return calculateBaseDamageWithBuffs({
    baseDamage,
    doubleBase: hasRangeProperty,
    buffs: input && input.buffs || []
  });
}

function durationTaxonomy(label) {
  const value = String(label || '').toLowerCase();
  if (value === 'until the start of your second next turn') {
    return { family: 'defensive', opponent_turns_covered: 2, expires: 'start_of_owner_second_next_turn' };
  }
  if (value === 'until the start of your next turn') {
    return { family: 'defensive', opponent_turns_covered: 1, expires: 'start_of_owner_next_turn' };
  }
  if (value === 'until the end of your next turn') {
    return { family: 'offensive', owner_turns_covered: 1, starts: 'now', expires: 'end_of_owner_next_turn' };
  }
  if (value === 'this turn') {
    return { family: 'offensive', owner_turns_covered: 0, starts: 'now', expires: 'end_of_current_turn' };
  }
  return { family: 'unknown', expires: null };
}

function stepInAreaAttackResolution(context) {
  return {
    legal_response_window: Boolean(context && context.is_area_attack && context.affected_hero_slot),
    dodged_slots: context && context.affected_hero_slot ? [context.affected_hero_slot] : [],
    unaffected_allied_slots: Array.isArray(context && context.all_affected_slots)
      ? context.all_affected_slots.filter(slot => slot !== context.affected_hero_slot)
      : [],
    auto_swap_to_front_of_attacker: true
  };
}

function teamDefenseScope(board) {
  const slots = board || {};
  return Object.keys(slots)
    .filter(slot => slots[slot] && slots[slot].slot_mode === 'HERO' && slots[slot].hero && !slots[slot].hero.defeated)
    .sort();
}

function deckOutCheck(phase, mainDeckCount) {
  const isDrawPhase = phase === 'Draw';
  const emptyDeck = Number(mainDeckCount || 0) <= 0;
  return {
    loses: isDrawPhase && emptyDeck,
    reason: isDrawPhase && emptyDeck ? 'cannot draw during Draw Phase because Main Deck is empty' : null
  };
}

module.exports = {
  CONNECT_RESULT,
  shouldAetherRemoveMana,
  shouldPoisonVialApply,
  hasThreeUsedHeroes,
  defensiveFormationScope,
  coordinationAttackEligible,
  lucienSurgeResolution,
  chargedShotResolution,
  durationTaxonomy,
  stepInAreaAttackResolution,
  teamDefenseScope,
  deckOutCheck
};
