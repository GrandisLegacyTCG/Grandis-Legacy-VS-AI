'use strict';

const POLICY_VERSION = 'v0.18';
const LEGACY_ALLOWED_PHASES = Object.freeze(['Deploy Phase', 'Reform Phase']);
const LEGACY_EFFECTS = Object.freeze({
  'S1-ARC-L001': {class:'Archer',cost:1,type:'RETURN_DISCARD_TO_DECK',count:1,filter:{family:'Skill',excludeUltimate:true},shuffle:true},
  'S1-ARC-L002': {class:'Archer',cost:2,type:'SEARCH_DECK_TO_HAND',count:1,filter:{anyCard:true},shuffle:true,revealToOpponentPlayed:true},
  'S1-CLE-L001': {class:'Cleric',cost:1,type:'SEARCH_DECK_TO_HAND',count:1,filter:{profiles:['Physical Attack','Magical Attack'],excludeUltimate:true},shuffle:true,revealToOpponentPlayed:true},
  'S1-CLE-L002': {class:'Cleric',cost:2,type:'DRAW_CARDS',count:3,drawAsManyAsPossible:true,revealDrawnCards:false,deckOutLoss:false},
  'S1-MAG-L001': {class:'Mage',cost:1,type:'RETURN_DISCARD_TO_DECK',count:1,filter:{family:'Skill',excludeUltimate:true},shuffle:true},
  'S1-MAG-L002': {class:'Mage',cost:2,type:'RETURN_DISCARD_TO_HAND',count:1,filter:{family:'Skill',excludeUltimate:true},revealToOpponentPlayed:true},
  'S1-THF-L001': {class:'Thief',cost:1,type:'RETURN_DISCARD_TO_DECK',count:1,filter:{family:'Item'},shuffle:true},
  'S1-THF-L002': {class:'Thief',cost:2,type:'GAIN_RACIAL_TOKEN',count:1,tokenCap:2},
  'S1-WAR-L001': {class:'Warrior',cost:1,type:'DRAW_CARDS',count:1,drawAsManyAsPossible:true,revealDrawnCards:false,deckOutLoss:false},
  'S1-WAR-L002': {class:'Warrior',cost:2,type:'RETURN_DISCARD_TO_DECK',count:2,filter:{family:'Skill',excludeUltimate:true},shuffle:true}
});
const RUNTIME_RULE_LOCK = Object.freeze({
  legacyAllowedPhases: LEGACY_ALLOWED_PHASES,
  legacyOncePerInstancePerTurn: true,
  legacyPreCostDiscardSnapshot: true,
  legacyCostCardsExcludedFromSameEffect: true,
  legacyChoiceAuthority: Object.freeze({
    explicitCostSelection:true,
    confirmCostBeforePayment:true,
    explicitEffectSelection:true,
    confirmEffectBeforeResolution:true,
    singleCandidateStillRequiresSelection:true,
    exactCandidateCountStillRequiresSelection:true,
    automaticSelectionForbidden:true,
    mandatoryEffectLegalityCheckedBeforeCost:true
  }),
  legacyRevealRule: Object.freeze({
    selectedDeckOrDiscardCardToHand:true,
    displayZone:'OPPONENT_PLAYED',
    transient:true,
    handBecomesPrivateAfterReveal:true,
    pureDrawNotRevealed:true
  }),
  effectDrawRule: Object.freeze({drawAsManyAsPossible:true,deckOutLossOnlyOnMandatoryDrawPhaseDraw:true}),
  racialTokenSpendLimit: {count:1, scope:'player', period:'global_turn', notPerHero:true},
  tcgChoiceAuthority: Object.freeze({discardReturnRemoveSearchAndNegativeStatusRequireExplicitSelection:true,singleOptionStillRequiresSelection:true}),
  hiddenInformationShuffle: {deck:true, opponentHandRandomize:true, unlessCardExplicitlyOverrides:true},
  invisibilityCloak: {turns:2, cleanup:'start_of_controller_second_turn_draw_phase'},
  dualArrow: {targetCount:2, individualSelection:true, targetPackage:false},
  escapeArrow: {selectOtherHandCard:true, autoFirstCardForbidden:true, responseCardToDiscard:true},
  intercept: {canCounterPendingEventResponse:true, example:'Tactical Adaptation'}
});
function legacyEffect(cardId){ return LEGACY_EFFECTS[cardId] || null; }
function legacyRequiresEffectSelection(cardId){
  const effect=legacyEffect(cardId);
  return !!effect && ['RETURN_DISCARD_TO_DECK','RETURN_DISCARD_TO_HAND','SEARCH_DECK_TO_HAND'].includes(effect.type);
}
function legacyRevealsSelectedCardToOpponent(cardId){
  const effect=legacyEffect(cardId);
  return !!effect && effect.revealToOpponentPlayed===true;
}
module.exports={POLICY_VERSION,LEGACY_ALLOWED_PHASES,LEGACY_EFFECTS,RUNTIME_RULE_LOCK,legacyEffect,legacyRequiresEffectSelection,legacyRevealsSelectedCardToOpponent};
