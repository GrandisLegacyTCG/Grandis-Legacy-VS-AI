/* Grandis Legacy Stable compatibility source-authority delta v0.1.
   This file intentionally does NOT modify the production GL Source Stack v1.8.1 package.
   It applies only the explicit authority corrections being tested for stable compatibility. */
(function(global){
  'use strict';
  var DELTA={
    version:'v0.1',
    baseline:'Grandis Legacy Source Stack v1.8.1',
    cards:{
      'S1-THF-027':{
        reason:'Printed Camouflage states that using this Skill does not Exhaust its Hero.',
        requirement:{source_exhausts_after_successful_use:false,usable_while_exhausted:true}
      },
      'S1-THF-H005':{
        reason:'Spell Blade is Lucien Voss Rank II; Legacy eligibility must continue to use his Rank I Base Class Thief.',
        identity:{rank_i_base_class:'Thief',base_class_family:'Thief'},
        top_level:{base_class_family:'Thief'}
      },
      'S1-ARC-H005':{
        reason:'Arbalest is Alden Sterling Rank II; Legacy eligibility must continue to use his Rank I Base Class Archer.',
        identity:{rank_i_base_class:'Archer',base_class_family:'Archer'},
        top_level:{base_class_family:'Archer'}
      },
      'S1-ARC-H006':{
        reason:'Grand Arbalest is Alden Sterling Rank III; Legacy eligibility must continue to use his Rank I Base Class Archer.',
        identity:{rank_i_base_class:'Archer',base_class_family:'Archer'},
        top_level:{base_class_family:'Archer'}
      }
    },
    draw_authority:{
      definition:'Actual Draw = a card taken from the top of Main Deck and placed into Hand.',
      counts_for_draw_this_turn:true,
      exclusions:['OPENING_HAND','SEARCH_OR_CHOOSE_TO_HAND','RETURN_FROM_DISCARD_TO_HAND'],
      arbalest_counter_cap:6
    }
  };
  function applyToCollection(collection){
    if(!Array.isArray(collection)) return;
    collection.forEach(function(card){
      if(!card||!card.card_id||!DELTA.cards[card.card_id]) return;
      var patch=DELTA.cards[card.card_id];
      card.requirement=Object.assign({},card.requirement||{},patch.requirement||{});
      if(patch.identity) card.identity=Object.assign({},card.identity||{},patch.identity);
      if(patch.top_level) Object.keys(patch.top_level).forEach(function(key){ card[key]=patch.top_level[key]; });
      if(card.canonical_legality){
        card.canonical_legality=Object.assign({},card.canonical_legality);
        card.canonical_legality.source_requirement=Object.assign({},card.canonical_legality.source_requirement||{},patch.requirement||{});
      }
      if(card.source_requirement) card.source_requirement=Object.assign({},card.source_requirement||{},patch.requirement||{});
      card.playtest_authority_delta=Object.assign({},card.playtest_authority_delta||{},{source_delta_version:DELTA.version,reason:patch.reason});
    });
  }
  applyToCollection(global.GRANDIS_LEGACY_RUNTIME_DATA&&global.GRANDIS_LEGACY_RUNTIME_DATA.cards);
  applyToCollection(global.GL_CARD_DEFINITIONS&&global.GL_CARD_DEFINITIONS.cards);
  var fams=global.GL_CARD_DEFINITIONS&&global.GL_CARD_DEFINITIONS.families||{};
  Object.keys(fams).forEach(function(key){applyToCollection(fams[key]&&fams[key].cards);});
  global.GL_PLAYTEST_SOURCE_DELTA=DELTA;
})(window);
