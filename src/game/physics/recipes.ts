import { recipes } from '../content';
import type { EntityId, Multiset, Recipe } from '../content/types';
import type { ReactorId } from '../state/store';

export function multisetEquals(a: Multiset, b: Multiset): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if ((a[k] ?? 0) !== (b[k] ?? 0)) return false;
  }
  return true;
}

export function isRecipeAvailableInMode(recipe: Recipe, expertMode: boolean): boolean {
  const m = recipe.mode ?? 'both';
  if (m === 'both') return true;
  if (m === 'expert') return expertMode;
  return !expertMode;
}

export function matchRecipe(
  zone: Multiset,
  reactor: ReactorId,
  expertMode = false,
): Recipe | null {
  const compact = compact_(zone);
  for (const recipe of recipes) {
    if (recipe.reactor !== reactor) continue;
    if (!isRecipeAvailableInMode(recipe, expertMode)) continue;
    if (multisetEquals(compact, recipe.inputs)) return recipe;
  }
  return null;
}

export function recipesForReactor(reactor: ReactorId, expertMode = false): readonly Recipe[] {
  return recipes.filter((r) => r.reactor === reactor && isRecipeAvailableInMode(r, expertMode));
}

function compact_(m: Multiset): Multiset {
  const out: Record<EntityId, number> = {};
  for (const [k, v] of Object.entries(m)) {
    if (v > 0) out[k] = v;
  }
  return out;
}
