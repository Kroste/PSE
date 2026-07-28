import {
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  RingGeometry,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  WebGLRenderer,
} from 'three';
import { subscribe, onCraft } from '../game/state/store';
import { getEntity, requireEntity } from '../game/content';
import type { ElementEntity, Multiset } from '../game/content/types';
import { buildAtom, type AtomRig } from '../game/atoms/atom';

export type SceneBundle = {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  update: (dt: number) => void;
  /** Zeigt das Atom eines Elements dauerhaft an. `null` blendet aus. */
  showAtom: (elementId: string | null) => void;
};

const RING_OUTER = 1.62;
const RING_INNER_MARKER = 0.98;
const RING_CENTER_MARKER = 0.42;
const PARTICLE_RADIUS = 0.28;
const RESULT_FLASH_SECONDS = 1.4;

export function createRenderer(canvas: HTMLCanvasElement): SceneBundle {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  const scene = new Scene();
  scene.background = new Color(0x060a0e);

  const camera = new PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(3.2, 3.2, 4.2);
  camera.lookAt(0, 0.2, 0);

  scene.add(new HemisphereLight(0x66ffee, 0x060a0e, 0.55));
  const key = new DirectionalLight(0x88ffcc, 1.4);
  key.position.set(4, 6, 5);
  scene.add(key);

  const platformGroup = new Group();
  scene.add(platformGroup);
  platformGroup.add(makeRing(RING_OUTER - 0.05, RING_OUTER, 0x00ffb0, 0.65));
  platformGroup.add(makeRing(RING_INNER_MARKER - 0.02, RING_INNER_MARKER, 0x00ffb0, 0.35));
  platformGroup.add(makeRing(RING_CENTER_MARKER - 0.015, RING_CENTER_MARKER, 0x00ffb0, 0.5));

  const zoneGroup = new Group();
  scene.add(zoneGroup);

  const resultGroup = new Group();
  scene.add(resultGroup);
  let resultTimer = 0;

  const atomGroup = new Group();
  scene.add(atomGroup);
  let currentAtom: AtomRig | null = null;
  let atomFlashTimer = 0;
  const ATOM_FLASH_SECONDS = 1.8;

  function replaceAtom(elementId: string | null, isFlash: boolean): void {
    while (atomGroup.children.length > 0) atomGroup.remove(atomGroup.children[0]!);
    currentAtom = null;
    if (!elementId) return;
    const entity = getEntity(elementId);
    if (!entity || entity.kind !== 'element') return;
    const rig = buildAtom(entity as ElementEntity);
    rig.root.position.set(0, 0.9, 0);
    atomGroup.add(rig.root);
    currentAtom = rig;
    if (isFlash) atomFlashTimer = ATOM_FLASH_SECONDS;
  }

  const idleHint = makeTextSprite('Ziehe Zutaten in die Reaktionszone');
  idleHint.position.set(0, 0.9, 0);
  idleHint.scale.set(3.2, 0.4, 1);
  scene.add(idleHint);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  });

  subscribe((state) => {
    rebuildZone(zoneGroup, state.reactionZone);
    const isEmpty = Object.keys(state.reactionZone).length === 0;
    // Atom hat Vorrang, verschwindet aber, sobald die Reaktionszone gefüllt ist.
    atomGroup.visible = isEmpty && currentAtom !== null;
    idleHint.visible = isEmpty && resultTimer <= 0 && currentAtom === null;
  });

  onCraft((event) => {
    if (!event.ok) return;
    idleHint.visible = false;

    // Wenn ein Element gecraftet wurde: statt Flash-Kugeln direkt Atom rendern.
    const elementOutput = Object.keys(event.recipe.outputs).find((id) => {
      const e = getEntity(id);
      return e && e.kind === 'element';
    });
    if (elementOutput) {
      replaceAtom(elementOutput, true);
      atomGroup.visible = true; // Zone ist nach craft() geleert.
      return;
    }

    resultTimer = RESULT_FLASH_SECONDS;
    rebuildResult(resultGroup, event.recipe.outputs);
  });

  return {
    renderer,
    scene,
    camera,
    update(dt) {
      zoneGroup.rotation.y += dt * 0.35;
      platformGroup.rotation.y += dt * 0.08;

      if (currentAtom) {
        currentAtom.update(dt);
        if (atomFlashTimer > 0) {
          atomFlashTimer = Math.max(0, atomFlashTimer - dt);
          const t = 1 - atomFlashTimer / ATOM_FLASH_SECONDS;
          currentAtom.root.scale.setScalar(0.3 + t * 0.7);
        } else {
          currentAtom.root.scale.setScalar(1);
        }
      }

      if (resultTimer > 0) {
        resultTimer = Math.max(0, resultTimer - dt);
        const t = resultTimer / RESULT_FLASH_SECONDS;
        resultGroup.scale.setScalar(0.7 + t * 0.3);
        resultGroup.visible = true;
        setGroupOpacity(resultGroup, t);
        if (resultTimer === 0) {
          resultGroup.visible = false;
          const anyChildInZone = zoneGroup.children.length > 0;
          if (!anyChildInZone && currentAtom === null) idleHint.visible = true;
        }
      } else {
        resultGroup.visible = false;
      }

      if (idleHint.visible) {
        const pulse = 0.75 + Math.sin(performance.now() * 0.001) * 0.15;
        (idleHint.material as SpriteMaterial).opacity = pulse;
      }
    },
    showAtom(elementId) {
      replaceAtom(elementId, false);
      const zoneEmpty = zoneGroup.children.length === 0;
      atomGroup.visible = elementId !== null && zoneEmpty;
      if (elementId !== null) idleHint.visible = false;
      else if (zoneEmpty && resultTimer <= 0) idleHint.visible = true;
    },
  };
}

function makeRing(innerRadius: number, outerRadius: number, color: number, opacity: number): Mesh {
  const geo = new RingGeometry(innerRadius, outerRadius, 128);
  const mat = new MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: DoubleSide,
  });
  const mesh = new Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function rebuildZone(group: Group, zone: Multiset): void {
  disposeChildren(group);
  const items: { id: string; index: number }[] = [];
  for (const [id, count] of Object.entries(zone)) {
    for (let i = 0; i < count; i++) items.push({ id, index: items.length });
  }
  const total = items.length;
  if (total === 0) return;

  const radius = Math.min(1.1, 0.35 + total * 0.09);
  for (const { id, index } of items) {
    const angle = (index / total) * Math.PI * 2;
    const mesh = createParticleMesh(id);
    mesh.position.set(Math.cos(angle) * radius, PARTICLE_RADIUS + 0.05, Math.sin(angle) * radius);
    group.add(mesh);
  }
}

function rebuildResult(group: Group, outputs: Multiset): void {
  disposeChildren(group);
  const items = Object.entries(outputs).flatMap(([id, n]) =>
    Array.from({ length: n }, () => id),
  );
  const spread = items.length > 1 ? 0.35 : 0;
  items.forEach((id, i) => {
    const angle = (i / items.length) * Math.PI * 2;
    const mesh = createParticleMesh(id, 1.4);
    mesh.position.set(Math.cos(angle) * spread, 0.9, Math.sin(angle) * spread);
    group.add(mesh);
  });
}

function createParticleMesh(id: string, sizeScale = 1): Mesh {
  const entity = requireEntity(id);
  const material = new MeshStandardMaterial({
    color: new Color(entity.color),
    emissive: new Color(entity.color),
    emissiveIntensity: 0.35,
    roughness: 0.35,
    metalness: 0.15,
    transparent: true,
    opacity: 1,
  });
  return new Mesh(new SphereGeometry(PARTICLE_RADIUS * sizeScale, 24, 20), material);
}

function makeTextSprite(text: string): Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas-2D-Kontext fehlt.');
  ctx.font = "500 56px 'JetBrains Mono', 'Fira Code', ui-monospace, monospace";
  ctx.fillStyle = 'rgba(139, 160, 168, 0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 8;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  const mat = new SpriteMaterial({ map: tex, transparent: true, depthTest: false, opacity: 0.85 });
  return new Sprite(mat);
}

function setGroupOpacity(group: Group, opacity: number): void {
  group.traverse((obj) => {
    if (obj instanceof Mesh) {
      const mat = obj.material as MeshStandardMaterial;
      mat.opacity = opacity;
      mat.transparent = true;
    }
  });
}

function disposeChildren(group: Group): void {
  for (const child of [...group.children]) {
    group.remove(child);
    if (child instanceof Mesh) {
      child.geometry.dispose();
      (child.material as MeshStandardMaterial).dispose();
    }
  }
}
