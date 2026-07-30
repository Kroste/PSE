import {
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import type { ElementEntity, MoleculeEntity } from '../content/types';
import { buildOrbitalAtom, type AtomRig } from './atom';
import { buildMolecule } from './molecule';

export type OrbitalPreview = {
  canvas: HTMLCanvasElement;
  show: (entity: ElementEntity | MoleculeEntity | null) => void;
  dispose: () => void;
};

/**
 * Kleines eigenständiges 3D-Preview für das Quanten-Orbitalmodell —
 * gedacht als Widget im Detail-Panel. Nutzt einen eigenen WebGLRenderer,
 * damit es unabhängig von der Haupt-Bühne lebt.
 */
export function createOrbitalPreview(size = 240): OrbitalPreview {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  canvas.style.width = '100%';
  canvas.style.aspectRatio = '1 / 1';
  canvas.style.display = 'block';

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(size, size, false);
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  scene.background = null;

  const camera = new PerspectiveCamera(45, 1, 0.1, 20);
  camera.position.set(2.0, 1.6, 2.6);
  camera.lookAt(0, 0, 0);

  scene.add(new HemisphereLight(new Color(0x88ffee), new Color(0x0a0f14), 0.7));
  const key = new DirectionalLight(0xffffff, 1.2);
  key.position.set(3, 4, 3);
  scene.add(key);

  const atomHost = new Group();
  scene.add(atomHost);

  let currentRig: AtomRig | null = null;
  let currentId: string | null = null;
  let last = performance.now();
  let running = true;
  let visible = false;

  function clearAtom(): void {
    while (atomHost.children.length > 0) atomHost.remove(atomHost.children[0]!);
    currentRig = null;
  }

  function tick(now: number): void {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (visible && currentRig) {
      currentRig.update(dt);
      atomHost.rotation.y += dt * 0.25;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  return {
    canvas,
    show(entity) {
      if (entity && entity.id === currentId) {
        visible = true;
        return;
      }
      currentId = entity ? entity.id : null;
      clearAtom();
      atomHost.rotation.set(0, 0, 0);
      if (!entity) {
        visible = false;
        return;
      }
      const rig =
        entity.kind === 'molecule' ? buildMolecule(entity) : buildOrbitalAtom(entity);
      atomHost.add(rig.root);
      currentRig = rig;
      visible = true;
      renderer.render(scene, camera);
    },
    dispose() {
      running = false;
      clearAtom();
      renderer.dispose();
    },
  };
}
