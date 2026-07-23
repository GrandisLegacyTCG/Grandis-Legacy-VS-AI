'use strict';
const path=require('path');
const {loadLocalAI}=require('./vm-local-ai-harness.cjs');
const root=path.resolve(__dirname,'..');
const ctx=loadLocalAI(root);
const required=[
  'GL_PVP_V231_FULL_CARD_EFFECT_QA_SELF_TEST',
  'GL_PVP_V220_GAMEPLAY_UI_QA_SELF_TEST',
  'GL_V511_ESCAPE_ARROW_QA_SELF_TEST',
  'GL_V370_CHARGE_ATTACK_CHOICE_ZONE_QA_SELF_TEST',
  'GL_V510_DOUBLE_CASTING_QA_SELF_TEST',
  'GL_V513_ATTACHMENT_INTEGRATION_QA_SELF_TEST',
  'GL_V570_PENDING_FIX_QA_SELF_TEST',
  'GL_V350_RANGE_PRIMAL_AURA_AUDIT_SELF_TEST',
  'GL_V351_DRAW_REPLACEMENT_AURA_AUDIT_SELF_TEST',
  'GL_V343_COST_TRIBUTE_ATTACHMENT_AUDIT_SELF_TEST',
  'GL_PHASE3_ARCHER_COMPLEX_PATCH_QA_SELF_TEST',
  'GL_PHASE4_CHOICE_UI_PATCH_QA_SELF_TEST',
  'GL_PHASE12_CASTING_DEFEAT_CANCEL_QA_SELF_TEST',
  'GL_PHASE20_POISON_VIAL_MULTIHIT_QA_SELF_TEST'
];
const failures=[];const results=[];
for(const name of required){
  if(typeof ctx[name]!=='function'){failures.push({name,reason:'missing self-test'});continue;}
  let result;
  try{result=ctx[name]();}catch(error){result={ok:false,error:String(error&&error.stack||error)}}
  results.push({name,result});
  if(!result||result.ok!==true)failures.push({name,result});
}
if(failures.length){console.error(JSON.stringify({failures,results},null,2));process.exit(1)}
const key={
  escape_arrow:results.find(x=>x.name==='GL_V511_ESCAPE_ARROW_QA_SELF_TEST').result,
  venom_detonation:results.find(x=>x.name==='GL_PVP_V220_GAMEPLAY_UI_QA_SELF_TEST').result,
  poison_vial_multihit:results.find(x=>x.name==='GL_PHASE20_POISON_VIAL_MULTIHIT_QA_SELF_TEST').result,
  post_attack_swap:results.find(x=>x.name==='GL_V370_CHARGE_ATTACK_CHOICE_ZONE_QA_SELF_TEST').result,
  all_cards:results.find(x=>x.name==='GL_PVP_V231_FULL_CARD_EFFECT_QA_SELF_TEST').result
};
console.log('PASS Local AI application effects: '+required.length+' suites; Escape Arrow discard, Venom Detonation, real Poison Vial multi-hit, Triple Shot, Casting, Legacy, choices, attachments, status and post-attack swap.');
console.log(JSON.stringify(key));
