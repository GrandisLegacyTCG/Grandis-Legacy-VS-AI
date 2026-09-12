'use strict';
const TRIPLE_SHOT_ID='S1-ARC-013';
const BIND_IDS=Object.freeze(['S1-ARC-002','S1-ARC-007']);
function legalBindChoices(hand, cardResolver, sourceHero, legalityFn){const out=[];for(const id of BIND_IDS){if(!(hand||[]).includes(id))continue;const card=cardResolver?cardResolver(id):null;if(!card)continue;if(legalityFn && legalityFn(card,sourceHero)===false)continue;out.push(id);}return out;}
function canPlayTripleShot(hand, cardResolver, sourceHero, legalityFn){const choices=legalBindChoices(hand,cardResolver,sourceHero,legalityFn);return{can:choices.length>0,choices,reason:choices.length?'':'Triple Shot requires a legal Poison Arrow or Burning Arrow in Hand.'};}
function createBinding(chosenCardId){if(!BIND_IDS.includes(chosenCardId))throw new Error('Triple Shot requires Poison Arrow or Burning Arrow bind choice.');return{source_card_id:TRIPLE_SHOT_ID,bound_card_id:chosenCardId,area_attack:true,expires:'END_PHASE',no_target_picker:true};}
function applyBindingToAttack(card,binding){if(!card||!binding||card.card_id!==binding.bound_card_id)return card;return{...card,attackLayer:'Area Attack',areaAttack:true,requiresManualTarget:false,target_required:false,triple_shot_area:true};}
module.exports={TRIPLE_SHOT_ID,BIND_IDS,legalBindChoices,canPlayTripleShot,createBinding,applyBindingToAttack};
