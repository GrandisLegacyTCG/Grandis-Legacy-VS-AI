'use strict';

const PENDING_TYPES = Object.freeze({
  NONE: 'None',
  CHOOSE_SOURCE: 'Choose Source',
  CHOOSE_TARGET: 'Choose Target',
  CONFIRM_ACTION: 'Confirm Action',
  RESPONSE_WINDOW: 'Response Window',
  CONFIRM_RESPONSE: 'Confirm Response',
  CHOOSE_DISCARD: 'Choose Discard',
  CHOOSE_EXP_CARD: 'Choose EXP Card',
  CHOOSE_LEGACY: 'Choose Legacy',
  CHOOSE_REPOSITION: 'Choose Reposition',
  HAND_LIMIT_CLEANUP: 'Hand Limit Cleanup'
});

function createPending(type, ownerSide, data, meta) {
  const m = meta || {};
  return {
    type,
    ownerSide,
    data: data || {},
    commitStage: m.commitStage || 'pre_commit',
    hiddenInformationExposed: m.hiddenInformationExposed === true,
    responseWindowOpened: m.responseWindowOpened === true,
    createdAt: Date.now()
  };
}

module.exports = { PENDING_TYPES, createPending };
