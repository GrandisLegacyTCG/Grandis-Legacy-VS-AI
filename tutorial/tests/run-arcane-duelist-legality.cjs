"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
const root=path.join(__dirname,"..");
const data=JSON.parse(fs.readFileSync(path.join(root,"data/season1/cards.runtime.v0.12.6.json"),"utf8"));
const byId=new Map(data.cards.map(c=>[c.card_id,c]));
const hero=byId.get("S1-THF-H006");
const lineage=(hero.identity&&hero.identity.active_class_lineage)||[];
if(JSON.stringify(lineage)!==JSON.stringify(["Thief", "Mage", "Spell Blade", "Arcane Duelist"]))throw Error("Arcane Duelist lineage mismatch: "+JSON.stringify(lineage));
const ids=["S1-MAG-011", "S1-MAG-012", "S1-MAG-013", "S1-MAG-014", "S1-MAG-015", "S1-MAG-017", "S1-THF-009", "S1-THF-011", "S1-THF-012", "S1-THF-013", "S1-THF-014", "S1-THF-015", "S1-THF-017"];
for(const id of ids){const c=byId.get(id);const raw=JSON.stringify(c);if(/Arcane Duelist/.test(JSON.stringify(c.requirement&&c.requirement.legal_active_classes||[]))||/Arcane Duelist/.test(String(c.legal_active_classes||"")))throw Error(id+" still grants Arcane Duelist availability");}
const context={window:{},globalThis:{}};context.window=context;context.globalThis=context;vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,"js/runtime-authority.js"),"utf8"),context);
const rt=context.GL_RULES_RUNTIME;const h={card_id:"S1-THF-H006"};
if(rt.cardLegalForLineage(byId.get("S1-MAG-017"),h,hero,"Arcane Duelist"))throw Error("Frostfire Nova remains legal for Arcane Duelist");
if(!rt.cardLegalForLineage(byId.get("S1-MAG-001"),h,hero,"Arcane Duelist"))throw Error("Aether Ball should remain legal");
if(!rt.cardLegalForLineage(byId.get("S1-MAG-023"),h,hero,"Arcane Duelist"))throw Error("Aether Slash should remain legal");
const row=rt.selectClassRow(byId.get("S1-MAG-017").effect_strings_by_class,h,byId.get("S1-MAG-017"),{heroClass:"Arcane Duelist",heroCard:hero});if(row!==null)throw Error("Illegal Frostfire fallback row selected: "+row);
console.log("PASS Arcane Duelist legality and lineage-only fallback");
