# Grandis Legacy VS AI v6.42 / Tutorial v0.68

Release date: 2026-09-21

## Current authority baseline

This corrected current release consumes **Grandis Legacy Source Authority v1.9.3** and keeps the application versions unchanged:

- VS AI v6.42 (`6.42.0`)
- Tutorial v0.68 (`0.68.0`)
- Canonical Card Authority v1.6.0 — 200 Season 1 cards
- Shared Runtime v1.94.1
- Runtime Data v0.16.0
- Effect Recipe / Checkpoint v0.15.0 / v0.15.0
- Hero Components v1.1.0
- Starter Deck Authority v1.6.1 — exactly five active Starter Decks
- UI Contract v2.53
- Application Runtime Sync v2.61

Canonical registry SHA256: `85d25ebda9bb2bc260983a566e6d430dde97bfc7a32e8042ec2fddfeaff1b42f`

Hero Component registry SHA256: `f36f1cc83eb9845743176c3af71f7823125353eae73e832588e9d8b42c6818be`

The five Starter Deck compositions remain unchanged. OSA, Runtime Data, Shared Runtime gameplay semantics, canonical card data, and PvP are not modified by this UI correction pass.

## 2026-09-21 UI-only correction pass

This pass corrects presentation only. It does **not** create v6.43, v0.69, v6.42.1, or another release branch.

### Battlefield readable preview

- The standard 250×350 battlefield preview keeps its approved vertical placement and is shifted further **left/inward** from the previous v6.42 candidate.
- The preview may cover the right-side Main Deck, Discard Pile, part of the battlefield, and a small part of the Phase Tracker.
- The Next Phase button remains at least approximately 50% visibly exposed.
- Player Shards and legally readable/face-up opponent Shards use the same standard battlefield preview.
- Hidden/unrevealed opponent Shards do not expose preview metadata and remain visually hidden while in the hidden presentation state.
- Standard previews remain `pointer-events:none`, hide immediately on source mouseleave, and update immediately from Card A to Card B.

### Card Played and popup/modal previews

- Card Played keeps its LEFT-opening direction, but its enlarged preview is now anchored directly to the source card with an approximately 8–14 px gap.
- Contextual Card Played/modal previews are approximately 8–10% larger than the prior contextual preview, while the fixed battlefield preview remains 250×350.
- Contextual previews prefer LEFT/RIGHT placement beside the source card, are vertically centered when possible, clamp to the viewport, and fall back above/below only when necessary.
- Popup/modal previews render through the top-level shared preview overlay so they remain visibly above modal backgrounds, content, and scrolling containers.
- Verified representative contexts include Legacy Deck inspection, Full Card History, Response Window, opened Discard Pile, and card-selection/choice popup.

### Deck, pile, Status, Attachment, and Mana Regen presentation

- Deck/pile counts restore the approved dark-background, thin-gold-outline **rounded-rectangle** numeric badge visual; numeric counters are not circular.
- 1-, 2-, and 3-digit counters remain horizontally and vertically centered, and the badge expands for additional digits.
- Deck/pile cards are visually centered independently from count/Regen overlays.
- Main Deck, Legacy Deck, and Shard Deck card backs are slightly enlarged so their containers feel fuller without being aggressively shrunk.
- Mana Regen keeps its dedicated graphical `Counter.png` asset family and is repositioned below the Shard Deck card back so it no longer collides with the deck count.
- Status badge placement remains unchanged; only the Status numeral is reduced by approximately 1–2 px and remains centered in the rounded-rectangle badge.
- Attachment count remains attached at the top/corner of the Attachment card using the same rounded-rectangle numeric badge family.

### Warning icon and Exhausted Hero

- The previously approved compact circular warning `!` visual is restored: dark center, thin gold outline, centered gold/yellow `!`.
- When a warning condition exists, the warning icon is visible **before hover** and remains fully inside its container with normal top-left padding.
- Only the warning detail tooltip is hover/focus-triggered; hovering the Hero card itself does not open the warning detail.
- Ready and Exhausted Hero cards now use the same underlying dimensions and scale. Exhausted changes orientation only via a 90-degree rotation; no hidden `scale(<1)` remains.
- HP, Status, warning, Attachment relationships, and clipping are browser-regression checked after the Exhaust scale correction.

## Previously approved gameplay baseline remains unchanged

The already-approved v6.42 Hero-defeat lifecycle / Response-chain fix remains intact and was not changed by this pass. Existing Warp Scroll, Freeze/Freeze Bomb, Deflect, Shield Bash, Triple Shot, Attack-v-Damage classification, blind selection, AI logic, Starter Deck compositions, and other gameplay semantics remain unchanged.

## Shared application / Tutorial parity

`shared-app/app.bundle.js` and `shared-app/app.css` remain the shared VS AI/Tutorial application/UI sources. Tutorial-specific teaching remains additive in its guide/controller and guide stylesheet. Root/Tutorial deployment mirrors and the Tutorial Shared Runtime tree remain parity-checked during release verification.

## Responsive behavior

The established device boundaries remain intact:

- desktop: mouse/hover battlefield with the corrected v2.53 preview system;
- phone: native-scroll mobile presentation;
- tablet portrait: mobile/touch presentation with essential Hero information visible without hover;
- tablet landscape: desktop-style battlefield with touch-oriented interaction;
- no tested responsive mode introduces horizontal page overflow or requires hover for essential touch-only information.

## Validation

The release is gated by current gameplay/AI/Tutorial regression, source/data immutability checks, generated-output reproducibility, real Chromium DOM/geometry tests for all requested UI corrections, root/Tutorial SHA-256 manifest verification, and final package hashing. See `VERIFICATION_v6.42_v0.68.md` for the recorded executable results.
