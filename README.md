# Grandis Legacy VS AI v6.12 + Tutorial v0.42

Production-ready GitHub Pages package for local VS AI and the non-scripted tutorial.

## v6.12 / v0.42 Mobile cross-app navigation

- Adds a mobile-only three-line menu on VS AI with VS AI / PVP / DECK BUILDER choices.
- Mobile Deck Builder navigation points to Style 2.
- Tutorial remains v0.42 and is unchanged.
- Source Stack v1.7.0 gameplay, Conditional Follow-up, audio retention, and refresh protection from v6.11 are preserved.


## v6.11 / v0.42 Conditional Follow-up authority patch

- Adopts Source Authority Stack v1.7.0 and the generic data-driven Conditional Follow-up Component.
- Rage Blast, Venom Sovereign, and Tornado resolve their conditional damage as separate automatic post-Primary effects, without a second Response Window or Primary Block carryover.
- Retains audio clones until playback ends or errors, preserving triggers, timing, volume, and bytes.
- Adds active-normal-match `beforeunload` and top-edge pull-to-refresh protection to VS AI only while preserving ordinary vertical scrolling.
- Updates cache revisions, runtime locks, and focused regression/parity tests.

## Preserved Source Stack authority

- Adopts One Source Authority v1.7.0 and the corrected 198-card Season 1 registry.
- Pins the canonical card hash to `f5de57e66f0191522537b6e2b66539dd1c3c2a9737e59bac76c48044c38a21c1`.
- Pins Hero Component Authority to `487aa2620b5be99480a81d462082f1a35ee637ec2cc38ebf42b1bcf1103d06c9` with 6 racial components, 16 class components, 10 profiles, and 30 legal compositions.
- Carries all 30 revised card records, including **Back Slash**, and corrects every Resurrection metadata field to **3 Mana / 50 HP**.
- Retains the already-correct defensive Dodge implementation for Halfling Second Chance and the authoritative first-player Turn 1 Attack rejection.
- Retains the AI Magic Scope fix, AI End Phase watchdog, and every valid player- and AI-owned pending route.
- Keeps VS AI and Tutorial on the same card, component, legality, effect-recipe, resolver, and battlefield runtime snapshots.
- No unrelated UI or gameplay refactor is included.

## Verify

Run `npm run verify` from this directory. It checks syntax, authority hashes/counts, revised card IDs, Hero Components, pending-state lifecycles, gameplay regressions, Tutorial parity, URL-safe audio loading, cache revisions, and file manifests.

Historical release notes remain under `docs/`; Tutorial notes remain under `tutorial/docs/`.
