# Verification — Grandis Legacy VS AI v6.42 / Tutorial v0.68 — 2026-09-22

## Authority / data

- OSA v1.9.5 — **PASS**
- Shared Runtime v1.94.2 — **PASS / unchanged**
- Runtime Data v0.16.2 — **PASS**
- Effect Recipe / Checkpoint v0.15.2 / v0.15.2 — **PASS**
- Application Runtime Sync v2.63 — **PASS**
- Starter Deck Authority v1.6.1 / 5 active decks — **PASS**, compositions unchanged
- Canonical cards — **200**
- Hero cards — **30**
- Racial Ability caches — **30 / 30**
- Class Ability caches — **20 / 20**
- Component deep parity / registry hash — **PASS**

## Mandatory gameplay regressions

- Marksman qualifying Physical Attack gains Range — **PASS**
- Marksman LEFT can target RIGHT — **PASS**
- Renegade Rank III qualifying Physical Attack +10 — **PASS**
- Renegade Poison duration +1 — **PASS**
- Conqueror qualifying Physical Attack +10 — **PASS**
- Whirlwind does not incorrectly receive +10 — **PASS**
- Triple Shot counter starts at 1 — **PASS**
- Triple Shot qualifying Arrow becomes Area/multi-target — **PASS**
- Triple Shot + Marksman Range coverage — **PASS**
- LEFT Marksman covers all legal positions with separate Response windows — **PASS** (`LEFT`, `CENTER`, `RIGHT`)
- Triple Shot owner End Phase 1 → 0 — **PASS**
- Triple Shot Discard exactly once — **PASS**
- Rank Up component refresh — **PASS**
- Hero UI component visibility — **PASS**

## Class Ability matrix

Quick Reload, Rapid Chamber, Sharpshooter, Dead Eye, Venom Mastery, Nightshade Venom, Mana Surge, Arcane Surge, Vanquisher's Resolve, Arena Dominator, Holy Resurgence, Radiant Oblivion, Holy Grace, Holy Rejuvenation, Elemental Mastery, and Elemental Sovereignty — **PASS (16 / 16)**.

## Racial matrix

Primal Strike, Dragon Scale, Stoneblood, Ancestral Focus, Second Chance, and Human Ambition — **PASS (6 / 6)**.

## Tablet Portrait

- Physical Tablet Portrait detected separately — **PASS**
- 768×1024 — **PASS**
- 820×1180 — **PASS**
- first Hand tap quick preview / no Detail — **PASS**
- second same-card tap opens Detail — **PASS**
- A then B first taps do not open Detail — **PASS**
- Play after first tap — **PASS**
- Tribute after first tap — **PASS**
- Phone behavior preserved — **PASS**
- Tablet Landscape preserved — **PASS**
- Tablet Portrait layout unchanged — **PASS**

## Contextual preview

- painted visible-card rect used — **PASS**
- real Korvak source tested — **PASS**
- real Hidden Stash source tested — **PASS**
- synthetic repositioned-DOM test used in final acceptance — **NO**
- dummy SVG replacement used in final acceptance — **NO**
- right visible gap — **11.84375 px**
- left visible gap — **11.828125 px**
- difference — **0.015625 px**
- required — **≤ 2 px**
- preview size preserved — **PASS**
- popup stacking preserved — **PASS**

## CSS quality

- production CSS diff vs baseline — **0 bytes changed**
- new Candidate override block — **NO**
- new `!important` — **0**
- new specificity lock — **0**
- duplicate responsive rule added — **0**
- obsolete CSS added instead of deleted — **NO**
- unrequested CSS/layout changes — **NONE**

## Release gates

- OSA executable tests — **29 / 29 PASS**
- VS AI integration — **PASS**
- Tutorial integration — **PASS**
- browser baseline suite — **PASS**
- Candidate 6 browser suite — **PASS**
- Candidate 7 browser suite — **PASS**
- Candidate 8 browser suite — **PASS**
- Candidate 10 real-device/real-artwork browser suite — **PASS**
- generated-output reproducibility — **PASS**
- production asset topology — **PASS**
- root manifest — **PASS after final regeneration**
- Tutorial manifest — **PASS after final regeneration**
- `npm run verify` aggregate — **execution harness timeout before completion; no assertion failure observed**
- all constituent verify stages (`prepare:release`, current tests, Tutorial tests, browser suites, manifests) — **PASS when run independently**
- PvP production repository changes — **NONE**

Final archive filenames and SHA-256 are reported alongside the packaged artifacts after archive creation.
