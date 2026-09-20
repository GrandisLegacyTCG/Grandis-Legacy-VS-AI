'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=__dirname; const dirs=['Runtime','Security']; let passed=0,failed=0;
for(const d of dirs){for(const f of fs.readdirSync(path.join(root,d)).filter(x=>x.endsWith('.test.cjs')).sort()){
 const full=path.join(root,d,f); const r=cp.spawnSync(process.execPath,[full],{stdio:'inherit'}); if(r.status===0)passed++; else failed++;
}}
console.log(`OSA RUNTIME PROPAGATION: ${passed} passed / ${failed} failed`); if(failed)process.exit(1);
