# Grandis Legacy VS AI v6.48 + Tutorial v0.71 — Final Correction Audit

Date: 2026-09-28

## VERSION

- VS AI: **v6.48**
- Tutorial: **v0.71**
- OSA: **v1.9.5 unchanged**
- Player Rulebook: **v2.6 unchanged**
- Application Runtime Sync: **v2.66**

## INVALID IMPORT

**ROOT CAUSE:** Failed Deck Setup imports were reported inside the still-active Deck Setup surface instead of acquiring the repository's top-modal/input authority. The file input also retained its selected value, so selecting the same invalid file again could fail to dispatch a new change event. Deck state mutation already occurred only after successful validation and was preserved.

**FINAL OWNER:** `shared-app/app.bundle.js` — existing `infoOverlay` / modal stack plus `acquireExclusiveModalOwnership()`, `releaseExclusiveModalOwnership()`, and `showInvalidDeckImportDialog()`. The fix uses the existing modal stack rather than a new modal system or an arbitrary huge z-index.

- Player invalid import: **PASS**
- AI invalid import: **PASS**
- Popup topmost: **PASS**
- Button clickable: **PASS**
- Click-through: **NO**
- Current deck preserved after failed import: **PASS**
- Same-file immediate reimport: **PASS**
- 49-card import: **REJECTED / PASS**
- 61-card import: **REJECTED / PASS**
- Unknown card ID: **REJECTED / PASS**
- Illegal copy count: **REJECTED / PASS**
- Valid 50-card import: **PASS**
- Valid 60-card import: **PASS**
- Real Chromium 1366×768: **PASS**
- Real Chromium 1024×768: **PASS**
- Real Chromium 768×1024: **PASS**
- Real Chromium 390×844: **PASS**

## HEAVEN'S FURY

**OLD ROOT CAUSE:** Heaven's Fury was only evaluated through generic buff scoring and was absent from the persistent tactical setup/follow-up planner. Its setup target could therefore be chosen independently from the Hero later selected to Attack.

**SETUP PLANNER OWNER:** `shared-app/app.bundle.js` — `aiBestAttackAfterHeavensFury()`, `aiPlanForSetupAction()`, `aiDeployActionScore()`, and `aiPlannedFollowUpAction()`, reusing the existing tactical setup-plan architecture used by Double Casting and related setup cards.

- Rank II target = planned attacker: **PASS**
- Rank II next-turn plan persistence: **PASS**
- Rank II same-Hero alternate Attack fallback: **PASS**
- Rank II invalidation when setup Hero unusable: **PASS**
- Heaven's Fury effect removal invalidates plan: **PASS**
- Rank III target = planned same-turn attacker: **PASS**
- No compatible follow-up: **DO NOT PLAY / PASS**
- Multiple-Hero candidate evaluation: **PASS**
- Enemy target may reevaluate while setup attacker remains fixed: **PASS**
- Stale plan: **NO**
- Attacker drift: **NO**
- Game-end stale plan cleanup: **PASS by owner inspection / `finishGame()` clears `aiPlan`**

Canonical Heaven's Fury semantics remain unchanged: Priest/Rank II setup is next-turn; Saint/Rank III setup is this-turn. No card text or OSA data was modified.

## REGRESSION

- Double Casting tactical setup planner: **PASS**
- AI Reposition: **PASS**
- Flashpowder nested Item Response: **PASS**
- Execute → Tactical Adaptation: **PASS**
- Tactical Adaptation → Intercept: **PASS**
- Block: **PASS**
- Dodge: **PASS**
- Negate: **PASS**
- Held-card cleanup: **PASS**
- Attack/Block/Dodge/Negate VFX: **PASS**
- Battle SFX: **PASS**
- Sound OFF: **PASS**
- Sound OFF → ON same-family dedup: **PASS**
- EXP Ready/Exhausted physical-scale parity: **PASS**
- 50–60 custom deck rule: **PASS**
- Tutorial Player End → AI handoff: **PASS**
- Tutorial Round 4+ progression: **PASS**
- Tutorial nested Response compatibility: **PASS**
- Canonical cards: **200 / PASS**
- Official Starter Decks: **5 / PASS**, compositions remain 60-card

## AUTHORITY PRESERVATION

Byte comparison against the incoming v6.47 package shows `runtime-source/` and `data/season1/` unchanged. OSA v1.9.5 / canonical card effect authority was not modified.

## BUILD

- Canonical application source: `shared-app/app.bundle.js` + `shared-app/app.css`
- Generated root/Tutorial mirrors: **PASS** via normal `npm run build:data` path
- Runtime Sync v2.66: **PASS**
- Tutorial guide/controller behavioral redesign: **NO**; existing guide byte retained
- Syntax: **PASS**
- Current static/runtime suite: **PASS**
- Tutorial suite: **PASS**
- v6.48 invalid-import real Chromium gate: **PASS**
- v6.48 Heaven's Fury production-runtime planner gate: **PASS**
- v6.47 EXP/nested-response/Tutorial real Chromium regression: **PASS**
- v6.47 battle VFX/SFX real Chromium regression: **PASS**

The final ZIP SHA-256 is generated externally after archive construction to avoid circularly changing the archive by embedding its own hash.
