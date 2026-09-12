'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ROOT_HASH = 'ce79e5a97c115507f68734887160b575840899056e1533488e3fddd3a11fec1f';
const TUTORIAL_HASH = ROOT_HASH;
const HERO_HASH = '487aa2620b5be99480a81d462082f1a35ee637ec2cc38ebf42b1bcf1103d06c9';
const ASSET_BASE = 'https://grandislegacytcg.github.io/shared/season1/v1/cards';

function readJSON(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function assertAuthority(runtimeData, recipes, preview, heroComponents, expectedHash) {
  const ids = runtimeData.cards.map((card) => card.card_id);
  const uniqueIds = new Set(ids);
  if (runtimeData.canonical_registry_hash !== expectedHash || recipes.canonical_registry_hash !== expectedHash || preview.canonical_registry_hash !== expectedHash) {
    throw new Error('Canonical Season 1 registry hash mismatch.');
  }
  if (ids.length !== 200 || uniqueIds.size !== 200 || recipes.effect_recipes.length !== 200 || preview.cards.length !== 200) {
    throw new Error('Canonical Season 1 source must contain 200 unique cards, recipes, and previews.');
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
  const followUps = {
    rage: runtimeData.cards.find((card) => card.card_id === 'S1-WAR-010'),
    venom: runtimeData.cards.find((card) => card.card_id === 'S1-THF-015'),
    tornado: runtimeData.cards.find((card) => card.card_id === 'S1-MAG-007')
  };
  if (!followUps.rage || !followUps.venom || !followUps.tornado || !Object.values(followUps).every(card => Array.isArray(card.conditional_follow_ups) && card.conditional_follow_ups.length === 1)) {
    throw new Error('Rage Blast, Venom Sovereign, and Tornado must each consume one generic Conditional Follow-up contract.');
  }
  const rageContract = followUps.rage.conditional_follow_ups[0];
  const venomContract = followUps.venom.conditional_follow_ups[0];
  const tornadoContract = followUps.tornado.conditional_follow_ups[0];
  if (rageContract.effect.amount !== 20 || rageContract.effect.damage_type !== 'Physical' || rageContract.requires_primary_hp_damage || rageContract.opens_response_window) throw new Error('Rage Blast follow-up contract mismatch.');
  if (followUps.venom.attack.damage_by_class.Rogue !== 20 || followUps.venom.attack.damage_by_class.Renegade !== 40 || venomContract.effect.amount !== 40 || venomContract.effect.damage_type !== 'Magical' || venomContract.requires_primary_hp_damage || venomContract.opens_response_window) throw new Error('Venom Sovereign Primary/follow-up contract mismatch.');
  if (tornadoContract.effect.amount !== 40 || tornadoContract.effect.damage_type !== 'Magical' || !tornadoContract.trigger_on_dodge || tornadoContract.opens_response_window) throw new Error('Tornado Dodge follow-up contract mismatch.');
}

function createAssetManifest(cards, canonicalHash) {
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
    canonical_registry_hash: canonicalHash,
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

function normalizePlayerTerminology(value) {
  if (typeof value === 'string') {
    return value
      .replace(/Generic\s+Mana\s+Shard/g, 'Mana Shard')
      .replace(/Mana\s+Deck/g, 'Shard Deck')
      .replace(/Mana\s+Pool/g, 'Shard Pool')
      .replace(/Mana\s+Card/g, 'Shard');
  }
  if (Array.isArray(value)) return value.map(normalizePlayerTerminology);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) out[key] = normalizePlayerTerminology(item);
    return out;
  }
  return value;
}

function assignment(name, value) {
  return `window.${name}=${JSON.stringify(value)};`;
}

function assertAuthorityMirrors() {
  const pairs = [
    ['data/season1/cards.runtime.v0.15.0.json', 'runtime-source/data/season1/cards.runtime.v0.15.0.json'],
    ['data/season1/effect-recipes.runtime.v0.14.0.json', 'runtime-source/data/season1/effect-recipes.runtime.v0.14.0.json'],
    ['data/season1/legality-map.runtime.v1.5.0.json', 'runtime-source/data/season1/legality-map.runtime.v1.5.0.json'],
    ['tutorial/data/season1/cards.runtime.v0.15.0.json', 'tutorial/runtime-source/data/season1/cards.runtime.v0.15.0.json'],
    ['tutorial/data/season1/effect-recipes.runtime.v0.14.0.json', 'tutorial/runtime-source/data/season1/effect-recipes.runtime.v0.14.0.json'],
    ['tutorial/data/season1/legality-map.runtime.v1.5.0.json', 'tutorial/runtime-source/data/season1/legality-map.runtime.v1.5.0.json']
  ];
  for (const [active, mirror] of pairs) {
    if (!fs.readFileSync(path.join(ROOT, active)).equals(fs.readFileSync(path.join(ROOT, mirror)))) {
      throw new Error(`Runtime-source mirror mismatch: ${mirror}`);
    }
  }
}

function buildFor(targetRoot) {
  const rootProfile = targetRoot === '.';
  const profile = rootProfile ? {
    runtimeData: 'cards.runtime.v0.15.0.json',
    recipes: 'effect-recipes.runtime.v0.14.0.json',
    hash: ROOT_HASH,
    sourceStack: 'v1.8.1', oneSource: 'v1.8.1', runtimeFoundation: 'v1.93', runtimeCore: 'v0.61',
    runtimeDataVersion: 'v0.15.0', recipeVersion: 'v0.14.0', checkpointVersion: 'v0.14.0', legalityVersion: 'v1.5.0', sharedManual: 'v1.49', appSync: 'v2.56',
    localAI: 'v6.33', deckBuilder: 'v1.30 (external; permissive save/export, match legality enforced by consumers)', date: '2026-09-13'
  } : {
    runtimeData: 'cards.runtime.v0.15.0.json',
    recipes: 'effect-recipes.runtime.v0.14.0.json',
    hash: TUTORIAL_HASH,
    sourceStack: 'v1.8.1', oneSource: 'v1.8.1', runtimeFoundation: 'v1.93', runtimeCore: 'v0.61',
    runtimeDataVersion: 'v0.15.0', recipeVersion: 'v0.14.0', checkpointVersion: 'v0.14.0', legalityVersion: 'v1.5.0', sharedManual: 'v1.49', appSync: 'v2.56',
    localAI: 'v6.33', deckBuilder: 'v1.30 (external; permissive save/export, match legality enforced by consumers)', date: '2026-09-13'
  };
  const dataPrefix = targetRoot === '.' ? 'data/season1' : `${targetRoot}/data/season1`;
  const runtimeData = readJSON(`${dataPrefix}/${profile.runtimeData}`);
  const recipes = readJSON(`${dataPrefix}/${profile.recipes}`);
  const preview = readJSON(`${dataPrefix}/card-preview.generated.v1.5.0.json`);
  const heroComponents = readJSON(`${dataPrefix}/hero-components.runtime.v1.0.0.json`);
  assertAuthority(runtimeData, recipes, preview, heroComponents, profile.hash);
  // Canonical JSON remains untouched; browser-facing generated data is terminology-normalized
  // so v2.5 Rulebook language is consistent throughout VS AI/Tutorial presentation.
  const publishedRuntimeData = normalizePlayerTerminology(runtimeData);
  const publishedRecipes = normalizePlayerTerminology(recipes);
  const publishedPreview = normalizePlayerTerminology(preview);
  const publishedHeroComponents = normalizePlayerTerminology(heroComponents);

  const sourceStack = {
    source_authority_stack_bundle: profile.sourceStack,
    runtime_foundation: profile.runtimeFoundation,
    runtime_data: profile.runtimeDataVersion,
    effect_checkpoint: profile.checkpointVersion,
    effect_recipe: profile.recipeVersion,
    legality_map: profile.legalityVersion,
    runtime_core: profile.runtimeCore,
    shared_manual: profile.sharedManual,
    local_ai: profile.localAI,
    tutorial: 'v0.59',
    pvp_railway: 'v3.40',
    deck_builder: profile.deckBuilder,
    starter60: 'v1.5',
    ui_lock: 'v2.51',
    application_runtime_sync: profile.appSync,
    rulebook_ai_game_flow: 'v2',
    card_visual_source: 'Season 1 v1.2.1 FINAL REVISED',
    one_source_authority: profile.oneSource,
    hero_component_authority: 'v1.0.0',
    canonical_registry_hash: profile.hash,
    hero_component_registry_hash: HERO_HASH,
    card_count: 200,
    product_positioning: 'RPG-Style TCG',
    resource_terminology: { deck: 'Shard Deck', standard_shard: 'Mana Shard', class_shard: 'Class Shard', pool: 'Shard Pool' },
    authority_mode: 'ONE_SOURCE_FAIL_CLOSED',
    generated_file: 'js/static-data.js',
    public_deck_builder: profile.deckBuilder,
    ui_design_lock: 'v2.51',
    one_source_patch: profile.oneSource,
    conditional_follow_up_schema: 'v1.0.0',
    response_commit_payment_framework:'v1.0', manual_reposition_limit:'v1.0'
  };
  const definitions = {
    version: profile.runtimeDataVersion,
    date: profile.date,
    status: 'AUTHORITATIVE_GENERATED_RUNTIME_DATA',
    ...publishedRuntimeData,
    families: publishedRuntimeData.cards.reduce((groups, card) => {
      const family = card.family || 'Unknown';
      if (!groups[family]) groups[family] = { cards: [] };
      groups[family].cards.push(card);
      return groups;
    }, {})
  };
  const effectRecipes = {
    version: profile.recipeVersion,
    date: profile.date,
    status: 'AUTHORITATIVE_GENERATED_EFFECT_RECIPES',
    ...publishedRecipes
  };
  const gate = {
    canonical_registry_hash: profile.hash,
    hero_component_registry_hash: HERO_HASH,
    card_count: 200,
    hero_component_counts: { racial_traits: 6, class_abilities: 16, hero_profiles: 10, hero_compositions: 30 },
    schema_version: '1.5.0',
    runtime_data: profile.runtimeDataVersion,
    effect_recipe: profile.recipeVersion,
    effect_checkpoint: profile.checkpointVersion,
    legality_map: profile.legalityVersion,
    source_patch: profile.oneSource,
    conditional_follow_up_schema: 'v1.0.0',
    response_commit_payment_framework:'v1.0', manual_reposition_limit:'v1.0'
  };

  const output = [
    "'use strict';",
    '(function(window){',
    assignment('GL_SOURCE_STACK', sourceStack),
    assignment('GRANDIS_LEGACY_RUNTIME_DATA', publishedRuntimeData),
    assignment('GRANDIS_LEGACY_CARD_PREVIEW', publishedPreview),
    assignment('GRANDIS_LEGACY_HERO_COMPONENTS', publishedHeroComponents),
    'window.GL_HERO_COMPONENTS=window.GRANDIS_LEGACY_HERO_COMPONENTS;',
    assignment('GL_CARD_DEFINITIONS', definitions),
    assignment('GL_EFFECT_RECIPES', effectRecipes),
    assignment('GL_ASSET_MANIFEST', createAssetManifest(publishedRuntimeData.cards, profile.hash)),
    assignment('GRANDIS_LEGACY_ONE_SOURCE_READY', gate),
    '})(typeof window!==\'undefined\'?window:globalThis);',
    ''
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, targetRoot, 'js/static-data.js'), output);
}

assertAuthorityMirrors();
buildFor('.');
buildFor('tutorial');
console.log('PASS: VS AI v6.33 + Tutorial v0.59 regenerated from Source Stack v1.8.1 / Playtest Lab v0.14 with Shard Deck + Shard Pool terminology and shared runtime/data parity.');
