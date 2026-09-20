'use strict';
(function(root){
  function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
  const api={
    version:'v2.52',
    visual_baseline:'VS AI v6.42',
    source_role:'ONE_EDITABLE_SHARED_BATTLEFIELD_PRESENTATION_SOURCE',
    desktopPreviewPosition(viewportWidth,viewportHeight,previewWidth,previewHeight){
      const vw=Math.max(320,Number(viewportWidth||1280)),vh=Math.max(320,Number(viewportHeight||720));
      const w=Math.max(1,Number(previewWidth||250)),h=Math.max(1,Number(previewHeight||350));
      // Right-side overlay: visually aligned with the Card Played/right UI rail, clamped to viewport.
      return {x:clamp(vw-w-24,8,Math.max(8,vw-w-8)),y:clamp((vh-h)/2,8,Math.max(8,vh-h-8))};
    },
    previewPointerEvents:'none',
    deckCountPresentation:'numeric-above-card',
    statusCountPresentation:'numeric',
    counterAssetScope:'mana-regen-only'
  };
  root.GL_SHARED_BATTLEFIELD_UI=Object.freeze(api);
})(typeof window!=='undefined'?window:globalThis);
