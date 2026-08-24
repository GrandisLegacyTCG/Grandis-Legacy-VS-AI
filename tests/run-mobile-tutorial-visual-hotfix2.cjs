const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const guide=fs.readFileSync(path.join(root,'tutorial/js/tutorial-guide.js'),'utf8');
const rootIndex=fs.readFileSync(path.join(root,'index.html'),'utf8');
const tutorialIndex=fs.readFileSync(path.join(root,'tutorial/index.html'),'utf8');
function ok(v,msg){if(!v){console.error('FAIL:',msg);process.exitCode=1;}else console.log('PASS:',msg);}
ok(guide.includes('var desktopMaps={')&&guide.includes('var mobileMaps={'),'desktop/mobile anatomy geometry is explicitly separate');
ok(guide.includes("var anatomyHighlight=(isMobileTutorialViewport()&&step.printedRegion)?null:step.selector"),'mobile printed anatomy suppresses desktop/readable selector highlight');
ok(guide.includes("if(mobile&&entry.region==='exp')fromRight=false"),'mobile EXP arrow approaches from inside the card/viewport');
ok(guide.includes("entry.region==='mana'"),'mobile Mana arrow has mobile-specific direction');
ok(rootIndex.includes('/Grandis-Legacy-VS-AI/tutorial/">TUTORIAL</a>'),'VS AI mobile menu includes Tutorial');
ok(tutorialIndex.includes('gl-tutorial-0.43-mobile-hf2'),'tutorial changed assets are cache-busted');
if(process.exitCode)process.exit(process.exitCode);
