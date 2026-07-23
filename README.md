# Grandis Legacy VS AI v5.42

Static browser build prepared for **GitHub Pages**. No Node.js server, database, or Northflank service is required to play VS AI.

## Included starter decks
1. Elemental Lord / Conqueror / Renegade
2. Saint / Crusader / Grand Ranger
3. Arcane Duelist / Elemental Lord / Saint
4. Grand Ranger / Conqueror / Grand Arbalest
5. Renegade / Arcane Duelist / Elemental Lord

## GitHub Pages deployment
1. Copy the complete contents of this package into the repository root.
2. Push to the `main` branch.
3. Open **Settings → Pages**.
4. Choose **Deploy from a branch**, branch `main`, folder `/ (root)`, then save.
5. Open the published Pages URL after the deployment finishes.

All application paths are relative, `.nojekyll` is included, and the game runs entirely in the player browser.

## Current application locks
- Response Window shows every Defense/Response card in Hand; unavailable cards remain reviewable with runtime-owned reasons.
- Mobile Hands are straight, horizontally scrollable rows.
- Mobile Hero/Legacy cards use one top-left status/info control and one top-right contextual action control.
- Public Deck Builder v2.1 is bundled for desktop Deck Setup with larger Legacy Formation previews.
- PvP is unchanged and remains outside this package.

## v5.42 responsive correction
- Removes the trailing blank space below the mobile `PLAYER / Full Battle Log` row.
- Reduces the mobile Hero overlay gutter and both compact controls so they stay close to the card.
- Places the two Racial Token faces vertically beside Main Deck inside the same mobile resource cell.
- Keeps HP anchored over the printed HP corner.
- Adds strict desktop guards so mobile footer, resource, and Hero-control layouts cannot appear or duplicate on desktop.

## Synchronized versions
- Runtime Foundation: v1.74
- Runtime Core: v0.41
- Runtime Data: v0.12.5
- Effect Recipe: v0.11.5
- Effect Checkpoint: v0.11.4
- Shared Runtime Manual: v1.30
- Application Runtime Sync: v2.27
- UI Design Lock: v2.30
- Public Deck Builder: v2.1
