'use strict';

const bucket = require('./recipe-bucket-engine');

function normalizeRecipeDb(db) {
  if (!db) return [];
  if (Array.isArray(db)) return db;
  if (Array.isArray(db.effect_recipes)) return db.effect_recipes;
  if (Array.isArray(db.recipes)) return db.recipes;
  return [];
}

function buildRecipeIndex(db) {
  const recipes = normalizeRecipeDb(db);
  const byCardId = new Map();
  const byName = new Map();
  for (const recipe of recipes) {
    if (recipe && recipe.card_id) byCardId.set(recipe.card_id, recipe);
    if (recipe && recipe.name) byName.set(String(recipe.name).toLowerCase(), recipe);
  }
  return { recipes, byCardId, byName };
}

function getRecipe(db, cardIdOrName) {
  const index = buildRecipeIndex(db);
  const key = String(cardIdOrName || '');
  return index.byCardId.get(key) || index.byName.get(key.toLowerCase()) || null;
}

function asTags(recipe) {
  return new Set(String(recipe && recipe.runtime_tags || '').split(';').map(v => v.trim()).filter(Boolean));
}

function dispatchNameForRecipe(recipe) {
  if (!recipe) return null;
  if (recipe.dispatch_handler) return recipe.dispatch_handler;
  const tags = asTags(recipe);
  if (tags.has('POISON') && tags.has('PHYSICAL_ATTACK_MODIFIER')) return 'resolvePoisonVial';
  if (tags.has('DOUBLE_BASE_DAMAGE') && tags.has('SOLO_HERO_CONDITION')) return 'resolveLastResort';
  if (tags.has('DOUBLE_BASE_DAMAGE') && tags.has('MANA_COST_MODIFIER')) return 'resolveHeavensFury';
  if (tags.has('DOUBLE_CASTING')) return 'resolveDoubleCasting';
  if (tags.has('TAUNT')) return 'resolveTaunt';
  if (tags.has('UNTARGETABLE_BY_ATTACKS') && recipe.card_id === 'S1-ITM-015') return 'resolveInvisibilityCloak';
  if (tags.has('UNTARGETABLE_BY_ATTACKS') && recipe.card_id === 'S1-CLE-009') return 'resolveHolyRing';
  if (tags.has('PREVENT_ATTACK_DAMAGE') && tags.has('SELF_FREEZE_2_TURNS')) return 'resolveIceBlock';
  if (tags.has('ROSTER_BASE_CLASS_CONDITION') && tags.has('PHYSICAL_ATTACK_DAMAGE_MODIFIER')) return 'resolveCoordinationAttack';
  return null;
}

function dispatchEffectRecipe(input) {
  const safeInput = input || {};
  const recipe = safeInput.recipe || getRecipe(safeInput.recipe_db, safeInput.card_id || safeInput.name);
  if (!recipe) {
    return { ok: false, dispatched: false, errors: [`No effect recipe found for ${safeInput.card_id || safeInput.name || 'unknown card'}.`] };
  }
  const handlerName = dispatchNameForRecipe(recipe);
  if (!handlerName || typeof bucket[handlerName] !== 'function') {
    return {
      ok: true,
      dispatched: false,
      card_id: recipe.card_id,
      name: recipe.name,
      handler: null,
      result: {
        recipe_status: recipe.recipe_status || 'unknown',
        effect_buckets: recipe.effect_buckets || [],
        note: 'No executable handler yet; recipe remains data-only for this runtime foundation.'
      },
      errors: []
    };
  }
  const result = bucket[handlerName](safeInput.context || {});
  return {
    ok: true,
    dispatched: true,
    card_id: recipe.card_id,
    name: recipe.name,
    handler: handlerName,
    effect_buckets: recipe.effect_buckets || [],
    result,
    errors: []
  };
}

module.exports = {
  normalizeRecipeDb,
  buildRecipeIndex,
  getRecipe,
  dispatchNameForRecipe,
  dispatchEffectRecipe
};
