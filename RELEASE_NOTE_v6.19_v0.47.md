# Grandis Legacy VS AI v6.20 / Tutorial v0.48

Mobile one-finger scroll correction, 2026-08-29.

- Fix the remaining mobile case where normal one-finger page scrolling could remain blocked while two-finger/pinch viewport panning still worked.
- Mobile no longer inherits the full-page `gl-animation-scroll-locked` overflow lock.
- Remove the non-passive VS AI document `touchmove` cancellation path; top-edge refresh containment is CSS-only.
- Return mobile Hand and card touch surfaces to native `touch-action: auto` gesture arbitration.
- Preserve horizontal Hand scrolling, long-press card preview, Cover Up/Redirect behavior, and Attack Direction Indicator behavior.
- Desktop behavior and Source Stack v1.7.2 gameplay authority are unchanged.
