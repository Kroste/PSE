import { ACHIEVEMENTS, type Achievement } from '../game/achievements';
import { getState, subscribe } from '../game/state/store';
import { sfx } from '../engine/audio';

/**
 * Slide-in-Toast wenn ein Achievement zum ersten Mal freigeschaltet
 * wird. Erkannt durch Diff zum vorher gespeicherten Set aller erfüllten
 * Achievement-IDs. Beim allerersten Aufruf (frischer Save) keine
 * Massen-Toasts — der Startzustand definiert die Baseline.
 */

const STORAGE_KEY = 'pse.toasts.seen';

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}
function saveSeen(seen: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
  } catch {
    // ignore
  }
}

function currentAchieved(): Set<string> {
  const state = getState();
  const done = new Set<string>();
  for (const a of ACHIEVEMENTS) {
    if (a.check(state)) done.add(a.id);
  }
  return done;
}

function showToast(achievement: Achievement): void {
  const stack = ensureStack();
  const toast = document.createElement('div');
  toast.className = 'pse-toast';
  toast.innerHTML =
    `<div class="pse-toast-icon">${achievement.icon}</div>` +
    `<div class="pse-toast-body">` +
    `  <div class="pse-toast-label">Achievement freigeschaltet</div>` +
    `  <div class="pse-toast-title">${escapeHtml(achievement.title)}</div>` +
    `  <div class="pse-toast-desc">${escapeHtml(achievement.description)}</div>` +
    `</div>`;
  stack.appendChild(toast);
  // Slide-in per next-frame class-toggle
  requestAnimationFrame(() => toast.classList.add('pse-toast-visible'));
  // Sound-Cue
  try {
    sfx.discovery();
  } catch {
    // ignore
  }
  setTimeout(() => {
    toast.classList.remove('pse-toast-visible');
    setTimeout(() => toast.remove(), 400);
  }, 4200);
}

function ensureStack(): HTMLElement {
  let stack = document.querySelector<HTMLElement>('#pse-toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'pse-toast-stack';
    document.body.appendChild(stack);
  }
  return stack;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function initAchievementToasts(): void {
  // Beim Start: aktuellen Zustand als Baseline setzen — sonst würden
  // beim Laden alle bereits freigeschalteten Achievements Toasts feuern.
  const seen = loadSeen();
  const now = currentAchieved();
  if (seen.size === 0) {
    // Erste Session: alles was jetzt schon erreicht ist, gilt als "seen".
    saveSeen(now);
  } else {
    // Falls wir zwischenzeitlich neue Achievements bekommen haben, die
    // aber offline erreicht wurden — beim Start keine Toasts.
    // (subscribe-Handler unten kümmert sich um Live-Neuentdeckungen.)
    for (const id of now) seen.add(id);
    saveSeen(seen);
  }

  subscribe(() => {
    const currentSeen = loadSeen();
    const nowSet = currentAchieved();
    let dirty = false;
    for (const id of nowSet) {
      if (currentSeen.has(id)) continue;
      const ach = ACHIEVEMENTS.find((a) => a.id === id);
      if (!ach) continue;
      showToast(ach);
      currentSeen.add(id);
      dirty = true;
    }
    if (dirty) saveSeen(currentSeen);
  });
}
