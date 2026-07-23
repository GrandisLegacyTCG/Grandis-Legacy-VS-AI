'use strict';

const POLICY_VERSION = 'v0.1';
function responseAvailabilityRecord(input={}){
  const reasons=Array.isArray(input.reasons)?[...new Set(input.reasons.filter(Boolean))]:[];
  return {card_id:input.card_id||null,hand_index:Number.isInteger(input.hand_index)?input.hand_index:null,available:input.available===true,reasons:input.available===true?[]:reasons};
}
function sortResponseAvailability(records=[]){return records.slice().sort((a,b)=>Number(b.available===true)-Number(a.available===true));}
module.exports={POLICY_VERSION,responseAvailabilityRecord,sortResponseAvailability};
