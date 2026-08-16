# League Stats Last Match Card – Design

**Datum:** 2026-08-16  
**Status:** Vom Nutzer bestätigt  
**Repository:** `Ricoxa93/league-stats-ha`

## Ziel

Die Home-Assistant-Integration erhält eine eigenständige Lovelace-Karte für das letzte League-of-Legends-Match. Sie ersetzt den aktuell sehr großen, manuell gepflegten YAML-Aufbau aus `custom:button-card` und `browser_mod` durch eine direkt mit der Integration ausgelieferte Karte.

Der Kartentyp lautet:

```yaml
type: custom:league-stats-last-match-card
```

## Umfang

Die Karte zeigt ausschließlich das letzte Match:

- Blue Team und Red Team
- Team-Ergebnis und Team-KDA
- Team-Gold sowie Gold-Differenz
- Türme, Drachen und Barone
- fünf Spieler je Team
- Champion, Champion-Level, Riot-ID und Position
- Kills, Deaths, Assists und KDA
- Items, Trinket, Beschwörerzauber und Runen
- gelbe Hervorhebung des eingerichteten eigenen Spielers

Die Liste der letzten Spiele und das großflächige Dashboard-Hintergrundbild gehören nicht zu dieser Karte.

## Architektur

Die bestehende Python-Integration bleibt die Datenquelle und stellt die Riot-Daten weiterhin über Home-Assistant-Sensoren bereit. Ein neues Frontend-Modul liest die Zustände und Attribute dieser Sensoren und rendert daraus die Karte.

Die Umsetzung wird innerhalb desselben HACS-Repositories ausgeliefert. Es gibt keine zusätzliche HACS-Installation und keine zwingende Abhängigkeit von `custom:button-card` oder `browser_mod`.

Die Komponenten werden nach Verantwortlichkeit getrennt:

1. Frontend-Registrierung durch die Python-Integration
2. Kontoerkennung und Konfigurationsnormalisierung
3. Match-Datenmodell und Entity-Zuordnung
4. Hauptkarte und responsives Teamlayout
5. Teamkopf
6. Spielerzeile
7. integriertes Spieler-Detail-Popup
8. visueller Lovelace-Karteneditor

## Kontoerkennung und Konfiguration

Die Karte erkennt League-Stats-Konten anhand der vorhandenen Entity-Gruppen automatisch.

- Bei genau einem erkannten Konto wird dieses ohne weitere Eingabe verwendet.
- Bei mehreren Konten bietet der visuelle Karteneditor eine eindeutige Kontoauswahl an.
- Die gespeicherte Konfiguration verwendet eine stabile Konto-ID beziehungsweise einen stabilen Entity-Präfix.
- Wenn das gespeicherte Konto nicht mehr existiert, zeigt die Karte einen Konfigurationshinweis und ermöglicht eine neue Auswahl.
- Eine manuelle YAML-Konfiguration bleibt möglich.

Minimalbeispiel:

```yaml
type: custom:league-stats-last-match-card
```

Beispiel bei expliziter Auswahl:

```yaml
type: custom:league-stats-last-match-card
account: ricoxa_1993
```

## Darstellung

Auf breiten Bildschirmen stehen Blue Team und Red Team nebeneinander. Auf schmalen Bildschirmen werden beide Teams untereinander dargestellt.

Die neue Karte orientiert sich optisch an der bestätigten bestehenden Ansicht:

- dunkelblaue Teamflächen für Blue Team
- dunkelrote Teamflächen für Red Team
- grüne beziehungsweise rote Ergebnisanzeige
- kompakte Spielerzeilen mit gut lesbaren Statistiken
- gelbe Hervorhebung des eigenen Spielers
- vollständige Item-, Zauber- und Runenanzeige, soweit Daten vorhanden sind
- Home-Assistant-Themenfarben und Dark Mode bleiben nutzbar

Die Karte verändert nicht den Hintergrund der Dashboard-Ansicht.

## Spieler-Detail-Popup

Ein Klick oder Tap auf eine Spielerzeile öffnet ein integriertes modales Detailfenster. Es benötigt kein `browser_mod`.

Das Popup zeigt, soweit die Sensorattribute diese Daten liefern:

- Champion-Splash und Champion-Icon
- Ergebnis und Teamseite
- Champion, Rolle und Queue
- Kills, Deaths, Assists und KDA
- Champion-Level
- CS und CS pro Minute
- Gold und verursachten Schaden
- Vision Score und Kill Participation
- Matchdauer
- Items
- Beschwörerzauber
- primäre und sekundäre Rune

Das Popup lässt sich über die Schließen-Schaltfläche, einen Klick auf die Dialogfläche außerhalb des Inhalts und die Escape-Taste schließen. Fokusführung und sinnvolle ARIA-Beschriftungen werden berücksichtigt.

## Lade-, Fehler- und Teildatenzustände

- Ohne verfügbares letztes Match erscheint ein verständlicher Leerzustand.
- Ein abgelaufener oder fehlerhafter Riot-API-Key wird über den vorhandenen Update-/Fehlerstatus erklärt.
- Fehlende Bilder werden durch neutrale Platzhalter ersetzt.
- Fehlende optionale Sensoren oder Attribute entfernen nur die betroffene Information; die restliche Karte bleibt sichtbar.
- Während Daten noch geladen werden, wird ein stabiler Ladezustand ohne Layoutsprünge angezeigt.
- Unbekannte oder gelöschte Konten führen zu einem Konfigurationshinweis statt zu JavaScript-Fehlern.

## Frontend-Bereitstellung

Die Integration liefert die gebaute JavaScript-Datei selbst aus und registriert sie beim Start als Lovelace-Ressource. Nach HACS-Update und Home-Assistant-Neustart steht der Kartentyp zur Verfügung.

Die bestehende Integration und ihre Entity-IDs bleiben abwärtskompatibel. Das bisherige manuelle Dashboard funktioniert weiter, bis der Nutzer es bewusst durch die neue Karte ersetzt.

## Tests

Automatisierte Tests decken mindestens ab:

- Erkennung eines einzelnen Kontos
- Erkennung und Auswahl mehrerer Konten
- stabile Konto-ID und Entity-Präfix-Zuordnung
- Zuordnung der Blue- und Red-Team-Sensoren
- Zuordnung aller zehn Spieler
- Erkennung und gelbe Hervorhebung des eigenen Spielers
- Victory-/Defeat-Farblogik
- KDA-Farblogik
- Verhalten bei fehlenden optionalen Attributen und Bildern
- Leer-, Lade- und API-Fehlerzustände
- Öffnen und Schließen des Detail-Popups
- visuelle Editor-Konfiguration
- responsive Größenberechnung der Karte
- Python-seitige Registrierung der Frontend-Ressource

Zusätzlich wird die gebaute Karte gegen die echten Entity-Strukturen der verbundenen Instanz „Home Assistant Gartenhaus“ geprüft.

## Veröffentlichung

Die Änderung wird auf dem Feature-Branch `agent/league-stats-last-match-card` entwickelt. Nach erfolgreicher automatisierter Prüfung werden Version, Dokumentation und Release-Hinweise aktualisiert und die Änderung über GitHub veröffentlicht. Die bestehende Version auf `main` bleibt bis zur abgeschlossenen Prüfung unangetastet.
