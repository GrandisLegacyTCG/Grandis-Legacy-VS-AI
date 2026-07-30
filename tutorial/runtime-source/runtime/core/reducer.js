'use strict';

const { PHASES } = require('./constants');
const { EVENT_TYPES, createRuntimeEvent, appendEvents } = require('./event-log');
const { createCastingAttack, addDrawCounter, resolveCastingAttack } = require('../engines/casting-engine');
const { repositionSlots } = require('../effects/recipe-bucket-engine');
const { dispatchEffectRecipe } = require('../effects/recipe-dispatcher');
const { validateReactionAgainstIncoming, handManipulationPolicyForCard, isOpponentHandBackSelectionCard } = require('./source-sync-rules');
const swapPolicy = require('./swap-reposition-policy');
const positioningPolicy = require('./positioning-policy');
const responseEngine = require('../engines/response-engine');
const { TICK_PHASE, tickAttachment } = require('../engines/attachment-engine');
const attachmentLifecycle = require('./attachment-lifecycle-policy');

const MINIMAL_REDUCER_INTENTS = Object.freeze([
  'START_GAME',
  'PLAY_CARD',
  'SELECT_SOURCE',
  'SELECT_TARGET_SLOT',
  'SELECT_STATUS_TO_REMOVE',
  'SELECT_SCOUTING_EXP_CARD',
  'SELECT_OPPONENT_HAND_CARD',
  'SELECT_RESPONSE_COST_CARD',
  'CONFIRM_ACTION',
  'DECLARE_RESPONSE',
  'CONFIRM_RESPONSE',
  'PASS_RESPONSE_PRIORITY',
  'RESOLVE_PENDING',
  'REPOSITION',
  'NEXT_PHASE',
  'SURRENDER',
  'USE_RACIAL_TRAIT',
  'USE_ABILITY',
  'CONFIRM_DRAW_REPLACEMENT',
  'CONFIRM_TRIGGERED_RACIAL',
  'SELECT_LEGACY_CARD',
  'CONFIRM_LEGACY_CHOICE',
  'SELECT_LEGACY_COST_CARD',
  'CONFIRM_LEGACY_COST',
  'SELECT_LEGACY_EFFECT_CARD',
  'CONFIRM_LEGACY_EFFECT',
  'SELECT_REPOSITION_TARGET',
  'SKIP_REPOSITION'
]);

const PHASE_ORDER = Object.freeze([PHASES.DRAW, PHASES.DEPLOY, PHASES.BATTLE, PHASES.REFORM, PHASES.END]);
const SLOT_ORDER = Object.freeze(['Left', 'Center', 'Right']);

function deepClone(value) { return JSON.parse(JSON.stringify(value)); }

function expandCounts(counts) {
  const cards = [];
  for (const [cardId, copies] of Object.entries(counts || {}).sort(([a], [b]) => a.localeCompare(b))) {
    for (let i = 0; i < Number(copies || 0); i += 1) cards.push(cardId);
  }
  return cards;
}

function normalizeSlotKey(slot) {
  const value = String(slot || '').toLowerCase();
  if (value === 'left') return 'Left';
  if (value === 'center' || value === 'centre') return 'Center';
  if (value === 'right') return 'Right';
  return slot;
}

function buildHero(cardId, moduleId) {
  return {
    card_id: cardId,
    module_id: moduleId || '',
    hp: 100,
    max_hp: 100,
    defeated: false,
    exhausted: false,
    statuses: [],
    attachments: []
  };
}

function buildPlayer(playerId, deck) {
  const safeDeck = deck || {};
  const starting = Array.isArray(safeDeck.starting_hero_ids) ? safeDeck.starting_hero_ids : [];
  const board = {};
  for (const slot of SLOT_ORDER) {
    const heroRecord = starting.find(entry => normalizeSlotKey(entry.slot) === slot) || {};
    board[slot] = {
      slot,
      slot_mode: heroRecord.card_id ? 'HERO' : 'EMPTY',
      hero: heroRecord.card_id ? buildHero(heroRecord.card_id, heroRecord.module_id) : null
    };
  }
  return {
    player_id: playerId,
    deck_id: safeDeck.deck_id || `${playerId}-deck`,
    deck_name: safeDeck.deck_name || `${playerId} Deck`,
    board,
    used_hero_ids: starting.map(entry => entry.card_id).filter(Boolean),
    main_deck_card_counts: safeDeck.main_deck_card_counts || {},
    main_deck: expandCounts(safeDeck.main_deck_card_counts || {}),
    hand: [],
    discard_pile: [],
    legacy_deck: Array.isArray(safeDeck.legacy_deck_card_ids) ? safeDeck.legacy_deck_card_ids.slice() : [],
    mana_pool: 0,
    mana_regen: 1,
    attachments: [],
    active_modifiers: [],
    racial_token_pool: 0,
    racial_token_max: 2,
    racial_token_spent_turn: null,
    turn_stats: { cards_drawn_this_turn: 0 }
  };
}

function createInitialRuntimeState(config) {
  const safeConfig = config || {};
  const playerId = safeConfig.player_id || 'PLAYER';
  const opponentId = safeConfig.opponent_id || 'AI';
  const players = {};
  players[playerId] = buildPlayer(playerId, safeConfig.player_deck || safeConfig.decks && safeConfig.decks[0]);
  players[opponentId] = buildPlayer(opponentId, safeConfig.opponent_deck || safeConfig.decks && safeConfig.decks[1]);
  return {
    game_id: safeConfig.game_id || `gl-${Date.now()}`,
    version: 'runtime-reducer-v1.64',
    runtime_data: safeConfig.runtime_data || {},
    round: 1,
    active_player_id: playerId,
    player_order: [playerId, opponentId],
    phase: PHASES.DRAW,
    players,
    pending: null,
    pending_legacy_defeat_queue: [],
    pending_response: null,
    pending_counter_response: null,
    response_window: null,
    response_window_queue: [],
    response_stack: [],
    response_priority_player_id: null,
    response_current_target: null,
    response_results_by_target: {},
    continuation_queue: [],
    pending_attack_resolution: null,
    game_over: false,
    winner_id: null,
    lose_reason: null,
    event_log: []
  };
}

function getOpponentId(state, playerId) {
  return (state.player_order || []).find(id => id !== playerId) || null;
}

function getPlayer(state, playerId) { return state.players && state.players[playerId]; }

function ensureTurnStats(player) {
  if (!player.turn_stats) player.turn_stats = {};
  if (player.turn_stats.cards_drawn_this_turn === undefined) player.turn_stats.cards_drawn_this_turn = 0;
  return player.turn_stats;
}

function recordCardsDrawn(player, count) {
  const amount = Number(count || 0);
  if (!player || amount <= 0) return;
  const stats = ensureTurnStats(player);
  stats.cards_drawn_this_turn = Number(stats.cards_drawn_this_turn || 0) + amount;
}

function resetTurnStatsForPlayer(state, playerId) {
  const player = getPlayer(state, playerId);
  if (player) player.turn_stats = { cards_drawn_this_turn: 0 };
}


function runtimeTurnStamp(state) {
  return `${Number(state && state.round || 1)}:${state && state.active_player_id || ''}:${state && state.phase || ''}`;
}

function heroCardForState(state, hero) {
  return hero && hero.card_id ? getCard(state, hero.card_id) : null;
}

function heroDisplayClassFromState(state, hero) {
  const card = heroCardForState(state, hero);
  return String((card && (card.display_class || card.class_name || card.class || card.card_subtype || card.identity && (card.identity.display_class || card.identity.class))) || hero && (hero.display_class || hero.class_name || hero.class) || '');
}

function drawReplacementAbilityForHero(state, hero) {
  const displayClass = heroDisplayClassFromState(state, hero);
  if (/Grand Arbalest/i.test(displayClass)) return { ability_id: 'rapid_chamber', ability_name: 'Rapid Chamber' };
  if (/Arbalest/i.test(displayClass)) return { ability_id: 'quick_reload', ability_name: 'Quick Reload' };
  return null;
}

function drawReplacementSourceForSide(state, playerId) {
  if (!state || state.phase !== PHASES.DRAW) return null;
  const player = getPlayer(state, playerId);
  if (!player || !player.board) return null;
  const stamp = runtimeTurnStamp(state);
  for (const slot of SLOT_ORDER) {
    const slotState = player.board[slot];
    const hero = slotState && slotState.slot_mode === 'HERO' && slotState.hero && !slotState.hero.defeated ? slotState.hero : null;
    const ability = drawReplacementAbilityForHero(state, hero);
    if (!hero || !ability) continue;
    if (hero.draw_replacement_used_turn === stamp) continue;
    return { slot, hero, ability };
  }
  return null;
}

function maybeOpenDrawReplacementChoice(state, playerId, drawnCardId, handIndex) {
  if (!state || state.pending || state.game_over || state.phase !== PHASES.DRAW || state.active_player_id !== playerId) return false;
  const source = drawReplacementSourceForSide(state, playerId);
  if (!source) return false;
  state.pending = {
    type: 'draw_replacement_choice',
    player_id: playerId,
    decision_player_id: playerId,
    source_slot: source.slot,
    source_hero_card_id: source.hero.card_id,
    ability_id: source.ability.ability_id,
    ability_name: source.ability.ability_name,
    drawn_card_id: drawnCardId,
    hand_index: handIndex
  };
  return true;
}

function shuffleInPlace(list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = list[i];
    list[i] = list[j];
    list[j] = t;
  }
  return list;
}

function updatePlayer(state, playerId, updater) {
  const next = deepClone(state);
  next.players[playerId] = updater(next.players[playerId]);
  return next;
}

function normalizeRuntimeCards(runtimeData) {
  const safe = runtimeData || {};
  if (safe.cards_by_id) return safe.cards_by_id;
  if (safe.cardsById) return safe.cardsById;
  if (Array.isArray(safe.cards)) return Object.fromEntries(safe.cards.map(card => [card.card_id || card.cardId, card]));
  return {};
}

function getCard(state, cardId) {
  return normalizeRuntimeCards(state && state.runtime_data)[cardId] || null;
}

// Printed wording is display-only for canonical One Source records. Runtime rules
// must come from structured legality/execution fields. Text parsing remains only
// as a compatibility fallback for non-canonical historical fixtures.
function isCanonicalRuntimeCard(card) {
  return Boolean(card && card.canonical_hash && (card.canonical_execution || card.canonical_legality));
}

function legacyRuleText(card) {
  if (!card || isCanonicalRuntimeCard(card)) return '';
  return String(card.effect_text || card.card_text || '');
}

function canonicalExecution(card) {
  return card && (card.canonical_execution || card.execution) || {};
}

function canonicalLegality(card) {
  return card && (card.canonical_legality || card.legality) || {};
}

function structuredEffects(card) {
  const execution = canonicalExecution(card);
  if (Array.isArray(execution.effects)) return execution.effects;
  if (Array.isArray(card && card.effects)) return card.effects;
  if (Array.isArray(card && card.effect)) return card.effect;
  return [];
}

function splitList(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value === null || value === undefined || value === '') return [];
  return String(value).split(/[;,]/).map(part => part.trim()).filter(Boolean);
}

function asBoolean(value) {
  if (value === true) return true;
  if (value === false || value === null || value === undefined || value === '') return false;
  const lower = String(value).toLowerCase();
  return lower === 'true' || lower === 'yes' || lower === '1';
}

function cardCost(card, state, playerId, sourceSlot) {
  const canonicalCost = card && (card.canonical_cost || canonicalLegality(card).cost);
  const compatibilityCost = card && card.cost;
  const cost = canonicalCost && typeof canonicalCost === 'object' ? canonicalCost : (compatibilityCost && typeof compatibilityCost === 'object' ? compatibilityCost : null);
  let resolved = 0;
  if (cost && cost.kind === 'fixed') resolved = Number(cost.mana || 0);
  else if (cost && cost.kind === 'none') resolved = 0;
  else if (cost && cost.kind === 'by_class') {
    const table = cost.mana_by_class || {};
    const player = state && playerId ? getPlayer(state, playerId) : null;
    const slot = normalizeSlotKey(sourceSlot);
    const hero = player && player.board && player.board[slot] && player.board[slot].hero;
    const cls = state && hero ? heroDisplayClassFromState(state, hero) : '';
    const exact = Object.entries(table).find(([name]) => String(name).toLowerCase() === String(cls).toLowerCase());
    if (exact) resolved = Number(exact[1] || 0);
    else {
      const legalNames = hero && state ? heroLegalClassNames(state, hero.card_id) : new Set();
      const lineageMatch = Object.entries(table).find(([name]) => legalNames.has(String(name).toLowerCase()));
      resolved = lineageMatch ? Number(lineageMatch[1] || 0) : Infinity;
    }
  } else if (cost && cost.kind === 'formula') resolved = Number(cost.base_mana || cost.base_mana_cost || 0);
  else if (cost && cost.kind === 'fixed_plus_spend_all') resolved = Number(cost.mana || 0);
  else {
    const nestedCost = compatibilityCost && typeof compatibilityCost === 'object' ? compatibilityCost.mana : undefined;
    const value = card && (typeof card.cost_mana === 'number' ? card.cost_mana : (card.mana_cost !== undefined ? card.mana_cost : (nestedCost !== undefined ? nestedCost : card.cost)));
    resolved = (value === null || value === undefined || value === '') ? 0 : (Number(value) || 0);
    if (card && state && playerId && sourceSlot) {
      const player = getPlayer(state, playerId);
      const slot = normalizeSlotKey(sourceSlot);
      const hero = player && player.board && player.board[slot] && player.board[slot].hero;
      const cls = heroDisplayClassFromState(state, hero);
      const byClass = compatibilityCost && compatibilityCost.mana_by_class;
      if (byClass && byClass[cls] !== undefined) resolved = Number(byClass[cls]) || 0;
    }
  }
  const formula = cost && (cost.formula || cost.kind === 'formula' && cost.formula);
  if ((formula === 'mana_cost_multiplied_by_opponent_mana_regen' || card && card.card_id === 'S1-MAG-025') && state && playerId) {
    const opponentId = getOpponentId(state, playerId);
    const opponent = opponentId && getPlayer(state, opponentId);
    const multiplier = Math.max(0, Number(opponent && opponent.mana_regen || 0));
    return resolved * multiplier;
  }
  return resolved;
}

function cardTimings(card) {
  const explicit = card && (card.phase_timing || card.phaseTiming);
  const fromExplicit = splitList(explicit).map(item => item.replace(/ Phase$/i, ''));
  if (fromExplicit.length) return fromExplicit;
  const timingValue = card && card.timing && typeof card.timing === 'object' ? (card.timing.phase || card.timing.raw_phase || '') : (card && card.timing || '');
  const timing = String(timingValue || '');
  const timings = [];
  if (/draw/i.test(timing)) timings.push(PHASES.DRAW);
  if (/deploy/i.test(timing)) timings.push(PHASES.DEPLOY);
  if (/battle/i.test(timing)) timings.push(PHASES.BATTLE);
  if (/reform/i.test(timing)) timings.push(PHASES.REFORM);
  if (/end/i.test(timing)) timings.push(PHASES.END);
  if (/response|damage would be dealt/i.test(timing)) timings.push('Response');
  return timings;
}

function cardTags(card) {
  return new Set(splitList(card && card.runtime_tags).map(tag => tag.toUpperCase()));
}

function selectedTargetIsItemUserAndHost(card) {
  if (!card) return false;
  const requirement = card.requirement || card.source_requirement || canonicalLegality(card).requirement || canonicalLegality(card).source_requirement || {};
  return requirement.selected_target_is_item_user_and_host === true
    || requirement.normal_item_does_not_require_source_hero === true;
}

function cardSourceRequired(card) {
  if (!card) return false;
  if (selectedTargetIsItemUserAndHost(card)) return false;
  if (['S1-ITM-015','S1-EVT-005','S1-EVT-011'].includes(card.card_id)) return true;
  if (card.source_required !== undefined) return asBoolean(card.source_required);
  return String(card.card_family || card.card_type || '').toLowerCase() === 'skill';
}

const V119_TARGETLESS_EXECUTABLE_CARDS = new Set([
  'S1-ARC-004', 'S1-ARC-013', 'S1-EVT-008', 'S1-ITM-006', 'S1-ITM-009', 'S1-ITM-018', 'S1-MAG-013', 'S1-THF-006', 'S1-THF-012', 'S1-THF-018'
]);

function cardTargetRequired(card) {
  if (!card) return false;
  if (selectedTargetIsItemUserAndHost(card)) return true;
  if (['S1-ITM-003','S1-ITM-010','S1-ITM-011','S1-ITM-013','S1-ITM-014'].includes(card.card_id)) return true;
  if (V119_TARGETLESS_EXECUTABLE_CARDS.has(card.card_id)) return false;
  if (card.card_id === 'S1-THF-027' || card.card_id === 'S1-THF-028') return false;
  if (card.card_id === 'S1-ARC-017') return true;
  const subtype = String(card.card_subtype || card.classification || card.action_category || '').toLowerCase();
  if (/area attack|area damage/.test(subtype)) return false;
  if (card.targeting && card.targeting.no_target_picker === true) return false;
  if (card.target_required !== undefined) return asBoolean(card.target_required);
  if (isReviveCard(card)) return true;
  if (isHealAllCard(card) || isOpponentHandBackSelectionCard(card)) return false;
  if (isHealingCard(card) || isPurifyCard(card)) return true;
  return /attack/.test(subtype) && !/area/.test(subtype);
}

function isReviveCard(card) {
  const tags = cardTags(card);
  const effects = structuredEffects(card);
  return tags.has('REVIVE')
    || effects.some(effect => /^(revive|revive_hero|revive_defeated_hero)$/i.test(String(effect && effect.kind || '')))
    || /\bRevive\b|\bResurrection\b|revive\s+1\s+fallen\s+hero/i.test(legacyRuleText(card));
}

function reviveHpForCard(card) {
  for (const effect of structuredEffects(card)) {
    if (!/revive/i.test(String(effect && effect.kind || ''))) continue;
    const amount = effect.set_hp !== undefined ? effect.set_hp : (effect.amount !== undefined ? effect.amount : effect.raw_value);
    if (Number(amount) > 0) return Number(amount);
  }
  const text = legacyRuleText(card);
  const hpMatch = text.match(/(?:with|becomes)\s+(\d+)\s*HP/i);
  if (hpMatch) return Number(hpMatch[1]) || 10;
  return 10;
}

function reviveProfileForCard(state, pending, card) {
  const sourceClass = String(primarySourceClassName(state, pending) || '').toLowerCase();
  const execution = canonicalExecution(card);
  const policy = execution.revive_policy || execution.revive || {};
  const effect = structuredEffects(card).find(item => item && /^revive$/i.test(String(item.kind || ''))) || {};
  const hpMap = policy.set_hp_by_class || effect.set_hp_by_class || {};
  const exhaustMap = policy.revived_exhausted_by_class || effect.revived_exhausted_by_class || {};
  let hp = Number(policy.set_hp || effect.set_hp || effect.amount || reviveHpForCard(card) || 0);
  let exhausted = Boolean(policy.revived_exhausted === true || effect.revived_exhausted === true);
  for (const [className, value] of Object.entries(hpMap)) if (String(className).toLowerCase() === sourceClass) hp = Number(value || 0);
  for (const [className, value] of Object.entries(exhaustMap)) if (String(className).toLowerCase() === sourceClass) exhausted = value === true;
  if (!Number.isFinite(hp) || hp <= 0) return { ok: false, errors: ['Revive HP profile is missing for the active source Class.'], source_class: sourceClass };
  return { ok: true, hp, exhausted, source_class: sourceClass };
}

function isDefenseResponseCard(card) {
  const role = `${card && card.classification || ''} ${card && card.action_category || ''} ${card && card.card_subtype || ''}`.toLowerCase();
  const timing = typeof (card && card.timing) === 'object' ? `${card.timing.phase || ''} ${card.timing.raw_phase || ''}` : String(card && card.timing || '');
  return role.includes('defense skill') || /response window|def response|defense skill/i.test(timing);
}

function cardDoesNotExhaustOnUse(card) {
  const tags = cardTags(card);
  const effects = structuredEffects(card);
  const text = legacyRuleText(card);
  const structuredNoExhaust = effects.some(effect => effect && (effect.kind === 'no_source_exhaust' || effect.does_not_exhaust_user === true || effect.payload && effect.payload.does_not_exhaust_user === true));
  return isDefenseResponseCard(card) || structuredNoExhaust || tags.has('NO_EXHAUST') || tags.has('NO_EXHAUST_FOR_ULTIMATE') || /does not exhaust|will not exhaust/i.test(text);
}

function cardUsableWhileExhausted(card) {
  const tags = cardTags(card);
  const text = legacyRuleText(card);
  return isDefenseResponseCard(card) || tags.has('USABLE_WHILE_EXHAUSTED') || /while exhausted/i.test(text);
}

function heroClass(state, heroCardId) {
  const heroCard = getCard(state, heroCardId) || {};
  const identity = heroCard.identity || {};
  return heroCard.display_class || heroCard.class || identity.display_class || identity.class || '';
}

function heroCardRecordForSlot(state, playerId, slotRaw) {
  const player = getPlayer(state, playerId);
  const slot = normalizeSlotKey(slotRaw);
  const slotState = player && player.board && player.board[slot];
  const heroId = slotState && slotState.slot_mode === 'HERO' && slotState.hero && !slotState.hero.defeated ? slotState.hero.card_id : null;
  return heroId ? getCard(state, heroId) : null;
}

function sourceHeroCardForPending(state, pending) {
  return pending && pending.source_slot ? heroCardRecordForSlot(state, pending.player_id, pending.source_slot) : null;
}

function heroLegalClassNames(state, heroCardId) {
  const heroCard = getCard(state, heroCardId) || {};
  const identity = heroCard.identity || {};
  const names = new Set();
  const add = value => splitList(value).forEach(v => names.add(String(v).toLowerCase()));
  add(heroCard.display_class || heroCard.class || '');
  add(identity.display_class || identity.class || '');
  add(identity.base_class_family || identity.rank_i_base_class || '');
  add(identity.active_class_lineage || '');
  add(identity.evolution_path || '');
  add(identity.base_skill_classes || '');
  add(identity.compatible_skills || '');
  add(heroCard.class_family || heroCard.base_class_family || '');
  add(heroCard.active_class_lineage || '');
  add(heroCard.evolution_path || '');
  add(heroCard.compatible_skills || '');
  add(heroCard.base_skill_classes || '');
  add(heroCard.legal_active_classes || '');
  add(heroCard.class_ability_classes || '');
  const text = legacyRuleText(heroCard);
  if (/both Archer and Thief Rank I Skill/i.test(text)) { names.add('archer'); names.add('thief'); }
  if (/both Thief and Mage Rank I Skill/i.test(text)) { names.add('thief'); names.add('mage'); }
  if (/both Thief and Mage Rank II Skill/i.test(text)) { names.add('thief'); names.add('mage'); names.add('spell blade'); }
  if (/both Warrior and Cleric Rank I Skill/i.test(text)) { names.add('warrior'); names.add('cleric'); }
  return names;
}

function cardActionProfile(card) {
  const attack = card && card.attack || canonicalExecution(card).attack || {};
  const structured = [attack.attack_type, card && card.action_category, card && card.card_subtype, card && card.classification, card && card.runtime_tags]
    .map(value => String(value || '')).join(' ');
  const raw = `${structured} ${legacyRuleText(card)}`;
  if (/Casting Attack|Casting Spell|Casting time/i.test(raw)) return 'Casting Attack';
  if (/Area Attack|Area Magical|Area Physical|\bArea\b/i.test(raw)) return 'Area Attack';
  if (/Range Attack|RANGE_TARGET/i.test(raw)) return 'Range Attack';
  if (/Magical Attack/i.test(raw)) return 'Magical Attack';
  if (/Physical Attack/i.test(raw)) return 'Physical Attack';
  if (/Attack/i.test(raw)) return 'Attack';
  return '';
}

function isSingleTargetAttackSkillForHeroAbility(card) {
  if (!isAttackSkillCard(card)) return false;
  const profile = cardActionProfile(card);
  if (profile === 'Area Attack' || profile === 'Casting Attack') return false;
  return profile === 'Physical Attack' || profile === 'Magical Attack' || profile === 'Range Attack' || profile === 'Attack';
}

function sourceHeroClassFromPending(state, pending) {
  const heroCard = sourceHeroCardForPending(state, pending);
  return String(heroCard && (heroCard.display_class || heroCard.class || (heroCard.identity && (heroCard.identity.display_class || heroCard.identity.class)) || heroCard.card_subtype) || '');
}

function sourceCanTargetAnyOpponentHeroByAbility(state, playerId, sourceSlot, card) {
  if (!isSingleTargetAttackSkillForHeroAbility(card)) return false;
  if (card && card.card_id === 'S1-ARC-001') return false; // Bow Bash printed exclusion.
  if (cardActionProfile(card) !== 'Physical Attack') return false;
  const heroCard = heroCardRecordForSlot(state, playerId, sourceSlot);
  const cls = String(heroCard && (heroCard.display_class || heroCard.class || (heroCard.identity && (heroCard.identity.display_class || heroCard.identity.class))) || '').toLowerCase();
  return cls === 'marksman' || cls === 'grand ranger';
}

function attackDamageBuffForSourceHero(state, pending, card, context) {
  const heroCard = sourceHeroCardForPending(state, pending);
  if (!heroCard) return { amount: 0, reasons: [] };
  const cls = String(heroCard.display_class || heroCard.class || (heroCard.identity && (heroCard.identity.display_class || heroCard.identity.class)) || '').toLowerCase();
  const damageType = String(context && context.damage_type || damageTypeForCard(card) || '').toLowerCase();
  const reasons = [];
  let amount = 0;
  const isPhysicalAttackDamage = damageType === 'physical';
  const isMagicalAttackDamage = damageType === 'magical';
  if (cls === 'grand arbalest' && isPhysicalAttackDamage) { amount += 10; reasons.push('Rapid Chamber: +10 Physical Attack damage'); }
  if (cls === 'grand ranger' && isPhysicalAttackDamage) { amount += 10; reasons.push('Dead Eye: +10 Physical Attack damage'); }
  if (cls === 'elemental lord' && isMagicalAttackDamage) { amount += 10; reasons.push('Elemental Sovereignty: +10 Magical Attack damage'); }
  if (cls === 'renegade' && isPhysicalAttackDamage) { amount += 10; reasons.push('Nightshade Venom: +10 Physical Attack damage'); }
  if (cls === 'conqueror' && isPhysicalAttackDamage) { amount += 10; reasons.push('Arena Dominator: +10 Physical Attack damage'); }
  return { amount, reasons };
}

function sourceStatusDurationBonus(next, params) {
  const statusName = String(params && params.status || '').toLowerCase();
  if (!['poison', 'burn', 'freeze'].includes(statusName)) return { amount: 0, reason: null };
  if (!params || !params.source_player_id || !params.source_slot || params.source_player_id === params.target_player_id) return { amount: 0, reason: null };
  const heroCard = heroCardRecordForSlot(next, params.source_player_id, params.source_slot);
  const cls = String(heroCard && (heroCard.display_class || heroCard.class || (heroCard.identity && (heroCard.identity.display_class || heroCard.identity.class))) || '').toLowerCase();
  if ((cls === 'elementalist' || cls === 'elemental lord') && (statusName === 'burn' || statusName === 'freeze')) {
    return { amount: 1, reason: `${heroCard.display_class}: Burn/Freeze duration +1 on opponent Heroes` };
  }
  if ((cls === 'rogue' || cls === 'renegade') && statusName === 'poison') {
    return { amount: 1, reason: `${heroCard.display_class}: Poison duration +1` };
  }
  return { amount: 0, reason: null };
}

function healingDoneBonusForSource(next, pending) {
  const heroCard = sourceHeroCardForPending(next, pending);
  const cls = String(heroCard && (heroCard.display_class || heroCard.class || (heroCard.identity && (heroCard.identity.display_class || heroCard.identity.class))) || '').toLowerCase();
  if (cls === 'priest' || cls === 'saint') return { amount: 20, reason: `${heroCard.display_class || heroCard.class || (heroCard.identity && (heroCard.identity.display_class || heroCard.identity.class))}: Healing Done +20` };
  return { amount: 0, reason: null };
}

function targetPhysicalDamageReduction(next, targetPlayerId, targetSlot) {
  const heroCard = heroCardRecordForSlot(next, targetPlayerId, targetSlot);
  const cls = String(heroCard && (heroCard.display_class || heroCard.class || (heroCard.identity && (heroCard.identity.display_class || heroCard.identity.class))) || '').toLowerCase();
  let amount=(cls==='gladiator'||cls==='conqueror')?10:0;const reasons=amount?[`${heroCard.display_class||heroCard.class||(heroCard.identity&&(heroCard.identity.display_class||heroCard.identity.class))}: incoming Physical damage -10`]:[];
  const player=getPlayer(next,targetPlayerId);for(const attachment of player&&player.attachments||[]){if(attachment.card_id==='S1-WAR-020'&&normalizeSlotKey(attachment.host_slot||attachment.source_slot||attachment.target_slot)===normalizeSlotKey(targetSlot)){amount+=Number(attachment.physical_damage_reduction||20);reasons.push('Shield Bash: incoming Physical damage -20');}}
  return {amount,reason:reasons.join('; ')||null};
}

function optionalSurgeForAttack(state, pending, card, intent) {
  const requested = Boolean(intent && (intent.use_surge || intent.mana_surge || intent.arcane_surge || intent.payload && (intent.payload.use_surge || intent.payload.mana_surge || intent.payload.arcane_surge)));
  if (!requested) return { ok: true, extra_mana_cost: 0, damage_bonus: 0, reason: null };
  const cls = sourceHeroClassFromPending(state, pending).toLowerCase();
  const profile = cardActionProfile(card);
  const convertedByAetherInfusion = Boolean(activeAetherInfusionForSource(state, pending.player_id, pending.source_slot, card));
  if (profile !== 'Magical Attack' && !convertedByAetherInfusion) return { ok: false, errors: ['Mana Surge / Arcane Surge can only be selected for exact Magical Attack or Aether Infusion-converted single-target Physical Attack, not Range, Area, or Casting Attack.'] };
  if (cls === 'spell blade') return { ok: true, extra_mana_cost: 1, damage_bonus: 10, reason: convertedByAetherInfusion ? 'Mana Surge +10 after Aether Infusion converted Physical Attack into Magical Attack' : 'Mana Surge +10 Magical Attack damage' };
  if (cls === 'arcane duelist') return { ok: true, extra_mana_cost: 1, damage_bonus: 20, reason: convertedByAetherInfusion ? 'Arcane Surge +20 after Aether Infusion converted Physical Attack into Magical Attack' : 'Arcane Surge +20 Magical Attack damage' };
  return { ok: false, errors: ['Selected source Hero has no Mana Surge / Arcane Surge ability.'] };
}

function activeAetherInfusionForSource(state, playerId, sourceSlot, card) {
  const player = getPlayer(state, playerId);
  if (!player || !isSingleTargetAttackSkillForHeroAbility(card) || cardActionProfile(card) !== 'Physical Attack') return null;
  return (player.attachments || []).find(att => att && att.converts_physical_to_magical && normalizeSlotKey(att.source_slot) === normalizeSlotKey(sourceSlot)) || null;
}

function heroClassGroup(state, heroCardId) {
  const heroCard = getCard(state, heroCardId) || {};
  const identity = heroCard.identity || {};
  const explicit = heroCard.class_group || heroCard.class_family || heroCard.base_skill_class || identity.base_class_family || identity.rank_i_base_class || identity.class || '';
  return String(explicit || '').slice(0, 3).toUpperCase();
}

function attachmentModifierTargetClassErrors(state, card, targetPlayerId, slot) {
  const cardId = card && card.card_id;
  if (!['S1-ITM-010', 'S1-ITM-013', 'S1-ITM-014'].includes(cardId)) return [];
  const player = getPlayer(state, targetPlayerId);
  const slotState = player && player.board && player.board[normalizeSlotKey(slot)];
  const heroId = slotState && slotState.hero && slotState.hero.card_id;
  const group = heroClassGroup(state, heroId);
  if (cardId === 'S1-ITM-010' && group !== 'MAG') return ['Arcane Scroll can only attach to Mage-line / Occultist-line Heroes.'];
  if ((cardId === 'S1-ITM-013' || cardId === 'S1-ITM-014') && !['WAR', 'CLE'].includes(group)) return [`${card.name || cardId} can only attach to Warrior-line or Cleric-line Heroes.`];
  return [];
}

function legalActiveClasses(card) {
  const sources = [];
  if (card && card.legal_active_classes !== undefined) sources.push(card.legal_active_classes);
  if (card && card.requirement && card.requirement.legal_active_classes !== undefined) sources.push(card.requirement.legal_active_classes);
  if (card && card.legality && card.legality.legal_active_classes !== undefined) sources.push(card.legality.legal_active_classes);
  const merged = [];
  for (const value of sources) merged.push(...splitList(value));
  return new Set(merged.map(item => item.toLowerCase()));
}

function sourceMatchesCard(state, card, slotState, options = {}) {
  if (!cardSourceRequired(card)) return { ok: true, errors: [] };
  if (!slotState || slotState.slot_mode !== 'HERO' || !slotState.hero || slotState.hero.defeated) {
    return { ok: false, errors: ['Source must be a current non-defeated HERO slot.'] };
  }
  const responseUse = options.response === true || isDefenseResponseCard(card);
  if (!responseUse && (slotState.hero.exhausted || slotState.hero.casting) && !cardUsableWhileExhausted(card)) {
    return { ok: false, errors: [slotState.hero.casting ? 'Source Hero is Casting and is considered Exhausted.' : 'Source Hero is Exhausted and this card does not say it can be used while Exhausted.'] };
  }
  const allowed = legalActiveClasses(card);
  if (allowed.size) {
    const heroClasses = heroLegalClassNames(state, slotState.hero.card_id);
    const matches = [...allowed].some(cls => heroClasses.has(cls));
    if (!matches) return { ok: false, errors: [`Source Hero class ${heroClass(state, slotState.hero.card_id) || 'Unknown'} cannot use ${card.card_id || card.name}.`] };
  }
  return { ok: true, errors: [] };
}

function determineTargetOwnerId(state, card, playerId) {
  const text = `${card && card.valid_targets || ''} ${legacyRuleText(card)}`.toLowerCase();
  if (isReviveCard(card)) return playerId;
  if (/your hero|your heroes|allied|self/.test(text) && !/opponent|enemy/.test(text)) return playerId;
  if (/this hero/.test(text) && !/opponent|enemy/.test(text)) return playerId;
  return getOpponentId(state, playerId);
}

function activeRestrictionAttachments(state) {
  const restrictions = [];
  for (const player of Object.values(state && state.players || {})) {
    for (const attachment of player.attachments || []) {
      const result = attachment.effect_result || {};
      if (attachment.restriction_type || result.restricts_opponent_targets_to || result.protected_slot) {
        restrictions.push(Object.assign({}, attachment, { owner_id: attachment.owner_id || player.player_id }));
      }
    }
  }
  return restrictions;
}

function isAreaAttackCard(card) {
  const tags = cardTags(card);
  const attack = card && card.attack || canonicalExecution(card).attack || {};
  const descriptor = `${card && card.classification || ''} ${card && card.action_category || ''} ${attack.attack_type || ''}`;
  return tags.has('AREA') || tags.has('AREA_ATTACK')
    || /\bArea Attack\b|\bArea Magical\b|\bArea Physical\b/i.test(descriptor)
    || /\bArea Attack\b|\bArea Magical\b|\bArea Physical\b/i.test(legacyRuleText(card));
}

function isRangeAttackCard(card) {
  const tags = cardTags(card);
  const subtype = String(card && (card.classification || card.action_category || card.card_subtype) || '').toLowerCase();
  const targeting = card && card.targeting || {};
  return tags.has('RANGE') || tags.has('RANGE_TARGET_ANYWHERE') || /range attack/.test(subtype) || targeting.uses_range_attack_targeting === true;
}

function cardIgnoresAreaOfAttack(card) {
  const targeting = card && card.targeting || {};
  if (targeting.ignore_area_of_attack === true) return true;
  return isRangeAttackCard(card);
}

function legalTargetSlotsByAreaOfAttack(sourceSlotRaw) {
  return positioningPolicy.legalAttackTargetSlots(sourceSlotRaw);
}

function areaOfAttackTargetErrors(state, card, actingPlayerId, targetSlot) {
  if (!isHostileAttackCard(card) && !isCastingDamageCard(card)) return [];
  if (isAreaAttackCard(card)) return [];
  if (cardIgnoresAreaOfAttack(card)) return [];
  const pending = state && state.pending;
  const sourceSlot = pending && pending.player_id === actingPlayerId ? pending.source_slot : null;
  if (!sourceSlot) return [];
  if (sourceCanTargetAnyOpponentHeroByAbility(state, actingPlayerId, sourceSlot, card)) return [];
  const legal = legalTargetSlotsByAreaOfAttack(sourceSlot);
  const slot = normalizeSlotKey(targetSlot);
  return legal.includes(slot) ? [] : [`Target ${slot} is outside source Hero Area of Attack from ${normalizeSlotKey(sourceSlot)}.`];
}

function isHostileAttackCard(card) {
  return isAttackSkillCard(card) || /attack/i.test(String(card && card.card_subtype || '')) || /ATTACK/.test(String(card && card.runtime_tags || '').toUpperCase());
}

function isMultiTargetAttackCard(card) {
  if (!isHostileAttackCard(card)) return false;
  if (card && card.card_id === 'S1-ARC-017') return true;
  if (card && card.card_id === 'S1-THF-018') return true;
  const attackType = String(card && card.attack && card.attack.attack_type || card && card.classification || '').toLowerCase();
  return isAreaAttackCard(card) || /area|all target|dual target|multiple target/.test(attackType);
}

function activeAreaAttackRestrictionErrors(state, actingPlayerId, card) {
  if (!isMultiTargetAttackCard(card)) return [];
  const errors = [];
  for (const attachment of activeRestrictionAttachments(state)) {
    if (attachment.restriction_type === 'TAUNT_TARGET_RESTRICTION' && attachment.restricted_player_id === actingPlayerId) {
      errors.push('Attacks affecting more than 1 target are blocked while Taunt is active.');
    }
  }
  return errors;
}

function activeTargetRestrictionErrors(state, actingPlayerId, card, targetPlayerId, targetSlot) {
  const errors = [];
  const slot = normalizeSlotKey(targetSlot);
  const attack = isHostileAttackCard(card);
  for (const attachment of activeRestrictionAttachments(state)) {
    if (attachment.restricted_player_id !== actingPlayerId) continue;
    if (attachment.owner_id !== targetPlayerId) continue;
    if (attachment.restriction_type === 'TAUNT_TARGET_RESTRICTION') {
      const required = normalizeSlotKey(attachment.required_target_slot || (attachment.effect_result && attachment.effect_result.restricts_opponent_targets_to));
      if (slot !== required) errors.push(`Taunt requires targeting ${required}.`);
    }
    if ((attachment.restriction_type === 'UNTARGETABLE_BY_ATTACKS' && attack) || attachment.restriction_type === 'UNTARGETABLE_BY_OPPONENT_TARGETED_EFFECTS') {
      const protectedSlot = normalizeSlotKey(attachment.protected_slot || (attachment.effect_result && attachment.effect_result.protected_slot));
      if (slot === protectedSlot) errors.push(attachment.restriction_type === 'UNTARGETABLE_BY_OPPONENT_TARGETED_EFFECTS' ? 'Protected Hero cannot be targeted by opponent targeted effects.' : 'Protected Hero cannot be targeted by attacks.');
    }
  }
  return errors;
}

function targetMatchesCard(state, card, targetPlayerId, targetSlot, actingPlayerId) {
  if (!cardTargetRequired(card)) return { ok: true, errors: [] };
  const ownerId = targetPlayerId;
  const player = getPlayer(state, ownerId);
  const slot = normalizeSlotKey(targetSlot);
  const slotState = player && player.board && player.board[slot];
  if (isReviveCard(card)) {
    if (!slotState || !(slotState.slot_mode === 'LEGACY' || slotState.hero && slotState.hero.defeated)) {
      return { ok: false, errors: ['Revive target must be a defeated Hero / Legacy slot.'] };
    }
    return { ok: true, errors: [] };
  }
  if (card && card.card_id === 'S1-ARC-017') {
    const heroLegal = Boolean(slotState && slotState.slot_mode === 'HERO' && slotState.hero && !slotState.hero.defeated);
    const legacyLegal = Boolean(slotState && slotState.slot_mode === 'LEGACY');
    if (!heroLegal && !legacyLegal) return { ok: false, errors: ['Dual Arrow target slot must contain a non-defeated Hero or Legacy.'] };
    if (heroLegal) {
      const restrictionErrors = actingPlayerId ? activeTargetRestrictionErrors(state, actingPlayerId, card, ownerId, slot) : [];
      if (restrictionErrors.length) return { ok: false, errors: restrictionErrors };
    }
    return { ok: true, errors: [], slot_mode: heroLegal ? 'HERO' : 'LEGACY' };
  }
  if (!slotState || slotState.slot_mode !== 'HERO' || !slotState.hero || slotState.hero.defeated) {
    return { ok: false, errors: ['Target must be a current non-defeated HERO slot.'] };
  }
  if (card && card.card_id === 'S1-EVT-003') {
    if (targetPlayerId === actingPlayerId) return { ok: false, errors: ['Scouting must target an opponent Hero.'] };
    if (!scoutingExpChoicesForTarget(state, targetPlayerId, slot).length) {
      return { ok: false, errors: ['Scouting requires an opponent Hero with at least 1 non-Ultimate EXP Card.'] };
    }
  }
  const targetValidator = card && card.resolver && card.resolver.target_validator || {};
  if (targetValidator.must_be_non_exhausted === true && slotState.hero.exhausted) {
    return { ok:false, errors:[`${card.name || card.card_id || 'This card'} requires a Ready (non-Exhausted) Hero target.`] };
  }
  if (!selectedTargetIsItemUserAndHost(card) && isHealingCard(card) && !isHealAllCard(card) && !isHostileAttackCard(card)) {
    if (Number(slotState.hero.hp || 0) >= Number(slotState.hero.max_hp || 100)) return { ok:false, errors:['Single-target heal requires a damaged Hero.'] };
    if (heroHasStatus(slotState,'Bleed')) return { ok:false, errors:['A Hero with Bleed cannot be selected for a heal.'] };
  }
  const attachmentClassErrors = attachmentModifierTargetClassErrors(state, card, ownerId, slot);
  if (attachmentClassErrors.length) return { ok: false, errors: attachmentClassErrors };
  const restrictionErrors = actingPlayerId ? activeTargetRestrictionErrors(state, actingPlayerId, card, ownerId, slot) : [];
  if (restrictionErrors.length) return { ok: false, errors: restrictionErrors };
  const areaErrors = actingPlayerId ? areaOfAttackTargetErrors(state, card, actingPlayerId, slot) : [];
  if (areaErrors.length) return { ok: false, errors: areaErrors };
  return { ok: true, errors: [] };
}

function cardPhaseLegal(state, card, playerId) {
  if (!card) return { ok: false, errors: ['Unknown card.'] };
  const timings = cardTimings(card);
  if (timings.includes('Response')) {
    if (state.response_window && state.response_window.attacking_player_id !== playerId) return { ok: true, errors: [] };
    return { ok: false, errors: ['Response cards require a valid Response Window.'] };
  }
  if (!timings.length) return { ok: true, errors: [] };
  if (timings.includes(state.phase)) return { ok: true, errors: [] };
  return { ok: false, errors: [`${card.card_id || card.name} cannot be played during ${state.phase} Phase.`] };
}

function canStartPlayCard(state, playerId, cardId) {
  const player = getPlayer(state, playerId);
  const card = getCard(state, cardId);
  const errors = [];
  if (!player) errors.push(`Unknown player ${playerId}.`);
  if (state.game_over) errors.push('Game is over.');
  if (state.pending) errors.push('Another action is already pending.');
  if (state.active_player_id !== playerId) errors.push('Only active player may play a card.');
  if (!card) errors.push(`Unknown card ${cardId}.`);
  if (player && !(player.hand || []).includes(cardId)) errors.push(`${cardId} is not in ${playerId}'s hand.`);
  if (card) {
    const timing = cardPhaseLegal(state, card, playerId);
    if (!timing.ok) errors.push(...timing.errors);
    if (player && Number(player.mana_pool || 0) < cardCost(card, state, playerId, null)) errors.push(`Not enough Mana Shards to play ${cardId}.`);
    if (card.card_id === 'S1-THF-018') {
      const opponent = getPlayer(state, getOpponentId(state, playerId));
      const poisoned = SLOT_ORDER.some(slot => {
        const slotState = opponent && opponent.board && opponent.board[slot];
        return slotState && slotState.slot_mode === 'HERO' && slotState.hero && !slotState.hero.defeated && heroHasStatus(slotState, 'Poison');
      });
      if (!poisoned) errors.push('Venom Detonation requires at least one opponent Hero with Poison.');
    }
    errors.push(...activeAreaAttackRestrictionErrors(state, playerId, card));
  }
  return { ok: errors.length === 0, errors, card };
}

function validateMinimalIntent(intent) {
  const errors = [];
  if (!intent || typeof intent !== 'object') errors.push('Intent must be an object.');
  if (!intent || !MINIMAL_REDUCER_INTENTS.includes(intent.type)) errors.push(`Unsupported reducer intent: ${intent && intent.type}`);
  if (!intent || !intent.player_id) errors.push('Intent player_id is required.');
  return { ok: errors.length === 0, errors };
}


function castingSourceHeroState(next, ownerId, attachment) {
  const player = getPlayer(next, ownerId);
  const sourceSlot = normalizeSlotKey(attachment.source_slot || attachment.host_slot);
  const slotState = player && player.board && player.board[sourceSlot];
  const hero = slotState && slotState.slot_mode === 'HERO' && slotState.hero && !slotState.hero.defeated ? slotState.hero : null;
  return { player, source_slot: sourceSlot, slot_state: slotState, hero };
}

function cancelCastingAttachment(next, ownerId, attachment, events, reason) {
  const player = getPlayer(next, ownerId);
  if (player && !(player.discard_pile || []).includes(attachment.card_id)) player.discard_pile.push(attachment.card_id);
  const source = castingSourceHeroState(next, ownerId, attachment);
  if (source.hero) source.hero.casting = false;
  if (player && attachment.source_hero_card_id) for (const slot of SLOT_ORDER) { const ss=player.board&&player.board[slot]; if (ss&&ss.slot_mode==='HERO'&&ss.hero&&ss.hero.card_id===attachment.source_hero_card_id) ss.hero.casting=false; }
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: ownerId, card_id: attachment.card_id, source_slot: source.source_slot,
    target_player_id: attachment.target_player_id || getOpponentId(next, ownerId), target_slot: attachment.target_slot,
    payload: { result: 'CASTING_CANCELED', reason, attachment_id: attachment.attachment_id, no_damage: true }
  }));
  events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED, next, {
    player_id: ownerId, card_id: attachment.card_id,
    payload: { from: 'Attachment Slot', to: 'Discard Pile', attachment_id: attachment.attachment_id, casting_canceled: true, reason }
  }));
  return false;
}

function buildCastingReleaseAttackResolution(next, ownerId, attachment) {
  const opponentId = attachment.target_player_id || getOpponentId(next, ownerId);
  const targetSlot = normalizeSlotKey(attachment.locked_target_slot || attachment.target_slot);
  const targetPlayer = getPlayer(next, opponentId);
  const targetState = targetPlayer && targetPlayer.board && targetPlayer.board[targetSlot];
  const targetIsActiveHero = Boolean(targetState && targetState.slot_mode === 'HERO' && targetState.hero && !targetState.hero.defeated);
  const baseDamage = Number(attachment.base_damage);
  if (!Number.isFinite(baseDamage) || baseDamage <= 0) return null;
  return {
    type: 'ATTACK_DAMAGE_RESOLUTION',
    attacking_player_id: ownerId,
    defending_player_id: opponentId,
    card_id: attachment.card_id,
    source_slot: normalizeSlotKey(attachment.source_slot || attachment.host_slot),
    target_player_id: opponentId,
    target_slot: targetSlot,
    targets: [{ target_player_id: opponentId, target_slot: targetSlot }],
    base_damage: baseDamage,
    printed_damage_before_hero_ability: Number(attachment.printed_damage || baseDamage),
    final_damage: baseDamage,
    damage_type: attachment.damage_type || attachment.damage_profile || 'Magical',
    action_profile: 'Casting Attack',
    area: false,
    status_effects: Array.isArray(attachment.status_effects) ? deepClone(attachment.status_effects) : [],
    response_result: null,
    response_results_by_target: {},
    casting: true,
    locked_target_slot: targetSlot,
    source_hero_card_id: attachment.source_hero_card_id || null,
    source_hero_class: attachment.source_hero_class || '',
    class_attack_damage_bonus: Number(attachment.class_attack_damage_bonus || 0),
    class_attack_damage_bonus_reasons: attachment.class_attack_damage_bonus_reasons || [],
    surge_damage_bonus: Number(attachment.surge_damage_bonus || 0),
    surge_reason: attachment.surge_reason || null,
    modifier_breakdown: attachment.modifier_breakdown || [],
    released_from_attachment_id: attachment.attachment_id,
    no_valid_target_at_resolution: !targetIsActiveHero,
    no_damage_reason: targetIsActiveHero ? null : 'Locked target position contains no active Hero (Legacy or empty slot).'
  };
}

function queueOrOpenCastingRelease(next, ownerId, attachment, events) {
  const source = castingSourceHeroState(next, ownerId, attachment);
  if (attachment.casting_cancelled_by_movement) return cancelCastingAttachment(next, ownerId, attachment, events, 'Source Hero moved before release.');
  if (!source.hero) return cancelCastingAttachment(next, ownerId, attachment, events, 'Original source Hero is no longer active.');
  if (attachment.source_hero_card_id && source.hero.card_id !== attachment.source_hero_card_id) return cancelCastingAttachment(next, ownerId, attachment, events, 'Original source Hero moved or changed before release.');
  if ((source.hero.statuses || []).some(status => normalizeStatusName(status).toLowerCase() === 'stun')) return cancelCastingAttachment(next, ownerId, attachment, events, 'Source Hero is Stunned.');
  const attackResolution = buildCastingReleaseAttackResolution(next, ownerId, attachment);
  if (!attackResolution) return cancelCastingAttachment(next, ownerId, attachment, events, 'Casting damage snapshot is missing or invalid.');
  if (next.pending_attack_resolution || next.pending || next.response_window) {
    next.continuation_queue = next.continuation_queue || [];
    next.continuation_queue.push({ type: 'casting_release', player_id: ownerId, card_id: attachment.card_id, attack_resolution: attackResolution });
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, { player_id: ownerId, card_id: attachment.card_id, source_slot: attachment.source_slot, target_player_id: attackResolution.target_player_id, target_slot: attackResolution.target_slot, payload: { result: 'CASTING_RELEASE_QUEUED', attachment_id: attachment.attachment_id, printed_damage: attackResolution.printed_damage_before_hero_ability, final_damage: attackResolution.final_damage, modifier_breakdown: attackResolution.modifier_breakdown } }));
    return true;
  }
  next.pending_attack_resolution = attackResolution;
  if (attackResolution.no_valid_target_at_resolution) {
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
      player_id: ownerId, card_id: attachment.card_id, source_slot: attachment.source_slot,
      target_player_id: attackResolution.target_player_id, target_slot: attackResolution.target_slot,
      payload: { result: 'CASTING_LOCKED_TARGET_HAS_NO_ACTIVE_HERO', locked_target_slot: attackResolution.locked_target_slot, printed_damage: attackResolution.printed_damage_before_hero_ability, final_damage: 0, no_damage_reason: attackResolution.no_damage_reason, modifier_breakdown: attackResolution.modifier_breakdown || [] }
    }));
  }
  const opened = attackResolution.no_valid_target_at_resolution ? false : initializePerHeroResponseWindows(next, attackResolution, events);
  if (!opened) resolvePendingAttackDamage(next, events, ownerId);
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, { player_id: ownerId, card_id: attachment.card_id, source_slot: attachment.source_slot, target_player_id: attackResolution.target_player_id, target_slot: attackResolution.target_slot, payload: { result: 'CASTING_RELEASED_FROM_ATTACHMENT', attachment_id: attachment.attachment_id, per_hero_response_window: opened, locked_target_slot: attackResolution.locked_target_slot, printed_damage: attackResolution.printed_damage_before_hero_ability, final_damage: attackResolution.no_valid_target_at_resolution ? 0 : attackResolution.final_damage, no_damage_reason: attackResolution.no_damage_reason || null, modifier_breakdown: attackResolution.modifier_breakdown } }));
  return true;
}

function resolveDrawCounterCastingObject(next, ownerId, attachment, events) {
  queueOrOpenCastingRelease(next, ownerId, attachment, events);
}
function incrementDrawCounterCastings(next, playerId, drawCount, events) {
  const player = getPlayer(next, playerId);
  if (!player || !Array.isArray(player.attachments) || Number(drawCount || 0) <= 0) return;
  const kept = [];
  for (const attachment of player.attachments) {
    const isDrawCounterCasting = attachment && attachment.attachment_state === 'CASTING' && String(attachment.casting_type || '').toUpperCase() === 'DRAW_COUNTER_CASTING';
    if (!isDrawCounterCasting) {
      kept.push(attachment);
      continue;
    }
    let current = attachment;
    for (let i = 0; i < Number(drawCount || 0); i += 1) {
      const counter = addDrawCounter(current, next);
      current = counter.casting;
      events.push(counter.event);
    }
    if (Number(current.counters || 0) >= Number(current.counters_required || 5)) {
      resolveDrawCounterCastingObject(next, playerId, current, events);
    } else {
      kept.push(current);
    }
  }
  player.attachments = kept;
}

function drawOneCardForPlayer(state, playerId, options) {
  const player = getPlayer(state, playerId);
  if (!player) return { state, events: [], errors: [`Unknown player ${playerId}`] };
  if (!player.main_deck.length) {
    const opponentId = getOpponentId(state, playerId);
    const gameEnded = createRuntimeEvent(EVENT_TYPES.GAME_ENDED, state, {
      player_id: playerId,
      payload: { loser_id: playerId, winner_id: opponentId, reason: 'cannot draw during Draw Phase because Main Deck is empty' }
    });
    const next = Object.assign({}, state, {
      game_over: true,
      winner_id: opponentId,
      lose_reason: `${playerId} loses: cannot draw during Draw Phase because their Main Deck is empty.`
    });
    return { state: appendEvents(next, gameEnded), events: [gameEnded], errors: [] };
  }
  const drawContext = options || {};
  let drawnCardId = null;
  let handIndex = -1;
  let next = updatePlayer(state, playerId, current => {
    const card = current.main_deck[0];
    drawnCardId = card;
    handIndex = (current.hand || []).length;
    const nextPlayer = Object.assign({}, current, {
      main_deck: current.main_deck.slice(1),
      hand: current.hand.concat(card),
      mana_pool: Number(current.mana_pool || 0) + Number(current.mana_regen || 0),
      board: Object.fromEntries(Object.entries(current.board).map(([slot, slotState]) => [slot, slotState.slot_mode === 'HERO' && slotState.hero ? Object.assign({}, slotState, { hero: Object.assign({}, slotState.hero, { exhausted: Boolean(slotState.hero.casting) }) }) : slotState]))
    });
    nextPlayer.turn_stats = Object.assign({}, current.turn_stats || {});
    recordCardsDrawn(nextPlayer, 1);
    return nextPlayer;
  });
  const events = [createRuntimeEvent(EVENT_TYPES.CARD_MOVED, next, { player_id: playerId, card_id: drawnCardId, payload: { from: 'Main Deck', to: 'Hand', draw_count: 1, source: drawContext.source || 'draw_phase' } })];
  incrementDrawCounterCastings(next, playerId, 1, events);
  if (!drawContext.suppress_draw_replacement) {
    if (next.pending_attack_resolution || next.response_window) {
      next.continuation_queue = next.continuation_queue || [];
      next.continuation_queue.push({ type: 'draw_replacement_choice', player_id: playerId, drawn_card_id: drawnCardId, hand_index: handIndex });
    } else maybeOpenDrawReplacementChoice(next, playerId, drawnCardId, handIndex);
  }
  return { state: appendEvents(next, events), events, errors: [] };
}
function enterPhase(state, nextPhase, nextActivePlayerId) {
  let next = Object.assign({}, state, { phase: nextPhase, active_player_id: nextActivePlayerId || state.active_player_id });
  if (nextPhase === PHASES.DRAW) resetTurnStatsForPlayer(next, next.active_player_id);
  let preEvents = [];
  if (nextPhase === PHASES.DRAW) {
    const expired = tickPlayerAttachmentsForPhase(next, TICK_PHASE.DRAW_PHASE_START, next.active_player_id, `${next.round}:${next.active_player_id}:DRAW_PHASE_START`);
    next = expired.state;
    preEvents = expired.events || [];
  }
  if (nextPhase === PHASES.BATTLE) {
    const released = tickPlayerAttachmentsForPhase(next, TICK_PHASE.BATTLE_PHASE_START, next.active_player_id, `${next.round}:${next.active_player_id}:BATTLE_PHASE_START`);
    next = released.state;
    preEvents = preEvents.concat(released.events || []);
  }
  const phaseEvent = createRuntimeEvent(EVENT_TYPES.PHASE_CHANGED, next, { player_id: next.active_player_id, payload: { phase: nextPhase, round: next.round } });
  next = appendEvents(next, phaseEvent);
  const events = preEvents.concat([phaseEvent]);
  if (nextPhase === PHASES.DRAW) {
    const draw = drawOneCardForPlayer(next, next.active_player_id);
    next = draw.state;
    events.push(...draw.events);
  }
  return { state: next, events, errors: [] };
}

function normalizeStatusName(status) {
  return String(status && (status.name || status.status || status.status_name) || '').trim();
}

function defaultStatusTickDamage(statusName) {
  const key = String(statusName || '').toLowerCase();
  if (key === 'poison') return 10;
  return 0;
}

function statusDuration(status) {
  const raw = status && (status.duration_turns !== undefined ? status.duration_turns : status.duration);
  if (raw === undefined || raw === null || raw === '') return null;
  return Number(raw) || 0;
}

function setStatusDuration(status, value) {
  const nextStatus = Object.assign({}, status);
  if (nextStatus.duration_turns !== undefined || nextStatus.duration === undefined) nextStatus.duration_turns = value;
  else nextStatus.duration = value;
  return nextStatus;
}

function heroHasAnyDamageImmunity(state, playerId, slot) {
  const player = getPlayer(state, playerId);
  const normalizedSlot = normalizeSlotKey(slot);
  if (!player) return false;
  for (const attachment of player.attachments || []) {
    const result = attachment.effect_result || {};
    const protectedSlot = normalizeSlotKey(attachment.protected_slot || result.protected_slot || attachment.target_slot || result.target_slot);
    const scope = String(attachment.damage_immunity_scope || result.damage_immunity_scope || result.prevent_scope || '').toLowerCase();
    const type = String(attachment.restriction_type || '').toUpperCase();
    const protectsAnyDamage = type === 'DAMAGE_IMMUNITY' || scope.includes('any_damage') || scope.includes('all_damage') || result.cannot_take_any_damage === true;
    const protectsTeam = type === 'TEAM_DAMAGE_IMMUNITY' || scope.includes('all_allied_heroes') || result.team_cannot_take_any_damage === true;
    if ((protectsAnyDamage && protectedSlot === normalizedSlot) || protectsTeam) return true;
  }
  return false;
}

function addAnyDamageImmunityAttachment(next, events, payload) {
  const playerId = payload && payload.player_id;
  const slot = normalizeSlotKey(payload && payload.slot);
  const player = getPlayer(next, playerId);
  if (!player || !SLOT_ORDER.includes(slot)) return null;
  const attachment = {
    attachment_id: `${payload.card_id}:damage-immunity:${Date.now()}`,
    card_id: payload.card_id,
    owner_id: playerId,
    source_slot: slot,
    target_slot: slot,
    attachment_state: 'ONGOING_EFFECT',
    restriction_type: 'DAMAGE_IMMUNITY',
    damage_immunity_scope: 'any_damage_to_this_hero_this_turn',
    protected_slot: slot,
    expire_timing: 'END_OF_RESTRICTED_PLAYER_TURN',
    expires_player_id: payload.current_turn_player_id || playerId,
    turns_remaining: 1,
    duration: 'this_turn',
    origin_zone: payload.origin_zone || 'Pending/Casting',
    effect_result: {
      protected_slot: slot,
      cannot_take_any_damage: true,
      damage_immunity_scope: 'any_damage_to_this_hero_this_turn',
      expires: 'this_turn'
    }
  };
  const added = addAttachmentWithCapacity(next, playerId, attachment, slot, events);
  if (!added.ok) return null;
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: playerId,
    card_id: payload.card_id,
    source_slot: slot,
    target_player_id: playerId,
    target_slot: slot,
    payload: { result: 'ANY_DAMAGE_IMMUNITY_ATTACHED', protected_slot: slot, duration: 'this_turn', includes_status_tick_damage: true }
  }));
  return added.attachment;
}

function addNegativeStatusImmunityAttachment(next, events, payload) {
  const playerId = payload && payload.player_id;
  const slot = normalizeSlotKey(payload && payload.slot);
  const player = getPlayer(next, playerId);
  const policy = attachmentLifecycle.policyForCard(payload && payload.card_id, payload && payload.source_class);
  if (!player || !SLOT_ORDER.includes(slot) || !policy) return null;
  const attachment = {
    attachment_id: `${payload.card_id}:negative-status-immunity:${Date.now()}`,
    card_id: payload.card_id,
    owner_id: playerId,
    source_slot: slot,
    host_slot: slot,
    target_slot: slot,
    attachment_state: 'ONGOING_EFFECT',
    restriction_type: 'NEGATIVE_STATUS_IMMUNITY',
    protected_slot: slot,
    expires_player_id: payload.current_turn_player_id || playerId,
    remaining_count: policy.remaining_count,
    turns_remaining: policy.remaining_count,
    tick_phase: policy.tick_phase,
    counter_mode: policy.counter_mode,
    duration: 'this_turn',
    origin_zone: payload.origin_zone || 'Response Pending',
    effect_result: {
      protected_slot: slot,
      negative_status_immunity: true,
      expires: 'this_turn'
    }
  };
  const added = addAttachmentWithCapacity(next, playerId, attachment, slot, events);
  if (!added.ok) return null;
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: playerId,
    card_id: payload.card_id,
    source_slot: slot,
    target_player_id: playerId,
    target_slot: slot,
    payload: { result: 'NEGATIVE_STATUS_IMMUNITY_ATTACHED', protected_slot: slot, duration: 'this_turn' }
  }));
  return added.attachment;
}

function resolveEndPhaseStatuses(state, playerId) {
  const next = deepClone(state);
  const events = [];
  const player = getPlayer(next, playerId);
  if (!player || !player.board) return { state: next, events, errors: [] };
  for (const [slot, slotState] of Object.entries(player.board)) {
    if (!slotState || slotState.slot_mode !== 'HERO' || !slotState.hero || slotState.hero.defeated) continue;
    const keptStatuses = [];
    for (const status of slotState.hero.statuses || []) {
      const statusName = normalizeStatusName(status);
      const tickDamage = Number(status && status.tick_damage !== undefined ? status.tick_damage : defaultStatusTickDamage(statusName)) || 0;
      if (tickDamage > 0) {
        const beforeHp = Number(slotState.hero.hp || 0);
        if (heroHasAnyDamageImmunity(next, playerId, slot)) {
          events.push(createRuntimeEvent(EVENT_TYPES.DAMAGE_APPLIED, next, {
            player_id: playerId,
            source_slot: slot,
            target_player_id: playerId,
            target_slot: slot,
            payload: { amount: 0, prevented_amount: tickDamage, damage_type: 'Status', status: statusName, before_hp: beforeHp, after_hp: beforeHp, source: 'end_phase_status_tick', prevented_by: 'any_damage_immunity' }
          }));
        } else {
          const afterHp = Math.max(0, beforeHp - tickDamage);
          slotState.hero.hp = afterHp;
          events.push(createRuntimeEvent(EVENT_TYPES.DAMAGE_APPLIED, next, {
            player_id: playerId,
            source_slot: slot,
            target_player_id: playerId,
            target_slot: slot,
            payload: { amount: tickDamage, damage_type: 'Status', status: statusName, before_hp: beforeHp, after_hp: afterHp, source: 'end_phase_status_tick' }
          }));
          if (afterHp <= 0 && !slotState.hero.defeated) {
            queueHeroDefeatLegacyChoice(next, playerId, slot, slotState, events, `status:${statusName}`);
          }
        }
      }
      const duration = statusDuration(status);
      if (duration === null) {
        keptStatuses.push(status);
      } else {
        const nextDuration = Math.max(0, duration - 1);
        if (nextDuration > 0 && slotState.slot_mode === 'HERO') keptStatuses.push(setStatusDuration(status, nextDuration));
        else events.push(createRuntimeEvent(EVENT_TYPES.EFFECT_EXPIRED, next, { player_id: playerId, target_slot: slot, payload: { effect_type: 'STATUS', status: statusName } }));
      }
    }
    if (slotState.slot_mode === 'HERO' && slotState.hero) slotState.hero.statuses = keptStatuses;
  }
  applyLoseCheckAfterDamage(next, playerId, events);
  return { state: appendEvents(next, events), events, errors: [] };
}

function nextPhase(state) {
  const index = PHASE_ORDER.indexOf(state.phase);
  if (index < 0) return { state, events: [], errors: [`Unknown phase ${state.phase}`] };
  if (state.phase === PHASES.END) {
    const endStatus = resolveEndPhaseStatuses(state, state.active_player_id);
    const endExpire = expireAttachmentsForTiming(endStatus.state, 'END_OF_TURN', state.active_player_id);
    endExpire.events = (endStatus.events || []).concat(endExpire.events || []);
    if (endExpire.state.game_over) return endExpire;
    const currentIndex = endExpire.state.player_order.indexOf(endExpire.state.active_player_id);
    const nextPlayer = endExpire.state.player_order[(currentIndex + 1) % endExpire.state.player_order.length];
    const nextRound = nextPlayer === endExpire.state.player_order[0] ? Number(endExpire.state.round || 1) + 1 : endExpire.state.round;
    const entered = enterPhase(Object.assign({}, endExpire.state, { round: nextRound }), PHASES.DRAW, nextPlayer);
    return { state: entered.state, events: (endExpire.events || []).concat(entered.events || []), errors: (endExpire.errors || []).concat(entered.errors || []) };
  }
  return enterPhase(state, PHASE_ORDER[index + 1], state.active_player_id);
}

function selectBoardSlot(state, playerId, slot) {
  const player = getPlayer(state, playerId);
  return player && player.board && player.board[normalizeSlotKey(slot)];
}

function removeOneFromHand(player, cardId) {
  const index = (player.hand || []).indexOf(cardId);
  if (index < 0) return player.hand || [];
  return player.hand.slice(0, index).concat(player.hand.slice(index + 1));
}

function startPendingAction(state, intent) {
  const cardId = intent.card_id || intent.payload && intent.payload.card_id;
  if (!cardId) return { state, events: [], errors: ['PLAY_CARD requires card_id.'] };
  const legal = canStartPlayCard(state, intent.player_id, cardId);
  if (!legal.ok) return { state, events: [], errors: legal.errors };
  const card = legal.card;
  const targetOwnerId = cardTargetRequired(card) ? determineTargetOwnerId(state, card, intent.player_id) : null;
  const next = updatePlayer(state, intent.player_id, player => Object.assign({}, player, { hand: removeOneFromHand(player, cardId) }));
  next.pending = {
    type: 'PLAY_CARD',
    player_id: intent.player_id,
    card_id: cardId,
    source_required: cardSourceRequired(card),
    target_required: cardTargetRequired(card),
    target_owner_id: targetOwnerId,
    source_slot: null,
    target_slot: null,
    requires_opponent_hand_choice: isOpponentHandBackSelectionCard(card),
    selected_opponent_hand_index: null,
    confirmed: false
  };
  const events = [
    createRuntimeEvent(EVENT_TYPES.ACTION_DECLARED, next, { player_id: intent.player_id, card_id: cardId }),
    createRuntimeEvent(EVENT_TYPES.TIMING_CHECKED, next, { player_id: intent.player_id, card_id: cardId, payload: { phase: next.phase, result: 'OK' } }),
    createRuntimeEvent(EVENT_TYPES.CARD_MOVED, next, { player_id: intent.player_id, card_id: cardId, payload: { from: 'Hand', to: 'Pending/Casting' } })
  ];
  return { state: appendEvents(next, events), events, errors: [] };
}

function selectSource(state, intent) {
  if (!state.pending) return { state, events: [], errors: ['No pending action to receive source.'] };
  if (state.pending.player_id !== intent.player_id) return { state, events: [], errors: ['Only pending action owner may select source.'] };
  if (!state.pending.source_required) return { state, events: [], errors: ['Pending card does not require a source.'] };
  const slot = normalizeSlotKey(intent.source_slot || intent.payload && intent.payload.source_slot);
  const slotState = selectBoardSlot(state, intent.player_id, slot);
  const card = getCard(state, state.pending.card_id);
  const sourceCheck = sourceMatchesCard(state, card, slotState);
  if (!sourceCheck.ok) return { state, events: [], errors: sourceCheck.errors };
  const next = Object.assign({}, state, { pending: Object.assign({}, state.pending, { source_slot: slot }) });
  const events = [
    createRuntimeEvent(EVENT_TYPES.SOURCE_SELECTED, next, { player_id: intent.player_id, card_id: state.pending.card_id, source_slot: slot }),
    createRuntimeEvent(EVENT_TYPES.CLASS_COMPATIBILITY_CHECKED, next, { player_id: intent.player_id, card_id: state.pending.card_id, source_slot: slot, payload: { result: 'OK' } })
  ];
  return { state: appendEvents(next, events), events, errors: [] };
}

function selectTargetSlot(state, intent) {
  if (!state.pending) return { state, events: [], errors: ['No pending action to receive target slot.'] };
  if (state.pending.player_id !== intent.player_id) return { state, events: [], errors: ['Only pending action owner may select target.'] };
  if (!state.pending.target_required) return { state, events: [], errors: ['Pending card does not require a target.'] };
  const slot = normalizeSlotKey(intent.target_slot || intent.payload && intent.payload.target_slot);
  if (!SLOT_ORDER.includes(slot)) return { state, events: [], errors: [`Invalid target slot ${slot}.`] };
  const targetPlayerId = intent.target_player_id || intent.payload && intent.payload.target_player_id || state.pending.target_owner_id || getOpponentId(state, intent.player_id);
  const card = getCard(state, state.pending.card_id);
  const targetCheck = targetMatchesCard(state, card, targetPlayerId, slot, intent.player_id);
  if (!targetCheck.ok) return { state, events: [], errors: targetCheck.errors };
  if (card && card.card_id === 'S1-ARC-017') {
    const selected = normalizeMultiTargetSlots(state.pending.target_slots || []);
    if (selected.includes(slot)) return { state, events: [], errors: ['Dual Arrow targets must be distinct.'] };
    if (selected.length >= 2) return { state, events: [], errors: ['Dual Arrow already has 2 selected targets.'] };
    const targetSlots = selected.concat(slot);
    const targetSlotState = selectBoardSlot(state, targetPlayerId, slot);
    const selectedModes = (state.pending.target_slot_modes || []).concat(targetSlotState && targetSlotState.slot_mode || null);
    const next = Object.assign({}, state, { pending: Object.assign({}, state.pending, { target_slots: targetSlots, target_slot_modes: selectedModes, target_player_id: targetPlayerId, target_slot: null }) });
    const event = createRuntimeEvent(EVENT_TYPES.TARGET_SLOT_SELECTED, next, { player_id: intent.player_id, card_id: state.pending.card_id, target_slot: slot, target_player_id: targetPlayerId, payload: { selected_target_slots: targetSlots, selected_slot_modes: selectedModes, required_target_count: 2, target_package: false, legacy_filler_allowed: true } });
    return { state: appendEvents(next, event), events: [event], errors: [] };
  }
  const statusChoices = isPurifyCard(card) ? negativeStatusChoicesForTarget(state, targetPlayerId, slot) : [];
  const statusChoiceRequired = isPurifyCard(card) && statusChoices.length > 0;
  const expChoices = card && card.card_id === 'S1-EVT-003' ? scoutingExpChoicesForTarget(state, targetPlayerId, slot) : [];
  const next = Object.assign({}, state, { pending: Object.assign({}, state.pending, { target_slot: slot, target_player_id: targetPlayerId, requires_status_choice: statusChoiceRequired, status_choices: statusChoices, selected_status_index: null, selected_status_name: null, requires_exp_choice: card && card.card_id === 'S1-EVT-003', exp_choices: expChoices, selected_exp_index: null, selected_exp_card_id: null }) });
  const event = createRuntimeEvent(EVENT_TYPES.TARGET_SLOT_SELECTED, next, { player_id: intent.player_id, card_id: state.pending.card_id, target_slot: slot, target_player_id: targetPlayerId });
  return { state: appendEvents(next, event), events: [event], errors: [] };
}

function pendingRequirementsSatisfied(pending) {
  const dualArrowReady = pending && pending.card_id === 'S1-ARC-017' ? normalizeMultiTargetSlots(pending.target_slots).length === 2 : true;
  const targetReady = !pending.target_required || (pending.card_id === 'S1-ARC-017' ? dualArrowReady : !!pending.target_slot);
  const statusReady = !pending.requires_status_choice || ((pending.selected_status_index !== null && pending.selected_status_index !== undefined) || !!pending.selected_status_name);
  const expReady = !pending.requires_exp_choice || (Number.isInteger(pending.selected_exp_index) && !!pending.selected_exp_card_id);
  return (!pending.source_required || !!pending.source_slot)
    && targetReady
    && statusReady
    && expReady
    && (!pending.requires_opponent_hand_choice || Number.isInteger(pending.selected_opponent_hand_index));
}

function expCardId(expCard) {
  if (typeof expCard === 'string') return expCard;
  return expCard && (expCard.card_id || expCard.id) || null;
}

function scoutingExpChoicesForTarget(state, targetPlayerId, targetSlot) {
  const player = getPlayer(state, targetPlayerId);
  const slotState = player && player.board && player.board[normalizeSlotKey(targetSlot)];
  const expCards = slotState && slotState.hero && Array.isArray(slotState.hero.exp_cards) ? slotState.hero.exp_cards : [];
  return expCards.map((entry, index) => ({ index, card_id: expCardId(entry) }))
    .filter(choice => choice.card_id && !isUltimateSkillCard(getCard(state, choice.card_id)));
}

function selectScoutingExpCard(state, intent) {
  if (!state.pending || state.pending.card_id !== 'S1-EVT-003') return { state, events: [], errors: ['No pending Scouting EXP choice.'] };
  if (state.pending.player_id !== intent.player_id) return { state, events: [], errors: ['Only the Scouting player may choose the EXP Card.'] };
  if (!state.pending.target_slot || !state.pending.target_player_id) return { state, events: [], errors: ['Select the opponent Hero before choosing its EXP Card.'] };
  const rawIndex = intent.exp_index !== undefined ? intent.exp_index : intent.payload && intent.payload.exp_index;
  const rawCardId = intent.exp_card_id || intent.card_id || intent.payload && (intent.payload.exp_card_id || intent.payload.card_id);
  const choices = scoutingExpChoicesForTarget(state, state.pending.target_player_id, state.pending.target_slot);
  let choice = Number.isInteger(Number(rawIndex)) ? choices.find(item => item.index === Number(rawIndex)) : null;
  if (!choice && rawCardId) choice = choices.find(item => item.card_id === rawCardId);
  if (!choice) return { state, events: [], errors: ['Selected Scouting EXP Card is unavailable or is an Ultimate EXP Card.'] };
  const next = deepClone(state);
  next.pending.selected_exp_index = choice.index;
  next.pending.selected_exp_card_id = choice.card_id;
  next.pending.requires_exp_choice = false;
  next.pending.exp_choices = choices;
  const event = createRuntimeEvent(EVENT_TYPES.TARGET_SELECTED, next, { player_id: intent.player_id, card_id: state.pending.card_id, target_player_id: state.pending.target_player_id, target_slot: state.pending.target_slot, payload: { target_type: 'non_ultimate_exp_card', selected_exp_index: choice.index, selected_exp_card_id: choice.card_id } });
  return { state: appendEvents(next, event), events: [event], errors: [] };
}

function negativeStatusChoicesForTarget(state, targetPlayerId, targetSlot) {
  const player = getPlayer(state, targetPlayerId);
  const slotState = player && player.board && player.board[normalizeSlotKey(targetSlot)];
  const statuses = slotState && slotState.hero && Array.isArray(slotState.hero.statuses) ? slotState.hero.statuses : [];
  return statuses.map((status, index) => ({ index, name: normalizeStatusName(status) })).filter(choice => NEGATIVE_STATUS_NAMES.has(String(choice.name || '').toUpperCase()));
}

function selectStatusToRemove(state, intent) {
  if (!state.pending) return { state, events: [], errors: ['No pending action to receive status choice.'] };
  if (state.pending.player_id !== intent.player_id) return { state, events: [], errors: ['Only pending action owner may choose status.'] };
  const isSaintChoice = state.pending.type === 'saint_purify_choice';
  const choices = negativeStatusChoicesForTarget(state, state.pending.target_player_id || state.pending.target_owner_id || intent.player_id, state.pending.target_slot);
  const rawIndex = intent.status_index !== undefined ? intent.status_index : intent.payload && intent.payload.status_index;
  const rawName = intent.status_name || intent.payload && intent.payload.status_name;
  let choice = null;
  if (rawIndex !== undefined && rawIndex !== null && rawIndex !== '') choice = choices.find(item => item.index === Number(rawIndex));
  if (!choice && rawName) choice = choices.find(item => String(item.name).toLowerCase() === String(rawName).toLowerCase());
  if (!choice) return { state, events: [], errors: ['Selected status is not a removable negative status on the target Hero.'] };
  if (isSaintChoice) {
    const next = deepClone(state);
    const pending = next.pending;
    const targetPlayer = getPlayer(next, pending.target_player_id);
    const slotState = targetPlayer && targetPlayer.board && targetPlayer.board[normalizeSlotKey(pending.target_slot)];
    const statuses = slotState && slotState.hero && Array.isArray(slotState.hero.statuses) ? slotState.hero.statuses : [];
    if (!slotState || !slotState.hero || choice.index < 0 || choice.index >= statuses.length) return { state, events: [], errors: ['Chosen Saint cleanse status is no longer available.'] };
    const removed = statuses[choice.index];
    slotState.hero.statuses = statuses.slice(0, choice.index).concat(statuses.slice(choice.index + 1));
    next.pending = null;
    activateNextSaintPurifyChoice(next);
    const event = createRuntimeEvent(EVENT_TYPES.EFFECT_EXPIRED, next, { player_id: intent.player_id, card_id: pending.source_hero_card_id, source_slot: pending.source_slot, target_player_id: pending.target_player_id, target_slot: pending.target_slot, payload: { effect_type: 'STATUS', status: normalizeStatusName(removed), removed_by: 'Holy Rejuvenation', selected: true } });
    return { state: appendEvents(next, event), events: [event], errors: [] };
  }
  const next = Object.assign({}, state, { pending: Object.assign({}, state.pending, { selected_status_index: choice.index, selected_status_name: choice.name, requires_status_choice: false }) });
  const event = createRuntimeEvent(EVENT_TYPES.TARGET_SELECTED, next, { player_id: intent.player_id, card_id: state.pending.card_id, target_player_id: state.pending.target_player_id || state.pending.target_owner_id || intent.player_id, target_slot: state.pending.target_slot, payload: { target_type: 'negative_status', selected_status_index: choice.index, selected_status_name: choice.name } });
  return { state: appendEvents(next, event), events: [event], errors: [] };
}

function selectOpponentHandCard(state, intent) {
  if (!state.pending) return { state, events: [], errors: ['No pending action to receive opponent hand selection.'] };
  if (state.pending.player_id !== intent.player_id) return { state, events: [], errors: ['Only pending action owner may choose opponent hand card.'] };
  const card = getCard(state, state.pending.card_id);
  const policy = handManipulationPolicyForCard(card);
  if (!policy) return { state, events: [], errors: ['Pending card does not use opponent hand back-of-card selection.'] };
  if (state.pending.source_required && !state.pending.source_slot) return { state, events: [], errors: ['Select source before choosing opponent hand card.'] };
  const opponentId = getOpponentId(state, intent.player_id);
  const opponent = getPlayer(state, opponentId);
  const hand = opponent && Array.isArray(opponent.hand) ? opponent.hand : [];
  const index = Number(intent.hand_index !== undefined ? intent.hand_index : intent.payload && intent.payload.hand_index);
  if (!Number.isInteger(index) || index < 0 || index >= hand.length) return { state, events: [], errors: ['Invalid opponent hand back-of-card index.'] };
  const next = Object.assign({}, state, { pending: Object.assign({}, state.pending, { selected_opponent_hand_index: index, target_player_id: opponentId }) });
  const event = createRuntimeEvent(EVENT_TYPES.TARGET_SELECTED, next, { player_id: intent.player_id, card_id: state.pending.card_id, target_player_id: opponentId, payload: { target_type: 'opponent_hand_back', selected_hand_index: index, card_back: true, identity_masked: true, shuffle_after_resolution: true } });
  return { state: appendEvents(next, event), events: [event], errors: [] };
}

function applySourceExhaust(next, pending, card) {
  if (!pending.source_slot || !cardSourceRequired(card) || cardDoesNotExhaustOnUse(card) || pending.is_response === true) return;
  const slotState = next.players[pending.player_id].board[pending.source_slot];
  if (slotState && slotState.hero) slotState.hero.exhausted = true;
}

function markSourceHeroCasting(next, pending, card, events) {
  if (!pending || !pending.source_slot || !cardSourceRequired(card)) return false;
  const player = next.players && next.players[pending.player_id];
  const slotState = player && player.board && player.board[pending.source_slot];
  if (!slotState || slotState.slot_mode !== 'HERO' || !slotState.hero || slotState.hero.defeated) return false;
  slotState.hero.casting = true;
  slotState.hero.exhausted = true;
  if (events) {
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
      player_id: pending.player_id,
      card_id: pending.card_id,
      source_slot: pending.source_slot,
      payload: { result: 'SOURCE_HERO_ENTERED_CASTING_STATE', casting: true, exhausted: true }
    }));
  }
  return true;
}

function clearCastingStateForSource(next, playerId, sourceSlot, events, cardId) {
  const slot = normalizeSlotKey(sourceSlot);
  const player = next.players && next.players[playerId];
  const slotState = player && player.board && player.board[slot];
  if (!slotState || slotState.slot_mode !== 'HERO' || !slotState.hero) return false;
  if (!slotState.hero.casting) return false;
  slotState.hero.casting = false;
  if (events) {
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
      player_id: playerId,
      card_id: cardId,
      source_slot: slot,
      payload: { result: 'SOURCE_HERO_EXITED_CASTING_STATE', casting: false, exhausted_remains: Boolean(slotState.hero.exhausted) }
    }));
  }
  return true;
}

function isOngoingDispatchResult(dispatch) {
  const result = dispatch && dispatch.result || {};
  return !!(result.expires || result.duration || result.damage_multiplier || result.double_base_damage || result.protected_slot || result.restricts_opponent_targets_to);
}

function attackRestrictionText(card) {
  const execution = canonicalExecution(card);
  const effects = structuredEffects(card);
  const resolver = execution.resolver || execution.runtime_resolver || {};
  const responseFilter = resolver.response_filter || {};
  return [
    ...effects.map(effect => `${effect && effect.kind || ''} ${effect && (effect.raw_value || effect.value || effect.restriction || '') || ''}`),
    responseFilter.dodge || '',
    responseFilter.block || '',
    responseFilter.prevent || '',
    legacyRuleText(card)
  ].join(' ');
}

function attackCannotBeDodged(card) {
  const tags = cardTags(card);
  const text = attackRestrictionText(card);
  return tags.has('CANNOT_BE_DODGED') || /cannot\s+be\s+dodged|dodge\s+(?:response\s+)?is\s+illegal/i.test(text);
}

function attackCannotBeBlocked(card) {
  const tags = cardTags(card);
  const text = attackRestrictionText(card);
  return tags.has('UNBLOCKABLE') || /cannot\s+be\s+blocked|block\s+(?:response\s+)?is\s+illegal/i.test(text);
}

function responseKindForCard(card) {
  const tags = cardTags(card);
  const effects = structuredEffects(card);
  const kinds = new Set(effects.map(effect => String(effect && effect.kind || '').toLowerCase()));
  const text = legacyRuleText(card);
  const returnsAttack = kinds.has('return_attack_card_to_owner_hand') || kinds.has('return_to_hand');
  if (tags.has('NEGATE') || kinds.has('negate') || kinds.has('negate_incoming_attack') || /\bnegate\b/i.test(text)) {
    return returnsAttack || /return\s+the\s+Attack\s+Card\s+to\s+its\s+owner/i.test(text) ? 'NEGATE_RETURN_TO_HAND' : 'NEGATE';
  }
  if (tags.has('CANCEL') || kinds.has('cancel_card') || kinds.has('cancel_response_skill') || /\bcancel\b/i.test(text)) return 'CANCEL';
  if (kinds.has('response_redirect_reposition') || /\bredirect\b/i.test(text)) return 'REDIRECT';
  if (tags.has('DODGE') || kinds.has('response_dodge') || kinds.has('dodge_incoming_attack_damage') || kinds.has('dodge_incoming_damage') || /\bDodge\b/i.test(text)) return 'DODGE';
  if (tags.has('PREVENT_ATTACK_DAMAGE') || kinds.has('team_damage_immunity') || kinds.has('damage_immunity') || /Prevent all attack damage/i.test(text)) return 'PREVENT_ALL_ATTACK_DAMAGE';
  if (tags.has('DAMAGE_IMMUNITY') || /cannot take any damage/i.test(text)) return 'PREVENT_ALL_ATTACK_DAMAGE';
  if (tags.has('BLOCK') || tags.has('DEFEND') || kinds.has('block_damage') || /\bBlock\b/i.test(text)) return 'BLOCK';
  return 'SPECIAL_RESPONSE';
}

function responseNegatesAttack(kind) {
  return kind === 'NEGATE' || kind === 'NEGATE_RETURN_TO_HAND' || kind === 'CANCEL';
}

function responseCanCounterPendingResponse(responseCard, pendingResponse, pendingResponseCard, responderPlayerId) {
  if (!responseCard || !pendingResponse) return { ok: false, errors: ['No pending response to counter.'] };
  const sharedCheck = validateReactionAgainstIncoming(responseCard, {
    pending_response_kind: pendingResponseCard ? responseKindForCard(pendingResponseCard) : null,
    pending_response_family: pendingResponseCard && (pendingResponseCard.card_family || pendingResponseCard.family || pendingResponseCard.card_type),
    pending_response_classification: pendingResponseCard && (pendingResponseCard.classification || pendingResponseCard.card_subtype || pendingResponseCard.action_category),
    pending_card_family: pendingResponseCard && (pendingResponseCard.card_family || pendingResponseCard.family || pendingResponseCard.card_type),
    pending_card_owner_id: pendingResponse.player_id,
    responder_player_id: responderPlayerId
  }, null, pendingResponseCard);
  if (!sharedCheck.ok && sharedCheck.policy) return sharedCheck;
  if (sharedCheck.policy) return sharedCheck;
  const kind = responseKindForCard(responseCard);
  const text = legacyRuleText(responseCard);
  const tags = cardTags(responseCard);
  const canCounter = kind === 'CANCEL' || kind === 'NEGATE' || tags.has('COUNTER_RESPONSE') || /cancel\s+(?:that|target|a)?\s*response|negate\s+(?:that|target|a)?\s*response|counter\s+(?:that|target|a)?\s*response/i.test(text);
  if (!canCounter) return { ok: false, errors: [`${responseCard.card_id || responseCard.name} cannot counter a pending response.`] };
  return { ok: true, errors: [] };
}

function inferResponseSourceSlot(state, response) {
  const explicit = normalizeSlotKey(response && response.source_slot);
  if (SLOT_ORDER.includes(explicit)) return explicit;
  const responseTo = response && response.response_to || {};
  if (responseTo.defending_player_id === response.player_id && SLOT_ORDER.includes(normalizeSlotKey(responseTo.target_slot))) return normalizeSlotKey(responseTo.target_slot);
  return null;
}

function applyCoverUpBoardSwap(next, response, events) {
  if (!response || !response.cover_up_swap) return false;
  const player = next.players && next.players[response.player_id];
  if (!player || !player.board) return false;
  const firstSlot = normalizeSlotKey(response.cover_up_swap.first_slot);
  const secondSlot = normalizeSlotKey(response.cover_up_swap.second_slot);
  const moved = swapBoardSlotsWithoutExhaust(player.board, firstSlot, secondSlot, { hero_only: true });
  if (!moved.ok) {
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
      player_id: response.player_id,
      card_id: response.card_id,
      source_slot: firstSlot,
      target_slot: secondSlot,
      payload: { result: 'COVER_UP_BOARD_SWAP_FAILED', errors: moved.errors }
    }));
    return false;
  }
  player.board = moved.board;
  remapHeroHostedAttachmentsForSlotSwap(player, moved.first_slot, moved.second_slot, events, next, response.player_id);
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: response.player_id,
    card_id: response.card_id,
    source_slot: firstSlot,
    target_slot: secondSlot,
    payload: { result: 'COVER_UP_BOARD_SWAP_APPLIED', first_slot: firstSlot, second_slot: secondSlot, exhaust_from_reposition: false }
  }));
  return true;
}

function applyStepInDodgeThenSwap(next, response, responseCard, events) {
  if (!response || response.card_id !== 'S1-THF-022') return false;
  const attack = next.pending_attack_resolution || {};
  if (attack.cannot_be_dodged) return false;
  const defender = next.players && next.players[response.player_id];
  if (!defender || !defender.board) return false;
  // Legal actions may be submitted exactly as returned by getLegalActions().
  // Fall back to the attacked Hero slot when an older client omitted source_slot.
  const sourceSlot = normalizeSlotKey(response.source_slot || inferResponseSourceSlot(next, response));
  const frontSlot = normalizeSlotKey(attack.source_slot);
  if (!SLOT_ORDER.includes(sourceSlot) || !SLOT_ORDER.includes(frontSlot) || sourceSlot === frontSlot) return false;
  const moved = swapBoardSlotsWithoutExhaust(defender.board, sourceSlot, frontSlot, { hero_only: true });
  if (!moved.ok) {
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
      player_id: response.player_id,
      card_id: response.card_id,
      source_slot: sourceSlot,
      target_slot: frontSlot,
      payload: { result: 'STEP_IN_REPOSITION_FAILED', errors: moved.errors }
    }));
    return false;
  }
  defender.board = moved.board;
  remapHeroHostedAttachmentsForSlotSwap(defender, moved.first_slot, moved.second_slot, events, next, response.player_id);
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: response.player_id,
    card_id: response.card_id,
    source_slot: sourceSlot,
    target_slot: frontSlot,
    payload: { result: 'STEP_IN_DODGE_THEN_REPOSITION_RESOLVED', first_slot: sourceSlot, second_slot: frontSlot, exhaust_from_reposition: false }
  }));
  return true;
}


function unbrokenStandStatusImmunityEligibleForResponse(state, response) {
  if (!response || response.card_id !== 'S1-WAR-022') return false;
  const slot = inferResponseSourceSlot(state, response);
  const player = getPlayer(state, response.player_id);
  const slotState = player && player.board && player.board[slot];
  const heroId = slotState && slotState.slot_mode === 'HERO' && slotState.hero && !slotState.hero.defeated ? slotState.hero.card_id : null;
  const cls = String(heroClass(state, heroId) || '').toLowerCase();
  return cls === 'paladin' || cls === 'crusader';
}

function applyResponseCardFollowUps(next, response, responseCard, events) {
  if (!responseCard || !response) return;
  applyStepInDodgeThenSwap(next, response, responseCard, events);
  const tags = cardTags(responseCard);
  const text = legacyRuleText(responseCard);
  if (response.card_id === 'S1-MAG-011' || tags.has('SELF_FREEZE_2_TURNS') || /Inflict\s+Freeze\s+on\s+this\s+Hero\s+for\s+2\s+turns/i.test(text)) {
    const slot = inferResponseSourceSlot(next, response);
    if (slot) {
      if (response.card_id === 'S1-MAG-011' || tags.has('DAMAGE_IMMUNITY') || /cannot\s+take\s+any\s+damage/i.test(text)) {
        addAnyDamageImmunityAttachment(next, events, { player_id: response.player_id, slot, card_id: response.card_id, current_turn_player_id: next.active_player_id, origin_zone: 'Response Pending' });
      }
      addStatusToHero(next, events, {
        source_player_id: response.player_id,
        source_slot: slot,
        card_id: response.card_id,
        target_player_id: response.player_id,
        target_slot: slot,
        status: 'Freeze',
        duration_turns: 2,
        source: 'response_self_freeze_follow_up'
      });
      events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
        player_id: response.player_id,
        card_id: response.card_id,
        source_slot: slot,
        target_player_id: response.player_id,
        target_slot: slot,
        payload: { result: 'RESPONSE_FOLLOW_UP_SELF_FREEZE_APPLIED', status: 'Freeze', duration_turns: 2 }
      }));
    }
  }
  if (response.card_id === 'S1-WAR-022' && unbrokenStandStatusImmunityEligibleForResponse(next, response)) {
    const slot = inferResponseSourceSlot(next, response);
    if (slot) {
      addNegativeStatusImmunityAttachment(next, events, {
        player_id: response.player_id,
        slot,
        card_id: response.card_id,
        current_turn_player_id: next.active_player_id,
        origin_zone: 'Response Pending'
      });
    }
  }
}

function responseRedirectTargetForCard(state, playerId, responseCard, intent) {
  const kind = responseKindForCard(responseCard);
  if (kind !== 'REDIRECT') return null;
  const sourceSlot = normalizeSlotKey(intent.source_slot || intent.payload && intent.payload.source_slot || intent.redirect_slot || intent.payload && intent.payload.redirect_slot);
  if (!SLOT_ORDER.includes(sourceSlot)) return { ok: false, errors: ['Redirect response requires a valid source_slot / redirect_slot.'] };
  const slotState = selectBoardSlot(state, playerId, sourceSlot);
  if (!slotState || slotState.slot_mode !== 'HERO' || !slotState.hero || slotState.hero.defeated) return { ok: false, errors: ['Redirect source must be a current non-defeated HERO slot.'] };
  if (state.pending_attack_resolution && state.pending_attack_resolution.area) return { ok: false, errors: ['Cannot redirect Area Attacks.'] };
  if (responseCard && responseCard.card_id === 'S1-WAR-004') {
    const pending = state.pending_attack_resolution || {};
    const protectedSlot = normalizeSlotKey(pending.target_slot);
    if (!SLOT_ORDER.includes(protectedSlot)) return { ok: false, errors: ['Cover Up requires a pending single-target attack target.'] };
    if (!adjacentSlots(sourceSlot).includes(protectedSlot)) return { ok: false, errors: ['Cover Up user must be adjacent to the attacked allied Hero.'] };
    const protectedState = selectBoardSlot(state, playerId, protectedSlot);
    if (!protectedState || protectedState.slot_mode !== 'HERO' || !protectedState.hero || protectedState.hero.defeated) return { ok: false, errors: ['Cover Up can only protect an adjacent allied Hero.'] };
    return { ok: true, target_player_id: playerId, target_slot: protectedSlot, cover_up_swap: { first_slot: sourceSlot, second_slot: protectedSlot } };
  }
  return { ok: true, target_player_id: playerId, target_slot: sourceSlot };
}

function responseSourceSlotForValidation(state, playerId, card, intent) {
  const explicit = normalizeSlotKey(intent && (intent.source_slot || intent.payload && intent.payload.source_slot));
  if (SLOT_ORDER.includes(explicit)) return explicit;
  const responseTarget = normalizeSlotKey(state && state.response_window && state.response_window.target_slot);
  if (SLOT_ORDER.includes(responseTarget)) return responseTarget;
  return null;
}

function responseHostHeroCardForValidation(state, playerId, sourceSlot) {
  const player = getPlayer(state, playerId);
  const slotState = player && player.board && player.board[normalizeSlotKey(sourceSlot)];
  const heroId = slotState && slotState.slot_mode === 'HERO' && slotState.hero && !slotState.hero.defeated ? slotState.hero.card_id : null;
  return heroId ? getCard(state, heroId) : null;
}

function alliedProtectionResponseMayUseDifferentSource(card) {
  return Boolean(card && ['S1-CLE-011', 'S1-CLE-022', 'S1-CLE-025'].includes(card.card_id));
}

function responseCandidateSourceSlots(state, playerId, card) {
  const player = getPlayer(state, playerId);
  const targetSlot = normalizeSlotKey(state && state.response_window && state.response_window.target_slot);
  if (!player || !player.board) return [];
  if (card && card.card_id === 'S1-WAR-004') {
    return adjacentSlots(targetSlot).filter(slot => {
      const ss = player.board[slot];
      return ss && ss.slot_mode === 'HERO' && ss.hero && !ss.hero.defeated;
    });
  }
  if (alliedProtectionResponseMayUseDifferentSource(card)) {
    return SLOT_ORDER.filter(slot => {
      const ss = player.board[slot];
      return ss && ss.slot_mode === 'HERO' && ss.hero && !ss.hero.defeated;
    });
  }
  return SLOT_ORDER.includes(targetSlot) ? [targetSlot] : [];
}

function responseCardRequiresSkillSource(card) {
  const family = String(card && (card.card_family || card.card_type || card.family) || '').toLowerCase();
  const subtype = String(card && (card.card_subtype || card.classification || card.action_category) || '').toLowerCase();
  return family.includes('skill') && (subtype.includes('defense skill') || /defense skill|incoming|targeted by an attack/i.test(legacyRuleText(card)));
}

function responseBlockAmount(card, state, response) {
  for (const effect of structuredEffects(card)) {
    if (!effect || effect.kind !== 'block_damage') continue;
    if (effect.amount_by_class && state && response) {
      const slot = inferResponseSourceSlot(state, response);
      const heroCard = responseHostHeroCardForValidation(state, response.player_id, slot);
      const cls = String(heroCard && (heroCard.display_class || heroCard.class || heroCard.name) || '').toLowerCase();
      for (const [className, amount] of Object.entries(effect.amount_by_class || {})) {
        if (cls === String(className).toLowerCase() || heroLegalClassNames(state, heroCard && heroCard.card_id).has(String(className).toLowerCase())) return Number(amount || 0);
      }
    }
    if (effect.amount !== undefined) return Number(effect.amount || 0);
  }
  const text = legacyRuleText(card);
  const blockMatch = text.match(/Block\s+(\d+)/i) || text.match(/by\s+-?(\d+)/i);
  if (blockMatch) return Number(blockMatch[1]) || 0;
  return 0;
}

function responseCardCanAnswerAttack(responseCard, attackResolution, context) {
  if (!responseCard) return { ok: false, errors: ['Missing response card.'] };
  if (!attackResolution) return { ok: true, errors: [] };
  const incoming = Object.assign({}, attackResolution, context && context.incoming || {});
  const hostHero = context && context.hostHeroCard;
  const pendingResponseCard = context && context.pendingResponseCard;
  const sharedCheck = validateReactionAgainstIncoming(responseCard, incoming, hostHero, pendingResponseCard);
  if (!sharedCheck.ok && sharedCheck.policy) return sharedCheck;
  if (sharedCheck.policy) return sharedCheck;
  const kind = responseKindForCard(responseCard);
  if (attackResolution.ability_damage && attackResolution.source_ability === 'Primal Strike' && !['DODGE', 'BLOCK'].includes(kind)) {
    return { ok: false, errors: ['Primal Strike Physical damage can only be answered by Dodge or Block responses.'] };
  }
  if (kind === 'DODGE' && attackResolution.cannot_be_dodged) return { ok: false, errors: ['This attack cannot be dodged.'] };
  if (kind === 'BLOCK' && attackResolution.cannot_be_blocked) return { ok: false, errors: ['This attack cannot be blocked.'] };
  if (kind === 'REDIRECT' && attackResolution.area) return { ok: false, errors: ['Cannot redirect Area Attacks.'] };
  return { ok: true, errors: [] };
}

function isAttackSkillCard(card) {
  const subtype = String(card && (card.card_subtype || card.classification || card.action_category) || '').toLowerCase();
  const family = String(card && (card.card_family || card.card_type || card.family) || '').toLowerCase();
  return subtype.includes('attack') && family.includes('skill');
}

function cardHasDirectDamage(card) {
  const tags = cardTags(card);
  const attack = card && card.attack || canonicalExecution(card).attack || {};
  const effects = structuredEffects(card);
  const canonicalDamage = canonicalExecution(card).attack && canonicalExecution(card).attack.damage || {};
  if ((canonicalDamage.kind && canonicalDamage.kind !== 'non_damage' && canonicalDamage.kind !== 'unspecified') || Number(attack.damage || 0) > 0 || attack.damage_by_class || attack.amount_by_class || attack.scaling) return true;
  if (effects.some(effect => /damage/i.test(String(effect && effect.kind || ''))
      && (effect.amount !== undefined || effect.amount_by_class || effect.raw_amount !== undefined || effect.scaling))) return true;
  return tags.has('DAMAGE') || tags.has('SCALING_DAMAGE') || /\bDeal\s+\d+\b/i.test(legacyRuleText(card));
}

function isCastingDamageCard(card) {
  const descriptor = `${card && card.card_subtype || ''} ${card && card.classification || ''} ${card && card.action_category || ''} ${card && card.runtime_tags || ''}`.toLowerCase();
  const effects = structuredEffects(card);
  const structuredCasting = /casting/.test(descriptor) || effects.some(effect => /pending_casting|casting/i.test(String(effect && effect.kind || '')));
  return (structuredCasting || /Casting time/i.test(legacyRuleText(card))) && cardHasDirectDamage(card);
}

function isCastingAttackResolution(card) {
  const text = legacyRuleText(card);
  return isCastingDamageCard(card) || /Casting time/i.test(text);
}

function isAreaDamageCard(card) {
  const tags = cardTags(card);
  const attack = card && card.attack || canonicalExecution(card).attack || {};
  const descriptor = `${card && card.classification || ''} ${card && card.action_category || ''} ${attack.attack_type || ''}`;
  return tags.has('AREA') || /\bArea\b/i.test(descriptor) || /\bArea\b/i.test(legacyRuleText(card));
}

function damageTypeForCard(card) {
  const tags = cardTags(card);
  const attack = card && card.attack || canonicalExecution(card).attack || {};
  const explicit = String(attack.damage_type || '').toLowerCase();
  if (explicit === 'magical') return 'Magical';
  if (explicit === 'physical') return 'Physical';
  for (const effect of structuredEffects(card)) {
    const effectType = String(effect && effect.damage_type || '').toLowerCase();
    if (effectType === 'magical') return 'Magical';
    if (effectType === 'physical') return 'Physical';
  }
  const text = legacyRuleText(card);
  if (tags.has('MAGICAL_DAMAGE') || /Magical/i.test(text)) return 'Magical';
  if (tags.has('PHYSICAL_DAMAGE') || /Physical/i.test(text)) return 'Physical';
  return 'Unspecified';
}


const ATTACK_STATUS_NAMES = Object.freeze(['Poison', 'Burn', 'Bleed', 'Decay', 'Stun', 'Freeze']);

function parseStatusDurationFromText(statusName, text) {
  const safeText = String(text || '');
  const escaped = escapeRegExp(statusName);
  const nearStatus = safeText.match(new RegExp(`${escaped}\\s+(?:for\\s+)?(\\d+)\\s+turns?`, 'i'));
  if (nearStatus) return Number(nearStatus[1]) || 1;
  const beforeStatus = safeText.match(new RegExp(`(?:inflict|apply|gain)\\s+${escaped}[^.]*?(\\d+)\\s+turns?`, 'i'));
  if (beforeStatus) return Number(beforeStatus[1]) || 1;
  return 1;
}

function attackStatusEffectsForCard(state, pending, card) {
  const structured = [];
  const sourceHero = sourceHeroCardForPending(state, pending);
  const sourceClass = String(sourceHero && (sourceHero.display_class || sourceHero.class || (sourceHero.identity && (sourceHero.identity.display_class || sourceHero.identity.class))) || '');
  const classOrder = structuredClassResolutionOrder(state, pending, sourceClass);
  for (const effect of structuredEffects(card)) {
    if (!effect || effect.kind !== 'inflict_status' || !effect.status) continue;
    let duration = effect.duration_turns !== undefined ? Number(effect.duration_turns) || 1 : Number(effect.duration || 0);
    if (effect.duration_by_class && typeof effect.duration_by_class === 'object') {
      let selected;
      for (const classKey of classOrder) {
        const found = Object.entries(effect.duration_by_class).find(([className]) => String(className || '').toLowerCase() === classKey);
        if (found) { selected = found[1]; break; }
      }
      // A class-specific status row does not apply when the source resolves another lineage row.
      if (selected === undefined) continue;
      duration = Number(selected) || 1;
    }
    structured.push({ status: String(effect.status), duration_turns: Math.max(1, duration || 1), source: 'attack_card_effect' });
  }
  if (structured.length) return structured;
  // Structured attack effects are authoritative. If the card has structured effects but no
  // applicable status row, do not re-invent a status by parsing another Class row's printed text.
  if (structuredEffects(card).some(effect => effect && effect.kind === 'inflict_status')) return [];
  const text = legacyRuleText(card);
  const statusField = String(card && card.status_applied || '').trim();
  const candidates = new Set();
  for (const raw of splitList(statusField)) {
    const found = ATTACK_STATUS_NAMES.find(name => name.toLowerCase() === String(raw).toLowerCase());
    if (found) candidates.add(found);
  }
  for (const name of ATTACK_STATUS_NAMES) {
    if (new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i').test(text) && /(inflict|apply)/i.test(text)) candidates.add(name);
  }
  return [...candidates].map(name => ({ status: name, duration_turns: parseStatusDurationFromText(name, text), source: 'attack_card_effect' }));
}

function addStatusToHero(next, events, params) {
  const targetPlayer = next.players && next.players[params.target_player_id];
  const slotState = targetPlayer && targetPlayer.board && targetPlayer.board[params.target_slot];
  if (!slotState || slotState.slot_mode !== 'HERO' || !slotState.hero || slotState.hero.defeated) return false;
  const normalizedTargetSlot = normalizeSlotKey(params.target_slot);
  const statusIsNegative = ATTACK_STATUS_NAMES.some(name => name.toLowerCase() === String(params.status || '').toLowerCase());
  const immunityAttachment = statusIsNegative && (targetPlayer.attachments || []).find(attachment => {
    const result = attachment && attachment.effect_result || {};
    const protectedSlot = normalizeSlotKey(attachment && (attachment.protected_slot || attachment.host_slot || attachment.target_slot || attachment.source_slot) || result.protected_slot);
    return protectedSlot === normalizedTargetSlot
      && (String(attachment && attachment.restriction_type || '').toUpperCase() === 'NEGATIVE_STATUS_IMMUNITY' || result.negative_status_immunity === true);
  });
  if (immunityAttachment) {
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
      player_id: params.source_player_id,
      card_id: params.card_id,
      source_slot: params.source_slot,
      target_player_id: params.target_player_id,
      target_slot: params.target_slot,
      payload: {
        result: 'NEGATIVE_STATUS_PREVENTED',
        status: params.status,
        prevented_by_card_id: immunityAttachment.card_id,
        attachment_id: immunityAttachment.attachment_id
      }
    }));
    return false;
  }
  const durationBonus = sourceStatusDurationBonus(next, params);
  const status = {
    status: params.status,
    duration_turns: Number(params.duration_turns || 1) + Number(durationBonus.amount || 0),
    source_card_id: params.card_id,
    source_player_id: params.source_player_id,
    source_slot: params.source_slot,
    class_duration_bonus: Number(durationBonus.amount || 0),
    class_duration_bonus_reason: durationBonus.reason
  };
  slotState.hero.statuses = (slotState.hero.statuses || []).concat(status);
  if (String(params.status || '').toLowerCase() === 'stun') {
    const canceled = [];
    targetPlayer.attachments = (targetPlayer.attachments || []).filter(attachment => {
      const host = normalizeSlotKey(attachment.host_slot || attachment.source_slot || attachment.target_slot);
      if (attachment.attachment_state === 'CASTING' && host === normalizedTargetSlot) { canceled.push(attachment); return false; }
      return true;
    });
    for (const attachment of canceled) cancelCastingAttachment(next, params.target_player_id, attachment, events, 'Source Hero received Stun before release.');
  }
  events.push(createRuntimeEvent(EVENT_TYPES.STATUS_APPLIED, next, {
    player_id: params.source_player_id,
    card_id: params.card_id,
    source_slot: params.source_slot,
    target_player_id: params.target_player_id,
    target_slot: params.target_slot,
    payload: {
      status: params.status,
      duration_turns: status.duration_turns,
      base_duration_turns: Number(params.duration_turns || 1),
      class_duration_bonus: Number(durationBonus.amount || 0),
      class_duration_bonus_reason: durationBonus.reason,
      source: params.source || 'attack_card_effect'
    }
  }));
  return true;
}

function consumePoisonVialModifierIfNeeded(next, attackResolution, damagedTargets, events) {
  if (!damagedTargets.length || String(attackResolution.damage_type).toLowerCase() !== 'physical') return;
  const attacker = next.players && next.players[attackResolution.attacking_player_id];
  if (!attacker || !Array.isArray(attacker.attachments)) return;
  const modifierIndex = attacker.attachments.findIndex(modifier => modifier && modifier.modifier_type === 'POISON_VIAL' && !modifier.consumed && (!modifier.host_slot || modifier.host_slot === attackResolution.source_slot));
  if (modifierIndex < 0) return;
  const modifier = attacker.attachments[modifierIndex];
  for (const target of damagedTargets) {
    addStatusToHero(next, events, {
      source_player_id: attackResolution.attacking_player_id,
      source_slot: modifier.source_slot || attackResolution.source_slot,
      card_id: modifier.card_id || 'S1-ITM-011',
      target_player_id: target.target_player_id,
      target_slot: target.target_slot,
      status: 'Poison',
      duration_turns: 2,
      source: 'poison_vial_modifier'
    });
  }
  attacker.attachments.splice(modifierIndex, 1);
  attacker.discard_pile.push(modifier.card_id || 'S1-ITM-011');
  events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED, next, {
    player_id: attackResolution.attacking_player_id,
    card_id: modifier.card_id || 'S1-ITM-011',
    source_slot: modifier.source_slot || attackResolution.source_slot,
    payload: { from: 'Attachment Slot', to: 'Discard Pile', attachment_id: modifier.attachment_id, remaining_count: 0, consumed: true }
  }));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


function classDamageFromFlatDamageAmounts(value, cls) {
  const text = String(value || '');
  if (!text || !cls) return null;
  const normalizedClass = String(cls || '').toLowerCase();
  let best = null;
  for (const part of text.split(/[;]/)) {
    const m = part.trim().match(/^(.+?)\s*:?\s*(\d+)(?:\D.*)?$/i);
    if (!m) continue;
    const className = m[1].trim().toLowerCase();
    if (className === normalizedClass || normalizedClass.endsWith(className) || className.endsWith(normalizedClass)) best = Number(m[2]) || 0;
  }
  return best;
}

function structuredClassResolutionOrder(state, pending, cls, card) {
  const order = [];
  const allowed = legalActiveClasses(card);
  const add = value => {
    if (Array.isArray(value)) { for (const item of value) add(item); return; }
    for (const item of splitList(value || '')) {
      const normalized = String(item || '').trim().toLowerCase();
      if (normalized && (!allowed.size || allowed.has(normalized)) && !order.includes(normalized)) order.push(normalized);
    }
  };
  add(cls);
  const sourceHero = sourceHeroCardForPending(state, pending);
  const identity = sourceHero && sourceHero.identity || {};
  const lineage = [];
  for (const value of [identity.active_class_lineage, sourceHero && sourceHero.active_class_lineage, identity.evolution_path, sourceHero && sourceHero.evolution_path]) {
    for (const item of splitList(value || '')) if (item) lineage.push(item);
  }
  // Highest available row in the active lineage wins; the exact active Class remains first.
  for (const item of lineage.reverse()) add(item);
  add(identity.base_skill_classes || '');
  add(identity.base_class_family || identity.rank_i_base_class || '');
  return order;
}

function classDamageFromStructuredData(state, pending, card, cls) {
  const candidates = [];
  const canonicalAttack = canonicalExecution(card).attack || {};
  const canonicalDamage = canonicalAttack.damage || {};
  if (canonicalDamage.kind === 'by_class' && canonicalDamage.amount_by_class) candidates.push(canonicalDamage.amount_by_class);
  if (canonicalDamage.kind === 'formula_by_class') candidates.push(canonicalDamage.base_by_class || canonicalDamage.multiplier_by_class || canonicalDamage.by_class || {});
  if (card && card.attack && card.attack.damage_by_class) candidates.push(card.attack.damage_by_class);
  for (const effect of structuredEffects(card)) {
    if (effect && effect.amount_by_class) candidates.push(effect.amount_by_class);
    if (effect && effect.damage_by_class) candidates.push(effect.damage_by_class);
  }
  const classOrder = structuredClassResolutionOrder(state, pending, cls, card);
  const opponentId = pending && (pending.target_player_id || pending.target_owner_id || getOpponentId(state, pending.player_id));
  const opponent = opponentId && getPlayer(state, opponentId);
  const opponentManaRegen = Math.max(0, Number(opponent && opponent.mana_regen || 0));
  const player = pending && getPlayer(state, pending.player_id);
  const trackedDrawn = player && player.turn_stats ? Number(player.turn_stats.cards_drawn_this_turn || 0) : 0;
  const cardsDrawn = Math.max(0, Number(pending && pending.cards_drawn_this_turn !== undefined ? pending.cards_drawn_this_turn : trackedDrawn));
  for (const table of candidates) {
    if (!table || typeof table !== 'object') continue;
    let selected;
    for (const classKey of classOrder) {
      const found = Object.entries(table).find(([className]) => String(className || '').toLowerCase() === classKey);
      if (found) { selected = found[1]; break; }
    }
    if (selected === undefined) continue;
    const rawValue = selected;
    if (typeof rawValue === 'number') {
      if (canonicalDamage.multiplier_source === 'opponent_mana_regen' || card && card.card_id === 'S1-MAG-025') return rawValue * opponentManaRegen;
      return rawValue;
    }
    if (rawValue && typeof rawValue === 'object') {
      if (rawValue.amount !== undefined) return Number(rawValue.amount) || 0;
      if (rawValue.base_multiplier_per_opponent_mana_regen !== undefined) return (Number(rawValue.base_multiplier_per_opponent_mana_regen) || 0) * opponentManaRegen;
      if (rawValue.base_multiplier_per_card_drawn !== undefined) {
        const uncapped = (Number(rawValue.base_multiplier_per_card_drawn) || 0) * cardsDrawn;
        const cap = rawValue.max_damage !== undefined ? Number(rawValue.max_damage) || 0 : uncapped;
        return Math.min(cap || uncapped, uncapped);
      }
    }
  }
  return null;
}

function directDamageAmountForCard(state, pending, card) {
  const text = legacyRuleText(card);
  if (!text && !(card && card.attack)) return 0;
  const sourceSlot = pending && pending.source_slot;
  const sourceHeroId = sourceSlot && state.players[pending.player_id] && state.players[pending.player_id].board[sourceSlot] && state.players[pending.player_id].board[sourceSlot].hero && state.players[pending.player_id].board[sourceSlot].hero.card_id;
  const cls = sourceHeroId ? heroClass(state, sourceHeroId) : '';
  const canonicalDamage = canonicalExecution(card).attack && canonicalExecution(card).attack.damage || {};
  if (canonicalDamage.kind === 'fixed') return Number(canonicalDamage.amount || 0);
  if (canonicalDamage.kind === 'formula' && canonicalDamage.multiplier_source === 'mana_spent') {
    const spent = Math.max(0, Number(pending && (pending.mana_spent !== undefined ? pending.mana_spent : pending.spent_mana) || 0));
    return Number(canonicalDamage.base || canonicalDamage.base_multiplier || 10) * spent;
  }
  if (canonicalDamage.kind === 'formula' && canonicalDamage.multiplier_source === 'opponent_mana_regen') {
    const opponentId = pending && (pending.target_player_id || pending.target_owner_id || getOpponentId(state, pending.player_id));
    const opponent = opponentId && getPlayer(state, opponentId);
    return Number(canonicalDamage.base || 0) * Math.max(0, Number(opponent && opponent.mana_regen || 0));
  }
  const structured = classDamageFromStructuredData(state, pending, card, cls);
  if (structured !== null) return Number(structured) || 0;
  const amountFromFlatTable = classDamageFromFlatDamageAmounts(card && card.damage_amounts, cls);
  if (amountFromFlatTable !== null) return amountFromFlatTable;
  if (card && card.card_id === 'S1-ARC-024') {
    const player = pending && getPlayer(state, pending.player_id);
    const trackedDrawn = player && player.turn_stats ? Number(player.turn_stats.cards_drawn_this_turn || 0) : 0;
    const cardsDrawn = Math.max(0, Number(pending && pending.cards_drawn_this_turn !== undefined ? pending.cards_drawn_this_turn : trackedDrawn));
    const isGrand = /grand arbalest/i.test(cls);
    const base = isGrand ? 20 : 10;
    const cap = isGrand ? 120 : 80;
    return Math.min(cap, base * cardsDrawn);
  }
  if (card && card.card_id === 'S1-MAG-025') {
    const opponentId = pending && (pending.target_player_id || pending.target_owner_id || getOpponentId(state, pending.player_id));
    const opponent = opponentId && getPlayer(state, opponentId);
    const regen = Math.max(0, Number(opponent && opponent.mana_regen || 0));
    const base = /arcane duelist/i.test(cls) ? 20 : 10;
    return base * regen;
  }
  if (card && card.card_id === 'S1-MAG-007') return /elementalist|elemental lord/i.test(cls) ? 80 : 70;
  if (card && card.card_id === 'S1-MAG-020') return /spell blade|arcane duelist/i.test(cls) ? 70 : 60;
  if (card && card.card_id === 'S1-ARC-007') return /marksman|grand ranger/i.test(cls) ? 40 : 20;
  if (card && card.card_id === 'S1-ARC-009') return /marksman|grand ranger/i.test(cls) ? 30 : 20;
  if (cls) {
    const classPattern = new RegExp(`${escapeRegExp(cls)}(?:\\s+Rank\\s+[IVX0-9]+)?\\s*:?\\s*(?:When this attack hits,?\\s*)?(?:same,?\\s*)?(?:deal\\s+)?(\\d+)`, 'i');
    const classMatch = text.match(classPattern);
    if (classMatch) return Number(classMatch[1]) || 0;
  }
  const firstDeal = text.match(/\bDeal\s+(\d+)\b/i);
  return firstDeal ? Number(firstDeal[1]) || 0 : 0;
}

function normalizeMultiTargetSlots(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(item => typeof item === 'string' ? item : (item && (item.target_slot || item.slot))).map(normalizeSlotKey).filter(slot => SLOT_ORDER.includes(slot));
  }
  if (typeof value === 'string') return value.split(/[;,]/).map(part => normalizeSlotKey(part.trim())).filter(slot => SLOT_ORDER.includes(slot));
  return [];
}

function damageTargetSlots(state, pending, card) {
  const targetPlayerId = pending.target_player_id || pending.target_owner_id || getOpponentId(state, pending.player_id);
  const targetPlayer = targetPlayerId && state.players && state.players[targetPlayerId];
  if (!targetPlayer || !targetPlayer.board) return [];
  if (card && card.card_id === 'S1-THF-018') {
    return SLOT_ORDER.filter(slot => {
      const slotState = targetPlayer.board[slot];
      return slotState && slotState.slot_mode === 'HERO' && slotState.hero && !slotState.hero.defeated && heroHasStatus(slotState, 'Poison');
    }).map(slot => ({ target_player_id: targetPlayerId, target_slot: slot }));
  }
  if (card && card.card_id === 'S1-ARC-017') {
    const selected = normalizeMultiTargetSlots(pending.target_slots || pending.dual_arrow_slots || pending.selected_target_slots || pending.targets);
    const slots = selected.length ? selected : (pending.target_slot ? [pending.target_slot] : []);
    const unique = [...new Set(slots.map(normalizeSlotKey))].filter(slot => SLOT_ORDER.includes(slot));
    return unique.filter(slot => {
      const slotState = targetPlayer.board[slot];
      return slotState && slotState.slot_mode === 'HERO' && slotState.hero && !slotState.hero.defeated;
    }).map(slot => ({ target_player_id: targetPlayerId, target_slot: slot, selected_by_dual_arrow: true }));
  }
  if (isAreaDamageCard(card)) {
    return SLOT_ORDER.filter(slot => {
      const slotState = targetPlayer.board[slot];
      return slotState && slotState.slot_mode === 'HERO' && slotState.hero && !slotState.hero.defeated;
    }).map(slot => ({ target_player_id: targetPlayerId, target_slot: slot, affected_by_area_attack: true }));
  }
  return pending.target_slot ? [{ target_player_id: targetPlayerId, target_slot: pending.target_slot }] : [];
}

function nonDefeatedHeroSlotCount(player) {
  return Object.values(player && player.board || {}).filter(slotState => slotState && slotState.slot_mode === 'HERO' && slotState.hero && !slotState.hero.defeated).length;
}

function applyLoseCheckAfterDamage(next, losingPlayerId, events) {
  const losingPlayer = next.players && next.players[losingPlayerId];
  if (!losingPlayer || next.game_over || nonDefeatedHeroSlotCount(losingPlayer) > 0) return;
  if (next.defer_state_based_checks) {
    next.deferred_lose_check_player_ids = [...new Set((next.deferred_lose_check_player_ids || []).concat(losingPlayerId))];
    return;
  }
  const winnerId = getOpponentId(next, losingPlayerId);
  next.game_over = true;
  next.winner_id = winnerId;
  next.lose_reason = `${losingPlayerId} loses: all 3 Heroes have been defeated.`;
  events.push(createRuntimeEvent(EVENT_TYPES.GAME_ENDED, next, {
    player_id: losingPlayerId,
    payload: { loser_id: losingPlayerId, winner_id: winnerId, reason: 'all 3 Heroes have been defeated' }
  }));
}

function runDeferredLoseChecks(next, events) {
  const ids = [...new Set(next.deferred_lose_check_player_ids || [])];
  next.defer_state_based_checks = false;
  next.deferred_lose_check_player_ids = [];
  for (const playerId of ids) applyLoseCheckAfterDamage(next, playerId, events);
}

function heroHasStatus(slotState, statusName) {
  const wanted = String(statusName || '').toLowerCase();
  return (slotState && slotState.hero && slotState.hero.statuses || []).some(status => normalizeStatusName(status).toLowerCase() === wanted);
}

function targetHasStatus(next, target, statusName) {
  const player = next.players && next.players[target.target_player_id];
  const slotState = player && player.board && player.board[target.target_slot];
  return heroHasStatus(slotState, statusName);
}

function conditionalDamageBonusForAttack(next, attackResolution) {
  const cardId = attackResolution && attackResolution.card_id;
  const targets = attackResolution && attackResolution.targets || [];
  const primaryTarget = targets[0];
  if (!primaryTarget) return { amount: 0, reason: null };
  if (cardId === 'S1-WAR-010' && targetHasStatus(next, primaryTarget, 'Bleed')) {
    return { amount: 20, reason: 'Rage Blast target has Bleed.' };
  }
  if (cardId === 'S1-THF-015' && targetHasStatus(next, primaryTarget, 'Poison')) {
    const cls = String(attackResolution.source_hero_class || '').toLowerCase();
    const bonus = 40;
    return { amount: bonus, reason: `Venom Sovereign target has Poison; ${cls.includes('renegade') ? 'Renegade' : 'Rogue'} text bonus.` };
  }
  return { amount: 0, reason: null };
}

function canUseStonebloodPreventDefeat(next, playerId, slotState) {
  const player = next.players && next.players[playerId];
  const heroCard = slotState && slotState.hero && getCard(next, slotState.hero.card_id);
  const racial = heroCard && heroCard.racial_ability || {};
  const action = racial.action || {};
  const text = String(racial.text || legacyRuleText(heroCard) || '');
  const tokens = Number(player && (player.racial_token_pool !== undefined ? player.racial_token_pool : player.racial_tokens) || 0);
  const isStoneblood = String(action.action_key || '').toLowerCase() === 'stoneblood'
    || action.trigger === 'would_be_defeated'
    || /Stoneblood/i.test(String(racial.name || '') + ' ' + text);
  return tokens > 0 && isStoneblood && racialTokenSpendAvailable(next, playerId) && !stonebloodAlreadyUsedThisTurn(slotState, next);
}

function stonebloodAlreadyUsedThisTurn(slotState, state) {
  const hero = slotState && slotState.hero;
  return !!hero && hero.stoneblood_used_turn === racialTraitTurnKey(state);
}

function openStonebloodPreventDefeatChoice(next, playerId, slot, slotState, events, sourceCardId) {
  const player = next.players && next.players[playerId];
  if (!player || !canUseStonebloodPreventDefeat(next, playerId, slotState)) return false;
  slotState.hero.hp = 0;
  slotState.hero.pending_defeat = true;
  next.pending = {
    type: 'racial_trigger_choice',
    trigger: 'stoneblood',
    player_id: playerId,
    source_slot: normalizeSlotKey(slot),
    source_hero_card_id: slotState.hero.card_id,
    cause_card_id: sourceCardId,
    choices: ['use', 'decline']
  };
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: playerId,
    card_id: slotState.hero.card_id,
    target_player_id: playerId,
    target_slot: slot,
    payload: { result: 'STONEBLOOD_CHOICE_OPENED', cause_card_id: sourceCardId, optional: true, usage_limit: 'racial_tokens_only' }
  }));
  return true;
}

function applyStonebloodPreventDefeat(next, playerId, slot, slotState, events, sourceCardId) {
  return openStonebloodPreventDefeatChoice(next, playerId, slot, slotState, events, sourceCardId);
}

function attachmentDamageModifierApplies(attachment, attackResolution) {
  const cardId = attachment && attachment.card_id;
  if (!['S1-CLE-006', 'S1-CLE-007', 'S1-ITM-010', 'S1-ITM-014', 'S1-EVT-011'].includes(cardId)) return false;
  if (!attackResolution) return false;
  const damageType = String(attackResolution.damage_type || '').toLowerCase();
  if (!['physical', 'magical'].includes(damageType)) return false;
  if (cardId !== 'S1-EVT-011' && normalizeSlotKey(attachment.target_slot || attachment.host_slot || attachment.source_slot) !== normalizeSlotKey(attackResolution.source_slot)) return false;
  if (cardId === 'S1-CLE-006') return damageType === 'physical';
  if (cardId === 'S1-CLE-007') return damageType === 'magical';
  if (cardId === 'S1-ITM-010') return damageType === 'magical';
  if (cardId === 'S1-ITM-014') return damageType === 'physical' || damageType === 'magical';
  if (cardId === 'S1-EVT-011') return damageType === 'physical' || damageType === 'magical';
  return false;
}

function activeAttackDamageModifierAmount(next, attackResolution, events) {
  const player = next.players && next.players[attackResolution && attackResolution.attacking_player_id];
  if (!player) return 0;
  let total = 0;
  for (const attachment of player.attachments || []) {
    if (!attachmentDamageModifierApplies(attachment, attackResolution)) continue;
    const result = attachment.effect_result || attachment.dispatcher_result || {};
    const amount = attachment.card_id === 'S1-EVT-011'
      ? Number(result.total_bonus || result.base_bonus || attachment.modifier_amount || 10) || 0
      : Number(attachment.modifier_amount || result.amount || 20) || 0;
    total += amount;
    attackResolution.modifier_breakdown = Array.isArray(attackResolution.modifier_breakdown) ? attackResolution.modifier_breakdown : [];
    attackResolution.modifier_breakdown.push({ source_type: 'Attachment', source_card_id: attachment.card_id, source_name: (getCard(next, attachment.card_id) || {}).name || attachment.card_id, amount, reason: `${(getCard(next, attachment.card_id) || {}).name || attachment.card_id}: +${amount} ${attackResolution.damage_type || ''} Attack damage` });
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
      player_id: attackResolution.attacking_player_id,
      card_id: attachment.card_id,
      source_slot: attackResolution.source_slot,
      target_player_id: attackResolution.target_player_id,
      target_slot: attackResolution.target_slot,
      payload: { result: 'ATTACK_DAMAGE_MODIFIER_APPLIED', source_attack_card_id: attackResolution.card_id, modifier_amount: amount, modifier_card_id: attachment.card_id, actual_damage_type: attackResolution.damage_type }
    }));
  }
  return total;
}

function attackConnectionAllowsFullDamageMultiplier(attackResolution, response) {
  if (!attackResolution || attackResolution.attack_negated) return false;
  const kind = String(response && response.type || '').toUpperCase();
  if (responseNegatesAttack(kind) || kind === 'DODGE' || kind === 'PREVENT_ALL_ATTACK_DAMAGE') return false;
  return true;
}

function activeAttackDamageMultiplier(next, attackResolution, response, events) {
  if (!attackResolution || attackResolution.ability_damage) return { multiplier: 1, reasons: [] };
  let multiplier = 1;
  const reasons = [];
  if (attackResolution.card_id === 'S1-ARC-018'
      && attackResolution.action_profile === 'Range Attack'
      && attackConnectionAllowsFullDamageMultiplier(attackResolution, response)) {
    multiplier *= 2;
    reasons.push('Charged Shot: double full connected Range Attack damage');
  }
  const player = next.players && next.players[attackResolution.attacking_player_id];
  const lastResort = player && (player.attachments || []).find(attachment => attachment.card_id === 'S1-EVT-005');
  if (lastResort && activeHeroSlotCount(player) === 1) {
    multiplier *= 2;
    reasons.push('Last Resort: double full Attack Card damage');
  }
  if (multiplier !== 1) {
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
      player_id: attackResolution.attacking_player_id,
      card_id: attackResolution.card_id,
      source_slot: attackResolution.source_slot,
      target_player_id: attackResolution.target_player_id,
      target_slot: attackResolution.target_slot,
      payload: { result: 'FULL_ATTACK_DAMAGE_MULTIPLIER_APPLIED', multiplier, reasons }
    }));
  }
  return { multiplier, reasons };
}

function activeHealingReceivedModifierAmount(next, targetPlayerId, targetSlot, events, sourceCardId) {
  const player = next.players && next.players[targetPlayerId];
  if (!player) return 0;
  const normalized = normalizeSlotKey(targetSlot);
  let total = 0;
  for (const attachment of player.attachments || []) {
    if (attachment.card_id !== 'S1-ITM-013') continue;
    if (normalizeSlotKey(attachment.target_slot || attachment.source_slot) !== normalized) continue;
    const amount = Number(attachment.modifier_amount || (attachment.effect_result && attachment.effect_result.amount) || 20) || 0;
    total += amount;
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
      player_id: targetPlayerId,
      card_id: attachment.card_id,
      target_player_id: targetPlayerId,
      target_slot: normalized,
      payload: { result: 'HEALING_RECEIVED_MODIFIER_APPLIED', source_heal_card_id: sourceCardId, modifier_amount: amount, modifier_card_id: attachment.card_id }
    }));
  }
  return total;
}


function responseResultForTarget(attackResolution, target) {
  const key = target && `${target.target_player_id}:${normalizeSlotKey(target.target_slot)}`;
  return attackResolution && attackResolution.response_results_by_target && attackResolution.response_results_by_target[key] || attackResolution && attackResolution.response_result || null;
}

function responseDodgesDamageTarget(attackResolution, target) {
  const response = responseResultForTarget(attackResolution, target);
  if (!response || response.type !== 'DODGE') return false;
  const targetSlot = normalizeSlotKey(target && target.target_slot);
  const targetPlayerId = target && target.target_player_id;
  if (attackResolution && attackResolution.area) {
    const dodgingSlot = normalizeSlotKey(response.source_slot || response.target_slot || response.response_source_slot || response.defending_slot);
    const dodgingPlayerId = response.player_id || attackResolution.defending_player_id || attackResolution.target_player_id;
    return SLOT_ORDER.includes(dodgingSlot) && targetPlayerId === dodgingPlayerId && targetSlot === dodgingSlot;
  }
  return targetPlayerId === (attackResolution.defending_player_id || attackResolution.target_player_id) && (!attackResolution.target_slot || targetSlot === normalizeSlotKey(attackResolution.target_slot));
}

function finalHpDamageEntry(target, appliedAmount, beforeHp, afterHp, reason) {
  return {
    target_player_id: target.target_player_id,
    target_slot: target.target_slot,
    final_hp_damage: Math.max(0, Number(beforeHp || 0) - Number(afterHp || 0)),
    applied_amount: Number(appliedAmount || 0),
    before_hp: Number(beforeHp || 0),
    after_hp: Number(afterHp || 0),
    reason: reason || 'hp_damage'
  };
}

function applyDamageToTargets(next, attackResolution, amount, events, sourceLabel) {
  const targets = attackResolution.targets || [];
  const damagedTargets = [];
  for (const target of targets) {
    const targetPlayer = next.players[target.target_player_id];
    const slotState = targetPlayer && targetPlayer.board && targetPlayer.board[target.target_slot];
    if (!slotState || slotState.slot_mode !== 'HERO' || !slotState.hero || slotState.hero.defeated) continue;
    const beforeHp = Number(slotState.hero.hp || 0);
    const targetKey = `${target.target_player_id}:${normalizeSlotKey(target.target_slot)}`;
    const targetBaseDamage = attackResolution && attackResolution.per_target_base_damage && attackResolution.per_target_base_damage[targetKey];
    const incomingAmount = Number(targetBaseDamage !== undefined ? targetBaseDamage : amount || 0);
    const teamBlockAmount = Number(attackResolution && attackResolution.team_block_amount || 0);
    let adjustedAmount = Math.max(0, incomingAmount - teamBlockAmount);
    const response = responseResultForTarget(attackResolution, target);
    const scopedBlockMatches = response && response.type === 'BLOCK' && (!response.block_target_slot || (
      target.target_player_id === (response.block_target_player_id || attackResolution.defending_player_id || attackResolution.target_player_id)
      && normalizeSlotKey(target.target_slot) === normalizeSlotKey(response.block_target_slot)
    ));
    const individualBlockAmount = scopedBlockMatches && !(response && response.team_scope) ? Number(response.block_amount || 0) : 0;
    if (individualBlockAmount) adjustedAmount = Math.max(0, adjustedAmount - individualBlockAmount);
    if (response && response.type === 'PREVENT_ALL_ATTACK_DAMAGE') adjustedAmount = 0;
    const dodgedByResponse = responseDodgesDamageTarget(attackResolution, target);
    const exactDamageAfterDodge = dodgedByResponse
      && attackResolution.card_id === 'S1-MAG-007'
      && /elementalist|elemental lord/i.test(String(attackResolution.source_hero_class || ''))
      ? 40
      : null;
    const physicalReduction = String(attackResolution.damage_type || '').toLowerCase() === 'physical' && !dodgedByResponse ? targetPhysicalDamageReduction(next, target.target_player_id, target.target_slot) : { amount: 0, reason: null };
    if (physicalReduction.amount) adjustedAmount = Math.max(0, adjustedAmount - Number(physicalReduction.amount || 0));
    const amountAfterDodge = exactDamageAfterDodge !== null ? exactDamageAfterDodge : adjustedAmount;
    const damagePreventedByImmunity = amountAfterDodge > 0 && (!dodgedByResponse || exactDamageAfterDodge !== null) && heroHasAnyDamageImmunity(next, target.target_player_id, target.target_slot);
    const appliedAmount = dodgedByResponse && exactDamageAfterDodge === null ? 0 : (damagePreventedByImmunity ? 0 : amountAfterDodge);
    const afterHp = Math.max(0, beforeHp - appliedAmount);
    slotState.hero.hp = afterHp;
    const receivedHpDamage = appliedAmount > 0 && afterHp < beforeHp;
    if (receivedHpDamage) damagedTargets.push(finalHpDamageEntry(target, appliedAmount, beforeHp, afterHp, 'hp_damage'));
    events.push(createRuntimeEvent(EVENT_TYPES.DAMAGE_APPLIED, next, {
      player_id: attackResolution.attacking_player_id,
      card_id: attackResolution.card_id,
      source_slot: attackResolution.source_slot,
      target_player_id: target.target_player_id,
      target_slot: target.target_slot,
      payload: {
        amount: appliedAmount,
        incoming_damage: incomingAmount,
        original_amount: incomingAmount,
        team_block_amount: teamBlockAmount,
        response_block_amount: individualBlockAmount,
        total_block_amount: teamBlockAmount + individualBlockAmount,
        exact_damage_after_dodge: exactDamageAfterDodge,
        class_damage_reduction_amount: Number(physicalReduction.amount || 0),
        class_damage_reduction_reason: physicalReduction.reason,
        prevented_amount: damagePreventedByImmunity ? adjustedAmount : 0,
        damage_type: attackResolution.damage_type,
        before_hp: beforeHp,
        after_hp: afterHp,
        prevented_by: damagePreventedByImmunity ? 'any_damage_immunity' : null,
        area: attackResolution.area,
        source: sourceLabel || 'attack',
        response_result: response || null,
        dodged_by_response: dodgedByResponse,
        final_hp_damage: Math.max(0, beforeHp - afterHp),
        public_damage_breakdown: { attack_card_id: attackResolution.card_id, incoming_damage: incomingAmount, conditional_bonus_before_defense: Boolean(attackResolution.damage_computation && attackResolution.damage_computation.conditional_bonus_before_defense), conditional_bonus_amount: Number(attackResolution.damage_computation && attackResolution.damage_computation.conditional_bonus && attackResolution.damage_computation.conditional_bonus.amount || 0), defense_card_id: response && response.response_card_id !== undefined ? response.response_card_id : response && response.card_id || null, defense_display_name: response && (response.response_display_name || response.racial_trait) || null, defense_source_type: response && response.response_source_type || (response && response.card_id ? 'CARD' : null), defense_kind: response && response.type || null, team_block: teamBlockAmount, response_block: individualBlockAmount, passive_reduction: Number(physicalReduction.amount || 0), immunity_prevented: damagePreventedByImmunity ? amountAfterDodge : 0, final_hp_damage: Math.max(0, beforeHp - afterHp), before_hp: beforeHp, after_hp: afterHp }
      }
    }));
    events.push(createRuntimeEvent(EVENT_TYPES.OPPONENT_PLAYED_UPDATED, next, { player_id: attackResolution.attacking_player_id, card_id: attackResolution.card_id, source_slot: attackResolution.source_slot, target_player_id: target.target_player_id, target_slot: target.target_slot, payload: { public_record_type: 'ACTION_RESULT', status: attackResolution.attack_negated ? 'NEGATED' : 'RESOLVED', response_card_id: response && response.response_card_id !== undefined ? response.response_card_id : response && response.card_id || null, response_display_name: response && (response.response_display_name || response.racial_trait) || null, response_source_type: response && response.response_source_type || (response && response.card_id ? 'CARD' : null), response_kind: response && response.type || null, incoming_damage: incomingAmount, conditional_bonus_before_defense: Boolean(attackResolution.damage_computation && attackResolution.damage_computation.conditional_bonus_before_defense), conditional_bonus_amount: Number(attackResolution.damage_computation && attackResolution.damage_computation.conditional_bonus && attackResolution.damage_computation.conditional_bonus.amount || 0), total_block: teamBlockAmount + individualBlockAmount, passive_reduction: Number(physicalReduction.amount || 0), final_hp_damage: Math.max(0, beforeHp - afterHp), before_hp: beforeHp, after_hp: afterHp, keep_visible_when_canceled_or_negated: true } }));
    if (afterHp <= 0 && !slotState.hero.defeated) {
      if (!applyStonebloodPreventDefeat(next, target.target_player_id, target.target_slot, slotState, events, attackResolution.card_id)) {
        queueHeroDefeatLegacyChoice(next, target.target_player_id, target.target_slot, slotState, events, attackResolution.card_id);
      }
    }
  }
  for (const statusEffect of attackResolution.status_effects || []) {
    for (const target of damagedTargets) {
      addStatusToHero(next, events, {
        source_player_id: attackResolution.attacking_player_id,
        source_slot: attackResolution.source_slot,
        card_id: attackResolution.card_id,
        target_player_id: target.target_player_id,
        target_slot: target.target_slot,
        status: statusEffect.status,
        duration_turns: statusEffect.duration_turns,
        source: statusEffect.source || 'attack_card_effect'
      });
    }
  }
  if (!attackResolution.defer_attack_consumables) consumePoisonVialModifierIfNeeded(next, attackResolution, damagedTargets, events);
  for (const targetPlayerId of [...new Set(targets.map(target => target.target_player_id))]) {
    applyLoseCheckAfterDamage(next, targetPlayerId, events);
  }
  return damagedTargets;
}


function baseClassFamilyForHeroCard(card) {
  if (!card) return '';
  const identity = card.identity || {};
  const baseSkillClasses = Array.isArray(identity.base_skill_classes) ? identity.base_skill_classes : [];
  const activeLineage = Array.isArray(identity.active_class_lineage) ? identity.active_class_lineage : [];
  const cardId = String(card.card_id || '');
  let inferredPrefixFamily = '';
  if (/^S1-ARC-H/.test(cardId)) inferredPrefixFamily = 'Archer';
  else if (/^S1-THF-H/.test(cardId)) inferredPrefixFamily = 'Thief';
  else if (/^S1-MAG-H/.test(cardId)) inferredPrefixFamily = 'Mage';
  else if (/^S1-WAR-H/.test(cardId)) inferredPrefixFamily = 'Warrior';
  else if (/^S1-CLE-H/.test(cardId)) inferredPrefixFamily = 'Cleric';
  return String(card.class_family || card.foundation_family || baseSkillClasses[0] || inferredPrefixFamily || identity.legacy_base_class_family || identity.rank_i_base_class || identity.base_class_family || activeLineage[0] || card.class_group || card.class || '').trim();
}

function legacyCandidateIdsForDefeatedHero(state, playerId, slot, defeatedHero) {
  const player = getPlayer(state, playerId);
  const legacyDeck = Array.isArray(player && player.legacy_deck) ? player.legacy_deck : [];
  const out = [];
  function add(id) { if (id && legacyDeck.includes(id) && !out.includes(id)) out.push(id); }
  if (!defeatedHero) return out;
  add(defeatedHero.assigned_legacy_card_id);
  const defeatedCard = getCard(state, defeatedHero.card_id);
  const base = baseClassFamilyForHeroCard(defeatedCard).toLowerCase();
  for (const id of legacyDeck) {
    const c = getCard(state, id);
    if (!c) continue;
    const family = String(c.card_family || c.card_type || '').toLowerCase();
    const mode = String(c.identity_mode || '').toLowerCase();
    if (family !== 'legacy' && !mode.includes('legacy')) continue;
    const eligibility = c.eligibility || {};
    const legacyBase = String(eligibility.base_class_family || c.class_group || c.class_family || '').toLowerCase();
    if (base && legacyBase && legacyBase === base) add(id);
  }
  if (!out.length && defeatedHero.assigned_legacy_card_id && getCard(state, defeatedHero.assigned_legacy_card_id)) out.push(defeatedHero.assigned_legacy_card_id);
  return out;
}

function activeHeroSlotCount(player) {
  let count = 0;
  for (const slot of SLOT_ORDER) {
    const s = player && player.board && player.board[slot];
    if (s && s.slot_mode === 'HERO' && s.hero && !s.hero.defeated && Number(s.hero.hp || 0) > 0) count += 1;
  }
  return count;
}

function cleanupDefeatedHeroRuntimeAttachments(player, slot) {
  if (!player || !Array.isArray(player.attachments)) return [];
  const normalized=normalizeSlotKey(slot),kept=[],removed=[];
  for(const att of player.attachments){
    const hostKeys=['source_slot','host_slot','protected_slot'];
    const hosted=hostKeys.some(key=>normalizeSlotKey(att&&att[key])===normalized) || att&&att.effect_result&&hostKeys.some(key=>normalizeSlotKey(att.effect_result[key])===normalized);
    if(hosted) removed.push(att); else kept.push(att);
  }
  player.attachments=kept;
  for(const att of removed) if(att.card_id) player.discard_pile.push(att.card_id);
  return removed;
}



function cleanupConfirmedDefeatRuntimeState(next, playerId, slotRaw, hero, events) {
  const player = getPlayer(next, playerId);
  const slot = normalizeSlotKey(slotRaw);
  if (!player || !hero) return { attachments: [], statuses_cleared: 0, casting_canceled: 0 };
  const removed = cleanupDefeatedHeroRuntimeAttachments(player, slot);
  const removedCasting = removed.filter(att => att && String(att.attachment_state || '').toUpperCase() === 'CASTING');
  const removedIds = new Set(removedCasting.map(att => att.attachment_id).filter(Boolean));
  const beforeQueue = Array.isArray(next.continuation_queue) ? next.continuation_queue.length : 0;
  if (Array.isArray(next.continuation_queue)) next.continuation_queue = next.continuation_queue.filter(item => {
    if (!item || item.type !== 'casting_release') return true;
    const ar = item.attack_resolution || {};
    return !(item.player_id === playerId && normalizeSlotKey(ar.source_slot) === slot);
  });
  if (next.pending_attack_resolution && next.pending_attack_resolution.casting && next.pending_attack_resolution.attacking_player_id === playerId && normalizeSlotKey(next.pending_attack_resolution.source_slot) === slot) next.pending_attack_resolution = null;
  const statusesCleared = Array.isArray(hero.statuses) ? hero.statuses.length : 0;
  hero.statuses = [];
  hero.casting = false;
  hero.pending_casting = false;
  if (Array.isArray(hero.attachments)) hero.attachments = hero.attachments.map(() => null);
  for (const att of removedCasting) events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: playerId, card_id: att.card_id, source_slot: slot,
    target_player_id: att.target_player_id || getOpponentId(next, playerId), target_slot: att.target_slot,
    payload: { result: 'CASTING_CANCELED', reason: 'Source Hero was defeated before Casting release.', attachment_id: att.attachment_id, no_damage: true }
  }));
  return { attachments: removed, statuses_cleared: statusesCleared, casting_canceled: removedCasting.length + Math.max(0, beforeQueue - (next.continuation_queue || []).length), removed_casting_attachment_ids: Array.from(removedIds) };
}

function runtimeHeroRankNumber(state, hero) {
  if (!hero) return 1;
  const c = getCard(state, hero.card_id) || {};
  const identity = c.identity || {};
  const raw = hero.rank ?? c.rank ?? identity.rank ?? identity.hero_rank ?? c.class_rank ?? identity.class_rank ?? '';
  const t = String(raw).trim().toUpperCase();
  if (/^(3|III|RANK\s*III|RANK\s*3)$/.test(t) || /RANK\s*(III|3)/.test(t)) return 3;
  if (/^(2|II|RANK\s*II|RANK\s*2)$/.test(t) || /RANK\s*(II|2)/.test(t)) return 2;
  const label = String(c.name || c.class_name || identity.class_name || '').toLowerCase();
  if (/grand |lord|saint|conqueror|sovereign|crusader/.test(label)) return 3;
  if (/elementalist|gladiator|priest|ranger|arbalest|assassin/.test(label)) return 2;
  return 1;
}

function inherentRankExpForHero(state, hero) {
  const rank = runtimeHeroRankNumber(state, hero);
  return rank >= 3 ? 700 : (rank >= 2 ? 300 : 0);
}

function clearConfirmedDefeatExp(next, playerId, slotRaw, hero, events, reason) {
  const player = getPlayer(next, playerId);
  const slot = normalizeSlotKey(slotRaw);
  if (!player || !hero) return [];
  const expCards = Array.isArray(hero.exp_cards) ? hero.exp_cards.slice() : [];
  const moved = [];
  for (const entry of expCards) {
    const id = expCardId(entry);
    if (!id) continue;
    player.discard_pile.push(id);
    moved.push(id);
    if (Array.isArray(events)) events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED, next, {
      player_id: playerId,
      card_id: id,
      target_player_id: playerId,
      target_slot: slot,
      payload: { from: 'Hero EXP Stack', to: 'Discard Pile', reason: reason || 'CONFIRMED_DEFEAT_EXP_CLEANUP', rank_down: false }
    }));
  }
  hero.exp_cards = [];
  hero.exp_total = inherentRankExpForHero(next, hero);
  return moved;
}

function queueHeroDefeatLegacyChoice(next, playerId, slotRaw, slotState, events, defeatedByCardId) {
  const player = getPlayer(next, playerId);
  const slot = normalizeSlotKey(slotRaw);
  const hero = slotState && slotState.hero;
  if (!player || !slotState || !hero) return false;
  // Stoneblood is a universal would-be-defeated replacement. Route every damage/defeat path
  // through this gate before the Hero is marked defeated or Legacy custody begins.
  const stonebloodDeclined = String(defeatedByCardId || '').toLowerCase().includes('stoneblood declined');
  if (!stonebloodDeclined && !hero.pending_defeat && canUseStonebloodPreventDefeat(next, playerId, slotState) && !stonebloodAlreadyUsedThisTurn(slotState, next)) {
    return openStonebloodPreventDefeatChoice(next, playerId, slot, slotState, events, defeatedByCardId);
  }
  const choiceId = `${playerId}:${slot}:${hero.card_id}:${Number(next.round || 0)}`;
  const alreadyPending = next.pending && next.pending.type === 'legacy_defeat_choice' && next.pending.choice_id === choiceId;
  const alreadyQueued = (next.pending_legacy_defeat_queue || []).some(choice => choice && choice.choice_id === choiceId);
  const alreadyResolved = (next.resolved_legacy_choice_ids || []).includes(choiceId);
  if (alreadyPending || alreadyQueued || alreadyResolved || (slotState.slot_mode === 'LEGACY')) return true;
  hero.hp = Math.max(0, Number(hero.hp || 0));
  hero.defeated = true;
  hero.exhausted = true;
  // Confirmed defeat owns complete Hero cleanup after replacement checks. Casting is
  // an Attachment and must be canceled now; revive cannot restore any connected state.
  const defeatedCleanup = cleanupConfirmedDefeatRuntimeState(next, playerId, slot, hero, events);
  const defeatedExpMoved = clearConfirmedDefeatExp(next, playerId, slot, hero, events, 'CONFIRMED_DEFEAT');
  const candidates = legacyCandidateIdsForDefeatedHero(next, playerId, slot, hero);
  events.push(createRuntimeEvent(EVENT_TYPES.HERO_DEFEATED, next, {
    player_id: playerId,
    card_id: hero.card_id,
    target_player_id: playerId,
    target_slot: slot,
    payload: { defeated_by_card_id: defeatedByCardId, slot_mode: slotState.slot_mode, legacy_choice_required: candidates.length > 0, legacy_candidates: candidates.slice(), exp_moved_to_discard: defeatedExpMoved.length, attachments_discarded: defeatedCleanup.attachments.length, statuses_cleared: defeatedCleanup.statuses_cleared, casting_canceled: defeatedCleanup.casting_canceled }
  }));
  if (activeHeroSlotCount(player) <= 0) {
    applyLoseCheckAfterDamage(next, playerId, events);
    return true;
  }
  if (!candidates.length) return true;
  const pendingChoice = {
    type: 'legacy_defeat_choice',
    player_id: playerId,
    slot,
    defeated_card_id: hero.card_id,
    defeated_snapshot: deepClone(hero),
    candidates,
    selected_index: null,
    selected_legacy_card_id: null,
    defeated_by_card_id: defeatedByCardId,
    choice_id: choiceId
  };
  if (next.pending && next.pending.type === 'legacy_defeat_choice') {
    if (!Array.isArray(next.pending_legacy_defeat_queue)) next.pending_legacy_defeat_queue = [];
    next.pending_legacy_defeat_queue.push(pendingChoice);
  } else {
    next.pending = pendingChoice;
  }
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: playerId,
    card_id: hero.card_id,
    target_player_id: playerId,
    target_slot: slot,
    payload: { result: 'LEGACY_DEFEAT_CHOICE_OPENED', candidates: candidates.slice(), defeated_by_card_id: defeatedByCardId }
  }));
  return true;
}

function transitionPendingDefeatedHeroToLegacy(next, pending, legacyCardId, events) {
  const player = getPlayer(next, pending.player_id);
  const slot = normalizeSlotKey(pending.slot);
  const slotState = player && player.board && player.board[slot];
  if (!player || !slotState) return { ok: false, errors: ['Legacy choice target slot no longer exists.'] };
  if (slotState.slot_mode === 'LEGACY') return { ok: false, errors: ['Legacy choice was already resolved for this slot.'] };
  const candidates = pending.candidates || [];
  const chosen = legacyCardId || pending.selected_legacy_card_id || candidates[pending.selected_index || 0];
  if (!chosen || !candidates.includes(chosen)) return { ok: false, errors: ['Selected Legacy card is not legal for this defeated Hero.'] };
  const defeatedSnapshot = pending.defeated_snapshot || slotState.hero || { card_id: pending.defeated_card_id };
  const legacyIdx = (player.legacy_deck || []).indexOf(chosen);
  if (legacyIdx >= 0) player.legacy_deck.splice(legacyIdx, 1);
  cleanupConfirmedDefeatRuntimeState(next, pending.player_id, slot, slotState.hero || defeatedSnapshot, events);
  // Backward-compatible fallback for an older pending state. Sanitize the stored
  // snapshot as well so revive cannot restore Casting, status, or Attachment state.
  clearConfirmedDefeatExp(next, pending.player_id, slot, slotState.hero || defeatedSnapshot, events, 'LEGACY_TRANSITION_FALLBACK');
  defeatedSnapshot.exp_cards = [];
  defeatedSnapshot.exp_total = inherentRankExpForHero(next, defeatedSnapshot);
  defeatedSnapshot.statuses = [];
  defeatedSnapshot.casting = false;
  defeatedSnapshot.pending_casting = false;
  if (Array.isArray(defeatedSnapshot.attachments)) defeatedSnapshot.attachments = defeatedSnapshot.attachments.map(() => null);
  slotState.slot_mode = 'LEGACY';
  slotState.hero = null;
  slotState.card_id = chosen;
  slotState.legacy_card_id = chosen;
  slotState.active_legacy_card_id = chosen;
  slotState.defeated_hero_snapshot = deepClone(defeatedSnapshot);
  slotState.original_hero_card_id = defeatedSnapshot.card_id || pending.defeated_card_id;
  events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED, next, {
    player_id: pending.player_id,
    card_id: chosen,
    target_player_id: pending.player_id,
    target_slot: slot,
    payload: { from: 'Legacy Deck', to: 'Legacy Slot', defeated_card_id: pending.defeated_card_id }
  }));
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: pending.player_id,
    card_id: chosen,
    target_player_id: pending.player_id,
    target_slot: slot,
    payload: { result: 'LEGACY_MODE_ENTERED', defeated_card_id: pending.defeated_card_id, attachments_discarded: true, exp_moved_to_discard: (defeatedSnapshot.exp_cards || []).length }
  }));
  applyLoseCheckAfterDamage(next, pending.player_id, events);
  return { ok: true, errors: [] };
}

function selectLegacyCardForDefeat(state, intent) {
  if (!state.pending || state.pending.type !== 'legacy_defeat_choice') return { state, events: [], errors: ['No pending Legacy defeat choice.'] };
  if (state.pending.player_id !== intent.player_id) return { state, events: [], errors: ['Only the defeated Hero owner may choose Legacy.'] };
  const idxRaw = intent.legacy_index ?? intent.selected_index ?? (intent.payload && (intent.payload.legacy_index ?? intent.payload.selected_index));
  const legacyCardId = intent.legacy_card_id || intent.card_id || (intent.payload && (intent.payload.legacy_card_id || intent.payload.card_id));
  const next = deepClone(state);
  const pending = next.pending;
  let idx = Number.isInteger(idxRaw) ? idxRaw : (legacyCardId ? (pending.candidates || []).indexOf(legacyCardId) : -1);
  if (idx < 0 || idx >= (pending.candidates || []).length) return { state, events: [], errors: ['Invalid Legacy choice.'] };
  pending.selected_index = idx;
  pending.selected_legacy_card_id = pending.candidates[idx];
  const event = createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, { player_id: intent.player_id, card_id: pending.selected_legacy_card_id, target_slot: pending.slot, payload: { result: 'LEGACY_DEFEAT_CHOICE_SELECTED', selected_index: idx } });
  return { state: appendEvents(next, event), events: [event], errors: [] };
}

function confirmLegacyChoice(state, intent) {
  if (!state.pending || state.pending.type !== 'legacy_defeat_choice') return { state, events: [], errors: ['No pending Legacy defeat choice to confirm.'] };
  if (state.pending.player_id !== intent.player_id) return { state, events: [], errors: ['Only the defeated Hero owner may confirm Legacy.'] };
  const next = deepClone(state);
  const events = [];
  const pending = next.pending;
  const legacyCardId = intent.legacy_card_id || intent.card_id || (intent.payload && (intent.payload.legacy_card_id || intent.payload.card_id)) || pending.selected_legacy_card_id || (pending.candidates || [])[pending.selected_index || 0];
  const choiceId = pending.choice_id || `${pending.player_id}:${normalizeSlotKey(pending.slot)}:${pending.defeated_card_id}:${Number(next.round || 0)}`;
  if ((next.resolved_legacy_choice_ids || []).includes(choiceId)) return { state, events: [], errors: ['Legacy choice was already confirmed.'] };
  const result = transitionPendingDefeatedHeroToLegacy(next, pending, legacyCardId, events);
  if (!result.ok) return { state, events: [], errors: result.errors };
  next.resolved_legacy_choice_ids = Array.from(new Set([...(next.resolved_legacy_choice_ids || []), choiceId]));
  const queue = Array.isArray(next.pending_legacy_defeat_queue) ? next.pending_legacy_defeat_queue : [];
  next.pending = queue.length ? queue.shift() : null;
  next.pending_legacy_defeat_queue = queue;
  if (!next.pending) {
    const resumedAttack = resumePendingAttackAfterMandatoryChoice(next, events);
    if (!resumedAttack) activateNextContinuationIfPossible(next, events);
  }
  return { state: appendEvents(next, events), events, errors: [] };
}

function drawCardsForPlayer(next, playerId, count, events, source, options) {
  const player = next.players && next.players[playerId];
  if (!player) return 0;
  const visibility = options || {};
  let drawn = 0;
  for (let i = 0; i < Number(count || 0); i += 1) {
    if (!player.main_deck.length) break;
    const cardId = player.main_deck.shift();
    player.hand.push(cardId);
    drawn += 1;
    events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED, next, {
      player_id: playerId,
      card_id: cardId,
      payload: { from: 'Main Deck', to: 'Hand', source: source || 'card_effect', visibility: visibility.visibility || 'owner_only', opponent_played: visibility.opponent_played === true, pure_draw: true, deck_out_loss: false }
    }));
  }
  recordCardsDrawn(player, drawn);
  incrementDrawCounterCastings(next, playerId, drawn, events);
  return drawn;
}

const CONNECTED_HIT_MANA_CARD_IDS = new Set(['S1-MAG-021', 'S1-MAG-023', 'S1-MAG-024']);

function attackUsesConnectedHitManaDrain(attackResolution) {
  if (!attackResolution) return false;
  return CONNECTED_HIT_MANA_CARD_IDS.has(attackResolution.card_id) || Boolean(attackResolution.aether_infusion_mana_remove || attackResolution.aether_infusion_mana_connected_hit);
}

function connectedHitManaTargets(next, attackResolution, damagedTargets) {
  if (!attackUsesConnectedHitManaDrain(attackResolution)) return damagedTargets || [];
  if (Array.isArray(damagedTargets) && damagedTargets.length) return damagedTargets;
  const response = attackResolution.response_result || null;
  if (!response || response.type !== 'BLOCK') return [];
  if (responseNegatesAttack(response.type) || response.type === 'PREVENT_ALL_ATTACK_DAMAGE') return [];
  const hits = [];
  for (const target of attackResolution.targets || []) {
    if (responseDodgesDamageTarget(attackResolution, target)) continue;
    const targetPlayer = next.players && next.players[target.target_player_id];
    const slotState = targetPlayer && targetPlayer.board && targetPlayer.board[target.target_slot];
    if (!slotState || slotState.slot_mode !== 'HERO' || !slotState.hero || slotState.hero.defeated) continue;
    hits.push(finalHpDamageEntry(target, 0, Number(slotState.hero.hp || 0), Number(slotState.hero.hp || 0), 'connected_hit_blocked_to_zero'));
  }
  return hits;
}

function aetherSweepManaHitTargets(next, attackResolution, damagedTargets) {
  if (!attackResolution || attackResolution.card_id !== 'S1-MAG-024') return damagedTargets || [];
  return connectedHitManaTargets(next, attackResolution, damagedTargets);
}

function applyOnHitAfterDamageTriggers(next, attackResolution, damagedTargets, events) {
  const connectedManaHitTargets = connectedHitManaTargets(next, attackResolution, damagedTargets);
  const aetherSweepHitTargets = attackResolution && attackResolution.card_id === 'S1-MAG-024' ? connectedManaHitTargets : [];
  if (attackResolution && attackResolution.card_id === 'S1-CLE-010') {
    const pseudoPending={player_id:attackResolution.attacking_player_id,source_slot:attackResolution.source_slot,card_id:attackResolution.card_id};
    applyHealAllEffect(next, pseudoPending, {
      card_id: attackResolution.card_id,
      execution: {
        targeting: { target_scope: 'all_allied_heroes' },
        effects: [{ kind: 'heal_allied_heroes', amount: 20, target_scope: 'all_allied_heroes' }]
      }
    }, events);
  }
  if ((!damagedTargets || !damagedTargets.length) && (!connectedManaHitTargets || !connectedManaHitTargets.length)) return;
  const attacker = next.players && next.players[attackResolution.attacking_player_id];
  if (!attacker) return;
  const sourceSlotState = attacker.board && attacker.board[attackResolution.source_slot];
  const sourceHero = sourceSlotState && sourceSlotState.hero;
  if (attackResolution.card_id === 'S1-CLE-020' && sourceHero && !sourceHero.defeated && Number(sourceHero.hp||0)<Number(sourceHero.max_hp||100) && !heroHasStatus(sourceSlotState,'Bleed')) {
    const beforeHp = Number(sourceHero.hp || 0);
    const modifierAmount = activeHealingReceivedModifierAmount(next, attackResolution.attacking_player_id, attackResolution.source_slot, events, attackResolution.card_id);
    const healAmount = 20 + modifierAmount;
    const afterHp = Math.min(Number(sourceHero.max_hp || 100), beforeHp + healAmount);
    sourceHero.hp = afterHp;
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
      player_id: attackResolution.attacking_player_id,
      card_id: attackResolution.card_id,
      source_slot: attackResolution.source_slot,
      payload: { result: 'ON_HIT_SELF_HEAL_RESOLVED', heal_amount: healAmount, base_heal_amount: 20, healing_modifier_amount: modifierAmount, before_hp: beforeHp, after_hp: afterHp }
    }));
  }
  if (attackResolution.card_id === 'S1-MAG-021' && connectedManaHitTargets.length) {
    const cls = String(attackResolution.source_hero_class || '').toLowerCase();
    if (/spell blade|arcane duelist/.test(cls)) {
      transferManaFromOpponentToController(next, attackResolution.attacking_player_id, attackResolution.defending_player_id, 1, events, attackResolution.card_id, attackResolution.source_slot, 'Mana Absorption on-hit mana steal');
    }
  }
  if (attackResolution.card_id === 'S1-MAG-023' && connectedManaHitTargets.length) {
    const cls = String(attackResolution.source_hero_class || '').toLowerCase();
    const removeAmount = cls.includes('arcane duelist') ? 3 : 1;
    removeManaFromOpponent(next, attackResolution.attacking_player_id, attackResolution.defending_player_id, removeAmount, events, attackResolution.card_id, attackResolution.source_slot, 'Aether Slash on-hit mana removal');
  }
  if (attackResolution.card_id === 'S1-MAG-024') {
    const hits = Math.max(0, Array.isArray(aetherSweepHitTargets) ? aetherSweepHitTargets.length : 0);
    if (hits > 0) {
      removeManaFromOpponent(next, attackResolution.attacking_player_id, attackResolution.defending_player_id, hits, events, attackResolution.card_id, attackResolution.source_slot, 'Aether Sweep per-hit mana removal');
    }
  }
  if ((attackResolution.aether_infusion_mana_remove || attackResolution.aether_infusion_mana_connected_hit) && connectedManaHitTargets.length) {
    removeManaFromOpponent(next, attackResolution.attacking_player_id, attackResolution.defending_player_id, Number(attackResolution.aether_infusion_mana_remove || attackResolution.aether_infusion_mana_connected_hit || 1), events, 'S1-MAG-022', attackResolution.source_slot, 'Aether Infusion converted attack connected-hit mana removal');
  }
  if (attackResolution.card_id === 'S1-THF-029') {
    const drawn = drawCardsForPlayer(next, attackResolution.attacking_player_id, 1, events, 'Flash Combo on-hit draw');
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
      player_id: attackResolution.attacking_player_id,
      card_id: attackResolution.card_id,
      source_slot: attackResolution.source_slot,
      payload: { result: 'ON_HIT_DRAW_RESOLVED', draw_count: drawn }
    }));
  }
}


const POST_HIT_SOURCE_FRONT_REPOSITION_CARDS = new Set(['S1-THF-002', 'S1-THF-019', 'S1-THF-025', 'S1-WAR-015', 'S1-WAR-024']);

function adjacentSlots(slot) {
  const normalized = normalizeSlotKey(slot);
  if (normalized === 'Left') return ['Center'];
  if (normalized === 'Center') return ['Left', 'Right'];
  if (normalized === 'Right') return ['Center'];
  return [];
}

function swapBoardSlotsWithoutExhaust(board, firstSlotRaw, secondSlotRaw, options = {}) {
  const firstSlot = normalizeSlotKey(firstSlotRaw);
  const secondSlot = normalizeSlotKey(secondSlotRaw);
  const heroOnly = options.hero_only !== false;
  if (!SLOT_ORDER.includes(firstSlot) || !SLOT_ORDER.includes(secondSlot)) return { ok: false, errors: ['Card-effect reposition requires valid board slots.'] };
  if (firstSlot === secondSlot) return { ok: false, errors: ['Card-effect reposition cannot target the same slot.'] };
  const first = board && board[firstSlot];
  const second = board && board[secondSlot];
  if (!first || !second) return { ok: false, errors: ['Both card-effect reposition slots must exist.'] };
  const firstHero = first.slot_mode === 'HERO' && first.hero && !first.hero.defeated;
  const secondHero = second.slot_mode === 'HERO' && second.hero && !second.hero.defeated;
  if (heroOnly && (!firstHero || !secondHero)) return { ok: false, errors: ['Card text says Hero; both card-effect swap slots must be active HERO slots.'] };
  if (!heroOnly && first.slot_mode === 'LEGACY' && second.slot_mode === 'LEGACY') return { ok: false, errors: ['Card-effect reposition cannot swap Legacy with Legacy.'] };
  const nextBoard = deepClone(board || {});
  nextBoard[firstSlot] = Object.assign({}, second, { slot: firstSlot });
  nextBoard[secondSlot] = Object.assign({}, first, { slot: secondSlot });
  return { ok: true, board: nextBoard, no_op: false, first_slot: firstSlot, second_slot: secondSlot };
}

function remapSlotValueForSwap(value, firstSlotRaw, secondSlotRaw) {
  const firstSlot = normalizeSlotKey(firstSlotRaw);
  const secondSlot = normalizeSlotKey(secondSlotRaw);
  const normalized = normalizeSlotKey(value);
  if (normalized === firstSlot) return secondSlot;
  if (normalized === secondSlot) return firstSlot;
  return value;
}

function remapHeroHostedAttachmentsForSlotSwap(player, firstSlotRaw, secondSlotRaw, events, nextState, playerId) {
  if (!player || !Array.isArray(player.attachments)) return;
  const firstSlot = normalizeSlotKey(firstSlotRaw);
  const secondSlot = normalizeSlotKey(secondSlotRaw);
  const kept = [];
  for (const attachment of player.attachments) {
    const host = normalizeSlotKey(attachment.host_slot || attachment.source_slot || attachment.target_slot);
    if (attachment.attachment_state === 'CASTING' && (host === firstSlot || host === secondSlot)) {
      attachment.casting_cancelled_by_movement = true;
      attachment.cancel_reason = 'Source Hero moved before Casting release.';
      if (nextState && events) cancelCastingAttachment(nextState, playerId, attachment, events, attachment.cancel_reason);
      else kept.push(attachment);
      continue;
    }
    const mapped = Object.assign({}, attachment);
    for (const key of ['source_slot', 'host_slot', 'protected_slot']) if (mapped[key]) mapped[key] = remapSlotValueForSwap(mapped[key], firstSlot, secondSlot);
    kept.push(mapped);
  }
  player.attachments = kept;
}

function attackStoppedBeforeSuccessfulResolution(attackResolution) {
  const response = attackResolution && attackResolution.response_result;
  if (!response) return false;
  if (responseNegatesAttack(response.type)) return true;
  if (response.type === 'DODGE') return true;
  if (response.type === 'PREVENT_ALL_ATTACK_DAMAGE') return true;
  return false;
}

function applyPostHitRepositionEffect(next, attackResolution, damagedTargets, events) {
  if (!attackResolution) return false;
  const actualHpDamage = Boolean(damagedTargets && damagedTargets.length);
  const attackStopped = attackStoppedBeforeSuccessfulResolution(attackResolution);
  const options = attackResolution.post_hit_reposition || {};
  const cardId = attackResolution.card_id;

  if (POST_HIT_SOURCE_FRONT_REPOSITION_CARDS.has(cardId)) {
    const forced = false;
    if (attackStopped) return false;
    const requested = options.apply === true || options.apply === 'true' || options.enabled === true;
    if (!requested) return false;
    const attacker = next.players && next.players[attackResolution.attacking_player_id];
    if (!attacker || !attacker.board) return false;
    const sourceSlot = normalizeSlotKey(attackResolution.source_slot);
    const swapWithSlot = normalizeSlotKey(options.swap_with_slot || options.allied_slot || attackResolution.target_slot);
    const allowLegacyPartner = true;
    const moved = swapBoardSlotsWithoutExhaust(attacker.board, sourceSlot, swapWithSlot, { hero_only: !allowLegacyPartner });
    if (!moved.ok) {
      events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
        player_id: attackResolution.attacking_player_id,
        card_id: cardId,
        source_slot: sourceSlot,
        target_slot: attackResolution.target_slot,
        payload: { result: 'POST_HIT_REPOSITION_FAILED', errors: moved.errors }
      }));
      return false;
    }
    if (!moved.no_op) { attacker.board = moved.board; remapHeroHostedAttachmentsForSlotSwap(attacker, moved.first_slot, moved.second_slot, events, next, attackResolution.attacking_player_id); }
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
      player_id: attackResolution.attacking_player_id,
      card_id: cardId,
      source_slot: sourceSlot,
      target_slot: attackResolution.target_slot,
      payload: {
        result: moved.no_op ? 'POST_HIT_REPOSITION_NO_OP' : 'POST_HIT_REPOSITION_RESOLVED',
        reposition_model: 'source_swaps_with_allied_front_lane',
        first_slot: sourceSlot,
        second_slot: swapWithSlot,
        forced,
        exhaust_from_reposition: false
      }
    }));
    return true;
  }

  if (cardId === 'S1-ARC-016') {
    if (!actualHpDamage || attackStopped) return false;
    const opponentSlot = normalizeSlotKey(options.swap_target_with_slot || options.opponent_slot);
    if (!SLOT_ORDER.includes(opponentSlot)) return false;
    const targetSlot = normalizeSlotKey(attackResolution.target_slot);
    if (!adjacentSlots(targetSlot).includes(opponentSlot)) {
      events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
        player_id: attackResolution.attacking_player_id,
        card_id: cardId,
        target_player_id: attackResolution.defending_player_id,
        target_slot: targetSlot,
        payload: { result: 'POST_HIT_OPPONENT_REPOSITION_FAILED', reason: 'Selected opponent slot is not adjacent to the hit target.', selected_slot: opponentSlot }
      }));
      return false;
    }
    const defender = next.players && next.players[attackResolution.defending_player_id];
    const moved = defender && swapBoardSlotsWithoutExhaust(defender.board, targetSlot, opponentSlot, { hero_only: true });
    if (!moved || !moved.ok) return false;
    if (!moved.no_op) { defender.board = moved.board; remapHeroHostedAttachmentsForSlotSwap(defender, moved.first_slot, moved.second_slot, events, next, attackResolution.defending_player_id); }
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
      player_id: attackResolution.attacking_player_id,
      card_id: cardId,
      target_player_id: attackResolution.defending_player_id,
      target_slot: targetSlot,
      payload: {
        result: moved.no_op ? 'POST_HIT_OPPONENT_REPOSITION_NO_OP' : 'POST_HIT_OPPONENT_REPOSITION_RESOLVED',
        reposition_model: 'target_swaps_with_adjacent_opponent_hero',
        first_slot: targetSlot,
        second_slot: opponentSlot,
        exhaust_from_reposition: false
      }
    }));
    return true;
  }

  if (cardId === 'S1-THF-023') {
    if (attackStopped) return false;
    const requested = options.apply === true || options.apply === 'true' || options.enabled === true;
    const swapWithSlot = normalizeSlotKey(options.swap_with_slot || options.allied_slot);
    if (!requested || !SLOT_ORDER.includes(swapWithSlot)) return false;
    const attacker = next.players && next.players[attackResolution.attacking_player_id];
    const sourceSlot = normalizeSlotKey(attackResolution.source_slot);
    const moved = attacker && swapBoardSlotsWithoutExhaust(attacker.board, sourceSlot, swapWithSlot, { hero_only: true });
    if (!moved || !moved.ok) return false;
    if (!moved.no_op) { attacker.board = moved.board; remapHeroHostedAttachmentsForSlotSwap(attacker, moved.first_slot, moved.second_slot, events, next, attackResolution.attacking_player_id); }
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
      player_id: attackResolution.attacking_player_id,
      card_id: cardId,
      source_slot: sourceSlot,
      payload: {
        result: moved.no_op ? 'POST_HIT_REPOSITION_NO_OP' : 'POST_HIT_REPOSITION_RESOLVED',
        reposition_model: 'source_swaps_with_chosen_allied_hero',
        first_slot: sourceSlot,
        second_slot: swapWithSlot,
        exhaust_from_reposition: false
      }
    }));
    return true;
  }

  return false;
}

function postHitRepositionExplicitlyDeclined(attackResolution) {
  const options = attackResolution && attackResolution.post_hit_reposition;
  if (!options || typeof options !== 'object') return false;
  return options.skip === true || options.skip === 'true' || options.apply === false || options.apply === 'false' || options.enabled === false;
}

function hasExplicitPostHitRepositionApply(attackResolution) {
  const options = attackResolution && attackResolution.post_hit_reposition;
  if (!options || typeof options !== 'object') return false;
  return options.apply === true || options.apply === 'true' || options.enabled === true;
}

function activeHeroInSlot(board, slotRaw) {
  const slot = normalizeSlotKey(slotRaw);
  const slotState = board && board[slot];
  return Boolean(slotState && slotState.slot_mode === 'HERO' && slotState.hero && !slotState.hero.defeated);
}

function activeHeroOrLegacyInSlot(board, slotRaw) {
  const slot = normalizeSlotKey(slotRaw);
  const slotState = board && board[slot];
  if (!slotState) return false;
  if (slotState.slot_mode === 'LEGACY') return true;
  return Boolean(slotState.slot_mode === 'HERO' && slotState.hero && !slotState.hero.defeated);
}

function legalPostAttackRepositionChoices(next, attackResolution, damagedTargets) {
  if (!attackResolution || attackStoppedBeforeSuccessfulResolution(attackResolution)) return [];
  if (postHitRepositionExplicitlyDeclined(attackResolution)) return [];
  const cardId = attackResolution.card_id;
  const choices = [];
  const sourceSlot = normalizeSlotKey(attackResolution.source_slot);
  const targetSlot = normalizeSlotKey(attackResolution.target_slot);
  if (POST_HIT_SOURCE_FRONT_REPOSITION_CARDS.has(cardId)) {
    const attacker = next.players && next.players[attackResolution.attacking_player_id];
    const frontSlot = targetSlot;
    const allowLegacyPartner = true;
    const partnerIsLegal = activeHeroOrLegacyInSlot(attacker && attacker.board, frontSlot);
    if (attacker && SLOT_ORDER.includes(sourceSlot) && SLOT_ORDER.includes(frontSlot) && sourceSlot !== frontSlot && activeHeroInSlot(attacker.board, sourceSlot) && partnerIsLegal) {
      choices.push({
        choice_index: choices.length,
        player_id: attackResolution.attacking_player_id,
        target_player_id: attackResolution.attacking_player_id,
        first_slot: sourceSlot,
        second_slot: frontSlot,
        label: allowLegacyPartner ? `Swap ${sourceSlot} with allied Hero or Legacy in ${frontSlot}` : `Swap ${sourceSlot} with allied Hero in ${frontSlot}`,
        reposition_model: 'source_swaps_with_allied_front_lane',
        allow_legacy_partner: allowLegacyPartner
      });
    }
  }
  if (cardId === 'S1-THF-023') {
    const attacker = next.players && next.players[attackResolution.attacking_player_id];
    if (attacker && SLOT_ORDER.includes(sourceSlot) && activeHeroInSlot(attacker.board, sourceSlot)) {
      for (const slot of SLOT_ORDER) {
        if (slot !== sourceSlot && activeHeroOrLegacyInSlot(attacker.board, slot)) {
          choices.push({
            choice_index: choices.length,
            player_id: attackResolution.attacking_player_id,
            target_player_id: attackResolution.attacking_player_id,
            first_slot: sourceSlot,
            second_slot: slot,
            label: `Swap ${sourceSlot} with allied Hero in ${slot}`,
            reposition_model: 'source_swaps_with_chosen_allied_hero'
          });
        }
      }
    }
  }
  if (cardId === 'S1-ARC-016') {
    const connectedHit = secondaryRepositionTriggerSatisfied(attackResolution, damagedTargets);
    const defender = next.players && next.players[attackResolution.defending_player_id];
    if (connectedHit && defender && activeHeroOrLegacyInSlot(defender.board, targetSlot)) {
      for (const slot of adjacentSlots(targetSlot)) {
        const targetState = defender.board && defender.board[targetSlot];
        const partnerState = defender.board && defender.board[slot];
        if (activeHeroOrLegacyInSlot(defender.board, slot) && !(targetState && targetState.slot_mode === 'LEGACY' && partnerState && partnerState.slot_mode === 'LEGACY')) {
          choices.push({
            choice_index: choices.length,
            player_id: attackResolution.attacking_player_id,
            target_player_id: attackResolution.defending_player_id,
            first_slot: targetSlot,
            second_slot: slot,
            label: `Swap hit opponent Hero in ${targetSlot} with adjacent ${slot}`,
            reposition_model: 'target_swaps_with_adjacent_opponent_hero'
          });
        }
      }
    }
  }
  return choices.map((choice, index) => Object.assign({}, choice, { choice_index: index }));
}

function secondaryRepositionTriggerSatisfied(attackResolution, damagedTargets) {
  if (!attackResolution || attackResolution.attack_negated) return false;
  const primaryTarget = (attackResolution.targets || [])[0] || (attackResolution.target_player_id && attackResolution.target_slot ? { target_player_id: attackResolution.target_player_id, target_slot: attackResolution.target_slot } : null);
  const response = primaryTarget ? responseResultForTarget(attackResolution, primaryTarget) : attackResolution.response_result;
  const stopped = response && (responseNegatesAttack(response.type) || response.type === 'DODGE');
  if (stopped) return false;
  if (swapPolicy.requiresHpDamageForSwap(attackResolution.card_id)) return (damagedTargets || []).some(t => Number(t.final_hp_damage || 0) > 0);
  return true;
}

function queuePostAttackRepositionContinuation(next, attackResolution, damagedTargets, events) {
  const model = swapPolicy.swapModelForCard(attackResolution && attackResolution.card_id);
  if (!model || !secondaryRepositionTriggerSatisfied(attackResolution, damagedTargets)) return false;
  next.continuation_queue = next.continuation_queue || [];
  next.continuation_queue.push({ type:'post_attack_reposition', card_id:attackResolution.card_id, player_id:attackResolution.attacking_player_id, attack_resolution:deepClone(attackResolution), damaged_targets:deepClone(damagedTargets || []) });
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED,next,{player_id:attackResolution.attacking_player_id,card_id:attackResolution.card_id,payload:{result:'SECONDARY_REPOSITION_QUEUED',survives_defeat_and_legacy:true,trigger_mode:swapPolicy.requiresHpDamageForSwap(attackResolution.card_id)?'actual_hp_damage':'connected'}}));
  return true;
}

function finishQueuedAttackCard(next, continuation, events) {
  const player=next.players&&next.players[continuation.player_id];
  if(player && !player.discard_pile.includes(continuation.card_id)) player.discard_pile.push(continuation.card_id);
  events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED,next,{player_id:continuation.player_id,card_id:continuation.card_id,payload:{from:'Pending Attack Resolution',to:'Discard Pile',after_secondary_effect:true}}));
  runDeferredLoseChecks(next, events);
}

function activateNextContinuationIfPossible(next, events) {
  if (next.pending || next.pending_attack_resolution || next.pending_legacy_defeat_queue && next.pending_legacy_defeat_queue.length) return false;
  const queue=next.continuation_queue||[];
  const continuation=queue.shift();
  next.continuation_queue=queue;
  if(!continuation) {
    runDeferredLoseChecks(next, events);
    return false;
  }
  if(continuation.type==='post_attack_reposition') {
    const opened=openPostAttackRepositionChoiceIfNeeded(next,continuation.attack_resolution,continuation.damaged_targets,events,continuation);
    if(!opened) finishQueuedAttackCard(next,continuation,events);
    return true;
  }
  if(continuation.type==='casting_release') {
    next.pending_attack_resolution=deepClone(continuation.attack_resolution);
    const opened=initializePerHeroResponseWindows(next,next.pending_attack_resolution,events);
    if(!opened) resolvePendingAttackDamage(next,events,continuation.attack_resolution.attacking_player_id);
    return true;
  }
  if(continuation.type==='draw_replacement_choice') {
    return maybeOpenDrawReplacementChoice(next, continuation.player_id, continuation.drawn_card_id, continuation.hand_index);
  }
  return false;
}

function openPostAttackRepositionChoiceIfNeeded(next, attackResolution, damagedTargets, events, continuation) {
  if (!attackResolution || next.pending) return false;
  if (hasExplicitPostHitRepositionApply(attackResolution) || postHitRepositionExplicitlyDeclined(attackResolution)) return false;
  const choices = legalPostAttackRepositionChoices(next, attackResolution, damagedTargets);
  if (!choices.length) return false;
  next.pending = {
    type: 'post_attack_reposition_choice',
    player_id: attackResolution.attacking_player_id,
    card_id: attackResolution.card_id,
    source_slot: attackResolution.source_slot,
    target_player_id: attackResolution.target_player_id,
    target_slot: attackResolution.target_slot,
    choices,
    optional: true,
    continuation: continuation || null
  };
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: attackResolution.attacking_player_id,
    card_id: attackResolution.card_id,
    source_slot: attackResolution.source_slot,
    target_player_id: attackResolution.target_player_id,
    target_slot: attackResolution.target_slot,
    payload: { result: 'POST_ATTACK_REPOSITION_CHOICE_OPENED', choices: choices.map(c => ({ choice_index: c.choice_index, target_player_id: c.target_player_id, first_slot: c.first_slot, second_slot: c.second_slot, reposition_model: c.reposition_model })) }
  }));
  return true;
}

function selectPostAttackRepositionTarget(state, intent) {
  if (!state.pending || state.pending.type !== 'post_attack_reposition_choice') return { state, events: [], errors: ['No pending post-attack reposition choice.'] };
  if (state.pending.player_id !== intent.player_id) return { state, events: [], errors: ['Only the attacking player may choose post-attack reposition.'] };
  const next = deepClone(state);
  const pending = next.pending;
  const idxRaw = intent.choice_index ?? intent.reposition_index ?? intent.selected_index ?? (intent.payload && (intent.payload.choice_index ?? intent.payload.reposition_index ?? intent.payload.selected_index));
  const firstSlot = normalizeSlotKey(intent.first_slot || intent.source_slot || (intent.payload && (intent.payload.first_slot || intent.payload.source_slot)));
  const secondSlot = normalizeSlotKey(intent.second_slot || intent.swap_with_slot || intent.target_slot || (intent.payload && (intent.payload.second_slot || intent.payload.swap_with_slot || intent.payload.target_slot)));
  const targetPlayerId = intent.target_player_id || (intent.payload && intent.payload.target_player_id);
  let choice = null;
  if (Number.isInteger(idxRaw) || String(idxRaw || '').match(/^\d+$/)) choice = (pending.choices || [])[Number(idxRaw)];
  if (!choice && firstSlot && secondSlot) {
    choice = (pending.choices || []).find(c => normalizeSlotKey(c.first_slot) === firstSlot && normalizeSlotKey(c.second_slot) === secondSlot && (!targetPlayerId || c.target_player_id === targetPlayerId));
  }
  if (!choice) return { state, events: [], errors: ['Invalid post-attack reposition choice.'] };
  const boardPlayer = next.players && next.players[choice.target_player_id];
  const moved = boardPlayer && swapBoardSlotsWithoutExhaust(boardPlayer.board, choice.first_slot, choice.second_slot, { hero_only: false });
  if (!moved || !moved.ok) return { state, events: [], errors: moved && moved.errors || ['Post-attack reposition swap failed.'] };
  const events = [];
  boardPlayer.board = moved.board;
  remapHeroHostedAttachmentsForSlotSwap(boardPlayer, moved.first_slot, moved.second_slot, events, next, choice.target_player_id);
  next.pending = null;
  if (pending.continuation) finishQueuedAttackCard(next, pending.continuation, events);
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: pending.player_id,
    card_id: pending.card_id,
    source_slot: pending.source_slot,
    target_player_id: choice.target_player_id,
    target_slot: choice.second_slot,
    payload: { result: 'POST_ATTACK_REPOSITION_RESOLVED', choice_index: choice.choice_index, reposition_model: choice.reposition_model, first_slot: choice.first_slot, second_slot: choice.second_slot, exhaust_from_reposition: false }
  }));
  return { state: appendEvents(next, events), events, errors: [] };
}

function skipPostAttackReposition(state, intent) {
  if (!state.pending || state.pending.type !== 'post_attack_reposition_choice') return { state, events: [], errors: ['No pending post-attack reposition choice to skip.'] };
  if (state.pending.player_id !== intent.player_id) return { state, events: [], errors: ['Only the attacking player may skip post-attack reposition.'] };
  const next = deepClone(state);
  const pending = next.pending;
  next.pending = null;
  const events=[];
  if (pending.continuation) finishQueuedAttackCard(next, pending.continuation, events);
  const event = createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, { player_id: intent.player_id, card_id: pending.card_id, source_slot: pending.source_slot, payload: { result: 'POST_ATTACK_REPOSITION_SKIPPED', optional: true } });
  events.push(event);
  return { state: appendEvents(next, events), events, errors: [] };
}

function buildPendingAttackResolution(state, pending, card) {
  let amount = directDamageAmountForCard(state, pending, card);
  if (!(isAttackSkillCard(card) || isCastingDamageCard(card)) || !cardHasDirectDamage(card) || !amount) return null;
  const targetPlayerId = pending.target_player_id || pending.target_owner_id || getOpponentId(state, pending.player_id);
  const targets = damageTargetSlots(state, pending, card);
  const sourceHeroCard = sourceHeroCardForPending(state, pending);
  const originalProfile = cardActionProfile(card);
  const infusion = activeAetherInfusionForSource(state, pending.player_id, pending.source_slot, card);
  const damageType = infusion ? 'Magical' : damageTypeForCard(card);
  const rangeConvertedByHero = !infusion && sourceCanTargetAnyOpponentHeroByAbility(state, pending.player_id, pending.source_slot, card);
  const resolvedProfile = infusion ? 'Magical Attack' : (rangeConvertedByHero ? 'Range Attack' : originalProfile);
  const classBuff = attackDamageBuffForSourceHero(state, pending, card, { damage_type: damageType, action_profile: resolvedProfile });
  const surgeBonus = Number(pending && pending.surge_damage_bonus || 0);
  amount += Number(classBuff.amount || 0) + surgeBonus;
  return {
    type: 'ATTACK_DAMAGE_RESOLUTION',
    attacking_player_id: pending.player_id,
    defending_player_id: targetPlayerId,
    card_id: pending.card_id,
    source_slot: pending.source_slot,
    target_player_id: targetPlayerId,
    target_slot: pending.target_slot,
    targets,
    base_damage: amount,
    printed_damage_before_hero_ability: amount - Number(classBuff.amount || 0) - surgeBonus,
    final_damage: amount,
    damage_type: damageType,
    action_profile: resolvedProfile,
    range_converted_by_hero_ability: rangeConvertedByHero,
    aether_infusion_mana_remove: infusion ? Number(infusion.mana_remove_on_connected_hit || infusion.mana_remove_on_deals_damage || 1) : 0,
    aether_infusion_mana_connected_hit: infusion ? Number(infusion.mana_remove_on_connected_hit || infusion.mana_remove_on_deals_damage || 1) : 0,
    class_attack_damage_bonus: Number(classBuff.amount || 0),
    class_attack_damage_bonus_reasons: classBuff.reasons,
    surge_damage_bonus: surgeBonus,
    surge_reason: pending && pending.surge_reason || null,
    modifier_breakdown: [
      ...((classBuff.reasons || []).map(reason => ({ source_type: 'Hero Ability', source_card_id: sourceHeroCard && sourceHeroCard.card_id || null, source_name: sourceHeroCard && sourceHeroCard.name || 'Hero Ability', amount: Number(classBuff.amount || 0), reason }))),
      ...(surgeBonus ? [{ source_type: 'Hero Ability Optional Spend', source_card_id: sourceHeroCard && sourceHeroCard.card_id || null, source_name: pending && pending.surge_reason || 'Mana/Arcane Surge', amount: surgeBonus, reason: pending && pending.surge_reason || `Optional surge: +${surgeBonus}` }] : [])
    ],
    area: isAreaDamageCard(card),
    status_effects: attackStatusEffectsForCard(state, pending, card),
    source_hero_card_id: sourceHeroCard && sourceHeroCard.card_id,
    source_hero_class: String(sourceHeroCard && (sourceHeroCard.display_class || sourceHeroCard.class || (sourceHeroCard.identity && (sourceHeroCard.identity.display_class || sourceHeroCard.identity.class))) || ''),
    cannot_be_dodged: attackCannotBeDodged(card),
    cannot_be_blocked: attackCannotBeBlocked(card),
    response_result: null,
    response_results_by_target: {},
    selected_target_slots: normalizeMultiTargetSlots(pending.target_slots || []),
    post_hit_reposition: null,
    casting: isCastingAttackResolution(card),
    second_chance_replay: Boolean(pending.second_chance_replay)
  };
}
function getOrCreateAttackDamageComputation(next, attackResolution, events) {
  if (attackResolution.damage_computation) return attackResolution.damage_computation;
  let amount = attackResolution.no_valid_target_at_resolution ? 0 : Number(attackResolution.final_damage || attackResolution.base_damage || 0);
  const primaryTarget = Array.isArray(attackResolution.targets) && attackResolution.targets.length
    ? attackResolution.targets[0]
    : { target_player_id: attackResolution.target_player_id, target_slot: attackResolution.target_slot };
  const response = responseResultForTarget(attackResolution, primaryTarget);
  if (attackResolution.attack_negated) amount = 0;
  const negated = response && responseNegatesAttack(response.type);
  const exactDamageAfterDodge = response && response.type === 'DODGE' && attackResolution.card_id === 'S1-MAG-007' && /elementalist|elemental lord/i.test(String(attackResolution.source_hero_class || '')) ? 40 : null;
  if (attackResolution.attack_negated || negated) amount = 0;
  const abilityDamage = Boolean(attackResolution.ability_damage);
  const attachmentModifierAmount = !abilityDamage && amount > 0 && exactDamageAfterDodge === null ? activeAttackDamageModifierAmount(next, attackResolution, events) : 0;
  amount += attachmentModifierAmount;
  let conditionalBonus = { amount: 0, reason: null };
  if (amount > 0) {
    conditionalBonus = abilityDamage ? { amount: 0, reason: null } : conditionalDamageBonusForAttack(next, attackResolution);
    amount += Number(conditionalBonus.amount || 0);
    if (conditionalBonus.amount) {
      events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
        player_id: attackResolution.attacking_player_id,
        card_id: attackResolution.card_id,
        source_slot: attackResolution.source_slot,
        target_player_id: attackResolution.target_player_id,
        target_slot: attackResolution.target_slot,
        payload: { result: 'CONDITIONAL_DAMAGE_BONUS_APPLIED', bonus_amount: conditionalBonus.amount, reason: conditionalBonus.reason }
      }));
    }
  }
  const fullDamageMultiplier = amount > 0 ? activeAttackDamageMultiplier(next, attackResolution, response, events) : { multiplier: 1, reasons: [] };
  amount *= Number(fullDamageMultiplier.multiplier || 1);
  attackResolution.damage_computation = {
    amount,
    incoming_damage_before_defense: amount,
    conditional_bonus_before_defense: true,
    ability_damage: abilityDamage,
    attachment_modifier_amount: attachmentModifierAmount,
    conditional_bonus: conditionalBonus,
    full_damage_multiplier: Number(fullDamageMultiplier.multiplier || 1),
    full_damage_multiplier_reasons: fullDamageMultiplier.reasons || [],
    exact_damage_after_dodge: exactDamageAfterDodge,
    primary_response: response || null
  };
  return attackResolution.damage_computation;
}

function resolvePendingAttackTargetDamage(next, events, resolverPlayerId, target) {
  const attackResolution = next.pending_attack_resolution;
  if (!attackResolution || !target) return { applied: false, reason: 'NO_PENDING_ATTACK_TARGET' };
  const computation = getOrCreateAttackDamageComputation(next, attackResolution, events);
  const scopedTarget = { target_player_id: target.target_player_id, target_slot: normalizeSlotKey(target.target_slot) };
  const scopedAttack = Object.assign({}, attackResolution, {
    targets: [scopedTarget],
    target_player_id: scopedTarget.target_player_id,
    target_slot: scopedTarget.target_slot,
    defer_attack_consumables: true
  });
  if (attackResolution.remove_poison_before_damage && !attackResolution.attack_negated) removePoisonStatusBeforeVenomDamage(next, scopedAttack, events);
  const damagedTargets = applyDamageToTargets(next, scopedAttack, computation.amount, events, computation.ability_damage ? 'racial_ability_damage' : 'attack');
  attackResolution.sequential_resolution_started = true;
  attackResolution.resolved_target_keys = Array.from(new Set([...(attackResolution.resolved_target_keys || []), responseTargetKey(scopedTarget)]));
  attackResolution.sequential_damaged_targets = (attackResolution.sequential_damaged_targets || []).concat(deepClone(damagedTargets));
  attackResolution.total_hp_damage = Number(attackResolution.total_hp_damage || 0) + damagedTargets.reduce((sum, entry) => sum + Number(entry.final_hp_damage || 0), 0);
  const response = responseResultForTarget(attackResolution, scopedTarget);
  const damaged = damagedTargets.find(entry => entry.target_player_id === scopedTarget.target_player_id && normalizeSlotKey(entry.target_slot) === scopedTarget.target_slot);
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: resolverPlayerId || attackResolution.attacking_player_id,
    card_id: attackResolution.card_id,
    source_slot: attackResolution.source_slot,
    target_player_id: scopedTarget.target_player_id,
    target_slot: scopedTarget.target_slot,
    payload: {
      result: computation.ability_damage ? 'ABILITY_TARGET_DAMAGE_RESOLVED' : 'ATTACK_TARGET_DAMAGE_RESOLVED',
      sequential_per_hero: true,
      target_key: responseTargetKey(scopedTarget),
      final_hp_damage: Number(damaged && damaged.final_hp_damage || 0),
      response_result: response || null,
      remaining_response_targets: (next.response_window_queue || []).length
    }
  }));
  return { applied: damagedTargets.length > 0, damaged_targets: damagedTargets, final_damage: computation.amount };
}

function resolvePendingAttackDamage(next, events, resolverPlayerId, options) {
  const attackResolution = next.pending_attack_resolution;
  if (!attackResolution) return { applied: false, reason: 'NO_PENDING_ATTACK_RESOLUTION' };
  const mode = options || {};
  if (mode.target) return resolvePendingAttackTargetDamage(next, events, resolverPlayerId, mode.target);
  const computation = getOrCreateAttackDamageComputation(next, attackResolution, events);
  const amount = Number(computation.amount || 0);
  const abilityDamage = Boolean(computation.ability_damage);
  const attachmentModifierAmount = Number(computation.attachment_modifier_amount || 0);
  const conditionalBonus = computation.conditional_bonus || { amount: 0, reason: null };
  const exactDamageAfterDodge = computation.exact_damage_after_dodge;
  const primaryTarget = Array.isArray(attackResolution.targets) && attackResolution.targets.length
    ? attackResolution.targets[0]
    : { target_player_id: attackResolution.target_player_id, target_slot: attackResolution.target_slot };
  const response = responseResultForTarget(attackResolution, primaryTarget) || attackResolution.negating_response_result || null;
  const negated = response && responseNegatesAttack(response.type);
  const hasPerTargetDamage = Object.values(attackResolution.per_target_base_damage || {}).some(value => Number(value || 0) > 0);
  const hasSecondaryEffect = !abilityDamage && Boolean(swapPolicy.swapModelForCard(attackResolution.card_id));
  if (hasSecondaryEffect) next.defer_state_based_checks = true;

  let damagedTargets = [];
  if (attackResolution.sequential_resolution_started || mode.finalize_only) {
    damagedTargets = deepClone(attackResolution.sequential_damaged_targets || []);
  } else if (amount > 0 || hasPerTargetDamage) {
    if (attackResolution.remove_poison_before_damage && !attackResolution.attack_negated) removePoisonStatusBeforeVenomDamage(next, attackResolution, events);
    damagedTargets = applyDamageToTargets(next, Object.assign({}, attackResolution, { final_damage: amount }), amount, events, abilityDamage ? 'racial_ability_damage' : 'attack');
    attackResolution.total_hp_damage = damagedTargets.reduce((sum, target) => sum + Number(target.final_hp_damage || 0), 0);
  }

  if (!abilityDamage) {
    if (attackResolution.sequential_resolution_started) consumePoisonVialModifierIfNeeded(next, attackResolution, damagedTargets, events);
    if (amount > 0 || hasPerTargetDamage || attackUsesConnectedHitManaDrain(attackResolution)) applyOnHitAfterDamageTriggers(next, attackResolution, damagedTargets, events);
    queuePostAttackRepositionContinuation(next, attackResolution, damagedTargets, events);
    if (response && response.type === 'DODGE') openSecondChanceChoiceAfterDodge(next, attackResolution, events);
    addHolyRingRestrictionAfterAttack(next, attackResolution, events);
    addShieldBashReductionAfterAttack(next, attackResolution, events);
  }
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: resolverPlayerId || attackResolution.attacking_player_id,
    card_id: attackResolution.card_id,
    source_slot: attackResolution.source_slot,
    target_player_id: attackResolution.target_player_id,
    target_slot: attackResolution.target_slot,
    payload: {
      result: abilityDamage ? (amount > 0 ? 'ABILITY_DAMAGE_RESOLVED' : 'ABILITY_DAMAGE_PREVENTED') : (amount > 0 ? 'ATTACK_DAMAGE_RESOLVED' : 'ATTACK_DAMAGE_PREVENTED'),
      base_damage: attackResolution.base_damage,
      printed_damage: Number(attackResolution.printed_damage_before_hero_ability !== undefined ? attackResolution.printed_damage_before_hero_ability : attackResolution.base_damage || 0),
      final_damage: amount,
      no_damage_reason: attackResolution.no_damage_reason || null,
      modifier_breakdown: Array.isArray(attackResolution.modifier_breakdown) ? attackResolution.modifier_breakdown : [],
      attachment_modifier_amount: attachmentModifierAmount,
      class_attack_damage_bonus: Number(attackResolution.class_attack_damage_bonus || 0),
      class_attack_damage_bonus_reasons: attackResolution.class_attack_damage_bonus_reasons || [],
      surge_damage_bonus: Number(attackResolution.surge_damage_bonus || 0),
      surge_reason: attackResolution.surge_reason || null,
      conditional_bonus: conditionalBonus,
      exact_damage_after_dodge: exactDamageAfterDodge,
      response_result: response,
      sequential_per_hero: Boolean(attackResolution.sequential_resolution_started),
      resolved_target_keys: (attackResolution.resolved_target_keys || []).slice()
    }
  }));
  const returnToHand = !abilityDamage && response && response.type === 'NEGATE_RETURN_TO_HAND';
  if (!abilityDamage && (attackResolution.attack_negated || negated)) {
    const finalStatus = response && response.type === 'CANCEL' ? 'CANCELED' : (returnToHand ? 'RETURNED_TO_HAND' : 'NEGATED');
    events.push(createRuntimeEvent(EVENT_TYPES.OPPONENT_PLAYED_UPDATED, next, {
      player_id: attackResolution.attacking_player_id,
      card_id: attackResolution.card_id,
      source_slot: attackResolution.source_slot,
      target_player_id: attackResolution.target_player_id,
      target_slot: attackResolution.target_slot,
      payload: {
        public_record_type: 'ACTION_RESULT',
        status: finalStatus,
        response_card_id: response && response.card_id || null,
        response_kind: response && response.type || null,
        canceled_or_negated_by_player_id: response && response.player_id || attackResolution.defending_player_id || null,
        destination: returnToHand ? 'Hand' : 'Discard Pile',
        incoming_damage: Number(attackResolution.final_damage || attackResolution.base_damage || 0),
        final_hp_damage: 0,
        keep_visible_when_canceled_or_negated: true
      }
    }));
  }
  if (returnToHand) {
    next.players[attackResolution.attacking_player_id].hand.push(attackResolution.card_id);
    events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED, next, {
      player_id: attackResolution.attacking_player_id,
      card_id: attackResolution.card_id,
      payload: { from: 'Pending Attack Resolution', to: 'Hand', response_result: response }
    }));
  } else if (!abilityDamage) {
    const holyRingRemainsAttached=attackResolution.card_id==='S1-CLE-009'&&/\b(?:priest|saint)\b/i.test(String(attackResolution.source_hero_class||''));
    const remainsAttached=(holyRingRemainsAttached||attackResolution.card_id==='S1-WAR-020')&&!attackResolution.attack_negated&&!(response&&responseNegatesAttack(response.type));
    const hasQueuedSecondary = (next.continuation_queue || []).some(item => item && item.type === 'post_attack_reposition' && item.card_id === attackResolution.card_id);
    if (!hasQueuedSecondary&&!remainsAttached) {
      next.players[attackResolution.attacking_player_id].discard_pile.push(attackResolution.card_id);
      events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED, next, { player_id: attackResolution.attacking_player_id, card_id: attackResolution.card_id, payload: { from: 'Pending Attack Resolution', to: 'Discard Pile' } }));
    }
  }
  if (attackResolution.casting) clearCastingStateForSource(next, attackResolution.attacking_player_id, attackResolution.source_slot, events, attackResolution.card_id);
  next.pending_attack_resolution = null;
  next.response_window = null;
  next.response_current_target = null;
  next.response_window_queue = [];
  next.response_stack = [];
  next.pending_response = null;
  next.response_priority_player_id = null;
  const activatedContinuation = activateNextContinuationIfPossible(next, events);
  if (!activatedContinuation && !(next.continuation_queue || []).length && !next.pending) runDeferredLoseChecks(next, events);
  return { applied: amount > 0 || hasPerTargetDamage, final_damage: amount, per_target_damage: attackResolution.per_target_base_damage || null };
}

function responseTargetKey(target) {
  return target ? `${target.target_player_id}:${normalizeSlotKey(target.target_slot)}` : null;
}

function openNextPerHeroResponseWindow(next, events) {
  const attack = next.pending_attack_resolution;
  if (!attack) return false;
  const queue = Array.isArray(next.response_window_queue) ? next.response_window_queue : [];
  let target = null;
  while (queue.length) {
    const candidate = queue.shift();
    const player = next.players && next.players[candidate.target_player_id];
    const slotState = player && player.board && player.board[normalizeSlotKey(candidate.target_slot)];
    if (slotState && slotState.slot_mode === 'HERO' && slotState.hero && !slotState.hero.defeated && Number(slotState.hero.hp || 0) > 0) {
      target = Object.assign({}, candidate, { target_slot: normalizeSlotKey(candidate.target_slot) });
      break;
    }
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
      player_id: attack.attacking_player_id,
      card_id: attack.card_id,
      target_player_id: candidate.target_player_id,
      target_slot: normalizeSlotKey(candidate.target_slot),
      payload: { result: 'MULTI_TARGET_QUEUE_ENTRY_SKIPPED', reason: 'TARGET_NO_LONGER_ACTIVE_HERO' }
    }));
  }
  next.response_window_queue = queue;
  if (!target) {
    next.response_window = null;
    next.response_current_target = null;
    next.response_priority_player_id = null;
    return false;
  }
  next.response_current_target = target;
  next.response_stack = [];
  next.pending_response = null;
  next.response_priority_player_id = target.target_player_id;
  next.response_window = {
    type: 'PER_AFFECTED_HERO_DAMAGE_WOULD_BE_DEALT',
    card_id: attack.card_id,
    attacking_player_id: attack.attacking_player_id,
    defending_player_id: target.target_player_id,
    source_slot: attack.source_slot,
    target_player_id: target.target_player_id,
    target_slot: target.target_slot,
    target_key: responseTargetKey(target),
    damage_type: attack.damage_type,
    damage_amount: attack.per_target_base_damage && attack.per_target_base_damage[responseTargetKey(target)] !== undefined ? attack.per_target_base_damage[responseTargetKey(target)] : attack.base_damage,
    area: attack.area,
    multi_target: (attack.targets || []).length > 1,
    global_window: false,
    cannot_be_dodged: attack.cannot_be_dodged,
    cannot_be_blocked: attack.cannot_be_blocked,
    venom_detonation: attack.venom_detonation === true
  };
  events.push(createRuntimeEvent(EVENT_TYPES.RESPONSE_WINDOW_OPENED, next, {
    player_id: target.target_player_id,
    card_id: attack.card_id,
    source_slot: attack.source_slot,
    target_player_id: target.target_player_id,
    target_slot: target.target_slot,
    payload: { response_to: 'PER_AFFECTED_HERO_DAMAGE', target_key: next.response_window.target_key, global_window: false, damage_amount: next.response_window.damage_amount, damage_type: attack.damage_type }
  }));
  return true;
}

function initializePerHeroResponseWindows(next, attackResolution, events) {
  const targets = (attackResolution.targets || []).filter(target => {
    const player = next.players && next.players[target.target_player_id];
    const ss = player && player.board && player.board[target.target_slot];
    return ss && ss.slot_mode === 'HERO' && ss.hero && !ss.hero.defeated;
  });
  next.response_window_queue = targets.slice();
  next.response_results_by_target = {};
  attackResolution.response_results_by_target = {};
  return openNextPerHeroResponseWindow(next, events);
}

function applyDirectAttackDamage(next, pending, card) {
  const events = [];
  const attackResolution = buildPendingAttackResolution(next, pending, card);
  if (!attackResolution) return { applied: false, events, pending_attack_resolution: null };
  next.pending_attack_resolution = attackResolution;
  initializePerHeroResponseWindows(next, attackResolution, events);
  return { applied: false, events, pending_attack_resolution: attackResolution };
}


function parseFirstNumber(text) {
  const match = String(text || '').match(/\b(\d+)\b/);
  return match ? Number(match[1]) || 0 : 0;
}


function primarySourceClassName(state, pending) {
  const heroCard = sourceHeroCardForPending(state, pending);
  return String(heroCard && (heroCard.display_class || heroCard.class || (heroCard.identity && (heroCard.identity.display_class || heroCard.identity.class))) || '').toLowerCase();
}

function sourceClassNamesForPending(state, pending) {
  const heroCard = sourceHeroCardForPending(state, pending);
  const names = new Set();
  if (heroCard) {
    names.add(String(heroCard.display_class || heroCard.class || '').toLowerCase());
    for (const cls of heroLegalClassNames(state, heroCard.card_id)) names.add(String(cls || '').toLowerCase());
  }
  return names;
}

function healAmountFromEffectPayload(card, state, pending) {
  const effects = structuredEffects(card);
  const classNames = state && pending ? sourceClassNamesForPending(state, pending) : new Set();
  for (const effect of effects) {
    if (!effect || !/heal/i.test(String(effect.kind || ''))) continue;
    if (effect.amount_by_class) {
      let fallback = 0;
      const activeClass = primarySourceClassName(state, pending);
      for (const [cls, amount] of Object.entries(effect.amount_by_class || {})) {
        if (activeClass && activeClass === String(cls).toLowerCase()) return Number(amount || 0);
      }
      for (const [cls, amount] of Object.entries(effect.amount_by_class || {})) {
        fallback = Math.max(fallback, Number(amount || 0));
        if (classNames.has(String(cls).toLowerCase())) return Number(amount || 0);
      }
      if (!state || !pending) return fallback;
    }
    if (effect.amount !== undefined) return Number(effect.amount || 0);
  }
  return 0;
}

function healAmountForCard(card, state, pending) {
  const explicit = card && card.heal_amount;
  if (explicit !== undefined && explicit !== null && explicit !== '') return Number(explicit) || 0;
  const payloadAmount = healAmountFromEffectPayload(card, state, pending);
  if (payloadAmount) return payloadAmount;
  const byClass = card && card.heal_amount_by_class_runtime_lock;
  if (byClass) {
    const names = state && pending ? sourceClassNamesForPending(state, pending) : new Set();
    let fallback = 0;
    const activeClass = primarySourceClassName(state, pending);
    for (const [cls, amount] of Object.entries(byClass)) {
      if (activeClass && activeClass === String(cls).toLowerCase()) return Number(amount || 0);
    }
    for (const [cls, amount] of Object.entries(byClass)) {
      fallback = Math.max(fallback, Number(amount || 0));
      if (names.has(String(cls).toLowerCase())) return Number(amount || 0);
    }
    return state && pending ? 0 : fallback;
  }
  const text = legacyRuleText(card);
  const matches = Array.from(text.matchAll(/heal(?:\s+all\s+(?:your|allied|own)\s+heroes|\s+one\s+of\s+your\s+heroes|\s+one\s+own\s+active\s+Hero|\s+this\s+Hero|\s+[^.]{0,40})?\s*(?:by|for|to)?\s*\+?(\d+)\s*(?:HP)?/ig));
  if (matches.length) return Number(matches[0][1]) || 0;
  if (/\bHeal\b/i.test(text)) return 0;
  return 0;
}

function isHealAllCard(card) {
  const execution = canonicalExecution(card);
  const targeting = execution.targeting || {};
  const resolverTarget = execution.resolver && execution.resolver.target || execution.runtime_resolver && execution.runtime_resolver.target || {};
  const scopeText = `${targeting.target_scope || ''} ${resolverTarget.raw_target_type || ''} ${resolverTarget.selection_rule || ''}`;
  if (/all_(?:your|allied|own)_heroes|all\s+(?:your|allied|own)\s+heroes/i.test(scopeText)) return true;
  if (execution.sanctuary_policy && execution.sanctuary_policy.target_picker_required === false) return true;
  if (execution.heal_all_policy || execution.multi_heal_resolution) return true;
  if (structuredEffects(card).some(effect => /heal_allied_heroes/i.test(String(effect && effect.kind || '')) || /all_(?:your|allied|own)_heroes/i.test(String(effect && effect.target_scope || '')))) return true;
  return /heal\s+all\s+(?:your|allied|own)\s+heroes/i.test(legacyRuleText(card));
}

function isHealingCard(card) {
  return healAmountForCard(card) > 0 || cardTags(card).has('HEAL');
}

const NEGATIVE_STATUS_NAMES = new Set(['POISON', 'BURN', 'BLEED', 'DECAY', 'STUN', 'FREEZE']);

function isPurifyCard(card) {
  const tags = cardTags(card);
  const structured = structuredEffects(card).some(effect => /remove_(?:selected_)?negative_status|remove_status/i.test(String(effect && effect.kind || '')));
  return structured || tags.has('PURIFY') || /remove\s+1\s+negative status|purify/i.test(legacyRuleText(card));
}

function queueSaintPurifyChoice(next, pending, sourceHero, targetPlayerId, targetSlot, choices, events) {
  const choice = {
    type: 'saint_purify_choice',
    player_id: pending.player_id,
    source_hero_card_id: sourceHero.card_id,
    source_slot: pending.source_slot,
    target_player_id: targetPlayerId,
    target_slot: normalizeSlotKey(targetSlot),
    choices: choices.map(item => ({ index: item.index, name: item.name }))
  };
  if (!Array.isArray(next.pending_saint_purify_queue)) next.pending_saint_purify_queue = [];
  next.pending_saint_purify_queue.push(choice);
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, { player_id: pending.player_id, card_id: sourceHero.card_id, source_slot: pending.source_slot, target_player_id: targetPlayerId, target_slot: targetSlot, payload: { result: 'SAINT_PURIFY_CHOICE_REQUIRED', choices: choice.choices } }));
}

function activateNextSaintPurifyChoice(next) {
  if (next.pending && next.pending.type === 'saint_purify_choice') return;
  const queue = next.pending_saint_purify_queue || [];
  next.pending = queue.shift() || null;
  next.pending_saint_purify_queue = queue;
}

function applySingleHeal(next, pending, card, events, targetPlayerId, targetSlot, baseAmount, resultLabel) {
  const targetPlayer = next.players[targetPlayerId];
  const slotState = targetPlayer && targetPlayer.board && targetPlayer.board[normalizeSlotKey(targetSlot)];
  if (!baseAmount || !slotState || slotState.slot_mode !== 'HERO' || !slotState.hero || slotState.hero.defeated) return false;
  const beforeHp = Number(slotState.hero.hp || 0);
  const maxHp = Number(slotState.hero.max_hp || 100);
  if (beforeHp >= maxHp || heroHasStatus(slotState,'Bleed')) return false;
  const healingBonus = healingDoneBonusForSource(next, pending);
  const modifierAmount = activeHealingReceivedModifierAmount(next, targetPlayerId, targetSlot, events, pending.card_id);
  const amount = Number(baseAmount || 0) + Number(healingBonus.amount || 0) + modifierAmount;
  const afterHp = Math.min(maxHp, beforeHp + amount);
  slotState.hero.hp = afterHp;
  const exhaustAfterHeal = structuredEffects(card).some(effect => /apply_exhaust/i.test(String(effect && effect.kind || '')))
    || Boolean(canonicalExecution(card).greater_health_potion_policy && /exhausted=true/i.test(String(canonicalExecution(card).greater_health_potion_policy.successful_resolution || '')))
    || /becomes Exhausted/i.test(legacyRuleText(card));
  if (afterHp > beforeHp && exhaustAfterHeal) slotState.hero.exhausted = true;
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: pending.player_id,
    card_id: pending.card_id,
    source_slot: pending.source_slot || undefined,
    target_player_id: targetPlayerId,
    target_slot: targetSlot,
    payload: { result: resultLabel || 'HEAL_RESOLVED', heal_amount: amount, base_heal_amount: Number(baseAmount || 0), class_healing_done_bonus: Number(healingBonus.amount || 0), class_healing_done_reason: healingBonus.reason, healing_modifier_amount: modifierAmount, before_hp: beforeHp, after_hp: afterHp, exhausted_target: slotState.hero.exhausted === true }
  }));
  const sourceHero = sourceHeroCardForPending(next, pending);
  const sourceHeroClass = String(sourceHero && (sourceHero.display_class || sourceHero.class || (sourceHero.identity && (sourceHero.identity.display_class || sourceHero.identity.class))) || '');
  if (afterHp > beforeHp && /saint/i.test(sourceHeroClass)) {
    const choices = negativeStatusChoicesForTarget(next, targetPlayerId, targetSlot);
    if (choices.length > 0) queueSaintPurifyChoice(next, pending, sourceHero, targetPlayerId, targetSlot, choices, events);
  }
  return true;
}

function applyHealingEffect(next, pending, card, events) {
  if (isHealAllCard(card)) return applyHealAllEffect(next, pending, card, events);
  const amount = healAmountForCard(card, next, pending);
  return applySingleHeal(next, pending, card, events, pending.target_player_id || pending.target_owner_id || pending.player_id, pending.target_slot, amount, 'HEAL_RESOLVED');
}

function applyHealAllEffect(next, pending, card, events) {
  if (!isHealAllCard(card)) return false;
  const playerId = pending.player_id;
  const player = next.players && next.players[playerId];
  if (!player || !player.board) return false;
  const amount = healAmountForCard(card, next, pending);
  let healed = 0;
  for (const slot of SLOT_ORDER) if (applySingleHeal(next, pending, card, events, playerId, slot, amount, 'HEAL_ALL_TARGET_RESOLVED')) healed += 1;
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, { player_id: pending.player_id, card_id: pending.card_id, source_slot: pending.source_slot || undefined, payload: { result: 'HEAL_ALL_RESOLVED', base_heal_amount: amount, healed_count: healed } }));
  return true;
}

function applyBlessingOfDivinityEffect(next,pending,card,events){
  if(!card||card.card_id!=='S1-CLE-025') return false;
  const player=next.players&&next.players[pending.player_id],sourceSlot=normalizeSlotKey(pending.source_slot),sourceState=player&&player.board&&player.board[sourceSlot];
  if(!sourceState||sourceState.slot_mode!=='HERO'||!sourceState.hero||sourceState.hero.defeated) return false;
  const sourceClass=primarySourceClassName(next,pending),policy=attachmentLifecycle.policyForCard(card.card_id,sourceClass);
  const attachment={attachment_id:`${card.card_id}:team-defense:${Date.now()}`,card_id:card.card_id,owner_id:pending.player_id,source_slot:sourceSlot,host_slot:sourceSlot,source_class:sourceClass,attachment_state:'ONGOING_EFFECT',restriction_type:'TEAM_DAMAGE_IMMUNITY',damage_immunity_scope:'all_allied_heroes_any_damage',expires_player_id:pending.player_id,remaining_count:policy.remaining_count,turns_remaining:policy.remaining_count,tick_phase:policy.tick_phase,counter_mode:policy.counter_mode,duration:'until_start_of_owner_next_turn',effect_result:{team_cannot_take_any_damage:true,damage_immunity_scope:'all_allied_heroes_any_damage',expires:'until_start_of_owner_next_turn'}};
  const added=addAttachmentWithCapacity(next,pending.player_id,attachment,sourceSlot,events); if(!added.ok) return false;
  if (sourceClass === 'crusader') applyHealAllEffect(next, pending, {
    card_id: card.card_id,
    execution: {
      targeting: { target_scope: 'all_allied_heroes' },
      effects: [{ kind: 'heal_allied_heroes', amount: 20, target_scope: 'all_allied_heroes' }]
    }
  }, events);
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED,next,{player_id:pending.player_id,card_id:card.card_id,source_slot:sourceSlot,payload:{result:'BLESSING_OF_DIVINITY_ATTACHED',attachment_id:attachment.attachment_id,team_damage_immunity:true,crusader_heal:sourceClass==='crusader',duration:attachment.duration}}));
  return true;
}

function applyPurifyEffect(next, pending, card, events) {
  const targetPlayer = next.players[pending.target_player_id || pending.target_owner_id || pending.player_id];
  const slotState = targetPlayer && targetPlayer.board && targetPlayer.board[pending.target_slot];
  if (!slotState || slotState.slot_mode !== 'HERO' || !slotState.hero || slotState.hero.defeated) return false;
  const statuses = slotState.hero.statuses || [];
  const choices = statuses.map((status, index) => ({ status, index, name: normalizeStatusName(status) })).filter(choice => NEGATIVE_STATUS_NAMES.has(String(choice.name || '').toUpperCase()));
  let selected = null;
  if (pending.selected_status_index !== undefined && pending.selected_status_index !== null) selected = choices.find(choice => choice.index === Number(pending.selected_status_index));
  if (!selected && pending.selected_status_name) selected = choices.find(choice => String(choice.name).toLowerCase() === String(pending.selected_status_name).toLowerCase());
  if (!selected && choices.length > 0) {
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, { player_id: pending.player_id, card_id: pending.card_id, target_player_id: pending.target_player_id || pending.target_owner_id || pending.player_id, target_slot: pending.target_slot, payload: { result: 'PURIFY_CHOICE_REQUIRED', choices: choices.map(({index,name}) => ({index,name})) } }));
    return true;
  }
  const index = selected ? selected.index : -1;
  if (index < 0) {
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
      player_id: pending.player_id,
      card_id: pending.card_id,
      target_player_id: pending.target_player_id || pending.target_owner_id || pending.player_id,
      target_slot: pending.target_slot,
      payload: { result: 'PURIFY_NO_NEGATIVE_STATUS' }
    }));
    return true;
  }
  const removed = statuses[index];
  slotState.hero.statuses = statuses.slice(0, index).concat(statuses.slice(index + 1));
  events.push(createRuntimeEvent(EVENT_TYPES.EFFECT_EXPIRED, next, {
    player_id: pending.player_id,
    card_id: pending.card_id,
    target_player_id: pending.target_player_id || pending.target_owner_id || pending.player_id,
    target_slot: pending.target_slot,
    payload: { effect_type: 'STATUS', status: normalizeStatusName(removed), removed_by: 'Purify' }
  }));
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: pending.player_id,
    card_id: pending.card_id,
    target_player_id: pending.target_player_id || pending.target_owner_id || pending.player_id,
    target_slot: pending.target_slot,
    payload: { result: 'PURIFY_RESOLVED', removed_status: normalizeStatusName(removed) }
  }));
  return true;
}


function applyReviveEffect(next, pending, card, events) {
  if (!isReviveCard(card)) return false;
  const targetPlayerId = pending.target_player_id || pending.target_owner_id || pending.player_id;
  const targetPlayer = next.players[targetPlayerId];
  const slot = normalizeSlotKey(pending.target_slot);
  const slotState = targetPlayer && targetPlayer.board && targetPlayer.board[slot];
  if (!slotState || !(slotState.slot_mode === 'LEGACY' || slotState.hero && slotState.hero.defeated)) return false;
  const reviveProfile = reviveProfileForCard(next, pending, card);
  if (!reviveProfile.ok) { events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, { player_id: pending.player_id, card_id: pending.card_id, payload: { result: 'REVIVE_PROFILE_INVALID', errors: reviveProfile.errors } })); return false; }
  const hp = reviveProfile.hp;
  const defeatedSnapshot = slotState.defeated_hero_snapshot || slotState.hero || {};
  // Every revive path clears contributed EXP cards while retaining inherent Rank EXP. This also repairs older/custom defeated snapshots safely.
  clearConfirmedDefeatExp(next, targetPlayerId, slot, slotState.hero || defeatedSnapshot, events, 'REVIVE_FALLBACK_EXP_CLEANUP');
  defeatedSnapshot.exp_cards = [];
  defeatedSnapshot.exp_total = inherentRankExpForHero(next, defeatedSnapshot);
  const revivedExhausted = Boolean(reviveProfile.exhausted);
  const revivedHero = Object.assign({}, defeatedSnapshot, {
    hp,
    max_hp: Number(defeatedSnapshot.max_hp || 100),
    defeated: false,
    exhausted: revivedExhausted,
    casting: false,
    pending_casting: false,
    statuses: [],
    attachments: Array.isArray(defeatedSnapshot.attachments) ? defeatedSnapshot.attachments.map(() => null) : [],
    exp_cards: [],
    exp_total: inherentRankExpForHero(next, defeatedSnapshot)
  });
  if (!revivedHero.card_id && slotState.defeated_hero_card_id) revivedHero.card_id = slotState.defeated_hero_card_id;
  const activeLegacyCardId = slotState.active_legacy_card_id || slotState.legacy_card_id || (slotState.slot_mode === 'LEGACY' ? slotState.card_id : null);
  if (activeLegacyCardId && !(targetPlayer.legacy_deck || []).includes(activeLegacyCardId)) targetPlayer.legacy_deck.push(activeLegacyCardId);
  slotState.slot_mode = 'HERO';
  slotState.hero = revivedHero;
  delete slotState.card_id;
  delete slotState.legacy_card_id;
  delete slotState.active_legacy_card_id;
  delete slotState.defeated_hero_snapshot;
  delete slotState.defeated_hero_card_id;
  delete slotState.original_hero_card_id;
  if (activeLegacyCardId) events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED, next, {
    player_id: targetPlayerId,
    card_id: activeLegacyCardId,
    target_player_id: targetPlayerId,
    target_slot: slot,
    payload: { from: 'Legacy Slot', to: 'Legacy Deck', source: pending.card_id }
  }));
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: pending.player_id,
    card_id: pending.card_id,
    target_player_id: targetPlayerId,
    target_slot: slot,
    payload: { result: 'REVIVE_RESOLVED', revived_hp: hp, exhausted: revivedHero.exhausted === true, source_class: reviveProfile.source_class, returned_legacy_card_id: activeLegacyCardId || null }
  }));
  return true;
}

function applyScoutingEffect(next, pending, card, events) {
  if (!card || card.card_id !== 'S1-EVT-003') return false;
  const targetPlayer = next.players && next.players[pending.target_player_id];
  const slot = normalizeSlotKey(pending.target_slot);
  const slotState = targetPlayer && targetPlayer.board && targetPlayer.board[slot];
  const expCards = slotState && slotState.hero && Array.isArray(slotState.hero.exp_cards) ? slotState.hero.exp_cards : null;
  if (!expCards) return false;
  const index = Number(pending.selected_exp_index);
  const selected = Number.isInteger(index) && expCards[index];
  const selectedId = expCardId(selected);
  if (!selectedId || selectedId !== pending.selected_exp_card_id || isUltimateSkillCard(getCard(next, selectedId))) return false;
  expCards.splice(index, 1);
  targetPlayer.discard_pile.push(selectedId);
  events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED, next, { player_id: pending.target_player_id, card_id: selectedId, target_player_id: pending.target_player_id, target_slot: slot, payload: { from: 'Hero EXP Stack', to: 'Discard Pile', source: pending.card_id, rank_down: false } }));
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, { player_id: pending.player_id, card_id: pending.card_id, target_player_id: pending.target_player_id, target_slot: slot, payload: { result: 'SCOUTING_RESOLVED', discarded_exp_card_id: selectedId, ultimate_excluded: true, rank_down: false, attachment_used: false } }));
  return true;
}

function parseDrawCountForCard(card) {
  const explicit = card && (card.draw_count !== undefined ? card.draw_count : card.drawCount);
  if (explicit !== undefined && explicit !== null && explicit !== '') return Number(explicit) || 0;
  for (const effect of structuredEffects(card)) {
    if (!effect) continue;
    if (effect.kind === 'draw_cards') return Number(effect.count !== undefined ? effect.count : (effect.amount !== undefined ? effect.amount : (effect.draw_count !== undefined ? effect.draw_count : effect.raw_value))) || 0;
    if (effect.kind === 'discard_then_draw') return Number(effect.draw_count || effect.count || 0);
    const payload = effect.payload || {};
    if (payload.draw !== undefined) return Number(payload.draw) || 0;
  }
  const text = legacyRuleText(card);
  const match = text.match(/draw\s+(\d+)\s+cards?/i);
  if (match) return Number(match[1]) || 0;
  return 0;
}

function parseGainManaAmountForCard(card) {
  const explicit = card && (card.gain_mana !== undefined ? card.gain_mana : card.mana_gain);
  if (explicit !== undefined && explicit !== null && explicit !== '') return Number(explicit) || 0;
  for (const effect of structuredEffects(card)) {
    if (!effect) continue;
    if (effect.kind === 'gain_mana') return Number(effect.amount !== undefined ? effect.amount : effect.raw_value) || 0;
    const payload = effect.payload || {};
    if (payload.gain_mana !== undefined) return Number(payload.gain_mana) || 0;
  }
  const text = legacyRuleText(card);
  const gain = text.match(/gain\s+(\d+)\s+mana\s+shards?/i);
  if (gain) return Number(gain[1]) || 0;
  return 0;
}

function parseManaStealAmountForCard(card) {
  for (const effect of structuredEffects(card)) {
    if (!effect) continue;
    const payload = effect.payload || {};
    const transfer = payload.mana_transfer || effect.mana_transfer;
    if (transfer && transfer.from === 'opponent') return Number(transfer.amount) || 0;
    if (/mana_(?:steal|remove)/i.test(String(effect.kind || ''))) return Number(effect.amount !== undefined ? effect.amount : effect.raw_value) || 0;
  }
  const text = legacyRuleText(card).replace(/[’‘]/g, "'");
  if (card && card.card_id === 'S1-MAG-021') return 1;
  const take = text.match(/take\s+(\d+)\s+mana\s+shards?(?:\s+from\s+(?:your\s+)?opponent(?:'s)?\s+mana\s+pool)?/i);
  if (take) return Number(take[1]) || 0;
  const discard = text.match(/(?:discard|remove)\s+(\d+)\s+mana\s+shards?\s+from\s+(?:your\s+)?opponent/i);
  if (discard) return Number(discard[1]) || 0;
  return 0;
}

function isDeckShuffleDrawCard(card) {
  const effects = structuredEffects(card);
  if (effects.some(effect => effect && effect.kind === 'shuffle_remaining_hand_into_deck') && parseDrawCountForCard(card) > 0) return true;
  const text = legacyRuleText(card);
  return /shuffle\s+all\s+cards\s+from\s+your\s+hand\s+into\s+your\s+deck/i.test(text) && /draw\s+\d+/i.test(text);
}

function applyBeginAnewStyleShuffleDraw(next, pending, card, events) {
  if (!isDeckShuffleDrawCard(card)) return false;
  const player = next.players && next.players[pending.player_id];
  if (!player) return false;
  const handCards = (player.hand || []).slice();
  player.main_deck = (player.main_deck || []).concat(handCards);
  player.hand = [];
  for (const cardId of handCards) {
    events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED, next, {
      player_id: pending.player_id,
      card_id: cardId,
      payload: { from: 'Hand', to: 'Main Deck', source: pending.card_id }
    }));
  }
  const drawCount = parseDrawCountForCard(card);
  const drawn = drawCardsForPlayer(next, pending.player_id, drawCount, events, `${pending.card_id} shuffle draw`);
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: pending.player_id,
    card_id: pending.card_id,
    source_slot: pending.source_slot || undefined,
    payload: { result: 'SHUFFLE_HAND_INTO_DECK_AND_DRAW_RESOLVED', shuffled_count: handCards.length, draw_count: drawn }
  }));
  return true;
}

function applyGenericDrawEffect(next, pending, card, events) {
  if (isDeckShuffleDrawCard(card)) return applyBeginAnewStyleShuffleDraw(next, pending, card, events);
  const drawCount = parseDrawCountForCard(card);
  if (!drawCount) return false;
  const text = legacyRuleText(card);
  const player = next.players && next.players[pending.player_id];
  if (!player) return false;
  let discardedCostCard = null;
  const structuredDiscardDraw = structuredEffects(card).find(effect => effect && (effect.kind === 'discard_then_draw' || effect.requires_discard_from_hand));
  if (structuredDiscardDraw || /discard\s+1\s+card\s+from\s+your\s+hand\s+to\s+draw/i.test(text)) {
    if (!player.hand.length) {
      events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
        player_id: pending.player_id,
        card_id: pending.card_id,
        payload: { result: 'DRAW_COST_NOT_PAID_NO_HAND_CARD' }
      }));
      return true;
    }
    discardedCostCard = player.hand.shift();
    player.discard_pile.push(discardedCostCard);
    events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED, next, {
      player_id: pending.player_id,
      card_id: discardedCostCard,
      payload: { from: 'Hand', to: 'Discard Pile', source: pending.card_id, cost: true }
    }));
  }
  const drawn = drawCardsForPlayer(next, pending.player_id, drawCount, events, `${pending.card_id} draw effect`);
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: pending.player_id,
    card_id: pending.card_id,
    source_slot: pending.source_slot || undefined,
    target_slot: pending.target_slot || undefined,
    payload: { result: 'DRAW_EFFECT_RESOLVED', requested_draw_count: drawCount, draw_count: drawn, discarded_cost_card: discardedCostCard }
  }));
  return true;
}

function applyGenericManaEffect(next, pending, card, events) {
  const player = next.players && next.players[pending.player_id];
  if (!player) return false;
  const gain = parseGainManaAmountForCard(card);
  const steal = parseManaStealAmountForCard(card);
  if (!gain && !steal) return false;
  if (steal) {
    const opponentId = getOpponentId(next, pending.player_id);
    const opponent = next.players && next.players[opponentId];
    const beforeOpponent = Number(opponent && opponent.mana_pool || 0);
    const taken = Math.min(beforeOpponent, steal);
    if (opponent) opponent.mana_pool = beforeOpponent - taken;
    const beforePlayer = Number(player.mana_pool || 0);
    player.mana_pool = beforePlayer + taken;
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
      player_id: pending.player_id,
      card_id: pending.card_id,
      source_slot: pending.source_slot || undefined,
      target_player_id: opponentId,
      target_slot: pending.target_slot || undefined,
      payload: { result: 'MANA_STEAL_RESOLVED', requested_amount: steal, taken_amount: taken, before_mana: beforePlayer, after_mana: player.mana_pool, opponent_before_mana: beforeOpponent, opponent_after_mana: opponent ? opponent.mana_pool : 0 }
    }));
    return true;
  }
  const before = Number(player.mana_pool || 0);
  player.mana_pool = before + gain;
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: pending.player_id,
    card_id: pending.card_id,
    source_slot: pending.source_slot || undefined,
    target_slot: pending.target_slot || undefined,
    payload: { result: 'GAIN_MANA_RESOLVED', gain_amount: gain, before_mana: before, after_mana: player.mana_pool }
  }));
  return true;
}


function transferManaFromOpponentToController(next, attackingPlayerId, defendingPlayerId, amount, events, sourceCardId, sourceSlot, reason) {
  const attacker = next.players && next.players[attackingPlayerId];
  const defender = next.players && next.players[defendingPlayerId];
  if (!attacker || !defender || Number(amount || 0) <= 0) return 0;
  const beforeOpponent = Number(defender.mana_pool || 0);
  const taken = Math.min(beforeOpponent, Number(amount || 0));
  defender.mana_pool = beforeOpponent - taken;
  const beforePlayer = Number(attacker.mana_pool || 0);
  attacker.mana_pool = beforePlayer + taken;
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: attackingPlayerId,
    card_id: sourceCardId,
    source_slot: sourceSlot || undefined,
    target_player_id: defendingPlayerId,
    payload: { result: 'ON_HIT_MANA_STEAL_RESOLVED', requested_amount: Number(amount || 0), taken_amount: taken, before_mana: beforePlayer, after_mana: attacker.mana_pool, opponent_before_mana: beforeOpponent, opponent_after_mana: defender.mana_pool, reason }
  }));
  return taken;
}

function removeManaFromOpponent(next, attackingPlayerId, defendingPlayerId, amount, events, sourceCardId, sourceSlot, reason) {
  const defender = next.players && next.players[defendingPlayerId];
  if (!defender || Number(amount || 0) <= 0) return 0;
  const beforeOpponent = Number(defender.mana_pool || 0);
  const removed = Math.min(beforeOpponent, Number(amount || 0));
  defender.mana_pool = beforeOpponent - removed;
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: attackingPlayerId,
    card_id: sourceCardId,
    source_slot: sourceSlot || undefined,
    target_player_id: defendingPlayerId,
    payload: { result: 'ON_HIT_MANA_REMOVAL_RESOLVED', remove_amount: removed, requested_amount: Number(amount || 0), before_mana: beforeOpponent, after_mana: defender.mana_pool, reason }
  }));
  return removed;
}

function isOpponentRandomDiscardCard(card) {
  const tags = cardTags(card);
  const effects = structuredEffects(card);
  if (effects.some(effect => /discard.*opponent.*hand|opponent.*hand.*discard/i.test(String(effect && effect.kind || '')) || effect && effect.payload && effect.payload.opponent_random_discard)) return true;
  const text = legacyRuleText(card);
  return tags.has('DISCARD_RANDOM') || /random\s+card\s+from\s+your\s+opponent.*hand.*discard/i.test(text) || /opponent.*hand.*discard/i.test(text);
}

function applyGenericDiscardEffect(next, pending, card, events) {
  if (!isOpponentRandomDiscardCard(card)) return false;
  const opponentId = getOpponentId(next, pending.player_id);
  const opponent = next.players && next.players[opponentId];
  if (!opponent || !(opponent.hand || []).length) {
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
      player_id: pending.player_id,
      card_id: pending.card_id,
      target_player_id: opponentId,
      payload: { result: 'OPPONENT_DISCARD_NO_CARD' }
    }));
    return true;
  }
  const idx = selectedOpponentHandIndex(pending, opponent);
  const discarded = idx >= 0 ? opponent.hand.splice(idx, 1)[0] : null;
  if (!discarded) return false;
  opponent.discard_pile.push(discarded);
  shuffleOpponentHandAfterEffect(opponent);
  events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED, next, {
    player_id: opponentId,
    card_id: discarded,
    payload: { from: 'Hand', to: 'Discard Pile', source: pending.card_id, selected_back_index: idx, identity_masked_during_selection: true, shuffle_remaining_hand_after_resolution: true }
  }));
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: pending.player_id,
    card_id: pending.card_id,
    target_player_id: opponentId,
    target_slot: pending.target_slot || undefined,
    payload: { result: 'OPPONENT_HAND_BACK_CARD_DISCARDED', discarded_card_id: discarded, selected_back_index: idx, shuffle_after_not_before: true }
  }));
  return true;
}

function isDiscardReturnCard(card) {
  if (structuredEffects(card).some(effect => effect && effect.kind === 'return_card_from_discard_to_hand')) return true;
  const text = legacyRuleText(card);
  return /return\s+\d+\s+.*from\s+your\s+discard\s+pile\s+to\s+your\s+hand/i.test(text) || /return\s+\d+\s+.*from\s+discard\s+to\s+hand/i.test(text);
}

function parseReturnCountForCard(card) {
  const effect = structuredEffects(card).find(item => item && item.kind === 'return_card_from_discard_to_hand');
  if (effect) return Number(effect.count) || 1;
  const text = legacyRuleText(card);
  const match = text.match(/return\s+(\d+)\s+/i);
  return match ? Number(match[1]) || 1 : 0;
}

function discardReturnFilter(card, candidateCard) {
  const text = legacyRuleText(card).toLowerCase();
  const family = String(candidateCard && (candidateCard.card_family || candidateCard.card_type) || '').toLowerCase();
  const subtype = String(candidateCard && candidateCard.card_subtype || '').toLowerCase();
  const candidateText = `${family} ${subtype}`;
  if (/skill card/.test(text) && !candidateText.includes('skill')) return false;
  if (/archer skill/.test(text) && !String(candidateCard && candidateCard.legal_active_classes || '').toLowerCase().includes('archer')) return false;
  if (/item or event/.test(text) && !(family.includes('item') || family.includes('event'))) return false;
  if (/non-ultimate/.test(text) && /ultimate/i.test(legacyRuleText(candidateCard))) return false;
  return true;
}

function applyGenericDiscardReturnEffect(next, pending, card, events) {
  if (!isDiscardReturnCard(card)) return false;
  const player = next.players && next.players[pending.player_id];
  if (!player) return false;
  const count = parseReturnCountForCard(card);
  const returned = [];
  const keptDiscard = [];
  for (const cardId of player.discard_pile || []) {
    const candidate = getCard(next, cardId) || {};
    if (returned.length < count && discardReturnFilter(card, candidate)) {
      returned.push(cardId);
    } else {
      keptDiscard.push(cardId);
    }
  }
  player.discard_pile = keptDiscard;
  player.hand = (player.hand || []).concat(returned);
  for (const cardId of returned) {
    events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED, next, {
      player_id: pending.player_id,
      card_id: cardId,
      payload: { from: 'Discard Pile', to: 'Hand', source: pending.card_id }
    }));
  }
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: pending.player_id,
    card_id: pending.card_id,
    source_slot: pending.source_slot || undefined,
    target_slot: pending.target_slot || undefined,
    payload: { result: 'DISCARD_RETURN_TO_HAND_RESOLVED', requested_count: count, returned_count: returned.length, returned_card_ids: returned }
  }));
  return true;
}

function isTopDeckSearchCard(card) {
  if (structuredEffects(card).some(effect => effect && (/search_top_deck|look_top_deck|search_deck_top/i.test(String(effect.kind || '')) || effect.payload && effect.payload.look_top_deck))) return true;
  return /look\s+top\s+\d+\s+deck.*add\s+1\s+to\s+hand/i.test(legacyRuleText(card));
}

function applyGenericTopDeckSearchEffect(next, pending, card, events) {
  if (!isTopDeckSearchCard(card)) return false;
  const player = next.players && next.players[pending.player_id];
  if (!player) return false;
  const structuredSearch = structuredEffects(card).map(effect => effect && (effect.payload && effect.payload.search || effect.search)).find(Boolean) || null;
  const text = legacyRuleText(card);
  const match = text.match(/look\s+top\s+(\d+)/i);
  const count = structuredSearch && structuredSearch.zone === 'deck' && structuredSearch.top_count ? Number(structuredSearch.top_count) : (match ? Number(match[1]) || 1 : (structuredSearch ? Number(structuredSearch.look_count || player.main_deck.length) || player.main_deck.length : 1));
  const filter = structuredSearch && structuredSearch.filter || {};
  const limit = Math.min(player.main_deck.length, count);
  let chosenIndex = -1;
  for (let i = 0; i < limit; i += 1) {
    const candidate = getCard(next, player.main_deck[i]) || {};
    const family = String(candidate.card_family || candidate.card_type || candidate.family || '').toLowerCase();
    const subtype = String(candidate.card_subtype || candidate.classification || candidate.action_category || '').toLowerCase();
    if (filter.card_type && !family.includes(String(filter.card_type).toLowerCase())) continue;
    if (filter.card_subtype && !subtype.includes(String(filter.card_subtype).toLowerCase()) && !(String(filter.card_subtype).toUpperCase()==='DEF' && /defend|defense/.test(subtype))) continue;
    chosenIndex = i; break;
  }
  if (chosenIndex < 0 && !structuredSearch) chosenIndex = limit > 0 ? 0 : -1;
  const chosen = chosenIndex >= 0 ? player.main_deck.splice(chosenIndex, 1)[0] : null;
  if (chosen) player.hand.push(chosen);
  if (structuredSearch && structuredSearch.shuffle_after) shuffleInPlace(player.main_deck);
  if (chosen) events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED, next, { player_id: pending.player_id, card_id: chosen, payload: { from: 'Main Deck', to: 'Hand', source: pending.card_id, searched_count: count, filter } }));
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, { player_id: pending.player_id, card_id: pending.card_id, source_slot: pending.source_slot || undefined, payload: { result: 'TOP_DECK_SEARCH_RESOLVED', looked_count: count, chosen_card_id: chosen } }));
  return true;
}

function isCrystalBallCard(card) {
  return card && card.card_id === 'S1-ITM-009';
}

function sameMultiset(a, b) {
  const count = list => (list || []).reduce((acc, item) => { acc[item] = (acc[item] || 0) + 1; return acc; }, {});
  const ca = count(a);
  const cb = count(b);
  const keys = new Set(Object.keys(ca).concat(Object.keys(cb)));
  for (const key of keys) if (ca[key] !== cb[key]) return false;
  return true;
}

function applyCrystalBallEffect(next, pending, card, events) {
  if (!isCrystalBallCard(card)) return false;
  const player = next.players && next.players[pending.player_id];
  if (!player) return false;
  const top = (player.main_deck || []).slice(0, 3);
  const rest = (player.main_deck || []).slice(top.length);
  const requested = pending.top_deck_order || [];
  const reordered = requested.length && sameMultiset(requested, top) ? requested.slice() : top.slice();
  player.main_deck = reordered.concat(rest);
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: pending.player_id,
    card_id: pending.card_id,
    payload: { result: 'CRYSTAL_BALL_REORDER_RESOLVED', looked_count: top.length, reordered_count: reordered.length, used_requested_order: requested.length ? sameMultiset(requested, top) : false, looked_card_ids: top, top_after_reorder: reordered }
  }));
  return true;
}

function isAttachmentModifierItemCard(card) {
  return card && ['S1-ITM-010', 'S1-ITM-013', 'S1-ITM-014'].includes(card.card_id);
}

function buildAttachmentModifierItem(next, pending, card) {
  const cardId = card.card_id;
  const ownerId = pending.player_id;
  const targetSlot = normalizeSlotKey(pending.target_slot || pending.source_slot);
  const attachment = {
    attachment_id: `${cardId}:modifier:${Date.now()}`,
    card_id: cardId,
    owner_id: ownerId,
    source_slot: targetSlot,
    target_slot: targetSlot,
    attachment_state: 'ONGOING_EFFECT',
    restriction_type: 'ATTACHMENT_MODIFIER',
    modifier_amount: 20,
    expire_timing: 'END_OF_RESTRICTED_PLAYER_TURN',
    expires_player_id: ownerId,
    turns_remaining: 1,
    duration: 'this_turn',
    effect_result: { amount: 20, expires: 'this_turn' }
  };
  if (cardId === 'S1-ITM-010') {
    attachment.modifier_type = 'MAGICAL_ATTACK_DAMAGE_PLUS';
    attachment.effect_result.modifies = 'Magical Attack damage';
  } else if (cardId === 'S1-ITM-013') {
    attachment.modifier_type = 'HEALING_RECEIVED_PLUS';
    attachment.effect_result.modifies = 'healing received';
  } else if (cardId === 'S1-ITM-014') {
    attachment.modifier_type = 'PHYSICAL_OR_MAGICAL_ATTACK_DAMAGE_PLUS';
    attachment.effect_result.modifies = 'Physical Attack or Magical Attack damage';
  }
  return attachment;
}

function applyAttachmentModifierItemEffect(next, pending, card, events) {
  if (!isAttachmentModifierItemCard(card)) return false;
  const player = next.players && next.players[pending.player_id];
  const targetSlot = normalizeSlotKey(pending.target_slot || pending.source_slot);
  const slotState = player && player.board && player.board[targetSlot];
  if (!slotState || slotState.slot_mode !== 'HERO' || !slotState.hero || slotState.hero.defeated) return false;
  const attachment = buildAttachmentModifierItem(next, pending, card);
  addAttachmentWithCapacity(next, pending.player_id, attachment, pending.target_slot || pending.source_slot, events);
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: pending.player_id,
    card_id: pending.card_id,
    target_player_id: pending.player_id,
    target_slot: targetSlot,
    payload: { result: 'ATTACHMENT_MODIFIER_ATTACHED', modifier_type: attachment.modifier_type, modifier_amount: attachment.modifier_amount, duration: attachment.duration }
  }));
  return true;
}



function removePoisonStatusBeforeVenomDamage(next, attackResolution, events) {
  for (const target of attackResolution.targets || []) {
    const player = next.players && next.players[target.target_player_id];
    const ss = player && player.board && player.board[target.target_slot];
    if (!ss || ss.slot_mode !== 'HERO' || !ss.hero) continue;
    const statuses = ss.hero.statuses || [];
    const index = statuses.findIndex(status => normalizeStatusName(status).toLowerCase() === 'poison');
    if (index < 0) continue;
    const removed = statuses.splice(index, 1)[0];
    events.push(createRuntimeEvent(EVENT_TYPES.EFFECT_EXPIRED, next, { player_id: target.target_player_id, card_id: attackResolution.card_id, target_slot: target.target_slot, payload: { effect_type: 'STATUS', status: 'Poison', removed_before_damage: true, stored_duration: statusDuration(removed) } }));
  }
}

function applyVenomDetonationEffect(next, pending, card, events) {
  if (!card || card.card_id !== 'S1-THF-018') return false;
  const opponentId = getOpponentId(next, pending.player_id);
  const opponent = next.players && next.players[opponentId];
  if (!opponent) return false;
  const cls = primarySourceClassName(next, pending);
  const multiplier = /renegade/i.test(cls) ? 20 : 10;
  const targets = [];
  const perTarget = {};
  for (const slot of SLOT_ORDER) {
    const ss = opponent.board && opponent.board[slot];
    if (!ss || ss.slot_mode !== 'HERO' || !ss.hero || ss.hero.defeated) continue;
    const poison = (ss.hero.statuses || []).find(status => normalizeStatusName(status).toLowerCase() === 'poison');
    if (!poison) continue;
    const duration = Math.max(0, Number(statusDuration(poison) || 0));
    const target = { target_player_id: opponentId, target_slot: slot };
    targets.push(target);
    perTarget[responseTargetKey(target)] = duration * multiplier;
  }
  if (!targets.length) return false;
  const attackResolution = {
    type: 'ATTACK_DAMAGE_RESOLUTION', attacking_player_id: pending.player_id, defending_player_id: opponentId,
    card_id: pending.card_id, source_slot: pending.source_slot, target_player_id: opponentId, target_slot: null,
    targets, base_damage: 0, final_damage: 0, per_target_base_damage: perTarget, damage_type: 'Magical',
    action_profile: 'Area Attack', area: true, venom_detonation: true, remove_poison_before_damage: true,
    status_effects: [], source_hero_class: cls, cannot_be_dodged: true, cannot_be_blocked: false,
    response_result: null, response_results_by_target: {}, casting: false
  };
  next.pending_attack_resolution = attackResolution;
  initializePerHeroResponseWindows(next, attackResolution, events);
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, { player_id: pending.player_id, card_id: pending.card_id, source_slot: pending.source_slot, target_player_id: opponentId, payload: { result: 'VENOM_DETONATION_PENDING_PER_HERO_RESPONSE', affected_count: targets.length, multiplier, remove_poison_before_damage: true } }));
  return true;
}

function playableTextIncludes(card, pattern) {
  return pattern.test(legacyRuleText(card));
}

function isAllOpponentStatusCard(card) {
  return card && ['S1-MAG-013', 'S1-THF-012'].includes(card.card_id);
}

function applyAllOpponentStatusEffect(next, pending, card, events) {
  if (!isAllOpponentStatusCard(card)) return false;
  const opponentId = getOpponentId(next, pending.player_id);
  const opponent = next.players && next.players[opponentId];
  if (!opponent) return false;
  const status = card.card_id === 'S1-MAG-013' ? 'Burn' : 'Poison';
  const duration = parseStatusDurationFromText(status, legacyRuleText(card)) || 2;
  let applied = 0;
  for (const slot of SLOT_ORDER) {
    if (addStatusToHero(next, events, {
      source_player_id: pending.player_id,
      source_slot: pending.source_slot,
      card_id: pending.card_id,
      target_player_id: opponentId,
      target_slot: slot,
      status,
      duration_turns: duration,
      source: 'all_opponent_status_effect'
    })) applied += 1;
  }
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: pending.player_id,
    card_id: pending.card_id,
    source_slot: pending.source_slot || undefined,
    target_player_id: opponentId,
    payload: { result: 'ALL_OPPONENT_STATUS_RESOLVED', status, duration_turns: duration, applied_count: applied }
  }));
  return true;
}

function applyTargetedStatusOnlyEffect(next, pending, card, events) {
  if (!card || card.card_id !== 'S1-EVT-006') return false;
  const targetPlayerId = pending.target_player_id || getOpponentId(next, pending.player_id);
  const applied = addStatusToHero(next, events, {
    source_player_id: pending.player_id,
    source_slot: pending.source_slot,
    card_id: pending.card_id,
    target_player_id: targetPlayerId,
    target_slot: pending.target_slot,
    status: 'Stun',
    duration_turns: 1,
    source: 'targeted_status_effect'
  });
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: pending.player_id,
    card_id: pending.card_id,
    source_slot: pending.source_slot || undefined,
    target_player_id: targetPlayerId,
    target_slot: pending.target_slot,
    payload: { result: 'TARGETED_STATUS_RESOLVED', status: 'Stun', duration_turns: 1, applied }
  }));
  return true;
}

function shuffleOpponentHandAfterEffect(opponent) {
  if (opponent && Array.isArray(opponent.hand) && opponent.hand.length > 1) shuffleInPlace(opponent.hand);
}

function selectedOpponentHandIndex(pending, opponent) {
  const hand = opponent && Array.isArray(opponent.hand) ? opponent.hand : [];
  const index = Number.isInteger(pending.selected_opponent_hand_index) ? pending.selected_opponent_hand_index : 0;
  return hand.length ? Math.max(0, Math.min(hand.length - 1, index)) : -1;
}

function applyOpponentHandShuffleEffect(next, pending, card, events) {
  if (!card || card.card_id !== 'S1-ARC-004') return false;
  const opponentId = getOpponentId(next, pending.player_id);
  const opponent = next.players && next.players[opponentId];
  if (!opponent) return false;
  const idx = selectedOpponentHandIndex(pending, opponent);
  const moved = idx >= 0 ? opponent.hand.splice(idx, 1)[0] : null;
  if (moved) { opponent.main_deck.push(moved); shuffleInPlace(opponent.main_deck); }
  shuffleOpponentHandAfterEffect(opponent);
  if (moved) events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED, next, {
    player_id: opponentId,
    card_id: moved,
    payload: { from: 'Hand', to: 'Main Deck', source: pending.card_id, selected_back_index: idx, identity_masked_during_selection: true, shuffle_deck_after_insert: true, shuffle_remaining_hand_after_resolution: true }
  }));
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: pending.player_id,
    card_id: pending.card_id,
    source_slot: pending.source_slot || undefined,
    target_player_id: opponentId,
    payload: { result: 'OPPONENT_HAND_BACK_CARD_SHUFFLED_INTO_DECK', moved_card_id: moved, selected_back_index: idx, shuffle_after_not_before: true }
  }));
  return true;
}

function applyViewOpponentHandEffect(next, pending, card, events) {
  if (!card || card.card_id !== 'S1-ITM-006') return false;
  const opponentId = getOpponentId(next, pending.player_id);
  const opponent = next.players && next.players[opponentId];
  const revealed = opponent ? (opponent.hand || []).slice() : [];
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, { player_id: pending.player_id, card_id: pending.card_id, target_player_id: opponentId, payload: { result: 'OPPONENT_HAND_REVEALED', revealed_card_ids: revealed, hidden_information_seen: true } }));
  if (opponent && Array.isArray(opponent.hand) && opponent.hand.length > 1) shuffleInPlace(opponent.hand);
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, { player_id: pending.player_id, card_id: pending.card_id, target_player_id: opponentId, payload: { result: 'OPPONENT_HAND_RANDOMIZED_AFTER_VIEW', contents_unchanged: true, positional_knowledge_removed: true, global_hidden_information_rule: true } }));
  return true;
}

function racialTokenMax(player) {
  const explicit = Number(player && (player.racial_token_max !== undefined ? player.racial_token_max : player.racial_token_cap));
  return Number.isFinite(explicit) && explicit > 0 ? explicit : 2;
}

function racialTokenCount(player) {
  return Number(player && (player.racial_token_pool !== undefined ? player.racial_token_pool : player.racial_tokens) || 0);
}

function setRacialTokenCount(player, value) {
  const capped = Math.max(0, Math.min(racialTokenMax(player), Number(value || 0)));
  player.racial_token_pool = capped;
  return capped;
}

function gainRacialToken(next, playerId, amount, events, sourceCardId) {
  const player = next.players && next.players[playerId];
  if (!player) return { before: 0, after: 0, gained: 0, capped: true };
  const before = racialTokenCount(player);
  const after = setRacialTokenCount(player, before + Number(amount || 0));
  const gained = Math.max(0, after - before);
  if (events) events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: playerId,
    card_id: sourceCardId,
    payload: { result: gained > 0 ? 'RACIAL_TOKEN_GAINED' : 'RACIAL_TOKEN_GAIN_CAPPED', gain_amount: gained, attempted_gain_amount: Number(amount || 0), before_tokens: before, after_tokens: after, max_tokens: racialTokenMax(player), capped: gained < Number(amount || 0) }
  }));
  return { before, after, gained, capped: gained < Number(amount || 0) };
}

function applyRacialTokenGainEffect(next, pending, card, events) {
  if (!card || card.card_id !== 'S1-EVT-008') return false;
  gainRacialToken(next, pending.player_id, 1, events, pending.card_id);
  return true;
}

function applyRemoveExhaustEffect(next, pending, card, events) {
  if (!card || card.card_id !== 'S1-ITM-003') return false;
  const player = next.players && next.players[pending.player_id];
  const slot = normalizeSlotKey(pending.target_slot);
  const slotState = player && player.board && player.board[slot];
  if (!slotState || slotState.slot_mode !== 'HERO' || !slotState.hero) return false;
  const before = Boolean(slotState.hero.exhausted);
  slotState.hero.exhausted = false;
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: pending.player_id,
    card_id: pending.card_id,
    target_player_id: pending.player_id,
    target_slot: slot,
    payload: { result: 'EXHAUST_REMOVED', before_exhausted: before, after_exhausted: false, no_extra_skill_use_granted: true }
  }));
  return true;
}

function searchDeckAddToHand(next, playerId, cardFilter, count, events, sourceCardId) {
  const player = next.players && next.players[playerId];
  if (!player) return [];
  const found = []; const kept = [];
  for (const cardId of player.main_deck || []) { const candidate = getCard(next, cardId) || {}; if (found.length < count && cardFilter(candidate)) found.push(cardId); else kept.push(cardId); }
  player.main_deck = kept; player.hand = (player.hand || []).concat(found);
  for (const cardId of found) events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED, next, { player_id: playerId, card_id: cardId, payload: { from: 'Main Deck', to: 'Hand', source: sourceCardId, search_result: true } }));
  shuffleInPlace(player.main_deck);
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, { player_id: playerId, card_id: sourceCardId, payload: { result: 'MAIN_DECK_SHUFFLED_AFTER_HIDDEN_INFORMATION', found_count: found.length, global_hidden_information_rule: true } }));
  return found;
}

function applyDeckSearchByCardEffect(next, pending, card, events) {
  if (!card || !['S1-THF-006', 'S1-ITM-018'].includes(card.card_id)) return false;
  const found = searchDeckAddToHand(next, pending.player_id, candidate => {
    const family = String(candidate.card_family || candidate.card_type || '').toLowerCase();
    const subtype = `${candidate.card_subtype || ''} ${candidate.classification || ''} ${candidate.action_category || ''}`.toLowerCase();
    const timingRecord = candidate && candidate.timing && typeof candidate.timing === 'object' ? candidate.timing : {};
    const timing = `${typeof candidate.timing === 'string' ? candidate.timing : ''} ${timingRecord.phase || ''} ${timingRecord.raw_phase || ''} ${timingRecord.phase_or_window || ''}`.toLowerCase();
    const text = legacyRuleText(candidate).toLowerCase();
    if (card.card_id === 'S1-ITM-018') return family.includes('skill');
    return family.includes('skill') && (timing.includes('response') || /defend|defense/.test(subtype) || structuredEffects(candidate).some(effect => /block|dodge|prevent|negate|redirect|response/i.test(String(effect && effect.kind || ''))) || /defend|block|dodge|prevent/.test(text));
  }, 1, events, pending.card_id);
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: pending.player_id,
    card_id: pending.card_id,
    source_slot: pending.source_slot || undefined,
    payload: { result: 'DECK_SEARCH_ADD_TO_HAND_RESOLVED', found_count: found.length, found_card_ids: found, filter: card.card_id === 'S1-ITM-018' ? 'Skill Card' : 'Defend Skill Card' }
  }));
  return true;
}

function buildSimpleModifierAttachment(pending, card, modifierType, amount, duration) {
  return {
    attachment_id: `${pending.card_id}:v119-modifier:${Date.now()}`,
    card_id: pending.card_id,
    owner_id: pending.player_id,
    source_slot: pending.source_slot || pending.target_slot,
    target_slot: pending.target_slot || pending.source_slot,
    attachment_state: 'ONGOING_EFFECT',
    restriction_type: 'ATTACHMENT_MODIFIER',
    modifier_type: modifierType,
    modifier_amount: amount,
    expire_timing: 'END_OF_RESTRICTED_PLAYER_TURN',
    expires_player_id: pending.player_id,
    turns_remaining: duration || 1,
    duration: 'this_turn',
    effect_result: { amount, modifies: modifierType, expires: 'this_turn' }
  };
}

function applyV119ModifierEffect(next, pending, card, events) {
  if (!card || !['S1-CLE-006', 'S1-CLE-007', 'S1-WAR-013', 'S1-ARC-013'].includes(card.card_id)) return false;
  const player = next.players && next.players[pending.player_id];
  if (!player) return false;
  let attachment = null;
  if (card.card_id === 'S1-CLE-006') attachment = buildSimpleModifierAttachment(pending, card, 'PHYSICAL_ATTACK_DAMAGE_PLUS', 20, 1);
  if (card.card_id === 'S1-CLE-007') attachment = buildSimpleModifierAttachment(pending, card, 'MAGICAL_ATTACK_DAMAGE_PLUS', 20, 1);
  if (card.card_id === 'S1-WAR-013') attachment = buildSimpleModifierAttachment(pending, card, 'ATTACK_DAMAGE_PLUS_NEXT_BATTLE', 20, 2);
  if (card.card_id === 'S1-ARC-013') attachment = buildSimpleModifierAttachment(pending, card, 'POISON_OR_BURNING_ARROW_BECOMES_AREA_THIS_TURN', 0, 1);
  addAttachmentWithCapacity(next, pending.player_id, attachment, pending.target_slot || pending.source_slot, events);
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: pending.player_id,
    card_id: pending.card_id,
    source_slot: pending.source_slot || undefined,
    target_player_id: pending.player_id,
    target_slot: pending.target_slot || pending.source_slot || undefined,
    payload: { result: 'V119_MODIFIER_ATTACHED', modifier_type: attachment.modifier_type, modifier_amount: attachment.modifier_amount, duration: attachment.duration }
  }));
  return true;
}

function applyRelentlessLevelingEffect(next, pending, card, events) {
  if (!card || card.card_id !== 'S1-EVT-004') return false;
  const player = next.players && next.players[pending.player_id];
  const slot = normalizeSlotKey(pending.target_slot);
  const slotState = player && player.board && player.board[slot];
  if (!player || !slotState || slotState.slot_mode !== 'HERO' || !slotState.hero) return false;
  const tributeIndex = (player.hand || []).findIndex(cardId => {
    const candidate = getCard(next, cardId) || {};
    const family = String(candidate.card_family || candidate.card_type || '').toLowerCase();
    const text = legacyRuleText(candidate).toLowerCase();
    return family.includes('skill') && !/ultimate/.test(text);
  });
  const tributeCardId = tributeIndex >= 0 ? player.hand.splice(tributeIndex, 1)[0] : null;
  if (tributeCardId) player.discard_pile.push(tributeCardId);
  slotState.hero.exp = Number(slotState.hero.exp || 0) + (tributeCardId ? 1 : 0);
  if (tributeCardId) events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED, next, {
    player_id: pending.player_id,
    card_id: tributeCardId,
    target_slot: slot,
    payload: { from: 'Hand', to: 'Discard Pile', source: pending.card_id, tribute_as_exp: true }
  }));
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: pending.player_id,
    card_id: pending.card_id,
    target_player_id: pending.player_id,
    target_slot: slot,
    payload: { result: 'RELENTLESS_LEVELING_RESOLVED', tribute_card_id: tributeCardId, exp_after: slotState.hero.exp, rank_up_check_deferred: true }
  }));
  return true;
}

function applyV119CertifiedGenericEffect(next, pending, card, events) {
  return applyAllOpponentStatusEffect(next, pending, card, events)
    || applyTargetedStatusOnlyEffect(next, pending, card, events)
    || applyOpponentHandShuffleEffect(next, pending, card, events)
    || applyViewOpponentHandEffect(next, pending, card, events)
    || applyRacialTokenGainEffect(next, pending, card, events)
    || applyRemoveExhaustEffect(next, pending, card, events)
    || applyDeckSearchByCardEffect(next, pending, card, events)
    || applyV119ModifierEffect(next, pending, card, events)
    || applyRelentlessLevelingEffect(next, pending, card, events);
}


function applyCamouflageEffect(next, pending, card, events) {
  if (!card || card.card_id !== 'S1-THF-027') return false;
  const player = next.players && next.players[pending.player_id];
  if (!player || !pending.source_slot) return false;
  const sourceSlot = normalizeSlotKey(pending.source_slot);
  const slotState = player.board && player.board[sourceSlot];
  if (!slotState || slotState.slot_mode !== 'HERO' || !slotState.hero || slotState.hero.defeated) return false;
  const attachment = {
    attachment_id: `${pending.card_id}:camouflage:${Date.now()}`,
    card_id: pending.card_id,
    owner_id: pending.player_id,
    source_slot: sourceSlot,
    target_slot: sourceSlot,
    protected_slot: sourceSlot,
    attachment_state: 'ONGOING_EFFECT',
    restriction_type: 'UNTARGETABLE_BY_OPPONENT_TARGETED_EFFECTS',
    restricted_player_id: getOpponentId(next, pending.player_id),
    duration: 'until_start_of_owner_next_turn',
    expire_timing: 'START_OF_OWNER_TURN',
    expires_player_id: pending.player_id,
    turns_remaining: 1,
    effect_result: { protected_slot: sourceSlot, opponent_cannot_target_this_hero: true, area_effects_still_apply: true }
  };
  addAttachmentWithCapacity(next, pending.player_id, attachment, sourceSlot, events);
  const drawn = drawCardsForPlayer(next, pending.player_id, 1, events, `${pending.card_id} camouflage draw`);
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: pending.player_id,
    card_id: pending.card_id,
    source_slot: sourceSlot,
    target_player_id: pending.player_id,
    target_slot: sourceSlot,
    payload: { result: 'CAMOUFLAGE_ATTACHMENT_RESOLVED', attachment_id: attachment.attachment_id, protected_slot: sourceSlot, draw_count: drawn, expires: attachment.expire_timing }
  }));
  return true;
}

function applyGenericResourceAndHandEffect(next, pending, card, events) {
  return applyGenericManaEffect(next, pending, card, events)
    || applyGenericDiscardEffect(next, pending, card, events)
    || applyGenericDiscardReturnEffect(next, pending, card, events)
    || applyGenericTopDeckSearchEffect(next, pending, card, events)
    || applyGenericDrawEffect(next, pending, card, events);
}

function buildRestrictionAttachmentFromDispatch(next, pending, dispatch, card) {
  const result = dispatch && dispatch.result || {};
  const opponentId = getOpponentId(next, pending.player_id);
  const base = {
    attachment_id: `${pending.card_id}:restriction:${Date.now()}`,
    card_id: pending.card_id,
    owner_id: pending.player_id,
    source_slot: pending.source_slot || null,
    target_slot: pending.target_slot || null,
    source_class: primarySourceClassName(next,pending),
    attachment_state: 'ONGOING_EFFECT',
    dispatcher_handler: dispatch.handler,
    effect_result: result
  };
  if (result.restricts_opponent_targets_to) {
    return Object.assign(base, {
      restriction_type: 'TAUNT_TARGET_RESTRICTION',
      required_target_slot: normalizeSlotKey(result.restricts_opponent_targets_to),
      restricted_player_id: opponentId,
      blocks_area_attacks: Boolean(result.blocks_area_attacks),
      expire_timing: 'START_OF_OWNER_TURN',
      expires_player_id: pending.player_id,
      turns_remaining: 2,
      duration: result.expires || 'start_of_controller_second_turn'
    });
  }
  if (result.protected_slot) {
    const isHolyRing = pending.card_id === 'S1-CLE-009';
    return Object.assign(base, {
      restriction_type: 'UNTARGETABLE_BY_ATTACKS',
      protected_slot: normalizeSlotKey(result.protected_slot),
      restricted_player_id: opponentId,
      expire_timing: 'START_OF_OWNER_TURN',
      expires_player_id: pending.player_id,
      turns_remaining: isHolyRing ? 1 : 2,
      duration: result.expires || (isHolyRing ? 'start_of_owner_next_turn' : 'start_of_owner_second_turn')
    });
  }
  return Object.assign(base, { duration: result.expires || result.duration || null });
}

function sourceHeroHasSecondChance(next, attackResolution) {
  const player = next.players && next.players[attackResolution && attackResolution.attacking_player_id];
  const slotState = player && player.board && player.board[attackResolution && attackResolution.source_slot];
  const hero = slotState && slotState.hero;
  const heroCard = hero && getCard(next, hero.card_id);
  const racial = heroCard && heroCard.racial_ability || {};
  const action = racial.action || {};
  const tokens = Number(player && (player.racial_token_pool !== undefined ? player.racial_token_pool : player.racial_tokens) || 0);
  const isSecondChance = String(action.action_key || '').toLowerCase() === 'second_chance'
    || action.trigger === 'this_hero_skill_card_dodged'
    || /Second Chance/i.test(String(racial.name || '') + ' ' + String(racial.text || legacyRuleText(heroCard) || ''));
  return tokens > 0 && isSecondChance && isAttackSkillCard(getCard(next, attackResolution.card_id));
}

function openSecondChanceChoiceAfterDodge(next, attackResolution, events) {
  if (!sourceHeroHasSecondChance(next, attackResolution)) return false;
  const player = next.players && next.players[attackResolution.attacking_player_id];
  const slotState = player && player.board && player.board[attackResolution.source_slot];
  const hero = slotState && slotState.hero;
  if (!hero) return false;
  next.pending = { type: 'racial_trigger_choice', trigger: 'second_chance', player_id: attackResolution.attacking_player_id, source_slot: attackResolution.source_slot, source_hero_card_id: hero.card_id, card_id: attackResolution.card_id, target_player_id: attackResolution.target_player_id, target_slot: attackResolution.target_slot, choices: ['use', 'decline'] };
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, { player_id: attackResolution.attacking_player_id, card_id: hero.card_id, source_slot: attackResolution.source_slot, target_player_id: attackResolution.target_player_id, target_slot: attackResolution.target_slot, payload: { result: 'SECOND_CHANCE_CHOICE_OPENED', dodged_card_id: attackResolution.card_id, optional: true, mana_cost_if_used: 0 } }));
  return true;
}

function addHolyRingRestrictionAfterAttack(next, attackResolution, events) {
  if (!attackResolution || attackResolution.card_id !== 'S1-CLE-009') return;
  if (!/\b(?:priest|saint)\b/i.test(String(attackResolution.source_hero_class || ''))) return;
  if (attackResolution.attack_negated || responseNegatesAttack(attackResolution.response_result && attackResolution.response_result.type)) return;
  const attacker = next.players && next.players[attackResolution.attacking_player_id];
  if (!attacker) return;
  const opponentId = getOpponentId(next, attackResolution.attacking_player_id);
  const attachment = {
    attachment_id: `${attackResolution.card_id}:restriction:${Date.now()}`,
    card_id: attackResolution.card_id,
    owner_id: attackResolution.attacking_player_id,
    source_slot: attackResolution.source_slot,
    target_slot: attackResolution.source_slot,
    attachment_state: 'ONGOING_EFFECT',
    restriction_type: 'UNTARGETABLE_BY_ATTACKS',
    protected_slot: attackResolution.source_slot,
    restricted_player_id: opponentId,
    expire_timing: 'START_OF_OWNER_TURN',
    expires_player_id: attackResolution.attacking_player_id,
    turns_remaining: 1,
    duration: 'start_of_owner_next_turn',
    effect_result: { protected_slot: attackResolution.source_slot, blocked_targeting: 'attacks_only', expires: 'start_of_owner_next_turn' }
  };
  addAttachmentWithCapacity(next, attackResolution.attacking_player_id, attachment, attackResolution.source_slot, events);
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: attackResolution.attacking_player_id,
    card_id: attackResolution.card_id,
    source_slot: attackResolution.source_slot,
    payload: { result: 'HOLY_RING_RESTRICTION_ATTACHED', protected_slot: attackResolution.source_slot, duration: attachment.duration }
  }));
}

function addShieldBashReductionAfterAttack(next,attackResolution,events){
  if(!attackResolution||attackResolution.card_id!=='S1-WAR-020'||attackResolution.attack_negated||responseNegatesAttack(attackResolution.response_result&&attackResolution.response_result.type))return;
  const ownerId=attackResolution.attacking_player_id,sourceSlot=normalizeSlotKey(attackResolution.source_slot),policy=attachmentLifecycle.policyForCard(attackResolution.card_id,attackResolution.source_hero_class);
  const attachment={attachment_id:`${attackResolution.card_id}:reduction:${Date.now()}`,card_id:attackResolution.card_id,owner_id:ownerId,source_slot:sourceSlot,host_slot:sourceSlot,attachment_state:'ONGOING_EFFECT',restriction_type:'PHYSICAL_DAMAGE_REDUCTION',physical_damage_reduction:20,expires_player_id:ownerId,remaining_count:policy.remaining_count,turns_remaining:policy.remaining_count,tick_phase:policy.tick_phase,counter_mode:policy.counter_mode,duration:'until_start_of_owner_next_turn',effect_result:{physical_damage_reduction:20,protected_slot:sourceSlot,expires:'until_start_of_owner_next_turn'}};
  const added=addAttachmentWithCapacity(next,ownerId,attachment,sourceSlot,events);
  if(!added.ok){events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED,next,{player_id:ownerId,card_id:attackResolution.card_id,source_slot:sourceSlot,payload:{result:'SHIELD_BASH_ATTACHMENT_FAILED',errors:added.errors||[]}}));return false;}
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED,next,{player_id:ownerId,card_id:attackResolution.card_id,source_slot:sourceSlot,payload:{result:'SHIELD_BASH_REDUCTION_ATTACHED',attachment_id:added.attachment.attachment_id,physical_damage_reduction:20,duration:attachment.duration,remaining_count:added.attachment.remaining_count,tick_phase:added.attachment.tick_phase}}));
  return true;
}

function normalizeAttachmentLifecycleRecord(attachment, phaseHint, ownerId, hostSlot, state) {
  const next=Object.assign({},attachment);
  next.owner_id=next.owner_id||ownerId;
  next.source_slot=next.source_slot||hostSlot||null;
  next.host_slot=next.host_slot||next.source_slot||next.target_slot||null;
  const policy=attachmentLifecycle.policyForCard(next.card_id,next.source_class||next.source_hero_class||next.active_class);
  if(next.remaining_count===undefined||next.remaining_count===null) next.remaining_count=Number(policy&&policy.remaining_count!==undefined?policy.remaining_count:(next.turns_remaining ?? next.counters_required ?? next.counters ?? 1));
  if(policy){next.tick_phase=policy.tick_phase;next.counter_mode=policy.counter_mode;if(policy.required_count!==undefined)next.required_count=Number(policy.required_count);if(policy.current_count!==undefined&&next.current_count===undefined)next.current_count=Number(next.counters??policy.current_count);if(policy.active_from)next.active_from=policy.active_from;}
  else if(!next.tick_phase) {
    if(next.attachment_state==='CASTING' && String(next.casting_type||'').toUpperCase()==='DRAW_COUNTER_CASTING') next.tick_phase=TICK_PHASE.DRAW_EVENT;
    else if(next.attachment_state==='CASTING') next.tick_phase=TICK_PHASE.BATTLE_PHASE_START;
    else if(next.expire_timing==='START_OF_OWNER_TURN') next.tick_phase=TICK_PHASE.DRAW_PHASE_START;
    else next.tick_phase=phaseHint||TICK_PHASE.END_PHASE;
  }
  next.created_checkpoint_id=next.created_checkpoint_id||`${state.round}:${state.active_player_id}:${state.phase}`;
  next.skip_creation_checkpoint=next.skip_creation_checkpoint!==false;
  next.turns_remaining=next.remaining_count;
  return next;
}

function addAttachmentWithCapacity(next, playerId, attachment, hostSlot, events) {
  const player=next.players&&next.players[playerId];
  if(!player) return {ok:false,errors:['Unknown attachment owner.']};
  const slot=normalizeSlotKey(hostSlot||attachment.source_slot||attachment.target_slot);
  const hosted=(player.attachments||[]).filter(a=>normalizeSlotKey(a.host_slot||a.source_slot||a.target_slot)===slot);
  if(hosted.length>=2) return {ok:false,errors:[`Hero in ${slot} has no empty Attachment Slot.`]};
  const record=normalizeAttachmentLifecycleRecord(attachment,null,playerId,slot,next);
  player.attachments.push(record);
  if(events) events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED,next,{player_id:playerId,card_id:record.card_id,source_slot:slot,payload:{from:record.origin_zone||'Pending/Casting',to:'Attachment Slot',attachment_id:record.attachment_id,remaining_count:record.remaining_count,tick_phase:record.tick_phase}}));
  return {ok:true,attachment:record};
}

function tickPlayerAttachmentsForPhase(state, tickPhase, playerId, checkpointId) {
  const next=deepClone(state),events=[];
  for(const ownerId of Object.keys(next.players||{})) {
    const player=next.players[ownerId], kept=[];
    for(const raw of player.attachments||[]) {
      const attachment=normalizeAttachmentLifecycleRecord(raw,null,ownerId,raw.host_slot||raw.source_slot||raw.target_slot,next);
      const belongs=attachment.tick_phase===tickPhase && (!attachment.expires_player_id || attachment.expires_player_id===playerId || ownerId===playerId);
      if(!belongs){kept.push(attachment);continue;}
      const result=tickAttachment(attachment,tickPhase,checkpointId);
      if(!result.ticked){kept.push(result.record);continue;}
      events.push(createRuntimeEvent(EVENT_TYPES.EFFECT_COUNTER_ADDED,next,{player_id:ownerId,card_id:attachment.card_id,source_slot:attachment.source_slot,payload:{attachment_id:attachment.attachment_id,remaining_count:result.record.remaining_count,tick_phase:tickPhase,decrement:-1}}));
      if(result.expired) {
        if(attachment.attachment_state==='CASTING' && tickPhase===TICK_PHASE.BATTLE_PHASE_START) {
          queueOrOpenCastingRelease(next, ownerId, attachment, events);
        } else {
          player.discard_pile.push(attachment.card_id);
          events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED,next,{player_id:ownerId,card_id:attachment.card_id,payload:{from:'Attachment Slot',to:'Discard Pile',attachment_id:attachment.attachment_id,expired:true}}));
          events.push(createRuntimeEvent(EVENT_TYPES.EFFECT_EXPIRED,next,{player_id:ownerId,card_id:attachment.card_id,payload:{attachment_id:attachment.attachment_id,tick_phase:tickPhase}}));
        }
      } else kept.push(Object.assign({},result.record,{turns_remaining:result.record.remaining_count}));
    }
    player.attachments=kept;
  }
  return {state:appendEvents(next,events),events,errors:[]};
}

function expireAttachmentsForTiming(state, timing, playerId) {
  const phase=timing==='START_OF_TURN'?TICK_PHASE.DRAW_PHASE_START:TICK_PHASE.END_PHASE;
  return tickPlayerAttachmentsForPhase(state,phase,playerId,`${state.round}:${playerId}:${phase}`);
}

function attachmentHostSlotForPending(state, pending, card, intent) {
  if (!pending || !card) return null;
  if (card.card_id === 'S1-CLE-009') return /\b(?:priest|saint)\b/i.test(primarySourceClassName(state, pending)) ? normalizeSlotKey(pending.source_slot || pending.target_slot) : null;
  if (['S1-MAG-007','S1-MAG-020','S1-ARC-021','S1-MAG-022','S1-THF-027','S1-WAR-005','S1-WAR-020','S1-CLE-025','S1-EVT-005','S1-EVT-011'].includes(card.card_id)) return normalizeSlotKey(pending.source_slot || pending.target_slot);
  if (isAttachmentModifierItemCard(card) || ['S1-ITM-011','S1-ITM-015'].includes(card.card_id)) return normalizeSlotKey(pending.target_slot || pending.source_slot);
  const preview = dispatchEffectRecipe({
    recipe_db: state.runtime_data && state.runtime_data.effect_recipes,
    card_id: pending.card_id,
    context: { board: state.players[pending.player_id] && state.players[pending.player_id].board, source_slot: pending.source_slot, host_slot: pending.target_slot || pending.source_slot, target_slot: pending.target_slot, target_player_id: pending.target_player_id }
  });
  return preview.dispatched && isOngoingDispatchResult(preview) ? normalizeSlotKey(pending.target_slot || pending.source_slot) : null;
}

function validateAttachmentCapacityBeforeCost(state, pending, card, intent) {
  const hostSlot = attachmentHostSlotForPending(state, pending, card, intent);
  if (!hostSlot) return { ok: true, host_slot: null };
  const player = state.players && state.players[pending.player_id];
  const slotState = player && player.board && player.board[hostSlot];
  if (!slotState || slotState.slot_mode !== 'HERO' || !slotState.hero || slotState.hero.defeated) return { ok: false, errors: ['Attachment host must be a current non-defeated Hero.'] };
  const used = (player.attachments || []).filter(a => normalizeSlotKey(a.host_slot || a.source_slot) === hostSlot).length;
  if (used >= 2) return { ok: false, errors: [`Hero in ${hostSlot} has no empty Attachment Slot.`] };
  return { ok: true, host_slot: hostSlot, used, max: 2 };
}

function confirmAction(state, intent) {
  if (!state.pending) return { state, events: [], errors: ['No pending action to confirm.'] };
  if (state.pending.player_id !== intent.player_id) return { state, events: [], errors: ['Only pending action owner may confirm.'] };
  const pending = state.pending;
  const card = getCard(state, pending.card_id);
  const topDeckOrder = intent.top_deck_order || intent.payload && intent.payload.top_deck_order || null;
  if (topDeckOrder) pending.top_deck_order = topDeckOrder;
  const cardsDrawnThisTurn = intent.cards_drawn_this_turn ?? (intent.payload && intent.payload.cards_drawn_this_turn);
  if (cardsDrawnThisTurn !== undefined && cardsDrawnThisTurn !== null) pending.cards_drawn_this_turn = Number(cardsDrawnThisTurn) || 0;
  const dualArrowSlots = intent.dual_arrow_slots || intent.payload && intent.payload.dual_arrow_slots || null;
  if (dualArrowSlots) pending.dual_arrow_slots = dualArrowSlots;
  const targetSlots = intent.target_slots || intent.payload && intent.payload.target_slots || null;
  if (targetSlots && pending.card_id !== 'S1-ARC-017') pending.target_slots = targetSlots;
  if (pending.card_id === 'S1-ARC-017') {
    const selectedDualTargets = normalizeMultiTargetSlots(pending.target_slots);
    const uniqueDualTargets = [...new Set(selectedDualTargets.map(normalizeSlotKey))].filter(slot => SLOT_ORDER.includes(slot));
    if (uniqueDualTargets.length !== 2) return { state, events: [], errors: ['Dual Arrow requires exactly 2 explicitly selected opponent field slots.'] };
    const opponent = getPlayer(state, pending.target_player_id || getOpponentId(state, pending.player_id));
    const heroCount = uniqueDualTargets.filter(slot => {
      const ss = opponent && opponent.board && opponent.board[slot];
      return ss && ss.slot_mode === 'HERO' && ss.hero && !ss.hero.defeated;
    }).length;
    if (heroCount < 1) return { state, events: [], errors: ['Dual Arrow requires at least 1 selected opponent Hero; Legacy may fill only the other slot.'] };
    pending.target_slots = uniqueDualTargets;
    pending.target_slot = uniqueDualTargets[0];
  }
  if (!pendingRequirementsSatisfied(pending)) return { state, events: [], errors: ['Pending action still needs required source and/or target before confirm.'] };
  if (pending.card_id === 'S1-EVT-003') {
    const currentChoice = scoutingExpChoicesForTarget(state, pending.target_player_id, pending.target_slot).find(choice => choice.index === pending.selected_exp_index && choice.card_id === pending.selected_exp_card_id);
    if (!currentChoice) return { state, events: [], errors: ['Selected Scouting EXP Card is no longer available.'] };
  }
  const surge = optionalSurgeForAttack(state, pending, card, intent);
  if (!surge.ok) return { state, events: [], errors: surge.errors || ['Invalid optional surge selection.'] };
  pending.surge_damage_bonus = Number(surge.damage_bonus || 0);
  pending.surge_extra_mana_cost = Number(surge.extra_mana_cost || 0);
  pending.surge_reason = surge.reason || null;
  const player = getPlayer(state, intent.player_id);
  const totalManaCost = cardCost(card, state, intent.player_id) + Number(surge.extra_mana_cost || 0);
  if (player && Number(player.mana_pool || 0) < totalManaCost) return { state, events: [], errors: [`Not enough Mana Shards to confirm ${pending.card_id}.`] };
  const attachmentCapacity = validateAttachmentCapacityBeforeCost(state, pending, card, intent);
  if (!attachmentCapacity.ok) return { state, events: [], errors: attachmentCapacity.errors };

  let next = deepClone(state);
  const events = [];
  next.players[pending.player_id].mana_pool = Math.max(0, Number(next.players[pending.player_id].mana_pool || 0) - totalManaCost);
  applySourceExhaust(next, pending, card);
  events.push(createRuntimeEvent(EVENT_TYPES.COST_PAID, next, { player_id: intent.player_id, card_id: pending.card_id, source_slot: pending.source_slot || undefined, target_slot: pending.target_slot || undefined, payload: { mana_cost: totalManaCost, printed_card_mana_cost: cardCost(card, state, intent.player_id), surge_extra_mana_cost: Number(surge.extra_mana_cost || 0), surge_reason: surge.reason } }));

  let movedTo = 'Discard Pile';
  if (['S1-MAG-007','S1-MAG-020'].includes(pending.card_id)) {
    const printedAmount=directDamageAmountForCard(next,pending,card);
    const sourceHeroCard=sourceHeroCardForPending(next,pending);
    const damageType=damageTypeForCard(card) || 'Magical';
    const classBuff=attackDamageBuffForSourceHero(next,pending,card,{damage_type:damageType,action_profile:'Casting Attack'});
    const amount=Number(printedAmount||0)+Number(classBuff.amount||0);
    if(!Number.isFinite(printedAmount)||printedAmount<=0||!Number.isFinite(amount)||amount<=0) return {state,events:[],errors:['Casting Attack damage snapshot is missing or invalid.']};
    const castingAttachment={attachment_id:`${pending.card_id}:casting:${Date.now()}`,card_id:pending.card_id,owner_id:pending.player_id,source_slot:pending.source_slot,original_source_slot:pending.source_slot,source_hero_card_id:sourceHeroCard&&sourceHeroCard.card_id,source_hero_class:primarySourceClassName(next,pending),target_player_id:pending.target_player_id||getOpponentId(next,pending.player_id),target_slot:pending.target_slot,locked_target_slot:pending.target_slot,attachment_state:'CASTING',casting_type:'TURN_COUNTDOWN_CASTING',base_damage:amount,printed_damage:printedAmount,damage_type:damageType,action_profile:'Casting Attack',class_attack_damage_bonus:Number(classBuff.amount||0),class_attack_damage_bonus_reasons:classBuff.reasons||[],modifier_breakdown:(classBuff.reasons||[]).map(reason=>({source_type:'Hero Ability',source_card_id:sourceHeroCard&&sourceHeroCard.card_id||null,source_name:sourceHeroCard&&sourceHeroCard.name||'Hero Ability',amount:Number(classBuff.amount||0),reason})),remaining_count:1,turns_remaining:1,tick_phase:TICK_PHASE.BATTLE_PHASE_START,created_checkpoint_id:`${next.round}:${next.active_player_id}:BATTLE_PHASE_START`,skip_creation_checkpoint:true,pending_attack_resolution:{}};
    const added=addAttachmentWithCapacity(next,pending.player_id,castingAttachment,pending.source_slot,events);
    if(!added.ok) return {state,events:[],errors:added.errors};
    markSourceHeroCasting(next,pending,card,events); movedTo='Attachment Slot';
  } else if (pending.card_id === 'S1-ARC-021') {
    const printedAmount=directDamageAmountForCard(next,pending,card);
    const sourceHeroCard=sourceHeroCardForPending(next,pending);
    const damageType=damageTypeForCard(card) || 'Physical';
    const classBuff=attackDamageBuffForSourceHero(next,pending,card,{damage_type:damageType,action_profile:'Casting Attack'});
    const amount=Number(printedAmount||0)+Number(classBuff.amount||0);
    if(!Number.isFinite(printedAmount)||printedAmount<=0||!Number.isFinite(amount)||amount<=0) return {state,events:[],errors:['Draw-counter Casting damage snapshot is missing or invalid.']};
    const casting = createCastingAttack({ card_id: pending.card_id, damage_amounts: amount, counters_required: 5, damage_type: damageType }, pending.player_id, pending.source_slot, pending.target_slot);
    casting.remaining_count=5; casting.required_count=5; casting.counter_display='progress'; casting.tick_phase=TICK_PHASE.DRAW_EVENT; casting.host_slot=pending.source_slot; casting.original_source_slot=pending.source_slot; casting.source_hero_card_id=sourceHeroCard&&sourceHeroCard.card_id; casting.source_hero_class=primarySourceClassName(next,pending); casting.printed_damage=printedAmount; casting.class_attack_damage_bonus=Number(classBuff.amount||0); casting.class_attack_damage_bonus_reasons=classBuff.reasons||[]; casting.locked_target_slot=pending.target_slot; casting.action_profile='Casting Attack'; casting.modifier_breakdown=(classBuff.reasons||[]).map(reason=>({source_type:'Hero Ability',source_card_id:sourceHeroCard&&sourceHeroCard.card_id||null,source_name:sourceHeroCard&&sourceHeroCard.name||'Hero Ability',amount:Number(classBuff.amount||0),reason})); const added=addAttachmentWithCapacity(next,pending.player_id,casting,pending.source_slot,events); if(!added.ok) return {state,events:[],errors:added.errors};
    markSourceHeroCasting(next, pending, card, events);
    movedTo = 'Attachment Slot';
  } else if (pending.card_id === 'S1-MAG-022') {
    const added=addAttachmentWithCapacity(next,pending.player_id,{ attachment_id: `${pending.card_id}:aether:${Date.now()}`, card_id: pending.card_id, owner_id: pending.player_id, source_slot: pending.source_slot, attachment_state: 'ONGOING_EFFECT', duration: 'until_end_of_owner_next_turn', remaining_count:2, turns_remaining:2, tick_phase:TICK_PHASE.END_PHASE, converts_physical_to_magical: true, mana_remove_on_deals_damage: 1, mana_remove_on_connected_hit: 1, connected_hit_mana_lock: 'SPELL_BLADE_CONNECTED_HIT_MANA_LOCK_V0106' },pending.source_slot,events);
    if(!added.ok) return {state,events:[],errors:added.errors};
    movedTo = 'Attachment Slot';
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, { player_id: pending.player_id, card_id: pending.card_id, source_slot: pending.source_slot, payload: { attachment_state: 'ONGOING_EFFECT', duration: 'until_end_of_owner_next_turn' } }));
    events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED, next, { player_id: pending.player_id, card_id: pending.card_id, payload: { from: 'Pending/Casting', to: movedTo } }));
    events.push(createRuntimeEvent(EVENT_TYPES.OPPONENT_PLAYED_UPDATED, next, { player_id: pending.player_id, card_id: pending.card_id, source_slot: pending.source_slot || undefined, target_player_id: pending.target_player_id || undefined, target_slot: pending.target_slot || undefined, payload: { public_record_type: 'ACTION', status: directDamage.pending_attack_resolution ? 'AWAITING_RESPONSE' : 'RESOLVED', mana_cost: Number(pending.total_mana_cost || pending.mana_cost || cardCost(card, next, pending.player_id) || 0), destination: movedTo, keep_visible_when_canceled_or_negated: true } }));
  } else {
    const dispatch = dispatchEffectRecipe({
      recipe_db: next.runtime_data && next.runtime_data.effect_recipes,
      card_id: pending.card_id,
      context: {
        board: next.players[pending.player_id] && next.players[pending.player_id].board,
        used_hero_ids: next.players[pending.player_id] && next.players[pending.player_id].used_hero_ids,
        source_slot: pending.source_slot,
        host_slot: pending.target_slot || pending.source_slot,
        target_slot: pending.target_slot,
        target_player_id: pending.target_player_id,
        source_rank: intent.source_rank || intent.payload && intent.payload.source_rank,
        final_damage: intent.final_damage || intent.payload && intent.payload.final_damage,
        connect_result: intent.connect_result || intent.payload && intent.payload.connect_result,
        is_physical_attack_skill: intent.is_physical_attack_skill || intent.payload && intent.payload.is_physical_attack_skill,
        is_area_attack: intent.is_area_attack || intent.payload && intent.payload.is_area_attack,
        get_base_class: intent.get_base_class || intent.payload && intent.payload.get_base_class
      }
    });
    let directDamage = { applied: false, events: [] };
    if (applyScoutingEffect(next, pending, card, events)) {
      next.players[pending.player_id].discard_pile.push(pending.card_id);
    } else if (applyVenomDetonationEffect(next, pending, card, events)) {
      movedTo = 'Pending Attack Resolution';
    } else if (isAttackSkillCard(card) && cardHasDirectDamage(card)) {
      directDamage = applyDirectAttackDamage(next, pending, card);
      events.push(...directDamage.events);
      if (directDamage.pending_attack_resolution) {
        movedTo = 'Pending Attack Resolution';
        if (directDamage.pending_attack_resolution.casting) markSourceHeroCasting(next, pending, card, events);
      } else next.players[pending.player_id].discard_pile.push(pending.card_id);
    } else if (applyBlessingOfDivinityEffect(next,pending,card,events)) {
      movedTo='Attachment Slot';
    } else if (applyAttachmentModifierItemEffect(next, pending, card, events)) {
      movedTo = 'Attachment Slot';
    } else if (isHealAllCard(card)) {
      applyHealAllEffect(next, pending, card, events);
      next.players[pending.player_id].discard_pile.push(pending.card_id);
    } else if (isReviveCard(card) && pending.target_slot) {
      applyReviveEffect(next, pending, card, events);
      next.players[pending.player_id].discard_pile.push(pending.card_id);
    } else if (isHealingCard(card) && pending.target_slot) {
      applyHealingEffect(next, pending, card, events);
      next.players[pending.player_id].discard_pile.push(pending.card_id);
    } else if (isPurifyCard(card) && pending.target_slot) {
      applyPurifyEffect(next, pending, card, events);
      next.players[pending.player_id].discard_pile.push(pending.card_id);
    } else if (applyV119CertifiedGenericEffect(next, pending, card, events)) {
      if (attachmentLifecycle.isPersistentAttachmentCard(pending.card_id, primarySourceClassName(next, pending))) movedTo = 'Attachment Slot';
      else next.players[pending.player_id].discard_pile.push(pending.card_id);
    } else if (applyCrystalBallEffect(next, pending, card, events)) {
      next.players[pending.player_id].discard_pile.push(pending.card_id);
    } else if (applyCamouflageEffect(next, pending, card, events)) {
      movedTo = 'Attachment Slot';
    } else if (applyGenericResourceAndHandEffect(next, pending, card, events)) {
      next.players[pending.player_id].discard_pile.push(pending.card_id);
    } else if (dispatch.dispatched && pending.card_id === 'S1-ITM-011') {
      const policy=attachmentLifecycle.policyForCard(pending.card_id,primarySourceClassName(next,pending)),hostSlot=normalizeSlotKey(pending.target_slot||pending.source_slot);
      const poisonVial={attachment_id:`${pending.card_id}:modifier:${Date.now()}`,card_id:pending.card_id,owner_id:pending.player_id,source_slot:hostSlot,host_slot:hostSlot,attachment_state:'ONGOING_EFFECT',restriction_type:'ATTACHMENT_MODIFIER',modifier_type:'POISON_VIAL',applies_on:'PHYSICAL_ATTACK_SKILL_HP_DAMAGE',remaining_count:1,turns_remaining:1,tick_phase:policy.tick_phase,counter_mode:policy.counter_mode,consumed:false,dispatcher_result:dispatch.result};
      const added=addAttachmentWithCapacity(next,pending.player_id,poisonVial,hostSlot,events);if(!added.ok)return{state,events:[],errors:added.errors};
      movedTo='Attachment Slot';
    } else if (dispatch.dispatched && isOngoingDispatchResult(dispatch)) {
      const added = addAttachmentWithCapacity(next, pending.player_id, buildRestrictionAttachmentFromDispatch(next, pending, dispatch, card), pending.target_slot || pending.source_slot, events);
      if (!added.ok) return { state, events: [], errors: added.errors };
      movedTo = 'Attachment Slot';
    } else {
      directDamage = applyDirectAttackDamage(next, pending, card);
      events.push(...directDamage.events);
      if (directDamage.pending_attack_resolution) {
        movedTo = 'Pending Attack Resolution';
        if (directDamage.pending_attack_resolution.casting) markSourceHeroCasting(next, pending, card, events);
      } else {
        next.players[pending.player_id].discard_pile.push(pending.card_id);
      }
    }
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, { player_id: pending.player_id, card_id: pending.card_id, source_slot: pending.source_slot || undefined, target_slot: pending.target_slot || undefined, payload: dispatch.ok ? { result: 'EFFECT_RECIPE_DISPATCHED', dispatch, attack_response_window_opened: Boolean(directDamage.pending_attack_resolution), direct_damage_applied: directDamage.applied } : { result: directDamage.pending_attack_resolution ? 'ATTACK_PENDING_RESPONSE' : (directDamage.applied ? 'DIRECT_ATTACK_DAMAGE_RESOLVED' : 'MINIMAL_REDUCER_GENERIC_RESOLUTION') } }));
    events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED, next, { player_id: pending.player_id, card_id: pending.card_id, payload: { from: 'Pending/Casting', to: movedTo } }));
    events.push(createRuntimeEvent(EVENT_TYPES.OPPONENT_PLAYED_UPDATED, next, { player_id: pending.player_id, card_id: pending.card_id, source_slot: pending.source_slot || undefined, target_player_id: pending.target_player_id || undefined, target_slot: pending.target_slot || undefined, payload: { public_record_type: 'ACTION', status: directDamage.pending_attack_resolution ? 'AWAITING_RESPONSE' : 'RESOLVED', mana_cost: Number(pending.total_mana_cost || pending.mana_cost || cardCost(card, next, pending.player_id) || 0), destination: movedTo, keep_visible_when_canceled_or_negated: true } }));
  }
  if (!next.pending || !['legacy_defeat_choice', 'saint_purify_choice'].includes(next.pending.type)) next.pending = null;
  if (!next.pending && next.pending_saint_purify_queue && next.pending_saint_purify_queue.length) activateNextSaintPurifyChoice(next);
  next = appendEvents(next, events);
  return { state: next, events, errors: [] };
}

function committedResponseFrame(state, response, responseCard) {
  const top = (state.response_stack || [])[state.response_stack.length - 1] || null;
  const kind = responseKindForCard(responseCard);
  const countering = Boolean(top);
  return {
    frameId: `${response.card_id}:response:${Date.now()}:${Math.random().toString(16).slice(2)}`,
    playerId: response.player_id,
    cardId: response.card_id,
    kind,
    sourceSlot: response.source_slot || null,
    targetKey: state.response_window && state.response_window.target_key || null,
    responseToCardId: countering ? top.cardId : state.pending_attack_resolution && state.pending_attack_resolution.card_id,
    respondsToFrameId: countering ? top.frameId : null,
    confirmed: true,
    costPaid: true,
    zone: 'RESPONSE_PENDING',
    redirectTarget: response.redirect_target || null,
    coverUpSwap: response.cover_up_swap || null
  };
}

function resolveCommittedResponseStack(next, events) {
  const stack = Array.isArray(next.response_stack) ? next.response_stack : [];
  const frames = deepClone(stack);
  const byId = new Map(frames.map(frame => [frame.frameId, frame]));
  for (const frame of frames.slice().reverse()) {
    if (frame.cancelled) continue;
    if (frame.respondsToFrameId) {
      const target = byId.get(frame.respondsToFrameId);
      if (target && !target.cancelled) target.cancelled = true;
    }
  }
  const active = frames.filter(frame => !frame.cancelled);
  const baseFrame = active.find(frame => !frame.respondsToFrameId);
  if (baseFrame) {
    const responseCard = getCard(next, baseFrame.cardId);
    const kind = baseFrame.kind;
    const responseContext = { player_id: baseFrame.playerId, card_id: baseFrame.cardId, source_slot: baseFrame.sourceSlot, response_to: next.response_window, cover_up_swap: baseFrame.coverUpSwap };
    if (baseFrame.coverUpSwap) applyCoverUpBoardSwap(next, responseContext, events);
    if (baseFrame.cardId === 'S1-CLE-025') applyBlessingOfDivinityEffect(next, { player_id: baseFrame.playerId, source_slot: baseFrame.sourceSlot }, responseCard, events);
    const responseResult = { type: kind, card_id: baseFrame.cardId, player_id: baseFrame.playerId, source_slot: baseFrame.sourceSlot, target_slot: next.response_window && next.response_window.target_slot || null };
    if (kind === 'BLOCK') responseResult.block_amount = responseBlockAmount(responseCard, next, { player_id: baseFrame.playerId, source_slot: baseFrame.sourceSlot, response_to: next.response_window });
    if (baseFrame.cardId === 'S1-CLE-022' && kind === 'BLOCK' && next.pending_attack_resolution) {
      responseResult.team_scope = true;
      next.pending_attack_resolution.team_block_amount = Number(next.pending_attack_resolution.team_block_amount || 0) + Number(responseResult.block_amount || 0);
      next.pending_attack_resolution.team_block_card_ids = (next.pending_attack_resolution.team_block_card_ids || []).concat(baseFrame.cardId);
    }
    if (kind === 'PREVENT_ALL_ATTACK_DAMAGE') responseResult.prevents_all_attack_damage = true;
    if (baseFrame.redirectTarget) responseResult.redirect_target = baseFrame.redirectTarget;
    if (responseNegatesAttack(kind)) responseResult.negates_attack = true;
    const key = next.response_window && next.response_window.target_key;
    if (key) {
      next.response_results_by_target = next.response_results_by_target || {};
      next.response_results_by_target[key] = responseResult;
      if (next.pending_attack_resolution) next.pending_attack_resolution.response_results_by_target = Object.assign({}, next.pending_attack_resolution.response_results_by_target || {}, { [key]: responseResult });
    }
    if (responseNegatesAttack(kind) && next.pending_attack_resolution) {
      next.pending_attack_resolution.attack_negated = true;
      next.pending_attack_resolution.negating_response_result = responseResult;
    }
    applyResponseCardFollowUps(next, { player_id: baseFrame.playerId, card_id: baseFrame.cardId, source_slot: baseFrame.sourceSlot, response_to: next.response_window }, responseCard, events);
  }
  for (const frame of frames) {
    const player = next.players && next.players[frame.playerId];
    const expectedSlot = normalizeSlotKey(frame.sourceSlot || next.response_window && next.response_window.target_slot);
    const remainsAttached = !frame.cancelled && player && (player.attachments || []).some(attachment => attachment.card_id === frame.cardId
      && (!SLOT_ORDER.includes(expectedSlot) || normalizeSlotKey(attachment.host_slot || attachment.source_slot || attachment.target_slot) === expectedSlot));
    if (player && !remainsAttached) player.discard_pile.push(frame.cardId);
    events.push(createRuntimeEvent(EVENT_TYPES.RESPONSE_RESOLVED, next, { player_id: frame.playerId, card_id: frame.cardId, payload: { frame_id: frame.frameId, cancelled: Boolean(frame.cancelled), resolution_order: 'LIFO', destination: remainsAttached ? 'Attachment Slot' : 'Discard Pile', response_to_card_id: frame.responseToCardId } }));
    events.push(createRuntimeEvent(EVENT_TYPES.OPPONENT_PLAYED_UPDATED, next, { player_id: frame.playerId, card_id: frame.cardId, payload: { public_record_type: 'RESPONSE', status: frame.cancelled ? 'CANCELED' : 'RESOLVED', response_to_card_id: frame.responseToCardId, response_kind: frame.kind, source_slot: frame.sourceSlot, destination: remainsAttached ? 'Attachment Slot' : 'Discard Pile', keep_original_action_visible: true } }));
    if (!remainsAttached) events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED, next, { player_id: frame.playerId, card_id: frame.cardId, payload: { from: 'Response Pending', to: 'Discard Pile', cancelled: Boolean(frame.cancelled) } }));
  }
  next.response_stack = [];
  next.pending_response = null;
}

function finishCurrentHeroResponseWindow(next, events, resolverPlayerId) {
  resolveCommittedResponseStack(next, events);
  const attack = next.pending_attack_resolution;
  if (!attack) return;
  if (attack.attack_negated) {
    next.response_window_queue = [];
    next.response_window = null;
    next.response_current_target = null;
    resolvePendingAttackDamage(next, events, resolverPlayerId);
    return;
  }
  const sequential = Array.isArray(attack.targets) && attack.targets.length > 1;
  if (!sequential) {
    if (!openNextPerHeroResponseWindow(next, events)) resolvePendingAttackDamage(next, events, resolverPlayerId);
    return;
  }
  const currentTarget = next.response_current_target && deepClone(next.response_current_target);
  next.response_window = null;
  next.response_current_target = null;
  next.response_priority_player_id = null;
  resolvePendingAttackDamage(next, events, resolverPlayerId, { target: currentTarget });
  if (next.pending || (next.pending_legacy_defeat_queue || []).length) {
    attack.awaiting_mandatory_choice = true;
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
      player_id: attack.attacking_player_id,
      card_id: attack.card_id,
      target_player_id: currentTarget && currentTarget.target_player_id,
      target_slot: currentTarget && currentTarget.target_slot,
      payload: { result: 'MULTI_TARGET_CONTINUATION_PAUSED', reason: 'MANDATORY_DEFEAT_OR_REPLACEMENT_CHOICE', remaining_response_targets: (next.response_window_queue || []).length }
    }));
    return;
  }
  if (next.game_over) {
    next.response_window_queue = [];
    resolvePendingAttackDamage(next, events, resolverPlayerId, { finalize_only: true });
    return;
  }
  if (!openNextPerHeroResponseWindow(next, events)) resolvePendingAttackDamage(next, events, resolverPlayerId, { finalize_only: true });
}

function resumePendingAttackAfterMandatoryChoice(next, events) {
  const attack = next.pending_attack_resolution;
  if (!attack || !attack.awaiting_mandatory_choice) return false;
  if (next.pending || (next.pending_legacy_defeat_queue || []).length) return false;
  attack.awaiting_mandatory_choice = false;
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: attack.attacking_player_id,
    card_id: attack.card_id,
    payload: { result: 'MULTI_TARGET_CONTINUATION_RESUMED', remaining_response_targets: (next.response_window_queue || []).length }
  }));
  if (next.game_over) {
    next.response_window_queue = [];
    resolvePendingAttackDamage(next, events, attack.attacking_player_id, { finalize_only: true });
    return true;
  }
  if (openNextPerHeroResponseWindow(next, events)) return true;
  resolvePendingAttackDamage(next, events, attack.attacking_player_id, { finalize_only: true });
  return true;
}

function passResponsePriority(state, intent) {
  if (!state.response_window || !state.pending_attack_resolution) return { state, events: [], errors: ['No per-Hero response window is open.'] };
  if (state.pending_response) return { state, events: [], errors: ['Declared response must be confirmed or cancelled before passing.'] };
  if (state.response_priority_player_id !== intent.player_id) return { state, events: [], errors: ['Response priority belongs to the other player.'] };
  const next = deepClone(state), events=[];
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, { player_id: intent.player_id, card_id: next.pending_attack_resolution.card_id, target_player_id: next.response_window.target_player_id, target_slot: next.response_window.target_slot, payload: { result: 'NO_RESPONSE_FOR_CURRENT_PRIORITY', per_affected_hero: true } }));
  finishCurrentHeroResponseWindow(next, events, intent.player_id);
  return { state: appendEvents(next, events), events, errors: [] };
}

function responseCardLegal(state, playerId, cardId, options) {
  const player = getPlayer(state, playerId);
  const card = getCard(state, cardId);
  const errors = [];
  const counteringPendingResponse = Boolean(options && options.countering_pending_response) || Boolean(state.response_stack && state.response_stack.length);
  if (!state.response_window && !counteringPendingResponse) errors.push('No response window is open.');
  if (state.response_priority_player_id && state.response_priority_player_id !== playerId) errors.push('Response priority belongs to the other player.');
  if (!player) errors.push(`Unknown player ${playerId}.`);
  if (!card) errors.push(`Unknown card ${cardId}.`);
  if (state.response_window && state.response_window.attacking_player_id === playerId && !counteringPendingResponse) errors.push('Attacking player cannot respond to their own attack in this window.');
  if (player && !(player.hand || []).includes(cardId)) errors.push(`${cardId} is not in ${playerId}'s hand.`);
  if (card) {
    const timings = cardTimings(card);
    const timingRecord = card.timing && typeof card.timing === 'object' ? card.timing : canonicalLegality(card).timing || {};
    const rawTiming = [card.timing, timingRecord.phase, timingRecord.raw_phase, timingRecord.phase_or_window, timingRecord.action_category, canonicalLegality(card).response_window, card.runtime_tags].map(value => typeof value === 'string' ? value : '').join(' ');
    const textForResponseLike = legacyRuleText(card);
    const effectKinds = structuredEffects(card).map(effect => String(effect && effect.kind || '')).join(' ');
    const responseLike = timings.includes('Response') || /response|reactive|DEF Response|damage would be dealt|targeted by an attack/i.test(rawTiming) || /block|dodge|negate|redirect|cancel|response/i.test(effectKinds) || /incoming|block|dodge|negate|redirect|cannot take any damage/i.test(textForResponseLike);
    if (!responseLike && !counteringPendingResponse) errors.push(`${cardId} is not legal in a Response Window.`);
    if (player && Number(player.mana_pool || 0) < cardCost(card, state, playerId, responseSourceSlotForValidation(state, playerId, card, options && options.intent || {}))) errors.push(`Not enough Mana Shards to use response ${cardId}.`);
    const sourceSlot = responseSourceSlotForValidation(state, playerId, card, options && options.intent || {});
    const responseTargetSlot = normalizeSlotKey(state.response_window && state.response_window.target_slot);
    const hostHeroCard = responseHostHeroCardForValidation(state, playerId, sourceSlot);
    if (SLOT_ORDER.includes(sourceSlot) && SLOT_ORDER.includes(responseTargetSlot) && sourceSlot !== responseTargetSlot && cardId !== 'S1-WAR-004' && !alliedProtectionResponseMayUseDifferentSource(card)) errors.push(`${cardId} must use the affected Hero as its response source.`);
    if (cardId === 'S1-WAR-004') {
      const redirectCheck = responseRedirectTargetForCard(state, playerId, card, options && options.intent || {});
      if (redirectCheck && !redirectCheck.ok) errors.push(...redirectCheck.errors);
    }
    if (player && ['S1-MAG-011', 'S1-WAR-022', 'S1-CLE-025'].includes(cardId) && attachmentLifecycle.isPersistentAttachmentCard(cardId) && (cardId !== 'S1-WAR-022' || unbrokenStandStatusImmunityEligibleForResponse(state, Object.assign({ player_id: playerId, card_id: cardId }, options && options.intent || {})))) {
      const usedSlots = (player.attachments || []).filter(attachment => normalizeSlotKey(attachment.host_slot || attachment.source_slot || attachment.target_slot) === sourceSlot).length;
      if (usedSlots >= 2) errors.push(`Hero in ${sourceSlot} has no empty Attachment Slot for persistent response ${cardId}.`);
    }
    if (responseCardRequiresSkillSource(card)) {
      const playerForSource = getPlayer(state, playerId);
      const slotState = playerForSource && playerForSource.board && playerForSource.board[sourceSlot];
      const sourceCheck = sourceMatchesCard(state, card, slotState, { response: true });
      if (!sourceCheck.ok) errors.push(...sourceCheck.errors);
    }
    if (counteringPendingResponse) {
      const topFrame = state.response_stack && state.response_stack[state.response_stack.length - 1];
      const pendingResponseCard = topFrame && getCard(state, topFrame.cardId);
      const pendingResponseLike = topFrame && { player_id: topFrame.playerId, card_id: topFrame.cardId };
      const counterCheck = responseCanCounterPendingResponse(card, pendingResponseLike, pendingResponseCard, playerId);
      if (!counterCheck.ok) errors.push(...counterCheck.errors);
    } else {
      const responseCheck = responseCardCanAnswerAttack(card, state.pending_attack_resolution, { hostHeroCard, incoming: state.response_window || {} });
      if (!responseCheck.ok) errors.push(...responseCheck.errors);
      if (state.pending_attack_resolution && state.pending_attack_resolution.venom_detonation) {
        const kind = responseKindForCard(card);
        if (kind === 'DODGE') errors.push('Venom Detonation cannot be Dodged.');
        if (!['BLOCK','PREVENT_ALL_ATTACK_DAMAGE'].includes(kind)) errors.push('Venom Detonation only accepts defense that blocks or prevents incoming Magical damage for this Hero.');
        const filterText = `${legacyRuleText(card)} ${card.response_filter || ''} ${card.runtime_tags || ''}`;
        if (kind === 'BLOCK' && !/magical|any damage|all damage/i.test(filterText)) errors.push('This defense does not block incoming Magical damage.');
      }
    }
  }
  return { ok: errors.length === 0, errors, card };
}

function declareResponse(state, intent) {
  const cardId = intent.card_id || intent.payload && intent.payload.card_id;
  if (!cardId) return { state, events: [], errors: ['DECLARE_RESPONSE requires card_id.'] };
  if (state.pending_response) return { state, events: [], errors: ['Another response declaration is already pending confirmation.'] };
  const counteringPendingResponse = Boolean(state.response_stack && state.response_stack.length);
  const legal = responseCardLegal(state, intent.player_id, cardId, { countering_pending_response: counteringPendingResponse, intent });
  if (!legal.ok) return { state, events: [], errors: legal.errors };
  const redirect = counteringPendingResponse ? null : responseRedirectTargetForCard(state, intent.player_id, legal.card, intent);
  if (redirect && !redirect.ok) return { state, events: [], errors: redirect.errors };
  const responsePlayer=getPlayer(state,intent.player_id);
  const requestedHandIndex=Number(intent.hand_index ?? (intent.payload && intent.payload.hand_index));
  const responseHandIndex=Number.isInteger(requestedHandIndex)&&responsePlayer&&responsePlayer.hand[requestedHandIndex]===cardId?requestedHandIndex:(responsePlayer?responsePlayer.hand.indexOf(cardId):-1);
  if(cardId==='S1-ARC-003' && (!responsePlayer || responsePlayer.hand.length<2)) return {state,events:[],errors:['Escape Arrow requires another card in hand to discard.']};
  const next=deepClone(state);
  next.pending_response={ player_id:intent.player_id, card_id:cardId, response_hand_index:responseHandIndex, requires_hand_cost_choice:cardId==='S1-ARC-003', selected_hand_cost_index:null, selected_hand_cost_card_id:null, source_slot:normalizeSlotKey(intent.source_slot || intent.payload && intent.payload.source_slot), response_to:deepClone(state.response_window), redirect_target:redirect&&redirect.ok?{target_player_id:redirect.target_player_id,target_slot:redirect.target_slot}:null, cover_up_swap:redirect&&redirect.cover_up_swap?redirect.cover_up_swap:null, countering_frame_id:counteringPendingResponse?state.response_stack[state.response_stack.length-1].frameId:null };
  const event=createRuntimeEvent(EVENT_TYPES.RESPONSE_DECLARED,next,{player_id:intent.player_id,card_id:cardId,source_slot:next.pending_response.source_slot||undefined,target_slot:state.response_window&&state.response_window.target_slot,payload:{response_to_card_id:counteringPendingResponse?state.response_stack[state.response_stack.length-1].cardId:state.pending_attack_resolution.card_id,counter_response:counteringPendingResponse,confirmed:false,cost_paid:false}});
  return {state:appendEvents(next,event),events:[event],errors:[]};
}

function selectResponseCostCard(state, intent) {
  if (!state.pending_response || state.pending_response.player_id !== intent.player_id) return { state, events: [], errors: ['No owned pending response requires a hand-cost choice.'] };
  if (state.pending_response.card_id !== 'S1-ARC-003') return { state, events: [], errors: ['Pending response does not require selected hand discard.'] };
  const player=getPlayer(state,intent.player_id), raw=intent.hand_index!==undefined?intent.hand_index:intent.payload&&intent.payload.hand_index, index=Number(raw);
  if(!player||!Number.isInteger(index)||index<0||index>=player.hand.length) return {state,events:[],errors:['Choose a valid card in your hand.']};
  if(index===state.pending_response.response_hand_index) return {state,events:[],errors:['Escape Arrow cannot discard itself as its additional cost.']};
  const next=deepClone(state); next.pending_response.selected_hand_cost_index=index; next.pending_response.selected_hand_cost_card_id=player.hand[index];
  next.pending_response.mandatory_prompt={type:'SELECT_RESPONSE_COST_CARD',label:'Choose 1 other card in your Hand to discard.',required_count:1,selected_count:1,owner_visible:true};
  const event=createRuntimeEvent(EVENT_TYPES.TARGET_SELECTED,next,{player_id:intent.player_id,card_id:'S1-ARC-003',payload:{target_type:'additional_hand_discard_cost',selected_hand_index:index,selected_card_id:player.hand[index],identity_visible_to_controller:true,identity_hidden_from_opponent:true}});
  return {state:appendEvents(next,event),events:[event],errors:[]};
}

function confirmResponse(state, intent) {
  if (!state.pending_response) return { state, events: [], errors: ['No pending response to confirm.'] };
  if (state.pending_response.player_id !== intent.player_id) return { state, events: [], errors: ['Only response owner may confirm.'] };
  const responseCard = getCard(state, state.pending_response.card_id);
  const countering = Boolean(state.response_stack && state.response_stack.length);
  const legal = responseCardLegal(state, intent.player_id, state.pending_response.card_id, { countering_pending_response: countering, intent: state.pending_response });
  if (!legal.ok) return { state, events: [], errors: legal.errors };
  let next=deepClone(state); const response=next.pending_response, events=[];
  if (response.card_id==='S1-ARC-003' && !Number.isInteger(response.selected_hand_cost_index)) return {state,events:[],errors:['Choose 1 other card in hand to discard for Escape Arrow.']};
  if (response.card_id==='S1-ARC-003') {
    const hand=next.players[intent.player_id].hand, costIndex=response.selected_hand_cost_index, responseIndex=response.response_hand_index;
    if(costIndex<0||costIndex>=hand.length||costIndex===responseIndex||hand[costIndex]!==response.selected_hand_cost_card_id) return {state,events:[],errors:['Selected Escape Arrow discard cost is no longer legal. Choose the card again.']};
    const costCard=hand.splice(costIndex,1)[0]; next.players[intent.player_id].discard_pile.push(costCard);
    if(costIndex<responseIndex) response.response_hand_index=responseIndex-1;
    events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED,next,{player_id:intent.player_id,card_id:costCard,payload:{from:'Hand',to:'Discard Pile',escape_arrow_additional_cost:true,controller_selected:true}}));
  }
  const mana=cardCost(responseCard,state,intent.player_id,response.source_slot);
  next.players[intent.player_id].mana_pool=Math.max(0,Number(next.players[intent.player_id].mana_pool||0)-mana);
  next.players[intent.player_id].hand=removeOneFromHand(next.players[intent.player_id],response.card_id);
  const frame=committedResponseFrame(next,response,responseCard);
  next.response_stack=(next.response_stack||[]).concat(frame);
  next.pending_response=null;
  next.response_priority_player_id=getOpponentId(next,intent.player_id);
  next.response_window=Object.assign({},next.response_window,{type:'RESPONSE_TO_CONFIRMED_RESPONSE',response_to_frame_id:frame.frameId,response_to_card_id:frame.cardId,priority_player_id:next.response_priority_player_id,original_target_key:frame.targetKey});
  events.push(createRuntimeEvent(EVENT_TYPES.COST_PAID,next,{player_id:intent.player_id,card_id:response.card_id,payload:{mana_cost:mana,response:true,committed_before_counter_window:true}}));
  events.push(createRuntimeEvent(EVENT_TYPES.RESPONSE_CONFIRMED,next,{player_id:intent.player_id,card_id:response.card_id,payload:{frame_id:frame.frameId,response_to_card_id:frame.responseToCardId,zone:'Response Pending'}}));
  events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED,next,{player_id:intent.player_id,card_id:response.card_id,payload:{from:'Hand',to:'Response Pending',response:true}}));
  events.push(createRuntimeEvent(EVENT_TYPES.OPPONENT_PLAYED_UPDATED,next,{player_id:intent.player_id,card_id:response.card_id,source_slot:response.source_slot||undefined,target_slot:next.response_current_target&&next.response_current_target.target_slot,payload:{public_record_type:'RESPONSE',status:'COMMITTED',response_to_card_id:frame.responseToCardId,response_kind:frame.kind,mana_cost:mana,keep_original_action_visible:true}}));
  events.push(createRuntimeEvent(EVENT_TYPES.RESPONSE_WINDOW_OPENED,next,{player_id:next.response_priority_player_id,card_id:response.card_id,target_player_id:next.response_current_target&&next.response_current_target.target_player_id,target_slot:next.response_current_target&&next.response_current_target.target_slot,payload:{response_to:'CONFIRMED_RESPONSE',response_to_frame_id:frame.frameId,cost_already_paid:true}}));
  return {state:appendEvents(next,events),events,errors:[]};
}

function resolvePending(state, intent) {
  const next = deepClone(state);
  const events = [];
  if (next.pending_attack_resolution && next.response_window) return passResponsePriority(state, intent);
  if (next.pending_attack_resolution) {
    resolvePendingAttackDamage(next, events, intent.player_id);
    return { state: appendEvents(next, events), events, errors: [] };
  }
  for (const playerId of Object.keys(next.players || {})) {
    const player = next.players[playerId];
    const remainingAttachments = [];
    for (const attachment of player.attachments || []) {
      if (attachment.attachment_state === 'CASTING' && Number(attachment.counters || 0) >= Number(attachment.counters_required || 0)) {
        resolveDrawCounterCastingObject(next, playerId, attachment, events);
      } else {
        remainingAttachments.push(attachment);
      }
    }
    player.attachments = remainingAttachments;
  }
  if (!events.length) events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, { player_id: intent.player_id, payload: { result: 'NO_PENDING_RUNTIME_OBJECT_READY' } }));
  return { state: appendEvents(next, events), events, errors: [] };
}

function repositionAction(state, intent) {
  if (state.active_player_id !== intent.player_id) return { state, events: [], errors: ['Only active player may reposition.'] };
  if (![PHASES.DEPLOY, PHASES.REFORM].includes(state.phase)) return { state, events: [], errors: ['Reposition is only legal during Deploy or Reform Phase unless a card effect allows it.'] };
  const firstSlot = intent.first_slot || intent.payload && intent.payload.first_slot;
  const secondSlot = intent.second_slot || intent.payload && intent.payload.second_slot;
  const player = getPlayer(state, intent.player_id);
  if (!player) return { state, events: [], errors: [`Unknown player ${intent.player_id}`] };
  const moved = repositionSlots(player.board, firstSlot, secondSlot);
  if (!moved.ok) return { state, events: [], errors: moved.errors };
  const next = updatePlayer(state, intent.player_id, current => Object.assign({}, current, { board: moved.board }));
  const events = [];
  if (!moved.no_op) remapHeroHostedAttachmentsForSlotSwap(next.players[intent.player_id], normalizeSlotKey(firstSlot), normalizeSlotKey(secondSlot), events, next, intent.player_id);
  events.push(
    createRuntimeEvent(EVENT_TYPES.ACTION_DECLARED, next, { player_id: intent.player_id, payload: { action: 'REPOSITION', first_slot: normalizeSlotKey(firstSlot), second_slot: normalizeSlotKey(secondSlot) } }),
    createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, { player_id: intent.player_id, payload: { action: 'REPOSITION', reposition_type: moved.reposition_type, exhausted_hero_slots: moved.exhausted_hero_slots } })
  );
  return { state: appendEvents(next, events), events, errors: [] };
}

function surrender(state, intent) {
  const opponentId = getOpponentId(state, intent.player_id);
  const next = Object.assign({}, state, { game_over: true, winner_id: opponentId, lose_reason: `${intent.player_id} surrendered the match.` });
  const event = createRuntimeEvent(EVENT_TYPES.GAME_ENDED, next, { player_id: intent.player_id, payload: { loser_id: intent.player_id, winner_id: opponentId, reason: 'surrender' } });
  return { state: appendEvents(next, event), events: [event], errors: [] };
}



function cardClassMatches(card, classGroup) {
  return String(card && (card.class_group || card.class_family || card.requirement && card.requirement.base_skill_class) || '').toUpperCase() === String(classGroup || '').toUpperCase();
}

function cardFamilyMatches(card, family) {
  return String(card && (card.card_family || card.family || card.card_type) || '').toLowerCase() === String(family || '').toLowerCase();
}

function cardIsSkillOfClass(state, cardId, classGroup) {
  const card = getCard(state, cardId);
  return !!card && cardFamilyMatches(card, 'Skill') && cardClassMatches(card, classGroup);
}

function legacyTurnKey(state) {
  return `${Number(state && state.round || 1)}:${state && state.active_player_id || ''}`;
}

function isUltimateSkillCard(card) {
  return Boolean(card && cardFamilyMatches(card, 'Skill') && (card.is_ultimate === true || /ultimate/i.test(String(card.classification || card.card_subtype || card.runtime_tags || ''))));
}

function legacyCardIsAttackProfile(card, profile) {
  const classification = String(card && (card.classification || card.action_category) || '').toLowerCase();
  const damageType = String(card && card.attack && card.attack.damage_type || '').toLowerCase();
  if (profile === 'Physical Attack') return classification === 'physical attack' || (classification.includes('physical attack') && damageType === 'physical');
  if (profile === 'Magical Attack') return classification === 'magical attack' || (classification.includes('magical attack') && damageType === 'magical');
  return false;
}

function normalizeIndexSelection(value) {
  const arr = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
  return Array.from(new Set(arr.map(Number).filter(Number.isInteger)));
}

function legacySpecForCardId(cardId) {
  return {
    'S1-ARC-L001': { cls:'Archer', cost:1, kind:'discard_to_deck', count:1, family:'Skill', excludeUltimate:true },
    'S1-ARC-L002': { cls:'Archer', cost:2, kind:'search', count:1, anyCard:true, revealToOpponentPlayed:true },
    'S1-CLE-L001': { cls:'Cleric', cost:1, kind:'search', count:1, profiles:['Physical Attack','Magical Attack'], excludeUltimate:true, revealToOpponentPlayed:true },
    'S1-CLE-L002': { cls:'Cleric', cost:2, kind:'draw', count:3, drawAsManyAsPossible:true },
    'S1-MAG-L001': { cls:'Mage', cost:1, kind:'discard_to_deck', count:1, family:'Skill', excludeUltimate:true },
    'S1-MAG-L002': { cls:'Mage', cost:2, kind:'discard_to_hand', count:1, family:'Skill', excludeUltimate:true, revealToOpponentPlayed:true },
    'S1-THF-L001': { cls:'Thief', cost:1, kind:'discard_to_deck', count:1, family:'Item' },
    'S1-THF-L002': { cls:'Thief', cost:2, kind:'racial_token', count:1 },
    'S1-WAR-L001': { cls:'Warrior', cost:1, kind:'draw', count:1, drawAsManyAsPossible:true },
    'S1-WAR-L002': { cls:'Warrior', cost:2, kind:'discard_to_deck', count:2, family:'Skill', excludeUltimate:true }
  }[cardId] || null;
}

function legacyCostCandidates(state, playerId, spec) {
  const player=getPlayer(state, playerId);
  return (player && player.hand || []).map((id,index)=>({id,index})).filter(x=>cardIsSkillOfClass(state,x.id,spec.cls));
}

function legacyEffectCandidates(state, pending) {
  const player=getPlayer(state, pending.player_id);
  const spec=pending.spec || legacySpecForCardId(pending.legacy_card_id);
  if (!player || !spec) return [];
  if (spec.kind==='discard_to_deck' || spec.kind==='discard_to_hand') {
    const snapshot=Array.isArray(pending.pre_cost_discard_snapshot) ? pending.pre_cost_discard_snapshot : (player.discard_pile || []).slice();
    return snapshot.map((id,index)=>({id,index,card:getCard(state,id)})).filter(x=>x.card && (!spec.family || cardFamilyMatches(x.card,spec.family)) && (!spec.excludeUltimate || !isUltimateSkillCard(x.card)));
  }
  if (spec.kind==='search') {
    return (player.main_deck||[]).map((id,index)=>({id,index,card:getCard(state,id)})).filter(x=>x.card && (spec.anyCard || ((!spec.excludeUltimate || !isUltimateSkillCard(x.card)) && (!spec.profiles || spec.profiles.includes(legacyCardIsAttackProfile(x.card,'Physical Attack') ? 'Physical Attack' : legacyCardIsAttackProfile(x.card,'Magical Attack') ? 'Magical Attack' : '')))));
  }
  return [];
}

function legacyNeedsEffectChoice(spec) {
  return !!spec && ['discard_to_deck','discard_to_hand','search'].includes(spec.kind);
}

function validateLegacyActivationBase(state, intent) {
  const sourceSlot=normalizeSlotKey(intent.source_slot || intent.payload && intent.payload.source_slot);
  const playerId=intent.player_id;
  const player=getPlayer(state,playerId);
  if(!player) return {ok:false,errors:[`Unknown player ${playerId}`]};
  if(state.pending) return {ok:false,errors:['Another action is already pending.']};
  if(state.active_player_id!==playerId || ![PHASES.DEPLOY,PHASES.REFORM].includes(state.phase)) return {ok:false,errors:['All Legacy Abilities are legal only during the owner Deploy Phase or Reform Phase.']};
  const slotState=player.board && player.board[sourceSlot];
  if(!slotState || slotState.slot_mode!=='LEGACY') return {ok:false,errors:['Legacy ability requires a Legacy source slot.']};
  const legacyCardId=intent.card_id || intent.legacy_card_id || intent.payload && (intent.payload.card_id || intent.payload.legacy_card_id) || slotState.legacy_card_id || slotState.card_id || slotState.hero && slotState.hero.card_id;
  const legacyCard=getCard(state,legacyCardId);
  if(!legacyCard || (!cardFamilyMatches(legacyCard,'Legacy') && String(legacyCard.family||'')!=='LegacyModeDefinition')) return {ok:false,errors:['Legacy source must reference a valid Legacy card.']};
  if(slotState.legacy_ability_used_turn===legacyTurnKey(state)) return {ok:false,errors:['This Legacy Ability has already been used this turn.']};
  const spec=legacySpecForCardId(legacyCard.card_id);
  if(!spec) return {ok:false,errors:['No latest Legacy resolver exists for this card.']};
  const costs=legacyCostCandidates(state,playerId,spec);
  if(costs.length<spec.cost) return {ok:false,errors:[`Legacy ability requires ${spec.cost} ${spec.cls} Skill Card(s) in hand.`]};
  const pendingProbe={player_id:playerId,legacy_card_id:legacyCard.card_id,spec,pre_cost_discard_snapshot:(player.discard_pile||[]).slice()};
  const effects=legacyEffectCandidates(state,pendingProbe);
  if(legacyNeedsEffectChoice(spec) && effects.length<spec.count) {
    const zone=spec.kind==='search'?'Main Deck':'Discard Pile before cost payment';
    return {ok:false,errors:[`Legacy effect requires ${spec.count} eligible card instance(s) in the ${zone}.`]};
  }
  if(spec.kind==='racial_token' && racialTokenCount(player)>=racialTokenMax(player)) return {ok:false,errors:['Racial Token pool is already full.']};
  return {ok:true,errors:[],player,sourceSlot,slotState,legacyCard,spec,costs,effects};
}

function useLegacyAbility(state, intent) {
  const check=validateLegacyActivationBase(state,intent);
  if(!check.ok) return {state,events:[],errors:check.errors};
  const next=deepClone(state), events=[];
  next.pending={
    type:'legacy_ability_cost_choice',
    player_id:intent.player_id,
    source_slot:check.sourceSlot,
    legacy_card_id:check.legacyCard.card_id,
    legacy_name:check.legacyCard.name,
    spec:check.spec,
    required_count:check.spec.cost,
    selected_cost_indices:[],
    pre_cost_discard_snapshot:(check.player.discard_pile||[]).slice(),
    private_to_player_id:intent.player_id,
    explicit_selection_required:true,
    single_option_still_requires_selection:true,
    exact_candidate_count_still_requires_selection:true
  };
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_DECLARED,next,{player_id:intent.player_id,card_id:check.legacyCard.card_id,source_slot:check.sourceSlot,payload:{action:'USE_LEGACY_ABILITY',phase:next.phase,choice_stage:'cost',required_count:check.spec.cost,automatic_selection_forbidden:true}}));
  return {state:appendEvents(next,events),events,errors:[]};
}

function selectLegacyCostCard(state,intent) {
  const p=state.pending;
  if(!p || p.type!=='legacy_ability_cost_choice') return {state,events:[],errors:['No pending Legacy activation-cost choice.']};
  if(p.player_id!==intent.player_id) return {state,events:[],errors:['Only the Legacy controller may select activation-cost cards.']};
  const raw=intent.hand_index ?? intent.cost_card_index ?? (intent.payload && (intent.payload.hand_index ?? intent.payload.cost_card_index));
  const index=Number(raw);
  const candidates=legacyCostCandidates(state,p.player_id,p.spec);
  if(!Number.isInteger(index) || !candidates.some(x=>x.index===index)) return {state,events:[],errors:['Selected hand card is not a legal Legacy activation cost.']};
  const selected=normalizeIndexSelection(p.selected_cost_indices);
  const existing=selected.indexOf(index);
  if(existing>=0) selected.splice(existing,1); else {
    if(selected.length>=Number(p.required_count||p.spec.cost)) return {state,events:[],errors:[`Choose exactly ${p.required_count||p.spec.cost} cost card instance(s); deselect one before adding another.`]};
    selected.push(index);
  }
  selected.sort((a,b)=>a-b);
  const next=deepClone(state); next.pending.selected_cost_indices=selected;
  const event=createRuntimeEvent(EVENT_TYPES.TARGET_SELECTED,next,{player_id:p.player_id,card_id:p.legacy_card_id,source_slot:p.source_slot,payload:{target_type:'legacy_activation_cost_card',selected_hand_indices:selected.slice(),selected_count:selected.length,required_count:p.required_count,confirmed:false}});
  return {state:appendEvents(next,event),events:[event],errors:[]};
}

function resolveLegacyAfterCost(next,pending,events) {
  const player=next.players[pending.player_id], slot=player.board[pending.source_slot], spec=pending.spec;
  const result={result:'LEGACY_ABILITY_RESOLVED',action_key:(getCard(next,pending.legacy_card_id).ability||{}).action_key,cost_card_ids:pending.paid_cost_card_ids||[],effect_uses_pre_cost_discard_snapshot:true,cost_cards_excluded_from_same_effect:true,explicit_choice_flow:true};
  if(spec.kind==='draw') {
    result.cards_drawn=drawCardsForPlayer(next,pending.player_id,spec.count,events,pending.legacy_card_id,{visibility:'owner_only',opponent_played:false,deck_out_loss:false,draw_as_many_as_possible:true});
    result.draw_as_many_as_possible=true; result.deck_out_loss=false; result.revealed_to_opponent=false;
  } else if(spec.kind==='racial_token') {
    const gain=gainRacialToken(next,pending.player_id,1,events,pending.legacy_card_id); result.tokens_gained=gain.after-gain.before; result.after_tokens=gain.after;
  }
  slot.legacy_ability_used_turn=legacyTurnKey(next);
  next.pending=null;
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED,next,{player_id:pending.player_id,card_id:pending.legacy_card_id,source_slot:pending.source_slot,payload:result}));
}

function confirmLegacyCost(state,intent) {
  const p=state.pending;
  if(!p || p.type!=='legacy_ability_cost_choice') return {state,events:[],errors:['No pending Legacy activation-cost choice to confirm.']};
  if(p.player_id!==intent.player_id) return {state,events:[],errors:['Only the Legacy controller may confirm the activation cost.']};
  const selected=normalizeIndexSelection(p.selected_cost_indices);
  if(selected.length!==Number(p.required_count||p.spec.cost)) return {state,events:[],errors:[`Select exactly ${p.required_count||p.spec.cost} legal activation-cost card instance(s) before confirming.`]};
  const candidates=legacyCostCandidates(state,p.player_id,p.spec);
  if(selected.some(i=>!candidates.some(x=>x.index===i))) return {state,events:[],errors:['One or more selected activation-cost cards are no longer legal.']};
  const effectCandidates=legacyEffectCandidates(state,p);
  if(legacyNeedsEffectChoice(p.spec) && effectCandidates.length<Number(p.spec.count||1)) return {state,events:[],errors:['Mandatory Legacy effect no longer has enough legal candidates; cost was not paid.']};
  const next=deepClone(state), events=[], player=next.players[p.player_id];
  const paid=[]; for(const idx of selected.slice().sort((a,b)=>b-a)) paid.unshift(player.hand.splice(idx,1)[0]);
  player.discard_pile.push(...paid);
  events.push(createRuntimeEvent(EVENT_TYPES.COST_PAID,next,{player_id:p.player_id,card_id:p.legacy_card_id,source_slot:p.source_slot,payload:{discarded_card_ids:paid,from:'Hand',to:'Discard Pile',selected_and_confirmed:true}}));
  const pending=Object.assign({},p,{paid_cost_card_ids:paid,selected_cost_indices:selected,cost_confirmed:true});
  if(!legacyNeedsEffectChoice(p.spec)) {
    resolveLegacyAfterCost(next,pending,events);
    return {state:appendEvents(next,events),events,errors:[]};
  }
  next.pending={
    type:'legacy_ability_effect_choice',player_id:p.player_id,source_slot:p.source_slot,legacy_card_id:p.legacy_card_id,legacy_name:p.legacy_name,spec:p.spec,
    required_count:p.spec.count,selected_effect_indices:[],pre_cost_discard_snapshot:p.pre_cost_discard_snapshot,paid_cost_card_ids:paid,cost_confirmed:true,
    private_to_player_id:p.player_id,hidden_zone_choice:p.spec.kind==='search',explicit_selection_required:true,single_option_still_requires_selection:true,exact_candidate_count_still_requires_selection:true
  };
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED,next,{player_id:p.player_id,card_id:p.legacy_card_id,source_slot:p.source_slot,payload:{result:'LEGACY_COST_CONFIRMED',next_choice_stage:'effect',required_count:p.spec.count,automatic_selection_forbidden:true}}));
  return {state:appendEvents(next,events),events,errors:[]};
}

function selectLegacyEffectCard(state,intent) {
  const p=state.pending;
  if(!p || p.type!=='legacy_ability_effect_choice') return {state,events:[],errors:['No pending Legacy effect-card choice.']};
  if(p.player_id!==intent.player_id) return {state,events:[],errors:['Only the Legacy controller may select effect cards.']};
  const raw=intent.card_index ?? intent.effect_card_index ?? intent.deck_index ?? intent.discard_index ?? (intent.payload && (intent.payload.card_index ?? intent.payload.effect_card_index ?? intent.payload.deck_index ?? intent.payload.discard_index));
  const index=Number(raw), candidates=legacyEffectCandidates(state,p);
  if(!Number.isInteger(index) || !candidates.some(x=>x.index===index)) return {state,events:[],errors:['Selected card is not a legal candidate for this Legacy effect.']};
  const selected=normalizeIndexSelection(p.selected_effect_indices), existing=selected.indexOf(index);
  if(existing>=0) selected.splice(existing,1); else {
    if(selected.length>=Number(p.required_count||p.spec.count)) return {state,events:[],errors:[`Choose exactly ${p.required_count||p.spec.count} effect card instance(s); deselect one before adding another.`]};
    selected.push(index);
  }
  selected.sort((a,b)=>a-b);
  const next=deepClone(state); next.pending.selected_effect_indices=selected;
  const event=createRuntimeEvent(EVENT_TYPES.TARGET_SELECTED,next,{player_id:p.player_id,card_id:p.legacy_card_id,source_slot:p.source_slot,payload:{target_type:p.spec.kind==='search'?'main_deck_card':'pre_cost_discard_card',selected_indices:selected.slice(),selected_count:selected.length,required_count:p.required_count,identity_visibility:p.spec.kind==='search'?'controller_only':'public_zone',confirmed:false}});
  return {state:appendEvents(next,event),events:[event],errors:[]};
}

function revealLegacyCardToOpponentPlayed(next,pending,cardId,events,fromZone) {
  const opponentId=getOpponentId(next,pending.player_id);
  events.push(createRuntimeEvent(EVENT_TYPES.CARD_REVEALED,next,{player_id:pending.player_id,card_id:cardId,target_player_id:opponentId,payload:{from:fromZone,to_display_zone:'OPPONENT_PLAYED',reveal_to:'opponent',transient:true,then_to:'Hand',hand_private_after_reveal:true,source:'Legacy Ability'}}));
}

function confirmLegacyEffect(state,intent) {
  const p=state.pending;
  if(!p || p.type!=='legacy_ability_effect_choice') return {state,events:[],errors:['No pending Legacy effect-card choice to confirm.']};
  if(p.player_id!==intent.player_id) return {state,events:[],errors:['Only the Legacy controller may confirm the Legacy effect.']};
  const selectedIndices=normalizeIndexSelection(p.selected_effect_indices), required=Number(p.required_count||p.spec.count||1);
  if(selectedIndices.length!==required) return {state,events:[],errors:[`Select exactly ${required} legal effect card instance(s) before confirming.`]};
  const candidates=legacyEffectCandidates(state,p);
  if(selectedIndices.some(i=>!candidates.some(x=>x.index===i))) return {state,events:[],errors:['One or more selected effect cards are no longer legal.']};
  const next=deepClone(state), events=[], player=next.players[p.player_id], slot=player.board[p.source_slot], spec=p.spec;
  const chosenIds=selectedIndices.map(i=>candidates.find(x=>x.index===i).id);
  const result={result:'LEGACY_ABILITY_RESOLVED',action_key:(getCard(next,p.legacy_card_id).ability||{}).action_key,cost_card_ids:p.paid_cost_card_ids||[],effect_uses_pre_cost_discard_snapshot:true,cost_cards_excluded_from_same_effect:true,explicit_choice_flow:true};
  if(spec.kind==='search') {
    const removeIndices=selectedIndices.slice().sort((a,b)=>b-a), found=[];
    for(const idx of removeIndices) found.unshift(player.main_deck.splice(idx,1)[0]);
    for(const id of found) { revealLegacyCardToOpponentPlayed(next,p,id,events,'Main Deck'); player.hand.push(id); events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED,next,{player_id:p.player_id,card_id:id,payload:{from:'Main Deck',to:'Hand',visibility:'owner_private_after_reveal',opponent_played_reveal:true}})); }
    shuffleInPlace(player.main_deck); result.found_card_ids=found; result.main_deck_shuffled=true; result.revealed_via_opponent_played=true;
  } else {
    const removed=[]; for(const idx of selectedIndices.slice().sort((a,b)=>b-a)) removed.unshift(player.discard_pile.splice(idx,1)[0]);
    if(spec.kind==='discard_to_deck') {
      player.main_deck.push(...removed); shuffleInPlace(player.main_deck);
      for(const id of removed) events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED,next,{player_id:p.player_id,card_id:id,payload:{from:'Discard Pile (pre-cost snapshot)',to:'Main Deck',main_deck_shuffled:true}}));
      result.returned_card_ids=removed; result.main_deck_shuffled=true;
    } else if(spec.kind==='discard_to_hand') {
      for(const id of removed) { revealLegacyCardToOpponentPlayed(next,p,id,events,'Discard Pile'); player.hand.push(id); events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED,next,{player_id:p.player_id,card_id:id,payload:{from:'Discard Pile (pre-cost snapshot)',to:'Hand',visibility:'owner_private_after_reveal',opponent_played_reveal:true}})); }
      result.returned_card_ids=removed; result.revealed_via_opponent_played=true;
    }
  }
  slot.legacy_ability_used_turn=legacyTurnKey(next); next.pending=null;
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED,next,{player_id:p.player_id,card_id:p.legacy_card_id,source_slot:p.source_slot,payload:result}));
  return {state:appendEvents(next,events),events,errors:[]};
}

function racialTokenSpendAvailable(state, playerId) {
  const player = state && state.players && state.players[playerId];
  return !!player && player.racial_token_spent_turn !== racialTraitTurnKey(state);
}

function spendRacialToken(next, playerId, sourceCardId, events) {
  const player = next.players && next.players[playerId];
  if (!player) return { ok: false, errors: [`Unknown player ${playerId}`] };
  const turnKey = racialTraitTurnKey(next);
  if (player.racial_token_spent_turn === turnKey) return { ok: false, errors: ['This player has already spent a Racial Token this turn.'] };
  const before = racialTokenCount(player); if (before <= 0) return { ok: false, errors: ['No Racial Token available.'] };
  player.racial_token_pool = Math.max(0, before - 1); player.racial_token_spent_turn = turnKey;
  events.push(createRuntimeEvent(EVENT_TYPES.COST_PAID, next, { player_id: playerId, card_id: sourceCardId, payload: { racial_token_cost: 1, before_tokens: before, after_tokens: player.racial_token_pool, spend_limit: 'once_per_player_per_global_turn', turn_key: turnKey } }));
  return { ok: true, errors: [] };
}



function racialTraitTurnKey(state) {
  return `${Number(state && state.round || 1)}:${state && state.active_player_id || ''}`;
}

function racialTraitProfileForHeroCard(heroCard) {
  const racial = heroCard && heroCard.racial_ability || {};
  const action = racial.action || {};
  const text = String((racial.text || legacyRuleText(heroCard) || '') || '');
  const name = String(racial.name || '');
  const candidate = `${name} ${text}`;
  if (/Human Ambition/i.test(candidate)) return { name: 'Human Ambition', action_key: 'human_ambition', mode: 'active', phase: PHASES.DEPLOY, target_required: false };
  if (/Ancestral Focus/i.test(candidate)) return { name: 'Ancestral Focus', action_key: 'ancestral_focus', mode: 'active', phase: PHASES.DEPLOY, target_required: false };
  if (/Primal Strike/i.test(candidate)) return { name: 'Primal Strike', action_key: 'primal_strike', mode: 'active', phase: PHASES.BATTLE, target_required: true };
  if (/Dragon Scale/i.test(candidate) || action.type === 'response_damage_block') return { name: 'Dragon Scale', action_key: 'dragon_scale', mode: 'response', phase: 'Response' };
  if (/Stoneblood/i.test(candidate) || action.trigger === 'would_be_defeated') return { name: 'Stoneblood', action_key: 'stoneblood', mode: 'trigger', phase: 'would_be_defeated' };
  if (/Second Chance/i.test(candidate) || action.trigger === 'this_hero_skill_card_dodged') return { name: 'Second Chance', action_key: 'second_chance', mode: 'trigger', phase: 'this_hero_skill_card_dodged' };
  if (action.phase) return { name: name || 'Racial Trait', action_key: action.action_key || '', mode: 'active', phase: String(action.phase).replace(/ Phase$/i, '') };
  if (action.type === 'response_damage_block') return { name: name || 'Racial Trait', action_key: action.action_key || '', mode: 'response', phase: 'Response' };
  if (action.trigger) return { name: name || 'Racial Trait', action_key: action.action_key || '', mode: 'trigger', phase: action.trigger };
  return { name: name || 'Racial Trait', action_key: '', mode: 'unknown', phase: null };
}

function validateActiveRacialTraitTiming(state, playerId, profile) {
  if (state.active_player_id !== playerId) return { ok: false, errors: ['Active Racial Trait can only be used by the active player.'] };
  if (profile.mode === 'response') return { ok: false, errors: [`${profile.name} is a Response racial trait and cannot be used as a free action.`] };
  if (profile.mode === 'trigger') return { ok: false, errors: [`${profile.name} is a triggered racial trait and cannot be used as a free action.`] };
  if (profile.mode !== 'active') return { ok: false, errors: ['This Hero has no active Racial Trait action.'] };
  if (profile.phase && state.phase !== profile.phase) return { ok: false, errors: [`${profile.name} can only be used during ${profile.phase} Phase.`] };
  return { ok: true, errors: [] };
}

function racialTraitAlreadyUsedThisTurn(slotState, state) { return false; }

function markRacialTraitUsedThisTurn(next, playerId, sourceSlot) { return next; }

function incomingDamageIncludesHeroSlot(state, playerId, slot) {
  const resolution = state && state.pending_attack_resolution;
  if (!resolution) return false;
  const normalized = normalizeSlotKey(slot);
  const targets = Array.isArray(resolution.targets) && resolution.targets.length
    ? resolution.targets
    : [{ target_player_id: resolution.target_player_id || resolution.defending_player_id, target_slot: resolution.target_slot }];
  return targets.some(target => target && target.target_player_id === playerId && normalizeSlotKey(target.target_slot) === normalized);
}

function racialResponseIdentity(heroCard, profile) {
  const displayName = String(profile && profile.name || 'Racial Trait');
  return {
    response_source_type: 'RACIAL_TRAIT',
    response_display_name: displayName,
    response_card_id: null,
    display_card_id: null,
    source_hero_card_id: heroCard && heroCard.card_id || null,
    source_hero_name: heroCard && heroCard.name || null
  };
}

function useDragonScaleResponse(state, intent, sourceSlot, slotState, heroCard, profile) {
  const playerId = intent.player_id;
  if (!state.response_window || !state.pending_attack_resolution) return { state, events: [], errors: ['Dragon Scale requires an incoming damage response window.'] };
  if (state.response_window.defending_player_id !== playerId) return { state, events: [], errors: ['Dragon Scale can only answer damage against its controller.'] };
  const damageType = String(state.pending_attack_resolution.damage_type || state.response_window.damage_type || '').toLowerCase();
  if (!['physical', 'magical'].includes(damageType)) return { state, events: [], errors: ['Dragon Scale only blocks incoming Physical or Magical damage.'] };
  if (!incomingDamageIncludesHeroSlot(state, playerId, sourceSlot)) return { state, events: [], errors: ['Dragon Scale can only protect the Dragonborn Hero using it.'] };
  let next = deepClone(state);
  const identity = racialResponseIdentity(heroCard, profile);
  const events = [createRuntimeEvent(EVENT_TYPES.RESPONSE_DECLARED, next, { player_id: playerId, card_id: heroCard.card_id, source_slot: sourceSlot, payload: Object.assign({ response_to_card_id: state.response_window.card_id, racial_trait: 'Dragon Scale', response_identity: identity }, identity) })];
  const spend = spendRacialToken(next, playerId, heroCard.card_id, events);
  if (!spend.ok) return { state, events: [], errors: spend.errors };
  next.pending_attack_resolution.response_result = Object.assign({ type: 'BLOCK', card_id: heroCard.card_id, racial_trait: 'Dragon Scale', block_amount: 40, block_target_player_id: playerId, block_target_slot: sourceSlot, response_identity: identity }, identity);
  events.push(createRuntimeEvent(EVENT_TYPES.RESPONSE_CONFIRMED, next, { player_id: playerId, card_id: heroCard.card_id, source_slot: sourceSlot, payload: Object.assign({ racial_trait: 'Dragon Scale', block_amount: 40, response_identity: identity }, identity) }));
  events.push(createRuntimeEvent(EVENT_TYPES.RESPONSE_RESOLVED, next, { player_id: playerId, card_id: heroCard.card_id, source_slot: sourceSlot, payload: Object.assign({ result: Object.assign({ type: 'BLOCK', block_amount: 40, racial_trait: 'Dragon Scale', response_identity: identity }, identity), response_identity: identity }, identity) }));
  next.response_window = null;
  resolvePendingAttackDamage(next, events, playerId);
  return { state: appendEvents(next, events), events, errors: [] };
}

function useRacialTrait(state, intent) {
  const sourceSlot = normalizeSlotKey(intent.source_slot || intent.payload && intent.payload.source_slot);
  const targetSlot = normalizeSlotKey(intent.target_slot || intent.payload && intent.payload.target_slot);
  const playerId = intent.player_id;
  const player = getPlayer(state, playerId);
  if (!player) return { state, events: [], errors: [`Unknown player ${playerId}`] };
  const slotState = player.board && player.board[sourceSlot];
  if (!slotState || slotState.slot_mode !== 'HERO' || !slotState.hero || slotState.hero.defeated) return { state, events: [], errors: ['Racial trait requires a valid source Hero.'] };
  const heroCard = getCard(state, slotState.hero.card_id) || { card_id: slotState.hero.card_id };
  const profile = racialTraitProfileForHeroCard(heroCard);
  if (profile.mode === 'response' && profile.action_key === 'dragon_scale') return useDragonScaleResponse(state, intent, sourceSlot, slotState, heroCard, profile);
  const timingCheck = validateActiveRacialTraitTiming(state, playerId, profile);
  if (!timingCheck.ok) return { state, events: [], errors: timingCheck.errors };

  const next = deepClone(state);
  const events = [createRuntimeEvent(EVENT_TYPES.ACTION_DECLARED, next, { player_id: playerId, card_id: heroCard.card_id, source_slot: sourceSlot, payload: { action: 'USE_RACIAL_TRAIT', racial_trait: profile.name } })];
  const nextPlayer = next.players[playerId];
  const opponentId = getOpponentId(next, playerId);
  const opponent = getPlayer(next, opponentId);

  if (profile.action_key === 'primal_strike') {
    if (!opponent || !SLOT_ORDER.includes(targetSlot)) return { state, events: [], errors: ['Primal Strike requires a valid opponent target_slot.'] };
    const targetState = opponent.board && opponent.board[targetSlot];
    if (!targetState || targetState.slot_mode !== 'HERO' || !targetState.hero || targetState.hero.defeated) return { state, events: [], errors: ['Primal Strike target must be an opponent Hero.'] };
    if (Number(targetState.hero.hp || 0) >= Number(targetState.hero.max_hp || 100)) return { state, events: [], errors: ['Primal Strike target must be injured.'] };
  }

  const spend = spendRacialToken(next, playerId, heroCard.card_id, events);
  if (!spend.ok) return { state, events: [], errors: spend.errors };

  if (profile.action_key === 'human_ambition') {
    const before = nextPlayer.hand.length;
    const drawn = drawCardsForPlayer(next, playerId, 2, events, heroCard.card_id);
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, { player_id: playerId, card_id: heroCard.card_id, source_slot: sourceSlot, payload: { result: 'HUMAN_AMBITION_DRAW_RESOLVED', cards_drawn: drawn, before_hand: before, after_hand: nextPlayer.hand.length, does_exhaust: false } }));
  } else if (profile.action_key === 'ancestral_focus') {
    const before = Number(nextPlayer.mana_pool || 0);
    nextPlayer.mana_pool = before + 2;
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, { player_id: playerId, card_id: heroCard.card_id, source_slot: sourceSlot, payload: { result: 'ANCESTRAL_FOCUS_MANA_RESOLVED', mana_gained: 2, before_mana: before, after_mana: nextPlayer.mana_pool, does_exhaust: false } }));
  } else if (profile.action_key === 'primal_strike') {
    next.pending_attack_resolution = {
      type: 'ABILITY_DAMAGE_RESOLUTION',
      ability_damage: true,
      source_ability: 'Primal Strike',
      attacking_player_id: playerId,
      defending_player_id: opponentId,
      card_id: heroCard.card_id,
      source_slot: sourceSlot,
      target_player_id: opponentId,
      target_slot: targetSlot,
      targets: [{ target_player_id: opponentId, target_slot: targetSlot }],
      base_damage: 20,
      final_damage: 20,
      damage_type: 'Physical',
      action_profile: 'Physical Damage',
      area: false,
      status_effects: [],
      cannot_be_dodged: false,
      cannot_be_blocked: false,
      response_result: null
    };
    next.response_window = {
      type: 'PHYSICAL_DAMAGE_WOULD_BE_DEALT',
      card_id: heroCard.card_id,
      source_ability: 'Primal Strike',
      attacking_player_id: playerId,
      defending_player_id: opponentId,
      source_slot: sourceSlot,
      target_player_id: opponentId,
      target_slot: targetSlot,
      damage_type: 'Physical',
      damage_amount: 20,
      area: false,
      allowed_responses: ['DODGE', 'BLOCK']
    };
    next.response_priority_player_id = opponentId;
    events.push(createRuntimeEvent(EVENT_TYPES.RESPONSE_WINDOW_OPENED, next, { player_id: opponentId, card_id: heroCard.card_id, source_slot: sourceSlot, target_player_id: opponentId, target_slot: targetSlot, payload: { response_to: 'PRIMAL_STRIKE_PHYSICAL_DAMAGE', damage_amount: 20, damage_type: 'Physical', allowed_responses: ['DODGE', 'BLOCK'] } }));
  } else {
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, { player_id: playerId, card_id: heroCard.card_id, source_slot: sourceSlot, payload: { result: 'RACIAL_TRAIT_DATA_PATH_CERTIFIED', racial_trait: profile.name, does_exhaust: false } }));
  }
  return { state: appendEvents(next, events), events, errors: [] };
}

function useAbility(state, intent) {
  const sourceSlot = normalizeSlotKey(intent.source_slot || intent.payload && intent.payload.source_slot);
  const targetSlot = normalizeSlotKey(intent.target_slot || intent.payload && intent.payload.target_slot);
  const playerId = intent.player_id;
  const player = getPlayer(state, playerId);
  const slotState = player && player.board && player.board[sourceSlot];
  if (slotState && slotState.slot_mode === 'LEGACY') return useLegacyAbility(state, intent);
  if (!player || !slotState || slotState.slot_mode !== 'HERO' || !slotState.hero || slotState.hero.defeated) return { state, events: [], errors: ['Hero Ability requires a valid source Hero.'] };
  const heroCard = getCard(state, slotState.hero.card_id) || {};
  const cls = String(heroCard.display_class || heroCard.class || (heroCard.identity && (heroCard.identity.display_class || heroCard.identity.class)) || '').toLowerCase();
  if (!(cls === 'paladin' || cls === 'crusader')) return { state, events: [], errors: ['This Hero has no active Hero Ability action; passive abilities apply through runtime pipelines.'] };
  if (state.active_player_id !== playerId || state.phase !== PHASES.DEPLOY) return { state, events: [], errors: ['Holy Resurgence / Radiant Oblivion can only be used during your Deploy Phase.'] };
  if (slotState.hero.exhausted) return { state, events: [], errors: ['Source Hero is Exhausted.'] };
  if (heroHasStatus(slotState, 'Stun')) return { state, events: [], errors: ['Stunned Hero cannot use this Hero Ability.'] };
  if (slotState.hero.hero_ability_used_turn === racialTraitTurnKey(state)) return { state, events: [], errors: ['Hero Ability has already been used by this Hero this turn.'] };
  if (Number(player.mana_pool || 0) < 1) return { state, events: [], errors: ['Not enough Mana Shards to use Hero Ability.'] };
  const targetState = player.board && player.board[targetSlot];
  if (!targetState || targetState.slot_mode !== 'HERO' || !targetState.hero || targetState.hero.defeated) return { state, events: [], errors: ['Hero Ability target must be one own active Hero.'] };
  if (Number(targetState.hero.hp || 0) >= Number(targetState.hero.max_hp || 100)) return { state, events: [], errors: ['Hero Ability target must be damaged.'] };
  if (heroHasStatus(targetState, 'Bleed')) return { state, events: [], errors: ['Hero Ability cannot heal a Hero with Bleed.'] };
  let next = deepClone(state);
  const events = [];
  const nextPlayer = next.players[playerId];
  const nextSource = nextPlayer.board[sourceSlot].hero;
  const nextTarget = nextPlayer.board[targetSlot].hero;
  const baseHealAmount = cls === 'crusader' ? 20 : 10;
  const healingModifierAmount = activeHealingReceivedModifierAmount(next, playerId, targetSlot, events, heroCard.card_id);
  const healAmount = baseHealAmount + healingModifierAmount;
  const beforeMana = Number(nextPlayer.mana_pool || 0);
  nextPlayer.mana_pool = beforeMana - 1;
  const beforeHp = Number(nextTarget.hp || 0);
  nextTarget.hp = Math.min(Number(nextTarget.max_hp || 100), beforeHp + healAmount);
  nextSource.exhausted = true;
  nextSource.hero_ability_used_turn = racialTraitTurnKey(next);
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_DECLARED, next, { player_id: playerId, card_id: heroCard.card_id, source_slot: sourceSlot, target_player_id: playerId, target_slot: targetSlot, payload: { action: 'USE_ABILITY', ability: cls === 'crusader' ? 'Radiant Oblivion' : 'Holy Resurgence' } }));
  events.push(createRuntimeEvent(EVENT_TYPES.COST_PAID, next, { player_id: playerId, card_id: heroCard.card_id, source_slot: sourceSlot, payload: { mana_cost: 1, before_mana: beforeMana, after_mana: nextPlayer.mana_pool } }));
  events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, { player_id: playerId, card_id: heroCard.card_id, source_slot: sourceSlot, target_player_id: playerId, target_slot: targetSlot, payload: { result: 'HERO_ABILITY_HEAL_RESOLVED', heal_amount: healAmount, base_heal_amount: baseHealAmount, healing_modifier_amount: healingModifierAmount, before_hp: beforeHp, after_hp: nextTarget.hp, source_exhausted: true, once_per_turn: true } }));
  return { state: appendEvents(next, events), events, errors: [] };
}

function confirmDrawReplacement(state, intent) {
  if (!state || !state.pending || state.pending.type !== 'draw_replacement_choice') return { state, events: [], errors: ['No draw replacement choice is pending.'] };
  const pending = state.pending;
  if (pending.player_id !== intent.player_id) return { state, events: [], errors: ['Only draw replacement owner may confirm.'] };
  const choice = String(intent.choice || intent.decision || intent.payload && (intent.payload.choice || intent.payload.decision) || '').toLowerCase();
  if (!['keep', 'redraw', 'shuffle_redraw', 'shuffle-redraw'].includes(choice)) return { state, events: [], errors: ['Draw replacement choice must be keep or redraw.'] };
  let next = deepClone(state);
  const events = [];
  const player = getPlayer(next, pending.player_id);
  const slotState = player && player.board && player.board[pending.source_slot];
  const hero = slotState && slotState.hero;
  if (!player || !hero) return { state, events: [], errors: ['Draw replacement source Hero is no longer available.'] };
  hero.draw_replacement_used_turn = runtimeTurnStamp(next);
  const drawnCardId = pending.drawn_card_id;
  const idx = Number.isInteger(pending.hand_index) && player.hand[pending.hand_index] === drawnCardId ? pending.hand_index : player.hand.lastIndexOf(drawnCardId);
  next.pending = null;
  if (choice === 'keep') {
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
      player_id: pending.player_id,
      card_id: pending.source_hero_card_id,
      source_slot: pending.source_slot,
      payload: { result: 'DRAW_REPLACEMENT_KEEP', ability_id: pending.ability_id, ability_name: pending.ability_name, kept_card_id: drawnCardId }
    }));
    return { state: appendEvents(next, events), events, errors: [] };
  }
  if (idx < 0) return { state, events: [], errors: ['The just-drawn card is no longer in hand.'] };
  player.hand.splice(idx, 1);
  player.main_deck.push(drawnCardId);
  shuffleInPlace(player.main_deck);
  events.push(createRuntimeEvent(EVENT_TYPES.CARD_MOVED, next, {
    player_id: pending.player_id,
    card_id: drawnCardId,
    payload: { from: 'Hand', to: 'Main Deck', ability_id: pending.ability_id, ability_name: pending.ability_name, shuffle_redraw: true }
  }));
  const drawn = drawOneCardForPlayer(next, pending.player_id, { suppress_draw_replacement: true, source: pending.ability_id });
  next = drawn.state;
  const actionEvent = createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, {
    player_id: pending.player_id,
    card_id: pending.source_hero_card_id,
    source_slot: pending.source_slot,
    payload: { result: 'DRAW_REPLACEMENT_REDRAW', ability_id: pending.ability_id, ability_name: pending.ability_name, returned_card_id: drawnCardId }
  });
  return { state: appendEvents(next, actionEvent), events: events.concat(drawn.events || [], [actionEvent]), errors: drawn.errors || [] };
}

function confirmTriggeredRacial(state, intent) {
  if (!state || !state.pending || state.pending.type !== 'racial_trigger_choice') return { state, events: [], errors: ['No triggered racial choice is pending.'] };
  const pending = state.pending;
  if (pending.player_id !== intent.player_id) return { state, events: [], errors: ['Only triggered racial owner may confirm.'] };
  const choice = String(intent.choice || intent.decision || intent.payload && (intent.payload.choice || intent.payload.decision) || 'use').toLowerCase();
  let next = deepClone(state);
  const events = [];
  const player = getPlayer(next, pending.player_id);
  const slot = normalizeSlotKey(pending.source_slot);
  const slotState = player && player.board && player.board[slot];
  if (!player || !slotState || !slotState.hero) return { state, events: [], errors: ['Triggered racial source is no longer available.'] };
  next.pending = null;
  if (pending.trigger === 'stoneblood') {
    if (choice === 'decline' || choice === 'no' || choice === 'skip') {
      slotState.hero.pending_defeat = false;
      queueHeroDefeatLegacyChoice(next, pending.player_id, slot, slotState, events, pending.cause_card_id || 'Stoneblood declined');
      applyLoseCheckAfterDamage(next, pending.player_id, events);
      if (!next.pending && !(next.pending_legacy_defeat_queue || []).length) resumePendingAttackAfterMandatoryChoice(next, events);
      return { state: appendEvents(next, events), events, errors: [] };
    }
    const spend = spendRacialToken(next, pending.player_id, slotState.hero.card_id, events);
    if (!spend.ok) return { state, events: [], errors: spend.errors };
    slotState.hero.pending_defeat = false;
    slotState.hero.stoneblood_used_turn = racialTraitTurnKey(next);
    slotState.hero.hp = 10;
    slotState.hero.defeated = false;
    slotState.slot_mode = 'HERO';
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, { player_id: pending.player_id, card_id: slotState.hero.card_id, target_player_id: pending.player_id, target_slot: slot, payload: { result: 'STONEBLOOD_PREVENT_DEFEAT_RESOLVED', after_hp: 10, racial_token_spent: 1, usage_limit: 'racial_tokens_only' } }));
    resumePendingAttackAfterMandatoryChoice(next, events);
    return { state: appendEvents(next, events), events, errors: [] };
  }
  if (pending.trigger === 'second_chance') {
    if (choice === 'decline' || choice === 'no' || choice === 'skip') {
      events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, { player_id: pending.player_id, card_id: pending.source_hero_card_id, source_slot: slot, payload: { result: 'SECOND_CHANCE_DECLINED', dodged_card_id: pending.card_id } }));
      return { state: appendEvents(next, events), events, errors: [] };
    }
    const spend = spendRacialToken(next, pending.player_id, pending.source_hero_card_id, events);
    if (!spend.ok) return { state, events: [], errors: spend.errors };
    const idx = (player.discard_pile || []).lastIndexOf(pending.card_id);
    if (idx >= 0) player.discard_pile.splice(idx, 1);
    const replayPending = { type: 'PLAY_CARD', player_id: pending.player_id, card_id: pending.card_id, source_required: true, target_required: true, target_owner_id: pending.target_player_id, target_player_id: pending.target_player_id, source_slot: slot, target_slot: pending.target_slot, confirmed: true, second_chance_replay: true };
    const card = getCard(next, pending.card_id);
    const attackResolution = buildPendingAttackResolution(next, replayPending, card);
    if (!attackResolution) return { state, events: [], errors: ['Second Chance could not rebuild the dodged Skill attack.'] };
    next.pending_attack_resolution = attackResolution;
    next.response_window = { type: attackResolution.area ? 'AREA_ATTACK_DAMAGE_WOULD_BE_DEALT' : 'ATTACK_DAMAGE_WOULD_BE_DEALT', card_id: pending.card_id, attacking_player_id: pending.player_id, defending_player_id: pending.target_player_id, source_slot: slot, target_player_id: pending.target_player_id, target_slot: pending.target_slot, damage_type: attackResolution.damage_type, damage_amount: attackResolution.base_damage, area: attackResolution.area, second_chance_replay: true };
    events.push(createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, next, { player_id: pending.player_id, card_id: pending.source_hero_card_id, source_slot: slot, payload: { result: 'SECOND_CHANCE_REPLAY_OPENED', replay_card_id: pending.card_id, racial_token_spent: 1, mana_cost: 0 } }));
    events.push(createRuntimeEvent(EVENT_TYPES.RESPONSE_WINDOW_OPENED, next, { player_id: pending.target_player_id, card_id: pending.card_id, source_slot: slot, target_player_id: pending.target_player_id, target_slot: pending.target_slot, payload: { response_to: next.response_window.type, second_chance_replay: true } }));
    return { state: appendEvents(next, events), events, errors: [] };
  }
  return { state, events: [], errors: [`Unhandled triggered racial ${pending.trigger}`] };
}

function submitIntent(state, intent) {
  const validation = validateMinimalIntent(intent);
  if (!validation.ok) return { state, events: [], pending: state && state.pending, errors: validation.errors };
  if (intent.type !== 'START_GAME' && (!state || state.game_over)) return { state, events: [], pending: state && state.pending, errors: ['Game is over or missing.'] };
  let result;
  switch (intent.type) {
    case 'START_GAME': {
      const initialState = createInitialRuntimeState(intent.payload || {});
      const startEvent = createRuntimeEvent(EVENT_TYPES.ACTION_RESOLVED, initialState, { player_id: intent.player_id, payload: { action: 'START_GAME' } });
      const withStartEvent = appendEvents(initialState, startEvent);
      const draw = drawOneCardForPlayer(withStartEvent, withStartEvent.active_player_id, { suppress_draw_replacement: true, source: 'start_game' });
      result = { state: draw.state, events: [startEvent].concat(draw.events), errors: draw.errors || [] };
      break;
    }
    case 'PLAY_CARD': result = startPendingAction(state, intent); break;
    case 'SELECT_SOURCE': result = selectSource(state, intent); break;
    case 'SELECT_TARGET_SLOT': result = selectTargetSlot(state, intent); break;
    case 'SELECT_STATUS_TO_REMOVE': result = selectStatusToRemove(state, intent); break;
    case 'SELECT_SCOUTING_EXP_CARD': result = selectScoutingExpCard(state, intent); break;
    case 'SELECT_OPPONENT_HAND_CARD': result = selectOpponentHandCard(state, intent); break;
    case 'SELECT_RESPONSE_COST_CARD': result = selectResponseCostCard(state, intent); break;
    case 'CONFIRM_ACTION': result = confirmAction(state, intent); break;
    case 'DECLARE_RESPONSE': result = declareResponse(state, intent); break;
    case 'CONFIRM_RESPONSE': result = confirmResponse(state, intent); break;
    case 'PASS_RESPONSE_PRIORITY': result = passResponsePriority(state, intent); break;
    case 'RESOLVE_PENDING': result = resolvePending(state, intent); break;
    case 'REPOSITION': result = repositionAction(state, intent); break;
    case 'USE_RACIAL_TRAIT': result = useRacialTrait(state, intent); break;
    case 'USE_ABILITY': result = useAbility(state, intent); break;
    case 'CONFIRM_DRAW_REPLACEMENT': result = confirmDrawReplacement(state, intent); break;
    case 'CONFIRM_TRIGGERED_RACIAL': result = confirmTriggeredRacial(state, intent); break;
    case 'SELECT_LEGACY_CARD': result = selectLegacyCardForDefeat(state, intent); break;
    case 'CONFIRM_LEGACY_CHOICE': result = confirmLegacyChoice(state, intent); break;
    case 'SELECT_LEGACY_COST_CARD': result = selectLegacyCostCard(state, intent); break;
    case 'CONFIRM_LEGACY_COST': result = confirmLegacyCost(state, intent); break;
    case 'SELECT_LEGACY_EFFECT_CARD': result = selectLegacyEffectCard(state, intent); break;
    case 'CONFIRM_LEGACY_EFFECT': result = confirmLegacyEffect(state, intent); break;
    case 'SELECT_REPOSITION_TARGET': result = selectPostAttackRepositionTarget(state, intent); break;
    case 'SKIP_REPOSITION': result = skipPostAttackReposition(state, intent); break;
    case 'NEXT_PHASE': result = nextPhase(state); break;
    case 'SURRENDER': result = surrender(state, intent); break;
    default: result = { state, events: [], errors: [`Unhandled intent ${intent.type}`] };
  }
  return { state: result.state, events: result.events || [], pending: result.state && result.state.pending, errors: result.errors || [] };
}

function legalSourceActions(state, playerId, pending) {
  const card = getCard(state, pending.card_id);
  const actions = [];
  const player = getPlayer(state, playerId);
  for (const slot of SLOT_ORDER) {
    const check = sourceMatchesCard(state, card, player && player.board && player.board[slot]);
    if (check.ok) actions.push({ type: 'SELECT_SOURCE', player_id: playerId, source_slot: slot });
  }
  return actions;
}

function legalTargetActions(state, playerId, pending) {
  const card = getCard(state, pending.card_id);
  const actions = [];
  const targetPlayerId = pending.target_owner_id || determineTargetOwnerId(state, card, playerId);
  for (const slot of SLOT_ORDER) {
    const check = targetMatchesCard(state, card, targetPlayerId, slot, playerId);
    if (check.ok) actions.push({ type: 'SELECT_TARGET_SLOT', player_id: playerId, target_player_id: targetPlayerId, target_slot: slot });
  }
  return actions;
}

function getLegalActions(state, playerId) {
  if (!state || state.game_over) return [];
  if (state.pending && state.pending.player_id === playerId) {
    const actions = [];
    if (state.pending.type === 'draw_replacement_choice') {
      actions.push({ type: 'CONFIRM_DRAW_REPLACEMENT', player_id: playerId, choice: 'keep' });
      actions.push({ type: 'CONFIRM_DRAW_REPLACEMENT', player_id: playerId, choice: 'redraw' });
      return actions;
    }
    if (state.pending.type === 'racial_trigger_choice') {
      actions.push({ type: 'CONFIRM_TRIGGERED_RACIAL', player_id: playerId, choice: 'use' });
      actions.push({ type: 'CONFIRM_TRIGGERED_RACIAL', player_id: playerId, choice: 'decline' });
      return actions;
    }
    if (state.pending.type === 'saint_purify_choice') {
      for (const choice of negativeStatusChoicesForTarget(state, state.pending.target_player_id, state.pending.target_slot)) actions.push({ type: 'SELECT_STATUS_TO_REMOVE', player_id: playerId, status_index: choice.index, status_name: choice.name, source: 'Holy Rejuvenation' });
      return actions;
    }
    if (state.pending.type === 'legacy_ability_cost_choice') {
      for (const choice of legacyCostCandidates(state, playerId, state.pending.spec)) actions.push({ type: 'SELECT_LEGACY_COST_CARD', player_id: playerId, hand_index: choice.index, card_id: choice.id, selected: normalizeIndexSelection(state.pending.selected_cost_indices).includes(choice.index) });
      if (normalizeIndexSelection(state.pending.selected_cost_indices).length === Number(state.pending.required_count || state.pending.spec.cost)) actions.push({ type: 'CONFIRM_LEGACY_COST', player_id: playerId });
      return actions;
    }
    if (state.pending.type === 'legacy_ability_effect_choice') {
      for (const choice of legacyEffectCandidates(state, state.pending)) actions.push({ type: 'SELECT_LEGACY_EFFECT_CARD', player_id: playerId, card_index: choice.index, card_id: choice.id, zone: state.pending.spec.kind === 'search' ? 'Main Deck' : 'Discard Pile', identity_visibility: state.pending.spec.kind === 'search' ? 'controller_only' : 'public', selected: normalizeIndexSelection(state.pending.selected_effect_indices).includes(choice.index) });
      if (normalizeIndexSelection(state.pending.selected_effect_indices).length === Number(state.pending.required_count || state.pending.spec.count)) actions.push({ type: 'CONFIRM_LEGACY_EFFECT', player_id: playerId });
      return actions;
    }
    if (state.pending.type === 'legacy_defeat_choice') {
      for (let index = 0; index < (state.pending.candidates || []).length; index += 1) {
        actions.push({ type: 'SELECT_LEGACY_CARD', player_id: playerId, legacy_index: index, legacy_card_id: state.pending.candidates[index] });
      }
      if (state.pending.selected_legacy_card_id || Number.isInteger(state.pending.selected_index)) actions.push({ type: 'CONFIRM_LEGACY_CHOICE', player_id: playerId, legacy_card_id: state.pending.selected_legacy_card_id || (state.pending.candidates || [])[state.pending.selected_index] });
      return actions;
    }
    if (state.pending.type === 'post_attack_reposition_choice') {
      for (const choice of state.pending.choices || []) {
        actions.push({ type: 'SELECT_REPOSITION_TARGET', player_id: playerId, choice_index: choice.choice_index, target_player_id: choice.target_player_id, first_slot: choice.first_slot, second_slot: choice.second_slot, reposition_model: choice.reposition_model });
      }
      actions.push({ type: 'SKIP_REPOSITION', player_id: playerId });
      return actions;
    }
    if (state.pending.source_required && !state.pending.source_slot) actions.push(...legalSourceActions(state, playerId, state.pending));
    if (state.pending.target_required && (state.pending.card_id === 'S1-ARC-017' ? normalizeMultiTargetSlots(state.pending.target_slots).length < 2 : !state.pending.target_slot)) actions.push(...legalTargetActions(state, playerId, state.pending).filter(a => state.pending.card_id !== 'S1-ARC-017' || !normalizeMultiTargetSlots(state.pending.target_slots).includes(a.target_slot)));
    if ((!state.pending.source_required || state.pending.source_slot) && (!state.pending.target_required || state.pending.target_slot) && state.pending.requires_status_choice && (state.pending.selected_status_index === null || state.pending.selected_status_index === undefined) && !state.pending.selected_status_name) {
      for (const choice of state.pending.status_choices || []) actions.push({ type: 'SELECT_STATUS_TO_REMOVE', player_id: playerId, status_index: choice.index, status_name: choice.name });
    }
    if ((!state.pending.source_required || state.pending.source_slot) && state.pending.requires_opponent_hand_choice && !Number.isInteger(state.pending.selected_opponent_hand_index)) {
      const opponent = getPlayer(state, getOpponentId(state, playerId));
      const handLength = opponent && Array.isArray(opponent.hand) ? opponent.hand.length : 0;
      for (let index = 0; index < handLength; index += 1) actions.push({ type: 'SELECT_OPPONENT_HAND_CARD', player_id: playerId, hand_index: index, card_back: true, identity_masked: true });
    }
    if ((!state.pending.source_required || state.pending.source_slot) && state.pending.target_slot && state.pending.requires_exp_choice && !Number.isInteger(state.pending.selected_exp_index)) {
      for (const choice of scoutingExpChoicesForTarget(state, state.pending.target_player_id, state.pending.target_slot)) actions.push({ type: 'SELECT_SCOUTING_EXP_CARD', player_id: playerId, exp_index: choice.index, exp_card_id: choice.card_id });
    }
    if (pendingRequirementsSatisfied(state.pending)) actions.push({ type: 'CONFIRM_ACTION', player_id: playerId });
    return actions;
  }
  if (state.response_window && !state.pending_response && state.response_priority_player_id === playerId) {
    const player = getPlayer(state, playerId);
    const actions = [];
    if (player && player.board && !(state.response_stack || []).length) {
      for (const slot of SLOT_ORDER) {
        const slotState = player.board[slot];
        const heroCard = slotState && slotState.hero && getCard(state, slotState.hero.card_id);
        const profile = racialTraitProfileForHeroCard(heroCard || {});
        const damageType = String(state.pending_attack_resolution && state.pending_attack_resolution.damage_type || state.response_window.damage_type || '').toLowerCase();
        const tokens = Number(player.racial_token_pool || 0);
        if (profile.action_key === 'dragon_scale' && tokens > 0 && racialTokenSpendAvailable(state, playerId) && ['physical','magical'].includes(damageType) && incomingDamageIncludesHeroSlot(state, playerId, slot)) actions.push({ type: 'USE_RACIAL_TRAIT', player_id: playerId, source_slot: slot, racial_trait: 'Dragon Scale', block_amount: 40 });
      }
    }
    for (const cardId of player ? player.hand : []) {
      const responseCard = getCard(state, cardId);
      const sourceSlots = responseCandidateSourceSlots(state, playerId, responseCard);
      for (const candidateSourceSlot of sourceSlots) {
        const responseIntent = { source_slot: candidateSourceSlot };
        const check = responseCardLegal(state, playerId, cardId, { countering_pending_response: Boolean(state.response_stack && state.response_stack.length), intent: responseIntent });
        if (check.ok) actions.push({ type: 'DECLARE_RESPONSE', player_id: playerId, card_id: cardId, card_name: check.card && check.card.name, mana_cost: cardCost(check.card, state, playerId, responseSourceSlotForValidation(state, playerId, check.card, responseIntent)), source_slot: responseSourceSlotForValidation(state, playerId, check.card, responseIntent), affected_target_slot: state.response_window && state.response_window.target_slot, counter_response: Boolean(state.response_stack && state.response_stack.length) });
      }
    }
    actions.push({ type: 'PASS_RESPONSE_PRIORITY', player_id: playerId, label: (state.response_stack || []).length ? 'Pass / resolve confirmed response chain' : 'No response' });
    return actions;
  }
  if (state.pending_response && state.pending_response.player_id === playerId) { if (state.pending_response.card_id === 'S1-ARC-003' && !Number.isInteger(state.pending_response.selected_hand_cost_index)) { const player=getPlayer(state,playerId); return (player&&player.hand||[]).map((id,index)=>({type:'SELECT_RESPONSE_COST_CARD',player_id:playerId,hand_index:index,card_id:id,card_name:(getCard(state,id)||{}).name||id,owner_visible:true,prompt:'Choose 1 other card in your Hand to discard.'})).filter(a=>a.hand_index!==state.pending_response.response_hand_index); } return [{ type: 'CONFIRM_RESPONSE', player_id: playerId }]; }
  if (state.active_player_id !== playerId || state.pending) return [];
  const player = getPlayer(state, playerId);
  const actions = [];
  for (const cardId of player ? player.hand : []) {
    const check = canStartPlayCard(state, playerId, cardId);
    if (check.ok) actions.push({ type: 'PLAY_CARD', player_id: playerId, card_id: cardId, mana_cost: cardCost(check.card, state, playerId), card_name: check.card && check.card.name });
  }
  if (player && player.board) {
    for (const slot of SLOT_ORDER) {
      const slotState = player.board[slot];
      if (slotState && slotState.slot_mode === 'LEGACY') {
        const legacyCardId = slotState.legacy_card_id || slotState.active_legacy_card_id || slotState.card_id;
        const legacyCard = getCard(state, legacyCardId);
        const legacyCheck = validateLegacyActivationBase(state, { type:'USE_ABILITY', player_id:playerId, source_slot:slot, legacy_card_id:legacyCardId });
        if (legacyCheck.ok) actions.push({ type:'USE_ABILITY', player_id:playerId, source_slot:slot, legacy_card_id:legacyCardId, ability_name:legacyCard && legacyCard.name, choice_flow:'explicit_cost_then_effect' });
        continue;
      }
      const heroCard = slotState && slotState.hero && getCard(state, slotState.hero.card_id);
      if (!heroCard || !slotState || slotState.slot_mode !== 'HERO' || slotState.hero.defeated) continue;
      const profile = racialTraitProfileForHeroCard(heroCard);
      if (profile.mode === 'active' && Number(player.racial_token_pool || 0) > 0 && racialTokenSpendAvailable(state, playerId) && state.phase === profile.phase) actions.push({ type: 'USE_RACIAL_TRAIT', player_id: playerId, source_slot: slot, racial_trait: profile.name });
      const cls = String(heroCard.display_class || heroCard.class || (heroCard.identity && (heroCard.identity.display_class || heroCard.identity.class)) || '').toLowerCase();
      const hasLegalHealTarget = SLOT_ORDER.some(targetSlot => {
        const targetState = player.board && player.board[targetSlot];
        return targetState && targetState.slot_mode === 'HERO' && targetState.hero && !targetState.hero.defeated
          && Number(targetState.hero.hp || 0) < Number(targetState.hero.max_hp || 100)
          && !heroHasStatus(targetState, 'Bleed');
      });
      if ((cls === 'paladin' || cls === 'crusader') && state.phase === PHASES.DEPLOY && !slotState.hero.exhausted && !heroHasStatus(slotState, 'Stun') && slotState.hero.hero_ability_used_turn !== racialTraitTurnKey(state) && Number(player.mana_pool || 0) >= 1 && hasLegalHealTarget) actions.push({ type: 'USE_ABILITY', player_id: playerId, source_slot: slot, ability_name: cls === 'crusader' ? 'Radiant Oblivion' : 'Holy Resurgence' });
    }
  }
  if ([PHASES.DEPLOY, PHASES.REFORM].includes(state.phase)) actions.push({ type: 'REPOSITION', player_id: playerId });
  actions.push({ type: 'NEXT_PHASE', player_id: playerId });
  actions.push({ type: 'SURRENDER', player_id: playerId });
  return actions;
}

module.exports = {
  MINIMAL_REDUCER_INTENTS,
  PHASE_ORDER,
  createInitialRuntimeState,
  submitIntent,
  getLegalActions,
  drawOneCardForPlayer,
  normalizeSlotKey,
  normalizeRuntimeCards,
  resolveEndPhaseStatuses,
  responseKindForCard,
  responseBlockAmount,
  __test: {
    cardActionProfile,
    selectedTargetIsItemUserAndHost,
    cardSourceRequired,
    cardTargetRequired,
    isReviveCard,
    reviveHpForCard,
    cardDoesNotExhaustOnUse,
    isAreaAttackCard,
    cardHasDirectDamage,
    isCastingDamageCard,
    isAreaDamageCard,
    damageTypeForCard,
    isHealAllCard,
    isHealingCard,
    isPurifyCard,
    sourceCanTargetAnyOpponentHeroByAbility,
    attackDamageBuffForSourceHero,
    attachmentDamageModifierApplies,
    activeAttackDamageModifierAmount,
    activeAttackDamageMultiplier,
    buildPendingAttackResolution,
    getOrCreateAttackDamageComputation,
    applyDamageToTargets,
    racialResponseIdentity,
    buildCastingReleaseAttackResolution,
    queueOrOpenCastingRelease,
    cleanupConfirmedDefeatRuntimeState,
    clearConfirmedDefeatExp,
    applyReviveEffect,
    remapHeroHostedAttachmentsForSlotSwap
  }
};
