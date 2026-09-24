# VS AI v6.44 / Tutorial v0.68 Verification

## Passed release gates

- Syntax gate: PASS.
- Current static/runtime regression suite: PASS, including 200-card coverage, five Starter authority/parity, deck legality, Hero Components, Lobby → Battlefield, gameplay/runtime, Candidate 15 authority/UI lock, responsive contract, and generated-output reproducibility.
- Tutorial v0.68 suite: PASS.
- VS AI v6.44 Chromium acceptance: PASS at 1366×768, 1024×768, 768×1024, and 390×844.
- v6.43 Player Lobby Chromium regression: PASS.
- Current Battlefield Chromium UI regression: PASS across desktop/phone/tablet coverage.

The legacy monolithic `run-v642-candidate15-browser.cjs` gate was invoked but did not terminate inside the available headless execution window. Candidate 15's static authority/UI gate passed, its relevant current browser interaction surfaces passed through the current Battlefield browser regression, and the v6.44 source diff does not change Candidate 15 interaction handlers.

## v6.44 acceptance assertions

- Player Hero swap regression: PASS.
- AI Hero swaps: PASS for all five current Starter/deck selections, including repeated swaps and canonical three-Hero validity.
- Independent Player/AI formation propagation into the actual match: PASS.
- Player Rank regression: PASS.
- AI Rank I / II / III: PASS for all five current Starter/deck selections.
- Required independent Rank combinations I/III, III/I, II/II: PASS.
- Rank preview gameplay leak: NO.
- AI deck change formation and Rank reset: PASS.
- Passive Quick Preview outer decorative stroke: removed and browser-verified for Hero, Skill, Legacy, Item, and Event representatives.
- Functional legal-target outline: preserved and browser-verified.
- Opponent-hand original card-back artwork: preserved, no extra computed frame.
- Card Played physical dimensions: equal across all required viewports; no per-card scale reduction.
