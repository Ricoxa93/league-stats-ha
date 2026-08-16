# League Stats Team Card Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make single Blue/Red team cards full-width, restore the exact legacy SVG objectives, strengthen team-header typography, and separate spells above runes beside the item row.

**Architecture:** Keep the custom element and match model unchanged. Add fixed SVG rendering helpers in the card module, semantic equipment markup, and responsive CSS in the existing stylesheet. Preserve configuration and popup behavior.

**Tech Stack:** JavaScript ES modules, Web Components/Shadow DOM, CSS container queries, Vitest/Happy DOM, esbuild, Home Assistant Lovelace.

## Global Constraints

- The public type stays `custom:league-stats-last-match-card`.
- Missing `team` and `team: both` continue to render both teams.
- No new runtime dependency.
- Use the exact four 16×16 SVG paths from the legacy dashboard.
- Single-team equipment must remain usable on narrow mobile containers.

---

### Task 1: Full-width grid and legacy objective SVGs

**Files:**
- Modify: `frontend/test/league-stats-last-match-card.test.js`
- Modify: `frontend/src/league-stats-last-match-card.js`

**Interfaces:**
- Consumes: `LeagueStatsLastMatchCard.getGridOptions()` and `_team(team)`.
- Produces: `objectiveIcon(name, color)` returning inline SVG markup for `gold`, `dragon`, `baron`, and `tower`.

- [ ] **Step 1: Write failing tests**

Assert that `blue` and `red` return `{ columns: "full", min_columns: 6 }`; all four `.objective-svg` elements contain the exact legacy path data; Blue/Red SVGs use `#60a5fa`/`#f87171`.

- [ ] **Step 2: Verify the tests fail**

Run `./node_modules/.bin/vitest run frontend/test/league-stats-last-match-card.test.js`. Expect failures for half-width grid and missing inline SVGs.

- [ ] **Step 3: Implement the minimal rendering change**

Add a fixed path map:

```js
const OBJECTIVE_PATHS = {
  dragon: "M8 0 6 4 3 1v4H0l3 3v3l4 5h2l4-5V8l3-3h-3V1l-3 3zm1 11 1-2 2-1-1 2zM4 8l1 2 2 1-1-2z",
  baron: "M9 10a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7 8a1 1 0 1 1 2 0 1 1 0 0 1-2 0m0 4a1 1 0 1 1 2 0 1 1 0 0 1-2 0m-2-2a1 1 0 1 1 2 0 1 1 0 0 1-2 0m5-10 2 4-1 1H9L8 4 7 5H5L4 4l2-4-6 4 2 4 3 8 1-1h4l1 1 3-8 2-4z",
  tower: "m12 8-2 8H6L4 8l4 4zM8 0l4 4-1.003 1.002L11 5h3l-6 6-6-6h2.999L4 4zm0 2.4L6.4 4 8 5.6 9.6 4z",
};
```

Render the legacy four-path gold SVG separately, render other objectives with the map, and return full-width grid options for every supported team value.

- [ ] **Step 4: Verify targeted tests pass and commit**

Run the targeted test, then commit `frontend/src/league-stats-last-match-card.js` and its test as `feat: restore legacy team objective icons`.

### Task 2: Equipment grouping and stronger typography

**Files:**
- Modify: `frontend/test/league-stats-last-match-card.test.js`
- Modify: `frontend/src/league-stats-last-match-card.js`
- Modify: `frontend/src/styles.js`

**Interfaces:**
- Consumes: `_player(player, side, index)` and `.single-team` layout state.
- Produces: `.items-group`, `.abilities-group`, `.spells-row`, and `.runes-row` markup classes.

- [ ] **Step 1: Write failing markup tests**

Create a player fixture with two spells and two runes. Assert seven item slots remain inside `.items-group`, two spell icons are inside `.spells-row`, two rune icons are inside `.runes-row`, and the spells row precedes the runes row.

- [ ] **Step 2: Verify the tests fail**

Run the targeted card test. Expect failure because the semantic groups do not exist.

- [ ] **Step 3: Implement markup and CSS**

Split the loadout into item and ability groups. Style abilities as two rows with a separator border; enlarge `.gold`, `.gold-delta`, and `.result`; retain wrapping below 390px.

- [ ] **Step 4: Verify targeted tests pass and commit**

Run the targeted test, then commit the three files as `feat: refine team card equipment layout`.

### Task 3: Release build, documentation, and verification

**Files:**
- Modify: `custom_components/league_stats/manifest.json`
- Modify: `custom_components/league_stats/frontend_registration.py`
- Modify: `tests/test_frontend.py`
- Modify: `CHANGELOG.md`
- Regenerate: `custom_components/league_stats/frontend/league-stats-last-match-card.js`

**Interfaces:**
- Consumes: source card bundle.
- Produces: a versioned integration whose manifest and Lovelace cache URL match.

- [ ] **Step 1: Bump the internal version consistently**

Set manifest version, `frontend_registration.VERSION`, and Python expectations to `0.4.4`. Add changelog notes for full-width cards, legacy SVGs, stronger headers, and separated spells/runes.

- [ ] **Step 2: Build the production bundle**

Run `./node_modules/.bin/esbuild frontend/src/league-stats-last-match-card.js --bundle --format=esm --target=es2022 --outfile=custom_components/league_stats/frontend/league-stats-last-match-card.js`. Expect exit 0.

- [ ] **Step 3: Run complete verification**

Run:

```bash
./node_modules/.bin/vitest run
python -m compileall -q custom_components/league_stats
git diff --check
```

Expect all tests to pass and commands to exit 0. If `pytest` is available, also run `python -m pytest -q`; otherwise directly verify manifest and frontend resource versions match.

- [ ] **Step 4: Review and commit**

Confirm every specification bullet has a test or explicit implementation and the generated bundle matches its source. Commit release files as `release: prepare team card refinements`.
