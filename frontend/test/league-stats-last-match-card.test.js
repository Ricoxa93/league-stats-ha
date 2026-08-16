import { beforeEach, expect, it } from "vitest";
import "../src/league-stats-last-match-card.js";

const prefix = "sensor.league_stats_ricoxa_1993";
const state = (entity_id, value, attributes = {}) => ({ entity_id, state: value, attributes });

function states() {
  const result = {
    [`${prefix}_last_match`]: state(`${prefix}_last_match`, "Defeat", { friendly_name: "League Stats - Ricoxa#1993 Last Match", queue: "Ranked Solo", duration: "29:17" }),
    [`${prefix}_update_status`]: state(`${prefix}_update_status`, "Up to date"),
  };
  for (const side of ["blue", "red"]) {
    for (let index = 1; index <= 5; index += 1) {
      const name = side === "red" && index === 5 ? "Ricoxa#1993" : `${side}${index}#EUW`;
      const entityId = `${prefix}_last_match_${side}_player_${index}`;
      result[entityId] = state(entityId, name, {
        name, champion: index === 1 ? "Sona" : "Ahri", champion_level: 16,
        role: "Support", kills: index, deaths: 2, assists: 11, kda: 6,
        gold: 1000 + index, team_id: side === "blue" ? 100 : 200,
        win: side === "blue", items: [{ icon: "https://example.test/item.png" }],
        summoner_spells: [], primary_rune: null, secondary_rune: null,
        champion_icon: index === 1 ? "https://example.test/champion.png" : null,
      });
    }
  }
  return result;
}

beforeEach(() => { document.body.innerHTML = ""; });

it("rendert zehn Spieler und markiert den eigenen Spieler", async () => {
  const card = document.createElement("league-stats-last-match-card");
  card.setConfig({ type: "custom:league-stats-last-match-card" });
  card.hass = { states: states() };
  document.body.append(card);
  await card.updateComplete;
  expect(card.shadowRoot.querySelectorAll("[data-player-row]")).toHaveLength(10);
  expect(card.shadowRoot.querySelector('[data-own-player="true"]')).not.toBeNull();
  expect(card.shadowRoot.querySelector(".image-placeholder")).not.toBeNull();
});

it("öffnet und schließt den integrierten Dialog", async () => {
  const card = document.createElement("league-stats-last-match-card");
  card.setConfig({ type: "custom:league-stats-last-match-card" });
  card.hass = { states: states() };
  document.body.append(card);
  await card.updateComplete;
  card.shadowRoot.querySelector("[data-player-row]").click();
  expect(card.shadowRoot.querySelector('[role="dialog"]')).not.toBeNull();
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  expect(card.shadowRoot.querySelector('[role="dialog"]')).toBeNull();
});

it("liefert Home-Assistant-Größeninformationen", () => {
  const card = document.createElement("league-stats-last-match-card");
  expect(card.getCardSize()).toBe(8);
  expect(card.getGridOptions()).toEqual({ columns: "full", min_columns: 6 });
});

it.each([
  [undefined, { columns: "full", min_columns: 6 }],
  ["both", { columns: "full", min_columns: 6 }],
  ["blue", { columns: 6, min_columns: 4 }],
  ["red", { columns: 6, min_columns: 4 }],
])("liefert für team=%s passende Rasteroptionen", (team, expected) => {
  const card = document.createElement("league-stats-last-match-card");
  card.setConfig({ type: "custom:league-stats-last-match-card", ...(team ? { team } : {}) });
  expect(card.getGridOptions()).toEqual(expected);
});

it("strukturiert beide Teamseiten für eine gespiegelte Desktop-Anordnung", async () => {
  const card = document.createElement("league-stats-last-match-card");
  card.setConfig({ type: "custom:league-stats-last-match-card" });
  card.hass = { states: states() };
  document.body.append(card);
  await card.updateComplete;
  const blue = card.shadowRoot.querySelector('.player[data-side="blue"]');
  const red = card.shadowRoot.querySelector('.player[data-side="red"]');
  for (const row of [blue, red]) {
    expect(row.querySelector(".inventory")).not.toBeNull();
    expect(row.querySelector(".player-main")).not.toBeNull();
    expect(row.querySelector(".kda-block")).not.toBeNull();
    expect(row.querySelector(".portrait-wrap")).not.toBeNull();
  }
});

it.each([
  ["blue", "Blue", "Red"],
  ["red", "Red", "Blue"],
])("rendert mit team=%s nur die gewählte Teamkarte", async (team, visible, hidden) => {
  const card = document.createElement("league-stats-last-match-card");
  card.setConfig({ type: "custom:league-stats-last-match-card", team });
  card.hass = { states: states() };
  document.body.append(card);
  await card.updateComplete;
  expect(card.shadowRoot.querySelectorAll(".team")).toHaveLength(1);
  expect(card.shadowRoot.querySelector(".team-name").textContent).toContain(visible);
  expect(card.shadowRoot.querySelector(".team-name").textContent).not.toContain(hidden);
  expect(card.shadowRoot.querySelector(".teams").classList.contains("single-team")).toBe(true);
  expect(card.shadowRoot.querySelectorAll("[data-player-row]")).toHaveLength(5);
});

it("behält ohne Teamkonfiguration beide Teams bei", async () => {
  const card = document.createElement("league-stats-last-match-card");
  card.setConfig({ type: "custom:league-stats-last-match-card" });
  card.hass = { states: states() };
  document.body.append(card);
  await card.updateComplete;
  expect(card.shadowRoot.querySelectorAll(".team")).toHaveLength(2);
  expect(card.shadowRoot.querySelector(".teams").classList.contains("single-team")).toBe(false);
});

it("behandelt team=both ausdrücklich wie die abwärtskompatible Gesamtansicht", async () => {
  const card = document.createElement("league-stats-last-match-card");
  card.setConfig({ type: "custom:league-stats-last-match-card", team: "both" });
  card.hass = { states: states() };
  document.body.append(card);
  await card.updateComplete;
  expect(card.shadowRoot.querySelectorAll(".team")).toHaveLength(2);
  expect(card.shadowRoot.querySelector(".teams").classList.contains("single-team")).toBe(false);
});

it("verwendet die MDI-Symbole der alten Teamübersicht für die Objectives", async () => {
  const card = document.createElement("league-stats-last-match-card");
  card.setConfig({ type: "custom:league-stats-last-match-card", team: "blue" });
  card.hass = { states: states() };
  document.body.append(card);
  await card.updateComplete;
  expect([...card.shadowRoot.querySelectorAll(".objective ha-icon")].map((entry) => entry.getAttribute("icon")))
    .toEqual(["mdi:dragon", "mdi:shield-crown", "mdi:tower-fire"]);
});

it("zeigt vor dem ersten hass-Update einen Ladezustand", () => {
  const card = document.createElement("league-stats-last-match-card");
  card.setConfig({ type: "custom:league-stats-last-match-card" });
  document.body.append(card);
  expect(card.shadowRoot.textContent).toContain("League Stats werden geladen");
  expect(card.shadowRoot.textContent).not.toContain("Keine League-Stats-Integration");
});

it("zeigt während der anfänglichen leeren Zustandsübertragung einen Ladezustand", () => {
  const card = document.createElement("league-stats-last-match-card");
  card.setConfig({ type: "custom:league-stats-last-match-card" });
  card.hass = { states: {} };
  document.body.append(card);
  expect(card.shadowRoot.textContent).toContain("League Stats werden geladen");
});

it("zeigt Zauber und Runen in der Spielerzeile sowie Matchkontext im Dialog", async () => {
  const data = states();
  const player = data[`${prefix}_last_match_blue_player_1`].attributes;
  player.summoner_spells = [{ icon: "spell1.png" }, { icon: "spell2.png" }];
  player.primary_rune = { icon: "primary.png" };
  player.secondary_rune = { icon: "secondary.png" };
  player.splash = "https://example.test/splash.jpg";
  const card = document.createElement("league-stats-last-match-card");
  card.setConfig({ type: "custom:league-stats-last-match-card" });
  card.hass = { states: data };
  document.body.append(card);
  await card.updateComplete;
  const row = card.shadowRoot.querySelector("[data-player-row]");
  expect(row.querySelectorAll(".spell-rune")).toHaveLength(4);
  row.click();
  const dialog = card.shadowRoot.querySelector('[role="dialog"]');
  expect(dialog.textContent).toContain("Ranked Solo");
  expect(dialog.textContent).toContain("29:17");
  expect(dialog.textContent).toContain("Blue Side");
  expect(dialog.textContent).toContain("Victory");
  expect(dialog.querySelector(".dialog-champion-icon")?.getAttribute("src")).toBe("https://example.test/champion.png");
});

it("ersetzt ein fehlgeschlagenes Bild durch einen Platzhalter", async () => {
  const card = document.createElement("league-stats-last-match-card");
  card.setConfig({ type: "custom:league-stats-last-match-card" });
  card.hass = { states: states() };
  document.body.append(card);
  await card.updateComplete;
  const image = card.shadowRoot.querySelector("img.portrait");
  image.dispatchEvent(new Event("error"));
  expect(image.isConnected).toBe(false);
  expect(card.shadowRoot.querySelector(".portrait-wrap .image-placeholder")).not.toBeNull();
});
