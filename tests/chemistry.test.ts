import { describe, expect, it } from 'vitest';
import { hillFormula, computeMolarMass, guessGeometry } from '../src/game/chemistry/formula';
import { parseSmiles, countAtoms } from '../src/game/chemistry/smiles';
import { layoutMolecule3D } from '../src/game/chemistry/layout';

describe('hillFormula', () => {
  it('gibt C zuerst, dann H, dann Rest alphabetisch aus', () => {
    expect(hillFormula({ C: 2, H: 6, O: 1 })).toBe('C2H6O');
    expect(hillFormula({ O: 1, H: 2 })).toBe('H2O');
    expect(hillFormula({ N: 1, H: 3 })).toBe('H3N');
    expect(hillFormula({ H: 1, Cl: 1 })).toBe('HCl');
    expect(hillFormula({ Na: 2, C: 1, O: 3 })).toBe('CNa2O3');
  });

  it('lässt Zählwert 1 weg', () => {
    expect(hillFormula({ C: 1, H: 4 })).toBe('CH4');
    expect(hillFormula({ H: 1, C: 1, N: 1 })).toBe('CHN');
  });

  it('ignoriert Nullen', () => {
    expect(hillFormula({ C: 2, H: 6, O: 0 })).toBe('C2H6');
  });
});

describe('computeMolarMass', () => {
  it('summiert atomicMassU', () => {
    // H2O = 2 * 1.008 + 15.999 = 18.015
    expect(computeMolarMass({ H: 2, O: 1 })).toBeCloseTo(18.015, 2);
    // Ethanol C2H6O
    expect(computeMolarMass({ C: 2, H: 6, O: 1 })).toBeCloseTo(46.069, 1);
  });
});

describe('guessGeometry', () => {
  it('erkennt Tetraeder (4 Bindungen am Zentralatom)', () => {
    // CH4
    const geo = guessGeometry(
      [{ element: 'C' }, { element: 'H' }, { element: 'H' }, { element: 'H' }, { element: 'H' }],
      [
        { from: 0, to: 1 },
        { from: 0, to: 2 },
        { from: 0, to: 3 },
        { from: 0, to: 4 },
      ],
    );
    expect(geo).toBe('tetrahedral');
  });

  it('erkennt gewinkelt für Wasser (2 Bindungen an O)', () => {
    const geo = guessGeometry(
      [{ element: 'O' }, { element: 'H' }, { element: 'H' }],
      [
        { from: 0, to: 1 },
        { from: 0, to: 2 },
      ],
    );
    expect(geo).toBe('bent');
  });

  it('erkennt trigonal-pyramidal für Ammoniak (3 Bindungen an N)', () => {
    const geo = guessGeometry(
      [{ element: 'N' }, { element: 'H' }, { element: 'H' }, { element: 'H' }],
      [
        { from: 0, to: 1 },
        { from: 0, to: 2 },
        { from: 0, to: 3 },
      ],
    );
    expect(geo).toBe('trigonal-pyramidal');
  });

  it('linear für 2-atomige Moleküle', () => {
    expect(guessGeometry([{ element: 'H' }, { element: 'H' }], [{ from: 0, to: 1 }])).toBe(
      'linear',
    );
  });
});

describe('parseSmiles', () => {
  it('parst Ethanol CCO', () => {
    const mol = parseSmiles('CCO');
    expect(mol.atoms.filter((a) => a === 'C')).toHaveLength(2);
    expect(mol.atoms.filter((a) => a === 'O')).toHaveLength(1);
    expect(mol.atoms.filter((a) => a === 'H')).toHaveLength(6);
    expect(countAtoms(mol)).toEqual({ C: 2, H: 6, O: 1 });
  });

  it('parst Methan C', () => {
    const mol = parseSmiles('C');
    expect(countAtoms(mol)).toEqual({ C: 1, H: 4 });
  });

  it('parst Wasser O', () => {
    const mol = parseSmiles('O');
    expect(countAtoms(mol)).toEqual({ H: 2, O: 1 });
  });

  it('parst Essigsäure CC(=O)O', () => {
    const mol = parseSmiles('CC(=O)O');
    expect(countAtoms(mol)).toEqual({ C: 2, H: 4, O: 2 });
    // Doppelbindung C=O muss existieren
    expect(mol.bonds.some((b) => b.order === 2)).toBe(true);
  });

  it('parst Stickstoff-Molekül N#N (Dreifachbindung)', () => {
    const mol = parseSmiles('N#N');
    expect(countAtoms(mol)).toEqual({ N: 2 });
    expect(mol.bonds).toHaveLength(1);
    expect(mol.bonds[0]!.order).toBe(3);
  });

  it('parst Cyclohexan C1CCCCC1', () => {
    const mol = parseSmiles('C1CCCCC1');
    expect(countAtoms(mol)).toEqual({ C: 6, H: 12 });
    // 6 C-C-Ringbindungen + 12 C-H
    expect(mol.bonds).toHaveLength(18);
  });

  it('parst Benzol in Kekulé-Form C1=CC=CC=C1', () => {
    const mol = parseSmiles('C1=CC=CC=C1');
    expect(countAtoms(mol)).toEqual({ C: 6, H: 6 });
  });

  it('parst Halogene mit 2-Zeichen-Symbolen', () => {
    const mol = parseSmiles('CCl');
    expect(countAtoms(mol)).toEqual({ C: 1, H: 3, Cl: 1 });
  });

  it('wirft bei unbekanntem Zeichen', () => {
    expect(() => parseSmiles('CXO')).toThrow();
  });

  it('wirft bei nicht geschlossener Verzweigung', () => {
    expect(() => parseSmiles('C(C')).toThrow();
  });

  it('wirft bei nicht geschlossenem Ring', () => {
    expect(() => parseSmiles('C1CC')).toThrow();
  });

  it('parst tert-Butanol CC(C)(C)O', () => {
    const mol = parseSmiles('CC(C)(C)O');
    expect(countAtoms(mol)).toEqual({ C: 4, H: 10, O: 1 });
  });
});

describe('layoutMolecule3D', () => {
  it('gibt eine Position pro Atom zurück', () => {
    const positions = layoutMolecule3D(3, [
      { from: 0, to: 1, order: 1 },
      { from: 1, to: 2, order: 1 },
    ]);
    expect(positions).toHaveLength(3);
    for (const p of positions) {
      expect(p).toHaveLength(3);
      for (const v of p) expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('einzelnes Atom bei Ursprung', () => {
    expect(layoutMolecule3D(1, [])).toEqual([[0, 0, 0]]);
  });

  it('leere Eingabe = leere Ausgabe', () => {
    expect(layoutMolecule3D(0, [])).toEqual([]);
  });

  it('gebundene Atome landen nahe Ideallänge 1.5', () => {
    // Zweiatomig sollte sich klar auf ~1.5 einpendeln
    const pos = layoutMolecule3D(2, [{ from: 0, to: 1, order: 1 }]);
    const dx = pos[0]![0] - pos[1]![0];
    const dy = pos[0]![1] - pos[1]![1];
    const dz = pos[0]![2] - pos[1]![2];
    const d = Math.hypot(dx, dy, dz);
    expect(d).toBeGreaterThan(1.2);
    expect(d).toBeLessThan(1.8);
  });
});
