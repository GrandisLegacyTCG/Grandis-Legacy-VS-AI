'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'../..');
const read=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));
const shaFile=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function stable(v){if(Array.isArray(v))return`[${v.map(stable).join(',')}]`;if(v&&typeof v==='object')return`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`;return JSON.stringify(v)}
const objectHash=v=>crypto.createHash('sha256').update(stable(v),'utf8').digest('hex');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
module.exports={ROOT,read,shaFile,objectHash,assert,fs,path};
