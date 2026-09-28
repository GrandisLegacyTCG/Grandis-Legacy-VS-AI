# Grandis Legacy VS AI v6.47 + Tutorial v0.70 — Final Correction Audit

Date: 2026-09-28

## Version

- VS AI: **v6.47**
- Tutorial: **v0.70**
- OSA / Source Authority: **v1.9.5 — unchanged**
- Player Rulebook: **v2.6 — unchanged**
- Active application Runtime Sync: **v2.65**
- Canonical cards: **200**
- Active official Starter Decks: **5**, all unchanged at **60 Main Deck cards**

## Baseline provenance

The requested raw v6.46/v0.69 ZIP was indexed in the Project Library, but its raw bytes were not authorized for materialization in this execution environment. The mounted repository bytes available for implementation were the v6.45/v0.69 package. Before applying v6.47 changes, the documented final v6.46 corrections were reconstructed from the final v6.46 release audits: response-family-specific `cannot_block`, battle-audio muted-event dedup behavior, and the approved Player/AI `Swap.png` Lobby component. All of those reconstructed v6.46 behaviors were then covered by current regression tests. This report does not claim byte-for-byte identity with the unavailable v6.46 ZIP.

## Flashpowder / nested Response

- First-level Item -> Flashpowder cancel: **PASS**
- Item -> Flashpowder -> Flashpowder: **PASS**
- Longer legal alternating Item counter chain (Item -> Flashpowder -> Flashpowder -> Flashpowder): **PASS**
- Generic family-driven committed-response counter architecture: **PASS**
- Card-name-specific Flashpowder exception added: **NO**
- Same-side self-response: **REJECTED / PASS**
- Paid-cost / discard movement: **exactly once / PASS**
- Duplicate card/effect: **NO**
- Stale Response/pending state after terminal resolution: **NO**
- Next gameplay continuation usable: **PASS**

## Custom Main Deck

Rule: **50–60 inclusive**.

| Main Deck | Player validator | AI validator |
|---:|---|---|
| 49 | REJECTED | REJECTED |
| 50 | PASS | PASS |
| 51 | PASS | PASS |
| 55 | PASS | PASS |
| 59 | PASS | PASS |
| 60 | PASS | PASS |
| 61 | REJECTED | REJECTED |

Actual runtime/opening initialization:

- 50 cards: Player opening Hand 7, AI opening Hand 6, remaining decks 43/44 — **PASS**
- 55 cards: Player opening Hand 7, AI opening Hand 6, remaining decks 48/49 — **PASS**
- 60 cards: Player opening Hand 7, AI opening Hand 6, remaining decks 53/54 — **PASS**

Official Starter definitions were not shortened or otherwise edited.

## EXP stack Ready / Exhausted physical size

The obsolete Exhaust-only 0.86 geometry reduction was removed from the canonical shared geometry owner. Ready and Exhausted states now use the same physical EXP-card dimensions; only orientation/anchor changes.

Real Chromium measurements, sorted physical width/height after transform:

| Viewport | Ready | Exhausted | Scale ratio |
|---|---:|---:|---:|
| 1366×768 | 7×170 | 7×170 | 1.00 |
| 1024×768 | 7×172 | 7×172 | 1.00 |
| 768×1024 | 7×110 | 7×110 | 1.00 |
| 390×844 | 7×133 | 7×133 | 1.00 |

Each viewport was tested with 1, 2, 3, and 4 EXP cards. Repeated Ready -> Exhaust -> Ready cycling produced no progressive shrink or drift. Neighbor-Hero collision checks remained clear.

Tutorial shared-runtime checks:

- 1366×768: 7×170 Ready vs 7×170 Exhausted — **PASS**
- 390×844: 7×133 Ready vs 7×133 Exhausted — **PASS**

## Tutorial v0.70

- Shared v6.47 gameplay/runtime regenerated into Tutorial mirror: **PASS**
- Tutorial-specific guide redesign: **NO**
- Nested Item Response compatibility in Tutorial mode: **PASS**
- Player End -> AI handoff, four consecutive cycles in real Chromium: **PASS**
- Round 4 / End Phase stale Guide Hold stall: **NO**
- EXP Ready/Exhausted parity: **PASS**

## Retained v6.46 regressions

- Execute -> Tactical Adaptation: **PASS**
- Execute -> ordinary Block: **REJECTED / PASS**
- `cannot_block`: **Block-only / PASS**
- `cannot_dodge`: **independent / PASS**
- Tactical Adaptation -> Intercept committed counter -> original Attack continues: **PASS**
- Battle Attack VFX: **PASS**
- Battle Block VFX: **PASS**
- Battle Dodge VFX: **PASS**
- Battle Negate/defense-family VFX: **PASS**
- Sound OFF: **zero battle playback / PASS**
- Sound OFF -> ON same audio family: **later event plays / PASS**
- Duplicate battle SFX during VFX flush: **NO**
- Held-card/current response cleanup suites: **PASS**
- Player Lobby Swap.png: **PASS**
- AI Lobby Swap.png: **PASS**
- AI tactical Reposition regression: **PASS**

## Build / generated mirrors

- Canonical shared runtime: `shared-app/app.bundle.js`
- Canonical shared CSS: `shared-app/app.css`
- Root deployment runtime generated from canonical shared source: **PASS**
- Tutorial deployment runtime generated from canonical shared source: **PASS**
- Generated-output reproducibility: **23/23 tracked generated application outputs byte-identical after regeneration**
- Runtime Sync: **PASS**
- JavaScript syntax: **PASS**
- Current static/regression suite: **PASS**
- Tutorial suite: **PASS**
- Real Chromium v6.47 EXP/nested-response/Tutorial-handoff gate: **PASS**
- Real Chromium battle/audio regression gate: **PASS**
- Real Chromium Player Lobby regression: **PASS**
- Real Chromium Player+AI Lobby/presentation regression: **PASS**

## Final package gate

The release is packaged with exactly one top-level repository folder. Previous release documents are retained only under `release/history/`. Final package SHA-256 is supplied by the external sidecar generated from the completed ZIP bytes.
