'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const {loadLocalAI}=require('./vm-local-ai-harness.cjs');
const root=path.resolve(__dirname,'..');
const expected={
  'S1-MAG-004':60,'S1-WAR-003':50,'S1-CLE-011':60,'S1-CLE-022':30,'S1-ITM-007':30,'S1-MAG-012':70
};
const data=require(path.join(root,'data/season1/cards.runtime.v0.14.2.json'));
const byId=Object.fromEntries(data.cards.map(c=>[c.card_id,c]));
for(const [id,amount] of Object.entries(expected)){
  const eff=(byId[id].effects||byId[id].effect||[]).find(e=>e.kind==='block_damage');
  assert.ok(eff,`${id} missing block authority`); assert.strictEqual(eff.amount,amount,`${id} canonical block`);
}
assert.deepStrictEqual((byId['S1-ARC-012'].effects||[]).find(e=>e.kind==='block_damage').amount_by_class,{Archer:50,Marksman:60});
assert.deepStrictEqual((byId['S1-THF-021'].effects||[]).find(e=>e.kind==='block_damage').amount_by_class,{Thief:70,'Spell Blade':80,'Arcane Duelist':80});
assert.deepStrictEqual((byId['S1-WAR-012'].effects||[]).find(e=>e.kind==='block_damage').amount_by_class,{Warrior:50,Gladiator:50});
assert.deepStrictEqual((byId['S1-WAR-022'].effects||[]).find(e=>e.kind==='block_damage').amount_by_class,{Warrior:60,Paladin:60});
for(const appRoot of [root,path.join(root,'tutorial')]){
  const ctx=loadLocalAI(appRoot,path.basename(appRoot)==='tutorial'?'TUTORIAL':undefined);
  const fn=ctx.GL_V615_CANONICAL_DEFENSE_QA_SELF_TEST;
  assert.strictEqual(typeof fn,'function',`${appRoot}: v6.15 canonical Defense QA missing`);
  const r=fn(); assert.ok(r&&r.ok,`${appRoot}: canonical Defense QA failed ${JSON.stringify(r)}`);
  assert.strictEqual(r.checks,17); assert.strictEqual(r.noNumericBlockOverrides,true); assert.strictEqual(r.manaShieldResolution60,true);
  const bundle=fs.readFileSync(path.join(appRoot,'js/app.bundle.js'),'utf8');
  for(const stale of [
    /S1-MAG-004[^\n]{0,160}amount\s*:\s*40/,
    /S1-WAR-003[^\n]{0,160}amount\s*:\s*30/,
    /S1-ARC-012[^\n]{0,220}amount\s*:\s*(30|40)/,
    /S1-THF-021[^\n]{0,220}amount\s*:\s*(50|60)/
  ]) assert.ok(!stale.test(bundle),`${appRoot}: stale numeric Defense override pattern remains`);
}
assert.strictEqual(require('../package.json').version,'6.23.0');
assert.strictEqual(require('../tutorial/package.json').version,'0.51.0');
console.log('PASS VS AI v6.23 / Tutorial v0.51 canonical Defense authority: 17 executable rows, Mana Shield Block 60, no numeric app overrides.');
