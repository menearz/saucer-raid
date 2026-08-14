import { create } from "zustand";
import type { Phase, Stats } from "./types";

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
};

export const useHud = create<HudSlice>(() => ({ ...empty }));

export function resetHud(best: number) {
  useHud.setState({ ...empty, best, phase: "title" });
}

export function patchHud(partial: Partial<HudSlice>) {
  useHud.setState(partial);
}
