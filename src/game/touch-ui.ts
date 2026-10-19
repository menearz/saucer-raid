export type TouchCapability = {
  /** matchMedia('(pointer: coarse)').matches */
  pointerCoarse: boolean;
  /** navigator.maxTouchPoints — real touch hardware, not viewport width. */
  maxTouchPoints: number;
  /** A touchstart / touch pointer already happened this session. */
  sawTouch: boolean;
};

/**
 * Joystick and Fire/Beam are for touch-capable input.
 * Screen width is not a signal: a narrow desktop window stays on keys.
 */
export function showTouchControls(cap: TouchCapability): boolean {
  if (cap.sawTouch) return true;
  if (cap.pointerCoarse) return true;
  if (cap.maxTouchPoints > 0) return true;
  return false;
}
