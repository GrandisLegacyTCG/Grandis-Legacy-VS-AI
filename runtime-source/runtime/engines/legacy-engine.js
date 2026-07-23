'use strict';

function canUseLegacyAsSource(card) {
  return Boolean(card && card.allowsLegacyOrigin);
}

function validateLegacySource(card, source) {
  if (!source || source.slotMode !== 'Legacy') return { ok: true };
  if (canUseLegacyAsSource(card)) {
    return { ok: true, note: 'Legacy allowed as revive/return-from-Legacy origin only.' };
  }
  return { ok: false, reason: 'Legacy cannot be a normal action source.' };
}

module.exports = { canUseLegacyAsSource, validateLegacySource };
