'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm');
const {loadLocalAI}=require('./vm-local-ai-harness.cjs');
const root=path.resolve(__dirname,'..');
const must=(c,m)=>{if(!c)throw new Error(m)};
const read=r=>fs.readFileSync(path.join(root,r),'utf8');
const sha=r=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,r))).digest('hex');
const index=read('index.html'),app=read('js/app.bundle.js'),guide=read('js/tutorial-guide.js'),css=read('css/tutorial-guide.css'),appCss=read('css/app.css'),policy=read('runtime-source/runtime/core/response-availability-policy.js');

must(index.includes('gl-tutorial-0.34'),'v0.34 cache revision missing');
must(index.includes('Non-Scripted Tutorial Gameplay'),'GitHub tutorial title missing');
must(fs.existsSync(path.join(root,'..','.nojekyll')),'combined GitHub Pages root marker missing');
const ctx=loadLocalAI(root,'TUTORIAL');
vm.runInContext(guide,ctx,{filename:'js/tutorial-guide.js'});
const bridge=ctx.GL_TUTORIAL_BRIDGE,qa=ctx.GL_TUTORIAL_GUIDE_QA;
must(bridge&&bridge.version==='tutorial-bridge-v0.34','bridge version mismatch');
must(qa&&qa.version==='0.31','guide QA version mismatch');
must(app.includes('Grandis Legacy Tutorial v0.34 GitHub Pages')&&app.includes('VS AI v5.62 Base'),'app marker mismatch');
must(app.includes("NON-SCRIPTED — TUTORIAL GAMEPLAY"),'tutorial lobby heading missing');

// Shared response wording and Mage setup-follow-up locks.
must(app.includes('This Hero’s class cannot use this card.'),'app response reason does not use This Hero');
must(policy.includes("This Hero’s class cannot use this card."),'runtime policy response reason does not use This Hero');
must(!app.includes('Your Hero’s class cannot use this card.'),'old Your Hero wording remains');
must(app.includes('function aiBestAttackAfterDoubleCasting(state, setupAction)'),'Double Casting planner missing');
must(app.includes('function aiBestAttackAfterWildfire(state, setupAction)'),'Wildfire planner missing');
const tactical=ctx.GL_LOCAL_AI_V534_TACTICAL_AI_QA_SELF_TEST&&ctx.GL_LOCAL_AI_V534_TACTICAL_AI_QA_SELF_TEST();
for(const key of ['doubleCastingRequiresTimedMagicalAttack','doubleCastingAttackFollowsPrintedTiming','wildfireRequiresNextTurnAttack','futureAttackPlanPreserved'])must(tactical&&tactical.ok&&tactical[key]===true,'Mage follow-up lock failed: '+key+' '+JSON.stringify(tactical));

// Card Preview focus remains card-art-only where intended.
must(guide.includes("title:'Event Card Color',selector:'#previewBody .readable-card-art'"),'Event color lesson regressed');
must(guide.includes("title:'Item Card Color',selector:'#previewBody .readable-card-art'"),'Item color lesson regressed');
must(guide.includes("title:'Ultimate Skill — What Stays the Same',selector:'#previewBody .readable-card-art'"),'Ultimate first lesson regressed');
must(guide.includes("title:'Lineage Color',selector:anatomySelector('#previewBody .readable-card-art')"),'Skill Lineage Color regressed');
must(guide.includes("title:'Bound Hero and Deck Limit',selector:anatomySelector('#previewBody .readable-card-ultimate-rules'),printedRegion:'ultimate_rules'"),'specific Ultimate Rules highlight regressed');

// Separate first-use practices by card category.
for(const cat of ['Attack','Support','Tactical','Event','Item'])must(guide.includes("['Attack','Support','Tactical','Event','Item']"),'category list missing');
must(guide.includes("practiceCompleteKey(category)"),'per-category completion key missing');
must(guide.includes("play_practice_attack_complete"),'Attack practice completion not used by resolved-damage lesson');
must(guide.includes("interactionStateCheck:function()"),'source selection runtime-state wait missing');
must(guide.includes("p.type!=='source_selection'"),'source click does not wait for target-stage transition');
must(guide.includes("title:'Available Source Heroes'"),'source-only boundary lesson missing');
must(guide.includes("title:'Choose a Legal Source Hero'"),'source-then-target continuation missing');
must(guide.includes("title:'Available '+(side==='AI'?'Opponent':'Allied')+' Targets'"),'target boundary lesson missing');
must(guide.includes('Selecting one of the highlighted targets would commit the action'),'target commitment deadline missing');

// Category and boundary classification examples.
must(qa.practiceCategory('S1-ARC-008')==='Attack','Attack category mismatch');
must(qa.practiceCategory('S1-CLE-005')==='Support','Support category mismatch');
must(qa.practiceCategory('S1-MAG-006')==='Tactical','Tactical category mismatch');
must(qa.practiceCategory('S1-EVT-002')==='Event','Event category mismatch');
must(qa.practiceCategory('S1-ITM-001')==='Item','Item category mismatch');
must(qa.classifyPracticeBoundary('S1-EVT-002')==='BEFORE_SOURCE','Market Bargain must stop before source selection');
must(qa.classifyPracticeBoundary('S1-ITM-018')==='BEFORE_PLAY','Magic Compass must stop before Play');
must(qa.classifyPracticeBoundary('S1-ITM-001')==='BEFORE_TARGET','Health Potion must stop before target selection');
must(qa.classifyPracticeBoundary('S1-EVT-003')==='BEFORE_TARGET','Scouting must stop before opponent target selection');
must(qa.classifyPracticeBoundary('S1-ARC-008')==='BEFORE_TARGET','normal Attack must stop before opponent target selection');

// Area Attack response must teach every target, not only the first two.
must(guide.includes("var stepId='area_response_step_'+current"),'Area response per-target id missing');
must(guide.includes("target <b>'+current+' of '+total+'</b>"),'Area response per-target count missing');
must(!guide.includes('area_response_next'),'old two-step Area response limiter remains');


// Mobile Tutorial safety: Arvon must not use the old fixed desktop dock on small screens.
must(guide.includes('function isMobileTutorialViewport()'),'mobile viewport detector missing');
must(guide.includes('function setMobileGuideDock'),'mobile-safe Arvon docking missing');
must(guide.includes('function scrollMobileTargetIntoSafeView'),'mobile target auto-scroll missing');
must(guide.includes('isMobileTutorialViewport()&&(spec.mobile||spec.mobileTarget)'),'mobile-specific highlight target support missing');
must(css.includes('mobile-safe Arvon docking')&&css.includes('.gl-tutorial-guide.is-mobile-safe'),'mobile-safe tutorial CSS missing');
must(css.includes('dock-mobile-top')&&css.includes('dock-mobile-bottom'),'mobile top/bottom guide docks missing');

// Prior lessons retained.
must(guide.includes('function queueDetailedIncomingCardResponseSteps(rw)'),'incoming-card response lesson missing');
must(guide.includes('function firstLineageFallbackEvent(state)'),'lineage fallback detector missing');
must(guide.includes("title:'Lineage Fallback — Open Card Played'"),'fallback Card Played lesson missing');
must(guide.includes('function explainDragonScaleResponse(rw)'),'independent Dragon Scale detector missing');
must(typeof bridge.getActivatedRacialAbilities==='function','Tutorial bridge racial legality accessor missing');
must(app.includes('function recordReviveEvent(state,side,lane,hero,sourceName,legacyId)')&&guide.includes('function explainReviveEvent(state)'),'explicit Revive event lesson missing');
must(typeof bridge.getCardPlayedDisplayTargetForEvent==='function','Card Played identity bridge missing');

for(const name of ['NotoSans-Variable.woff2','NotoSans-Italic-Variable.woff2'])must(fs.existsSync(path.join(root,'assets/fonts/noto-sans',name)),name+' missing');
must(appCss.includes('../assets/fonts/noto-sans/NotoSans-Variable.woff2'),'Noto Sans path missing');
must(css.includes('Grandis Legacy Tutorial Guide v0.34'),'tutorial CSS marker mismatch');

const lock=JSON.parse(read('sync/tutorial-github-lock.v0.34.json'));
must(lock.tutorial==='v0.34'&&lock.base_vs_ai==='v5.62'&&lock.delivery==='GitHub Pages','tutorial lock version mismatch');
for(const [rel,key] of [['js/app.bundle.js','app_bundle_sha256'],['js/tutorial-guide.js','tutorial_guide_sha256'],['css/tutorial-guide.css','tutorial_css_sha256'],['js/runtime-authority.js','runtime_authority_sha256'],['js/static-data.js','static_data_sha256']])must(sha(rel)===lock[key],rel+' lock mismatch');

console.log('PASS Grandis Legacy Tutorial v0.34 GitHub Pages: separate first-use practices, final cancellable boundaries, and all-target Area Response lessons.');
