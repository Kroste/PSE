import {
  Color,
  Euler,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
  SphereGeometry,
  DoubleSide,
  Vector3,
} from 'three';
import type { ElementEntity } from '../content/types';
import { bohrShells, nucleusFor } from './nucleus-composition';

export type AtomRig = {
  root: Group;
  update: (dt: number) => void;
};

/**
 * Vorausberechnete Ziel-Positionen für eine Fusion-Animation.
 * Positionen sind in Atom-lokalen Koordinaten (Scale = 1). Der Aufrufer
 * translated + skaliert entsprechend seiner Bühne.
 */
export type AtomTargets = {
  nucleonPositions: Vector3[]; // Reihenfolge egal — Zuordnung passiert im Renderer
  electronPositions: Vector3[]; // In Schalen-Reihenfolge (K, L, M, …)
  /** Rig-Scale, die auf die Positionen anzuwenden ist. */
  scale: number;
};

export function computeAtomTargets(element: ElementEntity): AtomTargets {
  const { protons, neutrons } = nucleusFor(element);
  const shells = bohrShells(element);
  const total = protons + neutrons;

  const nucleonPositions =
    total <= 1
      ? [new Vector3(0, 0, 0)]
      : packedPositions(total, 0.09 * 1.85, protons * 3 + neutrons * 5);

  const electronPositions: Vector3[] = [];
  shells.forEach((count, idx) => {
    if (count <= 0) return;
    const n = idx + 1;
    const radius = 0.55 + n * 0.32;
    const tiltX = (n * 0.35) % Math.PI;
    const tiltZ = (n * 0.45) % Math.PI;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const p = new Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      // Neigung anwenden (analog zu buildShell: rotation.x = tiltX, rotation.z = tiltZ)
      p.applyEuler(new Euler(tiltX, 0, tiltZ, 'XYZ'));
      electronPositions.push(p);
    }
  });

  const maxR = shells.length > 0 ? 0.55 + shells.length * 0.32 : 0.4;
  const scale = 1.5 / (maxR + 0.15);

  return { nucleonPositions, electronPositions, scale };
}

const PROTON_COLOR = 0xe94f4f;
const NEUTRON_COLOR = 0x4a70c8;
const ELECTRON_COLOR = 0x2b3946;
const SHELL_COLOR = 0x88a0b0;

/**
 * Baut ein Bohr-artiges Atom-Modell: rote/blaue Nukleonen als Kern-Cluster
 * (Fibonacci-Kugelverteilung) plus Elektronen auf konzentrischen elliptischen
 * Schalenbahnen, jeweils mit unterschiedlicher Neigung.
 */
export function buildBohrAtom(element: ElementEntity): AtomRig {
  const root = new Group();

  const { protons, neutrons, a } = nucleusFor(element);
  const shells = bohrShells(element);

  const nucleus = buildNucleusCluster(protons, neutrons, a);
  root.add(nucleus);

  type ShellRig = { group: Group; electronCount: number; speed: number };
  const shellRigs: ShellRig[] = [];

  shells.forEach((count, idx) => {
    if (count <= 0) return;
    const n = idx + 1;
    const radius = 0.55 + n * 0.32;
    const group = buildShell(n, count, radius);
    root.add(group);
    shellRigs.push({ group, electronCount: count, speed: 0.9 / Math.max(1, n * 0.55) });
  });

  // Skalierung: Zielradius für die äußerste Schale bei ~1.5
  const maxR = shells.length > 0 ? 0.55 + shells.length * 0.32 : 0.4;
  const scale = 1.5 / (maxR + 0.15);
  root.scale.setScalar(scale);

  let t = 0;
  return {
    root,
    update(dt) {
      t += dt;
      for (const { group, speed } of shellRigs) {
        group.rotation.y += dt * speed;
      }
      // Kern wackelt sanft (Nukleonen "atmen")
      const wobble = 1 + Math.sin(t * 1.8) * 0.02;
      nucleus.scale.setScalar(wobble);
    },
  };
}

function buildNucleusCluster(protons: number, neutrons: number, _a: number): Group {
  const g = new Group();
  const nucleonR = 0.09;
  const pMat = makeNucleonMaterial(PROTON_COLOR);
  const nMat = makeNucleonMaterial(NEUTRON_COLOR);
  const geo = new SphereGeometry(nucleonR, 20, 16);

  const total = protons + neutrons;
  if (total <= 1) {
    const mat = protons === 1 ? pMat : nMat;
    g.add(new Mesh(geo, mat));
    return g;
  }

  // Nukleonen zufällig, aber deterministisch mischen (Protonen und Neutronen
  // gleichmäßig verteilt, sonst würden alle Protonen im Kern-Zentrum liegen).
  const kinds: number[] = [];
  for (let i = 0; i < protons; i++) kinds.push(0);
  for (let i = 0; i < neutrons; i++) kinds.push(1);
  shuffleDeterministic(kinds, protons * 7 + neutrons * 13);

  const positions = packedPositions(total, nucleonR * 1.85, protons * 3 + neutrons * 5);
  for (let i = 0; i < total; i++) {
    const p = positions[i]!;
    const mesh = new Mesh(geo, kinds[i] === 0 ? pMat : nMat);
    mesh.position.copy(p);
    g.add(mesh);
  }
  return g;
}

/**
 * Erzeugt `count` Positionen für Nukleonen in einer möglichst kompakten
 * Kugel-Anordnung. Ansatz: kubisches Gitter mit `spacing`, sortiert nach
 * Distanz zum Ursprung, die N nächsten übernommen — plus leichter Jitter,
 * damit das Ergebnis weniger nach Gitter aussieht.
 */
export function packedPositions(count: number, spacing: number, jitterSeed: number): Vector3[] {
  const candidates: Vector3[] = [];
  const range = Math.ceil(Math.cbrt(count));
  for (let i = -range; i <= range; i++) {
    for (let j = -range; j <= range; j++) {
      for (let k = -range; k <= range; k++) {
        candidates.push(new Vector3(i * spacing, j * spacing, k * spacing));
      }
    }
  }
  candidates.sort((a, b) => a.lengthSq() - b.lengthSq());

  const chosen = candidates.slice(0, count);
  const jitter = spacing * 0.12;
  let s = jitterSeed;
  const nextRand = (): number => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280 - 0.5;
  };
  for (const p of chosen) {
    p.x += nextRand() * jitter;
    p.y += nextRand() * jitter;
    p.z += nextRand() * jitter;
  }
  return chosen;
}

function buildShell(n: number, electronCount: number, radius: number): Group {
  const group = new Group();

  // Elektronenbahn als dünner Ring
  const ringGeo = new RingGeometry(radius - 0.008, radius + 0.008, 96);
  const ringMat = new MeshBasicMaterial({
    color: SHELL_COLOR,
    transparent: true,
    opacity: 0.35,
    side: DoubleSide,
  });
  const ring = new Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  group.add(ring);

  // Neigung leicht variieren, damit die Bahnen im Bild wie im Sci-Fi-Atom
  // schräg zueinander stehen — pro n einen anderen Winkel.
  group.rotation.x = (n * 0.35) % Math.PI;
  group.rotation.z = (n * 0.45) % Math.PI;

  // Elektronen auf der Bahn gleichmäßig verteilen
  const eGeo = new SphereGeometry(0.075, 18, 14);
  const eMat = new MeshStandardMaterial({
    color: ELECTRON_COLOR,
    emissive: 0x88bbff,
    emissiveIntensity: 0.35,
    roughness: 0.4,
    metalness: 0.3,
  });
  for (let i = 0; i < electronCount; i++) {
    const angle = (i / electronCount) * Math.PI * 2;
    const e = new Mesh(eGeo, eMat);
    e.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    group.add(e);
  }

  return group;
}

function makeNucleonMaterial(color: number): MeshStandardMaterial {
  const c = new Color(color);
  return new MeshStandardMaterial({
    color: c,
    emissive: c.clone().multiplyScalar(0.25),
    roughness: 0.45,
    metalness: 0.15,
  });
}

function shuffleDeterministic<T>(arr: T[], seed: number): void {
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
}
