'use strict';

const { CARD_TYPES } = require('../core/constants');

function validateManaCost(card, playerState) {
  if (card.cardType === CARD_TYPES.ITEM && card.manaCost == null) {
    return { ok: true, cost: 0, note: 'Current Item rule: no mana cost unless future data explicitly states otherwise.' };
  }
  const cost = Number(card.manaCost || 0);
  const mana = Number(playerState && playerState.mana || 0);
  if (mana < cost) return { ok: false, reason: `Not enough mana. Need ${cost}, have ${mana}.` };
  return { ok: true, cost };
}

module.exports = { validateManaCost };
