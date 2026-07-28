import { Color, Group, Mesh, MeshStandardMaterial, SphereGeometry } from 'three';
import type { ElementEntity } from '../content/types';
import { parseElectronConfig } from './orbital-parser';
import { buildOrbital, shellRadius } from './orbital-mesh';

export type AtomRig = {
  root: Group;
  update: (dt: number) => void;
};

/**
 * Baut ein 3D-Atom-Modell aus dem Element-Content: Kern in der Mitte plus alle
 * besetzten Quantenorbitale nach der spektroskopischen Konfiguration. Jede
 * Subshell rotiert leicht anders, damit die Wolken sich sanft mischen.
 */
export function buildAtom(element: ElementEntity): AtomRig {
  const root = new Group();
  const color = new Color(element.cpkColor);

  const nucleus = new Mesh(
    new SphereGeometry(0.14, 24, 20),
    new MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.8,
      roughness: 0.25,
      metalness: 0.5,
    }),
  );
  root.add(nucleus);

  const shells: Array<{ group: Group; speed: number }> = [];
  const occs = parseElectronConfig(element.electronConfig);
  for (const occ of occs) {
    const g = buildOrbital(occ, color);
    // Etwas schneller für kleine n, langsamer für außen — visuelles Signal
    const speed = 0.4 / Math.max(1, occ.n * 0.6);
    // Verschiedene Achsen für p/d/f Wolken, damit sich Formen mischen
    const seed = occ.n * 3 + subshellSeed(occ.l);
    g.rotation.x = (seed % 3) * 0.4;
    g.rotation.z = ((seed >> 1) % 3) * 0.35;
    shells.push({ group: g, speed });
    root.add(g);
  }

  // Skala so wählen, dass das Atom in den Bildausschnitt passt
  const maxR = occs.length > 0 ? shellRadius(Math.max(...occs.map((o) => o.n))) : 0.35;
  const targetR = 1.3;
  const scale = targetR / (maxR + 0.4);
  root.scale.setScalar(scale);

  return {
    root,
    update(dt) {
      for (const { group, speed } of shells) {
        group.rotation.y += dt * speed;
      }
      nucleus.rotation.y += dt * 0.6;
    },
  };
}

function subshellSeed(l: 's' | 'p' | 'd' | 'f'): number {
  return { s: 0, p: 1, d: 2, f: 3 }[l];
}
