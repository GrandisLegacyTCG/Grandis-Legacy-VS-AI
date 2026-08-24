'use strict';
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}
const html=read('index.html'),css=read('css/app.css'),app=read('js/app.bundle.js'),data=read('js/static-data.js');
function need(ok,msg){if(!ok)throw new Error(msg)}
need(html.includes('gl-vs-ai-6.3'),'VS AI v6.2 cache revision missing');
need(app.includes('Grandis Legacy VS AI v6.11'),'VS AI v6.2 runtime version missing');
need(data.includes('"local_ai":"v6.11"')&&data.includes('"pvp_railway":"v3.09"')&&data.includes('"deck_builder":"v1.8"'),'App source stack versions missing');
need(!html.includes('desktop-scale.js'),'Whole-app desktop scaling must be disabled');
need(css.includes('Grandis Legacy PvP v2.6.11 — VS AI desktop scale restore + mobile Hand lock'),'Standard desktop geometry baseline missing');
console.log('PASS VS AI v6.2 standard desktop UI lock');
