'use strict';

const { DEF_MECHANIC, CONNECT_RESULT } = require('../core/constants');
const { normalizeDefMechanic } = require('../core/rules');

function applyDefMechanic(attackResolution, defEffect) {
  const mechanic = normalizeDefMechanic(defEffect && defEffect.mechanic);
  const result = Object.assign({}, attackResolution);
  result.defApplied = result.defApplied || [];

  if (mechanic === DEF_MECHANIC.NEGATE) {
    result.connectResult = CONNECT_RESULT.NEGATED;
    result.finalDamage = 0;
    result.defApplied.push({ mechanic, note: 'Negate stops the action from connecting.' });
    return result;
  }

  if (mechanic === DEF_MECHANIC.DODGE) {
    result.connectResult = CONNECT_RESULT.DODGED;
    result.finalDamage = 0;
    result.defApplied.push({ mechanic, note: 'Dodge avoids the hit.' });
    return result;
  }

  if (mechanic === DEF_MECHANIC.REDIRECT) {
    result.redirectTo = defEffect.redirectTo || null;
    result.defApplied.push({ mechanic, note: 'Redirect changes the target, action continues.' });
    return result;
  }

  if (mechanic === DEF_MECHANIC.IMMUNITY) {
    result.finalDamage = 0;
    result.defApplied.push({ mechanic, note: 'Immunity makes final damage 0 but does not by itself stop connect.' });
    return result;
  }

  if (mechanic === DEF_MECHANIC.BLOCK || mechanic === DEF_MECHANIC.REDUCE_DAMAGE) {
    const amount = Number(defEffect.amount || 0);
    result.finalDamage = Math.max(0, Number(result.finalDamage || 0) - amount);
    result.defApplied.push({ mechanic, amount, note: 'Damage mitigation does not stop connect by itself.' });
    return result;
  }

  return result;
}

module.exports = { applyDefMechanic };
