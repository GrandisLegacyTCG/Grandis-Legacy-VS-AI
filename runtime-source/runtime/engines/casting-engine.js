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

function progressionIdFromCardId(cardId) {
  const m=String(cardId||'').match(/^(S1-[A-Z]+-H)(\d{3})$/);
  if(!m) return String(cardId||'');
  const n=Number(m[2]),base=n-((n-1)%3);
  return m[1]+String(base).padStart(3,'0');
}

function castingSourceMatches(casting,currentSource) {
  if(!casting||!currentSource) return false;
  if(casting.source_instance_id&&currentSource.instance_id) return String(casting.source_instance_id)===String(currentSource.instance_id);
  const currentProgression=currentSource.progression_id || progressionIdFromCardId(currentSource.card_id,currentSource.rank);
  const lockedProgression=casting.source_progression_id || progressionIdFromCardId(casting.source_hero_card_id,casting.source_rank_at_cast);
  if(currentProgression&&lockedProgression) return currentProgression===lockedProgression;
  return String(casting.source_hero_card_id||'')===String(currentSource.card_id||'');
}

function createCastingAttack(card, ownerId, sourceSlot, targetSlot, source) {
  source=source||{};
  return {
    attachment_id: `${card.card_id || card.id}:casting:${Date.now()}:${Math.random().toString(16).slice(2)}`,
    card_id: card.card_id || card.id,
    owner_id: ownerId,
    source_slot: sourceSlot,
    target_slot: targetSlot,
    source_hero_card_id: source.card_id||null,
    source_instance_id: source.instance_id||null,
    source_rank_at_cast:Number(source.rank||1),
    source_progression_id:source.progression_id||progressionIdFromCardId(source.card_id,source.rank),
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
  const next = Object.assign({}, casting, { counters: Number(casting.counters || 0) + 1 });
  const event = createRuntimeEvent(EVENT_TYPES.EFFECT_COUNTER_ADDED, state || 'game-unknown', {
    player_id: next.owner_id, card_id: next.card_id, target_slot: next.target_slot,
    payload: { attachment_id: next.attachment_id, counter_type: 'draw', counters: next.counters, counters_required: next.counters_required }
  });
  return { casting: next, event };
}

function releaseDamage(casting,currentSource,targetHero,context){
  context=context||{};
  if(typeof context.calculateReleaseDamage==='function'){
    const r=context.calculateReleaseDamage(casting,currentSource,targetHero)||{};
    return {base_damage:Number(r.base_damage||0),final_damage:Number(r.final_damage||r.damage||0),damage_profile:r.damage_profile||casting.damage_profile,modifier_breakdown:r.modifier_breakdown||[]};
  }
  const base=Number(casting.base_damage||0);
  return {base_damage:base,final_damage:base,damage_profile:casting.damage_profile,modifier_breakdown:[]};
}

function resolveCastingAttack(casting, opponentBoard, state, context) {
  context=context||{};
  const source=context.currentSource||null;
  if(source&&!castingSourceMatches(casting,source)) throw new Error('Casting source moved or was replaced before release.');
  if(source&&source.stunned) throw new Error('Casting source is Stunned.');
  const targetSlot = opponentBoard && opponentBoard[casting.target_slot];
  const targetIsHero = Boolean(targetSlot && targetSlot.slot_mode === 'HERO' && targetSlot.hero && !targetSlot.hero.defeated);
  const release=releaseDamage(casting,source,targetIsHero?targetSlot.hero:null,context);
  if (!Number.isFinite(release.final_damage) || release.final_damage <= 0) throw new Error('Casting release requires a positive damage value from the current source Hero.');
  const finalDamage = targetIsHero ? release.final_damage : 0;
  const damageEvent = createRuntimeEvent(EVENT_TYPES.DAMAGE_APPLIED, state || 'game-unknown', {
    player_id: casting.owner_id, card_id: casting.card_id, target_slot: casting.target_slot,
    payload: {
      attachment_id: casting.attachment_id,
      source_card_id_at_release:source&&source.card_id||null,
      source_progression_id:casting.source_progression_id||null,
      target_slot_resolved_to: targetIsHero ? targetSlot.hero.card_id : null,
      target_valid_at_resolution: targetIsHero,
      release_base_damage:release.base_damage,
      final_damage: finalDamage,
      damage_profile:release.damage_profile,
      modifier_breakdown:release.modifier_breakdown,
      no_damage_reason: targetIsHero ? null : 'Target slot has no valid Hero occupant at resolution.'
    }
  });
  const moveEvent = createRuntimeEvent(EVENT_TYPES.CARD_MOVED, state || 'game-unknown', {
    player_id: casting.owner_id, card_id: casting.card_id,
    payload: { from: 'Casting Slot', to: 'Discard Pile', attachment_id: casting.attachment_id }
  });
  return { casting: Object.assign({}, casting, { resolved: true, final_damage: finalDamage, source_card_id_at_release:source&&source.card_id||null }), events: [damageEvent, moveEvent] };
}

module.exports = { createCastingAttack, addDrawCounter, resolveCastingAttack, castingBaseDamage, progressionIdFromCardId, castingSourceMatches, releaseDamage };
