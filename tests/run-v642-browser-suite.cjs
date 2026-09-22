'use strict';
const {spawn}=require('child_process');
const path=require('path');
const tests=[
  'run-v642-browser-ui.cjs',
  'run-v642-candidate12-browser.cjs'
];
function run(file){return new Promise((resolve,reject)=>{const p=spawn(process.execPath,[path.join(__dirname,file)],{stdio:'inherit'});p.on('error',reject);p.on('exit',(code,signal)=>code===0?resolve():reject(new Error(`${file} failed (${signal||code})`)));});}
Promise.all(tests.map(run)).then(()=>{console.log('PASS browser suite: current Desktop baseline + Candidate (12) real-touch Tablet gates completed.');}).catch(err=>{console.error(err&&err.stack||err);process.exit(1);});
