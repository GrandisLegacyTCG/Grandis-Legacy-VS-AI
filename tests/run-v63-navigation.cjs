
'use strict';
const fs=require('fs'),assert=require('assert');
const app=fs.readFileSync('js/app.bundle.js','utf8');
assert.ok(app.includes('https://grandislegacytcg.github.io/Grandis-Legacy-Deck-Builder/style-1/'),'VS AI Deck Builder must open Style 1');
assert.ok(!app.includes('href="https://grandislegacytcg.github.io/Grandis-Legacy-Deck-Builder/"'),'legacy Deck Builder root link remains');
console.log('PASS VS AI v6.3 Deck Builder Style 1 navigation');
