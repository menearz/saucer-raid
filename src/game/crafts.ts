export type CraftId = "disc" | "yoke" | "spike" | "ember" | "keel" | "wake";

const RETIRED = new Set(["scout", "barge", "phantom"]);

export type Craft = {
  id: CraftId;
  name: string;
  tag: string;
  blurb: string;
  speed: number;
  hp: number;
  beam: number;
  laser: number;
  fireRate: number;
  heatMult: number;
  w: number;
  h: number;
  r: number;
  sprite: string;
  portrait: string;
  animated: boolean;
};

export const CRAFTS: Craft[] = [
  {
    id: "disc",
    name: "Classic Disc",
    tag: "Balanced",
    blurb: "The tourist special. Even hands, even heat.",
    speed: 330,
    hp: 5,
    beam: 82,
    laser: 1,
    fireRate: 0.085,
    heatMult: 1,
    w: 86,
    h: 86,
    r: 34,
    sprite: "saucer-1",
    portrait: "saucer-1",
    animated: true,
  },
  {
    id: "yoke",
    name: "Yoke Runner",
    tag: "Hauler",
    blurb: "Fat yoke. Wide tractor. The dish never blinks.",
    speed: 355,
    hp: 6,
    beam: 100,
    laser: 1.05,
    fireRate: 0.09,
    heatMult: 0.95,
    w: 108,
    h: 82,
    r: 38,
    sprite: "craft-yoke",
    portrait: "hangar-yoke",
    animated: false,
  },
  {
    id: "spike",
    name: "Chrome Spike",
    tag: "Fast",
    blurb: "Stacked steel. Cuts the valley. Thin skin.",
    speed: 450,
    hp: 3,
    beam: 58,
    laser: 0.78,
    fireRate: 0.055,
    heatMult: 0.7,
    w: 100,
    h: 96,
    r: 30,
    sprite: "craft-spike",
    portrait: "hangar-spike",
    animated: false,
  },
  {
    id: "ember",
    name: "Long Ember",
    tag: "Armor",
    blurb: "A long keel and a mean laser. Slow to turn the night.",
    speed: 220,
    hp: 9,
    beam: 88,
    laser: 1.68,
    fireRate: 0.12,
    heatMult: 1.35,
    w: 146,
    h: 74,
    r: 38,
    sprite: "craft-ember",
    portrait: "hangar-ember",
    animated: false,
  },
  {
    id: "keel",
    name: "Pale Keel",
    tag: "Strike",
    blurb: "Slim frigate. Fast guns. Don't get painted.",
    speed: 405,
    hp: 4,
    beam: 68,
    laser: 1.28,
    fireRate: 0.065,
    heatMult: 0.88,
    w: 130,
    h: 68,
    r: 30,
    sprite: "craft-keel",
    portrait: "hangar-keel",
    animated: false,
  },
  {
    id: "wake",
    name: "Twin Wake",
    tag: "Ghost",
    blurb: "Twin trails, quiet heat. Hard to lock.",
    speed: 340,
    hp: 4,
    beam: 92,
    laser: 1.02,
    fireRate: 0.08,
    heatMult: 0.48,
    w: 118,
    h: 98,
    r: 36,
    sprite: "craft-wake",
    portrait: "hangar-wake",
    animated: false,
  },
];

const KEY = "saucer-raid-craft";

export function loadCraftId(): CraftId {
  try {
    const v = localStorage.getItem(KEY);
    if (v && RETIRED.has(v)) return "disc";
    if (v && CRAFTS.some((c) => c.id === v)) return v as CraftId;
  } catch {
    /* private mode */
  }
  return "disc";
}

export function saveCraftId(id: CraftId) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* ignore */
  }
}

export function getCraft(id?: CraftId) {
  return CRAFTS.find((c) => c.id === (id ?? loadCraftId())) ?? CRAFTS[0]!;
}

export function cycleCraftId(id: CraftId, dir: -1 | 1): CraftId {
  const i = CRAFTS.findIndex((c) => c.id === id);
  const next = (i + dir + CRAFTS.length) % CRAFTS.length;
  return CRAFTS[next]!.id;
}
