# VS AI v6.43 Lobby Verification

- Active root Lobby bundle: `shared-app/app.bundle.js`.
- Generated deployment mirrors: `js/app.bundle.js` and `tutorial/js/app.bundle.js`, regenerated from the shared source.
- Navigation, formation, Rank preview, match-formation propagation, Starter reset, and four required viewport checks are covered by `tests/run-v643-lobby.cjs` and `tests/run-v643-lobby-browser.cjs`.
- Tutorial-specific controller/state-machine files and Candidate 15 Battlefield files are regression-locked.
- Tutorial version remains v0.68.
