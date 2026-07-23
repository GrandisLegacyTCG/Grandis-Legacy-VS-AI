# Grandis Legacy VS AI → PvP Takeover Note

Date: 2026-07-23  
VS AI baseline: v5.48  
PvP baseline intentionally unchanged: v2.5.16 / current deployed PvP branch

## Purpose
This note records the fixes completed during the GitHub Pages / VS AI rebuild that must be audited and ported to PvP. Shared runtime packages contain the gameplay contracts, but PvP still needs explicit integration, UI mapping, server-authoritative validation, and regression coverage.

## A. Shared gameplay/runtime fixes to port

1. **Global Hero lineage fallback**
   - Validate legality before effect-row fallback.
   - Fallback stays inside the legal Hero lineage and never crosses an unrelated class tree.
   - Audit every Hero and every Defense/Response card, not only Grand Ranger / Back Step.

2. **Response availability diagnostics**
   - Every Defense/Response card in Hand remains visible.
   - Legal cards are selectable; illegal cards are disabled.
   - Return one authoritative reason using this priority: class mismatch → lineage/rank mismatch → insufficient Mana → incoming attack cannot be Blocked/Dodged → other card-specific restriction.
   - UI must not invent the reason.

3. **Card Played target snapshot**
   - Preserve the target Hero identity captured at declaration.
   - If that Hero is defeated and replaced by Legacy, record Legacy replacement separately; do not rewrite the original target as the Legacy card.

4. **Turn transition / Draw Phase**
   - End Phase completion automatically enters the next player’s Draw Phase.
   - `Your Turn` banner and mandatory draw begin together.
   - Draw prompts (Quick Reload, draw replacements, counters) resolve before the player may advance to Deploy.

5. **Per-card draw presentation**
   - For Opening Hand and every multi-draw: animate one draw → reveal that card in Hand → continue to the next draw.
   - Opening Hand may animate PLAYER and opponent simultaneously per draw number, but draw numbers must remain sequential.

6. **Casting persistence and identity**
   - Draw Phase does not cancel Casting.
   - A casting Hero remains Exhausted while Casting is active.
   - Rank Up preserves Casting because the Hero instance/progression is unchanged.
   - Casting cancels only for legal causes such as Stun, source Reposition, defeat, or source replacement.
   - Release damage/effect row uses the current Hero at release; the locked target is the tactical position.
   - Card Played logs separate `Casting Started`, `Casting Resolved`, and `Casting Canceled` with the same card-instance identity.

7. **Double Casting FINAL text parity**
   - Elementalist Rank II: active next turn; Magical Attack cost increases by 3.
   - Elemental Lord Rank III: active this turn; Double Casting does not Exhaust the Hero.
   - Both rows use the same Magical Attack card twice.
   - Activation 2 may choose the same or a different legal Hero for both Rank II and Rank III.
   - Each activation opens its own Response Window and resolves independently.

8. **Holy Blast / multi-target continuation**
   - A lethal target pauses for Legacy selection, then the queued Area/multi-target effect resumes at the next target.
   - Holy Blast healing remains independent of whether damage was prevented or reduced to 0.

9. **Arrow Barrage audit**
   - Preserve `mana_spent` through resolution.
   - Raw damage is calculated from all Mana spent before Defense.
   - Response reductions such as Dragon Scale are logged separately from raw damage.

10. **Tactical AI behaviors (Local AI only, but useful for future server AI)**
    - Tactical Adaptation only when a legal attack follows in the same turn.
    - Ring of Grace targets the Hero that will be healed and is only used when a heal follows.
    - Poison Vial is only used when a legal attack follows.

## B. UI parity items for future PvP redesign

- Desktop UI from VS AI v5.45 is treated as the approved baseline except the Response Window refinements in v5.46 and the mobile visual/input refinements in v5.47 and Legacy control alignment in v5.48.
- Mobile Hand is straight, horizontally swipeable, has no visible scrollbar, and reserves two action-button rows per card.
- Mobile status/warning information is consolidated under one top-left `!` per Hero.
- Mobile Hero/Racial/Legacy actions use one top-right contextual action control.
- Mobile resources use five columns: Mana, Legacy, Discard, Main Deck, Racial Token (22/22/22/22/12).
- Opponent Played remains permanently visible in compact form.
- Player/deck metadata and Full Battle Log stay below Next Phase on mobile.
- Deck Builder remains desktop-only.

- Mobile opponent Hand uses the compact fan; only the Player Hand stays straight and swipeable.
- Android Hand-card long press uses a custom enlarged preview and suppresses the native Save Picture menu.
- Mana Regen must remain visible inside the mobile Mana Pool cell.
- Newly inserted coin/card images use fixed geometry and decode-before-display; card-motion animation begins only after decode.
- Mobile Legacy slots keep the defeated-Hero information `!` at top-left and the contextual `✦` action at top-right; desktop Legacy layout remains unchanged.

## C. PvP implementation requirements

- Server/runtime remains authoritative for legality, costs, targets, response reasons, damage, draw order, Casting identity, and continuation queues.
- Client renders server events and sends intent only.
- Add server tests for both players, spectator/reconnect snapshots, response priority, and every mandatory choice continuation.
- Do not copy VS AI UI state mutation into PvP. Port contracts and event presentation separately.
- Re-run the shared regression suite before changing the PvP UI.

## D. Packages synchronized by VS AI v5.48

- Runtime Foundation v1.77
- Runtime Core Template v0.44
- Season 1 Runtime Data v0.12.6
- Season 1 Effect Recipe v0.11.6
- Season 1 Effect Checkpoint v0.11.5
- Shared Runtime Manual v1.33
- Application Runtime Sync v2.33
- UI Design Lock Pack v2.36
- Public Deck Builder remains v2.1
