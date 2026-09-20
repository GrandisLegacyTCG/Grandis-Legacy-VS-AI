# Verification — Grandis Legacy VS AI v6.42 / Tutorial v0.68

Verification date: 2026-09-21

## Final status

**PASS** — all mandatory final-correction and current-release gates completed before packaging.

## Authority and data

- VS AI version: v6.42 — PASS
- Tutorial version: v0.68 — PASS
- Root package: 6.42.0 — PASS
- Tutorial package: 0.68.0 — PASS
- OSA: v1.9.2 — PASS
- Shared Runtime: v1.94.0 — PASS
- Runtime Data: v0.16.0 — PASS
- Effect Recipe / Checkpoint: v0.15.0 / v0.15.0 — PASS
- Hero Components: v1.1.0 — PASS
- Runtime Sync: v2.60 — PASS
- UI Contract: v2.52 — PASS
- Canonical cards: 200 / 200 unique IDs — PASS

## Active Starter Deck correction

- Only Starter 1 changed in this propagation; Starters 2–5 were verified semantically unchanged — PASS
- Active application Starter Deck count: **5 / 5** — PASS
- Active IDs exactly match the five approved IDs — PASS
- Starter 1: Elemental Lord / Conqueror / Renegade — PASS
- Starter 1 direct user source `Starter_1_ElementalLord_Conqueror_Renegade.json` (SHA256 `f63e14a9cc43729fe2e27d77a6d1606a067bc399a5230fa2489eded3ad066353`) is gameplay-semantically identical to the active OSA v1.9.2 generated Starter 1 — PASS
- Starter 2: Saint / Crusader / Grand Ranger — PASS
- Starter 3: Arcane Duelist / Elemental Lord / Saint — PASS
- Starter 4: Grand Ranger / Grand Arbalest / Renegade — PASS
- Starter 5: Renegade / Arcane Duelist / Elemental Lord — PASS
- Hero/Legacy package composition matches OSA v1.9.2 Starter Authority — PASS
- Main Deck card IDs/quantities match OSA v1.9.2 Starter Authority — PASS
- Every Main Deck totals 60 — PASS
- All referenced IDs resolve against the current 200-card registry — PASS
- Player/AI active starter pool uses the same five — PASS
- Tutorial does not reintroduce a 15-option active selector — PASS
- Starter Deck Authority v1.6.1 exposes exactly five active starters; retired Starter60 v1.5 15-preset material remains history-only — PASS
- OSA v1.9.2 generated Starter60 v1.6.1 current snapshots are hash-locked and deployed byte-identically — PASS

## Shared application / battlefield architecture

- Exactly one editable common app/battlefield JS source: `shared-app/app.bundle.js` — PASS
- Exactly one editable common app/battlefield CSS source: `shared-app/app.css` — PASS
- VS AI directly consumes shared sources — PASS
- Tutorial directly consumes the same shared sources — PASS
- Tutorial-specific behavior remains additive/controller-oriented — PASS
- Root/Tutorial app-bundle deployment mirrors are generated from shared source — PASS
- Root/Tutorial common CSS deployment mirrors are generated from shared source — PASS
- Deployment mirror parity/reproducibility is executable-tested — PASS
- No independent Tutorial battlefield fork remains as editable authority — PASS

## Active authority cleanup

- Active `runtime-source/data/` stale tree removed — PASS
- Runtime Data v0.15.0 stale source retained history-only — PASS
- Effect Recipe v0.14.0 stale source retained history-only — PASS
- Hero Components v1.0.0 stale source retained history-only — PASS
- Source stack v1.90 stale source retained history-only — PASS
- Active production `GL_LAB_V014_RULE_SYNC_QA_SELF_TEST` removed — PASS
- Active Triple Shot mandatory-binding QA residue removed — PASS
- Active `lab-authority.css` naming retired — PASS
- Neutral `shared-app/battlefield-authority.css` used — PASS
- Playtest Lab v0.14 remains historical only — PASS

## Gameplay integration

Executable integration passed for both VS AI and Tutorial application paths:

- Warp Scroll actual two-Hero swap — PASS
- Warp Scroll player flow — PASS
- Warp Scroll AI resolution — PASS
- Freeze Bomb target → Freeze 1 → Discard — PASS
- Freeze Bomb player flow — PASS
- Freeze Bomb AI resolution — PASS
- Frozen Hero manual Reposition rejected — PASS
- Frozen Hero Skill movement rejected — PASS
- Frozen Hero Dodge rejected — PASS
- Freeze alone does not reject legal Block — PASS
- Freeze does not block Warp Scroll Item movement — PASS
- Freeze does not block automatic 1v1 Center — PASS
- Freeze owner-End-Phase duration processing — PASS
- Freeze additive stacking — PASS
- Physical Attack != Physical Damage — PASS
- Magical Attack != Magical Damage — PASS
- Conqueror + Whirlwind: expected 50 / actual 50 — PASS
- Triple Shot no binding — PASS
- Triple Shot Attachment lifetime — PASS
- Ultimate Shard payment-batch return — PASS
- Opponent Hand blind selection — PASS
- Opponent Shard Pool blind selection — PASS
- Own hidden zones are not unnecessarily blind-randomized — PASS

## AI and security

- Tactical AI regression — PASS
- Warp Scroll and Freeze Bomb AI resolution — PASS
- Blind-selection production seed cannot be selected by normal player intent — PASS
- Opaque opponent mapping is created before choice — PASS
- Canonical hidden-zone state and Shard Deck are not unnecessarily reordered — PASS
- Viewer-safe/hidden-information runtime security — PASS

## Desktop UI — executable Chromium verification

Shared Battlefield UI v2.52 passed actual DOM/geometry verification at desktop viewport:

- One right-side 250×350 overlay — PASS
- Preview is non-interactive (`pointer-events:none`) — PASS
- Hand preview — PASS
- Hero preview — PASS
- Legacy preview — PASS
- Attachment preview — PASS
- Casting preview — PASS
- Card Played preview — PASS
- Face-up player Shard preview — PASS
- Hidden opponent Shards have no preview identity metadata — PASS
- Source-card mouseleave immediately hides every tested preview — PASS
- Moving toward the preview does not extend preview lifetime — PASS
- Card A → Card B updates the same overlay — PASS
- Battlefield Deck Setup button absent — PASS
- Pre-match Deck Setup remains present — PASS
- Counter graphics limited to Mana Regen; deck/status counts are numeric — PASS

## Responsive UI

- Desktop right-side hover presentation — PASS
- Phone native-scroll/mobile presentation retained — PASS
- Tablet portrait mobile presentation retained — PASS
- Tablet landscape desktop-style/touch interaction retained — PASS
- Mobile navigation regression — PASS

## Tutorial parity

- Tutorial uses the shared VS AI v6.42 runtime/app/UI baseline — PASS
- Tutorial-specific guide/overlay/controller remains separate — PASS
- Existing Shard/Mana/Ultimate/Draw lesson sequencing remains valid — PASS
- Tutorial v0.68 release lock — PASS

## Generated data and history

- Generated/deployment reproducibility: **23 / 23 tracked outputs byte-identical after regeneration** — PASS
- Shared Runtime Tutorial mirror parity: 68 files — PASS
- Historical release records remain separated under `release/history/` — PASS
- No duplicate current release note at repository root — PASS

## Test execution summary

Unique executable current-release verification scripts: **22 / 22 PASS, 0 FAIL**.

This counts 18 root current-regression scripts, the Tutorial-specific v0.68 test, the Chromium UI test, and the two root/Tutorial manifest verification scripts. Tutorial calls that intentionally rerun shared root integration/UI scripts are not double-counted. Syntax checks, source generation, metadata generation, and build steps also passed.

## Manifest

- Root `FILE_MANIFEST_SHA256.csv`: **571 tracked files** (manifest excludes itself) — PASS
- Tutorial `FILE_MANIFEST_SHA256.csv`: **166 tracked files** (manifest excludes itself) — PASS
- Both manifest verifiers require exact file sets, byte sizes, and SHA-256 hashes with 0 missing / 0 stale / 0 mismatch.
- The outer archive SHA256 is intentionally delivered in the external `.sha256.txt` sidecar.
