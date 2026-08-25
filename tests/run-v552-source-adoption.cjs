
'use strict';
const fs=require('fs'),path=require('path');
const {loadLocalAI}=require('./vm-local-ai-harness.cjs');
const root=path.resolve(__dirname,'..'),app=fs.readFileSync(path.join(root,'js/app.bundle.js'),'utf8');
const ctx=loadLocalAI(root);
const st=ctx.GL_SOURCE_STACK||{};
for(const [k,v] of Object.entries({runtime_foundation:'v1.87',runtime_core:'v0.55',shared_manual:'v1.43',local_ai:'v6.11',pvp_railway:'v3.09',application_runtime_sync:'v2.49'}))if(st[k]!==v)throw new Error(k+'='+st[k]);
const result=ctx.GL_V394_EVENT_ATTACHMENT_INSTANCE_QA_SELF_TEST();
if(!result||!result.ok)throw new Error(JSON.stringify(result));
for(const key of ['ringOfGraceExhaustedTargetHost','venomConditionalSeparateAfterPrimary','heroRankResponseInferenceBlocked'])if(result[key]!==true)throw new Error(key);
const ultimate=ctx.GL_CARD_PREVIEW_QA.html('S1-ARC-018'),normal=ctx.GL_CARD_PREVIEW_QA.html('S1-ARC-001');
if(!ultimate.includes('Ultimate Rules')||normal.includes('Ultimate Rules'))throw new Error('Ultimate-only rules mismatch');
if(!app.includes("index===0?'current':''")||!app.includes('bringModalToFront(modal)'))throw new Error('progression stack/highlight missing');
const reducer=require(path.join(root,'runtime-source/runtime/core/reducer.js'));
if(!reducer.__test||typeof reducer.__test.racialResponseIdentity!=='function'||typeof reducer.__test.selectedTargetIsItemUserAndHost!=='function')throw new Error('Core v0.55 test exports missing');
console.log('PASS VS AI v6.11 source adoption');
