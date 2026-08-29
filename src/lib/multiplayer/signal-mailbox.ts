import type { PeerRow, SignalRow, RtcPollResponse } from "./p2p";

export type WireMsg =
  | { t: "hello"; peer: PeerRow }
  | { t: "bye"; id: string }
  | { t: "sig"; row: SignalRow };

export type Mailbox = {
  peers: Map<string, PeerRow>;
  signals: SignalRow[];
};

export function newMailbox(): Mailbox {
  return { peers: new Map(), signals: [] };
}

export function applyWire(box: Mailbox, msg: WireMsg): void {
  if (msg.t === "hello") {
    box.peers.set(msg.peer.id, msg.peer);
    return;
  }
  if (msg.t === "bye") {
    box.peers.delete(msg.id);
    return;
  }
  if (msg.t === "sig") {
    if (box.signals.some((s) => s.id === msg.row.id && s.from === msg.row.from)) return;
    box.signals.push(msg.row);
  }
}

export function pollMailbox(
  box: Mailbox,
  selfId: string,
  name: string,
  since: number,
): RtcPollResponse {
  box.peers.set(selfId, { id: selfId, name });
  return {
    peers: [...box.peers.values()],
    signals: box.signals.filter((s) => s.id > since && s.from !== selfId),
  };
}

export type Tape = {
  room: string;
  peers: PeerRow[];
  signals: SignalRow[];
};

export function exportTape(box: Mailbox, room: string): string {
  const tape: Tape = {
    room,
    peers: [...box.peers.values()],
    signals: box.signals,
  };
  return encodeTape(tape);
}

export function importTape(box: Mailbox, raw: string): Tape {
  const tape = decodeTape(raw);
  for (const peer of tape.peers) applyWire(box, { t: "hello", peer });
  for (const row of tape.signals) applyWire(box, { t: "sig", row });
  return tape;
}

export function encodeTape(tape: Tape): string {
  const json = JSON.stringify(tape);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeTape(raw: string): Tape {
  const b64 = raw.trim().replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes)) as Tape;
}
