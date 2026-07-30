'use strict';
const fs=require('fs');
const path=require('path');
const {loadLocalAI}=require('./vm-local-ai-harness.cjs');
const root=path.resolve(__dirname,'..');
const ctx=loadLocalAI(root);
for(const name of ['GL_V570_PENDING_FIX_QA_SELF_TEST','GL_PHASE3_ARCHER_COMPLEX_PATCH_QA_SELF_TEST']){
  const fn=ctx[name]; if(typeof fn!=='function') throw new Error('Missing regression self-test '+name);
  const result=fn(); if(!result||result.ok!==true) throw new Error(name+' failed: '+JSON.stringify(result));
}
const app=fs.readFileSync(path.join(root,'js/app.bundle.js'),'utf8');
for(const phrase of ['Import Deck JSON','Invalid deck JSON schema','export its JSON']) if(app.includes(phrase)) throw new Error('Deck Setup still exposes JSON wording: '+phrase);
if(!app.includes('>Import Deck</button>')) throw new Error('Deck Setup Import Deck label missing');
if(!app.includes('GO TO DECK BUILDER')||!app.includes('Grandis-Legacy-Deck-Builder')) throw new Error('External Deck Builder navigation missing');
console.log('PASS Grandis Legacy VS AI v5.37 combat regressions and simplified deck import UI.');
