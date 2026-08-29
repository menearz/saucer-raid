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
    "tank",
    "heli",
    "plane",
    "craft-yoke",
    "craft-spike",
    "craft-ember",
    "craft-keel",
    "craft-wake",
    "special-armory",
    "special-cloak",
    "pickup-weapon",
    "pickup-cloak",
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

/** One 404 must not reject the whole hangar load. */
function loadOptional(src: string): Promise<HTMLImageElement | null> {
  return loadImage(src).catch(() => null);
}

function keepSheet(frames: (HTMLImageElement | null)[]): HTMLImageElement[] {
  const first = frames.find((f): f is HTMLImageElement => !!f);
  if (!first) return [];
  return frames.map((f) => f ?? first);
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
      Promise.all(PATHS.saucer.map(loadOptional)),
      Promise.all(PATHS.explode.map(loadOptional)),
      Promise.all(PATHS.laser.map(loadOptional)),
      Promise.all(PATHS.rubble.map(loadOptional)),
      Promise.all(PATHS.singles.map((n) => loadOptional(assetUrl(`/game/${n}.png`)))),
      Promise.all(PATHS.props.map((n) => loadOptional(assetUrl(`/game/props/${n}.png`)))),
      Promise.all(PATHS.tiles.map((n) => loadOptional(assetUrl(`/game/tiles/${n}.png`)))),
      loadImage(assetUrl("/game/title-bg.png")).catch(() => null),
    ]);
  art.saucer = keepSheet(saucer);
  art.explode = keepSheet(explode);
  art.laser = keepSheet(laser);
  art.rubble = keepSheet(rubble);
  art.tile = tiles.map((im) => im as HTMLImageElement);
  art.title = title;
  PATHS.singles.forEach((n, i) => {
    const im = singles[i];
    if (im) art.sprite[n] = im;
  });
  PATHS.props.forEach((n, i) => {
    const im = props[i];
    if (im) art.sprite[n] = im;
  });
  art.ready = true;
  return art;
}
