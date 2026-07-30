import type { MoleculeEntity } from '../content/types';

/**
 * Serialisiert ein MoleculeEntity zurück in V2000-MOL-Format (kompatibel
 * mit PubChem, ChemDraw, RDKit …). Umgekehrter Weg zum Parser in `mol.ts`.
 *
 * Format-Referenz: https://en.wikipedia.org/wiki/Chemical_table_file
 * Fixe Spaltenbreiten müssen exakt eingehalten werden, sonst kippen
 * Empfänger-Tools um.
 */
export function writeMolFile(molecule: MoleculeEntity): string {
  const lines: string[] = [];

  // Zeile 1: Titel — max. 80 Zeichen
  lines.push(molecule.nameDE.slice(0, 80));
  // Zeile 2: Programm-Info — MDL-typisches Format ist "  PROG    ddmmyyhhmm2D"
  //   Wir setzen "  PSE     " + ISO-Datum-Kurzform, plus "3D" (wir haben 3D-Koord).
  const now = new Date();
  const dateStamp =
    pad2(now.getMonth() + 1) +
    pad2(now.getDate()) +
    String(now.getFullYear() % 100).padStart(2, '0') +
    pad2(now.getHours()) +
    pad2(now.getMinutes());
  lines.push(`  PSE     ${dateStamp}3D`);
  // Zeile 3: Kommentar (frei)
  lines.push(molecule.scienceNoteDE ? molecule.scienceNoteDE.slice(0, 80) : '');

  // Zeile 4: Counts-Zeile — fest formatiert
  //   %3d atoms, %3d bonds, dann Nullen und "  0999 V2000"
  const nAtoms = molecule.atoms.length;
  const nBonds = molecule.bonds.length;
  lines.push(
    fmt3(nAtoms) +
      fmt3(nBonds) +
      '  0  0  0  0  0  0  0  0999 V2000',
  );

  // Atom-Block: für jedes Atom eine Zeile mit x/y/z (jeweils 10 Zeichen
  // Fixed-Width, rechtsbündig, 4 Nachkommastellen) + Element-Symbol
  // (3 Zeichen breit ab Spalte 31) + 12x "  0" für die Meta-Felder.
  for (const a of molecule.atoms) {
    const [x, y, z] = a.position;
    lines.push(
      fmt10f(x) +
        fmt10f(y) +
        fmt10f(z) +
        ' ' +
        a.element.padEnd(3, ' ') +
        ' 0  0  0  0  0  0  0  0  0  0  0  0',
    );
  }

  // Bond-Block: from(1-based), to(1-based), order — je 3 Zeichen breit
  //   plus 4x "  0" für Stereo etc.
  for (const b of molecule.bonds) {
    lines.push(fmt3(b.from + 1) + fmt3(b.to + 1) + fmt3(b.order) + '  0  0  0  0');
  }

  // Terminator
  lines.push('M  END');

  return lines.join('\n') + '\n';
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function fmt3(n: number): string {
  return String(n).padStart(3, ' ');
}

/**
 * 10 Zeichen breit, 4 Nachkommastellen, rechtsbündig — exakt so wie in
 * MDL-MOL-Dateien. Beispiel: -0.6250 → "   -0.6250".
 */
function fmt10f(n: number): string {
  return n.toFixed(4).padStart(10, ' ');
}
