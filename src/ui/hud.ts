import {
  addToZone,
  availableCount,
  availableRecipesForActiveReactor,
  clearZone,
  craft,
  getState,
  hasRecipesInReactor,
  onCraft,
  removeFromZone,
  resetState,
  setActiveReactor,
  setExpertMode,
  subscribe,
} from '../game/state/store';
import { clearStorage } from '../game/state/save';
import { isAudioEnabled, setAudioEnabled, sfx } from '../engine/audio';
import { allEntities, elements, freeSupplyIds, getEntity, molecules, recipes as allRecipes } from '../game/content';
import { reactorMeta } from '../game/content/reactors';
import { pseLayout } from '../game/content/pse-layout';
import { isRecipeAvailableInMode } from '../game/physics/recipes';
import type { Entity, ElementEntity, MoleculeEntity, Recipe } from '../game/content/types';
import { createOrbitalPreview, type OrbitalPreview } from '../game/atoms/orbital-preview';

let feedbackTimer: number | undefined;

export type HudOptions = {
  /** Wird bei Element-Auswahl aufgerufen. `null` = kein Atom zeigen. */
  showAtom?: (elementId: string | null) => void;
};

export function mountHud(opts: HudOptions = {}): void {
  const inventoryEl = document.getElementById('pse-inventory');
  const detailEl = document.getElementById('pse-detail');
  const reactorsEl = document.getElementById('pse-reactors');
  const tableEl = document.getElementById('pse-table');
  const toggleBtn = document.getElementById('pse-toggle-table');
  const resetBtn = document.getElementById('pse-reset');
  const expertBtn = document.getElementById('pse-toggle-expert');
  const audioBtn = document.getElementById('pse-toggle-audio');
  const kbEl = document.getElementById('pse-kb');
  const kbBtn = document.getElementById('pse-toggle-kb');
  if (
    !inventoryEl ||
    !detailEl ||
    !reactorsEl ||
    !tableEl ||
    !toggleBtn ||
    !resetBtn ||
    !expertBtn ||
    !audioBtn ||
    !kbEl ||
    !kbBtn
  ) {
    throw new Error('HUD-Container fehlen im DOM.');
  }

  // Detail-Panel-Skelett: Header, Preview-Slot (persistent), Content (re-rendered)
  detailEl.innerHTML = '';
  const detailHeader = document.createElement('h2');
  detailHeader.textContent = 'Detail';
  detailEl.appendChild(detailHeader);

  const previewWrap = document.createElement('div');
  previewWrap.className = 'pse-preview-wrap';
  previewWrap.hidden = true;
  const previewLabel = document.createElement('div');
  previewLabel.className = 'pse-preview-label';
  previewLabel.textContent = 'Quanten-Orbitale';
  previewWrap.appendChild(previewLabel);
  const preview: OrbitalPreview = createOrbitalPreview(220);
  previewWrap.appendChild(preview.canvas);
  detailEl.appendChild(previewWrap);

  const detailContent = document.createElement('div');
  detailContent.className = 'pse-detail-content';
  detailEl.appendChild(detailContent);

  let selectedEntityId: string | null = null;

  // Inventar-UX-State: Suchfilter + kollapsierte Sektionen. Persistiert.
  let inventorySearch = '';
  const collapsedSections = new Set<string>(loadCollapsedSections());

  const selectEntity = (id: string): void => {
    selectedEntityId = id;
    rerenderDetail();
    const entity = getEntity(id);
    if ((entity?.kind === 'element' || entity?.kind === 'molecule') && opts.showAtom) {
      opts.showAtom(id);
    }
  };

  const toggleSection = (key: string): void => {
    if (collapsedSections.has(key)) collapsedSections.delete(key);
    else collapsedSections.add(key);
    saveCollapsedSections(collapsedSections);
    rerenderInventory();
  };

  const setSearch = (q: string): void => {
    inventorySearch = q;
    rerenderInventory();
  };

  const rerenderDetail = (): void => {
    renderDetail(detailContent, selectedEntityId);
    const entity = selectedEntityId ? getEntity(selectedEntityId) : null;
    if (entity?.kind === 'element') {
      previewWrap.hidden = false;
      previewLabel.textContent = 'Quanten-Orbitale';
      preview.show(entity as ElementEntity);
    } else if (entity?.kind === 'molecule') {
      previewWrap.hidden = false;
      previewLabel.textContent = 'Ball-Stick-Modell';
      preview.show(entity as MoleculeEntity);
    } else {
      previewWrap.hidden = true;
      preview.show(null);
    }
  };

  const rerenderInventory = (): void => {
    renderInventory(inventoryEl, {
      onSelect: selectEntity,
      search: inventorySearch,
      collapsed: collapsedSections,
      onToggleSection: toggleSection,
      onSearchChange: setSearch,
    });
  };

  const rerenderReactors = (): void => renderReactors(reactorsEl);

  const rerenderTable = (): void => {
    if (tableEl.hidden) return;
    renderPeriodicTable(tableEl, { onSelect: selectEntity });
  };

  const kbState = { kind: 'all' as string, status: 'all' as string, search: '' };
  const rerenderKb = (): void => {
    if (kbEl.hidden) return;
    renderKnowledgeBase(kbEl, kbState, {
      onSelect: (id) => {
        selectEntity(id);
      },
      onFilter: (patch) => {
        Object.assign(kbState, patch);
        rerenderKb();
      },
    });
  };

  toggleBtn.addEventListener('click', () => {
    tableEl.hidden = !tableEl.hidden;
    toggleBtn.classList.toggle('pse-btn-primary', !tableEl.hidden);
    if (!tableEl.hidden) {
      kbEl.hidden = true;
      kbBtn.classList.remove('pse-btn-primary');
    }
    rerenderTable();
  });

  kbBtn.addEventListener('click', () => {
    kbEl.hidden = !kbEl.hidden;
    kbBtn.classList.toggle('pse-btn-primary', !kbEl.hidden);
    if (!kbEl.hidden) {
      tableEl.hidden = true;
      toggleBtn.classList.remove('pse-btn-primary');
    }
    rerenderKb();
  });

  const syncExpertBtn = (): void => {
    const active = getState().expertMode;
    expertBtn.classList.toggle('pse-btn-primary', active);
    expertBtn.textContent = active ? 'Experten-Modus  ✓' : 'Experten-Modus';
  };
  expertBtn.addEventListener('click', () => {
    setExpertMode(!getState().expertMode);
  });
  syncExpertBtn();

  const syncAudioBtn = (): void => {
    const on = isAudioEnabled();
    audioBtn.textContent = on ? '🔊 Sound' : '🔇 Sound';
    audioBtn.classList.toggle('pse-btn-primary', on);
  };
  audioBtn.addEventListener('click', () => {
    setAudioEnabled(!isAudioEnabled());
    if (isAudioEnabled()) sfx.toggle();
    syncAudioBtn();
  });
  syncAudioBtn();

  resetBtn.addEventListener('click', () => {
    const confirmed = window.confirm(
      'Kompletten Fortschritt löschen und neu starten? Diese Aktion lässt sich nicht rückgängig machen.',
    );
    if (!confirmed) return;
    clearStorage();
    resetState();
    if (!tableEl.hidden) {
      tableEl.hidden = true;
      toggleBtn.classList.remove('pse-btn-primary');
    }
    selectedEntityId = null;
    rerenderDetail();
  });

  subscribe(() => {
    rerenderInventory();
    rerenderDetail();
    rerenderReactors();
    rerenderTable();
    rerenderKb();
    syncExpertBtn();
  });

  onCraft((event) => {
    if (event.ok) {
      const label = describeOutputs(event.recipe.outputs);
      const isNew = event.discoveredIds.length > 0 ? ' · NEU entdeckt!' : '';
      showFeedback(`✔ ${label}${isNew}`, 'ok');
      if (event.discoveredIds.length > 0) sfx.discovery();
      else sfx.fusion();
      if (event.discoveredIds[0]) {
        selectedEntityId = event.discoveredIds[0];
        rerenderDetail();
      }
    } else {
      const msg =
        event.reason === 'empty-zone'
          ? 'Reaktionszone ist leer.'
          : 'Keine passende Reaktion für diese Zutaten im aktiven Reaktor.';
      showFeedback(`✖ ${msg}`, 'err');
      if (event.reason === 'no-match') sfx.decay();
    }
  });
}

type InventoryOptions = {
  onSelect: (id: string) => void;
  search?: string;
  collapsed?: Set<string>;
  onToggleSection?: (key: string) => void;
  onSearchChange?: (q: string) => void;
};

const COLLAPSED_STORAGE_KEY = 'pse.ui.collapsedSections';

function loadCollapsedSections(): string[] {
  try {
    const raw = localStorage.getItem(COLLAPSED_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveCollapsedSections(set: Set<string>): void {
  try {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // ignorieren
  }
}

function matchesSearch(entity: Entity, needle: string): boolean {
  if (!needle) return true;
  const q = needle.toLowerCase();
  if (entity.id.toLowerCase().includes(q)) return true;
  if (entity.nameDE.toLowerCase().includes(q)) return true;
  if (entity.symbol && entity.symbol.toLowerCase().includes(q)) return true;
  if (entity.kind === 'molecule' && entity.formula.toLowerCase().includes(q)) return true;
  if (entity.kind === 'molecule' && entity.categoryDE.toLowerCase().includes(q)) return true;
  return false;
}

/**
 * Welche Entity-Kinds sind pro Reaktor sinnvoll?
 * - workbench: Elementarteilchen bis Atome (aber keine Moleküle — dafür ist chem-lab).
 * - Sternfusion (stellar-core, agb-star, supernova, cyclotron): Nukleonen, Kerne,
 *   Photonen. Keine ganzen Atome oder Moleküle — die entstehen woanders.
 * - chem-lab: nur ganze Atome und Moleküle. Elementarteilchen sind hier ohne Rolle.
 */
const REACTOR_KINDS: Record<string, Set<string>> = {
  workbench: new Set(['particle', 'hadron', 'nucleus', 'element']),
  'stellar-core': new Set(['particle', 'hadron', 'nucleus']),
  'agb-star': new Set(['particle', 'hadron', 'nucleus']),
  supernova: new Set(['particle', 'hadron', 'nucleus']),
  cyclotron: new Set(['particle', 'hadron', 'nucleus']),
  'chem-lab': new Set(['element', 'molecule']),
};

function reactorAllowsKind(reactor: string, kind: string): boolean {
  const kinds = REACTOR_KINDS[reactor];
  return kinds ? kinds.has(kind) : true;
}

function renderInventory(el: HTMLElement, opts: InventoryOptions): void {
  const state = getState();
  const search = opts.search ?? '';
  const collapsed = opts.collapsed ?? new Set<string>();

  // Focus im Suchfeld über rerenders erhalten
  const wasSearchFocused =
    document.activeElement instanceof HTMLInputElement &&
    document.activeElement.classList.contains('pse-search-input');
  const cursorPos =
    wasSearchFocused && document.activeElement instanceof HTMLInputElement
      ? document.activeElement.selectionStart
      : null;

  el.innerHTML = '';

  // Suchfeld ganz oben — bleibt fokussiert auch nach rerender
  el.appendChild(searchBox(search, opts.onSearchChange));

  const passesSearch = (entity: Entity): boolean => matchesSearch(entity, search);

  // Elementarteilchen (freeSupply) nur, wenn Reaktor sie braucht
  if (reactorAllowsKind(state.activeReactor, 'particle')) {
    const items: Array<[string, number]> = [];
    for (const id of freeSupplyIds) {
      const entity = getEntity(id);
      if (!entity) continue;
      if (!passesSearch(entity)) continue;
      items.push([id, Infinity]);
    }
    if (items.length > 0) {
      appendCollapsibleSection(
        el,
        'freesupply',
        'Elementarteilchen',
        items.length,
        collapsed,
        opts.onToggleSection,
        () => {
          for (const [id] of items) {
            const entity = getEntity(id);
            if (!entity) continue;
            el.appendChild(inventoryRow(entity, Infinity, state.reactionZone[id] ?? 0, opts));
          }
        },
      );
    }
  }

  // Discovered non-freeSupply nach kind gruppieren
  const freeSet = new Set<string>(freeSupplyIds);
  const nonFreeIds = state.discovered.filter((id) => !freeSet.has(id));
  const byKind: Record<string, string[]> = {};
  for (const id of nonFreeIds) {
    const entity = getEntity(id);
    if (!entity) continue;
    if (!reactorAllowsKind(state.activeReactor, entity.kind)) continue;
    (byKind[entity.kind] ??= []).push(id);
  }

  const kindOrder: Array<[string, string]> = [
    ['particle', 'Erzeugte Teilchen'],
    ['hadron', 'Hadronen'],
    ['nucleus', 'Atomkerne'],
    ['element', 'Atome & Elemente'],
    // Moleküle behandeln wir eigens (Sub-Gruppierung nach categoryDE)
  ];
  for (const [kind, title] of kindOrder) {
    const ids = byKind[kind];
    if (!ids || ids.length === 0) continue;
    const filtered = ids.filter((id) => {
      const e = getEntity(id);
      return e ? passesSearch(e) : false;
    });
    if (filtered.length === 0) continue;
    appendCollapsibleSection(
      el,
      `kind:${kind}`,
      title,
      filtered.length,
      collapsed,
      opts.onToggleSection,
      () => {
        for (const id of filtered) {
          const entity = getEntity(id);
          if (!entity) continue;
          el.appendChild(inventoryRow(entity, Infinity, state.reactionZone[id] ?? 0, opts));
        }
      },
    );
  }

  // Moleküle: Sub-Gruppierung nach categoryDE
  const molIds = byKind['molecule'];
  if (molIds && molIds.length > 0) {
    const byCategory = new Map<string, string[]>();
    for (const id of molIds) {
      const e = getEntity(id);
      if (!e || e.kind !== 'molecule') continue;
      if (!passesSearch(e)) continue;
      const cat = e.categoryDE || 'Sonstige';
      const list = byCategory.get(cat) ?? [];
      list.push(id);
      byCategory.set(cat, list);
    }
    // Sortierung: alphabetisch, aber "Silikon"/"Silizium" ans Ende (spezialisiert)
    const categories = [...byCategory.keys()].sort((a, b) => {
      const aSilicon = a.startsWith('Silizium') || a.startsWith('Silikon');
      const bSilicon = b.startsWith('Silizium') || b.startsWith('Silikon');
      if (aSilicon !== bSilicon) return aSilicon ? 1 : -1;
      return a.localeCompare(b, 'de');
    });
    for (const cat of categories) {
      const ids = byCategory.get(cat)!;
      appendCollapsibleSection(
        el,
        `mol:${cat}`,
        cat,
        ids.length,
        collapsed,
        opts.onToggleSection,
        () => {
          for (const id of ids) {
            const entity = getEntity(id);
            if (!entity) continue;
            el.appendChild(inventoryRow(entity, Infinity, state.reactionZone[id] ?? 0, opts));
          }
        },
      );
    }
  }

  el.appendChild(zonePanel(state.reactionZone));
  el.appendChild(craftControls());
  el.appendChild(feedbackBox());
  el.appendChild(goalBox(opts.onSelect));
  el.appendChild(hintsBox());

  // Focus im Suchfeld wiederherstellen
  if (wasSearchFocused) {
    const newInput = el.querySelector<HTMLInputElement>('.pse-search-input');
    if (newInput) {
      newInput.focus();
      if (cursorPos !== null) newInput.setSelectionRange(cursorPos, cursorPos);
    }
  }
}

function searchBox(current: string, onChange?: (q: string) => void): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'pse-search';
  const input = document.createElement('input');
  input.type = 'search';
  input.placeholder = '🔍  Suche nach Symbol, Formel oder Name';
  input.value = current;
  input.className = 'pse-search-input';
  input.addEventListener('input', () => onChange?.(input.value));
  wrap.appendChild(input);
  return wrap;
}

function appendCollapsibleSection(
  parent: HTMLElement,
  key: string,
  title: string,
  count: number,
  collapsed: Set<string>,
  onToggle: ((k: string) => void) | undefined,
  renderBody: () => void,
): void {
  const isCollapsed = collapsed.has(key);
  const header = document.createElement('button');
  header.type = 'button';
  header.className = 'pse-section pse-section-toggle';
  header.classList.toggle('pse-section-collapsed', isCollapsed);
  const chevron = isCollapsed ? '▸' : '▾';
  header.textContent = `${chevron}  ${title}  (${count})`;
  header.addEventListener('click', () => onToggle?.(key));
  parent.appendChild(header);
  if (!isCollapsed) renderBody();
}

function renderDetail(el: HTMLElement, selectedEntityId: string | null): void {
  el.innerHTML = '';

  if (!selectedEntityId) {
    const hint = document.createElement('p');
    hint.className = 'pse-hint';
    hint.textContent = 'Klicke auf ein Element im Inventar.';
    el.appendChild(hint);
    return;
  }

  const entity = getEntity(selectedEntityId);
  if (!entity) return;

  el.appendChild(detailTitle(entity));
  el.appendChild(detailAttributes(entity));

  const note = document.createElement('p');
  note.className = 'pse-note';
  note.textContent = entity.scienceNoteDE;
  el.appendChild(note);

  const src = document.createElement('p');
  src.className = 'pse-source';
  src.textContent = `Quelle: ${entity.source}`;
  el.appendChild(src);
}

function sectionHeader(text: string): HTMLElement {
  const h = document.createElement('h3');
  h.className = 'pse-section';
  h.textContent = text;
  return h;
}

function inventoryRow(
  entity: Entity,
  count: number,
  inZone: number,
  opts: InventoryOptions,
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'pse-row';

  const canAddMore = availableCount(entity.id) > inZone;
  if (canAddMore) {
    row.draggable = true;
    row.classList.add('pse-draggable');
    row.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData(DND_TYPE, entity.id);
      e.dataTransfer!.effectAllowed = 'copy';
      row.classList.add('pse-dragging');
    });
    row.addEventListener('dragend', () => row.classList.remove('pse-dragging'));
  }

  const dot = document.createElement('span');
  dot.className = 'pse-dot';
  dot.style.background = entity.color;
  row.appendChild(dot);

  const label = document.createElement('button');
  label.className = 'pse-label';
  label.type = 'button';
  const inZoneText = inZone > 0 ? `  (Zone: ${inZone})` : '';
  const countText = Number.isFinite(count) ? `${count}` : '∞';
  label.textContent = `${entity.symbol ?? entity.id} · ${entity.nameDE}  ×${countText}${inZoneText}`;
  label.addEventListener('click', () => opts.onSelect(entity.id));
  row.appendChild(label);

  if (inZone > 0) {
    const rmBtn = document.createElement('button');
    rmBtn.className = 'pse-btn pse-btn-rm';
    rmBtn.type = 'button';
    rmBtn.textContent = '−';
    rmBtn.title = 'Aus Reaktionszone entfernen';
    rmBtn.addEventListener('click', () => {
      sfx.tickDown();
      removeFromZone(entity.id, 1);
    });
    row.appendChild(rmBtn);
  }

  const addBtn = document.createElement('button');
  addBtn.className = 'pse-btn pse-btn-add';
  addBtn.type = 'button';
  addBtn.textContent = '+';
  addBtn.title = 'In Reaktionszone';
  addBtn.disabled = !canAddMore;
  addBtn.addEventListener('click', () => {
    if (addToZone(entity.id, 1)) sfx.tick();
  });
  row.appendChild(addBtn);

  return row;
}

const DND_TYPE = 'application/x-pse-entity-id';

function zonePanel(zone: Record<string, number>): HTMLElement {
  const box = document.createElement('div');
  box.className = 'pse-zone';
  box.appendChild(sectionHeader('Reaktionszone'));

  box.addEventListener('dragover', (e) => {
    if (!e.dataTransfer?.types.includes(DND_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    box.classList.add('pse-drop-hover');
  });
  box.addEventListener('dragleave', (e) => {
    if (e.target === box) box.classList.remove('pse-drop-hover');
  });
  box.addEventListener('drop', (e) => {
    box.classList.remove('pse-drop-hover');
    const id = e.dataTransfer?.getData(DND_TYPE);
    if (!id) return;
    e.preventDefault();
    if (addToZone(id, 1)) sfx.tick();
  });

  const entries = Object.entries(zone);
  if (entries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'pse-hint';
    empty.textContent = 'Leer — füge Zutaten hinzu oder zieh sie hier hinein.';
    box.appendChild(empty);
    return box;
  }

  const line = document.createElement('div');
  line.className = 'pse-zone-line';
  line.textContent = entries
    .map(([id, n]) => `${n} × ${getEntity(id)?.symbol ?? id}`)
    .join('  +  ');
  box.appendChild(line);
  return box;
}

function craftControls(): HTMLElement {
  const box = document.createElement('div');
  box.className = 'pse-controls';

  const craftBtn = document.createElement('button');
  craftBtn.className = 'pse-btn pse-btn-primary';
  craftBtn.type = 'button';
  craftBtn.textContent = '⚛  Reaktion ausführen';
  craftBtn.addEventListener('click', () => {
    sfx.reactor();
    craft();
  });
  box.appendChild(craftBtn);

  const clearBtn = document.createElement('button');
  clearBtn.className = 'pse-btn';
  clearBtn.type = 'button';
  clearBtn.textContent = 'Zone leeren';
  clearBtn.addEventListener('click', () => {
    sfx.tickDown();
    clearZone();
  });
  box.appendChild(clearBtn);

  return box;
}

type NextGoal = {
  entity: ElementEntity | MoleculeEntity;
  recipe: Recipe;
  headline: string;
  subtitle: string;
  emptyMessage: string;
};

function findNextGoal(): NextGoal | null {
  const state = getState();
  const discovered = new Set(state.discovered);

  // Im Chemielabor sucht der Spieler Reaktionen zu neuen Verbindungen — nicht neue Elemente.
  if (state.activeReactor === 'chem-lab') {
    const nextMol = molecules
      .filter((m) => !discovered.has(m.id))
      .sort((a, b) => a.molarMassGmol - b.molarMassGmol)[0];
    if (nextMol) {
      const recipe = allRecipes.find(
        (r) =>
          (r.outputs[nextMol.id] ?? 0) === 1 &&
          isRecipeAvailableInMode(r, state.expertMode),
      );
      if (recipe) {
        return {
          entity: nextMol,
          recipe,
          headline: 'Nächste Reaktion',
          subtitle: `${nextMol.symbol}  ·  ${nextMol.nameDE}`,
          emptyMessage: '✓ Alle Verbindungen in diesem Modus entdeckt',
        };
      }
    }
    return {
      entity: null as never,
      recipe: null as never,
      headline: '',
      subtitle: '',
      emptyMessage: '✓ Alle Verbindungen in diesem Modus entdeckt',
    };
  }

  // Andere Reaktoren: nächstes noch nicht entdecktes Element (nach Z sortiert).
  const nextEl = elements
    .filter((e) => !discovered.has(e.id))
    .sort((a, b) => a.z - b.z)[0];
  if (!nextEl) return null;
  const recipe = allRecipes.find(
    (r) =>
      (r.outputs[nextEl.id] ?? 0) === 1 &&
      isRecipeAvailableInMode(r, state.expertMode),
  );
  if (!recipe) return null;
  return {
    entity: nextEl,
    recipe,
    headline: 'Nächstes Element',
    subtitle: `${nextEl.symbol}  ·  ${nextEl.nameDE}  (Z=${nextEl.z})`,
    emptyMessage: '✓ Alle Elemente in diesem Modus entdeckt',
  };
}

function goalBox(onSelect: (id: string) => void): HTMLElement {
  const box = document.createElement('div');
  box.className = 'pse-goal';

  const goal = findNextGoal();
  if (!goal || !goal.entity) {
    box.classList.add('pse-goal-done');
    box.textContent = goal?.emptyMessage ?? '✓ Alle Ziele in diesem Modus entdeckt';
    return box;
  }

  const header = document.createElement('div');
  header.className = 'pse-goal-header';
  header.textContent = goal.headline;
  box.appendChild(header);

  const title = document.createElement('button');
  title.className = 'pse-goal-title';
  title.type = 'button';
  title.textContent = goal.subtitle;
  title.style.color = goal.entity.color;
  title.addEventListener('click', () => onSelect(goal.entity.id));
  box.appendChild(title);

  const reactorMetaInfo = reactorMeta[goal.recipe.reactor];
  const inputsText = Object.entries(goal.recipe.inputs)
    .map(([id, n]) => `${n}·${getEntity(id)?.symbol ?? id}`)
    .join(' + ');
  const outputSym = goal.entity.symbol ?? goal.entity.id;
  const recipeLine = document.createElement('div');
  recipeLine.className = 'pse-goal-recipe';
  recipeLine.textContent = `${inputsText} → ${outputSym}  @ ${reactorMetaInfo.nameDE}`;
  box.appendChild(recipeLine);

  return box;
}


function feedbackBox(): HTMLElement {
  const box = document.createElement('div');
  box.id = 'pse-feedback';
  box.className = 'pse-feedback';
  return box;
}

function hintsBox(): HTMLElement {
  const box = document.createElement('div');
  box.className = 'pse-hints';

  const discovered = new Set<string>(getState().discovered);
  const open: Recipe[] = [];
  const done: Recipe[] = [];
  for (const r of availableRecipesForActiveReactor()) {
    const outputs = Object.keys(r.outputs);
    (outputs.every((id) => discovered.has(id)) ? done : open).push(r);
  }

  box.appendChild(sectionHeader(`Offene Reaktionen (${open.length})`));
  if (open.length === 0) {
    const hint = document.createElement('p');
    hint.className = 'pse-hint';
    hint.textContent = 'Alle Reaktionen dieses Reaktors sind entdeckt.';
    box.appendChild(hint);
  } else {
    for (const recipe of open) {
      const line = document.createElement('div');
      line.className = 'pse-hint-row';
      const left = Object.entries(recipe.inputs)
        .map(([id, n]) => `${n}·${getEntity(id)?.symbol ?? id}`)
        .join(' + ');
      const right = Object.entries(recipe.outputs)
        .map(([id, n]) => `${n}·${getEntity(id)?.symbol ?? id}`)
        .join(' + ');
      line.textContent = `${left}  →  ${right}`;
      box.appendChild(line);
    }
  }

  if (done.length > 0) {
    box.appendChild(sectionHeader(`Entdeckt (${done.length})`));
    const line = document.createElement('div');
    line.className = 'pse-hint-done';
    line.textContent = done
      .map((r) =>
        Object.keys(r.outputs)
          .map((id) => getEntity(id)?.symbol ?? id)
          .join('+'),
      )
      .join('  ·  ');
    box.appendChild(line);
  }

  return box;
}

function detailTitle(entity: Entity): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'pse-detail-title';

  const dot = document.createElement('span');
  dot.className = 'pse-dot pse-dot-lg';
  dot.style.background = entity.color;
  wrap.appendChild(dot);

  const t = document.createElement('span');
  t.className = 'pse-detail-name';
  t.textContent = `${entity.symbol ? entity.symbol + ' · ' : ''}${entity.nameDE}`;
  wrap.appendChild(t);
  return wrap;
}

function detailAttributes(entity: Entity): HTMLElement {
  const dl = document.createElement('dl');
  dl.className = 'pse-attr';

  const push = (k: string, v: string): void => {
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = v;
    dl.appendChild(dt);
    dl.appendChild(dd);
  };

  push('Typ', entity.kind);
  if (entity.kind === 'particle') {
    push('Kategorie', entity.category);
    push('Ladung', `${entity.charge} e`);
    push('Spin', String(entity.spin));
    push('Masse', `${entity.massMeV} MeV/c²`);
  } else if (entity.kind === 'hadron') {
    push('Kategorie', entity.category);
    push('Quarks', entity.quarks.join(''));
    push('Ladung', `${entity.charge} e`);
    push('Masse', `${entity.massMeV} MeV/c²`);
  } else if (entity.kind === 'nucleus') {
    push('Ordnungszahl Z', String(entity.z));
    push('Massenzahl A', String(entity.a));
    push('Kern', `${entity.protons}p + ${entity.neutrons}n`);
    push('Masse', `${entity.massMeV} MeV/c²`);
    push('Bindungsenergie', `${entity.bindingEnergyMeV} MeV`);
    if (entity.halfLifeS !== undefined) {
      push('Halbwertszeit', formatHalfLife(entity.halfLifeS));
    } else {
      push('Stabilität', 'stabil');
    }
  } else if (entity.kind === 'molecule') {
    push('Formel', entity.formula);
    push('Geometrie', entity.geometry);
    push('Molmasse', `${entity.molarMassGmol} g/mol`);
    push('Atome', String(entity.atoms.length));
    push('Bindungen', String(entity.bonds.length));
    push('Kategorie', entity.categoryDE);
  } else {
    push('Ordnungszahl Z', String(entity.z));
    push('Atommasse', `${entity.atomicMassU} u`);
    push('Konfiguration', entity.electronConfig);
    push('Periode', String(entity.period));
    push('Block', entity.block);
  }
  return dl;
}

function formatHalfLife(seconds: number): string {
  if (seconds < 60) return `${seconds.toPrecision(3)} s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${minutes.toPrecision(3)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toPrecision(3)} h`;
  const days = hours / 24;
  if (days < 365.25) return `${days.toPrecision(3)} d`;
  const years = days / 365.25;
  return `${years.toPrecision(3)} a`;
}

function describeOutputs(outputs: Record<string, number>): string {
  return Object.entries(outputs)
    .map(([id, n]) => `${n}× ${getEntity(id)?.nameDE ?? id}`)
    .join(', ');
}

function renderReactors(el: HTMLElement): void {
  const state = getState();
  el.innerHTML = '';
  for (const id of state.unlockedReactors) {
    if (!hasRecipesInReactor(id)) continue;
    const meta = reactorMeta[id];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pse-reactor';
    if (id === state.activeReactor) btn.classList.add('pse-reactor-active');
    btn.title = meta.descriptionDE;
    btn.textContent = `${meta.symbol}  ${meta.nameDE}`;
    btn.addEventListener('click', () => {
      sfx.reactor();
      setActiveReactor(id);
    });
    el.appendChild(btn);
  }
}

type TableOptions = { onSelect: (id: string) => void };

const CATEGORY_LABELS: Record<string, string> = {
  'alkali-metal': 'Alkalimetalle',
  'alkaline-earth-metal': 'Erdalkalimetalle',
  'transition-metal': 'Übergangsmetalle',
  'post-transition-metal': 'Weitere Metalle',
  metalloid: 'Halbmetalle',
  'reactive-nonmetal': 'Reaktive Nichtmetalle',
  'noble-gas': 'Edelgase',
  halogen: 'Halogene',
  lanthanide: 'Lanthanoide',
  actinide: 'Actinoide',
};

function renderPeriodicTable(el: HTMLElement, opts: TableOptions): void {
  const state = getState();
  const discovered = new Set(state.discovered);
  const elementById = new Map<string, ElementEntity>(elements.map((e) => [e.id, e]));

  el.innerHTML = '';

  // Statistik-Kopfzeile: Wie viele der 118 sind entdeckt / im Katalog
  const totalKnown = elements.length;
  const totalDiscovered = elements.filter((e) => discovered.has(e.id)).length;
  const statsBar = document.createElement('div');
  statsBar.className = 'pse-table-stats';
  statsBar.innerHTML =
    `<span class="pse-stats-strong">${totalDiscovered}</span> / 118 entdeckt` +
    ` &middot; <span class="pse-stats-strong">${totalKnown}</span> im Katalog` +
    ` &middot; ${118 - totalKnown} noch nicht angelegt`;
  el.appendChild(statsBar);

  const grid = document.createElement('div');
  grid.className = 'pse-table-grid';

  for (const cell of pseLayout) {
    const el2 = document.createElement('button');
    el2.type = 'button';
    el2.className = `pse-table-cell pse-block-${cell.block}`;
    el2.style.gridRow = String(cell.row);
    el2.style.gridColumn = String(cell.col);

    const element = elementById.get(cell.symbol);
    const isDiscovered = element ? discovered.has(element.id) : false;
    const isKnown = element !== undefined;

    if (isDiscovered && element) {
      el2.classList.add('pse-cell-discovered');
      el2.style.setProperty('--cpk', element.cpkColor);
    } else if (isKnown) {
      el2.classList.add('pse-cell-known');
    } else {
      el2.classList.add('pse-cell-unknown');
      el2.disabled = true;
    }

    // Kategorien-Farbrand
    if (element) el2.classList.add(`pse-cat-${element.elementCategory}`);

    const zEl = document.createElement('span');
    zEl.className = 'pse-cell-z';
    zEl.textContent = String(cell.z);
    el2.appendChild(zEl);

    const symEl = document.createElement('span');
    symEl.className = 'pse-cell-sym';
    symEl.textContent = cell.symbol;
    el2.appendChild(symEl);

    const nameEl = document.createElement('span');
    nameEl.className = 'pse-cell-name';
    nameEl.textContent = cell.nameDE;
    el2.appendChild(nameEl);

    // Zusatz-Info: Atommasse für Elemente im Katalog
    if (element) {
      const massEl = document.createElement('span');
      massEl.className = 'pse-cell-mass';
      // Bei transuranen Elementen ist atomicMassU die Massenzahl des
      // langlebigsten Isotops — dann in Klammern anzeigen
      const isSynthetic = element.elementCategory === 'actinide' && element.z >= 93;
      const mass = element.atomicMassU;
      massEl.textContent = isSynthetic || element.z > 103 ? `(${Math.round(mass)})` : mass.toFixed(2);
      el2.appendChild(massEl);
    }

    // Rich tooltip mit vollen Infos
    if (element) {
      const configLine = element.electronConfig ? `\nKonfiguration: ${element.electronConfig}` : '';
      const catLine = CATEGORY_LABELS[element.elementCategory] ?? element.elementCategory;
      el2.title =
        `${element.nameDE} (${cell.symbol}, Z=${cell.z})\n` +
        `Kategorie: ${catLine}\n` +
        `Atommasse: ${element.atomicMassU} u` +
        configLine +
        `\nPeriode ${element.period}, Gruppe ${element.group ?? '—'}, Block ${element.block}\n` +
        (isDiscovered ? '✓ entdeckt' : '○ noch nicht entdeckt');
      el2.addEventListener('click', () => opts.onSelect(element.id));
    } else {
      el2.title = `${cell.nameDE} — Z=${cell.z}\nNoch nicht im Katalog angelegt`;
    }

    grid.appendChild(el2);
  }

  el.appendChild(grid);

  // Erweiterte Legende: Zell-Zustände + Kategorien-Farben
  const legend = document.createElement('div');
  legend.className = 'pse-table-legend';

  const statesRow = document.createElement('div');
  statesRow.className = 'pse-legend-row';
  statesRow.innerHTML =
    '<span class="pse-legend-label">Zustand:</span> ' +
    '<span class="pse-legend-item"><span class="pse-legend-swatch pse-cell-discovered"></span> entdeckt</span>' +
    '<span class="pse-legend-item"><span class="pse-legend-swatch pse-cell-known"></span> im Katalog</span>' +
    '<span class="pse-legend-item"><span class="pse-legend-swatch pse-cell-unknown"></span> noch nicht angelegt</span>';
  legend.appendChild(statesRow);

  const catsRow = document.createElement('div');
  catsRow.className = 'pse-legend-row';
  const catsLabel = document.createElement('span');
  catsLabel.className = 'pse-legend-label';
  catsLabel.textContent = 'Kategorien:';
  catsRow.appendChild(catsLabel);
  for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
    const item = document.createElement('span');
    item.className = 'pse-legend-item';
    item.innerHTML = `<span class="pse-legend-swatch pse-cat-${key}"></span> ${label}`;
    catsRow.appendChild(item);
  }
  legend.appendChild(catsRow);

  el.appendChild(legend);
}

function showFeedback(text: string, kind: 'ok' | 'err'): void {
  const el = document.getElementById('pse-feedback');
  if (!el) return;
  el.textContent = text;
  el.dataset.kind = kind;
  window.clearTimeout(feedbackTimer);
  feedbackTimer = window.setTimeout(() => {
    if (el.textContent === text) el.textContent = '';
  }, 4000);
}

/** ------------------- Wissensdatenbank-Overlay ------------------- */

type KbFilterState = { kind: string; status: string; search: string };

type KbOptions = {
  onSelect: (id: string) => void;
  onFilter: (patch: Partial<KbFilterState>) => void;
};

const KIND_LABELS: Record<string, string> = {
  all: 'Alle',
  particle: 'Elementarteilchen',
  hadron: 'Hadronen',
  nucleus: 'Atomkerne',
  element: 'Elemente',
  molecule: 'Moleküle',
};

function renderKnowledgeBase(el: HTMLElement, state: KbFilterState, opts: KbOptions): void {
  const wasSearchFocused =
    document.activeElement instanceof HTMLInputElement &&
    document.activeElement.classList.contains('pse-kb-search');
  const cursorPos =
    wasSearchFocused && document.activeElement instanceof HTMLInputElement
      ? document.activeElement.selectionStart
      : null;

  const discovered = new Set(getState().discovered);
  el.innerHTML = '';

  // Kopfzeile mit Statistik
  const header = document.createElement('div');
  header.className = 'pse-kb-header';
  header.innerHTML =
    `<strong>Wissensdatenbank</strong>` +
    ` &middot; <span class="pse-stats-strong">${discovered.size}</span> von ` +
    `<span class="pse-stats-strong">${allEntities.length}</span> Einträgen entdeckt`;
  el.appendChild(header);

  // Filter-Bar
  const filterBar = document.createElement('div');
  filterBar.className = 'pse-kb-filters';

  // Kind-Chip-Filter
  const kindGroup = document.createElement('div');
  kindGroup.className = 'pse-kb-chip-group';
  for (const [key, label] of Object.entries(KIND_LABELS)) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'pse-kb-chip';
    chip.classList.toggle('pse-kb-chip-active', state.kind === key);
    chip.textContent = label;
    chip.addEventListener('click', () => opts.onFilter({ kind: key }));
    kindGroup.appendChild(chip);
  }
  filterBar.appendChild(kindGroup);

  // Status-Chip-Filter
  const statusGroup = document.createElement('div');
  statusGroup.className = 'pse-kb-chip-group';
  const statusOptions: Array<[string, string]> = [
    ['all', 'Alle'],
    ['discovered', 'Nur entdeckt'],
    ['undiscovered', 'Nur unbekannt'],
  ];
  for (const [key, label] of statusOptions) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'pse-kb-chip';
    chip.classList.toggle('pse-kb-chip-active', state.status === key);
    chip.textContent = label;
    chip.addEventListener('click', () => opts.onFilter({ status: key }));
    statusGroup.appendChild(chip);
  }
  filterBar.appendChild(statusGroup);

  // Suchfeld
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'pse-kb-search';
  searchInput.placeholder = '🔍  Suche nach Symbol, Name, Formel, Kategorie';
  searchInput.value = state.search;
  searchInput.addEventListener('input', () => opts.onFilter({ search: searchInput.value }));
  filterBar.appendChild(searchInput);

  el.appendChild(filterBar);

  // Filter anwenden
  let entries = allEntities.slice();
  if (state.kind !== 'all') entries = entries.filter((e) => e.kind === state.kind);
  if (state.status === 'discovered') entries = entries.filter((e) => discovered.has(e.id));
  else if (state.status === 'undiscovered') entries = entries.filter((e) => !discovered.has(e.id));
  if (state.search) {
    const q = state.search;
    entries = entries.filter((e) => matchesSearch(e, q));
  }

  const countLine = document.createElement('div');
  countLine.className = 'pse-kb-count';
  countLine.textContent = `${entries.length} Treffer`;
  el.appendChild(countLine);

  const grid = document.createElement('div');
  grid.className = 'pse-kb-grid';

  for (const entity of entries) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'pse-kb-card';
    if (discovered.has(entity.id)) card.classList.add('pse-kb-card-discovered');
    else card.classList.add('pse-kb-card-unknown');

    const symLine = document.createElement('div');
    symLine.className = 'pse-kb-card-symbol';
    symLine.textContent = entity.symbol ?? entity.id;
    if ('color' in entity) symLine.style.color = entity.color;
    card.appendChild(symLine);

    const nameLine = document.createElement('div');
    nameLine.className = 'pse-kb-card-name';
    nameLine.textContent = entity.nameDE;
    card.appendChild(nameLine);

    const metaLine = document.createElement('div');
    metaLine.className = 'pse-kb-card-meta';
    metaLine.textContent = kindMetaDescription(entity);
    card.appendChild(metaLine);

    card.addEventListener('click', () => opts.onSelect(entity.id));
    grid.appendChild(card);
  }

  el.appendChild(grid);

  // Focus wiederherstellen
  if (wasSearchFocused) {
    const newInput = el.querySelector<HTMLInputElement>('.pse-kb-search');
    if (newInput) {
      newInput.focus();
      if (cursorPos !== null) newInput.setSelectionRange(cursorPos, cursorPos);
    }
  }
}

function kindMetaDescription(entity: Entity): string {
  switch (entity.kind) {
    case 'particle':
      return `${entity.category} · Ladung ${entity.charge} e`;
    case 'hadron':
      return `${entity.category} · ${entity.quarks.join('')} · ${entity.massMeV} MeV`;
    case 'nucleus':
      return `Z=${entity.z}, A=${entity.a} · ${entity.protons}p+${entity.neutrons}n`;
    case 'element':
      return `Z=${entity.z} · ${entity.atomicMassU} u · ${entity.elementCategory}`;
    case 'molecule':
      return `${entity.formula} · ${entity.molarMassGmol.toFixed(2)} g/mol · ${entity.categoryDE}`;
  }
}
