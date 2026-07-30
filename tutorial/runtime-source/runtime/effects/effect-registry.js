'use strict';

const handlers = new Map();

function registerEffect(name, handler) {
  if (!name || typeof handler !== 'function') {
    throw new Error('registerEffect requires a name and handler function.');
  }
  handlers.set(name, handler);
}

function hasEffect(name) {
  return handlers.has(name);
}

function resolveEffect(name, context) {
  const handler = handlers.get(name);
  if (!handler) {
    return { ok: false, reason: `Missing effect handler: ${name}` };
  }
  return handler(context || {});
}

function listEffects() {
  return Array.from(handlers.keys()).sort();
}

// General placeholders that can be used by mock tests before real card DB exists.
registerEffect('deal_damage', ({ amount }) => ({ ok: true, damage: Number(amount || 0) }));
registerEffect('deal_area_damage', ({ amount }) => ({ ok: true, areaDamage: Number(amount || 0) }));
registerEffect('heal', ({ amount }) => ({ ok: true, heal: Number(amount || 0) }));
registerEffect('draw', ({ amount }) => ({ ok: true, draw: Number(amount || 0) }));
registerEffect('discard', ({ amount }) => ({ ok: true, discard: Number(amount || 0) }));
registerEffect('search_deck', ({ count }) => ({ ok: true, search: Number(count || 0) }));
registerEffect('gain_mana', ({ amount }) => ({ ok: true, mana: Number(amount || 0) }));
registerEffect('gain_exp', ({ amount }) => ({ ok: true, exp: Number(amount || 0) }));
registerEffect('apply_status', ({ status }) => ({ ok: true, status }));
registerEffect('remove_status', ({ status }) => ({ ok: true, removeStatus: status || 'any' }));
registerEffect('block', ({ amount }) => ({ ok: true, mechanic: 'Block', amount: Number(amount || 0) }));
registerEffect('reduce_damage', ({ amount, duration }) => ({ ok: true, mechanic: 'Reduce Damage', amount: Number(amount || 0), duration }));
registerEffect('dodge', () => ({ ok: true, mechanic: 'Dodge' }));
registerEffect('negate', ({ targetType }) => ({ ok: true, mechanic: 'Negate', targetType }));
registerEffect('redirect', ({ redirectTo }) => ({ ok: true, mechanic: 'Redirect', redirectTo }));
registerEffect('cannot_take_any_damage', ({ duration }) => ({ ok: true, mechanic: 'Cannot Take Any Damage (Immunity)', duration }));
registerEffect('attach_modifier', ({ attachmentState, duration }) => ({ ok: true, attachmentState, duration }));
registerEffect('casting_spell', ({ duration }) => ({ ok: true, attachmentState: 'Casting', duration }));
registerEffect('revive', ({ amount }) => ({ ok: true, revive: true, hp: Number(amount || 0) }));
registerEffect('reposition', ({ mode }) => ({ ok: true, reposition: mode || 'swap' }));
registerEffect('rank_up', ({ rank }) => ({ ok: true, rankUpTo: rank }));
registerEffect('tribute', ({ count }) => ({ ok: true, tribute: Number(count || 1) }));
registerEffect('legacy_transform', ({ legacyId }) => ({ ok: true, legacyId }));

module.exports = { registerEffect, hasEffect, resolveEffect, listEffects };
