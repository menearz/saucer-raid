import { assetUrl } from "./paths";

export type Sheet = { frames: HTMLImageElement[]; w: number; h: number };

const PATHS = {
  saucer: [1, 2, 3, 4].map((i) => assetUrl(`/game/saucer-${i}.png`)),
  explode: [1, 2, 3, 4].map((i) => assetUrl(`/game/explode-${i}.png`)),
  laser: [1, 2, 3, 4].map((i) => assetUrl(`/game/laser-${i}.png`)),
  rubble: [1, 2, 3, 4].map((i) => assetUrl(`/game/rubble-${i}.png`)),
  singles: [
    "cow",
    "pig",
    "sheep",
    "chicken",
    "farmer-m",
    "farmer-f",
    "civilian-m",
    "civilian-f",
    "barn",
    "farmhouse",
    "townhouse",
    "shop",
    "silo",
    "tractor",
    "pickup",
    "sedan",
    "jeep",
  ],
  props: ["hay", "tree", "pine", "bush", "fence", "mailbox", "crate", "barrel", "pole"],
  tiles: ["grass", "wheat", "dirt", "asphalt"],
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

export type Art = {
  saucer: HTMLImageElement[];
  explode: HTMLImageElement[];
  laser: HTMLImageElement[];
  rubble: HTMLImageElement[];
  sprite: Record<string, HTMLImageElement>;
  tile: HTMLImageElement[];
  title: HTMLImageElement | null;
  ready: boolean;
};

export const art: Art = {
  saucer: [],
  explode: [],
  laser: [],
  rubble: [],
  sprite: {},
  tile: [],
  title: null,
  ready: false,
};

export async function loadArt(): Promise<Art> {
  const [saucer, explode, laser, rubble, singles, props, tiles, title] =
    await Promise.all([
      Promise.all(PATHS.saucer.map(loadImage)),
      Promise.all(PATHS.explode.map(loadImage)),
      Promise.all(PATHS.laser.map(loadImage)),
      Promise.all(PATHS.rubble.map(loadImage)),
      Promise.all(PATHS.singles.map((n) => loadImage(assetUrl(`/game/${n}.png`)))),
      Promise.all(PATHS.props.map((n) => loadImage(assetUrl(`/game/props/${n}.png`)))),
      Promise.all(PATHS.tiles.map((n) => loadImage(assetUrl(`/game/tiles/${n}.png`)))),
      loadImage(assetUrl("/game/title-bg.jpg")).catch(() => null),
    ]);
  art.saucer = saucer;
  art.explode = explode;
  art.laser = laser;
  art.rubble = rubble;
  art.tile = tiles;
  art.title = title;
  PATHS.singles.forEach((n, i) => {
    art.sprite[n] = singles[i]!;
  });
  PATHS.props.forEach((n, i) => {
    art.sprite[n] = props[i]!;
  });
  art.ready = true;
  return art;
}
