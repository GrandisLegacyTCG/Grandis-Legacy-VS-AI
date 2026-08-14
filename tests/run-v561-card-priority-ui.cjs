'use strict';
const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}
const html=read('index.html'),css=read('css/app.css'),app=read('js/app.bundle.js'),data=read('js/static-data.js');
function need(ok,msg){if(!ok)throw new Error(msg)}
need(html.includes('gl-vs-ai-5.61'),'VS AI v5.61 cache revision missing');
need(app.includes('Grandis Legacy VS AI v5.61'),'VS AI v5.61 runtime version missing');
need(data.includes('"local_ai":"v5.61"')&&data.includes('"pvp_railway":"v2.6.18"')&&data.includes('"deck_builder":"v1.2"'),'App source stack versions missing');
need(css.includes('Desktop card-priority scaling'),'Card-priority scaling block missing');
need(css.includes('width:clamp(106px,7.75vw,248px)!important'),'Hero card priority sizing missing');
need(css.includes('width:clamp(54px,3.75vw,120px)!important'),'Hand card priority sizing missing');
need(css.includes('clamp(92px,5.75vw,184px)'),'Hand row zoom compensation missing');
console.log('PASS VS AI v5.61 card-priority desktop UI lock');
