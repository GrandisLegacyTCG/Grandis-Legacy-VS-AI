# Grandis Legacy VS AI v6.30 + Tutorial v0.56 — 2026-09-07

## Scope
Presentation-only correction for the four-slot Tribute EXP stack in VS AI and Tutorial. Gameplay rules, Tribute state, EXP-card instances, Rank Up cleanup, and Source Stack authority are unchanged.

## Root cause
v6.29/v0.55 treated the Hero artwork and right-side EXP rail as one transform group. That model did not explicitly encode the physical orientation of the EXP cards after Exhaust, so the intended "upper edge, bottom-to-top" stack was not guaranteed by layout.

## Fix
- Replaced blind group rotation with an explicit orientation-aware card stage.
- Ready Hero: four fixed EXP slots remain on the Hero's right edge.
- Exhausted Hero: Hero artwork rotates -90 degrees; EXP card edges move to the upper edge of the rotated Hero.
- Exhausted EXP slots use `column-reverse`, so slot 1 is nearest the Hero and subsequent Tribute cards stack upward.
- Each EXP edge uses the same `Stack 100-200EXP.png` master sprite and is rotated horizontally while preserving exact 100/200 EXP instance selection.
- Runtime geometry now measures both visible Hero height and width so the upper EXP edge matches the rotated Hero dimensions.
- HP/status presentation remains outside the rotated artwork and stays upright.
- The full 28px / four-card capacity remains reserved from the start.

## Versions
- VS AI: v6.30
- Tutorial: v0.56
- Source Stack: unchanged (v1.7.4 for VS AI; Tutorial gameplay baseline unchanged)
