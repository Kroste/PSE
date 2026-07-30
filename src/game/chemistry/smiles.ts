/**
 * Minimaler SMILES-Parser für den didaktischen Einsatz.
 *
 * Unterstützt:
 * - Uppercase-Atome der organischen Untermenge: C, N, O, S, P, F, Cl, Br, I, H
 * - Bindungssymbole: `-` (einfach, default), `=` (doppelt), `#` (dreifach)
 * - Verzweigungen mit `(...)`
 * - Ringschlüsse mit einer Ziffer (1–9), z. B. C1CCCCC1
 * - Implizite Wasserstoffe für die organische Untermenge (Valenz-basiert):
 *   C=4, N=3, O=2, S=2, P=3, F/Cl/Br/I=1
 *
 * NICHT unterstützt (bewusst weggelassen):
 * - Aromatische Kleinschreibung (c1ccccc1) — bitte Kekulé-Form nutzen
 *   (`C1=CC=CC=C1` für Benzol).
 * - Ladungen, Isotope, Stereochemie ([C@H], /, \\).
 * - Bracketed Atoms `[Si]`, `[NH4+]`.
 * - Zweistellige Ringschlüsse `%12`.
 *
 * Diese Einschränkungen sind für Schul-/Uni-Zwecke unkritisch — komplexe
 * Fälle deckt der JSON-Editor ab.
 */

export type ParsedMolecule = {
  atoms: string[];
  bonds: { from: number; to: number; order: number }[];
};

const ORGANIC_VALENCE: Record<string, number> = {
  C: 4,
  N: 3,
  O: 2,
  S: 2,
  P: 3,
  F: 1,
  Cl: 1,
  Br: 1,
  I: 1,
  H: 1,
};

// Zwei-Buchstaben-Symbole müssen vor den ein-Buchstaben-Symbolen geprüft werden.
const TWO_CHAR_SYMBOLS = ['Cl', 'Br'];
const ONE_CHAR_SYMBOLS = ['C', 'N', 'O', 'S', 'P', 'F', 'I', 'H'];

export function parseSmiles(input: string): ParsedMolecule {
  const src = input.trim();
  if (src.length === 0) throw new Error('SMILES ist leer.');

  const atoms: string[] = [];
  const bonds: { from: number; to: number; order: number }[] = [];
  const rings = new Map<number, { atomIndex: number; pendingOrder: number }>();
  const branchStack: number[] = [];
  let lastAtom = -1;
  let pendingBondOrder = 1;
  let i = 0;

  while (i < src.length) {
    const ch = src[i]!;

    // Bindungsordnung merken für die nächste Verbindung
    if (ch === '-') {
      pendingBondOrder = 1;
      i++;
      continue;
    }
    if (ch === '=') {
      pendingBondOrder = 2;
      i++;
      continue;
    }
    if (ch === '#') {
      pendingBondOrder = 3;
      i++;
      continue;
    }

    // Verzweigung öffnen: aktuelles Atom als Rückkehrpunkt merken
    if (ch === '(') {
      if (lastAtom < 0) throw new Error(`'(' ohne vorheriges Atom an Position ${i}.`);
      branchStack.push(lastAtom);
      i++;
      continue;
    }
    // Verzweigung schließen: zurück zum Rückkehrpunkt
    if (ch === ')') {
      const back = branchStack.pop();
      if (back === undefined) throw new Error(`')' ohne passendes '(' an Position ${i}.`);
      lastAtom = back;
      pendingBondOrder = 1;
      i++;
      continue;
    }

    // Ringschluss: ein-stellige Ziffer, verweist auf die Öffnung.
    if (ch >= '0' && ch <= '9') {
      const ringId = Number(ch);
      const opened = rings.get(ringId);
      if (opened) {
        // Ring schließen: Bindung zurück zum ursprünglichen Atom.
        const order = Math.max(opened.pendingOrder, pendingBondOrder);
        bonds.push({ from: opened.atomIndex, to: lastAtom, order });
        rings.delete(ringId);
      } else {
        if (lastAtom < 0)
          throw new Error(`Ringschluss ${ringId} ohne vorheriges Atom an Position ${i}.`);
        rings.set(ringId, { atomIndex: lastAtom, pendingOrder: pendingBondOrder });
      }
      pendingBondOrder = 1;
      i++;
      continue;
    }

    // Atom: erst 2-Zeichen, dann 1-Zeichen matchen.
    const twoChar = src.slice(i, i + 2);
    const oneChar = ch;
    let symbol: string | null = null;
    if (TWO_CHAR_SYMBOLS.includes(twoChar)) {
      symbol = twoChar;
      i += 2;
    } else if (ONE_CHAR_SYMBOLS.includes(oneChar)) {
      symbol = oneChar;
      i++;
    } else {
      throw new Error(
        `Unbekanntes Zeichen "${ch}" an Position ${i}. Unterstützt: C N O S P F Cl Br I H, Bindungen = # -, Verzweigungen ( ), Ringschlüsse 1–9.`,
      );
    }

    const newAtomIdx = atoms.length;
    atoms.push(symbol);
    if (lastAtom >= 0) {
      bonds.push({ from: lastAtom, to: newAtomIdx, order: pendingBondOrder });
    }
    lastAtom = newAtomIdx;
    pendingBondOrder = 1;
  }

  if (branchStack.length > 0) throw new Error(`Nicht geschlossene Verzweigung ('(').`);
  if (rings.size > 0) {
    const open = [...rings.keys()].join(', ');
    throw new Error(`Nicht geschlossener Ringschluss: ${open}.`);
  }

  // Implizite Wasserstoffe für die organische Untermenge auffüllen.
  return addImplicitHydrogens({ atoms, bonds });
}

function addImplicitHydrogens(mol: ParsedMolecule): ParsedMolecule {
  const atoms = [...mol.atoms];
  const bonds = [...mol.bonds];
  const explicitBondSum = new Array<number>(atoms.length).fill(0);
  for (const b of bonds) {
    explicitBondSum[b.from]! += b.order;
    explicitBondSum[b.to]! += b.order;
  }
  const originalLength = atoms.length;
  for (let i = 0; i < originalLength; i++) {
    const element = atoms[i]!;
    const valence = ORGANIC_VALENCE[element];
    if (valence === undefined) continue; // Wasserstoff wird nicht ergänzt
    if (element === 'H') continue;
    const needed = valence - explicitBondSum[i]!;
    for (let h = 0; h < needed; h++) {
      const hIdx = atoms.length;
      atoms.push('H');
      bonds.push({ from: i, to: hIdx, order: 1 });
    }
  }
  return { atoms, bonds };
}

export function countAtoms(mol: ParsedMolecule): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const a of mol.atoms) counts[a] = (counts[a] ?? 0) + 1;
  return counts;
}
