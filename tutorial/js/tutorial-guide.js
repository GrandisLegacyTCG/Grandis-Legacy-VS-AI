/* Grandis Legacy Tutorial Guide v0.31 — separate first-use practices for Attack, Support, Tactical, Event, and Item cards; each stops at the final cancellable boundary. Area Attack responses teach every affected Hero. VS AI v5.56 base. */
(function(){
  'use strict';
  var bridge=window.GL_TUTORIAL_BRIDGE;
  if(!bridge||!bridge.isTutorial||!bridge.isTutorial()) return;

  var seen=Object.create(null),queued=Object.create(null),queue=[],active=null,previous=null;
  var anatomy={waitingFamily:null,waitingCardId:null,waitingHandIndex:null,waitingSelector:null,activeFamily:null,cardId:null,step:0,steps:[],pendingFamilies:[],previewWasOpen:false,initialSequence:false};
  var lastOpponentEventSignature='',lastPlayerActionCount=0,promptedOpponentEvents=Object.create(null);
  var pollTimer=null,wasMatchStarted=false,lastAIGateSequence=0,lastAIActionGateSequence=0,lastReviveEventId='';
  var highlightEntries=[],highlightFrame=0,guideDockFrame=0,lastGuideDock='top-right';
  var reformGuide={stage:null,cardId:null,handIndex:null};
  var playGuide={stage:null,cardId:null,handIndex:null,family:null,requiresSource:false,requiresTarget:false,directCommit:false};
  var deployAdvancePending=false,deployNoPlayTicks=0,packageLock=null,activeAutoCloseTimer=0;

  var ARVON_ASSET='assets/tutorial/general-arvon-halfbody.webp';

  function q(sel,root){try{return (root||document).querySelector(sel);}catch(e){return null;}}
  function qa(sel,root){try{return Array.prototype.slice.call((root||document).querySelectorAll(sel));}catch(e){return[];}}
  function text(v){return String(v==null?'':v);}
  function esc(v){return text(v).replace(/[&<>"']/g,function(ch){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];});}
  function sideHeroes(state,side){return state&&state[side==='AI'?'aiHeroes':'playerHeroes']||{};}
  function sideHand(state,side){return state&&state[side==='AI'?'aiHand':'playerHand']||[];}
  function heroName(id){return bridge.cardName(id)||'Hero';}
  function cardInfo(id){return bridge.getCard(id)||{};}
  function family(id){return bridge.getCardFamily(id)||'';}
  function subtype(id){return bridge.getCardSubtype(id)||'';}
  function isUltimateSkillCard(id){var c=cardInfo(id),u=c&&c.requirement&&c.requirement.ultimate;return family(id)==='Skill'&&!!(u&&u.is_ultimate);}
  function anatomyKey(fam){return fam==='UltimateSkill'?'ultimate_skill':text(fam).toLowerCase();}
  function anatomyLabel(fam){return fam==='UltimateSkill'?'Ultimate Skill':fam;}
  function matchesAnatomyFamily(id,fam){if(fam==='UltimateSkill')return isUltimateSkillCard(id);if(fam==='Skill')return family(id)==='Skill'&&!isUltimateSkillCard(id);return family(id)===fam;}
  function baseSkillClass(c){return text(c&&c.requirement&&(c.requirement.base_skill_class||c.requirement.source_package)||'');}
  function lineageColorInfo(c){
    var cls=baseSkillClass(c),map={Cleric:{color:'White',css:'white'},Warrior:{color:'Red',css:'red'},Archer:{color:'Green',css:'green'}};
    return map[cls]?{lineage:cls,color:map[cls].color,css:map[cls].css}:{lineage:cls||'the printed',color:'printed',css:'neutral'};
  }
  function isPreviewOpen(){var el=q('#previewOverlay');return !!(el&&el.classList.contains('open'));}
  function isSafe(state){return !!state&&!state.gameOver&&!state.responseWindow&&!(state.pending&&state.pending.type);}
  function markSeen(id){if(id)seen[id]=true;}
  function guideHasBlockingWork(){
    return !!(active||queue.length||packageLock||anatomy.initialSequence||anatomy.activeFamily||anatomy.waitingFamily||document.body.classList.contains('gl-tutorial-card-pick-lock'));
  }
  function syncGuideHold(){if(bridge&&typeof bridge.setGuideHold==='function')bridge.setGuideHold(guideHasBlockingWork());}

  function resetGuideSession(){
    if(activeAutoCloseTimer){clearTimeout(activeAutoCloseTimer);activeAutoCloseTimer=0;}
    seen=Object.create(null);queued=Object.create(null);queue=[];active=null;previous=null;
    anatomy={waitingFamily:null,waitingCardId:null,waitingHandIndex:null,waitingSelector:null,activeFamily:null,cardId:null,step:0,steps:[],pendingFamilies:[],previewWasOpen:false,initialSequence:false};
    lastOpponentEventSignature='';lastPlayerActionCount=0;promptedOpponentEvents=Object.create(null);lastAIGateSequence=0;lastAIActionGateSequence=0;lastReviveEventId='';lastGuideDock='top-right';reformGuide={stage:null,cardId:null,handIndex:null};playGuide={stage:null,cardId:null,handIndex:null,family:null,requiresSource:false,requiresTarget:false,directCommit:false};deployAdvancePending=false;deployNoPlayTicks=0;packageLock=null;
    var bubble=q('#glTutorialBubble');if(bubble){bubble.classList.remove('is-open');bubble.hidden=true;}
    var wrap=q('#glTutorialGuide');if(wrap)wrap.className='gl-tutorial-guide dock-'+lastGuideDock;if(guideDockFrame){cancelAnimationFrame(guideDockFrame);guideDockFrame=0;}
    var scrim=q('#glTutorialScrim');if(scrim){scrim.hidden=true;scrim.classList.remove('is-pick-lock');}
    qa('.gl-tutorial-hover-target,.gl-tutorial-interaction-target').forEach(function(el){el.classList.remove('gl-tutorial-hover-target','gl-tutorial-interaction-target');});
    document.body.classList.remove('gl-tutorial-modal-open');document.body.classList.remove('gl-tutorial-hold-choice');document.body.classList.remove('gl-tutorial-round-one-tribute-lock');
    clearHighlights();clearCardPickLock();document.body.classList.remove('gl-tutorial-initial-draw-lock');syncGuideHold();queueLobbyIntro();
  }

  function buildShell(){
    if(q('#glTutorialGuide'))return;
    var scrim=document.createElement('div');scrim.id='glTutorialScrim';scrim.className='gl-tutorial-scrim';scrim.hidden=true;scrim.setAttribute('aria-hidden','true');document.body.appendChild(scrim);
    var layer=document.createElement('div');layer.id='glTutorialHighlightLayer';layer.className='gl-tutorial-highlight-layer';layer.setAttribute('aria-hidden','true');document.body.appendChild(layer);
    var wrap=document.createElement('aside');wrap.id='glTutorialGuide';wrap.className='gl-tutorial-guide';wrap.setAttribute('aria-live','polite');
    wrap.innerHTML=''+
      '<section id="glTutorialBubble" class="gl-tutorial-bubble" role="dialog" aria-modal="true" hidden>'+ 
        '<header><div><small id="glTutorialKicker">GENERAL ARVON</small><h2 id="glTutorialTitle"></h2></div><button id="glTutorialClose" type="button" aria-label="Close tutorial message">Close</button></header>'+ 
        '<div id="glTutorialBody" class="gl-tutorial-body"></div>'+ 
        '<footer id="glTutorialFooter"></footer>'+ 
      '</section>'+ 
      '<div class="gl-tutorial-arvon" aria-label="General Arvon, Tutorial Guide">'+ 
        '<img id="glTutorialMascotImage" src="'+ARVON_ASSET+'" alt="General Arvon">'+ 
      '</div>';
    document.body.appendChild(wrap);
    q('#glTutorialClose').addEventListener('click',handleTutorialClose);
    window.addEventListener('resize',refreshTutorialLayout,{passive:true});
    window.addEventListener('scroll',refreshTutorialLayout,{passive:true,capture:true});
  }

  function resolveHighlightTargets(spec){
    var selectors=Array.isArray(spec)?spec:[spec],found=[];
    selectors.forEach(function(sel){
      if(!sel)return;
      if(typeof sel==='string')found=found.concat(qa(sel));
      else if(sel.nodeType===1)found.push(sel);
    });
    return found.filter(function(el,idx){return found.indexOf(el)===idx;});
  }
  function regionRect(art,region){
    var r=art.getBoundingClientRect(),x=r.left,y=r.top,w=r.width,h=r.height;
    var fam=anatomy.activeFamily||anatomy.waitingFamily||'Skill';
    var maps={
      Skill:{name:[.205,.495,.655,.072],mana:[.012,.012,.19,.15],badge:[.285,.565,.39,.052],text:[.035,.613,.92,.372],exp:[.925,.018,.068,.964],lineage:[.075,.625,.47,.055]},
      UltimateSkill:{name:[.205,.495,.655,.072],mana:[.012,.012,.19,.15],badge:[.285,.565,.39,.052],text:[.035,.613,.92,.305],ultimate_rules:[.035,.925,.92,.055],exp:[.925,.018,.068,.964],lineage:[.075,.625,.47,.055]},
      Event:{name:[.205,.565,.655,.075],mana:[.012,.012,.19,.15],badge:[.285,.635,.39,.052],text:[.035,.643,.92,.307],exp:[.925,.018,.068,.964],lineage:[.075,.665,.47,.055]},
      Item:{name:[.205,.555,.655,.075],badge:[.285,.625,.39,.052],text:[.035,.643,.92,.322],exp:[.925,.018,.068,.964],lineage:[.075,.665,.47,.055]}
    };
    var map=maps[fam]||maps.Skill,m=map[region]||[0,0,1,1];
    return{left:x+w*m[0],top:y+h*m[1],width:w*m[2],height:h*m[3]};
  }
  function highlightRect(entry){
    if(!entry)return null;
    var r=null;
    if(entry.elements&&entry.elements.length){
      var rects=entry.elements.filter(function(el){return el&&document.documentElement.contains(el);}).map(function(el){return el.getBoundingClientRect();}).filter(function(x){return x&&x.width>1&&x.height>1;});
      if(!rects.length)return null;
      var left=Math.min.apply(null,rects.map(function(x){return x.left;})),top=Math.min.apply(null,rects.map(function(x){return x.top;})),right=Math.max.apply(null,rects.map(function(x){return x.right;})),bottom=Math.max.apply(null,rects.map(function(x){return x.bottom;}));
      r={left:left,top:top,right:right,bottom:bottom,width:right-left,height:bottom-top};
    }else{
      if(!entry.el||!document.documentElement.contains(entry.el))return null;
      r=entry.region?regionRect(entry.el,entry.region):entry.el.getBoundingClientRect();
    }
    if(!r||r.width<2||r.height<2||r.bottom<0||r.right<0||r.top>window.innerHeight||r.left>window.innerWidth)return null;
    var pad=entry.padding||((entry.className||'').indexOf('gl-tutorial-highlight-box--card-pick')>=0?{top:6,right:0,bottom:0,left:0}:null);
    if(pad){
      var pt=Number(pad.top||0),pr=Number(pad.right||0),pb=Number(pad.bottom||0),pl=Number(pad.left||0);
      r={left:r.left-pl,top:r.top-pt,right:r.right+pr,bottom:r.bottom+pb,width:r.width+pl+pr,height:r.height+pt+pb};
    }
    return r;
  }
  function targetUnionRect(){
    var rects=highlightEntries.map(highlightRect).filter(Boolean);if(!rects.length)return null;
    var left=Math.min.apply(null,rects.map(function(x){return x.left;})),top=Math.min.apply(null,rects.map(function(x){return x.top;})),right=Math.max.apply(null,rects.map(function(x){return x.right;})),bottom=Math.max.apply(null,rects.map(function(x){return x.bottom;}));
    return{left:left,top:top,right:right,bottom:bottom,width:right-left,height:bottom-top};
  }
  function setGuideDock(wrap,dock,remember){
    if(!wrap)return;dock=dock||lastGuideDock||'top-right';['top-left','top-right','bottom-left','bottom-right'].forEach(function(pos){wrap.classList.remove('dock-'+pos);});
    wrap.classList.add('dock-'+dock);if(remember!==false)lastGuideDock=dock;
  }
  function overlapArea(a,b,margin){
    margin=Number(margin||0);var left=Math.max(a.left-margin,b.left),top=Math.max(a.top-margin,b.top),right=Math.min(a.right+margin,b.right),bottom=Math.min(a.bottom+margin,b.bottom);
    return Math.max(0,right-left)*Math.max(0,bottom-top);
  }
  function positionGuideForActive(force){
    guideDockFrame=0;if(!active||(!force&&active._dockFrozen))return;var wrap=q('#glTutorialGuide');if(!wrap)return;
    var preferred=active.dock||lastGuideDock||'top-right';if(active.lockDock){setGuideDock(wrap,preferred,true);return;}
    var target=targetUnionRect();if(!target){setGuideDock(wrap,preferred,true);return;}
    var candidateSource=active.topOnly?[(/^top-/.test(preferred)?preferred:'top-right'),'top-right','top-left']:[preferred,'top-right','top-left','bottom-right','bottom-left'];
    var candidates=candidateSource.filter(function(v,i,a){return a.indexOf(v)===i;}),best=candidates[0]||preferred,bestScore=Infinity;
    candidates.forEach(function(dock,idx){
      setGuideDock(wrap,dock,false);var r=wrap.getBoundingClientRect(),cx=(r.left+r.right)/2,cy=(r.top+r.bottom)/2,tx=(target.left+target.right)/2,ty=(target.top+target.bottom)/2;
      var overlap=overlapArea(target,r,12),distance=Math.hypot(cx-tx,cy-ty);var score=overlap*100000-distance+idx*.01;
      if(score<bestScore){bestScore=score;best=dock;}
    });
    setGuideDock(wrap,best,true);
  }
  function scheduleGuideDock(){
    if(active&&active._dockFrozen)return;
    if(guideDockFrame)cancelAnimationFrame(guideDockFrame);
    guideDockFrame=requestAnimationFrame(function(){guideDockFrame=requestAnimationFrame(function(){positionGuideForActive(false);});});
  }
  function refreshTutorialLayout(){updateHighlightLayer();scheduleGuideDock();}
  function updateHighlightLayer(){
    var layer=q('#glTutorialHighlightLayer');if(!layer)return;
    if(highlightFrame)cancelAnimationFrame(highlightFrame);
    highlightFrame=requestAnimationFrame(function(){
      highlightFrame=0;layer.innerHTML='';
      highlightEntries.forEach(function(entry){
        var r=highlightRect(entry);if(!r)return;
        if(entry.kind==='arrow'){
          var artRect=entry.el&&entry.el.getBoundingClientRect?entry.el.getBoundingClientRect():r;
          var targetInset=(entry.region==='badge'||entry.region==='lineage')?2:((entry.region==='name')?5:4),targetX=r.left+targetInset,targetY=r.top+r.height/2;
          var fromRight=false;
          var length=Math.max(28,Math.min(46,artRect.width*.12));
          var arrow=document.createElement('div');arrow.className='gl-tutorial-anatomy-arrow from-left gl-tutorial-anatomy-arrow--'+(entry.region||'point');
          arrow.style.top=Math.round(targetY-2)+'px';arrow.style.width=Math.round(length)+'px';
          arrow.style.left=Math.round(targetX-length-7)+'px';
          arrow.innerHTML='<span class="gl-tutorial-arrow-dot" aria-hidden="true"></span>';
          layer.appendChild(arrow);return;
        }
        var box=document.createElement('div');box.className='gl-tutorial-highlight-box '+(entry.className||'');
        box.style.left=Math.round(r.left)+'px';box.style.top=Math.round(r.top)+'px';box.style.width=Math.round(r.width)+'px';box.style.height=Math.round(r.height)+'px';
        layer.appendChild(box);
      });
      scheduleGuideDock();
    });
  }
  function clearHighlights(){
    highlightEntries=[];if(highlightFrame){cancelAnimationFrame(highlightFrame);highlightFrame=0;}
    var layer=q('#glTutorialHighlightLayer');if(layer)layer.innerHTML='';
    qa('.gl-tutorial-target-card').forEach(function(el){el.classList.remove('gl-tutorial-target-card');});
  }
  function applyPrintedRegion(region){
    if(!region)return;var art=q('#previewBody .readable-card-art');if(!art)return;
    var boxed=(region==='text'||region==='ultimate_rules');
    highlightEntries.push({kind:boxed?'box':'arrow',el:art,region:region,className:boxed?'gl-tutorial-highlight-box--printed-text':'gl-tutorial-anatomy-arrow--'+region});updateHighlightLayer();
  }
  function highlight(spec,className,padding){
    clearHighlights();if(!spec)return;
    var cls=className==='gl-tutorial-formation-highlight'?'gl-tutorial-highlight-box--formation':(className||''),found=[];
    if(spec&&typeof spec==='object'&&!Array.isArray(spec)&&!spec.nodeType&&spec.groupSelector){
      found=qa(spec.groupSelector);if(found.length)highlightEntries.push({elements:found,className:cls+' gl-tutorial-highlight-box--group',padding:padding||null});
    }else{
      found=resolveHighlightTargets(spec);found.forEach(function(el){highlightEntries.push({el:el,className:cls,padding:padding||null});});
    }
    updateHighlightLayer();
    if(found.length&&active&&active.scrollHighlight){try{found[0].scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});}catch(e){}}
  }
  function persistHighlightUntilClick(selector){
    var targets=resolveHighlightTargets(selector);if(!targets.length)return;
    highlightEntries=targets.map(function(el){return{el:el,className:'gl-tutorial-highlight-box--persistent'};});updateHighlightLayer();
    var clear=function(){clearHighlights();targets.forEach(function(el){el.removeEventListener('click',clear,true);});};
    targets.forEach(function(el){el.addEventListener('click',clear,{once:true,capture:true});});
  }

  function activeNeedsScrimPassThrough(){
    return !!(active&&(active.hoverTarget||active.interactionTarget));
  }
  function clearCardPickLock(){
    document.body.classList.remove('gl-tutorial-card-pick-lock');
    qa('.gl-tutorial-target-card').forEach(function(el){el.classList.remove('gl-tutorial-target-card');});
    if(!active)clearHighlights();
    var scrim=q('#glTutorialScrim');if(scrim){
      scrim.classList.toggle('is-pick-lock',activeNeedsScrimPassThrough());
      if(!active)scrim.hidden=true;
    }
  }
  function setCardPickLock(selector){
    clearCardPickLock();if(!selector)return;
    var target=q(selector);if(!target)return;var cardTarget=target.closest('.hand-card')||target;
    anatomy.waitingSelector=selector;
    document.body.classList.add('gl-tutorial-card-pick-lock');highlight(target,'gl-tutorial-highlight-box--card-pick');
    cardTarget.classList.add('gl-tutorial-target-card');
    var scrim=q('#glTutorialScrim');if(scrim){scrim.hidden=false;scrim.classList.add('is-pick-lock');}
  }
  function syncInitialHandLock(state){
    var locked=!!(state&&state.turn==='PLAYER'&&!state.preGame&&state.phase==='Draw'&&!seen.phase_deploy);
    document.body.classList.toggle('gl-tutorial-initial-draw-lock',locked);
  }
  function blockEvent(ev){if(!ev)return;ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();}
  function guardTutorialHandInput(ev){
    var card=ev.target&&ev.target.closest&&ev.target.closest('.hand-card');if(!card)return;
    var state=bridge.getState();
    if(state&&state.turn==='PLAYER'&&!state.preGame&&state.phase==='Draw'&&!seen.phase_deploy){blockEvent(ev);return;}
    if(anatomy.waitingFamily){
      var idx=Number(card.getAttribute('data-hand-index')),preview=ev.target.closest('.hand-art[data-preview]');
      var allowed=!!preview&&idx===Number(anatomy.waitingHandIndex)&&preview.getAttribute('data-preview')===anatomy.waitingCardId;
      if(!allowed)blockEvent(ev);
    }
  }

  function guardFirstTurnAttack(ev){
    var state=bridge.getState();if(!state||state.turn!=='PLAYER'||state.phase!=='Battle'||Number(state.round||1)!==1)return;
    var btn=ev.target&&ev.target.closest&&ev.target.closest('.play-card-action');if(!btn)return;
    var idx=Number(btn.getAttribute('data-play-index')),id=sideHand(state,'PLAYER')[idx];if(id&&bridge.isAttackCard(id))blockEvent(ev);
  }

  function guardRoundOneTributeAdvance(ev){
    if(!document.body.classList.contains('gl-tutorial-round-one-tribute-lock'))return;
    var next=ev.target&&ev.target.closest&&ev.target.closest('#nextPhaseButton');if(next)blockEvent(ev);
  }
  function guardMandatoryReformSequence(ev){
    var state=bridge.getState();
    if(!state||state.turn!=='PLAYER'||Number(state.round||1)!==1||state.phase!=='Reform'||state.tributeUsedThisReform||!reformGuide.stage||reformGuide.stage==='done')return;
    var target=ev.target;if(target&&target.closest&&target.closest('#glTutorialGuide'))return;
    var allowed=null;
    if(reformGuide.stage==='await_reposition')allowed='#repositionButton';
    else if(reformGuide.stage==='await_cancel')allowed='#manualRepositionCancel';
    else if(reformGuide.stage==='await_tribute_card')allowed='.tribute-card-action';
    else if(reformGuide.stage==='await_target'){
      var pending=state.pending||{},lanes=pending.legal_targets||[];
      allowed=lanes.map(function(lane){return '.hero-panel[data-side="PLAYER"][data-lane="'+lane+'"]';});
    }
    if(allowed&&targetMatchesSpec(target,allowed))return;
    blockEvent(ev);
  }
  function guardMandatoryPlaySequence(ev){
    if(!playGuide.stage||playGuide.stage==='done')return;
    var target=ev.target;if(target&&target.closest&&target.closest('#glTutorialGuide'))return;
    if(playGuide.stage==='await_play'&&targetMatchesSpec(target,'.play-card-action[data-play-index="'+playGuide.handIndex+'"]'))return;
    if(playGuide.stage==='await_source'||playGuide.stage==='await_target'){
      var state=bridge.getState(),pending=state&&state.pending||{};
      if(pending.type==='source_selection'){
        var lanes=pending.legal_sources||[],sources=lanes.map(function(lane){return '.hero-panel[data-side="PLAYER"][data-lane="'+lane+'"]';});
        if(targetMatchesSpec(target,sources))return;
      }
    }
    if(playGuide.stage==='await_cancel'&&targetMatchesSpec(target,'#cancelActionButton'))return;
    // Active tutorial interactions are already narrowed by guardActiveInteraction.
    // Do not re-block the same permitted click here.
    if(active&&targetMatchesSpec(target,activeAllowedSpec()))return;
    blockEvent(ev);
  }

  function guardTutorialPickLock(ev){
    if(!document.body.classList.contains('gl-tutorial-card-pick-lock'))return;
    var preview=ev.target&&ev.target.closest&&ev.target.closest('.gl-tutorial-target-card .hand-art[data-preview]');
    if(!preview)blockEvent(ev);
  }

  function runtimeModalOpen(){return !!q('#choiceOverlay.open, #responseOverlay.open, #infoOverlay.open');}
  function targetMatchesSpec(target,spec){
    if(!target||!spec)return false;
    var specs=Array.isArray(spec)?spec:[spec];
    return specs.some(function(item){
      if(!item)return false;
      if(item.nodeType===1)return target===item||item.contains(target);
      if(typeof item!=='string')return false;
      try{var hit=target.closest&&target.closest(item);return !!hit;}catch(e){return false;}
    });
  }
  function activeAllowedSpec(){return active&&(active.interactionTarget||active.hoverTarget)||null;}
  function guardActiveInteraction(ev){
    if(!active)return;
    var target=ev.target;if(target&&target.closest&&target.closest('#glTutorialGuide'))return;
    if(active.allowModalContent&&targetMatchesSpec(target,active.allowModalContent))return;
    if(active.blockExternal){blockEvent(ev);return;}
    var spec=activeAllowedSpec();if(!spec)return;
    if(targetMatchesSpec(target,spec)){
      if(ev.type==='click'&&active.requireInteraction&&active.interactionTarget&&targetMatchesSpec(target,active.interactionTarget)){
        var message=active;setTimeout(function(){finishActiveInteraction(message);},0);
      }
      return;
    }
    blockEvent(ev);
  }
  function interactionConditionMet(message){
    if(!message)return true;
    if(typeof message.interactionStateCheck==='function'){
      try{if(!message.interactionStateCheck())return false;}catch(e){return false;}
    }
    if(!message.interactionWaitFor)return true;
    var exists=!!q(message.interactionWaitFor);
    return message.interactionWaitMode==='absent'?!exists:exists;
  }
  function finishActiveInteraction(message){
    if(!message||active!==message||message._interactionPending)return;
    message._interactionPending=true;var started=Date.now();
    (function check(){
      if(active!==message)return;
      if(interactionConditionMet(message)){message._interactionPending=false;closeActive();return;}
      if(Date.now()-started>3000){message._interactionPending=false;return;}
      setTimeout(check,25);
    })();
  }
  function handleActiveInteractionClick(ev){
    var message=active;if(!message||!message.requireInteraction||!message.interactionTarget)return;
    if(!targetMatchesSpec(ev.target,message.interactionTarget))return;
    setTimeout(function(){finishActiveInteraction(message);},0);
  }
  function refreshActiveInteractionTargets(){
    if(!active)return;
    qa('.gl-tutorial-hover-target,.gl-tutorial-interaction-target').forEach(function(el){el.classList.remove('gl-tutorial-hover-target','gl-tutorial-interaction-target');});
    if(active.hoverTarget)resolveHighlightTargets(active.hoverTarget).forEach(function(el){el.classList.add('gl-tutorial-hover-target');});
    if(active.interactionTarget)resolveHighlightTargets(active.interactionTarget).forEach(function(el){el.classList.add('gl-tutorial-interaction-target');});
  }
  function activeInteractionChoiceCount(message){
    if(!message||!message.interactionTarget)return 0;
    return resolveHighlightTargets(message.interactionTarget).length;
  }
  function dismissActiveBubble(){
    if(!active||!active._closeKeepsInteraction)return;
    active._bubbleDismissed=true;
    var bubble=q('#glTutorialBubble');if(bubble){bubble.classList.remove('is-open');bubble.hidden=true;}
    var wrap=q('#glTutorialGuide');if(wrap)wrap.classList.add('is-bubble-dismissed');
  }
  function handleTutorialClose(){
    if(active&&active._closeKeepsInteraction){dismissActiveBubble();return;}
    closeActive();
  }
  function enqueue(msg,force){
    if(!msg||!msg.id)return false;
    if(!force&&(seen[msg.id]||queued[msg.id]||(active&&active.id===msg.id)))return false;
    queued[msg.id]=true;if(msg.priority)queue.unshift(msg);else queue.push(msg);syncGuideHold();showNext();return true;
  }
  function beginPackage(name){
    name=text(name);if(!name)return;if(!packageLock)packageLock=name;syncGuideHold();
  }
  function maybeFinishPackage(name){
    if(!name||packageLock!==name||active)return;
    if(queue.some(function(msg){return msg&&msg.package===name;}))return;
    packageLock=null;syncGuideHold();
  }
  function showNext(){
    if(active||!queue.length){syncGuideHold();return;}
    var index=0;
    if(packageLock){index=queue.findIndex(function(candidate){return candidate&&candidate.package===packageLock;});if(index<0){syncGuideHold();return;}}
    var msg=queue[index];
    if(runtimeModalOpen()&&!msg.allowDuringRuntimeModal){syncGuideHold();return;}
    if(isPreviewOpen()&&!msg.allowDuringPreview){syncGuideHold();return;}
    queue.splice(index,1);delete queued[msg.id];active=msg;markSeen(msg.id);syncGuideHold();renderActive();
  }
  function renderActive(){
    buildShell();if(!active)return;
    var message=active,bubble=q('#glTutorialBubble'),image=q('#glTutorialMascotImage'),wrap=q('#glTutorialGuide');
    image.src=ARVON_ASSET;message._dockFrozen=false;
    if(wrap){var renderDock=lastGuideDock||'top-right';wrap.className='gl-tutorial-guide is-speaking is-prepositioning'+(message.compact?' is-compact':'')+(message.micro?' is-micro':'')+' dock-'+renderDock;wrap.setAttribute('data-expression',message.expression||'calm');}
    q('#glTutorialTitle').textContent=message.title||'';
    q('#glTutorialKicker').textContent=message.kicker||'GENERAL ARVON';
    q('#glTutorialBody').innerHTML=message.html||('<p>'+esc(message.body||'')+'</p>');
    var footer=q('#glTutorialFooter');footer.innerHTML='';
    if(message.nextLabel){
      var next=document.createElement('button');next.type='button';next.className='gl-tutorial-next';next.textContent=message.nextLabel;next.onclick=function(){if(typeof message.onNext==='function')message.onNext();else closeActive();};footer.appendChild(next);
    }
    if(message.moreHtml){
      var more=document.createElement('button');more.type='button';more.textContent='More';more.onclick=function(){q('#glTutorialBody').insertAdjacentHTML('beforeend','<div class="gl-tutorial-more">'+message.moreHtml+'</div>');more.remove();};footer.appendChild(more);
    }
    var scrim=q('#glTutorialScrim');if(scrim){scrim.hidden=false;scrim.classList.toggle('is-pick-lock',!!(message.hoverTarget||message.interactionTarget));}
    if(message.hideChoiceWhileActive)document.body.classList.add('gl-tutorial-hold-choice');
    refreshActiveInteractionTargets();
    var tutorialClose=q('#glTutorialClose');
    message._closeKeepsInteraction=!!(message.requireInteraction&&activeInteractionChoiceCount(message)>1&&!message.hideClose&&!message.nextLabel);
    if(tutorialClose)tutorialClose.hidden=!!(message.nextLabel||message.hideClose||(message.requireInteraction&&!message._closeKeepsInteraction));
    if(activeAutoCloseTimer){clearTimeout(activeAutoCloseTimer);activeAutoCloseTimer=0;}
    document.body.classList.add('gl-tutorial-modal-open');
    bubble.hidden=false;bubble.classList.remove('is-open');
    highlight(message.highlight,message.highlightClass,message.highlightPadding);applyPrintedRegion(message.printedRegion);
    requestAnimationFrame(function(){requestAnimationFrame(function(){
      if(active!==message)return;
      positionGuideForActive(true);message._dockFrozen=true;
      if(wrap)wrap.classList.remove('is-prepositioning');
      bubble.classList.add('is-open');
      if(Number(message.autoCloseAfter)>0){activeAutoCloseTimer=setTimeout(function(){activeAutoCloseTimer=0;if(active===message)closeActive();},Number(message.autoCloseAfter));}
    });});
  }
  function closeActive(){
    if(!active)return;
    if(activeAutoCloseTimer){clearTimeout(activeAutoCloseTimer);activeAutoCloseTimer=0;}
    var done=active,onClose=active.onClose;
    qa('.gl-tutorial-hover-target,.gl-tutorial-interaction-target').forEach(function(el){el.classList.remove('gl-tutorial-hover-target','gl-tutorial-interaction-target');});
    var tutorialClose=q('#glTutorialClose');if(tutorialClose)tutorialClose.hidden=false;
    active=null;
    var bubble=q('#glTutorialBubble');if(bubble){bubble.classList.remove('is-open');bubble.hidden=true;}
    var wrap=q('#glTutorialGuide');if(wrap)wrap.className='gl-tutorial-guide dock-'+lastGuideDock;if(guideDockFrame){cancelAnimationFrame(guideDockFrame);guideDockFrame=0;}
    var scrim=q('#glTutorialScrim');if(scrim)scrim.hidden=true;
    document.body.classList.remove('gl-tutorial-modal-open');
    document.body.classList.remove('gl-tutorial-hold-choice');
    clearHighlights();
    if(done&&done.persistHighlight)persistHighlightUntilClick(done.persistHighlight);
    if(typeof onClose==='function'){try{onClose(done);}catch(e){console.error(e);}}
    maybeFinishPackage(done&&done.package);syncGuideHold();setTimeout(showNext,80);
  }

  function queueLobbyIntro(){
    enqueue({id:'lobby_intro',title:'Welcome to Grandis Legacy',expression:'calm',dock:'top-right',lockDock:true,highlight:'.ai-lobby-logo',html:'<p>Grandis Legacy is a 3 vs 3 Hero card game. Defeat all three opposing Heroes to win.</p>',onClose:function(){
      enqueue({id:'lobby_formation',title:'Your Three Heroes',expression:'advise',dock:'top-right',lockDock:true,highlight:'.player-deck-side .tutorial-formation-frame',highlightClass:'gl-tutorial-formation-highlight',html:'<p>Your team has three positions: <b>Left</b>, <b>Center</b>, and <b>Right</b>. Position determines a Hero’s normal Area of Attack.</p>',onClose:function(){
        enqueue({id:'lobby_start',title:'Begin When Ready',expression:'calm',dock:'top-right',lockDock:true,highlight:'#startMatchButton',interactionTarget:'#startMatchButton',requireInteraction:true,html:'<p>Select <b>Start Match</b> when you are ready. I will explain each rule only the first time it becomes relevant.</p>'});
      }});
    }});
  }

  function openingHandMessage(){
    enqueue({id:'opening_hand',title:'Opening Hand',expression:'calm',compact:true,dock:'top-right',lockDock:true,highlight:'.gl-opening-start-button',interactionTarget:'.gl-opening-start-button',requireInteraction:true,html:'<p>Both players draw <b>6 cards</b> before the first turn. Select <b>Start Game</b> after the opening draw.</p>'});
  }

  function queueEndPhaseInformation(){
    if(seen.phase_end||queued.phase_end||(active&&active.id==='phase_end'))return false;
    return enqueue({id:'phase_end',title:'End Phase',expression:'calm',compact:true,blockExternal:true,html:'<p>End Phase resolves end-of-turn effects. Status damage is applied, timed statuses and Attachments reduce their remaining duration, expired effects are removed, and defeat checks are completed.</p><p>After these checks are complete, the turn passes to the opponent.</p>'});
  }
  function queuePhaseAdvance(phase){
    var key='next_phase_'+text(phase).toLowerCase();if(seen[key])return;
    enqueue({id:key,title:phase==='End'?'End Your Turn':'Continue to the Next Phase',expression:'calm',compact:true,dock:'top-left',highlight:'#nextPhaseButton',interactionTarget:'#nextPhaseButton',requireInteraction:true,html:'<p>Select <b>'+(phase==='End'?'End Turn':'Next Phase')+'</b> to continue.</p>',onClose:phase==='Reform'?function(){queueEndPhaseInformation();}:null});
  }
  function guidedTributeCards(state){
    state=state||bridge.getState();var hand=sideHand(state,'PLAYER'),candidates=[];
    hand.forEach(function(id,idx){
      if(family(id)!=='Skill')return;
      var ts=bridge.getLegalTributeState('PLAYER',id);if(!ts||!ts.can)return;
      candidates.push({cardId:id,handIndex:idx,isUltimate:isUltimateSkillCard(id)});
    });
    return candidates;
  }
  function roundOneTributeRequired(state){
    return !!(state&&state.turn==='PLAYER'&&Number(state.round||1)===1&&state.phase==='Reform'&&!state.tributeUsedThisReform&&guidedTributeCards(state).length);
  }
  function syncRoundOneTributeLock(state){
    document.body.classList.toggle('gl-tutorial-round-one-tribute-lock',roundOneTributeRequired(state));
  }
  function promptGuidedTribute(){
    var picks=guidedTributeCards();
    if(!picks.length){reformGuide.stage='done';document.body.classList.remove('gl-tutorial-round-one-tribute-lock');queuePhaseAdvance('Reform');return;}
    reformGuide.stage='await_tribute_card';reformGuide.cardId=null;reformGuide.handIndex=null;
    var selectors=picks.map(function(p){return '.tribute-card-action[data-tribute-index="'+p.handIndex+'"]';});
    enqueue({id:'reform_tribute_pick',title:'Let’s Try Tribute',expression:'advise',compact:true,highlight:selectors,interactionTarget:selectors,requireInteraction:true,html:'<p>When a Skill Card shows <b>Tribute</b>, it can be used during this <b>Reform Phase</b> to become EXP beneath one of your Heroes.</p><p>For this first round, choose <b>any card</b> showing Tribute. Its printed Mana cost is not paid. A normal Skill gives <b>100 EXP</b>; an Ultimate gives <b>200 EXP</b> and may only be Tributed to its named Bound Hero.</p>'});
  }
  function startReformGuide(){
    reformGuide={stage:'await_reposition',cardId:null,handIndex:null};
    enqueue({id:'reform_reposition_start',title:'Try Reposition',expression:'advise',compact:true,dock:'top-left',highlight:'#repositionButton',interactionTarget:'#repositionButton',requireInteraction:true,html:'<p>Select <b>Reposition</b> to view the legal adjacent swaps.</p>'});
  }
  function phaseMessage(state){
    if(!state||state.turn!=='PLAYER'||state.preGame)return;
    if(state.phase==='Draw'&&!seen.phase_draw){
      enqueue({id:'phase_draw',title:'Draw Phase',expression:'calm',compact:true,highlight:'.zone[data-zone-side="PLAYER"][data-zone-type="Mana Pool"]',html:'<p>You begin with <b>2 Mana</b> and <b>1 Mana Regen</b>. During Draw Phase, draw 1 card, gain Mana equal to Mana Regen, and normally Ready your Exhausted Heroes.</p><p>A Hero that is still Casting remains Exhausted.</p>',onClose:function(){queuePhaseAdvance('Draw');}});
    }
    if(state.phase==='Deploy'&&!seen.phase_deploy){
      enqueue({id:'phase_deploy',title:'Deploy Phase',expression:'advise',compact:true,html:'<p>Deploy Phase is used for preparation. <b>Tactical</b> Skills, <b>Events</b>, <b>Items</b>, available Racial Traits, and Class Abilities may be used when their rules allow it.</p><p>We will review the cards in your Hand before continuing.</p>',onClose:function(){startInitialAnatomy();}});
    }
    if(state.phase==='Battle'&&!seen.phase_battle){
      var extra='';
      (state.playerHand||[]).some(function(id){
        if(!bridge.isAttackCard(id))return false;
        var lp=bridge.getLegalPlayState('PLAYER',id),rs=lp.reasons||[];
        if(rs.some(function(r){return /not enough|insufficient mana/i.test(text(r));})&&!rs.some(function(r){return /no legal source/i.test(text(r));})){extra='<p><b>'+esc(heroName(id))+'</b> is compatible with one of your Hero lineages, but you do not have enough Mana yet.</p>';return true;}
        return false;
      });
      var turnOneAttackSelectors=[];(state.playerHand||[]).forEach(function(id,idx){if(bridge.isAttackCard(id)){turnOneAttackSelectors.push('.hand-card[data-hand-index="'+idx+'"]');turnOneAttackSelectors.push('.play-card-action[data-play-index="'+idx+'"]');}});
      enqueue({id:'phase_battle',title:'Battle Phase — No Attack on Turn 1',expression:'serious',compact:true,highlight:turnOneAttackSelectors,html:'<p>Battle Phase is where <b>Attack</b> Skills are normally used.</p><p>Because you took the first turn, <b>you cannot attack during Round 1</b>. Even if an Attack card visibly shows Play, do not use it; the Tutorial blocks that click.</p>'+extra+'<p>The complete Attack flow will appear during a later Battle Phase when attacking is legal.</p>',onClose:function(){queuePhaseAdvance('Battle');}});
    }
    if(state.phase==='Reform'&&!seen.phase_reform){
      enqueue({id:'phase_reform',title:'Reform Phase',expression:'advise',compact:true,highlight:{groupSelector:'.hand-area--player .hand-card'},html:'<p>Reform Phase is used for recovery and Hero development. <b>Support</b>, Legacy Abilities, Reposition, and <b>Tribute</b> may be available.</p><p>You may Tribute <b>1 Skill Card per Reform Phase</b>. A normal Skill gives 100 EXP. An Ultimate gives 200 EXP but remains bound to its named Hero.</p><p>During Round 1, this tutorial requires you to complete one Tribute so the full flow can be learned.</p>',onClose:startReformGuide});
    }
    if(state.phase==='End'&&!seen.phase_end)queueEndPhaseInformation();
  }

  function firstFamilyCard(fam){
    var hand=sideHand(bridge.getState(),'PLAYER');
    for(var idx=0;idx<hand.length;idx++)if(matchesAnatomyFamily(hand[idx],fam)){
      var selector='.hand-card[data-hand-index="'+idx+'"] .hand-art';
      if(q(selector))return{cardId:hand[idx],handIndex:idx,selector:selector};
    }
    return null;
  }
  function availableInitialFamilies(){
    var state=bridge.getState(),hand=sideHand(state,'PLAYER'),out=[];
    ['Skill','UltimateSkill','Event','Item'].forEach(function(f){if(hand.some(function(id){return matchesAnatomyFamily(id,f);}))out.push(f);});return out;
  }
  function startInitialAnatomy(){
    if(anatomy.activeFamily||anatomy.waitingFamily)return;
    anatomy.initialSequence=true;
    anatomy.pendingFamilies=availableInitialFamilies();
    promptNextAnatomy();
  }
  function playableCardsBySubtype(pattern){
    var actions=bridge.getLegalActions('PLAYER').filter(function(a){return a&&a.type==='PLAY_CARD'&&pattern.test(subtype(a.card_id));}),ids=[];
    actions.forEach(function(a){if(ids.indexOf(a.card_id)<0)ids.push(a.card_id);});return ids;
  }
  function queueTacticalBadgeFirstUse(state,onClose){
    if(!state||state.turn!=='PLAYER'||state.pending||state.responseWindow||active||queue.length||seen.badge_tactical_first_use||queued.badge_tactical_first_use)return false;
    var ids=playableCardsBySubtype(/Tactical/i);if(!ids.length)return false;
    var selectors=ids.map(function(id){return '.hand-card[data-card-id="'+id+'"]';});
    enqueue({id:'badge_tactical_first_use',title:'Tactical Badge — Legal Use',expression:'advise',compact:true,highlight:selectors,html:'<p>A <b>Tactical</b> badge marks a preparation or strategy card. It may change the board, resources, positioning, or another game condition.</p><p>This card is legal now because its printed timing and source requirements are satisfied. Follow the timing written on the card.</p>',onClose:onClose});return true;
  }
  function queueFirstNextPhase(){deployAdvancePending=true;}
  function promptNextAnatomy(){
    if(anatomy.activeFamily||anatomy.waitingFamily)return;
    while(anatomy.pendingFamilies.length&&seen['anatomy_'+anatomyKey(anatomy.pendingFamilies[0])])anatomy.pendingFamilies.shift();
    var fam=anatomy.pendingFamilies[0];
    if(!fam){if(anatomy.initialSequence){anatomy.initialSequence=false;markSeen('initial_anatomy_complete');}return;}
    var pick=firstFamilyCard(fam);if(!pick){setTimeout(promptNextAnatomy,100);return;}
    anatomy.pendingFamilies.shift();
    anatomy.waitingFamily=fam;anatomy.waitingCardId=pick.cardId;anatomy.waitingHandIndex=pick.handIndex;anatomy.waitingSelector=pick.selector;
    var label=anatomyLabel(fam),copy=fam==='UltimateSkill'?'You already learned the normal Skill Card structure. An Ultimate follows the same Skill flow, so this review focuses only on its special owner, deck-limit, and EXP rules.':(fam==='Skill'?'Skill Cards are the main actions tied to Hero Class, Rank, and Lineage.':(fam==='Event'?'Events resemble Skills: they use Mana and normally Exhaust the chosen source, but they are not restricted to a Hero lineage.':'Items are different: they do not require Mana and do not Exhaust a Hero.'));
    enqueue({chain:'anatomy',id:'anatomy_prompt_'+anatomyKey(fam),title:'Review '+((fam==='Skill')?'a ':'an ')+label+' Card',expression:'advise',compact:true,highlight:pick.selector,interactionTarget:pick.selector,requireInteraction:true,interactionWaitFor:'#previewOverlay.open',interactionWaitMode:'present',html:'<p>'+copy+'</p><p>Only the marked card can be selected. Open it to view Card Preview.</p>'});
  }


  function anatomyStepsFor(fam,cardId){
    var c=cardInfo(cardId),ultimate=c&&c.requirement&&c.requirement.ultimate||{},isUltimate=fam==='UltimateSkill'||!!ultimate.is_ultimate,exp=isUltimate?200:100;
    if(fam==='UltimateSkill')return[
      {title:'Ultimate Skill — What Stays the Same',selector:'#previewBody .readable-card-art',compact:true,micro:true,html:'<p>An Ultimate is still a <b>Skill Card</b>. Its printed timing, source, target, Mana, Exhaust, and Response flow work like other Skills.</p><p>The next steps cover only the rules that are different.</p>'},
      {title:'Bound Hero and Deck Limit',selector:'#previewBody .readable-card-ultimate-rules',printedRegion:'ultimate_rules',compact:true,micro:true,html:'<p>Only the specifically named <b>Bound Hero</b> may play this Ultimate or receive it as Tribute.</p><p>Each Ultimate is limited to <b>1 copy per deck</b>.</p>'},
      {title:'Ultimate EXP',selector:null,printedRegion:'exp',compact:true,micro:true,html:'<p>An Ultimate provides <b>200 EXP</b> when Tributed instead of the normal 100 EXP.</p><p>Ultimate Tribute remains restricted to its named Bound Hero.</p>'}
    ];
    var color=lineageColorInfo(c),colorHtml='<span class="gl-lineage-key gl-lineage-key--white">White — Cleric</span><span class="gl-lineage-key gl-lineage-key--red">Red — Warrior</span><span class="gl-lineage-key gl-lineage-key--green">Green — Archer</span>';
    var base=[
      {title:'Card Name',selector:'#previewBody .readable-card-name',printedRegion:'name',highlightPadding:{top:5,right:5,bottom:5,left:5},compact:true,micro:true,html:'<p>Identifies the card.</p>'}
    ];
    if(fam!=='Item')base.push({title:'Mana Cost',selector:'#previewBody .readable-card-mana',printedRegion:'mana',compact:true,micro:true,html:'<p>Mana required to play it.</p>'});
    base.push({title:'Card Badge',selector:'#previewBody .readable-card-badges',printedRegion:'badge',compact:true,micro:true,html:'<p>Shows the card role and timing.</p>'});
    if(fam==='Skill'||fam==='UltimateSkill')base.push({id:'lineage_color_anatomy',title:'Lineage Color',selector:'#previewBody .readable-card-art',printedRegion:'lineage',compact:true,micro:true,dock:'top-right',html:'<p>This <b>'+esc(color.color)+'</b> Skill belongs to the <b>'+esc(color.lineage)+'</b> lineage.</p><div class="gl-lineage-keys">'+colorHtml+'</div><p>A hybrid Hero can use legal Skills from either of its lineages.</p>'});
    if(fam==='Event')base.push({title:'Event Card Color',selector:'#previewBody .readable-card-art',compact:true,micro:true,dock:'top-right',html:'<p>The <b>orange frame</b> identifies an Event Card. This is a neutral card-family color, not a Hero Lineage color.</p><p>Use the <b>Event Card</b> badge to distinguish it from an Item.</p>'});
    if(fam==='Item')base.push({title:'Item Card Color',selector:'#previewBody .readable-card-art',compact:true,micro:true,dock:'top-right',html:'<p>The <b>brown frame</b> identifies an Item Card. This is a neutral card-family color, not a Hero Lineage color.</p><p>Use the <b>Item Card</b> badge to distinguish it from an Event.</p>'});
    base.push({title:'Card Text',selector:'#previewBody .readable-card-text',printedRegion:'text',compact:true,micro:true,html:'<p>Read the printed effect and follow the timing, target, and resolution rules written on the card.</p>'});
    if(fam==='Skill'||fam==='UltimateSkill'){
      base.push({title:'EXP Value',selector:null,printedRegion:'exp',compact:true,micro:true,html:'<p>This '+(isUltimate?'Ultimate ':'')+'Skill provides <b>'+exp+' EXP</b> when Tributed during Reform Phase.</p>'});
      if(isUltimate)base.push({title:'Ultimate Rules',selector:'#previewBody .readable-card-ultimate-rules',compact:true,micro:true,html:'<p><b>Bound Hero</b> states the only named Hero who may play this Ultimate or use it as Tribute.</p><p>An Ultimate provides <b>200 EXP</b> when Tributed.</p>'});
      base.push({title:'Hero Source and Exhaust',selector:null,compact:true,micro:true,html:'<p>A Skill must use a Hero who meets its requirements. Playing it normally Exhausts that Hero.</p>'});
    }else if(fam==='Event'){
      base.push({title:'Event Source',selector:null,compact:true,micro:true,html:'<p>Events use Mana and normally Exhaust the selected source, but they are not tied to a Hero Class or Lineage.</p>'});
    }else{
      base.push({title:'No Mana, No Exhaust',selector:null,compact:true,micro:true,html:'<p>Items require no Mana and do not Exhaust a Hero. Some resolve immediately; others remain as Attachments.</p>'});
    }
    return base;
  }
  function beginAnatomy(fam,cardId){
    clearCardPickLock();anatomy.waitingFamily=null;anatomy.waitingCardId=null;anatomy.waitingHandIndex=null;anatomy.waitingSelector=null;anatomy.activeFamily=fam;anatomy.cardId=cardId;anatomy.step=0;anatomy.steps=anatomyStepsFor(fam,cardId);anatomy.previewWasOpen=true;
    markSeen('anatomy_'+anatomyKey(fam));clearHighlights();showAnatomyStep();
  }
  function showAnatomyStep(){
    var step=anatomy.steps[anatomy.step];if(!step){finishAnatomy();return;}
    if(step.id&&seen[step.id]){anatomy.step++;showAnatomyStep();return;}
    var isLast=anatomy.step===anatomy.steps.length-1,msgId=step.id||('anatomy_step_'+anatomyKey(anatomy.activeFamily)+'_'+anatomy.step);
    var ultimateTop=anatomy.activeFamily==='UltimateSkill';
    enqueue({chain:'anatomy',priority:true,allowDuringPreview:true,id:msgId,title:step.title,expression:step.title==='Hero Source and Exhaust'?'serious':'advise',compact:step.compact!==false,micro:!!step.micro,dock:step.dock||(ultimateTop?'top-right':null),topOnly:ultimateTop,highlight:step.selector,highlightClass:step.highlightClass,highlightPadding:step.highlightPadding,printedRegion:step.printedRegion,html:step.html,nextLabel:isLast?'Finish':'Next',onNext:function(){closeActive();anatomy.step++;setTimeout(showAnatomyStep,100);}},true);
  }

  function finishAnatomy(){
    var fam=anatomy.activeFamily,label=anatomyLabel(fam);anatomy.activeFamily=null;anatomy.cardId=null;anatomy.steps=[];anatomy.step=0;
    if(!isPreviewOpen()){promptNextAnatomy();return;}
    var ultimateTop=fam==='UltimateSkill';
    enqueue({chain:'anatomy',priority:true,allowDuringPreview:true,id:'anatomy_close_preview_'+anatomyKey(fam),title:'Read, Then Close Card Preview',expression:'calm',compact:true,dock:ultimateTop?'top-right':null,topOnly:ultimateTop,allowDuringRuntimeModal:true,highlight:'#previewClose',interactionTarget:'#previewClose',requireInteraction:true,interactionWaitFor:'#previewOverlay.open',interactionWaitMode:'absent',allowModalContent:'#previewOverlay',html:'<p>The '+label+' anatomy review is complete. Review the card once more, then select <b>Close</b> on Card Preview before continuing.</p>',onClose:function(){setTimeout(promptNextAnatomy,100);}},true);
  }
  function unavailableReasonMessage(cardId){
    var state=bridge.getState();if(!state||state.turn!=='PLAYER'||state.pending||state.responseWindow)return;
    var lp=bridge.getLegalPlayState('PLAYER',cardId);if(!lp||lp.can)return;
    var reason=text((lp.reasons||[])[0]||'This card is not legal in the current timing.');
    var key='unavailable_'+reason.toLowerCase().replace(/[^a-z0-9]+/g,'_').slice(0,60);
    enqueue({id:key,title:'Card Not Available',expression:'disapproving',highlight:'.hand-card[data-card-id="'+cardId+'"]',html:'<p><b>'+esc(heroName(cardId))+'</b> cannot be played right now.</p><p>'+esc(reason)+'</p>'});
  }
  function handleHandPreviewClick(ev){
    var btn=ev.target&&ev.target.closest&&ev.target.closest('.hand-art[data-preview]');if(!btn)return;
    var id=btn.getAttribute('data-preview'),fam=family(id),cardEl=btn.closest('.hand-card'),handIndex=cardEl?Number(cardEl.getAttribute('data-hand-index')):null;
    if(anatomy.waitingFamily){
      if(!matchesAnatomyFamily(id,anatomy.waitingFamily)||id!==anatomy.waitingCardId||(anatomy.waitingHandIndex!==null&&handIndex!==anatomy.waitingHandIndex))return;
      var waiting=anatomy.waitingFamily;clearCardPickLock();setTimeout(function(){if(isPreviewOpen())beginAnatomy(waiting,id);},100);return;
    }
    if(!anatomy.activeFamily)setTimeout(function(){unavailableReasonMessage(id);},120);
  }

  function pendingAttackTutorial(state){
    // Source and target selection for a real Attack must remain normal runtime interaction.
    // The first Attack is taught through a separate Play -> information -> Cancel practice,
    // so later real Attacks are not interrupted before damage resolves.
    return false;
  }


  function playableAttackTutorial(state){
    // The adaptive first-card practice is shared by every card family.
    // If no cancellable Deploy card appeared first, an Attack may become the first candidate in Battle.
    return startAdaptivePlayPractice(state);
  }


  function queueResponseOptionsAndDecision(rw,kind){
    var suffix=kind==='card'?'_card':'_attack';
    var unavailable=q('#responseOverlay .response-option.unavailable .response-option-reason'),available=q('#responseOverlay .response-option.available');
    enqueue({id:'response_detail_options'+suffix,title:'Response Cards and Abilities',expression:'advise',compact:true,allowDuringRuntimeModal:true,priority:true,highlight:'#responseOverlay .response-options-wrap',html:'<p>Responses in your Hand and legal Hero abilities appear here. Availability always comes from the current runtime state.</p>',onClose:function(){
      var continueOptions=function(){
        if(unavailable){enqueue({id:'response_detail_unavailable'+suffix,title:'Why Is This Not Available?',expression:'advise',compact:true,allowDuringRuntimeModal:true,priority:true,highlight:'#responseOverlay .response-option.unavailable .response-option-reason',hoverTarget:'#responseOverlay .response-option.unavailable .response-option-reason',html:'<p>Move your cursor over <b>Not Available</b> to see the runtime-provided reason this card cannot respond.</p>',onClose:function(){queueResponseFinishSteps(!!available,kind);}});}else queueResponseFinishSteps(!!available,kind);
      };
      var dragon=(rw.options||[]).find(function(o){return o&&o.racial_ability==='dragon_scale';});
      if(dragon&&!seen.dragon_scale_response&&!queued.dragon_scale_response){
        var dragonSelector='#responseOverlay .response-option.available .response-option-preview[data-preview="'+dragon.card_id+'"]';
        enqueue({id:'dragon_scale_response',title:'Racial Trait — Dragon Scale',expression:'advise',compact:true,allowDuringRuntimeModal:true,priority:true,highlight:dragonSelector,html:'<p><b>Dragon Scale</b> is a Dragonborn Response. Spend 1 Racial Token to Block 40 incoming Physical or Magical damage to that same Dragonborn Hero.</p><p>Racial Traits do not Exhaust the Hero and may remain legal even while that Hero is Exhausted.</p>',onClose:continueOptions});
      }else continueOptions();
    }});
  }
  function queueDetailedAttackResponseSteps(rw){
    enqueue({id:'response_detail_attacker',title:'Attacking Hero',expression:'serious',compact:true,allowDuringRuntimeModal:true,priority:true,highlight:'#responseOverlay .response-context-row > .response-context-card:nth-of-type(1)',html:'<p>This is the Hero performing the incoming Attack.</p>',onClose:function(){
      enqueue({id:'response_detail_card',title:'Incoming Attack Card',expression:'serious',compact:true,allowDuringRuntimeModal:true,priority:true,highlight:'#responseOverlay .response-context-row > .response-context-card:nth-of-type(2)',html:'<p>This is the Skill or card being used as an Attack, including its damage and visible effects.</p>',onClose:function(){
        enqueue({id:'response_detail_target',title:'Defending Hero',expression:'serious',compact:true,allowDuringRuntimeModal:true,priority:true,highlight:'#responseOverlay .response-context-row > .response-context-card:nth-of-type(3)',html:'<p>This is the allied Hero currently affected by the incoming Attack.</p>',onClose:function(){queueResponseOptionsAndDecision(rw,'attack');}});
      }});
    }});
  }
  function queueDetailedIncomingCardResponseSteps(rw){
    var fam=family(rw.card_id)||text(rw.incoming_family)||'Card',name=heroName(rw.card_id),title=fam==='Event'?'Opponent Event Card':(fam==='Item'?'Opponent Item Card':'Opponent Card');
    enqueue({id:'response_detail_incoming_card',title:title,expression:'serious',compact:true,allowDuringRuntimeModal:true,priority:true,highlight:'#responseOverlay .response-context-row > .response-context-card:nth-of-type(1)',html:'<p>The opponent is using <b>'+esc(name)+'</b> as an <b>'+esc(fam)+'</b>.</p><p>This is <b>not an Attack</b>, so there is no Attacking Hero or Defending Hero panel. The Response Window is asking whether you will cancel the incoming card or let its effect resolve.</p>',onClose:function(){queueResponseOptionsAndDecision(rw,'card');}});
  }
  function queueResponseFinishSteps(hasAvailable,kind){
    var suffix=kind==='card'?'_card':'_attack';
    if(hasAvailable){enqueue({id:'response_detail_available'+suffix,title:'Available Response',expression:'advise',compact:true,allowDuringRuntimeModal:true,priority:true,highlight:'#responseOverlay .response-option.available',html:'<p>An available Response can be selected and committed normally. Its exact effect follows the card text.</p>',onClose:function(){queueFirstResponseDecision(true,kind);}});}
    else queueFirstResponseDecision(false,kind);
  }
  function queueFirstResponseDecision(hasAvailable,kind){
    var incomingCard=kind==='card',suffix=incomingCard?'_card':'_attack';
    if(hasAvailable){
      var choiceSpec=['#responseOverlay .response-option.available .response-option-select','#responsePassButton'];
      enqueue({id:'response_detail_choose'+suffix,title:incomingCard?'Choose a Response or Let It Resolve':'Choose a Response or Take the Hit',expression:'serious',compact:true,allowDuringRuntimeModal:true,priority:true,highlight:choiceSpec,interactionTarget:choiceSpec,requireInteraction:true,html:incomingCard?'<p>You have at least one available Response. You may select it, or choose <b>No Response / Let Resolve</b> and allow the opponent card to continue.</p><p>Closing this Arvon message only hides the explanation. The Response decision is still required.</p>':'<p>You have at least one available Response. You may select a Response, or choose <b>Take Hit / No Response</b> to save it for later.</p><p>Closing this Arvon message only hides the explanation. The Response decision is still required.</p>'});
      return;
    }
    enqueue({id:'response_detail_pass'+suffix,title:incomingCard?'No Response / Let Resolve':'Take Hit / No Response',expression:'serious',compact:true,allowDuringRuntimeModal:true,priority:true,highlight:'#responsePassButton',interactionTarget:'#responsePassButton',requireInteraction:true,interactionWaitFor:'#responseOverlay.open',interactionWaitMode:'absent',html:incomingCard?'<p>No legal reactive cancel Response is available for this incoming card.</p><p>Select <b>No Response / Let Resolve</b> to allow the card effect to continue.</p>':'<p>No Defense or Response is available for this incoming Attack.</p><p>Select <b>Take Hit / No Response</b> to let it continue resolving.</p>'});
  }
  function explainDragonScaleResponse(rw){
    if(!rw||active||queue.length||seen.dragon_scale_response||queued.dragon_scale_response)return false;
    var dragon=(rw.options||[]).find(function(o){return o&&o.racial_ability==='dragon_scale';});if(!dragon)return false;
    var selector='#responseOverlay .response-option.available .response-option-preview[data-preview="'+dragon.card_id+'"]';if(!q(selector))return false;
    return enqueue({id:'dragon_scale_response',title:'Racial Trait — Dragon Scale',expression:'advise',compact:true,allowDuringRuntimeModal:true,priority:true,highlight:selector,html:'<p><b>Dragon Scale</b> is a Dragonborn Response. Spend 1 Racial Token to Block 40 incoming Physical or Magical damage to that same Dragonborn Hero.</p><p>It is checked independently in every Response Window, so this explanation cannot be skipped merely because Dragon Scale was unavailable earlier.</p><p>Racial Traits do not Exhaust the Hero.</p>'},true);
  }
  function explainOpponentAreaResponseSequence(rw){
    if(!rw||rw.kind!=='incoming_attack'||!rw.multi_sequence||active||queue.length)return false;
    var seq=rw.multi_sequence,total=(seq.affected_lanes||[]).length,index=Number(seq.index||0),current=index+1;
    if(!total||current<1||current>total)return false;
    var stepId='area_response_step_'+current;
    if(seen[stepId]||queued[stepId])return false;
    var first=current===1,last=current===total;
    return enqueue({id:stepId,title:'Area Attack — Response '+current+' of '+total,expression:'serious',compact:true,allowDuringRuntimeModal:true,priority:true,blockExternal:true,highlight:'#responseOverlay .response-context-row > .response-context-card:nth-of-type(3)',html:first?'<p>An Area Attack can affect more than one Hero, but Runtime resolves them through separate Response Windows.</p><p>The highlighted <b>Defending Hero</b> is affected first. Your decision applies only to this Hero.</p><p>After this window resolves, Runtime continues to the next affected Hero until all <b>'+total+'</b> targets have been processed.</p>':'<p>The highlighted Hero is target <b>'+current+' of '+total+'</b> for the same Area Attack.</p><p>The earlier Hero responses are already complete. Choose a Response or take the hit separately for this Hero.</p>'+(last?'<p>This is the final affected Hero for this Area Attack.</p>':'<p>Another affected Hero will receive its own Response Window after this one.</p>')},true);
  }
  function explainResponse(state){
    if(!state||!state.responseWindow)return;
    var rw=state.responseWindow;if(rw.source_side!=='AI'||rw.target_side!=='PLAYER')return;
    if(explainOpponentAreaResponseSequence(rw))return;
    if(rw.kind==='incoming_card'&&!seen.response_incoming_card_kind&&!queued.response_incoming_card_kind){markSeen('response_incoming_card_kind');queueDetailedIncomingCardResponseSteps(rw);return;}
    if(rw.kind!=='incoming_card'&&!seen.response_window&&!queued.response_window){markSeen('response_window');queueDetailedAttackResponseSteps(rw);return;}
    if(explainDragonScaleResponse(rw))return;
    var options=rw.options||[],defenseIds=[];options.forEach(function(o){if(o&&o.card_id&&/Defense/i.test(subtype(o.card_id))&&defenseIds.indexOf(o.card_id)<0)defenseIds.push(o.card_id);});
    if(defenseIds.length&&!seen.badge_defense_first_use&&!queued.badge_defense_first_use){
      enqueue({id:'badge_defense_first_use',title:'Defense Badge — Legal Use',expression:'serious',allowDuringRuntimeModal:true,highlight:defenseIds.map(function(id){return '.response-option.available [data-preview="'+id+'"]';}),html:'<p>A <b>Defense</b> badge is used during a real Attack Response Window. It may Block, Dodge, Redirect, Negate, or otherwise protect the affected Hero according to the card text.</p>'});
    }
  }

  function heroHasStatus(hero,name){
    return !!(hero&&(hero.statuses||[]).some(function(st){return text(st&&(st.name||st.status)).toLowerCase()===text(name).toLowerCase();}));
  }
  function isHealingCardForTutorial(cardId){
    var c=cardInfo(cardId),effects=Array.isArray(c&&c.effect)?c.effect:[];
    return effects.some(function(e){return e&&/^(heal|heal_target_hero|heal_allied_heroes|heal_all_allied_heroes)$/i.test(text(e.kind));});
  }
  function explainTemporaryHealTargetRestriction(state){
    if(!state||!state.pending||seen.temporary_heal_target_restriction||queued.temporary_heal_target_restriction)return false;
    if(playGuide.stage&&playGuide.stage!=='done')return false;
    var p=state.pending;if(p.type!=='target_selection'||p.target_side!=='PLAYER'||p.source_side!=='PLAYER'||!p.source_lane||!isHealingCardForTutorial(p.card_id))return false;
    var source=sideHeroes(state,'PLAYER')[p.source_lane];
    if(!heroHasStatus(source,'Bleed')||(p.legal_targets||[]).indexOf(p.source_lane)!==-1)return false;
    var selector='.hero-panel[data-side="PLAYER"][data-lane="'+p.source_lane+'"].selectable-selected';
    if(!q(selector))return false;
    enqueue({id:'temporary_heal_target_restriction',title:'Orange Border — Temporary Restriction',expression:'advise',compact:true,dock:'top-left',priority:true,highlight:[selector,selector+' .negative-status-indicator button[aria-label^="Bleed"]'],html:'<p>The orange border marks the Hero already chosen as the source of this card.</p><p>This damaged Hero would normally also be a possible healing target, but <b>Bleed</b> temporarily prevents it from receiving healing. Only the green-highlighted Heroes are legal targets right now.</p>'},true);
    return true;
  }

  function eventSignature(evt){if(!evt)return'';return [evt.id,evt.card_id,(evt.response_lines||evt.chain_lines||[]).length,(evt.result_lines||[]).length].join('|');}
  function opponentEventSelector(evt){var id=evt&&evt.id;return id?'[data-combined-event-id="'+id+'"], [data-op-event-id="'+id+'"]':'.opPanel';}
  function combinedEventSelector(target){
    if(!target||!target.event_id)return null;
    return '[data-combined-event-id="'+target.event_id+'"][data-combined-event-side="'+(target.side||'PLAYER')+'"]';
  }
  function castingTileSelector(evt,side,stage){
    side=side||'AI';stage=text(stage).toUpperCase();
    if(!evt||!evt.id||!evt.casting_action_id||text(evt.casting_stage).toUpperCase()!==stage)return null;
    if(!bridge.getCardPlayedDisplayTargetForEvent)return null;
    var target=bridge.getCardPlayedDisplayTargetForEvent(evt.id);
    if(!target||target.side!==side||target.event_id!==evt.id||target.chain_event||target.casting_action_id!==evt.casting_action_id||text(target.casting_stage).toUpperCase()!==stage)return null;
    var selector='[data-combined-event-id="'+evt.id+'"][data-combined-event-side="'+side+'"][data-casting-action-id="'+evt.casting_action_id+'"][data-casting-stage="'+stage+'"]';
    return q(selector)?selector:null;
  }
  function castingResolveTileSelector(evt,gate){
    if(!evt||text(evt.label).toUpperCase()!=='RESOLVE'||text(evt.casting_stage).toUpperCase()!=='RESOLVED'||!evt.id||!evt.casting_action_id)return null;
    if(gate&&(gate.event_id!==evt.id||gate.action_id!==evt.casting_action_id))return null;
    return castingTileSelector(evt,'AI','RESOLVED');
  }
  function opponentActionCopy(evt){
    var label=text(evt&&evt.label).toUpperCase(),name=heroName(evt&&evt.card_id);
    if(label==='TRIBUTE')return '<p>The opponent Tributed <b>'+esc(name)+'</b> as EXP during Reform Phase. It was <b>not used as an Attack</b>.</p><p>Select the highlighted Card Played entry to read its target and EXP result.</p>';
    return '<p>The opponent completed an action with <b>'+esc(name)+'</b>. Select the highlighted Card Played entry to inspect its source, target, effect, and result.</p>';
  }
  function queueOpponentResponseInspection(evt,gate){
    if(!evt||!evt.id||!bridge.getCardPlayedDisplayTargetForEvent)return false;
    var target=bridge.getCardPlayedDisplayTargetForEvent(evt.id),selector=combinedEventSelector(target);if(!selector)return false;
    var id=text(evt.id),key='opponent_response_attack_gate_'+id.replace(/[^a-z0-9]+/gi,'_'),name=heroName(evt.card_id);
    return enqueue({id:key,title:'Opponent Response Recorded',expression:'serious',compact:true,priority:true,highlight:selector,interactionTarget:selector,requireInteraction:true,interactionWaitFor:'#infoOverlay.open',interactionWaitMode:'present',html:'<p>The opponent used <b>'+esc(name)+'</b> as a Response. Responses are recorded inside the Attack that opened the Response Window.</p><p>Select the highlighted <b>Attack</b> in Card Played, then read its <b>Response Detail</b>.</p>',onClose:function(){
      enqueue({id:key+'_close',title:'Read Response Detail, Then Close',expression:'calm',compact:true,priority:true,allowDuringRuntimeModal:true,allowModalContent:'#infoOverlay',highlight:'#infoClose',interactionTarget:'#infoClose',requireInteraction:true,interactionWaitFor:'#infoOverlay.open',interactionWaitMode:'absent',html:'<p>Read the Attack detail, including <b>Response Detail</b>. When finished, select <b>Close</b> before the tutorial continues.</p>',onClose:function(){markSeen('opponent_response_card_click');if(gate&&bridge.resumeAIAction)setTimeout(function(){bridge.resumeAIAction();},80);}},true);
    }},true);
  }
  function queueOpponentActionInspection(evt,gate){
    if(!evt||!evt.id)return false;
    if(text(evt.label).toUpperCase()==='CAST'&&text(evt.casting_stage).toUpperCase()==='STARTED'){
      if(gate&&gate.action_id!==evt.casting_action_id)return false;
      var startSelector=castingTileSelector(evt,'AI','STARTED');if(!startSelector)return false;
      return enqueue({id:'opponent_casting_started',title:'Casting Attack Started — Card Played',expression:'serious',compact:true,priority:true,highlight:startSelector,interactionTarget:startSelector,requireInteraction:true,interactionWaitFor:'#infoOverlay.open',interactionWaitMode:'present',html:'<p>Casting creates its first, separate <b>Card Played</b> tile when the card begins Casting.</p><p>Select the highlighted tile. The action locks a tactical <b>position</b>, not the Hero currently occupying it, and the source Hero remains Exhausted.</p>',onClose:function(){
        enqueue({id:'opponent_casting_started_close',title:'Read the Locked Position, Then Close',expression:'calm',compact:true,priority:true,allowDuringRuntimeModal:true,allowModalContent:'#infoOverlay',highlight:'#infoClose',interactionTarget:'#infoClose',requireInteraction:true,interactionWaitFor:'#infoOverlay.open',interactionWaitMode:'absent',html:'<p>Review the source and locked position in Card Played. Then select <b>Close</b>. A second, separate tile will appear later when the Casting resolves.</p>',onClose:function(){if(gate&&bridge.resumeAIAction)setTimeout(function(){bridge.resumeAIAction();},80);}},true);
      }},true);
    }
    if(text(evt.label).toUpperCase()==='RESOLVE'&&text(evt.casting_stage).toUpperCase()==='RESOLVED'){
      var resolveSelector=castingResolveTileSelector(evt,gate);if(!resolveSelector)return false;
      var castKey='opponent_casting_resolved_gate_'+text(evt.id).replace(/[^a-z0-9]+/gi,'_');
      return enqueue({id:castKey,title:'Casting Attack Resolved',expression:'serious',compact:true,priority:true,highlight:resolveSelector,interactionTarget:resolveSelector,requireInteraction:true,interactionWaitFor:'#infoOverlay.open',interactionWaitMode:'present',html:'<p>The opponent’s Casting Attack has resolved and created its second, separate <b>Card Played</b> tile.</p><p>Select the highlighted <b>resolved Casting</b> tile. Review the source, locked position, current occupant, Response Detail, damage, and final result.</p><p>If the locked position contains a <b>Legacy</b> when release occurs, the Casting still resolves, but it deals no Hero damage there.</p>',onClose:function(){
        enqueue({id:castKey+'_close',title:'Read Casting Result, Then Close',expression:'calm',compact:true,priority:true,allowDuringRuntimeModal:true,allowModalContent:'#infoOverlay',highlight:'#infoClose',interactionTarget:'#infoClose',requireInteraction:true,interactionWaitFor:'#infoOverlay.open',interactionWaitMode:'absent',html:'<p>Read the complete resolve detail first. When finished, select <b>Close</b>. The AI remains paused until this popup is closed.</p>',onClose:function(){if(gate&&bridge.resumeAIAction)setTimeout(function(){bridge.resumeAIAction();},80);}},true);
      }},true);
    }
    if(text(evt.label).toUpperCase()==='DEF')return queueOpponentResponseInspection(evt,gate);
    var id=text(evt.id),selector=opponentEventSelector(evt),key='opponent_action_gate_'+id.replace(/[^a-z0-9]+/gi,'_');
    return enqueue({id:key,title:text(evt.label).toUpperCase()==='TRIBUTE'?'Opponent Tribute':'Opponent Card Played',expression:'serious',compact:true,priority:true,highlight:selector,interactionTarget:selector,requireInteraction:true,interactionWaitFor:'#infoOverlay.open',interactionWaitMode:'present',html:opponentActionCopy(evt),onClose:function(){
      enqueue({id:key+'_close',title:'Read, Then Close',expression:'calm',compact:true,priority:true,allowDuringRuntimeModal:true,allowModalContent:'#infoOverlay',highlight:'#infoClose',interactionTarget:'#infoClose',requireInteraction:true,interactionWaitFor:'#infoOverlay.open',interactionWaitMode:'absent',html:'<p>Read the complete Card Played detail first. When you are finished, select <b>Close</b> to return to the battlefield and continue the tutorial.</p>',onClose:function(){if(gate&&bridge.resumeAIAction)setTimeout(function(){bridge.resumeAIAction();},80);}},true);
    }},true);
  }
  function explainOpponentActionGate(state){
    if(!state||!bridge.getAIActionGate)return;var gate=bridge.getAIActionGate();if(!gate||!gate.waiting||!gate.event_id||Number(gate.sequence)===Number(lastAIActionGateSequence))return;
    var events=state.opponentPlayedEvents||[],evt=events.find(function(e){return e&&e.id===gate.event_id;});
    if(!evt){if(bridge.resumeAIAction)bridge.resumeAIAction();return;}
    if(queueOpponentActionInspection(evt,gate))lastAIActionGateSequence=Number(gate.sequence);
  }

  function explainOpponentPlayed(state){
    var events=state&&state.opponentPlayedEvents||[];if(!events.length)return;
    // Casting start and resolve are two separate Card Played lessons. Scan the full visible list so
    // a later-round RESOLVE tile cannot be missed merely because another event became the newest tile.
    var castingEvt=events.find(function(e){
      if(!e||!e.id||!e.casting_action_id)return false;
      var stage=text(e.casting_stage).toUpperCase(),label=text(e.label).toUpperCase(),key='';
      if(label==='CAST'&&stage==='STARTED')key='opponent_casting_started';
      else if(label==='RESOLVE'&&stage==='RESOLVED')key='opponent_casting_resolved_gate_'+text(e.id).replace(/[^a-z0-9]+/gi,'_');
      else return false;
      return !seen[key]&&!queued[key]&&!(active&&active.id===key);
    });
    if(castingEvt&&queueOpponentActionInspection(castingEvt,false))return;
    var evt=events[0],sig=eventSignature(evt);if(sig===lastOpponentEventSignature)return;lastOpponentEventSignature=sig;
    if(evt&&evt.label==='DEF'&&!seen.opponent_response_card_click){queueOpponentActionInspection(evt,false);}
    var chain=(evt.response_lines||evt.chain_lines||[]).length;
    if(chain&&state.turn==='AI'&&!seen.response_chain){enqueue({id:'response_chain',title:'Response Chain',expression:'serious',highlight:'.opPanel',html:'<p>During the opponent’s Attack, more than one action was committed before the original action resolved. The most recent Response resolves first, then the chain continues backward.</p>'});}
  }

  function firstLineageFallbackEvent(state){
    var events=(state&&state.playerPlayedEvents)||[];
    return events.find(function(evt){var er=evt&&evt.effect_row;return !!(evt&&evt.id&&evt.card_id&&er&&/fallback/i.test(text(er.match_type)));})||null;
  }
  function explainLineageFallbackCardPlayed(state){
    if(!state||state.pending||state.responseWindow||active||queue.length||packageLock||seen.lineage_fallback_card_played||queued.lineage_fallback_card_played||isPreviewOpen()||q('#infoOverlay.open'))return false;
    var evt=firstLineageFallbackEvent(state);if(!evt||!bridge.getCardPlayedDisplayTargetForEvent)return false;
    var target=bridge.getCardPlayedDisplayTargetForEvent(evt.id),selector=combinedEventSelector(target);if(!selector||!q(selector))return false;
    var er=evt.effect_row||{},source=er.source_name||'the selected Hero',row=er.row_used||'an earlier Lineage row',cardNameText=heroName(evt.card_id);
    return enqueue({id:'lineage_fallback_card_played',title:'Lineage Fallback — Open Card Played',expression:'advise',compact:true,priority:true,highlight:selector,interactionTarget:selector,requireInteraction:true,interactionWaitFor:'#infoOverlay.open',interactionWaitMode:'present',html:'<p><b>'+esc(source)+'</b> legally used <b>'+esc(cardNameText)+'</b> through its Lineage.</p><p>Select the highlighted Card Played tile. Its <b>Effect Row</b> records exactly which printed row Runtime used.</p>',onClose:function(){
      enqueue({id:'lineage_fallback_effect_row',title:'Lineage Effect Row Used',expression:'advise',compact:true,priority:true,allowDuringRuntimeModal:true,blockExternal:true,highlight:'#infoOverlay.open .played-audit-block',html:'<p>The source Hero is currently <b>'+esc(er.source_class||'a later Class')+' '+esc(er.source_rank||'')+'</b>, but this card resolved with the <b>'+esc(row)+'</b> row.</p><p>When a Skill has no exact row for the Hero’s current Class, Runtime uses the highest eligible earlier row from the same Lineage. Card Played displays this as <b>'+esc(er.match_type||'Legal lineage fallback')+'</b>.</p><p>This is where players can verify which effect text and value were actually applied.</p>',onClose:function(){
        enqueue({id:'lineage_fallback_close_detail',title:'Close Card Played Detail',expression:'calm',compact:true,priority:true,allowDuringRuntimeModal:true,allowModalContent:'#infoOverlay',highlight:'#infoClose',interactionTarget:'#infoClose',requireInteraction:true,interactionWaitFor:'#infoOverlay.open',interactionWaitMode:'absent',html:'<p>After reviewing the Effect Row, select <b>Close</b> to return to the battlefield.</p>'},true);
      }},true);
    }},true);
  }

  function explainOpponentPhaseGate(state){
    if(!state||state.turn!=='AI'||!bridge.getAIPhaseGate)return;
    var gate=bridge.getAIPhaseGate();if(Number(state.round||1)!==1){if(gate&&gate.waiting&&bridge.resumeAIPhase)bridge.resumeAIPhase();return;}
    if(!gate||!gate.waiting||!gate.phase||Number(gate.sequence)===Number(lastAIGateSequence))return;
    lastAIGateSequence=Number(gate.sequence);
    var copy={
      Draw:'The opponent draws 1 card, gains Mana equal to Mana Regen, and Readies eligible Heroes.',
      Deploy:'The opponent may prepare with Tactical Skills, Events, Items, active Traits, or other legal setup actions.',
      Battle:'The opponent may declare an Attack or release a Casting action. A Response Window opens when you are affected.',
      Reform:'The opponent may use recovery actions, Reposition, Legacy Abilities, or Tribute a Skill as EXP.',
      End:'The opponent resolves status damage, durations, and other end-of-turn effects before the turn returns to you.'
    };
    enqueue({id:'opponent_phase_'+gate.sequence,title:'Opponent — '+gate.phase+' Phase',expression:gate.phase==='Battle'?'serious':'calm',compact:true,dock:'top-left',highlight:'.phase-panel .phase-list .is-active',html:'<p>'+copy[gate.phase]+'</p>',nextLabel:'Continue AI',onNext:function(){closeActive();setTimeout(function(){bridge.resumeAIPhase();},80);}},true);
  }

  function syncReformGuide(state){
    if(!state||state.turn!=='PLAYER'||state.phase!=='Reform')return;
    var p=state.pending||{};
    if(reformGuide.stage==='opening_reposition'&&p.type==='manual_reposition'&&!seen.reform_reposition_cancel){
      reformGuide.stage='await_cancel';
      enqueue({id:'reform_reposition_cancel',title:'Be Careful: Reposition Exhausts Heroes',expression:'serious',compact:true,dock:'bottom-left',priority:true,allowDuringRuntimeModal:true,highlight:'#manualRepositionCancel',interactionTarget:'#manualRepositionCancel',requireInteraction:true,html:'<p><b>Be careful:</b> every Hero moved by a normal Reposition becomes Exhausted. A <b>Hero ↔ Hero</b> swap Exhausts both Heroes, while a <b>Hero ↔ Legacy</b> swap Exhausts only the Hero.</p><p>Select <b>Cancel</b> now to leave the formation unchanged.</p>',onClose:function(){reformGuide.stage='after_cancel';setTimeout(promptGuidedTribute,0);}},true);
    }
    if(reformGuide.stage==='opening_tribute'&&p.type==='tribute_target'&&!seen.reform_tribute_target){
      reformGuide.stage='await_target';var lanes=(p.legal_targets||bridge.getLegalTributeTargets('PLAYER',p.card_id)||[]),selectors=lanes.map(function(lane){return '.hero-panel[data-side="PLAYER"][data-lane="'+lane+'"]';});
      enqueue({id:'reform_tribute_target',title:'Choose Any Legal Hero',expression:'advise',compact:true,dock:'top-left',highlight:selectors,interactionTarget:selectors,requireInteraction:true,html:'<p>Select any highlighted allied Hero to receive the EXP.</p><p>A <b>normal Skill Tribute does not need to match</b> the Hero’s card color, Class, or Lineage.</p><p>Only an Ultimate is restricted to its specifically bound Hero. A Legacy cannot receive Tribute.</p>'});
    }
    if(state.tributeUsedThisReform&&reformGuide.stage!=='done'){
      reformGuide.stage='done';document.body.classList.remove('gl-tutorial-round-one-tribute-lock');
      enqueue({id:'tribute_done',title:'Tribute Complete',expression:'advise',compact:true,html:'<p>The selected Skill is now EXP beneath the Hero. Only one normal Tribute may be performed during each Reform Phase.</p>',onClose:function(){queuePhaseAdvance('Reform');}});
    }
  }

  function handleReformGuideClick(ev){
    var target=ev.target&&ev.target.closest?ev.target.closest('button, .hero-panel'):null;if(!target)return;
    if(reformGuide.stage==='await_reposition'&&target.id==='repositionButton'){
      reformGuide.stage='opening_reposition';clearHighlights();setTimeout(function(){syncReformGuide(bridge.getState());},0);return;
    }
    if(reformGuide.stage==='await_tribute_card'&&target.matches&&target.matches('.tribute-card-action')){
      var idx=Number(target.getAttribute('data-tribute-index')),state=bridge.getState(),hand=sideHand(state,'PLAYER');
      reformGuide.cardId=hand[idx]||null;reformGuide.handIndex=idx;reformGuide.stage='opening_tribute';clearHighlights();setTimeout(function(){syncReformGuide(bridge.getState());},120);return;
    }
  }

  function queueLegacyModeTutorial(side,lane,hero){
    var panel='.hero-panel[data-side="'+side+'"][data-lane="'+lane+'"]';
    enqueue({id:'legacy_mode',title:'Hero Defeated — Legacy Enters',expression:'serious',highlight:panel,html:'<p>The first defeated Hero is replaced by a matching <b>Legacy Card</b>.</p><p>A Legacy is not a Hero: it has no HP, Rank, EXP, status, Exhaust, or Attachment Slots, and it cannot be attacked as a normal Hero.</p><p>Its purpose is to keep matching Skill Cards useful. During Deploy or Reform, a legal Legacy Ability discards the required matching Skill as its cost without paying that Skill’s Mana cost.</p><p>The <b>!</b> beside the Legacy name remains available if you later want to review the defeated Hero, but opening that preview is not a mandatory tutorial step.</p>'});
  }

  function isTrueReviveTransition(before,after){
    if(!before||!after||!before.legacy_mode||after.legacy_mode)return false;
    var snapshot=before.defeated_hero_snapshot||{},revivedId=text(snapshot.card_id||before.original_hero_card_id);
    return !!revivedId&&revivedId===text(after.card_id);
  }
  function isTrueLegacyEntryTransition(before,after){
    if(!before||!after||before.legacy_mode||!after.legacy_mode)return false;
    var snapshot=after.defeated_hero_snapshot||{},defeatedId=text(snapshot.card_id||after.original_hero_card_id);
    return !!defeatedId&&defeatedId===text(before.card_id);
  }
  function rankNumberForCard(cardId){
    var c=cardInfo(cardId),identity=c.identity||{},raw=text(identity.rank||c.rank_numeric||'').toUpperCase();
    if(/III/.test(raw))return 3;if(/II/.test(raw))return 2;if(/(^|\s)I($|\s)/.test(raw))return 1;
    var n=Number(raw.replace(/[^0-9]/g,''));return Number.isFinite(n)?n:0;
  }
  function trueRankUpTransition(before,after){
    if(!before||!after||before.legacy_mode||after.legacy_mode||text(before.card_id)===text(after.card_id))return false;
    var beforeRank=rankNumberForCard(before.card_id),afterRank=rankNumberForCard(after.card_id);
    if(!beforeRank||afterRank!==beforeRank+1)return false;
    if(before.instance_id&&after.instance_id&&text(before.instance_id)!==text(after.instance_id))return false;
    var beforeCard=cardInfo(before.card_id),afterCard=cardInfo(after.card_id),beforeLineage=text((beforeCard.identity||{}).fixed_class_lineage_id||beforeCard.fixed_class_lineage_id),afterLineage=text((afterCard.identity||{}).fixed_class_lineage_id||afterCard.fixed_class_lineage_id);
    return !beforeLineage||!afterLineage||beforeLineage===afterLineage;
  }
  function explainReviveEvent(state){
    var evt=state&&state.lastReviveEvent;if(!evt||evt.side!=='PLAYER'||!evt.id||text(evt.id)===lastReviveEventId||seen.revive||queued.revive)return false;
    lastReviveEventId=text(evt.id);
    var lane=text(evt.lane||'').toUpperCase(),selector='.hero-panel[data-side="PLAYER"][data-lane="'+lane+'"]';
    return enqueue({id:'revive',title:'Hero Revived',expression:'calm',priority:true,highlight:selector,html:'<p><b>'+esc(heroName(evt.card_id))+'</b> returned to the field'+(evt.from_legacy?' and its Legacy Card returned to the Legacy Deck':'')+'.</p><p>The Hero keeps its current Rank. EXP Cards, statuses, Attachments, and active Casting from before defeat are cleared. The Revive effect determines the restored HP and whether the Hero returns Ready or Exhausted.</p>'});
  }

  function heroDiffs(prev,state){
    if(!prev||!state)return;
    ['PLAYER','AI'].forEach(function(diffSide){var oldHeroes=sideHeroes(prev,diffSide),nowHeroes=sideHeroes(state,diffSide);
    ['LEFT','CENTER','RIGHT'].forEach(function(lane){
      var a=oldHeroes[lane],b=nowHeroes[lane];if(!a||!b)return;
      if(diffSide==='AI'){
        if(a.card_id===b.card_id&&Number(b.hp)<Number(a.hp)&&seen.play_practice_attack_complete&&!seen.attack_damage_result&&!queued.attack_damage_result){
          var dealt=Math.max(0,Number(a.hp)-Number(b.hp));
          enqueue({id:'attack_damage_result',title:'Attack Damage Resolved',expression:'serious',compact:true,highlight:['.hero-panel[data-side="AI"][data-lane="'+lane+'"]','.card-played-panel'],html:'<p>Your real Attack has finished resolving and reduced this Hero by <b>'+dealt+' HP</b>.</p><p>Responses and modifiers are applied before the final HP change. The completed action is also recorded in <b>Card Played</b>.</p>'});
        }
        var oldLegacyAI=!!a.legacy_mode,newLegacyAI=!!b.legacy_mode;if(!oldLegacyAI&&newLegacyAI&&isTrueLegacyEntryTransition(a,b)&&!seen.legacy_mode&&!queued.legacy_mode){queueLegacyModeTutorial(diffSide,lane,b);}return;
      }
      if(!a.exhausted&&b.exhausted&&!seen.hero_exhaust){
        enqueue({id:'hero_exhaust',title:'Hero Exhausted',expression:'serious',highlight:'.hero-panel[data-side="PLAYER"][data-lane="'+lane+'"]',html:'<p>This Hero became Exhausted after being used as the source of a Skill, Event, or active ability. An Exhausted Hero cannot perform another normal active action until it becomes Ready.</p>'});
      }
      if(a.exhausted&&!b.exhausted&&!seen.hero_ready){
        enqueue({id:'hero_ready',title:'Hero Ready',expression:'calm',highlight:'.hero-panel[data-side="PLAYER"][data-lane="'+lane+'"]',html:'<p>The Hero became Ready during Draw Phase and can act again.</p>'});
      }
      var oldStatuses=a.statuses||[],newStatuses=b.statuses||[];
      newStatuses.forEach(function(st){var name=st.name||st.status||'Status';if(!isPlayerFacingTimedStatus(name))return;var old=oldStatuses.find(function(x){return (x.name||x.status)===name;});if(old&&Number(st.duration)<Number(old.duration)&&!seen['status_tick_'+name])enqueue({id:'status_tick_'+name,title:name+' Duration',expression:'serious',highlight:'.negative-status-indicator button[aria-label^="'+name+'"]',html:'<p>'+esc(statusTickCopy(name))+'</p>'});});
      oldStatuses.forEach(function(st){var name=st.name||st.status||'Status';if(!isPlayerFacingTimedStatus(name))return;var stillThere=newStatuses.some(function(x){return (x.name||x.status)===name;});if(!stillThere&&!seen['status_tick_'+name])enqueue({id:'status_tick_'+name,title:name+' Ended',expression:'calm',highlight:'.hero-panel[data-side="PLAYER"][data-lane="'+lane+'"]',html:'<p>'+esc(statusTickCopy(name))+' The status has now ended.</p>'});});
      var oldAtt=(a.attachments||[]).filter(Boolean),newAtt=(b.attachments||[]).filter(Boolean);if(newAtt.length>oldAtt.length&&!seen.attachment){enqueue({id:'attachment',title:'Attachment',expression:'advise',highlight:'.hero-panel[data-side="PLAYER"][data-lane="'+lane+'"] .slot.filled',html:'<p>When a card effect remains active beyond the phase in which it was used, the card stays in an <b>Attachment Slot</b>.</p><p>Its duration, charges, release condition, or removal rule determines when it leaves the slot.</p>'});}
      if(a.card_id===b.card_id&&Number(b.hp)>Number(a.hp)&&!seen.healing){enqueue({id:'healing',title:'Healing',expression:'calm',highlight:'.hero-panel[data-side="PLAYER"][data-lane="'+lane+'"]',html:'<p>Healing restores HP, but cannot raise a Hero above its maximum HP. Bleed prevents healing while it remains active.</p>'});}
      var oldLegacy=!!a.legacy_mode,newLegacy=!!b.legacy_mode;
      if(!oldLegacy&&newLegacy&&isTrueLegacyEntryTransition(a,b)&&!seen.legacy_mode&&!queued.legacy_mode){queueLegacyModeTutorial('PLAYER',lane,b);}
      if(oldLegacy&&!newLegacy&&isTrueReviveTransition(a,b)&&!seen.revive&&!queued.revive){explainReviveEvent(state);}
      if(trueRankUpTransition(a,b)){explainRankUp(lane,a,b);}
    });});
    explainReposition(prev,state);
    if(Number(state.racial)<Number(prev.racial)&&!seen.racial_token_flip){enqueue({id:'racial_token_flip',title:'Racial Token Spent',expression:'advise',highlight:'[data-zone-side="PLAYER"][data-zone-type="Racial Token"], .racial-coins--hand[data-racial-side="PLAYER"]',html:'<p>A Racial Trait was used. One token flipped from its available face to its spent face.</p><p>Only 1 Racial Token may be spent during a global turn.</p>'});}
    if(Number(state.racial)>Number(prev.racial)&&!seen.racial_token_restore){enqueue({id:'racial_token_restore',title:'Racial Token Restored',expression:'calm',highlight:'[data-zone-side="PLAYER"][data-zone-type="Racial Token"], .racial-coins--hand[data-racial-side="PLAYER"]',html:'<p>An effect restored a Racial Token, so that token is available again.</p>'});}
    if(!prev.tributeUsedThisReform&&state.tributeUsedThisReform&&reformGuide.stage===null&&!seen.tribute_done){enqueue({id:'tribute_done',title:'Tribute Complete',expression:'advise',compact:true,html:'<p>The selected Skill Card is now EXP beneath the Hero. Only one Tribute may be performed during each Reform Phase.</p>'});}
  }

  function statusTickCopy(name){
    name=text(name);
    if(name==='Poison')return 'Poison dealt its End Phase damage, then its duration decreased by 1.';
    if(name==='Burn')return 'Burn adds damage when an Attack connects. Its duration has now decreased by 1.';
    if(name==='Freeze')return 'Freeze prevents Reposition and Dodge. Its duration has now decreased by 1.';
    if(name==='Stun')return 'Stun prevents normal active actions. Its duration has now decreased by 1.';
    if(name==='Bleed')return 'Bleed prevents healing. Its duration has now decreased by 1.';
    return 'This timed status was processed and its remaining duration decreased.';
  }

  function explainRankUp(lane,before,after){
    var c=cardInfo(after.card_id),id='rank_up_'+after.card_id;if(seen[id])return;
    beginPackage('rank_up');
    var identity=c.identity||{},rank=identity.rank||'a higher Rank',draw=/II/.test(rank)?2:3;
    enqueue({id:id,package:'rank_up',priority:true,title:'Rank Up — '+rank,expression:'calm',highlight:'.hero-panel[data-side="PLAYER"][data-lane="'+lane+'"]',html:'<p><b>'+esc(heroName(after.card_id))+'</b> reached '+esc(rank)+'. EXP Cards beneath the Hero move to the Discard Pile.</p><p>You draw '+draw+' cards and gain +1 Mana Regen. The Mana Pool itself does not increase from Rank Up.</p><p>Complete this Rank Up explanation before reviewing any cards drawn by its reward.</p>',onClose:function(){explainClassAfterRankUp(lane,after.card_id,'rank_up');}});
  }
  function classAbilityFromCard(c){
    c=c||{};if(c.class_ability&&c.class_ability.name)return c.class_ability;
    var rows=(c.printed&&c.printed.rows)||(c.printed&&c.printed.blocks)||[];
    var row=rows.find(function(r){return r&&r.kind==='class_ability';});
    return row?{name:row.name||text(row.label).replace(/^Class Ability\s*[—:-]\s*/i,''),text:row.text||'',action:row.action||null}:{};
  }
  function activeClassLineages(c){
    c=c||{};var identity=c.identity||{},raw=identity.active_class_lineage||c.active_class_lineage||c.class_lineage||'';
    return Array.isArray(raw)?raw:text(raw).split(/[;,]/).map(function(x){return x.trim();}).filter(Boolean);
  }
  function isPassiveClassAbility(ability){
    var type=text(ability&&ability.action&&ability.action.type),body=text(ability&&ability.text);
    if(/passive/i.test(type))return true;
    return !/(during|once per turn|you may|spend|choose|target|exhaust this hero afterward)/i.test(body);
  }
  function explainClassAfterRankUp(lane,cardId,packageName){
    var c=cardInfo(cardId),ability=classAbilityFromCard(c),lineages=activeClassLineages(c);
    if(lineages.indexOf('Warrior')!==-1&&lineages.indexOf('Cleric')!==-1&&!seen.hybrid_lineage){
      enqueue({id:'hybrid_lineage',package:packageName||null,title:'Dual Class Lineage',expression:'advise',highlight:'.hero-panel[data-side="PLAYER"][data-lane="'+lane+'"]',html:'<p>This Hero now has both <b>Warrior</b> and <b>Cleric</b> Lineages. It can use legal Skills from either lineage, in addition to its current Class requirements.</p>'});
    }
    if(ability.name&&isPassiveClassAbility(ability)){
      var abilityKey='class_ability_'+text(ability.name).toLowerCase().replace(/[^a-z0-9]+/g,'_');
      if(/Range Attack/i.test(ability.name+' '+text(ability.text||''))){
        // Teach this passive at the first real Physical Attack target selection where it visibly
        // adds an opponent outside the source Hero's normal Area of Attack.
        return;
      }else{
        enqueue({id:abilityKey,package:packageName||null,title:'Passive Class Ability — '+ability.name,expression:'advise',highlight:'.hero-panel[data-side="PLAYER"][data-lane="'+lane+'"]',html:'<p>'+esc(ability.text||'This Hero gained a new passive Class Ability.')+'</p><p>It applies automatically when its condition is relevant and does not need a button.</p>'});
      }
    }
  }

  function explainReposition(prev,state){
    if(seen.reposition)return;
    var a=sideHeroes(prev,'PLAYER'),b=sideHeroes(state,'PLAYER'),old=[a.LEFT&&a.LEFT.instance_id,a.CENTER&&a.CENTER.instance_id,a.RIGHT&&a.RIGHT.instance_id],now=[b.LEFT&&b.LEFT.instance_id,b.CENTER&&b.CENTER.instance_id,b.RIGHT&&b.RIGHT.instance_id];
    if(old.filter(Boolean).sort().join('|')===now.filter(Boolean).sort().join('|')&&old.join('|')!==now.join('|'))enqueue({id:'reposition',title:'Reposition Complete',expression:'advise',highlight:'.hero-row--player',html:'<p>Normal Reposition Exhausts every moved Hero. A <b>Hero ↔ Hero</b> swap Exhausts both Heroes, while a <b>Hero ↔ Legacy</b> swap Exhausts only the Hero.</p><p>Reposition does not change Hero Rank and does not count as defeat, Legacy entry, or Revive.</p>'});
  }

  function pendingDefeat(state){
    var p=state&&state.pending||{};
    if(p.type==='racial_stoneblood'&&!seen.stoneblood_survival&&!queued.stoneblood_survival){
      var stoneChoices='#choiceOverlay.open [data-stoneblood-choice]';
      if(!q(stoneChoices))return;
      enqueue({id:'stoneblood_survival',title:'Racial Trait — Stoneblood',expression:'serious',compact:true,priority:true,allowDuringRuntimeModal:true,highlight:stoneChoices,interactionTarget:stoneChoices,requireInteraction:true,html:'<p>This Dwarf Hero would be defeated. <b>Stoneblood</b> may spend 1 Racial Token to prevent defeat and remain at 10 HP while preserving EXP, statuses, Attachments, and Exhaust.</p><p>Choose whether to spend the token or continue the defeat. Closing this Arvon message only hides the explanation; the Stoneblood choice remains open.</p>'},true);return;
    }
    if(p.type==='legacy_defeat_choice'&&!seen.hero_defeated){enqueue({id:'hero_defeated',title:'Hero Defeated',expression:'serious',priority:true,allowDuringRuntimeModal:true,highlight:'#choiceOverlay [data-legacy-defeat-choice]',interactionTarget:'#choiceOverlay [data-legacy-defeat-choice]',requireInteraction:true,html:'<p>Your Hero has been defeated. Its EXP Cards, Attachments, statuses, and active Casting are cleared.</p><p>Select one matching Legacy Card to replace the defeated Hero’s position.</p>',onClose:function(){enqueue({id:'hero_defeated_confirm',title:'Confirm the Legacy',expression:'serious',compact:true,priority:true,allowDuringRuntimeModal:true,highlight:'#choiceConfirm:not([disabled])',interactionTarget:'#choiceConfirm:not([disabled])',requireInteraction:true,interactionWaitFor:'#choiceOverlay.open',interactionWaitMode:'absent',html:'<p>Select <b>Enter Legacy Mode</b> to complete the mandatory replacement.</p>'},true);}},true);}
  }

  function explainLegacyAvailability(state){
    if(!state||state.turn!=='PLAYER'||(state.phase!=='Deploy'&&state.phase!=='Reform')||state.pending||state.responseWindow||seen.legacy_ability_available)return;
    ['LEFT','CENTER','RIGHT'].some(function(lane){
      var abilities=bridge.getActivatedLegacyAbilities('PLAYER',lane);if(!abilities.length)return false;
      enqueue({id:'legacy_ability_available',title:'Legacy Ability Available',expression:'advise',highlight:['.hero-panel[data-side="PLAYER"][data-lane="'+lane+'"]','.legacyAbilityAction'],html:'<p>This Legacy can now use its Ability because your Hand contains the required matching Skill Card.</p><p>Select the Legacy, choose the matching Skill as its cost, then resolve the effect. The Skill’s printed Mana cost is not paid.</p>'});return true;
    });
  }

  function explainActivatedClassAvailability(state){
    if(!state||state.turn!=='PLAYER'||state.phase!=='Deploy'||state.pending||state.responseWindow)return;
    ['LEFT','CENTER','RIGHT'].some(function(lane){
      var list=bridge.getActivatedClassAbilities('PLAYER',lane);if(!list.length)return false;
      var ability=list[0]||{},name=text(ability.name||ability.label||ability.abilityName||'Class Ability'),key='activated_class_'+name.toLowerCase().replace(/[^a-z0-9]+/g,'_');if(seen[key]||queued[key])return false;
      var holy=/Holy Resurgence/i.test(name+' '+text(ability.text||''));
      enqueue({id:key,title:'Class Ability — '+name,expression:'advise',highlight:['.hero-panel[data-side="PLAYER"][data-lane="'+lane+'"]','.classAbilityAction'],html:holy?'<p><b>Holy Resurgence</b> is available now during Deploy Phase. Spend 1 Mana to heal a legal allied Hero for 10 HP, then this Hero becomes Exhausted.</p><p>The button appears only while its timing, target, and cost are legal.</p>':'<p>This active Class Ability is available now during Deploy Phase. Its timing, target, cost, and Exhaust result come from the Hero Card.</p>'});return true;
    });
  }

  function firstAvailableRacial(state){
    if(!state||state.turn!=='PLAYER'||state.pending||state.responseWindow||typeof bridge.getActivatedRacialAbilities!=='function')return null;
    var found=null;['LEFT','CENTER','RIGHT'].some(function(lane){
      var abilities=bridge.getActivatedRacialAbilities('PLAYER',lane)||[];
      if(!abilities.length)return false;
      var ability=abilities[0],id=text(ability.abilityId||ability.ability_id),selector='.racialAbilityAction[data-racial-side="PLAYER"][data-racial-lane="'+lane+'"][data-racial-id="'+id+'"]';
      if(!q(selector))return false;found={lane:lane,ability:ability,selector:selector};return true;
    });
    return found;
  }
  function explainRacialAvailability(state,force){
    if(!state||state.turn!=='PLAYER'||state.pending||state.responseWindow||seen.racial_available||queued.racial_available||(active&&active.id==='racial_available'))return false;
    var pick=firstAvailableRacial(state);if(!pick)return false;
    return enqueue({id:'racial_available',title:'Racial Trait Available',expression:'advise',priority:!!force,highlight:pick.selector,html:'<p><b>'+esc(pick.ability.label||pick.ability.name||'A Racial Trait')+'</b> is currently legal for the highlighted Hero.</p><p>Racial Traits use the Hero as their source but do not normally Exhaust it. Most active Traits spend 1 Racial Token, and only 1 Racial Token may be spent by a player during a global turn.</p><p>Close this explanation, then choose whether to use the Trait.</p>'},!!force);
  }
  function guardFirstRacialExplanation(ev){
    var btn=ev.target&&ev.target.closest&&ev.target.closest('[data-racial-id]');if(!btn||seen.racial_available)return;
    var state=bridge.getState();if(!state||state.turn!=='PLAYER')return;
    blockEvent(ev);explainRacialAvailability(state,true);
  }

  function playerCastingInspection(evt,stage){
    stage=text(stage).toUpperCase();
    var selector=castingTileSelector(evt,'PLAYER',stage);if(!selector)return false;
    var started=stage==='STARTED',id=started?'player_casting_started':'player_casting_resolved';
    if(seen[id]||queued[id])return false;
    return enqueue({id:id,title:started?'Casting Attack Started — Card Played':'Casting Attack Resolved — Card Played',expression:'serious',compact:true,priority:true,highlight:selector,interactionTarget:selector,requireInteraction:true,interactionWaitFor:'#infoOverlay.open',interactionWaitMode:'present',html:started?'<p>Your Casting created its first Card Played tile. Select it to review the source and the tactical position that is locked.</p><p>The position is locked, not the current Hero identity.</p>':'<p>Your Casting created a second, separate resolve tile. Select it to review the current occupant of the locked position, Responses, damage, and result.</p><p>If a Legacy occupies that position, the Casting still resolves but deals no Hero damage there.</p>',onClose:function(){enqueue({id:id+'_close',title:'Read, Then Close',expression:'calm',compact:true,priority:true,allowDuringRuntimeModal:true,allowModalContent:'#infoOverlay',highlight:'#infoClose',interactionTarget:'#infoClose',requireInteraction:true,interactionWaitFor:'#infoOverlay.open',interactionWaitMode:'absent',html:'<p>Read the complete Casting '+(started?'start':'resolve')+' detail, then select <b>Close</b>.</p>'},true);}},true);
  }
  function explainPlayerActions(state){
    var list=state&&state.playerPlayedEvents||[];
    var castEvt=list.find(function(e){
      if(!e)return false;var stage=text(e.casting_stage).toUpperCase(),label=text(e.label).toUpperCase();
      if(label==='CAST'&&stage==='STARTED')return !seen.player_casting_started&&!queued.player_casting_started;
      if(label==='RESOLVE'&&stage==='RESOLVED')return !seen.player_casting_resolved&&!queued.player_casting_resolved;
      return false;
    });
    if(castEvt){if(playerCastingInspection(castEvt,text(castEvt.casting_stage)))lastPlayerActionCount=list.length;return;}
    if(list.length<=lastPlayerActionCount){lastPlayerActionCount=list.length;return;}
    var evt=list[0];if(!evt){lastPlayerActionCount=list.length;return;}
    lastPlayerActionCount=list.length;
  }

  function isPlayerFacingTimedStatus(name){
    return ['Burn','Freeze','Poison','Stun','Bleed'].indexOf(text(name))>=0;
  }

  function statusEffectCopy(name){
    var map={Burn:'When this Hero takes Attack damage, that Attack deals 10 additional damage.',Freeze:'This Hero cannot Reposition, move, or use Dodge.',Poison:'This Hero takes 10 damage during its End Phase before the duration decreases.',Stun:'This Hero cannot be used as the source of Skills, Items, Events, Abilities, or active effects.',Bleed:'This Hero cannot receive healing while Bleed remains active.'};return map[name]||'This status remains active for its shown duration.';
  }
  function explainCurrentStatusIcons(state){
    if(!state||state.pending||state.responseWindow)return;
    var heroes=sideHeroes(state,'PLAYER');['LEFT','CENTER','RIGHT'].some(function(lane){var h=heroes[lane];if(!h)return false;return (h.statuses||[]).some(function(st){var name=st.name||st.status||'Status';if(!isPlayerFacingTimedStatus(name))return false;var key='status_applied_'+name;if(seen[key]||queued[key])return false;var selector='.hero-panel[data-side="PLAYER"][data-lane="'+lane+'"] .negative-status-indicator button[aria-label^="'+name+'"]';if(!q(selector))return false;enqueue({id:key,title:name+' Applied',expression:'serious',highlight:selector,hoverTarget:selector,html:'<p>Move your cursor over the highlighted <b>'+esc(name)+'</b> icon to see its remaining duration.</p><p>'+esc(statusEffectCopy(name))+'</p>'});return true;});});
  }
  function cardRequiresSource(cardId){
    var c=cardInfo(cardId),leg=c&&c.canonical_legality||{},src=c&&c.source_requirement||leg.source_requirement||{};
    return !!(c&&(c.source_required===true||leg.source_required===true||src.source_validator_required===true||src.source_mode==='Hero Mode only'));
  }
  function cardRequiresTarget(cardId){
    var c=cardInfo(cardId),leg=c&&c.canonical_legality||{},targeting=c&&c.targeting||{},resolver=c&&c.runtime_resolver&&c.runtime_resolver.target||{};
    return !!(c&&(c.target_required===true||leg.target_required===true||targeting.requires_selected_target===true||resolver.requires_target_ui===true));
  }
  function isDeckOpeningCard(cardId){
    var c=cardInfo(cardId),category=text(c&&c.action_category),tags=text(c&&c.runtime_tags),effects=(c&&((c.effects&&c.effects.length?c.effects:c.effect)||[]))||[];
    if(/deck|hidden info/i.test(category)||/DECK_SEARCH|SEARCH_DECK/i.test(tags))return true;
    return effects.some(function(e){return /search_deck|deck_search|inspect_deck|reorder_deck|reveal_top|look_at_top/i.test(text(e&&e.kind));});
  }
  function legalPlayCards(state){
    var hand=sideHand(state,'PLAYER'),seenIds=Object.create(null),out=[];
    bridge.getLegalActions('PLAYER').forEach(function(a){
      if(!a||a.type!=='PLAY_CARD'||seenIds[a.card_id])return;var idx=hand.indexOf(a.card_id);if(idx<0)return;
      seenIds[a.card_id]=true;out.push({cardId:a.card_id,handIndex:idx,family:family(a.card_id),subtype:subtype(a.card_id)});
    });
    return out;
  }
  function practiceCategory(cardId){
    var sub=text(subtype(cardId)),fam=family(cardId);
    if(bridge.isAttackCard(cardId))return 'Attack';
    if(/Support/i.test(sub))return 'Support';
    if(/Tactical/i.test(sub))return 'Tactical';
    if(fam==='Event')return 'Event';
    if(fam==='Item')return 'Item';
    return fam||'Card';
  }
  function practiceKey(category){return text(category).toLowerCase().replace(/[^a-z0-9]+/g,'_');}
  function practiceCompleteKey(category){return 'play_practice_'+practiceKey(category)+'_complete';}
  function anatomyReadyForPractice(cardId){
    var category=practiceCategory(cardId),key=(category==='Attack'||category==='Support'||category==='Tactical')?'skill':anatomyKey(category);
    return !!seen['anatomy_'+key];
  }
  function practiceCandidate(state){
    var candidates=legalPlayCards(state).filter(function(p){
      p.category=practiceCategory(p.cardId);
      return ['Attack','Support','Tactical','Event','Item'].indexOf(p.category)!==-1&&anatomyReadyForPractice(p.cardId)&&!seen[practiceCompleteKey(p.category)]&&!queued[practiceCompleteKey(p.category)];
    });
    candidates.sort(function(a,b){return a.handIndex-b.handIndex;});
    if(!candidates.length)return null;
    var pick=candidates[0];
    pick.family=pick.category;
    pick.requiresSource=cardRequiresSource(pick.cardId);
    pick.requiresTarget=cardRequiresTarget(pick.cardId);
    pick.directCommit=!pick.requiresSource&&!pick.requiresTarget;
    return pick;
  }
  function completeMandatoryPlayPreview(){
    var category=playGuide.family||practiceCategory(playGuide.cardId),doneKey=practiceCompleteKey(category);
    markSeen(doneKey);
    markSeen('play_button_meaning');
    playGuide={stage:'done',cardId:null,handIndex:null,family:null,requiresSource:false,requiresTarget:false,directCommit:false};
    deployNoPlayTicks=0;
  }
  function practiceMessageId(base){return base+'_'+practiceKey(playGuide.family||practiceCategory(playGuide.cardId));}
  function queuePracticeCancel(boundary){
    playGuide.stage='await_cancel';
    var id=practiceMessageId('play_practice_'+boundary+'_cancel');
    var boundaryCopy='';
    if(boundary==='target')boundaryCopy='<p><b>This is the last cancellable step.</b> Selecting one of the highlighted targets would commit the action, pay its cost, and remove <b>Cancel Action</b>.</p>';
    else if(boundary==='source')boundaryCopy='<p><b>This is the last cancellable step.</b> This card resolves after its acting Hero is chosen, so selecting a highlighted source would commit the action and remove <b>Cancel Action</b>.</p>';
    enqueue({id:id,title:'Cancel This Practice Action',expression:'serious',compact:true,dock:'top-left',priority:true,highlight:'#cancelActionButton',interactionTarget:'#cancelActionButton',requireInteraction:true,html:'<p>You have reached the final preview step for <b>'+esc(heroName(playGuide.cardId))+'</b>.</p>'+boundaryCopy+'<p>Select <b>Cancel Action</b> now. No Mana is paid, no Hero becomes Exhausted, and the card remains in your Hand for normal use later.</p>',onClose:completeMandatoryPlayPreview},true);
  }
  function pendingTargetSelectors(pending){
    var side=pending.target_side||'PLAYER',lanes=pending.legal_targets||[];
    return lanes.map(function(lane){return '.hero-panel[data-side="'+side+'"][data-lane="'+lane+'"]';});
  }
  function syncPlayableCardGuide(state){
    if(!state||state.turn!=='PLAYER'||!playGuide.stage||playGuide.stage==='done'||playGuide.stage==='direct_info'||playGuide.stage==='await_cancel')return;
    var pending=state.pending||{};
    if(pending.card_id!==playGuide.cardId)return;
    if(pending.type==='source_selection'){
      if(playGuide.stage!=='await_pending'&&playGuide.stage!=='await_source')return;
      var lanes=pending.legal_sources||[];
      var sources=lanes.map(function(lane){return '.hero-panel[data-side="PLAYER"][data-lane="'+lane+'"]';});
      if(!sources.length)return;
      if(playGuide.requiresTarget){
        playGuide.stage='await_source';
        var sourceId=practiceMessageId('play_practice_choose_source');
        if(seen[sourceId]||queued[sourceId])return;
        enqueue({id:sourceId,title:'Choose a Legal Source Hero',expression:'advise',compact:true,dock:'top-left',priority:true,highlight:sources,interactionTarget:sources,requireInteraction:true,interactionStateCheck:function(){var current=bridge.getState(),p=current&&current.pending||{};return p.card_id===playGuide.cardId&&p.type!=='source_selection';},html:'<p>The highlighted Heroes are legal acting sources for <b>'+esc(heroName(playGuide.cardId))+'</b>.</p><p>Select one source to reveal the card’s next target step. Source selection is still pre-commit, so the Tutorial can cancel the action afterward.</p>',onClose:function(){playGuide.stage='await_source';}},true);
      }else{
        playGuide.stage='source_info';
        var infoId=practiceMessageId('play_practice_source_boundary');
        if(seen[infoId]||queued[infoId])return;
        enqueue({id:infoId,title:'Available Source Heroes',expression:'advise',compact:true,dock:'top-left',priority:true,highlight:sources,blockExternal:true,html:'<p>The highlighted Heroes are legal acting sources for <b>'+esc(heroName(playGuide.cardId))+'</b>.</p><p>This card resolves when its source is selected, so do not choose one during the demonstration.</p>',onClose:function(){queuePracticeCancel('source');}},true);
      }
      return;
    }
    if(['target_selection','exact_two_target_selection','double_casting_target_selection','scouting_target_selection'].indexOf(pending.type)!==-1){
      if(playGuide.stage!=='await_pending'&&playGuide.stage!=='await_target'&&playGuide.stage!=='await_source')return;
      var targets=pendingTargetSelectors(pending);
      if(!targets.length)return;
      playGuide.stage='target_info';
      var targetId=practiceMessageId('play_practice_target_boundary');
      if(seen[targetId]||queued[targetId])return;
      var side=pending.target_side||'PLAYER';
      var targetKind=side==='AI'?'opponent target':'allied target';
      enqueue({id:targetId,title:'Available '+(side==='AI'?'Opponent':'Allied')+' Targets',expression:'advise',compact:true,dock:'top-left',priority:true,highlight:targets,blockExternal:true,html:'<p>The highlighted Heroes or slots are the legal '+targetKind+' options for <b>'+esc(heroName(playGuide.cardId))+'</b>.</p><p>This is the final step before commitment. Do not select a target: selecting one would commit the action and remove <b>Cancel Action</b>.</p>',onClose:function(){queuePracticeCancel('target');}},true);
    }
  }
  function startAdaptivePlayPractice(state){
    if(!seen.initial_anatomy_complete||!state||state.turn!=='PLAYER'||['Deploy','Battle','Reform'].indexOf(state.phase)===-1||state.pending||state.responseWindow||anatomy.initialSequence||anatomy.activeFamily||anatomy.waitingFamily||isPreviewOpen()||active||queue.length||(playGuide.stage&&playGuide.stage!=='done'))return false;
    if(state.phase==='Battle'&&Number(state.round||1)===1)return false;
    var pick=practiceCandidate(state);if(!pick)return false;
    var playSelector='.play-card-action[data-play-index="'+pick.handIndex+'"]';if(!q(playSelector))return false;
    playGuide={stage:pick.directCommit?'direct_info':'await_play',cardId:pick.cardId,handIndex:pick.handIndex,family:pick.category,requiresSource:pick.requiresSource,requiresTarget:pick.requiresTarget,directCommit:pick.directCommit};
    var suffix=practiceKey(pick.category);
    if(pick.directCommit){
      enqueue({id:'play_practice_direct_commit_'+suffix,title:'This Card Commits on Play',expression:'serious',compact:true,dock:'top-left',highlight:['.hand-card[data-hand-index="'+pick.handIndex+'"]',playSelector],blockExternal:true,html:'<p><b>'+esc(heroName(pick.cardId))+'</b> has no source or target selection step.</p><p>Selecting <b>Play</b> would immediately commit and resolve the card, so there is no cancellable preview state. This demonstration stops before Play; close this explanation and use the card normally later if desired.</p>',onClose:completeMandatoryPlayPreview},true);
      return true;
    }
    enqueue({id:'play_practice_start_'+suffix,title:'Let’s Try Playing a '+esc(pick.category)+' Card',expression:'advise',compact:true,highlight:['.hand-card[data-hand-index="'+pick.handIndex+'"]',playSelector],interactionTarget:playSelector,requireInteraction:true,html:'<p>Select <b>Play</b> to begin using <b>'+esc(heroName(pick.cardId))+'</b>.</p><p>The Tutorial will follow this '+esc(pick.category)+' card only until its final cancellable step, then require <b>Cancel Action</b> before it can resolve.</p>',onClose:function(){playGuide.stage='await_pending';}},true);
    return true;
  }
  function explainFirstPlayButton(state){
    var started=startAdaptivePlayPractice(state);
    if(started)return true;
    if(!state||state.turn!=='PLAYER'||state.phase!=='Deploy'||state.pending||state.responseWindow||active||queue.length)return false;
    if(!seen.deploy_play_review_complete){deployNoPlayTicks+=1;if(deployNoPlayTicks>=3)markSeen('deploy_play_review_complete');}
    return false;
  }

  function firstPlayableFamilyTutorial(state){
    return false;
  }


  function explainCancelAction(state){
    // Cancel Action is taught once per playable card category: Attack, Support, Tactical, Event, and Item.
    // Later cards in the same category proceed normally without another forced cancellation.
    return false;
  }

  function maybeQueueDeployAdvance(state){
    if(!deployAdvancePending||!state||state.turn!=='PLAYER'||state.phase!=='Deploy'||seen.next_phase_deploy||queued.next_phase_deploy)return;
    if(active||queue.length||anatomy.initialSequence||anatomy.activeFamily||anatomy.waitingFamily||isPreviewOpen()||state.pending||state.responseWindow)return;
    queuePhaseAdvance('Deploy');deployAdvancePending=false;
  }

  function normalAttackCoverage(lane){
    lane=text(lane).toUpperCase();
    if(lane==='LEFT')return['LEFT','CENTER'];
    if(lane==='RIGHT')return['CENTER','RIGHT'];
    return['LEFT','CENTER','RIGHT'];
  }
  function explainMarksmanRangeTargeting(state){
    if(!state||!state.pending||active||queue.length||seen.range_attack_live_targeting||queued.range_attack_live_targeting)return false;
    if(playGuide.stage&&playGuide.stage!=='done')return false;
    var p=state.pending;if(p.type!=='target_selection'||p.source_side!=='PLAYER'||p.target_side!=='AI'||!p.source_lane||!p.card_id)return false;
    if(!/Physical Attack/i.test(subtype(p.card_id)))return false;
    var source=sideHeroes(state,'PLAYER')[p.source_lane],heroCard=source&&cardInfo(source.card_id),ability=classAbilityFromCard(heroCard),abilityText=text((ability&&ability.name)||'')+' '+text((ability&&ability.text)||'');
    if(!/Range Attack/i.test(abilityText))return false;
    var normal=normalAttackCoverage(p.source_lane),legal=(p.legal_targets||[]).map(function(x){return text(x).toUpperCase();}),extra=legal.filter(function(l){return normal.indexOf(l)===-1;});
    if(!extra.length)return false;
    var sourceSelector='.hero-panel[data-side="PLAYER"][data-lane="'+p.source_lane+'"]',extraTargets=extra.map(function(l){return '.hero-panel[data-side="AI"][data-lane="'+l+'"]';}),name=(ability&&ability.name)||'Range Attack';
    enqueue({id:'range_attack_live_targeting',title:'Passive Class Ability — '+name+' / Range Attack',expression:'advise',compact:true,priority:true,highlight:[sourceSelector].concat(extraTargets),html:'<p>This Hero’s passive Class Ability makes the selected <b>Physical Attack</b> gain the same targeting rule shown by the <b>Range Attack</b> badge.</p><p>The highlighted opponent outside this source Hero’s normal Area of Attack is still a legal target. Range Attack selects one Hero, but ignores the normal Left, Center, and Right coverage limit.</p><p>The passive applies automatically; no Ability button or extra cost is required.</p>'},true);
    return true;
  }

  function explainCardEffectReposition(state){
    if(!state||!state.pending||active||queue.length||seen.card_effect_reposition||queued.card_effect_reposition)return false;
    var p=state.pending;if(p.type!=='optional_target_swap'&&p.type!=='optional_swap')return false;
    var choices=p.type==='optional_target_swap'?['#choiceOverlay.open .optionalTargetSwap','#choiceOverlay.open #optionalTargetSwapNo']:['#choiceOverlay.open .optionalSourceSwap','#choiceOverlay.open #optionalSwapNo'];
    if(!resolveHighlightTargets(choices).length)return false;
    var opponent=p.type==='optional_target_swap';
    enqueue({id:'card_effect_reposition',title:opponent?'Force Reposition':'Reposition from a Card Effect',expression:'advise',compact:true,priority:true,allowDuringRuntimeModal:true,highlight:choices,interactionTarget:choices,requireInteraction:true,html:'<p>'+(opponent?'This Attack may force the affected opponent slot to swap with an adjacent Hero or Legacy.':'This card may reposition your acting Hero with a legal adjacent allied Hero or Legacy.')+'</p><p>Card-effect Reposition is different from manual Reposition: it does <b>not</b> Exhaust the moved Hero unless the card explicitly says it does. Hero ↔ Hero and Hero ↔ Legacy are legal; Legacy ↔ Legacy is not.</p><p>You may choose a listed swap or skip it. Closing this Arvon message only hides the explanation; the runtime choice remains open.</p>'},true);
    return true;
  }

  function explainAreaAttackAvailability(state){
    if(!state||state.turn!=='PLAYER'||state.phase!=='Battle'||state.pending||state.responseWindow||active||queue.length||seen.area_attack_badge||queued.area_attack_badge)return false;
    var hand=sideHand(state,'PLAYER'),pick=null;
    hand.some(function(cardId,idx){
      if(!bridge.isAreaAttack(cardId))return false;
      var selector='.hand-card[data-hand-index="'+idx+'"]';
      if(!q(selector))return false;
      pick={id:cardId,selector:selector};return true;
    });
    if(!pick)return false;
    return enqueue({id:'area_attack_badge',title:'Area Attack Badge',expression:'serious',compact:true,highlight:pick.selector,html:'<p><b>'+esc(heroName(pick.id))+'</b> is an <b>Area Attack</b>.</p><p>This lesson appears while the card is still in your Hand during Battle Phase.</p><p>An <b>Area Attack</b> does not use a manual target picker. After selecting its source, Runtime immediately finds every opposing Hero inside that source Hero’s Area of Attack, opens a separate Response opportunity for each affected Hero, and then applies the Attack’s damage and effects.</p>'});
  }

  function queueGameResultRound(round,turn,phase,won){
    enqueue({id:'game_result_round',package:'game_result',title:'Game Result — Round and Timing',expression:won?'calm':'serious',compact:true,dock:'top-left',allowDuringRuntimeModal:true,allowModalContent:'#infoOverlay',highlight:'#infoOverlay .game-result-round',html:'<p><b>Round</b> shows when the match ended. This result was recorded in <b>Round '+round+'</b>'+(turn||phase?' during '+esc(turn)+(phase?' · '+esc(phase)+' Phase':''):'')+'.</p><p>This timing helps review the final action in Card Played or the Full Battle Log.</p><p>'+(won?'<b>Congratulations on the victory.</b>':'That was a hard-fought match. Review the final actions, then try again when you are ready.')+'</p>',nextLabel:'Finish',onNext:function(){closeActive();}},true);
  }
  function queueGameResultReason(reason,round,turn,phase,won){
    enqueue({id:'game_result_reason',package:'game_result',title:'Game Result — Reason',expression:'advise',compact:true,dock:'top-left',allowDuringRuntimeModal:true,allowModalContent:'#infoOverlay',highlight:'#infoOverlay .game-result-reason',html:'<p><b>Reason</b> states the exact rule that ended the match.</p><p>'+esc(reason)+'</p><p>Common results are defeating all three opposing Heroes, failing the mandatory Draw Phase draw, or surrendering.</p>',nextLabel:'Next',onNext:function(){queueGameResultRound(round,turn,phase,won);closeActive();}},true);
  }
  function gameResult(state){
    if(!state||!state.gameOver||seen.game_result||!q('#infoOverlay.open .game-result-summary'))return;
    markSeen('game_result');beginPackage('game_result');
    var won=state.winner==='PLAYER',winner=text(state.winner||'Unknown'),reason=text(state.gameEndReason||'Game ended.'),round=Number(state.round||1),turn=text(state.turn||''),phase=text(state.phase||'');
    enqueue({id:'game_result_winner',package:'game_result',title:'Game Result — Winner',expression:won?'calm':'serious',compact:true,dock:'top-left',allowDuringRuntimeModal:true,allowModalContent:'#infoOverlay',highlight:'#infoOverlay .game-result-winner',html:'<p><b>Winner</b> identifies the side that won the match. Here, <b>'+esc(winner)+'</b> is the winner.</p><p>'+(won?'<b>Congratulations.</b> You satisfied a match-ending condition first.':'The opponent satisfied a match-ending condition first. That is all right—this match still showed how the full battle flow works.')+'</p>',nextLabel:'Next',onNext:function(){queueGameResultReason(reason,round,turn,phase,won);closeActive();}},true);
  }

  function lateAnatomy(state){
    if(packageLock||active||queue.length||!seen.initial_anatomy_complete||!seen.phase_deploy||!state||state.turn!=='PLAYER'||state.phase!=='Deploy'||state.pending||state.responseWindow||anatomy.activeFamily||anatomy.waitingFamily||isPreviewOpen())return;
    var missing=['Skill','UltimateSkill','Event','Item'].filter(function(f){return !seen['anatomy_'+anatomyKey(f)]&&sideHand(state,'PLAYER').some(function(id){return matchesAnatomyFamily(id,f);});});
    if(missing.length){anatomy.pendingFamilies=missing;promptNextAnatomy();}
  }

  function tick(){
    buildShell();
    var started=bridge.isMatchStarted(),state=bridge.getState();
    if(wasMatchStarted&&!started){wasMatchStarted=false;resetGuideSession();previous=state;return;}
    if(!started){
      document.body.classList.remove('gl-tutorial-initial-draw-lock');clearCardPickLock();
      if(!seen.lobby_intro&&!active&&!queue.length)queueLobbyIntro();
      syncGuideHold();previous=state;return;
    }
    wasMatchStarted=true;
    syncInitialHandLock(state);syncRoundOneTributeLock(state);
    if(q('.gl-opening-coin-card.result')&&!seen.opening_hand)openingHandMessage();
    if(!state){previous=state;return;}
    // Mandatory defeat replacements must take tutorial priority after their runtime popup is visible.
    pendingDefeat(state);
    explainOpponentActionGate(state);
    explainOpponentPhaseGate(state);
    phaseMessage(state);
    syncReformGuide(state);
    syncPlayableCardGuide(state);
    playableAttackTutorial(state);
    pendingAttackTutorial(state);
    explainMarksmanRangeTargeting(state);
    explainCardEffectReposition(state);
    explainResponse(state);
    explainTemporaryHealTargetRestriction(state);
    explainOpponentPlayed(state);
    explainLineageFallbackCardPlayed(state);
    explainLegacyAvailability(state);
    explainActivatedClassAvailability(state);
    explainRacialAvailability(state);
    explainAreaAttackAvailability(state);
    explainPlayerActions(state);
    explainCurrentStatusIcons(state);
    explainFirstPlayButton(state);
    firstPlayableFamilyTutorial(state);
    explainCancelAction(state);
    explainReviveEvent(state);
    heroDiffs(previous,state);
    lateAnatomy(state);
    if(state.turn==='PLAYER'&&state.phase==='Deploy'&&seen.phase_deploy&&seen.initial_anatomy_complete&&seen.deploy_play_review_complete&&!anatomy.initialSequence&&!anatomy.activeFamily&&!anatomy.waitingFamily&&!isPreviewOpen()&&!seen.next_phase_deploy&&!queued.next_phase_deploy)queueFirstNextPhase();
    if(!anatomy.initialSequence&&!anatomy.activeFamily&&!anatomy.waitingFamily&&!isPreviewOpen())queueTacticalBadgeFirstUse(state,null);
    maybeQueueDeployAdvance(state);
    gameResult(state);
    refreshActiveInteractionTargets();
    syncGuideHold();previous=state;
  }

  document.addEventListener('pointerdown',guardActiveInteraction,true);
  document.addEventListener('click',guardActiveInteraction,true);
  document.addEventListener('click',handleActiveInteractionClick,false);
  document.addEventListener('pointerdown',guardMandatoryPlaySequence,true);
  document.addEventListener('click',guardMandatoryPlaySequence,true);
  document.addEventListener('pointerdown',guardMandatoryReformSequence,true);
  document.addEventListener('click',guardMandatoryReformSequence,true);
  document.addEventListener('pointerdown',guardFirstTurnAttack,true);
  document.addEventListener('click',guardFirstTurnAttack,true);
  document.addEventListener('pointerdown',guardFirstRacialExplanation,true);
  document.addEventListener('click',guardFirstRacialExplanation,true);
  document.addEventListener('pointerdown',guardRoundOneTributeAdvance,true);
  document.addEventListener('click',guardRoundOneTributeAdvance,true);
  document.addEventListener('pointerdown',guardTutorialPickLock,true);
  document.addEventListener('click',guardTutorialPickLock,true);
  document.addEventListener('pointerdown',guardTutorialHandInput,true);
  document.addEventListener('click',guardTutorialHandInput,true);
  document.addEventListener('click',handleHandPreviewClick,true);
  document.addEventListener('click',handleReformGuideClick,true);
  document.addEventListener('click',function(ev){var btn=ev.target&&ev.target.closest&&ev.target.closest('#nextPhaseButton');if(btn&&!active)clearHighlights();},true);
  document.addEventListener('DOMContentLoaded',function(){buildShell();queueLobbyIntro();pollTimer=setInterval(tick,250);});
  if(document.readyState!=='loading'){buildShell();queueLobbyIntro();pollTimer=setInterval(tick,250);}
  window.GL_TUTORIAL_GUIDE_QA={
    version:'0.31',
    getSeen:function(){return Object.keys(seen).sort();},
    getActive:function(){return active&&active.id||null;},
    getQueue:function(){return queue.map(function(x){return x.id;});},
    classifyPlayCard:function(cardId){return{requiresSource:cardRequiresSource(cardId),requiresTarget:cardRequiresTarget(cardId),opensDeck:isDeckOpeningCard(cardId)};},
    practiceCategory:function(cardId){return practiceCategory(cardId);},
    classifyPracticeBoundary:function(cardId){var source=cardRequiresSource(cardId),target=cardRequiresTarget(cardId);return !source&&!target?'BEFORE_PLAY':(target?'BEFORE_TARGET':'BEFORE_SOURCE');},
    trigger:function(id){seen[id]=false;return tick();}
  };
})();
