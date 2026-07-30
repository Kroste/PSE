import { elements, molecules } from '../game/content';
import { MECHANISMS } from '../game/chemistry/mechanisms';
import { ACHIEVEMENTS } from '../game/achievements';
import { CHALLENGES } from '../game/challenges';

const GITHUB_URL = 'https://github.com/Kroste/PSE';
const BMC_URL = 'https://buymeacoffee.com/kroste';

/**
 * Info-Overlay mit App-Beschreibung, Content-Stats, GitHub- und
 * Buy-Me-a-Coffee-Link.
 */
export function openAbout(): void {
  const existing = document.querySelector('.pse-about-root');
  if (existing) existing.remove();

  const root = document.createElement('div');
  root.className = 'pse-about-root';

  const backdrop = document.createElement('div');
  backdrop.className = 'pse-about-backdrop';
  backdrop.addEventListener('click', close);
  root.appendChild(backdrop);

  const modal = document.createElement('div');
  modal.className = 'pse-about-modal';
  root.appendChild(modal);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'pse-btn pse-about-close';
  closeBtn.textContent = '✕';
  closeBtn.title = 'Schließen (Esc)';
  closeBtn.addEventListener('click', close);
  modal.appendChild(closeBtn);

  const logo = document.createElement('div');
  logo.className = 'pse-about-logo';
  logo.textContent = 'PSE';
  modal.appendChild(logo);

  const tagline = document.createElement('div');
  tagline.className = 'pse-about-tagline';
  tagline.textContent = 'Bau das Universum aus Quarks — von Elementarteilchen bis Silikonen.';
  modal.appendChild(tagline);

  const description = document.createElement('p');
  description.className = 'pse-about-desc';
  description.innerHTML =
    'Ein browser-basiertes Chemie-/Physik-Spiel zum Verstehen von Materie ' +
    'auf allen Größenskalen — vom Quark bis zum Polymer. Alle Rezepte mit ' +
    'Quelle, alle Moleküle mit 3D-Struktur, viele mit Spektroskopie-Daten. ' +
    'Reaktions-Mechanismen mit animiertem Elektronenfluss. Custom-Editor ' +
    'für eigene Verbindungen per Struktur-Formular, SMILES oder MOL/SDF-Import.';
  modal.appendChild(description);

  // Content-Stats
  const stats = document.createElement('div');
  stats.className = 'pse-about-stats';
  const statItems: Array<[string, number, string]> = [
    ['Elemente', elements.length, '(alle 118)'],
    ['Moleküle', molecules.length, 'im Katalog'],
    ['Mechanismen', MECHANISMS.length, 'mit 3D-Fluss'],
    ['Aufgaben', CHALLENGES.length, 'Lernpfade'],
    ['Achievements', ACHIEVEMENTS.length, 'freischaltbar'],
  ];
  for (const [label, value, suffix] of statItems) {
    const box = document.createElement('div');
    box.className = 'pse-about-stat';
    box.innerHTML =
      `<div class="pse-about-stat-value">${value}</div>` +
      `<div class="pse-about-stat-label">${label}</div>` +
      `<div class="pse-about-stat-suffix">${suffix}</div>`;
    stats.appendChild(box);
  }
  modal.appendChild(stats);

  // Links: GitHub + BMC
  const links = document.createElement('div');
  links.className = 'pse-about-links';

  const github = document.createElement('a');
  github.className = 'pse-about-link pse-btn';
  github.href = GITHUB_URL;
  github.target = '_blank';
  github.rel = 'noopener noreferrer';
  github.innerHTML = '<span class="pse-about-link-icon">⭐</span> Auf GitHub ansehen';
  links.appendChild(github);

  const bmc = document.createElement('a');
  bmc.className = 'pse-about-link pse-about-link-bmc';
  bmc.href = BMC_URL;
  bmc.target = '_blank';
  bmc.rel = 'noopener noreferrer';
  bmc.innerHTML = '<span class="pse-about-link-icon">☕</span> Buy me a coffee';
  links.appendChild(bmc);

  modal.appendChild(links);

  // Credits + Lizenz
  const credits = document.createElement('div');
  credits.className = 'pse-about-credits';
  credits.innerHTML =
    'Gebaut von <strong>Lars Oste</strong> zusammen mit Claude (Anthropic).<br>' +
    'Tech-Stack: Vite · TypeScript · Three.js · Vitest.<br>' +
    'Quellen: NIST WebBook, SDBS AIST, PubChem, Silverstein, Clayden, Vollhardt, Odian, Voet.';
  modal.appendChild(credits);

  document.body.appendChild(root);

  function onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }
  document.addEventListener('keydown', onKey);

  function close(): void {
    root.remove();
    document.removeEventListener('keydown', onKey);
  }
}
