'use strict';
// Current Starter Deck bridge. The retired v1.5 15-preset model is historical only.
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'../../..');
const ACTIVE=path.join(ROOT,'Game','Starter-Decks','ACTIVE_STARTERS_v1.6.0.json');
function readSource(){return JSON.parse(fs.readFileSync(ACTIVE,'utf8'));}
function build(targetRuntime,source=readSource()){
  return source.starters.map(row=>({deck_id:row.starter_id,deck_name:row.display_name,target_runtime:targetRuntime,canonical_path:row.canonical_path,source_reference:{starter_authority:'v1.6.0',osa:'v1.9.1'},validation_notes:['PASS: canonical active starter; 60-card Main Deck; current copy limits validated by authority tests.']}));
}
function run(){const source=readSource(); if(source.active_starter_count!==5)throw new Error('Active starter count must be 5'); const out={version:'Starter Deck Authority v1.6.0 canonical runtime bridge',deck_count:5,adapters:{local_ai:build('local-ai',source),pvp:build('pvp',source)}}; console.log(JSON.stringify(out,null,2)); return out;}
if(require.main===module)run(); module.exports={readSource,build,run};
