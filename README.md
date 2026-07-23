# Grandis Legacy VS AI v5.35

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

## v5.38 note
- Desktop Deck Setup removes repeated labels, uses an 80/20 deck-picker/import row, shows full Hero artwork, and moves a highlighted Deck Builder button to the lower-left.
- Mobile Deck Setup uses a compact `DECK SETUP / NOT STARTED` header, normal scrolling, small Import Deck controls, and hides Deck Builder.
- Mobile battlefield keeps Card Played visible while reducing unused vertical space and keeping phase actions reachable.
- Gameplay/runtime behavior is unchanged from v5.37.
