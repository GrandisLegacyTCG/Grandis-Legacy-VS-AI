# Grandis Legacy VS AI v6.31 + Tutorial v0.57

Release date: 2026-09-07.

This package adopts Grandis Legacy Source Stack v1.7.5 and completes the current VS AI / Tutorial fixes:

- manual Reposition is limited to once per active turn; Deploy and Reform share the same limit;
- Reposition caused by cards or other effects remains exempt from the manual limit;
- battle SFX is triggered at gameplay feedback queue time instead of waiting for DOM/render/VFX completion;
- Binding Light and other committed counter-responses are recorded in Card Played through the generic committed-response chain event path;
- Spectral Grappling Hook and Escape Arrow use the generic Confirm Response -> mandatory payment -> new counter-Response hierarchy;
- Tribute EXP uses the fixed four-slot 100/200 EXP physical stack and, while Exhausted, stacks above the Hero from bottom to top.

Grand Arbalest / Rapid Chamber actual-draw counting is preserved and regression-tested.

See `release/RELEASE_NOTE_v6.31_v0.57.md` and the package SHA-256 manifests for verification.
