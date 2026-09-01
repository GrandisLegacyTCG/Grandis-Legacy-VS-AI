# Card Played Responsive Hotfix 1 — VS AI v6.24 / Tutorial v0.52

Date: 2026-09-02

## Scope
Presentation-only responsive hotfix. Gameplay/runtime authority is unchanged.

## Change
- Constrained desktop/resolution layouts keep the Card Played preview capped at four entries in a 2-column grid.
- The previous <=720px-height rule that hard-hid entries 3 and 4 was removed.
- Card Played now fills the vertical space left after the critical Phase Tracker instead of stopping at a fixed max-height and leaving unused space.
- When four entries need more vertical room than available, only the Card Played grid becomes vertically scrollable.
- Phase Tracker remains the priority and must not overlap.
- Full Card History remains complete.

## Verification
Targeted responsive, mobile-scroll, footer/draw, and next-fix contract tests pass for VS AI and Tutorial.
