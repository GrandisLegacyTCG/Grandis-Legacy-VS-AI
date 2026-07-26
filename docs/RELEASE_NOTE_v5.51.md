# Grandis Legacy VS AI v5.51 Release Note

## UI
- AI Lobby now uses the PvP Lobby background, header scale, panel surfaces, Hero containers, and button colors with Noto Sans.
- Removed excessive empty space below Formation Heroes.
- Added a small intentional gap between the Starter Deck row and Hero containers.
- Formation cards are package-resolved Rank II Heroes; Left / Center / Right remain below each card.
- Hero Progression click behavior is retained.

## Runtime/gameplay
- Confirmed defeat now clears all Hero-connected state after Stoneblood/replacement checks: EXP cards, Attachments, Casting, statuses, and pending Casting queue entries.
- A revived Hero starts with no pre-defeat Attachment, status, EXP card, or Casting state.
- Regression coverage verifies that a Casting Hero cannot be defeated, revived, and then release the old Casting attack.

## Versions
Runtime Foundation v1.78 · Runtime Core v0.46 · Application Runtime Sync v2.36 · UI Design Lock v2.41.
