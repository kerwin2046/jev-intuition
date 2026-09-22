import { createHash, randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { IntuitionBeat, Session } from "../../src/types/intuition.ts";

export type WorkspaceMeta = {
  id: string;
  tokenHash: string;
  createdAt: number;
  name: string;
};

export type PersistedDay = {
  date: string;
  startedAt: number;
  session: Session;
};

export type ShareRecord = {
  id: string;
  workspaceId: string;
  date: string;
  createdAt: number;
};

function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function emptySession(date: string, title = "Waiting for beats"): Session {
  return {
    id: `live-${date}`,
    title,
    beats: [],
  };
}

export class CloudStore {
  root: string;

  constructor(root = join(process.cwd(), "data", "cloud")) {
    this.root = root;
    mkdirSync(join(this.root, "workspaces"), { recursive: true });
    mkdirSync(join(this.root, "shares"), { recursive: true });
    mkdirSync(join(this.root, "tokens"), { recursive: true });
  }

  private wsDir(id: string) {
    return join(this.root, "workspaces", id);
  }

  private dayPath(workspaceId: string, date: string) {
    return join(this.wsDir(workspaceId), "sessions", `${date}.json`);
  }

  createWorkspace(name = "My INTUITION"): {
    id: string;
    token: string;
    meta: WorkspaceMeta;
  } {
    const id = `ws_${randomBytes(8).toString("hex")}`;
    const token = `wsk_${randomBytes(24).toString("hex")}`;
    const meta: WorkspaceMeta = {
      id,
      tokenHash: hashToken(token),
      createdAt: Date.now(),
      name,
    };
    const dir = this.wsDir(id);
    mkdirSync(join(dir, "sessions"), { recursive: true });
    writeFileSync(join(dir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
    writeFileSync(
      join(this.root, "tokens", `${meta.tokenHash}.json`),
      JSON.stringify({ workspaceId: id }, null, 2) + "\n",
    );
    return { id, token, meta };
  }

  resolveToken(token: string | null | undefined): WorkspaceMeta | null {
    if (!token?.startsWith("wsk_")) return null;
    const th = hashToken(token);
    const mapPath = join(this.root, "tokens", `${th}.json`);
    if (!existsSync(mapPath)) return null;
    try {
      const { workspaceId } = JSON.parse(readFileSync(mapPath, "utf8")) as {
        workspaceId: string;
      };
      const metaPath = join(this.wsDir(workspaceId), "meta.json");
      const meta = JSON.parse(readFileSync(metaPath, "utf8")) as WorkspaceMeta;
      if (meta.tokenHash !== th) return null;
      return meta;
    } catch {
      return null;
    }
  }

  loadDay(workspaceId: string, date: string): PersistedDay {
    const path = this.dayPath(workspaceId, date);
    if (!existsSync(path)) {
      return {
        date,
        startedAt: Date.now(),
        session: emptySession(date),
      };
    }
    try {
      const raw = JSON.parse(readFileSync(path, "utf8")) as PersistedDay;
      return {
        date: raw.date || date,
        startedAt: raw.startedAt || Date.now(),
        session: raw.session ?? emptySession(date),
      };
    } catch {
      return {
        date,
        startedAt: Date.now(),
        session: emptySession(date),
      };
    }
  }

  saveDay(workspaceId: string, day: PersistedDay) {
    mkdirSync(join(this.wsDir(workspaceId), "sessions"), { recursive: true });
    writeFileSync(
      this.dayPath(workspaceId, day.date),
      JSON.stringify(day, null, 2) + "\n",
    );
  }

  listDays(workspaceId: string): Array<{
    date: string;
    title: string;
    beatCount: number;
  }> {
    const dir = join(this.wsDir(workspaceId), "sessions");
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .map((f) => {
        const date = f.replace(/\.json$/, "");
        const day = this.loadDay(workspaceId, date);
        return {
          date,
          title: day.session.title,
          beatCount: day.session.beats.length,
        };
      })
      .filter((d) => d.beatCount > 0)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  appendBeat(
    workspaceId: string,
    raw: Partial<IntuitionBeat> & { title?: string },
  ): { beat: IntuitionBeat; day: PersistedDay } | null {
    if (!raw.kind || !raw.question || !raw.answer || !raw.questionKey) {
      return null;
    }
    const date = todayKey();
    const day = this.loadDay(workspaceId, date);
    const turn = raw.turn ?? day.session.beats.length + 1;
    const beat: IntuitionBeat = {
      id: raw.id ?? `live-${Date.now()}-${turn}`,
      t: raw.t ?? Date.now() - day.startedAt,
      turn,
      kind: raw.kind,
      label: raw.label ?? `${raw.kind} · turn ${turn}`,
      intent: raw.intent ?? "",
      statePreview: raw.statePreview ?? (raw.state ?? "").slice(0, 120),
      state: raw.state ?? "",
      questionKey: raw.questionKey,
      question: raw.question,
      answer: raw.answer,
      latencyMs: raw.latencyMs ?? 0,
      acted: raw.acted ?? "",
    };
    let title = raw.title ?? day.session.title;
    if (title === "Waiting for beats") title = "Live session";
    day.session = {
      ...day.session,
      title,
      beats: [...day.session.beats, beat],
    };
    this.saveDay(workspaceId, day);
    return { beat, day };
  }

  resetToday(workspaceId: string): PersistedDay {
    const date = todayKey();
    const day: PersistedDay = {
      date,
      startedAt: Date.now(),
      session: emptySession(date),
    };
    this.saveDay(workspaceId, day);
    return day;
  }

  createShare(workspaceId: string, date: string): ShareRecord {
    const id = `sh_${randomBytes(8).toString("hex")}`;
    const rec: ShareRecord = {
      id,
      workspaceId,
      date: date || todayKey(),
      createdAt: Date.now(),
    };
    writeFileSync(
      join(this.root, "shares", `${id}.json`),
      JSON.stringify(rec, null, 2) + "\n",
    );
    return rec;
  }

  getShare(id: string): { share: ShareRecord; day: PersistedDay } | null {
    const path = join(this.root, "shares", `${id}.json`);
    if (!existsSync(path)) return null;
    try {
      const share = JSON.parse(readFileSync(path, "utf8")) as ShareRecord;
      const day = this.loadDay(share.workspaceId, share.date);
      return { share, day };
    } catch {
      return null;
    }
  }
}

export { todayKey };
