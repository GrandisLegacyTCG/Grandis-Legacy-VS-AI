'use strict';

function statusName(status) {
  return String(status && (status.status || status.name || status.status_name) || '').trim().toLowerCase();
}

function heroFromSlot(slotState) {
  if (!slotState) return null;
  return slotState.hero || slotState;
}

function hasBleed(slotState) {
  const hero = heroFromSlot(slotState);
  return Boolean(hero && (hero.statuses || []).some(status => statusName(status) === 'bleed'));
}

function validateSingleHealTarget(slotState) {
  const hero = heroFromSlot(slotState);
  if (!hero || (slotState && slotState.slot_mode && slotState.slot_mode !== 'HERO') || hero.defeated) {
    return { ok: false, errors: ['Heal target must be a current non-defeated Hero.'] };
  }
  if (hasBleed(slotState)) return { ok: false, errors: ['A Hero with Bleed cannot be selected for a heal.'] };
  if (Number(hero.hp || 0) >= Number(hero.max_hp || 100)) return { ok: false, errors: ['Heal target must be damaged.'] };
  return { ok: true, errors: [] };
}

function computeHealAmount(input) {
  const beforeHp = Number(input && input.before_hp || 0);
  const maxHp = Number(input && input.max_hp || 100);
  const requested = Number(input && input.base_heal || 0)
    + Number(input && input.source_healing_done || 0)
    + Number(input && input.target_healing_received || 0);
  const afterHp = Math.min(maxHp, beforeHp + Math.max(0, requested));
  return { before_hp: beforeHp, after_hp: afterHp, actual_heal: Math.max(0, afterHp - beforeHp), requested_heal: Math.max(0, requested) };
}

function eligibleMultiHealTargets(board) {
  return Object.entries(board || {}).filter(([, slotState]) => validateSingleHealTarget(slotState).ok).map(([slot]) => slot);
}

module.exports = { statusName, hasBleed, validateSingleHealTarget, computeHealAmount, eligibleMultiHealTargets };
