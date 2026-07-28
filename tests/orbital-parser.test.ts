import { describe, expect, it } from 'vitest';
import {
  parseElectronConfig,
  SUBSHELL_CAPACITY,
  totalElectrons,
} from '../src/game/atoms/orbital-parser';

describe('orbital-parser', () => {
  it('parst einfache Konfigurationen', () => {
    expect(parseElectronConfig('1s1')).toEqual([{ n: 1, l: 's', count: 1 }]);
    expect(parseElectronConfig('1s2')).toEqual([{ n: 1, l: 's', count: 2 }]);
  });

  it('expandiert Edelgas-Cores korrekt', () => {
    const carbon = parseElectronConfig('[He] 2s2 2p2');
    expect(totalElectrons(carbon)).toBe(6);
    expect(carbon).toContainEqual({ n: 1, l: 's', count: 2 });
    expect(carbon).toContainEqual({ n: 2, l: 's', count: 2 });
    expect(carbon).toContainEqual({ n: 2, l: 'p', count: 2 });
  });

  it('expandiert [Ne] und akkumuliert korrekt für Silizium', () => {
    const silicon = parseElectronConfig('[Ne] 3s2 3p2');
    expect(totalElectrons(silicon)).toBe(14);
    expect(silicon).toContainEqual({ n: 3, l: 's', count: 2 });
    expect(silicon).toContainEqual({ n: 3, l: 'p', count: 2 });
  });

  it('expandiert [Ar] für Eisen inkl. 3d6 4s2', () => {
    const iron = parseElectronConfig('[Ar] 3d6 4s2');
    expect(totalElectrons(iron)).toBe(26);
    expect(iron).toContainEqual({ n: 3, l: 'd', count: 6 });
    expect(iron).toContainEqual({ n: 4, l: 's', count: 2 });
  });

  it('sortiert Ergebnis stabil nach n, dann s→p→d→f', () => {
    const iron = parseElectronConfig('[Ar] 3d6 4s2');
    const keys = iron.map((o) => `${o.n}${o.l}`);
    // 1s, 2s, 2p, 3s, 3p, 3d, 4s
    expect(keys).toEqual(['1s', '2s', '2p', '3s', '3p', '3d', '4s']);
  });

  it('ignoriert kaputte Tokens still, wirft nicht', () => {
    expect(parseElectronConfig('1s2 XYZ 2s1')).toEqual([
      { n: 1, l: 's', count: 2 },
      { n: 2, l: 's', count: 1 },
    ]);
  });

  it('Kapazitäten sind konsistent', () => {
    expect(SUBSHELL_CAPACITY).toEqual({ s: 2, p: 6, d: 10, f: 14 });
  });
});
