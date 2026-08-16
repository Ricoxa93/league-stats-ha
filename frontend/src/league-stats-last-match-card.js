import { resolveAccount } from "./account-discovery.js";
import { buildLastMatch } from "./match-model.js";
import { CARD_STYLES } from "./styles.js";
import "./league-stats-last-match-card-editor.js";

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
}[char]));

const icon = (url, className = "slot") => url
  ? `<img class="${className}" src="${esc(url)}" alt="">`
  : `<span class="${className} image-placeholder" aria-hidden="true"></span>`;

function slots(player) {
  const urls = (player.items || []).slice(0, 7).map((item) => item?.icon);
  while (urls.length < 7) urls.push(null);
  return urls.map((url) => icon(url)).join("");
}

function kdaClass(kda) { return kda >= 4 ? "good" : kda >= 2 ? "mid" : "low"; }

const OBJECTIVE_PATHS = {
  dragon: "M8 0 6 4 3 1v4H0l3 3v3l4 5h2l4-5V8l3-3h-3V1l-3 3zm1 11 1-2 2-1-1 2zM4 8l1 2 2 1-1-2z",
  baron: "M9 10a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7 8a1 1 0 1 1 2 0 1 1 0 0 1-2 0m0 4a1 1 0 1 1 2 0 1 1 0 0 1-2 0m-2-2a1 1 0 1 1 2 0 1 1 0 0 1-2 0m5-10 2 4-1 1H9L8 4 7 5H5L4 4l2-4-6 4 2 4 3 8 1-1h4l1 1 3-8 2-4z",
  tower: "m12 8-2 8H6L4 8l4 4zM8 0l4 4-1.003 1.002L11 5h3l-6 6-6-6h2.999L4 4zm0 2.4L6.4 4 8 5.6 9.6 4z",
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

export class LeagueStatsLastMatchCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._selectedPlayer = null;
    this._previousFocus = null;
    this.updateComplete = Promise.resolve();
    this._onKeyDown = (event) => { if (event.key === "Escape") this._closeDialog(); };
  }

  connectedCallback() { window.addEventListener("keydown", this._onKeyDown); this._render(); }
  disconnectedCallback() { window.removeEventListener("keydown", this._onKeyDown); }
  setConfig(config) { this._config = { ...config }; this._render(); }
  set hass(value) { this._hass = value; this._render(); }
  get hass() { return this._hass; }
  getCardSize() { return 8; }
  getGridOptions() { return { columns: "full", min_columns: 6 }; }
  static getStubConfig() { return {}; }
  static getConfigElement() { return document.createElement("league-stats-last-match-card-editor"); }

  _render() {
    if (!this.shadowRoot) return;
    let body;
    if (!this._hass || Object.keys(this._hass.states || {}).length === 0) {
      body = `<div class="status">League Stats werden geladen …</div>`;
    } else {
      const resolution = resolveAccount(this._hass.states || {}, this._config.account);
      if (resolution.status !== "ready") {
      const messages = {
        not_found: "Keine League-Stats-Integration gefunden.",
        selection_required: "Mehrere League-Konten gefunden. Bitte im Karteneditor ein Konto auswählen.",
        configured_account_missing: "Das ausgewählte League-Konto ist nicht mehr vorhanden.",
      };
      body = `<div class="status">${messages[resolution.status]}</div>`;
      } else {
        const model = buildLastMatch(this._hass.states, resolution.account);
        body = model.status === "ready" ? this._teams(model) : `<div class="status">${esc(model.error || (model.status === "empty" ? "Noch kein Match verfügbar." : "League Stats werden geladen …"))}</div>`;
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
    this.shadowRoot.querySelector(".backdrop")?.addEventListener("click", (event) => { if (event.target === event.currentTarget) this._closeDialog(); });
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
      <span class="portrait-wrap">${icon(player.championIcon, "portrait")}<span class="level">${esc(player.championLevel ?? "?")}</span></span>
      <span class="player-main"><span class="player-name">${esc(player.name)}</span><span class="champion-role">${esc(player.champion)} · ${esc(player.role)}</span></span>
      <span class="kda-block"><span class="kda ${kdaClass(player.kda)}">${player.kills}/${player.deaths}/${player.assists}</span><span class="kda-ratio">${player.kda.toLocaleString("de-DE")} KDA</span></span>
      <span class="loadout"><span class="inventory items-group">${slots(player)}</span><span class="abilities-group"><span class="spells-row">${spells}</span><span class="runes-row">${runes}</span></span></span></button>`;
  }

  _openPlayer(side, index) {
    this._previousFocus = this.shadowRoot.activeElement;
    const player = this._lastModel?.[side]?.players[index] || null;
    this._selectedPlayer = player ? {
      ...player, side: `${side.charAt(0).toUpperCase()}${side.slice(1)} Side`,
      result: player.win ? "Victory" : "Defeat", queue: this._lastModel.queue, duration: this._lastModel.duration,
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
    return `<div class="backdrop"><section class="dialog" role="dialog" aria-modal="true" aria-label="Details zu ${esc(player.name)}"><button class="close" type="button" aria-label="Schließen">×</button>
      ${player.splash ? `<img class="dialog-splash" src="${esc(player.splash)}" alt="">` : ""}<div class="dialog-body">
      <div class="dialog-hero">${player.championIcon ? `<img class="dialog-champion-icon" src="${esc(player.championIcon)}" alt="${esc(player.champion)}">` : ""}<h2>${esc(player.champion)} · ${esc(player.role)}</h2><div class="dialog-player-name">${esc(player.name)}</div><div class="dialog-context"><b>${esc(player.result)}</b> · ${esc(player.side)} · ${esc(player.queue)} · ${esc(player.duration)}</div></div>
      <div class="dialog-combat"><div class="dialog-kda ${kdaClass(player.kda)}">${player.kills}/${player.deaths}/${player.assists}</div><div class="dialog-kda-ratio">${player.kda.toLocaleString("de-DE")} KDA</div></div>
      <div class="dialog-stats">
        <div class="dialog-stat"><span class="stat-label">Level</span><strong class="stat-value">${esc(player.championLevel)}</strong></div>
        <div class="dialog-stat"><span class="stat-label">CS</span><strong class="stat-value">${player.cs} <small>(${player.csPerMin}/min)</small></strong></div>
        <div class="dialog-stat"><span class="stat-label">Gold</span><strong class="stat-value">${player.gold.toLocaleString("de-DE")}</strong></div>
        <div class="dialog-stat"><span class="stat-label">Schaden</span><strong class="stat-value">${player.damage.toLocaleString("de-DE")}</strong></div>
        <div class="dialog-stat"><span class="stat-label">Vision</span><strong class="stat-value">${player.visionScore}</strong></div>
        <div class="dialog-stat"><span class="stat-label">Kill-Beteiligung</span><strong class="stat-value">${esc(player.killParticipation ?? "–")}%</strong></div>
      </div>
      <div class="dialog-loadout"><div class="dialog-inventory">${slots(player)}</div><div class="dialog-abilities"><div class="spells-row">${spells}</div><div class="runes-row">${runes}</div></div></div>
      </div></section></div>`;
  }
}

if (!customElements.get("league-stats-last-match-card")) customElements.define("league-stats-last-match-card", LeagueStatsLastMatchCard);

window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === "league-stats-last-match-card")) window.customCards.push({
  type: "league-stats-last-match-card", name: "League Stats – Letztes Match", preview: true,
  description: "Zeigt beide Teams des letzten League-of-Legends-Matches.",
  documentationURL: "https://github.com/Ricoxa93/league-stats-ha",
});
