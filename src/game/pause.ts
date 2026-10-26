import type { Phase } from "./types";

/**
 * Keyboard pause edge → phase. Cutscenes block opening pause; they do not
 * block resume. Click pause/resume bypasses this and calls the handle directly.
 */
export function phaseAfterPauseKey(
  phase: Phase,
  justPause: boolean,
  cutscene: boolean,
): Phase {
  if (phase === "playing" && justPause && !cutscene) return "paused";
  if (phase === "paused" && justPause) return "playing";
  return phase;
}
