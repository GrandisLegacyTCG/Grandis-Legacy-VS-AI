# Grandis Legacy VS AI v6.10

Date: 2026-08-24

## Scope

This patch only renames the two bundled audio assets and updates their executable references and integrity metadata. The corrected v6.9 Source Stack gameplay and data authority is unchanged.

## Audio rename

- `freesound_community-coin-flip-37787.mp3` becomes `Coin Flip.mp3`.
- `freesound_community-flipcard-91468.mp3` becomes `Card Sound.mp3`.
- Original audio bytes, playback triggers, timing, and volume are preserved.
- Browser-safe `%20` URL resolution is covered by release tests.

## Preserved authority and behavior

- 198 canonical Card IDs, Back Slash, all 30 revised records, and Hero Component composition remain unchanged.
- First-player Turn 1 Attack rejection, defensive Halfling Second Chance, Resurrection at 3 Mana / 50 HP, AI Magic Scope, AI End Phase watchdog, and all pending-state routes remain intact.
- No gameplay, AI, layout, or unrelated UI change is included.

Run `npm run verify` from the repository root.
