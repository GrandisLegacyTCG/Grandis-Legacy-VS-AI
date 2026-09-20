# Change Audit — OSA v1.9.2 Starter 1 Sync

Scope: **Starter 1 gameplay composition only**, plus generated consumer snapshots, current authority metadata, tests, release records, and manifests required to propagate OSA v1.9.2 / Starter Authority v1.6.1 / Runtime Sync v2.60.

- New Starter 1 source SHA256: `f63e14a9cc43729fe2e27d77a6d1606a067bc399a5230fa2489eded3ad066353`
- Starters 2–5 gameplay semantics: **UNCHANGED**. Their current snapshot bytes may differ only because OSA v1.9.2 regenerated current authority/provenance metadata.
- Shared Runtime v1.94.0 runtime-source tree hash: `5d679eaddd38a654cf91dfd1baf84e78212eb2b3263dfffab534c405560ee305` before and after.
- Shared Battlefield UI source tree hash: `f9c04742dcc2a60454152c1928141c96da77e173b152ebf6cc6115c12d083913` before and after.
- Shared battlefield/application CSS hash: `f18b08e9bf098bd0af237efc23f4e582772b43eac8e1bae5b44422ce72f550ad` before and after.
- Application versions remain VS AI v6.42 / Tutorial v0.68.

## File churn classification

| Status | Category | Path |
|---|---|---|
| CHANGED | MANIFEST | `FILE_MANIFEST_SHA256.csv` |
| CHANGED | RELEASE_DOC | `README.md` |
| CHANGED | RELEASE_DOC | `README_PLAY_FIRST.txt` |
| CHANGED | CURRENT_METADATA | `data/config/active-runtime-source-stack.v1.94.json` |
| CHANGED | STARTER_CONTENT | `data/starter-decks/active-starters.v1.json` |
| CHANGED | STARTER_CONTENT | `data/starter-decks/active/starter_01_elemental_lord_conqueror_renegade_GL_DECK_1_0.json` |
| CHANGED | STARTER_CONTENT | `data/starter-decks/active/starter_02_saint_crusader_grand_ranger_GL_DECK_1_0.json` |
| CHANGED | STARTER_CONTENT | `data/starter-decks/active/starter_03_arcane_duelist_elemental_lord_saint_GL_DECK_1_0.json` |
| CHANGED | STARTER_CONTENT | `data/starter-decks/active/starter_04_grand_ranger_grand_arbalest_renegade_GL_DECK_1_0.json` |
| CHANGED | STARTER_CONTENT | `data/starter-decks/active/starter_05_renegade_arcane_duelist_elemental_lord_GL_DECK_1_0.json` |
| ADDED | STARTER_CONTENT | `history/starter-decks/osa-v1.9.1-starter-v1.6.0-consumer-snapshot/active-starters.v1.json` |
| ADDED | STARTER_CONTENT | `history/starter-decks/osa-v1.9.1-starter-v1.6.0-consumer-snapshot/active/starter_01_elemental_lord_conqueror_renegade_GL_DECK_1_0.json` |
| ADDED | STARTER_CONTENT | `history/starter-decks/osa-v1.9.1-starter-v1.6.0-consumer-snapshot/active/starter_02_saint_crusader_grand_ranger_GL_DECK_1_0.json` |
| ADDED | STARTER_CONTENT | `history/starter-decks/osa-v1.9.1-starter-v1.6.0-consumer-snapshot/active/starter_03_arcane_duelist_elemental_lord_saint_GL_DECK_1_0.json` |
| ADDED | STARTER_CONTENT | `history/starter-decks/osa-v1.9.1-starter-v1.6.0-consumer-snapshot/active/starter_04_grand_ranger_grand_arbalest_renegade_GL_DECK_1_0.json` |
| ADDED | STARTER_CONTENT | `history/starter-decks/osa-v1.9.1-starter-v1.6.0-consumer-snapshot/active/starter_05_renegade_arcane_duelist_elemental_lord_GL_DECK_1_0.json` |
| CHANGED | STARTER_GENERATED | `js/app.bundle.js` |
| CHANGED | STARTER_GENERATED | `js/static-data.js` |
| CHANGED | CURRENT_METADATA | `package.json` |
| REMOVED | RELEASE_DOC | `release/CHANGE_AUDIT_OSA_v1.9.1_STARTER_SYNC.md` |
| ADDED | RELEASE_DOC | `release/CHANGE_AUDIT_OSA_v1.9.2_STARTER1_SYNC.md` |
| CHANGED | RELEASE_DOC | `release/RELEASE_NOTE_v6.42_v0.68.md` |
| ADDED | RELEASE_DOC | `release/STARTER1_PROPAGATION_INVARIANTS.json` |
| CHANGED | RELEASE_DOC | `release/VERIFICATION_v6.42_v0.68.md` |
| ADDED | RELEASE_DOC | `release/history/CHANGE_AUDIT_OSA_v1.9.1_STARTER_SYNC.md` |
| CHANGED | CURRENT_METADATA | `runtime-source/README.md` |
| CHANGED | STARTER_GENERATED | `shared-app/active-starters.js` |
| CHANGED | CURRENT_METADATA | `shared-app/app.bundle.js` |
| CHANGED | STARTER_GENERATED | `starter_deck_examples/starter_01_elemental_lord_conqueror_renegade_GL_DECK_1_0.json` |
| CHANGED | STARTER_GENERATED | `starter_deck_examples/starter_02_saint_crusader_grand_ranger_GL_DECK_1_0.json` |
| CHANGED | STARTER_GENERATED | `starter_deck_examples/starter_03_arcane_duelist_elemental_lord_saint_GL_DECK_1_0.json` |
| CHANGED | STARTER_GENERATED | `starter_deck_examples/starter_04_grand_ranger_grand_arbalest_renegade_GL_DECK_1_0.json` |
| CHANGED | STARTER_GENERATED | `starter_deck_examples/starter_05_renegade_arcane_duelist_elemental_lord_GL_DECK_1_0.json` |
| ADDED | CURRENT_METADATA | `sync/history/runtime-sync-lock.v2.59.json` |
| REMOVED | CURRENT_METADATA | `sync/runtime-sync-lock.v2.59.json` |
| ADDED | CURRENT_METADATA | `sync/runtime-sync-lock.v2.60.json` |
| CHANGED | TEST | `tests/run-v642-authority-sync.cjs` |
| CHANGED | TEST | `tests/run-v642-final-correction.cjs` |
| REMOVED | TEST | `tests/run-v642-osa191-starter-sync.cjs` |
| ADDED | TEST | `tests/run-v642-osa192-starter-sync.cjs` |
| ADDED | TEST | `tests/run-v642-osa192-starter1-scope.cjs` |
| CHANGED | CURRENT_METADATA | `tools/build-static-data.cjs` |
| CHANGED | CURRENT_METADATA | `tools/update-release-metadata.cjs` |
| CHANGED | MANIFEST | `tutorial/FILE_MANIFEST_SHA256.csv` |
| CHANGED | RELEASE_DOC | `tutorial/README.md` |
| CHANGED | CURRENT_METADATA | `tutorial/data/config/active-runtime-source-stack.v1.94.json` |
| CHANGED | STARTER_GENERATED | `tutorial/js/app.bundle.js` |
| CHANGED | STARTER_GENERATED | `tutorial/js/static-data.js` |
| CHANGED | CURRENT_METADATA | `tutorial/js/tutorial-guide.js` |
| CHANGED | CURRENT_METADATA | `tutorial/package.json` |
| CHANGED | STARTER_GENERATED | `tutorial/starter_deck_examples/starter_01_elemental_lord_conqueror_renegade_GL_DECK_1_0.json` |
| CHANGED | STARTER_GENERATED | `tutorial/starter_deck_examples/starter_02_saint_crusader_grand_ranger_GL_DECK_1_0.json` |
| CHANGED | STARTER_GENERATED | `tutorial/starter_deck_examples/starter_03_arcane_duelist_elemental_lord_saint_GL_DECK_1_0.json` |
| CHANGED | STARTER_GENERATED | `tutorial/starter_deck_examples/starter_04_grand_ranger_grand_arbalest_renegade_GL_DECK_1_0.json` |
| CHANGED | STARTER_GENERATED | `tutorial/starter_deck_examples/starter_05_renegade_arcane_duelist_elemental_lord_GL_DECK_1_0.json` |
| CHANGED | CURRENT_METADATA | `tutorial/sync/tutorial-github-lock.v0.68.json` |
| CHANGED | TEST | `tutorial/tests/run-tutorial-v068.cjs` |

No changed file is classified as gameplay-runtime or battlefield-UI semantics. `shared-app/app.bundle.js` changes are limited to current authority/Starter metadata and release QA version markers; generated deployment bundles inherit those metadata updates plus the new Starter 1 payload.
