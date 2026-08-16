import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { audio } from "@/game/audio";
import { loadArt } from "@/game/assets";
import { CRAFTS, cycleCraftId, saveCraftId, type Craft, type CraftId } from "@/game/crafts";
import { haptics } from "@/game/haptics";
import { Input } from "@/game/input";
import type { GameHandle } from "@/game/loop";
import { useHud } from "@/game/store";
import { assetUrl } from "@/game/paths";
import {
  UPGRADES,
  buyUpgrade,
  loadProgress,
  resetProgress,
  upgradeCost,
  type MapMark,
  type UpgradeId,
} from "@/game/progress";
import { ALERTS } from "@/game/types";
import { createWorld, loadBest } from "@/game/world";
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

  useEffect(() => {
    let dead = false;
    void loadArt().then(() => {
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
          <h2 className="font-display text-5xl tracking-tight landscape:text-4xl">Paused</h2>
          <p className="mt-2 text-sm text-muted">The raid is on hold.</p>
          <div className="mt-6 flex flex-col gap-2 landscape:mt-4">
            <Primary
              onClick={() => {
                haptics.tap();
                handleRef.current?.resume();
              }}
            >
              Resume
            </Primary>
            <Ghost onClick={() => begin("retry")}>Restart raid</Ghost>
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

      {hud.phase === "over" && (
        <Overlay>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted">
            {hud.reason === "destroyed" ? "Saucer down" : "Time expired"}
          </p>
          <h2 className="font-display text-6xl leading-none tracking-tight landscape:text-5xl">
            Raid over
          </h2>
          <div className="mt-6 flex flex-col gap-2 landscape:mt-4">
            <Primary onClick={() => begin("retry")}>Retry sector</Primary>
            <Ghost onClick={toTitle}>Hangar</Ghost>
          </div>
        </Overlay>
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
  return (
    <div className="absolute inset-0 z-20 flex flex-col overflow-y-auto overscroll-contain pointer-events-auto [touch-action:manipulation]">
      <img
        src={assetUrl("/game/title-bg.png")}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[center_30%] landscape:object-center"
      />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-bg/62 via-bg/70 to-bg/95 landscape:bg-linear-to-r landscape:from-bg/94 landscape:via-bg/72 landscape:to-bg/58" />
      <header className="relative z-10 flex items-center justify-end px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))]">
        {!showAccount ? null : isPending ? (
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
              Sign in
            </Link>
          </SignedOut>
        )}
      </header>
      <div className="relative z-10 flex flex-1 flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] landscape:flex-row landscape:items-center landscape:gap-6 landscape:px-8">
        <div className="landscape:w-[min(26rem,42%)] landscape:shrink-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-accent">
            Sector {level}
          </p>
          <h1 className="font-display text-5xl leading-[0.85] tracking-tight sm:text-6xl landscape:text-6xl">
            Saucer
            <br />
            Raid
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted landscape:mt-2">
            Pick a hull. Survive the clock. Upgrade between raids.
          </p>
          {best > 0 && (
            <p className="mt-2 text-xs text-muted">
              Best <span className="tabular-nums text-fg">{best}</span>
              {salvage > 0 && (
                <>
                  {" "}
                  · Salvage <span className="tabular-nums text-fg">{salvage}</span>
                </>
              )}
            </p>
          )}
          <div className="hidden landscape:block">
            <HangarInfo />
            <LaunchButton ready={ready} level={level} onStart={onStart} />
            {level > 1 && <NewCampaignButton onNewCampaign={onNewCampaign} />}
          </div>
        </div>
        <HangarPreview />
        <div className="landscape:hidden">
          <HangarInfo />
          <LaunchButton ready={ready} level={level} onStart={onStart} />
          {level > 1 && <NewCampaignButton onNewCampaign={onNewCampaign} />}
        </div>
      </div>
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
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-2 landscape:py-0">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.22em] text-faint">
        Hangar
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
          aria-label="Previous craft"
          onPointerDown={(e) => {
            e.stopPropagation();
            pickCraft(cycleCraftId(craftId, -1));
          }}
          className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-surface/80 text-fg landscape:size-10"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="relative mx-1 flex h-[min(42dvh,20rem)] w-full items-center justify-center landscape:h-[min(62dvh,26rem)]">
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
          aria-label="Next craft"
          onPointerDown={(e) => {
            e.stopPropagation();
            pickCraft(cycleCraftId(craftId, 1));
          }}
          className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-surface/80 text-fg landscape:size-10"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
      <div className="mt-2 flex w-full max-w-md flex-wrap justify-center gap-1.5">
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
              className={`grid size-12 place-items-center overflow-hidden rounded-lg border bg-surface/80 p-0.5 landscape:size-14 ${
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

function HangarInfo() {
  const craftId = useHud((s) => s.craftId);
  const craft = selectedCraft(craftId);
  return (
    <div className="mt-3 max-w-sm landscape:mt-4">
      <p className="text-[10px] uppercase tracking-widest text-accent">{craft.tag}</p>
      <p className="font-display text-3xl leading-none tracking-tight landscape:text-4xl">
        {craft.name}
      </p>
      <p className="mt-1 text-xs leading-snug text-muted">{craft.blurb}</p>
      <div className="mt-3 space-y-1.5">
        <StatBar label="Speed" value={craft.speed} max={STAT_MAX.speed} />
        <StatBar label="Hull" value={craft.hp} max={STAT_MAX.hp} />
        <StatBar label="Beam" value={craft.beam} max={STAT_MAX.beam} />
        <StatBar label="Laser" value={craft.laser} max={STAT_MAX.laser} />
        <StatBar
          label="Cool"
          value={STAT_MAX.heat - craft.heatMult}
          max={STAT_MAX.heat - STAT_MIN.heat}
        />
      </div>
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
      <span className="w-11 shrink-0 text-[9px] uppercase tracking-widest text-faint">
        {label}
      </span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function LaunchButton({
  ready,
  level,
  onStart,
}: {
  ready: boolean;
  level: number;
  onStart: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!ready}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (ready) onStart();
      }}
      className="mt-4 h-12 w-full max-w-xs rounded-[20px] bg-fg px-6 font-medium text-bg transition-transform duration-150 enabled:active:scale-[0.98] disabled:opacity-50 landscape:mt-4"
    >
      {ready ? `Launch sector ${level}` : "Loading the valley…"}
    </button>
  );
}

function NewCampaignButton({ onNewCampaign }: { onNewCampaign: () => void }) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.stopPropagation();
        onNewCampaign();
      }}
      className="mt-2 h-10 text-xs text-muted"
    >
      New campaign
    </button>
  );
}

function ShoutLayer({
  shouts,
}: {
  shouts: { id: number; text: string; x: number; y: number; life: number; max: number }[];
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-15">
      {shouts.map((s) => (
        <div
          key={`${s.id}-${s.text}`}
          className="absolute -translate-x-1/2 -translate-y-full rounded-full border border-fg/15 bg-surface/90 px-2.5 py-1 text-[11px] font-medium text-fg shadow-md"
          style={{ left: s.x, top: s.y, opacity: Math.max(0.15, s.life / s.max) }}
        >
          {s.text}
        </div>
      ))}
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
  const alert = ALERTS.find((a) => a.id === hud.alert) ?? ALERTS[0]!;
  const hot = hud.alert === "hostile" || hud.alert === "air-raid";
  const weapon = ["Laser", "Laser+", "Twin", "Spread"][Math.min(3, hud.weaponTier)] ?? "Laser";
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-4xl leading-none tabular-nums landscape:text-3xl">
            {hud.score}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-muted">
            Sector {hud.level}
          </p>
          {hud.combo > 1 && (
            <p className="text-xs font-medium uppercase tracking-widest text-accent">
              Combo {hud.combo}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="font-display text-3xl leading-none tabular-nums landscape:text-2xl">
            {m}:{s}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-muted">
            {hud.abducted} taken · {hud.destroyed} wrecked
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
          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] ${
            hot ? "bg-danger/20 text-danger" : "bg-surface/80 text-muted"
          }`}
        >
          {alert.label}
        </p>
        {hud.weaponTier > 0 && (
          <p className="inline-flex rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-accent">
            {weapon}
          </p>
        )}
        {hud.cloakT > 0 && (
          <p className="inline-flex rounded-full bg-fg/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-fg">
            Cloak {hud.cloakT.toFixed(1)}s
          </p>
        )}
      </div>
    </div>
  );
}

function MiniMap({ marks }: { marks: MapMark[] }) {
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
      <div className="mt-1 flex flex-wrap gap-x-2 text-[9px] uppercase tracking-widest text-faint">
        <span className="text-warn">Gun</span>
        <span className="text-fg">Cloak</span>
        <span className="text-danger">Army</span>
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
    stats: { abducted: number; destroyed: number; cows: number; people: number; buildings: number; vehicles: number } | null;
  };
  onNext: () => void;
  onRetry: () => void;
  onHangar: () => void;
}) {
  const [tick, setTick] = useState(0);
  const p = loadProgress();
  const survived = hud.reason === "time";
  const buy = (id: UpgradeId) => {
    buyUpgrade(loadProgress(), id);
    useHud.setState({ salvage: loadProgress().salvage });
    audio.upgrade();
    setTick((n) => n + 1);
    void tick;
  };
  return (
    <Overlay>
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted">
        {survived ? `Sector ${hud.level} cleared` : "Saucer down"}
      </p>
      <h2 className="font-display text-5xl leading-none tracking-tight landscape:text-4xl">
        {survived ? "Upgrade bay" : "Refit"}
      </h2>
      <p className="mt-2 font-display text-3xl text-accent tabular-nums">{hud.score}</p>
      <p className="text-xs text-muted">
        Salvage <span className="tabular-nums text-fg">{p.salvage}</span>
        {hud.stats ? ` · ${hud.stats.abducted} taken · ${hud.stats.destroyed} wrecked` : ""}
      </p>
      <ul className="mt-4 space-y-2">
        {UPGRADES.map((u) => {
          const rank = p.upgrades[u.id] ?? 0;
          const cost = upgradeCost(rank);
          const maxed = rank >= u.max;
          const poor = p.salvage < cost;
          return (
            <li key={u.id} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {u.name}{" "}
                  <span className="text-xs text-muted">
                    {rank}/{u.max}
                  </span>
                </p>
                <p className="text-xs text-faint">{u.blurb}</p>
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
                {maxed ? "Max" : `${cost}`}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 flex flex-col gap-2">
        {survived ? (
          <Primary onClick={onNext}>Next sector</Primary>
        ) : (
          <Primary onClick={onRetry}>Retry sector</Primary>
        )}
        <Ghost onClick={onHangar}>Hangar</Ghost>
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
  const moveRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0, show: false });

  useEffect(() => {
    return () => {
      input.sticks = input.sticks.filter((s) => s.kind !== "move");
      input.setBeam(false);
      input.setFire(false);
      setKnob({ x: 0, y: 0, show: false });
    };
  }, [input]);

  return (
    <>
      <div className="absolute top-[max(4.5rem,calc(env(safe-area-inset-top)+3.6rem))] right-[max(0.75rem,env(safe-area-inset-right))] z-20 flex gap-2 landscape:top-[max(0.45rem,env(safe-area-inset-top))] landscape:right-[max(5.5rem,calc(env(safe-area-inset-right)+4.75rem))]">
        <IconBtn onClick={onMute} label={muted ? "Unmute" : "Mute"}>
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </IconBtn>
        <IconBtn onClick={onPause} label="Pause">
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
          setKnob({ x: 0, y: 0, show: true });
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
            setKnob({ x: dx, y: dy, show: true });
          }
        }}
        onPointerUp={(e) => {
          input.endStick(e.pointerId);
          setKnob({ x: 0, y: 0, show: false });
        }}
        onPointerCancel={(e) => {
          input.endStick(e.pointerId);
          setKnob({ x: 0, y: 0, show: false });
        }}
      >
        {knob.show && (
          <div className="pointer-events-none absolute bottom-16 left-10 size-28 rounded-full border border-fg/20 bg-fg/5 landscape:bottom-8 landscape:left-8">
            <div
              className="absolute left-1/2 top-1/2 size-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg/80"
              style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
            />
          </div>
        )}
      </div>

      <div className="absolute bottom-[max(4.25rem,calc(env(safe-area-inset-bottom)+3.25rem))] right-[max(1rem,env(safe-area-inset-right))] z-20 flex items-end gap-3 landscape:bottom-[max(1rem,env(safe-area-inset-bottom))] landscape:flex-col-reverse landscape:gap-2">
        <HoldBtn
          label="Beam"
          onHold={(v) => {
            if (v) haptics.tap();
            input.setBeam(v);
          }}
          className="h-[72px] w-[72px] landscape:h-16 landscape:w-16"
        />
        <HoldBtn
          label="Fire"
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
}: {
  children: React.ReactNode;
  onClick: () => void;
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
      <Play className="size-4" />
      {children}
    </button>
  );
}

function Ghost({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
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

function Stat({ k, v }: { k: string; v: number }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{k}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}
