# Grandis Legacy Tutorial v0.68

Tutorial v0.68 is paired with **VS AI v6.42** and consumes the same current **OSA v1.9.2 / Starter Deck Authority v1.6.1 / Shared Runtime v1.94.0 / UI Contract v2.52** baseline.

The Tutorial keeps its guided lesson gates, messages, and tutorial controller/overlay while consuming the same one-source application/battlefield implementation as VS AI (`../shared-app/app.bundle.js` and `../shared-app/app.css`). It does not maintain an independent battlefield fork.

Current data/runtime references:

- Runtime Data v0.16.0
- Effect Recipe / Checkpoint v0.15.0 / v0.15.0
- Hero Components v1.1.0
- Starter Deck Authority v1.6.1 — exactly 5 active Starter Decks
- Application Runtime Sync v2.60
- Canonical cards: 200

The retired Starter60 v1.5 15-preset library is historical/non-active only. Tutorial may keep its fixed/guided teaching deck flow; it does not expose a stale 15-option active selector. Established teaching for Starting Shards, the 12-card Shard Deck, Mana Regen, payment batches, Ultimate Tribute 200 EXP, Bound Hero/matching Class Shard requirements, and Draw sequencing remains preserved.

`tutorial/runtime-source/runtime/` is a generated/synchronized mirror of the root editable Shared Runtime. Root/Tutorial `js/app.bundle.js` and `css/app.css` are generated compatibility/deployment mirrors from `shared-app/` and are parity-checked. The current Tutorial release lock is `sync/tutorial-github-lock.v0.68.json`.
