'use strict';
const fs=require('fs');const path=require('path');const {loadLocalAI}=require('./vm-local-ai-harness.cjs');
const root=path.resolve(__dirname,'..');const ctx=loadLocalAI(root);const fn=ctx.GL_V539_RESPONSE_DIAGNOSTICS_QA_SELF_TEST;if(typeof fn!=='function')throw new Error('v5.39 QA self-test missing');const r=fn();if(!r||r.ok!==true)throw new Error('v5.39 QA failed: '+JSON.stringify(r));
const app=fs.readFileSync(path.join(root,'js/app.bundle.js'),'utf8'),css=fs.readFileSync(path.join(root,'css/app.css'),'utf8');
for(const token of ['responseDisplayItemsFor','responseUnavailableReasonsFor','data-response-reason'])if(!app.includes(token))throw new Error('missing response diagnostics token '+token);
if(app.includes('data-response-unavailable='))throw new Error('click-popup response binding should be removed');
if(!css.includes('straight mobile hands')||!css.includes('transform:none!important'))throw new Error('straight mobile hand override missing');
if(!app.includes('https://grandislegacytcg.github.io/Grandis-Legacy-Deck-Builder/style-1/'))throw new Error('external Deck Builder link missing');
console.log('PASS Grandis Legacy VS AI v5.39 response diagnostics, external Deck Builder, and mobile straight hands.');console.log(JSON.stringify(r));
