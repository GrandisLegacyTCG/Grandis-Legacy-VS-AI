'use strict';

function normalizeSlot(slot) {
  const value=String(slot||'').toLowerCase();
  if(value==='left')return 'Left'; if(value==='center'||value==='centre')return 'Center'; if(value==='right')return 'Right';
  return slot;
}
function directHeroBinding(record,ctx){
  if(!record||typeof record!=='object')return false;
  const playerKeys=['player_id','owner_id','source_player_id','attacking_player_id','actor_player_id','host_player_id'];
  const slotKeys=['source_slot','host_slot','actor_slot','original_source_slot','movement_subject_slot','attachment_host_slot','protected_slot'];
  const heroKeys=['source_hero_card_id','host_hero_card_id','actor_hero_card_id'];
  const players=playerKeys.map(k=>record[k]).filter(v=>v!==undefined&&v!==null);
  const slots=slotKeys.map(k=>normalizeSlot(record[k])).filter(v=>v!==undefined&&v!==null&&v!=='');
  const heroes=heroKeys.map(k=>record[k]).filter(Boolean);
  if(players.length&&players.every(v=>String(v)!==String(ctx.playerId)))return false;
  if(heroes.length&&ctx.heroCardId&&heroes.some(v=>String(v)===String(ctx.heroCardId))&&(!slots.length||slots.some(v=>v===ctx.slot)))return true;
  return players.some(v=>String(v)===String(ctx.playerId))&&slots.some(v=>v===ctx.slot);
}
function recordBoundToHero(record,ctx,depth){
  if(!record||typeof record!=='object'||depth>3)return false;
  if(directHeroBinding(record,ctx))return true;
  for(const key of ['attack_resolution','action','pending_action','effect_result','continuation','attachment','source']){
    if(record[key]&&recordBoundToHero(record[key],ctx,depth+1))return true;
  }
  return false;
}
function cleanupHeroBoundPendingState(state,input){
  const ctx={playerId:input.playerId,slot:normalizeSlot(input.slot),heroCardId:input.heroCardId||null};
  const result={continuations_removed:0,pending_cleared:0,response_selection_cleared:0,response_payment_cleared:0,response_frames_cancelled:0,attack_source_invalidated:false,response_source_invalidated:false};
  if(Array.isArray(state.continuation_queue)){
    const before=state.continuation_queue.length;
    state.continuation_queue=state.continuation_queue.filter(item=>!recordBoundToHero(item,ctx,0));
    result.continuations_removed=before-state.continuation_queue.length;
  }
  if(state.pending&&state.pending.type!=='legacy_defeat_choice'&&state.pending.type!=='racial_stoneblood'&&recordBoundToHero(state.pending,ctx,0)){state.pending=null;result.pending_cleared=1;}
  if(state.response_selection&&recordBoundToHero(state.response_selection,ctx,0)){state.response_selection=null;result.response_selection_cleared=1;}
  if(state.response_payment&&recordBoundToHero(state.response_payment,ctx,0)){state.response_payment=null;result.response_payment_cleared=1;}
  if(Array.isArray(state.response_stack)){
    for(const frame of state.response_stack){if(recordBoundToHero(frame,ctx,0)&&!frame.cancelled){frame.cancelled=true;frame.cancelled_reason='SOURCE_HERO_DEFEATED';result.response_frames_cancelled++;}}
  }
  if(state.pending_attack_resolution&&recordBoundToHero(state.pending_attack_resolution,ctx,0)){
    state.pending_attack_resolution.source_hero_defeated=true;
    state.pending_attack_resolution.post_resolution_host_invalidated=true;
    result.attack_source_invalidated=true;
  }
  if(state.response_window&&recordBoundToHero(state.response_window,ctx,0)){
    state.response_window.source_hero_defeated=true;
    state.response_window.post_resolution_host_invalidated=true;
    result.response_source_invalidated=true;
  }
  return result;
}
module.exports={normalizeSlot,recordBoundToHero,cleanupHeroBoundPendingState};
