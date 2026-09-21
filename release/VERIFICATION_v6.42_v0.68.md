# Verification — Grandis Legacy VS AI v6.42 / Tutorial v0.68 — Candidate (8)

Verification date: 2026-09-21  
Baseline: **(7)**  
Candidate: **(8)**

## Final status

**PASS** — Candidate (8) resolves the remaining listed desktop/tablet-landscape stabilization issues using root-cause changes rather than additive workaround layers. Application versions and authority/data baselines remain unchanged.

## Version / authority

- VS AI v6.42 — PASS
- Tutorial v0.68 — PASS
- OSA v1.9.3 — unchanged
- Shared Runtime v1.94.1 — unchanged
- UI Contract v2.53 — retained
- Application Runtime Sync v2.61 — retained
- Starter Deck Authority v1.6.1 — 5 active decks, unchanged
- Canonical cards — 200, unchanged
- PvP — untouched
- Deck Builder — untouched

## Desktop rendered verification

- Contextual side preview uses actual visible-card anchor — PASS
- Card Played visible LEFT gap — **11.50 px**
- Full Card History visible RIGHT gap — **12.171875 px**
- LEFT/RIGHT gap difference — **0.671875 px**, within ≤2 px — PASS
- Battlefield quick preview position/250×350 dimensions preserved — PASS
- Legacy warning rendered DOM count per warned Legacy — **1** — PASS
- Legacy name + warning on same row and centered — PASS
- Shard Deck main card center preserved — PASS
- Desktop REGEN composite center difference — **0 px** — PASS

## Tablet landscape lobby verification

Test matrix: 1024×768, 1180×820, 1366×1024.

- Normal page-level vertical scroll — PASS
- 1024×768 actual `scrollTop` changed from **0 → 422** — PASS
- 1024×768 bottom scroll reached **684 / 684** — PASS
- Start Game visible/reachable/hit-testable — PASS at all three viewports
- Larger tested landscape viewports require no extra page overflow and retain reachable Start Game — PASS

## Tablet landscape battle verification

At 1024×768, 1180×820, and 1366×1024:

- Phase Tracker no overlap / inside usable sidebar — PASS
- Next Phase visible and hit-testable — PASS
- Next Phase actual click advances phase — PASS
- End Turn visible/reachable/hit-testable in End phase — PASS
- Tablet REGEN text removed — PASS
- Tablet REGEN graphical counter remains inside Shard card — PASS
- REGEN center difference: **0.0078125 px / 0 px / 0 px** — PASS
- REGEN remains in upper visible card region — PASS
- Shard actual width ratios: **0.825 / 0.8248487903 / 0.8248106061** — PASS (80–85%)
- Battlefield first tap = Quick Preview, no Detail popup — PASS
- Battlefield second same-card tap = Detail popup — PASS
- Different battlefield card first tap stays Quick Preview only — PASS
- Non-battlefield Hand first tap = Detail popup — PASS
- Legacy popup card first tap = Detail popup — PASS
- Card Played first tap = Detail popup — PASS
- Play action does not trigger preview — PASS

## Global terminal-state verification

- Poison kills non-final Hero → match continues — PASS
- Poison kills AI final Hero → Player Win — PASS
- Poison kills Player final Hero → AI Win — PASS
- Hero-bound cleanup before terminal evaluation — PASS
- Direct lethal regression — PASS
- duplicate terminal event / End Phase stall — not observed
- **Gameplay production-code change required: NONE — baseline (7) already passed terminal-state tests**

## Locked-device / preservation verification

- Mobile preserved — PASS
- Tablet Portrait preserved — PASS
- Desktop battlefield quick preview preserved — PASS
- Desktop Deck/Pile main-card centering preserved — PASS
- no authority/card/Starter/PvP/Deck Builder change — PASS

## Code quality / diff control

Candidate (8) production diff against Candidate (7) is limited to the shared application UI/event source, shared application CSS, battlefield authority CSS, and generated deployment mirrors/metadata derived from those sources. Obsolete conflicting tablet-landscape Phase Tracker rules and the duplicate Legacy warning render path are removed rather than hidden by later patches. No duplicate warning render source or second competing tablet tap handler is introduced.

## Verification / manifests

The release is gated by root syntax/current tests, Tutorial integration/tests, Chromium baseline/Candidate 6/Candidate 7/Candidate 8 suites, generated-output reproducibility, runtime security, responsive contract, strict baseline diff review, regenerated manifests, archive integrity, and final package SHA-256.

Required manifest result after final packaging preparation:

- root `FILE_MANIFEST_SHA256.csv`: 0 missing / 0 size mismatch / 0 SHA mismatch
- Tutorial `tutorial/FILE_MANIFEST_SHA256.csv`: 0 missing / 0 size mismatch / 0 SHA mismatch
