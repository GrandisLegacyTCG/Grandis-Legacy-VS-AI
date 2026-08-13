# Grandis Legacy VS AI + Tutorial v5.60

GitHub Pages repository for Grandis Legacy VS AI and Tutorial v0.33.

## v5.60 update

This release keeps the v5.59 gameplay foundation and adds the approved UI/UX and effect consistency fixes.

### Gameplay / effect fixes

- First player cannot play Attack Skill Cards on their first turn.
- Tornado from Elementalist / Elemental Lord still deals exactly 40 damage after Spectral Grappling Hook Dodge.
- Double Casting continues to activation 2 after Brilliant Radiance negates activation 1; the Attack Card returns to hand only after the duplicated attack fully resolves.
- Blessing of Divinity prevents literal any damage while active, including Attack residual, Poison, Burn, and direct/non-standard damage paths.

### UI / UX

- Adaptive desktop fit keeps common desktop resolutions stable without gameplay-page scrolling; 1440x900 no longer drops into the old 1450px compact breakpoint.
- Mobile remains scrollable and the active Next Phase control is 4px taller for touch comfort.
- GA4 measurement `G-4C2Z5T0EWR` is installed on VS AI and Tutorial pages.

No card ID or deck format changes are included.

## Validation

- `npm test`: PASS
- Tutorial `npm test`: PASS
- Manifest verification: PASS
