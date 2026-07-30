import type { ReactorId } from '../state/store';

export type EntityId = string;

type EntityBase = {
  id: EntityId;
  nameDE: string;
  symbol?: string;
  scienceNoteDE: string;
  source: string;
  color: string;
};

export type ParticleEntity = EntityBase & {
  kind: 'particle';
  category: 'quark' | 'lepton' | 'boson';
  charge: number;
  spin: number;
  massMeV: number;
  freeSupply: boolean;
};

export type HadronEntity = EntityBase & {
  kind: 'hadron';
  category: 'baryon' | 'meson';
  quarks: EntityId[];
  charge: number;
  massMeV: number;
};

export type NucleusEntity = EntityBase & {
  kind: 'nucleus';
  z: number;
  a: number;
  protons: number;
  neutrons: number;
  massMeV: number;
  bindingEnergyMeV: number;
  halfLifeS?: number;
};

export type ElementEntity = EntityBase & {
  kind: 'element';
  z: number;
  atomicMassU: number;
  electronConfig: string;
  period: number;
  group: number | null;
  block: 's' | 'p' | 'd' | 'f';
  elementCategory:
    | 'alkali-metal'
    | 'alkaline-earth-metal'
    | 'transition-metal'
    | 'post-transition-metal'
    | 'metalloid'
    | 'reactive-nonmetal'
    | 'noble-gas'
    | 'lanthanide'
    | 'actinide'
    | 'halogen';
  cpkColor: string;
};

export type MoleculeGeometry =
  | 'linear'
  | 'bent'
  | 'trigonal-planar'
  | 'trigonal-pyramidal'
  | 'tetrahedral'
  | 'octahedral';

/** Ein Atom im Molekül-Ball-Stick-Modell mit Position und Element-Referenz. */
export type MoleculeAtom = {
  element: EntityId; // z.B. "H", "O"
  /** Position im Molekül-lokalen Koordinatensystem (Å-artig, aber unitless). */
  position: [number, number, number];
};

export type MoleculeBond = {
  from: number; // Index in atoms[]
  to: number;
  order: 1 | 2 | 3;
};

export type MoleculeEntity = EntityBase & {
  kind: 'molecule';
  formula: string; // z.B. "H2O"
  atomCounts: Multiset; // z.B. { H: 2, O: 1 } — Summenformel als Multiset
  atoms: MoleculeAtom[];
  bonds: MoleculeBond[];
  geometry: MoleculeGeometry;
  molarMassGmol: number;
  categoryDE: string; // z.B. "Anorganisch", "Organisch (klein)"
};

export type Entity =
  | ParticleEntity
  | HadronEntity
  | NucleusEntity
  | ElementEntity
  | MoleculeEntity;

export type Multiset = Readonly<Record<EntityId, number>>;

export type RecipeKind = 'assembly' | 'fusion' | 'decay' | 'chemical' | 'bond';

export type RecipeMode = 'expert' | 'simple' | 'both';

export type Recipe = {
  id: string;
  kind: RecipeKind;
  reactor: ReactorId;
  inputs: Multiset;
  outputs: Multiset;
  energyMeV?: number;
  scienceNoteDE: string;
  source: string;
  unlocksReactors?: ReactorId[];
  /**
   * `expert` = nur im Experten-Modus verfügbar (Kern-Zwischenschritte,
   * Sternfusion). `simple` = nur im Normal-Modus (direkter Nukleonen-Weg).
   * `both` = in beiden. Fehlt = `both`.
   */
  mode?: RecipeMode;
};
