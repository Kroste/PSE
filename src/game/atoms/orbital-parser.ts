export type Subshell = 's' | 'p' | 'd' | 'f';

export type OrbitalOccupancy = {
  n: number;
  l: Subshell;
  count: number;
};

export const SUBSHELL_CAPACITY: Record<Subshell, number> = {
  s: 2,
  p: 6,
  d: 10,
  f: 14,
};

const NOBLE_GAS_CORES: Record<string, string> = {
  He: '1s2',
  Ne: '1s2 2s2 2p6',
  Ar: '1s2 2s2 2p6 3s2 3p6',
  Kr: '1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6',
  Xe: '1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 5s2 5p6',
  Rn: '1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 5s2 5p6 4f14 5d10 6s2 6p6',
  Og: '1s2 2s2 2p6 3s2 3p6 3d10 4s2 4p6 4d10 5s2 5p6 4f14 5d10 6s2 6p6 5f14 6d10 7s2 7p6',
};

const TOKEN_RE = /^(\d+)([spdf])(\d+)$/;
const CORE_RE = /^\[(\w+)\]\s*(.*)$/;

/**
 * Parst eine spektroskopische Elektronenkonfiguration wie "1s2 2s2 2p3" oder
 * "[Ne] 3s2 3p4". Edelgas-Cores werden expandiert. Ungültige Tokens werden
 * still übersprungen (keine Exception — Content-Katalog ist die Autorität).
 */
export function parseElectronConfig(config: string): OrbitalOccupancy[] {
  let expanded = config.trim();
  const coreMatch = expanded.match(CORE_RE);
  if (coreMatch) {
    const core = NOBLE_GAS_CORES[coreMatch[1]!];
    expanded = core ? `${core} ${coreMatch[2]}` : coreMatch[2]!;
  }

  const tokens = expanded.split(/\s+/).filter(Boolean);
  const result: OrbitalOccupancy[] = [];
  for (const tok of tokens) {
    const m = tok.match(TOKEN_RE);
    if (!m) continue;
    result.push({
      n: parseInt(m[1]!, 10),
      l: m[2] as Subshell,
      count: parseInt(m[3]!, 10),
    });
  }
  return mergeSameSubshell(result);
}

function mergeSameSubshell(list: OrbitalOccupancy[]): OrbitalOccupancy[] {
  const bucket = new Map<string, OrbitalOccupancy>();
  for (const o of list) {
    const key = `${o.n}${o.l}`;
    const existing = bucket.get(key);
    if (existing) existing.count += o.count;
    else bucket.set(key, { ...o });
  }
  return [...bucket.values()].sort((a, b) => a.n - b.n || subshellOrder(a.l) - subshellOrder(b.l));
}

function subshellOrder(l: Subshell): number {
  return { s: 0, p: 1, d: 2, f: 3 }[l];
}

export function totalElectrons(occ: OrbitalOccupancy[]): number {
  return occ.reduce((sum, o) => sum + o.count, 0);
}
