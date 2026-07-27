# Grandis Legacy VS AI — Noto Sans Assets Add-on

Scope: asset-only add-on for VS AI v5.54 and later packages that already contain the matching `@font-face` rules but are missing the local font binaries.

## Apply

1. Extract this ZIP.
2. Copy the `assets/` folder into the root of the VS AI repository/package.
3. Allow the new files to merge into `assets/fonts/noto-sans/`.
4. Do not delete or replace the existing `css/app.css`.
5. Commit and push, then hard-refresh the deployed page.

Expected active paths:

- `assets/fonts/noto-sans/NotoSans-Variable.woff2`
- `assets/fonts/noto-sans/NotoSans-Italic-Variable.woff2`

The existing VS AI CSS references these paths from `css/app.css` using `../assets/fonts/noto-sans/...`.
