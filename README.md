# INTUITION

Local flight instruments for an agent’s System One layer — route, context compression, and tool gates.

- **Demo**: fixture replay (no agent needed)
- **Live (Claude)**: Claude runs `scripts/jev-decide.mjs`; beats appear on the timeline in real time

## Run dashboard

```bash
cd jev-intuition
npm install
npm run dev
```

Open http://127.0.0.1:5173. Optional: `TYPESAFE_API_KEY` for live Jev / Re-judge.

## Wire Claude Code

1. Keep the dashboard running.
2. Install the skill (once), from this repo root:

```bash
mkdir -p ~/.claude/skills
ln -sfn "$(pwd)/skills/intuition-bridge" ~/.claude/skills/intuition-bridge
```

3. In Claude, ask something like: “用 Jev 判断这轮该不该深推理，并推到 INTUITION”.
   Claude should run (from this repo root):

```bash
node scripts/jev-decide.mjs \
  --kind route \
  --intent "your intent" \
  --state "full state for Jev"
```

4. Watch the dashboard switch to **Claude live** and show the new beat.

Kinds: `route` | `compact` | `gate`. Env `INTUITION_URL` overrides the dashboard URL (default `http://localhost:5173`).
