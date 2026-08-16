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
    return `<div class="teams">${this._team(model.blue)}${this._team(model.red)}</div>`;
  }

  _team(team) {
    const players = team.players.map((player, index) => player ? this._player(player, team.side, index) : `<div class="player" aria-hidden="true"></div>`).join("");
    return `<section class="team ${team.side.toLowerCase()}">
      <header class="team-head"><div class="head-line"><span class="team-name">${team.side} Team <small>(${team.kills}/${team.deaths}/${team.assists})</small></span><span class="result ${team.victory ? "victory" : "defeat"}">${team.victory ? "Victory" : "Defeat"}</span></div>
      <div class="objectives"><span>🪙 ${team.gold.toLocaleString("de-DE")} (${team.goldDelta >= 0 ? "+" : ""}${team.goldDelta.toLocaleString("de-DE")})</span><span>🐉 ${team.dragons}</span><span>👑 ${team.barons}</span><span>🏰 ${team.towers}</span></div></header>${players}</section>`;
  }

  _player(player, side, index) {
    const extras = [player.summonerSpells[0], player.summonerSpells[1], player.primaryRune, player.secondaryRune]
      .map((entry) => icon(entry?.icon, "spell-rune")).join("");
    return `<button type="button" class="player" data-player-row data-own-player="${player.own}" data-side="${side.toLowerCase()}" data-player-index="${index}">
      <span class="portrait-wrap">${icon(player.championIcon, "portrait")}<span class="level">${esc(player.championLevel ?? "?")}</span></span>
      <span class="player-main"><span class="player-name">${esc(player.name)}</span><span class="champion-role">${esc(player.champion)} · ${esc(player.role)}</span></span>
      <span class="kda-block"><span class="kda ${kdaClass(player.kda)}">${player.kills}/${player.deaths}/${player.assists}</span><span class="kda-ratio">${player.kda.toLocaleString("de-DE")} KDA</span></span>
      <span class="loadout"><span class="inventory">${slots(player)}</span><span class="extras">${extras}</span></span></button>`;
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
    const items = [...player.items, ...player.summonerSpells, player.primaryRune, player.secondaryRune].filter(Boolean).map((item) => icon(item.icon)).join("");
    return `<div class="backdrop"><section class="dialog" role="dialog" aria-modal="true" aria-label="Details zu ${esc(player.name)}"><button class="close" type="button" aria-label="Schließen">×</button>
      ${player.splash ? `<img class="dialog-splash" src="${esc(player.splash)}" alt="">` : ""}<div class="dialog-body">${player.championIcon ? `<img class="dialog-champion-icon" src="${esc(player.championIcon)}" alt="${esc(player.champion)}">` : ""}<h2>${esc(player.champion)} · ${esc(player.role)}</h2><div>${esc(player.name)}</div><div><b>${esc(player.result)}</b> · ${esc(player.side)} · ${esc(player.queue)} · ${esc(player.duration)}</div>
      <div class="dialog-kda">${player.kills}/${player.deaths}/${player.assists}</div><div>${player.kda} KDA</div>
      <div class="details"><span><b>Level:</b> ${esc(player.championLevel)}</span><span><b>CS:</b> ${player.cs} (${player.csPerMin}/min)</span><span><b>Gold:</b> ${player.gold.toLocaleString("de-DE")}</span><span><b>Schaden:</b> ${player.damage.toLocaleString("de-DE")}</span><span><b>Vision:</b> ${player.visionScore}</span><span><b>KP:</b> ${esc(player.killParticipation ?? "–")}%</span></div>
      <div class="dialog-items">${items || "Keine Itemdaten"}</div></div></section></div>`;
  }
}

if (!customElements.get("league-stats-last-match-card")) customElements.define("league-stats-last-match-card", LeagueStatsLastMatchCard);

window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === "league-stats-last-match-card")) window.customCards.push({
  type: "league-stats-last-match-card", name: "League Stats – Letztes Match", preview: true,
  description: "Zeigt beide Teams des letzten League-of-Legends-Matches.",
  documentationURL: "https://github.com/Ricoxa93/league-stats-ha",
});
