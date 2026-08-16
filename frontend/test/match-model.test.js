import { expect, it } from "vitest";
import { buildLastMatch } from "../src/match-model.js";

const prefix = "sensor.league_stats_ricoxa_1993";
const account = { id: "ricoxa_1993", label: "Ricoxa#1993", prefix };
const state = (entity_id, value, attributes = {}) => ({ entity_id, state: value, attributes });

function matchStates(result = "Defeat") {
  return {
    [`${prefix}_last_match`]: state(`${prefix}_last_match`, result, { queue: "Ranked Solo", duration: "29:17" }),
    [`${prefix}_update_status`]: state(`${prefix}_update_status`, "Up to date"),
    [`${prefix}_last_match_blue_player_1`]: state(`${prefix}_last_match_blue_player_1`, "Blue#EUW", {
      name: "Blue#EUW", kills: 6, deaths: 5, assists: 3, gold: 1800, team_id: 100, win: true,
    }),
    [`${prefix}_last_match_red_player_1`]: state(`${prefix}_last_match_red_player_1`, "Ricoxa#1993", {
      name: "Ricoxa#1993", kills: 1, deaths: 7, assists: 11, gold: 1710, team_id: 200, win: false,
    }),
    [`${prefix}_last_match_blue_dragons`]: state(`${prefix}_last_match_blue_dragons`, "5"),
    [`${prefix}_last_match_blue_barons`]: state(`${prefix}_last_match_blue_barons`, "2"),
    [`${prefix}_last_match_blue_towers`]: state(`${prefix}_last_match_blue_towers`, "11"),
  };
}

it("baut zwei Teams mit je fünf stabilen Slots", () => {
  const model = buildLastMatch(matchStates(), account);
  expect(model.status).toBe("ready");
  expect(model.blue.players).toHaveLength(5);
  expect(model.red.players).toHaveLength(5);
  expect(model.blue.players[1]).toBeNull();
  expect(model.red.players[0].own).toBe(true);
});

it("summiert KDA und Gold und liest Objectives", () => {
  const model = buildLastMatch(matchStates(), account);
  expect(model.blue).toMatchObject({ kills: 6, deaths: 5, assists: 3, gold: 1800, dragons: 5, barons: 2, towers: 11, goldDelta: 90 });
  expect(model.red.goldDelta).toBe(-90);
});

it("liefert einen Leerzustand ohne Match", () => {
  expect(buildLastMatch(matchStates("No Match"), account).status).toBe("empty");
});

it("liefert einen Fehlerzustand beim API-Fehler", () => {
  const states = matchStates();
  states[`${prefix}_update_status`].state = "Error";
  expect(buildLastMatch(states, account).status).toBe("error");
});

it("erkennt den eigenen Spieler über is_self statt über Slug-Rekonstruktion", () => {
  const states = matchStates();
  states[`${prefix}_last_match_red_player_1`].attributes.name = "Changed Name#EUW";
  states[`${prefix}_last_match_red_player_1`].attributes.is_self = true;
  expect(buildLastMatch(states, account).red.players[0].own).toBe(true);
});

it("unterscheidet Laden von einem leeren Match und erkennt unavailable als Fehler", () => {
  expect(buildLastMatch({}, account).status).toBe("loading");
  const states = matchStates();
  states[`${prefix}_update_status`].state = "unavailable";
  expect(buildLastMatch(states, account).status).toBe("error");
  const unavailableMatch = matchStates();
  unavailableMatch[`${prefix}_last_match`].state = "unavailable";
  expect(buildLastMatch(unavailableMatch, account).status).toBe("error");
});
