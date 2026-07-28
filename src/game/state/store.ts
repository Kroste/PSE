import { saveToStorage } from './save';
import { freeSupplyIds, recipes as allRecipes } from '../content';
import type { EntityId, Multiset, Recipe } from '../content/types';
import { isRecipeAvailableInMode, matchRecipe } from '../physics/recipes';

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
  /**
   * true = alle Rezepte inkl. Kern-Zwischenschritte / Sternfusion sichtbar,
   * false = nur vereinfachte Rezepte (Nukleonen direkt zu Elementen).
   * Alte Saves ohne dieses Feld werden beim Load auf `false` gesetzt.
   */
  readonly expertMode?: boolean;
};

/** Voller Runtime-State (inkl. Session-Anteile wie reactionZone). */
export type GameState = PersistedState & {
  readonly reactionZone: Multiset;
  readonly expertMode: boolean;
};

const initialState: GameState = {
  discovered: [],
  unlockedReactors: ['workbench'],
  activeReactor: 'workbench',
  inventory: {},
  reactionZone: {},
  expertMode: false,
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
  const reconciled = reconcileUnlockedReactors(persisted);
  state = {
    ...reconciled,
    reactionZone: {},
    expertMode: reconciled.expertMode ?? false,
  };
  emit();
}

export function setExpertMode(expertMode: boolean): void {
  if (state.expertMode === expertMode) return;
  // Falls der aktuelle Reaktor im neuen Modus keine Rezepte mehr hat,
  // auf Werkbank zurückfallen — sonst hängt der Spieler in einem leeren Reaktor.
  const activeHasRecipes = allRecipes.some(
    (r) => r.reactor === state.activeReactor && isRecipeAvailableInMode(r, expertMode),
  );
  state = {
    ...state,
    expertMode,
    activeReactor: activeHasRecipes ? state.activeReactor : 'workbench',
    reactionZone: {},
  };
  emit();
}

/**
 * Ableitung: wenn eine bereits entdeckte Entity als Output eines Rezepts mit
 * `unlocksReactors` vorkommt, muss dieses Rezept irgendwann gecraftet worden
 * sein — also gehören die Reaktoren zwingend zu `unlockedReactors`. Fängt
 * Saves ab, die vor Einführung einer Freischaltungs-Regel entstanden sind.
 */
export function reconcileUnlockedReactors(persisted: PersistedState): PersistedState {
  const discovered = new Set<EntityId>(persisted.discovered);
  const unlocked = new Set<ReactorId>(persisted.unlockedReactors);
  const before = unlocked.size;

  for (const recipe of allRecipes) {
    if (!recipe.unlocksReactors || recipe.unlocksReactors.length === 0) continue;
    const outputWasDiscovered = Object.keys(recipe.outputs).some((id) => discovered.has(id));
    if (!outputWasDiscovered) continue;
    for (const r of recipe.unlocksReactors) unlocked.add(r);
  }

  if (unlocked.size === before) return persisted;
  return { ...persisted, unlockedReactors: [...unlocked] };
}

export function resetState(): void {
  state = initialState;
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
  if (state.discovered.includes(id)) return true;
  return (state.inventory[id] ?? 0) > 0;
}

export function availableCount(id: EntityId): number {
  if (freeSupplyIds.includes(id)) return Number.POSITIVE_INFINITY;
  if (state.discovered.includes(id)) return Number.POSITIVE_INFINITY;
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
  const recipe = matchRecipe(state.reactionZone, state.activeReactor, state.expertMode);
  if (!recipe) return notify({ ok: false, reason: 'no-match' });

  const nextInventory: Record<EntityId, number> = { ...state.inventory };
  const discoveredSet = new Set<EntityId>(state.discovered);

  for (const [id, count] of Object.entries(recipe.inputs)) {
    if (freeSupplyIds.includes(id)) continue;
    if (discoveredSet.has(id)) continue; // Einmal entdeckt = unbegrenzt.
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

  // WICHTIG: onCraft muss VOR emit feuern, damit der Renderer die noch
  // gefüllte Reaktionszone beim Start der Fusion-Animation sieht. Sonst
  // hätte subscribe die Zone-Meshes bereits geleert, bevor der Fusion-Handler
  // an sie kommt.
  const event: CraftEvent = { ok: true, recipe, discoveredIds };
  notify(event);

  state = {
    ...state,
    reactionZone: {},
    inventory: nextInventory,
    discovered: nextDiscovered,
    unlockedReactors: nextUnlocked,
  };
  emit();

  return event;
}

/** Hint für die UI: welche Rezepte sind im aktiven Reaktor grundsätzlich vorgesehen? */
export function availableRecipesForActiveReactor(): readonly Recipe[] {
  return allRecipes.filter(
    (r) => r.reactor === state.activeReactor && isRecipeAvailableInMode(r, state.expertMode),
  );
}

export function hasRecipesInReactor(reactor: ReactorId): boolean {
  return allRecipes.some(
    (r) => r.reactor === reactor && isRecipeAvailableInMode(r, state.expertMode),
  );
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
