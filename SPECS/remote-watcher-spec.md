# Spec: Remote Watcher — Unified Multi-Device Analytics

## Goal

The standalone Agentlytics dashboard (running on Kevin's Mac) should show combined AI coding metrics from **three devices** — Mac, vector-core, and core-openclaw — with per-device filtering.

## Architecture

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│  vector-core │         │ core-openclaw│         │ Kevin's Mac  │
│  (watcher)   │         │  (watcher)   │         │ (dashboard)  │
│              │  POST    │              │  POST    │              │
│  ~/.claude/  ├────────►│  ~/.claude/  ├────────►│  :4637       │
│  ~/.codex/   │  /ingest│  ~/.codex/   │  /ingest│  cache.db    │
│  ~/.cursor/  │         │              │         │  + remote    │
└──────────────┘         └──────────────┘         └──────────────┘
```

**Key principle:** Watchers are tiny standalone scripts. No agentlytics dependency. They read raw editor session files and POST parsed data to the dashboard's ingest endpoint.

## Part 1: Watcher Script (`watcher.js`)

A single ~200-line Node.js script deployed on each server.

### What it watches

| Editor | Directory | File format |
|--------|-----------|-------------|
| Claude Code | `~/.claude/projects/<project>/<session>.jsonl` | JSONL |
| Codex CLI | `~/.codex/sessions/<session>.jsonl` | JSONL |
| Cursor | `~/.cursor/chats/<ws>/<chat>/store.db` | SQLite |

### How it works

1. **Initial scan** — on startup, reads all existing sessions and sends them
2. **Watch mode** — uses `fs.watch` (with debouncing, 5s) to detect new/modified files
3. **Differential sync** — tracks last-seen mtime per file, only sends changes
4. **Push to dashboard** — `POST /api/ingest` with parsed session data

### Data format (POST body)

```json
{
  "device": "vector-core",
  "chats": [
    {
      "id": "<session-uuid>",
      "source": "claude-code",
      "name": "First user message or null",
      "mode": "claude",
      "folder": "/home/kevin/project",
      "created_at": 1713456789000,
      "last_updated_at": 1713460000000,
      "bubble_count": 42,
      "stats": {
        "total_messages": 42,
        "user_messages": 15,
        "assistant_messages": 20,
        "tool_messages": 7,
        "total_input_tokens": 150000,
        "total_output_tokens": 25000,
        "total_cache_read": 500000,
        "total_cache_write": 10000,
        "models": ["claude-sonnet-4-20250514"]
      }
    }
  ]
}
```

### Watcher config

```json
// ~/.config/agentlytics-watcher.json
{
  "device": "vector-core",
  "dashboard_url": "http://100.110.125.106:4637",
  "scan_interval": 30,
  "watch_dirs": ["~/.claude", "~/.codex", "~/.cursor"]
}
```

### Requirements for watcher

- Node.js (no npm dependencies — uses only built-ins + better-sqlite3 for Cursor)
- Actually, to avoid the better-sqlite3 dep entirely: for Cursor, just read the raw SQLite file using `child_process.exec('sqlite3 ...')` or skip Cursor entirely if sqlite3 CLI is available
- Better approach: bundle the parsers from `editors/` that we actually need (claude.js + codex.js) — they only use `fs` and `path`, no deps
- systemd service for auto-restart

## Part 2: Dashboard Ingest Endpoint

Add to `server.js`:

### `POST /api/ingest`

- **Auth:** shared secret (env `INGEST_SECRET`)
- **Body:** `{ device, chats: [...] }`
- **Behavior:**
  1. Upsert each chat into `chats` table (keyed by `{device}:{id}`)
  2. The `id` column gets prefixed: `remote:{device}:{original-id}`
  3. Upsert stats into `chat_stats`
  4. Mark `_meta` with `{"remote_device": "vector-core"}`
  5. Return `{ ok: true, ingested: N }`

### `GET /api/devices`

- Returns list of connected devices and their session counts
- Used by UI filter

### `DELETE /api/devices/:device`

- Clears all data for a specific remote device
- Used for cleanup

### `POST /api/ingest/test`

- Echo endpoint to verify connectivity from a watcher
- Returns `{ ok: true, device: "..." }`

## Part 3: UI — Device Filter

Add a device/source filter to the dashboard:

- **Location:** Top bar, next to the search
- **Options:** All / Mac (Local) / vector-core / core-openclaw
- **Behavior:** Filters all queries by `_meta.remote_device` (null = local)
- **Default:** All (combined view)

### Implementation

1. Add `source_device` column to `chats` table (or use `_meta` JSON field)
2. All existing API queries get an optional `?device=` filter param
3. Frontend dropdown calls `/api/devices` on mount, renders filter chips

## Part 4: Teardown — Remove Relay

Once watchers are working:

1. Stop + remove Docker relay container on vector-core
2. Stop systemd join services on vector-core and core-openclaw
3. Close UFW port 4638 on vector-core
4. Remove Traefik route for `analytics.vctrads.dev` (or repurpose for the watcher-pushed dashboard exposed via Tailscale)

## Deployment Plan

### Step 1: Build watcher.js
- Copy parsers from `editors/claude.js` and `editors/codex.js` (they're pure fs/path)
- Add the POST logic and fs.watch debouncer
- Test locally on Mac first

### Step 2: Add ingest endpoint to server.js
- POST /api/ingest with device-prefixed IDs
- GET /api/devices
- Store in same cache.db

### Step 3: Add UI device filter
- Filter chips in top bar
- Pass device param to all API calls

### Step 4: Deploy watchers
- Copy `watcher.js` + config to vector-core and core-openclaw
- Create systemd services
- Verify data flows

### Step 5: Teardown relay
- Remove all relay infrastructure (container, services, UFW rule)

## Notes

- Watchers are push-only — they don't need to receive data
- Dashboard URL from servers should use Tailscale IP of Mac (`100.110.125.106:4637`) for security
- INGEST_SECRET should be set as env var on both sides
- The existing local scan still works — watchers just add remote data to the same DB
- No dependency conflicts — watchers are standalone, dashboard is standalone
