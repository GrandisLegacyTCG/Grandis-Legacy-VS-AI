'use strict';
const fs=require('fs'),path=require('path');
const {loadLocalAI}=require('./vm-local-ai-harness.cjs');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'js/app.bundle.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
function must(c,m){if(!c)throw new Error(m)}
must(app.includes('<h1>VS AI LOBBY</h1>'),'VS AI Lobby heading missing');
must(index.includes('gl-vs-ai-5.56'),'v5.56 cache revision missing');
must(index.includes('VS AI Lobby'),'page title missing');
must(app.includes('function aiBestAttackAfterWildfire(state, setupAction)'),'Wildfire next-turn planner missing');
must(app.includes('function clearAIPlanAtTurnEnd(state)'),'future AI plan preservation missing');
const ctx=loadLocalAI(root),r=ctx.GL_LOCAL_AI_V534_TACTICAL_AI_QA_SELF_TEST();
for(const key of ['doubleCastingRequiresTimedMagicalAttack','doubleCastingAttackFollowsPrintedTiming','wildfireRequiresNextTurnAttack','futureAttackPlanPreserved'])must(r&&r.ok&&r[key]===true,'AI follow-up test failed '+key+' '+JSON.stringify(r));
console.log('PASS VS AI v5.56 lobby title and Mage setup-to-Attack planning.');
