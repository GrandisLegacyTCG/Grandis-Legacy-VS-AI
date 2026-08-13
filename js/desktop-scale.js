/* Grandis Legacy desktop adaptive-fit controller.
   Desktop gameplay stays in one viewport; mobile intentionally keeps normal scrolling. */
(function(){
  'use strict';
  var MOBILE_MAX=760, raf=0;
  function reset(app){
    document.documentElement.style.removeProperty('--gl-desktop-scale');
    document.body.classList.remove('gl-desktop-adaptive-fit');
    if(app){app.style.zoom='';app.style.width='';app.style.maxWidth='';}
  }
  function apply(){
    raf=0; var app=document.getElementById('app'); if(!app)return;
    if(window.innerWidth<=MOBILE_MAX){reset(app);return;}
    app.style.zoom='1';app.style.width='100%';app.style.maxWidth='';
    var naturalW=Math.max(1,app.scrollWidth||app.getBoundingClientRect().width||1);
    var naturalH=Math.max(1,app.scrollHeight||app.getBoundingClientRect().height||1);
    var scale=Math.min(1,window.innerWidth/naturalW,window.innerHeight/naturalH);
    scale=Math.max(0.72,Math.min(1,scale));
    document.documentElement.style.setProperty('--gl-desktop-scale',String(scale));
    document.body.classList.add('gl-desktop-adaptive-fit');
    if(scale<0.999){app.style.width=(100/scale).toFixed(4)+'%';app.style.maxWidth='none';app.style.zoom=String(scale);}else{app.style.zoom='1';}
  }
  function schedule(){if(raf)return;raf=requestAnimationFrame(apply);}
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('orientationchange',schedule,{passive:true});
  window.addEventListener('gl-local-state-rendered',schedule);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){schedule();setTimeout(schedule,80);},{once:true});else{schedule();setTimeout(schedule,80);}
})();
