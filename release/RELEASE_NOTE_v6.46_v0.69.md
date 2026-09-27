# Grandis Legacy VS AI v6.46 / Tutorial v0.69

Date: 2026-09-27

VS AI is promoted from v6.45 to v6.46. Tutorial remains v0.69. Source Authority remains v1.9.5.

## Changes

- Corrected Response legality so `cannot_block` suppresses Block-family responses only; legal Negate responses such as Tactical Adaptation remain available against Execute.
- Preserved independent `cannot_dodge` restrictions and Casting exclusion for Tactical Adaptation.
- Re-verified generic defender-owned Response routing: Player attacks AI -> AI responder; AI attacks Player -> Player responder.
- Corrected battle-audio dedup so a Sound OFF event does not reserve the audible dedup slot and suppress a later valid Sound ON event.
- Replaced both Player and AI Lobby formation Swap glyphs with the supplied canonical `assets/lobby/Swap.png`, without changing formation behavior.
- Tutorial-specific gameplay/state-machine behavior remains unchanged at v0.69.

See `VS_AI_v6.46_Final_Correction_Audit_2026-09-27.md` for verification evidence.

## 27 Sept end-to-end acceptance correction

The semantic version remains VS AI v6.46 / Tutorial v0.69. The final acceptance pass adds a real Chromium end-to-end runtime gate for Execute/Response ownership, Tactical Adaptation resolution, nested counter-response priority, Response lifecycle cleanup, and gameplay-triggered Attack/Block/Dodge/Negate VFX/SFX. No card authority, Tutorial-specific state-machine, Lobby formation logic, AI Reposition logic, or gameplay redesign is introduced by this verification pass.
