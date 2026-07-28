# Grandis Legacy VS AI v5.56

GitHub Pages VS AI package using the shared Grandis Legacy runtime stack.

## v5.56 changes

- Lobby heading changed from **AI LOBBY** to **VS AI LOBBY**.
- Mage AI planning now treats **Double Casting** and **Wildfire** as setup actions that require a matching Attack follow-up.
- Elemental Lord Double Casting reserves an immediate same-source Magical Attack in the current turn.
- Elementalist Double Casting reserves the same-source Magical Attack for its next eligible own turn, matching printed timing.
- Wildfire reserves a same-source Attack for the next own turn.
- Reserved payoff cards are protected from unrelated earlier AI actions.

Canonical card definitions and the shared runtime authority are unchanged.

## GitHub Pages

Copy the extracted package contents into the repository root and publish from that root. Keep `.nojekyll`, `index.html`, `404.html`, and all asset/data/runtime folders intact.

## Verification

```bash
npm test
```

The package includes `FILE_MANIFEST_SHA256.csv` and the required Noto Sans variable font binaries.
