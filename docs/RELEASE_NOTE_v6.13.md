# Grandis Legacy VS AI v6.13

Date: 2026-08-24

## End Phase lethal-status game-over hotfix

- Fixed a lifecycle gap where a lethal Poison/status tick during End Phase could set `gameOver` but return from the AI End Phase director before rendering the normal result modal.
- Added one shared End Phase game-over presentation guard for AI director, immediate AI, and automatic PLAYER End Phase completion paths.
- Ensures pending/response state is already cleared by the existing defeat/game-end authority, stops the AI director, renders the terminal board state, and opens the normal Game Result.
- No Source Stack/card authority, damage values, status rules, Conditional Follow-up semantics, navigation, audio assets, or refresh protection changed.

Tutorial remains v0.42 and is unchanged by this VS AI-only lifecycle hotfix.
