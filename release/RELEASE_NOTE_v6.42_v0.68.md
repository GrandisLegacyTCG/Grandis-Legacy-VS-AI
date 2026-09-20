# Grandis Legacy VS AI v6.42 / Tutorial v0.68

Release date: 2026-09-21

## Authority baseline

This release consumes Grandis Legacy Source Authority v1.9.2 as the current authority and consumes the approved generated/runtime baseline:

- Canonical Card Authority v1.6.0 — 200 Season 1 cards
- Shared Runtime v1.94.0
- Runtime Data v0.16.0
- Effect Recipe v0.15.0
- Effect Checkpoint v0.15.0
- Hero Components v1.1.0
- Starter Deck Authority v1.6.1 — exactly five active OSA starter compositions
- Retired Starter60 v1.5 15-preset library — retained as non-active history/reference
- UI Contract v2.52
- Application Runtime Sync v2.60

Canonical registry SHA256: `85d25ebda9bb2bc260983a566e6d430dde97bfc7a32e8042ec2fddfeaff1b42f`

Hero Component registry SHA256: `f36f1cc83eb9845743176c3af71f7823125353eae73e832588e9d8b42c6818be`

## Starter 1-only OSA v1.9.2 propagation

This synchronization is intentionally narrow: only Starter 1 gameplay composition changed. Starters 2–5 were re-snapshotted from OSA v1.9.2 only to carry current authority/provenance metadata and are verified gameplay-semantically unchanged. Shared Runtime and Shared Battlefield UI source hashes remain unchanged.

## Exact active Starter Deck set

This final synchronization moves the application starter authority to OSA v1.9.2 / Starter Deck Authority v1.6.1. The active player/AI set is exactly:

1. `starter_01_elemental_lord_conqueror_renegade` — Elemental Lord / Conqueror / Renegade
2. `starter_02_saint_crusader_grand_ranger` — Saint / Crusader / Grand Ranger
3. `starter_03_arcane_duelist_elemental_lord_saint` — Arcane Duelist / Elemental Lord / Saint
4. `starter_04_grand_ranger_grand_arbalest_renegade` — Grand Ranger / Grand Arbalest / Renegade
5. `starter_05_renegade_arcane_duelist_elemental_lord` — Renegade / Arcane Duelist / Elemental Lord

This narrow propagation changes only Starter 1 to the final OSA v1.9.2 composition; Starters 2, 3, 4, and 5 remain semantically unchanged from the approved application baseline. Starter 1 is explicitly locked to the supplied `Starter_1_ElementalLord_Conqueror_Renegade.json` gameplay composition (source SHA256 `f63e14a9cc43729fe2e27d77a6d1606a067bc399a5230fa2489eded3ad066353`), which matches the OSA v1.9.2 canonical/generated Starter 1 semantics. The five exact OSA generated Starter60 v1.6.1 payloads are the current application source snapshot. The retired 15-preset v1.5 library and earlier Deck Builder v1.30 reference files remain history only. Runtime Sync is v2.60. No gameplay/runtime/UI semantic change is introduced by this pass.

## Gameplay/runtime propagation

- Warp Scroll (`S1-ITM-019`) resolves through the actual application runtime and UI/AI flow: exactly two allied active Heroes are selected and swapped, including non-adjacent positions; Hero-connected state and hosted Attachments follow their Hero; the Item movement does not add Exhaust or consume the manual Reposition limit; the card resolves normally.
- Freeze Bomb (`S1-ITM-020`) resolves through the actual dispatcher/reducer and applies generic Freeze duration 1 to one legal opponent Hero, then resolves to Discard.
- Generic Freeze legality is enforced in runtime: manual Reposition and Skill-effect movement are blocked, Dodge is blocked, while Block, Warp Scroll Item movement, and automatic 1v1 Center remain available when otherwise legal. Freeze duration uses owner-End-Phase processing and additive stacking.
- Physical Attack and Physical Damage remain distinct, as do Magical Attack and Magical Damage. The Conqueror + Whirlwind regression remains 50 damage before unrelated modifiers.
- Triple Shot retains the previously approved no-binding Attachment lifetime and no active v0.14 binding QA remains in production JS.
- Ultimate Tribute Shards use payment-batch return ordering with the matching Class Shard deepest/last inside the batch.
- Opponent hidden-card/Shard blind selection randomizes an opaque selection mapping before choice, does not expose a player-controlled production seed, and does not mutate canonical hidden-zone order or the Shard Deck as a side effect.

## True shared application / battlefield implementation

- `shared-app/app.bundle.js` is now the one editable common application/battlefield source consumed directly by both VS AI and Tutorial.
- `shared-app/app.css` is the one editable common battlefield/application CSS source.
- Root and Tutorial `js/app.bundle.js` / `css/app.css` exist only as generated deployment/compatibility mirrors and are reproducibly regenerated and parity-checked.
- Tutorial-only teaching remains additive in its guide/controller and guide stylesheet instead of a second large battlefield fork.
- `shared-ui/` remains the shared UI-contract/helper layer.

## Active authority cleanup

- Stale `runtime-source/data/` copies from Runtime Data v0.15.0, Effect Recipe v0.14.0, Hero Components v1.0.0, and source stack v1.90 are no longer in the active editable runtime-source tree. Historical copies are retained under `history/runtime-source-data-v1.90/`.
- Active production `GL_LAB_V014_RULE_SYNC_QA_SELF_TEST` / Triple Shot mandatory-binding residue is removed. Historical v0.14 tests remain historical evidence only.
- Active `lab-authority.css` naming is retired; the neutral shared source is `shared-app/battlefield-authority.css`.

## Shared battlefield/UI update

- VS AI v6.42 remains the current visual battlefield baseline for later Grandis Legacy battlefield propagation.
- Desktop enlarged previews use one v2.52 right-side 250×350 temporary overlay with `pointer-events:none` and immediate source-card mouseleave.
- Real browser coverage includes Hand, Hero, Legacy, Attachment, Casting, Card Played, and face-up player Shard sources. Hidden opponent Shards are not assigned readable preview metadata.
- Existing phone, tablet portrait, and tablet landscape interaction boundaries are preserved.
- The battlefield-only Deck Setup button is removed; pre-match Deck Setup remains present and functional.
- Counter image assets remain Mana-Regen-only. Deck counts and Status counts use numeric/text presentation; deck counts are displayed above the deck card.

## Tutorial v0.68

Tutorial v0.68 consumes the same Shared Runtime and shared application/battlefield source as VS AI v6.42 while retaining its lesson sequencing and tutorial controller/overlay. Tutorial does not reintroduce a 15-option active starter selector.

## Verification

The final release verification includes exact OSA v1.9.2 Starter Authority parity, one-source application/CSS structural checks, current-authority cleanup, actual reducer/application integrations, security/blind-selection checks, Chromium DOM/geometry testing across all required face-up preview categories, responsive regression testing, Tutorial parity, generated-data/deployment reproducibility, and root/Tutorial SHA-256 manifest validation. See `VERIFICATION_v6.42_v0.68.md` for recorded results.
