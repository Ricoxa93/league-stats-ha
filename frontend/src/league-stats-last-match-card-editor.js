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
    this.shadowRoot.innerHTML = `<style>:host{display:grid;gap:16px;padding:12px 0}label{display:grid;gap:7px;font-weight:600}select{box-sizing:border-box;width:100%;padding:10px 12px;border:1px solid var(--divider-color,#777);border-radius:8px;color:var(--primary-text-color);background:var(--card-background-color,#222)}small{opacity:.72;font-weight:400}</style>
      <label>League-Konto<select data-config="account"><option value="">Automatisch${accounts.length === 1 ? ` (${esc(accounts[0].label)})` : ""}</option>${options}</select><small>Bei einem Konto wird es automatisch verwendet. Bei mehreren Konten bitte auswählen.</small></label>
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
}

if (!customElements.get("league-stats-last-match-card-editor")) customElements.define("league-stats-last-match-card-editor", LeagueStatsLastMatchCardEditor);
