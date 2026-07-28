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
  loadState,
  onCraft,
  reconcileUnlockedReactors,
  removeFromInventory,
  removeFromZone,
  resetState,
  setActiveReactor,
  setExpertMode,
  subscribe,
  unlockReactor,
} from '../src/game/state/store';
import type { PersistedState } from '../src/game/state/store';

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

    it('assemble-hydrogen schaltet den Sternkern-Reaktor frei', () => {
      addToInventory('proton', 1);
      addToZone('proton', 1);
      addToZone('e-', 1);

      const result = craft();
      expect(result.ok).toBe(true);
      expect(getState().unlockedReactors).toContain('stellar-core');
    });

    it('erneutes H-Craften duplicziert stellar-core nicht in unlockedReactors', () => {
      addToInventory('proton', 2);
      addToZone('proton', 1);
      addToZone('e-', 1);
      craft();
      addToZone('proton', 1);
      addToZone('e-', 1);
      craft();

      const unlocked = getState().unlockedReactors;
      expect(unlocked.filter((r) => r === 'stellar-core')).toHaveLength(1);
    });

    it('pp-Kette am Sternkern: 2p → Deuteron + Positron (Expertenmodus)', () => {
      addToInventory('proton', 2);
      unlockReactor('stellar-core');
      setActiveReactor('stellar-core');
      setExpertMode(true);

      addToZone('proton', 2);
      const result = craft();
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.recipe.id).toBe('pp-fusion');
      expect(getState().inventory.deuteron).toBe(1);
      expect(getState().inventory['e+']).toBe(1);
      expect(getState().discovered).toContain('deuteron');
      expect(getState().discovered).toContain('e+');
    });
  });

  describe('reconcileUnlockedReactors', () => {
    it('schaltet stellar-core rückwirkend frei, wenn H bereits entdeckt ist', () => {
      const oldSave: PersistedState = {
        discovered: ['proton', 'e-', 'H'],
        unlockedReactors: ['workbench'],
        activeReactor: 'workbench',
        inventory: {},
      };
      const reconciled = reconcileUnlockedReactors(oldSave);
      expect(reconciled.unlockedReactors).toContain('stellar-core');
      expect(reconciled.unlockedReactors).toContain('workbench');
    });

    it('gibt denselben Persisted-State zurück, wenn keine Freischaltung nötig ist', () => {
      const empty: PersistedState = {
        discovered: [],
        unlockedReactors: ['workbench'],
        activeReactor: 'workbench',
        inventory: {},
      };
      expect(reconcileUnlockedReactors(empty)).toBe(empty);
    });

    it('loadState wendet reconcile automatisch an', () => {
      loadState({
        discovered: ['proton', 'e-', 'H'],
        unlockedReactors: ['workbench'],
        activeReactor: 'workbench',
        inventory: { H: 1 },
      });
      expect(getState().unlockedReactors).toContain('stellar-core');
    });
  });

  describe('discovered = dauerhaft verfügbar', () => {
    it('availableCount ist Infinity für discovered non-freeSupply', () => {
      expect(availableCount('proton')).toBe(0);
      discover('proton');
      expect(availableCount('proton')).toBe(Number.POSITIVE_INFINITY);
    });

    it('craft verbraucht Non-freeSupply-Zutaten NICHT, wenn sie discovered sind', () => {
      // Erst mal Proton craften → wird dabei discovered
      addToZone('u', 2);
      addToZone('d', 1);
      addToZone('g', 3);
      craft();
      expect(getState().discovered).toContain('proton');
      const protonBefore = getState().inventory.proton ?? 0;

      // Jetzt H craften: Proton ist discovered, Bestand darf nicht sinken
      addToZone('proton', 1);
      addToZone('e-', 1);
      const result = craft();
      expect(result.ok).toBe(true);
      expect(getState().inventory.proton ?? 0).toBe(protonBefore);
      expect(getState().discovered).toContain('H');
    });

    it('addToZone lässt beliebige Mengen zu, wenn Entity discovered ist', () => {
      discover('proton');
      expect(addToZone('proton', 99)).toBe(true);
      expect(getState().reactionZone.proton).toBe(99);
    });
  });

  describe('expertMode', () => {
    it('startet mit expertMode = false', () => {
      expect(getState().expertMode).toBe(false);
    });

    it('setExpertMode toggled und triggert emit', () => {
      let seen = 0;
      subscribe(() => seen++);
      setExpertMode(true);
      expect(getState().expertMode).toBe(true);
      expect(seen).toBeGreaterThan(1);
    });

    it('Normalmodus craftet simple-helium (2p+2n+2e- → He) an der Werkbank', () => {
      addToInventory('proton', 2);
      addToInventory('neutron', 2);
      addToZone('proton', 2);
      addToZone('neutron', 2);
      addToZone('e-', 2);
      const result = craft();
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.recipe.id).toBe('simple-helium');
      expect(getState().inventory.He).toBe(1);
    });

    it('Expertenmodus verweigert simple-helium', () => {
      setExpertMode(true);
      addToInventory('proton', 2);
      addToInventory('neutron', 2);
      addToZone('proton', 2);
      addToZone('neutron', 2);
      addToZone('e-', 2);
      const result = craft();
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason).toBe('no-match');
    });

    it('setExpertMode(false) fällt auf Werkbank zurück, wenn aktiver Reaktor leer wird', () => {
      unlockReactor('stellar-core');
      setExpertMode(true);
      setActiveReactor('stellar-core');
      expect(getState().activeReactor).toBe('stellar-core');
      setExpertMode(false);
      expect(getState().activeReactor).toBe('workbench');
    });
  });

  describe('resetState', () => {
    it('setzt state auf den initialen Zustand zurück', () => {
      addToInventory('proton', 3);
      discover('deuteron');
      unlockReactor('stellar-core');
      setActiveReactor('stellar-core');

      resetState();

      const s = getState();
      expect(s.discovered).toEqual([]);
      expect(s.inventory).toEqual({});
      expect(s.unlockedReactors).toEqual(['workbench']);
      expect(s.activeReactor).toBe('workbench');
      expect(s.reactionZone).toEqual({});
    });
  });
});
