# Player Card and Popup Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve player-row readability and reorganize the player popup while preserving compact responsive behavior.

**Architecture:** Keep all data mapping unchanged and modify only the source card template and shared card styles. Add semantic popup sections and separate item/ability markup, then rebuild the checked-in frontend bundle and advance the integration patch version.

**Tech Stack:** JavaScript ES modules, Web Components, CSS container queries, Vitest with happy-dom, esbuild, Python/pytest.

## Global Constraints

- No new Home Assistant entities or Riot API fields.
- Seven item slots remain in one row at supported narrow widths.
- Summoner spells remain above runes; runes align with the item row.
- Existing team colors, selected-player highlight, KDA thresholds, and click behavior remain unchanged.
- Popup statistics use a responsive two-column grid and collapse to one column on small screens.

---

### Task 1: Player-row hierarchy and alignment

**Files:**
- Modify: `frontend/test/league-stats-last-match-card.test.js`
- Modify: `frontend/src/styles.js`

**Interfaces:**
- Consumes: existing `.player-main`, `.kda-block`, `.loadout`, `.inventory`, `.abilities-group`, `.spells-row`, and `.runes-row` markup.
- Produces: CSS layout where identity and combat type are larger and `.abilities-group` aligns its second row with `.inventory`.

- [ ] **Step 1: Write failing style-contract tests**

Add assertions that require larger base identity/KDA typography, an ability grid with explicit spell and rune rows, bottom alignment between inventory and runes, and the existing seven-slot narrow inventory rule.

```js
expect(CARD_STYLES).toMatch(/\.player-name\s*\{[^}]*font-size:14px/);
expect(CARD_STYLES).toMatch(/\.champion-role\s*\{[^}]*font-size:12px/);
expect(CARD_STYLES).toMatch(/\.kda\s*\{[^}]*font-size:18px/);
expect(CARD_STYLES).toMatch(/\.loadout\s*\{[^}]*align-items:flex-end/);
expect(CARD_STYLES).toMatch(/\.abilities-group\s*\{[^}]*grid-template-rows:repeat\(2,/);
expect(CARD_STYLES).toMatch(/@container \(max-width:390px\)[\s\S]*grid-template-columns:repeat\(7,17px\)/);
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npx vitest run frontend/test/league-stats-last-match-card.test.js`

Expected: FAIL because the current typography and loadout alignment do not satisfy the new contracts.

- [ ] **Step 3: Implement minimal player-row CSS**

Update `CARD_STYLES` so regular player names use `14px`, champion/role uses `12px`, K/D/A uses `18px`, KDA uses `12px`, and the loadout bottom-aligns inventory with the rune row. Increase the single-team variants proportionally while keeping the current row height compact and preserving the narrow seven-item row.

- [ ] **Step 4: Run focused tests and verify pass**

Run: `npx vitest run frontend/test/league-stats-last-match-card.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/styles.js frontend/test/league-stats-last-match-card.test.js
git commit -m "feat: improve player row hierarchy"
```

### Task 2: Structured player popup

**Files:**
- Modify: `frontend/test/league-stats-last-match-card.test.js`
- Modify: `frontend/src/league-stats-last-match-card.js`
- Modify: `frontend/src/styles.js`

**Interfaces:**
- Consumes: the existing normalized player object passed to `_dialog(player)`.
- Produces: `.dialog-hero`, `.dialog-combat`, `.dialog-stats`, `.dialog-stat`, and `.dialog-loadout` sections containing `.dialog-inventory` and `.dialog-abilities`.

- [ ] **Step 1: Write failing popup-structure tests**

After opening a player, assert the six statistics and separated loadout groups:

```js
const dialog = card.shadowRoot.querySelector('[role="dialog"]');
expect(dialog.querySelectorAll(".dialog-stat")).toHaveLength(6);
expect(dialog.querySelector(".dialog-inventory")).not.toBeNull();
expect(dialog.querySelector(".dialog-abilities .spells-row")).not.toBeNull();
expect(dialog.querySelector(".dialog-abilities .runes-row")).not.toBeNull();
expect(dialog.querySelectorAll(".dialog-inventory .slot")).toHaveLength(7);
```

Add style assertions for the two-column stat grid and responsive one-column fallback.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npx vitest run frontend/test/league-stats-last-match-card.test.js`

Expected: FAIL because the popup currently renders a flat details list and one combined icon strip.

- [ ] **Step 3: Implement semantic popup markup**

In `_dialog(player)`, render:

```html
<div class="dialog-hero">...</div>
<div class="dialog-combat">...</div>
<div class="dialog-stats">
  <div class="dialog-stat"><span class="stat-label">Level</span><strong class="stat-value">...</strong></div>
</div>
<div class="dialog-loadout">
  <div class="dialog-inventory">seven slots</div>
  <div class="dialog-abilities"><div class="spells-row">...</div><div class="runes-row">...</div></div>
</div>
```

Use `slots(player)` for the fixed seven-slot inventory and independently map the two spells and two runes. Preserve escaping and the `Keine Itemdaten` fallback only when no inventory or ability data exists.

- [ ] **Step 4: Style the popup sections**

Give the combat section prominent K/D/A and KDA type, style `.dialog-stats` as a two-column grid of consistent statistic tiles, and bottom-align `.dialog-inventory` with the popup rune row. Under the existing `520px` container query, collapse `.dialog-stats` to one column and allow `.dialog-loadout` to wrap without changing group order.

- [ ] **Step 5: Run focused tests and verify pass**

Run: `npx vitest run frontend/test/league-stats-last-match-card.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/league-stats-last-match-card.js frontend/src/styles.js frontend/test/league-stats-last-match-card.test.js
git commit -m "feat: reorganize player detail popup"
```

### Task 3: Bundle, release metadata, and full verification

**Files:**
- Modify: `custom_components/league_stats/frontend/league-stats-last-match-card.js`
- Modify: `custom_components/league_stats/manifest.json`
- Modify: `custom_components/league_stats/frontend_registration.py`
- Modify: `tests/test_frontend.py`

**Interfaces:**
- Consumes: source frontend modules and the existing cache-busting `VERSION` constant.
- Produces: bundled frontend and integration version `0.4.5`.

- [ ] **Step 1: Write the failing version expectation**

Change the two resource URL expectations in `tests/test_frontend.py` from `?v=0.4.4` to `?v=0.4.5`.

- [ ] **Step 2: Run the focused Python test and verify failure**

Run: `pytest -q tests/test_frontend.py`

Expected: FAIL because manifest and frontend registration still report `0.4.4`.

- [ ] **Step 3: Advance version and rebuild**

Set `custom_components/league_stats/manifest.json` and `custom_components/league_stats/frontend_registration.py` to `0.4.5`, then run:

```bash
npm run build
```

- [ ] **Step 4: Run complete verification**

Run:

```bash
npm test
pytest -q
python -m compileall -q custom_components
git diff --check
```

Expected: all Vitest and pytest tests pass, Python compilation exits successfully, and `git diff --check` produces no output.

- [ ] **Step 5: Commit**

```bash
git add custom_components/league_stats/frontend/league-stats-last-match-card.js custom_components/league_stats/manifest.json custom_components/league_stats/frontend_registration.py tests/test_frontend.py
git commit -m "release: prepare player layout refinements"
```

### Task 4: Publish and prepare HACS

**Files:**
- No local file changes.

**Interfaces:**
- Consumes: verified commits for version `0.4.5`.
- Produces: merged GitHub pull request, latest GitHub release `0.4.5`, and refreshed HACS metadata with installation left to the user.

- [ ] **Step 1: Push a dedicated branch and open a pull request**

Title: `0.4.5 – Player Card and Popup Layout`

- [ ] **Step 2: Verify the pull request diff and checks, then merge**

Confirm only the planned frontend, tests, version metadata, and design/plan documents are included.

- [ ] **Step 3: Publish the latest release**

Create tag `0.4.5` from `main`, mark it as Latest, and describe the player-row typography, aligned spells/runes, larger combat summary, and reorganized popup.

- [ ] **Step 4: Refresh HACS repository information**

Refresh `Ricoxa93/league-stats-ha` and verify `available_version` is `0.4.5` with `pending_update: true`. Do not install the update or restart Home Assistant.
