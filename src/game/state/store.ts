import { saveToStorage } from './save';
import { freeSupplyIds, recipes as allRecipes } from '../content';
import type { EntityId, Multiset, Recipe } from '../content/types';
import { matchRecipe } from '../physics/recipes';

export type ReactorId =
  | 'workbench'
  | 'stellar-core'
  | 'agb-star'
  | 'supernova'
  | 'cyclotron'
  | 'chem-lab';

/** State-Anteil, der in den Save wandert. */
export type PersistedState = {
  readonly discovered: readonly EntityId[];
  readonly unlockedReactors: readonly ReactorId[];
  readonly activeReactor: ReactorId;
  readonly inventory: Readonly<Record<EntityId, number>>;
};

/** Voller Runtime-State (inkl. Session-Anteile wie reactionZone). */
export type GameState = PersistedState & {
  readonly reactionZone: Multiset;
};

const initialState: GameState = {
  discovered: [],
  unlockedReactors: ['workbench'],
  activeReactor: 'workbench',
  inventory: {},
  reactionZone: {},
};

type Listener = (state: GameState) => void;
type CraftListener = (event: CraftEvent) => void;

export type CraftEvent =
  | { ok: true; recipe: Recipe; discoveredIds: EntityId[] }
  | { ok: false; reason: 'no-match' | 'empty-zone' };

let state: GameState = initialState;
const listeners = new Set<Listener>();
const craftListeners = new Set<CraftListener>();
let persist = true;

function emit(): void {
  for (const listener of listeners) listener(state);
  if (persist) saveToStorage(toPersisted(state));
}

function toPersisted(s: GameState): PersistedState {
  const { reactionZone: _zone, ...persisted } = s;
  void _zone;
  return persisted;
}

export function getState(): GameState {
  return state;
}

export function loadState(persisted: PersistedState): void {
  state = { ...persisted, reactionZone: {} };
  emit();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export function onCraft(listener: CraftListener): () => void {
  craftListeners.add(listener);
  return () => craftListeners.delete(listener);
}

export function discover(id: EntityId): void {
  if (state.discovered.includes(id)) return;
  state = { ...state, discovered: [...state.discovered, id] };
  emit();
}

export function addToInventory(id: EntityId, count = 1): void {
  const current = state.inventory[id] ?? 0;
  state = { ...state, inventory: { ...state.inventory, [id]: current + count } };
  emit();
}

export function removeFromInventory(id: EntityId, count = 1): boolean {
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

export function isAvailable(id: EntityId): boolean {
  if (freeSupplyIds.includes(id)) return true;
  return (state.inventory[id] ?? 0) > 0;
}

export function availableCount(id: EntityId): number {
  if (freeSupplyIds.includes(id)) return Number.POSITIVE_INFINITY;
  return state.inventory[id] ?? 0;
}

export function addToZone(id: EntityId, count = 1): boolean {
  const already = state.reactionZone[id] ?? 0;
  if (availableCount(id) < already + count) return false;

  state = {
    ...state,
    reactionZone: { ...state.reactionZone, [id]: already + count },
  };
  emit();
  return true;
}

export function removeFromZone(id: EntityId, count = 1): boolean {
  const current = state.reactionZone[id] ?? 0;
  if (current < count) return false;
  const next = { ...state.reactionZone };
  if (current === count) delete next[id];
  else next[id] = current - count;
  state = { ...state, reactionZone: next };
  emit();
  return true;
}

export function clearZone(): void {
  if (Object.keys(state.reactionZone).length === 0) return;
  state = { ...state, reactionZone: {} };
  emit();
}

export function craft(): CraftEvent {
  if (Object.keys(state.reactionZone).length === 0) {
    return notify({ ok: false, reason: 'empty-zone' });
  }
  const recipe = matchRecipe(state.reactionZone, state.activeReactor);
  if (!recipe) return notify({ ok: false, reason: 'no-match' });

  const nextInventory: Record<EntityId, number> = { ...state.inventory };

  for (const [id, count] of Object.entries(recipe.inputs)) {
    if (freeSupplyIds.includes(id)) continue;
    const remaining = (nextInventory[id] ?? 0) - count;
    if (remaining <= 0) delete nextInventory[id];
    else nextInventory[id] = remaining;
  }

  for (const [id, count] of Object.entries(recipe.outputs)) {
    nextInventory[id] = (nextInventory[id] ?? 0) + count;
  }

  const discoveredIds: EntityId[] = [];
  const nextDiscovered = [...state.discovered];
  for (const id of Object.keys(recipe.outputs)) {
    if (!nextDiscovered.includes(id)) {
      nextDiscovered.push(id);
      discoveredIds.push(id);
    }
  }

  const nextUnlocked = [...state.unlockedReactors];
  for (const reactor of recipe.unlocksReactors ?? []) {
    if (!nextUnlocked.includes(reactor)) nextUnlocked.push(reactor);
  }

  state = {
    ...state,
    reactionZone: {},
    inventory: nextInventory,
    discovered: nextDiscovered,
    unlockedReactors: nextUnlocked,
  };
  emit();

  return notify({ ok: true, recipe, discoveredIds });
}

/** Hint für die UI: welche Rezepte sind im aktiven Reaktor grundsätzlich vorgesehen? */
export function availableRecipesForActiveReactor(): readonly Recipe[] {
  return allRecipes.filter((r) => r.reactor === state.activeReactor);
}

export function __resetForTests(disablePersist = true): void {
  state = initialState;
  listeners.clear();
  craftListeners.clear();
  persist = !disablePersist;
}

function notify(event: CraftEvent): CraftEvent {
  for (const listener of craftListeners) listener(event);
  return event;
}
