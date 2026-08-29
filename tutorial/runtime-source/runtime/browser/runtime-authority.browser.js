/* Grandis Legacy Browser Runtime Authority v1.89.
   Owns exact-once transactions, mandatory-choice lifecycle, attachment identity, and invariant gates.
   UI and animation code may render the resulting state but must not finalize cards or choices independently. */
(function(global){
  'use strict';
  var VERSION='v1.89-browser';
  function ensure(state){
    state.runtimeRevision=Number(state.runtimeRevision||0);
    state.runtimeCardDestinationLedger=state.runtimeCardDestinationLedger&&typeof state.runtimeCardDestinationLedger==='object'?state.runtimeCardDestinationLedger:{};
    state.resolvedCardCommitDestinations=state.runtimeCardDestinationLedger;
    state.runtimeChoiceLedger=state.runtimeChoiceLedger&&typeof state.runtimeChoiceLedger==='object'?state.runtimeChoiceLedger:{};
    state.runtimeAttachmentReleaseLedger=state.runtimeAttachmentReleaseLedger&&typeof state.runtimeAttachmentReleaseLedger==='object'?state.runtimeAttachmentReleaseLedger:{};
    state.activeAttachments=Array.isArray(state.activeAttachments)?state.activeAttachments:[];
    return state;
  }
  function bumpRevision(state,reason){ ensure(state); state.runtimeRevision++; state.runtimeLastCheckpoint=String(reason||'checkpoint'); return state.runtimeRevision; }
  function finalizeCard(state,tx,handlers){
    ensure(state); var token=String(tx.commit_token||''); if(!token) throw new Error('Card transaction requires commit_token.');
    if(state.runtimeCardDestinationLedger[token]) return {applied:false,record:state.runtimeCardDestinationLedger[token]};
    if(tx.destination==='discard'){ if(!handlers||typeof handlers.toDiscard!=='function')throw new Error('Discard handler missing.'); handlers.toDiscard(); }
    else if(tx.destination==='hand'){ if(!handlers||typeof handlers.toHand!=='function')throw new Error('Hand handler missing.'); handlers.toHand(); }
    else if(tx.destination!=='attachment'&&tx.destination!=='exp'&&tx.destination!=='casting') throw new Error('Unsupported card destination '+tx.destination+'.');
    var rec={commit_token:token,side:tx.side,card_id:tx.card_id,destination:tx.destination,detail:tx.detail||null,revision:state.runtimeRevision}; state.runtimeCardDestinationLedger[token]=rec; return {applied:true,record:rec};
  }
  function placeAttachment(state,entry,hero,extra){
    ensure(state); if(!hero)throw new Error('Attachment host missing.'); hero.attachments=Array.isArray(hero.attachments)?hero.attachments:[null,null];
    var slot=Number(entry.slot); if(slot<0||slot>1)throw new Error('Invalid Attachment Slot.');
    var attachmentId=String(entry.attachment_id||('ATT:'+entry.commit_token+':'+entry.side+':'+entry.lane+':'+slot));
    var existing=state.activeAttachments.find(function(a){return a.attachment_id===attachmentId;}); if(existing)return existing;
    if(hero.attachments[slot] && (typeof hero.attachments[slot]==='string'?hero.attachments[slot]:hero.attachments[slot].card_id)!==entry.card_id) throw new Error('Attachment Slot already occupied.');
    if(state.activeAttachments.some(function(a){return a.side===entry.side&&a.lane===entry.lane&&Number(a.slot)===slot;})) throw new Error('Attachment runtime slot already occupied.');
    hero.attachments[slot]=entry.card_id;
    var rec=Object.assign({},entry,extra||{}, {attachment_id:attachmentId,slot:slot,remaining_count:Number(entry.remaining_count||1)}); state.activeAttachments.push(rec); return rec;
  }
  function releaseAttachment(state,entry,hero,toDiscard,reason){
    ensure(state); var id=String(entry.attachment_id||('ATT:'+entry.side+':'+entry.lane+':'+entry.slot+':'+entry.card_id));
    if(state.runtimeAttachmentReleaseLedger[id]) return {applied:false,record:state.runtimeAttachmentReleaseLedger[id]};
    if(hero&&Array.isArray(hero.attachments)&&((typeof hero.attachments[entry.slot]==='string'?hero.attachments[entry.slot]:hero.attachments[entry.slot]&&hero.attachments[entry.slot].card_id)===entry.card_id)) hero.attachments[entry.slot]=null;
    state.activeAttachments=state.activeAttachments.filter(function(a){return a.attachment_id!==entry.attachment_id;});
    if(typeof toDiscard==='function')toDiscard();
    var rec={attachment_id:id,card_id:entry.card_id,side:entry.side,lane:entry.lane,slot:entry.slot,reason:String(reason||'released'),revision:state.runtimeRevision}; state.runtimeAttachmentReleaseLedger[id]=rec; return {applied:true,record:rec};
  }
  function findAttachment(state,query){
    ensure(state); query=query||{};
    return state.activeAttachments.find(function(a){
      return a && (!query.attachment_id||a.attachment_id===query.attachment_id) && (!query.side||a.side===query.side) && (!query.lane||a.lane===query.lane) && (typeof query.slot==='undefined'||Number(a.slot)===Number(query.slot)) && (!query.card_id||a.card_id===query.card_id);
    })||null;
  }
  function tickAttachment(state,entry,checkpoint){
    ensure(state); if(!entry||entry.tick_phase!==checkpoint)return{ticked:false,reason:'checkpoint mismatch'};
    var sameCreationCheckpoint=String(entry.created_phase||'')===String(state.phase||'') && String(entry.created_turn||'')===String(state.turn||'') && Number(entry.created_round||0)===Number(state.round||0);
    if(sameCreationCheckpoint && !entry.creation_checkpoint_ignored){ entry.creation_checkpoint_ignored=true; return{ticked:false,reason:'creation checkpoint protection'}; }
    entry.remaining_count=Math.max(0,Number(entry.remaining_count||1)-1);
    return{ticked:true,expired:entry.remaining_count<=0,remaining_count:entry.remaining_count};
  }
  function openMandatoryChoice(state,pending){
    ensure(state); var id=String(pending.choice_id||''); if(!id)throw new Error('Mandatory choice requires choice_id.');
    if(state.runtimeChoiceLedger[id]==='RESOLVED')return{opened:false,resolved:true};
    if(state.pending){return{opened:false,same:state.pending.choice_id===id,current:state.pending};}
    state.pending=pending; state.runtimeChoiceLedger[id]='OPEN'; return{opened:true};
  }
  function beginChoiceCommit(state,id){
    ensure(state); id=String(id||''); if(!state.pending||state.pending.choice_id!==id)return{ok:false,reason:'stale choice'};
    if(state.runtimeChoiceLedger[id]!=='OPEN')return{ok:false,reason:'choice not open'};
    state.runtimeChoiceLedger[id]='COMMITTING'; state.pending.committing=true; return{ok:true};
  }
  function finishChoiceCommit(state,id){ ensure(state); id=String(id); if(state.runtimeChoiceLedger[id]!=='COMMITTING')throw new Error('Choice is not committing.'); state.runtimeChoiceLedger[id]='RESOLVED'; state.resolvedLegacyChoiceTokens=state.resolvedLegacyChoiceTokens||[]; if(state.resolvedLegacyChoiceTokens.indexOf(id)<0)state.resolvedLegacyChoiceTokens.push(id); state.pending=null; }
  function abortChoiceCommit(state,id){ ensure(state); id=String(id); if(state.runtimeChoiceLedger[id]==='COMMITTING')state.runtimeChoiceLedger[id]='OPEN'; if(state.pending&&state.pending.choice_id===id)state.pending.committing=false; }
  function castingSourceMatches(casting,currentSource){
    casting=casting||{};currentSource=currentSource||{};
    var lockedInstance=String(casting.source_instance_id||''),currentInstance=String(currentSource.instance_id||'');
    if(lockedInstance&&currentInstance)return lockedInstance===currentInstance;
    var locked=String(casting.source_progression_id||''),current=String(currentSource.progression_id||'');
    if(locked&&current)return locked===current;
    return String(casting.source_hero_card_id||'')===String(currentSource.card_id||'');
  }
  function castingShouldRemainExhausted(casting,currentSource){return !!casting&&castingSourceMatches(casting,currentSource);}
  function castingReleaseUsesCurrentSource(){return true;}
  function inspect(state,helpers){
    ensure(state); var errors=[], slots={};
    (state.activeAttachments||[]).forEach(function(a){var key=a.side+':'+a.lane+':'+a.slot;if(slots[key])errors.push('Two active attachments occupy '+key);slots[key]=a.attachment_id||a.card_id;var hs=a.side==='PLAYER'?state.playerHeroes:state.aiHeroes,h=hs&&hs[a.lane],id=h&&h.attachments&&helpers.attachmentCardId(h.attachments[a.slot]);if(id!==a.card_id)errors.push('Attachment visual/runtime mismatch '+key+' '+a.card_id);});
    if(state.pending&&state.pending.type==='legacy_defeat_choice'&&helpers.isLegacyModeHero((state.pending.side==='PLAYER'?state.playerHeroes:state.aiHeroes)[state.pending.lane]))errors.push('Legacy choice remains open after slot entered Legacy Mode.');
    return{ok:errors.length===0,errors:errors};
  }
  global.GL_RUNTIME_AUTHORITY={version:VERSION,ensure:ensure,bumpRevision:bumpRevision,finalizeCard:finalizeCard,placeAttachment:placeAttachment,releaseAttachment:releaseAttachment,findAttachment:findAttachment,tickAttachment:tickAttachment,openMandatoryChoice:openMandatoryChoice,beginChoiceCommit:beginChoiceCommit,finishChoiceCommit:finishChoiceCommit,abortChoiceCommit:abortChoiceCommit,castingSourceMatches:castingSourceMatches,castingShouldRemainExhausted:castingShouldRemainExhausted,castingReleaseUsesCurrentSource:castingReleaseUsesCurrentSource,inspect:inspect};
})(window);

/* Consolidated single browser policy authority. Generated/deploy copies must not redefine GL_RULES_RUNTIME elsewhere. */
/* Grandis Legacy Shared Rules Runtime v1.4 — pure deterministic policy shared by browser and PvP server. */
(function(global){
  'use strict';
  function uniq(values){ return (values||[]).map(function(x){return String(x||'').trim();}).filter(function(x,i,a){return x&&a.indexOf(x)===i;}); }
  function activeLineage(hero, heroCard, heroClass){
    heroCard=heroCard||{}; var id=heroCard.identity||{}, arr=[];
    if(Array.isArray(id.active_class_lineage)) arr=arr.concat(id.active_class_lineage);
    if(Array.isArray(id.base_skill_classes)) arr=arr.concat(id.base_skill_classes);
    if(typeof heroCard.active_class_lineage==='string') arr=arr.concat(heroCard.active_class_lineage.split(';'));
    if(typeof heroCard.base_skill_classes==='string') arr=arr.concat(heroCard.base_skill_classes.split(';'));
    if(id.base_class_family) arr.push(id.base_class_family);
    if(id.class) arr.push(id.class);
    if(heroClass) arr.push(heroClass);
    return uniq(arr);
  }
  function splitClassList(value){
    if(Array.isArray(value)) return uniq(value);
    if(value==null||value==='') return [];
    return uniq(String(value).split(/[;,]/));
  }
  function cardLegalClasses(cardObj){
    cardObj=cardObj||{}; var req=cardObj.requirement||{}, src=cardObj.source_requirement||{}, canon=cardObj.canonical_legality||{}, rank=req.rank_gate||src.rank_gate||{};
    var values=[cardObj.legal_active_classes,req.legal_active_classes,src.legal_active_classes,rank.eligible_active_classes,cardObj.runtime_legality&&cardObj.runtime_legality.legal_active_classes,cardObj.structured_legality&&cardObj.structured_legality.legal_active_classes,canon.legal_active_classes,canon.source_requirement&&canon.source_requirement.legal_active_classes,canon.runtime_legality&&canon.runtime_legality.legal_active_classes];
    var out=[]; values.forEach(function(v){out=out.concat(splitClassList(v));}); return uniq(out);
  }
  function cardLegalForLineage(cardObj, hero, heroCard, heroClass){
    var legal=cardLegalClasses(cardObj); if(!legal.length) return true;
    var lineage=activeLineage(hero,heroCard,heroClass);
    return legal.some(function(cls){return lineage.indexOf(cls)!==-1;});
  }
  function selectClassRow(map, hero, cardObj, ctx){
    map=map||{}; ctx=ctx||{}; var hc=String(ctx.heroClass||''), heroCard=ctx.heroCard||{};
    if(!cardLegalForLineage(cardObj,hero,heroCard,hc)) return null;
    var legal=cardLegalClasses(cardObj), legalSet={}; legal.forEach(function(x){legalSet[x]=true;});
    if(Object.prototype.hasOwnProperty.call(map,hc) && (!legal.length||legalSet[hc])) return hc;
    var lineage=activeLineage(hero,heroCard,hc).slice().reverse();
    for(var i=0;i<lineage.length;i++) if(Object.prototype.hasOwnProperty.call(map,lineage[i]) && (!legal.length||legalSet[lineage[i]])) return lineage[i];
    return null;
  }
  function mappedNumber(map, hero, cardObj, ctx){
    var key=selectClassRow(map,hero,cardObj,ctx); if(key==null) return 0; var value=map&&map[key];
    if(value&&typeof value==='object') value=value.base_multiplier_per_card_drawn||value.base_multiplier_per_opponent_mana_regen||value.base_multiplier||value.amount||value.damage||value.value||0;
    return Number(value||0);
  }
  function dynamicManaCost(card, sourceHero, state, sourceSide, ctx){
    card=card||{}; ctx=ctx||{};
    var costObj=card.cost&&typeof card.cost==='object'?card.cost:{}, cost=Number(ctx.printedCost!=null?ctx.printedCost:(costObj.mana||0));
    var heroClass=String(ctx.heroClass||''), byClass=costObj.mana_by_class||{};
    if(heroClass && Object.prototype.hasOwnProperty.call(byClass,heroClass)) cost=Number(byClass[heroClass]);
    else if(heroClass && Object.keys(byClass).length){
      var row=selectClassRow(byClass,sourceHero,card,{heroClass:heroClass,heroCard:ctx.heroCard||{}});
      if(row!=null && Object.prototype.hasOwnProperty.call(byClass,row)) cost=Number(byClass[row]); else return Infinity;
    } else {
      var cj=costObj.cost_json;
      if(cj&&cj.mana_by_rank&&sourceHero){ var key='rank'+Number(ctx.heroRank||1), val=cj.mana_by_rank[key]; if(val!=null) cost=Number(val); }
    }
    var dyn=costObj.dynamic_cost || (costObj.cost_json&&costObj.cost_json.dynamic_cost);
    if(dyn&&dyn.kind==='mana_cost_multiplied_by_opponent_mana_regen'){
      var opp=sourceSide==='AI'?'PLAYER':'AI'; var regen=Number(ctx.manaRegenForSide?ctx.manaRegenForSide(state,opp):0);
      return Math.max(Number(dyn.minimum_cost||0),Number(dyn.base_mana_cost||cost||0)*regen);
    }
    return Number.isFinite(cost)?cost:Infinity;
  }
  function scalingDamage(card, sourceHero, state, action, ctx){
    card=card||{}; action=action||{}; ctx=ctx||{};
    var printed=Number(ctx.printedDamage||0), flat=Number(ctx.flatBonus||0), id=String(card.card_id||'');
    if(id==='S1-ARC-024'){
      var drawn=Number(ctx.cardsDrawnForSide?ctx.cardsDrawnForSide(state,action.source_side||'PLAYER'):0), cap=String(ctx.heroClass||'')==='Grand Arbalest'?120:80;
      return {damage:Math.min(cap,drawn*printed)+flat, multiplier:drawn, cap:cap};
    }
    if(id==='S1-MAG-025'){
      var opp=(action.source_side||'PLAYER')==='AI'?'PLAYER':'AI', regen=Number(ctx.manaRegenForSide?ctx.manaRegenForSide(state,opp):0);
      return {damage:regen*printed+flat,multiplier:regen,cap:null};
    }
    return {damage:Number(ctx.currentDamage||0),multiplier:1,cap:null};
  }
  function nextRankThreshold(rank){ var r=Number(rank||1); return r===1?300:(r===2?700:null); }
  function resolveTributeExp(current,gain,rank,isUltimate){
    current=Math.max(0,Number(current||0)); gain=Math.max(0,Number(gain||0));
    var threshold=nextRankThreshold(rank);
    if(!threshold || current>=threshold) return {legal:false,total:current,applied:0,overflow:0,threshold:threshold,triggers_rank_up:false,reason:'no next Rank threshold'};
    var raw=current+gain;
    if(raw>threshold && !isUltimate) return {legal:false,total:current,applied:0,overflow:raw-threshold,threshold:threshold,triggers_rank_up:false,reason:'normal Tribute cannot overflow next Rank threshold'};
    var total=Math.min(raw,threshold);
    return {legal:true,total:total,applied:Math.max(0,total-current),overflow:Math.max(0,raw-total),threshold:threshold,triggers_rank_up:raw>=threshold};
  }
  function venomDetonationDamage(duration,multiplier){ return Math.max(0,Number(duration||0))*Math.max(0,Number(multiplier||0)); }
  global.GL_RULES_RUNTIME={version:'v1.5',authorityContract:{mode:'SINGLE_RUNTIME_AUTHORITY',clientRole:'INTENT_RENDER_ANIMATE_ONLY',releaseGate:'MANDATORY_SYNC_PARITY'},activeLineage:activeLineage,cardLegalClasses:cardLegalClasses,cardLegalForLineage:cardLegalForLineage,selectClassRow:selectClassRow,mappedNumber:mappedNumber,dynamicManaCost:dynamicManaCost,scalingDamage:scalingDamage,nextRankThreshold:nextRankThreshold,resolveTributeExp:resolveTributeExp,venomDetonationDamage:venomDetonationDamage};
})(typeof window!=='undefined'?window:globalThis);
