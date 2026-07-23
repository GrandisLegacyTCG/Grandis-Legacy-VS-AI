# Grandis Legacy VS AI v5.37 Release Note

## Scope
VS AI / GitHub Pages only. PvP is intentionally unchanged and remains on hold for the planned UI revision.

## Changes
- Deck Setup button now reads **Import Deck** instead of **Import Deck JSON**.
- Bundled Deck Builder removes JSON terminology from visible Import/Export and error text while retaining compatible `.json` deck files internally.
- Holy Blast lethal Area sequence regression now uses a legal Warrior-to-Warrior’s Relic package fixture and verifies that Legacy selection preserves the remaining target queue.
- Arrow Barrage regression now disables unrelated Dragon Scale defense when validating raw all-Mana damage.
- Added separate coverage confirming Arrow Barrage spends all 5 Mana, calculates 50 incoming Physical damage, and still allows normal responses to reduce final HP damage.

## Audit finding
The two v5.36 red tests were false negatives rather than confirmed gameplay failures:
- Holy Blast fixture replaced a Cleric Hero card ID with a Warrior card ID but retained Cleric Legacy package metadata, so no legal Warrior Legacy was available.
- Arrow Barrage correctly calculated 50 incoming damage, but the AI automatically spent a Racial Token on Dragon Scale and blocked 40, producing 10 final HP damage.

## Validation
- Full `npm test`: PASS.
- Holy Blast lethal target -> Legacy choice -> next Area target: PASS.
- Arrow Barrage 5 Mana -> 50 raw damage with no response: PASS.
- Arrow Barrage 50 raw damage -> Dragon Scale 40 -> 10 final damage: retained canonical behavior.
- GitHub Pages static routes and bundled Deck Builder: PASS.
- JavaScript syntax: PASS.
- SHA256 manifest and ZIP integrity: PASS.
