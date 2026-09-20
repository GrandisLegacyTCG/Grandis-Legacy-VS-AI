# Grandis Legacy VS AI v6.31 / Tutorial v0.57 - 2026-09-07

## Changes
- Manual Reposition is limited to once per active turn; Deploy and Reform share the same limit.
- Reposition caused by cards, Abilities, Racial Traits, Legacy Abilities, Responses, or other effects remains exempt from the manual limit.
- Battle SFX now starts at gameplay feedback queue time instead of waiting for DOM/render/VFX completion.
- Binding Light / committed counter-response actions are restored to Card Played chain history through the generic committed-response event path.
- SGH and Escape Arrow continue to use the generic Confirm Response -> mandatory payment -> new counter-Response hierarchy.
- EXP visual stack remains four fixed slots, uses the transparent 100/200 EXP sprite, follows Hero orientation, and stacks bottom-to-top above an Exhausted Hero.
- Source Stack v1.7.5 / Runtime Foundation v1.91 / Runtime Core v0.59 / Application Runtime Sync v2.53 adopted.

## Preserved
- Grand Arbalest / Rapid Chamber actual draw counting remains unchanged and regression-tested.
- Existing deck legality, Redirect, Conditional Follow-up, Casting, mobile scroll, and responsive Card Played/Phase Tracker behavior remain preserved.
