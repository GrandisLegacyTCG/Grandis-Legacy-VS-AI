'use strict';

const EVENT_TYPES = Object.freeze({
  ACTION_DECLARED: 'ACTION_DECLARED',
  TIMING_CHECKED: 'TIMING_CHECKED',
  SOURCE_SELECTED: 'SOURCE_SELECTED',
  CLASS_COMPATIBILITY_CHECKED: 'CLASS_COMPATIBILITY_CHECKED',
  COST_PAID: 'COST_PAID',
  TARGET_SELECTED: 'TARGET_SELECTED',
  TARGET_SLOT_SELECTED: 'TARGET_SLOT_SELECTED',
  RESPONSE_WINDOW_OPENED: 'RESPONSE_WINDOW_OPENED',
  RESPONSE_DECLARED: 'RESPONSE_DECLARED',
  RESPONSE_CONFIRMED: 'RESPONSE_CONFIRMED',
  RESPONSE_RESOLVED: 'RESPONSE_RESOLVED',
  OPPONENT_PLAYED_UPDATED: 'OPPONENT_PLAYED_UPDATED',
  ACTION_RESOLVED: 'ACTION_RESOLVED',
  DAMAGE_APPLIED: 'DAMAGE_APPLIED',
  STATUS_APPLIED: 'STATUS_APPLIED',
  CARD_MOVED: 'CARD_MOVED',
  CARD_REVEALED: 'CARD_REVEALED',
  HERO_DEFEATED: 'HERO_DEFEATED',
  PHASE_CHANGED: 'PHASE_CHANGED',
  GAME_ENDED: 'GAME_ENDED',
  EFFECT_COUNTER_ADDED: 'EFFECT_COUNTER_ADDED',
  EFFECT_EXPIRED: 'EFFECT_EXPIRED'
});

function createRuntimeEvent(event, stateOrGameId, fields) {
  const gameId = typeof stateOrGameId === 'string'
    ? stateOrGameId
    : (stateOrGameId && stateOrGameId.game_id) || 'game-unknown';
  return Object.assign({
    event,
    timestamp: new Date().toISOString(),
    game_id: gameId
  }, fields || {});
}

function appendEvents(state, events) {
  const nextEvents = Array.isArray(events) ? events : [events].filter(Boolean);
  return Object.assign({}, state, {
    event_log: (state.event_log || []).concat(nextEvents)
  });
}

function validateRuntimeEventShape(eventRecord) {
  const errors = [];
  if (!eventRecord || typeof eventRecord !== 'object') errors.push('Event must be an object.');
  if (!eventRecord.event || !Object.values(EVENT_TYPES).includes(eventRecord.event)) errors.push(`Invalid event type ${eventRecord && eventRecord.event}.`);
  if (!eventRecord.timestamp || typeof eventRecord.timestamp !== 'string') errors.push('Missing timestamp.');
  if (!eventRecord.game_id || typeof eventRecord.game_id !== 'string') errors.push('Missing game_id.');
  return { ok: errors.length === 0, errors };
}

module.exports = { EVENT_TYPES, createRuntimeEvent, appendEvents, validateRuntimeEventShape };
