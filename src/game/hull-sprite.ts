/** Shared raid hull lookup. Disc keeps the 4-frame saucer sheet. */
export function hullSpriteName(
  craftId: string | undefined,
  saucerSprite: string,
  frameIndex: number,
): string {
  if (craftId && craftId !== "disc") return saucerSprite;
  return `saucer-${(frameIndex % 4) + 1}`;
}
