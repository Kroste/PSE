import {
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
  SphereGeometry,
  DoubleSide,
} from 'three';
import type { ElementEntity } from '../content/types';
import { bohrShells, nucleusFor } from './nucleus-composition';

export type AtomRig = {
  root: Group;
  update: (dt: number) => void;
};

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

function buildNucleusCluster(protons: number, neutrons: number, a: number): Group {
  const g = new Group();
  const nucleonR = 0.09;
  // Kern-Radius wächst mit A^(1/3) — physikalisch korrekt (~1.2 fm × A^1/3)
  const clusterR = 0.05 + 0.14 * Math.cbrt(a);
  const pMat = makeNucleonMaterial(PROTON_COLOR);
  const nMat = makeNucleonMaterial(NEUTRON_COLOR);
  const geo = new SphereGeometry(nucleonR, 20, 16);

  const total = protons + neutrons;
  if (total <= 1) {
    const mat = protons === 1 ? pMat : nMat;
    g.add(new Mesh(geo, mat));
    return g;
  }

  // Fibonacci-Kugelverteilung: gleichmäßig auf einer Sphäre.
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  // Nukleonen zufällig, aber deterministisch mischen (Protonen zuerst)
  const kinds: number[] = [];
  for (let i = 0; i < protons; i++) kinds.push(0);
  for (let i = 0; i < neutrons; i++) kinds.push(1);
  shuffleDeterministic(kinds, protons * 7 + neutrons * 13);

  for (let i = 0; i < total; i++) {
    const y = 1 - (i / (total - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    const mesh = new Mesh(geo, kinds[i] === 0 ? pMat : nMat);
    mesh.position.set(x * clusterR, y * clusterR, z * clusterR);
    g.add(mesh);
  }
  return g;
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
