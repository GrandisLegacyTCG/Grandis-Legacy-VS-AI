# VS AI v5.56 — Release Note

## UI

- Lobby heading is now **VS AI LOBBY**.

## AI gameplay planning

- Double Casting is used only when the Mage has the required same-source Magical Attack payoff.
- Elemental Lord schedules the payoff immediately in the current turn.
- Elementalist schedules the payoff on the next eligible own turn.
- Wildfire schedules a same-source Attack on the next own turn.
- Future-turn payoff plans survive End Phase and reserve the chosen Attack card.

## Data and runtime

No canonical card-data or runtime-rule change. This is an application AI-planner and UI-label update on Runtime Foundation v1.81 / Runtime Core v0.49.
