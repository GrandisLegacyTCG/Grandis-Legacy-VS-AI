#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { loadCards, validateCards } = require('./validate-card-database');
const { validateEffectRecipes } = require('./validate-effect-recipes');
const { auditAssets } = require('./audit-assets');

function parseArgs(argv) {
  const args = { pvp: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pvp') args.pvp = true;
    else if (a.startsWith('--')) args[a.slice(2)] = argv[++i];
  }
  return args;
}
function normalizeCard(card) {
  return Object.assign({}, card, {
    card_id: card.card_id || card.id,
    card_name: card.card_name || card.name,
    card_type: card.card_type || card.type,
    effect_recipe: card.effect_recipe || card.effectRecipe || card.effects || []
  });
}
function importCards(input, outDir, opts = {}) {
  const loaded = loadCards(input);
  const cards = loaded.cards.map(normalizeCard);
  const validation = validateCards(cards, opts);
  const effects = validateEffectRecipes(cards);
  const assets = auditAssets(cards, opts);
  const ok = validation.ok && effects.ok && assets.ok;
  const report = { ok, validation, effects, assets, count: cards.length };
  if (!outDir) return { report, cards };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'cards.normalized.json'), JSON.stringify({ database_version: loaded.meta.database_version || null, cards }, null, 2));
  fs.writeFileSync(path.join(outDir, 'import-report.json'), JSON.stringify(report, null, 2));
  return { report, cards };
}
function main() {
  const args = parseArgs(process.argv);
  if (!args.input) throw new Error('Missing --input <cards.json>');
  const { report } = importCards(args.input, args.out || './runtime/generated', { assetRoot: args['asset-root'], pvp: args.pvp });
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}
if (require.main === module) main();
module.exports = { importCards, normalizeCard };
