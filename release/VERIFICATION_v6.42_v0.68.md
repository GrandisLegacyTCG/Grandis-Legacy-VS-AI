# Verification — Grandis Legacy VS AI v6.42 / Tutorial v0.68

Verification date: 2026-09-21

## Final status

**PASS** — the remaining-issues correction is UI-only. VS AI stays **v6.42** and Tutorial stays **v0.68**. Gameplay semantics, AI behavior, authority data, Starter Deck compositions, Shared Runtime gameplay, OSA, Deck Builder, and PvP are unchanged.

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
- Starter Deck Authority v1.6.1 — PASS / 5 active starters / compositions unchanged
- Canonical cards — PASS / 200 unique IDs / canonical data unchanged
- root and Tutorial `runtime-source/runtime/` trees — byte-identical to the supplied baseline
- root and Tutorial gameplay/data/starter directories — byte-identical to the supplied baseline
- PvP repository — untouched

## Already-approved UI preservation

The five previously approved items remain intact:

- standard battlefield preview X/Y — PASS / preserved
- Next Phase visible area ≥ approximately 50% — PASS
- opponent readable face-up Mana/Shard hover — PASS / preserved
- hidden opponent Mana/Shard identity safety — PASS / preserved
- popup previews above modal stacking contexts — PASS / preserved
- Deck/Pile numeric badge visual — PASS / preserved rounded rectangle
- Status badge position and 9 px numeric font — PASS / preserved

## Contextual preview verification

Real Chromium geometry verification records:

- Card Played opens LEFT — PASS
- Card Played size remains 272×381 — PASS
- current approved RIGHT-side contextual gap preserved — PASS
- LEFT rendered edge-to-edge gap matches RIGHT within ≤1 px tolerance — PASS
- Card Played rendered gap matches the measured RIGHT-side contextual reference — PASS
- Legacy Deck popup RIGHT placement — PASS
- forced representative Legacy Deck LEFT placement — PASS
- Full Card History above-modal preview — PASS
- Response Window above-modal preview — PASS
- opened Discard Pile above-modal preview — PASS
- card-selection/choice popup above-modal preview — PASS
- preview `pointer-events:none` — PASS
- source mouseleave hides immediately — PASS
- source remains clickable/selectable — PASS

## Shard Pool / Mana Regen verification

- Regen removed from Shard Deck zone — PASS
- Regen grouped with Shard Pool — PASS
- Regen occupies reserved left area — PASS
- first Shard starts to the right of Regen reservation — PASS
- no Shard/Regen overlap — PASS
- graphical `Counter-1...Counter-6.png` asset family unchanged — PASS
- Shard Pool label remains readable — PASS
- desktop 1440×900 — PASS
- phone portrait 390×844 — PASS
- tablet portrait 820×1180 — PASS
- tablet landscape 1180×820 — PASS

## Discard / Deck-Pile verification

- face-up Discard card no longer visually smaller than Legacy/Main Deck footprint family — PASS
- Discard card aspect ratio preserved — PASS
- numeric badge visual remains dark/gold rounded rectangle — PASS
- numeric content remains centered — PASS
- card/stack remains horizontally centered independently of badge overlays — PASS

## Mobile Deck/Pile count verification

At phone portrait, and safety-checked on tablet portrait:

- Legacy Deck count attached to card top-right — PASS
- Shard Deck count attached to card top-right — PASS
- Discard Pile count attached to card top-right — PASS
- Main Deck count attached to card top-right — PASS
- no count/title collision — PASS
- card remains horizontally centered — PASS
- approved badge styling unchanged — PASS

## Hero warning verification

- Hero warning uses the existing `legacy-hero-info` visual implementation/class — PASS
- computed dimensions, border, background, color, font, line-height, centering match the known-good Legacy warning — PASS
- circular icon — PASS
- `!` centered — PASS
- warning fully inside Hero container — PASS
- warning visible before Hero hover — PASS
- Hero/container hover is not required to reveal icon — PASS
- tooltip appears on `!` hover — PASS
- tooltip disappears when pointer leaves `!` — PASS
- Hero hover elsewhere does not keep/open warning detail — PASS
- existing Legacy warning remains unchanged — PASS

## Exhausted Hero verification

- Ready and Exhausted Hero underlying dimensions equal — PASS
- Exhausted visual dimensions equal Ready dimensions rotated 90° — PASS
- transform scale X = 1 — PASS
- transform scale Y = 1 — PASS
- no exhausted scale-down — PASS
- HP overlay remains visible — PASS
- no clipping — PASS

## Gameplay / AI / Tutorial regression

Current release regression remains green, including Hero defeat cleanup, Response lifecycle, Deflect, Shield Bash, Warp Scroll, Freeze/Freeze Bomb, Triple Shot, Attack-v-Damage classification, blind selection/security, AI continuation/planning, deck legality, opening flow, and five Starter Deck parity.

- root syntax + current regression suite — PASS
- Tutorial v0.68 suite — PASS
- Chromium UI suite — PASS
- generated-output reproducibility — PASS
- gameplay integration — PASS
- AI regression — PASS
- Tutorial regression — PASS

## Manifests

Both manifests are regenerated only after all corrections and release-document updates:

- root `FILE_MANIFEST_SHA256.csv` — 0 missing / 0 size mismatch / 0 SHA mismatch — PASS
- Tutorial `tutorial/FILE_MANIFEST_SHA256.csv` — 0 missing / 0 size mismatch / 0 SHA mismatch — PASS

## Packaging

- release remains v6.42 / v0.68 — PASS
- final repository contains no redundant ZIP/RAR/7z copy in its root — PASS
- OSA not modified — PASS
- PvP not modified — PASS
- Deck Builder not modified — PASS
- final ZIP integrity and SHA256 recorded after packaging — PASS
