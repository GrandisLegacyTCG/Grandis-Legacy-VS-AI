# Grandis Legacy VS AI v5.59 — Release Note

**Date:** 14 August 2026  
**Scope:** Gameplay foundation sync with OSA v1.4.2 and PvP v2.6.16

## Fixes

1. First player Attack restriction is enforced by the JS/runtime legality layer.
2. Tornado vs Spectral Grappling Hook now resolves to exact 40 residual damage for Elementalist / Elemental Lord Tornado.
3. Double Casting + Brilliant Radiance now preserves activation 2. Brilliant Radiance marks return-to-hand after full duplicated resolution instead of ending the whole duplicated attack immediately.

## Regression test

Run:

```bash
node tests/run-v559-gameplay-foundation.cjs
```

Expected result:

- `firstPlayerAttackRestricted: true`
- `tornadoSpectralResidual40: true`
- `doubleCastingBrilliantContinues: true`
