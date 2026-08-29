const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
for(const rel of ['css/app.css','tutorial/css/app.css']){
  const css=fs.readFileSync(path.join(root,rel),'utf8');
  if(/touch-action\s*:\s*pan-x\s*!important/i.test(css)) throw new Error(`${rel}: stale pan-x-only touch-action remains`);
  if(!/overflow-x\s*:\s*auto\s*!important/i.test(css)) throw new Error(`${rel}: horizontal Hand scrolling was lost`);
  if(!/touch-action\s*:\s*auto\s*!important/i.test(css)) throw new Error(`${rel}: native touch-action auto fail-safe missing`);
}
console.log('PASS: superseded v6.18/v0.46 mobile touch regression remains compatible with the v6.20/v0.48 native gesture fix.');
