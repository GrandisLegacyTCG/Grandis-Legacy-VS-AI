'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HASH = 'f5de57e66f0191522537b6e2b66539dd1c3c2a9737e59bac76c48044c38a21c1';
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
    ['data/season1/cards.runtime.v0.14.0.json', 'runtime-source/data/season1/cards.runtime.v0.14.0.json'],
    ['data/season1/effect-recipes.runtime.v0.13.0.json', 'runtime-source/data/season1/effect-recipes.runtime.v0.13.0.json'],
    ['data/season1/legality-map.runtime.v0.11.9.json', 'runtime-source/data/season1/legality-map.runtime.v0.11.9.json'],
    ['tutorial/data/season1/cards.runtime.v0.14.0.json', 'tutorial/runtime-source/data/season1/cards.runtime.v0.14.0.json'],
    ['tutorial/data/season1/effect-recipes.runtime.v0.13.0.json', 'tutorial/runtime-source/data/season1/effect-recipes.runtime.v0.13.0.json'],
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
  const runtimeData = readJSON(`${dataPrefix}/cards.runtime.v0.14.0.json`);
  const recipes = readJSON(`${dataPrefix}/effect-recipes.runtime.v0.13.0.json`);
  const preview = readJSON(`${dataPrefix}/card-preview.generated.v1.5.0.json`);
  const heroComponents = readJSON(`${dataPrefix}/hero-components.runtime.v1.0.0.json`);
  assertAuthority(runtimeData, recipes, preview, heroComponents);

  const sourceStack = {
    source_authority_stack_bundle: 'v1.7.0',
    runtime_foundation: 'v1.86',
    runtime_data: 'v0.14.0',
    effect_checkpoint: 'v0.13.0',
    effect_recipe: 'v0.13.0',
    legality_map: 'v0.11.9',
    runtime_core: 'v0.54',
    shared_manual: 'v1.42',
    local_ai: 'v6.11',
    pvp_railway: 'v3.09',
    deck_builder: 'v1.19 (external; verified complete and untouched)',
    starter60: 'v1.3',
    ui_lock: 'v2.48',
    application_runtime_sync: 'v2.48',
    rulebook_ai_game_flow: 'v2',
    card_visual_source: 'Season 1 v1.2 FINAL REVISED',
    one_source_authority: 'v1.7.0',
    hero_component_authority: 'v1.0.0',
    canonical_registry_hash: HASH,
    hero_component_registry_hash: HERO_HASH,
    card_count: 198,
    authority_mode: 'ONE_SOURCE_FAIL_CLOSED',
    generated_file: 'js/static-data.js',
    public_deck_builder: 'v1.19 (external; verified complete and untouched)',
    ui_design_lock: 'v2.48',
    one_source_patch: 'v1.7.0',
    conditional_follow_up_schema: 'v1.0.0'
  };
  const definitions = {
    version: 'v0.14.0',
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
    version: 'v0.13.0',
    date: '2026-08-24',
    status: 'AUTHORITATIVE_GENERATED_EFFECT_RECIPES',
    ...recipes
  };
  const gate = {
    canonical_registry_hash: HASH,
    hero_component_registry_hash: HERO_HASH,
    card_count: 198,
    hero_component_counts: { racial_traits: 6, class_abilities: 16, hero_profiles: 10, hero_compositions: 30 },
    schema_version: '1.5.0',
    runtime_data: 'v0.14.0',
    effect_recipe: 'v0.13.0',
    effect_checkpoint: 'v0.13.0',
    legality_map: 'v0.11.9',
    source_patch: 'v1.7.0',
    conditional_follow_up_schema: 'v1.0.0'
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
