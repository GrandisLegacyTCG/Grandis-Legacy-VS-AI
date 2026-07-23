'use strict';

const SLOT_ORDER = Object.freeze(['Left', 'Center', 'Right']);
const AREA_OF_ATTACK = Object.freeze({
  Left: Object.freeze(['Left', 'Center']),
  Center: Object.freeze(['Left', 'Center', 'Right']),
  Right: Object.freeze(['Center', 'Right'])
});

function normalizeSlotKey(value) {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'left') return 'Left';
  if (text === 'center' || text === 'centre') return 'Center';
  if (text === 'right') return 'Right';
  return String(value || '').trim();
}

function legalAttackTargetSlots(sourceSlot) {
  const key = normalizeSlotKey(sourceSlot);
  return AREA_OF_ATTACK[key] ? AREA_OF_ATTACK[key].slice() : [];
}

function isTargetInAreaOfAttack(sourceSlot, targetSlot) {
  return legalAttackTargetSlots(sourceSlot).includes(normalizeSlotKey(targetSlot));
}

module.exports = { SLOT_ORDER, AREA_OF_ATTACK, normalizeSlotKey, legalAttackTargetSlots, isTargetInAreaOfAttack };
