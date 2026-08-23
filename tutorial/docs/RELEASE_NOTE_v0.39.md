# Grandis Legacy Tutorial v0.39

## 1. Source Stack adoption

- Synchronized with VS AI v6.8 and Source Authority Stack 2026-08-24.
- Adopted the canonical 198-card registry and Hero Component Authority v1.0.0: 6 Racial Traits, 16 Class Abilities, 10 Hero profiles, and 30 Hero compositions.

## 2. Gameplay/card changes

- Adopted all 30 revised card records and the Back Slash title correction.
- Inherits the corrected non-trivial effect execution and first-player Turn 1 Attack guard from the shared VS AI runtime.
- Starter examples now carry current card names and source metadata.

## 3. Bug fixes

- AI-owned and automatic pending decisions close deterministically, including End Phase continuation.
- Compatibility aliases mirror current authority rather than retaining retired card text.

## 4. UI changes

- Visible Tutorial version and cache lock advance to v0.39.
- No tutorial-flow or battlefield redesign.

## 5. Preserved behavior

- Tutorial guidance, Arvon narration, deterministic teaching setup, battlefield presentation, VFX/audio, mobile scrolling, and EXP guidance remain unchanged.

## 6. QA results

- Passed Tutorial-side authority hash, component, revised-effect, AI-decision, End Phase, manifest, syntax, runtime-sync, and VS AI parity checks.

