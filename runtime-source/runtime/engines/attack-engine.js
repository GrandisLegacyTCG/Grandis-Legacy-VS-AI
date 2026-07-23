'use strict';

const { CONNECT_RESULT, ATTACK_LAYER } = require('../core/constants');
const { classifyAttack, shouldApplySecondEffect } = require('../core/rules');

function createAttackResolution(card, source, targetOrTargets) {
  const classification = classifyAttack(card);
  const baseDamage = Number(card.baseDamage || 0);
  return {
    cardId: card.id,
    sourceId: source && source.id,
    classification,
    targets: Array.isArray(targetOrTargets) ? targetOrTargets : [targetOrTargets].filter(Boolean),
    baseDamage,
    finalDamage: baseDamage,
    connectResult: CONNECT_RESULT.CONNECTS,
    secondEffectPending: Boolean(card.secondEffect)
  };
}

function determineAffectedTargets(card, board, source) {
  if (card.attackLayer !== ATTACK_LAYER.AREA) return [];
  const opponentHeroes = (board && board.opponentHeroes) || [];
  return opponentHeroes.filter(hero => hero && !hero.defeated && hero.inAreaOfAttack !== false);
}

function finalizeAttackResolution(resolution) {
  return Object.assign({}, resolution, {
    applySecondEffect: shouldApplySecondEffect(resolution)
  });
}

module.exports = { createAttackResolution, determineAffectedTargets, finalizeAttackResolution };
