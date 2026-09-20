'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const ROOT=path.resolve(__dirname,'..');
const css=fs.readFileSync(path.join(ROOT,'css/app.css'),'utf8');
const tcss=fs.readFileSync(path.join(ROOT,'tutorial/css/app.css'),'utf8');
const app=fs.readFileSync(path.join(ROOT,'js/app.bundle.js'),'utf8');
const tapp=fs.readFileSync(path.join(ROOT,'tutorial/js/app.bundle.js'),'utf8');
const shared=fs.readFileSync(path.join(ROOT,'shared-ui/battlefield-ui.js'),'utf8');
for(const [name,text] of [['root css',css],['tutorial css',tcss]]){
  assert(/@media[^\{]*max-width/i.test(text),name+' missing mobile responsive media rules');
  assert(/@media[^\{]*min-width\s*:\s*761px/i.test(text),name+' missing desktop/tablet-landscape width tier');
}
for(const [name,text] of [['VS AI app',app],['Tutorial app',tapp]]){
  assert(text.includes('isTouchTabletViewport'),name+' missing tablet touch mode');
  assert(text.includes('isMobileViewport'),name+' missing mobile mode');
  assert(text.includes('orientationchange'),name+' missing responsive orientation handling');
  assert(text.includes('pointerType') && text.includes("'touch'"),name+' missing touch-specific input handling');
  assert(text.includes('v642DesktopPreviewShow'),name+' missing v6.42 desktop preview');
}
assert(shared.includes("version:'v2.52'") && shared.includes("visual_baseline:'VS AI v6.42'"));
console.log('PASS v6.42 responsive contract: desktop hover path coexists with retained phone/tablet portrait mobile and tablet-landscape touch handling.');
