#!/usr/bin/env node
/**
 * Claude Code UserPromptSubmit hook: auto-route via Jev → INTUITION,
 * then inject a short System One hint for Claude.
 *
 * Fail-open: any error exits 0 with no JSON so the prompt still proceeds.
 *
 * Env:
 *   TYPESAFE_API_KEY   required for live Jev (else skip quietly)
 *   INTUITION_URL      default http://localhost:5173
 *   INTUITION_TOKEN    workspace token (wsk_…) for Cloud ingest
 *   INTUITION_AUTO_ROUTE=0  disable without removing the hook
 */

import { readFileSync } from "node:fs";

const INTUITION_URL = (
  process.env.INTUITION_URL || "http://localhost:5173"
).replace(/\/$/, "");
const INTUITION_TOKEN = process.env.INTUITION_TOKEN || "";
const KEY = process.env.TYPESAFE_API_KEY;

const ROUTE_QUESTION = {
  type: "choice",
  instructions: "Which handler should take this turn?",
  criteria: {
    lite: "Trivial lookup or short answer; use a fast cheap model",
    default: "Normal coding work; standard agent model",
    reason: "Needs deep reasoning or multi-file planning",
  },
};

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function emitContext(text) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: text,
      },
    }),
  );
}

async function main() {
  if (process.env.INTUITION_AUTO_ROUTE === "0") {
    process.exit(0);
  }

  const raw = readStdin();
  let payload = {};
  try {
    payload = JSON.parse(raw || "{}");
  } catch {
    process.exit(0);
  }

  const prompt = String(payload.prompt || "").trim();
  if (!prompt || !KEY) {
    process.exit(0);
  }

  if (prompt.length < 8 || prompt.startsWith("/")) {
    process.exit(0);
  }

  const state = [
    `User prompt:\n${prompt.slice(0, 4000)}`,
    payload.cwd ? `cwd: ${payload.cwd}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const started = Date.now();
  let answer;
  try {
    const upstream = await fetch("https://api.typesafe.ai/v1/systemone", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "jev-latest",
        state,
        questions: { route: ROUTE_QUESTION },
      }),
      signal: AbortSignal.timeout(12000),
    });
    const data = await upstream.json();
    if (!upstream.ok) process.exit(0);
    answer = data.answers?.route;
    if (!answer || answer.type !== "choice") process.exit(0);
  } catch {
    process.exit(0);
  }

  const latencyMs = Date.now() - started;
  const conf = Math.round((answer.confidence ?? 0) * 100);
  const summary = `${answer.choice} (conf ${conf}%)`;
  const hint =
    answer.choice === "lite"
      ? "Prefer a short, cheap path — lookup or minimal change."
      : answer.choice === "reason"
        ? "Prefer deeper multi-file reasoning before acting."
        : "Use the normal coding path.";

  const beat = {
    kind: "route",
    label: `route · ${summary}`,
    intent: prompt.slice(0, 120),
    statePreview: prompt.slice(0, 120),
    state,
    questionKey: "route",
    question: ROUTE_QUESTION,
    answer,
    latencyMs,
    acted: `Auto-route on UserPromptSubmit → ${summary}`,
    title: "Claude · auto-route",
  };

  try {
    const headers = { "Content-Type": "application/json" };
    if (INTUITION_TOKEN) {
      headers.Authorization = `Bearer ${INTUITION_TOKEN}`;
    }
    await fetch(`${INTUITION_URL}/api/beats`, {
      method: "POST",
      headers,
      body: JSON.stringify(beat),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    /* dashboard optional */
  }

  const dash = INTUITION_TOKEN
    ? `${INTUITION_URL}/app`
    : INTUITION_URL;
  emitContext(
    `[INTUITION auto-route] Jev chose ${summary}. ${hint} Dashboard: ${dash}`,
  );
}

main().catch(() => process.exit(0));
