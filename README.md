# INTUITION

System One flight instruments for agents — route, context compression, and tool
gates. Hosted Cloud spaces with shareable day links, or local Vite.

## Quick start (local Cloud)

```bash
cd jev-intuition
npm install
export TYPESAFE_API_KEY=…   # for Re-judge / auto-route / jev-decide
npm run dev
```

Open http://127.0.0.1:5173 → **Create free space** → save the `wsk_…` token →
**Open dashboard**.

```bash
export INTUITION_URL=http://127.0.0.1:5173
export INTUITION_TOKEN=wsk_…
```

## Product paths

| Path | What |
| --- | --- |
| `/` | Landing — create a workspace, copy install env |
| `/app` | Live dashboard (token in localStorage) |
| `/s/:id` | Read-only shared day |

## Ingest a beat

```bash
node scripts/jev-decide.mjs \
  --kind route|compact|gate \
  --intent "…" \
  --state "…"
```

Or POST JSON to `/api/beats` with `Authorization: Bearer $INTUITION_TOKEN`.

## Auto-route (Claude Code)

Hook: `scripts/intuition-route-hook.mjs` (see `.claude/settings.json`).

```bash
export INTUITION_URL=https://your-host
export INTUITION_TOKEN=wsk_…
# TYPESAFE_API_KEY required
# INTUITION_AUTO_ROUTE=0 to disable
```

Skill: `skills/intuition-bridge` → symlink into `~/.claude/skills/`.

## Production

```bash
npm run build
PORT=8787 TYPESAFE_API_KEY=… npm start
```

Docker:

```bash
docker build -t intuition-cloud .
docker run -p 8787:8787 -e TYPESAFE_API_KEY=… -v intuition-data:/app/data intuition-cloud
```

Data lives under `data/cloud/` (gitignored): workspaces, day sessions, share links.

## API (auth: Bearer wsk_…)

- `POST /api/workspaces` — create space (public; token shown once)
- `GET /api/session?date=` — day session
- `GET /api/sessions` — day list
- `POST /api/beats` — ingest beat
- `POST /api/share` — `{ date? }` → share URL
- `GET /api/share/:id` — public read-only session
- `POST /api/systemone` — proxy Jev (needs `TYPESAFE_API_KEY`)
