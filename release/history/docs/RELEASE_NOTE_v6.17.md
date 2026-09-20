# Grandis Legacy VS AI v6.17 / Tutorial v0.45

Hotfix release, 2026-08-27.

- Fix Cover Up response-source legality so an already Exhausted legal Warrior-line Hero can respond when canonical response policy allows it.
- Validate Cover Up fully before spending Mana; invalid/stale confirmations consume neither Mana nor the card.
- A successful target-changing Redirect/reposition keeps the same Attack instance and opens a fresh Defense Response Window for the new target.
- No Attack replay cost, on-play trigger, or on-attack trigger is repeated.
- Add one-shot attacker-to-target direction indicator in VS AI and Tutorial; Redirect replays the cue toward the new target.
- Runtime aligned to Source Stack v1.7.2 / Foundation v1.88 / Core v0.56 / Sync v2.50 / Manual v1.44 / UI Lock v2.49.
