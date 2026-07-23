#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { listEffects } = require('../effects/effect-registry');
const { CARD_TYPES, ATTACK_LAYER, DAMAGE_PROFILE, DEF_MECHANIC, ATTACHMENT_STATE, PHASES } = require('../core/constants');

const EFFECTS = new Set(listEffects());
const TYPES = new Set(Object.values(CARD_TYPES));
const LAYERS = new Set(Object.values(ATTACK_LAYER));
const DAMAGES = new Set(Object.values(DAMAGE_PROFILE));
const DEFS = new Set(Object.values(DEF_MECHANIC));
const ATTACHMENTS = new Set(Object.values(ATTACHMENT_STATE));
const PHASE_SET = new Set(Object.values(PHASES));

function parseArgs(argv) {
  const args = { pvp: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pvp') args.pvp = true;
    else if (a.startsWith('--')) args[a.slice(2)] = argv[++i];
  }
  return args;
}

function loadCards(input) {
  if (!input) throw new Error('Missing --input <cards.json>');
  const raw = JSON.parse(fs.readFileSync(input, 'utf8'));
  if (Array.isArray(raw)) return { meta: {}, cards: raw };
  if (raw && Array.isArray(raw.cards)) return { meta: raw, cards: raw.cards };
  throw new Error('Card database must be an array or object with cards array.');
}

function arr(v) { return Array.isArray(v) ? v : (v == null ? [] : [v]); }
function isMissing(v) { return v === undefined || v === null || v === ''; }
function isFiniteNumber(v) { return typeof v === 'number' && Number.isFinite(v); }
function hasNumberMap(v) { return v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).some(isFiniteNumber); }
function timingValues(card){const values=[];for(const item of arr(card.phase_timing||card.timing)){const raw=item&&typeof item==='object'?(item.phase||item.phase_or_window||item.raw_phase||item.action_category||''):item;for(const part of String(raw||'').split(/\s*(?:;|\/)\s*/)){const value=part.replace(/\s+Phase$/i,'').trim();if(value)values.push(value);}}return values;}
function knownTiming(value){return PHASE_SET.has(value)||['Draw','Deploy','Battle','Reform','End','Response','Reactive','Setup','Hero Slot','Defense Skill','Incoming','Physical Attack','Magical Attack','Casting','Damage would be dealt'].some(token=>String(value).toLowerCase().includes(token.toLowerCase()));}
function assetPaths(card) { const a = card.assets || card.asset || {}; return [card.full_art_path, card.thumbnail_path, a.full, a.thumb, a.thumbnail, a.file].filter(Boolean); }
function structuredEffects(card) {
  const exec = card.canonical_execution || card.structured_execution || {};
  if (Array.isArray(exec.effects)) return exec.effects;
  if (Array.isArray(card.effects)) return card.effects;
  return [];
}

function validateStructuredEffect(effect, loc, errors, counts) {
  if (!effect || typeof effect !== 'object' || Array.isArray(effect)) {
    errors.push(`${loc}: effect must be an object`); return;
  }
  const kind = effect.kind;
  if (!kind || typeof kind !== 'string') { errors.push(`${loc}: missing kind`); return; }
  counts.effects[kind] = (counts.effects[kind] || 0) + 1;

  if (['inflict_status','self_status','remove_status_before_damage'].includes(kind) && isMissing(effect.status)) {
    errors.push(`${loc}: ${kind} missing status`);
  }
  if (['inflict_status','self_status'].includes(kind) && !isFiniteNumber(effect.duration_turns) && !hasNumberMap(effect.duration_by_class)) {
    errors.push(`${loc}: ${kind} missing duration_turns or duration_by_class`);
  }
  if (kind === 'heal' && !isFiniteNumber(effect.amount) && !hasNumberMap(effect.amount_by_class)) {
    errors.push(`${loc}: heal missing amount or amount_by_class`);
  }
  if (['heal_allied_heroes','heal_target_hero'].includes(kind) && !isFiniteNumber(effect.amount) && !hasNumberMap(effect.amount_by_class)) {
    errors.push(`${loc}: ${kind} missing amount or amount_by_class`);
  }
  if (kind === 'draw_cards' && ![effect.count,effect.amount,Number(effect.raw_value)].some(isFiniteNumber) && !hasNumberMap(effect.count_by_class)) {
    errors.push(`${loc}: draw_cards missing count/amount/count_by_class`);
  }
  if (kind === 'attach_attack_damage_modifier' && !isFiniteNumber(effect.amount) && !hasNumberMap(effect.amount_by_class) && !isFiniteNumber(effect.multiplier)) {
    errors.push(`${loc}: attach_attack_damage_modifier missing amount/amount_by_class/multiplier`);
  }
  if (kind === 'block_damage' && !isFiniteNumber(effect.amount) && !hasNumberMap(effect.amount_by_class)) {
    errors.push(`${loc}: block_damage missing amount or amount_by_class`);
  }
  if (kind === 'optional_post_attack_reposition') {
    if (isMissing(effect.reposition_model)) errors.push(`${loc}: optional_post_attack_reposition missing reposition_model`);
    if (isMissing(effect.trigger_mode) && isMissing(effect.condition)) errors.push(`${loc}: optional_post_attack_reposition missing trigger_mode/condition`);
  }
  if (kind === 'attack_restriction' && !effect.cannot_be_dodged && !effect.cannot_be_blocked && isMissing(effect.restriction) && isMissing(effect.raw_value)) {
    errors.push(`${loc}: attack_restriction missing structured restriction`);
  }
  if (kind === 'pending_casting') {
    if (!isFiniteNumber(effect.remaining_count) && !isFiniteNumber(effect.casting_turns)) errors.push(`${loc}: pending_casting missing counter`);
    if (isMissing(effect.tick_phase)) errors.push(`${loc}: pending_casting missing tick_phase`);
  }
  if (['revive','revive_hero','revive_defeated_hero'].includes(kind)) {
    const hp = effect.set_hp ?? effect.revive_hp;
    if (!isFiniteNumber(hp)) errors.push(`${loc}: ${kind} missing revive HP`);
  }
}

function validateCards(cards, opts = {}) {
  const errors = [];
  const warnings = [];
  const seen = new Set();
  const counts = { cards: cards.length, structured_effects: 0, legacy_effect_recipes: 0, effects: {}, types: {} };
  const canonicalMode = Boolean(opts.canonicalMode);


  cards.forEach((card, idx) => {
    const loc = `card[${idx}] ${card.card_id || card.id || '(no id)'}`;
    const id = card.card_id || card.id;
    const rawType = card.card_type || card.type || card.family;
    const type = rawType === 'Legacy Card' ? 'Legacy' : rawType;

    if (isMissing(id)) errors.push(`${loc}: missing card_id`);
    else if (seen.has(id)) errors.push(`${loc}: duplicate card_id ${id}`);
    else seen.add(id);

    if (isMissing(card.card_name || card.name)) errors.push(`${loc}: missing card_name`);
    if (isMissing(type)) errors.push(`${loc}: missing card_type`);
    else if (!TYPES.has(type)) errors.push(`${loc}: invalid card_type ${type}`);
    else counts.types[type] = (counts.types[type] || 0) + 1;

    if ((canonicalMode || card.canonical_execution || card.structured_execution) && !card.canonical_hash) errors.push(`${loc}: missing canonical_hash`);

    const timing = timingValues(card);
    if (timing.length === 0 && !['Hero','Legacy'].includes(type)) warnings.push(`${loc}: no timing declared`);
    timing.forEach(t => { if (!knownTiming(t)) warnings.push(`${loc}: unknown timing ${t}`); });

    if (card.attack_layer && !LAYERS.has(card.attack_layer)) errors.push(`${loc}: invalid attack_layer ${card.attack_layer}`);
    if (card.attackLayer && !LAYERS.has(card.attackLayer)) errors.push(`${loc}: invalid attackLayer ${card.attackLayer}`);
    if (card.damage_profile && !DAMAGES.has(card.damage_profile)) errors.push(`${loc}: invalid damage_profile ${card.damage_profile}`);
    if (card.damageProfile && !DAMAGES.has(card.damageProfile)) errors.push(`${loc}: invalid damageProfile ${card.damageProfile}`);
    if (card.def_mechanic && !DEFS.has(card.def_mechanic)) errors.push(`${loc}: invalid def_mechanic ${card.def_mechanic}`);
    if (card.attachment_state && !ATTACHMENTS.has(card.attachment_state)) errors.push(`${loc}: invalid attachment_state ${card.attachment_state}`);

    const effects = structuredEffects(card);
    counts.structured_effects += effects.length;
    const exec = card.canonical_execution || card.structured_execution || {};
    const legacyRecipe = arr(card.effect_recipe || card.effectRecipe).filter(Boolean);
    counts.legacy_effect_recipes += legacyRecipe.length;
    legacyRecipe.forEach((step, stepIdx) => {
      const effect = step && (step.effect || step.type || step.handler);
      if (!effect) errors.push(`${loc}: effect_recipe[${stepIdx}] missing effect`);
      else {
        counts.effects[effect] = (counts.effects[effect] || 0) + 1;
        if (!EFFECTS.has(effect)) errors.push(`${loc}: missing handler for effect ${effect}`);
      }
    });
    const hasRuntimePayload = effects.length > 0 || legacyRecipe.length > 0 || Boolean(exec.attack || exec.class_ability || exec.racial_ability || exec.legacy_ability || exec.dispatch);
    if (!hasRuntimePayload && !['Hero','Legacy'].includes(type)) warnings.push(`${loc}: no execution payload declared`);
    effects.forEach((effect, effectIdx) => validateStructuredEffect(effect, `${loc}: effects[${effectIdx}]`, errors, counts));

    const paths = assetPaths(card);
    if (paths.length === 0) warnings.push(`${loc}: no asset path declared`);
    paths.forEach(p => {
      if (opts.pvp && /\.(jpe?g)$/i.test(p)) errors.push(`${loc}: PvP asset must not be JPG/JPEG: ${p}`);
      if (opts.assetRoot) {
        const candidate = path.isAbsolute(p) ? p : path.resolve(opts.assetRoot, p.replace(/^src\/assets\/cards\//, ''));
        if (!fs.existsSync(candidate)) warnings.push(`${loc}: asset not found: ${p}`);
      }
    });
  });

  if (canonicalMode && cards.length !== 198) errors.push(`expected 198 cards, found ${cards.length}`);
  return { ok: errors.length === 0, errors, warnings, counts };
}

function main() {
  const args = parseArgs(process.argv);
  const { cards, meta } = loadCards(args.input);
  const report = validateCards(cards, { assetRoot: args['asset-root'], pvp: args.pvp, canonicalMode: Boolean(meta.canonical_registry_hash) });
  report.schema_version = meta.schema_version || meta.version || null;
  report.canonical_registry_hash = meta.canonical_registry_hash || null;
  if (args.report) fs.writeFileSync(args.report, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

if (require.main === module) main();
module.exports = { loadCards, validateCards, structuredEffects, validateStructuredEffect };
