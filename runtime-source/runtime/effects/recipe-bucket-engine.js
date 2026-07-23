'use strict';

const { calculateBaseDamageWithBuffs } = require('../engines/damage-engine');

const VALID_SLOTS = Object.freeze(['Left', 'Center', 'Right']);

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeSlotKey(slot) {
  const value = String(slot || '').toLowerCase();
  if (value === 'left') return 'Left';
  if (value === 'center' || value === 'centre') return 'Center';
  if (value === 'right') return 'Right';
  return slot;
}

function activeHeroSlots(board) {
  const safeBoard = board || {};
  return VALID_SLOTS.filter(slot => {
    const entry = safeBoard[slot];
    return entry && entry.slot_mode === 'HERO' && entry.hero && !entry.hero.defeated;
  });
}

function countActiveHeroes(board) {
  return activeHeroSlots(board).length;
}

function hasThreeDifferentBaseClasses(heroIds, getBaseClass) {
  const ids = Array.isArray(heroIds) ? heroIds.filter(Boolean) : [];
  if (ids.length < 3) return false;
  const classes = new Set(ids.map(id => typeof getBaseClass === 'function' ? getBaseClass(id) : String(id).split('-')[1]).filter(Boolean));
  return classes.size >= 3;
}

function resolveDoubleBaseDamage(input) {
  return calculateBaseDamageWithBuffs({
    baseDamage: Number(input && input.base_damage || 0),
    doubleBase: Boolean(input && input.double_base),
    buffs: input && input.buffs || []
  });
}

function resolveLastResort(context) {
  const activeHeroes = countActiveHeroes(context && context.board);
  const legal = activeHeroes === 1;
  return {
    legal,
    active_hero_count: activeHeroes,
    applies: legal,
    damage_multiplier: legal ? 2 : 1,
    multiplier_scope: legal ? 'full_attack_card_damage_after_additive_modifiers' : null,
    expires: legal ? 'end_of_current_turn' : null,
    exhausts_source: false,
    reason: legal ? 'Only 1 Hero remains on this field.' : 'Requires exactly 1 Hero on this field.'
  };
}

function resolveCoordinationAttack(context) {
  const heroIds = context && context.used_hero_ids || [];
  const hasThreeClasses = hasThreeDifferentBaseClasses(heroIds, context && context.get_base_class);
  return {
    legal: heroIds.length >= 3,
    base_bonus: 10,
    additional_bonus: hasThreeClasses ? 10 : 0,
    total_bonus: 10 + (hasThreeClasses ? 10 : 0),
    affected_attack_types: ['Physical Attack', 'Magical Attack'],
    expires: 'end_of_current_turn',
    exhausts_source: false,
    includes_legacy_represented_heroes: true
  };
}

function resolvePoisonVial(context) {
  const finalDamage = Number(context && context.final_damage || 0);
  const connectResult = String(context && context.connect_result || '').toUpperCase();
  const isPhysicalAttackSkill = Boolean(context && context.is_physical_attack_skill);
  const hpDamageDealt = finalDamage > 0 && (connectResult === 'CONNECTS' || connectResult === 'HIT' || connectResult === 'BLOCKED_WITH_DAMAGE');
  const applies = isPhysicalAttackSkill && hpDamageDealt;
  return {
    applies,
    consumed: applies,
    status: applies ? { name: 'Poison', duration_turns: 2 } : null,
    reason: applies ? 'Physical Attack Skill dealt HP damage.' : 'Poison Vial waits until Physical Attack Skill deals HP damage.'
  };
}

function resolveIceBlock(context) {
  return {
    prevents_attack_damage: true,
    prevents_any_damage: true,
    prevent_scope: 'any_damage_to_this_hero_this_turn',
    apply_self_status: { name: 'Freeze', duration_turns: 2 },
    expires: 'end_of_current_turn',
    response_to: context && context.response_to || 'attack_damage'
  };
}

function resolveHeavensFury(context) {
  const rank = Number(context && context.source_rank || 0);
  if (rank >= 3) {
    return { legal: true, double_base_damage: true, target_rule: 'one_allied_hero', extra_mana_cost: 0, duration: 'this_turn' };
  }
  if (rank >= 2) {
    return { legal: true, double_base_damage: true, target_rule: 'one_allied_hero', extra_mana_cost: 2, duration: 'during_owner_next_turn' };
  }
  return { legal: false, reason: 'Heaven\'s Fury requires Priest/Rank II or higher.' };
}

function resolveDoubleCasting(context) {
  const rank = Number(context && context.source_rank || 0);
  if (rank >= 3) {
    return { legal: true, same_card_only: true, attack_type: 'Magical Attack', repeats: 2, extra_mana_cost: 0, duration: 'this_turn', exhausts_source: false };
  }
  if (rank >= 2) {
    return { legal: true, same_card_only: true, attack_type: 'Magical Attack', repeats: 2, extra_mana_cost: 3, duration: 'during_owner_next_turn', exhausts_source: true };
  }
  return { legal: false, reason: 'Double Casting requires Elementalist/Rank II or higher.' };
}

function resolveTaunt(context) {
  const sourceSlot = normalizeSlotKey(context && context.source_slot);
  return {
    legal: VALID_SLOTS.includes(sourceSlot),
    source_slot: sourceSlot,
    restricts_opponent_targets_to: sourceSlot,
    blocks_area_attacks: true,
    expires: 'start_of_controller_second_turn'
  };
}

function targetAllowedByRestrictions(context) {
  const targetSlot = normalizeSlotKey(context && context.target_slot);
  const attackType = context && context.attack_type;
  const restrictions = Array.isArray(context && context.restrictions) ? context.restrictions : [];
  for (const restriction of restrictions) {
    if (restriction.type === 'TAUNT_TARGET_RESTRICTION') {
      if (attackType === 'Area Attack' && restriction.blocks_area_attacks) return { allowed: false, reason: 'Area Attacks are blocked by Taunt.' };
      if (targetSlot !== normalizeSlotKey(restriction.required_target_slot)) return { allowed: false, reason: 'Taunt requires targeting the taunting Hero.' };
    }
    if (restriction.type === 'UNTARGETABLE_BY_ATTACKS') {
      if (restriction.protected_slot === targetSlot && String(attackType || '').includes('Attack')) return { allowed: false, reason: 'Protected Hero cannot be targeted by attacks.' };
    }
  }
  return { allowed: true, reason: 'No active restriction blocks this target.' };
}

function resolveInvisibilityCloak(context) {
  const hostSlot = normalizeSlotKey(context && context.host_slot);
  return {
    legal: VALID_SLOTS.includes(hostSlot),
    protected_slot: hostSlot,
    blocked_targeting: 'attacks_only',
    expires: 'start_of_owner_second_next_turn'
  };
}

function resolveHolyRing(context) {
  const hostSlot = normalizeSlotKey(context && context.host_slot);
  return {
    legal: VALID_SLOTS.includes(hostSlot),
    protected_slot: hostSlot,
    blocked_targeting: 'attacks_only',
    expires: 'start_of_owner_next_turn'
  };
}

function resolveTeamDefense(context) {
  const slots = activeHeroSlots(context && context.board);
  return {
    covered_slots: slots,
    excludes_legacy: true,
    effect: context && context.effect || 'team_defense'
  };
}

function resolveDefensiveFormation(context) {
  const isAreaAttack = Boolean(context && context.is_area_attack);
  const heroIds = context && context.used_hero_ids || [];
  const hasThreeClasses = hasThreeDifferentBaseClasses(heroIds, context && context.get_base_class);
  return {
    legal: isAreaAttack,
    reduction_per_affected_hero: isAreaAttack ? (hasThreeClasses ? 40 : 20) : 0,
    covered_slots: isAreaAttack ? activeHeroSlots(context && context.board) : [],
    reason: isAreaAttack ? 'Area Attack response.' : 'Defensive Formation only responds to Area Attack.'
  };
}

function resolveStepInAreaResponse(context) {
  const affectedSlot = normalizeSlotKey(context && context.affected_hero_slot);
  const allAffected = Array.isArray(context && context.all_affected_slots) ? context.all_affected_slots.map(normalizeSlotKey) : [];
  return {
    legal_response_window: Boolean(context && context.is_area_attack && VALID_SLOTS.includes(affectedSlot)),
    dodged_slots: VALID_SLOTS.includes(affectedSlot) ? [affectedSlot] : [],
    unaffected_allied_slots: allAffected.filter(slot => slot !== affectedSlot),
    auto_swap_to_front_of_attacker: true
  };
}

function repositionSlots(board, firstSlotRaw, secondSlotRaw) {
  const firstSlot = normalizeSlotKey(firstSlotRaw);
  const secondSlot = normalizeSlotKey(secondSlotRaw);
  if (!VALID_SLOTS.includes(firstSlot) || !VALID_SLOTS.includes(secondSlot) || firstSlot === secondSlot) {
    return { ok: false, errors: ['Reposition requires two different slots among Left, Center, and Right.'] };
  }
  const nextBoard = deepClone(board || {});
  const first = nextBoard[firstSlot];
  const second = nextBoard[secondSlot];
  if (!first || !second) return { ok: false, errors: ['Both reposition slots must exist.'] };
  const modes = [first.slot_mode, second.slot_mode].sort().join('-');
  if (modes === 'LEGACY-LEGACY') return { ok: false, errors: ['Legacy cannot reposition with Legacy.'] };
  if (!['HERO-HERO', 'HERO-LEGACY'].includes(modes)) return { ok: false, errors: ['Reposition supports Hero-Hero or Hero-Legacy only.'] };
  nextBoard[firstSlot] = Object.assign({}, second, { slot: firstSlot });
  nextBoard[secondSlot] = Object.assign({}, first, { slot: secondSlot });
  for (const slot of [firstSlot, secondSlot]) {
    const entry = nextBoard[slot];
    if (entry && entry.slot_mode === 'HERO' && entry.hero) {
      entry.hero = Object.assign({}, entry.hero, { exhausted: true });
    }
  }
  return { ok: true, board: nextBoard, reposition_type: modes, exhausted_hero_slots: [firstSlot, secondSlot].filter(slot => nextBoard[slot].slot_mode === 'HERO') };
}

function sourceCanUseCard(context) {
  const exhausted = Boolean(context && context.source_exhausted);
  const usableWhileExhausted = Boolean(context && context.usable_while_exhausted);
  if (exhausted && !usableWhileExhausted) return { legal: false, reason: 'Source Hero is Exhausted and this card does not bypass Exhaust.' };
  return { legal: true, reason: exhausted ? 'Explicit usable while Exhausted permission.' : 'Source Hero is not Exhausted.' };
}

module.exports = {
  VALID_SLOTS,
  normalizeSlotKey,
  activeHeroSlots,
  countActiveHeroes,
  hasThreeDifferentBaseClasses,
  resolveDoubleBaseDamage,
  resolveLastResort,
  resolveCoordinationAttack,
  resolvePoisonVial,
  resolveIceBlock,
  resolveHeavensFury,
  resolveDoubleCasting,
  resolveTaunt,
  targetAllowedByRestrictions,
  resolveInvisibilityCloak,
  resolveHolyRing,
  resolveTeamDefense,
  resolveDefensiveFormation,
  resolveStepInAreaResponse,
  repositionSlots,
  sourceCanUseCard
};
