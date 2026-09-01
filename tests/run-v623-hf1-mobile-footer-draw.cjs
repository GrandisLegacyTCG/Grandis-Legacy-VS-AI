
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');
for(const rel of ['css/app.css','tutorial/css/app.css']){const css=fs.readFileSync(path.join(root,rel),'utf8');assert(css.includes('height:max(2px,env(safe-area-inset-bottom,0px))'));assert(!css.includes('height:calc(64px + env(safe-area-inset-bottom,0px))'));assert(css.includes('position:sticky!important')&&css.includes('bottom:0!important'));}
for(const rel of ['js/app.bundle.js','tutorial/js/app.bundle.js']){const app=fs.readFileSync(path.join(root,rel),'utf8');assert(app.includes("e.reason==='MANDATORY_DRAW_PHASE'"));assert(app.includes('var visibleBottom=Math.max(0,phaseRect.top-10)'));assert(app.includes('window.scrollBy(0,overlap)'));}
assert(fs.readFileSync(path.join(root,'index.html'),'utf8').includes('gl-vs-ai-6.24-next-fixes'));
assert(fs.readFileSync(path.join(root,'tutorial/index.html'),'utf8').includes('gl-tutorial-0.52-next-fixes'));
assert.strictEqual(require('../package.json').version,'6.24.0');assert.strictEqual(require('../tutorial/package.json').version,'0.52.0');
console.log('PASS VS AI v6.24 / Tutorial v0.52 responsive footer/draw regression');
