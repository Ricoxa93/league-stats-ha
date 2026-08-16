import { expect, it } from "vitest";
import { buildLastMatch } from "../src/match-model.js";

it("verarbeitet die reale Gartenhaus-Entity-Struktur", () => {
  const prefix = "sensor.league_stats_ricoxa_1993";
  const states = {
    [`${prefix}_last_match`]: { entity_id: `${prefix}_last_match`, state: "Defeat", attributes: { friendly_name: "League Stats - Ricoxa#1993 Last Match", queue: "Ranked Solo", duration: "37:20" } },
    [`${prefix}_update_status`]: { entity_id: `${prefix}_update_status`, state: "Up to date", attributes: {} },
  };
  const champions = ["Yorick", "Twitch", "Veigar", "Vayne", "TahmKench", "Fiora", "Ekko", "Katarina", "Jinx", "Sona"];
  for (const [teamIndex, side] of ["blue", "red"].entries()) {
    for (let index = 1; index <= 5; index += 1) {
      const name = side === "red" && index === 5 ? "Ricoxa#1993" : `Player${teamIndex * 5 + index}#EUW`;
      const entityId = `${prefix}_last_match_${side}_player_${index}`;
      states[entityId] = { entity_id: entityId, state: name, attributes: {
        name, champion: champions[teamIndex * 5 + index - 1], champion_level: 16,
        role: ["Top", "Jungle", "Mid", "Bot", "Support"][index - 1],
        kills: index, deaths: index + 1, assists: 11, kda: 1.71, gold: 10000 + index,
        win: side === "blue", team_id: side === "blue" ? 100 : 200,
        items: [{ id: 3009, icon: "https://ddragon.example/item.png" }],
        summoner_spells: [{ id: 4, icon: "https://ddragon.example/spell.png" }],
        primary_rune: { id: 8214, icon: "https://ddragon.example/rune.png" },
        secondary_rune: null, champion_icon: null, splash: null,
      } };
    }
  }
  const model = buildLastMatch(states, { id: "ricoxa_1993", label: "Ricoxa#1993", prefix });
  expect(model.status).toBe("ready");
  expect(model.blue.players.filter(Boolean)).toHaveLength(5);
  expect(model.red.players.filter(Boolean)).toHaveLength(5);
  expect(model.red.players[4]).toMatchObject({ own: true, champion: "Sona", role: "Support" });
});
