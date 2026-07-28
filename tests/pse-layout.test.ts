import { describe, expect, it } from 'vitest';
import { pseCellByZ, pseLayout } from '../src/game/content/pse-layout';
import { elements } from '../src/game/content';

describe('PSE-Layout', () => {
  it('enthält exakt alle 118 Elemente', () => {
    expect(pseLayout).toHaveLength(118);
    const zs = pseLayout.map((c) => c.z).sort((a, b) => a - b);
    expect(zs).toEqual(Array.from({ length: 118 }, (_, i) => i + 1));
  });

  it('jede Zelle hat eindeutige Position (Row, Col)', () => {
    const seen = new Set<string>();
    for (const c of pseLayout) {
      const key = `${c.row}-${c.col}`;
      expect(seen.has(key), `Kollision bei ${key} (Z=${c.z} ${c.symbol})`).toBe(false);
      seen.add(key);
    }
  });

  it('Lanthanoide (Z=57..71) liegen in Reihe 9, Actinoide (Z=89..103) in Reihe 10', () => {
    for (let z = 57; z <= 70; z++) expect(pseCellByZ.get(z)?.row).toBe(9);
    for (let z = 89; z <= 102; z++) expect(pseCellByZ.get(z)?.row).toBe(10);
  });

  it('jedes Element im Katalog hat eine passende PSE-Zelle (Symbol matcht)', () => {
    for (const e of elements) {
      const cell = pseCellByZ.get(e.z);
      expect(cell, `Kein Layout-Eintrag für Z=${e.z}`).toBeDefined();
      expect(cell?.symbol, `Symbol mismatch für Z=${e.z}`).toBe(e.symbol);
    }
  });
});
