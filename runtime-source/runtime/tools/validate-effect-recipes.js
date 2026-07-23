#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { loadCards } = require('./validate-card-database');
const { listEffects } = require('../effects/effect-registry');
const bucketEngine = require('../effects/recipe-bucket-engine');
const REDUCER_OWNED_HANDLERS = new Set([
  'resolveLatestLegacyAbility',
  'target_adjacent_swap_after_connected_hit',
  'source_front_lane_swap_after_successful_attack',
  'damage_attack_restriction_cannot_be_dodged',
  'dodge_then_reposition',
  'source_any_allied_hero_swap_after_successful_attack',
  'response_redirect_reposition',
  'resolve_discard_opponent_exp'
]);

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[++i];
  return args;
}
function arr(v) { return Array.isArray(v) ? v : (v == null ? [] : [v]); }

function validateCardEmbeddedRecipes(cards) {
  const known = new Set(listEffects());
  const used = new Map();
  const missing = [];
  cards.forEach(card => {
    arr(card.effect_recipe || card.effectRecipe || card.effects).forEach(step => {
      const effect = step && (step.effect || step.type || step.handler);
      if (!effect) return;
      used.set(effect, (used.get(effect) || 0) + 1);
      if (!known.has(effect)) missing.push({ card_id: card.card_id || card.id, effect });
    });
  });
  return { ok: missing.length === 0, mode: 'card_embedded_effect_recipes', used_effects: Object.fromEntries([...used].sort()), missing_handlers: missing, registered_handlers: [...known].sort() };
}

function validateDispatcherRecipes(db) {
  const recipes = Array.isArray(db && db.effect_recipes) ? db.effect_recipes : [];
  const errors = [];
  const warnings = [];
  const handlerCounts = {};
  recipes.forEach((recipe, idx) => {
    const loc = `recipe[${idx}] ${recipe.card_id || '(no card_id)'}`;
    if (!recipe.card_id) errors.push(`${loc}: missing card_id`);
    if (!recipe.name) warnings.push(`${loc}: missing name`);
    if (recipe.dispatcher_ready) {
      if (!recipe.dispatch_handler) errors.push(`${loc}: dispatcher_ready but no dispatch_handler`);
      else if (typeof bucketEngine[recipe.dispatch_handler] !== 'function' && !REDUCER_OWNED_HANDLERS.has(recipe.dispatch_handler)) errors.push(`${loc}: missing bucket/reducer handler ${recipe.dispatch_handler}`);
      else handlerCounts[recipe.dispatch_handler] = (handlerCounts[recipe.dispatch_handler] || 0) + 1;
    }
  });
  return {
    ok: errors.length === 0,
    mode: 'dispatcher_effect_recipes',
    version: db && db.version || null,
    recipe_count: recipes.length,
    dispatcher_ready_count: recipes.filter(r => r.dispatcher_ready).length,
    handler_counts: handlerCounts,
    errors,
    warnings
  };
}

function validateEffectRecipesFromInput(input) {
  const raw = JSON.parse(fs.readFileSync(input, 'utf8'));
  if (raw && Array.isArray(raw.effect_recipes)) return validateDispatcherRecipes(raw);
  const { cards } = loadCards(input);
  return validateCardEmbeddedRecipes(cards);
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.input) throw new Error('Missing --input <cards-or-effect-recipes.json>');
  const report = validateEffectRecipesFromInput(args.input);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (require.main === module) main();
module.exports = { validateEffectRecipes: validateCardEmbeddedRecipes, validateCardEmbeddedRecipes, validateDispatcherRecipes, validateEffectRecipesFromInput };
