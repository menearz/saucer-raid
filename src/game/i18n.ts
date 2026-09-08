import { create } from "zustand";

export type Lang = "en" | "es";

export const LANG_KEY = "saucer-raid-lang";
export const LANGS: readonly Lang[] = ["en", "es"];

export const EN = {
  siteTitle: "Saucer Raid",
  siteTitleL1: "Saucer",
  siteTitleL2: "Raid",
  wrapTitle: "Alien Attack Saucer",
  wrapTitleL1: "Alien Attack",
  wrapTitleL2: "Saucer",

  language: "Language",
  languagePicker: "Language · Idioma",
  english: "English",
  spanish: "Español",

  pitchLead: "You are the saucer.",
  pitchFly: "Fly the farm. Beam up cows and people. Blast what shoots back.",
  pitchControls: "Stick or WASD to fly. Hold Beam to grab. Hold Fire to shoot. Beat the clock.",

  sector: "Sector {n}",
  best: "Best",
  salvage: "Salvage",
  hangar: "Hangar",
  prevCraft: "Previous craft",
  nextCraft: "Next craft",

  statSpeed: "Speed",
  statHull: "Hull",
  statBeam: "Beam",
  statLaser: "Laser",
  statCool: "Cool",

  launch: "Launch",
  loading: "Loading the valley…",
  play: "Play",
  newCampaign: "New campaign",
  signIn: "Sign in",

  wingman: "Wingman",
  roomCode: "Room code",
  host: "Host",
  join: "Join",
  netHint: "Enter a room code, or Host to make one.",
  netTypeCode: "Type the room code first.",
  netOpening: "Opening room {room}…",
  netInRoom: "In room {room}. Waiting for a wingman…",
  netLinked: "Linked with {n} wingman{s} in {room}.",
  netFound: "Found {n} in room {room}. Linking…",
  netLinkedCount: "{n} linked",
  netRoomEmpty: "No one is in room {room}. That code looks empty or wrong.",
  netHandshakeCopied: "Handshake copied. Paste it in the other browser.",
  netCopyFailed: "Copy failed. Select the handshake and copy it yourself.",
  netPasteFirst: "Paste a handshake first.",
  netHostOrJoin: "Host or Join a room, then paste the handshake.",
  netHandshakeApplied: "Handshake applied. Linking…",
  netHandshakeBad: "That handshake could not be read.",
  netHandshakeSummary: "Handshake if the relay is quiet",
  netHandshakeHelp:
    "Two tabs on this site link themselves. For another computer, copy this handshake into the other browser after Host and Join.",
  netCopyHandshake: "Copy handshake",
  netPasteHandshake: "Paste handshake",

  paused: "Paused",
  raidOnHold: "The raid is on hold.",
  resume: "Resume",
  restartRaid: "Restart raid",
  pause: "Pause",
  mute: "Mute",
  unmute: "Unmute",

  beam: "Beam",
  fire: "Fire",

  sectorCleared: "Sector {n} cleared",
  saucerDown: "Saucer down",
  upgradeBay: "Upgrade bay",
  refit: "Refit",
  takenWrecked: "{a} taken · {d} wrecked",
  max: "Max",
  nextSector: "Next sector",
  retrySector: "Retry sector",

  combo: "Combo {n}",
  cloak: "Cloak {t}s",
  weaponLaser: "Laser",
  weaponLaserPlus: "Laser+",
  weaponTwin: "Twin",
  weaponSpread: "Spread",

  alertCalm: "Calm valley",
  alertUneasy: "Uneasy",
  alertAlert: "Military alert",
  alertHostile: "Hostile air",
  alertAirRaid: "Air raid",

  mapGun: "Gun",
  mapCloak: "Cloak",
  mapArmy: "Army",

  upEngines: "Engines",
  upEnginesBlurb: "Faster disc.",
  upTractor: "Tractor",
  upTractorBlurb: "Yank them up quicker.",
  upArmor: "Armor",
  upArmorBlurb: "More hull.",
  upShields: "Shields",
  upShieldsBlurb: "Soak military fire.",
  upWeapons: "Cannons",
  upWeaponsBlurb: "Start the raid hotter.",
} as const;

export type MsgKey = keyof typeof EN;

export const ES: Record<MsgKey, string> = {
  siteTitle: "Incursión del Platillo",
  siteTitleL1: "Incursión",
  siteTitleL2: "del Platillo",
  wrapTitle: "Ataque Alienígena",
  wrapTitleL1: "Ataque",
  wrapTitleL2: "Alienígena",

  language: "Idioma",
  languagePicker: "Language · Idioma",
  english: "English",
  spanish: "Español",

  pitchLead: "Tú eres el platillo.",
  pitchFly: "Vuela la granja. Absorbe vacas y gente. Dispara a lo que te dispara.",
  pitchControls:
    "Stick o WASD para volar. Mantén Beam para agarrar. Mantén Fire para disparar. Gana al reloj.",

  sector: "Sector {n}",
  best: "Mejor",
  salvage: "Chatarra",
  hangar: "Hangar",
  prevCraft: "Nave anterior",
  nextCraft: "Nave siguiente",

  statSpeed: "Veloc.",
  statHull: "Casco",
  statBeam: "Beam",
  statLaser: "Láser",
  statCool: "Fresco",

  launch: "Lanzar",
  loading: "Cargando el valle…",
  play: "Jugar",
  newCampaign: "Nueva campaña",
  signIn: "Iniciar sesión",

  wingman: "Compañero",
  roomCode: "Código de sala",
  host: "Host",
  join: "Unirse",
  netHint: "Escribe un código, o Host para crear uno.",
  netTypeCode: "Escribe el código de sala primero.",
  netOpening: "Abriendo sala {room}…",
  netInRoom: "En sala {room}. Esperando un compañero…",
  netLinked: "Enlace con {n} compañero{s} en {room}.",
  netFound: "Hay {n} en sala {room}. Enlazando…",
  netLinkedCount: "{n} enlazados",
  netRoomEmpty: "Nadie está en la sala {room}. Ese código parece vacío o incorrecto.",
  netHandshakeCopied: "Handshake copiado. Pégalo en el otro navegador.",
  netCopyFailed: "No se pudo copiar. Selecciona el handshake y cópialo tú.",
  netPasteFirst: "Pega un handshake primero.",
  netHostOrJoin: "Haz Host o Unirse, luego pega el handshake.",
  netHandshakeApplied: "Handshake aplicado. Enlazando…",
  netHandshakeBad: "Ese handshake no se pudo leer.",
  netHandshakeSummary: "Handshake si el relé está en silencio",
  netHandshakeHelp:
    "Dos pestañas de este sitio se enlazan solas. En otro equipo, copia este handshake al otro navegador después de Host y Unirse.",
  netCopyHandshake: "Copiar handshake",
  netPasteHandshake: "Pegar handshake",

  paused: "Pausa",
  raidOnHold: "La incursión está en pausa.",
  resume: "Continuar",
  restartRaid: "Reiniciar incursión",
  pause: "Pausa",
  mute: "Silenciar",
  unmute: "Sonido",

  beam: "Beam",
  fire: "Fire",

  sectorCleared: "Sector {n} despejado",
  saucerDown: "Platillo derribado",
  upgradeBay: "Bahía de mejoras",
  refit: "Reequipar",
  takenWrecked: "{a} absorbidos · {d} destrozados",
  max: "Máx",
  nextSector: "Siguiente sector",
  retrySector: "Reintentar sector",

  combo: "Combo {n}",
  cloak: "Capa {t}s",
  weaponLaser: "Láser",
  weaponLaserPlus: "Láser+",
  weaponTwin: "Doble",
  weaponSpread: "Abanico",

  alertCalm: "Valle calmo",
  alertUneasy: "Inquieto",
  alertAlert: "Alerta militar",
  alertHostile: "Aire hostil",
  alertAirRaid: "Ataque aéreo",

  mapGun: "Cañón",
  mapCloak: "Capa",
  mapArmy: "Ejército",

  upEngines: "Motores",
  upEnginesBlurb: "Disco más rápido.",
  upTractor: "Tractor",
  upTractorBlurb: "Absórbelos más rápido.",
  upArmor: "Blindaje",
  upArmorBlurb: "Más casco.",
  upShields: "Escudos",
  upShieldsBlurb: "Aguanta el fuego militar.",
  upWeapons: "Cañones",
  upWeaponsBlurb: "Empieza la incursión más fuerte.",
};

const TABLES: Record<Lang, Record<MsgKey, string>> = { en: EN, es: ES };

export type MsgVars = Record<string, string | number>;

function fill(template: string, vars?: MsgVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] == null ? "" : String(vars[name]),
  );
}

/** Missing or blank key → English. Never returns an empty string if the key exists in EN. */
export function translate(lang: Lang, key: MsgKey, vars?: MsgVars): string {
  const table = TABLES[lang] ?? TABLES.en;
  const raw = table[key] || TABLES.en[key] || key;
  return fill(raw, vars);
}

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "es";
}

export function readLang(): Lang | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(LANG_KEY);
    return isLang(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeLang(lang: Lang) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* ignore quota / private mode */
  }
}

export function applyDocumentLang(lang: Lang, wrap = false) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang;
  document.title = translate(lang, wrap ? "wrapTitle" : "siteTitle");
}

function viteFlag(name: "VITE_PAGES" | "VITE_WRAP"): boolean {
  try {
    return import.meta.env?.[name] === "true";
  } catch {
    return false;
  }
}

function initialI18n(): { lang: Lang; picked: boolean; ready: boolean } {
  // Client-only Pages/wrap bundles can read storage before first paint.
  if (viteFlag("VITE_PAGES") || viteFlag("VITE_WRAP")) {
    const saved = readLang();
    return { lang: saved ?? "en", picked: saved != null, ready: true };
  }
  // TanStack Start SSR + client hydration must match (English, no picker).
  return { lang: "en", picked: true, ready: false };
}

type I18nState = {
  lang: Lang;
  picked: boolean;
  ready: boolean;
  setLang: (lang: Lang) => void;
  hydrate: () => void;
};

export const useI18n = create<I18nState>((set, get) => ({
  ...initialI18n(),
  setLang: (lang) => {
    if (!isLang(lang)) return;
    writeLang(lang);
    set({ lang, picked: true, ready: true });
  },
  hydrate: () => {
    if (get().ready) return;
    const saved = readLang();
    set({ lang: saved ?? "en", picked: saved != null, ready: true });
  },
}));

export function useT() {
  const lang = useI18n((s) => s.lang);
  return (key: MsgKey, vars?: MsgVars) => translate(lang, key, vars);
}

export const ALERT_KEYS: Record<string, MsgKey> = {
  calm: "alertCalm",
  uneasy: "alertUneasy",
  alert: "alertAlert",
  hostile: "alertHostile",
  "air-raid": "alertAirRaid",
};

export const WEAPON_KEYS: MsgKey[] = [
  "weaponLaser",
  "weaponLaserPlus",
  "weaponTwin",
  "weaponSpread",
];

export const UPGRADE_KEYS: Record<string, { name: MsgKey; blurb: MsgKey }> = {
  engines: { name: "upEngines", blurb: "upEnginesBlurb" },
  tractor: { name: "upTractor", blurb: "upTractorBlurb" },
  armor: { name: "upArmor", blurb: "upArmorBlurb" },
  shields: { name: "upShields", blurb: "upShieldsBlurb" },
  weapons: { name: "upWeapons", blurb: "upWeaponsBlurb" },
};
