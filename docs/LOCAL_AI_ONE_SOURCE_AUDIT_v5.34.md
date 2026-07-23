# Local AI One Source and Runtime Audit — carried forward through VS AI v5.40

This is a Local AI decision-policy update only.

- Runtime Foundation v1.74, Runtime Core v0.41, Runtime Data v0.12.5, Effect Recipe v0.11.5, and Legality v0.11.4 are the active executable gameplay authority for VS AI v5.40.
- The AI planner consumes `getLegalActions()` and never creates independent legality, cost, target, damage, healing, or zone-movement results.
- Setup simulation changes only temporary phase, Hand, Mana, and local AI plan fields, then restores the authoritative state before returning a choice.
- Every stored follow-up is revalidated through current Runtime legal actions immediately before commitment.
- No canonical card record, generated runtime data, resolver, shared UI, or PvP package is modified.
