# Player Row Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the loose player-row layout with an explicit four-column, two-row grid that uses the full card width.

**Architecture:** Add semantic grid-area wrappers to `_player()` and assign portrait, identity, inventory, abilities, and combat content to fixed CSS grid areas. Preserve the current narrow fallback, data model, popup, and interaction behavior.

**Tech Stack:** JavaScript ES modules, Web Components, CSS Grid/container queries, Vitest with happy-dom, esbuild, Python.

## Global Constraints

- Both team cards use identical left-to-right markup order.
- Column two consumes remaining width; portrait, abilities, and combat columns remain predictable.
- Seven items stay in one row; spells stay above runes.
- Popup and team header remain unchanged.
- Release version is `0.4.6`.

---

### Task 1: Semantic four-column player markup

**Files:**
- Modify: `frontend/test/league-stats-last-match-card.test.js`
- Modify: `frontend/src/league-stats-last-match-card.js`

**Interfaces:**
- Consumes: `_player(player, side, index)` and existing `slots(player)`/`icon()` helpers.
- Produces: `.player-identity`, `.player-inventory`, `.player-abilities`, and `.player-combat` grid areas.

- [ ] **Step 1: Write failing markup tests**

Assert every Blue and Red row contains the four semantic areas in identical DOM order, with seven item slots, two spells, and two runes.

```js
for (const row of [blue, red]) {
  expect([...row.children].map((node) => node.classList[0])).toEqual([
    "portrait-wrap", "player-identity", "player-inventory", "player-abilities", "player-combat",
  ]);
  expect(row.querySelectorAll(".player-inventory .slot")).toHaveLength(7);
  expect(row.querySelectorAll(".player-abilities .spells-row .spell-rune")).toHaveLength(2);
  expect(row.querySelectorAll(".player-abilities .runes-row .spell-rune")).toHaveLength(2);
}
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `./node_modules/.bin/vitest run frontend/test/league-stats-last-match-card.test.js`

Expected: FAIL because the existing row contains one combined `.loadout` wrapper.

- [ ] **Step 3: Implement the markup**

Render portrait first, then identity, inventory, abilities, and combat. Keep the current inner text, icons, classes used for colors, level badge, and click metadata.

- [ ] **Step 4: Run the focused test and verify pass**

Run: `./node_modules/.bin/vitest run frontend/test/league-stats-last-match-card.test.js`

Expected: PASS for markup and existing interaction tests.

### Task 2: Four-column/two-row CSS grid

**Files:**
- Modify: `frontend/test/league-stats-last-match-card.test.js`
- Modify: `frontend/src/styles.js`

**Interfaces:**
- Consumes: semantic areas from Task 1.
- Produces: explicit `grid-template-areas` and area assignments for regular and single-team rows.

- [ ] **Step 1: Write failing CSS-contract tests**

Require a regular grid with portrait, content, abilities, and combat columns and two named rows:

```js
expect(CARD_STYLES).toContain('"portrait identity abilities combat"');
expect(CARD_STYLES).toContain('"portrait inventory abilities combat"');
expect(CARD_STYLES).toMatch(/\.player-identity\s*\{[^}]*grid-area:identity/);
expect(CARD_STYLES).toMatch(/\.player-inventory\s*\{[^}]*grid-area:inventory/);
expect(CARD_STYLES).toMatch(/\.player-abilities\s*\{[^}]*grid-area:abilities/);
expect(CARD_STYLES).toMatch(/\.player-combat\s*\{[^}]*grid-area:combat/);
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `./node_modules/.bin/vitest run frontend/test/league-stats-last-match-card.test.js`

Expected: FAIL because named grid areas do not exist.

- [ ] **Step 3: Implement the desktop and regular grid**

Use two grid rows with the portrait spanning both. Set columns to portrait width, `minmax(0,1fr)`, ability width, and combat width. Align identity/KDA to the first row and items/runes/KDA ratio to the second. Keep long text ellipsis and subtle vertical separators.

- [ ] **Step 4: Preserve the narrow fallback**

Below `520px`, use a compact named-area layout that moves inventory and abilities below identity/combat only when necessary. Below `390px`, retain seven `17px` item slots in one row. No icon group may overflow.

- [ ] **Step 5: Run focused tests and commit**

Run the focused card test, then:

```bash
git add frontend/src/league-stats-last-match-card.js frontend/src/styles.js frontend/test/league-stats-last-match-card.test.js
git commit -m "feat: fill player rows with fixed grid"
```

### Task 3: Version, bundle, and verification

**Files:**
- Modify: `custom_components/league_stats/manifest.json`
- Modify: `custom_components/league_stats/frontend_registration.py`
- Modify: `tests/test_frontend.py`
- Regenerate: `custom_components/league_stats/frontend/league-stats-last-match-card.js`

**Interfaces:**
- Consumes: completed source grid.
- Produces: integration and cache-buster version `0.4.6` plus production bundle.

- [ ] **Step 1: Write the failing version expectations**

Change both resource URL expectations in `tests/test_frontend.py` to `?v=0.4.6` and verify current manifest/registration still report `0.4.5`.

- [ ] **Step 2: Update version and build**

Set manifest and `frontend_registration.VERSION` to `0.4.6`, then run:

```bash
./node_modules/.bin/esbuild frontend/src/league-stats-last-match-card.js --bundle --format=esm --target=es2022 --outfile=custom_components/league_stats/frontend/league-stats-last-match-card.js
```

- [ ] **Step 3: Run complete verification**

```bash
./node_modules/.bin/vitest run
python -m compileall -q custom_components
git diff --check
```

Also directly verify manifest, registration, and both cache-buster expectations equal `0.4.6` when pytest is unavailable.

- [ ] **Step 4: Commit**

```bash
git add custom_components/league_stats/frontend/league-stats-last-match-card.js custom_components/league_stats/manifest.json custom_components/league_stats/frontend_registration.py tests/test_frontend.py
git commit -m "release: prepare player row grid"
```

### Task 4: Publish and prepare HACS

**Files:**
- No local file changes.

**Interfaces:**
- Consumes: verified `0.4.6` commits.
- Produces: merged PR, latest release `0.4.6`, and refreshed HACS metadata without installing it.

- [ ] **Step 1: Create a clean branch from current `main`, publish it, and open a ready PR**

PR title: `0.4.6 – Fixed Player Row Grid`.

- [ ] **Step 2: Compare the PR to `main`, confirm only planned files, and squash-merge**

- [ ] **Step 3: Publish tag `0.4.6` from `main` as Latest**

- [ ] **Step 4: Refresh HACS and verify `available_version: 0.4.6`, leaving installation to the user**
