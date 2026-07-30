'use strict';
const TICK_PHASE=Object.freeze({DRAW_PHASE_START:'DRAW_PHASE_START',BATTLE_PHASE_START:'BATTLE_PHASE_START',END_PHASE:'END_PHASE',DRAW_EVENT:'DRAW_EVENT'});
const NON_PERSISTENT=new Set(['S1-ARC-018','S1-CLE-022','S1-ARC-024']);
let CARD_BY_ID={};
try{
  const fs=require('fs'),path=require('path');
  const dirs=[
    path.resolve(__dirname,'../../../generated/runtime-data'),
    path.resolve(__dirname,'../../data/season1'),
    path.resolve(__dirname,'../../../data/season1')
  ];
  const discovered=[];
  for(const dir of dirs){
    if(!fs.existsSync(dir))continue;
    for(const name of fs.readdirSync(dir).sort().reverse()){
      if(/^cards\.runtime\.(?:generated\.)?v?\d+\.\d+\.\d+\.json$/i.test(name))discovered.push(path.join(dir,name));
    }
  }
  const candidates=[process.env.GRANDIS_LEGACY_RUNTIME_DATA,...discovered].filter(Boolean);
  const file=candidates.find(candidate=>{try{return fs.existsSync(candidate);}catch(_error){return false;}});
  const db=file?require(file):{cards:[]};
  for(const card of db.cards||[]) if(card&&card.card_id) CARD_BY_ID[card.card_id]=card;
}catch(_error){ CARD_BY_ID={}; }
function normalizeClass(v){return String(v||'').trim().toLowerCase();}
function cardRecord(cardOrId,explicitRecord){
  if(cardOrId&&typeof cardOrId==='object') return cardOrId;
  if(explicitRecord&&typeof explicitRecord==='object') return explicitRecord;
  return CARD_BY_ID[String(cardOrId||'')]||{card_id:cardOrId};
}
function attachmentPolicy(card){if(!card||typeof card!=='object')return null;return card.attachment_policy||(card.lifecycle&&card.lifecycle.attachment_policy)||null;}
function policyForCard(cardOrId,sourceClassName,explicitRecord){
  const card=cardRecord(cardOrId,explicitRecord), id=card.card_id||cardOrId;
  if(NON_PERSISTENT.has(id))return null;
  const policy=attachmentPolicy(card);
  if(policy&&policy.persistent){
    if(id==='S1-CLE-009'&&sourceClassName!=null&&!['priest','saint'].includes(normalizeClass(sourceClassName)))return null;
    let count=policy.remaining_count;
    if(count==='dynamic'){
      if(id==='S1-CLE-018')count=normalizeClass(sourceClassName)==='priest'?2:1;
      else if(id==='S1-MAG-018')count=normalizeClass(sourceClassName)==='elementalist'?2:1;
      else count=1;
    }
    return {tick_phase:policy.tick_phase,remaining_count:Number(count||1),counter_mode:policy.counter_mode||'countdown',role:policy.role||'ongoing',host:policy.host||'source_hero',exact_once_zone_movement:policy.exact_once_zone_movement!==false};
  }
  return null;
}
function isPersistentAttachmentCard(cardOrId,sourceClassName,record){return Boolean(policyForCard(cardOrId,sourceClassName,record));}
function isExplicitlyNonPersistent(cardId){return NON_PERSISTENT.has(cardId);}
module.exports={TICK_PHASE,attachmentPolicy,policyForCard,isPersistentAttachmentCard,isExplicitlyNonPersistent};
