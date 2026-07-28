import {
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  WebGLRenderer,
} from 'three';
import { subscribe, onCraft } from '../game/state/store';
import { requireEntity } from '../game/content';
import type { Multiset } from '../game/content/types';

export type SceneBundle = {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  update: (dt: number) => void;
};

const PLATFORM_RADIUS = 1.6;
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

  const platform = new Mesh(
    new CylinderGeometry(PLATFORM_RADIUS, PLATFORM_RADIUS, 0.06, 64),
    new MeshStandardMaterial({
      color: 0x0a1418,
      roughness: 0.35,
      metalness: 0.7,
      emissive: 0x00ffb0,
      emissiveIntensity: 0.05,
    }),
  );
  platform.position.y = -0.03;
  scene.add(platform);

  const zoneGroup = new Group();
  scene.add(zoneGroup);

  const resultGroup = new Group();
  scene.add(resultGroup);
  let resultTimer = 0;

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  });

  subscribe((state) => rebuildZone(zoneGroup, state.reactionZone));

  onCraft((event) => {
    if (!event.ok) return;
    resultTimer = RESULT_FLASH_SECONDS;
    rebuildResult(resultGroup, event.recipe.outputs);
  });

  return {
    renderer,
    scene,
    camera,
    update(dt) {
      zoneGroup.rotation.y += dt * 0.35;

      if (resultTimer > 0) {
        resultTimer = Math.max(0, resultTimer - dt);
        const t = resultTimer / RESULT_FLASH_SECONDS;
        resultGroup.scale.setScalar(0.7 + t * 0.3);
        resultGroup.visible = true;
        setGroupOpacity(resultGroup, t);
        if (resultTimer === 0) resultGroup.visible = false;
      } else {
        resultGroup.visible = false;
      }
    },
  };
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
