'use strict';
const {assert}=require('../_helpers.cjs');
const p=require('../../Authority/Runtime/Shared/core/attack-damage-classification-policy.js');
const cases=[
 ['Physical Attack','Physical',true,true,false,false],
 ['Area Attack','Physical',false,true,false,false],
 ['Range Attack','Physical',false,true,false,false],
 ['Magical Attack','Magical',false,false,true,true],
 ['Area Attack','Magical',false,false,false,true],
 ['Range Attack','Magical',false,false,false,true]
];
for(const [label,damage,pa,pd,ma,md] of cases){const c={classification:label,canonical_execution:{attack:{attack_label:label,damage:{damage_type:damage}}}};assert(p.matchesAttackLabel('Physical Attack',c)===pa,`${label}/${damage} physical attack`);assert(p.matchesDamageType('Physical',c)===pd,`${label}/${damage} physical damage`);assert(p.matchesAttackLabel('Magical Attack',c)===ma,`${label}/${damage} magical attack`);assert(p.matchesDamageType('Magical',c)===md,`${label}/${damage} magical damage`)}
console.log('PASS attack-vs-damage matrix');
