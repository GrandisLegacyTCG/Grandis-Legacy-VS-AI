# Grandis Legacy VS AI v6.40 + Tutorial v0.66

Release date: 2026-09-13.

This release keeps Source Authority Stack v1.8.2 gameplay unchanged and focuses on responsive UI separation plus Tutorial phase-flow reliability.

Current UI behavior:
- **Phone/mobile:** restores the scrollable mobile battlefield, hides the match hamburger, keeps the player Shard Pool below the player Heroes, places the opponent Shard Pool above the opponent Heroes, and keeps Attachment counters compact on the Attachment itself.
- **Tablet:** uses the desktop-style non-scroll battlefield in both portrait and landscape. Touching a Hand card reproduces the desktop hover presentation (raised card + enlarged view) and exposes an explicit Preview action without requiring hover.
- **Desktop:** preserves the existing mouse/hover layout and interaction.

Tutorial v0.66 keeps the Shard teaching but restores normal Draw behavior: Draw and Shard Regen complete, the Draw lesson is shown, then the runtime automatically advances to Deploy. The manual **Next Phase** lesson is taught after Deploy instead of during Draw.

Gameplay authority remains Source Stack v1.8.2, including the 12-card Shard Deck, Shard Pool, payment-batch Shard return ordering, Triple Shot validation, 200-card Season 1 database, current Legacy/Range+Area rules, and enhanced AI active Class Ability/Racial Trait decisions.

See `RELEASE_NOTE_v6.40_v0.66.md`.
