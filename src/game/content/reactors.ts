import type { ReactorId } from '../state/store';

export type ReactorMeta = {
  id: ReactorId;
  nameDE: string;
  symbol: string;
  descriptionDE: string;
};

export const reactorMeta: Record<ReactorId, ReactorMeta> = {
  workbench: {
    id: 'workbench',
    nameDE: 'Werkbank',
    symbol: '⚒',
    descriptionDE:
      'Symbolische Grundmontage: Quarks zu Hadronen, Protonen und Elektronen zu Wasserstoff. Physikalisch vereinfacht — dient dem Onboarding.',
  },
  'stellar-core': {
    id: 'stellar-core',
    nameDE: 'Sternkern',
    symbol: '☀',
    descriptionDE:
      'Hydrostatischer Fusionsofen bei ~15 Mio. K. Ort der pp-Kette (H → He) und später des CNO-Zyklus.',
  },
  'agb-star': {
    id: 'agb-star',
    nameDE: 'AGB-Stern',
    symbol: '★',
    descriptionDE:
      'Roter Riese im späten Stadium — dünne Schalen fusionieren, s-Prozess-Neutronen bauen langsam Kerne bis Blei.',
  },
  supernova: {
    id: 'supernova',
    nameDE: 'Supernova',
    symbol: '✷',
    descriptionDE:
      'Kollabierender Massereicher Stern. r-Prozess: extrem hoher Neutronenfluss baut in Sekunden Kerne bis Uran und darüber.',
  },
  cyclotron: {
    id: 'cyclotron',
    nameDE: 'Zyklotron',
    symbol: '⌾',
    descriptionDE:
      'Menschengemachter Ringbeschleuniger. Synthetisiert superschwere Elemente durch gezielten Kernbeschuss.',
  },
  'chem-lab': {
    id: 'chem-lab',
    nameDE: 'Chemielabor',
    symbol: '⚗',
    descriptionDE:
      'Molekulare Chemie: Bindungen, Reaktionen, Katalyse — von H₂O bis zu Polymeren.',
  },
};

export function reactorName(id: ReactorId): string {
  return reactorMeta[id].nameDE;
}
