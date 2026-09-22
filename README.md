# INTUITION

Local flight instruments for an agent’s System One layer — route, context compression, and tool gates.

- **Demo**: fixture replay (no agent needed)
- **Live (Claude)**: beats appear when Claude (or a hook) posts Jev judgments
- **Auto-route**: Claude Code `UserPromptSubmit` hook runs Jev route on each prompt

## Run dashboard

```bash
cd jev-intuition
npm install
npm run dev
```

Open http://127.0.0.1:5173. Requires `TYPESAFE_API_KEY` for live Jev / Re-judge / auto-route.

Live beats are saved under `data/sessions/YYYY-MM-DD.json` (gitignored). Restart the dashboard and today’s timeline is still there; use the Day dropdown to open older days.

## Auto-route (Claude Code)

Project hooks live in [`.claude/settings.json`](.claude/settings.json). For **all** Claude sessions on this machine, the hook is also installed in `~/.claude/settings.json` pointing at `scripts/intuition-route-hook.mjs`.

Keep the dashboard running, then start a **new** Claude Code session and send any normal prompt. A route beat should appear on INTUITION, and Claude gets a short `[INTUITION auto-route]` hint.

Disable without uninstalling:

```bash
export INTUITION_AUTO_ROUTE=0
```

## Manual decide / skill

Install the skill (once), from this repo root:

```bash
mkdir -p ~/.claude/skills
ln -sfn "$(pwd)/skills/intuition-bridge" ~/.claude/skills/intuition-bridge
```

Or call directly:

```bash
node scripts/jev-decide.mjs \
  --kind route|compact|gate \
  --intent "your intent" \
  --state "full state for Jev"
```

Env `INTUITION_URL` overrides the dashboard URL (default `http://localhost:5173`).
