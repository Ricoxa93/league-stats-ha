import { discoverAccounts } from "./account-discovery.js";

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
}[char]));

export class LeagueStatsLastMatchCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
  }

  connectedCallback() { this._render(); }
  setConfig(config) { this._config = { ...config }; this._render(); }
  set hass(value) { this._hass = value; this._render(); }
  get hass() { return this._hass; }

  _render() {
    if (!this.shadowRoot) return;
    const accounts = discoverAccounts(this._hass?.states || {});
    const options = accounts.map((account) => `<option value="${esc(account.id)}" ${account.id === this._config.account ? "selected" : ""}>${esc(account.label)}</option>`).join("");
    this.shadowRoot.innerHTML = `<style>:host{display:block;padding:12px 0}label{display:grid;gap:7px;font-weight:600}select{box-sizing:border-box;width:100%;padding:10px 12px;border:1px solid var(--divider-color,#777);border-radius:8px;color:var(--primary-text-color);background:var(--card-background-color,#222)}small{opacity:.72;font-weight:400}</style>
      <label>League-Konto<select><option value="">Automatisch${accounts.length === 1 ? ` (${esc(accounts[0].label)})` : ""}</option>${options}</select><small>Bei einem Konto wird es automatisch verwendet. Bei mehreren Konten bitte auswählen.</small></label>`;
    this.shadowRoot.querySelector("select")?.addEventListener("change", (event) => this._changed(event.target.value));
  }

  _changed(account) {
    const config = { ...this._config };
    if (account) config.account = account;
    else delete config.account;
    this._config = config;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }
}

if (!customElements.get("league-stats-last-match-card-editor")) customElements.define("league-stats-last-match-card-editor", LeagueStatsLastMatchCardEditor);
