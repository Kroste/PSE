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
import { clearZone, craft, onCraft, subscribe } from '../game/state/store';
import { getEntity, requireEntity } from '../game/content';
import { matchRecipe } from '../game/physics/recipes';
import type { ElementEntity, Multiset, MoleculeEntity } from '../game/content/types';
import {
  buildBohrAtom,
  computeAtomTargets,
  packedPositions,
  type AtomRig,
} from '../game/atoms/bohr-atom';
import { buildMolecule } from '../game/atoms/molecule';

export type SceneBundle = {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  update: (dt: number) => void;
  showAtom: (elementId: string | null) => void;
};

const RING_OUTER = 1.62;
const RING_INNER_MARKER = 0.98;
const RING_CENTER_MARKER = 0.42;
const PARTICLE_RADIUS = 0.16;
const RESULT_FLASH_SECONDS = 1.4;
const ATOM_CENTER = new Vector3(0, 0.9, 0);
const CHAMBER_SPAWN_R = 2.4;

type ChamberRole = 'nucleon' | 'electron' | 'nucleus' | 'other';

type ChamberParticle = {
  id: string;
  mesh: Mesh;
  role: ChamberRole;
  velocity: Vector3;
  phase: number;
  seed: number;
};

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

type DecayState = {
  particles: ChamberParticle[];
  velocities: Vector3[];
  elapsed: number;
  duration: number;
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
  const outerRing = makeRing(RING_OUTER - 0.05, RING_OUTER, 0x00ffb0, 0.65);
  const outerRingMat = outerRing.material as MeshBasicMaterial;
  const outerRingColorStable = new Color(0x00ffb0);
  const outerRingColorUnstable = new Color(0xff4466);
  const outerRingColorReady = new Color(0xffdd66);
  platformGroup.add(outerRing);
  platformGroup.add(makeRing(RING_INNER_MARKER - 0.02, RING_INNER_MARKER, 0x00ffb0, 0.35));
  platformGroup.add(makeRing(RING_CENTER_MARKER - 0.015, RING_CENTER_MARKER, 0x00ffb0, 0.5));

  // Reaktionskammer: persistente Partikel mit Live-Physik
  const chamberGroup = new Group();
  scene.add(chamberGroup);
  const chamberParticles: ChamberParticle[] = [];
  let chamberTime = 0;
  let seedCounter = 0;

  const resultGroup = new Group();
  scene.add(resultGroup);
  let resultTimer = 0;

  const atomGroup = new Group();
  scene.add(atomGroup);
  let currentAtom: AtomRig | null = null;
  let atomFlashTimer = 0;
  const ATOM_FLASH_SECONDS = 0.6;

  let fusion: FusionState | null = null;
  let decay: DecayState | null = null;
  let autoCraftDeadline: number | null = null;
  const AUTO_CRAFT_DELAY = 2.2;

  // Pointer-Drag: rotiert das aktuelle Atom (atomGroup).
  let dragActive = false;
  let dragLastX = 0;
  let dragLastY = 0;
  let dragPointerId: number | null = null;

  function resetAtomRotation(): void {
    atomGroup.rotation.set(0, 0, 0);
  }

  function replaceAtom(entityId: string | null, isFlash: boolean): void {
    while (atomGroup.children.length > 0) atomGroup.remove(atomGroup.children[0]!);
    currentAtom = null;
    resetAtomRotation();
    if (!entityId) {
      canvas.style.cursor = '';
      return;
    }
    const entity = getEntity(entityId);
    if (!entity) return;
    let rig: AtomRig;
    if (entity.kind === 'element') {
      rig = buildBohrAtom(entity as ElementEntity);
    } else if (entity.kind === 'molecule') {
      rig = buildMolecule(entity as MoleculeEntity);
    } else {
      return;
    }
    rig.root.position.copy(ATOM_CENTER);
    atomGroup.add(rig.root);
    currentAtom = rig;
    if (isFlash) atomFlashTimer = ATOM_FLASH_SECONDS;
    canvas.style.cursor = 'grab';
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

  // Pointer-Drag auf dem Canvas rotiert das aktuelle Atom.
  canvas.addEventListener('pointerdown', (e) => {
    if (!currentAtom) return;
    dragActive = true;
    dragLastX = e.clientX;
    dragLastY = e.clientY;
    dragPointerId = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragActive) return;
    const dx = e.clientX - dragLastX;
    const dy = e.clientY - dragLastY;
    dragLastX = e.clientX;
    dragLastY = e.clientY;
    // 1 rad pro ~200 px
    atomGroup.rotation.y += dx * 0.007;
    const nextX = atomGroup.rotation.x + dy * 0.007;
    // Klippen, damit man nicht auf den Kopf steht
    atomGroup.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, nextX));
  });
  function endDrag(e: PointerEvent): void {
    if (!dragActive) return;
    dragActive = false;
    if (dragPointerId !== null) {
      try {
        canvas.releasePointerCapture(dragPointerId);
      } catch {
        // ignorieren
      }
      dragPointerId = null;
    }
    canvas.style.cursor = currentAtom ? 'grab' : '';
    void e;
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', endDrag);

  // Mausrad-Zoom: verschiebt die Kamera radial zum Look-Target.
  const ZOOM_TARGET = new Vector3(0, 0.2, 0);
  const ZOOM_MIN = 1.6;
  const ZOOM_MAX = 14;
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const dir = camera.position.clone().sub(ZOOM_TARGET);
      const dist = dir.length();
      // deltaY positiv = scroll runter = raus zoomen (Faktor > 1)
      const factor = 1 + e.deltaY * 0.0012;
      const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, dist * factor));
      dir.normalize().multiplyScalar(clamped);
      camera.position.copy(ZOOM_TARGET).add(dir);
    },
    { passive: false },
  );

  subscribe((state) => {
    if (fusion) return;
    syncChamber(state.reactionZone);
    const isEmpty = chamberParticles.length === 0;
    atomGroup.visible = isEmpty && currentAtom !== null;
    idleHint.visible = isEmpty && resultTimer <= 0 && currentAtom === null;

    // Auto-Fusion-Prüfung: passt die Konfiguration zu einem Rezept?
    // Timer wird bei jeder Zustandsänderung neu gesetzt oder gelöscht.
    if (isEmpty || decay) {
      autoCraftDeadline = null;
      return;
    }
    const recipe = matchRecipe(state.reactionZone, state.activeReactor, state.expertMode);
    if (recipe) {
      autoCraftDeadline = performance.now() / 1000 + AUTO_CRAFT_DELAY;
    } else {
      autoCraftDeadline = null;
    }
  });

  function syncChamber(zone: Multiset): void {
    const target = new Map<string, number>();
    for (const [id, cnt] of Object.entries(zone)) if (cnt > 0) target.set(id, cnt);
    const current = new Map<string, number>();
    for (const p of chamberParticles) current.set(p.id, (current.get(p.id) ?? 0) + 1);

    // Add missing
    for (const [id, wanted] of target) {
      const have = current.get(id) ?? 0;
      for (let i = have; i < wanted; i++) spawnChamberParticle(id);
    }
    // Remove extras (auch entities, die komplett aus zone raus sind)
    const allIds = new Set<string>([...current.keys(), ...target.keys()]);
    for (const id of allIds) {
      const have = current.get(id) ?? 0;
      const wanted = target.get(id) ?? 0;
      if (have <= wanted) continue;
      let toRemove = have - wanted;
      for (let i = chamberParticles.length - 1; i >= 0 && toRemove > 0; i--) {
        if (chamberParticles[i]!.id === id) {
          const [removed] = chamberParticles.splice(i, 1);
          chamberGroup.remove(removed!.mesh);
          disposeMesh(removed!.mesh);
          toRemove--;
        }
      }
    }
  }

  function spawnChamberParticle(id: string): void {
    const entity = getEntity(id);
    if (!entity) return;

    const mesh = createParticleMesh(id);
    // Skalierung: Nukleonen kleiner, Elektronen mittel
    const role: ChamberRole =
      id === 'proton' || id === 'neutron'
        ? 'nucleon'
        : id === 'e-'
          ? 'electron'
          : entity.kind === 'nucleus'
            ? 'nucleus'
            : 'other';
    mesh.scale.setScalar(role === 'nucleon' ? 0.55 : role === 'electron' ? 0.5 : 0.8);

    // Startposition: außerhalb der Kammer, zufällig auf einer Kugelschale
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = CHAMBER_SPAWN_R + Math.random() * 0.6;
    mesh.position.set(
      ATOM_CENTER.x + r * Math.sin(phi) * Math.cos(theta),
      ATOM_CENTER.y + r * Math.cos(phi) * 0.55,
      ATOM_CENTER.z + r * Math.sin(phi) * Math.sin(theta),
    );
    chamberGroup.add(mesh);

    chamberParticles.push({
      id,
      mesh,
      role,
      velocity: new Vector3(0, 0, 0),
      phase: Math.random() * Math.PI * 2,
      seed: ++seedCounter,
    });
  }

  function isChamberUnstable(): boolean {
    let protons = 0;
    let neutrons = 0;
    for (const p of chamberParticles) {
      if (p.id === 'proton') protons++;
      else if (p.id === 'neutron') neutrons++;
    }
    const total = protons + neutrons;
    if (total < 2) return false; // ein einzelnes Nukleon ist ok

    // Nur eine Sorte
    if (protons === 0 && neutrons >= 2) return true;
    if (neutrons === 0 && protons >= 2) return true;

    // Grobe Valley-of-Stability-Approximation:
    //  Z ≤ 4  : N in [Z-1, Z+1]  (Deuteron/Triton/He-3/He-4 alle ok)
    //  Z ≥ 5  : N in [0.85·Z, 1.6·Z + Z²/60]  (schwere Kerne brauchen
    //           Neutronenüberschuss, U-238 mit 92p/146n passt rein)
    let minN: number;
    let maxN: number;
    if (protons <= 4) {
      minN = Math.max(0, protons - 1);
      maxN = protons + 1;
    } else {
      minN = Math.ceil(protons * 0.85);
      maxN = Math.floor(protons * 1.6 + (protons * protons) / 60);
    }
    if (neutrons < minN || neutrons > maxN) return true;

    return false;
  }

  function updateChamberPhysics(dt: number): void {
    if (chamberParticles.length === 0) return;
    chamberTime += dt;

    const unstable = isChamberUnstable();
    const nucleons = chamberParticles.filter((p) => p.role === 'nucleon');
    const slots =
      nucleons.length > 0 ? packedPositions(nucleons.length, PARTICLE_RADIUS * 1.85 * 0.55 * 2, 42) : [];

    let nucleonIdx = 0;
    for (const p of chamberParticles) {
      if (p.role === 'nucleon') {
        const target = slots[nucleonIdx]!.clone().add(ATOM_CENTER);
        nucleonIdx++;
        if (unstable) {
          // Coulomb-Abstoßung / instabiles Wackeln: Ziel wird jitternd verschoben,
          // Anziehung schwächer, Dämpfung geringer — die Nukleonen zappeln.
          const jitter = 0.35;
          const wobble = new Vector3(
            Math.sin(chamberTime * 6 + p.seed * 1.3) * jitter,
            Math.sin(chamberTime * 5.2 + p.seed * 2.1) * jitter * 0.6,
            Math.cos(chamberTime * 7 + p.seed * 0.9) * jitter,
          );
          applyAttraction(p, target.add(wobble), dt, 4.5, 0.78);
        } else {
          applyAttraction(p, target, dt, 8, 0.82);
        }
      } else if (p.role === 'electron') {
        const cloudR = 1.15;
        const t = chamberTime * 0.9 + p.phase;
        const tilt = (p.seed % 5) * 0.5;
        const target = new Vector3(
          ATOM_CENTER.x + Math.cos(t) * Math.cos(tilt) * cloudR,
          ATOM_CENTER.y + Math.sin(t * 0.7 + p.phase) * cloudR * 0.55,
          ATOM_CENTER.z + Math.sin(t) * cloudR + Math.cos(t * 0.4) * 0.2,
        );
        applyAttraction(p, target, dt, 3.5, 0.88);
      } else {
        applyAttraction(p, ATOM_CENTER, dt, 3, 0.88);
      }
    }
  }

  onCraft((event) => {
    if (!event.ok) {
      // Instabile Konfiguration (nur p oder nur n): zerlegt auseinander.
      if (event.reason === 'no-match' && isChamberUnstable()) {
        const snapshot = chamberParticles.slice();
        chamberParticles.length = 0;
        startDecay(snapshot);
      }
      return;
    }
    idleHint.visible = false;

    const elementOutput = Object.keys(event.recipe.outputs).find((id) => {
      const e = getEntity(id);
      return e && e.kind === 'element';
    });

    if (elementOutput && canFuseFromInputs(event.recipe.inputs)) {
      const snapshot = chamberParticles.slice();
      const started = startFusion(elementOutput, snapshot);
      if (started) {
        chamberParticles.length = 0;
        atomGroup.visible = false;
        return;
      }
    }

    if (elementOutput) {
      replaceAtom(elementOutput, true);
      atomGroup.visible = true;
      return;
    }

    // Molekül-Output: chamber leeren, Molekül-Modell einblenden.
    const moleculeOutput = Object.keys(event.recipe.outputs).find((id) => {
      const e = getEntity(id);
      return e && e.kind === 'molecule';
    });
    if (moleculeOutput) {
      // Chamber-Atome sanft ausblenden (Kurz-Fusion-Style)
      for (const p of chamberParticles) {
        chamberGroup.remove(p.mesh);
        disposeMesh(p.mesh);
      }
      chamberParticles.length = 0;
      replaceAtom(moleculeOutput, true);
      atomGroup.visible = true;
      return;
    }

    resultTimer = RESULT_FLASH_SECONDS;
    rebuildResult(resultGroup, event.recipe.outputs);
  });

  function startDecay(snapshot: ChamberParticle[]): void {
    // Fluchtgeschwindigkeit radial vom Zentrum weg (oder zufällig wenn genau im Zentrum).
    const velocities = snapshot.map((p) => {
      const dir = p.mesh.position.clone().sub(ATOM_CENTER);
      if (dir.lengthSq() < 0.02) {
        dir.set(Math.random() - 0.5, Math.random() * 0.6, Math.random() - 0.5);
      }
      dir.normalize().multiplyScalar(3.2 + Math.random() * 1.8);
      return dir;
    });
    decay = {
      particles: snapshot,
      velocities,
      elapsed: 0,
      duration: 1.1,
    };
  }

  function startFusion(elementId: string, snapshot: ChamberParticle[]): boolean {
    const entity = getEntity(elementId);
    if (!entity || entity.kind !== 'element') return false;
    const targets = computeAtomTargets(entity as ElementEntity);
    const scale = targets.scale;

    const fusionGroup = new Group();
    scene.add(fusionGroup);

    const flashMat = new MeshBasicMaterial({
      color: new Color(entity.cpkColor),
      transparent: true,
      opacity: 0.0,
    });
    const flashMesh = new Mesh(new SphereGeometry(0.35, 24, 20), flashMat);
    flashMesh.position.copy(ATOM_CENTER);
    fusionGroup.add(flashMesh);

    const nucleonMeshes: Mesh[] = [];
    const electronMeshes: Mesh[] = [];
    const otherMeshes: Mesh[] = [];
    for (const p of snapshot) {
      if (p.role === 'nucleon') nucleonMeshes.push(p.mesh);
      else if (p.role === 'electron') electronMeshes.push(p.mesh);
      else otherMeshes.push(p.mesh);
    }

    const movers: FusionMover[] = [];

    // attach() erhält Weltposition (chamberGroup hat keine Rotation, aber
    // konsistent halten für die Zukunft).
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
        duration: 1.0,
        scaleFrom: mesh.scale.x,
        scaleTo: nucleonScaleFactor,
      });
    });

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
        startT: 0.8,
        duration: 1.2,
        scaleFrom: mesh.scale.x,
        scaleTo: electronScaleFactor,
      });
    });

    otherMeshes.forEach((mesh) => {
      fusionGroup.attach(mesh);
      movers.push({
        mesh,
        from: mesh.position.clone(),
        to: ATOM_CENTER.clone(),
        startT: 0,
        duration: 1.0,
        scaleFrom: mesh.scale.x,
        scaleTo: 0.01,
      });
    });

    fusion = {
      group: fusionGroup,
      movers,
      elapsed: 0,
      totalDuration: 2.2,
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

      if (!fusion) {
        updateChamberPhysics(dt);
      }

      // Auto-Fusion-Countdown: sobald die Wartezeit abgelaufen ist, craft() rufen.
      if (autoCraftDeadline !== null && !fusion && !decay) {
        if (performance.now() / 1000 >= autoCraftDeadline) {
          autoCraftDeadline = null;
          craft();
        }
      }

      // Plattform-Ring: grün stabil, rot instabil, warmgelb bereit-zur-Fusion.
      const unstable = !fusion && !decay && isChamberUnstable();
      const ready = !fusion && !decay && !unstable && autoCraftDeadline !== null;
      const targetColor = unstable
        ? outerRingColorUnstable
        : ready
          ? outerRingColorReady
          : outerRingColorStable;
      outerRingMat.color.lerp(targetColor, Math.min(1, dt * 4));
      if (unstable) {
        outerRingMat.opacity = 0.55 + Math.sin(chamberTime * 8) * 0.25;
      } else if (ready && autoCraftDeadline !== null) {
        // Beschleunigt pulsieren, je näher der Fusion-Zeitpunkt.
        const remaining = Math.max(0, autoCraftDeadline - performance.now() / 1000);
        const pulseSpeed = 4 + (1 - remaining / AUTO_CRAFT_DELAY) * 12;
        outerRingMat.opacity = 0.6 + Math.sin(chamberTime * pulseSpeed) * 0.3;
      } else {
        outerRingMat.opacity = 0.65;
      }

      if (decay) {
        decay.elapsed += dt;
        const tNorm = decay.elapsed / decay.duration;
        for (let i = 0; i < decay.particles.length; i++) {
          const p = decay.particles[i]!;
          const v = decay.velocities[i]!;
          p.mesh.position.add(v.clone().multiplyScalar(dt));
          // Bremsen leicht mit der Zeit, damit sie am Ende driften statt zu rasen.
          v.multiplyScalar(0.985);
          const mat = p.mesh.material as MeshStandardMaterial;
          mat.transparent = true;
          mat.opacity = Math.max(0, 1 - tNorm);
        }
        if (decay.elapsed >= decay.duration) {
          for (const p of decay.particles) {
            chamberGroup.remove(p.mesh);
            disposeMesh(p.mesh);
          }
          decay = null;
          // Store-Zone leeren, damit HUD/State konsistent bleiben.
          clearZone();
        }
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
        const tNorm = fusion.elapsed / fusion.totalDuration;
        const pulse = Math.sin(Math.min(1, tNorm * 1.2) * Math.PI);
        fusion.flashMat.opacity = pulse * 0.55;
        fusion.flashMesh.scale.setScalar(0.5 + tNorm * 1.4);

        if (fusion.elapsed >= fusion.totalDuration) {
          const target = fusion.targetElementId;
          disposeGroup(fusion.group);
          scene.remove(fusion.group);
          fusion = null;
          replaceAtom(target, true);
          atomGroup.visible = true;
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
          if (chamberParticles.length === 0 && currentAtom === null) idleHint.visible = true;
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
      if (fusion) return;
      replaceAtom(elementId, false);
      const empty = chamberParticles.length === 0;
      atomGroup.visible = elementId !== null && empty;
      if (elementId !== null) idleHint.visible = false;
      else if (empty && resultTimer <= 0) idleHint.visible = true;
    },
  };
}

function applyAttraction(
  p: ChamberParticle,
  target: Vector3,
  dt: number,
  strength: number,
  damping: number,
): void {
  const diff = target.clone().sub(p.mesh.position);
  p.velocity.add(diff.multiplyScalar(dt * strength));
  p.velocity.multiplyScalar(damping);
  p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));
}

function canFuseFromInputs(inputs: Multiset): boolean {
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

function rebuildResult(group: Group, outputs: Multiset): void {
  disposeChildren(group);
  const items = Object.entries(outputs).flatMap(([id, n]) =>
    Array.from({ length: n }, () => id),
  );
  const spread = items.length > 1 ? 0.35 : 0;
  items.forEach((id, i) => {
    const angle = (i / items.length) * Math.PI * 2;
    const mesh = createParticleMesh(id);
    mesh.scale.setScalar(1.4);
    mesh.position.set(Math.cos(angle) * spread, 0.9, Math.sin(angle) * spread);
    group.add(mesh);
  });
}

function createParticleMesh(id: string): Mesh {
  const entity = requireEntity(id);
  const material = new MeshStandardMaterial({
    color: new Color(entity.color),
    emissive: new Color(entity.color),
    emissiveIntensity: 0.5,
    roughness: 0.35,
    metalness: 0.15,
    transparent: true,
    opacity: 1,
  });
  const mesh = new Mesh(new SphereGeometry(PARTICLE_RADIUS, 20, 16), material);
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

function disposeMesh(mesh: Mesh): void {
  mesh.geometry.dispose();
  const mat = mesh.material as MeshStandardMaterial | MeshBasicMaterial;
  mat.dispose();
}

function disposeChildren(group: Group): void {
  for (const child of [...group.children]) {
    group.remove(child);
    if (child instanceof Mesh) disposeMesh(child);
  }
}

function disposeGroup(group: Group): void {
  disposeChildren(group);
}
