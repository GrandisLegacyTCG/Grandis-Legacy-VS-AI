# Local AI One Source and Runtime Audit — carried forward through VS AI v5.44

This audit is carried forward with the current VS AI gameplay/runtime stack.

- Runtime Foundation v1.75, Runtime Core v0.42, Runtime Data v0.12.5, Effect Recipe v0.11.5, and Legality v0.11.4 are the active executable gameplay authority for VS AI v5.44.
- The AI planner consumes `getLegalActions()` and never creates independent legality, cost, target, damage, healing, or zone-movement results.
- Setup simulation changes only temporary phase, Hand, Mana, and local AI plan fields, then restores the authoritative state before returning a choice.
- Every stored follow-up is revalidated through current Runtime legal actions immediately before commitment.
- v5.44 changes Casting source continuity across Rank Up/Draw and release-time source evaluation. Canonical card data and PvP remain unchanged.
