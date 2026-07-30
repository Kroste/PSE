import particlesRaw from './particles.json';
import hadronsRaw from './hadrons.json';
import nucleiRaw from './nuclei.json';
import elementsRaw from './elements.json';
import moleculesRaw from './molecules.json';
import recipesRaw from './recipes.json';
import type {
  Entity,
  EntityId,
  ParticleEntity,
  HadronEntity,
  NucleusEntity,
  ElementEntity,
  MoleculeEntity,
  Recipe,
} from './types';

export const particles: readonly ParticleEntity[] = particlesRaw as unknown as ParticleEntity[];
export const hadrons: readonly HadronEntity[] = hadronsRaw as unknown as HadronEntity[];
export const nuclei: readonly NucleusEntity[] = nucleiRaw as unknown as NucleusEntity[];
export const elements: readonly ElementEntity[] = elementsRaw as unknown as ElementEntity[];
export const molecules: readonly MoleculeEntity[] = moleculesRaw as unknown as MoleculeEntity[];

const staticRecipes: readonly Recipe[] = recipesRaw as unknown as Recipe[];

/**
 * Generiert Simple-Rezepte "N·p + N·n + Z·e⁻ → Element" für alle Elemente
 * außer H (das hat sein eigenes assemble-hydrogen im Katalog). N = A - Z,
 * A ≈ Math.round(atomicMassU) — hinreichend für stabile Isotope; für
 * transuranische Elemente ist es die Massenzahl des langlebigsten Isotops.
 */
function generateSimpleElementRecipes(): Recipe[] {
  const generated: Recipe[] = [];
  for (const el of elements) {
    if (el.z <= 1) continue; // H hat assemble-hydrogen (mode: both)
    const a = Math.round(el.atomicMassU);
    const p = el.z;
    const n = a - el.z;
    if (n < 0) continue;
    generated.push({
      id: `simple-${el.id.toLowerCase()}`,
      kind: 'assembly',
      reactor: 'workbench',
      mode: 'simple',
      inputs: n === 0 ? { proton: p, 'e-': p } : { proton: p, neutron: n, 'e-': p },
      outputs: { [el.id]: 1 },
      scienceNoteDE: `Vereinfachte Montage: ${p} Protonen${n > 0 ? `, ${n} Neutronen` : ''} und ${p} Elektronen bilden direkt ein neutrales ${el.nameDE}-Atom (${a}${el.symbol}).`,
      source: 'PSE: didaktische Vereinfachung',
    });
  }
  return generated;
}

export const recipes: readonly Recipe[] = [...staticRecipes, ...generateSimpleElementRecipes()];

export const allEntities: readonly Entity[] = [
  ...particles,
  ...hadrons,
  ...nuclei,
  ...elements,
  ...molecules,
];

const entityById = new Map<EntityId, Entity>(allEntities.map((e) => [e.id, e]));

export function getEntity(id: EntityId): Entity | undefined {
  return entityById.get(id);
}

export function requireEntity(id: EntityId): Entity {
  const entity = entityById.get(id);
  if (!entity) throw new Error(`Unbekannte Entity-ID: ${id}`);
  return entity;
}

export const freeSupplyIds: readonly EntityId[] = particles
  .filter((p) => p.freeSupply)
  .map((p) => p.id);

/**
 * Muss beim App-Start einmal aufgerufen werden. Bricht früh mit klarer
 * Fehlermeldung, wenn der Content-Katalog kaputt ist (fehlende IDs, doppelte
 * Rezepte, Verweise auf nicht existierende Zutaten).
 */
export function assertContentConsistency(): void {
  const seen = new Set<EntityId>();
  for (const entity of allEntities) {
    if (seen.has(entity.id)) throw new Error(`Doppelte Entity-ID: ${entity.id}`);
    seen.add(entity.id);
  }

  const recipeIds = new Set<string>();
  for (const recipe of recipes) {
    if (recipeIds.has(recipe.id)) throw new Error(`Doppelte Recipe-ID: ${recipe.id}`);
    recipeIds.add(recipe.id);

    for (const id of Object.keys(recipe.inputs)) {
      if (!entityById.has(id)) {
        throw new Error(`Rezept "${recipe.id}" referenziert unbekannte Zutat: ${id}`);
      }
    }
    for (const id of Object.keys(recipe.outputs)) {
      if (!entityById.has(id)) {
        throw new Error(`Rezept "${recipe.id}" referenziert unbekanntes Produkt: ${id}`);
      }
    }
  }

  for (const hadron of hadrons) {
    for (const quarkId of hadron.quarks) {
      const quark = entityById.get(quarkId);
      if (!quark || quark.kind !== 'particle' || quark.category !== 'quark') {
        throw new Error(`Hadron "${hadron.id}" enthält ungültigen Quark: ${quarkId}`);
      }
    }
  }

  for (const nucleus of nuclei) {
    if (nucleus.protons + nucleus.neutrons !== nucleus.a) {
      throw new Error(
        `Nucleus "${nucleus.id}": protons(${nucleus.protons}) + neutrons(${nucleus.neutrons}) ≠ A(${nucleus.a})`,
      );
    }
    if (nucleus.protons !== nucleus.z) {
      throw new Error(`Nucleus "${nucleus.id}": protons(${nucleus.protons}) ≠ Z(${nucleus.z})`);
    }
  }

  for (const mol of molecules) {
    // atomCounts konsistent mit atoms-Liste
    const counts = new Map<string, number>();
    for (const a of mol.atoms) {
      counts.set(a.element, (counts.get(a.element) ?? 0) + 1);
      const e = entityById.get(a.element);
      if (!e || e.kind !== 'element') {
        throw new Error(`Molekül "${mol.id}": Atom-Referenz "${a.element}" ist kein Element`);
      }
    }
    for (const [id, wanted] of Object.entries(mol.atomCounts)) {
      const actual = counts.get(id) ?? 0;
      if (actual !== wanted) {
        throw new Error(
          `Molekül "${mol.id}": atomCounts[${id}]=${wanted} passt nicht zur atoms-Liste (${actual})`,
        );
      }
    }
    // Bond-Indizes gültig
    for (const bond of mol.bonds) {
      if (bond.from < 0 || bond.from >= mol.atoms.length) {
        throw new Error(`Molekül "${mol.id}": Bond.from ${bond.from} außerhalb atoms`);
      }
      if (bond.to < 0 || bond.to >= mol.atoms.length) {
        throw new Error(`Molekül "${mol.id}": Bond.to ${bond.to} außerhalb atoms`);
      }
    }
  }
}
