# Player Row Grid Design

## Goal

Use the full width of every player row by replacing the loosely distributed layout with one explicit four-column, two-row grid.

## Regular layout

Every Blue and Red player row uses the same left-to-right structure:

1. Champion portrait and level badge occupy column one across both rows.
2. Player name plus champion/role occupy column two, row one. The seven item slots occupy the same column in row two.
3. The two summoner spells occupy column three, row one. The primary and secondary runes occupy column three, row two.
4. K/D/A occupies column four, row one. KDA occupies column four, row two.

Columns one, three, and four use predictable widths. Column two consumes all remaining width so identity text and the item row use the available space without leaving decorative gaps. Subtle separators may be retained between the loadout and ability/combat columns.

## Responsive behavior

The four-column grid remains the preferred layout while it fits. At very narrow container widths, the identity and combat summary remain on the first row group and the loadout may move below them. The seven item slots must stay in a single row, and spells must remain above runes.

No content may overflow the player card. Long player names and champion labels remain truncated with an ellipsis.

## Compatibility

The change is limited to player-row markup, CSS, tests, the generated frontend bundle, and version metadata for `0.4.6`. Team headers, objective icons, own-player highlighting, popup layout, data mapping, and click behavior remain unchanged.

## Testing

Automated tests verify the four semantic grid areas, their exact row/column assignments, identical Blue/Red markup order, the seven-slot inventory, spell/rune ordering, and the existing narrow-card fallback. The complete frontend suite, bundle build, Python compilation, and diff checks must pass before publication.
