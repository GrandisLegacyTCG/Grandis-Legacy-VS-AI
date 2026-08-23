# Grandis Legacy VS AI v6.8

## 1. Source Stack adoption

- Adopted Source Authority Stack 2026-08-24 / One Source Authority v1.6.0.
- Runtime Foundation v1.84, Runtime Core v0.52, Runtime Data v0.13.0, Effect Recipe and Checkpoint v0.12.0, Legality Map v0.11.8, and Sync v2.46.
- Locked the 198-card registry `f6560b21206a4f50670d9801442933d026768c3c704215f443d58a568980a3db` and Hero Component registry `487aa2620b5be99480a81d462082f1a35ee637ec2cc38ebf42b1bcf1103d06c9`.
- Adopted 6 Racial Traits, 16 Class Abilities, 10 Hero profiles, and 30 Hero compositions.

## 2. Gameplay/card changes

- Adopted all 30 approved revised Card IDs; only `S1-THF-010` changes title, from Back Stab to Back Slash.
- Replenish returns two selected discard cards, shuffles, then draws one; Resurrection restores 50 HP with Priest exhausted and Saint ready.
- Mana Catalyst grants +2 Mana; Dragon Scale blocks 50; Stoneblood prevents defeat and sets the Hero to 30 HP; Second Chance is a defensive Dodge Response with no replay.
- Brilliant Radiance pays 4 Mana and negates/discards eligible cards, excluding Casting, Ultimate, and Area cards.
- Spectral Grappling Hook requires one other Hand discard; Fire Wall blocks 70 Physical damage and inflicts Burn for 2 turns; Deflect blocks 50 and returns 10 direct damage for the Gladiator row.
- Starter deck names and source markers now use Back Slash, One Source Authority v1.6.0, Starter60 v1.3, and the current registry hash.

## 3. Bug fixes

- The first player cannot play an Attack Skill on Turn 1; the shared reducer enforces the guard.
- End Phase resumes after player-owned Stoneblood and Legacy decisions.
- AI-owned End Phase decisions auto-resolve, including status, discard-limit, attachment, lethal-intervention, and Magic Scope owner-only paths.
- Legacy compatibility aliases now mirror current data so retired Back Stab text cannot leak from an inactive versioned filename.

## 4. UI changes

- Cache keys and visible version labels advance to VS AI v6.8 and Tutorial v0.39.
- No lobby or battlefield redesign.

## 5. Preserved behavior

- Existing AI lobby, battle presentation, VFX/audio, desktop/mobile controls, Card Review, result cleanup, and same-tab navigation remain unchanged.
- Tutorial-only guidance, Arvon narration, deterministic teaching setup, and mobile target scrolling remain isolated to the Tutorial package.

## 6. QA results

- Passed authority hashes/counts, all 30 revised effects, Back Slash, Hero Component composition, pending-state progression, AI-owned decisions, Magic Scope, and Turn 1 guard checks.
- Passed existing VS AI and Tutorial syntax, runtime-sync, gameplay, UI, lifecycle, manifest, and Tutorial parity suites.

