import { recipes } from '../content';
import type { ElementEntity, NucleusEntity } from '../content/types';
import { getEntity } from '../content';
import { parseElectronConfig } from './orbital-parser';

export type NucleusComposition = {
  protons: number;
  neutrons: number;
  /** Massenzahl A = protons + neutrons. */
  a: number;
};

/**
 * Findet das Nuklid, das im Element-Assembly-Rezept (Werkbank) als Input
 * verwendet wird. Fallback: aus Ordnungszahl Z ableiten (A ≈ 2·Z für kleine
 * Elemente, sonst atomicMassU gerundet) — falls es (noch) kein Rezept gibt.
 */
export function nucleusFor(element: ElementEntity): NucleusComposition {
  for (const recipe of recipes) {
    if (recipe.reactor !== 'workbench') continue;
    if ((recipe.outputs[element.id] ?? 0) !== 1) continue;
    for (const inputId of Object.keys(recipe.inputs)) {
      const entity = getEntity(inputId);
      if (!entity) continue;
      if (entity.kind === 'nucleus') {
        const nuc = entity as NucleusEntity;
        return { protons: nuc.protons, neutrons: nuc.neutrons, a: nuc.a };
      }
      if (entity.kind === 'hadron' && entity.id === 'proton') {
        return { protons: 1, neutrons: 0, a: 1 };
      }
    }
  }
  // Fallback: nutze atomicMassU gerundet
  const a = Math.round(element.atomicMassU);
  return { protons: element.z, neutrons: Math.max(0, a - element.z), a };
}

/**
 * Ordnet die Elektronen eines Elements den Bohr-Schalen zu (Summe der
 * Elektronen pro Hauptquantenzahl n). Ableitung aus der spektroskopischen
 * Konfiguration — damit z.B. Fe korrekt 2/8/14/2 ergibt statt der naiven
 * K/L/M/N-Vollbesetzung.
 */
export function bohrShells(element: ElementEntity): number[] {
  const occs = parseElectronConfig(element.electronConfig);
  const byN = new Map<number, number>();
  for (const o of occs) byN.set(o.n, (byN.get(o.n) ?? 0) + o.count);
  const maxN = Math.max(0, ...byN.keys());
  const shells: number[] = [];
  for (let n = 1; n <= maxN; n++) shells.push(byN.get(n) ?? 0);
  return shells;
}
