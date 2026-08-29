const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
for(const rel of ['css/app.css','tutorial/css/app.css']){
  const css=fs.readFileSync(path.join(root,rel),'utf8');
  assert(css.includes('Mobile one-finger page-scroll fail-safe'),`${rel}: fail-safe block missing`);
  assert(/html\.gl-animation-scroll-locked,body\.gl-animation-scroll-locked\{[\s\S]{0,240}overflow-y:auto!important/.test(css),`${rel}: mobile stale animation lock is not overridden`);
  assert(/hand-area--player \.handPanel[\s\S]{0,220}touch-action:auto!important/.test(css),`${rel}: Hand does not use native touch arbitration`);
}
for(const rel of ['js/app.bundle.js','tutorial/js/app.bundle.js']){
  const app=fs.readFileSync(path.join(root,rel),'utf8');
  assert(app.includes('var shouldLock=(!isMobileViewport())&&animationBusy()&&GL_PAGE_SCROLL_LOCK_REQUESTED;'),`${rel}: mobile animation page lock still possible`);
}
const main=fs.readFileSync(path.join(root,'js/app.bundle.js'),'utf8');
assert(!/document\.addEventListener\('touchmove',[^\n]*preventDefault/.test(main),'VS AI still has a non-passive document touchmove cancellation path');
assert(fs.readFileSync(path.join(root,'index.html'),'utf8').includes('gl-vs-ai-6.20'),'VS AI cache-bust revision missing');
assert(fs.readFileSync(path.join(root,'tutorial/index.html'),'utf8').includes('gl-tutorial-0.48'),'Tutorial cache-bust revision missing');
console.log('PASS VS AI v6.20 / Tutorial v0.48 mobile one-finger scroll fail-safe and native touch routing.');
