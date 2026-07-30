import { allEntities } from '../game/content';
import { MECHANISMS } from '../game/chemistry/mechanisms';
import type { Entity } from '../game/content/types';

/**
 * Cmd/Ctrl+K öffnet eine Command-Palette mit Fuzzy-Suche über den
 * kompletten Katalog (Elementarteilchen, Hadronen, Kerne, Elemente,
 * Moleküle) plus die Mechanismen-Sammlung. Enter springt ins Detail.
 *
 * Bewusst dependency-frei — kein fuse.js oder ähnliches, wir bauen
 * einen einfachen Score: exakter Match > Prefix > Substring > Fuzzy.
 * Für ~200 Einträge ist das mehr als schnell genug.
 */

export type QuickSearchOptions = {
  /** Wird aufgerufen wenn Nutzer eine Entity aus der Liste wählt. */
  onSelectEntity: (id: string) => void;
  /** Wird aufgerufen wenn Nutzer einen Mechanismus wählt. */
  onSelectMechanism: (id: string) => void;
};

type Item =
  | { kind: 'entity'; entity: Entity; label: string; secondary: string; badge: string }
  | { kind: 'mechanism'; id: string; label: string; secondary: string; badge: string };

function collectItems(): Item[] {
  const items: Item[] = [];
  for (const e of allEntities) {
    let secondary = '';
    let badge: string = e.kind;
    if (e.kind === 'element') {
      secondary = `Z=${e.z} · ${e.electronConfig}`;
      badge = 'Element';
    } else if (e.kind === 'molecule') {
      secondary = `${e.formula} · ${e.molarMassGmol.toFixed(2)} g/mol`;
      badge = 'Molekül';
    } else if (e.kind === 'nucleus') {
      secondary = `Z=${e.z}, A=${e.a}`;
      badge = 'Kern';
    } else if (e.kind === 'hadron') {
      secondary = `${e.category} · ${e.quarks.join('')}`;
      badge = 'Hadron';
    } else if (e.kind === 'particle') {
      secondary = `${e.category} · Ladung ${e.charge} e`;
      badge = 'Teilchen';
    }
    items.push({
      kind: 'entity',
      entity: e,
      label: `${e.symbol ?? e.id} · ${e.nameDE}`,
      secondary,
      badge,
    });
  }
  for (const m of MECHANISMS) {
    items.push({
      kind: 'mechanism',
      id: m.id,
      label: m.nameDE,
      secondary: m.overallReaction,
      badge: `Mechanismus · ${m.categoryDE}`,
    });
  }
  return items;
}

/** Score-Funktion: höher = besserer Match. 0 = kein Match. */
function scoreItem(item: Item, query: string): number {
  const q = query.toLowerCase();
  const hay: string[] = [item.label.toLowerCase(), item.secondary.toLowerCase()];
  if (item.kind === 'entity') {
    hay.push(item.entity.id.toLowerCase());
    if (item.entity.symbol) hay.push(item.entity.symbol.toLowerCase());
    if (item.entity.kind === 'molecule') hay.push(item.entity.formula.toLowerCase());
  } else {
    hay.push(item.id.toLowerCase());
  }
  let best = 0;
  for (const h of hay) {
    if (h === q) best = Math.max(best, 1000);
    else if (h.startsWith(q)) best = Math.max(best, 500);
    else if (h.includes(q)) best = Math.max(best, 100);
    else if (fuzzyMatch(h, q)) best = Math.max(best, 10);
  }
  return best;
}

/** Sehr einfacher Fuzzy: alle Zeichen der Query kommen in dieser Reihenfolge im Text vor. */
function fuzzyMatch(hay: string, needle: string): boolean {
  let i = 0;
  for (const c of hay) {
    if (c === needle[i]) i++;
    if (i >= needle.length) return true;
  }
  return false;
}

export function openQuickSearch(opts: QuickSearchOptions): void {
  const existing = document.querySelector('.pse-qs-root');
  if (existing) existing.remove();

  const items = collectItems();
  let currentIdx = 0;
  let filtered: Item[] = items.slice(0, 12);

  const root = document.createElement('div');
  root.className = 'pse-qs-root';
  const backdrop = document.createElement('div');
  backdrop.className = 'pse-qs-backdrop';
  backdrop.addEventListener('click', close);
  root.appendChild(backdrop);

  const modal = document.createElement('div');
  modal.className = 'pse-qs-modal';
  root.appendChild(modal);

  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'pse-qs-input';
  input.placeholder = 'Suche nach Name, Symbol, Formel, Mechanismus …';
  input.autocomplete = 'off';
  modal.appendChild(input);

  const list = document.createElement('ul');
  list.className = 'pse-qs-list';
  modal.appendChild(list);

  const hint = document.createElement('div');
  hint.className = 'pse-qs-hint';
  hint.textContent = '↑ ↓ navigieren · Enter öffnen · Esc schließen';
  modal.appendChild(hint);

  document.body.appendChild(root);

  function close(): void {
    root.remove();
    document.removeEventListener('keydown', onKey);
  }

  function renderList(): void {
    list.innerHTML = '';
    if (filtered.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'pse-qs-empty';
      empty.textContent = 'Keine Treffer.';
      list.appendChild(empty);
      return;
    }
    for (const [i, item] of filtered.entries()) {
      const li = document.createElement('li');
      li.className = 'pse-qs-item';
      if (i === currentIdx) li.classList.add('pse-qs-item-active');
      li.innerHTML =
        `<span class="pse-qs-badge">${item.badge}</span>` +
        `<span class="pse-qs-label">${escapeHtml(item.label)}</span>` +
        `<span class="pse-qs-secondary">${escapeHtml(item.secondary)}</span>`;
      li.addEventListener('mouseenter', () => {
        currentIdx = i;
        renderList();
      });
      li.addEventListener('click', () => selectCurrent());
      list.appendChild(li);
    }
    // aktives Item ins Sichtfeld scrollen
    const active = list.querySelector<HTMLElement>('.pse-qs-item-active');
    active?.scrollIntoView({ block: 'nearest' });
  }

  function updateFilter(): void {
    const q = input.value.trim();
    if (q.length === 0) {
      filtered = items.slice(0, 12);
    } else {
      const scored = items
        .map((it) => ({ it, score: scoreItem(it, q) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 12);
      filtered = scored.map((x) => x.it);
    }
    currentIdx = 0;
    renderList();
  }

  function selectCurrent(): void {
    const item = filtered[currentIdx];
    if (!item) return;
    if (item.kind === 'entity') {
      opts.onSelectEntity(item.entity.id);
    } else {
      opts.onSelectMechanism(item.id);
    }
    close();
  }

  function onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      currentIdx = Math.min(filtered.length - 1, currentIdx + 1);
      renderList();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      currentIdx = Math.max(0, currentIdx - 1);
      renderList();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectCurrent();
    }
  }
  document.addEventListener('keydown', onKey);
  input.addEventListener('input', updateFilter);

  updateFilter();
  input.focus();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
