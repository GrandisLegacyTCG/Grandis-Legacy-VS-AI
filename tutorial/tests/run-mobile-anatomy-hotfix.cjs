const fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'..');
const guide=fs.readFileSync(path.join(ROOT,'js/tutorial-guide.js'),'utf8');
const index=fs.readFileSync(path.join(ROOT,'../index.html'),'utf8');
function must(v,msg){if(!v){console.error('FAIL:',msg);process.exit(1);}}
must(guide.includes('var mobileMaps={'),'mobile anatomy must own a separate geometry map');
must(guide.includes('var maps=isMobileTutorialViewport()?mobileMaps:desktopMaps;'),'mobile/desktop anatomy maps are not separated');
must(guide.includes("var anatomySelector=function(selector){return mobileAnatomy?null:selector;};"),'mobile must suppress readable-detail duplicate highlights');
must(guide.includes("selector:anatomySelector('#previewBody .readable-card-mana'),printedRegion:'mana'"),'Mana mobile printed-card targeting missing');
must(guide.includes("selector:anatomySelector('#previewBody .readable-card-art'),printedRegion:'lineage'"),'Lineage mobile printed-card targeting missing');
must(guide.includes("exp:[.927,.345,.073,.245]"),'mobile EXP region must use dedicated mobile coordinates');
must(index.includes('/Grandis-Legacy-VS-AI/tutorial/">TUTORIAL</a>'),'VS AI mobile menu Tutorial entry missing');
console.log('PASS: mobile tutorial anatomy visual hotfix + VS AI Tutorial menu entry');
