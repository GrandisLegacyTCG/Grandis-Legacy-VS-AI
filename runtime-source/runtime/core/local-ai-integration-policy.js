'use strict';

const SELF_HOSTED_PERSISTENT_ITEM_IDS = Object.freeze([
  'S1-ITM-010', // Arcane Scroll
  'S1-ITM-011', // Poison Vial
  'S1-ITM-013', // Ring of Grace
  'S1-ITM-014', // Holy Medallion
  'S1-ITM-015'  // Invisibility Cloak
]);

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function isSelfHostedPersistentItem(card) {
  if (!card) return false;
  const id = String(card.card_id || card.id || '');
  if (SELF_HOSTED_PERSISTENT_ITEM_IDS.includes(id)) return true;
  const policy = card.attachment_policy || card.attachment || {};
  return Boolean(
    policy.persistent === true &&
    (policy.host === 'SOURCE_HERO' || policy.host_role === 'SOURCE_HERO' || policy.host_role === 'SELF')
  );
}

function normalizeSelfHostedAttachmentIntent(card, action) {
  const normalized = clone(action || {}) || {};
  if (!isSelfHostedPersistentItem(card)) return normalized;
  if (normalized.source_side && normalized.source_lane) return normalized;

  const actorSide = normalized.actor_side || normalized.side || null;
  const targetSide = normalized.target_side || null;
  const targetLane = normalized.target_lane || null;
  if (!targetSide || !targetLane) return normalized;
  if (actorSide && targetSide !== actorSide) return normalized;

  normalized.source_side = targetSide;
  normalized.source_lane = targetLane;
  if (!normalized.source_card_id && normalized.target_card_id) {
    normalized.source_card_id = normalized.target_card_id;
  }
  normalized.attachment_host_side = targetSide;
  normalized.attachment_host_lane = targetLane;
  normalized.attachment_host_normalized_from_target = true;
  return normalized;
}

function beginChildResponseChoice(parentFrame, childChoice) {
  if (!parentFrame || !parentFrame.response_window_token) {
    throw new Error('A committed parent response frame with response_window_token is required.');
  }
  const child = clone(childChoice || {}) || {};
  child.parent_response_token = parentFrame.response_window_token;
  child.parent_response_hidden = true;
  child.parent_response_preserved = true;
  return child;
}

function resumeParentResponseChoice(parentFrame, childChoice) {
  if (!parentFrame || !childChoice) return false;
  if (!parentFrame.response_window_token || !childChoice.parent_response_token) return false;
  return parentFrame.response_window_token === childChoice.parent_response_token &&
    childChoice.parent_response_preserved === true;
}

function inherentRankExp(rank) {
  const n = Number(rank || 1);
  if (n >= 3) return 700;
  if (n === 2) return 300;
  return 0;
}

function resetExpStackToRankFloor(hero, rankOverride) {
  const next = clone(hero || {}) || {};
  const rank = rankOverride == null ? (next.rank || next.hero_rank || 1) : rankOverride;
  next.exp_cards = [];
  next.exp_total = inherentRankExp(rank);
  return next;
}

module.exports = {
  SELF_HOSTED_PERSISTENT_ITEM_IDS,
  isSelfHostedPersistentItem,
  normalizeSelfHostedAttachmentIntent,
  beginChildResponseChoice,
  resumeParentResponseChoice,
  inherentRankExp,
  resetExpStackToRankFloor
};
