/** Shooters that actually call hurtPlayer through spawnShot. */
export const DAMAGE_SOURCES = ["jeep", "tank", "heli", "plane", "rival"] as const;

export type DamageSource = (typeof DAMAGE_SOURCES)[number];

/** Screen-edge hit flash. Inside the 150–250ms punch window. */
export const HULL_HIT_FLASH_S = 0.2;

/** Warning when only the last hull pip is left. */
export const LOW_HULL_HP = 1;

export function isDamageSource(value: string): value is DamageSource {
  return (DAMAGE_SOURCES as readonly string[]).includes(value);
}

export function isLowHull(hp: number): boolean {
  return hp > 0 && hp <= LOW_HULL_HP;
}
