---
name: intuition-bridge
description: >
  Push System One (Jev) decisions into the local INTUITION dashboard so the user
  can see why a route / context / gate judgment was made. Use when the user asks
  to show intuition, visualize Jev decisions, route vs deep model, compact
  context, or gate a risky tool — or when making those judgments during a coding
  session with INTUITION running.
---

# INTUITION bridge (Claude → Jev → dashboard)

When you need a fast typed judgment (route / compact / gate), do **not** invent
probabilities. Run the local CLI; it calls Jev and posts the beat to INTUITION.

## Prerequisites

1. INTUITION dev server: `cd ~/chyworkspace/jev-intuition && npm run dev` (default http://127.0.0.1:5173)
2. `TYPESAFE_API_KEY` in the environment
3. User has the dashboard open in a browser

## Command

```bash
node /home/chenyibw2026/chyworkspace/jev-intuition/scripts/jev-decide.mjs \
  --kind route|compact|gate \
  --intent "short user-facing intent" \
  --state "the state Jev should see" \
  [--acted "what you will do next"] \
  [--title "optional session title"]
```

Stdout is JSON: `summary`, `answer`, `intuition` (`posted` | `not_posted`).

## When to call which kind

| Kind | Use when |
| --- | --- |
| `route` | Choosing lite vs default vs deep effort for this turn |
| `compact` | Deciding keep / truncate / drop for a large tool result |
| `gate` | Before a destructive or network-pipe shell / risky tool |

## After the call

1. Read `summary` / `answer` and follow it in your next step (or explain if you override).
2. Tell the user to look at INTUITION — the new beat appears on the timeline automatically.
3. If `intuition` is `not_posted`, say the dashboard may be down; still use the Jev answer.

## Do not

- Fabricate confidence or noul values without calling the script
- Spam every trivial turn; call when the judgment would change behavior
