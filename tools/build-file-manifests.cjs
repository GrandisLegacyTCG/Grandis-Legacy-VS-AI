'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function listFiles(base, prefix = '') {
  const out = [];
  for (const entry of fs.readdirSync(base, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const abs = path.join(base, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(abs, rel));
    else if (entry.isFile() && rel !== 'FILE_MANIFEST_SHA256.csv') out.push(rel);
  }
  return out;
}

function writeManifest(base) {
  const rows = ['path,sha256,bytes'];
  for (const rel of listFiles(base)) {
    const abs = path.join(base, rel);
    rows.push(`${rel},${sha256(abs)},${fs.statSync(abs).size}`);
  }
  fs.writeFileSync(path.join(base, 'FILE_MANIFEST_SHA256.csv'), `${rows.join('\n')}\n`);
  return rows.length - 1;
}

const tutorialCount = writeManifest(path.join(root, 'tutorial'));
const rootCount = writeManifest(root);
console.log(`PASS: regenerated Tutorial (${tutorialCount}) and VS AI (${rootCount}) SHA-256 file manifests.`);
