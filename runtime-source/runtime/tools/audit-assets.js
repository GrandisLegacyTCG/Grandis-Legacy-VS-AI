#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { loadCards } = require('./validate-card-database');

function parseArgs(argv) {
  const args = { pvp: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pvp') args.pvp = true;
    else if (a.startsWith('--')) args[a.slice(2)] = argv[++i];
  }
  return args;
}
function assetPaths(card) {
  const a = card.assets || {};
  return [card.full_art_path, card.thumbnail_path, a.full, a.thumb, a.thumbnail].filter(Boolean);
}
function auditAssets(cards, opts = {}) {
  const errors = [];
  const warnings = [];
  const seen = new Map();
  let total = 0;
  cards.forEach(card => {
    const id = card.card_id || card.id || '(unknown)';
    for (const p of assetPaths(card)) {
      total++;
      if (seen.has(p) && seen.get(p) !== id) warnings.push(`asset reused by ${seen.get(p)} and ${id}: ${p}`);
      seen.set(p, id);
      if (opts.pvp && /\.(jpe?g)$/i.test(p)) errors.push(`${id}: PvP asset must be WebP/non-JPG: ${p}`);
      if (opts.assetRoot && !fs.existsSync(path.resolve(opts.assetRoot, p))) warnings.push(`${id}: missing asset ${p}`);
      if (/\s/.test(p)) warnings.push(`${id}: asset path contains spaces: ${p}`);
    }
  });
  return { ok: errors.length === 0, total_asset_refs: total, unique_asset_refs: seen.size, errors, warnings };
}
function main() {
  const args = parseArgs(process.argv);
  const { cards } = loadCards(args.input);
  const report = auditAssets(cards, { assetRoot: args['asset-root'], pvp: args.pvp });
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}
if (require.main === module) main();
module.exports = { auditAssets };
