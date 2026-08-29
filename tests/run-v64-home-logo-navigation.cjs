const fs=require('fs');
const app=fs.readFileSync('js/app.bundle.js','utf8');
function need(cond,msg){if(!cond){throw new Error(msg)}}
need(app.includes('<a class="ai-lobby-logo" href="https://grandislegacytcg.github.io/" aria-label="Grandis Legacy homepage">'),'VS AI logo homepage link missing');
need(app.includes('Grandis Legacy VS AI v6.19'),'VS AI v6.17 marker missing');
console.log('PASS VS AI v6.11 homepage-logo navigation');
