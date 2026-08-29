import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  applyWire,
  exportTape,
  importTape,
  newMailbox,
  pollMailbox,
} from "../src/lib/multiplayer/signal-mailbox.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HUD = readFileSync(join(ROOT, "src/components/game/SaucerRaid.tsx"), "utf8");
const P2P = readFileSync(join(ROOT, "src/lib/multiplayer/p2p.ts"), "utf8");

test("hangar title has a room code plus Host and Join", () => {
  assert.match(HUD, /P2PRoom/);
  assert.match(HUD, /createPagesSignal|pagesSignal|PagesSignal/);
  assert.match(HUD, />\s*Host\s*</);
  assert.match(HUD, />\s*Join\s*</);
  assert.match(HUD, /[Rr]oom code/);
});

test("P2PRoom keeps the WebRTC mesh and accepts a signal transport", () => {
  assert.match(P2P, /class P2PRoom/);
  assert.match(P2P, /onnegotiationneeded/);
  assert.match(P2P, /createDataChannel\("state"/);
  assert.match(P2P, /signal\?:/);
  assert.match(P2P, /stun:stun\.l\.google\.com:19302/);
});

test("mailbox poll returns peers and only new signals", () => {
  const box = newMailbox();
  applyWire(box, { t: "hello", peer: { id: "a", name: "Host" } });
  applyWire(box, {
    t: "sig",
    row: { id: 4, from: "a", kind: "offer", payload: { type: "offer" } },
  });
  applyWire(box, {
    t: "sig",
    row: { id: 7, from: "a", kind: "ice", payload: { candidate: "x" } },
  });
  const first = pollMailbox(box, "b", "Join", 0);
  assert.equal(first.peers.some((p) => p.id === "a"), true);
  assert.equal(first.signals.length, 2);
  const again = pollMailbox(box, "b", "Join", 7);
  assert.equal(again.signals.length, 0);
});

test("handshake tape round-trips offers without a Node API route", () => {
  const host = newMailbox();
  applyWire(host, { t: "hello", peer: { id: "host", name: "Host" } });
  applyWire(host, {
    t: "sig",
    row: { id: 1, from: "host", kind: "offer", payload: { sdp: "abc" } },
  });
  const tape = exportTape(host, "valley");
  assert.equal(tape.includes("/api/rtc"), false);
  const join = newMailbox();
  importTape(join, tape);
  const seen = pollMailbox(join, "join", "Join", 0);
  assert.equal(seen.peers.some((p) => p.id === "host"), true);
  assert.equal(seen.signals[0]?.kind, "offer");
});
