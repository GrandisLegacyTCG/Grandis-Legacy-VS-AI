# Grandis Legacy VS AI v5.42

Release date: 23 July 2026

## Scope

Responsive UI correction for the VS AI battlefield. Gameplay rules, card data, AI behavior, and PvP are unchanged.

## Mobile battlefield

- Removed the artificial blank space below the `PLAYER / Full Battle Log` footer.
- Reduced the Hero top gutter from 29 px to 22 px.
- Reduced the single top-left status/info control and single top-right contextual action control to 18 px.
- Kept exactly one non-clickable information entry point at top-left and one clickable action entry point at top-right.
- Moved Racial Tokens out of Mana Pool and placed the two physical token faces vertically beside Main Deck inside the same resource cell.
- Kept the HP overlay anchored over the printed HP area of the Hero artwork.

## Desktop isolation

- Added an explicit desktop guard for mobile footer, mobile status/action controls, and mobile Racial Token presentation.
- Restored desktop Hand-side Racial Tokens and the single approved desktop Player footer.
- No mobile component may alter desktop resource placement or duplicate the Player/Battle Log footer.

## Synchronized packages

- VS AI: v5.42
- Application Runtime Sync: v2.27
- UI Design Lock: v2.30
- Runtime Foundation: v1.74 unchanged
- Public Deck Builder: v2.1 unchanged
- PvP: unchanged and held
