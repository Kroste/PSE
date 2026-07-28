import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearStorage,
  loadFromStorage,
  migrateAndValidate,
  saveToStorage,
} from '../src/game/state/save';
import type { GameState } from '../src/game/state/store';

const sample: GameState = {
  discovered: ['u', 'd', 'e-'],
  unlockedReactors: ['workbench', 'stellar-core'],
  activeReactor: 'stellar-core',
  inventory: { u: 4, d: 2 },
};

describe('save layer', () => {
  beforeEach(() => {
    clearStorage();
  });

  it('macht Save/Load round-trip', () => {
    saveToStorage(sample);
    expect(loadFromStorage()).toEqual(sample);
  });

  it('gibt null zurück wenn kein Save vorhanden', () => {
    expect(loadFromStorage()).toBeNull();
  });

  it('verwirft kaputte JSON-Daten', () => {
    localStorage.setItem('pse.save.v1', '{not valid');
    expect(loadFromStorage()).toBeNull();
  });

  it('verwirft Envelopes ohne version', () => {
    expect(migrateAndValidate({ state: sample })).toBeNull();
  });

  it('verwirft zukünftige Save-Versionen (keine Down-Migration möglich)', () => {
    expect(migrateAndValidate({ version: 999, state: sample })).toBeNull();
  });

  it('verwirft Envelopes mit invalidem State-Shape', () => {
    expect(migrateAndValidate({ version: 1, state: { discovered: 'not-array' } })).toBeNull();
  });
});
