# Grandis Legacy VS AI v6.42 / Tutorial v0.68 — Candidate (9)

Release date: 2026-09-21  
Baseline: **Candidate (8)**  
Application versions: **VS AI v6.42 / Tutorial v0.68**

## Scope

Candidate (9) synchronizes VS AI/Tutorial to **Source Authority v1.9.4** and performs the final requested UI/CSS cleanup without a broad redesign. PvP and Deck Builder are not modified. Starter Deck composition remains unchanged.

Active authority stack:

- OSA v1.9.4
- Shared Runtime v1.94.2
- Runtime Data v0.16.1
- Effect Recipe v0.15.1
- Effect Checkpoint v0.15.1
- UI Contract v2.53
- Application Runtime Sync v2.62
- Starter Deck Authority v1.6.1 / 5 active starters
- 200 canonical cards

## Attachment authority synchronization

- Triple Shot is no longer a presence-only/no-expiry exception. It is a canonical This-Turn Attachment with counter 1 and owner-End-Phase expiry.
- Triple Shot still does not bind to one physical Poison Arrow/Burning Arrow card instance.
- Attachment lifecycle fields are authority-defined; application fallback/hardcoding that conflicts with OSA is removed.
- Countdown, multi-turn, Draw-checkpoint, Battle-checkpoint, progress/consume, Status-vs-Attachment, Hero-defeat cleanup, and final-Hero terminal behavior are covered by authority/runtime tests.

## UI/CSS cleanup

- Side previews anchor to the actual activated card element and use a single shared GAP with clamping only when necessary.
- Legacy warning has a single render source and a single warning DOM node per condition.
- Deck/Pile back-card sizing is consolidated to one visual footprint family.
- The text `REGEN` is removed globally; only the existing graphical counter remains.
- Desktop and Tablet Landscape Regen counter is centered against the Shard Deck card. Mobile/Tablet Portrait retain their approved vertical region with the graphical counter centered in-slot.
- Mobile/Tablet Portrait count badges use badge-center = card top-right corner geometry.
- Tablet Landscape Shard Deck count uses the same corner relationship.
- Tablet Landscape Shards render at 80–85% of the Hand reference width.
- Live battlefield tablet taps use one coherent routing path: first tap Quick Preview, second same-card activation Detail. Inspection/modal cards may open Detail directly. Play/Tribute remain direct actions.
- Obsolete tablet preview remnants and stale competing touched-feature rules are removed instead of hidden behind another override layer.

## Preserved behavior

- Battlefield quick preview remains unchanged.
- Tablet Landscape Phase Tracker and Lobby scroll remain on their approved Candidate (8) behavior.
- Hidden opponent information, popup stacking, Response ownership, Shard gain animation, and final-Hero terminal evaluation remain protected.
- VS AI stays v6.42 and Tutorial stays v0.68.
