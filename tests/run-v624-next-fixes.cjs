const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
function must(x,m){if(!x)throw new Error(m)}
const app=fs.readFileSync(path.join(root,'js/app.bundle.js'),'utf8');
const tut=fs.readFileSync(path.join(root,'tutorial/js/app.bundle.js'),'utf8');
const css=fs.readFileSync(path.join(root,'css/app.css'),'utf8');
const rules=require(path.join(root,'runtime-source/runtime/core/source-sync-rules.js'));
for(const [name,src] of [['VS AI',app],['Tutorial',tut]]){
  must(src.includes("main_deck must contain exactly 60 cards, found"),name+' exact-60 import guard missing');
  if(name==='VS AI') must(src.includes("normal card max 3 copies"),name+' normal max-3 copy lock missing');
  else must(!src.includes("normal card max 3 copies")&&!src.includes("normal card max 2 copies"),name+' normal copy lock should remain unchanged');
  if(name==='VS AI') must(src.includes('function beginResponsePayment(state,rw,responseOption)')&&src.includes("type:'response_payment_choice'")&&src.includes('function openCommittedResponseCounterWindow(state,attackWindow,responseOption,incomingFamily)'),name+' committed Response payment framework missing');
  else must(src.includes("return openResponseExtraDiscardChoice(appState,rw,clone(opt));"),name+' prior Tutorial explicit response extra-discard selector gate missing');
  must(src.includes("if(explicit.length) return explicit;"),name+' Chain / Responses explicit-event authority fix missing');
  must(src.includes("pending.after_legacy_deferred_pending=clone(state.pending)"),name+' immediate Legacy preemption missing');
  must(src.includes("appState.pending=afterDeferredPending"),name+' deferred pending restore missing');
  must(src.includes("assets/sword_4490822.png"),name+' sword attack marker missing');
}
const runtimeData=JSON.parse(fs.readFileSync(path.join(root,'data/season1/cards.runtime.v0.14.3.json'),'utf8'));const hookCard=(runtimeData.cards||runtimeData).find(x=>x.card_id==='S1-ITM-012');const hookPolicy=rules.reactionPolicyForCard(hookCard);
must(hookPolicy&&JSON.stringify(hookPolicy.hostLineageGate)===JSON.stringify(['Thief','Archer']),'Spectral Grappling Hook lineage gate missing');
must(css.includes('vNext responsive priority')&&css.includes('.played-grid .combined-played-card:nth-child(n+5)'), 'constrained-resolution Phase Tracker/Card Played fix missing');
must(css.includes('Hero / Legacy display parity')&&css.includes('.hero-lane.legacy-slot>.legacy-health{position:absolute'), 'Hero/Legacy size parity CSS missing');
must(css.includes('stroke-dasharray:5 6')&&css.includes('gl-pending-attack-sword'),'short-dash sword indicator CSS missing');
for(const rel of ['assets/sword_4490822.png','tutorial/assets/sword_4490822.png','assets/favicon.png'])must(fs.existsSync(path.join(root,rel)),rel+' missing');
console.log('PASS v6.26/v0.52 next-fix contract + Response commit/payment migration');
