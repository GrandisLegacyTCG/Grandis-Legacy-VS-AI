# Grandis Legacy VS AI v6.42 / Tutorial v0.68 — Final Stability Pass (2026-09-22)

Baseline application package: **2026-09-21(9)**  
Application versions remain: **VS AI v6.42 / Tutorial v0.68**

## Scope

This release synchronizes VS AI/Tutorial to **Source Authority v1.9.5** and fixes only the final pre-PvP stability scope:

1. systemic Class Ability resolution,
2. systemic Racial Trait resolution,
3. Triple Shot + Hero Class Ability interaction,
4. Tablet Portrait Hand-card interaction,
5. contextual side-preview painted-edge geometry.

PvP is not modified. Starter Deck composition remains unchanged.

## Active authority stack

- OSA v1.9.5
- Shared Runtime v1.94.2 (unchanged)
- Runtime Data v0.16.2
- Effect Recipe v0.15.2
- Effect Checkpoint v0.15.2
- Application Runtime Sync v2.63
- UI Contract v2.53 (unchanged)
- Starter Deck Authority v1.6.1 / 5 active starters
- 200 canonical cards

## Hero Components

Generated Hero compatibility caches now come from canonical Hero Component references:

- Racial Trait caches: **30 / 30**
- Class Ability caches: **20 / 20**
- Rank-I Heroes without Class Ability: **10**, intentionally unchanged
- component deep parity and registry-hash validation: **PASS**
- application startup guard fails loudly on missing/mismatched component caches
- gameplay/UI uses a single resolved Hero Component access path

Existing execution engines remain where appropriate, but ability identity, eligibility, cost, amount, duration, and modifiers are authorized by resolved component definitions rather than isolated class-name repair hacks.

## Triple Shot / attack profile

The v1.9.4 Triple Shot lifecycle is preserved exactly: counter 1, owner End Phase `1 -> 0`, remove Attachment, Discard exactly once, no one-attack consumption, and no physical Arrow binding.

For Marksman, Sharpshooter Range coverage and Triple Shot Area/multi-target behavior coexist. Attack Label, Damage Type, Coverage, and Target Multiplicity remain distinct dimensions. A LEFT-lane Marksman with Triple Shot + qualifying Arrow processes legal targets LEFT → CENTER → RIGHT with separate Response opportunities.

## Tablet Portrait

Physical Tablet Portrait is detected separately from generic mobile layout. Hand behavior is now:

- first tap = existing quick preview,
- second tap on the same card = Detail Preview,
- first tap A then first tap B = quick preview B, no Detail popup,
- Play / Tribute action always wins over preview routing,
- armed state resets on the required lifecycle transitions.

Phone and Tablet Landscape behavior remain preserved.

## Contextual preview

Modal contextual preview positioning now measures actual painted `object-fit: contain` artwork edges rather than only the `<img>` layout box. Real production Korvak Ironfang / Hidden Stash acceptance measured:

- right visible gap: **11.84375 px**
- left visible gap: **11.828125 px**
- difference: **0.015625 px** (required ≤ 2 px)

No dummy SVG replacement and no synthetic repositioned-DOM acceptance test is used in the final Candidate 10 gate.

## CSS / locked UI

Production CSS is byte-identical to the 2026-09-21(9) baseline. No new `!important`, specificity lock, duplicate responsive rule, Candidate override block, or layout redesign was added. Desktop, phone, Tablet Landscape, Tablet Portrait layout, Card Played, Response Window, battlefield quick preview, Deck/Pile geometry, Regen presentation, badges, Shard sizing, Status UI, Attachment UI, and Lobby layout remain locked except for the requested JS interaction/geometry behavior.
