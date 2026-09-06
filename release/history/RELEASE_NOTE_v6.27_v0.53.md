# Grandis Legacy VS AI v6.27 + Tutorial v0.53 — 2026-09-07

## Scope
- Added the supplied `Stack 100 EXP` and `Stack 200 EXP` visuals to VS AI and Tutorial.
- Each active Hero now has a permanently reserved four-slot EXP rail on the right side of the Hero card.
- Each slot has fixed width; the rail does not grow or shift when Tribute cards are added.
- The rail height follows the Hero-card composition height.
- Visual entries are driven by exact `hero.exp_cards` instances, not by dividing the numeric EXP total.
- Normal Skill EXP renders the 100 EXP strip; Ultimate EXP renders the 200 EXP strip.
- Existing Rank Up/defeat/scouting state cleanup automatically clears/removes the corresponding strips.

## Authority decision
No Source Stack update is required for this preview implementation. Tribute, EXP-card custody, Rank Up clearing, Reposition ownership, and defeat cleanup are already authoritative gameplay state. This release only exposes that existing state through a new consumer-side presentation layer.

## Versions
- VS AI: v6.27
- Tutorial: v0.53
- VS AI gameplay baseline: Source Stack v1.7.4
- Tutorial gameplay baseline: unchanged VS AI v6.24 / Source Stack v1.7.3
