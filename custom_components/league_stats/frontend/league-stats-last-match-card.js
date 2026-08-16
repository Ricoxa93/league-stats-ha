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
  .teams { width:min(100%,1120px); margin:0 auto; display:grid; grid-template-columns:minmax(390px,1fr) minmax(390px,1fr); gap:24px; }
  .team { min-width:0; }
  .team-head { padding:10px 13px; border-radius:18px; margin-bottom:7px; border:1px solid; }
  .blue .team-head { background:rgba(15,34,67,.96); border-color:#1d4f91; }
  .red .team-head { background:rgba(75,10,13,.96); border-color:#8b2427; }
  .head-line { display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .team-name { font-size:20px; line-height:1.05; font-weight:900; letter-spacing:-.25px; }
  .team-name small { font-size:12px; letter-spacing:0; }
  .blue .team-name { color:#60a5fa; } .red .team-name { color:#f87171; }
  .result { font-weight:900; font-size:18px; line-height:1; } .victory { color:#22c55e; } .defeat { color:#ef4444; }
  .objectives { display:flex; align-items:center; gap:14px; margin-top:8px; font-size:13px; font-weight:800; opacity:.96; flex-wrap:wrap; }
  .objective { display:inline-flex; align-items:center; gap:3px; }
  .objective-svg { flex:none; }
  .gold { gap:5px; font-size:15px; font-weight:900; }
  .gold-delta { font-size:13px; font-weight:900; } .gold-delta.positive { color:#22c55e; } .gold-delta.negative { color:#ef4444; }
  .player { width:100%; min-height:58px; box-sizing:border-box; border:0; color:inherit; font:inherit; margin:0 0 7px; padding:6px 8px; border-radius:13px; display:grid; grid-template-areas:"portrait identity abilities combat" "portrait inventory abilities combat"; grid-template-columns:43px minmax(0,1fr) 39px 68px; grid-template-rows:minmax(20px,auto) 17px; align-items:center; column-gap:7px; row-gap:3px; cursor:pointer; text-align:left; }
  .blue .player { background:linear-gradient(90deg,rgba(30,64,175,.82),rgba(30,58,98,.84)); }
  .red .player { background:linear-gradient(90deg,rgba(153,27,27,.78),rgba(76,29,31,.86)); }
  .player[data-own-player="true"] { background:linear-gradient(90deg,rgba(133,92,0,.86),rgba(62,55,15,.88)); outline:1px solid #eab308; }
  .portrait-wrap { grid-area:portrait; position:relative; width:43px; height:43px; }
  .portrait,.image-placeholder { width:43px; height:43px; border-radius:9px; object-fit:cover; background:#172033; display:grid; place-items:center; }
  .level { position:absolute; bottom:-3px; left:50%; transform:translateX(-50%); min-width:18px; padding:1px 4px; border-radius:5px; background:#2563a8; font-size:9px; font-weight:900; text-align:center; }
  .player-main { min-width:0; line-height:1.12; }
  .player-identity { grid-area:identity; min-width:0; align-self:end; display:flex; flex-direction:column; }
  .player-name { font-size:14px; font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .champion-role { margin-top:3px; font-size:12px; font-weight:650; opacity:.9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .kda-block { line-height:1.05; }
  .player-combat { grid-area:combat; align-self:stretch; min-width:0; display:flex; flex-direction:column; align-items:flex-end; justify-content:space-between; text-align:right; padding-left:7px; border-left:1px solid rgba(255,255,255,.22); }
  .kda { font-size:18px; font-weight:900; white-space:nowrap; } .kda.good { color:#22c55e; } .kda.mid { color:#facc15; } .kda.low { color:#fb7185; }
  .kda-ratio { margin-top:4px; font-size:12px; opacity:.86; white-space:nowrap; }
  .inventory { display:grid; grid-template-columns:repeat(7,17px); gap:2px; }
  .player-inventory { grid-area:inventory; justify-self:start; align-self:end; min-width:0; }
  .abilities-group { display:grid; grid-template-rows:repeat(2,15px); gap:2px; padding-left:5px; border-left:1px solid rgba(255,255,255,.22); }
  .player-abilities { grid-area:abilities; align-self:stretch; box-sizing:border-box; align-content:space-between; }
  .spells-row,.runes-row { display:grid; grid-template-columns:repeat(2,15px); gap:2px; }
  .spell-rune { width:15px; height:15px; border-radius:3px; object-fit:cover; background:rgba(255,255,255,.10); }
  .slot { width:17px; height:17px; border-radius:3px; object-fit:cover; background:rgba(255,255,255,.10); }
  .teams.single-team { width:100%; max-width:620px; grid-template-columns:minmax(0,1fr); }
  .single-team .player,.single-team .red .player { min-height:82px; padding:8px 10px; grid-template-areas:"portrait identity abilities combat" "portrait inventory abilities combat"; grid-template-columns:56px minmax(0,1fr) 64px 92px; grid-template-rows:minmax(25px,auto) 26px; column-gap:9px; row-gap:5px; }
  .single-team .portrait-wrap { width:56px; height:56px; }
  .single-team .portrait,.single-team .portrait-wrap>.image-placeholder { width:56px; height:56px; border-radius:11px; }
  .single-team .level { font-size:10px; min-width:20px; }
  .single-team .player-name { font-size:16px; }
  .single-team .champion-role { font-size:13px; }
  .single-team .kda { font-size:20px; }
  .single-team .kda-ratio { font-size:13px; }
  .single-team .inventory { grid-template-columns:repeat(7,26px); gap:3px; }
  .single-team .abilities-group { grid-template-rows:repeat(2,24px); gap:3px; padding-left:10px; }
  .single-team .spells-row,.single-team .runes-row { grid-template-columns:repeat(2,24px); gap:3px; }
  .single-team .slot { width:26px; height:26px; border-radius:5px; }
  .single-team .spell-rune { width:24px; height:24px; border-radius:5px; }
  .status { padding:28px; text-align:center; border-radius:16px; background:var(--ha-card-background,var(--card-background-color,#1c1c1c)); }
  .backdrop { position:fixed; inset:0; z-index:1000; display:grid; place-items:center; padding:20px; background:rgba(0,0,0,.72); }
  .dialog { width:min(620px,100%); max-height:88vh; overflow:auto; border-radius:22px; background:linear-gradient(180deg,#281214,#0f172a); box-shadow:0 20px 70px rgba(0,0,0,.65); position:relative; }
  .dialog-splash { width:100%; height:210px; object-fit:cover; display:block; }
  .dialog-body { padding:18px 28px 28px; text-align:center; font-size:14px; line-height:1.4; }
  .dialog-hero h2 { margin:8px 0 3px; font-size:24px; }
  .dialog-player-name { font-size:16px; font-weight:800; }
  .dialog-context { margin-top:4px; opacity:.86; }
  .dialog-champion-icon { width:84px; height:84px; object-fit:cover; border-radius:18px; margin:-2px auto 10px; display:block; }
  .close { position:absolute; right:12px; top:12px; z-index:2; width:38px; height:38px; border:0; border-radius:50%; background:rgba(0,0,0,.66); color:white; font-size:24px; cursor:pointer; }
  .dialog-combat { margin:16px auto 14px; }
  .dialog-kda { font-size:44px; line-height:1; font-weight:900; }
  .dialog-kda.good { color:#22c55e; } .dialog-kda.mid { color:#facc15; } .dialog-kda.low { color:#fb7185; }
  .dialog-kda-ratio { margin-top:5px; font-size:16px; font-weight:800; }
  .dialog-stats { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; max-width:500px; margin:0 auto 18px; text-align:left; }
  .dialog-stat { min-width:0; padding:9px 12px; border:1px solid rgba(255,255,255,.10); border-radius:11px; background:rgba(255,255,255,.055); display:flex; align-items:baseline; justify-content:space-between; gap:10px; }
  .stat-label { font-size:12px; font-weight:700; opacity:.72; }
  .stat-value { min-width:0; font-size:16px; text-align:right; overflow-wrap:anywhere; }
  .stat-value small { font-size:11px; opacity:.75; white-space:nowrap; }
  .dialog-loadout { display:flex; align-items:flex-end; justify-content:center; gap:14px; padding-top:16px; border-top:1px solid rgba(255,255,255,.12); }
  .dialog-inventory { display:grid; grid-template-columns:repeat(7,40px); gap:5px; }
  .dialog-inventory .slot { width:40px; height:40px; border-radius:8px; }
  .dialog-abilities { display:grid; grid-template-rows:repeat(2,40px); gap:5px; padding-left:14px; border-left:1px solid rgba(255,255,255,.22); }
  .dialog-abilities .spells-row,.dialog-abilities .runes-row { grid-template-columns:repeat(2,40px); gap:5px; }
  .dialog-abilities .spell-rune { width:40px; height:40px; border-radius:8px; }
  @container (max-width:840px) { .teams { width:100%; grid-template-columns:1fr; gap:14px; } }
  @container (max-width:520px) { .player,.red .player,.single-team .player,.single-team .red .player { min-height:68px; grid-template-areas:"portrait identity abilities combat" "portrait inventory abilities combat"; grid-template-columns:43px minmax(0,1fr) 44px 72px; grid-template-rows:minmax(22px,auto) 20px; column-gap:6px; row-gap:4px; padding:6px 7px; } .single-team .portrait-wrap { width:43px; height:43px; } .single-team .portrait,.single-team .portrait-wrap>.image-placeholder { width:43px; height:43px; border-radius:9px; } .single-team .player-name { font-size:14px; } .single-team .champion-role { font-size:12px; } .single-team .kda { font-size:18px; } .single-team .kda-ratio { font-size:12px; } .single-team .inventory { grid-template-columns:repeat(7,20px); gap:2px; } .single-team .slot { width:20px; height:20px; } .single-team .abilities-group { grid-template-rows:repeat(2,20px); gap:2px; padding-left:5px; } .single-team .spells-row,.single-team .runes-row { grid-template-columns:repeat(2,20px); gap:2px; } .single-team .spell-rune { width:20px; height:20px; } .dialog-body { padding:16px; } .dialog-stats { grid-template-columns:1fr; } .dialog-loadout { flex-wrap:wrap; } .dialog-inventory { grid-template-columns:repeat(7,34px); gap:3px; } .dialog-inventory .slot { width:34px; height:34px; } .dialog-abilities { grid-template-rows:repeat(2,34px); padding-left:0; border-left:0; } .dialog-abilities .spells-row,.dialog-abilities .runes-row { grid-template-columns:repeat(2,34px); } .dialog-abilities .spell-rune { width:34px; height:34px; } ha-card { padding:8px; } }
  @container (max-width:390px) { .single-team .player,.single-team .red .player { grid-template-columns:43px minmax(0,1fr) 39px 68px; } .single-team .inventory { grid-template-columns:repeat(7,17px); gap:2px; } .single-team .slot { width:17px; height:17px; } .single-team .abilities-group { grid-template-rows:repeat(2,18px); } .single-team .spells-row,.single-team .runes-row { grid-template-columns:repeat(2,18px); } .single-team .spell-rune { width:18px; height:18px; } }
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
    this.shadowRoot.innerHTML = `<style>:host{display:grid;gap:16px;padding:12px 0}label{display:grid;gap:7px;font-weight:600}select{box-sizing:border-box;width:100%;padding:10px 12px;border:1px solid var(--divider-color,#777);border-radius:8px;color:var(--primary-text-color);background:var(--card-background-color,#222)}small{opacity:.72;font-weight:400}</style>
      <label>League-Konto<select data-config="account"><option value="">Automatisch${accounts.length === 1 ? ` (${esc(accounts[0].label)})` : ""}</option>${options}</select><small>Bei einem Konto wird es automatisch verwendet. Bei mehreren Konten bitte ausw\xE4hlen.</small></label>
      <label>Darstellung<select data-config="team"><option value="" ${!this._config.team ? "selected" : ""}>Beide Teams</option><option value="blue" ${this._config.team === "blue" ? "selected" : ""}>Blue Team</option><option value="red" ${this._config.team === "red" ? "selected" : ""}>Red Team</option></select><small>Mit zwei einzelnen Teamkarten kann Home Assistant sie auf Desktop nebeneinander und mobil untereinander anordnen.</small></label>`;
    this.shadowRoot.querySelector('[data-config="account"]')?.addEventListener("change", (event) => this._changed("account", event.target.value));
    this.shadowRoot.querySelector('[data-config="team"]')?.addEventListener("change", (event) => this._changed("team", event.target.value));
  }
  _changed(key, value) {
    const config = { ...this._config };
    if (value) config[key] = value;
    else delete config[key];
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
var OBJECTIVE_PATHS = {
  dragon: "M8 0 6 4 3 1v4H0l3 3v3l4 5h2l4-5V8l3-3h-3V1l-3 3zm1 11 1-2 2-1-1 2zM4 8l1 2 2 1-1-2z",
  baron: "M9 10a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7 8a1 1 0 1 1 2 0 1 1 0 0 1-2 0m0 4a1 1 0 1 1 2 0 1 1 0 0 1-2 0m-2-2a1 1 0 1 1 2 0 1 1 0 0 1-2 0m5-10 2 4-1 1H9L8 4 7 5H5L4 4l2-4-6 4 2 4 3 8 1-1h4l1 1 3-8 2-4z",
  tower: "m12 8-2 8H6L4 8l4 4zM8 0l4 4-1.003 1.002L11 5h3l-6 6-6-6h2.999L4 4zm0 2.4L6.4 4 8 5.6 9.6 4z"
};
function objectiveIcon(name, color) {
  if (name === "gold") return `<svg class="objective-svg" data-objective="gold" width="16" height="16" viewBox="0 0 16 16" fill="${color}" aria-hidden="true">
    <path d="M8 1.5c3.3 0 6 1.2 6 2.7v1.4c0 1.5-2.7 2.7-6 2.7S2 7.1 2 5.6V4.2c0-1.5 2.7-2.7 6-2.7z"/>
    <path opacity=".75" d="M2 5.6c0 1.5 2.7 2.7 6 2.7s6-1.2 6-2.7v2.1c0 1.5-2.7 2.7-6 2.7S2 9.2 2 7.7z"/>
    <path opacity=".55" d="M2 7.7c0 1.5 2.7 2.7 6 2.7s6-1.2 6-2.7v2.1c0 1.5-2.7 2.7-6 2.7s-6-1.2-6-2.7z"/>
    <path fill="#ffffff" opacity=".35" d="M8 2.5c2.4 0 4.4.7 4.4 1.6S10.4 5.7 8 5.7 3.6 5 3.6 4.1 5.6 2.5 8 2.5z"/>
  </svg>`;
  return `<svg class="objective-svg" data-objective="${name}" width="16" height="16" viewBox="0 0 16 16" fill="${color}" aria-hidden="true"><path d="${OBJECTIVE_PATHS[name]}"></path></svg>`;
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
    const selected = ["blue", "red"].includes(this._config.team) ? this._config.team : null;
    const teams = selected ? [model[selected]] : [model.blue, model.red];
    return `<div class="teams${selected ? " single-team" : ""}">${teams.map((team) => this._team(team)).join("")}</div>`;
  }
  _team(team) {
    const teamColor = team.side === "Blue" ? "#60a5fa" : "#f87171";
    const players = team.players.map((player, index) => player ? this._player(player, team.side, index) : `<div class="player" aria-hidden="true"></div>`).join("");
    return `<section class="team ${team.side.toLowerCase()}">
      <header class="team-head"><div class="head-line"><span class="team-name">${team.side} Team <small>(${team.kills}/${team.deaths}/${team.assists})</small></span><span class="result ${team.victory ? "victory" : "defeat"}">${team.victory ? "Victory" : "Defeat"}</span></div>
      <div class="objectives"><span class="objective gold">${objectiveIcon("gold", teamColor)}<span>${team.gold.toLocaleString("de-DE")}</span><span class="gold-delta ${team.goldDelta >= 0 ? "positive" : "negative"}">(${team.goldDelta >= 0 ? "+" : ""}${team.goldDelta.toLocaleString("de-DE")})</span></span><span class="objective">${objectiveIcon("dragon", teamColor)}${team.dragons}</span><span class="objective">${objectiveIcon("baron", teamColor)}${team.barons}</span><span class="objective">${objectiveIcon("tower", teamColor)}${team.towers}</span></div></header>${players}</section>`;
  }
  _player(player, side, index) {
    const spells = [player.summonerSpells[0], player.summonerSpells[1]].map((entry) => icon(entry?.icon, "spell-rune")).join("");
    const runes = [player.primaryRune, player.secondaryRune].map((entry) => icon(entry?.icon, "spell-rune")).join("");
    return `<button type="button" class="player" data-player-row data-own-player="${player.own}" data-side="${side.toLowerCase()}" data-player-index="${index}">
      <span class="portrait-wrap">${icon(player.championIcon, "portrait")}<span class="level">${esc2(player.championLevel ?? "?")}</span></span>
      <span class="player-identity player-main"><span class="player-name">${esc2(player.name)}</span><span class="champion-role">${esc2(player.champion)} \xB7 ${esc2(player.role)}</span></span>
      <span class="player-inventory inventory items-group">${slots(player)}</span>
      <span class="player-abilities abilities-group"><span class="spells-row">${spells}</span><span class="runes-row">${runes}</span></span>
      <span class="player-combat kda-block"><span class="kda ${kdaClass(player.kda)}">${player.kills}/${player.deaths}/${player.assists}</span><span class="kda-ratio">${player.kda.toLocaleString("de-DE")} KDA</span></span></button>`;
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
    const spells = [player.summonerSpells[0], player.summonerSpells[1]].map((entry) => icon(entry?.icon, "spell-rune")).join("");
    const runes = [player.primaryRune, player.secondaryRune].map((entry) => icon(entry?.icon, "spell-rune")).join("");
    return `<div class="backdrop"><section class="dialog" role="dialog" aria-modal="true" aria-label="Details zu ${esc2(player.name)}"><button class="close" type="button" aria-label="Schlie\xDFen">\xD7</button>
      ${player.splash ? `<img class="dialog-splash" src="${esc2(player.splash)}" alt="">` : ""}<div class="dialog-body">
      <div class="dialog-hero">${player.championIcon ? `<img class="dialog-champion-icon" src="${esc2(player.championIcon)}" alt="${esc2(player.champion)}">` : ""}<h2>${esc2(player.champion)} \xB7 ${esc2(player.role)}</h2><div class="dialog-player-name">${esc2(player.name)}</div><div class="dialog-context"><b>${esc2(player.result)}</b> \xB7 ${esc2(player.side)} \xB7 ${esc2(player.queue)} \xB7 ${esc2(player.duration)}</div></div>
      <div class="dialog-combat"><div class="dialog-kda ${kdaClass(player.kda)}">${player.kills}/${player.deaths}/${player.assists}</div><div class="dialog-kda-ratio">${player.kda.toLocaleString("de-DE")} KDA</div></div>
      <div class="dialog-stats">
        <div class="dialog-stat"><span class="stat-label">Level</span><strong class="stat-value">${esc2(player.championLevel)}</strong></div>
        <div class="dialog-stat"><span class="stat-label">CS</span><strong class="stat-value">${player.cs} <small>(${player.csPerMin}/min)</small></strong></div>
        <div class="dialog-stat"><span class="stat-label">Gold</span><strong class="stat-value">${player.gold.toLocaleString("de-DE")}</strong></div>
        <div class="dialog-stat"><span class="stat-label">Schaden</span><strong class="stat-value">${player.damage.toLocaleString("de-DE")}</strong></div>
        <div class="dialog-stat"><span class="stat-label">Vision</span><strong class="stat-value">${player.visionScore}</strong></div>
        <div class="dialog-stat"><span class="stat-label">Kill-Beteiligung</span><strong class="stat-value">${esc2(player.killParticipation ?? "\u2013")}%</strong></div>
      </div>
      <div class="dialog-loadout"><div class="dialog-inventory">${slots(player)}</div><div class="dialog-abilities"><div class="spells-row">${spells}</div><div class="runes-row">${runes}</div></div></div>
      </div></section></div>`;
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
