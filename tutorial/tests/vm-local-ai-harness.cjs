'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');

function makeDummy(){
  return {
    id:'',innerHTML:'',textContent:'',value:'',disabled:false,hidden:false,checked:false,
    style:{},dataset:{},children:[],parentElement:null,
    classList:{add(){},remove(){},toggle(){},contains(){return false}},
    addEventListener(){},removeEventListener(){},appendChild(child){this.children.push(child);return child},remove(){},
    setAttribute(){},removeAttribute(){},getAttribute(){return null},
    querySelector(){return makeDummy()},querySelectorAll(){return[]},closest(){return null},
    focus(){},scrollIntoView(){},click(){},getBoundingClientRect(){return{x:0,y:0,left:0,top:0,right:100,bottom:140,width:100,height:140}}
  };
}

function loadLocalAI(root,mode){
  const dummy=makeDummy();
  const ctx={
    console,
    setTimeout:(fn)=>{try{fn()}catch{}return 0},clearTimeout(){},setInterval(){return 0},clearInterval(){},
    Math,Date,JSON,structuredClone:global.structuredClone,Uint32Array,
    crypto:{getRandomValues(arr){for(let i=0;i<arr.length;i++)arr[i]=i>>>0;return arr}},
    performance:{now(){return 0}},requestAnimationFrame:(fn)=>{try{fn(0)}catch{}return 0},cancelAnimationFrame(){},
    navigator:{userAgent:'node-test'},location:{href:'file://local-ai/index.html',reload(){}},
    getComputedStyle(){return{}},alert(){},confirm(){return true}
  };
  ctx.globalThis=ctx;ctx.window=ctx;ctx.GL_APP_MODE=String(mode||'LOCAL_AI').toUpperCase();
  ctx.document={
    readyState:'loading',addEventListener(){},removeEventListener(){},
    getElementById(){return dummy},querySelector(){return dummy},querySelectorAll(){return[]},
    createElement(){return makeDummy()},
    body:makeDummy(),documentElement:makeDummy()
  };
  ctx.localStorage={getItem(){return null},setItem(){},removeItem(){}};
  ctx.Audio=function(){return{currentTime:0,volume:1,play(){return Promise.resolve()},pause(){}}};
  vm.createContext(ctx);
  for(const file of ['js/static-data.js','js/runtime-authority.js','js/app.bundle.js']){
    vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
  }
  return ctx;
}
module.exports={loadLocalAI};
