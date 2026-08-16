import { beforeEach, expect, it, vi } from "vitest";
import "../src/league-stats-last-match-card-editor.js";
import "../src/league-stats-last-match-card.js";

const state = (entity_id, attributes = {}) => ({ entity_id, state: "Defeat", attributes });

beforeEach(() => { document.body.innerHTML = ""; });

it("zeigt mehrere Konten und speichert die Auswahl", () => {
  const editor = document.createElement("league-stats-last-match-card-editor");
  editor.setConfig({ type: "custom:league-stats-last-match-card" });
  editor.hass = { states: {
    "sensor.league_stats_ricoxa_1993_last_match": state("sensor.league_stats_ricoxa_1993_last_match", { friendly_name: "League Stats - Ricoxa#1993 Last Match" }),
    "sensor.league_stats_other_euw_last_match": state("sensor.league_stats_other_euw_last_match", { friendly_name: "League Stats - Other#EUW Last Match" }),
  } };
  document.body.append(editor);
  const listener = vi.fn();
  editor.addEventListener("config-changed", listener);
  const select = editor.shadowRoot.querySelector("select");
  expect(select.options).toHaveLength(3);
  select.value = "ricoxa_1993";
  select.dispatchEvent(new Event("change", { bubbles: true }));
  expect(listener).toHaveBeenCalledOnce();
  expect(listener.mock.calls[0][0].detail.config.account).toBe("ricoxa_1993");
  expect(listener.mock.calls[0][0].composed).toBe(true);
});

it("entfernt die Kontoauswahl bei Automatisch", () => {
  const editor = document.createElement("league-stats-last-match-card-editor");
  editor.setConfig({ type: "custom:league-stats-last-match-card", account: "ricoxa_1993" });
  editor.hass = { states: {} };
  document.body.append(editor);
  const listener = vi.fn();
  editor.addEventListener("config-changed", listener);
  const select = editor.shadowRoot.querySelector("select");
  select.value = "";
  select.dispatchEvent(new Event("change", { bubbles: true }));
  expect(listener.mock.calls[0][0].detail.config.account).toBeUndefined();
});

it("registriert die Karte genau einmal im Picker", () => {
  expect(window.customCards.filter((card) => card.type === "league-stats-last-match-card")).toHaveLength(1);
});
