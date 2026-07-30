'use strict';

/**
 * Grandis Legacy source-sync gameplay locks for Local AI and PvP Railway.
 * These helpers encode shared cross-build policy only; card values come from
 * Season1 Runtime Data v0.11.1 / Effect Recipe v0.10.8.
 */

const BASE_CLASSES = Object.freeze(['Warrior', 'Mage', 'Cleric', 'Thief', 'Archer']);
const CHAIN_MAIL_ALLOWED_BASE_CLASSES = Object.freeze(['Warrior', 'Archer', 'Thief']);
const NORMAL_ATTACK_PROFILES = Object.freeze(['Physical Attack', 'Magical Attack', 'Range Attack']);

const ATTACK_AUDIT_NO1_PRIMARY_ATTACK_IDS = Object.freeze([
  "S1-ARC-001",
  "S1-ARC-002",
  "S1-ARC-006",
  "S1-ARC-007",
  "S1-ARC-008",
  "S1-ARC-009",
  "S1-ARC-015",
  "S1-ARC-016",
  "S1-ARC-019",
  "S1-ARC-020",
  "S1-ARC-023",
  "S1-CLE-001",
  "S1-CLE-002",
  "S1-CLE-008",
  "S1-CLE-009",
  "S1-CLE-010",
  "S1-CLE-014",
  "S1-CLE-019",
  "S1-CLE-020",
  "S1-CLE-021",
  "S1-CLE-024",
  "S1-MAG-001",
  "S1-MAG-002",
  "S1-MAG-003",
  "S1-MAG-008",
  "S1-MAG-009",
  "S1-MAG-010",
  "S1-MAG-014",
  "S1-MAG-016",
  "S1-MAG-017",
  "S1-MAG-019",
  "S1-MAG-021",
  "S1-MAG-023",
  "S1-MAG-024",
  "S1-THF-001",
  "S1-THF-002",
  "S1-THF-007",
  "S1-THF-008",
  "S1-THF-010",
  "S1-THF-013",
  "S1-THF-014",
  "S1-THF-016",
  "S1-THF-017",
  "S1-THF-019",
  "S1-THF-020",
  "S1-THF-023",
  "S1-THF-024",
  "S1-THF-025",
  "S1-THF-029",
  "S1-THF-030",
  "S1-WAR-001",
  "S1-WAR-002",
  "S1-WAR-006",
  "S1-WAR-007",
  "S1-WAR-008",
  "S1-WAR-009",
  "S1-WAR-015",
  "S1-WAR-016",
  "S1-WAR-017",
  "S1-WAR-019",
  "S1-WAR-020",
  "S1-WAR-021",
  "S1-WAR-023",
  "S1-WAR-024"
]);
const ATTACK_AUDIT_NO2_COMPLEX_ATTACK_IDS = Object.freeze([
  "S1-ARC-010",
  "S1-ARC-017",
  "S1-ARC-018",
  "S1-ARC-021",
  "S1-ARC-024",
  "S1-MAG-007",
  "S1-MAG-015",
  "S1-MAG-020",
  "S1-MAG-025",
  "S1-THF-009",
  "S1-THF-015",
  "S1-THF-018",
  "S1-WAR-010",
  "S1-WAR-018"
]);

function attackAuditBucket(card) {
  const id = normalizeText(card && (card.card_id || card.id)).toUpperCase();
  if (ATTACK_AUDIT_NO1_PRIMARY_ATTACK_IDS.includes(id)) return 'NO1_PRIMARY_ATTACK_LOCKED';
  if (ATTACK_AUDIT_NO2_COMPLEX_ATTACK_IDS.includes(id)) return 'NO2_COMPLEX_ATTACK_DISCUSS';
  return null;
}

function isNo1PrimaryAttackLocked(card) {
  return attackAuditBucket(card) === 'NO1_PRIMARY_ATTACK_LOCKED';
}

function isNo2ComplexAttack(card) {
  return attackAuditBucket(card) === 'NO2_COMPLEX_ATTACK_DISCUSS';
}


function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeBaseLineage(value) {
  const text = normalizeText(value).toLowerCase();
  if (!text) return null;
  if (text.includes('warrior') || text.includes('gladiator') || text.includes('crusader') || text.includes('conqueror')) return 'Warrior';
  if (text.includes('mage') || text.includes('elementalist') || text.includes('spell blade') || text.includes('arcane duelist') || text.includes('elemental lord')) return 'Mage';
  if (text.includes('cleric') || text.includes('priest') || text.includes('paladin') || text.includes('saint')) return 'Cleric';
  if (text.includes('thief') || text.includes('rogue') || text.includes('renegade') || text.includes('arbalest')) return 'Thief';
  if (text.includes('archer') || text.includes('marksman') || text.includes('ranger') || text.includes('hunter') || text.includes('arbalest')) return 'Archer';
  return BASE_CLASSES.includes(value) ? value : null;
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function heroBaseLineages(hero) {
  if (!hero || typeof hero !== 'object') return [];
  const values = [];
  const push = (v) => {
    if (Array.isArray(v)) v.forEach(push);
    else if (v !== undefined && v !== null) values.push(v);
  };
  push(hero.baseClass);
  push(hero.base_class);
  push(hero.primaryClass);
  push(hero.primary_class);
  push(hero.class);
  push(hero.className);
  push(hero.class_family);
  push(hero.base_class_family);
  push(hero.active_class_lineage);
  push(hero.compatible_skills);
  push(hero.base_skill_classes);
  if (hero.identity) {
    push(hero.identity.class);
    push(hero.identity.display_class);
    push(hero.identity.base_class_family);
    push(hero.identity.rank_i_base_class);
    push(hero.identity.active_class_lineage);
    push(hero.identity.base_skill_classes);
  }
  push(hero.classes);
  push(hero.lineage);
  push(hero.lineages);
  push(hero.printedClass);
  push(hero.printed_class);
  push(hero.owner_lineage);
  push(hero.legal_active_classes);
  return unique(values.map(normalizeBaseLineage));
}

function isChainMailCard(card) {
  const id = normalizeText(card && (card.card_id || card.id)).toUpperCase();
  const name = normalizeText(card && card.name).toLowerCase();
  return id === 'S1-ITM-016' || name === 'chain mail';
}

function canUseChainMail(heroOrBaseLineages) {
  const lineages = Array.isArray(heroOrBaseLineages)
    ? heroOrBaseLineages.map(normalizeBaseLineage)
    : heroBaseLineages(heroOrBaseLineages);
  return lineages.some((lineage) => CHAIN_MAIL_ALLOWED_BASE_CLASSES.includes(lineage));
}

function actionCategory(card) {
  return normalizeText(card && (card.action_category || card.actionCategory || card.action_type || card.attack_type || card.attackType));
}

function classification(card) {
  return normalizeText(card && (card.classification || card.card_classification || card.subtype || card.type));
}

function combinedCardText(card) {
  const canonical = Boolean(card && card.canonical_hash && (card.canonical_execution || card.canonical_legality));
  const compatibilityText = canonical ? '' : `${normalizeText(card && card.card_text)} ${normalizeText(card && card.effect_text)}`;
  return [actionCategory(card), classification(card), compatibilityText, normalizeText(card && card.runtime_tags)].join(' ');
}

function attackProfile(card) {
  const text = combinedCardText(card).toLowerCase();
  if (/casting attack/.test(text)) return 'Casting Attack';
  if (/area attack|area damage/.test(text)) return 'Area Attack';
  if (/range attack|range_target/.test(text)) return 'Range Attack';
  if (/magical attack/.test(text)) return 'Magical Attack';
  if (/physical attack/.test(text)) return 'Physical Attack';
  if (/attack/.test(text)) return 'Attack';
  return null;
}

function isExactMagicalAttackAction(card) {
  return attackProfile(card) === 'Magical Attack';
}

function isSurgeEligibleAction(card, context) {
  if (isExactMagicalAttackAction(card)) return true;
  if (!context) return false;
  return Boolean(
    context.aetherInfusionConverted === true &&
    attackProfile(card) === 'Physical Attack'
  );
}

function counterLabelForCard(card) {
  const id = normalizeText(card && (card.card_id || card.id)).toUpperCase();
  const name = normalizeText(card && card.name).toLowerCase();
  if (id === 'S1-ARC-021' || name === 'aura infusion bolt') return 'Draw Counter';
  return null;
}

function forbiddenCounterLabelForCard(card) {
  const label = counterLabelForCard(card);
  if (label === 'Draw Counter') return 'Mana Counter';
  return null;
}

function isRangeAttackAction(card) {
  return attackProfile(card) === 'Range Attack';
}

function isAreaAttackAction(card) {
  return attackProfile(card) === 'Area Attack';
}

function isSingleTargetAttackSkill(card) {
  const profile = attackProfile(card);
  return NORMAL_ATTACK_PROFILES.includes(profile);
}

function attackTargetingPolicy(card, sourceHero) {
  if (isAreaAttackAction(card)) {
    return { requiresTarget: false, targetScope: 'area_of_attack_opponent_heroes', ignoreAreaOfAttack: false, noTargetPicker: true };
  }
  if (isRangeAttackAction(card)) {
    return { requiresTarget: true, targetScope: 'any_opponent_hero', ignoreAreaOfAttack: true, noTargetPicker: false };
  }
  if (isSingleTargetAttackSkill(card)) {
    const heroClass = normalizeText(sourceHero && (sourceHero.class || sourceHero.className || sourceHero.display_class)).toLowerCase();
    const anyByAbility = ['marksman', 'grand ranger'].includes(heroClass);
    return { requiresTarget: true, targetScope: anyByAbility ? 'any_opponent_hero' : 'area_of_attack_opponent_hero', ignoreAreaOfAttack: anyByAbility, noTargetPicker: false };
  }
  return { requiresTarget: false, targetScope: null, ignoreAreaOfAttack: false, noTargetPicker: false };
}

function shouldUseAttachmentSlot(card) {
  if (!card) return false;
  const id = normalizeText(card.card_id || card.id).toUpperCase();
  if (id === 'S1-ARC-021' || id === 'S1-MAG-020' || id === 'S1-MAG-022') return true;
  const meta = combinedCardText(card);
  if (/Casting time|CASTING|ONGOING|UNTARGETABLE|TAUNT|until the start|until the end/i.test(meta)) return true;
  return false;
}

function heroAttackBuffPolicy(heroOrClass, card) {
  const heroClass = normalizeText(typeof heroOrClass === 'string' ? heroOrClass : (heroOrClass && (heroOrClass.class || heroOrClass.className || heroOrClass.display_class))).toLowerCase();
  const profile = attackProfile(card);
  const cardId = normalizeText(card && (card.card_id || card.id)).toUpperCase();
  if (!profile) return { applies: false, amount: 0, reason: 'not_attack_profile' };
  if (['Area Attack', 'Casting Attack'].includes(profile)) return { applies: false, amount: 0, reason: 'excluded_area_or_casting' };
  if (heroClass === 'grand arbalest') return { applies: profile === 'Physical Attack', amount: profile === 'Physical Attack' ? 10 : 0, reason: 'rapid_chamber_physical_only' };
  if (heroClass === 'grand ranger') return { applies: isSingleTargetAttackSkill(card) && cardId !== 'S1-ARC-001', amount: isSingleTargetAttackSkill(card) && cardId !== 'S1-ARC-001' ? 10 : 0, reason: 'dead_eye_single_target_excluding_bow_bash' };
  if (heroClass === 'elemental lord') return { applies: profile === 'Magical Attack', amount: profile === 'Magical Attack' ? 10 : 0, reason: 'elemental_sovereignty_magical_only' };
  if (['conqueror', 'renegade'].includes(heroClass)) return { applies: NORMAL_ATTACK_PROFILES.includes(profile), amount: NORMAL_ATTACK_PROFILES.includes(profile) ? 10 : 0, reason: 'attack_damage_profile_gate' };
  return { applies: false, amount: 0, reason: 'no_matching_hero_attack_buff' };
}

function racialTraitPolicy(raceOrTrait) {
  const text = normalizeText(raceOrTrait).toLowerCase();
  if (text.includes('human') || text.includes('ambition')) return { intent: 'USE_RACIAL_TRAIT', phase: 'Deploy Phase', cost: { racial_token: 1 }, effect: 'draw_2', doesExhaust: false };
  if (text.includes('elf') || text.includes('ancestral')) return { intent: 'USE_RACIAL_TRAIT', phase: 'Deploy Phase', cost: { racial_token: 1 }, effect: 'gain_2_mana', doesExhaust: false };
  if (text.includes('beastman') || text.includes('primal')) return { intent: 'USE_RACIAL_TRAIT', phase: 'Battle Phase', cost: { racial_token: 1 }, target: 'injured_opponent_hero', effect: 'direct_damage_20', doesExhaust: false };
  if (text.includes('dragon') || text.includes('scale')) return { intent: 'USE_RACIAL_TRAIT', window: 'response', cost: { racial_token: 1 }, effect: 'block_40_physical_or_magical', doesExhaust: false };
  if (text.includes('dwarf') || text.includes('stoneblood')) return { intent: 'CONFIRM_TRIGGERED_RACIAL', window: 'would_be_defeated', optional: true, cost: { racial_token: 1 }, effect: 'prevent_defeat_keep_10_hp' };
  if (text.includes('halfling') || text.includes('second chance')) return { intent: 'CONFIRM_TRIGGERED_RACIAL', window: 'after_own_skill_card_dodged', optional: true, cost: { racial_token: 1 }, effect: 'replay_same_skill_for_0_mana' };
  return null;
}


const REACTION_DEFENSE_RESPONSE_CARD_IDS = Object.freeze([
  'S1-ITM-007','S1-ITM-012','S1-ITM-016','S1-ITM-017',
  'S1-ARC-003','S1-ARC-011','S1-ARC-012',
  'S1-CLE-003','S1-CLE-011','S1-CLE-012','S1-CLE-022','S1-CLE-025',
  'S1-MAG-004','S1-MAG-005','S1-MAG-011','S1-MAG-012',
  'S1-THF-003','S1-THF-004','S1-THF-011','S1-THF-021','S1-THF-022','S1-THF-026',
  'S1-WAR-003','S1-WAR-004','S1-WAR-011','S1-WAR-012','S1-WAR-022',
  'S1-EVT-007','S1-EVT-009'
]);

function reactionKindForCard(card) {
  const id = normalizeText(card && (card.card_id || card.id)).toUpperCase();
  const text = combinedCardText(card);
  const lower = text.toLowerCase();
  if (id === 'S1-CLE-012' || /enemy\s+uses\s+a\s+Defend\s+Skill|cancel\s+that\s+skill|def\s+skill\s+to\s+dodge/i.test(text)) return 'COUNTER_DEFEND_SKILL';
  if (id === 'S1-EVT-007') return 'CANCEL_EVENT';
  if (id === 'S1-ITM-017' || /opponent\s+plays\s+an\s+item\s+card/i.test(text)) return 'CANCEL_ITEM';
  if (/\bredirect\b/i.test(text)) return 'REDIRECT';
  if (/\bnegate\b/i.test(text)) return /return\s+the\s+attack\s+card|owner(?:'s)?\s+hand/i.test(text) ? 'NEGATE_RETURN_TO_HAND' : 'NEGATE';
  if (/\bdodge\b/i.test(text)) return 'DODGE';
  if (/cannot\s+take\s+any\s+damage|prevent\s+all\s+attack\s+damage/i.test(lower)) return 'PREVENT_DAMAGE';
  if (/\bblock\b/i.test(text)) return 'BLOCK';
  return null;
}

function reactionAllowedDamageTypes(card) {
  const text = combinedCardText(card).toLowerCase();
  if (/physical\s+or\s+magical|physical\s+and\s+magical/.test(text)) return ['Physical', 'Magical'];
  if (/cannot\s+take\s+any\s+damage|any\s+damage|all\s+damage/.test(text)) return ['Any'];
  const out = [];
  if (/physical/.test(text)) out.push('Physical');
  if (/magical/.test(text)) out.push('Magical');
  return out;
}

function reactionPolicyForCard(card) {
  const id = normalizeText(card && (card.card_id || card.id)).toUpperCase();
  const kind = reactionKindForCard(card);
  if (!REACTION_DEFENSE_RESPONSE_CARD_IDS.includes(id) && !kind) return null;
  if (!kind) return null;
  const text = combinedCardText(card);
  const policy = {
    card_id: id,
    kind,
    allowedDamageTypes: reactionAllowedDamageTypes(card),
    illegalWhen: [],
    attachmentPolicy: 'transient_response_only'
  };
  if (kind === 'DODGE') policy.illegalWhen.push('incoming_attack_cannot_be_dodged');
  if (kind === 'BLOCK') policy.illegalWhen.push('incoming_attack_cannot_be_blocked');
  if (/cannot\s+dodge\s+area\s+attacks|cannot\s+.*area\s+attacks/i.test(text)) policy.illegalWhen.push('incoming_attack_is_area');
  if ((kind === 'NEGATE' || kind === 'NEGATE_RETURN_TO_HAND') && /targeted\s+by\s+an\s+attack/i.test(text)) policy.illegalWhen.push('incoming_attack_is_area');
  if (/cannot\s+negate\s+(?:a\s+)?casting\s+attacks?/i.test(text)) policy.illegalWhen.push('incoming_attack_is_casting');
  if (id === 'S1-ITM-016') policy.hostLineageGate = CHAIN_MAIL_ALLOWED_BASE_CLASSES.slice();
  if (id === 'S1-ITM-017') policy.allowedPendingCardFamily = 'Item';
  if (id === 'S1-EVT-007') policy.allowedPendingCardFamily = 'Event';
  if (id === 'S1-CLE-012') {
    policy.allowedPendingResponseFamily = 'Skill';
    policy.allowedPendingResponseClassification = 'Defense Skill';
  }
  if (['S1-MAG-011', 'S1-WAR-022', 'S1-CLE-022', 'S1-CLE-025'].includes(id)) policy.attachmentPolicy = 'ongoing_effect_slot_required_after_resolution_if_effect_duration_remains';
  return policy;
}

function normalizeDamageType(value) {
  const text = normalizeText(value).toLowerCase();
  if (text.includes('physical')) return 'Physical';
  if (text.includes('magical')) return 'Magical';
  if (text.includes('direct')) return 'Direct';
  if (text.includes('status')) return 'Status';
  return value ? normalizeText(value) : 'Unspecified';
}

function damageTypeAllowed(allowed, incomingType) {
  const types = Array.isArray(allowed) ? allowed : [];
  if (!types.length || types.includes('Any')) return true;
  return types.map(normalizeDamageType).includes(normalizeDamageType(incomingType));
}

function validateReactionAgainstIncoming(card, incoming, hostHeroOrLineages, pendingResponseCard) {
  const policy = reactionPolicyForCard(card);
  if (!policy) return { ok: false, errors: ['Card is not a locked reaction/defense response.'] };
  const inc = incoming || {};
  const errors = [];
  const kind = policy.kind;
  if (kind === 'CANCEL_EVENT') {
    const pendingFamily = normalizeText(inc.pending_card_family || pendingResponseCard && (pendingResponseCard.card_family || pendingResponseCard.family || pendingResponseCard.card_type));
    const pendingOwner = normalizeText(inc.pending_card_owner_id || inc.pending_response_owner_id || inc.source_player_id || inc.attacking_player_id);
    const responder = normalizeText(inc.responder_player_id || inc.response_player_id);
    if (pendingFamily.toLowerCase() !== 'event') errors.push('Intercept can cancel only an opponent Event Card, including an Event response.');
    if (pendingOwner && responder && !interceptSidesLegal(pendingOwner, responder)) errors.push('Intercept cannot respond to an Event controlled by the same player.');
    return { ok: errors.length === 0, errors, policy };
  }
  if (kind === 'CANCEL_ITEM') {
    const pendingFamily = normalizeText(inc.pending_card_family || pendingResponseCard && (pendingResponseCard.card_family || pendingResponseCard.family || pendingResponseCard.card_type));
    if (pendingFamily.toLowerCase() !== 'item') errors.push('Flashpowder Bomb can cancel only an opponent Item Card.');
    return { ok: errors.length === 0, errors, policy };
  }
  if (kind === 'COUNTER_DEFEND_SKILL') {
    const pendingFamily = normalizeText(inc.pending_response_family || pendingResponseCard && (pendingResponseCard.card_family || pendingResponseCard.family || pendingResponseCard.card_type));
    const pendingClass = normalizeText(inc.pending_response_classification || pendingResponseCard && (pendingResponseCard.classification || pendingResponseCard.card_subtype || pendingResponseCard.action_category));
    const pendingOwner = normalizeText(inc.pending_response_owner_id || inc.pending_card_owner_id || inc.source_player_id);
    const responder = normalizeText(inc.responder_player_id || inc.response_player_id);
    if (pendingFamily.toLowerCase() !== 'skill' || !/defense skill|defend skill/i.test(pendingClass)) errors.push('Binding Light can counter only an opponent committed Defend Skill.');
    if (pendingOwner && responder && pendingOwner === responder) errors.push('Binding Light cannot counter a response controlled by the same player.');
    return { ok: errors.length === 0, errors, policy };
  }
  if ((kind === 'BLOCK' || kind === 'DODGE') && !damageTypeAllowed(policy.allowedDamageTypes, inc.damage_type)) {
    errors.push(`${idOrName(card)} can answer only ${policy.allowedDamageTypes.join('/')} damage.`);
  }
  if (kind === 'DODGE' && inc.cannot_be_dodged) errors.push('Incoming attack cannot be dodged.');
  if (kind === 'BLOCK' && inc.cannot_be_blocked) errors.push('Incoming attack cannot be blocked.');
  if (policy.illegalWhen.includes('incoming_attack_is_area') && inc.area) errors.push(`${idOrName(card)} is not legal against Area Attacks.`);
  if (policy.illegalWhen.includes('incoming_attack_is_casting') && inc.casting) errors.push(`${idOrName(card)} is not legal against Casting Attacks.`);
  if (policy.hostLineageGate) {
    const lineages = Array.isArray(hostHeroOrLineages) ? hostHeroOrLineages.map(normalizeBaseLineage) : heroBaseLineages(hostHeroOrLineages);
    if (!lineages.some(lineage => policy.hostLineageGate.includes(lineage))) errors.push(`${idOrName(card)} can be used only by/for Warrior, Archer, or Thief lineage Heroes.`);
  }
  return { ok: errors.length === 0, errors, policy };
}



const ATTACHMENT_SUPPORT_HAND_CARD_IDS = Object.freeze([
  'S1-ARC-004','S1-THF-028','S1-CLE-004','S1-ITM-004','S1-CLE-005','S1-CLE-016','S1-CLE-017','S1-CLE-020','S1-CLE-023','S1-CLE-010',
  'S1-ITM-010','S1-ITM-011','S1-ITM-013','S1-ITM-014','S1-ITM-015','S1-THF-027','S1-WAR-005','S1-MAG-022','S1-MAG-018'
]);

function isOpponentHandBackSelectionCard(card) {
  const id = normalizeText(card && (card.card_id || card.id)).toUpperCase();
  return id === 'S1-ARC-004' || id === 'S1-THF-028';
}

function handManipulationPolicyForCard(card) {
  const id = normalizeText(card && (card.card_id || card.id)).toUpperCase();
  if (id === 'S1-ARC-004') return {
    card_id: id,
    selection_model: 'opponent_hand_back_of_card_index',
    move_selected_to: 'opponent_main_deck',
    shuffle_deck_after_insert: true,
    shuffle_remaining_hand_after_resolution: true,
    shuffle_before_selection: false,
    magic_scope_combo: 'reveal may happen before selection; shuffle happens after movement'
  };
  if (id === 'S1-THF-028') return {
    card_id: id,
    selection_model: 'opponent_hand_back_of_card_index',
    move_selected_to: 'opponent_discard_pile',
    shuffle_deck_after_insert: false,
    shuffle_remaining_hand_after_resolution: true,
    shuffle_before_selection: false,
    magic_scope_combo: 'reveal may happen before selection; shuffle happens after movement'
  };
  return null;
}

function isPurifyChoiceCard(card) {
  const id = normalizeText(card && (card.card_id || card.id)).toUpperCase();
  const text = combinedCardText(card).toLowerCase();
  return id === 'S1-CLE-004' || id === 'S1-ITM-004' || /purify|remove\s+1\s+negative\s+status/.test(text);
}

function supportHealPurifyPolicyForCard(card) {
  const id = normalizeText(card && (card.card_id || card.id)).toUpperCase();
  const text = combinedCardText(card).toLowerCase();
  if (isPurifyChoiceCard(card)) return { card_id: id, kind: 'purify', choice_required_when_any_negative_status: true, single_option_still_requires_selection: true, choice_required_if_multiple_negative_statuses: true, auto_remove_first_status: false };
  if (/heal\s+all\s+(your|allied|own)\s+heroes/.test(text)) return { card_id: id, kind: 'heal_all', requires_target: false };
  if (/\bheal\b/.test(text)) return { card_id: id, kind: 'heal', amount_source: 'effect_payload_or_class_row_before_text_regex' };
  return null;
}

function attachmentPolicyForCard(card) {
  const id = normalizeText(card && (card.card_id || card.id)).toUpperCase();
  const text = combinedCardText(card).toLowerCase();
  const map = {
    'S1-ARC-021': {kind:'casting', slot:'casting_attachment', counter_label:'Draw Counter'},
    'S1-MAG-007': {kind:'casting', slot:'casting_attachment', duration:'one_battle_phase_start_countdown'},
    'S1-MAG-020': {kind:'casting', slot:'casting_attachment', duration:'one_battle_phase_start_countdown'},
    'S1-MAG-022': {kind:'ongoing', slot:'attachment', duration:'until_end_of_owner_next_turn', effect:'physical_to_magical_plus_mana_remove_on_hp_damage'},
    'S1-MAG-018': {kind:'ongoing', slot:'attachment', duration:'this_or_next_turn_by_rank', effect:'double_casting_same_magical_attack'},
    'S1-THF-027': {kind:'ongoing', slot:'attachment', duration:'until_start_of_owner_next_turn', effect:'untargetable_by_opponent_targeted_attacks_plus_draw_1'},
    'S1-WAR-005': {kind:'ongoing', slot:'attachment', duration:'until_start_of_controller_second_turn', effect:'taunt_target_lock_and_area_attack_block'},
    'S1-ITM-010': {kind:'modifier', slot:'attachment', duration:'this_battle_phase', damage_gate:'Magical Attack only'},
    'S1-ITM-011': {kind:'pending_modifier', slot:'attachment', duration:'this_turn_until_physical_attack_hp_damage_or_expire', damage_gate:'Physical Attack HP damage only'},
    'S1-ITM-013': {kind:'modifier', slot:'attachment', duration:'this_turn', effect:'healing_received_plus_20'},
    'S1-ITM-014': {kind:'modifier', slot:'attachment', duration:'this_battle_phase', damage_gate:'Physical Attack or Magical Attack only'},
    'S1-ITM-015': {kind:'ongoing', slot:'attachment', duration:'until_start_of_controller_second_turn_draw_phase', turns:2, effect:'cannot_be_targeted_by_attacks'}
  };
  if (id === 'S1-ARC-018' || id === 'S1-CLE-022' || id === 'S1-ARC-024') return null;
  if (map[id]) return Object.assign({ card_id:id, binds_to:'hero_host_not_slot', instant_cards_do_not_remain_attached:true }, map[id]);
  if (/attach this card|until the start|until the end|next turn|this turn/.test(text) && shouldUseAttachmentSlot(card)) return { card_id:id, kind:'ongoing_or_modifier', slot:'attachment', binds_to:'hero_host_not_slot' };
  return null;
}

function idOrName(card) {
  return normalizeText(card && (card.card_id || card.id || card.name)) || 'Reaction card';
}

module.exports = {
  validateReactionAgainstIncoming,
  damageTypeAllowed,
  normalizeDamageType,
  reactionPolicyForCard,
  reactionAllowedDamageTypes,
  reactionKindForCard,
  REACTION_DEFENSE_RESPONSE_CARD_IDS,
  BASE_CLASSES,
  CHAIN_MAIL_ALLOWED_BASE_CLASSES,
  NORMAL_ATTACK_PROFILES,
  ATTACK_AUDIT_NO1_PRIMARY_ATTACK_IDS,
  ATTACK_AUDIT_NO2_COMPLEX_ATTACK_IDS,
  normalizeBaseLineage,
  heroBaseLineages,
  isChainMailCard,
  canUseChainMail,
  attackProfile,
  isExactMagicalAttackAction,
  isSurgeEligibleAction,
  counterLabelForCard,
  forbiddenCounterLabelForCard,
  isRangeAttackAction,
  isAreaAttackAction,
  isSingleTargetAttackSkill,
  attackTargetingPolicy,
  shouldUseAttachmentSlot,
  heroAttackBuffPolicy,
  racialTraitPolicy,
  attackAuditBucket,
  isNo1PrimaryAttackLocked,
  isNo2ComplexAttack,
  ATTACHMENT_SUPPORT_HAND_CARD_IDS,
  isOpponentHandBackSelectionCard,
  handManipulationPolicyForCard,
  isPurifyChoiceCard,
  supportHealPurifyPolicyForCard,
  attachmentPolicyForCard
};


// v1.52 / v0.23 runtime policy exports
module.exports.RUNTIME_V151_RESPONSE_LINEAGE_LOCK = Object.freeze({ soulBlastConnectedHit: true, defenseResponseCreatesExhaust: false, defenseResponseBlockedByExistingExhaust: false, alliedProtectionSourceCards: ['S1-CLE-011','S1-CLE-022','S1-CLE-025'], hammerOfJusticeResponseEligible: false, coverUpSwapBeforeRedirect: true, escapeArrowExactHandChoice: true, opponentPlayedPublicRecord: true });


const EVENT_CARD_IDS_V01112=Object.freeze(['S1-EVT-001','S1-EVT-002','S1-EVT-003','S1-EVT-004','S1-EVT-005','S1-EVT-006','S1-EVT-007','S1-EVT-008','S1-EVT-009','S1-EVT-010','S1-EVT-011','S1-EVT-012']);
function eventSourceDestinationPolicy(card){const id=normalizeText(card&&(card.card_id||card.id)).toUpperCase();if(!EVENT_CARD_IDS_V01112.includes(id))return null;const policy=card&&(card.source_card_destination_policy||(card.lifecycle&&card.lifecycle.source_card_destination_policy));return policy||{commit_identity:'stable commit_token',exact_once:true,success_destination:shouldUseAttachmentSlot(card)?'Attachment Slot':'Discard Pile',canceled_destination:'Discard Pile'};}
function manaVoidBaseForClass(card,className){if(!card||normalizeText(card.card_id).toUpperCase()!=='S1-MAG-025')return 0;const map=(card.attack&&card.attack.damage_by_class)||{};const value=map[className];if(typeof value==='number')return value;if(value&&typeof value==='object')return Number(value.base_multiplier_per_opponent_mana_regen||value.base_multiplier||value.amount||0);return Number(value||0);}
function interceptSidesLegal(sourceSide,responderSide){return Boolean(sourceSide&&responderSide&&sourceSide!==responderSide);}
module.exports.EVENT_CARD_IDS_V01112=EVENT_CARD_IDS_V01112;module.exports.eventSourceDestinationPolicy=eventSourceDestinationPolicy;module.exports.manaVoidBaseForClass=manaVoidBaseForClass;module.exports.interceptSidesLegal=interceptSidesLegal;
module.exports.EVENT_ATTACHMENT_INSTANCE_POLICY=Object.freeze({attachmentRegistry:'attachment_policy',eventExactOnce:true,ringOfGraceHost:'target_hero',relentlessAIParity:true,manaVoidNumericMap:true,interceptOpponentOnly:true,heroicChargeSkipClosesContinuation:true});


// Runtime Foundation v1.65 / Core v0.34 hybrid-lineage lock.
const HYBRID_LINEAGE_ACCESS_V204 = Object.freeze({"Warrior": ["Warrior"], "Gladiator": ["Warrior", "Gladiator"], "Conqueror": ["Warrior", "Gladiator", "Conqueror"], "Paladin": ["Warrior", "Cleric", "Paladin"], "Crusader": ["Warrior", "Cleric", "Paladin", "Crusader"], "Cleric": ["Cleric"], "Priest": ["Cleric", "Priest"], "Saint": ["Cleric", "Priest", "Saint"], "Mage": ["Mage"], "Elementalist": ["Mage", "Elementalist"], "Elemental Lord": ["Mage", "Elementalist", "Elemental Lord"], "Thief": ["Thief"], "Rogue": ["Thief", "Rogue"], "Renegade": ["Thief", "Rogue", "Renegade"], "Spell Blade": ["Thief", "Mage", "Spell Blade"], "Arcane Duelist": ["Thief", "Rogue", "Mage", "Elementalist", "Spell Blade", "Arcane Duelist"], "Archer": ["Archer"], "Marksman": ["Archer", "Marksman"], "Grand Ranger": ["Archer", "Marksman", "Grand Ranger"], "Arbalest": ["Archer", "Thief", "Arbalest"], "Grand Arbalest": ["Archer", "Thief", "Arbalest", "Grand Arbalest"]});
function heroMatchesPrintedLineageV204(activeClass, printedClasses) {
  const access = HYBRID_LINEAGE_ACCESS_V204[activeClass] || [activeClass];
  return (printedClasses || []).some((name) => access.includes(name));
}
module.exports.HYBRID_LINEAGE_ACCESS_V204 = HYBRID_LINEAGE_ACCESS_V204;
module.exports.heroMatchesPrintedLineageV204 = heroMatchesPrintedLineageV204;
