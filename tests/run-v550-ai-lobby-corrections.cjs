'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'js/app.bundle.js'),'utf8');
const css=fs.readFileSync(path.join(root,'css/app.css'),'utf8');
assert(!/class="deck-counts"/.test(app),'redundant Main/Legacy/Packages pill still rendered');

const deckFiles=fs.readdirSync(path.join(root,'starter_deck_examples')).filter(x=>/^starter_.*\.json$/.test(x));
assert.strictEqual(deckFiles.length,5,'five starter deck files required');
for(const file of deckFiles){
  const deck=JSON.parse(fs.readFileSync(path.join(root,'starter_deck_examples',file),'utf8'));
  const heroIds=new Set((deck.legacy_deck_expanded||[]).filter(x=>String(x.card_type||'').toLowerCase()==='hero').map(x=>x.card_id));
  for(const [lane,rankOne] of Object.entries(deck.default_formation||{})){
    const m=String(rankOne).match(/^(S1-[A-Z]+-H)(\d{3})$/);assert(m,file+' '+lane+' invalid Rank I id');
    const n=Number(m[2]),base=n-((n-1)%3),rankTwo=m[1]+String(base+1).padStart(3,'0');
    assert(heroIds.has(rankTwo),file+' '+lane+' missing Rank II '+rankTwo);
  }
}
assert(app.includes("rankHeroIdFromProgression(rankOneId,2)"),'Rank II deterministic resolver missing');
assert(app.includes("if(candidate&&heroIds.indexOf(candidate)!==-1)return candidate"),'Rank II deck membership guard missing');
assert(app.includes('class="pvp-v260-card pvp-progression-static-card" type="button" data-preview="'),'Progression Rank cards must open Card Preview');
assert(app.includes('document.body.appendChild(modal);bringModalToFront(modal);prepareRenderedImages(modal)'),'Hero Progression must render immediately before asset completion');
assert(app.includes('btn.onclick=function(ev)'),'Formation Hero click binding must be direct and replacement-safe');
assert(css.includes('.pvp-progression-modal{')&&css.includes('z-index:10045!important'),'Hero Progression modal presentation missing');
assert(css.includes('body.deck-setup-active #previewOverlay{z-index:10060!important}'),'Card Preview must layer above Hero Progression');
assert(css.includes('.deck-setup-screen.runtime-ui-v14-setup .deck-setup-actions .start-match-primary{'),'Start Match specificity correction missing');
assert(css.includes('background:linear-gradient(180deg,#f5dc91 0%,#c49b43 100%)!important'),'Start Match gold surface missing');
assert(css.includes('.deck-setup-screen.runtime-ui-v14-setup .formation-card .formation-position{'),'Formation position label visibility lock missing');
assert(css.includes('overflow:visible!important'),'Formation overflow correction missing');
console.log('PASS VS AI v5.52 AI Lobby count removal, Rank II Formation, Progression modal, and Start Match corrections');
