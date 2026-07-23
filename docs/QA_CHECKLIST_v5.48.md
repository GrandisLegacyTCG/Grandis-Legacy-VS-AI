# QA Checklist — Grandis Legacy VS AI v5.48

## Mobile Legacy presentation
- [x] Legacy `!` control is anchored to the slot top-left.
- [x] Legacy `✦` action control is anchored to the slot top-right.
- [x] Both controls use the same 18 px mobile geometry as Hero controls.
- [x] Legacy name remains readable without controls clustering beside it.
- [x] Player and opponent Legacy slots preserve the left-side information anchor.

## Desktop isolation
- [x] Desktop Legacy information remains in the approved Legacy name row.
- [x] Mobile-only Legacy information control is hidden on desktop.

## Regression
- [x] v5.47 Android long-press, opponent Hand fan, Mana Regen, and decode-first visual checks remain active.
- [x] Existing gameplay, response, Casting, lineage, draw, attachment, tactical AI, and opening-flow suites pass.
- [x] Application Runtime Sync v2.33 hashes match the packaged application files.
- [x] Manifest SHA-256 verification and ZIP integrity pass.
