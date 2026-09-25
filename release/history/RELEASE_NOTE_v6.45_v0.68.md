# Grandis Legacy VS AI v6.45 / Tutorial v0.68

## Scope
This release changes only two VS AI areas:

1. Opponent-hand card backs now render through a final passive presentation layer that removes any outer UI border/outline/shadow/filter/radius treatment, preserving the original card-back artwork.
2. Local AI manual Reposition now uses conservative deterministic tactical plans with a strong stay-put bias: Area Attack setup, strict 3v3 defender return, 1v2/1v3 survival, and 3v2 advantage preservation.

## Locks preserved
- VS AI v6.44 Lobby and navigation remain unchanged.
- Quick Preview and Card Played presentation remain unchanged.
- Candidate 15 interaction behavior remains unchanged.
- Tutorial remains v0.68; Tutorial-specific guide/state-machine source was not modified.
- Canonical manual Reposition rules remain unchanged; only AI decision-making changed.
