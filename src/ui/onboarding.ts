/**
 * Onboarding-Tour für Neulinge. Wird beim ersten App-Start automatisch
 * gezeigt (LocalStorage-Flag) und lässt sich jederzeit manuell neu
 * starten. Dark-Overlay + Spotlight-Ring auf dem jeweiligen Ziel-Element
 * + Erklärungs-Karte mit Prev/Next/Skip.
 */

const STORAGE_KEY = 'pse.onboarding.done';

type TourStep = {
  /** CSS-Selektor des zu hebenden Elements. `null` = zentrierte Karte ohne Highlight. */
  target: string | null;
  titleDE: string;
  bodyDE: string;
};

const TOUR_STEPS: TourStep[] = [
  {
    target: null,
    titleDE: 'Willkommen bei PSE',
    bodyDE:
      'Bau das Universum aus Quarks. Von Elementarteilchen über Atomkerne, Elemente bis zu komplexen Molekülen und Polymeren. Diese Tour zeigt dir in ca. 60 Sekunden, wo alles wichtige liegt. Klick "Weiter" oder drücke →.',
  },
  {
    target: '#pse-reactors',
    titleDE: 'Reaktoren',
    bodyDE:
      'Hier wählst du den Kontext deiner Reaktion. Werkbank für einfache Montage, Sternkern für Fusion, Chemielabor für Moleküle. Zu Beginn ist nur die Werkbank offen — andere schaltest du durch Reaktionen frei.',
  },
  {
    target: '#pse-inventory',
    titleDE: 'Inventar & Reaktionszone',
    bodyDE:
      'Deine Zutaten stehen links. [+] fügt sie der Reaktionszone hinzu, [−] nimmt sie wieder heraus. Der Status-Chip darunter zeigt live, ob deine Zusammenstellung stabil, instabil oder reaktionsbereit ist.',
  },
  {
    target: '.pse-goal',
    titleDE: 'Nächstes Ziel',
    bodyDE:
      'Das Ziel-Panel schlägt dir vor, was du als nächstes bauen könntest — reaktor-spezifisch (Element im Werkbereich, Molekül im Chemielabor). Klick auf den Namen, um Details zu sehen.',
  },
  {
    target: '#pse-detail',
    titleDE: 'Detail-Panel',
    bodyDE:
      'Klick auf jede Entity im Inventar, um sie hier anzusehen. Zeigt Attribute, Wissenschaftsnotiz, optionale Spektroskopie-Daten, Stereochemie — und einen "🧭 Bauplan"-Button, der die minimale Rezept-Kette zeigt, wie du sie aus dem Nichts baust.',
  },
  {
    target: '#pse-toggle-table',
    titleDE: 'Periodensystem-Übersicht',
    bodyDE: 'Volles PSE als Grid. Farbcodiert nach Kategorie, entdeckte Elemente hervorgehoben.',
  },
  {
    target: '#pse-toggle-kb',
    titleDE: 'Wissensdatenbank',
    bodyDE:
      'Suchbare Übersicht aller 184 Moleküle + Elementarteilchen + Kerne. Filtert nach Kind, Status und Freitext.',
  },
  {
    target: '#pse-toggle-mechanisms',
    titleDE: 'Reaktions-Mechanismen',
    bodyDE:
      '12 klassische Mechanismen (SN1, SN2, Diels-Alder, Wittig, Peptidbindung, radikalische Polymerisation und mehr) mit Schritt-für-Schritt-Elektronenfluss und 3D-Visualisierung — animiert zwischen den Schritten.',
  },
  {
    target: '#pse-toggle-challenges',
    titleDE: 'Aufgaben-Modus',
    bodyDE:
      '15 konkrete Lernaufgaben mit Hinweisen und Fortschrittsbalken. Perfekt für strukturiertes Lernen oder als Bucket-List.',
  },
  {
    target: '#pse-toggle-editor',
    titleDE: 'Eigene Verbindungen',
    bodyDE:
      'Struktur-Editor mit Atomen + Bindungen, SMILES-Parser (`CCO` → Ethanol!) oder MOL/SDF-Import aus PubChem/ChemDraw. Custom-Moleküle landen im normalen Katalog.',
  },
  {
    target: '#pse-toggle-sandbox',
    titleDE: 'Sandbox-Modus',
    bodyDE:
      'Toggle für den freien Spielmodus mit allen 118 Elementen und allen Katalog-Molekülen vorentdeckt, alle Reaktoren offen. Eigener Save-Slot — dein echter Fortschritt bleibt unangetastet.',
  },
  {
    target: null,
    titleDE: 'Keyboard-Shortcuts',
    bodyDE:
      'Ein paar Tasten sparen Klicks: [Ctrl/Cmd+K] = Quick-Search-Palette (springt zu jedem Molekül oder Mechanismus) · [Space] = Reaktion ausführen · [C] = Zone leeren · [/] = Fokus im Suchfeld · [1]–[6] = Reaktor-Wechsel · [Esc] = alle Overlays schließen.',
  },
  {
    target: null,
    titleDE: 'Fertig!',
    bodyDE:
      'Alles Wichtige gesehen. Diese Tour kannst du jederzeit über den "❔ Tour"-Button unten rechts neu starten. Viel Spaß beim Bauen des Universums.',
  },
];

/** Zeigt beim allerersten Start die Tour automatisch. */
export function maybeAutoStartTour(): void {
  try {
    if (localStorage.getItem(STORAGE_KEY) === '1') return;
  } catch {
    // Falls localStorage nicht verfügbar (privater Modus), einfach zeigen.
  }
  // Timeout: Warte einen Tick, damit die HUD-Elemente sicher im DOM sind.
  setTimeout(() => startTour(), 400);
}

/** Startet die Tour manuell. */
export function startTour(): void {
  const existing = document.querySelector('.pse-tour-root');
  if (existing) existing.remove();

  let stepIdx = 0;

  const root = document.createElement('div');
  root.className = 'pse-tour-root';
  root.tabIndex = -1;

  const backdrop = document.createElement('div');
  backdrop.className = 'pse-tour-backdrop';
  root.appendChild(backdrop);

  const highlight = document.createElement('div');
  highlight.className = 'pse-tour-highlight';
  root.appendChild(highlight);

  const card = document.createElement('div');
  card.className = 'pse-tour-card';
  root.appendChild(card);

  document.body.appendChild(root);
  root.focus();

  function completeTour(): void {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    root.remove();
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', renderStep);
    window.removeEventListener('scroll', renderStep);
  }

  function onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      completeTour();
    } else if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prev();
    }
  }
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', renderStep);
  window.addEventListener('scroll', renderStep);

  function next(): void {
    if (stepIdx >= TOUR_STEPS.length - 1) {
      completeTour();
      return;
    }
    stepIdx++;
    renderStep();
  }
  function prev(): void {
    if (stepIdx === 0) return;
    stepIdx--;
    renderStep();
  }

  function renderStep(): void {
    const step = TOUR_STEPS[stepIdx]!;
    // Highlight positionieren
    if (step.target) {
      const target = document.querySelector(step.target);
      if (target instanceof HTMLElement) {
        const rect = target.getBoundingClientRect();
        highlight.hidden = false;
        highlight.style.left = `${rect.left - 6}px`;
        highlight.style.top = `${rect.top - 6}px`;
        highlight.style.width = `${rect.width + 12}px`;
        highlight.style.height = `${rect.height + 12}px`;
        placeCardNearRect(rect);
      } else {
        highlight.hidden = true;
        placeCardCenter();
      }
    } else {
      highlight.hidden = true;
      placeCardCenter();
    }
    card.innerHTML = '';
    const progress = document.createElement('div');
    progress.className = 'pse-tour-progress';
    progress.textContent = `${stepIdx + 1} / ${TOUR_STEPS.length}`;
    card.appendChild(progress);
    const title = document.createElement('h2');
    title.className = 'pse-tour-title';
    title.textContent = step.titleDE;
    card.appendChild(title);
    const body = document.createElement('p');
    body.className = 'pse-tour-body';
    body.textContent = step.bodyDE;
    card.appendChild(body);
    const actions = document.createElement('div');
    actions.className = 'pse-tour-actions';
    const skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'pse-btn';
    skip.textContent = 'Überspringen';
    skip.addEventListener('click', completeTour);
    actions.appendChild(skip);
    if (stepIdx > 0) {
      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'pse-btn';
      backBtn.textContent = '◄ Zurück';
      backBtn.addEventListener('click', prev);
      actions.appendChild(backBtn);
    }
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'pse-btn pse-btn-primary';
    nextBtn.style.width = 'auto';
    nextBtn.style.margin = '0';
    nextBtn.textContent = stepIdx === TOUR_STEPS.length - 1 ? 'Fertig ✓' : 'Weiter ►';
    nextBtn.addEventListener('click', next);
    actions.appendChild(nextBtn);
    card.appendChild(actions);
  }

  function placeCardNearRect(rect: DOMRect): void {
    // Karte unterhalb des Ziels wenn oben viel Platz ist, sonst oberhalb.
    const cardWidth = 380;
    const cardHeight = 220;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    let top: number;
    if (spaceBelow >= cardHeight + 20 || spaceBelow >= spaceAbove) {
      top = rect.bottom + 16;
    } else {
      top = Math.max(16, rect.top - cardHeight - 16);
    }
    // Horizontal: an das Target zentrieren, aber im Viewport halten.
    let left = rect.left + rect.width / 2 - cardWidth / 2;
    left = Math.max(16, Math.min(vw - cardWidth - 16, left));
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
    card.style.transform = 'none';
  }
  function placeCardCenter(): void {
    card.style.left = '50%';
    card.style.top = '50%';
    card.style.transform = 'translate(-50%, -50%)';
  }

  renderStep();
}
