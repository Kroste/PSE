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
  /**
   * Optional: CIP-Stereo-Deskriptor an einem Stereozentrum (chirales
   * C-Atom). "R" = rectus, "S" = sinister. Wird im Detail-Panel als
   * Markierung angezeigt.
   */
  stereo?: 'R' | 'S';
};

export type MoleculeBond = {
  from: number; // Index in atoms[]
  to: number;
  order: 1 | 2 | 3;
  /**
   * Optional: E/Z-Isomerie an einer Doppelbindung.
   * "E" = entgegen (früher trans), "Z" = zusammen (früher cis).
   * Nur sinnvoll bei order === 2.
   */
  stereo?: 'E' | 'Z';
};

/** Spektroskopie-Daten (optional pro Molekül) — kuratiert aus Literatur. */
export type IrPeak = {
  wavenumber: number; // cm⁻¹
  intensity: 'strong' | 'medium' | 'weak';
  assignmentDE: string;
};
export type NmrPeak = {
  shift: number; // ppm (¹H-NMR, TMS = 0)
  nProtons: number;
  multiplicity: 's' | 'd' | 't' | 'q' | 'm' | 'dd' | 'br';
  assignmentDE: string;
};
export type UvBand = {
  lambdaMax: number; // nm
  epsilon?: number; // L·mol⁻¹·cm⁻¹
  assignmentDE: string;
};
export type Spectra = {
  ir?: IrPeak[];
  nmr1h?: NmrPeak[];
  uvVis?: UvBand[];
  source?: string;
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
  /**
   * Optional: menschenlesbare Notiz zur Stereochemie. Z. B.
   * "chirales C-2 (R-Konfiguration)", "cis-Doppelbindung C=C".
   * Wird im Detail-Panel angezeigt.
   */
  stereoNoteDE?: string;
  /**
   * Optional: kuratierte Spektroskopie-Daten (IR/NMR/UV) — für die
   * Detail-Ansicht und den Chemie-Unterricht.
   */
  spectra?: Spectra;
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
