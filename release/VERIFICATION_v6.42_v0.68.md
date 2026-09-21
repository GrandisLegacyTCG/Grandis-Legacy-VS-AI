# Verification — Grandis Legacy VS AI v6.42 / Tutorial v0.68 — Candidate (9)

Verification date: 2026-09-21  
Baseline: **Candidate (8)**  
Candidate: **(9)**

## Authority / application status

- OSA v1.9.4 — PASS
- Shared Runtime v1.94.2 — PASS
- Runtime Data v0.16.1 — PASS
- Effect Recipe / Checkpoint v0.15.1 / v0.15.1 — PASS
- Application Runtime Sync v2.62 — PASS
- VS AI v6.42 — PASS
- Tutorial v0.68 — PASS
- Starter Deck Authority v1.6.1 / 5 active decks — PASS, compositions unchanged
- Canonical cards — 200

## Attachment authority / consumer verification

- Triple Shot This-Turn Attachment — PASS
- counter starts at 1 — PASS
- owner End Phase 1 → 0 — PASS
- moves to Discard exactly once — PASS
- modifier removed — PASS
- no physical-card binding — PASS
- unsafe `remaining_count || 1` consumer fallback absent — PASS
- Double Casting duration audit — PASS
- all-200 cross-phase audit — PASS; 24 explicit persistent policies
- Status-vs-Attachment distinction — PASS
- generic one-turn / multi-turn lifecycle — PASS
- Draw/Battle checkpoint isolation — PASS
- Hero defeat Attachment cleanup — PASS
- final-Hero terminal evaluation — PASS

## Browser-rendered Candidate (9) measurements

- Contextual side preview actual clicked-card anchor — PASS
- Right visible gap: **12 px**
- Left visible gap: **12 px**
- Gap difference: **0 px** — PASS (≤2 px)
- Legacy warning DOM count for one warning condition: **1** — PASS
- Deck-back widths (Legacy / Shard / Main): **55.4375 / 55.4375 / 55.4375 px** — PASS
- Desktop graphical Regen counter center difference: **0 px** — PASS
- Phone Regen in-slot center difference: **0.5 px** — PASS
- Tablet Portrait Regen in-slot center difference: **0.5 px** — PASS
- Tablet Landscape Regen center difference: **0.0078125 / 0.0078125 / 0 px** — PASS
- Tablet Landscape Shard width ratios: **0.825 / 0.8248487903 / 0.8248106061** — PASS (80–85%)
- Tablet Shard Deck count badge corner delta: **0 / 0 px** at all tested landscape viewports — PASS
- Tablet Phase Tracker preserved — PASS
- AI Lobby scroll preserved — PASS
- Battlefield first tap = Quick Preview, no popup — PASS
- second same-card activation = Detail — PASS
- different card first tap remains Quick Preview only — PASS
- non-battlefield first activation = Detail — PASS
- Play/Tribute direct actions do not trigger preview routing — PASS

## Code-quality gates

- no Candidate (9) CSS override block — PASS
- no new specificity-lock system — PASS
- one canonical Tablet Landscape Shard sizing rule — PASS
- one canonical Shard Deck Regen positioning rule — PASS
- obsolete `.touch-tablet-preview` / `.gl-tablet-hand-actions` system absent — PASS
- one Legacy warning render source — PASS
- stale Triple Shot binding path absent — PASS

## Full release gate

- `npm run verify` — **PASS** (exit status 0)
- VS AI integration — **PASS**
- Tutorial integration — **PASS**
- Candidate (9) Chromium geometry/interaction suite — **PASS**
- Root manifest — **PASS: 582 files; 0 missing / 0 hash mismatch / 0 size mismatch**
- Tutorial manifest — **PASS: 168 files; 0 missing / 0 hash mismatch / 0 size mismatch**
- Strict diff audit against Candidate (8) — **PASS**; production changes map to authority sync, Attachment consumer cleanup, contextual side preview, Legacy warning, Deck/Pile sizing, Regen UI, count-badge geometry, Tablet card routing/Shard sizing, and directly required CSS cleanup.
- New `!important` count in touched shared styles — **0 added** (net reduction versus Candidate (8))
- Candidate (9) patch-on-patch CSS block — **absent**

Final archive integrity and SHA-256 are produced after the final manifest refresh.
