# Grandis Legacy VS AI v5.41

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
