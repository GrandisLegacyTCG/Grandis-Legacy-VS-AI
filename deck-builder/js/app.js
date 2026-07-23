'use strict';

const state={
  tab:'legacy',cards:[],byId:new Map(),legacyCards:[],legacyById:new Map(),
  sourcePackages:[],progressions:[],progressionById:new Map(),starters:[],deck:{},
  legacySlots:[{progressionId:'',legacyId:''},{progressionId:'',legacyId:''},{progressionId:'',legacyId:''}],
  formation:{LEFT:'',CENTER:'',RIGHT:''},selected:null
};
const POSITIONS=['LEFT','CENTER','RIGHT'];
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const clone=v=>JSON.parse(JSON.stringify(v));

function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1800)}
function countDeck(deck=state.deck){return Object.values(deck).reduce((a,b)=>a+Number(b||0),0)}
function copyLimit(card){return card?.ultimate?.isUltimate?1:2}
function familyCount(f){return Object.entries(state.deck).reduce((n,[id,q])=>n+(state.byId.get(id)?.family===f?q:0),0)}
function legacyCardCount(slots=state.legacySlots){return slots.reduce((n,s)=>n+(s.progressionId?3:0)+(s.legacyId?1:0),0)}
function completePackageCount(slots=state.legacySlots){return slots.filter(s=>s.progressionId&&s.legacyId).length}
function formationComplete(formation=state.formation){const ids=POSITIONS.map(pos=>formation[pos]).filter(Boolean);return ids.length===3&&new Set(ids).size===3}
function legacyReady(){return completePackageCount()===3&&legacyCardCount()===12&&formationComplete()}

function selectedProgressions(slots=state.legacySlots){return slots.map(s=>state.progressionById.get(s.progressionId)).filter(Boolean)}
function selectedLineageClasses(slots=state.legacySlots){return new Set(selectedProgressions(slots).flatMap(p=>p.classLineage||[]))}
function selectedBaseClasses(slots=state.legacySlots){return new Set(selectedProgressions(slots).map(p=>p.baseClass))}
function selectedHeroIds(slots=state.legacySlots){return new Set(selectedProgressions(slots).flatMap(p=>p.cardIds||[]))}

function compatibility(card,slots=state.legacySlots){
  if(!card)return {ok:false,reason:'Card data is unavailable.'};
  const progressions=selectedProgressions(slots);
  if(progressions.length!==3)return {ok:false,reason:'Choose all 3 Hero progressions first.'};
  const heroIds=selectedHeroIds(slots);
  const lineages=selectedLineageClasses(slots);
  const baseClasses=selectedBaseClasses(slots);
  const ultimate=card.ultimate||{};
  if(ultimate.isUltimate){
    const legalOwner=(ultimate.ownerLineageCardIds||[]).some(id=>heroIds.has(id));
    if(!legalOwner)return {ok:false,reason:`Ultimate owner required: ${ultimate.owner||'specific Hero lineage'}.`};
  }
  if(Array.isArray(card.requiredBaseClasses)&&card.requiredBaseClasses.length){
    const ok=card.requiredBaseClasses.some(cls=>baseClasses.has(cls));
    if(!ok)return {ok:false,reason:`Requires base class: ${card.requiredBaseClasses.join(' / ')}.`};
  }
  if(Array.isArray(card.legalActiveClasses)&&card.legalActiveClasses.length){
    const ok=card.legalActiveClasses.some(cls=>lineages.has(cls));
    if(!ok)return {ok:false,reason:`No selected Rank I–III lineage can use this ${card.classGroup} Skill.`};
  }
  return {ok:true,reason:'Compatible with the selected Hero lineages.'};
}
function incompatibleDeckEntries(slots=state.legacySlots,deck=state.deck){
  return Object.entries(deck).filter(([,q])=>q>0).map(([id,q])=>({card:state.byId.get(id),quantity:q})).filter(x=>!compatibility(x.card,slots).ok).sort((a,b)=>mainSort(a.card,b.card));
}
function lostCompatibilityEntries(proposedSlots){
  return Object.entries(state.deck).filter(([,q])=>q>0).map(([id,q])=>({card:state.byId.get(id),quantity:q})).filter(x=>compatibility(x.card,state.legacySlots).ok&&!compatibility(x.card,proposedSlots).ok).sort((a,b)=>mainSort(a.card,b.card));
}

function updateMainGate(){
  const ready=legacyReady(),button=$('mainTabButton');
  button.disabled=!ready;button.classList.toggle('locked',!ready);
  button.title=ready?'Open Main Deck':'Complete the Legacy Deck and Formation first';
  $('mainTabCount').textContent=ready?`${countDeck()} / 60`:'LOCKED';
  const status=$('legacyPackageStatus');
  if(status)status.textContent=ready?'3 / 3 complete • Main Deck unlocked':`${completePackageCount()} / 3 complete • Main Deck locked`;
}

function previewMetaFor(card){
  const cleanCost=card.cost&&card.cost!=='No Mana cost'?card.cost:'';
  if(card.family==='Hero'){
    return [card.id,'Hero',card.race,card.classGroup,card.rank?`Rank ${card.rank}`:'',card.hp!=null?`${card.hp} HP`:''].filter(Boolean);
  }
  if(card.family==='LegacyModeDefinition'){
    return [card.id,'Legacy',card.classGroup,cleanCost?`Cost: ${cleanCost}`:''].filter(Boolean);
  }
  const publicFamily=card.family==='LegacyModeDefinition'?'Legacy':card.family;
  const values=[card.id,publicFamily,card.classification,card.classGroup,cleanCost].filter(Boolean);
  return values.filter((value,index)=>values.indexOf(value)===index);
}

function selectCard(card){
  if(!card)return;
  state.selected=card;
  $('previewTitle').textContent=card.name;
  $('previewArt').src=card.image;
  $('previewArt').style.display='block';
  const meta=previewMetaFor(card);
  $('previewMeta').innerHTML=meta.map(x=>`<span class="chip">${esc(x)}</span>`).join('');
  const rows=card.rows?.length?card.rows:[{label:'Printed Effect',text:card.text}];
  $('previewRows').innerHTML=rows.map(r=>`<div class="effect-row"><strong>${esc(r.label||'Effect')}</strong><p>${esc(r.text||r.effect_text||r.damage_text||'')}</p></div>`).join('');
  const box=$('previewCompatibility');
  if(state.byId.has(card.id)&&legacyReady()){
    const result=compatibility(card);
    box.textContent=result.ok?'Compatible with selected Hero lineages.':result.reason;
    box.className=`preview-compatibility ${result.ok?'compatible':'incompatible'}`;
  }else box.className='preview-compatibility hidden';
  if(state.tab==='main')renderLibrary();
}

function focusLibraryFromDeck(card){
  if(!card)return;
  selectCard(card);
  requestAnimationFrame(()=>{
    const row=Array.from(document.querySelectorAll('.card-row')).find(el=>el.dataset.id===card.id);
    if(row)row.scrollIntoView({block:'center',behavior:'smooth'});
  });
}

function addMain(id){
  const c=state.byId.get(id),total=countDeck(),q=state.deck[id]||0,result=compatibility(c);
  if(!result.ok){toast(result.reason);return}
  if(total>=60){toast('Main Deck is already 60 / 60');return}
  if(q>=copyLimit(c)){toast(`Copy limit reached (${copyLimit(c)})`);return}
  state.deck[id]=q+1;selectCard(c);renderMainDeck();
}
function removeMain(id){
  const q=state.deck[id]||0;if(!q)return;
  if(q===1)delete state.deck[id];else state.deck[id]=q-1;
  renderMainDeck();renderLibrary();
}

function mainSort(a,b){
  const order={Skill:0,Event:1,Item:2};
  const group=(order[a?.family]??9)-(order[b?.family]??9);
  return group||String(a?.id||'').localeCompare(String(b?.id||''),undefined,{numeric:true});
}
function filteredMain(){
  const s=$('search').value.trim().toLowerCase(),f=$('familyFilter').value,c=$('classFilter').value;
  const searching=Boolean(s);
  return state.cards.filter(x=>{
    const text=(x.name+' '+x.classification+' '+x.id+' '+x.classGroup).toLowerCase();
    if(s&&!text.includes(s))return false;
    if(f&&x.family!==f)return false;
    if(c&&x.classGroup!==c)return false;
    if(!searching&&!compatibility(x).ok)return false;
    return true;
  }).sort(mainSort);
}
function renderLibrary(){
  if(!$('cardList'))return;
  const cards=filteredMain();
  $('resultCount').textContent=cards.length;
  $('cardList').innerHTML=cards.map(c=>{
    const q=state.deck[c.id]||0,result=compatibility(c),locked=!result.ok;
    return `<div class="card-row ${state.selected?.id===c.id?'selected':''} ${locked?'incompatible':''}" data-id="${c.id}" title="${esc(locked?result.reason:c.name)}"><img src="${c.image}" alt=""><div class="card-info"><strong>${esc(c.name)} ${locked?'<span class="lock-label">INCOMPATIBLE</span>':''}</strong><small>${esc(c.id)} • ${esc(c.classGroup)} • ${esc(c.classification)} • ${esc(c.cost)}${locked?` • ${esc(result.reason)}`:''}</small></div><button class="qty-btn minus" data-id="${c.id}" ${q?'':'disabled'}>−</button><span class="qty">${q}</span><button class="qty-btn plus" data-id="${c.id}" ${locked||q>=copyLimit(c)||countDeck()>=60?'disabled':''}>+</button></div>`;
  }).join('');
  document.querySelectorAll('.card-row').forEach(r=>r.addEventListener('click',e=>{if(e.target.closest('button'))return;selectCard(state.byId.get(r.dataset.id))}));
  document.querySelectorAll('.plus').forEach(b=>b.addEventListener('click',()=>addMain(b.dataset.id)));
  document.querySelectorAll('.minus').forEach(b=>b.addEventListener('click',()=>removeMain(b.dataset.id)));
}
function validationIssues(){
  const issues=[];
  if(!legacyReady())issues.push('Legacy Deck and Formation are incomplete.');
  if(countDeck()!==60)issues.push(`Main Deck must contain exactly 60 cards (currently ${countDeck()}).`);
  const bad=incompatibleDeckEntries();
  if(bad.length)issues.push(`${bad.reduce((n,x)=>n+x.quantity,0)} Main Deck card(s) are incompatible with the selected Hero lineages.`);
  for(const [id,q] of Object.entries(state.deck)){
    const c=state.byId.get(id);
    if(!c)issues.push(`Unknown card ID: ${id}.`);
    else if(q>copyLimit(c))issues.push(`${c.name} exceeds its copy limit (${q}/${copyLimit(c)}).`);
  }
  return issues;
}
function renderMainDeck(){
  const items=[];
  state.cards.slice().sort(mainSort).forEach(c=>{for(let i=0;i<(state.deck[c.id]||0);i++)items.push({c,copy:i+1})});
  $('deckCount').textContent=items.length;
  if(legacyReady())$('mainTabCount').textContent=`${items.length} / 60`;
  updateMainGate();
  $('skillCount').textContent=familyCount('Skill');
  $('eventCount').textContent=familyCount('Event');
  $('itemCount').textContent=familyCount('Item');
  const issues=validationIssues(),valid=!issues.length;
  $('deckValidation').textContent=valid?'Deck Valid':'Incomplete / Invalid';
  $('deckValidation').className=`deck-validation ${valid?'valid':'invalid'}`;
  $('deckGrid').innerHTML=items.map(({c,copy})=>{const bad=!compatibility(c).ok;return `<div class="deck-card ${bad?'incompatible':''}" data-id="${c.id}" title="${esc(c.name)} — click to preview, right-click to remove"><img src="${c.image}" alt="${esc(c.name)}"><span class="copy-tag">${copy}</span>${bad?'<span class="deck-lock">!</span>':''}</div>`}).join('');
  $('emptyDeck').style.display=items.length?'none':'block';
  document.querySelectorAll('.deck-card').forEach(el=>{
    el.addEventListener('click',()=>focusLibraryFromDeck(state.byId.get(el.dataset.id)));
    el.addEventListener('contextmenu',e=>{e.preventDefault();removeMain(el.dataset.id)});
  });
  renderLibrary();
}

function buildProgressions(){
  const seen=new Set();
  state.progressions=state.sourcePackages.filter(p=>{if(seen.has(p.baseCardId))return false;seen.add(p.baseCardId);return true}).map(p=>({
    id:p.baseCardId,name:`${p.race} ${p.baseClass} — ${p.lineage}`,baseClass:p.baseClass,race:p.race,lineage:p.lineage,
    cardIds:(p.heroIds||p.cardIds.slice(0,3)).slice(),coverImage:p.coverImage,classLineage:(p.classLineage||[]).slice()
  })).sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}));
  state.progressionById=new Map(state.progressions.map(p=>[p.id,p]));
}
function usedProgressionsExcept(slotIndex,slots=state.legacySlots){return new Set(slots.map((s,i)=>i===slotIndex?'':s.progressionId).filter(Boolean))}
function usedLegaciesExcept(slotIndex,slots=state.legacySlots){return new Set(slots.map((s,i)=>i===slotIndex?'':s.legacyId).filter(Boolean))}
function compatibleLegacies(progressionId,slotIndex,slots=state.legacySlots){
  const p=state.progressionById.get(progressionId);if(!p)return [];
  const used=usedLegaciesExcept(slotIndex,slots);
  return state.legacyCards.filter(c=>c.family==='LegacyModeDefinition'&&c.classGroup===p.baseClass&&!used.has(c.id)).sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}));
}
function option(value,label,selected=false,disabled=false){return `<option value="${esc(value)}" ${selected?'selected':''} ${disabled?'disabled':''}>${esc(label)}</option>`}
function progressionOptions(slotIndex,current){
  const used=usedProgressionsExcept(slotIndex);
  return option('','Choose progression',!current)+state.progressions.map(p=>option(p.id,`${p.id} — ${p.name}`,p.id===current,used.has(p.id))).join('');
}
function legacyOptions(slotIndex,progressionId,current){
  if(!progressionId)return option('','Choose progression first',true,true);
  const list=compatibleLegacies(progressionId,slotIndex);
  return option('','Choose matching Legacy',!current)+list.map(c=>option(c.id,`${c.id} — ${c.name}`,c.id===current)).join('');
}
function cardPreviewButton(card,role){
  if(!card)return `<div class="legacy-placeholder">${esc(role)}</div>`;
  return `<button class="legacy-preview-card" data-preview-id="${card.id}" title="${esc(card.name)}"><img src="${card.image}" alt="${esc(card.name)}"><span class="role">${esc(role)}</span></button>`;
}

function askConfirm({eyebrow='CONFIRM',title,message,list=[],okLabel='OK',danger=false}){
  return new Promise(resolve=>{
    const dialog=$('confirmDialog'),finish=value=>{if(dialog.open)dialog.close();cleanup();resolve(value)};
    const cleanup=()=>{$('confirmOk').onclick=null;$('confirmCancel').onclick=null;$('confirmClose').onclick=null;dialog.oncancel=null;};
    $('confirmEyebrow').textContent=eyebrow;$('confirmTitle').textContent=title;$('confirmMessage').innerHTML=message;
    const listEl=$('confirmList');
    if(list.length){listEl.innerHTML=list.map(x=>`<div class="confirm-item"><span>${esc(x.label)}</span><b>${esc(x.value)}</b></div>`).join('');listEl.classList.remove('hidden')}else{listEl.innerHTML='';listEl.classList.add('hidden')}
    $('confirmOk').textContent=okLabel;$('confirmOk').className=danger?'danger':'primary';
    $('confirmOk').onclick=()=>finish(true);$('confirmCancel').onclick=()=>finish(false);$('confirmClose').onclick=()=>finish(false);
    dialog.oncancel=e=>{e.preventDefault();finish(false)};
    dialog.showModal();
  });
}

async function setProgression(slotIndex,progressionId){
  const current=state.legacySlots[slotIndex].progressionId;
  if(current===progressionId)return;
  const proposed=clone(state.legacySlots);
  proposed[slotIndex].progressionId=progressionId;
  const valid=compatibleLegacies(progressionId,slotIndex,proposed);
  if(!valid.some(c=>c.id===proposed[slotIndex].legacyId))proposed[slotIndex].legacyId=valid[0]?.id||'';
  const removed=lostCompatibilityEntries(proposed);
  if(removed.length){
    const total=removed.reduce((n,x)=>n+x.quantity,0);
    const ok=await askConfirm({
      eyebrow:'HERO CHANGE',title:'Change Hero and remove incompatible cards?',
      message:`Changing this Hero will remove <b>${total}</b> card${total===1?'':'s'} from the Main Deck because no selected Rank I–III lineage can use them.`,
      list:removed.map(x=>({label:x.card?.name||'Unknown card',value:`×${x.quantity}`})),
      okLabel:'Change Hero & Remove Cards',danger:true
    });
    if(!ok){renderLegacyEditor();return}
  }
  state.legacySlots=proposed;
  removed.forEach(x=>{if(x.card)delete state.deck[x.card.id]});
  normalizeFormation();renderLegacyEditor();renderMainDeck();
  const p=state.progressionById.get(progressionId);if(p)selectCard(state.legacyById.get(p.cardIds[0]));
  if(removed.length)toast('Hero changed and incompatible cards removed');
}
function setLegacy(slotIndex,legacyId){state.legacySlots[slotIndex].legacyId=legacyId;renderLegacyEditor();if(legacyId)selectCard(state.legacyById.get(legacyId))}
function availableRank1(slots=state.legacySlots){return slots.map(s=>state.progressionById.get(s.progressionId)?.cardIds[0]).filter(Boolean)}
function normalizeFormation(){
  const available=availableRank1(),allowed=new Set(available),used=new Set();
  for(const pos of POSITIONS){const id=state.formation[pos];if(!allowed.has(id)||used.has(id))state.formation[pos]='';else if(id)used.add(id)}
  const remaining=available.filter(id=>!used.has(id));
  for(const pos of POSITIONS){if(!state.formation[pos]&&remaining.length)state.formation[pos]=remaining.shift()}
}
function setFormation(pos,id){
  const old=state.formation[pos]||'';
  if(id&&id!==old){const other=POSITIONS.find(p=>p!==pos&&state.formation[p]===id);if(other)state.formation[other]=old}
  state.formation[pos]=id||'';normalizeFormation();renderLegacyEditor();if(id)selectCard(state.legacyById.get(id));
}
function renderFormation(){
  const ids=availableRank1();
  $('formationGrid').innerHTML=POSITIONS.map(pos=>{
    const current=state.formation[pos]||'',card=state.legacyById.get(current);
    const opts=option('','Choose Hero',!current)+ids.map(id=>{const h=state.legacyById.get(id);return option(id,`${id} — ${h?.name||id}`,id===current)}).join('');
    return `<article class="formation-card"><h4>${pos}</h4><select data-formation-pos="${pos}">${opts}</select>${card?`<button class="formation-visual" data-preview-id="${card.id}" title="${esc(card.name)}"><img src="${card.image}" alt="${esc(card.name)}"></button>`:`<div class="formation-visual placeholder">Choose a Rank I Hero</div>`}</article>`;
  }).join('');
  document.querySelectorAll('[data-formation-pos]').forEach(s=>s.addEventListener('change',()=>setFormation(s.dataset.formationPos,s.value)));
}
function renderLegacyEditor(){
  const total=legacyCardCount();
  $('legacyDeckTotal').textContent=total;$('legacyTabCount').textContent=`${total} / 12`;updateMainGate();
  $('legacyPackageGrid').innerHTML=state.legacySlots.map((slot,index)=>{
    const p=state.progressionById.get(slot.progressionId),legacy=state.legacyById.get(slot.legacyId);
    const heroCards=p?p.cardIds.map(id=>state.legacyById.get(id)):[];
    const previews=[cardPreviewButton(heroCards[0],'Rank I'),cardPreviewButton(heroCards[1],'Rank II'),cardPreviewButton(heroCards[2],'Rank III'),cardPreviewButton(legacy,'Legacy')].join('');
    const summary=p?`${p.name}${legacy?` + ${legacy.name}`:' • choose a Legacy Card'}`:'No progression selected.';
    return `<article class="legacy-package"><h4>Package ${index+1}</h4><label>Hero progression</label><select data-progression-slot="${index}">${progressionOptions(index,slot.progressionId)}</select><label>Matching Legacy Card</label><select data-legacy-slot="${index}">${legacyOptions(index,slot.progressionId,slot.legacyId)}</select><div class="legacy-preview-grid">${previews}</div><div class="legacy-package-summary">${esc(summary)}</div></article>`;
  }).join('');
  document.querySelectorAll('[data-progression-slot]').forEach(s=>s.addEventListener('change',()=>setProgression(Number(s.dataset.progressionSlot),s.value)));
  document.querySelectorAll('[data-legacy-slot]').forEach(s=>s.addEventListener('change',()=>setLegacy(Number(s.dataset.legacySlot),s.value)));
  renderFormation();
  document.querySelectorAll('[data-preview-id]').forEach(b=>b.addEventListener('click',()=>selectCard(state.legacyById.get(b.dataset.previewId))));
}

function setTab(tab){
  if(tab==='main'&&!legacyReady()){toast('Choose all 3 Legacy packages and Formation first');tab='legacy'}
  state.tab=tab;
  document.querySelectorAll('.tab-button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  const main=tab==='main';
  $('workspace').classList.toggle('main-mode',main);$('workspace').classList.toggle('legacy-mode',!main);
  $('libraryPanel').classList.toggle('hidden',!main);$('deckPanel').classList.toggle('hidden',!main);$('legacyEditor').classList.toggle('hidden',main);
  if(main){
    if(!state.byId.has(state.selected?.id)){const id=Object.keys(state.deck)[0]||filteredMain()[0]?.id;selectCard(state.byId.get(id))}
    renderMainDeck();
  }else{
    normalizeFormation();renderLegacyEditor();
    if(!state.legacyById.has(state.selected?.id)){const id=availableRank1()[0]||state.legacyCards[0]?.id;selectCard(state.legacyById.get(id))}
  }
}

function normalizeImportedDeck(data){
  const main={};
  const entries=Array.isArray(data.main_deck)?data.main_deck:Array.isArray(data.mainDeck)?data.mainDeck:[];
  for(const item of entries){
    const id=item.card_id||item.cardId||item.id,card=state.byId.get(id),q=Number(item.quantity??item.qty??1);
    if(card&&Number.isFinite(q)&&q>0)main[id]=Math.min(Math.floor(q),copyLimit(card));
  }
  let rawSlots=data.legacy_deck_package_slots||data.side_deck_package_slots||data.legacySlots||[];
  const slots=rawSlots.slice(0,3).map(s=>({progressionId:s.progression||s.progressionId||'',legacyId:s.legacy||s.legacyId||''}));
  while(slots.length<3)slots.push({progressionId:'',legacyId:''});
  const formationRaw=data.default_formation||data.formation||{};
  const formation={LEFT:formationRaw.LEFT||formationRaw.left||'',CENTER:formationRaw.CENTER||formationRaw.center||'',RIGHT:formationRaw.RIGHT||formationRaw.right||''};
  return {name:data.deck_name||data.deckName||'Imported Deck',deck:main,slots,formation};
}
function applyDeck({name,deck,slots,formation}){
  state.deck={...deck};state.legacySlots=clone(slots);state.formation={...formation};
  normalizeFormation();$('deckName').value=name||'New Deck';renderMainDeck();renderLegacyEditor();setTab('legacy');
  const id=availableRank1()[0]||Object.keys(state.deck)[0];selectCard(state.legacyById.get(id)||state.byId.get(id));
}
function loadStarter(starter){applyDeck(normalizeImportedDeck(starter));$('starterDialog').close();toast(`${starter.deck_name} loaded`)}
function renderStarterDialog(){
  $('starterList').innerHTML=state.starters.map((starter,index)=>{
    const slots=starter.legacy_deck_package_slots||[],names=slots.map(s=>state.progressionById.get(s.progression)?.lineage||s.progression).join(' • ');
    return `<button type="button" class="starter-option" data-starter-index="${index}"><span>Starter ${index+1}</span><strong>${esc(starter.deck_name.replace(/^Starter\s*\d+\s*-\s*/i,''))}</strong><small>${esc(names)} • 60 Main Deck cards</small></button>`;
  }).join('');
  document.querySelectorAll('[data-starter-index]').forEach(b=>b.addEventListener('click',()=>loadStarter(state.starters[Number(b.dataset.starterIndex)])));
}

async function importJsonFile(file){
  try{
    const data=JSON.parse(await file.text()),normalized=normalizeImportedDeck(data);
    if(!normalized.slots.some(s=>s.progressionId))throw new Error('Legacy Deck package data was not found.');
    applyDeck(normalized);
    const bad=incompatibleDeckEntries();
    if(bad.length)toast(`Imported with ${bad.reduce((n,x)=>n+x.quantity,0)} incompatible card(s)`);else toast('Deck imported');
  }catch(err){await askConfirm({eyebrow:'IMPORT ERROR',title:'Could not import this deck file',message:esc(err.message||String(err)),okLabel:'Close'});}
  finally{$('jsonFileInput').value=''}
}
function expandedLegacy(){
  const out=[];
  state.legacySlots.forEach((slot,index)=>{
    const p=state.progressionById.get(slot.progressionId),legacy=state.legacyById.get(slot.legacyId);if(!p)return;
    const packageId=`CUSTOM-SLOT-${index+1}`,packageName=`${p.name}${legacy?` + ${legacy.name}`:''}`;
    p.cardIds.forEach(id=>{const c=state.legacyById.get(id);if(c)out.push({card_id:id,card_name:c.name,card_type:'Hero',package_id:packageId,package_name:packageName})});
    if(legacy)out.push({card_id:legacy.id,card_name:legacy.name,card_type:'Legacy',package_id:packageId,package_name:packageName});
  });
  return out;
}
function exportObject(){
  const issues=validationIssues(),slots=state.legacySlots.map(s=>({progression:s.progressionId,legacy:s.legacyId})),expanded=expandedLegacy();
  return {
    schema_version:'GL-DECK-1.0',builder_version:'2.1-public-deck-builder',deck_name:$('deckName').value.trim()||'New Deck',
    format:'One Source Authority v1.4 + Public Deck Builder v2.1',main_deck_count:countDeck(),legacy_package_count:completePackageCount(),legacy_deck_count:legacyCardCount(),legacy_deck_label:'Legacy Deck',
    legacy_deck_package_slots:slots,legacy_deck_expanded:expanded,side_package_count:completePackageCount(),side_deck_count:legacyCardCount(),side_deck_package_slots:slots,side_deck_expanded:expanded,
    is_valid:issues.length===0,validation_issues:issues,validation_warnings:[],
    main_deck:Object.entries(state.deck).map(([id,quantity])=>({card_id:id,card_name:state.byId.get(id)?.name||id,quantity})).sort((a,b)=>a.card_id.localeCompare(b.card_id,undefined,{numeric:true})),
    default_formation:{...state.formation},source_database_version:window.GL_DECK_BUILDER_DATA.sourceDatabaseVersion,
    builder_version_note:'Hero-lineage compatibility uses selected Rank I–III class lineages, including hybrid classes. UI legality is rechecked before card addition.'
  };
}
function downloadJson(obj){
  const safe=(obj.deck_name||'Grandis_Legacy_Deck').replace(/[^a-z0-9_-]+/gi,'_').replace(/^_+|_+$/g,'')||'Grandis_Legacy_Deck';
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`${safe}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function exportJson(){
  const obj=exportObject();
  if(!obj.is_valid){
    const ok=await askConfirm({eyebrow:'EXPORT WARNING',title:'Export incomplete or invalid deck?',message:'The deck file can still be exported, but it is not ready for a match.',list:obj.validation_issues.map(x=>({label:x,value:'Issue'})),okLabel:'Export Anyway'});
    if(!ok)return;
  }
  downloadJson(obj);toast('Deck exported');
}
async function clearAll(){
  const ok=await askConfirm({eyebrow:'CLEAR DECK',title:'Clear the entire deck?',message:'This removes the Main Deck, all Legacy packages, Formation, and deck name. This cannot be undone.',okLabel:'Clear Deck',danger:true});
  if(!ok)return;
  state.deck={};state.legacySlots=[{progressionId:'',legacyId:''},{progressionId:'',legacyId:''},{progressionId:'',legacyId:''}];state.formation={LEFT:'',CENTER:'',RIGHT:''};state.selected=null;$('deckName').value='New Deck';
  renderMainDeck();renderLegacyEditor();setTab('legacy');$('previewTitle').textContent='Select a card';$('previewArt').style.display='none';$('previewMeta').innerHTML='';$('previewRows').innerHTML='';toast('Deck cleared');
}

(()=>{
  const data=window.GL_DECK_BUILDER_DATA;
  if(!data)throw new Error('Deck Builder data failed to load.');
  state.cards=data.mainCards;state.byId=new Map(state.cards.map(c=>[c.id,c]));state.legacyCards=data.legacyCards;state.legacyById=new Map(state.legacyCards.map(c=>[c.id,c]));state.sourcePackages=data.legacyPackages;state.starters=data.starters||[];buildProgressions();
  renderStarterDialog();
  if(state.starters[0])applyDeck(normalizeImportedDeck(state.starters[0]));
  else{renderMainDeck();renderLegacyEditor();}
  ['search','familyFilter','classFilter'].forEach(id=>$(id).addEventListener('input',renderLibrary));
  document.querySelectorAll('.tab-button').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
  $('loadStarter').onclick=()=>$('starterDialog').showModal();
  $('importJson').onclick=()=>$('jsonFileInput').click();$('jsonFileInput').addEventListener('change',e=>{const file=e.target.files?.[0];if(file)importJsonFile(file)});
  $('exportJson').onclick=exportJson;$('clearDeck').onclick=clearAll;
  const requested=new URLSearchParams(location.search).get('tab');setTab(requested==='main'?'main':'legacy');
})();
