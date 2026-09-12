'use strict';
const path=require('path');
const {loadLocalAI}=require('./vm-local-ai-harness.cjs');
const root=path.resolve(__dirname,'..','..');
const ctx=loadLocalAI(root);
function need(v,msg){if(!v){console.error('FAIL',msg);process.exit(1)}}
need(typeof ctx.GL_LAB_V011_ROOT_FIX_QA_SELF_TEST==='function','v0.11 QA hook missing');
const qa=ctx.GL_LAB_V011_ROOT_FIX_QA_SELF_TEST();
if(!qa.ok){console.error('FAIL',qa);process.exit(1)}
console.log('PASS v0.11 root fixes',qa);
