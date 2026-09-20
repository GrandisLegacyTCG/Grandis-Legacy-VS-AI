'use strict';
const {assert}=require('../_helpers.cjs');
const {stateWith,playAttack,resolveAttack}=require('../_runtime_fixture.cjs');

// Mandatory real-runtime regression: Conqueror Arena Dominator names Physical Attack,
// while Whirlwind is Area Attack + Physical Damage. The +10 must not apply.
let s=stateWith('S1-WAR-H003',['S1-ARC-H001']);
s=playAttack(s,'S1-WAR-016');
assert(s.pending_attack_resolution.action_profile==='Area Attack','Whirlwind must remain Area Attack');
assert(s.pending_attack_resolution.damage_type==='Physical','Whirlwind must remain Physical damage');
assert(s.pending_attack_resolution.base_damage===50,'Conqueror Whirlwind base damage must be 50');
assert(s.pending_attack_resolution.class_attack_damage_bonus===0,'Arena Dominator must not buff Area Attack merely because damage is Physical');
assert(s.pending_attack_resolution.final_damage===50,'Conqueror + Whirlwind must be 50 before unrelated modifiers');
s=resolveAttack(s);
assert(s.players.P2.board.Center.hero.hp===50,'Actual reducer must deal exactly 50 to the target before unrelated modifiers');
console.log('PASS Whirlwind reducer/runtime regression: Conqueror + Whirlwind = 50');
