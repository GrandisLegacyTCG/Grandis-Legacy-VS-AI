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

The five Starter Deck compositions remain unchanged by this v1.9.3 hotfix. Their copied Starter Authority v1.6.1 generated payloads may truthfully retain their original OSA v1.9.2 artifact provenance.

## Shared Runtime v1.94.1 — generic Hero-defeat lifecycle hotfix

The runtime now performs generic cleanup when an active Hero transitions to Defeated / Legacy mode. Unresolved pending state that requires that Hero to remain an active source, owner, host, actor, movement subject, target host, or Attachment host is invalidated through the canonical defeat path. Already-resolved external consequences are not rolled back.

The reproduced Shield Bash + Deflect stall is covered by real runtime and application integration:

- Deflect retaliation can defeat the attacking source Hero.
- the defeated Hero transitions normally to Defeated / Legacy mode;
- illegal post-resolution Attachment placement is cancelled instead of throwing;
- Shield Bash resolves to Discard rather than attaching to Legacy;
- the Response Window and associated pending source-Hero state close deterministically;
- the AI controller no longer remains at `Waiting for PLAYER response...` and can continue the turn/phase.

The fix is lifecycle-based, not a Shield Bash/Deflect card-specific branch. Existing Warp Scroll, Freeze/Freeze Bomb, Attack Label vs Damage Type, Whirlwind = 50, Triple Shot, Ultimate Shard return, blind selection, card data, Hero Components, and Starter Deck semantics remain unchanged.

## UI Contract v2.53 — final battlefield baseline refinement

The shared VS AI/Tutorial battlefield presentation now implements the current v2.53 contract:

- Standard readable field-card previews are a single 250×350 **lower-right battlefield overlay**, dynamically kept below the protected Your Turn / Phase Tracker / Next Phase controls.
- `Card Played` is the explicit special case and opens its enlarged preview to the **left** of the Card Played source.
- Full Card History, Response Window, opened Discard lists, selection/card-choice popups, and other legally readable modal/list card representations use the same universal preview system with contextual left/right placement and above/below fallback when needed.
- Preview overlays live outside modal scrolling/clipping regions, use `pointer-events:none`, disappear immediately on source mouseleave, update immediately Card A → Card B, and never reveal hidden identities.
- Legacy Deck, Shard Deck, Discard Pile, and Main Deck counts use the same compact dark/gold **top-corner badge** visual. The old large Main Deck number is not used.
- Deck/pile containers are tightened so the card/stack fills the zone proportionally without excessive empty space.
- Every Status icon owns its own compact **bottom-right** numeric badge.
- Warning `!` remains visibly present while its condition exists; only warning detail is hover/focus-triggered. Hero-card hover remains independent.
- Attachment count uses the same compact badge family at the Attachment card's top corner.
- Mana Regen continues to use the dedicated Counter image assets; those assets are not reused for deck, Status, or Attachment counts.

## Shared application / Tutorial parity

`shared-app/app.bundle.js` and `shared-app/app.css` remain the one editable common VS AI/Tutorial application/battlefield sources. Tutorial-specific teaching remains additive in its guide/controller and guide stylesheet. Generated root/Tutorial deployment mirrors and the Tutorial Shared Runtime tree are parity-checked during release verification.

## Responsive behavior

The established device boundaries remain intact:

- desktop: mouse/hover battlefield with the v2.53 preview system;
- phone: native-scroll mobile presentation;
- tablet portrait: mobile presentation;
- tablet landscape: desktop-style battlefield with touch-oriented interaction;
- touch layouts do not depend on desktop hover behavior.

## Validation

The release is gated by the complete current runtime/application regression suite, the new Hero-defeat integration tests, generated-data/deployment reproducibility, real Chromium DOM/geometry checks for field and dynamic modal previews/badges/warning behavior, Tutorial parity, and root/Tutorial SHA-256 manifest verification. See `VERIFICATION_v6.42_v0.68.md` for the recorded executable results.
