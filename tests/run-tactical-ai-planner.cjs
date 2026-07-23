'use strict';
const path=require('path');
const {loadLocalAI}=require('./vm-local-ai-harness.cjs');
const root=path.resolve(__dirname,'..');
const ctx=loadLocalAI(root);
const fn=ctx.GL_LOCAL_AI_V534_TACTICAL_AI_QA_SELF_TEST;
if(typeof fn!=='function') throw new Error('Local AI v5.35 tactical planner self-test missing');
const result=fn();
if(!result||result.ok!==true) throw new Error('Local AI v5.35 tactical planner self-test failed: '+JSON.stringify(result));
for(const key of ['ringTargetsHealRecipient','ringRequiresHeal','poisonVialRequiresHostAttack','arcaneScrollRequiresHostMagicalAttack','blessingMightRequiresBuffedHeroPhysicalAttack','blessingWisdomRequiresBuffedHeroMagicalAttack','enrageRequiresSourcePhysicalAttack','plansRevalidateAtFollowUp']){
  if(result[key]!==true) throw new Error('Missing tactical AI lock: '+key+' '+JSON.stringify(result));
}
console.log('PASS Local AI v5.35 tactical planner: Ring of Grace follows the heal recipient; attack attachments require legal same-turn payoff actions.');
