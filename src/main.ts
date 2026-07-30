import { createRenderer } from './engine/renderer';
import { startLoop } from './engine/loop';
import { loadState, subscribe } from './game/state/store';
import { loadFromStorage } from './game/state/save';
import { assertContentConsistency } from './game/content';
import { mountHud } from './ui/hud';
import { maybeAutoStartTour, startTour } from './ui/onboarding';

assertContentConsistency();

const canvas = document.getElementById('pse-canvas');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('#pse-canvas fehlt oder ist kein <canvas>-Element.');
}

const persisted = loadFromStorage();
if (persisted) {
  loadState(persisted);
}

const scene = createRenderer(canvas);
startLoop(scene);

mountHud({ showAtom: scene.showAtom, setStatusElement: scene.setStatusElement });

const versionEl = document.getElementById('pse-version');
if (versionEl) {
  subscribe((state) => {
    versionEl.textContent = `v0.0.0 · entdeckt: ${state.discovered.length}`;
  });
}

// Manueller Tour-Restart-Button unten rechts.
const tourBtn = document.createElement('button');
tourBtn.type = 'button';
tourBtn.id = 'pse-tour-restart';
tourBtn.className = 'pse-btn';
tourBtn.textContent = '❔ Tour';
tourBtn.title = 'Onboarding-Tour neu starten';
tourBtn.addEventListener('click', () => startTour());
document.body.appendChild(tourBtn);

// Beim ersten Start automatisch die Tour zeigen.
maybeAutoStartTour();
