'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
assert.strictEqual(pkg.version,'6.31.0','VS AI package version must be 6.31.0');
const tutPkg=JSON.parse(fs.readFileSync(path.join(root,'tutorial/package.json'),'utf8'));
assert.strictEqual(tutPkg.version,'0.57.0','Tutorial package version must be 0.57.0');
for(const base of [root,path.join(root,'tutorial')]){
  const app=fs.readFileSync(path.join(base,'js/app.bundle.js'),'utf8');
  const css=fs.readFileSync(path.join(base,'css/app.css'),'utf8');
  const q=app.indexOf('function queueBattleFeedback(evt)');
  assert.ok(q>=0,'battle feedback queue missing');
  const audio=app.indexOf('playBattleFeedbackAudioNow(evt);',q);
  const push=app.indexOf('GL_BATTLE_FEEDBACK_QUEUE.push(evt)',q);
  assert.ok(audio>q && push>audio,'battle SFX must fire immediately before VFX/render queueing');
  assert.ok(app.includes('manualRepositionUsedThisTurn'),'manual Reposition used-state helper missing');
  assert.ok(app.includes('manualRepositionAvailable'),'manual Reposition availability helper missing');
  assert.ok(app.includes('Manual Reposition can be used at most once during your active turn. Deploy and Reform share this limit.'),'manual Reposition once-per-active-turn guard text missing');
  assert.ok(app.includes("response_payment_choice"),'generic post-commit response payment flow missing');
  assert.ok(app.includes('committed_response_counter:true'),'new counter Response Window marker missing');
  assert.ok(app.includes("recordLocalPlayerAction(appState,'REACTION'") && app.includes("recordOpponentAction(appState,'REACTION'"),'committed counter-reaction must be recorded for Card Played on both local/AI sides');
  assert.ok(app.includes('if(explicit.length) return explicit;'),'Card Played must prefer explicit committed counter chain events');
  assert.ok(app.includes('hero-card-physical-stack'),'physical Hero/EXP composition missing');
  assert.ok(css.includes('flex-direction:column-reverse!important'),'Exhausted EXP stack must run bottom-to-top');
  assert.ok(css.includes('Stack 100-200EXP.png'),'shared 100/200 EXP sprite missing');
  assert.ok(app.includes('Grandis Legacy Source Authority Stack v1.7.5'),'Source Stack v1.7.5 adoption missing');
}
console.log('PASS VS AI v6.31 / Tutorial v0.57 current-fix contract: immediate SFX, Binding Light chain recording, manual Reposition limit, response payment framework, and EXP orientation.');
