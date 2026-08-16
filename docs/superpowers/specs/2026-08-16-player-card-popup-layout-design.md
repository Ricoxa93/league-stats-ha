# Player Card and Popup Layout Design

## Goal

Improve readability and visual hierarchy in the last-match team cards without increasing their height unnecessarily. Reorganize the player popup so statistics and loadout assets are easier to scan.

## Player row

Each player row uses three content zones:

1. Champion portrait and identity: the player name and champion/role labels become larger while retaining truncation for long values.
2. Inventory: all seven item slots remain in one horizontal row whenever the available card width permits it.
3. Combat and abilities: K/D/A and KDA use the available right-hand area with larger type. The two summoner spells remain above the two runes. The runes align vertically with the item row.

The selected player's highlight, team colors, KDA color thresholds, click behavior, and displayed data remain unchanged.

## Responsive behavior

Wide and regular team cards preserve the three-zone hierarchy. Narrow cards may move the loadout below the identity and combat summary, but the seven-item row must remain intact. Spells remain above runes, and the rune row stays aligned with the item row rather than creating a third independent vertical level.

Text and images must not overflow the player row or card boundary at supported container widths.

## Player popup

The popup is divided into four sections:

1. Hero section: splash image, champion portrait, champion/role, player name, result, side, queue, and duration.
2. Combat summary: prominent K/D/A with KDA directly associated with it.
3. Statistics: Level, CS, Gold, Damage, Vision, and kill participation in a responsive two-column by three-row grid. Each statistic has a consistent label/value hierarchy.
4. Loadout: seven items in a horizontal group, with summoner spells stacked above runes in a distinct adjacent ability group.

On small screens the statistics may collapse to one column and the loadout groups may wrap, while their semantic grouping and order remain unchanged.

## Implementation boundaries

The work is limited to the bundled last-match frontend card, its tests, generated bundle, and release metadata. No new Home Assistant entities or Riot API fields are required.

## Testing

Automated tests must verify the semantic markup/classes for the player-row alignment and popup sections, plus existing narrow-layout guarantees. The complete frontend and Python test suites, bundle build, and Python compilation check must pass before publication.
