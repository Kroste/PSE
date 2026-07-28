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
  Vector3,
  WebGLRenderer,
} from 'three';
import { subscribe, onCraft } from '../game/state/store';
import { getEntity, requireEntity } from '../game/content';
import type { ElementEntity, Multiset } from '../game/content/types';
import {
  buildBohrAtom,
  computeAtomTargets,
  type AtomRig,
} from '../game/atoms/bohr-atom';

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
const ATOM_CENTER = new Vector3(0, 0.9, 0);

type FusionMover = {
  mesh: Mesh;
  from: Vector3;
  to: Vector3;
  startT: number;
  duration: number;
  scaleFrom: number;
  scaleTo: number;
};

type FusionState = {
  group: Group;
  movers: FusionMover[];
  elapsed: number;
  totalDuration: number;
  targetElementId: string;
  flashMesh: Mesh;
  flashMat: MeshBasicMaterial;
};

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
  const ATOM_FLASH_SECONDS = 0.6;

  let fusion: FusionState | null = null;

  function replaceAtom(elementId: string | null, isFlash: boolean): void {
    while (atomGroup.children.length > 0) atomGroup.remove(atomGroup.children[0]!);
    currentAtom = null;
    if (!elementId) return;
    const entity = getEntity(elementId);
    if (!entity || entity.kind !== 'element') return;
    const rig = buildBohrAtom(entity as ElementEntity);
    rig.root.position.copy(ATOM_CENTER);
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

  let lastZoneSnapshot: Multiset = {};

  subscribe((state) => {
    if (fusion) {
      // Während der Fusion wird die Zone-Group nicht neu aufgebaut — die Meshes
      // leben in der fusion-Group und wandern zum Atom.
      lastZoneSnapshot = state.reactionZone;
      return;
    }
    rebuildZone(zoneGroup, state.reactionZone);
    lastZoneSnapshot = state.reactionZone;
    const isEmpty = Object.keys(state.reactionZone).length === 0;
    atomGroup.visible = isEmpty && currentAtom !== null;
    idleHint.visible = isEmpty && resultTimer <= 0 && currentAtom === null;
  });

  onCraft((event) => {
    if (!event.ok) return;
    idleHint.visible = false;

    const elementOutput = Object.keys(event.recipe.outputs).find((id) => {
      const e = getEntity(id);
      return e && e.kind === 'element';
    });

    // Nur Element-Craft mit Nukleonen/Elektronen als Input bekommt Fusion.
    if (elementOutput && canFuseFromInputs(event.recipe.inputs)) {
      // Snapshot vor Iteration — fusionGroup.add() entfernt die Meshes
      // sonst live aus zoneGroup.children und würde die Schleife brechen.
      const zoneSnapshot = [...zoneGroup.children] as Mesh[];
      const started = startFusion(elementOutput, zoneSnapshot);
      if (started) {
        atomGroup.visible = false;
        return;
      }
    }

    if (elementOutput) {
      replaceAtom(elementOutput, true);
      atomGroup.visible = true;
      return;
    }

    resultTimer = RESULT_FLASH_SECONDS;
    rebuildResult(resultGroup, event.recipe.outputs);
  });

  function startFusion(elementId: string, zoneMeshes: Mesh[]): boolean {
    const entity = getEntity(elementId);
    if (!entity || entity.kind !== 'element') return false;
    const targets = computeAtomTargets(entity as ElementEntity);
    const scale = targets.scale;

    const fusionGroup = new Group();
    scene.add(fusionGroup);

    // Impact-Flash am Atom-Zentrum: eine Emissive-Sphere, die synchron
    // zur Fusion aufleuchtet und pulsiert — visuelles Hauptsignal, dass
    // etwas passiert.
    const flashMat = new MeshBasicMaterial({
      color: new Color(entity.cpkColor),
      transparent: true,
      opacity: 0.0,
    });
    const flashMesh = new Mesh(new SphereGeometry(0.35, 24, 20), flashMat);
    flashMesh.position.copy(ATOM_CENTER);
    fusionGroup.add(flashMesh);

    // Zutaten in Nukleonen und Elektronen splitten (nach userData.entityId).
    const nucleonMeshes: Mesh[] = [];
    const electronMeshes: Mesh[] = [];
    const otherMeshes: Mesh[] = [];
    for (const mesh of zoneMeshes) {
      const id = mesh.userData.entityId as string | undefined;
      if (id === 'proton' || id === 'neutron') nucleonMeshes.push(mesh);
      else if (id === 'e-') electronMeshes.push(mesh);
      else otherMeshes.push(mesh);
    }

    const movers: FusionMover[] = [];

    // WICHTIG: attach() statt add() erhält die WELT-Position beim Transfer.
    // add() würde die Meshes von ihrer (rotierten) zoneGroup-Weltposition auf
    // die (unrotierte) fusionGroup-Position teleportieren — die Animation
    // wäre dann nicht sichtbar, weil der Teleport den größten Teil der
    // Distanz auffrisst.

    // Nukleonen: Phase 1 (0 → 1.4 s) — implodieren zum Kern.
    const nucleonScaleFactor = scale * 0.6;
    nucleonMeshes.forEach((mesh, i) => {
      const target = targets.nucleonPositions[i % targets.nucleonPositions.length]!
        .clone()
        .multiplyScalar(scale)
        .add(ATOM_CENTER);
      fusionGroup.attach(mesh);
      movers.push({
        mesh,
        from: mesh.position.clone(),
        to: target,
        startT: 0,
        duration: 1.4,
        scaleFrom: 1,
        scaleTo: nucleonScaleFactor,
      });
    });

    // Elektronen: Phase 2 (1.0 → 2.4 s) — nach Kollaps eingefangen.
    const electronScaleFactor = scale * 0.55;
    electronMeshes.forEach((mesh, i) => {
      const target = targets.electronPositions[i % Math.max(1, targets.electronPositions.length)]!
        .clone()
        .multiplyScalar(scale)
        .add(ATOM_CENTER);
      fusionGroup.attach(mesh);
      movers.push({
        mesh,
        from: mesh.position.clone(),
        to: target,
        startT: 1.0,
        duration: 1.4,
        scaleFrom: 1,
        scaleTo: electronScaleFactor,
      });
    });

    // Andere Zutaten (γ, Kerne im Expert-Modus, …): zum Zentrum schrumpfen.
    otherMeshes.forEach((mesh) => {
      fusionGroup.attach(mesh);
      movers.push({
        mesh,
        from: mesh.position.clone(),
        to: ATOM_CENTER.clone(),
        startT: 0,
        duration: 1.4,
        scaleFrom: 1,
        scaleTo: 0.01,
      });
    });

    fusion = {
      group: fusionGroup,
      movers,
      elapsed: 0,
      totalDuration: 2.8,
      targetElementId: elementId,
      flashMesh,
      flashMat,
    };
    return true;
  }

  return {
    renderer,
    scene,
    camera,
    update(dt) {
      platformGroup.rotation.y += dt * 0.08;

      // Zone rotiert nur, wenn keine Fusion läuft — sonst sollen die Zutaten
      // ihre "letzte Position" beim Übernehmen ins Atom behalten.
      if (!fusion) {
        zoneGroup.rotation.y += dt * 0.35;
      }

      if (fusion) {
        fusion.elapsed += dt;
        const totalT = fusion.elapsed;
        for (const m of fusion.movers) {
          if (totalT < m.startT) continue;
          const local = Math.min(1, (totalT - m.startT) / m.duration);
          const eased = easeInOut(local);
          m.mesh.position.lerpVectors(m.from, m.to, eased);
          const s = m.scaleFrom + (m.scaleTo - m.scaleFrom) * eased;
          m.mesh.scale.setScalar(s);
        }
        // Flash-Pulse: baut langsam auf, peakt bei ~1.4 s (Ende Nukleon-Phase),
        // verblasst wieder und wächst in Größe für Impact-Feel.
        const tNorm = fusion.elapsed / fusion.totalDuration;
        const pulse = Math.sin(Math.min(1, tNorm * 1.2) * Math.PI); // 0 → 1 → 0
        fusion.flashMat.opacity = pulse * 0.55;
        fusion.flashMesh.scale.setScalar(0.5 + tNorm * 1.4);

        if (fusion.elapsed >= fusion.totalDuration) {
          const target = fusion.targetElementId;
          disposeGroup(fusion.group);
          scene.remove(fusion.group);
          fusion = null;
          replaceAtom(target, true);
          atomGroup.visible = true;
          rebuildZone(zoneGroup, lastZoneSnapshot);
        }
      }

      if (currentAtom) {
        currentAtom.update(dt);
        if (atomFlashTimer > 0) {
          atomFlashTimer = Math.max(0, atomFlashTimer - dt);
          const t = 1 - atomFlashTimer / ATOM_FLASH_SECONDS;
          currentAtom.root.scale.setScalar(0.6 + t * 0.4);
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
      if (fusion) return; // laufende Fusion nicht unterbrechen
      replaceAtom(elementId, false);
      const zoneEmpty = zoneGroup.children.length === 0;
      atomGroup.visible = elementId !== null && zoneEmpty;
      if (elementId !== null) idleHint.visible = false;
      else if (zoneEmpty && resultTimer <= 0) idleHint.visible = true;
    },
  };
}

function canFuseFromInputs(inputs: Multiset): boolean {
  // Nur wenn die Inputs sich sinnvoll den Bohr-Rollen zuordnen lassen:
  // Nukleonen, Elektronen, Nuklide oder Photonen.
  const ok = new Set(['proton', 'neutron', 'e-', 'gamma']);
  for (const id of Object.keys(inputs)) {
    if (ok.has(id)) continue;
    const e = getEntity(id);
    if (e && e.kind === 'nucleus') continue;
    return false;
  }
  return true;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
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
  const mesh = new Mesh(new SphereGeometry(PARTICLE_RADIUS * sizeScale, 24, 20), material);
  mesh.userData.entityId = id;
  return mesh;
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

function disposeGroup(group: Group): void {
  disposeChildren(group);
}
