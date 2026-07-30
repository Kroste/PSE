import { molecules } from '../game/content';
import { createOrbitalPreview } from '../game/atoms/orbital-preview';
import type { MoleculeEntity } from '../game/content/types';

/**
 * Vergleichs-Modus: zwei Moleküle nebeneinander im Detail — 3D-Preview,
 * Attribute, optionale Spektroskopie. Ideal für "α-D vs. β-D Glucose",
 * "cis- vs. trans-2-Buten", "AT- vs. GC-Basenpaar" u. ä.
 */

export type CompareOptions = {
  /** Voreingestelltes linkes Molekül (id). */
  leftId?: string | null;
  /** Voreingestelltes rechtes Molekül. */
  rightId?: string | null;
};

const STORAGE_KEY = 'pse.compare.lastPair';

function loadLastPair(): { left: string | null; right: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { left: null, right: null };
    return JSON.parse(raw) as { left: string | null; right: string | null };
  } catch {
    return { left: null, right: null };
  }
}
function saveLastPair(left: string | null, right: string | null): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ left, right }));
  } catch {
    // ignore
  }
}

export function openCompare(opts: CompareOptions = {}): void {
  const existing = document.querySelector('.pse-compare-root');
  if (existing) existing.remove();

  const saved = loadLastPair();
  const state = {
    left: opts.leftId ?? saved.left ?? molecules[0]?.id ?? null,
    right: opts.rightId ?? saved.right ?? molecules[1]?.id ?? null,
  };

  const root = document.createElement('div');
  root.className = 'pse-compare-root';
  const backdrop = document.createElement('div');
  backdrop.className = 'pse-compare-backdrop';
  backdrop.addEventListener('click', close);
  root.appendChild(backdrop);

  const modal = document.createElement('div');
  modal.className = 'pse-compare-modal';
  root.appendChild(modal);

  const header = document.createElement('div');
  header.className = 'pse-compare-header';
  header.innerHTML =
    `<strong>⚖ Molekül-Vergleich</strong> &middot; ` +
    `Wähle zwei Moleküle für Seite-an-Seite-Vergleich (3D, Attribute, Spektroskopie). ` +
    `<em>Ziehen zum Drehen · Mausrad zum Zoomen</em>`;
  modal.appendChild(header);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'pse-btn pse-compare-close';
  closeBtn.textContent = '✕';
  closeBtn.title = 'Schließen (Esc)';
  closeBtn.addEventListener('click', close);
  modal.appendChild(closeBtn);

  const grid = document.createElement('div');
  grid.className = 'pse-compare-grid';
  modal.appendChild(grid);

  const leftPane = document.createElement('div');
  leftPane.className = 'pse-compare-pane';
  grid.appendChild(leftPane);
  const rightPane = document.createElement('div');
  rightPane.className = 'pse-compare-pane';
  grid.appendChild(rightPane);

  // Hochauflösend, damit auch auf 2K/4K-Displays scharf bleibt — CSS
  // skaliert den Canvas dann responsiv in die Pane-Größe.
  const leftPreview = createOrbitalPreview(900);
  const rightPreview = createOrbitalPreview(900);

  function renderPane(pane: HTMLElement, side: 'left' | 'right'): void {
    pane.innerHTML = '';
    const currentId = state[side];
    // Auswahl-Dropdown
    const select = document.createElement('select');
    select.className = 'pse-compare-select';
    for (const m of molecules) {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.symbol ?? m.id} · ${m.nameDE}`;
      if (m.id === currentId) opt.selected = true;
      select.appendChild(opt);
    }
    select.addEventListener('change', () => {
      state[side] = select.value;
      saveLastPair(state.left, state.right);
      renderPane(pane, side);
    });
    pane.appendChild(select);

    const mol = molecules.find((m) => m.id === currentId);
    if (!mol) return;

    // 3D-Preview
    const previewWrap = document.createElement('div');
    previewWrap.className = 'pse-compare-preview';
    const preview = side === 'left' ? leftPreview : rightPreview;
    preview.show(mol as MoleculeEntity);
    previewWrap.appendChild(preview.canvas);
    pane.appendChild(previewWrap);

    // Attribute
    const attrs = document.createElement('dl');
    attrs.className = 'pse-compare-attrs';
    const push = (k: string, v: string): void => {
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = v;
      attrs.appendChild(dt);
      attrs.appendChild(dd);
    };
    push('Formel', mol.formula);
    push('Molmasse', `${mol.molarMassGmol} g/mol`);
    push('Geometrie', mol.geometry);
    push('Atome', String(mol.atoms.length));
    push('Bindungen', String(mol.bonds.length));
    push('Kategorie', mol.categoryDE);
    pane.appendChild(attrs);

    if (mol.stereoNoteDE) {
      const stereo = document.createElement('div');
      stereo.className = 'pse-compare-stereo';
      stereo.innerHTML = `<span class="pse-compare-stereo-label">⧗ Stereochemie</span> ${escapeHtml(mol.stereoNoteDE)}`;
      pane.appendChild(stereo);
    }
    if (mol.spectra) {
      const spec = document.createElement('div');
      spec.className = 'pse-compare-spec';
      const parts: string[] = [];
      if (mol.spectra.ir && mol.spectra.ir.length > 0) {
        const top = [...mol.spectra.ir].sort((a, b) => intensityRank(b.intensity) - intensityRank(a.intensity))[0]!;
        parts.push(`IR (stärkste): ${top.wavenumber} cm⁻¹ — ${top.assignmentDE}`);
      }
      if (mol.spectra.nmr1h && mol.spectra.nmr1h.length > 0) {
        parts.push(`¹H-NMR: ${mol.spectra.nmr1h.map((n) => `δ${n.shift.toFixed(2)}`).join(', ')} ppm`);
      }
      if (mol.spectra.uvVis && mol.spectra.uvVis.length > 0) {
        parts.push(`UV: λ_max = ${mol.spectra.uvVis[0]!.lambdaMax} nm`);
      }
      spec.innerHTML = `<span class="pse-compare-spec-label">📈 Spektroskopie</span> ${parts.join(' · ')}`;
      pane.appendChild(spec);
    }
  }

  function renderAll(): void {
    renderPane(leftPane, 'left');
    renderPane(rightPane, 'right');
  }

  function onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }
  document.addEventListener('keydown', onKey);

  function close(): void {
    leftPreview.dispose();
    rightPreview.dispose();
    root.remove();
    document.removeEventListener('keydown', onKey);
  }

  document.body.appendChild(root);
  renderAll();
}

function intensityRank(i: 'strong' | 'medium' | 'weak'): number {
  return i === 'strong' ? 3 : i === 'medium' ? 2 : 1;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
