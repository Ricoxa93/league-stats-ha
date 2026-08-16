const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function playerFromState(stateObj, ownPlayerName) {
  if (!stateObj || ["Unavailable", "unknown", "unavailable"].includes(stateObj.state)) return null;
  const a = stateObj.attributes || {};
  return {
    entityId: stateObj.entity_id,
    name: a.name || stateObj.state || "Unknown",
    own: a.is_self === true || (a.name || stateObj.state) === ownPlayerName,
    champion: a.champion || "Unknown",
    championLevel: a.champion_level,
    role: a.role || "",
    kills: number(a.kills), deaths: number(a.deaths), assists: number(a.assists), kda: number(a.kda),
    cs: number(a.cs), csPerMin: number(a.cs_per_min), gold: number(a.gold), damage: number(a.damage),
    visionScore: number(a.vision_score), killParticipation: a.kill_participation,
    win: Boolean(a.win), teamId: number(a.team_id), items: Array.isArray(a.items) ? a.items : [],
    summonerSpells: Array.isArray(a.summoner_spells) ? a.summoner_spells : [],
    primaryRune: a.primary_rune || null, secondaryRune: a.secondary_rune || null,
    championIcon: a.champion_icon || null, splash: a.splash || null, loading: a.loading || null,
  };
}

function stateNumber(states, entityId) {
  return number(states[entityId]?.state);
}

function buildTeam(states, account, side, ownPlayerName) {
  const lower = side.toLowerCase();
  const players = Array.from({ length: 5 }, (_, index) => playerFromState(
    states[`${account.prefix}_last_match_${lower}_player_${index + 1}`], ownPlayerName,
  ));
  const totals = players.filter(Boolean).reduce((sum, player) => ({
    kills: sum.kills + player.kills,
    deaths: sum.deaths + player.deaths,
    assists: sum.assists + player.assists,
    gold: sum.gold + player.gold,
  }), { kills: 0, deaths: 0, assists: 0, gold: 0 });
  return {
    side, victory: players.some((player) => player?.win), ...totals, goldDelta: 0,
    dragons: stateNumber(states, `${account.prefix}_last_match_${lower}_dragons`),
    barons: stateNumber(states, `${account.prefix}_last_match_${lower}_barons`),
    towers: stateNumber(states, `${account.prefix}_last_match_${lower}_towers`), players,
  };
}

export function buildLastMatch(states = {}, account) {
  if (!account) return { status: "not_found", error: "Kein League-Stats-Konto gefunden." };
  const anchor = states[`${account.prefix}_last_match`];
  const updateStatus = states[`${account.prefix}_update_status`]?.state;
  if (["Error", "error", "unavailable"].includes(updateStatus)) return { status: "error", error: "League Stats konnten nicht aktualisiert werden." };
  if (!anchor) return { status: "loading", result: null };
  if (anchor.state === "unknown") return { status: "loading", result: anchor.state };
  if (anchor.state === "unavailable") return { status: "error", error: "Das letzte Match ist momentan nicht verfügbar." };
  if (anchor.state === "No Match") return { status: "empty", result: anchor.state };
  const blue = buildTeam(states, account, "Blue", account.label);
  const red = buildTeam(states, account, "Red", account.label);
  blue.goldDelta = blue.gold - red.gold;
  red.goldDelta = red.gold - blue.gold;
  return {
    status: "ready", result: anchor.state, ownPlayerName: account.label,
    queue: anchor.attributes?.queue || "", duration: anchor.attributes?.duration || "",
    blue, red, error: null,
  };
}
