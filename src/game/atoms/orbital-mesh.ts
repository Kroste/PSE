import {
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { SUBSHELL_CAPACITY, type OrbitalOccupancy } from './orbital-parser';

/**
 * Base-Radius einer n-Schale in Szenen-Einheiten. Bewusst kompakt, damit auch
 * Atome mit 7 Schalen (Og) noch in die Bühne passen.
 */
export function shellRadius(n: number): number {
  return 0.35 + (n - 1) * 0.35;
}

const LOBE_SEGMENTS_HI = 20;
const LOBE_SEGMENTS_LO = 14;

function baseMaterial(color: Color, count: number, capacity: number): MeshStandardMaterial {
  const fill = count / capacity;
  return new MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.55 + fill * 0.35,
    transparent: true,
    opacity: 0.14 + fill * 0.32,
    roughness: 0.55,
    metalness: 0.05,
    depthWrite: false,
  });
}

export function buildOrbital(occ: OrbitalOccupancy, color: Color): Group {
  const g = new Group();
  const r = shellRadius(occ.n);
  const mat = baseMaterial(color, occ.count, SUBSHELL_CAPACITY[occ.l]);

  switch (occ.l) {
    case 's':
      g.add(sOrbital(r, mat));
      break;
    case 'p':
      for (const mesh of pOrbital(r, mat)) g.add(mesh);
      break;
    case 'd':
      for (const mesh of dOrbital(r, mat)) g.add(mesh);
      break;
    case 'f':
      for (const mesh of fOrbital(r, mat)) g.add(mesh);
      break;
  }
  g.userData.subshell = occ;
  return g;
}

function sOrbital(radius: number, mat: MeshStandardMaterial): Mesh {
  return new Mesh(new SphereGeometry(radius, 32, 24), mat);
}

function pOrbital(radius: number, mat: MeshStandardMaterial): Mesh[] {
  const meshes: Mesh[] = [];
  const lobeR = radius * 0.34;
  const dist = radius * 0.75;
  const axes: Array<[number, number, number]> = [
    [dist, 0, 0],
    [-dist, 0, 0],
    [0, dist, 0],
    [0, -dist, 0],
    [0, 0, dist],
    [0, 0, -dist],
  ];
  const stretchAxis: Array<'x' | 'y' | 'z'> = ['x', 'x', 'y', 'y', 'z', 'z'];
  axes.forEach(([x, y, z], i) => {
    const mesh = new Mesh(new SphereGeometry(lobeR, LOBE_SEGMENTS_HI, LOBE_SEGMENTS_LO), mat);
    mesh.position.set(x, y, z);
    const s = stretchAxis[i]!;
    if (s === 'x') mesh.scale.set(1.7, 0.9, 0.9);
    if (s === 'y') mesh.scale.set(0.9, 1.7, 0.9);
    if (s === 'z') mesh.scale.set(0.9, 0.9, 1.7);
    meshes.push(mesh);
  });
  return meshes;
}

function dOrbital(radius: number, mat: MeshStandardMaterial): Mesh[] {
  const meshes: Mesh[] = [];
  const lobeR = radius * 0.3;
  const dist = radius * 0.7;
  // 4 planare Kleeblatt-Lappen (dxy-artig) in xy-Ebene, um 45° gedreht
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const mesh = new Mesh(new SphereGeometry(lobeR, LOBE_SEGMENTS_HI, LOBE_SEGMENTS_LO), mat);
    mesh.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
    mesh.scale.set(1.5, 0.8, 0.8);
    mesh.lookAt(0, 0, 0);
    meshes.push(mesh);
  }
  // 2 axiale Lappen (dz²-artig) + Torus als Ring
  for (const y of [dist, -dist]) {
    const mesh = new Mesh(new SphereGeometry(lobeR, LOBE_SEGMENTS_HI, LOBE_SEGMENTS_LO), mat);
    mesh.position.set(0, y, 0);
    mesh.scale.set(0.9, 1.5, 0.9);
    meshes.push(mesh);
  }
  const torusMat = mat.clone();
  torusMat.opacity = mat.opacity * 0.6;
  const torus = new Mesh(new TorusGeometry(radius * 0.55, lobeR * 0.35, 12, 48), torusMat);
  torus.rotation.x = Math.PI / 2;
  meshes.push(torus);
  return meshes;
}

function fOrbital(radius: number, mat: MeshStandardMaterial): Mesh[] {
  const meshes: Mesh[] = [];
  const lobeR = radius * 0.24;
  const dist = radius * 0.75;
  // 8 Lappen an Oktaeder-Ecken + 4 planare
  const positions: Array<[number, number, number]> = [
    [dist, dist, dist],
    [-dist, dist, dist],
    [dist, -dist, dist],
    [-dist, -dist, dist],
    [dist, dist, -dist],
    [-dist, dist, -dist],
    [dist, -dist, -dist],
    [-dist, -dist, -dist],
  ];
  const s = 1 / Math.sqrt(3);
  for (const [x, y, z] of positions) {
    const mesh = new Mesh(new SphereGeometry(lobeR, LOBE_SEGMENTS_LO, LOBE_SEGMENTS_LO), mat);
    mesh.position.set(x * s, y * s, z * s);
    mesh.scale.set(1.4, 1.4, 1.4);
    meshes.push(mesh);
  }
  return meshes;
}
