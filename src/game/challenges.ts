import type { GameState } from './state/store';
import { elements, molecules } from './content';

export type ChallengeCategory =
  | 'Einstieg'
  | 'Kernphysik'
  | 'Chemie'
  | 'Biochemie'
  | 'Silikone'
  | 'Master';

export type Challenge = {
  id: string;
  titleDE: string;
  descriptionDE: string;
  category: ChallengeCategory;
  /** Prüft, ob der Spieler die Aufgabe erfüllt hat. */
  check: (state: GameState) => boolean;
  /** Fortschritt in [0, 1] für die Progress-Bar (optional, sonst 0/1). */
  progress?: (state: GameState) => number;
  /** Konkreter Hinweis, wie es weitergeht. */
  hintDE: string;
};

function has(state: GameState, id: string): boolean {
  return state.discovered.includes(id);
}

function countDiscovered(state: GameState, ids: readonly string[]): number {
  return ids.filter((id) => state.discovered.includes(id)).length;
}

const NOBLE_GASES = ['He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn', 'Og'];
const DNA_BASES = ['adenin', 'thymin', 'guanin', 'cytosin'];
const RNA_BASES = ['adenin', 'uracil', 'guanin', 'cytosin'];
const AMINO_ACIDS_9 = [
  'glycin',
  'alanin',
  'serin',
  'valin',
  'leucin',
  'phenylalanin',
  'cystein',
];
const SILICONES_CORE = ['SiH4', 'SiMe4', 'D3', 'D4', 'D5', 'HMDSO', 'MDM', 'T8H'];
const POLYMER_MONOMERS = ['C2H4', 'propen', 'styrol', 'vinylchlorid', 'MMA', 'isopren'];

export const CHALLENGES: Challenge[] = [
  {
    id: 'first-hydrogen',
    titleDE: 'Erstes Wasserstoff-Atom',
    descriptionDE: 'Baue an der Werkbank ein Wasserstoff-Atom aus Proton und Elektron.',
    category: 'Einstieg',
    check: (s) => has(s, 'H'),
    hintDE: 'Setze im Werkbank-Reaktor 1 Proton + 1 Elektron in die Zone.',
  },
  {
    id: 'first-water',
    titleDE: 'Wasser',
    descriptionDE: 'H₂O — das Lösemittel des Lebens. Braucht 2 H + 1 O.',
    category: 'Einstieg',
    check: (s) => has(s, 'H2O'),
    hintDE: 'Wechsle in den Chemielabor-Reaktor (freigeschaltet nach H). 2·H + 1·O in die Zone.',
  },
  {
    id: 'iron-endpoint',
    titleDE: 'Bis zum Eisen fusionieren',
    descriptionDE: 'Erreiche Eisen (Z=26) — hier endet die exotherme Sternfusion.',
    category: 'Kernphysik',
    check: (s) => has(s, 'Fe'),
    hintDE:
      'Am effizientesten im Experten-Modus über die α-Kette am Sternkern-Reaktor: C→O→Ne→Mg→Si→Fe.',
  },
  {
    id: 'all-noble-gases',
    titleDE: 'Alle Edelgase sammeln',
    descriptionDE: 'Bringe alle sieben Edelgase (He, Ne, Ar, Kr, Xe, Rn, Og) ins Inventar.',
    category: 'Kernphysik',
    check: (s) => NOBLE_GASES.every((id) => has(s, id)),
    progress: (s) => countDiscovered(s, NOBLE_GASES) / NOBLE_GASES.length,
    hintDE: 'Die schwersten (Rn, Og) brauchen Supernova bzw. Zyklotron.',
  },
  {
    id: 'aspirin',
    titleDE: 'Aspirin synthetisieren',
    descriptionDE: 'Acetylsalicylsäure (C₉H₈O₄). Der wohl bekannteste Wirkstoff der Welt.',
    category: 'Chemie',
    check: (s) => has(s, 'aspirin'),
    hintDE:
      '9·C + 8·H + 4·O im Chemielabor. Alle Elemente bekommst du im Sandbox-Modus geschenkt, wenn du experimentieren willst.',
  },
  {
    id: 'caffeine',
    titleDE: 'Coffein bauen',
    descriptionDE: 'Coffein (C₈H₁₀N₄O₂) — das weltweit meistkonsumierte Alkaloid.',
    category: 'Chemie',
    check: (s) => has(s, 'coffein'),
    hintDE: '8·C + 10·H + 4·N + 2·O im Chemielabor.',
  },
  {
    id: 'benzene',
    titleDE: 'Aromatischer Sechsring',
    descriptionDE: 'Baue Benzol (C₆H₆) — der Prototyp aller Aromaten.',
    category: 'Chemie',
    check: (s) => has(s, 'C6H6'),
    hintDE: '6·C + 6·H. Die π-Elektronen sind über den Ring delokalisiert.',
  },
  {
    id: 'dna-bases',
    titleDE: 'DNA-Bausteine',
    descriptionDE: 'Alle vier DNA-Basen: Adenin, Thymin, Guanin, Cytosin.',
    category: 'Biochemie',
    check: (s) => DNA_BASES.every((id) => has(s, id)),
    progress: (s) => countDiscovered(s, DNA_BASES) / DNA_BASES.length,
    hintDE:
      'Purine (Adenin, Guanin) sind Doppelringe, Pyrimidine (Thymin, Cytosin) sind Einzelringe.',
  },
  {
    id: 'rna-bases',
    titleDE: 'RNA-Bausteine',
    descriptionDE:
      'RNA hat Uracil statt Thymin. Sammle A, U, G und C — plus die Ribose als Zucker-Rückgrat.',
    category: 'Biochemie',
    check: (s) => RNA_BASES.every((id) => has(s, id)) && has(s, 'ribose'),
    progress: (s) => (countDiscovered(s, RNA_BASES) + (has(s, 'ribose') ? 1 : 0)) / 5,
    hintDE: 'Uracil (C₄H₄N₂O₂), Ribose (C₅H₁₀O₅) — beide im Katalog.',
  },
  {
    id: 'amino-acids-9',
    titleDE: 'Sieben Aminosäuren im Katalog',
    descriptionDE: 'Sammle alle sieben natürlichen Aminosäuren aus dem PSE-Katalog.',
    category: 'Biochemie',
    check: (s) => AMINO_ACIDS_9.every((id) => has(s, id)),
    progress: (s) => countDiscovered(s, AMINO_ACIDS_9) / AMINO_ACIDS_9.length,
    hintDE: 'Glycin, Alanin, Serin, Valin, Leucin, Phenylalanin, Cystein.',
  },
  {
    id: 'silicone-core',
    titleDE: 'Silikon-Grundfamilie',
    descriptionDE:
      'Sammle die 8 klassischen Silikon-Bausteine (Silan, TMS, Cyclosiloxane, PDMS, POSS).',
    category: 'Silikone',
    check: (s) => SILICONES_CORE.every((id) => has(s, id)),
    progress: (s) => countDiscovered(s, SILICONES_CORE) / SILICONES_CORE.length,
    hintDE: 'SiH₄, SiMe₄, D3, D4, D5, HMDSO, MDM, T8H.',
  },
  {
    id: 'polymer-monomers',
    titleDE: 'Sechs Polymer-Monomere',
    descriptionDE:
      'Sammle Ethen, Propen, Styrol, Vinylchlorid, Methylmethacrylat, Isopren.',
    category: 'Master',
    check: (s) => POLYMER_MONOMERS.every((id) => has(s, id)),
    progress: (s) => countDiscovered(s, POLYMER_MONOMERS) / POLYMER_MONOMERS.length,
    hintDE:
      'Alle sechs bilden über radikalische oder ionische Polymerisation die klassischen Massenkunststoffe (PE, PP, PS, PVC, PMMA, Kautschuk).',
  },
  {
    id: 'all-reactors-unlocked',
    titleDE: 'Alle Reaktoren freischalten',
    descriptionDE:
      'Werkbank, Sternkern, AGB-Stern, Supernova, Zyklotron, Chemielabor — schalte alle sechs frei.',
    category: 'Master',
    check: (s) => {
      const unlocked = new Set<string>(s.unlockedReactors);
      return ['workbench', 'stellar-core', 'agb-star', 'supernova', 'cyclotron', 'chem-lab'].every(
        (r) => unlocked.has(r),
      );
    },
    progress: (s) => {
      const unlocked = new Set<string>(s.unlockedReactors);
      const need = ['workbench', 'stellar-core', 'agb-star', 'supernova', 'cyclotron', 'chem-lab'];
      return need.filter((r) => unlocked.has(r)).length / need.length;
    },
    hintDE:
      'Sternkern kommt mit dem ersten H, AGB nach Sternkern-Rezept, Supernova nach AGB, Zyklotron nach Uran. Chemielabor kommt mit H.',
  },
  {
    id: 'complete-pse',
    titleDE: 'Alle 118 Elemente',
    descriptionDE: 'Vervollständige das Periodensystem.',
    category: 'Master',
    check: (s) => elements.every((e) => has(s, e.id)),
    progress: (s) => countDiscovered(s, elements.map((e) => e.id)) / elements.length,
    hintDE: 'Im Sandbox-Modus sind alle direkt entdeckt — zum Grinden Cyclotron nutzen.',
  },
  {
    id: 'complete-catalog',
    titleDE: 'Alle Verbindungen',
    descriptionDE: 'Jeder Molekül-Katalog-Eintrag entdeckt.',
    category: 'Master',
    check: (s) => molecules.every((m) => has(s, m.id)),
    progress: (s) => countDiscovered(s, molecules.map((m) => m.id)) / molecules.length,
    hintDE: 'Aktuell sind es 170 Moleküle. Sandbox macht sie sofort alle sichtbar.',
  },
];

export const CATEGORY_ORDER: ChallengeCategory[] = [
  'Einstieg',
  'Kernphysik',
  'Chemie',
  'Biochemie',
  'Silikone',
  'Master',
];
