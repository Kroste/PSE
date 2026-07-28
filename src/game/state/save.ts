import type { PersistedState } from './store';

const STORAGE_KEY = 'pse.save.v1';
const CURRENT_VERSION = 1 as const;

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

export function saveToStorage(state: PersistedState): void {
  try {
    const envelope: SaveEnvelope = {
      version: CURRENT_VERSION,
      savedAt: new Date().toISOString(),
      state,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // localStorage kann in Privatmodi/Quota-voll fehlschlagen — dann kein Save
  }
}

export function loadFromStorage(): PersistedState | null {
  const raw = tryReadRaw();
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  return migrateAndValidate(parsed);
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignorieren
  }
}

function tryReadRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
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
