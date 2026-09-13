'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const guide=read('tutorial/js/tutorial-guide.js'),tutorialApp=read('tutorial/js/app.bundle.js'),rootApp=read('js/app.bundle.js');
for(const term of ['Opening Hand + Starting Shards','3 Starting Shards','Shard Deck always contains <b>12 Shards</b>','Mana Shard and Class Shard','matching Class Shard','Mana Regen starts at 1','each payment returns as one <b>batch</b>']) assert.ok(guide.includes(term),`tutorial missing: ${term}`);
assert.ok(guide.includes('Ultimate Tribute Requirement'),'dedicated Ultimate Tribute requirement lesson missing');
assert.ok(guide.includes('requires <b>1 matching Class Shard</b>')||guide.includes('require <b>1 matching Class Shard</b>'),'Ultimate Tribute Class Shard requirement missing');
assert.ok(guide.includes('<b>200 EXP</b>')&&guide.includes('<b>Bound Hero</b>'),'Ultimate Tribute EXP/Bound Hero teaching missing');
assert.ok(guide.includes('<b>Shard Pool</b>'),'Ultimate Tribute lesson must identify the Shard Pool');
for(const rel of ['index.html','js/app.bundle.js','js/static-data.js','tutorial/index.html','tutorial/js/app.bundle.js','tutorial/js/static-data.js','tutorial/js/tutorial-guide.js']) assert.ok(!read(rel).includes('Mana Pool'),`${rel}: obsolete Mana Pool terminology remains`);
assert.equal(require('../package.json').version,'6.41.0');
assert.equal(require('../tutorial/package.json').version,'0.67.0');
assert.ok(tutorialApp.includes('isRuntimePresentationBusy:function()'),'Tutorial bridge runtime-presentation gate missing');
assert.ok(guide.includes('openingShardTypesPending=true'),'Opening Shard lesson must defer until runtime presentation settles');
assert.ok(guide.includes('runtimePresentationBusy(state)'),'Tutorial must gate lessons on runtime presentation state');
assert.ok(guide.includes('releaseInitialDrawLesson'),'Draw lesson must release automatic Draw-to-Deploy flow');
assert.ok(!guide.includes("queuePhaseAdvance('Draw')"),'Tutorial must not ask for Next Phase during Draw');
for(const app of [rootApp,tutorialApp]){
  assert.ok(app.includes("if(physical==='tablet')return isPortraitViewport()?'mobile':'tablet'"),'tablet orientation contract missing');
  assert.ok(app.includes('touch-tablet-legality'),'tablet legal-action hint markup missing');
  assert.ok(app.includes('glTabletHandActions'),'tablet vertical action portal missing');
}
console.log('PASS VS AI v6.41 / Tutorial v0.67 responsive tablet and Ultimate Tribute teaching contract.');
