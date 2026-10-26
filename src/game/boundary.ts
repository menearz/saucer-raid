import { FIELD_EDGE_CLAMP, WORLD_H, WORLD_W } from "./types.ts";

export { FIELD_EDGE_CLAMP };

/** Rust wash inside the playfield, past the clamp, so the edge reads early. */
export const EDGE_BAND = 96;

/** Spacing of the wooden fence segments along the seam. */
export const FENCE_STEP = 56;

/** Resting rust-wash opacity. Reduced motion holds this; otherwise it pulses. */
export const EDGE_WASH_OPACITY = 0.26;

/**
 * WebGL edge wash. `prefers-reduced-motion: reduce` freezes the intensity
 * so the seam stays visible without a sin pulse.
 */
export function edgeWashOpacity(now: number, reducedMotion: boolean): number {
  if (reducedMotion) return EDGE_WASH_OPACITY;
  return EDGE_WASH_OPACITY + Math.sin(now * 0.0025) * 0.07;
}

export type FencePost = { x: number; y: number; vertical: boolean };

/** Billboard fence segments sitting on the world seam, all four sides. */
export function fencePosts(): FencePost[] {
  const posts: FencePost[] = [];
  for (let x = FENCE_STEP * 0.5; x < WORLD_W; x += FENCE_STEP) {
    posts.push({ x, y: 0, vertical: false });
    posts.push({ x, y: WORLD_H, vertical: false });
  }
  for (let y = FENCE_STEP * 0.5; y < WORLD_H; y += FENCE_STEP) {
    posts.push({ x: 0, y, vertical: true });
    posts.push({ x: WORLD_W, y, vertical: true });
  }
  return posts;
}
