# QA Checklist — Grandis Legacy VS AI v5.47

## Android / mobile presentation
- [x] Native context menu and image drag are suppressed for Player Hand cards.
- [x] Long press opens the custom enlarged Hand-card preview.
- [x] Moving more than the gesture threshold cancels long press so horizontal Hand swipe remains available.
- [x] Releasing or canceling the pointer closes the preview.
- [x] Mobile opponent Hand uses the compact fan; Player Hand remains straight and horizontally swipeable.
- [x] `Mana Regen +N` is pinned inside the mobile Mana Pool cell above the clipping edge.

## Image loading
- [x] Coin controls and flip-stage artwork have fixed square geometry before decode.
- [x] Flying cards have fixed 5:7 geometry before decode.
- [x] Newly inserted images remain hidden until decoded or safely settled.
- [x] Single-card and parallel draw animations wait for image decode before movement starts.
- [x] Racial Token Head/Tail use optimized 256 px WebP assets.

## Regression
- [x] Runtime source/deploy hashes match Application Runtime Sync v2.32.
- [x] Existing gameplay, response, Casting, lineage, Card Played, draw, attachment, tactical AI, and opening-flow suites pass.
- [x] Manifest SHA-256 verification passes.
- [x] Package contains no nested historical archive.
