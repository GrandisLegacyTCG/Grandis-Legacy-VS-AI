'use strict';

const PHASES = Object.freeze({
  DRAW: 'Draw',
  DEPLOY: 'Deploy',
  BATTLE: 'Battle',
  REFORM: 'Reform',
  END: 'End'
});

const CARD_TYPES = Object.freeze({
  HERO: 'Hero',
  LEGACY: 'Legacy',
  ITEM: 'Item',
  EVENT: 'Event',
  SKILL: 'Skill'
});

const ATTACK_LAYER = Object.freeze({
  NONE: 'None',
  AREA: 'Area Attack',
  RANGE: 'Range Attack'
});

const DAMAGE_PROFILE = Object.freeze({
  NONE: 'None',
  PHYSICAL: 'Physical',
  MAGICAL: 'Magical'
});

const NORMAL_ATTACK_BADGE = Object.freeze({
  PHYSICAL: 'Physical Attack',
  MAGICAL: 'Magical Attack'
});

const DEF_MECHANIC = Object.freeze({
  BLOCK: 'Block',
  REDUCE_DAMAGE: 'Reduce Damage',
  DODGE: 'Dodge',
  NEGATE: 'Negate',
  REDIRECT: 'Redirect',
  IMMUNITY: 'Cannot Take Any Damage (Immunity)'
});

const ATTACHMENT_STATE = Object.freeze({
  NONE: 'None',
  ATTACHED_ITEM: 'Attached Item',
  CONSUMABLE_MODIFIER: 'Consumable Modifier',
  ONGOING_EFFECT: 'Ongoing Effect',
  CASTING: 'Casting',
  REDUCE_DAMAGE: 'Reduce Damage',
  DELAYED_EFFECT: 'Delayed Effect'
});

const CONNECT_RESULT = Object.freeze({
  CONNECTS: 'Connects',
  DODGED: 'Dodged',
  NEGATED: 'Negated'
});

module.exports = {
  PHASES,
  CARD_TYPES,
  ATTACK_LAYER,
  DAMAGE_PROFILE,
  NORMAL_ATTACK_BADGE,
  DEF_MECHANIC,
  ATTACHMENT_STATE,
  CONNECT_RESULT
};
