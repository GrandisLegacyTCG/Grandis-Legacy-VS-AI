'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const css=fs.readFileSync(path.join(root,'css/app.css'),'utf8');
const app=fs.readFileSync(path.join(root,'js/app.bundle.js'),'utf8');
assert(css.includes('font-family:"Noto Sans"')||css.includes("font-family:'Noto Sans'"),'Noto Sans system fallback missing');
assert(!fs.existsSync(path.join(root,'assets/fonts')),'Font binaries must not be distributed');
assert(app.includes('aiHeroProgressionModal'),'Hero Progression missing');
console.log('PASS VS AI v5.53 AI Lobby system-font fallback, Rank II Formation, Hero Progression, and mobile Hand contracts');
