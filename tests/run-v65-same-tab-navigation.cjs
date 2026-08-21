'use strict';
const fs=require('fs'),assert=require('assert');
const app=fs.readFileSync('js/app.bundle.js','utf8');
assert.ok(app.includes('Grandis Legacy VS AI v6.5'),'VS AI v6.5 marker missing');
assert.ok(app.includes('href="https://grandislegacytcg.github.io/Grandis-Legacy-Deck-Builder/style-1/"'),'Deck Builder Style 1 route missing');
assert.ok(app.includes('href="https://grandislegacytcg.github.io/pvp/"'),'Public PvP route missing');
assert.ok(!/aiLobbyDeckBuilderButton[^>]*target=["']_blank["']/.test(app),'Deck Builder still opens a new tab');
assert.ok(!/aiLobbyPvpButton[^>]*target=["']_blank["']/.test(app),'PvP still opens a new tab');
console.log('PASS VS AI v6.5 same-tab public navigation');
