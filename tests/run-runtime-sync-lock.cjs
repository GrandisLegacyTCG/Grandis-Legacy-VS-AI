'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert');
const root=path.resolve(__dirname,'..'),lock=JSON.parse(fs.readFileSync(path.join(root,'sync/runtime-sync-lock.v2.53.json'),'utf8'));
const sha=rel=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex');
const H='eb89ea56f2351f093fffbd7f7e47628f1cf0cd2b793c6efdfb82c9c9e798b868',HH='487aa2620b5be99480a81d462082f1a35ee637ec2cc38ebf42b1bcf1103d06c9';
assert.strictEqual(lock.canonical_registry_hash,H);assert.strictEqual(lock.hero_component_registry_hash,HH);assert.strictEqual(lock.one_source_authority,'v1.7.5');assert.strictEqual(lock.application_runtime_sync,'v2.53');assert.strictEqual(lock.runtime_foundation,'v1.91');assert.strictEqual(lock.runtime_core,'v0.59');assert.strictEqual(lock.local_ai,'v6.31');assert.strictEqual(lock.tutorial,'v0.57');assert.strictEqual(lock.pvp_reference,'v3.39');assert.strictEqual(lock.manual_reposition_limit,'v1.0');
for(const [rel,key] of [['js/app.bundle.js','shared_gameplay_sha256'],['js/runtime-authority.js','runtime_authority_sha256'],['runtime-source/runtime/browser/runtime-authority.browser.js','runtime_source_browser_sha256'],['js/static-data.js','static_data_sha256'],['css/app.css','shared_ui_css_sha256'],['js/mobile-app-nav.js','mobile_app_nav_sha256']])assert.strictEqual(sha(rel),lock[key],rel);
assert.strictEqual(lock.exp_stack_assets.master.sha256,sha('assets/exp/Stack 100-200EXP.png'));assert.deepStrictEqual(lock.exp_stack_assets.master.sprite_halves,{left:100,right:200});
console.log('PASS Application Runtime Sync v2.53 VS AI v6.31 / Tutorial v0.57 source/deploy lock');
