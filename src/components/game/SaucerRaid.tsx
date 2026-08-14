import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { audio } from "@/game/audio";
import { loadArt } from "@/game/assets";
import { haptics } from "@/game/haptics";
import { Input } from "@/game/input";
import type { GameHandle } from "@/game/loop";
import { useHud } from "@/game/store";
import { assetUrl } from "@/game/paths";
import { createWorld, loadBest } from "@/game/world";
import { Link } from "@tanstack/react-router";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
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

  const begin = () => {
    audio.unlock();
    haptics.unlock();
    handleRef.current?.start();
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
            <Ghost onClick={begin}>Restart raid</Ghost>
          </div>
        </Overlay>
      )}

      {hud.phase === "over" && (
        <Overlay>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted">
            {hud.reason === "destroyed" ? "Saucer down" : "Time expired"}
          </p>
          <h2 className="font-display text-6xl leading-none tracking-tight landscape:text-5xl">
            Raid over
          </h2>
          <p className="mt-3 font-display text-4xl text-accent tabular-nums landscape:mt-2 landscape:text-3xl">
            {hud.score}
          </p>
          <p className="text-xs text-muted">Best {hud.best}</p>
          {hud.stats && (
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-sm landscape:mt-3 landscape:gap-y-1">
              <Stat k="Abducted" v={hud.stats.abducted} />
              <Stat k="Destroyed" v={hud.stats.destroyed} />
              <Stat k="Livestock" v={hud.stats.cows} />
              <Stat k="People" v={hud.stats.people} />
              <Stat k="Buildings" v={hud.stats.buildings} />
              <Stat k="Vehicles" v={hud.stats.vehicles} />
            </dl>
          )}
          <div className="mt-6 flex flex-col gap-2 landscape:mt-4">
            <Primary onClick={begin}>Raid again</Primary>
          </div>
        </Overlay>
      )}

      {hud.phase === "title" && (
        <TitleScreen
          ready={ready}
          best={hud.best}
          onStart={begin}
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
  isPending,
  hasUser,
  showAccount = true,
}: {
  ready: boolean;
  best: number;
  onStart: () => void;
  isPending: boolean;
  hasUser: boolean;
  showAccount?: boolean;
}) {
  return (
    <div className="absolute inset-0 flex flex-col">
      <img
        src={assetUrl("/game/title-bg.jpg")}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_30%] landscape:object-center"
      />
      <div className="absolute inset-0 bg-linear-to-b from-bg/25 via-bg/45 to-bg/92 landscape:bg-linear-to-r landscape:from-bg/88 landscape:via-bg/50 landscape:to-bg/10" />
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
      <div className="relative z-10 mt-auto px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pl-[max(1.5rem,env(safe-area-inset-left))] landscape:mt-0 landscape:flex landscape:h-full landscape:w-[min(30rem,56%)] landscape:flex-col landscape:justify-center landscape:pb-6">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-accent">
          Night raid
        </p>
        <h1 className="font-display text-7xl leading-[0.85] tracking-tight sm:text-8xl landscape:text-6xl">
          Saucer
          <br />
          Raid
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted landscape:mt-2 landscape:text-[13px]">
          Fly the disc. Abduct livestock and townsfolk. Carve barns, homes, and
          trucks with the laser. Heat draws jeeps. Score everything.
        </p>
        <ul className="mt-4 space-y-1 text-xs text-faint landscape:hidden">
          <li>Stick or WASD — fly. A left, D right.</li>
          <li>Hold Beam to abduct. Hold Fire or click to blast.</li>
          <li>Turn the phone sideways for a wider valley.</li>
        </ul>
        <p className="mt-2 hidden text-xs text-faint landscape:block">
          Left stick flies. Beam abducts. Fire blasts. Phone sideways is the full raid.
        </p>
        {best > 0 && (
          <p className="mt-3 text-xs text-muted landscape:mt-2">
            Best <span className="tabular-nums text-fg">{best}</span>
          </p>
        )}
        <button
          type="button"
          disabled={!ready}
          onClick={onStart}
          className="mt-5 h-12 w-full max-w-xs rounded-[20px] bg-fg px-6 font-medium text-bg transition-transform duration-150 enabled:active:scale-[0.98] disabled:opacity-50 landscape:mt-4"
        >
          {ready ? "Begin raid" : "Loading the valley…"}
        </button>
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
  };
}) {
  const m = Math.floor(hud.timeLeft / 60);
  const s = Math.floor(hud.timeLeft % 60)
    .toString()
    .padStart(2, "0");
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-4xl leading-none tabular-nums landscape:text-3xl">
            {hud.score}
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
            className="h-full rounded-full bg-danger transition-[width] duration-150"
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
        </div>
      </div>
    </div>
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
      onClick={onClick}
      className="grid size-11 place-items-center rounded-full border border-border bg-surface/80 text-fg landscape:size-10"
    >
      {children}
    </button>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-bg/70 px-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))] pb-16 pt-10 backdrop-blur-[2px] landscape:items-center landscape:pb-6 landscape:pt-6 sm:items-center sm:pb-10">
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
      onClick={onClick}
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
      onClick={onClick}
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
