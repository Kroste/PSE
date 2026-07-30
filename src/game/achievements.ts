import type { GameState } from './state/store';
import { elements, molecules } from './content';

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  check: (state: GameState) => boolean;
};

function has(state: GameState, id: string): boolean {
  return state.discovered.includes(id);
}

function allOf(state: GameState, ids: string[]): boolean {
  return ids.every((id) => state.discovered.includes(id));
}

function anyMoleculeOfCategory(state: GameState, prefix: string): boolean {
  return molecules.some(
    (m) => m.categoryDE.startsWith(prefix) && state.discovered.includes(m.id),
  );
}

function allMoleculesOfCategory(state: GameState, prefix: string): boolean {
  const list = molecules.filter((m) => m.categoryDE.startsWith(prefix));
  if (list.length === 0) return false;
  return list.every((m) => state.discovered.includes(m.id));
}

const NOBLE_GASES = ['He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn', 'Og'];
const ALKALI_METALS = ['Li', 'Na', 'K', 'Rb', 'Cs', 'Fr'];
const HALOGENS = ['F', 'Cl', 'Br', 'I', 'At', 'Ts'];
const DNA_BASES = ['adenin', 'thymin', 'guanin', 'cytosin'];

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-proton',
    title: 'Erster Baryon',
    description: 'Baue dein erstes Proton aus Quarks und Gluonen.',
    icon: '⚛',
    check: (s) => has(s, 'proton'),
  },
  {
    id: 'first-atom',
    title: 'Erstes Atom',
    description: 'Fange ein Elektron ein und bilde Wasserstoff.',
    icon: '🌟',
    check: (s) => has(s, 'H'),
  },
  {
    id: 'helium-alpha',
    title: 'Sonnen-Fusion',
    description: 'Baue Helium — das Ergebnis der pp-Kette.',
    icon: '☀',
    check: (s) => has(s, 'He'),
  },
  {
    id: 'carbon-based',
    title: 'Kohlenstoff-Basis',
    description: 'Kohlenstoff — Baustein allen bekannten Lebens.',
    icon: '🌿',
    check: (s) => has(s, 'C'),
  },
  {
    id: 'iron-endpoint',
    title: 'Fusions-Endpunkt',
    description: 'Baue Eisen — hier endet die exotherme Sternfusion.',
    icon: '🔩',
    check: (s) => has(s, 'Fe'),
  },
  {
    id: 'first-molecule',
    title: 'Erste Verbindung',
    description: 'Baue dein erstes Molekül im Chemielabor.',
    icon: '🧪',
    check: (s) => molecules.some((m) => s.discovered.includes(m.id)),
  },
  {
    id: 'water',
    title: 'Wasser',
    description: 'H₂O — das Lösemittel des Lebens.',
    icon: '💧',
    check: (s) => has(s, 'H2O'),
  },
  {
    id: 'all-noble-gases',
    title: 'Alle Edelgase',
    description: 'Bringe alle sieben Edelgase in dein Inventar.',
    icon: '🎈',
    check: (s) => allOf(s, NOBLE_GASES),
  },
  {
    id: 'all-alkali',
    title: 'Alle Alkalimetalle',
    description: 'Die reaktivsten Metalle — alle sechs entdeckt.',
    icon: '🔥',
    check: (s) => allOf(s, ALKALI_METALS),
  },
  {
    id: 'all-halogens',
    title: 'Alle Halogene',
    description: 'Alle sechs Halogene entdeckt.',
    icon: '🧂',
    check: (s) => allOf(s, HALOGENS),
  },
  {
    id: 'uranium',
    title: 'Schwerstes Natürliches',
    description: 'Baue Uran — schwerstes natürlich vorkommendes Element.',
    icon: '☢',
    check: (s) => has(s, 'U'),
  },
  {
    id: 'oganesson',
    title: 'Ende des PSE',
    description: 'Erreiche Oganesson (Z=118).',
    icon: '🏁',
    check: (s) => has(s, 'Og'),
  },
  {
    id: 'all-elements',
    title: 'Alle 118 Elemente',
    description: 'Vollständiges Periodensystem entdeckt.',
    icon: '🥇',
    check: (s) => elements.every((e) => s.discovered.includes(e.id)),
  },
  {
    id: 'dna-bases',
    title: 'DNA-Bausteine',
    description: 'Adenin, Thymin, Guanin und Cytosin — die vier DNA-Basen.',
    icon: '🧬',
    check: (s) => allOf(s, DNA_BASES),
  },
  {
    id: 'silicon-master',
    title: 'Silikon-Meisterin',
    description: 'Alle Silikone entdeckt — von SiH₄ bis POSS.',
    icon: '💎',
    check: (s) =>
      allMoleculesOfCategory(s, 'Silikon') && allMoleculesOfCategory(s, 'Silizium-Verbindung'),
  },
  {
    id: 'astrochemistry',
    title: 'Interstellare Chemie',
    description: 'Erstes Molekül aus der Astrochemie-Kategorie.',
    icon: '🌌',
    check: (s) => anyMoleculeOfCategory(s, 'Astrochemie'),
  },
  {
    id: 'biomolecules',
    title: 'Bausteine des Lebens',
    description: 'Erstes Biomolekül (Aminosäure, Zucker oder Nukleobase).',
    icon: '🧫',
    check: (s) => anyMoleculeOfCategory(s, 'Biomolekül'),
  },
  {
    id: 'polymer',
    title: 'Kunststoff-Zeitalter',
    description: 'Erstes Polymer-Monomer entdeckt.',
    icon: '🛢',
    check: (s) => anyMoleculeOfCategory(s, 'Polymer'),
  },
  {
    id: 'all-reactors',
    title: 'Alle Reaktoren',
    description: 'Werkbank, Sternkern, AGB-Stern, Supernova und Chemielabor freigeschaltet.',
    icon: '🚀',
    check: (s) => {
      const unlocked = new Set<string>(s.unlockedReactors);
      return ['workbench', 'stellar-core', 'agb-star', 'supernova', 'chem-lab'].every((r) =>
        unlocked.has(r),
      );
    },
  },
  {
    id: 'all-molecules',
    title: 'Alle Verbindungen',
    description: 'Jeden Molekül-Katalog-Eintrag entdeckt.',
    icon: '👑',
    check: (s) => molecules.every((m) => s.discovered.includes(m.id)),
  },
];

export function countAchieved(state: GameState): number {
  return ACHIEVEMENTS.filter((a) => a.check(state)).length;
}

export function totalAchievements(): number {
  return ACHIEVEMENTS.length;
}
