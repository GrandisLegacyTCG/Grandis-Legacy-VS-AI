# Verification — VS AI v6.29 + Tutorial v0.55

## Root-cause regression
- PASS: Hero artwork and EXP rail are children of one `hero-card-physical-stack` transform group.
- PASS: Exhaust is bound to that physical group, not to `img.heroImg` alone.
- PASS: HP overlay remains outside the rotating physical group and stays upright.
- PASS: outer composition permanently reserves 28px for four 7px EXP slots.
- PASS: exact `hero.exp_cards` instance rendering and 100/200 sprite-half selection are preserved.

## Full application verification
- PASS: root `npm run verify` (VS AI + Tutorial full regression suite).
- PASS: VS AI manifest verification — 397 files (manifest excludes itself by design).
- PASS: Tutorial manifest verification — 161 files.
- PASS: syntax verification for application bundles, Tutorial guide, runtime authority, and runtime-source JS/MJS.
- PASS: Source Stack gameplay baselines unchanged (VS AI v1.7.4; Tutorial prior v1.7.3 gameplay baseline).
