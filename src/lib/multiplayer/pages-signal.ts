/**
 * Pages-friendly signaling for P2PRoom. Live GitHub Pages is static:
 * `/api/rtc` 404s, so this never talks to a Vercel/Node route.
 *
 * Paths, in order:
 * 1. BroadcastChannel — two tabs on the same origin (github.io or localhost).
 * 2. Public ntfy.sh topic (no auth) — two browsers on different machines.
 * 3. Copy-paste handshake tape — works with no relay at all.
 *
 * STUN stays the Google/Cloudflare servers already listed in p2p.ts.
 */
import {
  applyWire,
  exportTape,
  importTape,
  newMailbox,
  pollMailbox,
  type Mailbox,
  type WireMsg,
} from "./signal-mailbox";
import type { SignalKind, SignalTransport } from "./p2p";

const NTFY = "https://ntfy.sh";
const HELLO_TTL_MS = 12_000;
const HELLO_EVERY_MS = 3000;

export function makeRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = new Uint8Array(5);
  crypto.getRandomValues(buf);
  let s = "";
  for (const b of buf) s += alphabet[b % alphabet.length]!;
  return s;
}

export function makePeerId(): string {
  return crypto.randomUUID?.() ?? `p-${Math.random().toString(36).slice(2, 12)}`;
}

export type PagesSignal = SignalTransport & {
  room: string;
  dispose(): void;
  exportHandshake(): string;
  importHandshake(raw: string): void;
  relayOpen(): boolean;
};

export function createPagesSignal(room: string): PagesSignal {
  const code = room.toUpperCase();
  const topic = `sr84-${code.toLowerCase()}`;
  const localTopic = `saucer-raid:${code}`;
  const box: Mailbox = newMailbox();
  const seen = new Map<string, number>();
  let nextId = Date.now();
  let closed = false;
  let ws: WebSocket | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let lastHelloAt = 0;

  const channel =
    typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(localTopic) : null;

  const ingest = (msg: WireMsg) => {
    if (msg.t === "hello") seen.set(msg.peer.id, Date.now());
    if (msg.t === "bye") seen.delete(msg.id);
    applyWire(box, msg);
  };

  const sweep = () => {
    const now = Date.now();
    for (const [id, at] of seen) {
      if (now - at > HELLO_TTL_MS) {
        seen.delete(id);
        applyWire(box, { t: "bye", id });
      }
    }
  };

  const broadcast = (msg: WireMsg) => {
    try {
      channel?.postMessage(msg);
    } catch {
      /* private mode */
    }
    void fetch(`${NTFY}/${topic}`, {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: JSON.stringify(msg),
    }).catch(() => {});
  };

  if (channel) {
    channel.onmessage = (ev) => {
      const msg = ev.data as WireMsg;
      if (msg && typeof msg === "object" && "t" in msg) ingest(msg);
    };
  }

  const connectRelay = () => {
    if (closed) return;
    try {
      ws = new WebSocket(`wss://ntfy.sh/${topic}/ws`);
    } catch {
      retry = setTimeout(connectRelay, 1500);
      return;
    }
    ws.onmessage = (ev) => {
      try {
        const env = JSON.parse(String(ev.data)) as { event?: string; message?: string };
        if (env.event !== "message" || !env.message) return;
        const msg = JSON.parse(env.message) as WireMsg;
        if (msg && typeof msg === "object" && "t" in msg) ingest(msg);
      } catch {
        /* ignore malformed relay frames */
      }
    };
    ws.onclose = () => {
      if (closed) return;
      retry = setTimeout(connectRelay, 1500);
    };
    ws.onerror = () => {
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
    };
  };
  connectRelay();

  return {
    room,
    relayOpen: () => ws?.readyState === WebSocket.OPEN,
    dispose() {
      closed = true;
      if (retry) clearTimeout(retry);
      try {
        channel?.close();
      } catch {
        /* ignore */
      }
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
    },
    exportHandshake() {
      return exportTape(box, code);
    },
    importHandshake(raw: string) {
      importTape(box, raw);
      for (const peer of box.peers.values()) seen.set(peer.id, Date.now());
    },
    async poll({ peer, name, since }) {
      sweep();
      const hello: WireMsg = { t: "hello", peer: { id: peer, name } };
      ingest(hello);
      if (Date.now() - lastHelloAt >= HELLO_EVERY_MS) {
        lastHelloAt = Date.now();
        broadcast(hello);
      }
      return pollMailbox(box, peer, name, since);
    },
    async post(body) {
      if (closed) return;
      if (body.op === "leave") {
        const msg: WireMsg = { t: "bye", id: body.peer };
        ingest(msg);
        broadcast(msg);
        return;
      }
      const row = {
        id: ++nextId,
        from: body.from,
        kind: body.kind as SignalKind,
        payload: body.payload,
      };
      const msg: WireMsg = { t: "sig", row };
      ingest(msg);
      broadcast(msg);
    },
  };
}
