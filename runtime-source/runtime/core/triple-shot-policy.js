'use strict';

const TRIPLE_SHOT_ID = 'S1-ARC-013';
const QUALIFYING_CARD_IDS = Object.freeze(['S1-ARC-002', 'S1-ARC-007']);

function handHasQualifyingArrow(hand) {
  const ids = Array.isArray(hand) ? hand : [];
  return QUALIFYING_CARD_IDS.some(id => ids.includes(id));
}

function canPlayTripleShot(hand) {
  const can = handHasQualifyingArrow(hand);
  return {
    can,
    reason: can ? '' : 'Triple Shot requires Poison Arrow or Burning Arrow in Hand.'
  };
}

function attachmentIsActive(attachment) {
  return Boolean(attachment && attachment.card_id === TRIPLE_SHOT_ID && attachment.attachment_state !== 'REMOVED');
}

function qualifies(card) {
  return Boolean(card && QUALIFYING_CARD_IDS.includes(card.card_id));
}

function appliesToAttack(card, attachment, context = {}) {
  if (!attachmentIsActive(attachment) || !qualifies(card)) return false;
  if (context.source_slot && attachment.source_slot && context.source_slot !== attachment.source_slot) return false;
  if (context.source_hero_card_id && attachment.source_hero_card_id && context.source_hero_card_id !== attachment.source_hero_card_id) return false;
  return true;
}

function applyAttachmentToAttack(card, attachment, context = {}) {
  if (!appliesToAttack(card, attachment, context)) return card;
  const next = { ...card };
  next.attackLayer = 'Area Attack';
  next.attack_label = 'Area Attack';
  next.areaAttack = true;
  next.requiresManualTarget = false;
  next.target_required = false;
  next.triple_shot_area = true;
  return next;
}

module.exports = {
  TRIPLE_SHOT_ID,
  QUALIFYING_CARD_IDS,
  handHasQualifyingArrow,
  canPlayTripleShot,
  attachmentIsActive,
  qualifies,
  appliesToAttack,
  applyAttachmentToAttack
};
