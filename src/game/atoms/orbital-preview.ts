import {
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  Vector3,
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
 * gedacht als Widget im Detail-Panel und im Vergleichs-Modus.
 * Nutzt einen eigenen WebGLRenderer, damit es unabhängig von der
 * Haupt-Bühne lebt. Interaktion:
 * - Pointer-Drag rotiert das Modell (x + y-Achsen)
 * - Mausrad zoomt die Kamera
 * - Auto-Rotation setzt ~2 s nach Interaktion wieder ein
 */
export function createOrbitalPreview(size = 240): OrbitalPreview {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  canvas.style.width = '100%';
  canvas.style.aspectRatio = '1 / 1';
  canvas.style.display = 'block';
  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'none';

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(size, size, false);
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  scene.background = null;

  const camera = new PerspectiveCamera(45, 1, 0.1, 60);
  const cameraTarget = new Vector3(0, 0, 0);
  const initialCameraOffset = new Vector3(2.0, 1.6, 2.6);
  camera.position.copy(initialCameraOffset);
  camera.lookAt(cameraTarget);

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
  let userInteracting = false;
  let interactionIdleFrames = 0;

  // Pointer-Drag: rotiert das Atom/Molekül manuell.
  let dragActive = false;
  let dragLastX = 0;
  let dragLastY = 0;
  let dragPointerId: number | null = null;
  canvas.addEventListener('pointerdown', (e) => {
    dragActive = true;
    dragLastX = e.clientX;
    dragLastY = e.clientY;
    dragPointerId = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
    userInteracting = true;
    interactionIdleFrames = 0;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragActive) return;
    const dx = e.clientX - dragLastX;
    const dy = e.clientY - dragLastY;
    dragLastX = e.clientX;
    dragLastY = e.clientY;
    atomHost.rotation.y += dx * 0.008;
    const nextX = atomHost.rotation.x + dy * 0.008;
    atomHost.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, nextX));
    interactionIdleFrames = 0;
  });
  function endDrag(): void {
    if (!dragActive) return;
    dragActive = false;
    if (dragPointerId !== null) {
      try {
        canvas.releasePointerCapture(dragPointerId);
      } catch {
        // ignore
      }
      dragPointerId = null;
    }
    canvas.style.cursor = 'grab';
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', endDrag);

  // Mausrad: zoomt die Kamera zum Target.
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const dir = camera.position.clone().sub(cameraTarget);
      const dist = dir.length();
      const factor = e.deltaY > 0 ? 1.12 : 1 / 1.12;
      const nextDist = Math.max(0.8, Math.min(15, dist * factor));
      dir.normalize().multiplyScalar(nextDist);
      camera.position.copy(cameraTarget).add(dir);
      userInteracting = true;
      interactionIdleFrames = 0;
    },
    { passive: false },
  );

  function resetCamera(): void {
    camera.position.copy(initialCameraOffset);
    camera.lookAt(cameraTarget);
    atomHost.rotation.set(0, 0, 0);
    userInteracting = false;
  }

  function clearAtom(): void {
    while (atomHost.children.length > 0) atomHost.remove(atomHost.children[0]!);
    currentRig = null;
  }

  // Resize-Observer: sobald der Canvas anders skaliert wird (Modal-
  // Layout, Window-Resize), die interne Renderer-Auflösung anpassen —
  // sonst wird das WebGL-Bild verschwommen.
  let currentCanvasW = size;
  let currentCanvasH = size;
  function maybeResize(): void {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w > 0 && h > 0 && (w !== currentCanvasW || h !== currentCanvasH)) {
      currentCanvasW = w;
      currentCanvasH = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  function tick(now: number): void {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (visible && currentRig) {
      maybeResize();
      currentRig.update(dt);
      if (userInteracting) {
        interactionIdleFrames++;
        if (interactionIdleFrames > 120) userInteracting = false;
      }
      if (!userInteracting && !dragActive) {
        atomHost.rotation.y += dt * 0.25;
      }
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
      resetCamera();
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
