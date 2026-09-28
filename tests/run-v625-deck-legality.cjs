const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');function must(x,m){if(!x)throw new Error(m)}
const app=fs.readFileSync(path.join(root,'js/app.bundle.js'),'utf8'),pkg=require(path.join(root,'package.json'));
must(app.includes("if(mainIds.length<50||mainIds.length>60) errors.push('Deck validation failed: main_deck must contain 50 through 60 cards"),'50-60 inclusive VS AI validator missing');
must(app.includes('normal card max 3 copies'),'VS AI normal max-3 validator missing');
must(app.includes('Ultimate card max 1 per name'),'VS AI Ultimate max-1 validator missing');
must(pkg.version==='6.47.0','VS AI package version mismatch');
console.log('PASS v6.47: VS AI custom deck accepts 50-60 inclusive, normal max 3, Ultimate max 1.');
