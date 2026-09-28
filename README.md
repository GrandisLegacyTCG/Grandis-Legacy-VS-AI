# Grandis Legacy VS AI v6.47 + Tutorial v0.70

This repository contains Grandis Legacy **VS AI v6.47** and **Tutorial v0.70**, consuming **Source Authority v1.9.5** and Player Rulebook v2.6 unchanged.

## v6.47 / v0.70 correction scope

1. Generic family-driven nested committed Responses now allow Flashpowder Bomb to counter an opponent's committed Flashpowder Bomb when legal.
2. Custom imported Main Deck legality is **50 through 60 cards inclusive** for both Player and AI import paths; the five official Starter Decks remain unchanged at 60 cards.
3. Ready and Exhausted Hero EXP-stack cards use identical physical size; Exhausted state changes only anchor/orientation.

Application Runtime Sync: **v2.65**. OSA remains **v1.9.5**. Shared Runtime remains **v1.94.2**. UI Contract remains **v2.53**.

Root and Tutorial deployment bundles are generated from `shared-app/` via `npm run build:data`. Do not hand-edit generated mirrors.
