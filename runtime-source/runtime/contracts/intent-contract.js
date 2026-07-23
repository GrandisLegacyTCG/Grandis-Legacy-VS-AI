'use strict';

const INTENT_TYPES = Object.freeze({
  START_GAME: 'START_GAME',
  PASS_PHASE: 'PASS_PHASE',
  PLAY_CARD: 'PLAY_CARD',
  USE_ABILITY: 'USE_ABILITY',
  USE_RACIAL_TRAIT: 'USE_RACIAL_TRAIT',
  SELECT_LEGACY_COST_CARD: 'SELECT_LEGACY_COST_CARD',
  CONFIRM_LEGACY_COST: 'CONFIRM_LEGACY_COST',
  SELECT_LEGACY_EFFECT_CARD: 'SELECT_LEGACY_EFFECT_CARD',
  CONFIRM_LEGACY_EFFECT: 'CONFIRM_LEGACY_EFFECT',
  SELECT_SOURCE: 'SELECT_SOURCE',
  SELECT_TARGET: 'SELECT_TARGET',
  SELECT_SCOUTING_EXP_CARD: 'SELECT_SCOUTING_EXP_CARD',
  CONFIRM_ACTION: 'CONFIRM_ACTION',
  DECLARE_RESPONSE: 'DECLARE_RESPONSE',
  CONFIRM_RESPONSE: 'CONFIRM_RESPONSE',
  RESOLVE_PENDING: 'RESOLVE_PENDING',
  REPOSITION: 'REPOSITION',
  SURRENDER: 'SURRENDER'
});

function createIntent(type, side, payload) {
  if (!Object.prototype.hasOwnProperty.call(INTENT_TYPES, type)) {
    // Accept raw value for forward compatibility, but keep a warning marker.
    return { type, side, payload: payload || {}, warning: 'UNKNOWN_INTENT_TYPE' };
  }
  return { type: INTENT_TYPES[type], side, payload: payload || {} };
}

module.exports = { INTENT_TYPES, createIntent };
