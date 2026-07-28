# PSE — Periodensystem der Elemente

Browser-Puzzle-Spiel: baue Materie **von unten nach oben** — von Quarks und Elektronen
über Nukleonen und Atome bis zum vollständigen Periodensystem, danach chemische
Verbindungen bis „darüber hinaus".

**Status:** Meilenstein **M1** — Design-Doc, Content-Grundpaket (5 Elementarteilchen,
Proton, Neutron, Wasserstoff), Craft-Engine im Store, 3D-Reaktionszone mit Live-Binding
und Ergebnis-Flash, DOM-HUD (Inventar / Reaktions-Controls / Detail-Panel /
Rezept-Katalog), erste 3 Rezepte an der Werkbank (2u+1d+3g → p, 1u+2d+3g → n, p+e⁻ → H).

## Konzept

- **Phase 1:** Elementarteilchen → Proton/Neutron → Wasserstoff → alle 118 Elemente.
- **Phase 2:** Verbindungen (Wasser, Alkohole, Polymere, Astrochemie).
- **Mechanik:** Little-Alchemy-artiges Drag&Drop-Crafting.
- **Realismus:** wissenschaftlich korrekt, vereinfacht. Jedes Rezept mit Quelle.
  Physik wird nicht simuliert — Druck/Temperatur werden per **Reaktor-Kontext**
  vorausgesetzt (Werkbank / Stern-Kern / AGB / Supernova / Zyklotron / Chemielabor).

Der Design-Plan liegt in [`docs/design.md`](./docs/design.md).

## Entwicklung

```bash
npm install
npm run dev        # Vite-Dev-Server, http://localhost:5173
npm test           # Vitest, headless
npm run typecheck  # tsc -b --noEmit
npm run build      # Production-Build nach dist/
npm run preview    # Preview des Production-Builds
npm run lint
npm run format
```

Voraussetzungen: Node ≥ 20, npm ≥ 10, moderner WebGL-fähiger Browser
(getestet mit Chromium und Firefox).

## Deployment

Push auf `main` → GitHub Actions bauen und deployen automatisch auf GitHub Pages
(`https://kroste.github.io/PSE/`).

## Lizenz

MIT — siehe [LICENSE](./LICENSE).
