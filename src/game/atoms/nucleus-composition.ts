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
 * Findet die Nukleon-Zusammensetzung des häufigsten Isotops. Priorität:
 * 1. Ein Rezept mit `nucleus`-Input (z.B. `assemble-helium-4` → alpha) —
 *    dessen Kern definiert protons/neutrons.
 * 2. Ein Rezept mit `proton`/`neutron`-Inputs (Simple-Rezepte) — die
 *    Multiplizitäten werden aufsummiert.
 * 3. Fallback aus atomicMassU + Z.
 */
export function nucleusFor(element: ElementEntity): NucleusComposition {
  // Priorität 1: Rezept mit Nucleus-Input
  for (const recipe of recipes) {
    if (recipe.reactor !== 'workbench') continue;
    if ((recipe.outputs[element.id] ?? 0) !== 1) continue;
    for (const inputId of Object.keys(recipe.inputs)) {
      const entity = getEntity(inputId);
      if (entity && entity.kind === 'nucleus') {
        const nuc = entity as NucleusEntity;
        return { protons: nuc.protons, neutrons: nuc.neutrons, a: nuc.a };
      }
    }
  }

  // Priorität 2: Rezept mit proton/neutron-Inputs — Multiplizitäten summieren
  for (const recipe of recipes) {
    if (recipe.reactor !== 'workbench') continue;
    if ((recipe.outputs[element.id] ?? 0) !== 1) continue;
    let protons = 0;
    let neutrons = 0;
    for (const [inputId, count] of Object.entries(recipe.inputs)) {
      if (inputId === 'proton') protons += count;
      else if (inputId === 'neutron') neutrons += count;
    }
    if (protons > 0 || neutrons > 0) {
      return { protons, neutrons, a: protons + neutrons };
    }
  }

  // Priorität 3: Fallback aus atomicMassU
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
