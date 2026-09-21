'use strict';
(function(root){
  function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
  function dims(viewportWidth,viewportHeight,previewWidth,previewHeight){
    const vw=Math.max(320,Number(viewportWidth||1280)),vh=Math.max(320,Number(viewportHeight||720));
    const w=Math.max(1,Number(previewWidth||250)),h=Math.max(1,Number(previewHeight||350));
    return {vw:vw,vh:vh,w:w,h:h};
  }
  function rectValue(rect,key,fallback){const v=rect&&Number(rect[key]);return Number.isFinite(v)?v:fallback;}
  const api={
    version:'v2.53',
    visual_baseline:'VS AI v6.42',
    source_role:'ONE_EDITABLE_SHARED_BATTLEFIELD_PRESENTATION_SOURCE',
    // Standard readable battlefield cards live in a lower-right overlay. The caller may
    // pass the bottom edge of the protected Turn/Phase/Next-Phase region.
    desktopPreviewPosition(viewportWidth,viewportHeight,previewWidth,previewHeight,protectedBottom){
      const d=dims(viewportWidth,viewportHeight,previewWidth,previewHeight),pad=16;
      const minY=Math.max(8,Number(protectedBottom||0)+12);
      const preferredY=d.vh-d.h-pad;
      return {x:clamp(d.vw-d.w-132,8,Math.max(8,d.vw-d.w-8)),y:clamp(Math.max(minY,preferredY),8,Math.max(8,d.vh-d.h-8))};
    },
    // Candidate (7): one side-of-card geometry authority for every contextual preview.
    // Callers pass the *visible card-art rect*, not a padded wrapper rect.
    sidePreviewPosition(anchorRect,viewportWidth,viewportHeight,previewWidth,previewHeight,preferredSide){
      const d=dims(viewportWidth,viewportHeight,previewWidth,previewHeight),a=anchorRect||{},gap=12;
      const left=rectValue(a,'left',0),right=rectValue(a,'right',left+rectValue(a,'width',0)),top=rectValue(a,'top',0),bottom=rectValue(a,'bottom',top+rectValue(a,'height',0));
      const width=rectValue(a,'width',Math.max(0,right-left)),height=rectValue(a,'height',Math.max(0,bottom-top));
      const roomLeft=left-gap,roomRight=d.vw-right-gap,roomAbove=top-gap,roomBelow=d.vh-bottom-gap;
      let x,y,placement,preferred=preferredSide==='left'||preferredSide==='right'?preferredSide:null;
      if(roomLeft>=d.w || roomRight>=d.w){
        if(preferred && ((preferred==='left'&&roomLeft>=d.w)||(preferred==='right'&&roomRight>=d.w))) placement=preferred;
        else if(roomLeft>=d.w && roomRight>=d.w) placement=(left+width/2)>=d.vw/2?'left':'right';
        else placement=roomRight>=d.w?'right':'left';
        x=placement==='right'?right+gap:left-d.w-gap;
        y=top+(height-d.h)/2;
      }else if(roomAbove>=d.h){
        placement='above';x=left+(width-d.w)/2;y=top-d.h-gap;
      }else if(roomBelow>=d.h){
        placement='below';x=left+(width-d.w)/2;y=bottom+gap;
      }else{
        placement=roomAbove>=roomBelow?'above':'below';
        x=left+(width-d.w)/2;y=placement==='above'?top-d.h-gap:bottom+gap;
      }
      return {x:clamp(x,8,Math.max(8,d.vw-d.w-8)),y:clamp(y,8,Math.max(8,d.vh-d.h-8)),placement:placement,gap:gap};
    },
    // Card Played remains left-preferred, but now uses the exact same visible-edge rule.
    cardPlayedPreviewPosition(anchorRect,viewportWidth,viewportHeight,previewWidth,previewHeight){
      return api.sidePreviewPosition(anchorRect,viewportWidth,viewportHeight,previewWidth,previewHeight,'left');
    },
    // Lists/modals use the same side-preview rule with automatic side selection.
    contextualPreviewPosition(anchorRect,viewportWidth,viewportHeight,previewWidth,previewHeight){
      return api.sidePreviewPosition(anchorRect,viewportWidth,viewportHeight,previewWidth,previewHeight,null);
    },
    previewPointerEvents:'none',
    deckCountPresentation:'rounded-rectangle-top-corner-badge',
    statusCountPresentation:'individual-rounded-rectangle-bottom-right-badge',
    attachmentCountPresentation:'rounded-rectangle-top-corner-badge',
    warningPresentation:'persistent-icon-hover-detail',
    counterAssetScope:'mana-regen-only'
  };
  root.GL_SHARED_BATTLEFIELD_UI=Object.freeze(api);
})(typeof window!=='undefined'?window:globalThis);
