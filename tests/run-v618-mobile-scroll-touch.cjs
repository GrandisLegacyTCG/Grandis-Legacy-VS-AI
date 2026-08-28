const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const files=['css/app.css','tutorial/css/app.css'];
for(const rel of files){
  const css=fs.readFileSync(path.join(root,rel),'utf8');
  if(/touch-action\s*:\s*pan-x\s*!important/i.test(css)) throw new Error(`${rel}: stale pan-x-only touch-action remains`);
  const dual=(css.match(/touch-action\s*:\s*pan-x\s+pan-y\s*!important/gi)||[]).length;
  if(dual<2) throw new Error(`${rel}: expected mobile Hand + Hand-card pan-x pan-y rules, found ${dual}`);
  if(!/overflow-x\s*:\s*auto\s*!important/i.test(css)) throw new Error(`${rel}: horizontal Hand scrolling was lost`);
  if(!/overscroll-behavior-x\s*:\s*contain\s*!important/i.test(css)) throw new Error(`${rel}: horizontal overscroll containment was lost`);
}
console.log('PASS: VS AI v6.18 / Tutorial v0.46 mobile Hand allows vertical page scrolling while preserving horizontal Hand swipe.');
