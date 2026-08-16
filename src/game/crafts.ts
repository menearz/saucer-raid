export type CraftId = "disc" | "scout" | "barge" | "phantom";

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
    animated: true,
  },
  {
    id: "scout",
    name: "Needle Scout",
    tag: "Fast",
    blurb: "Cuts the valley. Thin hull. Quiet signature.",
    speed: 445,
    hp: 3,
    beam: 62,
    laser: 0.75,
    fireRate: 0.06,
    heatMult: 0.72,
    w: 108,
    h: 36,
    r: 28,
    sprite: "craft-scout",
    animated: false,
  },
  {
    id: "barge",
    name: "War Barge",
    tag: "Armor",
    blurb: "Slow disc. Thick hide. The laser bites.",
    speed: 235,
    hp: 8,
    beam: 98,
    laser: 1.55,
    fireRate: 0.11,
    heatMult: 1.28,
    w: 104,
    h: 92,
    r: 42,
    sprite: "craft-barge",
    animated: false,
  },
  {
    id: "phantom",
    name: "Phantom",
    tag: "Ghost",
    blurb: "Hard to paint. Heat bleeds off. Less hull.",
    speed: 365,
    hp: 4,
    beam: 74,
    laser: 1.12,
    fireRate: 0.075,
    heatMult: 0.52,
    w: 88,
    h: 88,
    r: 32,
    sprite: "craft-phantom",
    animated: false,
  },
];

const KEY = "saucer-raid-craft";

export function loadCraftId(): CraftId {
  try {
    const v = localStorage.getItem(KEY);
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
