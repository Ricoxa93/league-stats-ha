# League Stats Last Match Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine automatisch erkannte, responsive Home-Assistant-Karte für das letzte League-Match einschließlich integriertem Spieler-Detaildialog ausliefern.

**Architecture:** Die vorhandene Python-Integration stellt ein gebündeltes ES-Modul über einen versionierten statischen Pfad bereit und registriert es einmalig als Lovelace-Ressource. Reine JavaScript-Module erkennen Konten und normalisieren Entity-Zustände; Web Components rendern Karte, Editor und Dialog ohne `button-card` oder `browser_mod`.

**Tech Stack:** Home Assistant 2025.1+, Python 3.13, JavaScript ES2022, Lit aus dem Home-Assistant-Frontend, esbuild, Vitest + happy-dom, pytest + pytest-homeassistant-custom-component.

## Global Constraints

- Kartentyp ist exakt `custom:league-stats-last-match-card`.
- Die bestehende Python-Integration und ihre Entity-IDs bleiben abwärtskompatibel.
- Die Karte zeigt nur das letzte Match, nicht die Match-History und nicht den Dashboard-Hintergrund.
- Ein Konto wird automatisch gewählt; bei mehreren Konten erfolgt die Auswahl im visuellen Editor.
- Das Spieler-Popup funktioniert ohne `browser_mod`.
- Desktop zeigt beide Teams nebeneinander; schmale Ansichten zeigen sie untereinander.
- Fehlende optionale Daten dürfen die übrige Karte nicht ausblenden.
- Produktioncode wird erst nach einem passend fehlschlagenden Test geschrieben.

---

## Dateistruktur

- `frontend/src/account-discovery.js`: erkennt Konten und bildet stabile Präfixe.
- `frontend/src/match-model.js`: normalisiert Home-Assistant-Zustände zu einem Matchmodell.
- `frontend/src/league-stats-last-match-card.js`: Karte, Teamkopf, Spielerzeilen und Dialog.
- `frontend/src/league-stats-last-match-card-editor.js`: visueller Kontoeditor.
- `frontend/src/styles.js`: gemeinsame CSS-Regeln.
- `frontend/test/*.test.js`: JavaScript-Verhaltenstests.
- `custom_components/league_stats/frontend/league-stats-last-match-card.js`: gebautes, von HACS ausgeliefertes Bundle.
- `custom_components/league_stats/frontend.py`: statischer Pfad und Lovelace-Ressource.
- `tests/test_frontend.py`: Python-Registrierungstests.
- `package.json`, `package-lock.json`, `vitest.config.js`: reproduzierbarer Frontend-Build.
- `requirements_test.txt`: Python-Testabhängigkeiten.

### Task 1: Reproduzierbare Test- und Buildumgebung

**Files:**
- Create: `package.json`
- Create: `vitest.config.js`
- Create: `frontend/test/setup.js`
- Create: `requirements_test.txt`
- Create: `tests/__init__.py`

**Interfaces:**
- Produces: `npm test`, `npm run build`, `pytest -q`.
- Produces: globaler Test-Stub `window.customCards = []`.

- [ ] **Step 1: Paketdefinition anlegen**

```json
{
  "name": "league-stats-ha",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "build": "esbuild frontend/src/league-stats-last-match-card.js --bundle --format=esm --target=es2022 --outfile=custom_components/league_stats/frontend/league-stats-last-match-card.js",
    "check": "npm test && npm run build"
  },
  "devDependencies": {
    "esbuild": "0.25.9",
    "happy-dom": "18.0.1",
    "vitest": "3.2.4"
  }
}
```

- [ ] **Step 2: Vitest und DOM-Testsetup anlegen**

```js
// vitest.config.js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    setupFiles: ["frontend/test/setup.js"],
    restoreMocks: true,
  },
});
```

```js
// frontend/test/setup.js
window.customCards = [];
```

- [ ] **Step 3: Python-Testabhängigkeiten festschreiben**

```text
pytest==8.4.1
pytest-asyncio==1.1.0
pytest-homeassistant-custom-component==0.13.271
```

- [ ] **Step 4: Abhängigkeiten installieren und Lockfile erzeugen**

Run: `npm install`  
Expected: `package-lock.json` wird erzeugt und npm endet mit Exitcode 0.

Run: `python -m pip install -r requirements_test.txt`  
Expected: Exitcode 0.

- [ ] **Step 5: Leere Baseline prüfen**

Run: `npm test -- --passWithNoTests`  
Expected: Exitcode 0.

Run: `pytest -q`  
Expected: Exitcode 0.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.js frontend/test/setup.js requirements_test.txt tests/__init__.py
git commit -m "test: add frontend test harness"
```

### Task 2: Kontoerkennung und Matchmodell

**Files:**
- Create: `frontend/test/account-discovery.test.js`
- Create: `frontend/test/match-model.test.js`
- Create: `frontend/src/account-discovery.js`
- Create: `frontend/src/match-model.js`

**Interfaces:**
- Produces: `discoverAccounts(states): Array<{id, label, prefix, anchorEntityId}>`.
- Produces: `resolveAccount(states, configuredId): {status, accounts, account}`.
- Produces: `buildLastMatch(states, account): {status, result, ownPlayerName, blue, red, error}`.
- Consumes: Home-Assistant-Stateobjekte in `hass.states`.

- [ ] **Step 1: Fehlschlagende Kontoerkennungstests schreiben**

```js
import { describe, expect, it } from "vitest";
import { discoverAccounts, resolveAccount } from "../src/account-discovery.js";

const state = (entity_id, stateValue, attributes = {}) => ({
  entity_id,
  state: stateValue,
  attributes,
});

it("erkennt ein Konto am last_match-Anker", () => {
  const states = {
    "sensor.league_stats_ricoxa_1993_last_match": state(
      "sensor.league_stats_ricoxa_1993_last_match",
      "Defeat",
      { friendly_name: "League Stats - Ricoxa#1993 Last Match" },
    ),
  };
  expect(discoverAccounts(states)).toEqual([{
    id: "ricoxa_1993",
    label: "Ricoxa#1993",
    prefix: "sensor.league_stats_ricoxa_1993",
    anchorEntityId: "sensor.league_stats_ricoxa_1993_last_match",
  }]);
});

it("fordert bei mehreren Konten eine Auswahl", () => {
  const states = {
    "sensor.league_stats_ricoxa_1993_last_match": state("sensor.league_stats_ricoxa_1993_last_match", "Defeat"),
    "sensor.league_stats_other_euw_last_match": state("sensor.league_stats_other_euw_last_match", "Victory"),
  };
  expect(resolveAccount(states).status).toBe("selection_required");
});
```

- [ ] **Step 2: Tests ausführen und korrektes RED bestätigen**

Run: `npm test -- frontend/test/account-discovery.test.js`  
Expected: FAIL wegen fehlendem Modul beziehungsweise fehlenden Exporten.

- [ ] **Step 3: Minimale Kontoerkennung implementieren**

Die Implementierung verwendet den Regex  
`/^sensor\.league_stats_(.+)_last_match$/`, bevorzugt das Label aus `friendly_name` und fällt auf die lesbar gemachte Konto-ID zurück. `resolveAccount` liefert die Statuswerte `ready`, `selection_required`, `not_found` oder `configured_account_missing`.

- [ ] **Step 4: Kontoerkennung grün prüfen**

Run: `npm test -- frontend/test/account-discovery.test.js`  
Expected: alle Tests PASS.

- [ ] **Step 5: Fehlschlagende Matchmodelltests schreiben**

Tests bilden die echten Entity-Muster ab:

```js
const prefix = "sensor.league_stats_ricoxa_1993";
const states = {
  [`${prefix}_last_match`]: state(`${prefix}_last_match`, "Defeat", {
    queue: "Ranked Solo", duration: "29:17",
  }),
  [`${prefix}_last_match_blue_player_1`]: state(
    `${prefix}_last_match_blue_player_1`,
    "Blue#EUW",
    { name: "Blue#EUW", kills: 6, deaths: 5, assists: 3, gold: 1800, team_id: 100 },
  ),
  [`${prefix}_last_match_red_player_1`]: state(
    `${prefix}_last_match_red_player_1`,
    "Ricoxa#1993",
    { name: "Ricoxa#1993", kills: 1, deaths: 7, assists: 11, gold: 1710, team_id: 200 },
  ),
};
```

Assertions prüfen:
- je fünf feste Spielerslots pro Team;
- fehlende Slots werden `null`, nicht zu Ausnahmen;
- eigener Spieler wird über den Kontolabel-Vergleich erkannt;
- Team-KDA und Team-Gold werden aus vorhandenen Spielern summiert;
- Objectives kommen aus `_last_match_blue_dragons`, `_barons`, `_towers`;
- Status `empty` bei `No Match`;
- Status `error` bei `_update_status === "Error"`.

- [ ] **Step 6: Matchmodelltests ausführen und RED bestätigen**

Run: `npm test -- frontend/test/match-model.test.js`  
Expected: FAIL wegen fehlendem `buildLastMatch`.

- [ ] **Step 7: Matchmodell minimal implementieren**

Normalisierte Spielerobjekte enthalten exakt:  
`entityId, name, own, champion, championLevel, role, kills, deaths, assists, kda, cs, csPerMin, gold, damage, visionScore, killParticipation, win, teamId, items, summonerSpells, primaryRune, secondaryRune, championIcon, splash, loading`.

Teamobjekte enthalten exakt:  
`side, victory, kills, deaths, assists, gold, goldDelta, dragons, barons, towers, players`.

- [ ] **Step 8: Alle Modelltests grün prüfen**

Run: `npm test -- frontend/test/account-discovery.test.js frontend/test/match-model.test.js`  
Expected: alle Tests PASS.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/account-discovery.js frontend/src/match-model.js frontend/test/account-discovery.test.js frontend/test/match-model.test.js
git commit -m "feat: model last match entities"
```

### Task 3: Karte, responsives Layout und integrierter Dialog

**Files:**
- Create: `frontend/test/league-stats-last-match-card.test.js`
- Create: `frontend/src/styles.js`
- Create: `frontend/src/league-stats-last-match-card.js`

**Interfaces:**
- Produces: Custom Element `league-stats-last-match-card`.
- Consumes: `discoverAccounts`, `resolveAccount`, `buildLastMatch`.
- Public HA API: `setConfig(config)`, `hass`, `getCardSize()`, `getGridOptions()`, `getConfigElement()`, `getStubConfig()`.

- [ ] **Step 1: Fehlschlagende Karten- und Dialogtests schreiben**

Mit einem echten DOM-Element werden folgende Verhaltensweisen geprüft:

```js
await import("../src/league-stats-last-match-card.js");
const card = document.createElement("league-stats-last-match-card");
card.setConfig({ type: "custom:league-stats-last-match-card" });
card.hass = { states };
document.body.append(card);
await card.updateComplete;

expect(card.shadowRoot.querySelectorAll("[data-player-row]")).toHaveLength(10);
card.shadowRoot.querySelector("[data-player-row]").click();
expect(card.shadowRoot.querySelector("[role=dialog]")).not.toBeNull();
window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
expect(card.shadowRoot.querySelector("[role=dialog]")).toBeNull();
```

Weitere Assertions:
- eigener Spieler besitzt `data-own-player="true"`;
- fehlende Bilder rendern `.image-placeholder`;
- `selection_required`, `empty` und `error` rendern verständliche Statuskarten;
- `getCardSize()` liefert `8`;
- `getGridOptions()` liefert `{ columns: "full", min_columns: 6 }`.

- [ ] **Step 2: Kartentests ausführen und RED bestätigen**

Run: `npm test -- frontend/test/league-stats-last-match-card.test.js`  
Expected: FAIL wegen fehlendem Custom Element.

- [ ] **Step 3: Karte mit Home-Assistant-Lit implementieren**

Die Karte übernimmt `LitElement`, `html` und `css` aus dem bereits geladenen Home-Assistant-Frontend, registriert sich nur, wenn der Tag noch nicht existiert, und rendert:

- `ha-card` als äußeren Container;
- `.teams` mit zwei `section.team`;
- Teamköpfe und fünf stabile Spielerslots;
- Items, Trinket, zwei Spells und zwei Runen;
- Dialog mit `role="dialog"`, `aria-modal="true"` und Schließen-Schaltfläche.

Der Media Query `@media (max-width: 800px)` setzt `.teams { grid-template-columns: 1fr; }`.

- [ ] **Step 4: Tastatur- und Fokusverhalten implementieren**

Beim Öffnen wird das zuvor fokussierte Element gespeichert und die Schließen-Schaltfläche fokussiert. Escape, Backdrop-Klick und Schließen-Schaltfläche rufen dieselbe Methode `_closeDialog()` auf; diese stellt den vorherigen Fokus wieder her.

- [ ] **Step 5: Kartentests grün prüfen**

Run: `npm test -- frontend/test/league-stats-last-match-card.test.js`  
Expected: alle Tests PASS und keine unbehandelten Promise-Fehler.

- [ ] **Step 6: Bundle bauen**

Run: `npm run build`  
Expected: `custom_components/league_stats/frontend/league-stats-last-match-card.js` existiert und esbuild endet mit Exitcode 0.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/styles.js frontend/src/league-stats-last-match-card.js frontend/test/league-stats-last-match-card.test.js custom_components/league_stats/frontend/league-stats-last-match-card.js
git commit -m "feat: add last match card"
```

### Task 4: Visueller Kontoeditor und Karten-Picker

**Files:**
- Create: `frontend/test/league-stats-last-match-card-editor.test.js`
- Create: `frontend/src/league-stats-last-match-card-editor.js`
- Modify: `frontend/src/league-stats-last-match-card.js`

**Interfaces:**
- Produces: Custom Element `league-stats-last-match-card-editor`.
- Emits: `config-changed` mit `detail: {config}`.
- Registriert: `window.customCards[{type: "league-stats-last-match-card", ...}]`.

- [ ] **Step 1: Fehlschlagende Editortests schreiben**

Assertions:
- ein Konto wird als automatisch erkannt angezeigt;
- mehrere Konten erscheinen in `ha-select`;
- Auswahl setzt `config.account`;
- Wechsel zurück zu „Automatisch“ entfernt `account`;
- `config-changed` bubblt und ist composed;
- `window.customCards` enthält genau einen Picker-Eintrag.

- [ ] **Step 2: RED bestätigen**

Run: `npm test -- frontend/test/league-stats-last-match-card-editor.test.js`  
Expected: FAIL wegen fehlendem Editor.

- [ ] **Step 3: Editor und Picker implementieren**

`getConfigElement()` importiert den Editor und liefert ein Editor-Element. `getStubConfig()` liefert `{}`. Der Picker-Eintrag lautet:

```js
{
  type: "league-stats-last-match-card",
  name: "League Stats – Letztes Match",
  preview: true,
  description: "Zeigt beide Teams des letzten League-of-Legends-Matches.",
  documentationURL: "https://github.com/Ricoxa93/league-stats-ha",
}
```

- [ ] **Step 4: Editor- und Gesamttests grün prüfen**

Run: `npm test`  
Expected: alle JavaScript-Tests PASS.

- [ ] **Step 5: Produktionsbundle neu bauen und Commit**

Run: `npm run build`  
Expected: Exitcode 0.

```bash
git add frontend/src/league-stats-last-match-card.js frontend/src/league-stats-last-match-card-editor.js frontend/test/league-stats-last-match-card-editor.test.js custom_components/league_stats/frontend/league-stats-last-match-card.js
git commit -m "feat: add last match card editor"
```

### Task 5: Automatische Frontend-Bereitstellung durch Home Assistant

**Files:**
- Create: `tests/test_frontend.py`
- Create: `custom_components/league_stats/frontend.py`
- Modify: `custom_components/league_stats/__init__.py`
- Modify: `custom_components/league_stats/manifest.json`

**Interfaces:**
- Produces: `async_register_frontend(hass) -> None`.
- Statischer URL-Pfad: `/league_stats_frontend/league-stats-last-match-card.js?v=<manifest-version>`.
- Nutzt: `StaticPathConfig` und die Lovelace-Resource-Collection.
- `async_setup(hass, config)` registriert das Frontend genau einmal.

- [ ] **Step 1: Fehlschlagende Python-Tests schreiben**

```python
@pytest.mark.asyncio
async def test_registers_static_path_and_lovelace_resource(hass):
    await async_register_frontend(hass)
    hass.http.async_register_static_paths.assert_awaited_once()
    resources = hass.data["lovelace"]["resources"]
    resources.async_create_item.assert_awaited_once_with({
        "res_type": "module",
        "url": "/league_stats_frontend/league-stats-last-match-card.js?v=0.4.0",
    })

@pytest.mark.asyncio
async def test_registration_is_idempotent(hass):
    await async_register_frontend(hass)
    await async_register_frontend(hass)
    hass.http.async_register_static_paths.assert_awaited_once()
```

Ein dritter Test legt bereits dieselbe Basis-URL mit alter Versionsquery an und erwartet `async_update_item` statt eines Duplikats.

- [ ] **Step 2: RED bestätigen**

Run: `pytest -q tests/test_frontend.py`  
Expected: FAIL wegen fehlendem `frontend.py`.

- [ ] **Step 3: Statischen Pfad registrieren**

`frontend.py` verwendet:

```python
FRONTEND_URL = "/league_stats_frontend/league-stats-last-match-card.js"
FRONTEND_PATH = Path(__file__).parent / "frontend" / "league-stats-last-match-card.js"

await hass.http.async_register_static_paths([
    StaticPathConfig(FRONTEND_URL, str(FRONTEND_PATH), cache_headers=True),
])
```

- [ ] **Step 4: Lovelace-Ressource idempotent anlegen/aktualisieren**

Die Funktion lädt bei Bedarf `lovelace`, liest die Storage-Resource-Collection, vergleicht URLs ohne Querystring und legt genau einen Moduleintrag an oder aktualisiert ihn auf die Manifest-Version. YAML-Modus wird ohne Absturz protokolliert; in diesem Sonderfall nennt die README die einmalige manuelle Ressourcen-URL.

- [ ] **Step 5: Integrationseinstieg ergänzen**

`custom_components/league_stats/__init__.py` erhält:

```python
async def async_setup(hass, config):
    await async_register_frontend(hass)
    return True
```

`async_setup_entry` und `async_unload_entry` bleiben funktional unverändert.

- [ ] **Step 6: Manifestversion auf 0.4.0 erhöhen**

Zusätzlich werden die vorhandenen Platzhalter korrigiert:

```json
"version": "0.4.0",
"issue_tracker": "https://github.com/Ricoxa93/league-stats-ha/issues",
"codeowners": ["@Ricoxa93"]
```

- [ ] **Step 7: Python- und Gesamttests grün prüfen**

Run: `pytest -q`  
Expected: alle Python-Tests PASS.

Run: `npm run check`  
Expected: alle JS-Tests PASS und Bundle-Build Exitcode 0.

- [ ] **Step 8: Commit**

```bash
git add tests/test_frontend.py custom_components/league_stats/frontend.py custom_components/league_stats/__init__.py custom_components/league_stats/manifest.json
git commit -m "feat: register last match frontend"
```

### Task 6: Dokumentation, reale Datenprüfung und Veröffentlichung

**Files:**
- Modify: `README.md`
- Modify: `hacs.json`
- Create: `CHANGELOG.md`

**Interfaces:**
- Dokumentiert: Editorinstallation, Minimal-YAML, Mehrkontoauswahl, YAML-Ressourcenfallback.
- Releaseziel: `0.4.0`.

- [ ] **Step 1: README aktualisieren**

Die Dokumentation enthält mindestens:

```yaml
type: custom:league-stats-last-match-card
```

sowie:

```yaml
type: custom:league-stats-last-match-card
account: ricoxa_1993
```

Sie erklärt HACS-Update, Home-Assistant-Neustart, Browser-Hard-Reload und den YAML-Modus-Fallback.

- [ ] **Step 2: HACS-Metadaten korrigieren**

`hacs.json` erhält `"domains": ["sensor", "image"]`; die Mindestversion bleibt `2025.1.0`.

- [ ] **Step 3: Changelog für 0.4.0 schreiben**

Der Eintrag nennt neue Karte, automatische Kontoerkennung, integrierten Dialog, responsives Layout und entfernte Frontend-Abhängigkeiten.

- [ ] **Step 4: Gegen echte Gartenhaus-Entity-Struktur prüfen**

Aus der verbundenen Instanz werden alle `sensor.league_stats_ricoxa_1993_last_match*`-Zustände gelesen. Ein anonymisiertes Fixture wird lokal durch `buildLastMatch` verarbeitet.

Run: `npm test -- frontend/test/gartenhaus-fixture.test.js`  
Expected: zwei Teams, zehn Spieler, eigener Spieler `Ricoxa#1993`, keine Exception bei fehlenden Bildern.

Das Fixture enthält keine API-Schlüssel, Tokens oder URLs der privaten Instanz und wird nicht committed, sofern echte Spielernamen enthalten sind.

- [ ] **Step 5: Frische Abschlussprüfung ausführen**

Run: `npm ci && npm run check`  
Expected: alle JS-Tests PASS, Bundle neu gebaut.

Run: `python -m pip install -r requirements_test.txt && pytest -q`  
Expected: alle Python-Tests PASS.

Run: `python -m compileall custom_components/league_stats`  
Expected: Exitcode 0 ohne Syntaxfehler.

Run: `git diff --check`  
Expected: keine Ausgabe, Exitcode 0.

- [ ] **Step 6: Dokumentation committen**

```bash
git add README.md hacs.json CHANGELOG.md
git commit -m "docs: release last match card"
```

- [ ] **Step 7: Branch veröffentlichen und Draft-PR öffnen**

Push: `agent/league-stats-last-match-card`  
Base: `main`  
PR-Titel: `Add League Stats last match card`

Der PR-Text nennt Änderungen, Nutzen, Abwärtskompatibilität, Version `0.4.0` und sämtliche ausgeführten Prüfkommandos.

- [ ] **Step 8: Nach Nutzerfreigabe mergen und Release erstellen**

Erst nach visueller Prüfung in `https://gartenhaus.ricoxa.org/` wird der PR gemergt und ein GitHub-Release/Tag `v0.4.0` erstellt. Die Release Notes übernehmen den geprüften Changelog.
