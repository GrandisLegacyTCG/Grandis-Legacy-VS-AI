'use strict';

const fs=require('fs');
const path=require('path');
const ROOT=path.join(__dirname,'..','..');
const SOURCE_REL='data/starter60/generated_local_ai_deck_json/Grandis_Legacy_Starter_Deck_Presets_v1.2_LocalAI_PvP.json';
const OUT_DIR=path.join(ROOT,'data','decks');

function readSource(){return JSON.parse(fs.readFileSync(path.join(ROOT,SOURCE_REL),'utf8'));}
function writeJson(name,value){fs.mkdirSync(OUT_DIR,{recursive:true});fs.writeFileSync(path.join(OUT_DIR,name),`${JSON.stringify(value,null,2)}\n`);}
function titleSlot(slot){return slot.charAt(0)+slot.slice(1).toLowerCase();}
function bridgeDeck(deck,targetRuntime){
  const counts=Object.fromEntries((deck.main_deck||[]).map(row=>[row.card_id,Number(row.quantity||0)]).sort(([a],[b])=>a.localeCompare(b)));
  const starting=Object.entries(deck.default_formation||{}).map(([slot,card_id])=>({slot:titleSlot(slot),card_id}));
  const legacy=(deck.legacy_deck_expanded||[]).map(row=>row.card_id);
  const maxCopies=Math.max(0,...Object.values(counts));
  const total=Object.values(counts).reduce((sum,count)=>sum+count,0);
  const notes=[];
  if(total!==60) notes.push(`Main Deck total is ${total}, expected 60.`);
  if(maxCopies>2) notes.push(`Main Deck copy limit exceeded: ${maxCopies}, maximum 2.`);
  if(starting.length!==3) notes.push(`Starting Hero count is ${starting.length}, expected 3.`);
  if(legacy.length!==12) notes.push(`Legacy Deck count is ${legacy.length}, expected 12.`);
  if(!notes.length) notes.push('PASS: Starter60 v1.2 validated; 60 Main Deck cards, maximum 2 copies, 3 starting Heroes, and 12 Legacy Deck entries.');
  return {
    deck_id:deck.preset_id,
    deck_name:deck.display_name||deck.deck_name,
    target_runtime:targetRuntime,
    starting_hero_ids:starting,
    main_deck_card_counts:counts,
    main_deck_cards:(deck.main_deck||[]).map(row=>({card_id:row.card_id,card_name:row.card_name,copies:Number(row.quantity||0)})),
    legacy_deck_card_ids:legacy,
    source_reference:{source_package:'Grandis_Legacy_Starter60_CSV_Lock_v1.1',preset_file:SOURCE_REL},
    validation_notes:notes,
    import_policy:{ui_ai_intent_only:true,runtime_authoritative:true,local_ai_and_pvp_share_contracts:true,pvp_asset_policy:targetRuntime==='pvp-railway'?'webp_only':'not_applicable'}
  };
}
function build(targetRuntime,source){return (source.decks||[]).map(deck=>bridgeDeck(deck,targetRuntime));}
function run(){
  const source=readSource(),local=build('local-ai',source),pvp=build('pvp-railway',source);
  writeJson('starter-decks.v1.2.json',{version:'Starter60 v1.2 canonical runtime bridge',source_reference:SOURCE_REL,deck_count:local.length,adapters:{local_ai:local,pvp_railway:pvp}});
  const reports=local.map(deck=>({deck_id:deck.deck_id,deck_name:deck.deck_name,main_deck_total:Object.values(deck.main_deck_card_counts).reduce((s,n)=>s+n,0),max_main_deck_copies:Math.max(...Object.values(deck.main_deck_card_counts)),legacy_deck_total:deck.legacy_deck_card_ids.length,starting_hero_count:deck.starting_hero_ids.length,status:deck.validation_notes.every(note=>note.startsWith('PASS'))?'PASS':'REVIEW',validation_notes:deck.validation_notes}));
  writeJson('deck-validation-report.v1.2.json',{version:'v1.1',generated_from:SOURCE_REL,local_ai_deck_count:local.length,pvp_deck_count:pvp.length,expected_deck_count:15,all_decks_pass:reports.every(row=>row.status==='PASS'),required_shape:{main_deck_cards:60,max_copies_per_card:2,starting_heroes:3,legacy_deck_entries:12},deck_reports:reports});
  console.log(JSON.stringify({ok:true,starter_count:local.length,version:'v1.1'},null,2));
}
if(require.main===module)run();
module.exports={readSource,bridgeDeck,build,run};
