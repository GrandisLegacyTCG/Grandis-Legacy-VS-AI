'use strict';

const { ATTACK_LAYER } = require('../core/constants');

function isDualArrow(card) { return card && (card.card_id === 'S1-ARC-017' || card.id === 'S1-ARC-017'); }
function isVenomDetonation(card) { return card && (card.card_id === 'S1-THF-018' || card.id === 'S1-THF-018'); }

function validateTargeting(card, selection) {
  if (isVenomDetonation(card)) {
    const targets = selection && Array.isArray(selection.targets) ? selection.targets : [];
    if (targets.length) return { ok: false, reason: 'Venom Detonation is targetless; affected Heroes are derived from Poison.' };
    return { ok: true, targetMode: 'condition-derived' };
  }
  if (isDualArrow(card)) {
    const targets = selection && Array.isArray(selection.targets) ? selection.targets : [];
    const unique = [...new Set(targets.map(t => t && (t.target_slot || t.slot || t)).filter(Boolean))];
    if (unique.length !== 2) return { ok: false, reason: 'Dual Arrow requires exactly 2 distinct opponent field slots.' };
    const heroCount = targets.filter(t => !t || typeof t !== 'object' || String(t.slot_mode || t.mode || 'HERO').toUpperCase() === 'HERO').length;
    if (heroCount < 1) return { ok: false, reason: 'Dual Arrow requires at least 1 selected Hero; Legacy may fill the second slot.' };
    return { ok: true, targetMode: 'two-explicit-slots', allowLegacyFiller: true };
  }
  if (card.attackLayer === ATTACK_LAYER.AREA) {
    if (selection && Array.isArray(selection.targets) && selection.targets.length) return { ok: false, reason: 'Area Attack does not use manual target selection.' };
    return { ok: true, targetMode: 'area' };
  }
  if (!card.targetRequired) return { ok: true, targetMode: 'none' };
  const targets = selection && Array.isArray(selection.targets) ? selection.targets : [];
  const min = card.targetCount || 1;
  if (targets.length < min) return { ok: false, reason: `Expected ${min} selected target(s).` };
  return { ok: true, targetMode: 'selected' };
}

module.exports = { validateTargeting };
