import { create } from "zustand";
import type { DamageSource } from "./damage.ts";

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
  pitchControls:
    "WASD or arrows to fly. Beam: Space or K. Fire: J, Ctrl, or click. Pause: Esc or P.",
  pitchControlsTouch: "Stick to fly. Hold Beam to grab. Hold Fire to shoot.",

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
  wingmanCta: "Play with a friend",
  wingmanHostTitle: "Your room code",
  wingmanHostHint: "Friend taps Join and types this",
  wingmanHostBlurb: "Create a room code",
  wingmanJoinTitle: "Enter room code",
  wingmanJoinBlurb: "Enter a friend’s code",
  wingmanCopyCode: "Copy code",
  wingmanCodeCopied: "Code copied.",
  wingmanJoinRoom: "Join room",
  wingmanWaiting: "Waiting for friend…",
  wingmanTrouble: "Having trouble connecting?",
  wingmanLeave: "Leave room",
  wingmanClose: "Close",
  wingmanCancel: "Cancel",
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
  sendIdea: "Send an idea",
  ideaHint: "We read these",
  privacy: "Privacy",

  craftYokeName: "Yoke Runner",
  craftYokeTag: "Hauler",
  craftYokeBlurb: "Fat yoke. Wide tractor. The dish never blinks.",

  beam: "Beam",
  fire: "Fire",

  sectorCleared: "Sector {n} cleared",
  quotaClear: "Quota filled",
  clearTime: "Clear time {t}",
  timeBonus: "Time bonus +{n}",
  goalLabel: "{score} / {goal}",
  saucerDown: "Saucer down",
  killedBy: "Downed by {what}",
  killerJeep: "jeep fire",
  killerTank: "tank fire",
  killerHeli: "helicopter fire",
  killerPlane: "jet fire",
  killerRival: "a rival saucer",
  hullLow: "HULL LOW",
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

  howToPlay: "How to play",
  howToClose: "Close",
  howPurposeTitle: "You",
  howPurposeBody:
    "You fly the saucer.\nBeam animals and people up until you fill this sector's point goal.\nThen spend salvage on your ship and launch the next sector.",
  howWinTitle: "How a raid ends in a win",
  howWinBody:
    "Each sector has a point goal. Sector 1 is 400 points. Each next sector adds 120.\nThe clock counts up. It never ends the raid by itself.\nPar time is 90 seconds plus 2 seconds times the sector number. Sector 1's par is 92 seconds.\nBeat the par and you gain 5 points for each second left. Miss it and that bonus is 0. You still win if the score hit the goal.\nThat bonus is added onto your score when you clear.\nThe raid stops in the Upgrade bay. The screen says Quota filled.\nYou can buy parts with salvage. Next sector starts the next one.",
  howLoseTitle: "How you lose",
  howLoseBody:
    "Green dots are your hull. Gold dots are shields, once you own any.\nShots from the army remove dots.\nWhen one hull dot is left, the screen says HULL LOW.\nWhen the last hull dot is gone, the saucer is down and the raid ends.\nThe screen says Refit. If a jeep, tank, helicopter, jet, or rival saucer took that last hull, it names the shooter.\nRetry sector flies the same sector again. This try's score starts at 0. Salvage you already earned stays.\nHangar leaves the fight. Your ship, salvage, upgrades, and sector stay where they are.",
  howControlsTitle: "Controls",
  howControlsBody:
    "On a keyboard, fly with W, A, S, and D, or the arrow keys.\nW and the up arrow move up. S and the down arrow move down. A and the left arrow move left. D and the right arrow move right.\nHold Space or K to beam.\nHold J, left Ctrl, or click to fire. The mouse aims the shot.\nPress Esc or P to pause.\nOn a touch screen, drag the stick to fly. Hold the Beam button to grab. Hold the Fire button to shoot. The shot aims at the nearest thing you can hit, or along the way you are flying if nothing is close.\nOn a gamepad, the left stick flies and the right stick aims. The bottom face button or the right trigger fires. The right face button or the left trigger beams. Start pauses.",
  howAbductTitle: "Beaming",
  howAbductBody:
    "Hold the beam over an animal or a person. They rise into the saucer.\nKeep holding until they vanish. Let go early and they slip back down.\nThe saucer moves slower while you hold the beam.\nWith no Tractor upgrade, the hold is 0.35 seconds for a chicken, 0.55 for a pig or a sheep, 0.62 for a farmer or a town person, 0.7 for a cow, 1.15 for a parked tractor or car, 1.2 for a jeep, and 1.8 for a tank.\nTractor upgrades make this hold shorter.\nJeeps and tanks can be beamed. Helicopters and jets cannot.\nPeople may shout. Animals do not.",
  howPointsTitle: "Points",
  howPointsBody:
    "A grab scores these base points: chicken 25, pig 50, sheep 75, cow 100, farmer 200, town person 200.\nGrab another before 2.3 seconds pass and a combo grows.\nThe first two grabs in a row pay the base points. After that the multiplier goes up by one for every two more grabs. It stops at 6.\nCars, jeeps, tanks, and buildings do not add these points. Shooting them does not either.\nOn sector 3, then 6, then 9, and so on, a rival saucer shows up. It talks first, and the clock waits during that talk. Then it fights. Destroy it for 1800 points. The combo can multiply those 1800. You also get 3 salvage on the spot. You cannot beam the rival.",
  howThreatsTitle: "What shoots you",
  howThreatsBody:
    "Beaming or blowing something up fills the alarm. It cools slowly if you stop.\nThe words go Uneasy, then Military alert, then Hostile air, then Air raid.\nJeeps, tanks, helicopters, and jets arrive and shoot you.\nOn sectors 1 through 6, a tank shot deals 2 damage and every other shot deals 1. From sector 7, add 1 to that damage, and add another 1 at sector 13, 19, and so on.\nWhile a cloak is up, those shots pass through you. Jeeps and tanks wander off. Helicopters, jets, and the rival stop attacking until it ends.",
  howHullTitle: "Hull, shields, and pickups",
  howHullBody:
    "The hangar hull bar is how many green dots that ship starts with, before Armor.\nEach Armor rank adds one hull dot, up to 4 ranks.\nEach Shields rank adds one gold dot, up to 4. If any shield is left, a shot is spent on the shields and does not also take a hull dot on that same hit. Shields fill back slowly after the hit flash ends.\nShoot a glowing house. A pickup drops. Fly over it to take it. It lasts 18 seconds.\nA gun cache steps your laser to Laser+, then Twin, then Spread, and then stops. Cannons in the bay start you higher on that same ladder.\nA cloak adds 10 seconds. Another cloak adds more, up to 16 seconds on the timer.\nThe small map marks gun houses, cloak houses, and the army.",
  howHangarTitle: "Hangar, salvage, pause",
  howHangarBody:
    "This screen is the hangar. The arrows and the portraits pick a ship.\nThe ships are Classic Disc, Yoke Runner, Chrome Spike, Long Ember, Pale Keel, Twin Wake, Lantern, and Anvil.\nThe bars are speed, hull, beam, laser, and Cool. A longer Cool bar means the alarm fills slower.\nLaunch starts the sector shown above the title.\nWhen the raid ends you earn salvage. Divide the score by 180 and drop the fraction. Add 6 if you filled the goal, or add 2 if you were shot down. You always get at least 2. If you beat the par, that bonus is already inside the score.\nThe first rank of a part costs 20 salvage. Each next rank costs 20 more.\nEach Engines rank adds 12% speed. Each Tractor rank adds 8% beam width and fills the beam 28% faster. Each Armor rank adds one hull dot. Each Shields rank adds one shield dot. Each Cannons rank adds 12% laser power, shortens the gap between shots by 6%, and starts you one step up the gun ladder. Engines, Tractor, Armor, and Shields stop at rank 4. Cannons stop at rank 3.\nUpgrades stay on the ship you bought them for.\nOnce the sector number above the title is past 1, New campaign appears. It clears salvage, upgrades, and the sector, and puts you back on sector 1. The ship you picked stays. The best score stays.\nPlay with a friend makes a room code. Your friend taps Join and types it.\nEN and ES change the language, on this screen or while paused.\nIn a raid, the speaker button mutes the sound. Press it again for sound.\nEsc, P, or the pause button pauses. Resume goes on. Restart raid starts this sector over. Hangar brings you back here and keeps your progress.",
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
    "WASD o flechas para volar. Rayo: Espacio o K. Disparo: J, Ctrl o clic. Pausa: Esc o P.",
  pitchControlsTouch: "Palanca para volar. Mantén Haz para agarrar. Mantén Fire para disparar.",

  sector: "Sector {n}",
  best: "Mejor",
  salvage: "Chatarra",
  hangar: "Hangar",
  prevCraft: "Nave anterior",
  nextCraft: "Nave siguiente",

  statSpeed: "Veloc.",
  statHull: "Casco",
  statBeam: "Haz",
  statLaser: "Láser",
  statCool: "Fresco",

  launch: "Lanzar",
  loading: "Cargando el valle…",
  play: "Jugar",
  newCampaign: "Nueva campaña",
  signIn: "Iniciar sesión",

  wingman: "Compañero",
  wingmanCta: "Juega con un amigo",
  wingmanHostTitle: "Tu código de sala",
  wingmanHostHint: "Tu amigo toca Unirse y escribe esto",
  wingmanHostBlurb: "Crear un código de sala",
  wingmanJoinTitle: "Escribe el código de sala",
  wingmanJoinBlurb: "Escribe el código de un amigo",
  wingmanCopyCode: "Copiar código",
  wingmanCodeCopied: "Código copiado.",
  wingmanJoinRoom: "Unirse a la sala",
  wingmanWaiting: "Esperando a un amigo…",
  wingmanTrouble: "¿Problemas para conectar?",
  wingmanLeave: "Salir de la sala",
  wingmanClose: "Cerrar",
  wingmanCancel: "Cancelar",
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
  sendIdea: "Enviar una idea",
  ideaHint: "Las leemos",
  privacy: "Privacidad",

  craftYokeName: "Corredor Yugo",
  craftYokeTag: "Carguero",
  craftYokeBlurb: "Yugo grueso. Tractor ancho. El plato no parpadea.",

  beam: "Haz",
  fire: "Fire",

  sectorCleared: "Sector {n} despejado",
  quotaClear: "Cupo lleno",
  clearTime: "Tiempo {t}",
  timeBonus: "Bonus de tiempo +{n}",
  goalLabel: "{score} / {goal}",
  saucerDown: "Platillo derribado",
  killedBy: "Derribado por {what}",
  killerJeep: "fuego de jeep",
  killerTank: "fuego de tanque",
  killerHeli: "fuego de helicóptero",
  killerPlane: "fuego de caza",
  killerRival: "un platillo rival",
  hullLow: "CASCO BAJO",
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

  howToPlay: "Cómo jugar",
  howToClose: "Cerrar",
  howPurposeTitle: "Tú",
  howPurposeBody:
    "Tú vuelas el platillo.\nAbsorbes animales y personas hasta llenar la meta de puntos de este sector.\nDespués gastas chatarra en tu nave y lanzas el siguiente sector.",
  howWinTitle: "Cómo se gana una incursión",
  howWinBody:
    "Cada sector tiene una meta de puntos. El sector 1 pide 400 puntos. Cada sector siguiente suma 120.\nEl reloj sube. Por sí solo no termina la incursión.\nEl tiempo de referencia es 90 segundos más 2 segundos por el número de sector. En el sector 1 son 92 segundos.\nSi terminas antes, ganas 5 puntos por cada segundo que te sobró. Si te pasas, ese bonus es 0. Igual ganas si el puntaje llegó a la meta.\nEse bonus se suma a tu puntaje al despejar el sector.\nLa incursión para en la Bahía de mejoras. La pantalla dice Cupo lleno.\nPuedes comprar piezas con chatarra. Siguiente sector empieza el que sigue.",
  howLoseTitle: "Cómo se pierde",
  howLoseBody:
    "Los puntos verdes son tu casco. Los puntos dorados son escudos, cuando ya tienes alguno.\nLos disparos del ejército quitan puntos.\nCuando queda un punto de casco, la pantalla dice CASCO BAJO.\nCuando se acaba el último, el platillo cae y la incursión termina.\nLa pantalla dice Reequipar. Si el último casco lo quitó un jeep, un tanque, un helicóptero, un caza o un platillo rival, te dice cuál.\nReintentar sector vuela el mismo sector otra vez. El puntaje de ese intento empieza en 0. La chatarra que ya ganaste se queda.\nHangar sale del combate. Tu nave, la chatarra, las mejoras y el sector se quedan como están.",
  howControlsTitle: "Controles",
  howControlsBody:
    "En el teclado, vuela con W, A, S y D, o con las flechas.\nW y la flecha arriba suben. S y la flecha abajo bajan. A y la flecha izquierda van a la izquierda. D y la flecha derecha van a la derecha.\nMantén Espacio o K para el haz.\nMantén J, Ctrl izquierdo, o clic para disparar. El mouse apunta el disparo.\nPulsa Esc o P para pausar.\nEn una pantalla táctil, arrastra la palanca para volar. Mantén el botón Haz para agarrar. Mantén el botón Fire para disparar. El disparo busca lo más cercano que puedes golpear. Si no hay nada cerca, sigue tu rumbo.\nEn un mando, la palanca izquierda vuela y la palanca derecha apunta. El botón de abajo o el gatillo derecho disparan. El botón de la derecha o el gatillo izquierdo activan el haz. Start pausa.",
  howAbductTitle: "El haz",
  howAbductBody:
    "Mantén el haz sobre un animal o una persona. Suben al platillo.\nSigue aguantando hasta que desaparezcan. Si sueltas antes, se resbalan hacia abajo.\nEl platillo va más lento mientras mantienes el haz.\nSin mejora de Tractor, hay que aguantar 0.35 segundos para un pollo, 0.55 para un cerdo o una oveja, 0.62 para un granjero o una persona del pueblo, 0.7 para una vaca, 1.15 para un tractor o un auto estacionado, 1.2 para un jeep y 1.8 para un tanque.\nLas mejoras de Tractor acortan esa espera.\nPuedes absorber jeeps y tanques. No puedes absorber helicópteros ni cazas.\nLas personas pueden gritar. Los animales no.",
  howPointsTitle: "Puntos",
  howPointsBody:
    "Una captura da estos puntos base: pollo 25, cerdo 50, oveja 75, vaca 100, granjero 200, persona del pueblo 200.\nSi capturas otro antes de que pasen 2.3 segundos, crece un combo.\nLas dos primeras capturas seguidas pagan los puntos base. Después el multiplicador sube uno por cada dos capturas más. Se detiene en 6.\nAutos, jeeps, tanques y edificios no suman estos puntos. Dispararles tampoco.\nEn el sector 3, luego el 6, luego el 9, y así, aparece un platillo rival. Primero habla, y el reloj espera durante esa charla. Después pelea. Destrúyelo y ganas 1800 puntos. El combo puede multiplicar esos 1800. También recibes 3 de chatarra en el acto. No puedes absorber al rival.",
  howThreatsTitle: "Qué te dispara",
  howThreatsBody:
    "Absorber o volar algo llena la alarma. Se enfría despacio si paras.\nLas palabras van Inquieto, luego Alerta militar, luego Aire hostil, luego Ataque aéreo.\nLlegan jeeps, tanques, helicópteros y cazas, y te disparan.\nEn los sectores 1 a 6, un disparo de tanque hace 2 de daño y cualquier otro hace 1. Desde el sector 7, suma 1 a ese daño, y suma otro 1 en el sector 13, 19, y así.\nMientras hay capa, esos disparos te atraviesan. Los jeeps y los tanques se van a vagar. Helicópteros, cazas y el rival dejan de atacar hasta que se acaba.",
  howHullTitle: "Casco, escudos y recogidas",
  howHullBody:
    "La barra de casco del hangar es cuántos puntos verdes trae esa nave, antes de Blindaje.\nCada rango de Blindaje suma un punto de casco, hasta 4 rangos.\nCada rango de Escudos suma un punto dorado, hasta 4. Si queda algún escudo, el disparo se gasta en los escudos y no quita también un punto de casco en ese mismo golpe. Los escudos se rellenan despacio cuando termina el destello del golpe.\nDispara a una casa que brilla. Cae una recogida. Pásale por encima para tomarla. Dura 18 segundos.\nUna caja de cañón sube tu láser a Láser+, luego Doble, luego Abanico, y ahí se queda. Cañones en la bahía te empiezan más arriba en esa misma escala.\nUna capa suma 10 segundos. Otra capa suma más, hasta 16 segundos en el contador.\nEl mapa pequeño marca casas de cañón, casas de capa y el ejército.",
  howHangarTitle: "Hangar, chatarra, pausa",
  howHangarBody:
    "Esta pantalla es el hangar. Las flechas y los retratos eligen la nave.\nLas naves son Classic Disc, Corredor Yugo, Chrome Spike, Long Ember, Pale Keel, Twin Wake, Lantern y Anvil.\nLas barras son velocidad, casco, haz, láser y Fresco. Una barra Fresco más larga significa que la alarma sube más lento.\nLanzar empieza el sector que se ve arriba del título.\nAl terminar la incursión ganas chatarra. Divide el puntaje entre 180 y tira el decimal. Suma 6 si llenaste la meta, o suma 2 si te derribaron. Siempre recibes al menos 2. Si venciste el tiempo de referencia, ese bonus ya va dentro del puntaje.\nEl primer rango de una pieza cuesta 20 de chatarra. Cada rango siguiente cuesta 20 más.\nCada rango de Motores suma 12% de velocidad. Cada rango de Tractor suma 8% de ancho del haz y llena el haz 28% más rápido. Cada rango de Blindaje suma un punto de casco. Cada rango de Escudos suma un punto de escudo. Cada rango de Cañones suma 12% de poder del láser, acorta la pausa entre disparos un 6% y te empieza un paso más arriba en la escala de cañones. Motores, Tractor, Blindaje y Escudos llegan hasta el rango 4. Cañones se detienen en el rango 3.\nLas mejoras se quedan en la nave en la que las compraste.\nCuando el número de sector arriba del título pasa de 1, aparece Nueva campaña. Borra la chatarra, las mejoras y el sector, y te devuelve al sector 1. La nave que elegiste se queda. El mejor puntaje se queda.\nJuega con un amigo crea un código de sala. Tu amigo toca Unirse y lo escribe.\nEN y ES cambian el idioma, en esta pantalla o en la pausa.\nEn una incursión, el botón del altavoz silencia el sonido. Púlsalo otra vez para oír.\nEsc, P, o el botón de pausa pausan. Continuar sigue. Reiniciar incursión empieza este sector de nuevo. Hangar te trae de vuelta aquí y conserva tu progreso.",
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

export const KILLER_KEYS: Record<DamageSource, MsgKey> = {
  jeep: "killerJeep",
  tank: "killerTank",
  heli: "killerHeli",
  plane: "killerPlane",
  rival: "killerRival",
};

export const UPGRADE_KEYS: Record<string, { name: MsgKey; blurb: MsgKey }> = {
  engines: { name: "upEngines", blurb: "upEnginesBlurb" },
  tractor: { name: "upTractor", blurb: "upTractorBlurb" },
  armor: { name: "upArmor", blurb: "upArmorBlurb" },
  shields: { name: "upShields", blurb: "upShieldsBlurb" },
  weapons: { name: "upWeapons", blurb: "upWeaponsBlurb" },
};
