# Verification — VS AI v6.27 + Tutorial v0.53

## Result
**PASS**

## Executed verification
- Root `npm run verify`: PASS.
- VS AI syntax/runtime/regression suites: PASS.
- Tutorial v0.53 syntax/base/tutorial suites: PASS.
- Targeted physical EXP rail test `tests/run-v627-exp-stack-visual.cjs`: PASS for both VS AI and Tutorial.
- Root manifest verification: PASS.
- Tutorial manifest verification: PASS.

## EXP presentation contracts verified
- Rendering reads exact `hero.exp_cards` instances and caps the presentation at four slots.
- 100 EXP and 200 EXP strips are selected from the actual tribute value of each EXP Card.
- The Hero stage uses a structural `hero-card-composition`, not a dynamic padding/overlay patch.
- A fixed 28px rail (`4 × 7px`) exists beside the Hero from the start, so Tribute does not shift the layout.
- The EXP rail stretches to the Hero-card composition height.
- Old layered/offset `.hero-stage.has-exp` / `.hero-exp-card` presentation rules were removed.
- Both supplied EXP assets are packaged independently in VS AI and Tutorial.
- Existing gameplay state remains authoritative: Rank Up/defeat cleanup already clears `exp_cards`, Reposition moves the Hero object, and effects such as Scouting remove exact EXP-card instances. The visual rail therefore follows those state transitions without new gameplay logic.

## Authority decision
No Source Stack version bump was made. This is a consumer presentation update only; Tribute/EXP/Rank Up gameplay authority is unchanged.
