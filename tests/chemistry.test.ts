import { describe, expect, it } from 'vitest';
import { hillFormula, computeMolarMass, guessGeometry } from '../src/game/chemistry/formula';
import { parseSmiles, countAtoms } from '../src/game/chemistry/smiles';
import { layoutMolecule3D } from '../src/game/chemistry/layout';
import { parseMolFile } from '../src/game/chemistry/mol';
import { MECHANISMS, getMechanism } from '../src/game/chemistry/mechanisms';
import { writeMolFile } from '../src/game/chemistry/mol-writer';
import type { MoleculeEntity } from '../src/game/content/types';

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

describe('parseMolFile', () => {
  // Echte Ethanol-MOL-Datei (V2000) im PubChem-Format
  const ETHANOL_MOL = `Ethanol
  Marvin  01011600002D

  9  8  0  0  0  0            999 V2000
   -0.6250    0.3750    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.0895    0.7875    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.8040    0.3750    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
    1.5185    0.7875    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
   -1.3395    0.7875    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
   -0.6250   -0.4500    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
   -0.6250    0.3750    0.8250 H   0  0  0  0  0  0  0  0  0  0  0  0
    0.0895    1.6125    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
    0.0895    0.7875   -0.8250 H   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  2  3  1  0  0  0  0
  3  4  1  0  0  0  0
  1  5  1  0  0  0  0
  1  6  1  0  0  0  0
  1  7  1  0  0  0  0
  2  8  1  0  0  0  0
  2  9  1  0  0  0  0
M  END`;

  it('parst Titel + Atome + Bindungen aus Ethanol-MOL', () => {
    const mol = parseMolFile(ETHANOL_MOL);
    expect(mol.title).toBe('Ethanol');
    expect(mol.atoms).toHaveLength(9);
    expect(mol.bonds).toHaveLength(8);
    // C-C-O-H-Rückgrat + 6 H
    const symCounts: Record<string, number> = {};
    for (const a of mol.atoms) symCounts[a.element] = (symCounts[a.element] ?? 0) + 1;
    expect(symCounts).toEqual({ C: 2, O: 1, H: 6 });
  });

  it('konvertiert 1-basierte Bindungs-Indizes zu 0-basiert', () => {
    const mol = parseMolFile(ETHANOL_MOL);
    // Erste Bindung: MOL sagt "1 2 1" → 0-basiert from=0, to=1
    expect(mol.bonds[0]).toEqual({ from: 0, to: 1, order: 1 });
  });

  it('liest 3D-Koordinaten korrekt', () => {
    const mol = parseMolFile(ETHANOL_MOL);
    expect(mol.atoms[0]!.position[0]).toBeCloseTo(-0.625, 3);
    expect(mol.atoms[0]!.position[1]).toBeCloseTo(0.375, 3);
    expect(mol.atoms[2]!.element).toBe('O');
  });

  it('behandelt SDF-Datei (mehrere Moleküle) und nimmt das erste', () => {
    const sdf = ETHANOL_MOL + '\n$$$$\n' + ETHANOL_MOL;
    const mol = parseMolFile(sdf);
    expect(mol.title).toBe('Ethanol');
    expect(mol.atoms).toHaveLength(9);
  });

  it('mappt aromatische Bindungen (Ordnung 4) auf Einfachbindung', () => {
    const benzenePartial = `benzene
  test

  2  1  0  0  0  0            999 V2000
    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.5000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  4  0  0  0  0
M  END`;
    const mol = parseMolFile(benzenePartial);
    expect(mol.bonds[0]!.order).toBe(1);
  });

  it('wirft bei zu kurzer Datei', () => {
    expect(() => parseMolFile('nur\nzwei\nzeilen')).toThrow(/zu kurz/);
  });

  it('wirft bei unlesbarer Counts-Zeile', () => {
    const bad = `title\nprog\ncomment\ngarbage-line\n`;
    expect(() => parseMolFile(bad)).toThrow(/Counts-Zeile/);
  });

  it('wirft bei Bindungs-Index außerhalb des Atom-Bereichs', () => {
    const bad = `test
  x

  2  1  0  0  0  0            999 V2000
    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.5000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
  1  5  1  0  0  0  0
M  END`;
    expect(() => parseMolFile(bad)).toThrow(/außerhalb/);
  });
});

describe('MECHANISMS', () => {
  it('enthält alle klassischen Mechanismen', () => {
    const ids = MECHANISMS.map((m) => m.id);
    expect(ids).toEqual(
      expect.arrayContaining(['sn2', 'sn1', 'addition-hbr-ethen', 'esterification', 'aldol', 'radikal-polymerisation']),
    );
  });

  it('jeder Mechanismus hat mindestens 2 Schritte', () => {
    for (const m of MECHANISMS) {
      expect(m.steps.length, m.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('jeder Schritt hat before/after/electronFlow', () => {
    for (const m of MECHANISMS) {
      for (const [i, s] of m.steps.entries()) {
        expect(s.titleDE, `${m.id}[${i}].titleDE`).toBeTruthy();
        expect(s.before, `${m.id}[${i}].before`).toBeTruthy();
        expect(s.after, `${m.id}[${i}].after`).toBeTruthy();
        expect(s.electronFlowDE, `${m.id}[${i}].electronFlowDE`).toBeTruthy();
      }
    }
  });

  it('IDs sind global eindeutig', () => {
    const ids = MECHANISMS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getMechanism findet by id', () => {
    expect(getMechanism('sn2')?.nameDE).toContain('SN2');
    expect(getMechanism('does-not-exist')).toBeUndefined();
  });
});

describe('writeMolFile', () => {
  const waterMol: MoleculeEntity = {
    id: 'H2O_test',
    kind: 'molecule',
    nameDE: 'Wasser',
    symbol: 'H₂O',
    formula: 'H2O',
    atomCounts: { H: 2, O: 1 },
    atoms: [
      { element: 'O', position: [0, 0, 0] },
      { element: 'H', position: [0.958, 0, 0] },
      { element: 'H', position: [-0.24, 0.927, 0] },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 },
      { from: 0, to: 2, order: 1 },
    ],
    geometry: 'bent',
    molarMassGmol: 18.015,
    categoryDE: 'Test',
    color: '#ffffff',
    scienceNoteDE: 'Test-Wassermolekül.',
    source: 'test',
  } as MoleculeEntity;

  it('erzeugt V2000-Header mit Titel und Counts-Zeile', () => {
    const out = writeMolFile(waterMol);
    const lines = out.split('\n');
    expect(lines[0]).toBe('Wasser');
    expect(lines[3]).toMatch(/^\s{2}3\s{2}2\s{2}0/);
    expect(lines[3]).toContain('V2000');
  });

  it('endet mit M END', () => {
    const out = writeMolFile(waterMol);
    expect(out.trim().endsWith('M  END')).toBe(true);
  });

  it('Atom-Block hat 10-Zeichen-Fixe-Breite für Koordinaten', () => {
    const out = writeMolFile(waterMol);
    const lines = out.split('\n');
    // Zeile 5 = erstes Atom (Zeile 4 ist Counts)
    const atomLine = lines[4]!;
    expect(atomLine.substring(0, 10)).toBe('    0.0000');
    expect(atomLine.substring(10, 20)).toBe('    0.0000');
    expect(atomLine.substring(20, 30)).toBe('    0.0000');
    expect(atomLine.substring(31, 34).trimEnd()).toBe('O');
  });

  it('Bond-Block nutzt 1-basierte Indizes', () => {
    const out = writeMolFile(waterMol);
    const lines = out.split('\n');
    // Zeile 7 = 4 (counts) + 3 (atoms) = erste Bindung
    const bondLine = lines[7]!;
    expect(bondLine.substring(0, 3)).toBe('  1');
    expect(bondLine.substring(3, 6)).toBe('  2');
    expect(bondLine.substring(6, 9)).toBe('  1');
  });

  it('Roundtrip mit parseMolFile stellt Struktur wieder her', async () => {
    const { parseMolFile } = await import('../src/game/chemistry/mol');
    const written = writeMolFile(waterMol);
    const parsed = parseMolFile(written);
    expect(parsed.atoms).toHaveLength(3);
    expect(parsed.bonds).toHaveLength(2);
    expect(parsed.atoms[0]!.element).toBe('O');
    expect(parsed.atoms[1]!.position[0]).toBeCloseTo(0.958, 3);
    expect(parsed.bonds[0]).toEqual({ from: 0, to: 1, order: 1 });
  });
});
