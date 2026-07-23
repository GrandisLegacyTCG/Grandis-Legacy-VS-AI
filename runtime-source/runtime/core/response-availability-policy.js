'use strict';

const POLICY_VERSION = 'v0.2';

const REASON_PRIORITY = Object.freeze([
  'class_mismatch',
  'lineage_or_rank_mismatch',
  'insufficient_mana',
  'incoming_not_blockable_or_dodgeable',
  'other'
]);

function responseAvailabilityRecord(input={}){
  const reasons=Array.isArray(input.reasons)?[...new Set(input.reasons.filter(Boolean))]:[];
  return {
    card_id:input.card_id||null,
    hand_index:Number.isInteger(input.hand_index)?input.hand_index:null,
    available:input.available===true,
    reasons:input.available===true?[]:reasons,
    reason:input.available===true?null:prioritizeUnavailableReason(reasons,input)
  };
}

function sortResponseAvailability(records=[]){
  return records.slice().sort((a,b)=>Number(b.available===true)-Number(a.available===true));
}

function englishReason(kind,input={}){
  if(kind==='class_mismatch') return 'This Hero’s class cannot use this card.';
  if(kind==='lineage_or_rank_mismatch') return 'This Hero’s lineage or rank cannot use this card.';
  if(kind==='insufficient_mana'){
    const required=Number(input.required_mana);
    const available=Number(input.available_mana);
    if(Number.isFinite(required)&&Number.isFinite(available)) return `Not enough Mana. Requires ${required}; ${available} available.`;
    return 'Not enough Mana.';
  }
  if(kind==='incoming_not_blockable_or_dodgeable') return 'This incoming attack cannot be Blocked or Dodged by this card.';
  return String(input.fallback_reason||'This response is not available in the current state.').replace(/\s+/g,' ').trim();
}

function inferReasonKind(reason=''){
  const text=String(reason);
  if(/\bclass\b.*cannot use|illegal source hero|class mismatch/i.test(text)) return 'class_mismatch';
  if(/lineage|rank\s*\d|requires rank|no matching active class/i.test(text)) return 'lineage_or_rank_mismatch';
  if(/not enough mana|needs?\s*\d+.*available|requires?\s*\d+.*available/i.test(text)) return 'insufficient_mana';
  if(/cannot be dodged|cannot be blocked|does not match the incoming|response condition|cannot protect the full multi-target/i.test(text)) return 'incoming_not_blockable_or_dodgeable';
  return 'other';
}

function prioritizeUnavailableReason(reasons=[],input={}){
  const list=[...new Set((Array.isArray(reasons)?reasons:[]).filter(Boolean))];
  const explicit=input.reason_flags||{};
  for(const kind of REASON_PRIORITY){
    if(kind==='other') break;
    if(explicit[kind]) return englishReason(kind,input);
    const match=list.find(reason=>inferReasonKind(reason)===kind);
    if(match){
      if(kind==='insufficient_mana'){
        const nums=String(match).match(/\d+/g)||[];
        return englishReason(kind,Object.assign({},input,{
          required_mana:Number.isFinite(Number(input.required_mana))?input.required_mana:nums[0],
          available_mana:Number.isFinite(Number(input.available_mana))?input.available_mana:nums[1]
        }));
      }
      return englishReason(kind,input);
    }
  }
  return englishReason('other',{fallback_reason:list[0]||input.fallback_reason});
}

module.exports={
  POLICY_VERSION,
  REASON_PRIORITY,
  responseAvailabilityRecord,
  sortResponseAvailability,
  inferReasonKind,
  prioritizeUnavailableReason,
  englishReason
};
