'use strict';
const fs=require('fs'),path=require('path');
const {loadLocalAI}=require('./vm-local-ai-harness.cjs');
const root=path.resolve(__dirname,'..','..'),ctx=loadLocalAI(root);
function need(v,m){if(!v){console.error('FAIL',m);process.exit(1)}}
need(typeof ctx.GL_LAB_V012_OPENING_ARBALEST_QA_SELF_TEST==='function','v0.12 QA hook missing');
const qa=ctx.GL_LAB_V012_OPENING_ARBALEST_QA_SELF_TEST();need(qa&&qa.ok,'v0.12 integrated QA failed: '+JSON.stringify(qa));
const src=fs.readFileSync(path.join(root,'js/app.bundle.js'),'utf8');
const opening=src.slice(src.indexOf('function drawOpeningManaAfterHands'),src.indexOf('function incrementDrawCounterCastings'));
need(opening.indexOf('function drawOpeningHandsBeforeMana')>=0,'opening Hand-first function missing');
need(opening.indexOf('return drawOpeningHandsBeforeMana(state,firstSide,opts)')>=0,'completeOpeningFlow does not enter Hand-first path');
need(/sideHasActiveArbalestDrawCounter/.test(src),'Arbalest activation gate missing from generic actual Draw authority');
need(/before Rank II reward draws resolve/.test(src),'Rank Up activation checkpoint comment missing');
console.log('PASS v0.12 opening + Arbalest counter:',qa);
