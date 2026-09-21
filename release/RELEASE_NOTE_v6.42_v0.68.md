# Grandis Legacy VS AI v6.42 / Tutorial v0.68

Release date: 2026-09-21  
Stabilization candidate: **(8)**  
Baseline: **(7)**

## Scope

Candidate (8) is the final narrow stabilization/root-cause pass before work moves to PvP. Application versions remain VS AI v6.42 and Tutorial v0.68. OSA, Shared Runtime authority, canonical card data, Starter Deck composition, PvP, Deck Builder, Mobile, and Tablet Portrait are not changed.

Authority remains OSA v1.9.3, Shared Runtime v1.94.1, UI Contract v2.53, Application Runtime Sync v2.61, Starter Deck Authority v1.6.1, 5 active Starter Decks, and 200 canonical cards.

## Candidate (8) corrections

### Desktop contextual side preview

- Contextual previews use one shared side-placement algorithm anchored to the actual visible card element.
- Card Played, Legacy popup, Full Card History, Response Window, Discard, and selection/choice contexts use the same rendered edge logic.
- LEFT/RIGHT visible edge gaps are browser-measured and match within the required tolerance.
- Battlefield quick preview remains a separate preserved system.

### Legacy warning

- The duplicate Legacy warning render source is removed.
- One warning condition produces exactly one warning DOM node.
- The remaining warning stays on the same line as the Legacy name and the combined group stays centered.

### Desktop Shard Deck REGEN

- REGEN text and the existing graphical counter are one composite group centered against the Shard Deck card back.
- Shard Deck card position, counter artwork, count badge, and zone title are unchanged.

### Tablet landscape lobby

- Lobby uses normal page-level vertical scrolling where content exceeds the viewport.
- The 1024×768 family can actually scroll and reach Start Game; larger tested landscape viewports remain reachable without forced inner scrolling.
- Mobile and Tablet Portrait lobby behavior remains locked.

### Tablet landscape Phase Tracker

- Obsolete competing landscape overrides were removed so one compact touch-tablet rule controls vertical fit.
- End Phase remains its own row; Reposition/Cancel remain separate from progression.
- Next Phase stays visible, hit-testable, and actually advances the phase.
- End Turn is visible/reachable/hit-testable when the phase is End.

### Tablet landscape Shard Deck REGEN

- Tablet landscape uses the existing graphical REGEN counter only; the REGEN text is omitted in this device mode.
- Counter is centered in the upper/upper-middle card area and remains inside the Shard Deck card even when the lower card is cropped.
- Desktop retains the REGEN + counter composite group; Mobile/Tablet Portrait remain unchanged.

### Tablet landscape Shard Pool scale

- Shard cards use the canonical tablet-landscape sizing rule at approximately 82.5% of the rendered Hand-card reference width.
- Aspect ratio is preserved and Hero/Hand/deck-back sizes are not changed by this correction.

### Tablet landscape tap routing

- Battlefield first tap opens Quick Preview only.
- Second tap on the same battlefield card opens Detail Preview.
- First tap on a different battlefield card switches Quick Preview without opening Detail.
- Hand, Card Played, Legacy popup, and other non-battlefield cards open Detail on the first tap.
- Explicit Play actions remain actions and do not count as preview taps.
- No separate Preview button is introduced.

### Last-Hero terminal state

Candidate (7) already passes the required generic terminal lifecycle: final Hero defeated by Poison ends the match correctly for either side, non-final Poison defeat continues, Hero-bound cleanup completes before terminal evaluation, direct lethal still works, and no End Phase stall occurs. Therefore Candidate (8) makes **no gameplay production-code change** for this item.

## Preservation

Desktop Deck/Pile card centering, battlefield quick preview, Hero/Hand layout, desktop Phase Tracker, deck/pile geometry, numeric badge visual, Mobile, Tablet Portrait, canonical gameplay/data, OSA, PvP, and Deck Builder remain outside this pass and are preserved.
