import { expect, it } from "vitest";
import { discoverAccounts, resolveAccount } from "../src/account-discovery.js";

const state = (entity_id, value, attributes = {}) => ({ entity_id, state: value, attributes });

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

it("meldet ein entferntes konfiguriertes Konto", () => {
  expect(resolveAccount({}, "ricoxa_1993").status).toBe("configured_account_missing");
});

it("verwendet den stabilen Kontonamen aus den Sensorattributen", () => {
  const states = {
    "sensor.league_stats_my_name_euw_last_match": state(
      "sensor.league_stats_my_name_euw_last_match", "Victory", { account: "My Name#EUW" },
    ),
  };
  expect(discoverAccounts(states)[0].label).toBe("My Name#EUW");
});
