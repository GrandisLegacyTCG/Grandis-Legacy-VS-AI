'use strict';

const {
  CARD_TYPES,
  ATTACK_LAYER,
  DAMAGE_PROFILE,
  NORMAL_ATTACK_BADGE,
  DEF_MECHANIC,
  ATTACHMENT_STATE,
  CONNECT_RESULT
} = require('./constants');

function classifyAttack(card) {
  const attackLayer = card.attackLayer || ATTACK_LAYER.NONE;
  const damageProfile = card.damageProfile || DAMAGE_PROFILE.NONE;

  if (attackLayer === ATTACK_LAYER.AREA) {
    return {
      primaryBadge: ATTACK_LAYER.AREA,
      attackLayer,
      damageProfile,
      usesRangeOfAttack: true,
      requiresManualTarget: false
    };
  }

  if (attackLayer === ATTACK_LAYER.RANGE) {
    return {
      primaryBadge: ATTACK_LAYER.RANGE,
      attackLayer,
      damageProfile,
      usesRangeOfAttack: true,
      requiresManualTarget: true,
      treatedAsPhysical: damageProfile === DAMAGE_PROFILE.PHYSICAL
    };
  }

  if (damageProfile === DAMAGE_PROFILE.PHYSICAL) {
    return {
      primaryBadge: NORMAL_ATTACK_BADGE.PHYSICAL,
      attackLayer,
      damageProfile,
      usesRangeOfAttack: false,
      requiresManualTarget: true
    };
  }

  if (damageProfile === DAMAGE_PROFILE.MAGICAL) {
    return {
      primaryBadge: NORMAL_ATTACK_BADGE.MAGICAL,
      attackLayer,
      damageProfile,
      usesRangeOfAttack: false,
      requiresManualTarget: true
    };
  }

  return {
    primaryBadge: 'Non-Attack',
    attackLayer,
    damageProfile,
    usesRangeOfAttack: false,
    requiresManualTarget: false
  };
}

function applySharpshooter(hero, card) {
  if (!hero || !card) return card;
  const hasSharpshooter = Array.isArray(hero.abilities) && hero.abilities.includes('Sharpshooter');
  if (!hasSharpshooter) return card;
  if (card.cardType !== CARD_TYPES.SKILL) return card;
  if (card.card_id === 'S1-ARC-001' || card.id === 'S1-ARC-001') return card; // Bow Bash printed exclusion.
  const isNormalPhysicalAttack = (card.attackLayer || ATTACK_LAYER.NONE) === ATTACK_LAYER.NONE &&
    card.damageProfile === DAMAGE_PROFILE.PHYSICAL;
  if (!isNormalPhysicalAttack) return card;
  return Object.assign({}, card, {
    attackLayer: ATTACK_LAYER.RANGE,
    runtimeNotes: [].concat(card.runtimeNotes || [], 'Sharpshooter: Physical Attack Skill gains Range Attack')
  });
}

function normalizeDefMechanic(rawKeyword) {
  const value = String(rawKeyword || '').toLowerCase().trim();
  if (['cancel', 'negate', 'counter'].includes(value)) return DEF_MECHANIC.NEGATE;
  if (['prevent all attack', 'prevent all attack damage', 'cannot take any damage', 'immunity'].includes(value)) {
    return DEF_MECHANIC.IMMUNITY;
  }
  if (value === 'block') return DEF_MECHANIC.BLOCK;
  if (value === 'reduce damage' || value === 'damage reduction') return DEF_MECHANIC.REDUCE_DAMAGE;
  if (value === 'dodge') return DEF_MECHANIC.DODGE;
  if (value === 'redirect') return DEF_MECHANIC.REDIRECT;
  return rawKeyword || null;
}

function shouldEnterAttachmentSlot(effect) {
  if (!effect) return false;
  if (effect.isPassiveHeroEffect) return false;
  const state = effect.attachmentState;
  if (!state || state === ATTACHMENT_STATE.NONE) return false;
  return true;
}

function isCasting(effect) {
  return Boolean(effect && effect.attachmentState === ATTACHMENT_STATE.CASTING);
}

function attackConnects(resolution) {
  return resolution && resolution.connectResult === CONNECT_RESULT.CONNECTS;
}

function shouldApplySecondEffect(resolution) {
  return attackConnects(resolution);
}

module.exports = {
  classifyAttack,
  applySharpshooter,
  normalizeDefMechanic,
  shouldEnterAttachmentSlot,
  isCasting,
  attackConnects,
  shouldApplySecondEffect
};
