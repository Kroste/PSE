import { describe, expect, it } from 'vitest';
import {
  allEntities,
  assertContentConsistency,
  elements,
  freeSupplyIds,
  getEntity,
  hadrons,
  nuclei,
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

  it('enthält alle Alpha-/CNO-Elemente H..Fe', () => {
    const ids = elements.map((e) => e.id);
    expect(ids).toEqual(expect.arrayContaining(['H', 'He', 'C', 'N', 'O', 'Ne', 'Mg', 'Si', 'Fe']));
  });

  it('Elemente haben Z=Ordnungszahl und passende Periode/Gruppe', () => {
    const check = (id: string, z: number, period: number, group: number | null) => {
      const e = elements.find((x) => x.id === id);
      expect(e, id).toBeDefined();
      expect(e!.z, `${id}.z`).toBe(z);
      expect(e!.period, `${id}.period`).toBe(period);
      expect(e!.group, `${id}.group`).toBe(group);
    };
    check('He', 2, 1, 18);
    check('C', 6, 2, 14);
    check('Fe', 26, 4, 8);
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

  it('freeSupplyIds enthält KEIN Positron (entsteht erst bei Fusion)', () => {
    expect(freeSupplyIds).not.toContain('e+');
  });

  it('enthält Atomkerne für die pp-Kette', () => {
    const ids = nuclei.map((n) => n.id);
    expect(ids).toEqual(expect.arrayContaining(['deuteron', 'triton', 'helion', 'alpha']));
  });

  it('enthält Atomkerne für den Alpha-Prozess bis Eisen', () => {
    const ids = nuclei.map((n) => n.id);
    expect(ids).toEqual(
      expect.arrayContaining(['c12', 'o16', 'ne20', 'mg24', 'si28', 'ni56', 'fe56']),
    );
  });

  it('Fe-56 hat die höchste Bindungsenergie pro Nukleon im Katalog', () => {
    const perNucleon = nuclei.map((n) => ({ id: n.id, bpN: n.bindingEnergyMeV / n.a }));
    const winner = perNucleon.reduce((a, b) => (b.bpN > a.bpN ? b : a));
    expect(winner.id).toBe('fe56');
  });

  it('Ni-56 hat Halbwertszeit (~6 Tage)', () => {
    const ni56 = nuclei.find((n) => n.id === 'ni56');
    expect(ni56?.halfLifeS).toBeDefined();
    expect(ni56!.halfLifeS!).toBeGreaterThan(400000);
    expect(ni56!.halfLifeS!).toBeLessThan(700000);
  });

  it('bei jedem Kern gilt Z = protons und A = protons + neutrons', () => {
    for (const n of nuclei) {
      expect(n.z, `${n.id}.z`).toBe(n.protons);
      expect(n.a, `${n.id}.a`).toBe(n.protons + n.neutrons);
    }
  });

  it('Alpha-Teilchen ist stabiler als alle Wasserstoff-Isotope pro Nukleon', () => {
    const perNucleon = new Map(nuclei.map((n) => [n.id, n.bindingEnergyMeV / n.a]));
    const alpha = perNucleon.get('alpha')!;
    for (const light of ['deuteron', 'triton', 'helion']) {
      expect(alpha, `alpha > ${light}`).toBeGreaterThan(perNucleon.get(light)!);
    }
  });
});
