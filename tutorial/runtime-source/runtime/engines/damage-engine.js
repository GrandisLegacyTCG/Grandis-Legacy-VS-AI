'use strict';

function calculateBaseDamageWithBuffs(input) {
  const baseDamage = Number(input && input.baseDamage ? input.baseDamage : 0);
  const buffs = Array.isArray(input && input.buffs) ? input.buffs : [];
  const doubleBase = Boolean(input && input.doubleBase);
  const doubledBaseDamage = doubleBase ? baseDamage * 2 : baseDamage;
  const additiveBuffDamage = buffs.reduce((sum, buff) => sum + Number(buff.amount || 0), 0);
  return {
    baseDamage,
    doubleBase,
    doubledBaseDamage,
    additiveBuffDamage,
    finalDamageBeforeDefense: doubledBaseDamage + additiveBuffDamage,
    note: 'Double-damage effects double printed Skill Card base damage only; buffs are added after doubling.'
  };
}

function dealsDamage(finalDamage) {
  return Number(finalDamage || 0) > 0;
}

function inflictsOnConnect(connectResult) {
  return connectResult === 'Connects' || connectResult === 'CONNECTS';
}

module.exports = { calculateBaseDamageWithBuffs, dealsDamage, inflictsOnConnect };
