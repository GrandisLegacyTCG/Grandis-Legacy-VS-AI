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

## 2026-09-21 UI-only correction pass — remaining issues

This correction keeps **VS AI v6.42 / Tutorial v0.68** and changes presentation only. No new release version is created.

### Already-approved UI preserved

The previously approved standard battlefield preview position remains unchanged: the current X/Y placement is preserved and Next Phase remains at least approximately 50% visible. Readable opponent face-up Mana/Shard hover remains enabled without revealing hidden Shard identity. Popup previews remain above modal stacking contexts. The approved rounded-rectangle Deck/Pile numeric badge visual and the 9 px per-Status numeric badge presentation remain unchanged.

### Contextual preview gap parity

- Card Played remains LEFT-opening at 272×381 px.
- Contextual placement now uses one shared effective horizontal gap for both LEFT and RIGHT placement.
- The already-correct rendered RIGHT-side edge-to-edge gap is the reference; LEFT placement, including Card Played and modal cards, matches it within normal subpixel rendering tolerance.
- Contextual previews remain `pointer-events:none`, viewport-clamped, immediately hidden on source mouseleave, and rendered above modal content.

### Shard Pool / Mana Regen layout

- Mana Regen is removed from the Shard Deck zone.
- `REGEN` plus the existing graphical Counter asset is grouped with **Shard Pool** instead.
- Shard Pool reserves a dedicated left area for Regen; actual Shards begin to the right and cannot overlap the Regen label/counter.
- The existing graphical Counter asset system is unchanged; it is not replaced by the generic numeric badge.
- Desktop, phone portrait, tablet portrait, and tablet landscape layouts are browser-checked for Regen/Shard separation.

### Deck/Pile presentation

- The face-up Discard Pile card now uses the same visual footprint family as the other Deck/Pile cards while preserving normal card aspect ratio.
- On phone/mobile presentation, Legacy Deck, Shard Deck, Discard Pile, and Main Deck count badges remain visually unchanged but are attached to the top-right of the card/stack rather than drifting toward the zone title.
- Cards remain horizontally centered; the title stays readable. Slight bottom clipping is permitted where required by the compact mobile zone.

### Hero warning and Exhausted Hero

- Hero warning now reuses the existing known-good Legacy/Attachment warning visual class instead of maintaining a separate recreated visual.
- The circular dark/gold `!` is fully inside the Hero container and visible immediately whenever a warning condition exists.
- Only the warning detail tooltip remains icon-hover/focus triggered; hovering the Hero elsewhere does not open the detail.
- Ready and Exhausted Hero scale parity is re-verified. Exhausted remains the same base card scale with 90° rotation only; already-correct implementation is otherwise left untouched.

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
