'use strict';

/**
 * Runtime API Contract v0.1
 *
 * This file documents the shared API that Local AI and PvP adapters should use.
 * It is intentionally framework-free and has no DOM/WebSocket dependency.
 */

function createRuntimeContract() {
  return Object.freeze({
    startGame: 'startGame(config) -> state',
    getLegalActions: 'getLegalActions(state, actorSide) -> LegalAction[]',
    submitIntent: 'submitIntent(state, intent) -> RuntimeResult',
    resolvePending: 'resolvePending(state, choice) -> RuntimeResult',
    getPublicState: 'getPublicState(state, viewerSide) -> PublicState',
    getPrivateState: 'getPrivateState(state, viewerSide) -> PrivateState',
    serializeState: 'serializeState(state) -> string/object',
    importState: 'importState(snapshot) -> state',
    validateCardDatabase: 'validateCardDatabase(database) -> ValidationReport',
    validateDeck: 'validateDeck(deck, database) -> ValidationReport'
  });
}

function createRuntimeResult(state, events, pending, errors) {
  return {
    state: state || null,
    events: Array.isArray(events) ? events : [],
    pending: pending || null,
    errors: Array.isArray(errors) ? errors : []
  };
}

module.exports = { createRuntimeContract, createRuntimeResult };
