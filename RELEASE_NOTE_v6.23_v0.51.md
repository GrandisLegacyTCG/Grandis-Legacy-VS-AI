# Grandis Legacy VS AI v6.23 / Tutorial v0.51 — 2026-08-30

## Scope
- Preserves the v6.22 / v0.50 gameplay/runtime base and Source Stack v1.7.3 authority. No gameplay rollback.
- Restores mobile gameplay to native document scrolling (`document.scrollingElement` / page scroll) instead of using `#app` as a custom Y-scroll owner.
- Removes the mobile viewport-height/custom app-scroller contract; no global active-match `touchmove.preventDefault()` is introduced.
- Mobile Hand keeps horizontal browsing while vertical one-finger gestures remain available to page scrolling.
- Gameplay viewport disables pinch zoom with `maximum-scale=1, user-scalable=no`.
- Starter 1 and Starter 2 are full replacements from Starter60 v1.4 authority.
- Grandis G favicon uses the Racial Token Tail artwork.

- Animation page-lock is now desktop-only; stale `gl-animation-scroll-locked` state cannot turn `body` into a nested mobile scroller.

## Regression guard
Source Stack v1.7.3 Hero HP, Cover Up + Redirect fresh Defense Window, Pending Attack Direction Indicator, and current card/runtime authority are retained.
