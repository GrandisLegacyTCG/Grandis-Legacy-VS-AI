# Verification — Grandis Legacy VS AI v6.42 / Tutorial v0.68 — Candidate (6)

Verification date: 2026-09-21  
Baseline: **(5)(1)**  
Candidate: **(6)**

## Final status

**PASS** — Candidate (6) is a narrow correction pass. Requested rendered/UI/controller corrections are verified while the release remains VS AI v6.42 / Tutorial v0.68 and current authority/data baselines remain unchanged.

## Version / authority

- VS AI: v6.42 — PASS
- Tutorial: v0.68 — PASS
- OSA: v1.9.3 — unchanged
- Shared Runtime: v1.94.1 — gameplay authority unchanged
- UI Contract: v2.53 — retained
- Application Runtime Sync: v2.61 — retained
- Starter Deck Authority: v1.6.1 — 5 active decks, unchanged compositions
- Canonical cards: 200 — unchanged
- PvP: untouched

## Candidate (6) browser acceptance

- Contextual RIGHT visible-edge gap preserved — PASS
- Contextual LEFT/RIGHT visible-edge gap parity — PASS
- Card Played remains LEFT, 272 × 381 — PASS
- Popup previews remain above modal — PASS
- Desktop REGEN inside Shard Deck card — PASS
- Tablet-landscape REGEN inside Shard Deck card — PASS
- Phone REGEN grouped left of Shards in Shard Pool — PASS
- Tablet-portrait REGEN grouped left of Shards in Shard Pool — PASS
- No REGEN/Shard collision — PASS
- Discard top-card footprint parity — PASS
- Discard aspect ratio preserved — PASS
- Status badge placement/geometry unchanged — PASS
- Status numeral exactly 8 px — PASS
- Mobile Legacy count attached to card top-right — PASS
- Mobile Shard count attached to card top-right — PASS
- Mobile Discard count attached to card top-right — PASS
- Mobile Main count attached to card top-right — PASS
- mobile/tablet-portrait titles remain readable and cards contained — PASS
- Hero warning visual parity with Legacy/Attachment warning — PASS
- warning glyph centered and fully inside Hero container — PASS
- Hero warning visible without Hero/container hover — PASS
- warning tooltip is icon-hover/focus only — PASS
- Legacy name + warning group centered against card — PASS
- Ready/Exhausted Hero base-scale parity preserved — PASS

## Shard presentation acceptance

- normal Shard Draw entry animation — PASS
- Steal gain animation — PASS
- Meditation gain animation — PASS
- Elf racial gain animation — PASS
- generic gain path supports future visible Shard gains — PASS
- multi-Shard gain animates sequentially — PASS
- presentation does not alter Shard count/source/ownership/gameplay timing semantics — PASS

## Response ownership acceptance

- PLAYER attacks/skills AI: no player-owned Response Window during AI response priority — PASS
- AI response is evaluated/handled by AI controller — PASS
- AI attacks/skills PLAYER: player Response Window appears — PASS
- response chain may expose player Response Window only when priority legitimately returns to PLAYER — PASS
- response legality rules unchanged — PASS

## Tablet landscape acceptance

- desktop-like battlefield structure retained — PASS
- Phase Tracker/right sidebar proportional and non-overlapping — PASS
- Hand tap/click opens right-side 250 × 350 preview — PASS
- oversized center-screen Hand preview avoided — PASS
- compact Preview/action controls — PASS
- multiple controls stack vertically — PASS
- Deck/Pile cards remain contained — PASS
- no new horizontal page overflow — PASS

## Already-approved behavior preserved

- standard battlefield preview X — PASS / unchanged
- standard battlefield preview Y — PASS / unchanged
- Next Phase approximately 50% or more exposed — PASS
- opponent face-up/readable Shard hover — PASS / unchanged
- hidden opponent Shard safety — PASS / unchanged
- popup above-modal preview architecture — PASS / unchanged
- approved rounded-rectangle Deck/Pile badge visual — PASS / unchanged
- Status badge position/geometry/spacing — PASS / unchanged except required 8 px numeral
- Ready/Exhausted scale parity — PASS / unchanged

## Regression / immutability

Root syntax/current regression, application integration, authority sync, generated-output reproducibility, runtime security, responsive contract, deck legality, Response framework, attachment parity, opening flow, result reload, audio path, tactical AI planner, and mobile navigation all pass. Tutorial v0.68 application/lesson/release-lock regression passes. The Response ownership change is limited to which responder may receive an interactive player window/controller path; unrelated gameplay rules and canonical data are unchanged.

Production-source diff against exact baseline (5)(1) is restricted to files directly supporting the requested Candidate (6) corrections and their release/test metadata. No unrelated production cleanup/refactor is included.

## Manifests / package

After all source and documentation corrections, both SHA-256 manifests are regenerated and verified with:

- root `FILE_MANIFEST_SHA256.csv`: 0 missing / 0 size mismatch / 0 SHA mismatch — PASS
- Tutorial `tutorial/FILE_MANIFEST_SHA256.csv`: 0 missing / 0 size mismatch / 0 SHA mismatch — PASS

The final archive contains one repository folder and no redundant ZIP/RAR/7z copy inside the repository root. Archive integrity and final SHA-256 are checked after packaging.
