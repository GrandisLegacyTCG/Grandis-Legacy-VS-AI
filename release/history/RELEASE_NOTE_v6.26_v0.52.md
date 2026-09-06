# Grandis Legacy VS AI v6.26 + Tutorial v0.52 — 2026-09-05

- VS AI adopts the generic Response commit/payment framework from Source Stack v1.7.4.
- Spectral Grappling Hook and Escape Arrow are unavailable when their additional discard cannot be paid.
- Confirm Response is the irreversible commit boundary: the current Response Window closes, mandatory card payment is completed separately, then a new counter-Response Window opens.
- The committed Response card cannot discard its own exact Hand instance; another copy is a valid separate instance.
- Paid costs are not refunded if the committed Response is later canceled/negated.
- Game Over changes the permanent SURRENDER control to BACK TO LOBBY.
- Tutorial v0.52 is intentionally unchanged in this delivery.
