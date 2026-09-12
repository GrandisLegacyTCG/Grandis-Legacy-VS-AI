'use strict';
const path=require('path');
const fs=require('fs');
const crypto=require('crypto');
const {loadLocalAI}=require('./vm-local-ai-harness.cjs');
const root=path.resolve(__dirname,'..','..');
const ctx=loadLocalAI(root);
function need(v,m){if(!v)throw new Error(m)}
const r=ctx.GL_LAB_V07_PAYMENT_RACIAL_QA_SELF_TEST();
need(r&&r.ok,'v0.7 payment/racial self-test failed: '+JSON.stringify(r));
need(r.itemPopupSuppressed,'Item payment popup was not suppressed');
need(r.additionalDiscardPaymentPreserved,'Mandatory additional-card response payment regressed');
need(r.matchingClassShardGenericPayment===1,'Matching Class Shard remaining generic payment mismatch');
need(r.nonmatchingClassShardGenericPayment===2,'Nonmatching Class Shard remaining generic payment mismatch');
need(r.racialRuntimeAfterSpend===1&&r.racialHeadCount===1&&r.racialTailCount===1,'Racial Token did not decrement/render Head->Tail');
function sha(f){return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')}
const head=path.join(root,'assets/cards/ui/Racial-Token-Head.webp');
const tail=path.join(root,'assets/cards/ui/Racial-Token-Tail.webp');
need(fs.existsSync(head)&&fs.existsSync(tail),'Racial Token assets missing');
need(sha(head)!==sha(tail),'Racial Token Head/Tail assets are still identical');
const app=fs.readFileSync(path.join(root,'js/app.bundle.js'),'utf8');
need(app.includes("if(side!=='PLAYER'||Number(cost||0)<=0||!isSkillCard(c))return false"),'Skill-only Class Shard popup gate missing');
need(app.includes("responsePaymentNeedsChoice(state,side,rc,cost)"),'Response payment popup authority helper missing');
console.log('PASS v0.7 payment/racial: Items bypass Class Shard popup, Skill Class Shards reduce remaining Pay Mana, additional-card Response payment remains mandatory, and Racial Token visibly flips Head->Tail after spend.');
