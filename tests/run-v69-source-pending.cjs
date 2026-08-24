'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { loadLocalAI } = require('./vm-local-ai-harness.cjs');

const root = path.resolve(__dirname, '..');
const CARD_HASH = 'f5de57e66f0191522537b6e2b66539dd1c3c2a9737e59bac76c48044c38a21c1';
const HERO_HASH = '487aa2620b5be99480a81d462082f1a35ee637ec2cc38ebf42b1bcf1103d06c9';
const data = require(path.join(root, 'data/season1/cards.runtime.v0.14.0.json'));
const recipes = require(path.join(root, 'data/season1/effect-recipes.runtime.v0.13.0.json'));
const heroes = require(path.join(root, 'data/season1/hero-components.runtime.v1.0.0.json'));
const byId = new Map(data.cards.map(card => [card.card_id, card]));
const card = id => {
  const found = byId.get(id);
  assert.ok(found, `missing card ${id}`);
  return found;
};
const effect = (id, kind) => {
  const found = (card(id).effect || []).find(row => row.kind === kind);
  assert.ok(found, `${id} missing ${kind}`);
  return found;
};
const mana = (id, amount) => assert.strictEqual((card(id).canonical_cost || {}).mana, amount, `${id} Mana`);

assert.strictEqual(data.canonical_registry_hash, CARD_HASH);
assert.strictEqual(data.hero_component_registry_hash, HERO_HASH);
assert.strictEqual(heroes.registry_hash, HERO_HASH);
assert.strictEqual(data.cards.length, 198);
assert.strictEqual(new Set(data.cards.map(row => row.card_id)).size, 198);
assert.strictEqual(card('S1-THF-010').name, 'Back Slash');
assert.ok(!data.cards.some(row => row.name === 'Back Stab'), 'retired Back Stab title remains');

const changedIds = [
  'S1-ARC-011','S1-ARC-012','S1-ARC-014','S1-CLE-003','S1-CLE-011','S1-CLE-015','S1-CLE-022',
  'S1-CLE-H004','S1-CLE-H005','S1-CLE-H006','S1-ITM-005','S1-ITM-007','S1-ITM-012','S1-MAG-004',
  'S1-MAG-005','S1-MAG-012','S1-THF-011','S1-THF-015','S1-THF-021','S1-THF-022','S1-THF-H001',
  'S1-THF-H002','S1-THF-H003','S1-WAR-003','S1-WAR-011','S1-WAR-012','S1-WAR-022','S1-WAR-H004',
  'S1-WAR-H005','S1-WAR-H006'
];
assert.strictEqual(changedIds.length, 30);
changedIds.forEach(id => card(id));

mana('S1-ARC-011', 3);
assert.deepStrictEqual(effect('S1-ARC-012', 'block_damage').amount_by_class, { Archer: 50, Marksman: 60 });
assert.strictEqual(effect('S1-ARC-014', 'move_cards').count, 2);
assert.strictEqual(effect('S1-ARC-014', 'shuffle_deck').target, 'controller_main_deck');
assert.strictEqual(effect('S1-ARC-014', 'draw_cards').count, 1);
mana('S1-CLE-003', 4);
assert.match(card('S1-CLE-003').timing.phase, /non-Casting non-Ultimate/);
assert.strictEqual(effect('S1-CLE-003', 'discard_attack_card').destination, 'discard_pile');
assert.strictEqual(effect('S1-CLE-011', 'block_damage').amount, 60);
mana('S1-CLE-015', 3);
assert.strictEqual(effect('S1-CLE-015', 'revive').set_hp, 50);
assert.deepStrictEqual(effect('S1-CLE-015', 'revive').revived_exhausted_by_class, { Priest: true, Saint: false });
const resurrectionText = JSON.stringify(card('S1-CLE-015'));
assert.ok(!resurrectionText.includes('40 HP') && !resurrectionText.includes('Set HP to 40'), 'Resurrection retains stale 40 HP metadata');
assert.strictEqual(effect('S1-CLE-022', 'block_damage').amount, 30);
for (const id of ['S1-CLE-H004','S1-CLE-H005','S1-CLE-H006']) assert.strictEqual(card(id).racial_ability.action.effect.set_hp, 30);
assert.strictEqual(effect('S1-ITM-005', 'gain_mana').amount, 2);
assert.strictEqual(effect('S1-ITM-007', 'block_damage').amount, 30);
const hookCost = card('S1-ITM-012').canonical_cost.additional_costs[0];
assert.deepStrictEqual({ kind: hookCost.kind, count: hookCost.count, exclude_self: hookCost.exclude_self }, { kind: 'discard_from_hand', count: 1, exclude_self: true });
assert.strictEqual(effect('S1-MAG-004', 'block_damage').amount, 60);
mana('S1-MAG-005', 4);
assert.strictEqual(effect('S1-MAG-012', 'block_damage').amount, 70);
assert.strictEqual(effect('S1-MAG-012', 'inflict_status').duration_turns, 2);
mana('S1-THF-011', 2);
mana('S1-THF-015', 4);
assert.deepStrictEqual(effect('S1-THF-021', 'block_damage').amount_by_class, { Thief: 70, 'Spell Blade': 80, 'Arcane Duelist': 80 });
mana('S1-THF-022', 3);
for (const id of ['S1-THF-H001','S1-THF-H002','S1-THF-H003']) {
  assert.strictEqual(card(id).racial_ability.action.action_key, 'second_chance');
  assert.strictEqual(card(id).racial_ability.action.effect.dodge_incoming_damage, true);
}
assert.strictEqual(effect('S1-WAR-003', 'block_damage').amount, 50);
mana('S1-WAR-011', 3);
assert.deepStrictEqual(effect('S1-WAR-012', 'block_damage').amount_by_class, { Warrior: 50, Gladiator: 50 });
assert.strictEqual(effect('S1-WAR-012', 'conditional_retaliation_damage').amount, 10);
assert.deepStrictEqual(effect('S1-WAR-022', 'block_damage').amount_by_class, { Warrior: 60, Paladin: 60 });
assert.ok(effect('S1-WAR-022', 'damage_immunity'));
for (const id of ['S1-WAR-H004','S1-WAR-H005','S1-WAR-H006']) assert.strictEqual(card(id).racial_ability.action.effect.block_damage, 50);

assert.deepStrictEqual(
  [heroes.racial_traits.length, heroes.class_abilities.length, heroes.hero_profiles.length, heroes.hero_compositions.length],
  [6, 16, 10, 30]
);
const racialById = new Map(heroes.racial_traits.map(row => [row.racial_trait_id, row]));
const abilityById = new Map(heroes.class_abilities.map(row => [row.class_ability_id, row]));
for (const composition of heroes.hero_compositions) {
  const heroCard = card(composition.card_id);
  const racial = racialById.get(composition.racial_trait_ref);
  assert.ok(racial, `${composition.card_id} missing racial authority`);
  assert.deepStrictEqual(heroCard.racial_ability, racial.definition, `${composition.card_id} racial cache divergence`);
  if (composition.class_ability_ref) {
    const ability = abilityById.get(composition.class_ability_ref);
    assert.ok(ability, `${composition.card_id} missing class authority`);
    assert.deepStrictEqual(heroCard.class_ability, ability.definition, `${composition.card_id} class cache divergence`);
  }
}
const profileByName = new Map(heroes.hero_profiles.map(row => [row.name, row]));
const elfRefs = ['Elara Heavens','Vaelis Stormweave','Lucien Voss'].map(name => profileByName.get(name).racial_trait_ref);
assert.strictEqual(new Set(elfRefs).size, 1, 'Elf heroes do not share one racial authority');
const classRefs = name => profileByName.get(name).rank_cards.slice(1).map(row => row.class_ability_ref);
assert.deepStrictEqual(classRefs('Vaelis Stormweave'), classRefs('Aldric Ashford'), 'Vaelis/Aldric class authorities diverge');

for (const appRoot of [root, path.join(root, 'tutorial')]) {
  const ctx = loadLocalAI(appRoot);
  const result = ctx.GL_LOCAL_AI_BRIDGE.testV69SourcePendingAudit();
  assert.ok(result && result.ok, `${path.basename(appRoot)} v6.11 source/pending audit failed: ${JSON.stringify(result)}`);
  assert.strictEqual(result.endPhaseScenarios, 8);
  const source = fs.readFileSync(path.join(appRoot, 'js/app.bundle.js'), 'utf8');
  for (const retired of ['racial_second_chance','second_chance_replay','maybeOpenHalflingSecondChance']) assert.ok(!source.includes(retired), `${retired} remains in ${appRoot}`);
  const reducer = fs.readFileSync(path.join(appRoot, 'runtime-source/runtime/core/reducer.js'), 'utf8');
  for (const retired of ['second_chance_replay','SECOND_CHANCE_REPLAY_OPENED','openSecondChanceChoiceAfterDodge']) assert.ok(!reducer.includes(retired), `${retired} remains in ${appRoot} reducer`);
}
assert.strictEqual(
  fs.readFileSync(path.join(root, 'runtime-source/runtime/core/reducer.js'), 'utf8'),
  fs.readFileSync(path.join(root, 'tutorial/runtime-source/runtime/core/reducer.js'), 'utf8'),
  'Tutorial reducer differs from the VS AI v6.11 canonical reducer'
);

for (const appRoot of [root, path.join(root, 'tutorial')]) {
  const starterRoot = path.join(appRoot, 'starter_deck_examples');
  for (const name of fs.readdirSync(starterRoot).filter(file => file.endsWith('.json'))) {
    const content = fs.readFileSync(path.join(starterRoot, name), 'utf8');
    assert.ok(!content.includes('Back Stab'), `${name}: retired card name remains`);
    assert.ok(!content.includes('One Source Authority v1.4'), `${name}: stale OSA metadata remains`);
    assert.ok(!content.includes('Starter60 v1.2'), `${name}: stale Starter60 metadata remains`);
    const parsed = JSON.parse(content);
    const deckRows = parsed.decks ? Object.values(parsed.decks).map(row => row.deck || row) : [parsed];
    for (const deckRow of deckRows) {
      for (const field of ['main_deck','main_deck_expanded','legacy_deck_expanded','side_deck_expanded']) {
        for (const entry of deckRow[field] || []) {
          const sourceCard = byId.get(entry.card_id);
          if (sourceCard && entry.card_name) assert.strictEqual(entry.card_name, sourceCard.name, `${name}: ${entry.card_id} name mismatch`);
        }
      }
    }
  }
}

const authorityMirrors = [
  ['data/season1/cards.runtime.v0.14.0.json','runtime-source/data/season1/cards.runtime.v0.14.0.json'],
  ['data/season1/effect-recipes.runtime.v0.13.0.json','runtime-source/data/season1/effect-recipes.runtime.v0.13.0.json'],
  ['data/season1/legality-map.runtime.v0.11.9.json','runtime-source/data/season1/legality-map.runtime.v0.11.9.json'],
  ['tutorial/data/season1/cards.runtime.v0.14.0.json','tutorial/runtime-source/data/season1/cards.runtime.v0.14.0.json'],
  ['tutorial/data/season1/effect-recipes.runtime.v0.13.0.json','tutorial/runtime-source/data/season1/effect-recipes.runtime.v0.13.0.json'],
  ['tutorial/data/season1/legality-map.runtime.v0.11.9.json','tutorial/runtime-source/data/season1/legality-map.runtime.v0.11.9.json']
];
for (const [current, mirror] of authorityMirrors) {
  assert.deepStrictEqual(
    JSON.parse(fs.readFileSync(path.join(root, mirror), 'utf8')),
    JSON.parse(fs.readFileSync(path.join(root, current), 'utf8')),
    `${mirror}: runtime-source mirror diverges from current authority`
  );
}

const { submitIntent } = require(path.join(root, 'runtime-source/runtime/core/reducer.js'));
const reducerSource = fs.readFileSync(path.join(root, 'runtime-source/runtime/core/reducer.js'), 'utf8');
for (const retired of ['second_chance_replay','SECOND_CHANCE_REPLAY_OPENED','openSecondChanceChoiceAfterDodge']) {
  assert.ok(!reducerSource.includes(retired), `${retired} remains in the canonical VS AI reducer`);
}
const cardsById = Object.fromEntries(data.cards.map(row => [row.card_id, row]));
const deck = hero => ({
  starting_hero_ids: ['Left','Center','Right'].map(slot => ({ slot, card_id: hero })),
  main_deck_card_counts: { 'S1-EVT-001': 12, 'S1-THF-003': 1, 'S1-WAR-001': 2 },
  legacy_deck_card_ids: []
});
let started = submitIntent(null, { type: 'START_GAME', player_id: 'PLAYER', payload: { player_id: 'PLAYER', opponent_id: 'AI', player_deck: deck('S1-WAR-H001'), opponent_deck: deck('S1-WAR-H001'), runtime_data: { cards_by_id: cardsById, effect_recipes: recipes } } });
assert.deepStrictEqual(started.errors || [], []);
const firstTurn = started.state;
firstTurn.phase = 'Battle';
firstTurn.round = 1;
firstTurn.active_player_id = 'PLAYER';
firstTurn.first_player_id = 'PLAYER';
firstTurn.players.PLAYER.hand = ['S1-WAR-001'];
firstTurn.players.PLAYER.mana_pool = 99;
const rejected = submitIntent(firstTurn, { type: 'PLAY_CARD', player_id: 'PLAYER', card_id: 'S1-WAR-001' });
assert.ok((rejected.errors || []).some(message => /First player cannot play Attack Skill Cards/i.test(message)), 'core reducer did not reject first-player turn-1 Attack');

console.log('PASS VS AI v6.11 + Tutorial v0.42: 30 revised IDs, Hero Components, non-trivial effects, Magic Scope, pending watchdogs, and core turn-1 Attack guard.');
