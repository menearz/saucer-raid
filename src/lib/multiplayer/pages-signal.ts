/**
 * Pages-friendly signaling for P2PRoom. Live GitHub Pages is static:
 * `/api/rtc` 404s, so this never talks to a Vercel/Node route.
 *
 * Paths, in order:
 * 1. BroadcastChannel — two tabs on the same origin (github.io or localhost).
 * 2. Public y-webrtc pub/sub (no auth) — two browsers on different machines.
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

const RELAYS = [
  "wss://signaling.yjs.dev",
  "wss://y-webrtc-signaling-eu.fly.dev",
  "wss://y-webrtc-signaling-us.fly.dev",
];

const HELLO_TTL_MS = 12_000;

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
  const topic = `saucer-raid:${room.toUpperCase()}`;
  const box: Mailbox = newMailbox();
  const seen = new Map<string, number>();
  let nextId = Date.now();
  let closed = false;
  let ws: WebSocket | null = null;
  let relay = 0;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let ping: ReturnType<typeof setInterval> | null = null;

  const channel =
    typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(topic) : null;

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

  const sendWs = (payload: unknown) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  };

  const broadcast = (msg: WireMsg) => {
    try {
      channel?.postMessage(msg);
    } catch {
      /* private mode */
    }
    sendWs({ type: "publish", topic, data: msg });
  };

  if (channel) {
    channel.onmessage = (ev) => {
      const msg = ev.data as WireMsg;
      if (msg && typeof msg === "object" && "t" in msg) ingest(msg);
    };
  }

  const connectRelay = () => {
    if (closed || relay >= RELAYS.length) return;
    const url = RELAYS[relay]!;
    try {
      ws = new WebSocket(url);
    } catch {
      relay += 1;
      retry = setTimeout(connectRelay, 600);
      return;
    }
    ws.onopen = () => {
      sendWs({ type: "subscribe", topics: [topic] });
    };
    ws.onmessage = (ev) => {
      let parsed: { type?: string; topic?: string; data?: WireMsg };
      try {
        parsed = JSON.parse(String(ev.data)) as typeof parsed;
      } catch {
        return;
      }
      if (parsed.type === "ping") {
        sendWs({ type: "pong" });
        return;
      }
      const msg = parsed.data;
      if (parsed.type === "publish" && msg && typeof msg === "object" && "t" in msg) {
        ingest(msg);
      }
    };
    ws.onclose = () => {
      if (closed) return;
      relay += 1;
      retry = setTimeout(connectRelay, 800);
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
  ping = setInterval(() => sendWs({ type: "ping" }), 8000);

  return {
    room,
    relayOpen: () => ws?.readyState === WebSocket.OPEN,
    dispose() {
      closed = true;
      if (retry) clearTimeout(retry);
      if (ping) clearInterval(ping);
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
      return exportTape(box, room);
    },
    importHandshake(raw: string) {
      importTape(box, raw);
      for (const peer of box.peers.values()) seen.set(peer.id, Date.now());
    },
    async poll({ peer, name, since }) {
      sweep();
      const hello: WireMsg = { t: "hello", peer: { id: peer, name } };
      ingest(hello);
      broadcast(hello);
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
