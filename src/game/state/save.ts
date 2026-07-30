import type { PersistedState } from './store';

const NORMAL_KEY = 'pse.save.v1';
const SANDBOX_KEY = 'pse.sandbox.save.v1';
const CURRENT_VERSION = 1 as const;

export type SaveSlot = 'normal' | 'sandbox';

type SaveEnvelope = {
  version: number;
  savedAt: string;
  state: PersistedState;
};

type Migration = (data: unknown) => unknown;

const migrations: Record<number, Migration> = {
  // Beispiel für die Zukunft:
  // 1: (data) => ({ ...(data as object), state: { ...(data as SaveEnvelope).state, foo: [] } }),
};

function keyFor(slot: SaveSlot): string {
  return slot === 'sandbox' ? SANDBOX_KEY : NORMAL_KEY;
}

export function saveToStorage(state: PersistedState, slot: SaveSlot = 'normal'): void {
  try {
    const envelope: SaveEnvelope = {
      version: CURRENT_VERSION,
      savedAt: new Date().toISOString(),
      state,
    };
    localStorage.setItem(keyFor(slot), JSON.stringify(envelope));
  } catch {
    // localStorage kann in Privatmodi/Quota-voll fehlschlagen — dann kein Save
  }
}

export function loadFromStorage(slot: SaveSlot = 'normal'): PersistedState | null {
  const raw = tryReadRaw(slot);
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  return migrateAndValidate(parsed);
}

export function clearStorage(slot: SaveSlot = 'normal'): void {
  try {
    localStorage.removeItem(keyFor(slot));
  } catch {
    // ignorieren
  }
}

function tryReadRaw(slot: SaveSlot): string | null {
  try {
    return localStorage.getItem(keyFor(slot));
  } catch {
    return null;
  }
}

export function migrateAndValidate(input: unknown): PersistedState | null {
  if (typeof input !== 'object' || input === null) return null;
  const envelope = input as Partial<SaveEnvelope>;
  if (typeof envelope.version !== 'number') return null;
  if (envelope.version > CURRENT_VERSION) return null;

  let migrated: unknown = envelope;
  for (let v = envelope.version; v < CURRENT_VERSION; v++) {
    const step = migrations[v];
    if (!step) return null;
    migrated = step(migrated);
  }

  const state = (migrated as SaveEnvelope).state;
  if (!isPersistedState(state)) return null;
  return state;
}

function isPersistedState(value: unknown): value is PersistedState {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Partial<PersistedState>;
  return (
    Array.isArray(s.discovered) &&
    Array.isArray(s.unlockedReactors) &&
    typeof s.activeReactor === 'string' &&
    typeof s.inventory === 'object' &&
    s.inventory !== null
  );
}
