const fs=require('fs');
const js=fs.readFileSync('js/app.bundle.js','utf8');
const css=fs.readFileSync('css/app.css','utf8');
const checks=[
  ['inside-card clipping',/function battleVfxClip\(/.test(js)&&/gl-battle-vfx-clip\{[^}]*overflow:hidden/.test(css)],
  ['heal inside card',/function battleHealNode\(/.test(js)&&/node\.style\.width='46%'/.test(js)],
  ['dodge attack simultaneous',/var dodgeAttack=battleVfxNode\(attackSrc/.test(js)&&/glBattleDodgeCard/.test(css)],
  ['physical defense 1.5x attack inside card',/fresh,1\.5,isMagicDefense\?false:true/.test(js)&&/insideScale/.test(js)&&/glBattlePDefense/.test(css)],
  ['magical defense 1.5x attack outside card',/fresh,1\.5,isMagicDefense\?false:true/.test(js)&&/glBattleMDefense/.test(css)],
  ['damage shake',/has_damage:Number\(result&&result\.hp_damage/.test(js)&&/glBattleDamageShake/.test(css)]
];
const bad=checks.filter(x=>!x[1]);
if(bad.length){console.error('FAIL',bad.map(x=>x[0]).join(', '));process.exit(1);}
console.log('PASS local battle VFX current contract:',checks.map(x=>x[0]).join(' | '));
