'use strict';
const {assert}=require('../_helpers.cjs');const {reducer,stateWith,playAttack,resolveAttack}=require('../_runtime_fixture.cjs');
function attach(s,cardId,amount=20){s.players.P1.attachments.push({attachment_id:`${cardId}:test`,card_id:cardId,owner_id:'P1',source_slot:'Center',host_slot:'Center',target_slot:'Center',attachment_state:'ONGOING_EFFECT',modifier_amount:amount,effect_result:{amount,total_bonus:amount}});return s;}
// Physical Attack wording applies to explicit Physical Attack.
let s=attach(stateWith('S1-ARC-H001',['S1-WAR-H001']),'S1-CLE-006');s=playAttack(s,'S1-ARC-002');assert(s.pending_attack_resolution.action_profile==='Physical Attack','Poison Arrow fixture must be Physical Attack');s=resolveAttack(s);assert(s.players.P2.board.Center.hero.hp===70,'Blessing of Might must add +20 to 10-damage Physical Attack');
// Area Attack + Physical Damage is NOT Physical Attack.
s=attach(stateWith('S1-WAR-H003',['S1-ARC-H001']),'S1-CLE-006');s=playAttack(s,'S1-WAR-016');assert(s.pending_attack_resolution.action_profile==='Area Attack'&&s.pending_attack_resolution.final_damage===50,'Whirlwind must be Area Attack with 50 pre-response damage');s=resolveAttack(s);assert(s.players.P2.board.Center.hero.hp===50,'Physical-Attack modifier must not buff Area Attack + Physical Damage');
// Range Attack + Physical Damage is NOT Physical Attack.
s=attach(stateWith('S1-ARC-H001',['S1-WAR-H001']),'S1-CLE-006');s=playAttack(s,'S1-ARC-019');assert(s.pending_attack_resolution.action_profile==='Range Attack','Long Range Shot fixture must be Range Attack');s=resolveAttack(s);assert(s.players.P2.board.Center.hero.hp===60,'Physical-Attack modifier must not buff Range Attack + Physical Damage');
// Range Attack + Magical Damage is NOT Magical Attack, including Arcane Scroll.
s=attach(stateWith('S1-MAG-H002',['S1-WAR-H001']),'S1-ITM-010');s=playAttack(s,'S1-MAG-014');assert(s.pending_attack_resolution.action_profile==='Range Attack'&&s.pending_attack_resolution.damage_type==='Magical','Lightning Strike fixture');s=resolveAttack(s);assert(s.players.P2.board.Center.hero.hp===50,'Magical-Attack modifier must not buff Range Attack + Magical Damage');
// Poison Vial is also gated by the explicit Physical Attack label, not physical damage alone.
s=stateWith('S1-WAR-H003',['S1-ARC-H001']);s.players.P1.attachments.push({attachment_id:'vial:test',card_id:'S1-ITM-011',owner_id:'P1',source_slot:'Center',host_slot:'Center',attachment_state:'ONGOING_EFFECT',modifier_type:'POISON_VIAL',remaining_count:1,consumed:false});s=playAttack(s,'S1-WAR-016');s=resolveAttack(s);assert(s.players.P1.attachments.some(a=>a.card_id==='S1-ITM-011'),'Poison Vial must not consume on Area Attack + Physical Damage');assert(!(s.players.P2.board.Center.hero.statuses||[]).some(x=>String(x.name||x.status||x).toLowerCase()==='poison'),'Poison Vial must not apply poison from Area Attack');

// All named attack-label attachment modifiers must reject Area/Range labels and accept only their printed exact Attack labels.
const gate=reducer.__test.attachmentDamageModifierApplies;
for(const cardId of ['S1-CLE-006','S1-CLE-007','S1-ITM-010','S1-ITM-014','S1-EVT-011']){
  const a={card_id:cardId,target_slot:'Center',host_slot:'Center',source_slot:'Center'};
  assert(gate(a,{action_profile:'Area Attack',source_slot:'Center',damage_type:'Physical'})===false,`${cardId} must reject Area Attack even when Physical`);
  assert(gate(a,{action_profile:'Range Attack',source_slot:'Center',damage_type:'Magical'})===false,`${cardId} must reject Range Attack even when Magical`);
}
assert(gate({card_id:'S1-CLE-006',target_slot:'Center'},{action_profile:'Physical Attack',source_slot:'Center',damage_type:'Physical'})===true,'Blessing of Might exact Physical Attack gate');
assert(gate({card_id:'S1-CLE-007',target_slot:'Center'},{action_profile:'Magical Attack',source_slot:'Center',damage_type:'Magical'})===true,'Blessing of Wisdom exact Magical Attack gate');
assert(gate({card_id:'S1-ITM-010',target_slot:'Center'},{action_profile:'Magical Attack',source_slot:'Center',damage_type:'Magical'})===true,'Arcane Scroll exact Magical Attack gate');
assert(gate({card_id:'S1-ITM-014',target_slot:'Center'},{action_profile:'Physical Attack',source_slot:'Center',damage_type:'Physical'})===true,'Holy Medallion exact attack-label gate');
assert(gate({card_id:'S1-EVT-011',target_slot:'Left'},{action_profile:'Magical Attack',source_slot:'Center',damage_type:'Magical'})===true,'Coordination Attack exact attack-label gate');

// Dead Eye is integrated through the real reducer: its own Range conversion must not erase
// the qualifying Physical Attack label for its +10 damage, while an externally converted Area
// Attack (Triple Shot) must not gain the bonus merely because it deals Physical damage.
s=stateWith('S1-ARC-H003',['S1-WAR-H001']);s=playAttack(s,'S1-ARC-002');assert(s.pending_attack_resolution.action_profile==='Range Attack'&&s.pending_attack_resolution.range_converted_by_hero_ability===true,'Grand Ranger Dead Eye must convert explicit Physical Attack to Range Attack');assert(s.pending_attack_resolution.class_attack_damage_bonus===10&&s.pending_attack_resolution.final_damage===20,'Dead Eye must add +10 to the qualifying Physical Attack card after its own Range conversion');
s=stateWith('S1-ARC-H003',['S1-WAR-H001']);s.players.P1.attachments.push({attachment_id:'S1-ARC-013:test',card_id:'S1-ARC-013',owner_id:'P1',source_slot:'Center',host_slot:'Center',attachment_state:'ONGOING_EFFECT',lifecycle_mode:'while_present_in_attachment_slot'});s=playAttack(s,'S1-ARC-002');assert(s.pending_attack_resolution.action_profile==='Area Attack'&&s.pending_attack_resolution.triple_shot_area===true,'Triple Shot fixture must convert Poison Arrow to Area Attack');assert(s.pending_attack_resolution.class_attack_damage_bonus===0&&s.pending_attack_resolution.final_damage===10,'Dead Eye must not buff Area Attack merely because it originated from a Physical-damage card');

// Sharpshooter is integrated through the real reducer: only an explicit Physical Attack gains Range reach.
s=stateWith('S1-ARC-H002',['S1-WAR-H001']);s=playAttack(s,'S1-ARC-002');assert(s.pending_attack_resolution.action_profile==='Range Attack'&&s.pending_attack_resolution.range_converted_by_hero_ability===true,'Marksman Sharpshooter must convert explicit Physical Attack to Range Attack');
s=stateWith('S1-ARC-H002',['S1-WAR-H001']);s=playAttack(s,'S1-ARC-009');assert(s.pending_attack_resolution.action_profile==='Area Attack'&&s.pending_attack_resolution.range_converted_by_hero_ability===false,'Sharpshooter must not convert Area Attack merely because it deals Physical Damage');

console.log('PASS Attack Label vs Damage Type integration through reducer');
