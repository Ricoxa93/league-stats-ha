# League Stats Team Card Layout – Design

## Ziel

Die Einzelansichten für Blue Team und Red Team sollen die volle Home-Assistant-Section-Breite nutzen und die Lesbarkeit der Teamübersicht verbessern. Die Gesamtansicht mit beiden Teams bleibt abwärtskompatibel erhalten.

## Rasterverhalten

- `team: blue` und `team: red` melden Home Assistant `columns: full` und `min_columns: 6`.
- Ohne `team` oder mit `team: both` bleibt ebenfalls die Gesamtbreite aktiv.
- Sehr schmale Container dürfen die Ausrüstungsgruppen umbrechen, ohne Bilder abzuschneiden.

## Teamkopf

- Gold, Drache, Baron und Türme verwenden die vier eingebetteten 16×16-SVG-Pfade aus der bisherigen manuellen Dashboard-Ansicht.
- Alle SVGs werden automatisch in der Farbe der jeweiligen Teamseite eingefärbt.
- Goldsumme und Golddifferenz werden größer und stärker gewichtet; die Differenz bleibt abhängig vom Vorzeichen grün oder rot.
- `Victory` beziehungsweise `Defeat` wird deutlich größer und fett dargestellt.
- Die Objective-Zahlen stehen jeweils eindeutig neben ihrem Symbol.

## Spielerzeile

- Die sieben Itemplätze bleiben als waagerechte Gruppe zusammen.
- Zauber und Runen bilden eine optisch getrennte 2×2-Gruppe: zwei Beschwörerzauber oben, primäre und sekundäre Rune darunter.
- Zwischen Items und Zauber-/Runengruppe liegt zusätzlicher Abstand mit einer dezenten Trennlinie.
- Championbild, Spielertext, KDA und integriertes Detailfenster bleiben funktional unverändert.
- Die gespiegelte Ausrichtung der Teamseiten bleibt in der Gesamtansicht erhalten; Einzelkarten nutzen die verfügbare Breite für die größere Ausrüstung.

## Kompatibilität

- Der Kartentyp bleibt `custom:league-stats-last-match-card`.
- Bestehende Konfigurationen ohne `team` zeigen weiterhin beide Teams.
- Die Editorwerte `blue`, `red` und die Gesamtansicht bleiben erhalten.
- Es werden keine zusätzlichen Lovelace-Abhängigkeiten benötigt.

## Tests

- Rasteroptionen für fehlendes `team`, `both`, `blue` und `red`.
- Exakte SVG-Pfade und Teamfarbgebung für alle vier Objective-Symbole.
- Größere Gold- und Ergebnis-Typografie über stabile CSS-Klassen.
- Getrennte Item-, Zauber- und Runengruppen mit Zaubern über Runen.
- Bestehende Kontoerkennung, Teamfilterung, Popup- und Mobiltests bleiben grün.
