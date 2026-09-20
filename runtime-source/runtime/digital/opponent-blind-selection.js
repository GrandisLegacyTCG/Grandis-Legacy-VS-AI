'use strict';

function seedToUint32(seed) {
  const text = String(seed == null ? '' : seed);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 0x9e3779b9;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isIdentityPermutation(indexes) {
  return Array.isArray(indexes) && indexes.every((value, index) => value === index);
}

function shuffledIndexes(length, seed) {
  const size = Math.max(0, Number(length || 0));
  const out = Array.from({ length: size }, (_, i) => i);
  const random = mulberry32(seedToUint32(seed));
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  // A blind mapping that is a complete identity permutation still exposes
  // positional memory. Guarantee at least one positional change when there is
  // more than one opponent-owned candidate.
  if (out.length > 1 && isIdentityPermutation(out)) [out[0], out[1]] = [out[1], out[0]];
  return out;
}

function createSelectionEvent({ owner_id, selector_id, zone, candidates, seed, event_id }) {
  const source = Array.isArray(candidates) ? candidates.slice() : [];
  const opponentOwned = Boolean(owner_id && selector_id && owner_id !== selector_id);
  if (!opponentOwned) {
    return Object.freeze({
      event_id: event_id || String(seed || 'own-selection'),
      randomized: false,
      owner_id,
      selector_id,
      zone,
      opaque_choices: source.map((candidate, index) => ({ choice_id: `choice-${index + 1}`, candidate })),
      resolve(choiceId) {
        const idx = Number(String(choiceId).replace('choice-', '')) - 1;
        return source[idx];
      }
    });
  }
  const permutation = shuffledIndexes(source.length, seed);
  const mapping = permutation.map(index => source[index]);
  const opaque = mapping.map((_, index) => Object.freeze({ choice_id: `opaque-${index + 1}`, face: 'CARD_BACK' }));
  return Object.freeze({
    event_id: event_id || String(seed || 'blind-selection'),
    randomized: true,
    owner_id,
    selector_id,
    zone,
    opaque_choices: Object.freeze(opaque),
    resolve(choiceId) {
      const idx = Number(String(choiceId).replace('opaque-', '')) - 1;
      if (!Number.isInteger(idx) || idx < 0 || idx >= mapping.length) throw new Error('Invalid blind choice id');
      return mapping[idx];
    }
  });
}

module.exports = { seedToUint32, isIdentityPermutation, shuffledIndexes, createSelectionEvent };
