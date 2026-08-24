'use strict';

const SUPPORTED_EFFECT_TYPES = Object.freeze([
  'damage',
  'healing',
  'draw',
  'status',
  'mana_change',
  'discard',
  'reposition_swap',
  'custom'
]);

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function responseKind(observation) {
  return String(observation && observation.primary_response_kind || '').trim().toUpperCase();
}

function normalizeConditionalFollowUp(contract) {
  if (!contract || typeof contract !== 'object') return null;
  const normalized = clone(contract);
  normalized.schema_version = String(normalized.schema_version || '1.0.0');
  normalized.trigger_timing = String(normalized.trigger_timing || 'after_primary_resolution');
  normalized.opens_response_window = normalized.opens_response_window === true;
  normalized.requires_primary_resolution = normalized.requires_primary_resolution !== false;
  normalized.requires_primary_hit = normalized.requires_primary_hit === true;
  normalized.requires_primary_hp_damage = normalized.requires_primary_hp_damage === true;
  normalized.trigger_on_dodge = normalized.trigger_on_dodge === true;
  normalized.trigger_on_block = normalized.trigger_on_block !== false;
  normalized.trigger_if_primary_damage_zero = normalized.trigger_if_primary_damage_zero === true;
  normalized.canceled_if_primary_negated = normalized.canceled_if_primary_negated !== false;
  normalized.canceled_if_primary_canceled = normalized.canceled_if_primary_canceled !== false;
  normalized.primary_block_interaction = String(normalized.primary_block_interaction || 'does_not_carry_over');
  normalized.modifier_inheritance = String(normalized.modifier_inheritance || 'none');
  normalized.follow_up_ordering = String(normalized.follow_up_ordering || 'immediately_after_primary_before_attack_finalization');
  normalized.automatic = normalized.automatic !== false;
  return normalized;
}

function lower(value) {
  return String(value || '').trim().toLowerCase();
}

function evaluateCondition(condition, observation) {
  const current = condition || { type: 'always' };
  const type = lower(current.type || current.kind || 'always');
  if (type === 'always') return { matched: true, reason: 'condition_always' };
  if (type === 'all') {
    for (const child of current.conditions || []) {
      const result = evaluateCondition(child, observation);
      if (!result.matched) return result;
    }
    return { matched: true, reason: 'all_conditions_matched' };
  }
  if (type === 'any') {
    const results = (current.conditions || []).map(child => evaluateCondition(child, observation));
    return results.some(result => result.matched)
      ? { matched: true, reason: 'one_condition_matched' }
      : { matched: false, reason: 'no_condition_matched' };
  }
  if (type === 'not') {
    const result = evaluateCondition(current.condition, observation);
    return { matched: !result.matched, reason: result.matched ? 'negated_condition_matched' : 'negated_condition_not_matched' };
  }
  if (type === 'target_has_status') {
    const wanted = lower(current.status);
    const statuses = (observation && observation.target_statuses || []).map(lower);
    return statuses.includes(wanted)
      ? { matched: true, reason: `target_has_status:${wanted}` }
      : { matched: false, reason: `target_missing_status:${wanted}` };
  }
  if (type === 'primary_response_kind_is' || type === 'primary_was_dodged') {
    const wanted = type === 'primary_was_dodged' ? 'DODGE' : String(current.response_kind || current.value || '').toUpperCase();
    return responseKind(observation) === wanted
      ? { matched: true, reason: `primary_response_kind:${wanted}` }
      : { matched: false, reason: `primary_response_kind_not:${wanted}` };
  }
  if (type === 'source_class_in') {
    const actual = lower(observation && observation.source_class);
    const allowed = (current.values || current.classes || []).map(lower);
    return allowed.includes(actual)
      ? { matched: true, reason: `source_class:${actual}` }
      : { matched: false, reason: `source_class_not_allowed:${actual}` };
  }
  if (type === 'primary_hp_damage_at_least') {
    const minimum = Number(current.amount || current.value || 0);
    const actual = Number(observation && observation.primary_hp_damage || 0);
    return actual >= minimum
      ? { matched: true, reason: `primary_hp_damage_at_least:${minimum}` }
      : { matched: false, reason: `primary_hp_damage_below:${minimum}` };
  }
  if (type === 'target_hp_at_or_below') {
    const maximum = Number(current.amount || current.value || 0);
    const actual = Number(observation && observation.target_hp_after_primary || 0);
    return actual <= maximum
      ? { matched: true, reason: `target_hp_at_or_below:${maximum}` }
      : { matched: false, reason: `target_hp_above:${maximum}` };
  }
  return { matched: false, reason: `unsupported_condition:${type}` };
}

function evaluateConditionalFollowUp(rawContract, observation) {
  const contract = normalizeConditionalFollowUp(rawContract);
  if (!contract) return { eligible: false, reason: 'missing_contract', contract: null };
  if (contract.enabled === false) return { eligible: false, reason: 'contract_disabled', contract };
  if (contract.trigger_timing !== 'after_primary_resolution') return { eligible: false, reason: 'unsupported_trigger_timing', contract };
  if (contract.requires_primary_resolution && !observation.primary_resolved) return { eligible: false, reason: 'primary_not_resolved', contract };
  if (contract.canceled_if_primary_canceled && observation.primary_canceled) return { eligible: false, reason: 'primary_canceled', contract };
  if (contract.canceled_if_primary_negated && observation.primary_negated) return { eligible: false, reason: 'primary_negated', contract };
  const kind = responseKind(observation);
  if (kind === 'DODGE' && !contract.trigger_on_dodge) return { eligible: false, reason: 'dodge_suppresses_follow_up', contract };
  if (kind === 'BLOCK' && !contract.trigger_on_block) return { eligible: false, reason: 'block_suppresses_follow_up', contract };
  if (contract.requires_primary_hit && !observation.primary_hit) return { eligible: false, reason: 'primary_did_not_hit', contract };
  if (contract.requires_primary_hp_damage && Number(observation.primary_hp_damage || 0) <= 0) return { eligible: false, reason: 'primary_dealt_no_hp_damage', contract };
  if (!contract.trigger_if_primary_damage_zero && Number(observation.primary_hp_damage || 0) <= 0) return { eligible: false, reason: 'zero_primary_damage_suppresses_follow_up', contract };
  const condition = evaluateCondition(contract.condition, observation);
  if (!condition.matched) return { eligible: false, reason: condition.reason, contract, condition };
  return { eligible: true, reason: condition.reason, contract, condition };
}

function resolveEffectValue(effect, observation) {
  if (!effect || typeof effect !== 'object') return null;
  if (Number.isFinite(Number(effect.value))) return Number(effect.value);
  if (Number.isFinite(Number(effect.amount))) return Number(effect.amount);
  const byClass = effect.value_by_source_class || effect.amount_by_source_class || effect.amount_by_class;
  if (byClass && typeof byClass === 'object') {
    const actual = lower(observation && observation.source_class);
    for (const [name, value] of Object.entries(byClass)) {
      if (lower(name) === actual && Number.isFinite(Number(value))) return Number(value);
    }
  }
  return null;
}

function resolveConditionalFollowUp(rawContract, observation, handlers) {
  const evaluation = evaluateConditionalFollowUp(rawContract, observation || {});
  if (!evaluation.eligible) return Object.assign({ resolved: false }, evaluation);
  const effect = evaluation.contract.effect || {};
  const type = lower(effect.type || effect.kind);
  if (!SUPPORTED_EFFECT_TYPES.includes(type)) {
    return Object.assign({}, evaluation, { resolved: false, eligible: false, reason: `unsupported_effect_type:${type}` });
  }
  const handler = handlers && handlers[type];
  if (typeof handler !== 'function') {
    return Object.assign({}, evaluation, { resolved: false, eligible: true, reason: `no_handler_for_effect_type:${type}`, effect_type: type });
  }
  const context = {
    contract: evaluation.contract,
    effect,
    effect_type: type,
    effect_value: resolveEffectValue(effect, observation || {}),
    observation: clone(observation || {})
  };
  return Object.assign({}, evaluation, { resolved: true, eligible: true, reason: evaluation.reason, effect_type: type, output: handler(context) });
}

module.exports = {
  SUPPORTED_EFFECT_TYPES,
  normalizeConditionalFollowUp,
  evaluateCondition,
  evaluateConditionalFollowUp,
  resolveEffectValue,
  resolveConditionalFollowUp
};
