'use strict';

const ATTACK_LABELS = Object.freeze([
  'Physical Attack',
  'Magical Attack',
  'Area Attack',
  'Range Attack',
  'Casting Attack',
  'Attack'
]);
const DAMAGE_TYPES = Object.freeze(['Physical', 'Magical']);

function canonicalExecution(card) {
  return card && (card.canonical_execution || card.execution || (card.rules && card.rules.execution)) || {};
}

function attackLabelForCard(card, context = {}) {
  const supplied = context.attack_label || context.action_profile || context.attackLabel;
  if (ATTACK_LABELS.includes(supplied)) return supplied;
  const execution = canonicalExecution(card);
  const structured = execution.attack && execution.attack.attack_label;
  if (ATTACK_LABELS.includes(structured)) return structured;
  const classification = card && (card.classification || card.action_category || card.card_subtype);
  return ATTACK_LABELS.includes(classification) ? classification : '';
}

function damageTypeForCard(card, context = {}) {
  const supplied = context.damage_type || context.damageType;
  if (DAMAGE_TYPES.includes(supplied)) return supplied;
  const execution = canonicalExecution(card);
  const structured = execution.attack && execution.attack.damage && execution.attack.damage.damage_type;
  if (DAMAGE_TYPES.includes(structured)) return structured;
  return '';
}

function matchesAttackLabel(requiredLabel, card, context = {}) {
  return attackLabelForCard(card, context) === requiredLabel;
}

function matchesDamageType(requiredType, card, context = {}) {
  return damageTypeForCard(card, context) === requiredType;
}

function classify(card, context = {}) {
  return Object.freeze({
    attack_label: attackLabelForCard(card, context),
    damage_type: damageTypeForCard(card, context)
  });
}

module.exports = {
  ATTACK_LABELS,
  DAMAGE_TYPES,
  attackLabelForCard,
  damageTypeForCard,
  matchesAttackLabel,
  matchesDamageType,
  classify
};
