# Grandis Legacy Tutorial v0.68

Tutorial v0.68 is paired with **VS AI v6.42** and consumes the same current **OSA v1.9.5 / Starter Deck Authority v1.6.1 / Shared Runtime v1.94.2 / UI Contract v2.53** baseline.

The Tutorial keeps its guided lesson gates, messages, and tutorial controller/overlay while consuming the same one-source application/battlefield implementation as VS AI (`../shared-app/app.bundle.js` and `../shared-app/app.css`). It does not maintain an independent battlefield fork.

Current data/runtime references:

- Runtime Data v0.16.2
- Effect Recipe / Checkpoint v0.15.2 / v0.15.2
- Hero Components v1.1.0
- Starter Deck Authority v1.6.1 — exactly 5 active Starter Decks
- Application Runtime Sync v2.63
- Canonical cards: 200

Candidate (10) consumes the OSA v1.9.5 Attachment lifecycle correction, including Triple Shot's authority-defined This-Turn counter-1 End-Phase expiry, while preserving no physical Arrow-card binding. Tutorial gameplay/runtime behavior stays synchronized with VS AI.

The retired Starter60 v1.5 15-preset library is historical/non-active only. Established teaching for Starting Shards, the 12-card Shard Deck, Mana Regen, payment batches, Ultimate Tribute 200 EXP, Bound Hero/matching Class Shard requirements, and Draw sequencing remains preserved.

`tutorial/runtime-source/runtime/` is a generated/synchronized mirror of the root editable Shared Runtime deployment source. Root/Tutorial `js/app.bundle.js` and `css/app.css` are generated compatibility/deployment mirrors from `shared-app/` and are parity-checked. The current Tutorial release lock is `sync/tutorial-github-lock.v0.68.json`.
