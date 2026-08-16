import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { art } from "./assets";
import { traumaOffset } from "./sim";
import { COLS, ROWS, TILE, WORLD_H, WORLD_W, type Actor } from "./types";
import type { World } from "./world";

export type GlRenderer = {
  render: (w: World, now: number) => void;
  resize: () => void;
  dispose: () => void;
};

function texFrom(img: HTMLImageElement | undefined) {
  if (!img) return null;
  const t = new THREE.Texture(img);
  t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

function hexColor(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return new THREE.Color(n);
}

export function createGlRenderer(canvas: HTMLCanvasElement): GlRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
    stencil: false,
    preserveDrawingBuffer: true,
  });
  renderer.setClearColor(0x12180f, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.autoClear = true;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a1016, 0.00055);

  const camera = new THREE.OrthographicCamera(-200, 200, 200, -200, 0.1, 1600);
  camera.up.set(0, 0, -1);
  camera.position.set(0, 520, 0);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0x6d86a8, 0x1c1610, 0.85));
  scene.add(new THREE.AmbientLight(0x243040, 0.35));
  const moon = new THREE.DirectionalLight(0x8aa0c8, 0.35);
  moon.position.set(-200, 400, -120);
  scene.add(moon);

  const saucerLight = new THREE.PointLight(0xb8f0d0, 3.4, 420, 1.6);
  saucerLight.position.set(0, 70, 0);
  scene.add(saucerLight);
  const rim = new THREE.PointLight(0x6fdb9a, 1.4, 180, 2);
  scene.add(rim);

  const blastLights: THREE.PointLight[] = [];
  for (let i = 0; i < 3; i++) {
    const l = new THREE.PointLight(0xff9a4a, 0, 280, 2);
    scene.add(l);
    blastLights.push(l);
  }

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_W + 400, WORLD_H + 400),
    new THREE.MeshBasicMaterial({ color: 0x1a2418 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(WORLD_W / 2, -1, WORLD_H / 2);
  scene.add(ground);

  const tileGroup = new THREE.Group();
  scene.add(tileGroup);
  const tileMeshes: THREE.InstancedMesh[] = [];
  let tiledFor: Uint8Array | null = null;

  const plane = new THREE.PlaneGeometry(TILE + 0.4, TILE + 0.4);
  plane.rotateX(-Math.PI / 2);

  function rebuildTiles(w: World) {
    for (const m of tileMeshes) {
      tileGroup.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    tileMeshes.length = 0;
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < w.terrain.length; i++) counts[w.terrain[i] ?? 0]++;
    const dummy = new THREE.Object3D();
    for (let t = 0; t < 4; t++) {
      const img = art.tile[t];
      const map = texFrom(img);
      const mat = new THREE.MeshBasicMaterial({
        map,
        color: 0xffffff,
      });
      const mesh = new THREE.InstancedMesh(plane, mat, counts[t] || 1);
      mesh.frustumCulled = false;
      let n = 0;
      for (let ty = 0; ty < ROWS; ty++) {
        for (let tx = 0; tx < COLS; tx++) {
          if ((w.terrain[ty * COLS + tx] ?? 0) !== t) continue;
          dummy.position.set(tx * TILE + TILE / 2, 0, ty * TILE + TILE / 2);
          dummy.updateMatrix();
          mesh.setMatrixAt(n++, dummy.matrix);
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
      tileGroup.add(mesh);
      tileMeshes.push(mesh);
    }
    tiledFor = w.terrain;
  }

  const texCache = new Map<string, THREE.Texture>();
  function tex(name: string) {
    let t = texCache.get(name);
    if (t) return t;
    const img =
      name.startsWith("saucer")
        ? art.saucer[Number(name.slice(-1)) - 1]
        : name.startsWith("explode")
          ? art.explode[Number(name.slice(-1)) - 1]
          : name.startsWith("laser")
            ? art.laser[Number(name.slice(-1)) - 1]
            : art.sprite[name];
    t = texFrom(img) ?? new THREE.Texture();
    texCache.set(name, t);
    return t;
  }

  const sprites = new Map<number, THREE.Sprite>();
  const matCache = new Map<string, THREE.SpriteMaterial>();
  function spriteMat(name: string, additive = false) {
    const key = name + (additive ? ":add" : "");
    let m = matCache.get(key);
    if (m) return m;
    m = new THREE.SpriteMaterial({
      map: tex(name),
      transparent: true,
      depthWrite: false,
      color: 0xffffff,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    matCache.set(key, m);
    return m;
  }

  function sprite(id: number, name: string, additive = false) {
    let s = sprites.get(id);
    if (!s) {
      s = new THREE.Sprite(spriteMat(name, additive));
      s.center.set(0.5, 0.45);
      scene.add(s);
      sprites.set(id, s);
    } else if (s.material.map !== spriteMat(name, additive).map) {
      s.material = spriteMat(name, additive);
    }
    s.visible = true;
    return s;
  }

  const MAX_P = 400;
  const pPos = new Float32Array(MAX_P * 3);
  const pCol = new Float32Array(MAX_P * 3);
  const pSize = new Float32Array(MAX_P);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
  pGeo.setAttribute("size", new THREE.BufferAttribute(pSize, 1));
  const pMat = new THREE.PointsMaterial({
    size: 5,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false;
  scene.add(points);

  const beamGeo = new THREE.CircleGeometry(78, 32);
  beamGeo.rotateX(-Math.PI / 2);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x7dffc2,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.visible = false;
  scene.add(beam);
  const beamRingGeo = new THREE.RingGeometry(62, 70, 40);
  beamRingGeo.rotateX(-Math.PI / 2);
  const beamRing = new THREE.Mesh(
    beamRingGeo,
    new THREE.MeshBasicMaterial({
      color: 0xb6ffe0,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  scene.add(beamRing);

  let composer: EffectComposer | null = null;
  let bloom: UnrealBloomPass | null = null;
  const useBloom = () => false;

  function setupComposer() {
    composer?.dispose();
    const c = new EffectComposer(renderer);
    c.addPass(new RenderPass(scene, camera));
    const b = new UnrealBloomPass(
      new THREE.Vector2(canvas.width, canvas.height),
      0.42,
      0.7,
      0.82,
    );
    c.addPass(b);
    c.addPass(new OutputPass());
    composer = c;
    bloom = b;
  }

  const seen = new Set<number>();

  const resize = () => {
    const dpr = Math.min(
      canvas.clientWidth < 500 ? 1.35 : 1.75,
      window.devicePixelRatio || 1,
    );
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    if (useBloom() && !composer) setupComposer();
    if (!useBloom()) composer = null;
  };
  resize();

  const tmpC = new THREE.Color();

  return {
    resize,
    render(w, now) {
      if (tiledFor !== w.terrain) rebuildTiles(w);
      const vw = canvas.clientWidth;
      const vh = canvas.clientHeight;
      const landscape = vw > vh;
      const zoom = landscape ? vh / 380 : vw / 400;
      w.state.camZoom = zoom;
      const viewH = vh / zoom;
      const viewW = vw / zoom;
      camera.left = -viewW / 2;
      camera.right = viewW / 2;
      camera.top = viewH / 2;
      camera.bottom = -viewH / 2;
      camera.updateProjectionMatrix();

      const sh = traumaOffset(w);
      const camX = w.state.camX + sh.x / zoom;
      const camY = w.state.camY + sh.y / zoom;
      camera.position.set(camX, 520, camY);
      camera.lookAt(camX, 0, camY);

      const s = w.saucer;
      saucerLight.position.set(s.x, 78, s.y);
      saucerLight.intensity = w.beamOn ? 5.2 : 3.1;
      rim.position.set(s.x, 40, s.y);
      rim.intensity = w.beamOn ? 2.4 : 1.1;

      const pulse = 0.55 + Math.sin(now * 0.014) * 0.12;
      beam.visible = w.beamOn;
      beamRing.visible = w.beamOn;
      if (w.beamOn) {
        beam.position.set(s.x, 1.4, s.y + 8);
        beam.scale.setScalar(0.92 + pulse * 0.18);
        beamMat.opacity = 0.16 + pulse * 0.14;
        beamRing.position.set(s.x, 1.8, s.y + 8);
        (beamRing.material as THREE.MeshBasicMaterial).opacity = 0.22 + pulse * 0.2;
      }

      for (let i = 0; i < blastLights.length; i++) {
        const ex = w.explosions[i];
        const L = blastLights[i]!;
        if (!ex) {
          L.intensity = 0;
          continue;
        }
        L.position.set(ex.x, 36, ex.y);
        L.intensity = (1 - ex.t / 0.45) * 8;
      }

      seen.clear();
      const hover = Math.sin(now * 0.006) * 4;
      const fi = Math.floor(now / 140) % 4;
      const craftSprite =
        w.state.craftId && w.state.craftId !== "disc"
          ? w.saucer.sprite
          : `saucer-${fi + 1}`;
      const saucerSpr = sprite(-1, craftSprite);
      saucerSpr.position.set(s.x, 18 + hover, s.y);
      saucerSpr.scale.set(s.w, s.h, 1);
      saucerSpr.material.rotation = w.state.craftId !== "disc" ? -s.facing : 0;
      const cloaked = (w.state.cloakT ?? 0) > 0;
      saucerSpr.material.opacity = cloaked
        ? 0.28 + pulse * 0.22
        : s.flash > 0 && Math.floor(now / 70) % 2 === 0
          ? 0.5
          : 1;
      saucerLight.color.setHex(cloaked ? 0xc9a0ff : 0xb8f0d0);
      rim.color.setHex(cloaked ? 0x9a70e0 : 0x6fdb9a);
      saucerSpr.renderOrder = s.y + 400;
      seen.add(-1);

      const viewPad = 120;
      const l = camX - viewW / 2 - viewPad;
      const r = camX + viewW / 2 + viewPad;
      const t = camY - viewH / 2 - viewPad;
      const b = camY + viewH / 2 + viewPad;

      for (const a of w.actors) {
        if (a.dead && a.kind !== "rubble") continue;
        if (a.x < l || a.x > r || a.y < t || a.y > b) continue;
        const name = a.kind === "rubble" ? a.sprite : a.propKey ? a.propKey : a.sprite;
        const spr = sprite(a.id, name);
        const lift = a.lift > 0 ? Math.min(36, a.lift * 48) : 0;
        const bob =
          a.kind === "loot"
            ? 6 + Math.sin(now * 0.008 + a.id) * 5
            : a.abductable
              ? Math.sin(now * 0.004 + a.id) * 1.2
              : 0;
        spr.position.set(a.x, 8 + lift + bob, a.y);
        const pulseLoot = a.kind === "loot" ? 1 + Math.sin(now * 0.01) * 0.12 : 1;
        spr.scale.set(a.w * pulseLoot, a.h * pulseLoot, 1);
        spr.material.rotation =
          a.kind === "jeep" ||
          a.kind === "tank" ||
          a.kind === "heli" ||
          a.kind === "plane" ||
          a.spin
            ? -a.facing
            : 0;
        spr.material.opacity = a.kind === "rubble" ? 0.9 : a.flash > 0 ? 0.75 : 1;
        spr.material.color.setHex(a.flash > 0 ? 0xffffff : 0xffffff);
        spr.renderOrder = a.y;
        seen.add(a.id);
      }

      let li = 0;
      for (const L of w.lasers) {
        const spr = sprite(L.id, `laser-${(li++ % 4) + 1}`, true);
        spr.position.set(L.x, 14, L.y);
        spr.scale.set(34, 16, 1);
        spr.material.rotation = -L.facing;
        spr.renderOrder = L.y + 200;
        seen.add(L.id);
      }
      for (const bu of w.bullets) {
        const spr = sprite(bu.id, "laser-1", true);
        spr.position.set(bu.x, 12, bu.y);
        spr.scale.set(10, 10, 1);
        spr.material.color.setHex(0xff6a40);
        spr.renderOrder = bu.y + 180;
        seen.add(bu.id);
      }
      for (const ex of w.explosions) {
        const frame = Math.min(3, Math.floor((ex.t / 0.45) * 4));
        const spr = sprite(900000 + (ex.x | 0) + (ex.y | 0), `explode-${frame + 1}`, true);
        const sc = 90 * ex.scale * (0.85 + ex.t);
        spr.position.set(ex.x, 20, ex.y);
        spr.scale.set(sc, sc, 1);
        spr.material.opacity = 1 - ex.t * 0.45;
        spr.renderOrder = ex.y + 300;
        seen.add(900000 + (ex.x | 0) + (ex.y | 0));
      }

      for (const [id, spr] of sprites) {
        if (!seen.has(id)) spr.visible = false;
      }

      let pn = 0;
      for (const p of w.particles) {
        if (!p.alive || pn >= MAX_P) continue;
        const i = pn * 3;
        pPos[i] = p.x;
        pPos[i + 1] = 10 + p.size;
        pPos[i + 2] = p.y;
        tmpC.copy(hexColor(p.color));
        const a = Math.max(0, p.life / p.max);
        pCol[i] = tmpC.r * a;
        pCol[i + 1] = tmpC.g * a;
        pCol[i + 2] = tmpC.b * a;
        pSize[pn] = p.size * 2.2;
        pn++;
      }
      for (let i = pn; i < MAX_P; i++) {
        pPos[i * 3 + 1] = -40;
        pSize[i] = 0;
      }
      (pGeo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
      (pGeo.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
      (pGeo.getAttribute("size") as THREE.BufferAttribute).needsUpdate = true;
      pGeo.setDrawRange(0, pn);

      if (composer && useBloom()) composer.render();
      else renderer.render(scene, camera);
    },
    dispose() {
      composer?.dispose();
      renderer.dispose();
      plane.dispose();
      beamGeo.dispose();
      beamRingGeo.dispose();
      pGeo.dispose();
      pMat.dispose();
      for (const m of tileMeshes) {
        (m.material as THREE.Material).dispose();
      }
      for (const m of matCache.values()) m.dispose();
      for (const t of texCache.values()) t.dispose();
    },
  };
}
