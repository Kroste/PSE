import { elements } from '../content';

/**
 * Bildet die Summenformel in Hill-Notation:
 * C zuerst, H zweitens, dann die restlichen Elemente alphabetisch.
 * Zählen == 1 wird weggelassen (C1H4 → CH4).
 */
export function hillFormula(atomCounts: Record<string, number>): string {
  const keys = Object.keys(atomCounts).filter((k) => atomCounts[k]! > 0);
  keys.sort((a, b) => {
    if (a === 'C') return -1;
    if (b === 'C') return 1;
    if (a === 'H') return -1;
    if (b === 'H') return 1;
    return a.localeCompare(b);
  });
  let out = '';
  for (const k of keys) {
    const n = atomCounts[k]!;
    out += n === 1 ? k : `${k}${n}`;
  }
  return out;
}

const elementMassById = new Map<string, number>(elements.map((e) => [e.id, e.atomicMassU]));

/** Molmasse in g/mol als Summe der atomicMassU aller Atome. */
export function computeMolarMass(atomCounts: Record<string, number>): number {
  let mass = 0;
  for (const [id, n] of Object.entries(atomCounts)) {
    const m = elementMassById.get(id);
    if (m === undefined) continue;
    mass += m * n;
  }
  return Math.round(mass * 1000) / 1000;
}

export type Geometry =
  | 'linear'
  | 'bent'
  | 'trigonal-planar'
  | 'trigonal-pyramidal'
  | 'tetrahedral'
  | 'octahedral';

/**
 * Grobe Geometrie-Heuristik am Zentralatom: das Atom mit den meisten Bindungen
 * bestimmt die Molekülgeometrie. Für einatomige oder rein lineare Ketten fällt
 * die Antwort entsprechend auf linear/tetrahedral zurück.
 */
export function guessGeometry(
  atoms: readonly { element: string }[],
  bonds: readonly { from: number; to: number }[],
): Geometry {
  if (atoms.length <= 1) return 'linear';
  if (atoms.length === 2) return 'linear';
  const degree = new Array<number>(atoms.length).fill(0);
  for (const b of bonds) {
    degree[b.from]!++;
    degree[b.to]!++;
  }
  const maxDeg = Math.max(...degree);
  const centralIdx = degree.indexOf(maxDeg);
  const central = atoms[centralIdx]!.element;
  switch (maxDeg) {
    case 6:
      return 'octahedral';
    case 4:
      return 'tetrahedral';
    case 3:
      // N mit 3 Bindungen ist pyramidal (Ammoniak), C/B/Si trigonal-planar.
      return central === 'N' || central === 'P' ? 'trigonal-pyramidal' : 'trigonal-planar';
    case 2:
      // O mit 2 Bindungen ist gewinkelt (Wasser), C≡O oder C=C=C ist linear.
      return central === 'O' || central === 'S' ? 'bent' : 'linear';
    default:
      return 'linear';
  }
}
