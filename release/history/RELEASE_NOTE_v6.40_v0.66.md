# Grandis Legacy VS AI v6.40 / Tutorial v0.66

Release date: 2026-09-13

## Responsive UI
- Phone/mobile remains the dedicated scrollable mobile layout in both orientations.
- Tablet remains the desktop-style non-scroll layout in both portrait and landscape. Orientation no longer changes the device family.
- Tablet Hand interaction now uses tap-to-hover behavior: the selected card raises and shows the enlarged desktop-style view, with an explicit Preview action and legal Play/Tribute actions.
- Desktop mouse/hover behavior is unchanged.
- Match hamburger is hidden on mobile.
- Opponent Shard Pool is placed above the opponent Hero row; player Shard Pool remains below the player Hero row.
- Mobile Attachment counters stay compact on their Attachment instead of floating above the Hero area.

## Tutorial flow
- Opening Shard/Class Shard teaching waits for the runtime presentation to settle.
- Draw Phase and Shard Regen complete before the Draw lesson is presented.
- Closing the Draw lesson releases normal automatic Draw -> Deploy advancement.
- Tutorial no longer asks the player to press Next Phase during Draw.
- Manual Next Phase teaching is performed after the Deploy lesson and card review.

## Authority
- Source Stack remains v1.8.2. No gameplay-rule change is introduced by this release.
- Deck Builder remains v1.30 and PvP reference remains v3.42.
