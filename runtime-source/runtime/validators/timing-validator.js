'use strict';

function validateTiming(card, phase) {
  const allowed = Array.isArray(card.timing) ? card.timing : [];
  if (!allowed.length) {
    return { ok: false, reason: 'Card has no timing data.' };
  }
  if (!allowed.includes(phase)) {
    return { ok: false, reason: `Illegal timing. ${card.name || card.id} cannot be used in ${phase}.` };
  }
  return { ok: true };
}

module.exports = { validateTiming };
