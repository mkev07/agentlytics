# Branch Report: custom-main (hidden-project correctness + custom toggle)

Date: 2026-04-23
Scope: documents what was changed on this branch, why those choices were made, and what is intentionally still pending.

## Branch objective

Fix hidden-project analytics correctness without introducing broad architectural drift, then make that behavior user-controllable from the Custom tab while preserving upstream-friendly change shape.

## What was changed

### 1) Hidden-project totals correctness fix (UI + backend)

Files:
- `ui/src/pages/Settings.jsx`
- `ui/src/App.jsx`
- `cache.js`

Changes:
- Settings now accepts `onConfigChanged` and triggers it after relevant config writes.
- Hidden-project toggle in Settings now:
  - updates config,
  - refreshes project list (`fetchAllProjects()`),
  - notifies top-level app state (`onConfigChanged?.()`).
- App routes pass `refreshOverview` into Settings and custom routes.
- `cache.js` overview editor-count query now uses the same filtered `where` used for `totalChats`, so overview editor totals and session totals stay aligned under hidden-project filtering.

Why:
- The observed issue had two contributing factors: stale top-level overview state after toggles, and inconsistent query filtering in overview internals.
- Fixing only the UI refresh left backend counts inconsistent; fixing only backend left some stale UI states. Both layers were adjusted to make behavior deterministic.

### 2) Config toggle for hidden-project analytics exclusion

Files:
- `server.js`
- `ui/src/custom/CustomHome.jsx`
- `ui/src/App.jsx` (refresh callback already passed to custom routes)

Changes:
- Added config-backed semantics in server logic:
  - `excludeHiddenProjectsFromAnalytics`
  - default behavior preserved via `config.excludeHiddenProjectsFromAnalytics !== false`.
- Added helper flow in server:
  - `shouldExcludeHiddenProjectsFromAnalytics()`
  - `getAnalyticsHiddenFolders()`
- Analytics endpoints now use `getAnalyticsHiddenFolders()` so exclusion can be enabled/disabled globally by config.
- `CustomHome.jsx` now presents a styled toggle card for this behavior and calls `onConfigChanged?.()` after saving.

Why:
- The user wanted to keep the fix but control it explicitly from Custom.
- Default-on preserves existing expectations and avoids surprising behavior changes for existing users/configs.
- Reusing existing `/api/config` avoided adding extra API surface and kept branch diff smaller.

### 3) Cache invalidation guard update on config changes

File:
- `server.js`

Changes:
- Config update handling now also invalidates MCP tools cache when hidden-project-related config fields change, including `excludeHiddenProjectsFromAnalytics`.

Why:
- Keeps derived/tool-facing state coherent when analytics visibility rules change.

### 4) Secondary-copy cleanup (mistaken edit rollback)

Target cleaned:
- `/Users/kevin/Vibe Code/agentlytics-master`

Files reverted there:
- `ui/src/App.jsx`
- `ui/src/pages/Settings.jsx`
- `cache.js`

Why:
- Earlier edits landed in the wrong local copy and created confusion during validation.
- Cleanup isolates intentional branch behavior to the active repo (`/Users/kevin/Vibe Code/agentlytics`).

## Current behavior guarantees

- Hidden projects can be excluded from analytics by default.
- The exclusion behavior is user-toggleable from Custom.
- Overview/session/editor totals stay consistent under hidden-project filtering.
- Settings changes refresh top-level overview promptly.
- `/api/all-projects` remains usable for project management visibility and is not repurposed as analytics-filtered output.

## Explicitly pending / not implemented yet

The remote watcher ingestion replacement (agent-watch integration) is not implemented in this branch yet:
- `POST /api/ingest` with `x-ingest-secret` auth (`INGEST_SECRET`)
- `GET /api/devices`
- `cache.upsertRemoteChats(payload)`
- `cache.getDevices()`
- `_meta.device`-based device filtering across analytics endpoints
- Header device dropdown (`All`, `Local`, `vector-core`, `core-openclaw`)

Reason for pending state:
- Work was intentionally paused after stabilizing hidden-project correctness and custom-toggle behavior, to avoid mixing separate feature scopes in one debugging cycle.

## Validation notes (what was verified)

- UI/build and runtime checks were performed during fix iteration.
- The previously reported hidden-project total mismatch was resolved after combined UI + backend adjustments.
- Wrong-repo accidental edits were removed from `agentlytics-master`.

## Design principles used on this branch

1. Keep fixes surgical and upstream-friendly.
2. Prefer config and existing API plumbing over new endpoint proliferation for behavior toggles.
3. Preserve default behavior unless user explicitly requested a new default.
4. Separate unrelated feature scopes (correctness fix vs remote ingest architecture).

## Handoff guidance for future agents

If continuing from here:
1. Treat hidden-project correctness and custom toggle as baseline behavior to preserve.
2. Implement remote ingest/device filtering as a new, isolated step.
3. Do not regress `cache.js` overview filter consistency.
4. Keep endpoint behavior distinctions clear (`analytics` filtering vs `all-projects` management listing).
