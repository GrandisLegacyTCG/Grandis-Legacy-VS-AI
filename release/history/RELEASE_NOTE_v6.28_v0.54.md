# Grandis Legacy VS AI v6.28 + Tutorial v0.54 — 2026-09-07

## EXP visual correction
- Replaced the two opaque EXP strip files with one clean transparent master sprite: `assets/exp/Stack 100-200EXP.png`.
- The left sprite half is 100 EXP and the right sprite half is 200 EXP; both VS AI and Tutorial use the same single asset.
- Removed the previous split `Stack-100-EXP.png` / `Stack-200-EXP.png` assets and IMG stretching path.
- Kept the four fixed 7px slots (28px reserved rail) so Hero layout does not shift as Tribute cards are added.
- Fixed the vertical mismatch: the EXP rail now measures the actual `object-fit: contain` Hero artwork height and centers to that visible card, instead of stretching to the taller Hero button box.
- Resize handling re-synchronizes the rail on responsive viewport changes.

## Gameplay
No gameplay authority change. `hero.exp_cards`, Tribute values, Rank Up cleanup, defeat cleanup, Scouting removal, and Reposition behavior are unchanged. Source Stack remains v1.7.4.

## Versions
- VS AI: v6.28
- Tutorial: v0.54
