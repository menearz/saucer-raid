# Saucer Raid

**[Play the game →](https://menearz.github.io/saucer-raid/)**

Night raid over a painted valley. Fly the disc, abduct livestock and townsfolk, carve barns and pickups with the laser. Heat draws jeeps. Score everything.

[![Play Saucer Raid](promo.png)](https://menearz.github.io/saucer-raid/)

## Controls

| Input | Action |
| --- | --- |
| WASD / left stick | Fly. A is left, D is right. |
| Hold **Beam** | Tractor beam — a spring pull that lifts cows, pigs, people, even a jeep |
| Hold **Fire** / click | Laser. Mouse aims on desktop. Hits use swept collision. |
| P | Pause |

One hundred seconds. Combos stack. Heat fills when you wreck things; too much heat and the jeeps come.

Works portrait and landscape. The phone buzzes on Android.

## Engine

- **WebGL** via three.js — instanced terrain, batched sprites, GPU particles, dusk lighting
- **Physics** — mass, drag, spatial-hash collisions, explosion impulses, beam springs, debris shards
- React · Vite · Tailwind v4 · Zustand

## Local

```bash
npm install
npm run dev
```
