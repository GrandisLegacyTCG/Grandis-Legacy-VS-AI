# Grandis Legacy VS AI v6.9

Date: 2026-08-24

## Scope

This patch adopts the corrected Source Authority Stack after the v1.6.1 hotfix. It changes only canonical data, source-version metadata, generated authority bundles, locks, tests, and release markers required by that upstream correction.

## Authority update

- Canonical registry: 198 unique Card IDs.
- Canonical registry SHA-256: `b185307752fd523d6c1e4a450f8bdd82b96b4d4cbfbb884fca8a619e8c5c8057`.
- Hero Component SHA-256 remains `487aa2620b5be99480a81d462082f1a35ee637ec2cc38ebf42b1bcf1103d06c9`.
- Resurrection (`S1-CLE-015`) is consistently represented as 3 Mana and 50 HP, including interaction-flow and revive-policy metadata.
- Back Slash and all 30 revised-card records remain canonical.

## Runtime verification

- First-player Turn 1 Attack remains rejected by shared authoritative legality.
- Halfling Second Chance remains a defensive Dodge response; no replay route exists.
- AI Magic Scope targeting and the AI End Phase watchdog remain intact.
- All pending states retain valid resolve, cancel, or resume routes.

## Exclusions

No unrelated gameplay, AI, layout, styling, or interaction change was made.

## Version pins

One Source Authority v1.6.1, Runtime Foundation v1.85, Runtime Core v0.53, Runtime Data v0.13.1, Effect Recipe/Checkpoint v0.12.1, Legality Map v0.11.9, and Application Runtime Sync v2.47.

## Verification

Run `npm run verify` from the repository root.
