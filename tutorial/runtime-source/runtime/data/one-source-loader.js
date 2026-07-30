'use strict';

const fs = require('fs');
const path = require('path');

const EXPECTED_CARD_COUNT = 198;

function readJson(filePath, label) {
  if (!filePath) throw new Error(`${label} path is required.`);
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) throw new Error(`${label} is missing: ${resolved}`);
  try {
    return JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${resolved}: ${error.message}`);
  }
}

function countRecords(value, keys) {
  for (const key of keys) if (Array.isArray(value && value[key])) return value[key].length;
  return 0;
}

function assertGeneratedArtifact(value, label, recordKeys, expectedHash) {
  if (!value || value.generated_only !== true) throw new Error(`${label} is not a generated one-source artifact.`);
  if (value.canonical_registry_hash !== expectedHash) throw new Error(`${label} canonical registry hash mismatch.`);
  const count = countRecords(value, recordKeys);
  if (count !== EXPECTED_CARD_COUNT) throw new Error(`${label} expected ${EXPECTED_CARD_COUNT} records, found ${count}.`);
}

function loadOneSourceStack(options) {
  const safe = options || {};
  const runtimeData = readJson(safe.runtimeDataPath, 'Runtime Data');
  const registryHash = safe.expectedRegistryHash || runtimeData.canonical_registry_hash;
  if (!registryHash) throw new Error('Expected canonical registry hash is missing.');
  const effectRecipe = readJson(safe.effectRecipePath, 'Effect Recipe');
  const legality = readJson(safe.legalityPath, 'Legality Map');
  assertGeneratedArtifact(runtimeData, 'Runtime Data', ['cards'], registryHash);
  assertGeneratedArtifact(effectRecipe, 'Effect Recipe', ['effect_recipes'], registryHash);
  assertGeneratedArtifact(legality, 'Legality Map', ['legality'], registryHash);
  const cardsById = Object.fromEntries(runtimeData.cards.map((card) => [card.card_id, card]));
  const recipesById = Object.fromEntries(effectRecipe.effect_recipes.map((recipe) => [recipe.card_id, recipe]));
  const legalityById = Object.fromEntries(legality.legality.map((entry) => [entry.card_id, entry]));
  const ids = Object.keys(cardsById);
  for (const id of ids) {
    if (!recipesById[id] || !legalityById[id]) throw new Error(`One-source coverage mismatch for ${id}.`);
    if (cardsById[id].canonical_hash !== recipesById[id].canonical_hash || cardsById[id].canonical_hash !== legalityById[id].canonical_hash) {
      throw new Error(`Canonical card hash mismatch for ${id}.`);
    }
  }
  return {
    canonical_registry_hash: registryHash,
    cards: runtimeData.cards,
    cards_by_id: cardsById,
    effect_recipes: effectRecipe,
    recipes_by_id: recipesById,
    legality,
    legality_by_id: legalityById
  };
}

module.exports = { EXPECTED_CARD_COUNT, readJson, assertGeneratedArtifact, loadOneSourceStack };
