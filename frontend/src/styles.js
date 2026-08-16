export const CARD_STYLES = `
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
