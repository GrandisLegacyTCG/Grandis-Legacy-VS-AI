# Verification — Grandis Legacy VS AI v6.42 / Tutorial v0.68

Verification date: 2026-09-21

## Final status

**PASS** — the 2026-09-21 correction pass is UI-only. The requested battlefield/contextual preview, deck/counter, Mana Regen, Status/Attachment, warning, Exhausted Hero, and responsive corrections are browser-verified while gameplay, authority, canonical data, Starter Deck compositions, and PvP remain unchanged.

## Scope declaration

- UI changes: **YES**
- Gameplay changes: **NO**
- Authority changes: **NO**
- PvP changes: **NO**
- VS AI version: **v6.42**
- Tutorial version: **v0.68**

## Authority / immutable data

- OSA consumer v1.9.3 — PASS / unchanged
- Shared Runtime v1.94.1 semantics — PASS / unchanged
- UI Contract v2.53 — PASS
- Application Runtime Sync v2.61 — PASS
- Runtime Data v0.16.0 — PASS / unchanged
- Effect Recipe / Checkpoint v0.15.0 / v0.15.0 — PASS / unchanged
- Hero Components v1.1.0 — PASS / unchanged
- Starter Deck Authority v1.6.1 — PASS / exactly 5 active starters / compositions unchanged
- Canonical cards — PASS / 200 unique IDs / canonical data unchanged
- PvP repository — untouched

## Gameplay regression — unchanged baseline

The already-approved Hero-defeat lifecycle / Response-chain fix remains intact. Current application integration and regression suites verify the unchanged gameplay baseline, including:

- generic Hero defeat cleanup — PASS
- Shield Bash + Deflect lifecycle — PASS
- Response Window/pending cleanup after source defeat — PASS
- AI continuation after resolved Response — PASS
- Warp Scroll — PASS
- Freeze Bomb / generic Freeze legality, duration, stacking, Dodge and movement restrictions — PASS
- Physical Attack vs Physical Damage / Magical Attack vs Magical Damage classification — PASS
- Triple Shot lifetime behavior — PASS
- Ultimate Shard return ordering — PASS
- opponent Hand / Shard blind selection security — PASS
- Local AI planner/gameplay — PASS
- five Starter Deck loading/parity — PASS

No gameplay-semantic source or canonical data regeneration is introduced by this UI pass.

## Chromium UI verification

A real headless Chromium DOM/geometry suite executes against the shared VS AI/Tutorial battlefield implementation.

### Battlefield preview

- standard preview size remains 250×350 — PASS
- existing approved Y placement preserved — PASS
- X shifted meaningfully LEFT/inward — PASS
- right Main Deck/Discard overlap allowed — PASS
- small Phase Tracker overlap allowed — PASS
- Next Phase remains at least approximately 50% visible — PASS
- Hand readable preview — PASS
- Hero readable preview — PASS
- Legacy readable preview — PASS
- Attachment readable preview — PASS
- Casting readable preview — PASS
- player face-up Shard readable preview — PASS
- opponent face-up/readable Shard hover — PASS
- hidden opponent Shard removes preview metadata — PASS
- hidden opponent Shard is visually hidden — PASS
- hidden opponent Shard cannot open identity preview — PASS
- opponent hidden Hand exposes no readable preview metadata — PASS
- `pointer-events:none` — PASS
- source mouseleave hides immediately — PASS
- Card A → Card B updates the singleton immediately — PASS

### Card Played / contextual preview

- Card Played opens LEFT — PASS
- source-to-preview gap approximately 8–14 px — PASS
- preview is vertically associated with source and viewport-clamped — PASS
- contextual preview is 272×381 (~9% larger) — PASS
- preview remains pointer-transparent — PASS

### Popup/modal stacking matrix

- Legacy Deck inspection preview above modal — PASS
- Full Card History preview above modal — PASS
- Response Window preview above modal — PASS
- opened Discard Pile preview above modal — PASS
- card-selection/choice popup preview above modal — PASS
- contextual preview prefers LEFT/RIGHT with above/below fallback — PASS
- contextual preview stays close to source — PASS
- source cards/buttons remain clickable/selectable — PASS
- modal scrolling/Close behavior is not blocked by the preview overlay — PASS

## Deck / pile / Mana Regen verification

- Legacy Deck numeric badge uses approved rounded rectangle — PASS
- Shard Deck numeric badge uses approved rounded rectangle — PASS
- Discard Pile numeric badge uses approved rounded rectangle — PASS
- Main Deck numeric badge uses approved rounded rectangle — PASS
- numeric badges are not circular — PASS
- 1/2/3-digit badge width expands correctly — PASS
- numeric content is horizontally centered — PASS
- numeric content is vertically centered — PASS
- deck/pile card is centered independently of overlays — PASS
- Main/Legacy/Shard card backs slightly enlarged — PASS
- containers are not aggressively shrunk — PASS
- Shard Deck Regen is below the card — PASS
- Regen no longer collides with deck count — PASS
- Mana Regen graphical Counter asset system unchanged — PASS
- Shard Deck label remains readable — PASS

## Status / Attachment verification

- Status badge position unchanged — PASS
- one Status icon → one badge; three Statuses → three individual badges — PASS
- Status numeral reduced to the corrected 9 px presentation — PASS
- Status number centered — PASS
- Status badge remains rounded rectangle — PASS
- Status icon spacing unchanged — PASS
- Attachment badge remains at top/corner — PASS
- Attachment number centered — PASS
- Attachment badge remains rounded rectangle — PASS
- no generic Counter image is used outside Mana Regen — PASS

## Warning verification

- previous approved compact circular warning visual restored — PASS
- warning icon remains circular and distinct from numeric badges — PASS
- warning icon fully inside container — PASS
- warning icon not clipped — PASS
- warning `!` centered — PASS
- warning condition renders the icon visible **before hover** — PASS
- hover-gated icon visibility removed — PASS
- hover/focus on `!` opens detail tooltip — PASS
- leaving `!` closes detail tooltip — PASS
- Hero-card hover alone does not open/keep warning detail — PASS

## Exhausted Hero verification

- Ready Hero underlying dimensions recorded — PASS
- Exhausted Hero underlying dimensions equal Ready Hero — PASS
- Exhausted visual dimensions equal the Ready dimensions swapped by 90-degree rotation — PASS
- transform scale X = 1 — PASS
- transform scale Y = 1 — PASS
- no exhausted `scale(<1)` remains — PASS
- Hero remains inside its lane without clipping — PASS
- HP overlay remains visible — PASS
- Status/warning layout remains valid under browser regression — PASS

## Responsive verification

- Desktop 1440×900 — PASS
- Phone portrait 390×844 — PASS
- Tablet portrait 820×1180 — PASS
- Tablet landscape 1180×820 — PASS
- no tested horizontal page overflow — PASS
- deck/pile badges remain present — PASS
- desktop hover preview is disabled on touch/mobile modes — PASS
- tablet portrait retains touch-visible Hero information without requiring hover — PASS

## Shared architecture / generated parity

- common VS AI/Tutorial app source: `shared-app/app.bundle.js` — PASS
- common VS AI/Tutorial CSS source: `shared-app/app.css` — PASS
- common shared battlefield authority/UI sources — PASS
- Tutorial application mirror parity — PASS
- generated-output reproducibility — PASS
- root/Tutorial Shared Runtime parity — PASS

## Test execution summary

All current release gates complete successfully:

- root syntax + current regression suite — PASS
- Tutorial v0.68 suite — PASS
- Chromium UI correction suite — PASS
- root manifest verification — PASS
- Tutorial manifest verification — PASS

The current release suite reports **22 / 22 unique release gates PASS, 0 FAIL**; shared scripts intentionally re-run by the Tutorial suite are not double-counted.

## Manifest

Both manifests are regenerated after all source/document corrections. Final verification requires and records:

- root `FILE_MANIFEST_SHA256.csv` — 0 missing / 0 size mismatch / 0 SHA mismatch — PASS
- Tutorial `tutorial/FILE_MANIFEST_SHA256.csv` — 0 missing / 0 size mismatch / 0 SHA mismatch — PASS
- manifest files exclude themselves from their own tracked set by repository convention.

## Packaging / scope

- release version remains v6.42 / v0.68 — PASS
- release documentation updated as a UI correction pass, not a gameplay release — PASS
- no redundant final ZIP is stored inside the repository root — PASS
- OSA package/source not modified — PASS
- PvP repository not opened or modified — PASS
- Deck Builder, Website, and Player Rulebook repositories not modified — PASS
