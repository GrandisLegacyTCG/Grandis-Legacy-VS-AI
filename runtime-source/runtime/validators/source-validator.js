'use strict';

const { CARD_TYPES } = require('../core/constants');

function validateSource(card, source) {
  if (!card.sourceRequired) return { ok: true };
  if (!source) return { ok: false, reason: 'Source is required.' };
  if (source.slotMode === CARD_TYPES.LEGACY && !card.allowsLegacyOrigin) {
    return { ok: false, reason: 'Legacy cannot be a normal action source.' };
  }
  if (source.slotMode !== CARD_TYPES.HERO && !card.allowsLegacyOrigin) {
    return { ok: false, reason: 'Source must be a Hero.' };
  }
  if (source.defeated) return { ok: false, reason: 'Defeated Hero cannot be a normal source.' };
  if (card.cardType === CARD_TYPES.SKILL && source.exhausted && !card.responseAllowedWhileExhausted) {
    return { ok: false, reason: 'Exhausted Hero cannot use this Skill as a normal source.' };
  }
  if (card.classAccess && card.classAccess.length && !card.classAccess.includes(source.className)) {
    return { ok: false, reason: 'Source class does not match card access.' };
  }
  if (card.rankAccess && card.rankAccess.length && !card.rankAccess.includes(source.rankName)) {
    return { ok: false, reason: 'Source rank does not match card access.' };
  }
  return { ok: true };
}

module.exports = { validateSource };
