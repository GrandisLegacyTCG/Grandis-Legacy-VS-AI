# Change Audit — OSA v1.9.1 Starter Sync

Release: VS AI v6.42 / Tutorial v0.68
Scope: starter-authority propagation only

## Summary

- Baseline compared: existing corrected v6.42 / v0.68 candidate.
- Current consumer baseline: OSA v1.9.1 / Starter Deck Authority v1.6.0 / Runtime Sync v2.59.
- Starter 1 direct user source SHA256: `0096a08038a2143b82f5b428162c6a81700083d5c530a542880c7d43fa72f403`.
- Starter 1 gameplay composition is identical to the OSA v1.9.1 canonical/generated Starter 1 that records this same user-upload provenance.
- Shared Runtime gameplay files unchanged: **YES**.
- Shared Battlefield CSS unchanged: **YES**.
- Gameplay/runtime/UI semantic changes outside starter loading/current metadata: **NONE**.

## Modified files by classification

### STARTER_CONTENT

- `ADDED` `data/starter-decks/active/starter_01_elemental_lord_conqueror_renegade_GL_DECK_1_0.json`
- `ADDED` `data/starter-decks/active/starter_02_saint_crusader_grand_ranger_GL_DECK_1_0.json`
- `ADDED` `data/starter-decks/active/starter_03_arcane_duelist_elemental_lord_saint_GL_DECK_1_0.json`
- `ADDED` `data/starter-decks/active/starter_04_grand_ranger_grand_arbalest_renegade_GL_DECK_1_0.json`
- `ADDED` `data/starter-decks/active/starter_05_renegade_arcane_duelist_elemental_lord_GL_DECK_1_0.json`
- `ADDED` `starter_deck_examples/starter_04_grand_ranger_grand_arbalest_renegade_GL_DECK_1_0.json`
- `ADDED` `tutorial/starter_deck_examples/starter_04_grand_ranger_grand_arbalest_renegade_GL_DECK_1_0.json`
- `REMOVED` `starter_deck_examples/starter_04_grand_ranger_conqueror_grand_arbalest_GL_DECK_1_0.json`
- `REMOVED` `tutorial/starter_deck_examples/starter_04_grand_ranger_conqueror_grand_arbalest_GL_DECK_1_0.json`
- `CHANGED` `data/starter-decks/active-starters.v1.json`
- `CHANGED` `starter_deck_examples/starter_01_elemental_lord_conqueror_renegade_GL_DECK_1_0.json`
- `CHANGED` `starter_deck_examples/starter_02_saint_crusader_grand_ranger_GL_DECK_1_0.json`
- `CHANGED` `starter_deck_examples/starter_03_arcane_duelist_elemental_lord_saint_GL_DECK_1_0.json`
- `CHANGED` `starter_deck_examples/starter_05_renegade_arcane_duelist_elemental_lord_GL_DECK_1_0.json`
- `CHANGED` `tutorial/starter_deck_examples/starter_01_elemental_lord_conqueror_renegade_GL_DECK_1_0.json`
- `CHANGED` `tutorial/starter_deck_examples/starter_02_saint_crusader_grand_ranger_GL_DECK_1_0.json`
- `CHANGED` `tutorial/starter_deck_examples/starter_03_arcane_duelist_elemental_lord_saint_GL_DECK_1_0.json`
- `CHANGED` `tutorial/starter_deck_examples/starter_05_renegade_arcane_duelist_elemental_lord_GL_DECK_1_0.json`

### STARTER_GENERATED

- `CHANGED` `js/app.bundle.js`
- `CHANGED` `js/static-data.js`
- `CHANGED` `shared-app/active-starters.js`
- `CHANGED` `tutorial/js/app.bundle.js`
- `CHANGED` `tutorial/js/static-data.js`

### CURRENT_METADATA

- `ADDED` `sync/history/runtime-sync-lock.v2.58.json`
- `ADDED` `sync/runtime-sync-lock.v2.59.json`
- `REMOVED` `sync/runtime-sync-lock.v2.58.json`
- `CHANGED` `README.md`
- `CHANGED` `README_PLAY_FIRST.txt`
- `CHANGED` `data/config/active-runtime-source-stack.v1.94.json`
- `CHANGED` `package.json`
- `CHANGED` `release/RELEASE_NOTE_v6.42_v0.68.md`
- `CHANGED` `release/VERIFICATION_v6.42_v0.68.md`
- `CHANGED` `runtime-source/README.md`
- `CHANGED` `shared-app/app.bundle.js`
- `CHANGED` `tools/build-static-data.cjs`
- `CHANGED` `tools/update-release-metadata.cjs`
- `CHANGED` `tutorial/data/config/active-runtime-source-stack.v1.94.json`
- `CHANGED` `tutorial/js/tutorial-guide.js`
- `CHANGED` `tutorial/sync/tutorial-github-lock.v0.68.json`

### TEST

- `ADDED` `tests/run-v642-osa191-starter-sync.cjs`
- `CHANGED` `tests/run-v642-authority-sync.cjs`
- `CHANGED` `tests/run-v642-final-correction.cjs`
- `CHANGED` `tutorial/tests/run-tutorial-v068.cjs`

### MANIFEST

- `CHANGED` `FILE_MANIFEST_SHA256.csv`
- `CHANGED` `tutorial/FILE_MANIFEST_SHA256.csv`

## Removed retired active path

- Old Starter 4 deployment (`Grand Ranger / Conqueror / Grand Arbalest`) was removed from current root/Tutorial starter examples and replaced by OSA v1.9.1 `Grand Ranger / Grand Arbalest / Renegade`.
- Runtime Sync v2.58 moved to history; v2.59 is current.

## Validation

- Five active starter IDs only.
- 5/5 OSA v1.9.1 semantic parity.
- All five Main Decks = 60.
- 0 unknown card IDs against the 200-card registry.
- Local AI and player application integration PASS.
- Full existing gameplay/UI/Tutorial regression PASS.
- Generated-output reproducibility PASS.
- Root and Tutorial manifests regenerated and verified.
