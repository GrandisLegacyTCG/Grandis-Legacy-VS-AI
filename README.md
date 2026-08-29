# Grandis Legacy VS AI v6.21 + Tutorial v0.49

Production-ready GitHub Pages package for local VS AI and the non-scripted tutorial.


## v6.21 / v0.49 Canonical revised-card application parity hotfix

- Re-audited all 30 revised Season 1 card IDs against Source Stack v1.7.2 / Runtime Data v0.14.1.
- Removed stale application-local numeric Block overrides. Canonical structured runtime data now controls Mana Shield, Parry, Deflect Arrow, Deflection, and all other Block values.
- Mana Shield now resolves at Block 60 in executable gameplay/logs.
- Added deterministic canonical Defense tests covering lineage fallback and 17 current Block rows.
- Preserves Conditional Follow-up behavior, lethal Poison End Phase result handling, retained audio lifecycle, and silent Game Result lobby reload from prior releases.
- Tutorial v0.49 receives the same shared gameplay authority cleanup; tutorial-specific guidance remains unchanged.

## v6.14 / v0.42 Game Result lobby reload hotfix

- Changes the VS AI Game Result **Back to Lobby** action to perform a clean same-page reload instead of rebuilding the lobby in-place.
- The existing 60-second automatic return uses the same reload path.
- The reload explicitly bypasses the active-match `beforeunload` warning, so finished matches return without a leave/reload confirmation.
- The normal active-match refresh warning remains enabled while a match is still in progress.
- Tutorial remains v0.42 and is unchanged. No gameplay, card, Source Stack, Conditional Follow-up, Poison, audio, or mobile-navigation behavior is changed.


## v6.13 / v0.42 End Phase lethal-status game-over hotfix

- Fixes the VS AI lifecycle when Poison or another End Phase cleanup effect defeats the final active Hero.
- Game-over state now immediately exits the AI End Phase director and presents the normal Game Result instead of remaining visually stuck on `END`.
- The same game-over presentation guard covers the immediate AI path and automatic PLAYER End Phase path in VS AI.
- Tutorial remains v0.42 and is unchanged. No card data, Source Stack rules, Conditional Follow-up behavior, mobile navigation, audio, or refresh-protection rules are changed.

## v6.12 / v0.42 Mobile cross-app navigation

- Adds a mobile-only three-line menu on VS AI with VS AI / PVP / DECK BUILDER choices.
- Mobile Deck Builder navigation points to Style 2.
- Tutorial remains v0.42 and is unchanged.
- Source Stack v1.7.2 gameplay, Conditional Follow-up, audio retention, and refresh protection from v6.11 are preserved.


## v6.11 / v0.42 Conditional Follow-up authority patch

- Adopts Source Authority Stack v1.7.2 and the generic data-driven Conditional Follow-up Component.
- Rage Blast, Venom Sovereign, and Tornado resolve their conditional damage as separate automatic post-Primary effects, without a second Response Window or Primary Block carryover.
- Retains audio clones until playback ends or errors, preserving triggers, timing, volume, and bytes.
- Adds active-normal-match `beforeunload` and top-edge pull-to-refresh protection to VS AI only while preserving ordinary vertical scrolling.
- Updates cache revisions, runtime locks, and focused regression/parity tests.

## Preserved Source Stack authority

- Adopts One Source Authority v1.7.2 and the corrected 198-card Season 1 registry.
- Pins the canonical card hash to `8ee6bb98c22dc66ee72f49fa88b4f7fd05fce1c96a2932e28a1a8667c9d3932e`.
- Pins Hero Component Authority to `487aa2620b5be99480a81d462082f1a35ee637ec2cc38ebf42b1bcf1103d06c9` with 6 racial components, 16 class components, 10 profiles, and 30 legal compositions.
- Carries all 30 revised card records, including **Back Slash**, and corrects every Resurrection metadata field to **3 Mana / 50 HP**.
- Retains the already-correct defensive Dodge implementation for Halfling Second Chance and the authoritative first-player Turn 1 Attack rejection.
- Retains the AI Magic Scope fix, AI End Phase watchdog, and every valid player- and AI-owned pending route.
- Keeps VS AI and Tutorial on the same card, component, legality, effect-recipe, resolver, and battlefield runtime snapshots.
- No unrelated UI or gameplay refactor is included.

## Verify

Run `npm run verify` from this directory. It checks syntax, authority hashes/counts, revised card IDs, Hero Components, pending-state lifecycles, gameplay regressions, Tutorial parity, URL-safe audio loading, cache revisions, and file manifests.

Historical release notes remain under `docs/`; Tutorial notes remain under `tutorial/docs/`.
