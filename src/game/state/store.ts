import { saveToStorage } from './save';

export type ReactorId =
  | 'workbench'
  | 'stellar-core'
  | 'agb-star'
  | 'supernova'
  | 'cyclotron'
  | 'chem-lab';

export type GameState = {
  readonly discovered: readonly string[];
  readonly unlockedReactors: readonly ReactorId[];
  readonly activeReactor: ReactorId;
  readonly inventory: Readonly<Record<string, number>>;
};

const initialState: GameState = {
  discovered: [],
  unlockedReactors: ['workbench'],
  activeReactor: 'workbench',
  inventory: {},
};

type Listener = (state: GameState) => void;

let state: GameState = initialState;
const listeners = new Set<Listener>();
let persist = true;

function emit(): void {
  for (const listener of listeners) listener(state);
  if (persist) saveToStorage(state);
}

export function getState(): GameState {
  return state;
}

export function loadState(next: GameState): void {
  state = next;
  emit();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export function discover(id: string): void {
  if (state.discovered.includes(id)) return;
  state = { ...state, discovered: [...state.discovered, id] };
  emit();
}

export function addToInventory(id: string, count = 1): void {
  const current = state.inventory[id] ?? 0;
  state = { ...state, inventory: { ...state.inventory, [id]: current + count } };
  emit();
}

export function removeFromInventory(id: string, count = 1): boolean {
  const current = state.inventory[id] ?? 0;
  if (current < count) return false;
  const next = { ...state.inventory };
  if (current === count) delete next[id];
  else next[id] = current - count;
  state = { ...state, inventory: next };
  emit();
  return true;
}

export function setActiveReactor(reactor: ReactorId): void {
  if (!state.unlockedReactors.includes(reactor)) return;
  state = { ...state, activeReactor: reactor };
  emit();
}

export function unlockReactor(reactor: ReactorId): void {
  if (state.unlockedReactors.includes(reactor)) return;
  state = { ...state, unlockedReactors: [...state.unlockedReactors, reactor] };
  emit();
}

export function __resetForTests(disablePersist = true): void {
  state = initialState;
  listeners.clear();
  persist = !disablePersist;
}
