'use strict';
const path=require('path'),{spawn}=require('child_process');
const tests=[
  'run-v642-browser-ui.cjs',
  'run-v642-candidate13-browser.cjs'
];
function run(file){return new Promise((resolve,reject)=>{const p=spawn(process.execPath,[path.join(__dirname,file)],{stdio:'inherit'});p.on('exit',code=>code===0?resolve():reject(new Error(file+' exited '+code)));p.on('error',reject);});}
(async()=>{for(const file of tests){console.log('RUN browser gate '+file);await run(file);console.log('DONE browser gate '+file);await new Promise(r=>setTimeout(r,1200));}console.log('PASS browser suite: current Desktop baseline + Candidate (13) real-touch Tablet gates completed.');})().catch(err=>{console.error(err&&err.stack||err);process.exit(1);});
