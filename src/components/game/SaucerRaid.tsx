import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { P2PRoom, type PeerInfo } from "@/lib/multiplayer/p2p";
import {
  createPagesSignal,
  makePeerId,
  makeRoomCode,
  type PagesSignal,
} from "@/lib/multiplayer/pages-signal";
import { wingmanWaitMessage } from "@/lib/multiplayer/wingman-status";
import { audio } from "@/game/audio";
import { loadArt } from "@/game/assets";
import {
  CRAFTS,
  cycleCraftId,
  loadCraftId,
  saveCraftId,
  type Craft,
  type CraftId,
} from "@/game/crafts";
import { haptics } from "@/game/haptics";
import { Input } from "@/game/input";
import type { GameHandle } from "@/game/loop";
import { useHud } from "@/game/store";
import { assetUrl } from "@/game/paths";
import {
  UPGRADES,
  buyUpgrade,
  loadProgress,
  ranksFor,
  resetProgress,
  upgradeCost,
  type MapMark,
  type UpgradeId,
} from "@/game/progress";
import {
  ALERT_KEYS,
  UPGRADE_KEYS,
  WEAPON_KEYS,
  applyDocumentLang,
  useI18n,
  useT,
  type Lang,
} from "@/game/i18n";
import { ALERTS } from "@/game/types";
import { createWorld, loadBest } from "@/game/world";
import { captionView, createCaptionEngine, syncCaptionEngine } from "./shout-caption";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function SaucerRaid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<GameHandle | null>(null);
  const inputRef = useRef(new Input());
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const hud = useHud();
  const pages = import.meta.env.VITE_PAGES === "true";
  const { user, isPending } = useCurrentUserState();
  const picked = useI18n((s) => s.picked);
  const readyLang = useI18n((s) => s.ready);
  const setLang = useI18n((s) => s.setLang);
  const lang = useI18n((s) => s.lang);
  const t = useT();

  useEffect(() => {
    useI18n.getState().hydrate();
  }, []);

  useEffect(() => {
    let dead = false;
    void loadArt()
      .catch(() => undefined)
      .then(() => {
        if (!dead) setReady(true);
      });
    return () => {
      dead = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const input = inputRef.current;
    input.attach(wrap);
    const world = createWorld();
    useHud.setState({ best: loadBest(), phase: "title" });
    let cancelled = false;
    let handle: GameHandle | null = null;
    void import("@/game/loop").then(({ runGame }) => {
      if (cancelled || !canvas.isConnected) return;
      handle = runGame(canvas, world, input);
      handleRef.current = handle;
    });

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.buttons & 1 && world.state.phase === "playing") {
        input.setFire(true);
        input.keys.add("Mouse0");
      }
    };
    const onUp = () => {
      input.setFire(false);
      input.keys.delete("Mouse0");
    };
    wrap.addEventListener("pointerdown", onPointer);
    window.addEventListener("pointerup", onUp);

    return () => {
      cancelled = true;
      wrap.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("pointerup", onUp);
      handle?.destroy();
      input.detach();
      handleRef.current = null;
    };
  }, [ready]);

  const begin = (kind: "start" | "next" | "retry" = "start") => {
    inputRef.current.reset();
    audio.unlock();
    haptics.unlock();
    handleRef.current?.start(kind);
  };

  const toTitle = () => {
    inputRef.current.reset();
    useHud.setState({
      phase: "title",
      level: loadProgress().level,
      salvage: loadProgress().salvage,
    });
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    audio.setMuted(next);
    haptics.tap();
  };

  return (
    <div
      ref={wrapRef}
      lang={lang}
      className="relative h-dvh w-full overflow-hidden bg-bg text-fg"
      style={{ touchAction: "none" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {hud.phase === "playing" && <HudOverlay hud={hud} />}
      {hud.phase === "playing" && <MiniMap marks={hud.marks} />}
      {hud.phase === "playing" && <ShoutLayer shouts={hud.shouts} />}
      {hud.phase === "playing" && (
        <TouchLayer
          input={inputRef.current}
          onPause={() => {
            haptics.tap();
            handleRef.current?.pause();
          }}
          muted={muted}
          onMute={toggleMute}
        />
      )}

      {hud.phase === "paused" && (
        <Overlay>
          <h2 className="font-display text-5xl tracking-tight landscape:text-4xl">{t("paused")}</h2>
          <p className="mt-2 text-sm text-muted">{t("raidOnHold")}</p>
          <div className="mt-6 flex flex-col gap-2 landscape:mt-4">
            <Primary
              onClick={() => {
                haptics.tap();
                handleRef.current?.resume();
              }}
            >
              {t("resume")}
            </Primary>
            <Ghost onClick={() => begin("retry")}>{t("restartRaid")}</Ghost>
            <LangSwitch />
          </div>
        </Overlay>
      )}

      {hud.phase === "upgrade" && (
        <UpgradeBay
          hud={hud}
          onNext={() => begin("next")}
          onRetry={() => begin("retry")}
          onHangar={toTitle}
        />
      )}

      {hud.phase === "title" && (
        <TitleScreen
          ready={ready}
          best={hud.best}
          onStart={() => begin("start")}
          onNewCampaign={() => {
            resetProgress();
            useHud.setState({ level: 1, salvage: 0 });
            haptics.tap();
          }}
          isPending={!pages && isPending}
          hasUser={!pages && !!user}
          showAccount={!pages}
        />
      )}

      {hud.phase === "title" && readyLang && !picked && (
        <LanguagePicker
          onPick={(lang) => {
            setLang(lang);
            haptics.tap();
          }}
        />
      )}
    </div>
  );
}

function TitleScreen({
  ready,
  best,
  onStart,
  onNewCampaign,
  isPending,
  hasUser,
  showAccount = true,
}: {
  ready: boolean;
  best: number;
  onStart: () => void;
  onNewCampaign: () => void;
  isPending: boolean;
  hasUser: boolean;
  showAccount?: boolean;
}) {
  const level = useHud((s) => s.level);
  const salvage = useHud((s) => s.salvage);
  const wrap = import.meta.env.VITE_WRAP === "true";
  const lang = useI18n((s) => s.lang);
  const t = useT();
  useEffect(() => {
    applyDocumentLang(lang, wrap);
  }, [wrap, lang]);
  return (
    <div className="absolute inset-0 z-20 flex flex-col overflow-y-auto overscroll-contain pointer-events-auto [touch-action:manipulation]">
      <img
        src={assetUrl("/game/title-bg.png")}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[center_30%] landscape:object-center"
      />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-bg/62 via-bg/70 to-bg/95 landscape:bg-linear-to-r landscape:from-bg/94 landscape:via-bg/72 landscape:to-bg/58" />
      <header className="relative z-10 flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
        <HangarLang />
        {showAccount ? (
          isPending ? (
            <div className="h-8 w-24 animate-pulse rounded-full bg-fg/10" />
          ) : hasUser ? (
            <SignedIn>
              <div className="rounded-full border border-border bg-surface/80 px-3 py-1 text-xs">
                <UserButton />
              </div>
            </SignedIn>
          ) : (
            <SignedOut>
              <Link
                to="/login"
                className="rounded-full border border-border bg-surface/80 px-4 py-2 text-sm text-fg"
              >
                {t("signIn")}
              </Link>
            </SignedOut>
          )
        ) : (
          <span className="shrink-0" />
        )}
      </header>
      <div className="relative z-10 flex flex-1 flex-col px-5 pb-1 pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] landscape:flex-row landscape:items-center landscape:gap-6 landscape:px-8 landscape:pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="landscape:w-[min(26rem,42%)] landscape:shrink-0">
          <div className="bg-bg/55 backdrop-blur-sm rounded-2xl px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-accent">
              {t("sector", { n: level })}
            </p>
            <HangarWordmark wrap={wrap} />
            <HangarPitch />
            {best > 0 && (
              <p className="mt-2 text-xs text-muted">
                {t("best")} <span className="tabular-nums text-fg">{best}</span>
                {salvage > 0 && (
                  <>
                    {" "}
                    · {t("salvage")} <span className="tabular-nums text-fg">{salvage}</span>
                  </>
                )}
              </p>
            )}
          </div>
          <div className="hidden landscape:block">
            <HangarInfo />
            <LaunchButton ready={ready} onStart={onStart} />
            {level > 1 && <NewCampaignButton onNewCampaign={onNewCampaign} />}
          </div>
        </div>
        <HangarPreview />
        <div className="landscape:hidden">
          <HangarInfo part="identity" />
        </div>
      </div>
      <div className="sticky bottom-0 z-30 shrink-0 landscape:hidden">
        <div className="bg-bg/90 px-5 pt-2 backdrop-blur-sm pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))]">
          <LaunchButton ready={ready} onStart={onStart} flush />
          {level > 1 && <NewCampaignButton onNewCampaign={onNewCampaign} />}
        </div>
      </div>
      <div className="relative z-10 w-full max-w-xs shrink-0 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1.25rem,env(safe-area-inset-left))]">
        <div className="landscape:hidden">
          <HangarInfo part="stats" />
        </div>
        <NetBay />
      </div>
    </div>
  );
}

function HangarWordmark({ wrap }: { wrap: boolean }) {
  const t = useT();
  const name = wrap ? t("wrapTitle") : t("siteTitle");
  return (
    <h1
      aria-label={name}
      className="font-display text-4xl leading-[0.85] tracking-tight sm:text-6xl landscape:text-5xl"
    >
      {wrap ? t("wrapTitleL1") : t("siteTitleL1")}
      <br />
      {wrap ? t("wrapTitleL2") : t("siteTitleL2")}
    </h1>
  );
}

function HangarPitch() {
  const t = useT();
  return (
    <div className="mt-1.5 max-w-sm space-y-1 landscape:mt-1.5">
      <p className="text-sm font-medium leading-snug text-fg">{t("pitchLead")}</p>
      <p className="line-clamp-1 text-xs leading-snug text-muted landscape:hidden">
        {t("pitchFly")} {t("pitchControls")}
      </p>
      <p className="hidden text-xs leading-snug text-muted landscape:block sm:text-sm">
        {t("pitchFly")}
      </p>
      <p className="hidden text-xs leading-snug text-muted landscape:block sm:text-sm">
        {t("pitchControls")}
      </p>
    </div>
  );
}

function pickCraft(id: CraftId) {
  saveCraftId(id);
  useHud.setState({ craftId: id });
  audio.ui();
  haptics.tap();
}

function selectedCraft(craftId: CraftId): Craft {
  return CRAFTS.find((c) => c.id === craftId) ?? CRAFTS[0]!;
}

function HangarPreview() {
  const craftId = useHud((s) => s.craftId);
  const craft = selectedCraft(craftId);
  const swipeX = useRef<number | null>(null);
  const src = assetUrl(`/game/${craft.portrait}.png`);
  const t = useT();
  return (
    <div className="flex min-h-0 w-full flex-none flex-col items-center justify-center py-1 landscape:flex-1 landscape:py-0">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.22em] text-faint">
        {t("hangar")}
      </p>
      <div
        className="relative flex w-full max-w-lg items-center justify-center"
        onPointerDown={(e) => {
          swipeX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (swipeX.current == null) return;
          const dx = e.clientX - swipeX.current;
          swipeX.current = null;
          if (dx > 48) pickCraft(cycleCraftId(craftId, -1));
          else if (dx < -48) pickCraft(cycleCraftId(craftId, 1));
        }}
        onPointerCancel={() => {
          swipeX.current = null;
        }}
      >
        <button
          type="button"
          aria-label={t("prevCraft")}
          onPointerDown={(e) => {
            e.stopPropagation();
            pickCraft(cycleCraftId(craftId, -1));
          }}
          className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-surface/80 text-fg landscape:size-10"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="relative mx-1 flex h-[min(26dvh,12rem)] w-full items-center justify-center landscape:h-[min(62dvh,26rem)]">
          <div className="pointer-events-none absolute inset-[12%] rounded-full bg-bg/75 blur-2xl" />
          <img
            key={craft.id}
            src={src}
            alt={craft.name}
            draggable={false}
            className="hangar-bob relative max-h-full max-w-full object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.55)]"
          />
        </div>
        <button
          type="button"
          aria-label={t("nextCraft")}
          onPointerDown={(e) => {
            e.stopPropagation();
            pickCraft(cycleCraftId(craftId, 1));
          }}
          className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-surface/80 text-fg landscape:size-10"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
      <div className="mt-1.5 flex w-full max-w-md flex-wrap justify-center gap-1.5">
        {CRAFTS.map((c) => {
          const on = craftId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              aria-label={c.name}
              aria-pressed={on}
              onPointerDown={(e) => {
                e.stopPropagation();
                pickCraft(c.id);
              }}
              onClick={(e) => {
                e.stopPropagation();
                pickCraft(c.id);
              }}
              className={`grid size-10 place-items-center overflow-hidden rounded-lg border bg-surface/80 p-0.5 landscape:size-14 ${
                on ? "border-accent bg-accent/15" : "border-border"
              }`}
            >
              <img
                src={assetUrl(`/game/${c.portrait}.png`)}
                alt=""
                draggable={false}
                className="h-full w-full object-contain"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HangarInfo({ part = "all" }: { part?: "all" | "identity" | "stats" }) {
  const craftId = useHud((s) => s.craftId);
  const craft = selectedCraft(craftId);
  const t = useT();
  const showIdentity = part !== "stats";
  const showStats = part !== "identity";
  return (
    <div
      className={
        part === "identity"
          ? "mt-1 max-w-sm"
          : part === "stats"
            ? "mt-2 max-w-sm"
            : "mt-3 max-w-sm landscape:mt-4"
      }
    >
      {showIdentity && (
        <>
          <p className="text-[10px] uppercase tracking-widest text-accent">{craft.tag}</p>
          <p className="font-display text-2xl leading-none tracking-tight landscape:text-4xl">
            {craft.name}
          </p>
        </>
      )}
      {part === "all" && <p className="mt-1 text-xs leading-snug text-muted">{craft.blurb}</p>}
      {part === "stats" && (
        <p className="line-clamp-2 text-xs leading-snug text-muted">{craft.blurb}</p>
      )}
      {showStats && (
        <div className={part === "all" ? "mt-3 space-y-1.5" : "mt-2 space-y-1"}>
          <StatBar label={t("statSpeed")} value={craft.speed} max={STAT_MAX.speed} />
          <StatBar label={t("statHull")} value={craft.hp} max={STAT_MAX.hp} />
          <StatBar label={t("statBeam")} value={craft.beam} max={STAT_MAX.beam} />
          <StatBar label={t("statLaser")} value={craft.laser} max={STAT_MAX.laser} />
          <StatBar
            label={t("statCool")}
            value={STAT_MAX.heat - craft.heatMult}
            max={STAT_MAX.heat - STAT_MIN.heat}
          />
        </div>
      )}
    </div>
  );
}

const STAT_MAX = {
  speed: Math.max(...CRAFTS.map((c) => c.speed)),
  hp: Math.max(...CRAFTS.map((c) => c.hp)),
  beam: Math.max(...CRAFTS.map((c) => c.beam)),
  laser: Math.max(...CRAFTS.map((c) => c.laser)),
  heat: Math.max(...CRAFTS.map((c) => c.heatMult)),
};

const STAT_MIN = {
  heat: Math.min(...CRAFTS.map((c) => c.heatMult)),
};

function StatBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.max(8, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-[10px] uppercase tracking-wide text-faint">{label}</span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function LaunchButton({
  ready,
  onStart,
  flush = false,
}: {
  ready: boolean;
  onStart: () => void;
  flush?: boolean;
}) {
  const t = useT();
  return (
    <button
      type="button"
      disabled={!ready}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (ready) onStart();
      }}
      className={`${flush ? "mt-0" : "mt-4"} h-12 w-full max-w-xs rounded-[20px] bg-fg px-6 font-medium text-bg transition-transform duration-150 enabled:active:scale-[0.98] disabled:opacity-50`}
    >
      {ready ? t("launch") : t("loading")}
    </button>
  );
}

type NetStatus =
  | { k: "hint" }
  | { k: "typeCode" }
  | { k: "opening"; room: string }
  | { k: "waiting" }
  | { k: "inRoom"; room: string }
  | { k: "linked"; n: number; room: string }
  | { k: "found"; n: number; room: string }
  | { k: "empty"; room: string }
  | { k: "pasteFirst" }
  | { k: "hostOrJoin" }
  | { k: "applied" }
  | { k: "bad" };

type WingNotice = "code" | "handshake" | "copyFailed" | null;
type WingStep = "choose" | "host" | "join";

function netStatusText(status: NetStatus, t: ReturnType<typeof useT>): string {
  switch (status.k) {
    case "hint":
      return t("netHint");
    case "typeCode":
      return t("netTypeCode");
    case "opening":
      return t("netOpening", { room: status.room });
    case "waiting":
      return t("wingmanWaiting");
    case "inRoom":
      return t("netInRoom", { room: status.room });
    case "linked":
      return t("netLinked", {
        n: status.n,
        s: status.n === 1 ? "" : "s",
        room: status.room,
      });
    case "found":
      return t("netFound", { n: status.n, room: status.room });
    case "empty":
      return t("netRoomEmpty", { room: status.room });
    case "pasteFirst":
      return t("netPasteFirst");
    case "hostOrJoin":
      return t("netHostOrJoin");
    case "applied":
      return t("netHandshakeApplied");
    case "bad":
      return t("netHandshakeBad");
  }
}

function netNoticeText(notice: WingNotice, t: ReturnType<typeof useT>): string | null {
  if (notice === "code") return t("wingmanCodeCopied");
  if (notice === "handshake") return t("netHandshakeCopied");
  if (notice === "copyFailed") return t("netCopyFailed");
  return null;
}

function NetBay() {
  const t = useT();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<NetStatus>({ k: "hint" });
  const [notice, setNotice] = useState<WingNotice>(null);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [tape, setTape] = useState("");
  const [role, setRole] = useState<"Host" | "Join" | null>(null);
  const [step, setStep] = useState<WingStep | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const roomRef = useRef<P2PRoom | null>(null);
  const signalRef = useRef<PagesSignal | null>(null);
  const waitStartRef = useRef(0);
  const joinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step !== "join") return;
    const id = window.setTimeout(() => joinInputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [step]);

  useEffect(() => {
    return () => {
      roomRef.current?.close();
      signalRef.current?.dispose();
      roomRef.current = null;
      signalRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (role !== "Join") return;
    const tick = () => {
      const live = peers.filter((p) => p.connectionState === "connected").length;
      const msg = wingmanWaitMessage({
        role,
        room: code,
        waitedMs: Date.now() - waitStartRef.current,
        remoteCount: peers.length,
        linkedCount: live,
      });
      if (msg) {
        setStatus((prev) =>
          prev.k === "empty" && prev.room === code ? prev : { k: "empty", room: code },
        );
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [role, code, peers]);

  const connect = (room: string, name: "Host" | "Join") => {
    roomRef.current?.close();
    signalRef.current?.dispose();
    setPeers([]);
    setRole(name);
    setNotice(null);
    waitStartRef.current = Date.now();
    const signal = createPagesSignal(room);
    const selfId = makePeerId();
    const p2p = new P2PRoom({
      room,
      selfId,
      name,
      signal,
      onConnected: () => {
        setStatus(name === "Host" ? { k: "waiting" } : { k: "inRoom", room });
      },
      onPeersChanged: (list) => {
        setPeers(list);
        const live = list.filter((p) => p.connectionState === "connected");
        if (live.length) {
          setStatus({ k: "linked", n: live.length, room });
        } else if (list.length) {
          setStatus({ k: "found", n: list.length, room });
        }
      },
    });
    signalRef.current = signal;
    roomRef.current = p2p;
    void p2p.join();
    setStatus({ k: "opening", room });
  };

  const beginHost = () => {
    const room = makeRoomCode();
    setCode(room);
    setAdvanced(false);
    setStep("host");
    haptics.tap();
    connect(room, "Host");
  };

  const beginJoin = () => {
    if (role !== "Join") setCode("");
    setAdvanced(false);
    setStep("join");
    haptics.tap();
  };

  const join = () => {
    const room = code.trim().toUpperCase();
    if (room.length < 4) {
      setStatus({ k: "typeCode" });
      return;
    }
    haptics.tap();
    connect(room, "Join");
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setNotice("code");
    } catch {
      setNotice("copyFailed");
    }
  };

  const copyHandshake = async () => {
    const next = signalRef.current?.exportHandshake() ?? "";
    setTape(next);
    try {
      await navigator.clipboard.writeText(next);
      setNotice("handshake");
    } catch {
      setNotice("copyFailed");
    }
  };

  const applyHandshake = () => {
    if (!tape.trim()) {
      setStatus({ k: "pasteFirst" });
      return;
    }
    if (!signalRef.current) {
      setStatus({ k: "hostOrJoin" });
      return;
    }
    try {
      signalRef.current.importHandshake(tape);
      setStatus({ k: "applied" });
    } catch {
      setStatus({ k: "bad" });
    }
  };

  const leave = () => {
    roomRef.current?.close();
    signalRef.current?.dispose();
    roomRef.current = null;
    signalRef.current = null;
    setPeers([]);
    setRole(null);
    setCode("");
    setTape("");
    setAdvanced(false);
    setNotice(null);
    setStatus({ k: "hint" });
    setStep(null);
    haptics.tap();
  };

  const openSheet = () => {
    setAdvanced(false);
    if (role === "Host") setStep("host");
    else if (role === "Join") setStep("join");
    else setStep("choose");
    haptics.tap();
  };

  const linked = peers.filter((p) => p.connectionState === "connected").length;
  const statusText = netStatusText(status, t);
  const noticeText = netNoticeText(notice, t);
  const joinReady = code.trim().length >= 4;

  return (
    <div className="mt-4 max-w-xs">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-faint">
        {t("wingman")}
      </p>
      <button
        type="button"
        onPointerDown={(e) => {
          e.stopPropagation();
          openSheet();
        }}
        className="mt-2 h-10 w-full rounded-[14px] border border-border bg-surface/80 text-sm text-fg"
      >
        {t("wingmanCta")}
      </button>
      {role != null && <p className="mt-2 text-xs text-muted">{statusText}</p>}
      {linked > 0 && (
        <p className="mt-1 text-[10px] uppercase tracking-widest text-accent">
          {t("netLinkedCount", { n: linked })}
        </p>
      )}
      {role != null && (
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            leave();
          }}
          className="mt-1 text-xs text-muted underline"
        >
          {t("wingmanLeave")}
        </button>
      )}
      {step != null && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-bg/70 px-3 backdrop-blur-[2px] pointer-events-auto [touch-action:manipulation] sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={t("wingman")}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="mb-[max(0.75rem,env(safe-area-inset-bottom))] w-full max-w-sm rounded-2xl border border-border bg-surface p-4 shadow-lg sm:mb-0">
            {step === "choose" && (
              <>
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-faint">
                  {t("wingman")}
                </p>
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    beginHost();
                  }}
                  className="mt-3 flex h-16 w-full flex-col items-center justify-center rounded-[20px] bg-fg text-bg"
                >
                  <span className="text-base font-medium">{t("host")}</span>
                  <span className="text-xs opacity-80">{t("wingmanHostBlurb")}</span>
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    beginJoin();
                  }}
                  className="mt-2 flex h-16 w-full flex-col items-center justify-center rounded-[20px] border border-border bg-surface-2 text-fg"
                >
                  <span className="text-base font-medium">{t("join")}</span>
                  <span className="text-xs opacity-80">{t("wingmanJoinBlurb")}</span>
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setStep(null);
                  }}
                  className="mt-2 h-11 w-full rounded-[16px] text-sm text-muted"
                >
                  {t("wingmanCancel")}
                </button>
              </>
            )}
            {step === "host" && (
              <>
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-faint">
                  {t("wingman")}
                </p>
                <h2 className="mt-1 font-display text-2xl tracking-tight">
                  {t("wingmanHostTitle")}
                </h2>
                <p className="mt-3 text-center font-display text-4xl tracking-[0.18em] text-fg">
                  {code}
                </p>
                <p className="mt-1 text-center text-xs text-muted">{t("wingmanHostHint")}</p>
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    void copyCode();
                  }}
                  className="mt-3 h-12 w-full rounded-[20px] bg-fg font-medium text-bg"
                >
                  {t("wingmanCopyCode")}
                </button>
                {status.k !== "hint" && (
                  <WingmanStatus statusText={statusText} noticeText={noticeText} linked={linked} />
                )}
                <WingmanTrouble
                  advanced={advanced}
                  tape={tape}
                  onToggle={() => setAdvanced((open) => !open)}
                  onTape={setTape}
                  onCopy={() => void copyHandshake()}
                  onApply={applyHandshake}
                />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setStep(null);
                    }}
                    className="h-11 flex-1 rounded-[16px] border border-border bg-surface-2 text-sm text-fg"
                  >
                    {t("wingmanClose")}
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      leave();
                    }}
                    className="h-11 flex-1 rounded-[16px] text-sm text-muted"
                  >
                    {t("wingmanLeave")}
                  </button>
                </div>
              </>
            )}
            {step === "join" && (
              <>
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-faint">
                  {t("wingman")}
                </p>
                <h2 className="mt-1 font-display text-2xl tracking-tight">
                  {t("wingmanJoinTitle")}
                </h2>
                <input
                  ref={joinInputRef}
                  value={code}
                  autoFocus
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  placeholder="ABC12"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label={t("roomCode")}
                  className="mt-3 h-14 w-full rounded-xl border border-border bg-bg px-3 text-center font-display text-3xl tracking-[0.2em] uppercase text-fg"
                />
                <button
                  type="button"
                  disabled={!joinReady}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    if (joinReady) join();
                  }}
                  className="mt-3 h-12 w-full rounded-[20px] bg-fg font-medium text-bg disabled:opacity-50"
                >
                  {t("wingmanJoinRoom")}
                </button>
                {status.k !== "hint" && (
                  <WingmanStatus statusText={statusText} noticeText={noticeText} linked={linked} />
                )}
                <WingmanTrouble
                  advanced={advanced}
                  tape={tape}
                  onToggle={() => setAdvanced((open) => !open)}
                  onTape={setTape}
                  onCopy={() => void copyHandshake()}
                  onApply={applyHandshake}
                />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setStep(null);
                    }}
                    className="h-11 flex-1 rounded-[16px] border border-border bg-surface-2 text-sm text-fg"
                  >
                    {t("wingmanClose")}
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      leave();
                    }}
                    className="h-11 flex-1 rounded-[16px] text-sm text-muted"
                  >
                    {t("wingmanLeave")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function WingmanStatus({
  statusText,
  noticeText,
  linked,
}: {
  statusText: string;
  noticeText: string | null;
  linked: number;
}) {
  const t = useT();
  return (
    <>
      <p className="mt-2 text-xs text-muted">{statusText}</p>
      {noticeText && <p className="mt-1 text-xs text-accent">{noticeText}</p>}
      {linked > 0 && (
        <p className="mt-1 text-[10px] uppercase tracking-widest text-accent">
          {t("netLinkedCount", { n: linked })}
        </p>
      )}
    </>
  );
}

function WingmanTrouble({
  advanced,
  tape,
  onToggle,
  onTape,
  onCopy,
  onApply,
}: {
  advanced: boolean;
  tape: string;
  onToggle: () => void;
  onTape: (value: string) => void;
  onCopy: () => void;
  onApply: () => void;
}) {
  const t = useT();
  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={advanced}
        onPointerDown={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="text-xs text-muted underline"
      >
        {t("wingmanTrouble")}
      </button>
      {advanced && (
        <div className="mt-2 text-xs text-muted">
          <p className="leading-snug">{t("netHandshakeHelp")}</p>
          <textarea
            value={tape}
            onChange={(e) => onTape(e.target.value)}
            rows={3}
            className="mt-2 w-full resize-y rounded-lg border border-border bg-bg p-2 font-mono text-[10px] text-fg"
          />
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onCopy();
              }}
              className="h-8 flex-1 rounded-lg border border-border bg-surface-2"
            >
              {t("netCopyHandshake")}
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                onApply();
              }}
              className="h-8 flex-1 rounded-lg border border-border bg-surface-2"
            >
              {t("netPasteHandshake")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NewCampaignButton({ onNewCampaign }: { onNewCampaign: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.stopPropagation();
        onNewCampaign();
      }}
      className="mt-2 h-10 text-xs text-muted"
    >
      {t("newCampaign")}
    </button>
  );
}

function ShoutLayer({
  shouts,
}: {
  shouts: { id: number; text: string; x: number; y: number; life: number; max: number }[];
}) {
  const engineRef = useRef(createCaptionEngine());
  const shoutsRef = useRef(shouts);
  shoutsRef.current = shouts;
  const [view, setView] = useState(() => captionView(createCaptionEngine()));

  useEffect(() => {
    const now = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
    const next = syncCaptionEngine(engineRef.current, shouts, now);
    setView((prev) => (prev.text === next.text && prev.pending === next.pending ? prev : next));
  }, [shouts]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const engine = engineRef.current;
      const now = performance.now() / 1000;
      syncCaptionEngine(engine, shoutsRef.current, now);
      const next = captionView(engine);
      setView((prev) => (prev.text === next.text && prev.pending === next.pending ? prev : next));
    }, 80);
    return () => window.clearInterval(id);
  }, []);

  if (!view.text) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 z-[25] flex justify-center px-3 bottom-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] landscape:bottom-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.75rem))]">
      <div
        className="flex w-fit max-w-[min(92vw,28rem)] items-center justify-center rounded-xl border border-white/20 bg-black/80 px-3.5 py-2 text-center text-sm sm:text-base font-semibold leading-snug text-white backdrop-blur-sm"
        style={{ opacity: 0.95, textShadow: "0 1px 2px #000, 0 0 8px #000" }}
      >
        <span>{view.text}</span>
        {view.pending > 0 ? (
          <span className="ml-2 shrink-0 text-[10px] font-medium text-white/45 tabular-nums">
            {view.pending > 3 ? "· · ·" : view.pending}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function HudOverlay({
  hud,
}: {
  hud: {
    score: number;
    combo: number;
    heat: number;
    timeLeft: number;
    hp: number;
    maxHp: number;
    abducted: number;
    destroyed: number;
    alert: string;
    weaponTier: number;
    cloakT: number;
    level: number;
    shield: number;
    shieldMax: number;
  };
}) {
  const m = Math.floor(hud.timeLeft / 60);
  const s = Math.floor(hud.timeLeft % 60)
    .toString()
    .padStart(2, "0");
  const t = useT();
  const alert = ALERTS.find((a) => a.id === hud.alert) ?? ALERTS[0]!;
  const hot = hud.alert === "hostile" || hud.alert === "air-raid";
  const weaponKey = WEAPON_KEYS[Math.min(3, hud.weaponTier)] ?? "weaponLaser";
  const weapon = t(weaponKey);
  const metaShadow = { textShadow: "0 1px 2px #000, 0 0 6px #000" };
  const chip =
    "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide";
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="rounded-xl border border-white/10 bg-bg/75 px-2.5 py-2 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-4xl leading-none tabular-nums landscape:text-3xl">
              {hud.score}
            </p>
            <p className="text-xs font-semibold text-fg" style={metaShadow}>
              {t("sector", { n: hud.level })}
            </p>
            {hud.combo > 1 && (
              <p className="text-xs font-semibold text-accent">{t("combo", { n: hud.combo })}</p>
            )}
          </div>
          <div className="text-right">
            <p className="font-display text-3xl leading-none tabular-nums landscape:text-2xl">
              {m}:{s}
            </p>
            <p className="text-xs font-semibold text-fg" style={metaShadow}>
              {t("takenWrecked", { a: hud.abducted, d: hud.destroyed })}
            </p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 landscape:mt-1">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className={`h-full rounded-full transition-[width] duration-150 ${hot ? "bg-danger" : "bg-accent"}`}
              style={{ width: `${Math.min(100, hud.heat)}%` }}
            />
          </div>
          <div className="flex gap-1">
            {Array.from({ length: hud.maxHp }).map((_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full ${i < hud.hp ? "bg-accent" : "bg-surface-2"}`}
              />
            ))}
            {hud.shieldMax > 0 &&
              Array.from({ length: Math.ceil(hud.shieldMax) }).map((_, i) => (
                <span
                  key={`s${i}`}
                  className={`h-2 w-2 rounded-full ${i < hud.shield ? "bg-warn" : "bg-surface-2"}`}
                />
              ))}
          </div>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <p
            className={`${chip} opacity-100 ${
              hot
                ? "border-danger/40 bg-black/70 text-danger"
                : "border-white/20 bg-black/70 text-white"
            }`}
          >
            {t(ALERT_KEYS[alert.id] ?? "alertCalm")}
          </p>
          {hud.weaponTier > 0 && (
            <p className={`${chip} border-white/20 bg-black/70 text-accent opacity-100`}>
              {weapon}
            </p>
          )}
          {hud.cloakT > 0 && (
            <p className={`${chip} border-white/20 bg-black/70 text-white opacity-100`}>
              {t("cloak", { t: hud.cloakT.toFixed(1) })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniMap({ marks }: { marks: MapMark[] }) {
  const t = useT();
  return (
    <div className="pointer-events-none absolute bottom-[max(9.5rem,calc(env(safe-area-inset-bottom)+8.5rem))] left-[max(0.75rem,env(safe-area-inset-left))] z-20 landscape:top-[max(4.25rem,calc(env(safe-area-inset-top)+3.4rem))] landscape:bottom-auto">
      <div className="relative h-28 w-28 overflow-hidden rounded-lg border border-border bg-bg/70 landscape:h-24 landscape:w-24">
        {marks.map((m, i) => (
          <span
            key={`${m.t}-${i}`}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${
              m.t === "you"
                ? "size-2 bg-accent"
                : m.t === "gun"
                  ? "size-1.5 bg-warn"
                  : m.t === "cloak"
                    ? "size-1.5 bg-fg"
                    : m.t === "loot"
                      ? "size-1.5 bg-accent"
                      : m.t === "tank"
                        ? "size-1.5 bg-danger"
                        : m.t === "heli" || m.t === "plane"
                          ? "size-1 bg-danger"
                          : "size-1 bg-danger/80"
            }`}
            style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-2 rounded-md bg-bg/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
        <span className="text-warn">{t("mapGun")}</span>
        <span className="text-fg">{t("mapCloak")}</span>
        <span className="text-danger">{t("mapArmy")}</span>
      </div>
    </div>
  );
}

function UpgradeBay({
  hud,
  onNext,
  onRetry,
  onHangar,
}: {
  hud: {
    score: number;
    best: number;
    reason: string;
    level: number;
    salvage: number;
    stats: {
      abducted: number;
      destroyed: number;
      cows: number;
      people: number;
      buildings: number;
      vehicles: number;
    } | null;
  };
  onNext: () => void;
  onRetry: () => void;
  onHangar: () => void;
}) {
  const t = useT();
  const [tick, setTick] = useState(0);
  const p = loadProgress();
  const craftId = loadCraftId();
  const ranks = ranksFor(p, craftId);
  const survived = hud.reason === "time";
  const buy = (id: UpgradeId) => {
    buyUpgrade(loadProgress(), craftId, id);
    useHud.setState({ salvage: loadProgress().salvage });
    audio.upgrade();
    setTick((n) => n + 1);
    void tick;
  };
  return (
    <Overlay>
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted">
        {survived ? t("sectorCleared", { n: hud.level }) : t("saucerDown")}
      </p>
      <h2 className="font-display text-5xl leading-none tracking-tight landscape:text-4xl">
        {survived ? t("upgradeBay") : t("refit")}
      </h2>
      <p className="mt-2 font-display text-3xl text-accent tabular-nums">{hud.score}</p>
      <p className="text-xs text-muted">
        {t("salvage")} <span className="tabular-nums text-fg">{p.salvage}</span>
        {hud.stats
          ? ` · ${t("takenWrecked", { a: hud.stats.abducted, d: hud.stats.destroyed })}`
          : ""}
      </p>
      <ul className="mt-4 space-y-2">
        {UPGRADES.map((u) => {
          const rank = ranks[u.id] ?? 0;
          const cost = upgradeCost(rank);
          const maxed = rank >= u.max;
          const poor = p.salvage < cost;
          return (
            <li key={u.id} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {t(UPGRADE_KEYS[u.id]?.name ?? "upEngines")}{" "}
                  <span className="text-xs text-muted">
                    {rank}/{u.max}
                  </span>
                </p>
                <p className="text-xs text-faint">
                  {t(UPGRADE_KEYS[u.id]?.blurb ?? "upEnginesBlurb")}
                </p>
              </div>
              <button
                type="button"
                disabled={maxed || poor}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (!maxed && !poor) buy(u.id);
                }}
                className="h-10 min-w-16 rounded-full border border-border bg-surface-2 px-3 text-xs disabled:opacity-40"
              >
                {maxed ? t("max") : `${cost}`}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 flex flex-col gap-2">
        {survived ? (
          <Primary onClick={onNext}>{t("nextSector")}</Primary>
        ) : (
          <Primary onClick={onRetry}>{t("retrySector")}</Primary>
        )}
        <Ghost onClick={onHangar}>{t("hangar")}</Ghost>
      </div>
    </Overlay>
  );
}

function TouchLayer({
  input,
  onPause,
  muted,
  onMute,
}: {
  input: Input;
  onPause: () => void;
  muted: boolean;
  onMute: () => void;
}) {
  const t = useT();
  const moveRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  useEffect(() => {
    return () => {
      input.sticks = input.sticks.filter((s) => s.kind !== "move");
      input.setBeam(false);
      input.setFire(false);
      setKnob({ x: 0, y: 0 });
    };
  }, [input]);

  return (
    <>
      <div className="absolute top-[max(4.5rem,calc(env(safe-area-inset-top)+3.6rem))] right-[max(0.75rem,env(safe-area-inset-right))] z-20 flex gap-2 landscape:top-[max(0.45rem,env(safe-area-inset-top))] landscape:right-[max(5.5rem,calc(env(safe-area-inset-right)+4.75rem))]">
        <IconBtn onClick={onMute} label={muted ? t("unmute") : t("mute")}>
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </IconBtn>
        <IconBtn onClick={onPause} label={t("pause")}>
          <Pause className="size-4" />
        </IconBtn>
      </div>

      <div
        ref={moveRef}
        className="absolute bottom-0 left-0 z-20 h-[42%] w-[48%] touch-none landscape:top-0 landscape:h-full landscape:w-[min(38%,18rem)] landscape:pl-[env(safe-area-inset-left)]"
        onPointerDown={(e) => {
          const el = moveRef.current;
          if (!el) return;
          el.setPointerCapture(e.pointerId);
          const r = el.getBoundingClientRect();
          const x = e.clientX - r.left;
          const y = e.clientY - r.top;
          input.beginStick(e.pointerId, x, y, "move");
          haptics.tap();
          setKnob({ x: 0, y: 0 });
        }}
        onPointerMove={(e) => {
          const el = moveRef.current;
          if (!el) return;
          const r = el.getBoundingClientRect();
          const x = e.clientX - r.left;
          const y = e.clientY - r.top;
          input.moveStick(e.pointerId, x, y);
          const s = input.sticks.find((p) => p.id === e.pointerId);
          if (s) {
            const dx = Math.max(-54, Math.min(54, s.x - s.ox));
            const dy = Math.max(-54, Math.min(54, s.y - s.oy));
            setKnob({ x: dx, y: dy });
          }
        }}
        onPointerUp={(e) => {
          input.endStick(e.pointerId);
          setKnob({ x: 0, y: 0 });
        }}
        onPointerCancel={(e) => {
          input.endStick(e.pointerId);
          setKnob({ x: 0, y: 0 });
        }}
      >
        <div className="pointer-events-none absolute bottom-16 left-10 size-28 rounded-full border border-fg/20 bg-surface/75 backdrop-blur-sm landscape:bottom-8 landscape:left-8">
          <div
            className="absolute left-1/2 top-1/2 size-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg/80"
            style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
          />
        </div>
      </div>

      <div className="absolute bottom-[max(4.25rem,calc(env(safe-area-inset-bottom)+3.25rem))] right-[max(1rem,env(safe-area-inset-right))] z-20 flex items-end gap-3 landscape:bottom-[max(1rem,env(safe-area-inset-bottom))] landscape:flex-col-reverse landscape:gap-2">
        <HoldBtn
          label={t("beam")}
          onHold={(v) => {
            if (v) haptics.tap();
            input.setBeam(v);
          }}
          className="h-[72px] w-[72px] landscape:h-16 landscape:w-16"
        />
        <HoldBtn
          label={t("fire")}
          onHold={(v) => {
            if (v) haptics.tap();
            input.setFire(v);
          }}
          className="h-[88px] w-[88px] landscape:h-[72px] landscape:w-[72px]"
        />
      </div>
    </>
  );
}

function HoldBtn({
  label,
  onHold,
  className,
}: {
  label: string;
  onHold: (v: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`rounded-full border border-fg/20 bg-surface/75 font-display text-xl tracking-wide text-fg backdrop-blur-sm active:scale-95 ${className ?? ""}`}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
        onHold(true);
      }}
      onPointerUp={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
    >
      {label}
    </button>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="grid size-11 place-items-center rounded-full border border-border bg-surface/80 text-fg landscape:size-10"
    >
      {children}
    </button>
  );
}

function HangarLang() {
  const lang = useI18n((s) => s.lang);
  const setLang = useI18n((s) => s.setLang);
  const t = useT();
  const pick = (next: Lang) => {
    if (lang === next) return;
    setLang(next);
    haptics.tap();
  };
  return (
    <div
      role="group"
      aria-label={t("language")}
      className="flex h-8 max-h-10 shrink-0 overflow-hidden rounded-full border border-border bg-surface/80 text-xs font-medium"
    >
      <button
        type="button"
        aria-pressed={lang === "en"}
        aria-label={t("english")}
        onPointerDown={(e) => {
          e.stopPropagation();
          pick("en");
        }}
        className={`h-8 px-3 ${lang === "en" ? "bg-fg text-bg" : "text-fg"}`}
      >
        EN
      </button>
      <button
        type="button"
        aria-pressed={lang === "es"}
        aria-label={t("spanish")}
        onPointerDown={(e) => {
          e.stopPropagation();
          pick("es");
        }}
        className={`h-8 px-3 ${lang === "es" ? "bg-fg text-bg" : "text-fg"}`}
      >
        ES
      </button>
    </div>
  );
}

function LanguagePicker({ onPick }: { onPick: (lang: Lang) => void }) {
  return (
    <Overlay>
      <h2 className="font-display text-5xl tracking-tight landscape:text-4xl">Language · Idioma</h2>
      <div className="mt-6 flex flex-col gap-2 landscape:mt-4">
        <Primary icon={false} onClick={() => onPick("en")}>
          English
        </Primary>
        <Ghost onClick={() => onPick("es")}>Español</Ghost>
      </div>
    </Overlay>
  );
}

function LangSwitch() {
  const lang = useI18n((s) => s.lang);
  const setLang = useI18n((s) => s.setLang);
  const t = useT();
  return (
    <div className="mt-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-faint">
        {t("language")}
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          aria-pressed={lang === "en"}
          onPointerDown={(e) => {
            e.stopPropagation();
            if (lang !== "en") {
              setLang("en");
              haptics.tap();
            }
          }}
          className={`h-10 flex-1 rounded-[14px] text-sm font-medium ${
            lang === "en" ? "bg-fg text-bg" : "border border-border bg-surface-2 text-fg"
          }`}
        >
          English
        </button>
        <button
          type="button"
          aria-pressed={lang === "es"}
          onPointerDown={(e) => {
            e.stopPropagation();
            if (lang !== "es") {
              setLang("es");
              haptics.tap();
            }
          }}
          className={`h-10 flex-1 rounded-[14px] text-sm font-medium ${
            lang === "es" ? "bg-fg text-bg" : "border border-border bg-surface-2 text-fg"
          }`}
        >
          Español
        </button>
      </div>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-bg/70 px-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))] pb-16 pt-10 backdrop-blur-[2px] landscape:items-center landscape:pb-6 landscape:pt-6 sm:items-center sm:pb-10 pointer-events-auto [touch-action:manipulation]">
      <div className="max-h-[min(88dvh,36rem)] w-full max-w-sm overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-lg landscape:p-5">
        {children}
      </div>
    </div>
  );
}

function Primary({
  children,
  onClick,
  icon = true,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: boolean;
}) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-[20px] bg-fg font-medium text-bg active:scale-[0.98]"
    >
      {icon ? <Play className="size-4" /> : null}
      {children}
    </button>
  );
}

function Ghost({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="h-11 w-full rounded-[16px] border border-border bg-surface-2 text-sm text-fg"
    >
      {children}
    </button>
  );
}
