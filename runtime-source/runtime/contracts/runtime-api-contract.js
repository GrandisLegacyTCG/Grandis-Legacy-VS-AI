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
    getViewerState: 'getViewerState(state, viewerContext) -> viewer-safe state',
    serializeState: 'serializeState(state, viewerContext) -> viewer-safe string/object; spectator-safe when viewer omitted',
    serializeAuthoritativeState: 'serializeAuthoritativeState(state) -> server-only authoritative snapshot',
    importState: 'importState(snapshot) -> server-only state restore',
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
