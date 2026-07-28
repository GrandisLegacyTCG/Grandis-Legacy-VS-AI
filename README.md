# Grandis Legacy VS AI v5.55

Current standalone VS AI consumer based on Runtime Foundation v1.81 and Runtime Core v0.49.

## v5.55 changes
- A single **Next Phase** action from Reform now enters End Phase, resolves End cleanup, and passes the turn automatically.
- Mandatory End Phase choices pause the handoff and resume it after the choice is completed.
- End status ticks are checkpointed so a paused cleanup cannot apply the same status damage twice.
- Approved Noto Sans normal and italic variable WOFF2 binaries are bundled in `assets/fonts/noto-sans/`.

No card definitions, effect recipes, legality data, or AI decision rules changed.
