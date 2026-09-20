'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm');
const {loadLocalAI}=require('./promotion-v014/vm-local-ai-harness.cjs');
const root=path.resolve(__dirname,'..');
const must=(v,m)=>{if(!v)throw new Error(m)};
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const sha=rel=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex');
const pkg=require('../package.json'),tutPkg=require('../tutorial/package.json');
must(pkg.version==='6.41.0','VS AI package must be v6.41.0');
must(tutPkg.version==='0.67.0','Tutorial package must be v0.67.0');
const app=read('js/app.bundle.js'),css=read('css/app.css'),labCss=read('css/lab-authority.css'),staticData=read('js/static-data.js'),index=read('index.html');
must(app.includes('Grandis Legacy VS AI v6.41'),'VS AI v6.41 marker missing');
must(index.includes('gl-vs-ai-6.41'),'VS AI v6.41 cache marker missing');
must(app.includes('One Source v1.8.2')&&app.includes('Runtime Data v0.15.0'),'current authority marker missing');
for(const [rel,text] of [['index.html',index],['js/app.bundle.js',app],['js/static-data.js',staticData],['css/app.css',css],['css/lab-authority.css',labCss]]){
  for(const old of ['Mana Pool','Mana Deck','Generic Mana Shard','Mana Card']) must(!text.includes(old),rel+': obsolete resource terminology remains: '+old);
}

// Responsive contract: phone/mobile remains scrollable; physical tablet changes presentation by orientation.
must(app.includes('function physicalResponsiveDeviceFamily()')&&app.includes('function isPortraitViewport()'),'physical tablet detection/orientation contract missing');
must(app.includes("if(physical==='tablet')return isPortraitViewport()?'mobile':'tablet'"),'tablet portrait-mobile / landscape-desktop split missing');
must(app.includes("width=760, initial-scale=1")&&app.includes("width=device-width, initial-scale=1"),'tablet viewport contract missing');
must(app.includes('gl-tablet-portrait-mobile')&&app.includes('gl-tablet-landscape-desktop'),'tablet presentation classes missing');
must(app.includes("root.innerHTML=isMobileViewport()?mobileMarkup:desktopMarkup"),'responsive render branch missing');
must(css.includes('gl-mobile-game-scroll-active'),'native mobile scroll authority missing');

// Mobile visual corrections requested in this release.
must(app.includes("isShardDeck?'https://grandislegacytcg.github.io/shared/season1/v1/cards/ui/Back-of-Card-Legacy-Deck.webp'"),'mobile Shard Deck must use card back');
must(css.includes('.v96-app.mobile-restored-layout .hero-card-composition{transform:translateX(14px)!important;}'),'mobile Hero horizontal centering correction missing');

// Tablet touch Hand contract: legality before tap, tap-as-hover, separate Preview popup, vertical actions.
must(app.includes('touch-tablet-legality')&&app.includes('touch-tablet-legal--play')&&app.includes('touch-tablet-legal--tribute'),'tablet preselection Play/Tribute indicators missing');
must(app.includes('function tabletHandActionPortal()')&&app.includes("portal.id='glTabletHandActions'"),'tablet selected-card action portal missing');
must(app.includes('selectTouchHandCard(cardEl)')&&app.includes('v59HandHoverZoomShow(cardId,cardEl)'),'tablet tap must reproduce desktop enlarged hover review');
must(app.includes('preview-card-action touch-tablet-preview'),'tablet Preview action missing');
must(labCss.includes('.gl-tablet-hand-actions')&&labCss.includes('flex-direction:column!important'),'tablet selected actions must be vertical');
must(labCss.includes('.gl-ui-tablet .touch-tablet-legal--play')&&labCss.includes('.gl-ui-tablet .touch-tablet-legal--tribute'),'tablet legality pill styling missing');
must(labCss.includes('height:100dvh!important')&&labCss.includes('.gl-lab-sidebar .phase-panel{min-height:0!important'),'tablet landscape dynamic-viewport/sidebar fit missing');
must(labCss.includes('--gl-tablet-hand-hover-w')&&labCss.includes('--gl-tablet-hand-hover-h'),'tablet hover review dynamic sizing missing');
must(labCss.includes('.gl-ui-mobile .touch-tablet-preview,.gl-ui-desktop .touch-tablet-preview'),'tablet Preview control must not leak to mobile/desktop');

// Existing gameplay authority remains intact.
must(app.includes("GL_LAB_MANA_DECK_SIZE=12, GL_LAB_START_MANA_CARDS=3"),'12-card Shard Deck / 3 Starting Shards constants missing');
must(app.includes('manaRegen:1')&&app.includes('aiManaRegen:1'),'Mana Regen 1 initialization missing');
must(app.includes('response_payment_choice')&&app.includes('committed_response_counter:true'),'committed Response/payment framework missing');
must(app.includes('manualRepositionUsedThisTurn')&&app.includes('manualRepositionAvailable'),'manual Reposition limit authority missing');
must(app.includes('attackActsAsAreaForSource')&&app.includes('attackHasRangeForSource'),'generic Range + Area authority missing');
must(app.includes("type:'opponent_mana_selection'")&&app.includes('Face-down opponent Shard'),'blind opponent-Shard selection missing');
const data=JSON.parse(read('data/season1/cards.runtime.v0.15.0.json'));
must(data.cards.length===200,'Season 1 runtime must contain 200 cards');
const sourceCtx={window:{}};vm.createContext(sourceCtx);vm.runInContext(staticData,sourceCtx);
const stack=sourceCtx.window.GL_SOURCE_STACK||{};
must(stack.local_ai==='v6.41'&&stack.tutorial==='v0.67'&&stack.pvp_railway==='v3.42','cross-release metadata stale');
must(stack.resource_terminology&&stack.resource_terminology.deck==='Shard Deck'&&stack.resource_terminology.pool==='Shard Pool','Shard terminology metadata mismatch');
const ctx=loadLocalAI(root);
const qa=ctx.GL_LAB_V014_RULE_SYNC_QA_SELF_TEST&&ctx.GL_LAB_V014_RULE_SYNC_QA_SELF_TEST();
must(qa&&qa.ok&&qa.startingMana===3&&qa.simultaneousLegacyQueue&&qa.blindManaSelection&&qa.rangeAreaNoTarget&&qa.rangeAreaAllLanes,'Playtest Lab v0.14 runtime self-test failed: '+JSON.stringify(qa));
const manaQA=ctx.GL_LOCAL_AI_BRIDGE&&ctx.GL_LOCAL_AI_BRIDGE.testPlaytestManaRules&&ctx.GL_LOCAL_AI_BRIDGE.testPlaytestManaRules();
must(manaQA&&manaQA.ok&&manaQA.paymentBatchOrder&&manaQA.laterBatchBelowEarlier&&manaQA.matchingClassLast,'Shard payment-batch QA failed: '+JSON.stringify(manaQA));
for(let n=1;n<=6;n++)must(fs.existsSync(path.join(root,`assets/counters/Counter-${n}.png`)),`Counter-${n}.png missing`);
must(fs.existsSync(path.join(root,'assets/battle/Blade.png')),'Blade.png missing');
for(const [name,expected] of Object.entries({'Coin Flip.mp3':'b4842f9a3f2d25004223313f5473bef74afd79915b6af9bdb35c70f6df8c2b50','Card Sound.mp3':'1c04e41918b392a643c22d6c02ef34eeab0341c70d46b7d517078725b79d8ee4'})){
  const rel='assets/audio/'+name;must(fs.existsSync(path.join(root,rel)),name+' missing');must(sha(rel)===expected,name+' hash mismatch');
}
console.log('PASS VS AI v6.41: mobile visual fixes, portrait-mobile/landscape-desktop tablet contract, touch Hand actions, and Source Stack v1.8.2 gameplay verified.');
