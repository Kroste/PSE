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

export type Entity = ParticleEntity | HadronEntity | NucleusEntity | ElementEntity;

export type Multiset = Readonly<Record<EntityId, number>>;

export type RecipeKind = 'assembly' | 'fusion' | 'decay' | 'chemical' | 'bond';

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
};
