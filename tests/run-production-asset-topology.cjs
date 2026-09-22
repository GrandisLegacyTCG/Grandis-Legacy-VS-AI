'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const REMOTE_CARD = 'https://grandislegacytcg.github.io/shared/season1/v1/cards/';
const REMOTE_SHARD = 'https://grandislegacytcg.github.io/shared/season1/v1/mana-shards/';
const allowedWebp = new Set([
  'assets/lobby/background.webp',
  'assets/lobby/grandis-legacy-logo.webp',
  'tutorial/assets/lobby/background.webp',
  'tutorial/assets/lobby/grandis-legacy-logo.webp',
  'tutorial/assets/tutorial/general-arvon-halfbody.webp'
]);
function walk(dir, out=[]) {
  for (const e of fs.readdirSync(dir, {withFileTypes:true})) {
    const p=path.join(dir,e.name);
    if (e.isDirectory()) walk(p,out); else out.push(p);
  }
  return out;
}
for (const rel of ['assets/cards','tutorial/assets/cards','assets/mana-shards','tutorial/assets/mana-shards']) {
  if (fs.existsSync(path.join(ROOT, rel))) throw new Error(`Production repository must not bundle shared WebP assets: ${rel}`);
}
const actualWebp = walk(ROOT).filter(p=>/\.webp$/i.test(p)).map(p=>path.relative(ROOT,p).replace(/\\/g,'/')).filter(p=>!p.startsWith('tests/fixtures/')).sort();
const unexpected = actualWebp.filter(p=>!allowedWebp.has(p));
const missing = [...allowedWebp].filter(p=>!actualWebp.includes(p));
if (unexpected.length || missing.length) throw new Error(`Production WebP topology mismatch. Unexpected=${unexpected.join(',')} Missing=${missing.join(',')}`);
for (const rel of ['js/app.bundle.js','tutorial/js/app.bundle.js']) {
  const s=fs.readFileSync(path.join(ROOT,rel),'utf8');
  if (!s.includes(`GL_SHARED_CARD_BASE='${REMOTE_CARD}'`)) throw new Error(`${rel} does not use shared production card assets.`);
  if (!s.includes(`${REMOTE_SHARD}Generic.webp`)) throw new Error(`${rel} does not use shared production Shard assets.`);
  if (s.includes("'assets/cards/") || s.includes('"assets/cards/') || s.includes("'assets/mana-shards/") || s.includes('"assets/mana-shards/')) throw new Error(`${rel} still contains local shared-asset paths.`);
}
const tool=fs.readFileSync(path.join(ROOT,'tools/build-static-data.cjs'),'utf8');
if (!tool.includes(`const ASSET_BASE = '${REMOTE_CARD.slice(0,-1)}';`)) throw new Error('Static-data builder is not source-aligned to the shared production card asset base.');
console.log('PASS: production asset topology matches source strategy (shared card/Shard WebPs remote; only source-owned lobby/tutorial WebPs remain local).');
