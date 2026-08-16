import { create } from "zustand";
import type { Alert, Phase, Shout, Stats } from "./types";
import type { CraftId } from "./crafts";
import { loadCraftId } from "./crafts";
import { loadProgress, type MapMark } from "./progress";

export type HudSlice = {
  phase: Phase;
  score: number;
  combo: number;
  heat: number;
  timeLeft: number;
  hp: number;
  maxHp: number;
  abducted: number;
  destroyed: number;
  best: number;
  stats: Stats | null;
  reason: "time" | "destroyed" | "";
  alert: Alert;
  craftId: CraftId;
  shouts: Shout[];
  weaponTier: number;
  cloakT: number;
  level: number;
  salvage: number;
  shield: number;
  shieldMax: number;
  marks: MapMark[];
};

const empty: HudSlice = {
  phase: "title",
  score: 0,
  combo: 0,
  heat: 0,
  timeLeft: 100,
  hp: 5,
  maxHp: 5,
  abducted: 0,
  destroyed: 0,
  best: 0,
  stats: null,
  reason: "",
  alert: "calm",
  craftId: "disc",
  shouts: [],
  weaponTier: 0,
  cloakT: 0,
  level: 1,
  salvage: 0,
  shield: 0,
  shieldMax: 0,
  marks: [],
};

export const useHud = create<HudSlice>(() => ({
  ...empty,
  craftId: loadCraftId(),
  level: loadProgress().level,
  salvage: loadProgress().salvage,
}));

export function resetHud(best: number) {
  const p = loadProgress();
  useHud.setState({
    ...empty,
    best,
    phase: "title",
    craftId: loadCraftId(),
    level: p.level,
    salvage: p.salvage,
  });
}

export function patchHud(partial: Partial<HudSlice>) {
  useHud.setState(partial);
}
