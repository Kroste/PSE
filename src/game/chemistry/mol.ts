/**
 * Minimaler MOL/SDF-Parser (V2000-Format) — für den Import von Molekülen
 * aus PubChem, ChemDraw, RDKit u. ä. Chemiker-Tools.
 *
 * Format-Referenz: https://en.wikipedia.org/wiki/Chemical_table_file
 *
 * Aufbau einer .mol-Datei (V2000):
 *   Zeile 1: Titel (frei)
 *   Zeile 2: Programm-Info (frei)
 *   Zeile 3: Kommentar (frei)
 *   Zeile 4: Counts-Zeile: "%3d%3d..." → natoms, nbonds
 *   Nächste natoms Zeilen: Atom-Block
 *     Spalten 0-10   x-Koord (float, fixe Breite)
 *     Spalten 10-20  y-Koord
 *     Spalten 20-30  z-Koord
 *     Spalten 31-34  Element-Symbol (linksbündig)
 *   Nächste nbonds Zeilen: Bond-Block
 *     Spalten 0-3    from (1-basierter Atom-Index)
 *     Spalten 3-6    to   (1-basierter Atom-Index)
 *     Spalten 6-9    Bindungsordnung (1, 2, 3; 4 = aromatisch → wird 1)
 *
 * SDF ist praktisch identisch, kann aber mehrere Moleküle enthalten
 * (getrennt durch "$$$$"). Wir lesen nur das erste.
 *
 * NICHT unterstützt (bewusst): V3000-Erweiterung, M-Zeilen (Ladungen,
 * Isotope), Stereochemie-Marker. Für Educational-Content ausreichend.
 */

export type MolAtom = { element: string; position: [number, number, number] };
export type MolBond = { from: number; to: number; order: number };

export type ParsedMolFile = {
  /** Titel aus Zeile 1, falls vorhanden — brauchbar als Molekül-Name. */
  title: string;
  atoms: MolAtom[];
  bonds: MolBond[];
};

export function parseMolFile(input: string): ParsedMolFile {
  const text = input.replace(/\r\n/g, '\n');
  // Bei SDF-Dateien: nur das erste Molekül bis "$$$$".
  const molBlock = text.split(/^\$\$\$\$/m)[0] ?? text;
  const lines = molBlock.split('\n');
  if (lines.length < 4) {
    throw new Error(`Datei zu kurz — MOL braucht mindestens 4 Zeilen (Header + Counts).`);
  }

  const title = lines[0]!.trim();
  const countsLine = lines[3]!;
  const natoms = parseInt(countsLine.substring(0, 3), 10);
  const nbonds = parseInt(countsLine.substring(3, 6), 10);
  if (!Number.isFinite(natoms) || !Number.isFinite(nbonds) || natoms < 1) {
    throw new Error(
      `Counts-Zeile (Zeile 4) unlesbar: "${countsLine.trim()}". Erwartet: "natoms nbonds ...".`,
    );
  }
  if (lines.length < 4 + natoms + nbonds) {
    throw new Error(
      `Datei zu kurz für ${natoms} Atome + ${nbonds} Bindungen. Vielleicht abgeschnitten?`,
    );
  }

  const atoms: MolAtom[] = [];
  for (let i = 0; i < natoms; i++) {
    const line = lines[4 + i]!;
    if (line.length < 34) {
      throw new Error(`Atom-Zeile ${4 + i + 1} zu kurz (${line.length} Zeichen).`);
    }
    const x = parseFloat(line.substring(0, 10));
    const y = parseFloat(line.substring(10, 20));
    const z = parseFloat(line.substring(20, 30));
    // Symbol steht in Spalten 31-34, kann 1-3 Zeichen sein, mit Leerzeichen aufgefüllt.
    const symbol = line.substring(31, 34).trim();
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      throw new Error(`Atom ${i + 1}: Koordinaten unlesbar ("${line}").`);
    }
    if (symbol.length === 0) {
      throw new Error(`Atom ${i + 1}: kein Element-Symbol gefunden.`);
    }
    atoms.push({ element: symbol, position: [round3(x), round3(y), round3(z)] });
  }

  const bonds: MolBond[] = [];
  for (let i = 0; i < nbonds; i++) {
    const line = lines[4 + natoms + i]!;
    if (line.length < 9) {
      throw new Error(`Bindungs-Zeile ${4 + natoms + i + 1} zu kurz.`);
    }
    const from1 = parseInt(line.substring(0, 3), 10);
    const to1 = parseInt(line.substring(3, 6), 10);
    let order = parseInt(line.substring(6, 9), 10);
    if (!Number.isFinite(from1) || !Number.isFinite(to1) || !Number.isFinite(order)) {
      throw new Error(`Bindung ${i + 1}: unlesbare Indizes ("${line}").`);
    }
    if (from1 < 1 || from1 > natoms || to1 < 1 || to1 > natoms) {
      throw new Error(
        `Bindung ${i + 1}: Atom-Index außerhalb 1..${natoms} (from=${from1}, to=${to1}).`,
      );
    }
    // MOL-Bindungsordnungen: 1=einfach, 2=doppelt, 3=dreifach, 4=aromatisch,
    // 5-8=varianten. Aromatisch mappen wir auf 1 (Kekulé-Darstellung fehlt hier).
    if (order === 4) order = 1;
    if (order < 1 || order > 3) {
      throw new Error(`Bindung ${i + 1}: Bindungsordnung ${order} nicht unterstützt (1-4 erlaubt).`);
    }
    bonds.push({ from: from1 - 1, to: to1 - 1, order });
  }

  return { title, atoms, bonds };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
