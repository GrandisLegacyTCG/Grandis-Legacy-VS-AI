# Grandis Legacy VS AI v6.14

## Game Result Back to Lobby reload hotfix

- `Back to Lobby` now performs a same-page `window.location.reload()` after a match has ended.
- The existing 60-second automatic result cleanup uses the same return routine and therefore reloads as well.
- A dedicated finished-match silent-reload flag bypasses the VS AI `beforeunload` warning for this intentional reload.
- Active matches still retain the existing refresh/navigation warning.
- Tutorial remains v0.42 and is unchanged.
- No gameplay authority, card data, Conditional Follow-up behavior, status rules, audio assets, or Source Stack versions are changed.
