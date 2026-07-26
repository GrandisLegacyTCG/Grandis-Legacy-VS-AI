const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'js/app.bundle.js'),'utf8');
const css=fs.readFileSync(path.join(root,'css/app.css'),'utf8');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/season1/cards.runtime.v0.12.6.json'),'utf8'));
function fail(msg){console.error('FAIL',msg);process.exit(1)}
if(!app.includes('>Not Available</span>'))fail('Not Available label missing');
if(app.includes('title="'+"'+esc(reasonText)+'"))fail('native response title tooltip remains');
if(!app.includes('firstPrioritizedResponseReason'))fail('response hierarchy helper missing');
if(!app.includes('focusMobilePlayerHand'))fail('mobile hand focus missing');
if(!app.includes('setTimeout(runNext,50)'))fail('draw sequence is not sequential');
if(!css.includes('scrollbar-width:none!important'))fail('mobile Hand scrollbar not hidden');
if(!css.includes('grid-template-rows:84px 34px'))fail('two-action Hand layout missing');
const card=data.cards.find(c=>c.card_id==='S1-MAG-018');
if(!card)fail('Double Casting missing');
const policy=card.double_casting_policy||card.canonical_execution&&card.canonical_execution.double_casting_policy||{};
if(policy.rank2_target_rule!=='same or different legal Hero'||policy.rank3_target_rule!=='same or different legal Hero')fail('Double Casting target parity missing');

const responsePolicy=require('../runtime-source/runtime/core/response-availability-policy');
const priorityReason=responsePolicy.prioritizeUnavailableReason([
  'Not enough Mana: needs 3, available 1.',
  'The Hero Class/Lineage cannot use this card.'
],{reason_flags:{class_mismatch:true},required_mana:3,available_mana:1});
assert.strictEqual(priorityReason,'This Hero’s class cannot use this card.');
assert.strictEqual(responsePolicy.prioritizeUnavailableReason(['Not enough Mana: needs 3, available 1.'],{}),'Not enough Mana. Requires 3; 1 available.');

console.log('PASS v5.46 fixes');
