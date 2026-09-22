---
name: intuition-bridge
description: >
  Push System One (Jev) decisions into the INTUITION Cloud dashboard so the user
  can see why a route / context / gate judgment was made. Use when the user asks
  to show intuition, visualize Jev decisions, route vs deep model, compact
  context, or gate a risky tool — or when making those judgments during a coding
  session with INTUITION running.
---

# INTUITION bridge (Claude → Jev → dashboard)

When you need a fast typed judgment (route / compact / gate), do **not** invent
probabilities. Run the CLI; it calls Jev and posts the beat to INTUITION Cloud.

## Prerequisites

1. INTUITION running (`npm run dev` or a hosted Cloud URL)
2. `TYPESAFE_API_KEY` in the environment
3. `INTUITION_TOKEN` (workspace `wsk_…` from the landing page)
4. Optional: `INTUITION_URL` (default `http://localhost:5173`)
5. User has `/app` open in a browser (token already saved there)

## Command

Resolve the repo root (directory that contains `scripts/jev-decide.mjs`), then:

```bash
export INTUITION_TOKEN=wsk_…   # if not already set
node scripts/jev-decide.mjs \
  --kind route|compact|gate \
  --intent "short user-facing intent" \
  --state "the state Jev should see" \
  [--acted "what you will do next"] \
  [--title "optional session title"]
```

If the skill is symlinked from a clone, prefer an absolute path to that clone’s
`scripts/jev-decide.mjs` so the command works from any cwd.

Stdout is JSON: `summary`, `answer`, `intuition` (`posted` | `not_posted`).

## When to call which kind

| Kind | Use when |
| --- | --- |
| `route` | Choosing lite vs default vs deep effort for this turn |
| `compact` | Deciding keep / truncate / drop for a large tool result |
| `gate` | Before a destructive or network-pipe shell / risky tool |

## After the call

1. Read `summary` / `answer` and follow it in your next step (or explain if you override).
2. Tell the user to look at INTUITION `/app` — the new beat appears on the timeline.
3. If `intuition` is `not_posted`, say the dashboard may be down or the token missing; still use the Jev answer.

## Do not

- Fabricate confidence or noul values without calling the script
- Spam every trivial turn; call when the judgment would change behavior
