import { beforeEach, describe, expect, it } from 'vitest';
import {
  __resetForTests,
  addToInventory,
  addToZone,
  availableCount,
  clearZone,
  craft,
  discover,
  getState,
  onCraft,
  removeFromInventory,
  removeFromZone,
  setActiveReactor,
  subscribe,
  unlockReactor,
} from '../src/game/state/store';

describe('game state store', () => {
  beforeEach(() => {
    __resetForTests();
  });

  it('startet leer, Werkbank aktiv, Reaktionszone leer', () => {
    const s = getState();
    expect(s.discovered).toEqual([]);
    expect(s.unlockedReactors).toEqual(['workbench']);
    expect(s.activeReactor).toBe('workbench');
    expect(s.inventory).toEqual({});
    expect(s.reactionZone).toEqual({});
  });

  it('freeSupply-Teilchen sind stets verfügbar', () => {
    expect(availableCount('u')).toBe(Infinity);
    expect(availableCount('gamma')).toBe(Infinity);
  });

  it('discover ist idempotent', () => {
    discover('u');
    discover('u');
    expect(getState().discovered).toEqual(['u']);
  });

  it('addToZone/removeFromZone respektieren Inventar-Verfügbarkeit', () => {
    // Freies Teilchen: darf immer
    expect(addToZone('u', 3)).toBe(true);
    expect(getState().reactionZone).toEqual({ u: 3 });

    // Nicht-freies Teilchen ohne Vorrat: verweigert
    expect(addToZone('proton', 1)).toBe(false);

    // Nach Inventar-Add erlaubt
    addToInventory('proton', 2);
    expect(addToZone('proton', 2)).toBe(true);
    expect(addToZone('proton', 1)).toBe(false); // Vorrat aufgebraucht

    // removeFromZone bereinigt Nullen
    expect(removeFromZone('proton', 2)).toBe(true);
    expect(getState().reactionZone.proton).toBeUndefined();
  });

  it('removeFromInventory verweigert Überziehen', () => {
    addToInventory('proton', 1);
    expect(removeFromInventory('proton', 2)).toBe(false);
    expect(removeFromInventory('proton', 1)).toBe(true);
    expect(getState().inventory.proton).toBeUndefined();
  });

  it('setActiveReactor verweigert nicht freigeschaltete Reaktoren', () => {
    setActiveReactor('stellar-core');
    expect(getState().activeReactor).toBe('workbench');
    unlockReactor('stellar-core');
    setActiveReactor('stellar-core');
    expect(getState().activeReactor).toBe('stellar-core');
  });

  it('subscribe fired sofort + bei jeder Änderung', () => {
    const seen: number[] = [];
    const unsub = subscribe((s) => seen.push(s.discovered.length));
    discover('u');
    discover('d');
    unsub();
    discover('g');
    expect(seen).toEqual([0, 1, 2]);
  });

  describe('craft', () => {
    it('baut Proton aus 2u+1d+3g, entdeckt Proton, Zone wird geleert', () => {
      addToZone('u', 2);
      addToZone('d', 1);
      addToZone('g', 3);

      const events: unknown[] = [];
      onCraft((e) => events.push(e));

      const result = craft();
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.recipe.id).toBe('assemble-proton');
      expect(result.discoveredIds).toEqual(['proton']);

      const s = getState();
      expect(s.reactionZone).toEqual({});
      expect(s.inventory.proton).toBe(1);
      expect(s.discovered).toContain('proton');
      expect(events).toHaveLength(1);
    });

    it('konsumiert Nicht-freie Zutaten korrekt (Proton verschwindet bei H-Bau)', () => {
      addToInventory('proton', 1);
      addToZone('proton', 1);
      addToZone('e-', 1);

      const result = craft();
      expect(result.ok).toBe(true);
      const s = getState();
      expect(s.inventory.proton).toBeUndefined();
      expect(s.inventory.H).toBe(1);
      expect(s.discovered).toContain('H');
    });

    it('doppeltes Craften desselben Elements führt nicht zu doppelter Discovery', () => {
      // Erstes H
      addToInventory('proton', 2);
      addToZone('proton', 1);
      addToZone('e-', 1);
      craft();

      // Zweites H
      addToZone('proton', 1);
      addToZone('e-', 1);
      craft();

      const s = getState();
      expect(s.inventory.H).toBe(2);
      expect(s.discovered.filter((id) => id === 'H')).toHaveLength(1);
    });

    it('empty-zone Fehler', () => {
      const result = craft();
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason).toBe('empty-zone');
    });

    it('no-match Fehler bei unpassendem Multiset', () => {
      addToZone('u', 5);
      const result = craft();
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason).toBe('no-match');
    });

    it('clearZone leert die Reaktionszone', () => {
      addToZone('u', 2);
      addToZone('d', 1);
      clearZone();
      expect(getState().reactionZone).toEqual({});
    });
  });
});
