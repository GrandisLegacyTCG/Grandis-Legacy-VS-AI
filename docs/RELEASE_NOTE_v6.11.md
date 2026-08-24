# Grandis Legacy VS AI v6.11

Date: 2026-08-24

This focused patch adopts Source Authority Stack v1.7.0 and its generic Conditional Follow-up Component.

- Rage Blast: separate automatic 20 Physical follow-up after its 60 Physical Primary when Bleed is present.
- Venom Sovereign: Rogue 20 / Renegade 40 Magical Primary, then a separate automatic fixed 40 Magical follow-up when Poison is present.
- Tornado: Elementalist/Elemental Lord Dodge triggers a separate automatic fixed 40 Magical follow-up.
- Primary Block never carries to the follow-up; Block-to-0 still triggers Rage Blast/Venom Sovereign; Negate/Cancel suppress all; Dodge suppresses Rage Blast/Venom Sovereign; no follow-up opens another Response Window or pending state.
- Active audio clones are retained through `ended`, `error`, or rejected playback.
- Active normal matches receive `beforeunload` and top-edge pull-to-refresh protection without disabling normal vertical scrolling.

First-player Turn 1 Attack legality, defensive Second Chance, Resurrection 3 Mana / 50 HP, Magic Scope, AI End Phase watchdogs, and all existing pending routes remain intact.
