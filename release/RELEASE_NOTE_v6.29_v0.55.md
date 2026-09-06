# Grandis Legacy VS AI v6.29 + Tutorial v0.55 — 2026-09-07

## Scope
Visual-only refinement of the physical Tribute EXP stack introduced in v6.28/v0.54.

## Root cause
Exhaust rotation was owned by `img.heroImg.exhausted-card`. The EXP rail was a sibling of the Hero card anchor, so it could not inherit the Hero's rotation and remained vertical while the Hero artwork rotated.

## Fix
- Introduced a structural `hero-card-physical-stack` group containing the Hero card and its four-slot EXP rail.
- Exhaust state now rotates the physical group once (`rotate(-90deg) scale(.86)`), so the Hero and all current EXP cards move together.
- HP/status presentation remains outside the rotating physical group and stays upright.
- The outer Hero composition still reserves the full 28px four-slot EXP width from the start.
- Existing exact `hero.exp_cards` rendering, 100/200 EXP sprite selection, Rank Up clear, Scouting removal, and Reposition behavior are unchanged.

## Authority
No Source Stack gameplay authority change. Tribute, EXP, Exhaust, Rank Up, and Reposition rules are unchanged; this release changes presentation structure only.

## Versions
- VS AI: v6.29
- Tutorial: v0.55
- Source Stack: v1.7.4 unchanged for VS AI gameplay
- Tutorial gameplay baseline: VS AI v6.24 / Source Stack v1.7.3 unchanged
