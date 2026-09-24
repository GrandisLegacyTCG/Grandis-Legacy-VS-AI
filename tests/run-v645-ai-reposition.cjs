'use strict';
const assert=require('assert');const path=require('path');const {loadLocalAI}=require('./vm-local-ai-harness.cjs');
const root=path.resolve(__dirname,'..'),ctx=loadLocalAI(root),Q=ctx.GL_AI_REPOSITION_QA;
assert(Q&&typeof Q.freshState==='function','GL_AI_REPOSITION_QA missing');
const legacy=(lane,id='S1-WAR-L001')=>({card_id:id,legacy_mode:true,active_legacy_card_id:id,lane});
const reason=s=>{const p=Q.choosePlan(s);return p&&p.reason||'STAY_PUT'};
// Default stay-put across ordinary states.
for(let i=0;i<6;i++){const s=Q.freshState();s.phase=i%2?'Deploy':'Reform';assert.strictEqual(reason(s),'STAY_PUT','ordinary AI turn became reposition-happy');}
// Plan 1 positive + negative.
let s=Q.freshState();s.phase='Reform';s.aiHeroes.LEFT.card_id='S1-CLE-H001';s.aiHeroes.LEFT.hp=100;s.aiHeroes.LEFT.maxHp=100;s.aiHeroes.LEFT.exhausted=false;s.aiHand=['S1-CLE-008'];s.aiManaRegen=3;assert.strictEqual(reason(s),'AREA_ATTACK_SETUP');
s=Q.freshState();s.phase='Reform';s.aiHeroes.LEFT.card_id='S1-CLE-H001';s.aiHand=['S1-CLE-008'];s.aiManaRegen=0;s.aiManaPoolCards=[];assert.strictEqual(reason(s),'STAY_PUT','unrealistic Area Attack setup should not move');
// Side Area Attack waits for better Center coverage unless it can defeat now.
s=Q.freshState();s.aiHeroes.LEFT.card_id='S1-CLE-H001';s.aiHeroes.LEFT.hp=100;s.aiHeroes.LEFT.exhausted=false;const areaAction={card_id:'S1-CLE-008',source_side:'AI',source_lane:'LEFT',target_side:'PLAYER'};s.playerHeroes.LEFT.hp=100;s.playerHeroes.CENTER.hp=100;s.playerHeroes.RIGHT.hp=100;assert.strictEqual(Q.sideAreaShouldWait(s,areaAction),true);s.playerHeroes.LEFT.hp=10;assert.strictEqual(Q.sideAreaShouldWait(s,areaAction),false,'side Area Attack kill exception missing');
// Plan 2 is 3v3 only.
s=Q.freshState();s.phase='Reform';s.aiHeroes.LEFT.card_id='S1-WAR-H001';s.aiHeroes.CENTER.card_id='S1-MAG-H001';s.aiHeroes.RIGHT.card_id='S1-ARC-H001';s.aiHand=[];assert.strictEqual(reason(s),'RETURN_DEFENDER_CENTER_3V3');
for(const mode of ['3v2','2v3','2v2']){s=Q.freshState();s.phase='Reform';s.aiHeroes.LEFT.card_id='S1-WAR-H001';s.aiHeroes.CENTER.card_id='S1-MAG-H001';s.aiHeroes.RIGHT.card_id='S1-ARC-H001';if(mode==='3v2')s.playerHeroes.RIGHT=legacy('RIGHT');if(mode==='2v3')s.aiHeroes.RIGHT=legacy('RIGHT');if(mode==='2v2'){s.playerHeroes.RIGHT=legacy('RIGHT');s.aiHeroes.RIGHT=legacy('RIGHT');}assert.notStrictEqual(reason(s),'RETURN_DEFENDER_CENTER_3V3',mode+' incorrectly triggered Plan 2');}
// Plan 4 protects lowest-current-HP Hero on 3v2, including a Warrior/tank.
s=Q.freshState();s.phase='Reform';s.aiHeroes.CENTER.card_id='S1-WAR-H001';s.aiHeroes.CENTER.hp=10;s.aiHeroes.LEFT.hp=80;s.aiHeroes.RIGHT.hp=90;s.playerHeroes.RIGHT=legacy('RIGHT');assert.strictEqual(reason(s),'PRESERVE_ADVANTAGE_3V2');
const p4=Q.choosePlan(s);assert.deepStrictEqual(Array.from(p4.pair),['CENTER','RIGHT']);
// 3v2 no benefit => stay.
s=Q.freshState();s.phase='Reform';s.playerHeroes.RIGHT=legacy('RIGHT');s.aiHeroes.RIGHT.hp=10;s.aiHeroes.LEFT.hp=80;s.aiHeroes.CENTER.hp=90;assert.strictEqual(reason(s),'STAY_PUT');
// 1v2 survival: move Center toward safer side.
s=Q.freshState();s.phase='Reform';s.aiHeroes.LEFT=legacy('LEFT');s.aiHeroes.RIGHT=legacy('RIGHT');s.playerHeroes.RIGHT=legacy('RIGHT');assert.strictEqual(reason(s),'SURVIVAL_1V2');assert.deepStrictEqual(Array.from(Q.choosePlan(s).pair),['CENTER','RIGHT']);
// 1v3 survival + lowest-HP facing tiebreaker.
s=Q.freshState();s.phase='Reform';s.aiHeroes.LEFT=legacy('LEFT');s.aiHeroes.RIGHT=legacy('RIGHT');s.playerHeroes.LEFT.hp=80;s.playerHeroes.RIGHT.hp=20;assert.strictEqual(reason(s),'SURVIVAL_1V3');assert.deepStrictEqual(Array.from(Q.choosePlan(s).pair),['CENTER','RIGHT']);
// 2v2 without Plan 1 stays put.
s=Q.freshState();s.phase='Reform';s.aiHeroes.RIGHT=legacy('RIGHT');s.playerHeroes.RIGHT=legacy('RIGHT');assert.strictEqual(reason(s),'STAY_PUT');
// Manual limit + Hero↔Legacy exhaustion semantics.
s=Q.freshState();s.phase='Reform';s.aiHeroes.LEFT=legacy('LEFT');s.aiHeroes.RIGHT=legacy('RIGHT');s.playerHeroes.RIGHT=legacy('RIGHT');const plan=Q.choosePlan(s);assert(plan);assert.strictEqual(Q.perform(s,plan.pair),true);assert.strictEqual(reason(s),'STAY_PUT','second manual Reposition remained available');const movedHero=s.aiHeroes.RIGHT;assert(movedHero&&!movedHero.legacy_mode&&movedHero.exhausted===true,'Hero did not Exhaust after Hero↔Legacy manual Reposition');assert(s.aiHeroes.CENTER&&s.aiHeroes.CENTER.legacy_mode===true,'Legacy partner did not remain Legacy');
// Deploy exhaust consequence: weak positional gain may not destroy current attack plan.
s=Q.freshState();s.phase='Deploy';s.playerHeroes.RIGHT=legacy('RIGHT');s.aiHeroes.CENTER.hp=10;s.aiHeroes.LEFT.hp=80;s.aiHeroes.RIGHT.hp=90;s.aiHand=['S1-WAR-001'];s.aiManaPoolCards=Array.from({length:8},(_,i)=>({kind:'GENERIC',uid:'qa'+i,owner:'AI'}));assert.notStrictEqual(reason(s),'PRESERVE_ADVANTAGE_3V2','Deploy reposition ignored current-turn Exhaust consequence');
console.log('PASS VS AI v6.45 tactical manual Reposition: stay-put bias, Area setup/kill exception, strict 3v3 defender return, 3v2 preservation, 1v2/1v3 survival, one-move limit, Hero↔Legacy rule, and no generic 2v2 movement.');
