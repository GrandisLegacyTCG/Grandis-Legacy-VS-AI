'use strict';

const { EVENT_TYPES, createRuntimeEvent } = require('../core/event-log');

function castingBaseDamage(card) {
  if (!card) return 0;
  if (card.damage_amounts !== undefined) return Number(card.damage_amounts || 0);
  if (card.baseDamage !== undefined) return Number(card.baseDamage || 0);
  if (card.attack && card.attack.damage !== undefined) return Number(card.attack.damage || 0);
  const effects = Array.isArray(card.effect) ? card.effect : [];
  for (const effect of effects) {
    if (effect && effect.amount !== undefined) return Number(effect.amount || 0);
    if (effect && effect.damage !== undefined) return Number(effect.damage || 0);
    const byClass = effect && effect.amount_by_class;
    if (byClass && typeof byClass === 'object') {
      const values = Object.values(byClass).map(Number).filter(Number.isFinite);
      if (values.length) return values[0];
    }
  }
  const attackByClass = card.attack && card.attack.damage_by_class;
  if (attackByClass && typeof attackByClass === 'object') {
    const values = Object.values(attackByClass).map(Number).filter(Number.isFinite);
    if (values.length) return values[0];
  }
  return 0;
}

function createCastingAttack(card, ownerId, sourceSlot, targetSlot) {
  return {
    attachment_id: `${card.card_id || card.id}:casting:${Date.now()}:${Math.random().toString(16).slice(2)}`,
    card_id: card.card_id || card.id,
    owner_id: ownerId,
    source_slot: sourceSlot,
    target_slot: targetSlot,
    attachment_state: 'CASTING',
    casting_type: 'DRAW_COUNTER_CASTING',
    counters: 0,
    counters_required: Number(card.counters_required || 5),
    base_damage: castingBaseDamage(card),
    damage_profile: card.damage_type || card.damage_profile || 'Magical',
    resolved: false
  };
}

function addDrawCounter(casting, state) {
  const next = Object.assign({}, casting, {
    counters: Number(casting.counters || 0) + 1
  });
  const event = createRuntimeEvent(EVENT_TYPES.EFFECT_COUNTER_ADDED, state || 'game-unknown', {
    player_id: next.owner_id,
    card_id: next.card_id,
    target_slot: next.target_slot,
    payload: {
      attachment_id: next.attachment_id,
      counter_type: 'draw',
      counters: next.counters,
      counters_required: next.counters_required
    }
  });
  return { casting: next, event };
}

function resolveCastingAttack(casting, opponentBoard, state) {
  const targetSlot = opponentBoard && opponentBoard[casting.target_slot];
  const targetIsHero = Boolean(targetSlot && targetSlot.slot_mode === 'HERO' && targetSlot.hero && !targetSlot.hero.defeated);
  const baseDamage = Number(casting.base_damage);
  if (!Number.isFinite(baseDamage) || baseDamage <= 0) throw new Error('Casting release requires a positive committed base_damage snapshot.');
  const finalDamage = targetIsHero ? baseDamage : 0;
  const damageEvent = createRuntimeEvent(EVENT_TYPES.DAMAGE_APPLIED, state || 'game-unknown', {
    player_id: casting.owner_id,
    card_id: casting.card_id,
    target_slot: casting.target_slot,
    payload: {
      attachment_id: casting.attachment_id,
      target_slot_resolved_to: targetIsHero ? targetSlot.hero.card_id : null,
      target_valid_at_resolution: targetIsHero,
      final_damage: finalDamage,
      no_damage_reason: targetIsHero ? null : 'Target slot has no valid Hero occupant at resolution.'
    }
  });
  const moveEvent = createRuntimeEvent(EVENT_TYPES.CARD_MOVED, state || 'game-unknown', {
    player_id: casting.owner_id,
    card_id: casting.card_id,
    payload: {
      from: 'Casting Slot',
      to: 'Discard Pile',
      attachment_id: casting.attachment_id
    }
  });
  return {
    casting: Object.assign({}, casting, { resolved: true, final_damage: finalDamage }),
    events: [damageEvent, moveEvent]
  };
}

module.exports = { createCastingAttack, addDrawCounter, resolveCastingAttack, castingBaseDamage };
