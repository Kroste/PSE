import { describe, expect, it } from 'vitest';
import { molecules, recipes, getEntity } from '../src/game/content';
import { matchRecipe } from '../src/game/physics/recipes';

describe('molecule catalog', () => {
  it('enthält die M5-Startmoleküle', () => {
    const ids = molecules.map((m) => m.id);
    expect(ids).toEqual(expect.arrayContaining(['H2', 'O2', 'N2', 'H2O', 'NH3', 'CH4', 'CO2']));
  });

  it('atomCounts konsistent mit atoms-Liste', () => {
    for (const m of molecules) {
      const counted: Record<string, number> = {};
      for (const a of m.atoms) counted[a.element] = (counted[a.element] ?? 0) + 1;
      for (const [id, wanted] of Object.entries(m.atomCounts)) {
        expect(counted[id] ?? 0, `${m.id}.${id}`).toBe(wanted);
      }
    }
  });

  it('alle referenzierten Atome sind gültige Elemente', () => {
    for (const m of molecules) {
      for (const a of m.atoms) {
        const e = getEntity(a.element);
        expect(e, `${m.id}: ${a.element}`).toBeDefined();
        expect(e!.kind).toBe('element');
      }
    }
  });

  it('Bond-Indizes liegen innerhalb der atoms-Liste', () => {
    for (const m of molecules) {
      for (const b of m.bonds) {
        expect(b.from).toBeGreaterThanOrEqual(0);
        expect(b.from).toBeLessThan(m.atoms.length);
        expect(b.to).toBeGreaterThanOrEqual(0);
        expect(b.to).toBeLessThan(m.atoms.length);
        expect([1, 2, 3]).toContain(b.order);
      }
    }
  });

  it('H₂O hat Bindungswinkel-typische Geometrie (bent, 2 H + 1 O)', () => {
    const h2o = molecules.find((m) => m.id === 'H2O')!;
    expect(h2o.geometry).toBe('bent');
    expect(h2o.atomCounts).toEqual({ H: 2, O: 1 });
    expect(h2o.bonds).toHaveLength(2);
  });

  it('N₂ hat eine Dreifachbindung', () => {
    const n2 = molecules.find((m) => m.id === 'N2')!;
    expect(n2.bonds).toHaveLength(1);
    expect(n2.bonds[0]!.order).toBe(3);
  });
});

describe('chem-lab recipes', () => {
  it('synth-water matched 2·H + O', () => {
    const r = matchRecipe({ H: 2, O: 1 }, 'chem-lab');
    expect(r?.id).toBe('synth-water');
    expect(r?.outputs).toEqual({ H2O: 1 });
  });

  it('synth-methane matched C + 4·H', () => {
    const r = matchRecipe({ C: 1, H: 4 }, 'chem-lab');
    expect(r?.id).toBe('synth-methane');
    expect(r?.outputs).toEqual({ CH4: 1 });
  });

  it('bond-n2 matched 2·N', () => {
    const r = matchRecipe({ N: 2 }, 'chem-lab');
    expect(r?.id).toBe('bond-n2');
  });

  it('alle 7 Chem-Rezepte existieren', () => {
    const chemIds = recipes.filter((r) => r.reactor === 'chem-lab').map((r) => r.id);
    expect(chemIds).toEqual(
      expect.arrayContaining([
        'bond-h2',
        'bond-o2',
        'bond-n2',
        'synth-water',
        'synth-ammonia',
        'synth-methane',
        'synth-co2',
      ]),
    );
  });

  it('assemble-hydrogen schaltet chem-lab (und stellar-core) frei', () => {
    const r = recipes.find((x) => x.id === 'assemble-hydrogen');
    expect(r?.unlocksReactors).toEqual(expect.arrayContaining(['stellar-core', 'chem-lab']));
  });
});
