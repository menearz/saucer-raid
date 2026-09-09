import {
  BOSS_FIGHT,
  BOSS_HELLO,
  BOSS_REPLY,
  BOSS_STING,
} from "../../game/raid-content.ts";
import { AHH_NOT_AGAIN, HUMAN_LINES } from "../../game/types.ts";

export type LiveShout = {
  id: number;
  text: string;
  life: number;
};

export type CaptionItem = {
  key: string;
  text: string;
};

type TrackedLive = {
  key: string;
  id: number;
  text: string;
  lastLife: number;
};

export type CaptionEngine = {
  tracked: TrackedLive[];
  pending: CaptionItem[];
  active: { item: CaptionItem; startedAt: number } | null;
  seq: number;
};

export type CaptionView = {
  text: string | null;
  pending: number;
};

const WEAPON_TIER_NAMES = new Set([
  "Laser",
  "Laser+",
  "Twin",
  "Spread",
  "Láser",
  "Láser+",
]);

const BOSS_LINES = new Set([BOSS_HELLO, BOSS_REPLY, BOSS_FIGHT, BOSS_STING]);
const COMEDY_LINES = new Set(HUMAN_LINES);

export function minReadSec(text: string): number {
  return Math.max(1.4, Math.min(2.6, text.length * 0.05));
}

export function isDialogueCaption(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (t.startsWith("+") || t.startsWith("×")) return false;
  if (/^\d/.test(t)) return false;
  const upper = t.toUpperCase();
  if (upper === "WEAPON CACHE" || upper === "CLOAK") return false;
  if (WEAPON_TIER_NAMES.has(t)) return false;
  return true;
}

export function captionPriority(text: string): number {
  if (BOSS_LINES.has(text)) return 0;
  if (text === AHH_NOT_AGAIN) return 1;
  if (COMEDY_LINES.has(text)) return 2;
  return 3;
}

export function pickHeadIndex(pending: { text: string }[]): number {
  let best = 0;
  let bestPri = captionPriority(pending[0]!.text);
  for (let i = 1; i < pending.length; i++) {
    const pri = captionPriority(pending[i]!.text);
    if (pri < bestPri) {
      best = i;
      bestPri = pri;
    }
  }
  return best;
}

export function createCaptionEngine(): CaptionEngine {
  return { tracked: [], pending: [], active: null, seq: 0 };
}

export function captionView(engine: CaptionEngine): CaptionView {
  return {
    text: engine.active?.item.text ?? null,
    pending: engine.pending.length,
  };
}

export function pushLiveShouts(engine: CaptionEngine, shouts: LiveShout[]): void {
  const live = shouts.filter((s) => s.life > 0 && isDialogueCaption(s.text));
  const used = new Set<number>();
  const tracked: TrackedLive[] = [];

  for (const prev of engine.tracked) {
    let best = -1;
    let bestDelta = Infinity;
    for (let i = 0; i < live.length; i++) {
      if (used.has(i)) continue;
      const s = live[i]!;
      if (s.id !== prev.id || s.text !== prev.text) continue;
      if (s.life > prev.lastLife + 0.1) continue;
      const delta = Math.abs(prev.lastLife - s.life);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = i;
      }
    }
    if (best >= 0) {
      used.add(best);
      tracked.push({ ...prev, lastLife: live[best]!.life });
    }
  }

  for (let i = 0; i < live.length; i++) {
    if (used.has(i)) continue;
    const s = live[i]!;
    engine.seq += 1;
    const item: CaptionItem = { key: `${s.id}:${s.text}:${engine.seq}`, text: s.text };
    tracked.push({ key: item.key, id: s.id, text: s.text, lastLife: s.life });
    engine.pending.push(item);
  }

  engine.tracked = tracked;
}

export function stepCaptionEngine(engine: CaptionEngine, nowSec: number): void {
  if (engine.active) {
    const held = nowSec - engine.active.startedAt >= minReadSec(engine.active.item.text);
    const stillLive = engine.tracked.some((t) => t.key === engine.active!.item.key);
    if (held && (!stillLive || engine.pending.length > 0)) {
      engine.active = null;
    }
  }
  if (!engine.active && engine.pending.length > 0) {
    const i = pickHeadIndex(engine.pending);
    const item = engine.pending.splice(i, 1)[0]!;
    engine.active = { item, startedAt: nowSec };
  }
}

export function syncCaptionEngine(
  engine: CaptionEngine,
  shouts: LiveShout[],
  nowSec: number,
): CaptionView {
  pushLiveShouts(engine, shouts);
  stepCaptionEngine(engine, nowSec);
  return captionView(engine);
}
