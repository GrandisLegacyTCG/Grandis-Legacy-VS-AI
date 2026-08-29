'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { loadLocalAI } = require('./vm-local-ai-harness.cjs');

const root = path.resolve(__dirname, '..');
const hash = '8ee6bb98c22dc66ee72f49fa88b4f7fd05fce1c96a2932e28a1a8667c9d3932e';
const data = require(path.join(root, 'data/season1/cards.runtime.v0.14.1.json'));
const byId = Object.fromEntries(data.cards.map(card => [card.card_id, card]));

assert.strictEqual(data.canonical_registry_hash, hash);
assert.strictEqual(data.cards.length, 198);
assert.deepStrictEqual(byId['S1-THF-015'].attack.damage_by_class, { Rogue: 20, Renegade: 40 });
assert.deepStrictEqual(
  ['S1-WAR-010', 'S1-THF-015', 'S1-MAG-007'].map(id => byId[id].conditional_follow_ups.length),
  [1, 1, 1]
);

for (const appRoot of [root, path.join(root, 'tutorial')]) {
  const bundle = fs.readFileSync(path.join(appRoot, 'js/app.bundle.js'), 'utf8');
  const context = loadLocalAI(appRoot);
  const result = context.GL_CONDITIONAL_FOLLOW_UP_V611_QA_SELF_TEST();
  assert.ok(result && result.ok, `${path.basename(appRoot)} Conditional Follow-up QA failed: ${JSON.stringify(result)}`);
  assert.strictEqual(result.secondResponseWindow, false);
  assert.strictEqual(result.pendingStatesCreated, 0);
  assert.strictEqual(result.primaryBlockCarriedOver, false);
  assert.ok(bundle.includes('function resolveConditionalFollowUpsAfterPrimary'));
  assert.ok(bundle.includes('GL_ACTIVE_AUDIO_POOL=new Set()'), `${appRoot}: retained active-audio pool missing`);
  assert.ok(bundle.includes("a.addEventListener('ended',release,{once:true})"), `${appRoot}: ended cleanup missing`);
  assert.ok(bundle.includes("a.addEventListener('error',release,{once:true})"), `${appRoot}: error cleanup missing`);
  assert.ok(bundle.includes('GL_ACTIVE_AUDIO_POOL.delete(a)'), `${appRoot}: active-audio release missing`);
  for (const stale of ['conditional_bonus_before_defense', 'dodgeResidualDamage', 'conditionalAttackBonus', 'needs approval']) {
    assert.ok(!bundle.includes(stale), `${appRoot}: stale ${stale} executable branch remains`);
  }
}

const vsBundle = fs.readFileSync(path.join(root, 'js/app.bundle.js'), 'utf8');
const tutorialBundle = fs.readFileSync(path.join(root, 'tutorial/js/app.bundle.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/app.css'), 'utf8');
assert.ok(vsBundle.includes("window.addEventListener('beforeunload'"), 'VS AI beforeunload guard missing');
assert.ok(vsBundle.includes("document.addEventListener('touchmove'"), 'VS AI known-good pull-to-refresh touch guard missing');
assert.ok(vsBundle.includes('scrollTop<=0&&Number(touch.clientY)>GL_VS_PULL_TOUCH_START_Y+4'), 'VS AI pull-to-refresh guard must only cancel downward pull at page top');
assert.ok(vsBundle.includes('isActiveNormalVsMatch'), 'VS AI active-match lifecycle gate missing');
assert.ok(css.includes('overscroll-behavior-y:contain'), 'VS AI overscroll CSS guard missing');
assert.ok(!/gl-active-vs-match[^}]*overflow\s*:\s*hidden/i.test(css), 'VS AI guard disables normal vertical scroll');
assert.ok(!tutorialBundle.includes("window.addEventListener('beforeunload'"), 'Tutorial must not install active-match unload warning');
assert.ok(!tutorialBundle.includes('GL_VS_ACTIVE_MATCH_NAV_GUARD'), 'Tutorial must preserve current navigation lifecycle');

assert.strictEqual(require('../package.json').version, '6.20.0');
assert.strictEqual(require('../tutorial/package.json').version, '0.48.0');
console.log('PASS VS AI v6.11 + Tutorial v0.42: generic follow-ups, retained audio lifecycle, VS-only unload/overscroll protection, and pending-state safety.');
