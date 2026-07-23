'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.join(ROOT, 'FILE_MANIFEST_SHA256.csv');

function sha256(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function listFiles(dir, prefix = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(abs, rel));
    else if (entry.isFile() && rel !== 'FILE_MANIFEST_SHA256.csv') out.push(rel);
  }
  return out;
}

if (!fs.existsSync(MANIFEST)) throw new Error('FILE_MANIFEST_SHA256.csv is missing');
const lines = fs.readFileSync(MANIFEST, 'utf8').trim().split(/\r?\n/);
if (lines.shift() !== 'path,sha256,bytes') throw new Error('Unexpected manifest header');

const rows = new Map();
for (const line of lines) {
  const match = line.match(/^(.*),([0-9a-f]{64}),(\d+)$/);
  if (!match) throw new Error(`Malformed manifest row: ${line}`);
  const [, rel, hash, bytesRaw] = match;
  if (rows.has(rel)) throw new Error(`Duplicate manifest path: ${rel}`);
  rows.set(rel, { hash, bytes: Number(bytesRaw) });
}

const actualFiles = listFiles(ROOT);
const expectedFiles = [...rows.keys()].sort((a, b) => a.localeCompare(b));
if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
  const missing = actualFiles.filter((f) => !rows.has(f));
  const extra = expectedFiles.filter((f) => !actualFiles.includes(f));
  throw new Error(`Manifest file-set mismatch. Missing rows: ${missing.join(', ') || 'none'}; stale rows: ${extra.join(', ') || 'none'}`);
}

for (const rel of actualFiles) {
  const abs = path.join(ROOT, rel);
  const expected = rows.get(rel);
  const bytes = fs.statSync(abs).size;
  const hash = sha256(abs);
  if (bytes !== expected.bytes) throw new Error(`Size mismatch: ${rel}`);
  if (hash !== expected.hash) throw new Error(`SHA-256 mismatch: ${rel}`);
}

console.log(`Manifest verification: PASS (${actualFiles.length} files; manifest excludes itself by design)`);
