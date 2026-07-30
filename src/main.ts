import { createRenderer } from './engine/renderer';
import { startLoop } from './engine/loop';
import { loadState, subscribe } from './game/state/store';
import { loadFromStorage } from './game/state/save';
import { assertContentConsistency } from './game/content';
import { mountHud } from './ui/hud';
import { maybeAutoStartTour, startTour } from './ui/onboarding';
import { initAchievementToasts } from './ui/achievement-toast';
import { openAbout } from './ui/about';

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
    versionEl.textContent = `v1.0.0 · entdeckt: ${state.discovered.length}`;
  });
}

// Corner-Buttons unten rechts: About und Tour-Restart.
const cornerBar = document.createElement('div');
cornerBar.id = 'pse-corner-bar';
document.body.appendChild(cornerBar);

const aboutBtn = document.createElement('button');
aboutBtn.type = 'button';
aboutBtn.className = 'pse-btn';
aboutBtn.textContent = 'ℹ About';
aboutBtn.title = 'Info, GitHub, Buy me a coffee';
aboutBtn.addEventListener('click', () => openAbout());
cornerBar.appendChild(aboutBtn);

const tourBtn = document.createElement('button');
tourBtn.type = 'button';
tourBtn.className = 'pse-btn';
tourBtn.textContent = '❔ Tour';
tourBtn.title = 'Onboarding-Tour neu starten';
tourBtn.addEventListener('click', () => startTour());
cornerBar.appendChild(tourBtn);

// Achievement-Toasts feuern lassen wenn Nutzer live etwas freischaltet.
initAchievementToasts();

// Beim ersten Start automatisch die Tour zeigen.
maybeAutoStartTour();
