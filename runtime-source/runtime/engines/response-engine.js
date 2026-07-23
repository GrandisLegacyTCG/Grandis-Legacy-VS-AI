'use strict';

function targetKey(target) {
  if (!target) return null;
  return `${target.target_player_id || target.player_id || ''}:${target.target_slot || target.slot || target.id || ''}`;
}

function buildResponseWindows(_card, affectedTargets) {
  return (affectedTargets || []).filter(Boolean).map((target, index) => ({
    type: 'per_affected_hero',
    index,
    targetKey: targetKey(target),
    targetPlayerId: target.target_player_id || target.player_id || null,
    targetSlot: target.target_slot || target.slot || null,
    targetId: target.id || null,
    globalWindow: false,
    independentChoice: true
  }));
}

function createResponseChain({ attackingPlayerId, defendingPlayerId, window }) {
  return {
    attackingPlayerId,
    defendingPlayerId,
    window: window || null,
    stack: [],
    priorityPlayerId: defendingPlayerId,
    closed: false
  };
}

function commitResponse(chain, frame) {
  if (!chain || chain.closed) return { ok: false, errors: ['Response chain is closed.'] };
  if (!frame || frame.playerId !== chain.priorityPlayerId) return { ok: false, errors: ['Response priority belongs to the other player.'] };
  if (!frame.confirmed || !frame.costPaid || frame.zone !== 'RESPONSE_PENDING') {
    return { ok: false, errors: ['Response must be confirmed, cost-paid, and in Response Pending before counter priority opens.'] };
  }
  const next = JSON.parse(JSON.stringify(chain));
  next.stack.push(Object.assign({ cancelled: false }, frame));
  next.priorityPlayerId = frame.playerId === next.attackingPlayerId ? next.defendingPlayerId : next.attackingPlayerId;
  return { ok: true, chain: next };
}

function passResponsePriority(chain, playerId) {
  if (!chain || chain.closed) return { ok: false, errors: ['Response chain is closed.'] };
  if (chain.priorityPlayerId !== playerId) return { ok: false, errors: ['Response priority belongs to the other player.'] };
  const next = JSON.parse(JSON.stringify(chain));
  // Each confirmed response opens exactly one new priority window for the opponent.
  // Passing that window closes the current per-Hero response chain and resolves LIFO.
  next.closed = true;
  return { ok: true, chain: next, readyToResolve: true };
}

function resolveResponseChain(chain) {
  if (!chain || !chain.closed) return { ok: false, errors: ['Current priority player must pass before the response chain resolves.'] };
  const frames = JSON.parse(JSON.stringify(chain.stack || []));
  const byId = new Map(frames.map(frame => [frame.frameId, frame]));
  const ordered = frames.slice().reverse();
  for (const frame of ordered) {
    if (frame.cancelled) continue;
    if (frame.respondsToFrameId) {
      const target = byId.get(frame.respondsToFrameId);
      if (target && !target.cancelled) target.cancelled = true;
    }
  }
  return {
    ok: true,
    resolvedFrames: ordered,
    activeFrames: frames.filter(frame => !frame.cancelled),
    cancelledFrames: frames.filter(frame => frame.cancelled),
    resolutionOrder: ordered.map(frame => frame.frameId)
  };
}

module.exports = { targetKey, buildResponseWindows, createResponseChain, commitResponse, passResponsePriority, resolveResponseChain };
