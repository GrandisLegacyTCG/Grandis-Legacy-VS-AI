# Grandis Legacy Tutorial Gameplay v0.31 — Release Note

## Scope

GitHub Pages tutorial application. Gameplay authority remains Runtime Foundation v1.81 / Runtime Core v0.49. This release changes tutorial flow, AI tactical planning inherited from VS AI v5.56, and lobby wording; canonical Season 1 card data is unchanged.

## Tutorial changes

- Separate first-use card practices for Attack, Support, Tactical, Event, and Item.
- Each practice reaches the last runtime stage where Cancel Action is still legal.
- Direct-commit cards stop before Play.
- Source selection becomes interactive only when required to reveal the next legal target stage.
- Final target selection is shown but blocked, followed by mandatory Cancel Action.
- Area Attack response education iterates through every affected Hero, with no two-target cap.
- GitHub-facing lobby title changed to NON-SCRIPTED — TUTORIAL GAMEPLAY.

## Shared VS AI base change

- Double Casting and Wildfire planning reserve the required Mage Attack at the timing printed by the setup card.

## Known validation boundary

Automated syntax, runtime regression, tutorial contract, sync hashes, manifest, and ZIP integrity are included. A complete browser match remains the final visual/interaction validation step before production publication.
