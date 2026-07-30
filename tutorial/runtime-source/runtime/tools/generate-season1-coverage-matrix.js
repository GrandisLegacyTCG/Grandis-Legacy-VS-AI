#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
function parseArgs(argv){const out={};for(let i=2;i<argv.length;i++)if(argv[i].startsWith('--'))out[argv[i].slice(2)]=argv[++i];return out}
function load(file,key){const raw=JSON.parse(fs.readFileSync(file,'utf8'));const list=Array.isArray(raw)?raw:raw[key];if(!Array.isArray(list))throw Error(`Expected ${key} array in ${file}`);return{raw,list}}
function csv(v){v=String(v??'');return /[",\n]/.test(v)?`"${v.replace(/"/g,'""')}"`:v}
function main(){
 const a=parseArgs(process.argv),root=path.join(__dirname,'../..');
 const dataDir=path.join(root,'data','season1');
 const cardFile=a.cards||fs.readdirSync(dataDir).filter(n=>/^cards\.runtime\..*\.json$|^cards\.runtime\.generated\..*\.json$/.test(n)).sort().pop();
 const recipeFile=a.recipes||fs.readdirSync(dataDir).filter(n=>/^effect-recipes\..*\.json$|^effect-recipes\.generated\..*\.json$/.test(n)).sort().pop();
 if(!cardFile||!recipeFile)throw Error('Generated card/effect data not found. Pass --cards and --recipes.');
 const cp=path.isAbsolute(cardFile)?cardFile:path.join(dataDir,cardFile),rp=path.isAbsolute(recipeFile)?recipeFile:path.join(dataDir,recipeFile);
 const cards=load(cp,'cards'),recipes=load(rp,'effect_recipes'),byRecipe=new Map(recipes.list.map(r=>[r.card_id,r]));
 const rows=cards.list.map(card=>{const recipe=byRecipe.get(card.card_id)||{},exec=card.canonical_execution||{},effects=Array.isArray(exec.effects)?exec.effects:(card.effects||[]),dispatch=exec.dispatch||{},family=card.card_type||card.family||'',isEntity=/Hero|Legacy/.test(family),ready=isEntity||dispatch.enabled!==false||effects.length>0||Boolean(exec.attack||exec.class_ability||exec.racial_ability||exec.legacy_ability);return{card_id:card.card_id,name:card.name,family,classification:card.classification||'',canonical_hash:card.canonical_hash||'',effect_count:effects.length,dispatch_handler:dispatch.handler||recipe.dispatch_handler||'',coverage_status:ready?'executable':'blocked',reason:ready?'structured canonical execution available':'no structured execution handler'};}).sort((a,b)=>a.card_id.localeCompare(b.card_id));
 const counts=rows.reduce((o,r)=>(o[r.coverage_status]=(o[r.coverage_status]||0)+1,o),{}),summary={schema_version:'1.4.0',generated_from:{cards:path.basename(cp),recipes:path.basename(rp)},canonical_registry_hash:cards.raw.canonical_registry_hash||null,card_count:rows.length,recipe_count:recipes.list.length,counts_by_coverage_status:counts,rows};
 const out=a.out||path.join(root,'docs','coverage');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'SEASON1_CARD_COVERAGE_MATRIX_v1.4.0.json'),JSON.stringify(summary,null,2)+'\n');const headers=Object.keys(rows[0]||{});fs.writeFileSync(path.join(out,'SEASON1_CARD_COVERAGE_MATRIX_v1.4.0.csv'),[headers.join(','),...rows.map(r=>headers.map(h=>csv(r[h])).join(','))].join('\n')+'\n');fs.writeFileSync(path.join(out,'SEASON1_CARD_COVERAGE_SUMMARY_v1.4.0.md'),`# Season 1 Structured Runtime Coverage v1.4.0\n\n- Cards: ${rows.length}\n- Effect recipes: ${recipes.list.length}\n- Executable: ${counts.executable||0}\n- Blocked: ${counts.blocked||0}\n- Canonical registry: \`${summary.canonical_registry_hash||'n/a'}\`\n`);console.log(`PASS structured coverage ${counts.executable||0}/${rows.length}`);if(rows.length!==198||recipes.list.length!==198||(counts.blocked||0)>0)process.exit(1);
}
if(require.main===module)main();module.exports={main};
