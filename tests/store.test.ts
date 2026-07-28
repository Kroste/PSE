import { beforeEach, describe, expect, it } from 'vitest';
import {
  __resetForTests,
  addToInventory,
  discover,
  getState,
  removeFromInventory,
  setActiveReactor,
  subscribe,
  unlockReactor,
} from '../src/game/state/store';

describe('game state store', () => {
  beforeEach(() => {
    __resetForTests();
  });

  it('startet mit leerer Sammlung und aktivem Werkbank-Reaktor', () => {
    const s = getState();
    expect(s.discovered).toEqual([]);
    expect(s.unlockedReactors).toEqual(['workbench']);
    expect(s.activeReactor).toBe('workbench');
    expect(s.inventory).toEqual({});
  });

  it('discover ist idempotent', () => {
    discover('u');
    discover('u');
    expect(getState().discovered).toEqual(['u']);
  });

  it('inventar addiert und entfernt korrekt', () => {
    addToInventory('u', 2);
    addToInventory('d', 1);
    expect(getState().inventory).toEqual({ u: 2, d: 1 });

    expect(removeFromInventory('u', 1)).toBe(true);
    expect(getState().inventory).toEqual({ u: 1, d: 1 });

    expect(removeFromInventory('u', 5)).toBe(false);
    expect(getState().inventory).toEqual({ u: 1, d: 1 });

    expect(removeFromInventory('d', 1)).toBe(true);
    expect(getState().inventory).toEqual({ u: 1 });
  });

  it('setActiveReactor verweigert nicht freigeschaltete Reaktoren', () => {
    setActiveReactor('stellar-core');
    expect(getState().activeReactor).toBe('workbench');

    unlockReactor('stellar-core');
    setActiveReactor('stellar-core');
    expect(getState().activeReactor).toBe('stellar-core');
  });

  it('subscribe liefert sofort den aktuellen State und danach jede Änderung', () => {
    const seen: number[] = [];
    const unsub = subscribe((s) => seen.push(s.discovered.length));
    discover('u');
    discover('d');
    unsub();
    discover('gluon');
    expect(seen).toEqual([0, 1, 2]);
  });
});
