# Grandis Legacy VS AI v6.46 — End-to-End Response Verification Audit

Date: 2026-09-27

## Version / scope lock

- VS AI: **v6.46** (unchanged)
- Tutorial: **v0.69** (unchanged)
- OSA consumer: **v1.9.5** (unchanged)
- v6.47 created: **NO**
- Production gameplay source changed in this pass: **NO**. Exact real-runtime Chromium verification proved the existing final v6.46 correction path works; this pass adds the missing acceptance gate, fixes the prior browser test process-exit harness, updates release documentation, and keeps previous audit history under `release/history/`.

## Active ownership audited

- Response window creation / owner: `shared-app/app.bundle.js` — `openAttackResponseWindow()`.
- Local-AI target ownership gating: `resolveAttackWithOwnerGating()` and the Execute branch in `commitPlayedCard()`.
- AI response decision: `autoResolveCurrentAIResponseWindow()` → `chooseAIDefenseResponseOption()`.
- Player response UI: `renderResponseWindow()` + `responseSelectNoStuck()` + `confirmSelectedResponse()`.
- Response legality: `responseKind()` + `responseOptionsFor()`.
- Committed counter-response priority: `openCommittedResponseCounterWindow()` / `resolveReactiveCancelWindow()`.
- Final attack/response lifecycle: `resolveResponseWindow()` + `finalizePlayedCardAfterResponse()`.
- Battle presentation/audio: `queueResolvedAttackFeedback()` → `queueBattleFeedback()` / `runBattleFeedback()` / `battlePlayAudio()`.

## Exact real-runtime Chromium evidence

Acceptance test: `tests/run-v646-execute-response-e2e-browser.cjs`.

The test loads the production runtime and exercises normal gameplay entrypoints. It does not certify by directly calling `responseKind()`, `responseOptionsFor()`, `openAttackResponseWindow()`, or VFX/audio helpers. Test-only in-memory instrumentation records which existing runtime owner executes; no test hook is added to production application bytes.

### PLAYER EXECUTE → AI

- Player action flow: `beginPlayFromHand()` → real source selection → real target selection → `commitPlayedCard()`.
- Player self-Response popup: **NO — PASS**.
- Response owner: **AI — PASS**.
- AI evaluator executed: **PASS**.
- No-response AI auto-pass/resolution: **PASS**.

### PLAYER EXECUTE → AI TACTICAL ADAPTATION

- Tactical offered to AI by real Response options: **PASS**.
- AI actually selected Tactical through existing AI defense chooser: **PASS**.
- Response kind: `negate_return` — **PASS**.
- Execute negated: **PASS**.
- AI target Hero survives: **PASS**.
- Execute returned to Player Hand: **PASS**.
- AI Tactical Adaptation final zone = AI Discard: **PASS**.
- Response pending cleared: **PASS**.
- held Attack cleared exactly once: **PASS** (`.gl-held-card` = 0 after resolution).
- Response overlay closed: **PASS**.
- pending attack direction marker clears after presentation settles: **PASS**.
- duplicate card: **NO**.
- next legal gameplay action remains available: **PASS**.

### AI EXECUTE → PLAYER TACTICAL ADAPTATION

- AI used Execute through normal AI legal-action / `executeAIAction()` path: **PASS**.
- Player Response Window visibly opened: **PASS**.
- Tactical visible: **PASS**.
- Tactical selectable: **PASS**.
- Confirm works: **PASS**.
- Payment works from real Shard Pool: **PASS**.
- Negate resolves: **PASS**.
- Player Hero survives: **PASS**.
- AI Execute returned to AI Hand: **PASS**.
- Player Tactical final zone = Player Discard: **PASS**.
- Response popup closes: **PASS**.
- pending clears: **PASS**.
- held Attack clears: **PASS**.
- next gameplay progression remains usable: **PASS**; runtime advanced normally to the Player Draw Phase.

### Nested Response priority

Canonical nested response is supported and was tested through actual gameplay:

Player Execute → AI Tactical Adaptation → Player Intercept.

- Original Player did **not** receive initial priority against its own Execute: **PASS**.
- After AI committed/paid Tactical, priority returned to Player: **PASS**.
- Player Intercept visible/selectable through normal Response UI: **PASS**.
- Intercept canceled committed Tactical: **PASS**.
- Tactical reached Discard after paid costs: **PASS**.
- Intercept reached Discard: **PASS**.
- Original Execute continued rather than incorrectly returning to Hand: **PASS**.
- chain cleanup: **PASS**.

## Execute / restriction matrix

- Execute → ordinary Block: **REJECTED / PASS**.
- Execute → Tactical Adaptation: **LEGAL / PASS**.
- `cannot_block` suppresses Block family only: **PASS**.
- `cannot_dodge` remains independent: **PASS**.
- Gladiator Execute Dodge behavior: **preserved by existing branch (`cannot_dodge=false`)**.
- Conqueror Execute anti-Dodge: **preserved (`cannot_dodge=true`)**.
- Back Slash anti-Dodge: **PASS**.
- Ambush Shot anti-Dodge: **PASS**.
- Normal Physical Attack → Tactical when legal: **PASS** (real AI Slash → Player Tactical scenario).
- Normal Magical Attack response ownership: **PASS** both directions using Arcane Bolt.
- Casting Attack → Tactical: **REJECTED / PASS**.

## Normal Response ownership regression

- Player Physical Attack → AI responder: **PASS / real gameplay**.
- Player Magical Attack → AI responder: **PASS / real gameplay**.
- AI Physical Attack → Player responder: **PASS / real gameplay**.
- AI Magical Attack → Player responder: **PASS / real gameplay**.

## Battle presentation — real Chromium gameplay resolution

All presentation checks are triggered by actual card resolution, not direct VFX/audio helper calls.

- Normal Attack hit VFX: **PASS** (`gl-battle-pattack`).
- Normal Attack hit SFX: **PASS — exactly once**.
- Block VFX: **PASS** (approved defense-family VFX).
- Block SFX: **PASS — exactly once**.
- Dodge VFX: **PASS** (`gl-battle-dodge-card`).
- Dodge SFX: **PASS — exactly once**.
- Negate VFX: **PASS** (approved defense/negate presentation family).
- Negate SFX: **PASS — exactly once**.
- Tactical Adaptation → Execute Negate VFX/SFX: **PASS**.
- Sound OFF: **PASS — zero battle SFX**.
- Sound OFF → ON, same event family: **PASS — later audible event plays**.
- duplicate battle SFX: **NO**.

## Response lifecycle terminal gate

For tested terminal paths (no response, Block, Dodge, Negate, Execute→Tactical, nested Tactical→Intercept):

- `responseWindow == null`: **PASS**.
- stale pending Response: **NO**.
- Response overlay closed: **PASS**.
- held Attack visual count: **0 after resolution / PASS**.
- target direction marker clears after visual settle: **PASS**.
- canonical final zones: **PASS**.
- duplicate card: **NO**.
- gameplay continues: **PASS**.

## Swap / locked UI verification

Real Chromium `run-v644-ai-lobby-card-presentation-browser.cjs` and `run-v643-lobby-browser.cjs`:

- Player Left ↔ Center: **PASS**.
- Player Center ↔ Right: **PASS**.
- AI Left ↔ Center: **PASS**.
- AI Center ↔ Right: **PASS**.
- Player + AI use retained `Swap.png`: **PASS**.
- selected formation propagates into match: **PASS**.
- Rank Preview regression: **PASS**.
- opponent Hand / Quick Preview / Card Played regression: **PASS**.
- new Swap asset created: **NO**.

## Tutorial / authority locks

- Tutorial v0.69 syntax + suite: **PASS**.
- Tutorial v0.69 real Chromium turn-handoff regression: **PASS**.
- Tutorial-specific state machine modified: **NO**.
- OSA v1.9.5 modified: **NO**.
- canonical cards: **200 / PASS**.
- active Starter Decks: **5 / PASS**.
- AI Reposition static/current regression: **PASS**.

## Build / regression evidence

- `npm run syntax`: **PASS**.
- `npm run test:current`: **PASS**.
- `npm run test:tutorial`: **PASS**.
- exact v6.46 E2E Chromium gate: **PASS**.
- generic v6.46 Response/audio Chromium gate: **PASS**.
- opponent-hand production Chromium gate: **PASS**.
- Player+AI Lobby/Swap Chromium gate: **PASS**.
- Player Lobby Chromium gate: **PASS**.
- Candidate 15 static authority/UI gate: **PASS**.
- current Desktop v6.42 browser UI gate: **PASS**.

The inherited long Candidate 15 standalone Chromium stress gate was not used as the v6.46 acceptance owner; the current task's mandatory exact Execute/Tactical/VFX/SFX Chromium gate, current static Candidate 15 gate, Lobby gates, and Tutorial gate are the release criteria for this correction pass.

## Final result before packaging

**PASS.** The previously missing evidence is now explicit: the exact real-runtime Player Execute→AI, Player Execute→AI Tactical, AI Execute→Player Tactical, nested counter-response, full lifecycle cleanup, and gameplay-triggered battle VFX/SFX sequences all work on final v6.46 source without requiring a new production gameplay patch.
