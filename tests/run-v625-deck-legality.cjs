const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');function must(x,m){if(!x)throw new Error(m)}
const app=fs.readFileSync(path.join(root,'js/app.bundle.js'),'utf8'),pkg=require(path.join(root,'package.json'));
must(app.includes("if(mainIds.length!==60) errors.push('Deck validation failed: main_deck must contain exactly 60 cards"),'exact-60 VS AI validator missing');
must(app.includes('normal card max 3 copies'),'VS AI normal max-3 validator missing');
must(app.includes('Ultimate card max 1 per name'),'VS AI Ultimate max-1 validator missing');
must(pkg.version==='6.28.0','VS AI package version mismatch');
console.log('PASS v6.25: VS AI custom deck requires exactly 60 cards, normal max 3, Ultimate max 1.');
