'use strict';
function ensureLedger(state){if(!state.card_commit_destinations||typeof state.card_commit_destinations!=='object')state.card_commit_destinations={};return state.card_commit_destinations;}
function commitToken(action,side,cardId){if(action&&action.commit_token)return String(action.commit_token);return ['card',side||'UNKNOWN',cardId||'UNKNOWN',Date.now(),Math.random()].join(':');}
function finalizeOnce(state,token,destination,payload={}){const ledger=ensureLedger(state);token=String(token||'');if(!token)throw new Error('commit_token is required');if(ledger[token])return {ok:false,duplicate:true,record:ledger[token]};const record=Object.assign({commit_token:token,destination,finalized:true},payload);ledger[token]=record;return {ok:true,duplicate:false,record};}
function isFinalized(state,token){return Boolean(state&&state.card_commit_destinations&&state.card_commit_destinations[String(token||'')]);}
module.exports={ensureLedger,commitToken,finalizeOnce,isFinalized};
