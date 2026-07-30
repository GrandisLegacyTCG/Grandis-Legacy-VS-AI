'use strict';

const SLOT_ORDER = Object.freeze(['Left', 'Center', 'Right']);
const SOURCE_FRONT_SWAP_CARDS = Object.freeze(['S1-THF-002', 'S1-THF-019', 'S1-THF-025', 'S1-WAR-015', 'S1-WAR-024']);
const TARGET_ADJACENT_SWAP_CARDS = Object.freeze(['S1-ARC-016']);
const ANY_ALLIED_SWAP_CARDS = Object.freeze(['S1-THF-023']);
const RESPONSE_REDIRECT_REPOSITION_CARDS = Object.freeze(['S1-WAR-004']);
const DODGE_THEN_REPOSITION_CARDS = Object.freeze(['S1-THF-022']);
const STALE_SWAP_REMOVED_CARDS = Object.freeze(['S1-THF-010']);

function normalizeSlotKey(value) {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'left') return 'Left';
  if (text === 'center' || text === 'centre') return 'Center';
  if (text === 'right') return 'Right';
  return String(value || '').trim();
}

function isValidSlot(slot) {
  return SLOT_ORDER.includes(normalizeSlotKey(slot));
}

function isAdjacentSlot(a, b) {
  const first = normalizeSlotKey(a);
  const second = normalizeSlotKey(b);
  if (!isValidSlot(first) || !isValidSlot(second)) return false;
  if (first === second) return false;
  return Math.abs(SLOT_ORDER.indexOf(first) - SLOT_ORDER.indexOf(second)) === 1;
}

function adjacentSlots(slot) {
  const normalized = normalizeSlotKey(slot);
  if (normalized === 'Left') return ['Center'];
  if (normalized === 'Center') return ['Left', 'Right'];
  if (normalized === 'Right') return ['Center'];
  return [];
}

function getFacingSlot(_sourcePlayerId, _targetPlayerId, targetSlot) {
  // Runtime board state uses tactical slot keys, not screen coordinates. If a UI mirrors
  // the opponent board visually, the UI must translate before submitting intent.
  return normalizeSlotKey(targetSlot);
}

function slotHasActiveHero(slotState) {
  return Boolean(slotState && slotState.slot_mode === 'HERO' && slotState.hero && !slotState.hero.defeated);
}

function canSwapHeroWithHero(board, firstSlotRaw, secondSlotRaw) {
  const firstSlot = normalizeSlotKey(firstSlotRaw);
  const secondSlot = normalizeSlotKey(secondSlotRaw);
  if (!isValidSlot(firstSlot) || !isValidSlot(secondSlot)) return { ok: false, errors: ['Both swap slots must be Left, Center, or Right.'] };
  if (firstSlot === secondSlot) return { ok: false, errors: ['Card-effect swap cannot target the same slot.'] };
  const first = board && board[firstSlot];
  const second = board && board[secondSlot];
  if (!first || !second) return { ok: false, errors: ['Both swap slots must exist.'] };
  const firstHero = slotHasActiveHero(first), secondHero = slotHasActiveHero(second);
  const firstLegacy = first.slot_mode === 'LEGACY', secondLegacy = second.slot_mode === 'LEGACY';
  if (!(firstHero || firstLegacy) || !(secondHero || secondLegacy)) return { ok: false, errors: ['Swap object must be an active Hero or Legacy.'] };
  if (firstLegacy && secondLegacy) return { ok: false, errors: ['Cannot swap Legacy with Legacy.'] };
  return { ok: true, first_slot: firstSlot, second_slot: secondSlot };
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function remapSlotValueForSwap(value, firstSlotRaw, secondSlotRaw) {
  const firstSlot = normalizeSlotKey(firstSlotRaw);
  const secondSlot = normalizeSlotKey(secondSlotRaw);
  const normalized = normalizeSlotKey(value);
  if (normalized === firstSlot) return secondSlot;
  if (normalized === secondSlot) return firstSlot;
  return value;
}

function applyBoardSwapPreserveHeroState(board, firstSlotRaw, secondSlotRaw, options = {}) {
  const firstSlot = normalizeSlotKey(firstSlotRaw);
  const secondSlot = normalizeSlotKey(secondSlotRaw);
  const heroOnly = options.hero_only === true;
  if (!isValidSlot(firstSlot) || !isValidSlot(secondSlot)) return { ok: false, errors: ['Both swap slots must be Left, Center, or Right.'] };
  if (firstSlot === secondSlot) return { ok: false, errors: ['Card-effect swap cannot target the same slot.'] };
  const first = board && board[firstSlot];
  const second = board && board[secondSlot];
  if (!first || !second) return { ok: false, errors: ['Both swap slots must exist on the board.'] };
  if (heroOnly && (!slotHasActiveHero(first) || !slotHasActiveHero(second))) return { ok: false, errors: ['Both swap slots must contain active Heroes.'] };
  if (!heroOnly && first.slot_mode === 'LEGACY' && second.slot_mode === 'LEGACY') return { ok: false, errors: ['Cannot swap Legacy with Legacy.'] };
  const nextBoard = deepClone(board || {});
  nextBoard[firstSlot] = Object.assign({}, second, { slot: firstSlot });
  nextBoard[secondSlot] = Object.assign({}, first, { slot: secondSlot });
  return { ok: true, board: nextBoard, first_slot: firstSlot, second_slot: secondSlot, exhaust_from_reposition: false };
}

function refreshPendingSourceTargetAfterSwap(pending, firstSlotRaw, secondSlotRaw) {
  if (!pending || typeof pending !== 'object') return pending;
  const next = Object.assign({}, pending);
  for (const key of ['source_slot', 'target_slot', 'redirect_slot', 'protected_slot']) {
    if (next[key]) next[key] = remapSlotValueForSwap(next[key], firstSlotRaw, secondSlotRaw);
  }
  if (Array.isArray(next.targets)) {
    next.targets = next.targets.map(t => t && typeof t === 'object' && t.target_slot ? Object.assign({}, t, { target_slot: remapSlotValueForSwap(t.target_slot, firstSlotRaw, secondSlotRaw) }) : t);
  }
  return next;
}

function swapModelForCard(cardId) {
  if (TARGET_ADJACENT_SWAP_CARDS.includes(cardId)) return 'target_adjacent_swap_after_connected_hit';
  if (SOURCE_FRONT_SWAP_CARDS.includes(cardId)) return 'source_front_lane_swap_after_successful_attack';
  if (ANY_ALLIED_SWAP_CARDS.includes(cardId)) return 'source_any_allied_hero_swap_after_successful_attack';
  if (RESPONSE_REDIRECT_REPOSITION_CARDS.includes(cardId)) return 'response_redirect_reposition';
  if (DODGE_THEN_REPOSITION_CARDS.includes(cardId)) return 'dodge_then_reposition';
  if (STALE_SWAP_REMOVED_CARDS.includes(cardId)) return 'no_swap_stale_metadata_removed';
  return null;
}

function requiresHpDamageForSwap(cardId) {
  return false; // Soul Blast wording is 'when this attack hits', not 'deals damage'.
}

function secondaryTriggerSatisfied(cardId, resolution) {
  const response = resolution && resolution.response_result;
  const connected = !(response && ['DODGE','NEGATE','NEGATE_RETURN_TO_HAND','CANCEL'].includes(response.type));
  return connected;
}

module.exports = {
  SLOT_ORDER,
  SOURCE_FRONT_SWAP_CARDS,
  TARGET_ADJACENT_SWAP_CARDS,
  ANY_ALLIED_SWAP_CARDS,
  RESPONSE_REDIRECT_REPOSITION_CARDS,
  DODGE_THEN_REPOSITION_CARDS,
  STALE_SWAP_REMOVED_CARDS,
  normalizeSlotKey,
  isValidSlot,
  adjacentSlots,
  isAdjacentSlot,
  getFacingSlot,
  slotHasActiveHero,
  canSwapHeroWithHero,
  applyBoardSwapPreserveHeroState,
  remapSlotValueForSwap,
  refreshPendingSourceTargetAfterSwap,
  swapModelForCard,
  requiresHpDamageForSwap,
  secondaryTriggerSatisfied
};
