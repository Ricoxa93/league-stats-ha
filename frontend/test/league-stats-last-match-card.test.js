import { beforeEach, expect, it } from "vitest";
import "../src/league-stats-last-match-card.js";
import { CARD_STYLES } from "../src/styles.js";

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
  ["blue", { columns: "full", min_columns: 6 }],
  ["red", { columns: "full", min_columns: 6 }],
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
    expect([...row.children].map((node) => node.classList[0])).toEqual([
      "portrait-wrap", "player-identity", "player-inventory", "player-abilities", "player-combat",
    ]);
    expect(row.querySelectorAll(".player-inventory .slot")).toHaveLength(7);
    expect(row.querySelectorAll(".player-abilities .spells-row .spell-rune")).toHaveLength(2);
    expect(row.querySelectorAll(".player-abilities .runes-row .spell-rune")).toHaveLength(2);
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

it("verwendet die exakten SVG-Symbole der alten Teamübersicht für die Objectives", async () => {
  const card = document.createElement("league-stats-last-match-card");
  card.setConfig({ type: "custom:league-stats-last-match-card", team: "blue" });
  card.hass = { states: states() };
  document.body.append(card);
  await card.updateComplete;
  const svgs = [...card.shadowRoot.querySelectorAll(".objective-svg")];
  expect(svgs).toHaveLength(4);
  expect(svgs.every((svg) => svg.getAttribute("fill") === "#60a5fa")).toBe(true);
  expect([...card.shadowRoot.querySelectorAll('[data-objective="gold"] path')].map((path) => path.getAttribute("d"))).toEqual([
    "M8 1.5c3.3 0 6 1.2 6 2.7v1.4c0 1.5-2.7 2.7-6 2.7S2 7.1 2 5.6V4.2c0-1.5 2.7-2.7 6-2.7z",
    "M2 5.6c0 1.5 2.7 2.7 6 2.7s6-1.2 6-2.7v2.1c0 1.5-2.7 2.7-6 2.7S2 9.2 2 7.7z",
    "M2 7.7c0 1.5 2.7 2.7 6 2.7s6-1.2 6-2.7v2.1c0 1.5-2.7 2.7-6 2.7s-6-1.2-6-2.7z",
    "M8 2.5c2.4 0 4.4.7 4.4 1.6S10.4 5.7 8 5.7 3.6 5 3.6 4.1 5.6 2.5 8 2.5z",
  ]);
  expect(card.shadowRoot.querySelector('[data-objective="dragon"] path')?.getAttribute("d"))
    .toBe("M8 0 6 4 3 1v4H0l3 3v3l4 5h2l4-5V8l3-3h-3V1l-3 3zm1 11 1-2 2-1-1 2zM4 8l1 2 2 1-1-2z");
  expect(card.shadowRoot.querySelector('[data-objective="baron"] path')?.getAttribute("d"))
    .toBe("M9 10a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7 8a1 1 0 1 1 2 0 1 1 0 0 1-2 0m0 4a1 1 0 1 1 2 0 1 1 0 0 1-2 0m-2-2a1 1 0 1 1 2 0 1 1 0 0 1-2 0m5-10 2 4-1 1H9L8 4 7 5H5L4 4l2-4-6 4 2 4 3 8 1-1h4l1 1 3-8 2-4z");
  expect(card.shadowRoot.querySelector('[data-objective="tower"] path')?.getAttribute("d"))
    .toBe("m12 8-2 8H6L4 8l4 4zM8 0l4 4-1.003 1.002L11 5h3l-6 6-6-6h2.999L4 4zm0 2.4L6.4 4 8 5.6 9.6 4z");
});

it("färbt die alten Objective-SVGs im Red Team rot", async () => {
  const card = document.createElement("league-stats-last-match-card");
  card.setConfig({ type: "custom:league-stats-last-match-card", team: "red" });
  card.hass = { states: states() };
  document.body.append(card);
  await card.updateComplete;
  expect([...card.shadowRoot.querySelectorAll(".objective-svg")].every((svg) => svg.getAttribute("fill") === "#f87171")).toBe(true);
});

it("ordnet Spielerinhalte in einem festen Vier-Spalten-Raster an", () => {
  expect(CARD_STYLES).toMatch(/\.player-name\s*\{[^}]*font-size:14px/);
  expect(CARD_STYLES).toMatch(/\.champion-role\s*\{[^}]*font-size:12px/);
  expect(CARD_STYLES).toMatch(/\.kda\s*\{[^}]*font-size:18px/);
  expect(CARD_STYLES).toContain('"portrait identity abilities combat"');
  expect(CARD_STYLES).toContain('"portrait inventory abilities combat"');
  expect(CARD_STYLES).toMatch(/\.player-identity\s*\{[^}]*grid-area:identity/);
  expect(CARD_STYLES).toMatch(/\.player-inventory\s*\{[^}]*grid-area:inventory/);
  expect(CARD_STYLES).toMatch(/\.player-abilities\s*\{[^}]*grid-area:abilities/);
  expect(CARD_STYLES).toMatch(/\.player-combat\s*\{[^}]*grid-area:combat/);
  expect(CARD_STYLES).toMatch(/@container \(max-width:390px\)[\s\S]*\.single-team \.inventory\s*\{[^}]*repeat\(7,17px\)/);
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
  expect(row.querySelectorAll(".items-group .slot")).toHaveLength(7);
  expect(row.querySelectorAll(".spells-row .spell-rune")).toHaveLength(2);
  expect(row.querySelectorAll(".runes-row .spell-rune")).toHaveLength(2);
  expect(row.querySelector(".spells-row").compareDocumentPosition(row.querySelector(".runes-row")) & 4).toBeTruthy();
  row.click();
  const dialog = card.shadowRoot.querySelector('[role="dialog"]');
  expect(dialog.textContent).toContain("Ranked Solo");
  expect(dialog.textContent).toContain("29:17");
  expect(dialog.textContent).toContain("Blue Side");
  expect(dialog.textContent).toContain("Victory");
  expect(dialog.querySelector(".dialog-champion-icon")?.getAttribute("src")).toBe("https://example.test/champion.png");
  expect(dialog.querySelectorAll(".dialog-stat")).toHaveLength(6);
  expect(dialog.querySelector(".dialog-inventory")).not.toBeNull();
  expect(dialog.querySelector(".dialog-abilities .spells-row")).not.toBeNull();
  expect(dialog.querySelector(".dialog-abilities .runes-row")).not.toBeNull();
  expect(dialog.querySelectorAll(".dialog-inventory .slot")).toHaveLength(7);
  expect(CARD_STYLES).toMatch(/\.dialog-stats\s*\{[^}]*grid-template-columns:repeat\(2,/);
  expect(CARD_STYLES).toMatch(/@container \(max-width:520px\)[\s\S]*\.dialog-stats\s*\{[^}]*grid-template-columns:1fr/);
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
