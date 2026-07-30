import {
  Color,
  ConeGeometry,
  CubicBezierCurve3,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Quaternion,
  Scene,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';
import { getEntity } from '../content';
import type { ElementEntity } from '../content/types';

/**
 * Ein Schritt in einer Mechanismus-3D-Visualisierung — Atome, Bindungen und
 * Curly-Arrows für den Elektronenfluss. Bewusst als eigenständige Struktur
 * neben dem Text-Modell (`MechanismStep`), damit nicht jeder Mechanismus
 * 3D-Daten haben muss.
 */
export type MechanismAtom3d = {
  element: string;
  position: [number, number, number];
};

export type MechanismBond3d = {
  from: number;
  to: number;
  order: 1 | 2 | 3;
  /** `dashed` = werdender/schwindender Bond im Übergangszustand. */
  style?: 'solid' | 'dashed';
};

/**
 * Curly Arrow: Bezier-Kurve von `from` nach `to` mit Kontroll-Offset senkrecht
 * zur Verbindungsachse. `fullArrow: true` = normaler Elektronenpaar-Pfeil
 * (Vollpfeil), `false` = Halbpfeil (fish-hook) für Radikale.
 */
export type MechanismArrow3d = {
  from: [number, number, number];
  to: [number, number, number];
  curvature?: number;
  fullArrow?: boolean;
  color?: number;
};

export type MechanismStep3d = {
  atoms: MechanismAtom3d[];
  bonds: MechanismBond3d[];
  arrows: MechanismArrow3d[];
};

export type Mechanism3dPreview = {
  canvas: HTMLCanvasElement;
  showStep: (step: MechanismStep3d | null) => void;
  dispose: () => void;
};

const CPK_FALLBACK: Record<string, string> = {
  H: '#ffffff',
  C: '#404040',
  N: '#3050f8',
  O: '#ff0d0d',
  F: '#90e050',
  Cl: '#1fd01f',
  Br: '#a52a2a',
  S: '#ffff30',
  P: '#ff8000',
};

function elementColor(sym: string): string {
  const e = getEntity(sym);
  if (e && e.kind === 'element') return (e as ElementEntity).cpkColor;
  return CPK_FALLBACK[sym] ?? '#aaaaaa';
}

export function createMechanism3d(size = 420): Mechanism3dPreview {
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

  const camera = new PerspectiveCamera(45, 1, 0.1, 100);
  const cameraTarget = new Vector3(0, 0, 0);
  const initialCameraOffset = new Vector3(3.2, 2.4, 3.6);
  camera.position.copy(initialCameraOffset);
  camera.lookAt(cameraTarget);

  scene.add(new HemisphereLight(new Color(0x88ffee), new Color(0x0a0f14), 0.7));
  const key = new DirectionalLight(0xffffff, 1.3);
  key.position.set(3, 5, 4);
  scene.add(key);

  const stepGroup = new Group();
  scene.add(stepGroup);

  let running = true;
  let visible = false;
  let last = performance.now();
  let userInteracting = false;
  let interactionIdleFrames = 0;

  // Pointer-Drag: rotiert die Gruppe manuell (bis autorotate wieder greift).
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
    stepGroup.rotation.y += dx * 0.008;
    const nextX = stepGroup.rotation.x + dy * 0.008;
    stepGroup.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, nextX));
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
      const nextDist = Math.max(1.2, Math.min(20, dist * factor));
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
    stepGroup.rotation.set(0, 0, 0);
    userInteracting = false;
  }

  function clearStep(): void {
    while (stepGroup.children.length > 0) stepGroup.remove(stepGroup.children[0]!);
  }

  function tick(now: number): void {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (visible) {
      // Auto-Rotation nur wenn Nutzer gerade nicht interagiert und ~2s
      // nach letzter Interaktion wieder anspringt.
      if (userInteracting) {
        interactionIdleFrames++;
        if (interactionIdleFrames > 120) userInteracting = false;
      }
      if (!userInteracting && !dragActive) {
        stepGroup.rotation.y += dt * 0.35;
      }
      renderer.render(scene, camera);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  return {
    canvas,
    showStep(step) {
      clearStep();
      resetCamera();
      if (!step) {
        visible = false;
        return;
      }
      addStructure(stepGroup, step);
      for (const a of step.arrows) addCurlyArrow(stepGroup, a);
      visible = true;
      renderer.render(scene, camera);
    },
    dispose() {
      running = false;
      clearStep();
      renderer.dispose();
    },
  };
}

const ATOM_RADIUS = 0.22;
const BOND_RADIUS = 0.06;

function addStructure(host: Group, step: MechanismStep3d): void {
  for (const a of step.atoms) {
    const color = new Color(elementColor(a.element));
    const mesh = new Mesh(
      new SphereGeometry(ATOM_RADIUS, 24, 18),
      new MeshStandardMaterial({
        color,
        emissive: color.clone().multiplyScalar(0.25),
        roughness: 0.35,
        metalness: 0.15,
      }),
    );
    mesh.position.fromArray(a.position);
    host.add(mesh);
  }

  const solidMat = new MeshStandardMaterial({
    color: new Color(0xaab5bd),
    roughness: 0.55,
    metalness: 0.2,
  });
  const dashedMat = new MeshStandardMaterial({
    color: new Color(0x8899aa),
    roughness: 0.6,
    metalness: 0.1,
    transparent: true,
    opacity: 0.5,
  });

  for (const b of step.bonds) {
    const from = new Vector3().fromArray(step.atoms[b.from]!.position);
    const to = new Vector3().fromArray(step.atoms[b.to]!.position);
    const dir = to.clone().sub(from);
    const length = dir.length();
    if (length < 0.001) continue;
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const rotation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().normalize());
    const arbitrary = Math.abs(dir.y) > 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
    const perp = new Vector3().crossVectors(dir, arbitrary).normalize().multiplyScalar(0.09);
    const mat = b.style === 'dashed' ? dashedMat : solidMat;
    for (let i = 0; i < b.order; i++) {
      const shift =
        b.order === 1 ? new Vector3(0, 0, 0) : perp.clone().multiplyScalar(i - (b.order - 1) / 2);
      if (b.style === 'dashed') {
        // Als kurze Zylinder-Segmente andeuten (5 Stücke mit Lücken).
        const segs = 5;
        for (let s = 0; s < segs; s++) {
          const t0 = s / segs + 0.05;
          const t1 = (s + 1) / segs - 0.05;
          const segMid = new Vector3().lerpVectors(from, to, (t0 + t1) / 2).add(shift);
          const segLen = ((t1 - t0) * length) / 1;
          const geo = new CylinderGeometry(BOND_RADIUS * 0.6, BOND_RADIUS * 0.6, segLen, 10);
          const cyl = new Mesh(geo, mat);
          cyl.position.copy(segMid);
          cyl.quaternion.copy(rotation);
          host.add(cyl);
        }
      } else {
        const geo = new CylinderGeometry(BOND_RADIUS, BOND_RADIUS, length, 12);
        const cyl = new Mesh(geo, mat);
        cyl.position.copy(mid).add(shift);
        cyl.quaternion.copy(rotation);
        host.add(cyl);
      }
    }
  }
}

const ARROW_COLOR = 0xffdd66;

function addCurlyArrow(host: Group, arrow: MechanismArrow3d): void {
  const from = new Vector3().fromArray(arrow.from);
  const to = new Vector3().fromArray(arrow.to);
  const dir = to.clone().sub(from);
  const dist = dir.length();
  if (dist < 0.001) return;
  const mid = from.clone().add(to).multiplyScalar(0.5);
  // Kontroll-Offset senkrecht zur Verbindung — bevorzugt +y, sonst +z.
  const arbitrary = Math.abs(dir.y) > 0.85 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0);
  const perp = new Vector3().crossVectors(dir, arbitrary).normalize();
  const cross2 = new Vector3().crossVectors(perp, dir).normalize();
  const offset = cross2.multiplyScalar((arrow.curvature ?? 0.7) * dist);
  const c1 = from.clone().lerp(mid, 0.35).add(offset);
  const c2 = to.clone().lerp(mid, 0.35).add(offset);
  const curve = new CubicBezierCurve3(from, c1, c2, to);
  const color = arrow.color ?? ARROW_COLOR;
  const tubeMat = new MeshBasicMaterial({ color });
  const tube = new TubeGeometry(curve, 40, 0.035, 8, false);
  host.add(new Mesh(tube, tubeMat));

  // Pfeilspitze am Ende — Vollpfeil (Elektronenpaar) oder Halbpfeil (Radikal, fish-hook).
  // Halbpfeil = Kegel + Ausschneiden einer Halbebene, hier vereinfacht als
  // asymmetrischer, halbierter Kegel via Skalierung + Rotation.
  const tangent = curve.getTangent(1).normalize();
  const fullArrow = arrow.fullArrow !== false;
  const cone = new Mesh(
    new ConeGeometry(fullArrow ? 0.09 : 0.07, 0.22, 12, 1, false, fullArrow ? 0 : 0, fullArrow ? Math.PI * 2 : Math.PI),
    new MeshBasicMaterial({ color }),
  );
  cone.position.copy(to);
  const quat = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), tangent);
  cone.setRotationFromQuaternion(quat);
  host.add(cone);
}
