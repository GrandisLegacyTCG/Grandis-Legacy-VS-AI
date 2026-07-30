'use strict';

/**
 * Lightweight schema sanity checks without external dependencies.
 * This is NOT a full JSON Schema validator. It only checks required keys and
 * obvious type expectations for pre-database readiness.
 */

function requireKeys(obj, keys) {
  return keys.filter(key => !Object.prototype.hasOwnProperty.call(obj || {}, key));
}

function checkCardShape(card) {
  const missing = requireKeys(card, ['id', 'name', 'card_type', 'timing', 'zone_after_resolve']);
  const errors = missing.map(key => `Missing card key: ${key}`);
  if (card && card.card_type === 'Item' && card.mana_cost !== null && card.mana_cost !== undefined) {
    errors.push('Current Item rule expects no mana cost unless future rules explicitly change it.');
  }
  return { ok: errors.length === 0, errors };
}

function checkEffectRecipeShape(recipe) {
  const missing = requireKeys(recipe, ['effect']);
  const errors = missing.map(key => `Missing effect recipe key: ${key}`);
  return { ok: errors.length === 0, errors };
}

function checkDeckShape(deck) {
  const missing = requireKeys(deck, ['id', 'name', 'heroes', 'main_deck', 'legacy_deck']);
  const errors = missing.map(key => `Missing deck key: ${key}`);
  return { ok: errors.length === 0, errors };
}

module.exports = { checkCardShape, checkEffectRecipeShape, checkDeckShape };
