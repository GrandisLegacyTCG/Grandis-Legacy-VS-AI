# Verification — VS AI v6.24 / Tutorial v0.52

Verified 2026-09-02 from the release source.

## Result

- `npm run verify`: **PASS**.
- Targeted next-fix contract `node tests/run-v624-next-fixes.cjs`: **PASS** as part of the full suite.
- Full Tutorial v0.52 verification: **PASS**.
- Canonical Defense, runtime executable flows, card application effects, attachment parity, opening flow, tactical AI, Card Played audit, and manifest checks: **PASS**.
- Responsive constrained-resolution browser audit: **PASS** for VS AI and Tutorial at 1600×900, 1366×768, 1280×720, 1100×700, 1024×768, 900×700, and 800×650. Phase Tracker did not overlap Card Played or its own action controls; Card Played automatically reduced to 4 or 2 visible entries where required.

The browser audit data is stored in `release/RESPONSIVE_LAYOUT_VERIFICATION_v6.24_v0.52.json`.

## Locked import behavior

VS AI custom Main Deck import requires **exactly 60 cards**. Normal-card 2/3-copy count is intentionally not locked in this release. Existing Ultimate validation remains in place.
