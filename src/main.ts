import { createRenderer } from './engine/renderer';
import { startLoop } from './engine/loop';
import { loadState, subscribe } from './game/state/store';
import { loadFromStorage } from './game/state/save';

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

const versionEl = document.getElementById('pse-version');
if (versionEl) {
  subscribe((state) => {
    versionEl.textContent = `v0.0.0 · entdeckt: ${state.discovered.length}`;
  });
}
