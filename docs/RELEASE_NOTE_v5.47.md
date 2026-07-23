# Grandis Legacy VS AI v5.47 Release Note

## Mobile UI / interaction
- Restored the opponent Hand to a compact fan on mobile. The Player Hand remains straight and horizontally swipeable.
- Raised and pinned `Mana Regen +N` inside the mobile Mana Pool resource cell so it is no longer clipped.
- Disabled Android native image long-press actions for cards in the Player Hand.
- Added a custom mobile long-press preview: hold a Hand card to show the enlarged card, move to swipe/cancel, and release to close it.

## Visual loading
- Added decode-before-display handling for newly inserted card, Hero, resource, and coin images.
- Card and coin geometry is fixed before artwork becomes visible, preventing temporary flattened images or alt-text fragments on first load.
- Card-motion animations wait for image decode before starting.
- Racial Token assets were resized and converted from 1240 px PNG files to lightweight 256 px WebP files.

## Runtime / gameplay
- No gameplay rules or card behavior changed in this package.

PvP remains unchanged and requires a later parity port.
