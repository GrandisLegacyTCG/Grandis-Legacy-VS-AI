'use strict';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hiddenCards(count) {
  return Array.from({ length: Math.max(0, Number(count || 0)) }, (_, index) => ({
    opaque_id: `hidden-card-${index + 1}`,
    card_back: true,
    hidden_identity: true
  }));
}

function hiddenShards(count) {
  return Array.from({ length: Math.max(0, Number(count || 0)) }, (_, index) => ({
    opaque_id: `hidden-shard-${index + 1}`,
    card_back: true,
    hidden_identity: true
  }));
}

function removeAuthorityOnlyKeys(value) {
  if (Array.isArray(value)) {
    for (const item of value) removeAuthorityOnlyKeys(item);
    return value;
  }
  if (!value || typeof value !== 'object') return value;
  for (const key of Object.keys(value)) {
    if (/blind.*mapping/i.test(key) || /blind.*seed/i.test(key) || /server.*seed/i.test(key) || /hidden.*candidate.*id/i.test(key)) {
      delete value[key];
      continue;
    }
    removeAuthorityOnlyKeys(value[key]);
  }
  return value;
}

function normalizeViewer(viewerContext) {
  if (typeof viewerContext === 'string') return { role: 'player', viewer_id: viewerContext };
  const viewer = viewerContext && typeof viewerContext === 'object' ? viewerContext : {};
  const role = String(viewer.role || (viewer.viewer_id ? 'player' : 'spectator')).toLowerCase();
  return { role, viewer_id: viewer.viewer_id || viewer.player_id || null };
}

function serializeViewerSafeState(state, viewerContext) {
  const viewer = normalizeViewer(viewerContext);
  const out = clone(state || {});
  const players = out.players || {};

  for (const [playerId, player] of Object.entries(players)) {
    if (!player || typeof player !== 'object') continue;
    const isOwner = viewer.role === 'player' && viewer.viewer_id === playerId;

    // Main Deck and Shard Deck order/identity are hidden information even from
    // their owner. Only counts are needed in a viewer-safe snapshot.
    if (Array.isArray(player.main_deck)) {
      player.main_deck_count = player.main_deck.length;
      player.main_deck = hiddenCards(player.main_deck.length);
    }
    if (Array.isArray(player.mana_deck)) {
      player.mana_deck_count = player.mana_deck.length;
      player.mana_deck = hiddenShards(player.mana_deck.length);
    }

    if (!isOwner) {
      if (Array.isArray(player.hand)) {
        player.hand_count = player.hand.length;
        player.hand = hiddenCards(player.hand.length);
      }
      if (Array.isArray(player.mana_pool_cards)) {
        player.mana_pool_count = player.mana_pool_cards.length;
        player.mana_pool_cards = hiddenShards(player.mana_pool_cards.length);
      }
      // Deck composition caches can reveal hidden opponent construction.
      if (player.main_deck_card_counts && typeof player.main_deck_card_counts === 'object') player.main_deck_card_counts = {};
      if (Array.isArray(player.mana_deck_ultimate_card_ids)) player.mana_deck_ultimate_card_ids = [];
    }
  }

  // Blind mappings and real selected indices are authoritative-only. Opaque
  // selection indices/handles may remain so the viewer can complete the UI flow.
  if (out.pending && typeof out.pending === 'object') {
    delete out.pending.opponent_hand_blind_mapping;
    delete out.pending.opponent_mana_blind_mapping;
    delete out.pending.selected_opponent_hand_index;
    delete out.pending.selected_opponent_mana_indices;
  }

  // Authoritative logs/continuations may contain hidden draw/search identities.
  // Client event feeds must be produced separately from explicit public events.
  if (Array.isArray(out.event_log)) {
    out.event_log_count = out.event_log.length;
    out.event_log = [];
  }
  if (Array.isArray(out.continuation_queue)) out.continuation_queue = [];

  removeAuthorityOnlyKeys(out);
  return out;
}

class PvPAdapterContract {
  constructor(runtime) {
    this.runtime = runtime;
  }

  // Viewer-safe by default. Omitting viewerContext returns a spectator-safe view.
  serializeState(state, viewerContext) {
    return serializeViewerSafeState(state, viewerContext);
  }

  serializeForPlayer(state, playerId) {
    return serializeViewerSafeState(state, { role: 'player', viewer_id: playerId });
  }

  serializeForSpectator(state) {
    return serializeViewerSafeState(state, { role: 'spectator' });
  }

  // Server-authoritative snapshots are explicit and must never be sent to an
  // untrusted player client.
  serializeAuthoritativeState(state) {
    return clone(state);
  }

  // Server-side restore only; not a client action.
  importSnapshot(snapshot) {
    return clone(snapshot);
  }

  submitPlayerIntent(state, intent) {
    return this.runtime.submitIntent(state, intent);
  }
}

module.exports = { PvPAdapterContract, serializeViewerSafeState };
