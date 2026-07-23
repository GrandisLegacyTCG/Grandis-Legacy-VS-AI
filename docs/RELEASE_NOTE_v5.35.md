# Grandis Legacy VS AI v5.35 Release Note

## Deployment
- Prepared as a static GitHub Pages build.
- Added `.nojekyll`, a root `404.html` fallback, relative asset paths, page metadata, and GitHub Pages instructions.
- No backend, WebSocket, database, environment variable, or Northflank service is required.

## Starter decks
- Replaced the previous 15 starter presets with the 5 user-approved GL-DECK-1.0 files.
- Player default: Starter 1.
- AI default: Starter 2.

## Scope
- Deployment/package and starter-deck update.
- Existing v5.34 runtime/gameplay and tactical AI behavior retained.

## Validation
- JavaScript syntax: PASS.
- Runtime sync and One Source coverage: PASS.
- Five starter deck count, 60-card counts, copy limits, and default formations: PASS.
- Existing comprehensive application test suite still reports two unrelated inherited self-test failures: Holy Blast lethal Area queue and Arrow Barrage all-Mana damage. These were already outside the GitHub/starter-deck change scope and were not claimed fixed.
