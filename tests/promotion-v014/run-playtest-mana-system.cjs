'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..','..');
const ctx={console,setTimeout:(f)=>0,clearTimeout(){},Math,Date,JSON,structuredClone:global.structuredClone,Uint32Array};
ctx.globalThis=ctx;ctx.window=ctx;ctx.GL_APP_MODE='LOCAL_AI';
const dummy={innerHTML:'',textContent:'',value:'',disabled:false,hidden:false,style:{},dataset:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},addEventListener(){},removeEventListener(){},appendChild(){},setAttribute(){},removeAttribute(){},querySelector(){return null},querySelectorAll(){return[]},closest(){return null},focus(){},scrollIntoView(){},getBoundingClientRect(){return{left:0,top:0,right:0,bottom:0,width:0,height:0}}};
ctx.document={readyState:'loading',addEventListener(){},getElementById(id){return id==='app'?dummy:null},querySelector(){return null},querySelectorAll(){return[]},createElement(){return Object.assign({},dummy)},body:{classList:{add(){},remove(){},toggle(){}},appendChild(){}}};
ctx.localStorage={getItem(){return null},setItem(){},removeItem(){}};
ctx.Audio=function(){return{play(){return Promise.resolve()},pause(){}}};
vm.createContext(ctx);
for(const f of ['js/static-data.js','js/runtime-authority.js','js/app.bundle.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const b=ctx.GL_LOCAL_AI_BRIDGE;if(!b)throw Error('bridge unavailable');
const defs=(ctx.GL_CARD_DEFINITIONS&&ctx.GL_CARD_DEFINITIONS.cards)||[];
const byId=Object.fromEntries(defs.map(c=>[c.card_id,c]));
const prefixToClass={WAR:'Warrior',MAG:'Mage',ARC:'Archer',CLE:'Cleric',THF:'Thief'};
const presets=b.getStarterDeckOptions();
for(const [key,opt] of Object.entries(presets)){
  const expanded=[];for(const e of (opt.deck.main_deck||[])){for(let i=0;i<Number(e.quantity||1);i++)expanded.push(e.card_id);}
  const expected=[];for(const id of expanded){const c=byId[id],m=/^S1-(WAR|MAG|ARC|CLE|THF)-/.exec(id);if(c&&c.requirement&&c.requirement.ultimate&&c.requirement.ultimate.is_ultimate&&m){const cls=prefixToClass[m[1]];if(!expected.includes(cls))expected.push(cls);}}
  const snap=b.startSharedMatch({playerDeckKey:key,player2DeckKey:key}).appState;
  const actual=snap.playerManaDeck.filter(sh=>sh.kind==='CLASS').map(sh=>sh.class_name);
  if(snap.playerManaDeck.length!==12)throw Error(key+': Shard Deck size != 12');
  if(expected.slice(0,3).sort().join('|')!==actual.sort().join('|'))throw Error(key+': auto Class Shards mismatch expected '+expected+' actual '+actual);
}
const result=b.testPlaytestManaRules();
if(!result||!result.ok)throw Error('Mana rule self-test failed: '+JSON.stringify(result));
if(result.deckSize!==12)throw Error('Shard Deck size != 12');
if(result.matchingValue!==2||result.nonmatchingValue!==1)throw Error('Class Shard values incorrect');
if(!result.classShardBottomReturn)throw Error('Class Shard bottom return failed');
if(!result.genericBottomReturn||!result.classShardDeepest)throw Error('Generic bottom return / Class deepest-bottom ordering failed');
if(!Array.isArray(result.ultimateTargets)||result.ultimateTargets.length!==1)throw Error('Ultimate Tribute must have exactly one bound Hero target');
if(result.startingManaRegen!==1)throw Error('Starting Mana Regen != +1');
const app=fs.readFileSync(path.join(root,'js/app.bundle.js'),'utf8');
if(!app.includes('Opening Shards')||!app.includes('queueOpeningManaDrawEvents'))throw Error('Opening Shards draw animation pipeline missing');
if(!app.includes('Back-of-Card-Legacy-Deck.webp'))throw Error('Hidden Shard Deck / opening draw back missing');
if(!app.includes('bottom_locked=true;deck.push(shard)'))throw Error('Class Shard bottom return marker missing');
if(!app.includes('insertGenericManaAtBottom')||!app.includes('deck.splice(bottomStart,0,shard)'))throw Error('Generic Mana bottom-return ordering marker missing');
if(!app.includes('queueStagedManaRegenDraws')||!app.includes('reserveManaDeckDraw')||!app.includes('commitReservedManaDraw'))throw Error('Staged Draw Phase Mana presentation pipeline missing');
const dpStart=app.indexOf('function resolveDrawPhase(state,side,opts)'),dpEnd=app.indexOf('function autoAdvancePlayerDrawWhenReady',dpStart),dp=app.slice(dpStart,dpEnd);
const dMain=dp.indexOf('drawOne(state,side,true'),dMana=dp.indexOf('continueDrawPhaseWithMana(state,side,{deferAnimation:true}'),aMain=dp.indexOf('reserveMainDeckDraw(state,side,true'),aQueue=dp.indexOf('queueReservedMainDeckDraw(reservation,state'),aMana=dp.lastIndexOf('continueDrawPhaseWithMana(state,side,{})');
if(dMain<0||dMana<dMain||aMain<0||aQueue<aMain||aMana<aQueue)throw Error('Draw Phase order is not Main Deck first, Mana Regen second');
if(app.includes('function drawPhaseManaEvents(')||app.includes('function queueManaDrawEvents('))throw Error('Obsolete pre-commit Draw Phase Mana pipeline remains');
if(!app.includes("manaAvailableValueForCard(state,responderSide,rc)"))throw Error('Reactive AI Class Shard mana-value legality not updated');
console.log('PASS Playtest Mana rules:',JSON.stringify(result));
