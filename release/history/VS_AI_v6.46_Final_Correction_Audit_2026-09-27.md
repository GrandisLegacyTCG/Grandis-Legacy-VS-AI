# Grandis Legacy VS AI v6.46 — Final Correction Audit

Date: 2026-09-27

## Version

- VS AI: **v6.46**
- Tutorial: **v0.69**
- OSA / Source Authority: **v1.9.5**
- OSA modified: **NO**
- Tutorial-specific gameplay/state-machine modified: **NO**

## Response ownership

- ACTIVE RESPONSE OWNERS: `shared-app/app.bundle.js` — `openAttackResponseWindow()`, `resolveAttackWithOwnerGating()`, `autoResolveCurrentAIResponseWindow()`.
- Source-first audit found the generic defender/target-side ownership architecture already present in v6.45. It was preserved rather than replaced with Execute-specific routing.
- PLAYER ATTACK → AI: **AI RESPONDER — PASS** in real Chromium through the actual `resolveAttackWithOwnerGating()` path.
- PLAYER SELF-RESPONSE POPUP/ownership: **NO** for AI-targeted local-AI attacks.
- AI ATTACK → PLAYER: **PLAYER RESPONDER — PASS**; unresolved Player response window retains `response_owner=PLAYER`.
- Multi-target responder ownership remains target-side scoped by the existing generic pipeline; no Execute hardcode introduced.

## Execute / Tactical Adaptation

- OLD ROOT CAUSE: `responseKind()` returned `null` globally when `incoming.cannot_block` was true, before Negate-specific classification.
- FINAL RESPONSE OWNER: `shared-app/app.bundle.js` — `responseKind()` / `responseOptionsFor()`.
- `cannot_block`: **BLOCK ONLY — PASS**. Sacred Bulwark / generic Block-family checks reject when `cannot_block` is true.
- `cannot_dodge`: **PRESERVED — PASS**. Dodge-family responses still require `!incoming.cannot_dodge`.
- EXECUTE → BLOCK: **REJECTED — PASS**.
- EXECUTE → TACTICAL ADAPTATION: **LEGAL — PASS** (`negate_return`).
- Tactical vs Casting: **REJECTED — PASS** through `responseOptionsFor()` Casting exclusion.
- Back Slash / Ambush Shot anti-Dodge semantics: **PRESERVED** through the same independent `cannot_dodge` path and retained authority data.
- No card-ID-specific Execute/Tactical allow-list was added.

## Audio

- MUTE DEDUP BUG PRESENT BEFORE FIX: **YES**. `battlePlayAudio()` updated the dedup ledger before `playPreloadedAudio()` could reject playback because Sound was OFF.
- FINAL OWNER: `shared-app/app.bundle.js` — `battlePlayAudio()`.
- SOUND ON: **PASS**.
- SOUND OFF: **PASS / zero playback**.
- OFF → ON SAME EVENT FAMILY: **PASS** in real Chromium; muted event leaves dedup ledger empty and following audible event plays.
- DUPLICATE BATTLE SFX: **NO new duplicate owner introduced**; existing single battle-audio owner retained.

## Lobby Swap

- Canonical asset: `assets/lobby/Swap.png`.
- Tutorial mirror: `tutorial/assets/lobby/Swap.png`.
- Asset SHA-256: `b9e181e1fc207a223f2fb615ed0dc851812ef93acfedb6088a5e5b8714e9034f`.
- PLAYER SWAP ASSET: **PASS**.
- AI SWAP ASSET: **PASS**.
- Both use the same generic formation renderer/component.
- Player Left ↔ Center / Center ↔ Right: **PASS**.
- AI visual parity: **PASS** — same PNG/component style.
- Match formation propagation: **PASS** in real Chromium.
- New alternate Swap asset created: **NO**.
- Responsive 1366×768 / 1024×768 / 768×1024 / 390×844: **PASS**, no overflow/layout shift in Lobby regression.

## Locked regression

- AI Reposition v6.45 behavior: **PASS** (retained current suite).
- Player Rank preview: **PASS**.
- AI Rank preview/presentation: **PASS**.
- Opponent hand border cleanup: **PASS** in real Chromium at four required viewports.
- Quick Preview / Card Played / Candidate 15 / Shard presentation / Tribute geometry: **retained current regression PASS**.
- Tutorial v0.69 turn-handoff: **PASS** in real Chromium; stale Guide Hold reconciliation remains working.
- 200 canonical cards: **PASS — 200/200**.
- 5 active Starter Decks: **PASS — 5/5, 60 Main Deck cards each**.

## Build / generated mirrors

- Canonical gameplay/UI source: `shared-app/app.bundle.js` + `shared-app/app.css`.
- Generated root and Tutorial app mirrors regenerated via repository `npm run build:data` path.
- Generated reproducibility: **PASS — 23/23 tracked outputs byte-identical after regeneration**.
- Application Runtime Sync: **v2.64** (new generation; prior v2.63 archived rather than silently rewritten).
- Root app target: **VS AI v6.46**.
- Tutorial consumer remains **v0.69**, base VS AI updated to v6.46 shared bytes.
- JavaScript syntax: **PASS**.
- Current static/regression suite: **PASS**.

## Real Chromium evidence

- `tests/run-v646-response-audio-browser.cjs`: **PASS** — generic responder ownership, Execute anti-Block + Tactical Negate legality, independent cannot_dodge/Casting restrictions, Sound OFF→ON dedup.
- `tests/run-v643-lobby-browser.cjs`: **PASS** — Swap.png present on Player+AI controls at all required viewports, five Starter formations, repeated swaps, Rank preview, actual match formation propagation.
- `tests/run-v645-opponent-hand-browser.cjs`: **PASS** — opponent-hand perimeter cleanup at 1366×768, 1024×768, 768×1024, 390×844.
- `tests/run-v069-tutorial-turn-handoff-browser.cjs`: **PASS** — Tutorial v0.69 handoff regression.

## Final package gate

The final release package is required to contain exactly one top-level repository folder and no nested ZIP/RAR/7z/tar, `node_modules`, `.git`, browser profile, temp extraction tree, or duplicate loose repository tree. The final package is fresh-extracted and rechecked from packaged bytes before release.
