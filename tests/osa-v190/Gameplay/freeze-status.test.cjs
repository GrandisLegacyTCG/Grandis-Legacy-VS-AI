'use strict';
const fs=require('fs');const path=require('path');const {assert}=require('../_helpers.cjs');
const ROOT=path.resolve(__dirname,'../..');
const statusEngine=require('../../Authority/Runtime/Shared/engines/status-engine.js');
const canonical=JSON.parse(fs.readFileSync(path.join(ROOT,'Authority/Game/Cards/cards.canonical.v1.6.0.json'),'utf8'));
const gameplay=JSON.parse(fs.readFileSync(path.join(ROOT,'Authority/Game/Mechanics/gameplay-authority.v1.9.0.json'),'utf8'));
const recipes=JSON.parse(fs.readFileSync(path.join(ROOT,'Generated/Effect-Recipe/effect-recipes.runtime.v0.15.0.json'),'utf8'));
const freeze=canonical.cards.find(c=>c.card_id==='S1-ITM-020');
assert(freeze&&freeze.name==='Freeze Bomb','Freeze Bomb canonical card missing');
assert(freeze.rules.execution.dispatch.handler==='resolve_freeze_bomb','Freeze Bomb dispatch handler mismatch');
assert(freeze.rules.execution.dispatch.enabled===true,'Freeze Bomb canonical dispatcher must be enabled');
const fx=(freeze.rules.execution.effects||[]).find(e=>e.kind==='inflict_status'&&e.status==='Freeze');
assert(fx&&fx.duration_turns===1&&fx.target_scope==='one_opponent_hero','Freeze Bomb structured Freeze effect mismatch');
const recipe=recipes.effect_recipes.find(r=>r.card_id==='S1-ITM-020');
assert(recipe&&recipe.dispatch_handler==='resolve_freeze_bomb'&&recipe.dispatcher_ready===true&&recipe.dispatcher_enabled===true,'Freeze Bomb generated dispatcher flags must be executable');
assert(gameplay.rules&&gameplay.rules.freeze_status,'Generic Freeze authority missing');
assert(/blocked/i.test(gameplay.rules.freeze_status.while_active.normal_manual_reposition),'Freeze manual Reposition authority missing');
assert(/blocked/i.test(gameplay.rules.freeze_status.while_active.skill_effect_position_change),'Freeze Skill movement authority missing');
assert(/blocked/i.test(gameplay.rules.freeze_status.while_active.dodge),'Freeze Dodge authority missing');
assert(/not blocked/i.test(gameplay.rules.freeze_status.while_active.item_effect_position_change),'Freeze must not become universal movement lock');

// Audit every current canonical producer of Freeze. All producers must feed the shared Status model.
const freezeProducers=canonical.cards.filter(c=>((c.rules||{}).execution||{}).effects?.some(e=>['inflict_status','self_status'].includes(e.kind)&&String(e.status||'').toLowerCase()==='freeze'));
const producerIds=freezeProducers.map(c=>c.card_id).sort();
const expectedFreezeProducers=['S1-ITM-020','S1-MAG-002','S1-MAG-008','S1-MAG-010','S1-MAG-011','S1-MAG-017'].sort();
assert(JSON.stringify(producerIds)===JSON.stringify(expectedFreezeProducers),`Freeze producer audit mismatch: ${producerIds.join(', ')}`);
for(const c of freezeProducers){
  const effects=c.rules.execution.effects.filter(e=>['inflict_status','self_status'].includes(e.kind)&&String(e.status||'').toLowerCase()==='freeze');
  assert(effects.every(e=>Number(e.duration_turns||0)>0||e.duration_by_class),'Every Freeze producer must encode a positive duration or class duration map');
}
const permafrost=canonical.cards.find(c=>c.card_id==='S1-MAG-015');
assert(permafrost&&/target with Freeze status/i.test(JSON.stringify(permafrost.printed)),'Permafrost must remain a Freeze consumer/requirement, not a producer');

let statuses=statusEngine.mergeStatusList([], {status:'Freeze',duration_turns:1});
statuses=statusEngine.mergeStatusList(statuses,{status:'Freeze',duration_turns:1});
assert(statusEngine.duration(statuses[0])===2,'Freeze reapplication must add duration');
console.log('PASS Freeze canonical/dispatcher/generic status authority');
