const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
for(const rel of ['css/app.css','tutorial/css/app.css']){const css=fs.readFileSync(path.join(root,rel),'utf8');assert(css.includes('overscroll-behavior-x:contain!important;touch-action:pan-x!important'),rel+' must retain known-good Hand pan-x');assert(!css.includes('Mobile one-finger page-scroll fail-safe'),rel+' must not retain superseded fail-safe');assert(css.includes('html,body{min-width:0!important;width:100%!important;min-height:100%!important;overflow-x:hidden!important;overflow-y:auto!important}'),rel+' mobile document scroll contract missing');}
for(const rel of ['js/app.bundle.js','tutorial/js/app.bundle.js']){const js=fs.readFileSync(path.join(root,rel),'utf8');assert(js.includes('var shouldLock=animationBusy()&&GL_PAGE_SCROLL_LOCK_REQUESTED;'),rel+' animation lock must match known-good baseline');}
assert(fs.readFileSync(path.join(root,'index.html'),'utf8').includes('gl-vs-ai-6.20'),'VS cache key missing');
assert(fs.readFileSync(path.join(root,'tutorial/index.html'),'utf8').includes('gl-tutorial-0.48'),'Tutorial cache key missing');
console.log('PASS VS AI v6.20 / Tutorial v0.48 known-good mobile touch/scroll rollback contract.');
