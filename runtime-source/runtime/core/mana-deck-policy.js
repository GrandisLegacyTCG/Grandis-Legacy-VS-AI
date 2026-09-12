'use strict';

const MANA_DECK_SIZE = 12;
const STARTING_MANA_CARDS = 3;
const STARTING_MANA_REGEN = 1;
const MAX_MANA_REGEN = 6;
const NORMAL_MANA_POOL_MAX = 12;
const MAX_CLASS_SHARDS = 3;
const PREFIX_CLASS = Object.freeze({ WAR: 'Warrior', MAG: 'Mage', ARC: 'Archer', CLE: 'Cleric', THF: 'Thief' });

function classFromCardCode(cardId) {
  const m = /^S1-([A-Z]{3})-/.exec(String(cardId || '').toUpperCase());
  return m ? (PREFIX_CLASS[m[1]] || null) : null;
}
function manaCard(ownerId, kind, className, serial) {
  return { mana_id: `${ownerId || 'PLAYER'}:${kind}:${className || 'GENERIC'}:${serial}`, owner_id: ownerId || '', kind, class_name: className || null };
}
function deriveUltimateClassNames(ultimateCardIds) {
  const out=[];
  for(const id of ultimateCardIds || []) {
    const cls=classFromCardCode(id);
    if(cls && !out.includes(cls)) out.push(cls);
    if(out.length>=MAX_CLASS_SHARDS) break;
  }
  return out;
}
function buildManaDeck(ultimateCardIds, ownerId) {
  const classes=deriveUltimateClassNames(ultimateCardIds);
  const deck=[];
  let serial=1;
  for(let i=0;i<MANA_DECK_SIZE-classes.length;i+=1) deck.push(manaCard(ownerId,'GENERIC',null,serial++));
  for(const cls of classes) deck.push(manaCard(ownerId,'CLASS',cls,serial++));
  return deck;
}
function deriveUltimateCardIdsFromDeck(mainDeckCounts, cardsById) {
  const ids=[];
  for(const id of Object.keys(mainDeckCounts || {})) {
    if(Number(mainDeckCounts[id] || 0)<=0) continue;
    const card=cardsById && cardsById[id];
    const isUltimate=Boolean(card && (card.is_ultimate === true || card.canonical_execution && card.canonical_execution.is_ultimate === true || card.canonical_legality && card.canonical_legality.source_requirement && card.canonical_legality.source_requirement.ultimate && card.canonical_legality.source_requirement.ultimate.is_ultimate === true));
    if(isUltimate) ids.push(id);
  }
  return ids;
}
function shuffle(list, randomFn) {
  const out=(list || []).slice(); const rand=randomFn || Math.random;
  for(let i=out.length-1;i>0;i-=1){const j=Math.floor(rand()*(i+1));const t=out[i];out[i]=out[j];out[j]=t;}
  return out;
}
function ensurePhysicalManaState(player) {
  if(!player) return player;
  if(!Array.isArray(player.mana_deck)) player.mana_deck=[];
  if(!Array.isArray(player.mana_pool_cards)) player.mana_pool_cards=[];
  player.mana_pool=player.mana_pool_cards.length;
  if(!Number.isFinite(Number(player.mana_regen))) player.mana_regen=STARTING_MANA_REGEN;
  return player;
}
function insertReturnedGeneric(deck, card) {
  let i=deck.length;
  while(i>0 && deck[i-1] && deck[i-1].kind==='CLASS') i-=1;
  deck.splice(i,0,card);
}
function returnManaToBottom(player, cards) {
  ensurePhysicalManaState(player);
  const generic=[],classes=[];
  for(const c of cards || []) (c && c.kind==='CLASS' ? classes : generic).push(c);
  for(const c of generic) insertReturnedGeneric(player.mana_deck,c);
  for(const c of classes) player.mana_deck.push(c);
  player.mana_pool=player.mana_pool_cards.length;
  return player;
}
function drawManaFromTop(player, count) {
  ensurePhysicalManaState(player); const moved=[];
  for(let i=0;i<Number(count || 0);i+=1){ if(!player.mana_deck.length) break; const c=player.mana_deck.shift(); player.mana_pool_cards.push(c); moved.push(c); }
  player.mana_pool=player.mana_pool_cards.length; return moved;
}
function matchingValue(card, skillClass) { return card && card.kind==='CLASS' && String(card.class_name||'').toLowerCase()===String(skillClass||'').toLowerCase() ? 2 : 1; }
function choosePayment(player, manaCost, options) {
  ensurePhysicalManaState(player); const cost=Math.max(0,Number(manaCost||0)); const opts=options||{};
  if(cost===0) return {ok:true,cards:[],value:0,overpay:0};
  const pool=player.mana_pool_cards || [];
  if(!pool.length) return {ok:false,cards:[],value:0,reason:'No Mana Cards in Mana Pool.'};
  const selected=[]; let value=0;
  if(opts.payment_kind==='SKILL') {
    const requested=new Set((opts.selected_class_shard_ids||[]).map(String));
    for(const c of pool) if(c.kind==='CLASS' && requested.has(String(c.mana_id))) {selected.push(c);value+=matchingValue(c,opts.skill_class);}
    for(const c of pool) { if(value>=cost) break; if(selected.includes(c)) continue; if(c.kind==='GENERIC'){selected.push(c);value+=1;} }
    for(const c of pool) { if(value>=cost) break; if(selected.includes(c)) continue; selected.push(c);value+=matchingValue(c,opts.skill_class); }
  } else {
    for(const c of pool) { if(value>=cost) break; if(c.kind==='GENERIC'){selected.push(c);value+=1;} }
    for(const c of pool) { if(value>=cost) break; if(selected.includes(c)) continue; selected.push(c);value+=1; }
  }
  return value>=cost ? {ok:true,cards:selected,value,overpay:value-cost} : {ok:false,cards:selected,value,reason:'Insufficient Mana value.'};
}
function spendMana(player, manaCost, options) {
  const choice=choosePayment(player,manaCost,options); if(!choice.ok) return choice;
  const ids=new Set(choice.cards.map(c=>c.mana_id)); player.mana_pool_cards=player.mana_pool_cards.filter(c=>!ids.has(c.mana_id));
  returnManaToBottom(player,choice.cards); return choice;
}
function blindOpponentManaCandidates(opponent) {
  ensurePhysicalManaState(opponent);
  return opponent.mana_pool_cards.map((c,index)=>({selection_index:index,card_back:true,hidden_identity:true}));
}
function removeOpponentManaBlind(opponent, selectedIndices) {
  ensurePhysicalManaState(opponent); const indices=[...new Set((selectedIndices||[]).map(Number).filter(Number.isInteger))].sort((a,b)=>b-a); const removed=[];
  for(const i of indices){if(i>=0&&i<opponent.mana_pool_cards.length) removed.push(opponent.mana_pool_cards.splice(i,1)[0]);}
  removed.reverse(); returnManaToBottom(opponent,removed); return removed;
}
function removeAndGainOwnMana(controller, opponent, selectedIndices) {
  const removed=removeOpponentManaBlind(opponent,selectedIndices); const gained=drawManaFromTop(controller,removed.length); return {removed,gained};
}
function matchingClassShardForUltimate(player, ultimateCardId) {
  ensurePhysicalManaState(player); const cls=classFromCardCode(ultimateCardId); return player.mana_pool_cards.find(c=>c.kind==='CLASS'&&c.class_name===cls)||null;
}
function payUltimateTributeClassShard(player, ultimateCardId) {
  const shard=matchingClassShardForUltimate(player,ultimateCardId); if(!shard) return {ok:false,reason:'Matching Class Shard is required.'};
  player.mana_pool_cards=player.mana_pool_cards.filter(c=>c.mana_id!==shard.mana_id); returnManaToBottom(player,[shard]); return {ok:true,card:shard,class_name:shard.class_name};
}
module.exports={MANA_DECK_SIZE,STARTING_MANA_CARDS,STARTING_MANA_REGEN,MAX_MANA_REGEN,NORMAL_MANA_POOL_MAX,MAX_CLASS_SHARDS,PREFIX_CLASS,classFromCardCode,deriveUltimateClassNames,deriveUltimateCardIdsFromDeck,buildManaDeck,shuffle,ensurePhysicalManaState,returnManaToBottom,drawManaFromTop,matchingValue,choosePayment,spendMana,blindOpponentManaCandidates,removeOpponentManaBlind,removeAndGainOwnMana,matchingClassShardForUltimate,payUltimateTributeClassShard};
