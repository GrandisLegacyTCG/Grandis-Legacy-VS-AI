'use strict';

module.exports = {
  constants: require('./constants'),
  rules: require('./rules'),
  eventLog: require('./event-log'),
  reducer: require('./reducer'),
  sourceSyncRules: require('./source-sync-rules'),
  swapRepositionPolicy: require('./swap-reposition-policy'),
  positioningPolicy: require('./positioning-policy'),
  pendingClosePolicy: require('./pending-close-policy'),
  attachmentLifecyclePolicy: require('./attachment-lifecycle-policy'),
  healPolicy: require('./heal-policy'),
  deckoutPolicy: require('./deckout-policy'),
  localAiIntegrationPolicy: require('./local-ai-integration-policy'),
  responseAvailabilityPolicy: require('./response-availability-policy'),
  manaDeckPolicy: require('./mana-deck-policy'),
  drawPolicy: require('./draw-policy'),
  legacyDefeatPolicy: require('./legacy-defeat-policy'),
  tripleShotPolicy: require('./triple-shot-policy'),
  tributePolicy: require('./tribute-policy'),
  exhaustPolicy: require('./exhaust-policy')
};

module.exports.cardInstanceFinalizationPolicy = require('./card-instance-finalization-policy');
module.exports.conditionalFollowUp = require('../effects/conditional-follow-up');
