# Grandis Legacy VS AI v6.44 / Tutorial v0.68

Release date: 2026-09-25

## Scope

- Added AI Deck Lobby Hero formation swaps using the already-approved Deck Builder Style 1 / v6.43 Player component.
- Added independent AI Rank I–III visual preview using current Hero progression data. Preview state remains local-only and does not change gameplay Rank.
- Removed redundant decorative framing from the shared passive Quick Preview image shell while preserving functional gameplay outlines.
- Preserved the already-clean opponent-hand card-back presentation and added explicit regression coverage.
- Reused the current PvP equal-size phone Card Played sizing approach (25×35 physical cards) and verified equal computed card size on desktop, tablet landscape, tablet portrait, and phone.

## Locked / unchanged

- Player v6.43 Lobby appearance and behavior.
- Home / Deck Builder Style 1 / PvP / Tutorial navigation and same-tab routing.
- AI decision logic and all gameplay rules/state transitions.
- Candidate 15 interaction semantics.
- Tutorial v0.68 lesson/controller source, including the known Tutorial turn-transition stall; it is intentionally not fixed in this release.

## Source ownership

Canonical application owner: `shared-app/app.bundle.js` and `shared-app/app.css`.
Generated deployment mirrors are synchronized by the existing build architecture, including `js/app.bundle.js`, `tutorial/js/app.bundle.js`, `css/app.css`, and `tutorial/css/app.css`.
