'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const {loadLocalAI}=require('./vm-local-ai-harness.cjs');
const root=path.resolve(__dirname,'..');
for(const [appRoot,mode] of [[root,undefined],[path.join(root,'tutorial'),'TUTORIAL']]){
  const ctx=loadLocalAI(appRoot,mode);
  const fn=ctx.GL_V617_COVER_UP_REDIRECT_QA_SELF_TEST;
  assert.strictEqual(typeof fn,'function',`${appRoot}: Cover Up redirect QA self-test missing`);
  const r=fn();
  assert.ok(r&&r.ok,`${appRoot}: Cover Up redirect QA failed ${JSON.stringify(r)}`);
  for(const key of ['coverUpExhaustedResponse','manaAfterValidation','freshDefenseAfterRedirect','secondDefense','areaRejected','nonAdjacentRejected','sameAttackContinues'])
    assert.strictEqual(r[key],true,`${appRoot}: ${key}`);
  const app=fs.readFileSync(path.join(appRoot,'js/app.bundle.js'),'utf8');
  const css=fs.readFileSync(path.join(appRoot,'css/app.css'),'utf8');
  assert.ok(app.includes('glPendingAttackDirectionLayer')&&app.includes('pendingAttackDirectionShouldLoop'),'direction indicator runtime missing');
  assert.ok(css.includes('.gl-pending-attack-direction-layer')&&css.includes('glPendingAttackDirectionOnce'),'one-shot direction indicator CSS missing');
}
assert.strictEqual(require('../package.json').version,'6.28.0');
assert.strictEqual(require('../tutorial/package.json').version,'0.54.0');
console.log('PASS VS AI v6.23 / Tutorial v0.51 Cover Up redirect, post-validation Mana, fresh Defense, and one-shot direction indicator.');
