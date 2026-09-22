import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, getToken, setToken } from "../lib/api";

export function Landing() {
  const nav = useNavigate();
  const existing = getToken();
  const [name, setName] = useState("My INTUITION");
  const [token, setTok] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function create() {
    setBusy(true);
    setErr(null);
    try {
      const data = await api<{ token: string }>(
        "/api/workspaces",
        { method: "POST", body: JSON.stringify({ name }) },
        { auth: false },
      );
      setToken(data.token);
      setTok(data.token);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="landing">
      <p className="landing__mark">INTUITION</p>
      <h1 className="landing__title">See why your agent decided.</h1>
      <p className="landing__lead">
        System One flight instruments for route, context, and gates — hosted,
        shareable, and wired to Claude in one token.
      </p>

      {existing && !token ? (
        <div className="landing__actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => nav("/app")}
          >
            Open dashboard
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setTok(existing)}
          >
            Show install token
          </button>
        </div>
      ) : null}

      {!token ? (
        <div className="landing__create">
          <label>
            Space name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={64}
            />
          </label>
          <button
            type="button"
            className="btn btn--primary"
            disabled={busy}
            onClick={() => void create()}
          >
            {busy ? "Creating…" : "Create free space"}
          </button>
          {err ? <p className="controls__error">{err}</p> : null}
        </div>
      ) : (
        <div className="landing__token">
          <p className="landing__token-label">Your workspace token (save it)</p>
          <code className="landing__token-value">{token}</code>
          <pre className="landing__snippet">{`export INTUITION_URL=${origin}
export INTUITION_TOKEN=${token}`}</pre>
          <div className="landing__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => nav("/app")}
            >
              Open dashboard
            </button>
            <Link className="btn" to="/app">
              Continue
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
