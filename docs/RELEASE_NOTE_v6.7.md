# VS AI v6.7 / Tutorial v0.38

- Fixed local VS AI Response Window ownership so a PLAYER attack does not expose an AI-owned Defense decision to the PLAYER.
- Fixed the Execute attack path to auto-resolve the AI Defense response after Execute-specific Dodge/Block restrictions are applied.
- Fixed Halfling Second Chance single-target replay to use the same response-owner gating as normal attacks.
- Added a UI ownership safety lock: local VS AI only renders a Response Window when `response_owner` is `PLAYER`.
- Back to Lobby now has a direct click binding and explicitly renders the VS AI Lobby after clearing the finished match.
- The 60-second automatic cleanup continues to use the same lobby-return routine.
- Tutorial remains v0.38. No Rule Authority, card data, damage formula, or AI deck-selection changes.
