import { freeSupplyIds, recipes as allRecipes } from './content';
import { isRecipeAvailableInMode } from './physics/recipes';
import type { EntityId, Recipe } from './content/types';

/**
 * Findet einen "Bauplan" — die Rezept-Kette, die nötig ist, um ein
 * Zielmolekül (oder -Atom/-Kern) aus den freien Zutaten (Quarks, e⁻,
 * γ, Gluon) zu erzeugen. Ergebnis ist eine topologisch sortierte
 * Liste von Rezepten: wer sie der Reihe nach ausführt, hat am Ende
 * das Ziel im Inventar.
 *
 * Algorithmus: BFS über den Rezept-Hypergraphen. Jede Iteration
 * versucht alle Rezepte, deren Zutaten schon produzierbar sind,
 * und erweitert die Menge der produzierbaren Entities. Für jeden
 * neu-produzierbaren Output merkt sich `via[]` das Erst-Rezept.
 * Die Wegrekonstruktion ist rekursiv über die `via`-Map.
 */
export type BuildPlan = {
  /** Die geordnete Rezept-Kette. */
  steps: Recipe[];
  /** Die Reaktoren, die für die Kette gebraucht werden. */
  reactors: string[];
  /** Anzahl der freien Zutaten, die man verbraucht. */
  freeSupplyCount: number;
};

/**
 * Baut das komplette Ableitungs-Set einmal auf und merkt sich das
 * kürzeste Rezept pro Ziel — anschließend kann für jedes beliebige
 * Ziel eine Kette in O(steps) rekonstruiert werden.
 */
export function buildReachability(expertMode: boolean): {
  producible: Set<EntityId>;
  via: Map<EntityId, Recipe>;
  depth: Map<EntityId, number>;
} {
  const producible = new Set<EntityId>(freeSupplyIds);
  const depth = new Map<EntityId, number>();
  const via = new Map<EntityId, Recipe>();
  for (const id of freeSupplyIds) depth.set(id, 0);

  const usableRecipes = allRecipes.filter((r) => isRecipeAvailableInMode(r, expertMode));

  // Iteriere bis fixed-point: solange sich noch etwas ändert.
  // Jede Iteration ist O(|Rezepte| · durchschn. inputs), Schleifen selten > 10.
  let changed = true;
  let safety = 200;
  while (changed && safety-- > 0) {
    changed = false;
    for (const recipe of usableRecipes) {
      const inputIds = Object.keys(recipe.inputs);
      if (!inputIds.every((id) => producible.has(id))) continue;
      const maxInputDepth = inputIds.reduce((m, id) => Math.max(m, depth.get(id) ?? 0), 0);
      for (const outputId of Object.keys(recipe.outputs)) {
        if (producible.has(outputId)) continue;
        producible.add(outputId);
        depth.set(outputId, maxInputDepth + 1);
        via.set(outputId, recipe);
        changed = true;
      }
    }
  }

  return { producible, via, depth };
}

/**
 * Extrahiert für ein Ziel die minimale Rezept-Kette. `null` wenn das
 * Ziel im aktuellen Modus nicht erreichbar ist (fehlende Rezepte,
 * falscher Modus). Wenn das Ziel selbst free-supply ist, gibt einen
 * leeren Plan zurück (nichts zu craften).
 */
export function planFor(targetId: EntityId, expertMode: boolean): BuildPlan | null {
  const freeSet = new Set<EntityId>(freeSupplyIds);
  if (freeSet.has(targetId)) {
    return { steps: [], reactors: [], freeSupplyCount: 0 };
  }
  const { producible, via } = buildReachability(expertMode);
  if (!producible.has(targetId)) return null;

  // Depth-first Aufbau: für Ziel das Rezept holen, rekursiv für jeden
  // Input erst dessen Kette anfügen, am Ende das eigene Rezept.
  const seenRecipes = new Set<string>();
  const orderedRecipes: Recipe[] = [];
  const inProgress = new Set<EntityId>();

  function collect(id: EntityId): void {
    if (freeSet.has(id)) return;
    if (inProgress.has(id)) return; // Zyklus-Schutz
    inProgress.add(id);
    const recipe = via.get(id);
    if (!recipe) return;
    for (const inputId of Object.keys(recipe.inputs)) collect(inputId);
    if (!seenRecipes.has(recipe.id)) {
      seenRecipes.add(recipe.id);
      orderedRecipes.push(recipe);
    }
    inProgress.delete(id);
  }
  collect(targetId);

  const reactors = [...new Set(orderedRecipes.map((r) => r.reactor))];
  let freeCount = 0;
  for (const r of orderedRecipes) {
    for (const [id, n] of Object.entries(r.inputs)) {
      if (freeSet.has(id)) freeCount += n;
    }
  }
  return { steps: orderedRecipes, reactors, freeSupplyCount: freeCount };
}
