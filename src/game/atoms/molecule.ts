import {
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import { getEntity } from '../content';
import type { ElementEntity, MoleculeEntity } from '../content/types';
import type { AtomRig } from './bohr-atom';

const ATOM_RADIUS = 0.24;
const BOND_RADIUS = 0.06;
const BOND_COLOR = 0xaab5bd;
const BOND_OFFSET = 0.08; // Abstand paralleler Zylinder bei Doppel/Dreifachbindung

/**
 * Ball-Stick-Modell eines Moleküls. Atome als Kugeln in ihren geometrischen
 * Positionen, Bonds als Zylinder (Einfach/Doppel/Dreifach: 1/2/3 parallel).
 * Skaliert so, dass der Bounding-Radius ~1.4 Szenen-Einheiten trifft.
 */
export function buildMolecule(mol: MoleculeEntity): AtomRig {
  const root = new Group();

  // Atome
  for (const a of mol.atoms) {
    const el = getEntity(a.element);
    const color = new Color(el && el.kind === 'element' ? (el as ElementEntity).cpkColor : '#ffffff');
    const mesh = new Mesh(
      new SphereGeometry(ATOM_RADIUS, 28, 22),
      new MeshStandardMaterial({
        color,
        emissive: color.clone().multiplyScalar(0.2),
        roughness: 0.35,
        metalness: 0.15,
      }),
    );
    mesh.position.fromArray(a.position);
    root.add(mesh);
  }

  // Bonds
  const bondMat = new MeshStandardMaterial({
    color: new Color(BOND_COLOR),
    roughness: 0.6,
    metalness: 0.2,
  });
  for (const b of mol.bonds) {
    const from = new Vector3().fromArray(mol.atoms[b.from]!.position);
    const to = new Vector3().fromArray(mol.atoms[b.to]!.position);
    const dir = to.clone().sub(from);
    const length = dir.length();
    if (length < 0.001) continue;
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const rotation = new Quaternion().setFromUnitVectors(
      new Vector3(0, 1, 0),
      dir.clone().normalize(),
    );
    // Für Doppel-/Dreifachbindungen einen zur Bond-Richtung senkrechten
    // Offset-Vektor finden (nicht kollinear mit Bond-Achse).
    const arbitrary =
      Math.abs(dir.y) > 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
    const perp = new Vector3().crossVectors(dir, arbitrary).normalize().multiplyScalar(BOND_OFFSET);

    for (let i = 0; i < b.order; i++) {
      const shift =
        b.order === 1 ? new Vector3(0, 0, 0) : perp.clone().multiplyScalar(i - (b.order - 1) / 2);
      const geo = new CylinderGeometry(BOND_RADIUS, BOND_RADIUS, length, 14);
      const cyl = new Mesh(geo, bondMat);
      cyl.position.copy(mid).add(shift);
      cyl.quaternion.copy(rotation);
      root.add(cyl);
    }
  }

  // Skalierung: finde Bounding-Radius aus allen Atom-Positionen und skaliere
  // so, dass er ~1.4 trifft. Für kleine Moleküle (H₂) wächst das auf sinnvolle
  // Größe, für große (CH₄) schrumpft es leicht.
  let maxR = 0;
  for (const a of mol.atoms) {
    const r = Math.hypot(a.position[0], a.position[1], a.position[2]);
    if (r > maxR) maxR = r;
  }
  const targetR = 1.4;
  const scale = maxR > 0 ? targetR / (maxR + ATOM_RADIUS) : 1;
  root.scale.setScalar(scale);

  return {
    root,
    update(dt) {
      root.rotation.y += dt * 0.4;
    },
  };
}
