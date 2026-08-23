'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HASH = 'b185307752fd523d6c1e4a450f8bdd82b96b4d4cbfbb884fca8a619e8c5c8057';
const HERO_HASH = '487aa2620b5be99480a81d462082f1a35ee637ec2cc38ebf42b1bcf1103d06c9';
const ASSET_BASE = 'https://grandislegacytcg.github.io/shared/season1/v1/cards';

function readJSON(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function assertAuthority(runtimeData, recipes, preview, heroComponents) {
  const ids = runtimeData.cards.map((card) => card.card_id);
  const uniqueIds = new Set(ids);
  if (runtimeData.canonical_registry_hash !== HASH || recipes.canonical_registry_hash !== HASH || preview.canonical_registry_hash !== HASH) {
    throw new Error('Canonical Season 1 registry hash mismatch.');
  }
  if (ids.length !== 198 || uniqueIds.size !== 198 || recipes.effect_recipes.length !== 198 || preview.cards.length !== 198) {
    throw new Error('Canonical Season 1 source must contain 198 unique cards, recipes, and previews.');
  }
  if (heroComponents.registry_hash !== HERO_HASH || runtimeData.hero_component_registry_hash !== HERO_HASH) {
    throw new Error('Hero Component Authority hash mismatch.');
  }
  if (heroComponents.racial_traits.length !== 6 || heroComponents.class_abilities.length !== 16 || heroComponents.hero_profiles.length !== 10 || heroComponents.hero_compositions.length !== 30) {
    throw new Error('Hero Component Authority cardinality mismatch.');
  }
  const backSlash = runtimeData.cards.find((card) => card.card_id === 'S1-THF-010');
  if (!backSlash || backSlash.name !== 'Back Slash') throw new Error('S1-THF-010 must resolve to Back Slash.');
  const resurrection = runtimeData.cards.find((card) => card.card_id === 'S1-CLE-015');
  const serializedResurrection = JSON.stringify(resurrection);
  if (!resurrection || !resurrection.canonical_cost || resurrection.canonical_cost.mana !== 3 || !serializedResurrection.includes('50') || serializedResurrection.includes('40 HP') || serializedResurrection.includes('Set HP to 40')) {
    throw new Error('Resurrection must be canonical 3 Mana / 50 HP with no stale 40 HP metadata.');
  }
}

function createAssetManifest(cards) {
  const mainBack = `${ASSET_BASE}/ui/Back-of-Card-Main-Deck.webp`;
  const legacyBack = `${ASSET_BASE}/ui/Back-of-Card-Legacy-Deck.webp`;
  const entries = {};
  for (const card of cards) {
    const url = `${ASSET_BASE}/thumbs/${card.card_id}.webp`;
    entries[card.card_id] = {
      card_id: card.card_id,
      local_thumb_path: url,
      local_thumb_exists: true,
      local_full_path: url,
      local_full_exists: true,
      fallback_thumb_path: card.card_type === 'Hero' ? legacyBack : mainBack,
      sha256: card.asset && card.asset.sha256 ? card.asset.sha256 : '',
      canonical_hash: card.canonical_hash,
      status: 'canonical-remote'
    };
  }
  return {
    version: 'v1.5-local-ai',
    canonical_registry_hash: HASH,
    hero_component_registry_hash: HERO_HASH,
    cards: entries,
    counts: {
      cards: cards.length,
      webp_card_thumbs: cards.length,
      cards_with_local_thumb: cards.length,
      cards_missing_any_thumb: 0
    },
    ui: {
      main_deck_card_back: mainBack,
      legacy_deck_card_back: legacyBack,
      racial_token_head: `${ASSET_BASE}/ui/Racial-Token-Head.webp`,
      racial_token_tail: `${ASSET_BASE}/ui/Racial-Token-Tail.webp`,
      mana_shard: `${ASSET_BASE}/ui/Mana-Shard-Thumb.webp`
    }
  };
}

function assignment(name, value) {
  return `window.${name}=${JSON.stringify(value)};`;
}

function assertAuthorityMirrors() {
  const pairs = [
    ['data/season1/cards.runtime.v0.13.1.json', 'runtime-source/data/season1/cards.runtime.v0.13.1.json'],
    ['data/season1/effect-recipes.runtime.v0.12.1.json', 'runtime-source/data/season1/effect-recipes.runtime.v0.12.1.json'],
    ['data/season1/legality-map.runtime.v0.11.9.json', 'runtime-source/data/season1/legality-map.runtime.v0.11.9.json'],
    ['tutorial/data/season1/cards.runtime.v0.13.1.json', 'tutorial/runtime-source/data/season1/cards.runtime.v0.13.1.json'],
    ['tutorial/data/season1/effect-recipes.runtime.v0.12.1.json', 'tutorial/runtime-source/data/season1/effect-recipes.runtime.v0.12.1.json'],
    ['tutorial/data/season1/legality-map.runtime.v0.11.9.json', 'tutorial/runtime-source/data/season1/legality-map.runtime.v0.11.9.json']
  ];
  for (const [active, mirror] of pairs) {
    if (!fs.readFileSync(path.join(ROOT, active)).equals(fs.readFileSync(path.join(ROOT, mirror)))) {
      throw new Error(`Runtime-source mirror mismatch: ${mirror}`);
    }
  }
}

function buildFor(targetRoot) {
  const dataPrefix = targetRoot === '.' ? 'data/season1' : `${targetRoot}/data/season1`;
  const runtimeData = readJSON(`${dataPrefix}/cards.runtime.v0.13.1.json`);
  const recipes = readJSON(`${dataPrefix}/effect-recipes.runtime.v0.12.1.json`);
  const preview = readJSON(`${dataPrefix}/card-preview.generated.v1.4.1.json`);
  const heroComponents = readJSON(`${dataPrefix}/hero-components.runtime.v1.0.0.json`);
  assertAuthority(runtimeData, recipes, preview, heroComponents);

  const sourceStack = {
    runtime_foundation: 'v1.85',
    runtime_data: 'v0.13.1',
    effect_checkpoint: 'v0.12.1',
    effect_recipe: 'v0.12.1',
    legality_map: 'v0.11.9',
    runtime_core: 'v0.53',
    shared_manual: 'v1.41',
    local_ai: 'v6.9',
    pvp_railway: 'v3.07',
    deck_builder: 'v1.16',
    starter60: 'v1.3',
    ui_lock: 'v2.48',
    application_runtime_sync: 'v2.47',
    rulebook_ai_game_flow: 'v2',
    card_visual_source: 'Season 1 v1.2 FINAL REVISED',
    one_source_authority: 'v1.6.1',
    hero_component_authority: 'v1.0.0',
    canonical_registry_hash: HASH,
    hero_component_registry_hash: HERO_HASH,
    card_count: 198,
    authority_mode: 'ONE_SOURCE_FAIL_CLOSED',
    generated_file: 'js/static-data.js',
    public_deck_builder: 'v1.16',
    ui_design_lock: 'v2.48',
    one_source_patch: 'v1.6.1'
  };
  const definitions = {
    version: 'v0.13.1',
    date: '2026-08-24',
    status: 'AUTHORITATIVE_GENERATED_RUNTIME_DATA',
    ...runtimeData,
    families: runtimeData.cards.reduce((groups, card) => {
      const family = card.family || 'Unknown';
      if (!groups[family]) groups[family] = { cards: [] };
      groups[family].cards.push(card);
      return groups;
    }, {})
  };
  const effectRecipes = {
    version: 'v0.12.1',
    date: '2026-08-24',
    status: 'AUTHORITATIVE_GENERATED_EFFECT_RECIPES',
    ...recipes
  };
  const gate = {
    canonical_registry_hash: HASH,
    hero_component_registry_hash: HERO_HASH,
    card_count: 198,
    hero_component_counts: { racial_traits: 6, class_abilities: 16, hero_profiles: 10, hero_compositions: 30 },
    schema_version: '1.4.1',
    runtime_data: 'v0.13.1',
    effect_recipe: 'v0.12.1',
    effect_checkpoint: 'v0.12.1',
    legality_map: 'v0.11.9',
    source_patch: 'v1.6.1'
  };

  const output = [
    "'use strict';",
    '(function(window){',
    assignment('GL_SOURCE_STACK', sourceStack),
    assignment('GRANDIS_LEGACY_RUNTIME_DATA', runtimeData),
    assignment('GRANDIS_LEGACY_CARD_PREVIEW', preview),
    assignment('GRANDIS_LEGACY_HERO_COMPONENTS', heroComponents),
    'window.GL_HERO_COMPONENTS=window.GRANDIS_LEGACY_HERO_COMPONENTS;',
    assignment('GL_CARD_DEFINITIONS', definitions),
    assignment('GL_EFFECT_RECIPES', effectRecipes),
    assignment('GL_ASSET_MANIFEST', createAssetManifest(runtimeData.cards)),
    assignment('GRANDIS_LEGACY_ONE_SOURCE_READY', gate),
    '})(typeof window!==\'undefined\'?window:globalThis);',
    ''
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, targetRoot, 'js/static-data.js'), output);
}

assertAuthorityMirrors();
buildFor('.');
buildFor('tutorial');
console.log('PASS: VS AI and Tutorial static authority bundles regenerated from Source Stack 2026-08-24.');
