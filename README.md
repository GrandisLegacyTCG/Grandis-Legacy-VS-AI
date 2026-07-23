# Grandis Legacy VS AI v5.47

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

## v5.41 highlights
- Response Window shows every Defense/Response card currently in Hand.
- Legal responses remain selectable; unavailable responses stay visible and explain why they cannot be used.
- Runtime Foundation remains v1.74. Application Runtime Sync advances to v2.25 and UI Design Lock to v2.28 for the approved mobile interaction layout.
- Mobile Hero statuses are consolidated under one `!` indicator.
- Mobile Racial Trait, Hero Ability, and Legacy Ability access is consolidated under one compact action button.
- Player/deck metadata and Full Battle Log remain one row and move below Next Phase on mobile.
- Public Deck Builder v2.1 is bundled for desktop Deck Setup and reuses the shared VS AI card thumbnails.
- Mobile Player and opponent Hands use straight, horizontally scrollable rows instead of a fan.
- The approved v5.38 responsive Deck Setup and compact mobile battlefield remain included.
- PvP is unchanged and remains outside this package.

## v5.41 mobile/Deck Builder refinement
- Mobile Hero art is slightly smaller inside a taller lane with a dedicated top overlay gutter.
- Exactly one `!` status/info control and one contextual action control are used per Hero/Legacy.
- Racial Tokens move from beside the Hand into a compact Mana-resource counter on mobile.
- HP is card-anchored over the printed HP corner, including Exhausted Heroes.
- Bundled Public Deck Builder advances to v2.1 with larger Legacy Formation Hero previews.


## v5.44 resource/footer correction
- Mobile resources use a dedicated fifth Racial Token cell: 22 / 22 / 22 / 22 / 12.
- Racial Tokens are stacked vertically and never embedded in Main Deck.
- Desktop resource geometry is unchanged and the lower decorative gold stroke is removed.


## v5.45 final corrections
- Casting source identity now uses a stable Hero instance ID, so Rank Up in the same lane cannot be misread as movement/replacement.
- Casting still cancels on actual Reposition, Stun, defeat, or replacement, and release damage uses the current Hero effect row.
- Desktop unavailable Response reasons are hover/focus only and no second popup opens.
- The legacy `gl-app::after` gold baseline is removed.
- Mobile resources are 72 px high, Mana Regen is visible below Mana Pool, Racial Tokens remain separated, and Player Hand uses the full available width.


## v5.46 response, mobile draw, and Double Casting parity

- Desktop Response Window uses `Not Available` with one prioritized hover reason.
- Mobile Hand hides the scrollbar and reserves space for up to two action buttons per card.
- Mobile Start Game focuses the Player Hand after the coin flip.
- Multi-draw animations reveal each card in Hand immediately before animating the next card.
- Double Casting Rank II and Rank III both allow activation 2 to choose the same or a different legal Hero.
- PvP remains unchanged; see `docs/TAKEOVER_NOTE_VS_AI_TO_PVP_v5.47.md`.


## v5.47 Android/mobile visual correction
- Mobile opponent Hand is a compact fan; Player Hand remains straight and swipeable.
- Mana Regen is pinned inside the Mana Pool resource cell.
- Holding a Player Hand card on Android opens a custom enlarged preview instead of the native Save Picture menu.
- New coin/card visuals keep fixed geometry and wait for image decode before display/animation.
- Racial Token images are optimized 256 px WebP assets.
