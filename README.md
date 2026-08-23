# Grandis Legacy VS AI v6.9 + Tutorial v0.40

Production-ready GitHub Pages package for local VS AI and the non-scripted tutorial.

## v6.9 / v0.40 Source Stack hotfix adoption

- Adopts One Source Authority v1.6.1 and the corrected 198-card Season 1 registry.
- Pins the canonical card hash to `b185307752fd523d6c1e4a450f8bdd82b96b4d4cbfbb884fca8a619e8c5c8057`.
- Pins Hero Component Authority to `487aa2620b5be99480a81d462082f1a35ee637ec2cc38ebf42b1bcf1103d06c9` with 6 racial components, 16 class components, 10 profiles, and 30 legal compositions.
- Carries all 30 revised card records, including **Back Slash**, and corrects every Resurrection metadata field to **3 Mana / 50 HP**.
- Retains the already-correct defensive Dodge implementation for Halfling Second Chance and the authoritative first-player Turn 1 Attack rejection.
- Retains the AI Magic Scope fix, AI End Phase watchdog, and every valid player- and AI-owned pending route.
- Keeps VS AI and Tutorial on the same card, component, legality, effect-recipe, resolver, and battlefield runtime snapshots.
- No unrelated UI or gameplay refactor is included.

## Verify

Run `npm run verify` from this directory. It checks syntax, authority hashes/counts, revised card IDs, Hero Components, pending-state lifecycles, gameplay regressions, Tutorial parity, cache revisions, and file manifests.

Historical release notes remain under `docs/`; Tutorial notes remain under `tutorial/docs/`.
