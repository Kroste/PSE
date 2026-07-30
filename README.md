# PSE — Periodensystem der Elemente

> Browser-Spiel: bau das Universum aus Quarks. Von Elementarteilchen über
> Atomkerne, Elemente bis zu komplexen Molekülen, Polymeren und Biochemie.
> Alle Reaktionen mit Quelle, alle Moleküle in 3D, viele mit Spektroskopie.

**Live spielen:** <https://kroste.github.io/PSE/>

---

## Inhaltsverzeichnis

- [Konzept](#konzept)
- [Erste Schritte](#erste-schritte)
- [Reaktoren](#reaktoren)
- [Panels & Overlays](#panels--overlays)
- [Für Chemiker: eigene Verbindungen](#für-chemiker-eigene-verbindungen)
- [Reaktions-Mechanismen](#reaktions-mechanismen)
- [Sandbox-Modus](#sandbox-modus)
- [Keyboard-Shortcuts](#keyboard-shortcuts)
- [Content-Statistiken](#content-statistiken)
- [Für Entwickler](#für-entwickler)
- [Roadmap](#roadmap)
- [Lizenz & Credits](#lizenz--credits)

---

## Konzept

Materie **von unten nach oben** bauen:

- **Phase 1 — Der PSE-Aufstieg:** Elementarteilchen (Quarks, Elektronen, Photonen, Gluonen) → Nukleonen (Proton, Neutron) → Atomkerne → alle 118 Elemente.
- **Phase 2 — Chemie:** Moleküle im Chemielabor. Vom Wasserstoff bis zu Polymeren, Biomolekülen, Silikonen, Astrochemie.

**Grundprinzipien:**
- **Realismus vor Bequemlichkeit** — wenn es nicht real passiert, ist es nicht drin. Jedes Rezept mit Literatur-Quelle und deutschem Wissenschafts-Text.
- **Physik wird vorausgesetzt, nicht simuliert** — Druck und Temperatur modelliert der **Reaktor-Kontext** (Werkbank / Sternkern / AGB-Stern / Supernova / Zyklotron / Chemielabor).
- **Additive Freischaltung** — nichts wird weggenommen. Neue Reaktoren erweitern die Möglichkeiten.
- **Discovered = dauerhaft verfügbar** — einmal entdeckt, ist eine Entity unbegrenzt in deiner Palette.

---

## Erste Schritte

Beim ersten Start läuft automatisch eine **14-stufige Tour** durch alle Panels. Wenn du sie schließt und später neu willst: „❔ Tour"-Button unten rechts.

**Der erste Craft:**

1. Werkbank ist der Startreaktor. Linke Seite = Inventar mit Quarks (u/d), Elektronen, Photonen, Gluonen.
2. Klick `+` an `u` zweimal, an `d` einmal, an `g` dreimal → Reaktionszone: `2u + 1d + 3g`.
3. „⚛ Reaktion ausführen" (oder `[Space]`) → Proton entsteht. Alternativ: 2.2 s warten → **Auto-Fusion**.
4. Analog: `1u + 2d + 3g` → Neutron. Dann `1p + 1e⁻` → Wasserstoff (`H`).
5. Mit `H` sind **Sternkern** und **Chemielabor** freigeschaltet. Ab jetzt kannst du in die Vollen.

**Ziel-Panel** im HUD (unten links) schlägt dir immer das nächste sinnvolle Element / Molekül vor — mit passendem Rezept.

---

## Reaktoren

Reaktor = Kontext einer Reaktion. Bestimmt, welche Rezepte überhaupt anwendbar sind.

| Reaktor | Wofür | Freischaltung |
|---|---|---|
| **Werkbank** | Symbolische Grundmontage: Quarks → Hadronen, `p + e⁻ → H`, Simple-Rezepte für Elemente Z≥2 | Start |
| **Sternkern** | pp-Kette, CNO-Zyklus, α-Kette (C→O→Ne→Mg→Si), Silizium-Verbrennung bis Eisen | H entdeckt |
| **AGB-Stern** | s-Prozess (langsamer Neutronen-Einfang) bis Blei | Sternkern-Rezept genutzt |
| **Supernova** | r-Prozess (schneller Neutronen-Einfang) bis Uran, Thorium | AGB-Rezept genutzt |
| **Zyklotron** | Superschwere Elemente (Z > 92) durch Ionen-Beschuss | Uran entdeckt |
| **Chemielabor** | Phase 2: chemische Bindungen, Moleküle, Polymere, Biomoleküle, Silikone | H entdeckt |

**Modi:** In der Toolbar der Toggle „Experten-Modus" umschaltbar.
- **Normal:** vereinfachte Rezepte (Nukleonen direkt zu Elementen, keine Kern-Zwischenschritte)
- **Experten:** die reale Physik mit ¹²C-, ¹⁶O-, ²⁴Mg- usw. Zwischen-Kernen, komplette pp-Kette, CNO-Zyklus

---

## Panels & Overlays

Zugänglich über die Toolbar-Buttons:

- **📚 Periodensystem** — vollständiges PSE-Grid, farbkodiert nach Kategorie, entdeckte Elemente hervorgehoben, Statistik-Kopfzeile.
- **📚 Wissen** — suchbare Übersicht aller 184+ Moleküle + Elementarteilchen + Kerne. Filter nach Kind, Status (entdeckt/unbekannt) und Freitext-Suche über Symbol/Name/Formel/Kategorie.
- **➕ Neu** — Custom-Verbindungs-Editor (siehe [unten](#für-chemiker-eigene-verbindungen)).
- **🏆 Ziele** — 20 Achievements (Meilensteine wie „Erster Baryon", „Alle Edelgase", „Alle Silikone", „Alle 118 Elemente") + Fortschritts-Balken + Entity-Kind-Statistik.
- **⚛ Mechanismen** — 12 klassische Reaktions-Mechanismen (SN1/SN2, Diels-Alder, Wittig, Fischer-Veresterung, Aldol, Peptidbindung, radikalische Polymerisation und mehr) mit Schritt-für-Schritt-Elektronenfluss und animierter 3D-Visualisierung.
- **🎯 Aufgaben** — 15 konkrete Lernpfade mit Hinweisen und Fortschritt („Baue Aspirin", „Alle DNA-Basen", „Silikon-Grundfamilie").
- **⚖ Vergleich** — zwei Moleküle Seite-an-Seite mit 3D, Attributen, Spektroskopie-Auszug.
- **🎨 Sandbox** — freier Spielmodus mit allem entdeckt (siehe [unten](#sandbox-modus)).
- **Neustart** — löscht den aktuellen Fortschritt (sandbox-lokal wenn Sandbox aktiv).

**Detail-Panel** rechts zeigt für jede angeklickte Entity:
- Attribute (Formel, Molmasse, Konfiguration, Halbwertszeit, Bindungsenergie …)
- Wissenschafts-Notiz + Literatur-Quelle
- Optional Stereochemie-Notiz (chirale C-Atome, cis/trans, R/S)
- Optional **Spektroskopie**: IR-, ¹H-NMR-, UV/Vis-Diagramme mit Peaks + Zuordnungen
- **🧭 Bauplan**-Button — zeigt die minimale Rezept-Kette, um diese Entity aus dem Nichts zu bauen (mit Reaktor-Chips, Wissenschafts-Notizen, `📋 Kopieren`-Button)
- Für Moleküle: **📥 MOL exportieren** (kompatibel mit PubChem, ChemDraw, RDKit) und **⚖ Vergleichen**

**3D-Interaktion:** In jedem 3D-Fenster (Hauptbühne, Detail-Preview, Mechanismen, Vergleich) — **Ziehen zum Drehen · Mausrad zum Zoomen**. Auto-Rotation setzt ~2 s nach letzter Interaktion wieder ein.

---

## Für Chemiker: eigene Verbindungen

Der Custom-Editor (`➕ Neu`) bietet **drei Wege**, neue Moleküle anzulegen — je nach Chemie-Toolchain und Präferenz:

### 1. Struktur-Formular

Kein JSON, kein Python. Nur Chemie:

- Metadaten (ID, Name, Symbol, Kategorie, Farbe, Beschreibung)
- **Atome:** Dropdown mit allen 118 Elementen → Klick „＋ hinzufügen" → nummerierte Chip-Liste
- **Bindungen:** drei Dropdowns (Atom A #, Atom B #, Einfach/Doppel/Dreifach) → „＋ hinzufügen"
- **Live-Vorschau:** Summenformel (Hill-Notation), Molmasse und Geometrie werden automatisch berechnet
- **3D-Positionen** werden beim Speichern per Force-directed Layout automatisch erzeugt — der Nutzer sieht nie ein `[x, y, z]`

### 2. SMILES-Import

Kürzel-Notation der Cheminformatik:

- `CCO` → Ethanol
- `CC(=O)O` → Essigsäure
- `C1CCCCC1` → Cyclohexan
- `C1=CC=CC=C1` → Benzol (Kekulé-Form)
- `N#N` → Stickstoff
- `CC(C)(C)O` → tert-Butanol

Unterstützt: organische Untermenge C/N/O/S/P/F/Cl/Br/I/H, Bindungen `=` `#` `-`, Verzweigungen `(...)`, Ringschlüsse `1`–`9`, implizite Wasserstoffe nach Valenz. **Aromatische Kleinschreibung wie `c1ccccc1` wird NICHT unterstützt — Kekulé-Form verwenden.**

### 3. MOL/SDF-Import

Standard-Format der Cheminformatik (V2000):

- Bei PubChem: „Get 3D Coordinates" → SDF-Download → hier hochladen oder Text einfügen
- Bei ChemDraw / RDKit / Ketcher: als .mol exportieren
- 3D-Koordinaten aus der Datei werden 1:1 übernommen — kein Auto-Layout nötig
- Bei SDF-Dateien mit mehreren Molekülen wird das erste genommen

Alle drei Wege landen im gleichen Katalog. Custom-Moleküle erscheinen im Chemielabor mit Auto-Rezept (`n·Element → dein_molekül`) und tauchen im Detail-Panel, in der Wissensdatenbank und im Vergleichs-Modus gleichwertig zu Katalog-Molekülen auf. Speicherung in LocalStorage (`pse.custom.molecules`).

**Export:** Jedes Molekül kann per **📥 MOL exportieren**-Button im Detail-Panel als V2000-.mol-Datei runtergeladen werden — Roundtrip zurück in PubChem/ChemDraw ist garantiert.

---

## Reaktions-Mechanismen

Klick auf **⚛ Mechanismen** in der Toolbar. Kategorisierte Sammlung mit 12 klassischen organischen Mechanismen:

- **Substitution:** SN1, SN2, Friedel-Crafts-Alkylierung
- **Addition:** elektrophile Addition HBr an Ethen, Diels-Alder-Cycloaddition, Grignard-Addition
- **Kondensation:** Fischer-Veresterung, Aldol-Kondensation, Peptidbindung, Wittig-Reaktion
- **Eliminierung:** E2
- **Radikalreaktion:** radikalische Polymerisation (am Beispiel PE)

Klick auf einen Mechanismus → **Schritt-für-Schritt-Ansicht** mit:

- Vorher/Nachher-Strukturformeln pro Schritt
- **Elektronenfluss-Beschreibung** in Klartext („Elektronenpaar vom OH⁻ wandert zum C-Atom, gleichzeitig geht die C-Br-Bindung heterolytisch auf Br …")
- Beobachtungshinweise (Triebkraft, Stereochemie, Kinetik)
- **3D-Visualisierung** mit Atomen, dashed/soliden Bindungen und **Curly Arrows** als 3D-Bezier-Kurven (Vollpfeile für Elektronenpaare, Halbpfeile für Radikale)
- **Animierte Übergänge** zwischen Schritten (Positions-Interpolation über 0.8 s, wo die Atom-Sequenz konsistent bleibt)

Prev/Next mit Buttons oder `[←][→]`. Fortschritts-Punkte visualisieren den aktuellen Schritt.

---

## Sandbox-Modus

Toolbar-Toggle **🎨 Sandbox** öffnet einen komplett separaten Save-Slot mit:

- Allen 118 Elementen bereits entdeckt
- Allen 184+ Katalog-Molekülen bereits entdeckt
- Allen Reaktoren freigeschaltet, Chemielabor aktiv
- Eigener LocalStorage-Key (`pse.sandbox.save.v1`) — dein echter Fortschritt bleibt unangetastet

Ideal um mit dem Custom-Editor herumzuprobieren, Vergleiche zu machen oder Mechanismen ohne Grinden zu erkunden. Beim Zurück-Toggle wird der Sandbox-Zustand gespeichert und der echte Slot geladen. Ein **oranger SANDBOX-Badge** unter der Toolbar erinnert dich, in welchem Modus du bist. Achievements zeigen im Sandbox-Modus einen Hinweis, dass Fortschritt hier nicht für den echten Slot zählt.

---

## Keyboard-Shortcuts

| Taste | Aktion |
|---|---|
| **[Space]** | Reaktion ausführen (identisch zum Craft-Button) |
| **[C]** | Reaktionszone leeren |
| **[Ctrl/Cmd + K]** | Quick-Search-Palette — springt zu jedem Molekül oder Mechanismus |
| **[/]** oder **[?]** | Fokus im Inventar-Suchfeld |
| **[1]** – **[9]** | Reaktor-Wechsel (Position in der Toolbar) |
| **[Esc]** | Alle offenen Overlays schließen |

Achtung: Shortcuts feuern nicht, wenn du gerade in einem Input/Textarea tippst — außer Ctrl+K und Esc.

---

## Content-Statistiken

Aktueller Stand (siehe live im About-Modal, ℹ-Button unten rechts):

- **118 Elemente** (H bis Og, komplett)
- **~184 Moleküle** — anorganisch, organisch, biochemisch, Polymere, **46 Silikon-/Silizium-Verbindungen**, Astrochemie, Enzym-Motive
- **12 Reaktions-Mechanismen** mit 33 3D-visualisierten Schritten
- **15 Aufgaben-Lernpfade**
- **20 Achievements**
- **~13 Moleküle** mit kuratierten IR-/NMR-/UV-Spektren (Silikon-fokussiert für Master-Thesis-Nutzung)
- **~11 Moleküle** mit Stereo-Annotationen (L-Aminosäuren, α/β-Zucker, cis-Kautschuk …)

---

## Für Entwickler

Voraussetzungen: **Node ≥ 20**, npm ≥ 10, moderner WebGL-fähiger Browser (getestet mit Chromium und Firefox).

```bash
npm install
npm run dev        # Vite-Dev-Server auf http://localhost:5173
npm test           # Vitest, ~175 Tests
npm run typecheck  # tsc -b --noEmit (matched CI!)
npm run build      # Production-Build nach dist/
npm run preview    # Preview des Production-Builds
npm run lint
npm run format
```

**Tech-Stack:** Vite · TypeScript · Three.js · Vitest · GitHub Pages.

**Repo-Struktur:**

```
src/
  game/
    achievements.ts       # 20 Achievement-Definitionen
    challenges.ts         # 15 Aufgaben-Lernpfade
    pathfinding.ts        # BFS über Rezept-Hypergraph (Bauplan)
    atoms/                # 3D-Atom-/Molekül-Renderer (Bohr, Orbital, Ball-Stick)
    chemistry/            # SMILES/MOL-Parser, Formel, Layout, Mechanismen
    content/              # JSON-Katalog + Annotation-Overlays (Stereo, Spektren, Kinetik)
    physics/              # Recipe-Matcher
    state/                # Redux-artiger Store + Save/Load
  engine/
    renderer.ts           # Haupt-3D-Szene (Reaktionskammer, Fusion, Zerfall)
    loop.ts               # Game-Loop
    audio.ts              # Web-Audio-SFX
  ui/                     # HUD + Overlays (Vanilla HTML/CSS/TS, kein Framework)
    hud.ts                # Zentrales HUD-Skript
    onboarding.ts         # 14-Schritt-Tour
    quick-search.ts       # Ctrl+K
    compare.ts            # ⚖ Vergleich
    about.ts              # ℹ About
    spectra-chart.ts      # SVG-Spektren
    styles/main.css
tests/                    # Vitest — Chemie, Content, Pathfinding, Store, Save, …
docs/design.md            # Kanonisches Design-Dokument
```

**Content erweitern:** Neue Moleküle in `src/game/content/molecules.json`, Rezepte in `recipes.json` — der Konsistenzcheck (`assertContentConsistency()`) blockt Duplikate, unbekannte Element-IDs, Bond-Index-Out-of-Range und Atom-Count-Mismatches beim Start.

**Deployment:** Push auf `main` → GitHub Actions bauen, testen und deployen automatisch auf GitHub Pages (`https://kroste.github.io/PSE/`).

---

## Roadmap

Der kanonische Design-Plan und die Milestone-Historie liegen in [`docs/design.md`](./docs/design.md). Kurz:

- **M0 – M9** ✅ — Fundament, Content, PSE, Chemie, UX, Achievements, Editoren
- **M10** ✅ Kinetik & Gleichgewicht (reversible Rezepte, Ea, log K)
- **M11** ✅ 3D-Mechanismen mit Curly Arrows
- **M12** ✅ Aufgaben-Modus
- **M13** ✅ Spektroskopie
- **M14** ✅ Enzym-Katalyse & Peptide
- **M15** ✅ MOL/SDF-Export
- **M16** ✅ Stereo-/Isomerie-Markierung
- Plus alle QoL: Sandbox, Custom-Editor mit SMILES/MOL, Bauplan-Suche, Onboarding-Tour, Achievement-Toasts, Quick-Search, Vergleichs-Modus, About

---

## Lizenz & Credits

MIT — siehe [LICENSE](./LICENSE).

Gebaut von **Lars Oste** (GitHub: [Kroste](https://github.com/Kroste)) zusammen mit Claude (Anthropic).

**Wissenschaftliche Quellen** (im Content zitiert):
- **Physik:** PDG (Particle Data Group), NIST, IAEA-Nudat
- **Chemie:** Clayden/Greeves/Warren „Organische Chemie", Vollhardt/Schore, Bruice
- **Spektroskopie:** NIST WebBook, SDBS AIST, Silverstein/Webster/Kiemle
- **Polymere:** Odian „Principles of Polymerization", Ullmann's Encyclopedia
- **Biochemie:** Voet & Voet
- **Silikone:** Ullmann's + AIST-Datenbank

**Support:** Wenn dir das Projekt gefällt — [☕ Buy me a coffee](https://buymeacoffee.com/kroste).
