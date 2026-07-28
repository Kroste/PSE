import { describe, expect, it } from 'vitest';
import { nucleusFor } from '../src/game/atoms/nucleus-composition';
import { elements } from '../src/game/content';
import type { ElementEntity } from '../src/game/content/types';

function findElement(id: string): ElementEntity {
  const e = elements.find((x) => x.id === id);
  if (!e) throw new Error(`Element ${id} nicht im Katalog`);
  return e;
}

describe('nucleusFor', () => {
  it('H bekommt 1p + 0n aus assemble-hydrogen (proton als Input)', () => {
    const c = nucleusFor(findElement('H'));
    expect(c.protons).toBe(1);
    expect(c.neutrons).toBe(0);
    expect(c.a).toBe(1);
  });

  it('He bekommt 2p + 2n aus dem alpha-Kern-Rezept (Priorität nucleus vor simple)', () => {
    const c = nucleusFor(findElement('He'));
    expect(c.protons).toBe(2);
    expect(c.neutrons).toBe(2);
    expect(c.a).toBe(4);
  });

  it('C bekommt 6p + 6n aus dem c12-Kern-Rezept', () => {
    const c = nucleusFor(findElement('C'));
    expect(c.protons).toBe(6);
    expect(c.neutrons).toBe(6);
    expect(c.a).toBe(12);
  });

  it('Fe bekommt 26p + 30n aus dem fe56-Kern-Rezept', () => {
    const c = nucleusFor(findElement('Fe'));
    expect(c.protons).toBe(26);
    expect(c.neutrons).toBe(30);
    expect(c.a).toBe(56);
  });

  it('Be bekommt 4p + 5n aus dem Simple-Rezept (kein Kern-Rezept vorhanden)', () => {
    const c = nucleusFor(findElement('Be'));
    expect(c.protons).toBe(4);
    expect(c.neutrons).toBe(5);
    expect(c.a).toBe(9);
  });

  it('Au bekommt Z=79 aus dem Simple-Rezept, N=A-Z', () => {
    const c = nucleusFor(findElement('Au'));
    expect(c.protons).toBe(79);
    expect(c.protons + c.neutrons).toBe(c.a);
    expect(c.a).toBeGreaterThan(190);
  });

  it('Für jedes Element gilt protons == z und a >= z', () => {
    for (const el of elements) {
      const c = nucleusFor(el);
      expect(c.protons, `${el.id}.protons vs z`).toBe(el.z);
      expect(c.a, `${el.id}.a`).toBeGreaterThanOrEqual(el.z);
      expect(c.protons + c.neutrons, `${el.id} a-check`).toBe(c.a);
    }
  });
});
