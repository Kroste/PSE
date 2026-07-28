import particlesRaw from './particles.json';
import hadronsRaw from './hadrons.json';
import nucleiRaw from './nuclei.json';
import elementsRaw from './elements.json';
import recipesRaw from './recipes.json';
import type {
  Entity,
  EntityId,
  ParticleEntity,
  HadronEntity,
  NucleusEntity,
  ElementEntity,
  Recipe,
} from './types';

export const particles: readonly ParticleEntity[] = particlesRaw as unknown as ParticleEntity[];
export const hadrons: readonly HadronEntity[] = hadronsRaw as unknown as HadronEntity[];
export const nuclei: readonly NucleusEntity[] = nucleiRaw as unknown as NucleusEntity[];
export const elements: readonly ElementEntity[] = elementsRaw as unknown as ElementEntity[];
export const recipes: readonly Recipe[] = recipesRaw as unknown as Recipe[];

export const allEntities: readonly Entity[] = [
  ...particles,
  ...hadrons,
  ...nuclei,
  ...elements,
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
}
