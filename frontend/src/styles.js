export const CARD_STYLES = `
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
