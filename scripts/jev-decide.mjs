#!/usr/bin/env node
/**
 * Claude / any agent: call Jev, then push a beat into INTUITION.
 *
 * Usage:
 *   node scripts/jev-decide.mjs --kind route --intent "..." --state "..." [--acted "..."]
 *   node scripts/jev-decide.mjs --kind compact --intent "..." --state "..."
 *   node scripts/jev-decide.mjs --kind gate --intent "..." --state "..."
 *
 * Env:
 *   TYPESAFE_API_KEY   required
 *   INTUITION_URL      default http://127.0.0.1:5173
 *   INTUITION_TOKEN    workspace token (wsk_…) for Cloud ingest
 */

const INTUITION_URL = (
  process.env.INTUITION_URL || "http://localhost:5173"
).replace(/\/$/, "");
const INTUITION_TOKEN = process.env.INTUITION_TOKEN || "";
const KEY = process.env.TYPESAFE_API_KEY;

const PRESETS = {
  route: {
    questionKey: "route",
    question: {
      type: "choice",
      instructions: "Which handler should take this turn?",
      criteria: {
        lite: "Trivial lookup or short answer; use a fast cheap model",
        default: "Normal coding work; standard agent model",
        reason: "Needs deep reasoning or multi-file planning",
      },
    },
  },
  compact: {
    questionKey: "keep",
    question: {
      type: "choice",
      instructions:
        "For context compression, what should we do with this stale tool unit?",
      criteria: {
        keep: "Still needed for the next reasoning step",
        truncate: "Keep head+tail; drop middle noise",
        drop: "Safe to remove entirely",
      },
    },
  },
  gate: {
    questionKey: "block",
    question: {
      type: "noul",
      instructions:
        "Should this tool call be blocked and sent to human review before running?",
    },
  },
};

function parseArgs(argv) {
  const out = { kind: null, intent: "", state: "", acted: "", title: "" };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === "--kind" && next) {
      out.kind = next;
      i++;
    } else if (a === "--intent" && next) {
      out.intent = next;
      i++;
    } else if (a === "--state" && next) {
      out.state = next;
      i++;
    } else if (a === "--acted" && next) {
      out.acted = next;
      i++;
    } else if (a === "--title" && next) {
      out.title = next;
      i++;
    } else if (a === "--help" || a === "-h") {
      out.help = true;
    }
  }
  return out;
}

function summarizeAnswer(kind, answer) {
  if (kind === "gate" && answer.type === "noul") {
    const n = answer.noul;
    const band = n >= 0.55 ? "block" : n >= 0.35 ? "review" : "pass";
    return `${band} (noul ${(n * 100).toFixed(0)}%)`;
  }
  if (answer.type === "choice") {
    return `${answer.choice} (conf ${((answer.confidence ?? 0) * 100).toFixed(0)}%)`;
  }
  return JSON.stringify(answer);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.kind) {
    console.log(`Usage:
  node scripts/jev-decide.mjs --kind route|compact|gate --intent "..." --state "..." [--acted "..."] [--title "..."]

Pushes the judgment to INTUITION at ${INTUITION_URL}
Requires TYPESAFE_API_KEY. Set INTUITION_TOKEN for Cloud workspaces.`);
    process.exit(args.help ? 0 : 1);
  }

  if (!KEY) {
    console.error("TYPESAFE_API_KEY is not set");
    process.exit(1);
  }

  const preset = PRESETS[args.kind];
  if (!preset) {
    console.error(`Unknown kind: ${args.kind}`);
    process.exit(1);
  }
  if (!args.state) {
    console.error("--state is required");
    process.exit(1);
  }

  const started = Date.now();
  const upstream = await fetch("https://api.typesafe.ai/v1/systemone", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "jev-latest",
      state: args.state,
      questions: { [preset.questionKey]: preset.question },
    }),
  });
  const data = await upstream.json();
  if (!upstream.ok) {
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  const answer = data.answers?.[preset.questionKey];
  if (!answer) {
    console.error("No answer in response:", JSON.stringify(data, null, 2));
    process.exit(1);
  }

  const latencyMs = Date.now() - started;
  const summary = summarizeAnswer(args.kind, answer);
  const acted = args.acted || `Claude followed Jev → ${summary}`;

  const beat = {
    kind: args.kind,
    label: `${args.kind} · ${summary}`,
    intent: args.intent || args.state.slice(0, 80),
    statePreview: args.state.slice(0, 120),
    state: args.state,
    questionKey: preset.questionKey,
    question: preset.question,
    answer,
    latencyMs,
    acted,
    title: args.title || undefined,
  };

  let posted = false;
  try {
    const headers = { "Content-Type": "application/json" };
    if (INTUITION_TOKEN) {
      headers.Authorization = `Bearer ${INTUITION_TOKEN}`;
    }
    const res = await fetch(`${INTUITION_URL}/api/beats`, {
      method: "POST",
      headers,
      body: JSON.stringify(beat),
    });
    posted = res.ok;
    if (!res.ok) {
      const err = await res.text();
      console.error(`INTUITION post failed (${res.status}): ${err}`);
    }
  } catch (err) {
    console.error(
      `INTUITION unreachable at ${INTUITION_URL}:`,
      err instanceof Error ? err.message : err,
    );
  }

  const out = {
    ok: true,
    kind: args.kind,
    summary,
    answer,
    latencyMs,
    intuition: posted ? "posted" : "not_posted",
    dashboard: INTUITION_TOKEN ? `${INTUITION_URL}/app` : INTUITION_URL,
  };
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
