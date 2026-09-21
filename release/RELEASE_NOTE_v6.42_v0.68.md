# Grandis Legacy VS AI v6.42 / Tutorial v0.68

Release date: 2026-09-21  
Correction candidate: **(6)**  
Baseline: **(5)(1)**

## Scope

Candidate (6) is a narrow correction pass on the existing VS AI v6.42 / Tutorial v0.68 release. It does not create a new application version and does not modify OSA, canonical card data, Starter Deck composition, Shared Runtime gameplay authority, PvP, Deck Builder, or unrelated UI.

Authority remains:

- OSA v1.9.3
- Shared Runtime v1.94.1
- UI Contract v2.53
- Application Runtime Sync v2.61
- Starter Deck Authority v1.6.1
- 5 active Starter Decks
- 200 canonical cards

## Candidate (6) corrections

### Contextual card preview

- The already-approved standard battlefield preview X/Y position, Next Phase visibility, opponent readable Shard hover, hidden-Shard safety, and popup top-layer architecture are preserved.
- Contextual previews now measure the **visible card artwork edge** rather than assuming the source wrapper edge is the card edge.
- LEFT contextual placement uses the same effective visible edge-to-edge gap as the already-approved RIGHT placement.
- Card Played remains LEFT-opening at **272 × 381 px**.
- Legacy Deck, Full Card History, Response Window, Discard, and selection/choice popup previews remain above their modals.

### Responsive Mana Regen

- Desktop and tablet landscape keep REGEN associated with the Shard Deck. REGEN plus its existing graphical Counter asset is fully contained inside the lower portion of the Shard Deck card back.
- Phone and tablet portrait use the mobile Shard Pool grouping: REGEN occupies reserved space on the left and Shard cards start to its right.
- The first Shard cannot overlap REGEN or the graphical Counter.

### Deck / pile / Status presentation

- The visible Discard top card uses the same card-footprint family as Legacy Deck, Shard Deck, and Main Deck without stretching its aspect ratio.
- Status badge geometry, position, spacing, and one-badge-per-Status behavior are unchanged; only the numeral changes from **9 px to 8 px**.
- On phone and tablet portrait, Legacy/Shard/Discard/Main count badges remain the approved rounded rectangles and are attached to the actual card/stack top-right. Titles remain readable and cards stay horizontally centered and contained.

### Warning and Legacy label alignment

- Hero warning uses the same `gl-warning-indicator` visual authority as the already-correct Legacy/Attachment warning instead of a separate Hero approximation.
- A Hero warning is visible immediately when active; Hero/container hover is not required.
- Only hovering/focusing the warning icon reveals the information tooltip.
- The warning stays fully inside the Hero container and the glyph remains centered.
- Legacy name plus warning icon are treated as one centered horizontal group so short and long Legacy names remain visually centered against the Legacy card.

### Shard entry presentation

- The existing Shard-entry animation is reused for visible Shards that enter a Shard Pool through normal Draw and non-draw gain effects such as Steal, Meditation, Elf racial effects, and future gain paths using the same generic gain helper.
- Multiple Shards animate sequentially with a short presentation delay.
- This is presentation feedback only; Shard source, count, ownership, and gameplay resolution semantics are unchanged.

### Response ownership presentation/controller correction

- A player-interactive Response Window is shown only when the current response owner is PLAYER.
- PLAYER → AI attacks/skills leave AI response priority to the AI controller; the player cannot choose No Response / Take Hit for AI.
- AI → PLAYER attacks/skills still expose the player Response Window.
- If a response chain legitimately returns priority to PLAYER, the player window is shown at that point.
- Response legality and existing response-chain gameplay rules are unchanged.

### Tablet landscape

- Tablet landscape remains visually desktop-like while using touch interaction.
- Phase Tracker/sidebar sizing uses available viewport proportions to avoid overlap.
- Tapping a Hand card opens the 250 × 350 right-side preview rather than an oversized battlefield-centered preview.
- Compact Preview/Play/other Hand actions use a vertical button stack.
- Deck/pile cards remain inside their zone boundaries; lower clipping is allowed where needed rather than spilling outside the zone.

## Preservation

Ready/Exhausted Hero base-scale parity was browser-verified and was not needlessly rewritten. The approved battlefield preview, opponent Mana/Shard hover and hidden safety, popup z-index fix, numeric badge visual, and Status badge geometry are preserved.

## Verification

Candidate (6) is gated by root gameplay/AI/application regression, Tutorial v0.68 regression, real Chromium geometry/interaction verification, exact source-diff audit against baseline (5)(1), regenerated root/Tutorial manifests, archive integrity checking, and final SHA-256 package hashing. See `VERIFICATION_v6.42_v0.68.md` for the executable result.
