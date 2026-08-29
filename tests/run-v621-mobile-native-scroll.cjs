const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');
function read(p){return fs.readFileSync(path.join(root,p),'utf8')}function ok(v,m){if(!v)throw new Error(m)}
for(const prefix of ['', 'tutorial/']){const css=read(prefix+'css/app.css');const js=read(prefix+'js/app.bundle.js');
  ok(css.includes('Grandis Legacy mobile native scroll contract — clean 2026-08-29 fix'),'canonical mobile scroll contract missing '+prefix);
  ok(css.includes('overflow-y:auto!important'),'mobile native vertical overflow missing '+prefix);
  ok(css.includes('touch-action:pan-x pan-y!important'),'Hand does not allow both native axes '+prefix);
  ok(css.includes('padding-bottom:calc(56px + env(safe-area-inset-bottom,0px))!important'),'mobile bottom scroll room missing '+prefix);
  ok(js.includes('var shouldLock=!mobileViewport&&animationBusy()&&GL_PAGE_SCROLL_LOCK_REQUESTED'),'animation page lock is not desktop-only '+prefix);
}
const rootJs=read('js/app.bundle.js');
ok(!/addEventListener\(['"]touchmove['"][\s\S]{0,500}?preventDefault/.test(rootJs),'VS AI still cancels native touchmove');
ok(JSON.parse(read('package.json')).version==='6.21.0','VS AI package version mismatch');
console.log('PASS VS AI v6.21 / Tutorial v0.49 clean native mobile scroll contract.');
