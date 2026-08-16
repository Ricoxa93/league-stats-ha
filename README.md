League Stats for Home Assistant
League of Legends Ranked Stats Integration for Home Assistant.

Die Integration nutzt die offizielle Riot Games API und unterstützt:

SoloQ Statistiken
FlexQ Statistiken
Gesamtstatistiken
Rang
LP
Wins / Losses
Winrate
Config Flow (UI-Einrichtung)
Home Assistant Geräte & Dienste Integration
Features
Unterstützte Sensoren
Gesamt
Gesamt Wins
Gesamt Losses
Gesamt Spiele
Gesamt Winrate
SoloQ
SoloQ Rang
SoloQ LP
SoloQ Wins
SoloQ Losses
SoloQ Spiele
SoloQ Winrate
FlexQ
Flex Rang
Flex LP
Flex Wins
Flex Losses
Flex Spiele
Flex Winrate
Installation
HACS (empfohlen)
Benutzerdefiniertes Repository hinzufügen
In Home Assistant:

HACS → Integrationen → Benutzerdefinierte Repositories
Repository hinzufügen:

https://github.com/DEIN_GITHUB_NAME/league-stats-ha
Kategorie:

Integration
Danach:

HACS → League Stats → Installieren
Home Assistant anschließend neu starten.

Riot API-Key erstellen
Für diese Integration wird ein eigener Riot API-Key benötigt.

1. Riot Developer Portal öffnen
https://developer.riotgames.com/

Mit dem Riot-Konto anmelden.

2. API-Key kopieren
Im Dashboard wird ein persönlicher Riot API-Key angezeigt.

Der Key beginnt meistens mit:

RGAPI-
3. Wichtiger Hinweis
Riot Development API-Keys laufen regelmäßig ab.

Wenn die Integration keine Daten mehr lädt oder Fehler wie:

401 Unauthorized
auftreten, muss ein neuer API-Key erzeugt werden.

Integration einrichten
In Home Assistant:

Einstellungen → Geräte & Dienste → Integration hinzufügen → League Stats
Dann folgende Daten eintragen:

Feld	Beispiel
API-Key	RGAPI-xxxxxxxx
Riot Name	NAME
Tagline	EUW
Platform	euw1
Region	europe
Riot Name finden
Wenn dein Riot Name lautet:

NAME#EUW
Dann gilt:

Teil	Wert
Riot Name	NAME
Tagline	EUW
Regionen
Server	Platform	Region
EUW	euw1	europe
EUNE	eun1	europe
NA	na1	americas
KR	kr	asia
BR	br1	americas
JP	jp1	asia
LAN	la1	americas
LAS	la2	americas
OCE	oc1	sea
TR	tr1	europe
RU	ru	europe
Beispiel Lovelace Card
type: entities
title: League Stats
entities:
  - entity: sensor.league_of_legends_soloq_rang
  - entity: sensor.league_of_legends_soloq_lp
  - entity: sensor.league_of_legends_soloq_winrate
  - entity: sensor.league_of_legends_flex_rang
  - entity: sensor.league_of_legends_flex_lp
Fehlerbehebung
Fehler	Bedeutung	Lösung
401 Unauthorized	API-Key ungültig oder abgelaufen	Neuen API-Key erstellen
403 Forbidden	Zugriff verweigert	API-Key prüfen
404 Not Found	Riot Name oder Tagline falsch	Riot-ID prüfen
429 Too Many Requests	Riot Rate Limit erreicht	Update-Intervall erhöhen
Hinweise
Diese Integration verwendet die offizielle Riot Games API.
Es wird kein zentraler Server verwendet.
API-Keys werden nur lokal in Home Assistant gespeichert.
Diese Integration ist nicht mit Riot Games verbunden oder offiziell unterstützt.
Geplante Features
Match-History
Live Game Sensor
Champion Mastery
KDA Sensoren
Win/Lose Streaks
ApexCharts Support
HACS Discovery
Mehrsprachigkeit
Options Flow
## Eigene Last-Match-Karte

Ab Version 0.4.2 kann die Karte im visuellen Editor `Beide Teams`, `Blue Team` oder `Red Team` anzeigen. Die gültigen YAML-Werte für `team` sind `both`, `blue` und `red`; ohne `team` bleibt die bisherige Gesamtansicht aktiv. Für eine responsive Ansicht werden zwei Karten in derselben Home-Assistant-Section angelegt:

```yaml
type: custom:league-stats-last-match-card
team: blue
```

```yaml
type: custom:league-stats-last-match-card
team: red
```

Home Assistant ordnet beide Karten auf breiten Dashboards nebeneinander und auf schmalen Mobilansichten untereinander an. Ohne `team` bleibt das bisherige Verhalten mit beiden Teams erhalten.

League Stats Dashboard Cards for Home Assistant Diese Beispiele zeigen fertige Dashboard-Karten für die League Stats Home-Assistant-Integration. Die Karten sind für HACS-Nutzer gedacht, die nach der Installation der Integration direkt eine optisch fertige Ansicht für das letzte Match und die letzten Spiele nutzen möchten. Vorschau Last Match Team View Last Match Team View Last Games / Match History Last Games History Voraussetzungen Für die Beispielkarten werden diese Lovelace-Custom-Cards genutzt: custom:button-card browser_mod für Popups, optional aber empfohlen Wenn browser_mod nicht installiert ist, funktionieren die Karten selbst, aber die Detail-Popups beim Antippen nicht. Wichtige Platzhalter In den YAML-Beispielen sind keine echten Spielernamen enthalten. Vor der Nutzung müssen diese Platzhalter angepasst werden. Platzhalter Bedeutung Beispiel ExamplePlayer#TAG Dein Riot-Name mit Tagline MyName#EUW sensor.league_stats_exampleplayer_tag Entity-Präfix deiner Integration sensor.league_stats_myname_euw Den richtigen Entity-Namen findest du in Home Assistant unter:

Entwicklerwerkzeuge → Zustände → Suche nach: league_stats
Typische Entities sehen so aus:

sensor.league_stats_exampleplayer_tag_last_match
sensor.league_stats_exampleplayer_tag_last_match_history_1
sensor.league_stats_exampleplayer_tag_last_match_blue_player_1
sensor.league_stats_exampleplayer_tag_last_match_red_player_1
Empfohlene Struktur Die Beispiele liegen in diesem Ordner:

examples/
  button_card_templates.yaml
  last_games_stack.yaml
  last_match_player_card.yaml
  last_match_blue_team_header.yaml
  last_match_red_team_header.yaml
Variante 1: Match History mit Template Diese Variante ist für die letzten 5 Spiele gedacht.

Template einfügen Kopiere den Inhalt aus:
examples/button_card_templates.yaml
in dein Dashboard unter button_card_templates. Bei YAML-Dashboards sieht das zum Beispiel so aus:

button_card_templates:
  league_match_history:
    ...
Last-Games-Stack einfügen Kopiere danach den Inhalt aus:
examples/last_games_stack.yaml
in dein Dashboard. Passe dort nur diese Werte an:

entity: sensor.league_stats_exampleplayer_tag_last_match_history_1
variables:
  own_player: ExamplePlayer#TAG
Für die weiteren Karten entsprechend:

sensor.league_stats_exampleplayer_tag_last_match_history_2
sensor.league_stats_exampleplayer_tag_last_match_history_3
sensor.league_stats_exampleplayer_tag_last_match_history_4
sensor.league_stats_exampleplayer_tag_last_match_history_5
Variante 2: Team View für das letzte Match Die Team-Ansicht besteht aus: Blue-Team-Header 5 Blue-Player-Cards Red-Team-Header 5 Red-Player-Cards Blue-Team-Header Datei:

examples/last_match_blue_team_header.yaml
Anpassen musst du dort die Entity-Präfixe:

sensor.league_stats_exampleplayer_tag_last_match_blue_player_1
sensor.league_stats_exampleplayer_tag_last_match_blue_dragons
sensor.league_stats_exampleplayer_tag_last_match_blue_barons
sensor.league_stats_exampleplayer_tag_last_match_blue_towers
Red-Team-Header Datei:

examples/last_match_red_team_header.yaml
Anpassen musst du dort die Entity-Präfixe:

sensor.league_stats_exampleplayer_tag_last_match_red_player_1
sensor.league_stats_exampleplayer_tag_last_match_red_dragons
sensor.league_stats_exampleplayer_tag_last_match_red_barons
sensor.league_stats_exampleplayer_tag_last_match_red_towers
Player Card Datei:

examples/last_match_player_card.yaml
Diese Karte kannst du für jeden Spieler kopieren. Du änderst nur die Entity:

entity: sensor.league_stats_exampleplayer_tag_last_match_blue_player_1
Beispiele:

entity: sensor.league_stats_exampleplayer_tag_last_match_blue_player_1
entity: sensor.league_stats_exampleplayer_tag_last_match_blue_player_2
entity: sensor.league_stats_exampleplayer_tag_last_match_blue_player_3
entity: sensor.league_stats_exampleplayer_tag_last_match_blue_player_4
entity: sensor.league_stats_exampleplayer_tag_last_match_blue_player_5

entity: sensor.league_stats_exampleplayer_tag_last_match_red_player_1
entity: sensor.league_stats_exampleplayer_tag_last_match_red_player_2
entity: sensor.league_stats_exampleplayer_tag_last_match_red_player_3
entity: sensor.league_stats_exampleplayer_tag_last_match_red_player_4
entity: sensor.league_stats_exampleplayer_tag_last_match_red_player_5
Zusätzlich anpassen:

variables:
  own_player: ExamplePlayer#TAG
Damit wird der eigene Spieler gelb hervorgehoben. Benötigte Sensor-Attribute Die History-Karten erwarten bei last_match_history_X diese Attribute:

result: Victory
win: true
team_id: 100
side: Blue Side
champion: Sona
champion_icon: https://...
kills: 2
deaths: 2
assists: 12
kda: 7
items:
  - icon: https://...
summoner_spells:
  - icon: https://...
primary_rune:
  icon: https://...
secondary_rune:
  icon: https://...
Für side gilt: Wert Bedeutung Blue Side eigener Spieler war im blauen Team Red Side eigener Spieler war im roten Team Für team_id gilt: Wert Bedeutung 100 Blue Team 200 Red Team Fehlerbehebung Die Karte zeigt keine Bilder Prüfe, ob die Entity Attribute wie champion_icon, items, summoner_spells, primary_rune und secondary_rune enthält. Victory / Defeat wird nicht angezeigt Prüfe, ob result oder win als Attribut vorhanden ist.

result: Victory
win: true
Blue Side / Red Side wird nicht angezeigt Prüfe, ob side oder team_id vorhanden ist.

side: Blue Side
team_id: 100
Popups öffnen sich nicht Installiere und konfiguriere browser_mod. Ohne browser_mod muss der tap_action-Bereich entfernt oder angepasst werden. Hinweise für HACS Diese YAML-Dateien können im Repository zum Beispiel so abgelegt werden:

docs/dashboard-cards.md
docs/assets/
examples/dashboard/
Empfohlene README-Verlinkung:

## Dashboard Examples

Ready-to-use Lovelace examples are available here:

- [Dashboard Card Documentation](docs/dashboard-cards.md)
- [Example YAML files](examples/dashboard/)
Datenschutz Die Beispielbilder in dieser Dokumentation sind anonymisiert. Spielernamen wurden unkenntlich gemacht.

Lizenz
MIT License

## Lovelace-Karte: Letztes Match

Ab Version 0.4.0 liefert die Integration eine eigene Dashboard-Karte mit. Sie zeigt Blue Team und Red Team des letzten Matches, alle zehn Spieler, Teamwerte, Items, Zauber und Runen. Ein Klick auf einen Spieler öffnet die Detailansicht. `custom:button-card` und `browser_mod` werden nicht benötigt.

Nach dem HACS-Update Home Assistant neu starten und den Browser einmal vollständig neu laden. Anschließend im Dashboard-Editor **League Stats – Letztes Match** auswählen. Bei genau einem eingerichteten Konto erkennt die Karte den Spieler automatisch.

Minimale YAML-Konfiguration:

```yaml
type: custom:league-stats-last-match-card
```

Bei mehreren League-Konten kann das Konto im visuellen Editor ausgewählt oder per YAML festgelegt werden:

```yaml
type: custom:league-stats-last-match-card
account: ricoxa_1993
```

Die Karte übernimmt bewusst nicht das Hintergrundbild der Dashboard-Ansicht. Dieses kann weiterhin in der Ansicht konfiguriert werden.

### Ressourcen-Fallback für YAML-Modus

Im normalen Storage-Modus registriert die Integration die Ressource automatisch. Falls die Lovelace-Ressourcen vollständig per YAML verwaltet werden, muss einmalig folgende Modulressource ergänzt werden:

```yaml
resources:
  - url: /league_stats_frontend/league-stats-last-match-card.js
    type: module
```

Nach einem Versionsupdate können zwischengespeicherte Frontend-Dateien durch einen Hard-Reload des Browsers (`Strg+F5`) aktualisiert werden.
