'use strict';
const fs=require('fs'); const path=require('path'); const crypto=require('crypto');
const ROOT=path.resolve(__dirname,'..');
const CARD_HASH='7ac1f90f6a9654cf575ac41db64a052901005905b1cf01f3bfc7532873cc9389';
const HERO_HASH='f36f1cc83eb9845743176c3af71f7823125353eae73e832588e9d8b42c6818be';
const ASSET_BASE = 'https://grandislegacytcg.github.io/shared/season1/v1/cards';
const V={osa:'v1.9.5',sharedRuntime:'v1.94.2',runtimeData:'v0.16.2',recipe:'v0.15.2',checkpoint:'v0.15.2',hero:'v1.1.0',starter:'v1.6.1',ui:'v2.53',sync:'v2.63',vsai:'v6.44',tutorial:'v0.68'};
function j(p){return JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));}
function write(p,v){fs.mkdirSync(path.dirname(path.join(ROOT,p)),{recursive:true});fs.writeFileSync(path.join(ROOT,p),v);}
function copy(a,b){fs.mkdirSync(path.dirname(path.join(ROOT,b)),{recursive:true});fs.copyFileSync(path.join(ROOT,a),path.join(ROOT,b));}
function stableCards(){const d=j('data/season1/cards.runtime.v0.16.2.json'); if(d.canonical_registry_hash!==CARD_HASH||d.hero_component_registry_hash!==HERO_HASH)throw Error('Runtime authority hash mismatch'); if(!Array.isArray(d.cards)||d.cards.length!==200||new Set(d.cards.map(c=>c.card_id)).size!==200)throw Error('Expected 200 unique canonical cards'); for(const id of ['S1-ITM-019','S1-ITM-020'])if(!d.cards.some(c=>c.card_id===id))throw Error('Missing '+id); return d;}
function previewFrom(runtime){return {schema_version:'1.6.0',generated_at:'2026-09-22',generated_from:'OSA v1.9.5 Runtime Data v0.16.2',canonical_registry_hash:CARD_HASH,hero_component_registry_hash:HERO_HASH,generated_only:true,count:200,data_type:'card_preview',cards:runtime.cards.map(c=>({card_id:c.card_id,name:c.name,family:c.family,classification:c.classification,printed:c.printed,review_rows:(c.printed&&c.printed.rows||[]).map(r=>({row_id:r.row_id||'',label:r.label||'',damage_text:r.damage_text||'',effect_text:r.effect_text||r.text||'',text:r.text||''})),cost:c.canonical_cost||c.cost||{kind:'none'},cost_display:c.cost_display||'',asset:c.asset||{},canonical_hash:c.canonical_hash}))};}
function legalityFrom(runtime){return {schema_version:'1.6.0',generated_at:'2026-09-22',generated_from:'OSA v1.9.5 Runtime Data v0.16.2',canonical_registry_hash:CARD_HASH,hero_component_registry_hash:HERO_HASH,generated_only:true,count:200,data_type:'legality_map',legality:runtime.cards.map(c=>Object.assign({card_id:c.card_id,card_name:c.name,family:c.family,classification:c.classification,canonical_hash:c.canonical_hash},c.canonical_legality||{}))};}
function assetManifest(cards){const mb=ASSET_BASE+'/ui/Back-of-Card-Main-Deck.webp',lb=ASSET_BASE+'/ui/Back-of-Card-Legacy-Deck.webp',o={}; for(const c of cards){const u=ASSET_BASE+'/thumbs/'+c.card_id+'.webp';o[c.card_id]={card_id:c.card_id,local_thumb_path:u,local_thumb_exists:true,local_full_path:u,local_full_exists:true,fallback_thumb_path:c.card_type==='Hero'?lb:mb,sha256:c.asset&&c.asset.sha256||'',canonical_hash:c.canonical_hash,status:'canonical-remote'};} return {version:'v1.6-local-ai',canonical_registry_hash:CARD_HASH,hero_component_registry_hash:HERO_HASH,cards:o,counts:{cards:200,webp_card_thumbs:200,cards_with_local_thumb:200,cards_missing_any_thumb:0},ui:{main_deck_card_back:mb,legacy_deck_card_back:lb,racial_token_head:ASSET_BASE+'/ui/Racial-Token-Head.webp',racial_token_tail:ASSET_BASE+'/ui/Racial-Token-Tail.webp',mana_shard:ASSET_BASE+'/ui/Mana-Shard-Thumb.webp'}};}
function assignment(k,v){return 'window.'+k+'='+JSON.stringify(v)+';';}

function buildActiveStarters(runtime){
  const src=j('data/starter-decks/active-starters.v1.json');
  if(src.source_authority!=='v1.9.5'||src.starter_authority_version!=='v1.6.1'||src.application_runtime_sync!=='v2.63')throw Error('Active starter consumer metadata must be OSA v1.9.5 / Starter v1.6.1 / Sync v2.63');
  if(src.active_starter_count!==5||!Array.isArray(src.starters)||src.starters.length!==5)throw Error('Active starter set must contain exactly 5 current OSA starters');
  const registry=new Set(runtime.cards.map(c=>c.card_id));
  const expected=['starter_01_elemental_lord_conqueror_renegade','starter_02_saint_crusader_grand_ranger','starter_03_arcane_duelist_elemental_lord_saint','starter_04_grand_ranger_grand_arbalest_renegade','starter_05_renegade_arcane_duelist_elemental_lord'];
  const options={};
  src.starters.forEach((entry,i)=>{
    if(entry.id!==expected[i])throw Error('Active starter ID/order mismatch: '+entry.id);
    const rel=entry.source_path, abs=path.join(ROOT,rel);
    if(!fs.existsSync(abs))throw Error('Missing OSA starter snapshot: '+rel);
    const sourceHash=crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
    if(sourceHash!==entry.source_sha256)throw Error('OSA starter snapshot hash mismatch: '+entry.id);
    const d=JSON.parse(fs.readFileSync(abs,'utf8')); const total=(d.main_deck||[]).reduce((n,x)=>n+Number(x.quantity||0),0);
    if(total!==60||Number(d.main_deck_count)!==60)throw Error(entry.id+' Main Deck must be exactly 60');
    if(!/Source Authority v1\.9\.2/.test(String(d.format||''))||!/Starter Deck Authority v1\.6\.1/.test(String(d.format||'')))throw Error(entry.id+' no longer matches the unchanged OSA v1.9.2-generated Starter v1.6.1 payload provenance');
    for(const x of d.main_deck||[])if(!registry.has(x.card_id))throw Error(entry.id+' missing current card '+x.card_id);
    for(const slot of d.legacy_deck_package_slots||d.side_deck_package_slots||[]){if(!registry.has(slot.progression)||!registry.has(slot.legacy))throw Error(entry.id+' missing Hero/Legacy package authority');}
    options[entry.id]={label:entry.label,file:'starter_deck_examples/'+entry.id+'_GL_DECK_1_0.json',deck:d};
  });
  const payload={schema_version:src.schema_version,active_starter_count:5,composition_authority:src.composition_authority,source_authority:'v1.9.5',starter_authority_version:'v1.6.1',application_runtime_sync:'v2.63',canonical_registry_hash:src.canonical_registry_hash,ids:expected};
  write('shared-app/active-starters.js',"'use strict';\n(function(w){w.GL_ACTIVE_STARTER_SET_META="+JSON.stringify(payload)+";w.GL_ACTIVE_STARTER_DECKS="+JSON.stringify(options)+";})(typeof window!=='undefined'?window:globalThis);\n");
  // Root and Tutorial deployment examples remain exact byte copies of the unchanged Starter60 v1.6.1 generated files; original v1.9.2 provenance is preserved.
  for(const base of ['starter_deck_examples','tutorial/starter_deck_examples']){
    fs.rmSync(path.join(ROOT,base),{recursive:true,force:true});fs.mkdirSync(path.join(ROOT,base),{recursive:true});
    src.starters.forEach(entry=>copy(entry.source_path,base+'/'+entry.id+'_GL_DECK_1_0.json'));
  }
  return payload;
}
function syncSharedApplicationMirrors(){
  const deployment=fs.readFileSync(path.join(ROOT,'shared-app/active-starters.js'),'utf8')+fs.readFileSync(path.join(ROOT,'shared-app/app.bundle.js'),'utf8');
  write('js/app.bundle.js',deployment);
  write('tutorial/js/app.bundle.js',deployment);
  copy('shared-app/app.css','css/app.css');
  copy('shared-app/app.css','tutorial/css/app.css');
}

function syncRuntimeMirror(){
  fs.rmSync(path.join(ROOT,'tutorial/runtime-source/runtime'),{recursive:true,force:true}); fs.mkdirSync(path.join(ROOT,'tutorial/runtime-source'),{recursive:true}); fs.cpSync(path.join(ROOT,'runtime-source/runtime'),path.join(ROOT,'tutorial/runtime-source/runtime'),{recursive:true});
  write('runtime-source/README.md','# Shared Runtime Source\n\n**Editable application deployment home.** Shared Runtime v1.94.2 is propagated from OSA v1.9.5 and contains the OSA v1.9.5 canonical Attachment lifecycle correction, including Triple Shot this-turn countdown semantics and null-safe Attachment counters. The only deployment-path adaptation is the blind-selection helper import (`Authority/Digital/Blind-Choice` in OSA is colocated as `runtime/digital/` here); helper bytes are copied from OSA unchanged. VS AI and Tutorial consume this same source; gameplay data and Starter compositions remain unchanged.\n');
  write('tutorial/runtime-source/README.md','# GENERATED Shared Runtime Deployment Mirror\n\nDO NOT EDIT. Generated byte-for-byte from `../../runtime-source/runtime/` by `npm run build:data`.\n');
}

function build(){
 for(const old of ['data/season1/cards.runtime.v0.16.0.json','data/season1/effect-recipes.runtime.v0.15.0.json','data/season1/effect-checkpoint.v0.15.0.json'])fs.rmSync(path.join(ROOT,old),{force:true});
 const runtime=stableCards(), recipes=j('data/season1/effect-recipes.runtime.v0.15.2.json'), hero=j('data/season1/hero-components.runtime.v1.1.0.json');
 const activeStarters=buildActiveStarters(runtime);
 if(recipes.canonical_registry_hash!==CARD_HASH||!Array.isArray(recipes.effect_recipes)||recipes.effect_recipes.length!==200)throw Error('Effect Recipe mismatch'); if(hero.registry_hash!==HERO_HASH)throw Error('Hero Component mismatch');
 const preview=previewFrom(runtime), legality=legalityFrom(runtime); write('data/season1/card-preview.generated.v1.6.0.json',JSON.stringify(preview,null,2)+'\n'); write('data/season1/legality-map.runtime.v1.6.0.json',JSON.stringify(legality,null,2)+'\n');
 for(const old of ['data/season1/card-preview.generated.v1.5.0.json','data/season1/legality-map.runtime.v1.5.0.json','data/config/active-runtime-source-stack.v1.91.json','data/config/active-runtime-source-stack.v1.94.json'])fs.rmSync(path.join(ROOT,old),{force:true});
 const stack={source_authority:V.osa,shared_runtime:V.sharedRuntime,runtime_data:V.runtimeData,effect_recipe:V.recipe,effect_checkpoint:V.checkpoint,hero_components:V.hero,starter60:V.starter,active_application_starters:'OSA v1.9.5 / Starter Deck Authority v1.6.1 (unchanged compositions)',active_starter_count:5,ui_contract:V.ui,application_runtime_sync:V.sync,vs_ai:V.vsai,tutorial:V.tutorial,canonical_registry_hash:CARD_HASH,hero_component_registry_hash:HERO_HASH,card_count:200,authority_mode:'OSA_CONSUMER_FAIL_CLOSED'}; write('data/config/active-runtime-source-stack.v1.95.json',JSON.stringify(stack,null,2)+'\n');
 const sourceStack={one_source_authority:V.osa,source_authority_stack_bundle:V.osa,shared_runtime:V.sharedRuntime,runtime_foundation:V.sharedRuntime,runtime_data:V.runtimeData,effect_checkpoint:V.checkpoint,effect_recipe:V.recipe,legality_map:'v1.6.0',hero_component_authority:V.hero,starter60:V.starter,ui_lock:V.ui,ui_design_lock:V.ui,application_runtime_sync:V.sync,local_ai:V.vsai,tutorial:V.tutorial,pvp_railway:'v3.42 (read-only reference)',deck_builder:'v1.31 (external)',canonical_registry_hash:CARD_HASH,hero_component_registry_hash:HERO_HASH,card_count:200,product_positioning:'RPG-Style TCG',resource_terminology:{deck:'Shard Deck',standard_shard:'Mana Shard',class_shard:'Class Shard',pool:'Shard Pool'},authority_mode:'OSA_CONSUMER_FAIL_CLOSED',generated_file:'js/static-data.js'};
 const definitions=Object.assign({version:V.runtimeData,date:'2026-09-22',status:'AUTHORITATIVE_GENERATED_RUNTIME_DATA'},runtime,{families:runtime.cards.reduce((g,c)=>{(g[c.family||'Unknown']||(g[c.family||'Unknown']={cards:[]})).cards.push(c);return g;},{})});
 const effectRecipes=Object.assign({version:V.recipe,date:'2026-09-22',status:'AUTHORITATIVE_GENERATED_EFFECT_RECIPES'},recipes);
 const gate={canonical_registry_hash:CARD_HASH,hero_component_registry_hash:HERO_HASH,card_count:200,schema_version:'1.6.0',source_authority:V.osa,shared_runtime:V.sharedRuntime,runtime_data:V.runtimeData,effect_recipe:V.recipe,effect_checkpoint:V.checkpoint,hero_components:V.hero,application_runtime_sync:V.sync,ui_contract:V.ui};
 const out=["'use strict';",'(function(window){',assignment('GL_SOURCE_STACK',sourceStack),assignment('GRANDIS_LEGACY_RUNTIME_DATA',runtime),assignment('GRANDIS_LEGACY_CARD_PREVIEW',preview),assignment('GRANDIS_LEGACY_HERO_COMPONENTS',hero),'window.GL_HERO_COMPONENTS=window.GRANDIS_LEGACY_HERO_COMPONENTS;',assignment('GL_CARD_DEFINITIONS',definitions),assignment('GL_EFFECT_RECIPES',effectRecipes),assignment('GL_ASSET_MANIFEST',assetManifest(runtime.cards)),assignment('GRANDIS_LEGACY_ONE_SOURCE_READY',gate),"})(typeof window!=='undefined'?window:globalThis);",''].join('\n'); write('js/static-data.js',out);
 // Tutorial deployment copies are generated from root source/data.
 fs.rmSync(path.join(ROOT,'tutorial/data'),{recursive:true,force:true}); fs.mkdirSync(path.join(ROOT,'tutorial/data/season1'),{recursive:true}); fs.mkdirSync(path.join(ROOT,'tutorial/data/config'),{recursive:true});
 for(const f of ['cards.runtime.v0.16.2.json','effect-recipes.runtime.v0.15.2.json','effect-checkpoint.v0.15.2.json','hero-components.runtime.v1.1.0.json','gameplay-authority.runtime.v1.9.0.json','card-preview.generated.v1.6.0.json','legality-map.runtime.v1.6.0.json'])copy('data/season1/'+f,'tutorial/data/season1/'+f); copy('data/config/active-runtime-source-stack.v1.95.json','tutorial/data/config/active-runtime-source-stack.v1.95.json'); write('tutorial/js/static-data.js',out); copy('js/runtime-authority.js','tutorial/js/runtime-authority.js');
 syncSharedApplicationMirrors();
 syncRuntimeMirror();
 console.log('PASS: OSA v1.9.5 / Shared Runtime v1.94.2 / UI v2.53 -> VS AI v6.44 + Tutorial v0.68; 5 unchanged starters / 200 canonical cards.');
}
build();
