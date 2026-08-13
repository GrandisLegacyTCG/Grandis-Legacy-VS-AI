const fs=require('fs');
function read(p){return fs.readFileSync(p,'utf8')}
const html=read('index.html'),css=read('css/app.css'),app=read('js/app.bundle.js'),scale=read('js/desktop-scale.js');
if(!html.includes('G-4C2Z5T0EWR'))throw new Error('VS AI GA4 tag missing');
if(!html.includes('desktop-scale.js'))throw new Error('Desktop adaptive-fit script missing');
if(!scale.includes('MOBILE_MAX=760')||!scale.includes('scrollHeight'))throw new Error('Adaptive-fit controller incomplete');
if(!css.includes('@media (min-width:521px) and (max-width:760px)')||!css.includes('height:52px!important'))throw new Error('Mobile Next Phase +4px lock missing');
if(css.includes('@media(max-width:1450px)'))throw new Error('Legacy 1450px breakpoint still active');
if(!app.includes("var blessingImmune=!!activeAttachmentForSide(state,targetSide,'S1-CLE-025')"))throw new Error('Blessing Attack immunity guard missing');
if(!app.includes('connectionPrevented?0:(dodged?dodgeResidualDamage'))throw new Error('Blessing must override dodge residual');
if(!app.includes('Blessing of Divinity prevents Primal Strike damage'))throw new Error('Blessing Primal Strike guard missing');
console.log('PASS v5.60 UI/effect locks');
