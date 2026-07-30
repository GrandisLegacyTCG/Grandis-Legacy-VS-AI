'use strict';

const { ATTACHMENT_STATE } = require('../core/constants');
const { shouldEnterAttachmentSlot, isCasting } = require('../core/rules');

const TICK_PHASE = Object.freeze({
  DRAW_PHASE_START: 'DRAW_PHASE_START',
  BATTLE_PHASE_START: 'BATTLE_PHASE_START',
  END_PHASE: 'END_PHASE',
  DRAW_EVENT: 'DRAW_EVENT'
});

function heroCardId(hero) { return hero && (hero.card_id || hero.cardId || hero.id) || null; }

function buildAttachmentRecord(card, effect, ownerSide, slotId, host) {
  if (!shouldEnterAttachmentSlot(effect)) return null;
  host = host || {};
  const required = effect.requiredCounters ?? effect.required_counters ?? effect.remaining_count ?? effect.turns_remaining ?? effect.duration_count ?? effect.counters;
  const remaining = effect.remaining_count ?? effect.turns_remaining ?? (effect.counter_type === 'draw' ? required : required);
  return {
    id: `${card.id || card.card_id || 'card'}:${Date.now()}:${Math.random().toString(16).slice(2)}`,
    cardId: card.id || card.card_id,
    ownerSide,
    slotId: slotId || null,
    hostHeroCardId: effect.hostHeroCardId || heroCardId(host),
    hostHeroInstanceId: effect.hostHeroInstanceId || host.instance_id || host.instanceId || null,
    hostLane: effect.hostLane || host.lane || null,
    attachmentState: effect.attachmentState || ATTACHMENT_STATE.ONGOING_EFFECT,
    isCasting: isCasting(effect),
    duration: effect.duration || null,
    tick_phase: effect.tick_phase || effect.tickPhase || null,
    remaining_count: remaining === undefined || remaining === null ? null : Number(remaining),
    required_count: required === undefined || required === null ? null : Number(required),
    created_checkpoint_id: effect.created_checkpoint_id || null,
    skip_creation_checkpoint: effect.skip_creation_checkpoint !== false,
    effect
  };
}

function validateAttachmentRecord(record) {
  const errors = [];
  if (!record) errors.push('Attachment record is required.');
  if (record && (record.remaining_count === undefined || record.remaining_count === null || Number(record.remaining_count) < 0)) errors.push('Attachment requires non-negative remaining_count.');
  if (record && !record.tick_phase) errors.push('Attachment requires tick_phase.');
  return { ok: errors.length === 0, errors };
}

function attachmentCapacityAvailable(player, hostHeroInstanceId, maxSlots = 2) {
  const used = (player && player.attachments || []).filter(a => String(a.hostHeroInstanceId || a.host_hero_instance_id || '') === String(hostHeroInstanceId || '')).length;
  return { ok: used < maxSlots, used, maxSlots };
}

function rebindAttachmentHost(record, hero, side, lane, slotId) {
  if (!record) return record;
  return Object.assign({}, record, {
    ownerSide: side || record.ownerSide,
    hostLane: lane || record.hostLane,
    slotId: slotId === undefined ? record.slotId : slotId,
    hostHeroCardId: heroCardId(hero) || record.hostHeroCardId,
    hostHeroInstanceId: hero && (hero.instance_id || hero.instanceId) || record.hostHeroInstanceId || null
  });
}

function attachmentMatchesHost(record, hero, side, lane, slotId) {
  if (!record) return false;
  const heroId = heroCardId(hero);
  const instanceId = hero && (hero.instance_id || hero.instanceId);
  if (record.ownerSide && side && record.ownerSide !== side) return false;
  if (slotId !== undefined && slotId !== null && record.slotId !== undefined && record.slotId !== null && Number(record.slotId) !== Number(slotId)) return false;
  if (instanceId && record.hostHeroInstanceId) return String(instanceId) === String(record.hostHeroInstanceId);
  if (heroId && record.hostHeroCardId) return String(heroId) === String(record.hostHeroCardId);
  return !record.hostLane || !lane || record.hostLane === lane;
}

function counterLabel(record) {
  if (!record) return '';
  const required = record.required_count ?? record.requiredCounters ?? record.required_counters ?? record.counters_required;
  const isProgress = record.counter_display === 'progress' || record.counter_mode === 'progress' || ((record.counters !== undefined || record.current_count !== undefined) && required !== undefined && required !== null);
  if (isProgress) {
    const progress = record.counters ?? record.current_count ?? 0;
    if (required === undefined || required === null || Number(required) <= 0) return '';
    return `(${Number(progress)}/${Number(required)})`;
  }
  const current = record.remaining_count ?? record.remaining ?? record.remaining_turns ?? record.turns_remaining ?? record.counters;
  if (current === undefined || current === null || Number(current) < 0) return '';
  return `(${Number(current)})`;
}

function tickAttachment(record, tickPhase, checkpointId) {
  if (!record || record.tick_phase !== tickPhase) return { record, ticked: false, expired: false };
  if (record.skip_creation_checkpoint && record.created_checkpoint_id && checkpointId && String(record.created_checkpoint_id) === String(checkpointId)) {
    return { record, ticked: false, expired: false, skippedCreationCheckpoint: true };
  }
  const remaining = Math.max(0, Number(record.remaining_count || 0) - 1);
  const next = Object.assign({}, record, { remaining_count: remaining });
  return { record: next, ticked: true, expired: remaining === 0 };
}

function tickAttachments(state, tickPhase, checkpointId) {
  const attachments = Array.isArray(state.attachments) ? state.attachments : [];
  const remaining = [], expired = [], ticked = [];
  for (const attachment of attachments) {
    const result = tickAttachment(attachment, tickPhase, checkpointId);
    if (result.expired) expired.push(result.record);
    else remaining.push(result.record);
    if (result.ticked) ticked.push(result.record);
  }
  return Object.assign({}, state, { attachments: remaining, expiredAttachments: expired, tickedAttachments: ticked });
}

module.exports = { TICK_PHASE, buildAttachmentRecord, validateAttachmentRecord, attachmentCapacityAvailable, rebindAttachmentHost, attachmentMatchesHost, counterLabel, tickAttachment, tickAttachments };
