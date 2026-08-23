'use strict';
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function indexComponents(registry){
  if(!registry||!Array.isArray(registry.racial_traits)||!Array.isArray(registry.class_abilities)) throw new Error('Hero component registry missing');
  return {racial:Object.fromEntries(registry.racial_traits.map(x=>[x.racial_trait_id,x.definition])),classAbility:Object.fromEntries(registry.class_abilities.map(x=>[x.class_ability_id,x.definition]))};
}
function resolveHeroComponents(card,registry){
  if(!card||card.family!=='Hero') return clone(card);
  const refs=card.hero_components||card.canonical_execution&&card.canonical_execution.hero_components;
  if(!refs||!refs.racial_trait_ref) throw new Error('Hero component refs missing: '+(card.card_id||card.id||'<unknown>'));
  if(registry.registry_hash&&refs.component_registry_hash&&registry.registry_hash!==refs.component_registry_hash) throw new Error('Hero component registry hash mismatch');
  const idx=indexComponents(registry),out=clone(card),racial=idx.racial[refs.racial_trait_ref];
  if(!racial) throw new Error('Unknown racial trait ref '+refs.racial_trait_ref);
  const ca=refs.class_ability_ref?idx.classAbility[refs.class_ability_ref]:null;
  if(refs.class_ability_ref&&!ca) throw new Error('Unknown class ability ref '+refs.class_ability_ref);
  out.racial_ability=clone(racial);if(ca)out.class_ability=clone(ca);
  if(out.canonical_execution){out.canonical_execution.racial_ability=clone(racial);if(ca)out.canonical_execution.class_ability=clone(ca);}
  return out;
}
module.exports={indexComponents,resolveHeroComponents};
