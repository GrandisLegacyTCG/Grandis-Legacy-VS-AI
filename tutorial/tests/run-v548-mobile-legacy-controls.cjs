'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'js/app.bundle.js'),'utf8');
const css=fs.readFileSync(path.join(root,'css/app.css'),'utf8');
function need(ok,msg){if(!ok)throw new Error(msg)}
need(app.includes('Grandis Legacy VS AI v5.52'),'v5.52 application label missing');
need(app.includes('legacy-hero-info--desktop'),'Desktop Legacy info control missing');
need(app.includes('legacy-hero-info--mobile'),'Mobile Legacy info control missing');
need(app.includes('hero-stage legacy-stage'),'Legacy stage anchor class missing');
need(css.includes('Grandis Legacy VS AI v5.52 — mobile Legacy control anchor consistency'),'v5.52 CSS lock missing');
need(css.includes('.hero-stage.legacy-stage>.legacy-hero-info--mobile'),'Mobile Legacy left control selector missing');
need(css.includes('left:3px!important')&&css.includes('top:2px!important'),'Mobile Legacy info is not anchored top-left');
need(css.includes('.hero-stage.legacy-stage>.mobile-hero-action-trigger'),'Mobile Legacy action selector missing');
need(css.includes('right:3px!important'),'Mobile Legacy action is not anchored top-right');
need(css.includes('.legacy-name-bar .legacy-hero-info--desktop{display:none!important}'),'Desktop Legacy info is not hidden on mobile');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
assert.strictEqual(pkg.version,'0.9.0');
console.log('PASS Tutorial mobile Legacy control anchor consistency');
