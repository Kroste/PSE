import type { Spectra, IrPeak, NmrPeak } from '../game/content/types';

/**
 * SVG-Diagramme für die Spektren-Ansicht im Detail-Panel.
 * Bewusst kompakt (240×90) — soll in die Seitenleiste passen.
 */
const WIDTH = 240;
const HEIGHT = 90;
const PAD_L = 22;
const PAD_R = 8;
const PAD_T = 8;
const PAD_B = 20;
const CHART_W = WIDTH - PAD_L - PAD_R;
const CHART_H = HEIGHT - PAD_T - PAD_B;

/** IR-Spektrum: x-Achse 4000 → 400 cm⁻¹ (Chemie-Konvention: rechts nach links). */
export function renderIrChart(peaks: readonly IrPeak[]): SVGSVGElement {
  const svg = createSvg();
  addAxis(svg, '4000', '400', 'cm⁻¹');
  for (const peak of peaks) {
    // 4000 → x=0, 400 → x=CHART_W. Skala linear.
    const x = PAD_L + ((4000 - peak.wavenumber) / (4000 - 400)) * CHART_W;
    const h = intensityHeight(peak.intensity);
    // Als vertikale Linie zeichnen (Peak-Absorption).
    const line = createLine(x, PAD_T + CHART_H, x, PAD_T + CHART_H - h);
    line.setAttribute('stroke', colorForIntensity(peak.intensity));
    line.setAttribute('stroke-width', '1.6');
    const title = createTitle(`${peak.wavenumber} cm⁻¹ (${peak.intensity}) — ${peak.assignmentDE}`);
    line.appendChild(title);
    svg.appendChild(line);
  }
  return svg;
}

/** ¹H-NMR-Spektrum: x-Achse 12 → 0 ppm (auch rechts nach links). */
export function renderNmrChart(peaks: readonly NmrPeak[]): SVGSVGElement {
  const svg = createSvg();
  addAxis(svg, '12', '0', 'δ (ppm)');
  const maxN = Math.max(...peaks.map((p) => p.nProtons), 1);
  for (const peak of peaks) {
    const x = PAD_L + ((12 - peak.shift) / 12) * CHART_W;
    const h = (peak.nProtons / maxN) * CHART_H;
    const line = createLine(x, PAD_T + CHART_H, x, PAD_T + CHART_H - h);
    line.setAttribute('stroke', '#7bb8ff');
    line.setAttribute('stroke-width', '1.6');
    const title = createTitle(
      `${peak.shift.toFixed(2)} ppm, ${peak.nProtons}H (${peak.multiplicity}) — ${peak.assignmentDE}`,
    );
    line.appendChild(title);
    svg.appendChild(line);
  }
  return svg;
}

/** Container mit allen verfügbaren Spektren + Peak-Liste. */
export function renderSpectraSection(spectra: Spectra): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'pse-spectra';
  const header = document.createElement('div');
  header.className = 'pse-spectra-label';
  header.textContent = '📈 Spektroskopie';
  wrap.appendChild(header);

  if (spectra.ir && spectra.ir.length > 0) {
    const block = document.createElement('div');
    block.className = 'pse-spec-block';
    const title = document.createElement('div');
    title.className = 'pse-spec-title';
    title.textContent = 'IR-Spektrum';
    block.appendChild(title);
    block.appendChild(renderIrChart(spectra.ir));
    block.appendChild(renderPeakList(spectra.ir.map(irPeakSummary)));
    wrap.appendChild(block);
  }

  if (spectra.nmr1h && spectra.nmr1h.length > 0) {
    const block = document.createElement('div');
    block.className = 'pse-spec-block';
    const title = document.createElement('div');
    title.className = 'pse-spec-title';
    title.textContent = '¹H-NMR (in CDCl₃, TMS = 0)';
    block.appendChild(title);
    block.appendChild(renderNmrChart(spectra.nmr1h));
    block.appendChild(renderPeakList(spectra.nmr1h.map(nmrPeakSummary)));
    wrap.appendChild(block);
  }

  if (spectra.uvVis && spectra.uvVis.length > 0) {
    const block = document.createElement('div');
    block.className = 'pse-spec-block';
    const title = document.createElement('div');
    title.className = 'pse-spec-title';
    title.textContent = 'UV/Vis';
    block.appendChild(title);
    const bandsText = spectra.uvVis
      .map((b) => `λ_max = ${b.lambdaMax} nm${b.epsilon ? ` (ε ≈ ${b.epsilon})` : ''} — ${b.assignmentDE}`)
      .join('  •  ');
    const p = document.createElement('div');
    p.className = 'pse-spec-peaklist';
    p.textContent = bandsText;
    block.appendChild(p);
    wrap.appendChild(block);
  }

  if (spectra.source) {
    const src = document.createElement('div');
    src.className = 'pse-spec-source';
    src.textContent = `Quelle: ${spectra.source}`;
    wrap.appendChild(src);
  }
  return wrap;
}

function renderPeakList(lines: readonly string[]): HTMLElement {
  const list = document.createElement('ul');
  list.className = 'pse-spec-peaklist';
  for (const l of lines) {
    const li = document.createElement('li');
    li.textContent = l;
    list.appendChild(li);
  }
  return list;
}

function irPeakSummary(p: IrPeak): string {
  return `${p.wavenumber} cm⁻¹ (${p.intensity}) — ${p.assignmentDE}`;
}

function nmrPeakSummary(p: NmrPeak): string {
  return `δ ${p.shift.toFixed(2)} ppm, ${p.nProtons}H (${p.multiplicity}) — ${p.assignmentDE}`;
}

function intensityHeight(i: IrPeak['intensity']): number {
  return i === 'strong' ? CHART_H * 0.9 : i === 'medium' ? CHART_H * 0.55 : CHART_H * 0.25;
}
function colorForIntensity(i: IrPeak['intensity']): string {
  return i === 'strong' ? '#ff8a3d' : i === 'medium' ? '#ffb488' : '#c48866';
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function createSvg(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
  svg.setAttribute('width', String(WIDTH));
  svg.setAttribute('height', String(HEIGHT));
  svg.classList.add('pse-spec-svg');
  return svg;
}

function createLine(x1: number, y1: number, x2: number, y2: number): SVGLineElement {
  const l = document.createElementNS(SVG_NS, 'line');
  l.setAttribute('x1', String(x1));
  l.setAttribute('y1', String(y1));
  l.setAttribute('x2', String(x2));
  l.setAttribute('y2', String(y2));
  return l;
}

function createText(x: number, y: number, text: string, className: string): SVGTextElement {
  const t = document.createElementNS(SVG_NS, 'text');
  t.setAttribute('x', String(x));
  t.setAttribute('y', String(y));
  t.setAttribute('class', className);
  t.textContent = text;
  return t;
}

function createTitle(text: string): SVGTitleElement {
  const el = document.createElementNS(SVG_NS, 'title');
  el.textContent = text;
  return el;
}

function addAxis(svg: SVGSVGElement, leftLabel: string, rightLabel: string, unit: string): void {
  // Waagerechte Grundlinie
  const axis = createLine(PAD_L, PAD_T + CHART_H, PAD_L + CHART_W, PAD_T + CHART_H);
  axis.setAttribute('stroke', 'rgba(255,255,255,0.35)');
  axis.setAttribute('stroke-width', '0.8');
  svg.appendChild(axis);
  // Achsen-Beschriftungen
  const left = createText(PAD_L, HEIGHT - 4, leftLabel, 'pse-spec-tick');
  const right = createText(PAD_L + CHART_W, HEIGHT - 4, rightLabel, 'pse-spec-tick');
  right.setAttribute('text-anchor', 'end');
  const u = createText(WIDTH / 2, HEIGHT - 4, unit, 'pse-spec-tick');
  u.setAttribute('text-anchor', 'middle');
  svg.appendChild(left);
  svg.appendChild(right);
  svg.appendChild(u);
}
