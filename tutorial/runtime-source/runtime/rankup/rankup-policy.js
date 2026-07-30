'use strict';
function inherentRankExp(rank){ const n=Number(rank||1); return n>=3?700:(n===2?300:0); }
function nextRankThreshold(rank){ const n=Number(rank||1); return n===1?300:(n===2?700:null); }
function resolveTributeExp(current,gain,rank,isUltimate){
  current=Math.max(0,Number(current||0)); gain=Math.max(0,Number(gain||0));
  const threshold=nextRankThreshold(rank);
  if(!threshold||current>=threshold) return {legal:false,total:current,applied:0,overflow:0,threshold,triggers_rank_up:false};
  const raw=current+gain;
  if(raw>threshold&&!isUltimate) return {legal:false,total:current,applied:0,overflow:raw-threshold,threshold,triggers_rank_up:false};
  const total=Math.min(raw,threshold);
  return {legal:true,total,applied:Math.max(0,total-current),overflow:Math.max(0,raw-total),threshold,triggers_rank_up:raw>=threshold};
}
function clearExpStackAtRank(rank){ return {exp_cards:[],exp_total:inherentRankExp(rank)}; }
module.exports={inherentRankExp,nextRankThreshold,resolveTributeExp,clearExpStackAtRank};
