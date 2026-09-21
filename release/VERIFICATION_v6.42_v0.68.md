# Verification — Grandis Legacy VS AI v6.42 / Tutorial v0.68

Verification date: 2026-09-21

## Final status

**PASS** — OSA v1.9.3 / Shared Runtime v1.94.1 / UI Contract v2.53 propagation, Hero-defeat lifecycle hotfix, battlefield refinements, gameplay regressions, Tutorial parity, and packaging gates completed before final archiving.

## Authority / immutable data

- VS AI v6.42 / root package `6.42.0` — PASS
- Tutorial v0.68 / Tutorial package `0.68.0` — PASS
- OSA v1.9.3 — PASS
- Shared Runtime v1.94.1 — PASS
- UI Contract v2.53 — PASS
- Application Runtime Sync v2.61 — PASS
- Runtime Data v0.16.0 — PASS / unchanged
- Effect Recipe / Checkpoint v0.15.0 / v0.15.0 — PASS / unchanged
- Hero Components v1.1.0 — PASS / unchanged
- Starter Deck Authority v1.6.1 / exactly 5 active starters — PASS / compositions unchanged
- Canonical cards: 200 / 200 unique IDs — PASS / canonical registry unchanged

## Hero Defeat Cleanup

- Generic defeat cleanup is wired into the real Hero defeat transition path — PASS
- Cleanup is source/owner/host/actor/subject scoped rather than card-name hardcoded — PASS
- Unresolved Hero-bound Attachment placement is invalidated when its required active host is defeated — PASS
- Representative Hero-bound pending state is removed — PASS
- Unrelated pending state belonging to a different valid Hero survives — PASS
- Already-resolved external damage/healing/Status consequences are not rolled back — PASS
- No orphan unresolved references requiring the defeated active Hero remain — PASS

### Shield Bash + Deflect reproduced regression

- attacker begins at the reproduced low-HP state — PASS
- Deflect response resolves and retaliation defeats the attacker — PASS
- attacker transitions to Defeated / Legacy correctly — PASS
- Shield Bash is not attached to the Legacy/defeated source — PASS
- Shield Bash reaches Discard — PASS
- no runtime exception — PASS
- Response Window closes — PASS
- pending response / pending source-Hero host state clears — PASS
- AI controller is no longer waiting for PLAYER response — PASS
- AI turn/phase can continue normally — PASS

The application-level integration returns `heroDefeatCleanup=true`, `shieldBashDeflect=true`, and `aiTurnContinuation=true` for both the VS AI and Tutorial shared-app execution paths.

## Existing gameplay regression

The pre-existing approved gameplay remains PASS:

- Warp Scroll — PASS
- Freeze Bomb / generic Freeze legality, duration, stacking and exceptions — PASS
- Physical Attack != Physical Damage / Magical Attack != Magical Damage — PASS
- Conqueror + Whirlwind: expected 50 / actual 50 — PASS
- Triple Shot no-binding Attachment lifetime — PASS
- Ultimate Shard payment-batch return — PASS
- opponent Hand / Shard Pool blind selection and hidden-information security — PASS
- five Starter Deck loading/parity — PASS
- Local AI planner/gameplay — PASS
- Tutorial lesson sequencing — PASS

## Battlefield UI Contract v2.53 — executable Chromium

A real headless Chromium DOM/geometry suite validates the shared presentation rather than relying only on source-string checks.

### Standard field preview

- Hand — lower-right 250×350 preview — PASS
- Hero — lower-right 250×350 preview — PASS
- Legacy — lower-right 250×350 preview — PASS
- Attachment — lower-right 250×350 preview — PASS
- Casting — lower-right 250×350 preview — PASS
- face-up player Shard — lower-right readable preview — PASS
- preview top remains below the protected Turn / Phase Tracker / Next Phase region — PASS
- overlay remains viewport-clamped — PASS
- `pointer-events:none` — PASS
- source mouseleave immediately hides — PASS
- Card A → Card B updates the same singleton overlay — PASS
- hidden opponent Hand / hidden Shard identity preview metadata is not exposed — PASS

### Card Played / modal and list preview

- Card Played preview opens to the LEFT of Card Played — PASS
- Full Card History dynamically-created cards preview contextually — PASS
- Full Card History left/center/right source samples remain viewport-clamped — PASS
- modal preview is top-level/not clipped by modal overflow — PASS
- dynamic History Card A → Card B updates immediately — PASS
- real Response Window readable response card preview — PASS
- Response selection remains usable while preview is pointer-transparent — PASS
- opened Discard list readable-card preview — PASS
- actual Hand-Limit selection popup readable-card preview — PASS
- contextual placement reports a valid left/right/above/below placement with horizontal preference when available — PASS

## Counter / indicator presentation

- Legacy Deck compact top-corner badge — PASS
- Shard Deck compact top-corner badge — PASS
- Discard Pile compact top-corner badge — PASS
- Main Deck compact top-corner badge; old large count absent — PASS
- deck/pile card stack occupies a proportional share of its container — PASS
- Hero with three Statuses renders three independent Status badges with values 1/2/3 — PASS
- each Status badge is attached to its own Status icon — PASS
- Attachment count renders as a compact top-corner badge — PASS
- Counter image assets do not escape the Mana Regen presentation — PASS
- warning `!` is visible before hover — PASS
- warning detail is hidden initially, appears on `!` hover, and closes when pointer moves to Hero card — PASS
- Hero-card hover does not itself trigger warning detail — PASS

## Responsive UI

- Desktop v2.53 battlefield presentation — PASS
- Phone portrait mobile presentation — PASS
- Tablet portrait mobile presentation — PASS
- Tablet landscape desktop-style/touch presentation — PASS
- compact deck/pile badges remain present through tested responsive modes — PASS
- touch layouts do not depend on the desktop hover overlay — PASS
- no new responsive overflow/navigation regression in the current suite — PASS

## Shared architecture / generated parity

- one editable common app JS: `shared-app/app.bundle.js` — PASS
- one editable common app CSS: `shared-app/app.css` — PASS
- one editable Shared Runtime home: `runtime-source/runtime/` — PASS
- Tutorial consumes generated/parity-checked mirrors rather than independent forks — PASS
- generated application/runtime/data deployment reproducibility: 23 / 23 tracked outputs byte-identical after regeneration — PASS

## Test execution summary

Unique current-release verification gates: **22 / 22 PASS, 0 FAIL**.

This consists of the 18 root current-regression scripts, the Tutorial-specific v0.68 suite gate, the real Chromium UI gate, and the two root/Tutorial manifest verification gates. Tutorial calls that intentionally re-run shared root scripts are not double-counted. Build/data generation, metadata generation, and syntax checks also pass.

## Manifest

- Root `FILE_MANIFEST_SHA256.csv`: **574** tracked files, 0 missing / 0 size mismatch / 0 SHA mismatch — PASS
- Tutorial `FILE_MANIFEST_SHA256.csv`: **167** tracked files, 0 missing / 0 size mismatch / 0 SHA mismatch — PASS
- manifest files exclude themselves from their tracked file count by repository convention.

## Packaging / scope

- current release records remain in `release/`; prior v1.9.2 Starter-1 synchronization audit/invariants were moved to `release/history/` — PASS
- historical records remain historical and are not rewritten as current authority — PASS
- no redundant final ZIP is stored inside the repository — PASS
- no PvP, Website, Deck Builder, OSA source package, or Player Rulebook repository is modified by Part B — PASS
