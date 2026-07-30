'use strict';

const CLOSE_POLICY = Object.freeze({
  PRE_COMMIT_CANCEL: 'PRE_COMMIT_CANCEL',
  POST_RESOLUTION_DECLINE: 'POST_RESOLUTION_DECLINE',
  MANDATORY_NO_CANCEL: 'MANDATORY_NO_CANCEL',
  CLOSE_ONLY: 'CLOSE_ONLY'
});

const PRE_COMMIT_TYPES = new Set([
  'source_selection', 'target_selection', 'scouting_target_selection',
  'scouting_exp_selection', 'lane_pair_selection', 'mana_spend_choice',
  'optional_magical_surge', 'status_removal_choice', 'tribute_target',
  'racial_target_selection', 'hero_ability_target_selection',
  'legacy_cost_selection', 'legacy_hero_target_selection', 'manual_reposition'
]);
const POST_RESOLUTION_TYPES = new Set([
  'optional_swap', 'optional_target_swap', 'post_attack_reposition_choice'
]);
const MANDATORY_TYPES = new Set([
  'legacy_defeat_choice', 'hand_limit_discard', 'draw_replacement_choice',
  'crystal_ball_reorder', 'response_window', 'saint_purify_choice'
]);

function typeOf(pending) {
  return String(pending && (pending.type || pending.pending_type) || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function hiddenInformationExposed(pending, context) {
  const p = pending || {};
  const type = typeOf(p);
  const zone = String(p.zone || p.choice_zone || '').toLowerCase();
  const ctx = context || {};
  if (ctx.hiddenInformationExposed === true || p.hidden_information_exposed === true) return true;
  if (type === 'card_search_choice' && (zone === 'deck' || zone === 'legacy_deck')) return true;
  if (type === 'legacy_card_choice' && (zone === 'deck' || zone === 'legacy_deck' || zone === 'deck_top')) return true;
  if (type === 'opponent_hand_choice' && (p.reveal_cards === true || p.cards_revealed === true)) return true;
  if (type === 'crystal_ball_reorder') return true;
  return false;
}

function actionCommitted(pending, context) {
  const p = pending || {};
  const ctx = context || {};
  const stage = String(p.commit_stage || ctx.commitStage || '').toLowerCase();
  return p.committed === true || ctx.actionCommitted === true || ['committed','post_commit','resolved','post_resolution'].includes(stage);
}

function responseWindowOpened(context) {
  const ctx = context || {};
  return ctx.responseWindowOpened === true || Boolean(ctx.responseWindow);
}

function resolvePendingClosePolicy(pending, context) {
  if (!pending) return CLOSE_POLICY.CLOSE_ONLY;
  const type = typeOf(pending);
  if (POST_RESOLUTION_TYPES.has(type)) return CLOSE_POLICY.POST_RESOLUTION_DECLINE;
  if (MANDATORY_TYPES.has(type)) return CLOSE_POLICY.MANDATORY_NO_CANCEL;
  if (hiddenInformationExposed(pending, context)) return CLOSE_POLICY.MANDATORY_NO_CANCEL;
  if (responseWindowOpened(context)) return CLOSE_POLICY.MANDATORY_NO_CANCEL;
  if (actionCommitted(pending, context)) return CLOSE_POLICY.MANDATORY_NO_CANCEL;
  if (PRE_COMMIT_TYPES.has(type)) return CLOSE_POLICY.PRE_COMMIT_CANCEL;
  return CLOSE_POLICY.MANDATORY_NO_CANCEL;
}

module.exports = {
  CLOSE_POLICY,
  PRE_COMMIT_TYPES,
  POST_RESOLUTION_TYPES,
  MANDATORY_TYPES,
  hiddenInformationExposed,
  actionCommitted,
  responseWindowOpened,
  resolvePendingClosePolicy
};
