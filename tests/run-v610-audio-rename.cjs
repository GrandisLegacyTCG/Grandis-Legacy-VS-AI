'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const expected = {
  'Coin Flip.mp3': 'b4842f9a3f2d25004223313f5473bef74afd79915b6af9bdb35c70f6df8c2b50',
  'Card Sound.mp3': '1c04e41918b392a643c22d6c02ef34eeab0341c70d46b7d517078725b79d8ee4'
};
const oldNames = [
  'freesound_community-coin-flip-37787',
  'freesound_community-flipcard-91468'
];
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

for (const base of ['.', 'tutorial']) {
  const bundle = fs.readFileSync(path.join(root, base, 'js/app.bundle.js'), 'utf8');
  for (const [name, expectedHash] of Object.entries(expected)) {
    const file = path.join(root, base, 'assets/audio', name);
    assert.ok(fs.existsSync(file), `${base}: ${name} is missing.`);
    assert.strictEqual(sha(file), expectedHash, `${base}: ${name} audio bytes changed.`);
    assert.ok(bundle.includes(`assets/audio/${name}`), `${base}: ${name} executable route is missing.`);
    const encoded = new URL(`assets/audio/${name}`, 'https://example.invalid/').pathname;
    assert.ok(encoded.includes('%20'), `${base}: filename-with-spaces URL was not encoded safely.`);
  }
  for (const old of oldNames) {
    assert.ok(!bundle.includes(old), `${base}: stale executable audio reference ${old}.`);
    assert.ok(!fs.readdirSync(path.join(root, base, 'assets/audio')).some(name => name.includes(old)), `${base}: stale physical audio file ${old}.`);
  }
}

assert.strictEqual(require('../package.json').version, '6.14.0');
assert.strictEqual(require('../tutorial/package.json').version, '0.42.0');
console.log('PASS VS AI v6.11 + Tutorial v0.42 audio rename: exact bytes, safe space-bearing URLs, and zero stale executable references.');
