'use strict';
const path=require('path');
const {loadLocalAI}=require('./vm-local-ai-harness.cjs');
const root=path.resolve(__dirname,'..');
const ctx=loadLocalAI(root);
const fn=ctx.GL_LOCAL_AI_V534_TACTICAL_AI_QA_SELF_TEST;
if(typeof fn!=='function') throw new Error('Tactical planner self-test missing');
const result=fn();
if(!result||result.ok!==true) throw new Error('Tactical planner self-test failed: '+JSON.stringify(result));
for(const key of ['ringTargetsHealRecipient','ringRequiresHeal','poisonVialRequiresHostAttack','arcaneScrollRequiresHostMagicalAttack','blessingMightRequiresBuffedHeroPhysicalAttack','blessingWisdomRequiresBuffedHeroMagicalAttack','enrageRequiresSourcePhysicalAttack','doubleCastingRequiresTimedMagicalAttack','doubleCastingAttackFollowsPrintedTiming','wildfireRequiresNextTurnAttack','futureAttackPlanPreserved','plansRevalidateAtFollowUp']){
  if(result[key]!==true) throw new Error('Missing tactical AI lock: '+key+' '+JSON.stringify(result));
}
console.log('PASS tactical AI planner: setup cards reserve their legal payoff; Double Casting follows printed timing and Wildfire reserves a next-turn Mage Attack.');
