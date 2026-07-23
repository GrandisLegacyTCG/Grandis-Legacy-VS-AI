(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.GrandisLegacyDeckImportCompat=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clean=v=>v==null?'':String(v).trim();
  const norm=v=>clean(v).toUpperCase().replace(/\s+/g,'');
  const arr=v=>Array.isArray(v)?v:[];
  const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:null;
  const pick=(o,keys)=>{for(const k of keys)if(o&&o[k]!=null)return o[k];return undefined;};
  const toQty=v=>{const n=Number(v);return Number.isFinite(n)&&n>0?Math.floor(n):1;};
  function unwrap(input){
    let d=input;
    for(let i=0;i<3;i++){
      if(!obj(d))break;
      const nested=[d.deck,d.data,d.payload].find(x=>obj(x)&&['main_deck','mainDeck','main_cards','mainCards','legacy_deck_package_slots','side_deck_package_slots','default_formation','formation'].some(k=>x[k]!=null));
      if(!nested)break;
      d=nested;
    }
    return obj(d)||{};
  }
  function progressionHeroIds(p){return Array.isArray(p&&p.heroes)?p.heroes:clean(p&&p.heroes).replace(/^\[|\]$/g,'').split(/[;,|]/).map(x=>x.replace(/[\"']/g,'').trim()).filter(Boolean);}
  function currentMaps(catalog){
    const main=arr(catalog.mainCards),heroes=arr(catalog.heroes),legacies=arr(catalog.legacies),progressions=arr(catalog.progressions);
    const mainByNorm=new Map(main.map(x=>[norm(x.card_number||x.card_id),x]));
    const heroByNorm=new Map(heroes.map(x=>[norm(x.hero_number||x.card_id),x]));
    const legacyByNorm=new Map(legacies.map(x=>[norm(x.legacy_number||x.card_id),x]));
    const progByNorm=new Map();
    const progByHeroNorm=new Map();
    for(const p of progressions){
      progByNorm.set(norm(p.progression),p);
      const hs=progressionHeroIds(p);
      for(const id of hs)progByHeroNorm.set(norm(id),p);
      if(p.progression)progByHeroNorm.set(norm(p.progression),p);
    }
    return {main,heroes,legacies,progressions,mainByNorm,heroByNorm,legacyByNorm,progByNorm,progByHeroNorm};
  }
  function mainEntries(d){
    const direct=pick(d,['main_deck','mainDeck','main_cards','mainCards','cards','deck_list','deckList']);
    const expanded=pick(d,['main_deck_expanded','mainDeckExpanded','expanded_main_deck','expandedMainDeck','cards_expanded','expandedCards']);
    const raw=direct!=null?direct:expanded;
    const out=[];
    if(Array.isArray(raw)){
      for(const item of raw){
        if(typeof item==='string'||typeof item==='number'){out.push({id:item,qty:1});continue;}
        if(!obj(item))continue;
        const nested=obj(item.card)||{};
        const id=pick(item,['card_id','card_number','card_no','cardNo','id','number','code'])??pick(nested,['card_id','card_number','card_no','cardNo','id','number','code']);
        if(id!=null)out.push({id,qty:pick(item,['quantity','qty','count','copies','copy'])??1});
      }
    }else if(obj(raw)){
      for(const [id,value] of Object.entries(raw)){
        if(obj(value))out.push({id:pick(value,['card_id','card_number','id'])??id,qty:pick(value,['quantity','qty','count','copies'])??1});
        else out.push({id,qty:value});
      }
    }
    return out;
  }
  function expandedLegacyIds(d){
    const raw=pick(d,['legacy_deck_expanded','side_deck_expanded','legacyDeckExpanded','sideDeckExpanded','legacy_cards','side_cards']);
    const out=[];
    for(const item of arr(raw)){
      if(typeof item==='string'||typeof item==='number')out.push(item);
      else if(obj(item))out.push(pick(item,['card_id','card_number','hero_number','legacy_number','id','number']));
    }
    return out.filter(Boolean);
  }
  function packageSlots(d,maps,catalog,report){
    const raw=pick(d,['legacy_deck_package_slots','side_deck_package_slots','legacy_packages','side_packages','packages','hero_packages']);
    const slots=[];
    for(const item of arr(raw).slice(0,3)){
      const x=obj(item)||{};
      const pRaw=pick(x,['progression','progression_id','hero_progression','rank1_hero','rank_i_hero','hero_id','hero','lineage_id']);
      const lRaw=pick(x,['legacy','legacy_id','legacy_card_id','legacy_number']);
      const p=maps.progByNorm.get(norm(pRaw))||maps.progByHeroNorm.get(norm(pRaw));
      const l=maps.legacyByNorm.get(norm(lRaw));
      if(!p&&pRaw)report.unknownLegacyIds.push(clean(pRaw));
      if(!l&&lRaw)report.unknownLegacyIds.push(clean(lRaw));
      if(p)slots.push({progression:p.progression,legacy:l?.legacy_number||p.default_legacy||''});
    }
    if(!slots.length){
      const ids=new Set(expandedLegacyIds(d).map(norm));
      for(const p of maps.progressions){
        const hs=progressionHeroIds(p);
        if(!hs.some(id=>ids.has(norm(id))))continue;
        const matchingLegacy=maps.legacies.find(l=>ids.has(norm(l.legacy_number))&&(l.matching_rank_i_base_class===p.family||!l.matching_rank_i_base_class));
        slots.push({progression:p.progression,legacy:matchingLegacy?.legacy_number||p.default_legacy||''});
        if(slots.length===3)break;
      }
    }
    const defaults=arr(catalog.defaultPackages).map(x=>({progression:x.progression||'',legacy:x.legacy||''}));
    const usedP=new Set(slots.map(x=>x.progression));
    const usedL=new Set(slots.map(x=>x.legacy));
    for(const def of defaults){
      if(slots.length>=3)break;
      if(def.progression&&!usedP.has(def.progression)&&(!def.legacy||!usedL.has(def.legacy))){slots.push({...def});usedP.add(def.progression);usedL.add(def.legacy);}
    }
    while(slots.length<3)slots.push({progression:'',legacy:''});
    return slots.slice(0,3);
  }
  function formation(d,maps,catalog){
    const raw=obj(pick(d,['default_formation','formation','starting_formation','startingFormation']))||{};
    const defaults=obj(catalog.defaultFormation)||{LEFT:'',CENTER:'',RIGHT:''};
    const out={LEFT:'',CENTER:'',RIGHT:''};
    for(const pos of ['LEFT','CENTER','RIGHT']){
      const val=raw[pos]??raw[pos.toLowerCase()]??raw[pos[0]+pos.slice(1).toLowerCase()]??defaults[pos];
      const h=maps.heroByNorm.get(norm(val));
      out[pos]=h?(h.hero_number||h.card_id):'';
    }
    return out;
  }
  function normalizeImportedDeck(input,catalog){
    const d=unwrap(input),maps=currentMaps(catalog||{});
    const report={unknownMainIds:[],unknownLegacyIds:[],clamped:[],sourceSchema:clean(d.schema_version||d.builder_version||'legacy/unknown')};
    const counts={};
    for(const e of mainEntries(d)){
      const card=maps.mainByNorm.get(norm(e.id));
      if(!card){if(e.id!=null)report.unknownMainIds.push(clean(e.id));continue;}
      const id=card.card_number||card.card_id;
      counts[id]=(counts[id]||0)+toQty(e.qty);
    }
    for(const [id,qty] of Object.entries(counts)){
      const card=maps.mainByNorm.get(norm(id));
      const lim=String(card?.is_ultimate||'').toUpperCase()==='TRUE'?1:Math.max(1,Number(card?.copy_limit||2));
      if(qty>lim){report.clamped.push(`${id}: ${qty}→${lim}`);counts[id]=lim;}
    }
    const packages=packageSlots(d,maps,catalog||{},report);
    const result={
      deckName:clean(d.deck_name||d.display_name||d.name||'Imported Deck')||'Imported Deck',
      counts,
      packages,
      formation:formation(d,maps,catalog||{}),
      report
    };
    report.unknownMainIds=[...new Set(report.unknownMainIds)];
    report.unknownLegacyIds=[...new Set(report.unknownLegacyIds)];
    report.importedMainCount=Object.values(counts).reduce((a,b)=>a+Number(b||0),0);
    report.usedCurrentCardNumbers=true;
    return result;
  }
  return {normalizeImportedDeck};
});
