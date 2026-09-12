'use strict';
const ADDITIVE=new Set(['Poison','Burn','Freeze','Stun']);
function statusName(s){return String(s&& (s.status||s.name)||'');}
function duration(s){return Math.max(0,Number(s&& (s.duration_turns??s.duration??s.turns_remaining)||0));}
function mergeStatusList(statuses,statusEffect){const list=Array.isArray(statuses)?statuses.slice():[];const name=statusName(statusEffect);if(!name){list.push(statusEffect);return list;}const idx=list.findIndex(s=>statusName(s).toLowerCase()===name.toLowerCase());if(idx<0){list.push({...statusEffect,duration_turns:duration(statusEffect)});return list;}const old=list[idx],oldD=duration(old),newD=duration(statusEffect);const merged={...old,...statusEffect};merged.duration_turns=ADDITIVE.has(name)?oldD+newD:Math.max(oldD,newD);list[idx]=merged;return list;}
function applyStatusIfConnected(resolution,statusEffect,target){if(!resolution||!resolution.applySecondEffect)return{applied:false,reason:'Attack did not connect.'};const nextTarget=Object.assign({},target);nextTarget.statuses=mergeStatusList(nextTarget.statuses,statusEffect);return{applied:true,target:nextTarget};}
module.exports={ADDITIVE,statusName,duration,mergeStatusList,applyStatusIfConnected};
