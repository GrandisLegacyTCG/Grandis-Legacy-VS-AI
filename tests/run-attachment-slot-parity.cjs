'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const cssPath=fs.existsSync(path.join(root,'css/app.css'))?path.join(root,'css/app.css'):path.join(root,'public/css/app.css');
const css=fs.readFileSync(cssPath,'utf8');
const must=[
  '.hero-row--opponent .hero-lane.legacy-slot',
  'grid-template-rows:35px minmax(0,1fr) 27px!important',
  '.hero-row--player .hero-lane.legacy-slot',
  'grid-template-rows:27px minmax(0,1fr) 35px!important',
  'grid-template-rows:34px minmax(0,1fr) 26px!important',
  'grid-template-rows:26px minmax(0,1fr) 34px!important',
  'Legacy Attachment Slot size parity'
];
for(const token of must)if(!css.includes(token))throw new Error('Missing Legacy/Hero Attachment parity token: '+token);
if(/legacy-slot[^{}]*warrior|warrior[^{}]*legacy-slot/i.test(css))throw new Error('Class-specific Legacy Attachment size override is not allowed');
console.log('PASS Legacy Attachment Slots follow Hero Attachment Slot dimensions on desktop and mobile');
