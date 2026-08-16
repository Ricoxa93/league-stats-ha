// frontend/src/account-discovery.js
var ANCHOR_PATTERN = /^sensor\.league_stats_(.+)_last_match$/;
function fallbackLabel(id) {
  return id.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("#");
}
function discoverAccounts(states = {}) {
  return Object.entries(states).map(([entityId, stateObj]) => {
    const match = entityId.match(ANCHOR_PATTERN);
    if (!match) return null;
    const id = match[1];
    const friendlyName = stateObj?.attributes?.friendly_name || "";
    const labelMatch = friendlyName.match(/^League Stats - (.+) Last Match$/);
    return {
      id,
      label: stateObj?.attributes?.account || labelMatch?.[1] || fallbackLabel(id),
      prefix: `sensor.league_stats_${id}`,
      anchorEntityId: entityId
    };
  }).filter(Boolean).sort((a, b) => a.label.localeCompare(b.label));
}
function resolveAccount(states = {}, configuredId) {
  const accounts = discoverAccounts(states);
  if (configuredId) {
    const account = accounts.find((candidate) => candidate.id === configuredId);
    return account ? { status: "ready", accounts, account } : { status: "configured_account_missing", accounts, account: null };
  }
  if (accounts.length === 1) return { status: "ready", accounts, account: accounts[0] };
  if (accounts.length > 1) return { status: "selection_required", accounts, account: null };
  return { status: "not_found", accounts, account: null };
}

// frontend/src/match-model.js
var number = (value) => {
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
    kills: number(a.kills),
    deaths: number(a.deaths),
    assists: number(a.assists),
    kda: number(a.kda),
    cs: number(a.cs),
    csPerMin: number(a.cs_per_min),
    gold: number(a.gold),
    damage: number(a.damage),
    visionScore: number(a.vision_score),
    killParticipation: a.kill_participation,
    win: Boolean(a.win),
    teamId: number(a.team_id),
    items: Array.isArray(a.items) ? a.items : [],
    summonerSpells: Array.isArray(a.summoner_spells) ? a.summoner_spells : [],
    primaryRune: a.primary_rune || null,
    secondaryRune: a.secondary_rune || null,
    championIcon: a.champion_icon || null,
    splash: a.splash || null,
    loading: a.loading || null
  };
}
function stateNumber(states, entityId) {
  return number(states[entityId]?.state);
}
function buildTeam(states, account, side, ownPlayerName) {
  const lower = side.toLowerCase();
  const players = Array.from({ length: 5 }, (_, index) => playerFromState(
    states[`${account.prefix}_last_match_${lower}_player_${index + 1}`],
    ownPlayerName
  ));
  const totals = players.filter(Boolean).reduce((sum, player) => ({
    kills: sum.kills + player.kills,
    deaths: sum.deaths + player.deaths,
    assists: sum.assists + player.assists,
    gold: sum.gold + player.gold
  }), { kills: 0, deaths: 0, assists: 0, gold: 0 });
  return {
    side,
    victory: players.some((player) => player?.win),
    ...totals,
    goldDelta: 0,
    dragons: stateNumber(states, `${account.prefix}_last_match_${lower}_dragons`),
    barons: stateNumber(states, `${account.prefix}_last_match_${lower}_barons`),
    towers: stateNumber(states, `${account.prefix}_last_match_${lower}_towers`),
    players
  };
}
function buildLastMatch(states = {}, account) {
  if (!account) return { status: "not_found", error: "Kein League-Stats-Konto gefunden." };
  const anchor = states[`${account.prefix}_last_match`];
  const updateStatus = states[`${account.prefix}_update_status`]?.state;
  if (["Error", "error", "unavailable"].includes(updateStatus)) return { status: "error", error: "League Stats konnten nicht aktualisiert werden." };
  if (!anchor) return { status: "loading", result: null };
  if (anchor.state === "unknown") return { status: "loading", result: anchor.state };
  if (anchor.state === "unavailable") return { status: "error", error: "Das letzte Match ist momentan nicht verf\xFCgbar." };
  if (anchor.state === "No Match") return { status: "empty", result: anchor.state };
  const blue = buildTeam(states, account, "Blue", account.label);
  const red = buildTeam(states, account, "Red", account.label);
  blue.goldDelta = blue.gold - red.gold;
  red.goldDelta = red.gold - blue.gold;
  return {
    status: "ready",
    result: anchor.state,
    ownPlayerName: account.label,
    queue: anchor.attributes?.queue || "",
    duration: anchor.attributes?.duration || "",
    blue,
    red,
    error: null
  };
}

// frontend/src/styles.js
var CARD_STYLES = `
  :host { display:block; color:var(--primary-text-color,#fff); container-type:inline-size; }
  ha-card { overflow:hidden; padding:12px; background:transparent; box-shadow:none; }
  .teams { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:24px; }
  .team { min-width:0; }
  .team-head { padding:10px 13px; border-radius:18px; margin-bottom:7px; border:1px solid; }
  .blue .team-head { background:rgba(15,34,67,.96); border-color:#1d4f91; }
  .red .team-head { background:rgba(75,10,13,.96); border-color:#8b2427; }
  .head-line { display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .team-name { font-size:20px; font-weight:900; }
  .blue .team-name { color:#60a5fa; } .red .team-name { color:#f87171; }
  .result { font-weight:900; font-size:13px; } .victory { color:#22c55e; } .defeat { color:#ef4444; }
  .objectives { display:flex; gap:11px; margin-top:5px; font-size:11px; opacity:.9; flex-wrap:wrap; }
  .player { width:100%; box-sizing:border-box; border:0; color:inherit; font:inherit; margin:0 0 7px; padding:7px 8px; border-radius:13px; display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:8px; cursor:pointer; text-align:left; }
  .blue .player { background:linear-gradient(90deg,rgba(30,64,175,.82),rgba(30,58,98,.84)); }
  .red .player { background:linear-gradient(90deg,rgba(153,27,27,.78),rgba(76,29,31,.86)); }
  .player[data-own-player="true"] { background:linear-gradient(90deg,rgba(133,92,0,.86),rgba(62,55,15,.88)); outline:1px solid #eab308; }
  .portrait-wrap { position:relative; width:43px; height:43px; }
  .portrait,.image-placeholder { width:43px; height:43px; border-radius:9px; object-fit:cover; background:#172033; display:grid; place-items:center; }
  .level { position:absolute; bottom:-3px; left:50%; transform:translateX(-50%); min-width:18px; padding:1px 4px; border-radius:5px; background:#2563a8; font-size:9px; font-weight:900; text-align:center; }
  .player-main { min-width:0; } .player-name { font-size:13px; font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .champion-role { font-size:11px; opacity:.82; }
  .player-side { display:flex; align-items:center; gap:8px; }
  .kda { font-size:14px; font-weight:900; white-space:nowrap; } .kda.good { color:#22c55e; } .kda.mid { color:#facc15; } .kda.low { color:#fb7185; }
  .inventory { display:grid; grid-template-columns:repeat(7,17px); gap:2px; }
  .extras { display:grid; grid-template-columns:repeat(2,15px); gap:2px; }
  .spell-rune { width:15px; height:15px; border-radius:3px; object-fit:cover; background:rgba(255,255,255,.10); }
  .slot { width:17px; height:17px; border-radius:3px; object-fit:cover; background:rgba(255,255,255,.10); }
  .status { padding:28px; text-align:center; border-radius:16px; background:var(--ha-card-background,var(--card-background-color,#1c1c1c)); }
  .backdrop { position:fixed; inset:0; z-index:1000; display:grid; place-items:center; padding:20px; background:rgba(0,0,0,.72); }
  .dialog { width:min(620px,100%); max-height:88vh; overflow:auto; border-radius:22px; background:linear-gradient(180deg,#281214,#0f172a); box-shadow:0 20px 70px rgba(0,0,0,.65); position:relative; }
  .dialog-splash { width:100%; height:210px; object-fit:cover; display:block; }
  .dialog-body { padding:18px 24px 26px; text-align:center; }
  .dialog-champion-icon { width:84px; height:84px; object-fit:cover; border-radius:18px; margin:-2px auto 10px; display:block; }
  .close { position:absolute; right:12px; top:12px; z-index:2; width:38px; height:38px; border:0; border-radius:50%; background:rgba(0,0,0,.66); color:white; font-size:24px; cursor:pointer; }
  .dialog-kda { font-size:42px; font-weight:900; margin:12px 0 2px; }
  .details { display:grid; grid-template-columns:1fr 1fr; gap:7px 24px; max-width:380px; margin:16px auto; text-align:left; font-size:14px; }
  .dialog-items { display:flex; justify-content:center; flex-wrap:wrap; gap:5px; }
  .dialog-items img { width:40px; height:40px; border-radius:8px; background:#111827; }
  @container (max-width:800px) { .teams { grid-template-columns:1fr; gap:14px; } }
  @container (max-width:520px) { .player { grid-template-columns:auto minmax(0,1fr); } .player-side { grid-column:2; flex-wrap:wrap; gap:4px 7px; } .kda { width:100%; } .details { grid-template-columns:1fr; } ha-card { padding:8px; } }
  @media (max-width:800px) { .teams { grid-template-columns:1fr; gap:14px; } }
`;

// frontend/src/league-stats-last-match-card-editor.js
var esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;"
})[char]);
var LeagueStatsLastMatchCardEditor = class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
  }
  connectedCallback() {
    this._render();
  }
  setConfig(config) {
    this._config = { ...config };
    this._render();
  }
  set hass(value) {
    this._hass = value;
    this._render();
  }
  get hass() {
    return this._hass;
  }
  _render() {
    if (!this.shadowRoot) return;
    const accounts = discoverAccounts(this._hass?.states || {});
    const options = accounts.map((account) => `<option value="${esc(account.id)}" ${account.id === this._config.account ? "selected" : ""}>${esc(account.label)}</option>`).join("");
    this.shadowRoot.innerHTML = `<style>:host{display:block;padding:12px 0}label{display:grid;gap:7px;font-weight:600}select{box-sizing:border-box;width:100%;padding:10px 12px;border:1px solid var(--divider-color,#777);border-radius:8px;color:var(--primary-text-color);background:var(--card-background-color,#222)}small{opacity:.72;font-weight:400}</style>
      <label>League-Konto<select><option value="">Automatisch${accounts.length === 1 ? ` (${esc(accounts[0].label)})` : ""}</option>${options}</select><small>Bei einem Konto wird es automatisch verwendet. Bei mehreren Konten bitte ausw\xE4hlen.</small></label>`;
    this.shadowRoot.querySelector("select")?.addEventListener("change", (event) => this._changed(event.target.value));
  }
  _changed(account) {
    const config = { ...this._config };
    if (account) config.account = account;
    else delete config.account;
    this._config = config;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }
};
if (!customElements.get("league-stats-last-match-card-editor")) customElements.define("league-stats-last-match-card-editor", LeagueStatsLastMatchCardEditor);

// frontend/src/league-stats-last-match-card.js
var esc2 = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;"
})[char]);
var icon = (url, className = "slot") => url ? `<img class="${className}" src="${esc2(url)}" alt="">` : `<span class="${className} image-placeholder" aria-hidden="true"></span>`;
function slots(player) {
  const urls = (player.items || []).slice(0, 7).map((item) => item?.icon);
  while (urls.length < 7) urls.push(null);
  return urls.map((url) => icon(url)).join("");
}
function kdaClass(kda) {
  return kda >= 4 ? "good" : kda >= 2 ? "mid" : "low";
}
var LeagueStatsLastMatchCard = class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._selectedPlayer = null;
    this._previousFocus = null;
    this.updateComplete = Promise.resolve();
    this._onKeyDown = (event) => {
      if (event.key === "Escape") this._closeDialog();
    };
  }
  connectedCallback() {
    window.addEventListener("keydown", this._onKeyDown);
    this._render();
  }
  disconnectedCallback() {
    window.removeEventListener("keydown", this._onKeyDown);
  }
  setConfig(config) {
    this._config = { ...config };
    this._render();
  }
  set hass(value) {
    this._hass = value;
    this._render();
  }
  get hass() {
    return this._hass;
  }
  getCardSize() {
    return 8;
  }
  getGridOptions() {
    return { columns: "full", min_columns: 6 };
  }
  static getStubConfig() {
    return {};
  }
  static getConfigElement() {
    return document.createElement("league-stats-last-match-card-editor");
  }
  _render() {
    if (!this.shadowRoot) return;
    let body;
    if (!this._hass || Object.keys(this._hass.states || {}).length === 0) {
      body = `<div class="status">League Stats werden geladen \u2026</div>`;
    } else {
      const resolution = resolveAccount(this._hass.states || {}, this._config.account);
      if (resolution.status !== "ready") {
        const messages = {
          not_found: "Keine League-Stats-Integration gefunden.",
          selection_required: "Mehrere League-Konten gefunden. Bitte im Karteneditor ein Konto ausw\xE4hlen.",
          configured_account_missing: "Das ausgew\xE4hlte League-Konto ist nicht mehr vorhanden."
        };
        body = `<div class="status">${messages[resolution.status]}</div>`;
      } else {
        const model = buildLastMatch(this._hass.states, resolution.account);
        body = model.status === "ready" ? this._teams(model) : `<div class="status">${esc2(model.error || (model.status === "empty" ? "Noch kein Match verf\xFCgbar." : "League Stats werden geladen \u2026"))}</div>`;
      }
    }
    this.shadowRoot.innerHTML = `<style>${CARD_STYLES}</style><ha-card>${body}</ha-card>${this._selectedPlayer ? this._dialog(this._selectedPlayer) : ""}`;
    this.shadowRoot.querySelectorAll("[data-player-index]").forEach((button) => button.addEventListener("click", () => this._openPlayer(button.dataset.side, Number(button.dataset.playerIndex))));
    this.shadowRoot.querySelectorAll("img").forEach((image) => image.addEventListener("error", () => {
      const placeholder = document.createElement("span");
      placeholder.className = `${image.className} image-placeholder`;
      placeholder.setAttribute("aria-hidden", "true");
      image.replaceWith(placeholder);
    }, { once: true }));
    this.shadowRoot.querySelector(".close")?.addEventListener("click", () => this._closeDialog());
    this.shadowRoot.querySelector(".backdrop")?.addEventListener("click", (event) => {
      if (event.target === event.currentTarget) this._closeDialog();
    });
    this.updateComplete = Promise.resolve();
  }
  _teams(model) {
    this._lastModel = model;
    return `<div class="teams">${this._team(model.blue)}${this._team(model.red)}</div>`;
  }
  _team(team) {
    const players = team.players.map((player, index) => player ? this._player(player, team.side, index) : `<div class="player" aria-hidden="true"></div>`).join("");
    return `<section class="team ${team.side.toLowerCase()}">
      <header class="team-head"><div class="head-line"><span class="team-name">${team.side} Team <small>(${team.kills}/${team.deaths}/${team.assists})</small></span><span class="result ${team.victory ? "victory" : "defeat"}">${team.victory ? "Victory" : "Defeat"}</span></div>
      <div class="objectives"><span>\u{1FA99} ${team.gold.toLocaleString("de-DE")} (${team.goldDelta >= 0 ? "+" : ""}${team.goldDelta.toLocaleString("de-DE")})</span><span>\u{1F409} ${team.dragons}</span><span>\u{1F451} ${team.barons}</span><span>\u{1F3F0} ${team.towers}</span></div></header>${players}</section>`;
  }
  _player(player, side, index) {
    const extras = [player.summonerSpells[0], player.summonerSpells[1], player.primaryRune, player.secondaryRune].map((entry) => icon(entry?.icon, "spell-rune")).join("");
    return `<button type="button" class="player" data-player-row data-own-player="${player.own}" data-side="${side.toLowerCase()}" data-player-index="${index}">
      <span class="portrait-wrap">${icon(player.championIcon, "portrait")}<span class="level">${esc2(player.championLevel ?? "?")}</span></span>
      <span class="player-main"><span class="player-name">${esc2(player.name)}</span><br><span class="champion-role">${esc2(player.champion)} \xB7 ${esc2(player.role)}</span></span>
      <span class="player-side"><span class="kda ${kdaClass(player.kda)}">${player.kills}/${player.deaths}/${player.assists}</span><span class="inventory">${slots(player)}</span><span class="extras">${extras}</span></span></button>`;
  }
  _openPlayer(side, index) {
    this._previousFocus = this.shadowRoot.activeElement;
    const player = this._lastModel?.[side]?.players[index] || null;
    this._selectedPlayer = player ? {
      ...player,
      side: `${side.charAt(0).toUpperCase()}${side.slice(1)} Side`,
      result: player.win ? "Victory" : "Defeat",
      queue: this._lastModel.queue,
      duration: this._lastModel.duration
    } : null;
    this._render();
    this.updateComplete.then(() => this.shadowRoot.querySelector(".close")?.focus());
  }
  _closeDialog() {
    if (!this._selectedPlayer) return;
    const previous = this._previousFocus;
    this._selectedPlayer = null;
    this._render();
    this.updateComplete.then(() => previous?.focus?.());
  }
  _dialog(player) {
    const items = [...player.items, ...player.summonerSpells, player.primaryRune, player.secondaryRune].filter(Boolean).map((item) => icon(item.icon)).join("");
    return `<div class="backdrop"><section class="dialog" role="dialog" aria-modal="true" aria-label="Details zu ${esc2(player.name)}"><button class="close" type="button" aria-label="Schlie\xDFen">\xD7</button>
      ${player.splash ? `<img class="dialog-splash" src="${esc2(player.splash)}" alt="">` : ""}<div class="dialog-body">${player.championIcon ? `<img class="dialog-champion-icon" src="${esc2(player.championIcon)}" alt="${esc2(player.champion)}">` : ""}<h2>${esc2(player.champion)} \xB7 ${esc2(player.role)}</h2><div>${esc2(player.name)}</div><div><b>${esc2(player.result)}</b> \xB7 ${esc2(player.side)} \xB7 ${esc2(player.queue)} \xB7 ${esc2(player.duration)}</div>
      <div class="dialog-kda">${player.kills}/${player.deaths}/${player.assists}</div><div>${player.kda} KDA</div>
      <div class="details"><span><b>Level:</b> ${esc2(player.championLevel)}</span><span><b>CS:</b> ${player.cs} (${player.csPerMin}/min)</span><span><b>Gold:</b> ${player.gold.toLocaleString("de-DE")}</span><span><b>Schaden:</b> ${player.damage.toLocaleString("de-DE")}</span><span><b>Vision:</b> ${player.visionScore}</span><span><b>KP:</b> ${esc2(player.killParticipation ?? "\u2013")}%</span></div>
      <div class="dialog-items">${items || "Keine Itemdaten"}</div></div></section></div>`;
  }
};
if (!customElements.get("league-stats-last-match-card")) customElements.define("league-stats-last-match-card", LeagueStatsLastMatchCard);
window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === "league-stats-last-match-card")) window.customCards.push({
  type: "league-stats-last-match-card",
  name: "League Stats \u2013 Letztes Match",
  preview: true,
  description: "Zeigt beide Teams des letzten League-of-Legends-Matches.",
  documentationURL: "https://github.com/Ricoxa93/league-stats-ha"
});
export {
  LeagueStatsLastMatchCard
};
