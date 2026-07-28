import { describe, expect, it } from 'vitest';
import {
  allEntities,
  assertContentConsistency,
  elements,
  freeSupplyIds,
  getEntity,
  hadrons,
  particles,
  recipes,
} from '../src/game/content';

describe('content catalog', () => {
  it('assertContentConsistency wirft nicht', () => {
    expect(() => assertContentConsistency()).not.toThrow();
  });

  it('enthält die erwarteten Elementarteilchen', () => {
    const ids = particles.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(['u', 'd', 'e-', 'gamma', 'g']));
  });

  it('enthält Proton und Neutron mit korrekten Quark-Compositions', () => {
    const proton = hadrons.find((h) => h.id === 'proton');
    const neutron = hadrons.find((h) => h.id === 'neutron');
    expect(proton?.quarks.sort()).toEqual(['d', 'u', 'u']);
    expect(neutron?.quarks.sort()).toEqual(['d', 'd', 'u']);
    expect(proton?.charge).toBe(1);
    expect(neutron?.charge).toBe(0);
  });

  it('enthält Wasserstoff mit Z=1 und 1s1', () => {
    const h = elements.find((e) => e.id === 'H');
    expect(h?.z).toBe(1);
    expect(h?.electronConfig).toBe('1s1');
  });

  it('alle IDs sind global eindeutig', () => {
    const ids = allEntities.map((e) => e.id);
    const set = new Set(ids);
    expect(set.size).toBe(ids.length);
  });

  it('jede Entity hat eine Wissenschaftsnotiz und eine Quelle', () => {
    for (const entity of allEntities) {
      expect(entity.scienceNoteDE.length, `note for ${entity.id}`).toBeGreaterThan(20);
      expect(entity.source.length, `source for ${entity.id}`).toBeGreaterThan(3);
    }
  });

  it('jedes Rezept referenziert existierende Zutaten und Produkte', () => {
    for (const recipe of recipes) {
      for (const id of Object.keys(recipe.inputs)) expect(getEntity(id), id).toBeDefined();
      for (const id of Object.keys(recipe.outputs)) expect(getEntity(id), id).toBeDefined();
    }
  });

  it('freeSupplyIds enthält alle als freeSupply markierten Teilchen', () => {
    expect(freeSupplyIds).toEqual(expect.arrayContaining(['u', 'd', 'e-', 'gamma', 'g']));
  });
});
