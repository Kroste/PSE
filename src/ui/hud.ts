import {
  addToZone,
  availableCount,
  availableRecipesForActiveReactor,
  clearZone,
  craft,
  getState,
  onCraft,
  removeFromZone,
  setActiveReactor,
  subscribe,
} from '../game/state/store';
import { freeSupplyIds, getEntity } from '../game/content';
import { reactorMeta } from '../game/content/reactors';
import type { Entity } from '../game/content/types';

let feedbackTimer: number | undefined;

export function mountHud(): void {
  const inventoryEl = document.getElementById('pse-inventory');
  const detailEl = document.getElementById('pse-detail');
  const reactorsEl = document.getElementById('pse-reactors');
  if (!inventoryEl || !detailEl || !reactorsEl) throw new Error('HUD-Container fehlen im DOM.');

  let selectedEntityId: string | null = null;

  const rerenderDetail = (): void => renderDetail(detailEl, selectedEntityId);

  const rerenderInventory = (): void => {
    renderInventory(inventoryEl, {
      onSelect: (id) => {
        selectedEntityId = id;
        rerenderDetail();
      },
    });
  };

  const rerenderReactors = (): void => renderReactors(reactorsEl);

  subscribe(() => {
    rerenderInventory();
    rerenderDetail();
    rerenderReactors();
  });

  onCraft((event) => {
    if (event.ok) {
      const label = describeOutputs(event.recipe.outputs);
      const isNew = event.discoveredIds.length > 0 ? ' · NEU entdeckt!' : '';
      showFeedback(`✔ ${label}${isNew}`, 'ok');
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

  const nonFree = Object.entries(state.inventory).filter(([id]) => !freeSupplyIds.includes(id));
  const byKind: Record<string, Array<[string, number]>> = {};
  for (const entry of nonFree) {
    const entity = getEntity(entry[0]);
    if (!entity) continue;
    (byKind[entity.kind] ??= []).push(entry);
  }

  const kindOrder: Array<[string, string]> = [
    ['particle', 'Erzeugte Teilchen'],
    ['hadron', 'Hadronen'],
    ['nucleus', 'Atomkerne'],
    ['element', 'Atome & Elemente'],
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
  el.appendChild(hintsBox());
}

function renderDetail(el: HTMLElement, selectedEntityId: string | null): void {
  el.innerHTML = '';

  const header = document.createElement('h2');
  header.textContent = 'Detail';
  el.appendChild(header);

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

  const addBtn = document.createElement('button');
  addBtn.className = 'pse-btn pse-btn-add';
  addBtn.type = 'button';
  addBtn.textContent = '+';
  addBtn.title = 'In Reaktionszone';
  addBtn.disabled = !canAddMore;
  addBtn.addEventListener('click', () => addToZone(entity.id, 1));
  row.appendChild(addBtn);

  if (inZone > 0) {
    const rmBtn = document.createElement('button');
    rmBtn.className = 'pse-btn pse-btn-rm';
    rmBtn.type = 'button';
    rmBtn.textContent = '−';
    rmBtn.title = 'Aus Reaktionszone entfernen';
    rmBtn.addEventListener('click', () => removeFromZone(entity.id, 1));
    row.appendChild(rmBtn);
  }

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
    addToZone(id, 1);
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
  craftBtn.addEventListener('click', () => craft());
  box.appendChild(craftBtn);

  const clearBtn = document.createElement('button');
  clearBtn.className = 'pse-btn';
  clearBtn.type = 'button';
  clearBtn.textContent = 'Zone leeren';
  clearBtn.addEventListener('click', () => clearZone());
  box.appendChild(clearBtn);

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
  box.appendChild(sectionHeader('Reaktoren-Katalog'));

  for (const recipe of availableRecipesForActiveReactor()) {
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
    const meta = reactorMeta[id];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pse-reactor';
    if (id === state.activeReactor) btn.classList.add('pse-reactor-active');
    btn.title = meta.descriptionDE;
    btn.textContent = `${meta.symbol}  ${meta.nameDE}`;
    btn.addEventListener('click', () => setActiveReactor(id));
    el.appendChild(btn);
  }
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
