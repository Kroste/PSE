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
import { elements, freeSupplyIds, getEntity, recipes as allRecipes } from '../game/content';
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
  if (
    !inventoryEl ||
    !detailEl ||
    !reactorsEl ||
    !tableEl ||
    !toggleBtn ||
    !resetBtn ||
    !expertBtn ||
    !audioBtn
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

  const selectEntity = (id: string): void => {
    selectedEntityId = id;
    rerenderDetail();
    const entity = getEntity(id);
    if ((entity?.kind === 'element' || entity?.kind === 'molecule') && opts.showAtom) {
      opts.showAtom(id);
    }
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
    renderInventory(inventoryEl, { onSelect: selectEntity });
  };

  const rerenderReactors = (): void => renderReactors(reactorsEl);

  const rerenderTable = (): void => {
    if (tableEl.hidden) return;
    renderPeriodicTable(tableEl, { onSelect: selectEntity });
  };

  toggleBtn.addEventListener('click', () => {
    tableEl.hidden = !tableEl.hidden;
    toggleBtn.classList.toggle('pse-btn-primary', !tableEl.hidden);
    rerenderTable();
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

type InventoryOptions = { onSelect: (id: string) => void };

function renderInventory(el: HTMLElement, opts: InventoryOptions): void {
  const state = getState();
  el.innerHTML = '';

  el.appendChild(sectionHeader('Elementarteilchen'));
  for (const id of freeSupplyIds) {
    const entity = getEntity(id);
    if (!entity) continue;
    el.appendChild(inventoryRow(entity, Infinity, state.reactionZone[id] ?? 0, opts));
  }

  const freeSet = new Set<string>(freeSupplyIds);
  const nonFreeIds = state.discovered.filter((id) => !freeSet.has(id));
  const byKind: Record<string, Array<[string, number]>> = {};
  for (const id of nonFreeIds) {
    const entity = getEntity(id);
    if (!entity) continue;
    // Discovered non-freeSupply = dauerhaft verfügbar (∞).
    (byKind[entity.kind] ??= []).push([id, Infinity]);
  }

  const kindOrder: Array<[string, string]> = [
    ['particle', 'Erzeugte Teilchen'],
    ['hadron', 'Hadronen'],
    ['nucleus', 'Atomkerne'],
    ['element', 'Atome & Elemente'],
    ['molecule', 'Moleküle & Verbindungen'],
  ];
  for (const [kind, title] of kindOrder) {
    const entries = byKind[kind];
    if (!entries || entries.length === 0) continue;
    el.appendChild(sectionHeader(title));
    for (const [id, count] of entries) {
      const entity = getEntity(id);
      if (!entity) continue;
      el.appendChild(inventoryRow(entity, count, state.reactionZone[id] ?? 0, opts));
    }
  }

  if (state.discovered.length > 0) {
    el.appendChild(sectionHeader('Entdeckt'));
    const line = document.createElement('div');
    line.className = 'pse-discovered';
    line.textContent = state.discovered.map((id) => getEntity(id)?.symbol ?? id).join(' · ');
    el.appendChild(line);
  }

  el.appendChild(zonePanel(state.reactionZone));
  el.appendChild(craftControls());
  el.appendChild(feedbackBox());
  el.appendChild(goalBox(opts.onSelect));
  el.appendChild(hintsBox());
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

function findNextGoal(): { element: ElementEntity; recipe: Recipe } | null {
  const state = getState();
  const discovered = new Set(state.discovered);
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
  return { element: nextEl, recipe };
}

function goalBox(onSelect: (id: string) => void): HTMLElement {
  const box = document.createElement('div');
  box.className = 'pse-goal';

  const goal = findNextGoal();
  if (!goal) {
    box.classList.add('pse-goal-done');
    box.textContent = '✓ Alle Elemente in diesem Modus entdeckt';
    return box;
  }

  const header = document.createElement('div');
  header.className = 'pse-goal-header';
  header.textContent = 'Nächstes Ziel';
  box.appendChild(header);

  const title = document.createElement('button');
  title.className = 'pse-goal-title';
  title.type = 'button';
  title.textContent = `${goal.element.symbol}  ·  ${goal.element.nameDE}  (Z=${goal.element.z})`;
  title.style.color = goal.element.cpkColor;
  title.addEventListener('click', () => onSelect(goal.element.id));
  box.appendChild(title);

  const reactorMetaInfo = reactorMeta[goal.recipe.reactor];
  const inputsText = Object.entries(goal.recipe.inputs)
    .map(([id, n]) => `${n}·${getEntity(id)?.symbol ?? id}`)
    .join(' + ');
  const recipeLine = document.createElement('div');
  recipeLine.className = 'pse-goal-recipe';
  recipeLine.textContent = `${inputsText} → ${goal.element.symbol}  @ ${reactorMetaInfo.nameDE}`;
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

function renderPeriodicTable(el: HTMLElement, opts: TableOptions): void {
  const state = getState();
  const discovered = new Set(state.discovered);
  const elementById = new Map<string, ElementEntity>(elements.map((e) => [e.id, e]));

  el.innerHTML = '';

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

    if (element) {
      el2.title = `${cell.nameDE} — ${isDiscovered ? 'entdeckt' : 'noch nicht entdeckt'}`;
      el2.addEventListener('click', () => opts.onSelect(element.id));
    } else {
      el2.title = `${cell.nameDE} — Z=${cell.z} (noch nicht im Katalog)`;
    }

    grid.appendChild(el2);
  }

  el.appendChild(grid);

  const legend = document.createElement('div');
  legend.className = 'pse-table-legend';
  legend.innerHTML =
    '<span class="pse-cell-discovered">■</span> entdeckt · ' +
    '<span class="pse-cell-known">■</span> im Katalog · ' +
    '<span class="pse-cell-unknown">■</span> noch nicht angelegt';
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
