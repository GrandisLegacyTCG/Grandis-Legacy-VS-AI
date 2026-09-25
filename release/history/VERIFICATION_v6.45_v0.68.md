# VS AI v6.45 / Tutorial v0.68 Verification

## Required v6.45 gates

- Syntax/build checks: PASS.
- Current regression suite: PASS.
- 200-card current authority coverage: PASS (200 unique canonical cards).
- Five Starter authority/parity: PASS (5/5, 60 cards each).
- Hero Components / deck legality / opening / turn lifecycle / Response / payment / Rank Up / defeat / Legacy integration locks: PASS through the current regression suite.
- Candidate (15) authority/UI lock: PASS.
- Player + AI v6.44 Lobby parity regression: PASS.
- Quick Preview presentation regression: PASS.
- Card Played equal-size responsive regression: PASS.
- Dedicated AI Reposition deterministic suite: PASS.
- Opponent-hand Chromium visual gate: PASS at 1366×768, 1024×768, 768×1024, and 390×844.
- v6.44 AI Lobby/Card Presentation Chromium regression: PASS at required responsive viewports.
- v6.43 Player Lobby Chromium regression: PASS.
- Current Chromium UI correction suite: PASS.
- Tutorial v0.68 suite: PASS.

## Opponent-hand visual evidence

Screenshot artifacts are stored in `tests/artifacts/v645-opponent-hand/`:

- `desktop-1366x768.png`
- `tablet-landscape-1024x768.png`
- `tablet-portrait-768x1024.png`
- `phone-390x844.png`

The production card-back fixture is byte-identical to the source asset used for the visual comparison. The card-back artwork itself was not edited.

## Tutorial lock

Tutorial remains v0.68. `tutorial/js/tutorial-guide.js` and `tutorial/css/tutorial-guide.css` are byte-identical to the v6.44/v0.68 baseline. Tutorial-specific progression/state-machine logic was not changed. Generated shared application mirrors may change only as part of the normal repository build synchronization.
