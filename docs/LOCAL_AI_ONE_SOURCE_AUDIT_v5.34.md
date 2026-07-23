# Local AI v5.34 — One Source and Runtime Audit

This is a Local AI decision-policy update only.

- Runtime Foundation v1.73, Runtime Core v0.41, Runtime Data v0.12.5, Effect Recipe v0.11.5, and Legality v0.11.4 remain the executable gameplay authority.
- The AI planner consumes `getLegalActions()` and never creates independent legality, cost, target, damage, healing, or zone-movement results.
- Setup simulation changes only temporary phase, Hand, Mana, and local AI plan fields, then restores the authoritative state before returning a choice.
- Every stored follow-up is revalidated through current Runtime legal actions immediately before commitment.
- No canonical card record, generated runtime data, resolver, shared UI, or PvP package is modified.
