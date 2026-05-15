# League Stats for Home Assistant

League of Legends Ranked Stats Integration for Home Assistant.

Die Integration nutzt die offizielle Riot Games API und unterstützt:

- SoloQ Statistiken
- FlexQ Statistiken
- Gesamtstatistiken
- Rang
- LP
- Wins / Losses
- Winrate
- Config Flow (UI-Einrichtung)
- Home Assistant Geräte & Dienste Integration

---

# Features

## Unterstützte Sensoren

### Gesamt

- Gesamt Wins
- Gesamt Losses
- Gesamt Spiele
- Gesamt Winrate

### SoloQ

- SoloQ Rang
- SoloQ LP
- SoloQ Wins
- SoloQ Losses
- SoloQ Spiele
- SoloQ Winrate

### FlexQ

- Flex Rang
- Flex LP
- Flex Wins
- Flex Losses
- Flex Spiele
- Flex Winrate

---

# Installation

## HACS (empfohlen)

### Benutzerdefiniertes Repository hinzufügen

In Home Assistant:

```text
HACS → Integrationen → Benutzerdefinierte Repositories
```

Repository hinzufügen:

```text
https://github.com/DEIN_GITHUB_NAME/league-stats-ha
```

Kategorie:

```text
Integration
```

Danach:

```text
HACS → League Stats → Installieren
```

Home Assistant anschließend neu starten.

---

# Riot API-Key erstellen

Für diese Integration wird ein eigener Riot API-Key benötigt.

## 1. Riot Developer Portal öffnen

https://developer.riotgames.com/

Mit dem Riot-Konto anmelden.

---

## 2. API-Key kopieren

Im Dashboard wird ein persönlicher Riot API-Key angezeigt.

Der Key beginnt meistens mit:

```text
RGAPI-
```

---

## 3. Wichtiger Hinweis

Riot Development API-Keys laufen regelmäßig ab.

Wenn die Integration keine Daten mehr lädt oder Fehler wie:

```text
401 Unauthorized
```

auftreten, muss ein neuer API-Key erzeugt werden.

---

# Integration einrichten

In Home Assistant:

```text
Einstellungen → Geräte & Dienste → Integration hinzufügen → League Stats
```

Dann folgende Daten eintragen:

| Feld | Beispiel |
|---|---|
| API-Key | RGAPI-xxxxxxxx |
| Riot Name | Ricoxa |
| Tagline | EUW |
| Platform | euw1 |
| Region | europe |

---

# Riot Name finden

Wenn dein Riot Name lautet:

```text
Ricoxa#EUW
```

Dann gilt:

| Teil | Wert |
|---|---|
| Riot Name | Ricoxa |
| Tagline | EUW |

---

# Regionen

| Server | Platform | Region |
|---|---|---|
| EUW | `euw1` | `europe` |
| EUNE | `eun1` | `europe` |
| NA | `na1` | `americas` |
| KR | `kr` | `asia` |
| BR | `br1` | `americas` |
| JP | `jp1` | `asia` |
| LAN | `la1` | `americas` |
| LAS | `la2` | `americas` |
| OCE | `oc1` | `sea` |
| TR | `tr1` | `europe` |
| RU | `ru` | `europe` |

---

# Beispiel Lovelace Card

```yaml
type: entities
title: League Stats
entities:
  - entity: sensor.league_of_legends_soloq_rang
  - entity: sensor.league_of_legends_soloq_lp
  - entity: sensor.league_of_legends_soloq_winrate
  - entity: sensor.league_of_legends_flex_rang
  - entity: sensor.league_of_legends_flex_lp
```

---

# Fehlerbehebung

| Fehler | Bedeutung | Lösung |
|---|---|---|
| `401 Unauthorized` | API-Key ungültig oder abgelaufen | Neuen API-Key erstellen |
| `403 Forbidden` | Zugriff verweigert | API-Key prüfen |
| `404 Not Found` | Riot Name oder Tagline falsch | Riot-ID prüfen |
| `429 Too Many Requests` | Riot Rate Limit erreicht | Update-Intervall erhöhen |

---

# Hinweise

- Diese Integration verwendet die offizielle Riot Games API.
- Es wird kein zentraler Server verwendet.
- API-Keys werden nur lokal in Home Assistant gespeichert.
- Diese Integration ist nicht mit Riot Games verbunden oder offiziell unterstützt.

---

# Geplante Features

- Match-History
- Live Game Sensor
- Champion Mastery
- KDA Sensoren
- Win/Lose Streaks
- ApexCharts Support
- HACS Discovery
- Mehrsprachigkeit
- Options Flow

---

# Lizenz

MIT License
