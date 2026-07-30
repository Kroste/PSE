# PSE — Design

Kanonisches Design-Dokument. Änderungen am Konzept landen zuerst hier, dann im Code.

## Leitidee

> Materie **von unten nach oben** bauen. Vom Quark bis zum Molekül. Wissenschaftlich
> korrekt, aber vereinfacht. Jedes Rezept mit Quelle.

Zwei Phasen:

- **Phase 1 — Der PSE-Aufstieg**: Elementarteilchen → Nukleonen → Wasserstoff → alle
  118 Elemente.
- **Phase 2 — Darüber hinaus**: Chemische Verbindungen (Wasser, Alkohole, Polymere,
  Astrochemie).

## Gestaltungsprinzipien

1. **Realismus vor Bequemlichkeit** — wenn es nicht real passiert, kommt es nicht ins
   Spiel. Alle Rezepte haben eine Quelle (`Recipe.source`) und einen deutschen
   Erklärungstext (`Recipe.scienceNoteDE`).
2. **Physik wird nicht simuliert, sondern vorausgesetzt.** Statt Druck und Temperatur
   zu modellieren, wählt der Spieler den **Reaktor-Kontext**, in dem die Reaktion
   passieren _kann_. Die Auswahl des Kontexts _ist_ die Physik.
3. **KI ist additiv, nie im kritischen Pfad.** Das Spiel funktioniert komplett ohne KI.
4. **Additive Freischaltung** — nichts wird weggenommen. Neue Reaktoren erweitern die
   Möglichkeiten, alte bleiben nutzbar.
5. **Daten vor Code.** Neue Rezepte/Entitäten kommen ausschließlich in
   `src/game/content/*.json`. Die Engine kennt keine hartkodierten IDs.

## Reaktoren

Der Reaktor ist der **Kontext**, in dem eine Reaktion möglich ist. Er bestimmt, welche
Rezepte überhaupt sichtbar/anwendbar sind.

| ID              | Name           | Wofür                                                | Freischaltung           |
| --------------- | -------------- | ---------------------------------------------------- | ----------------------- |
| `workbench`     | Werkbank       | Symbolische Grundmontage: Quarks → Hadronen, p+e⁻→H  | Start                   |
| `stellar-core`  | Sternkern      | pp-Kette, CNO-Zyklus, Alpha-Prozess bis Eisen        | H entdeckt              |
| `agb-star`      | AGB-Stern      | s-Prozess (langsamer Neutroneneinfang) bis Blei      | Sternkern-Rezept genutzt |
| `supernova`     | Supernova      | r-Prozess (schneller Neutroneneinfang) bis Uran      | AGB-Rezept genutzt      |
| `cyclotron`     | Zyklotron      | Superschwere Elemente (Z > 92) durch Beschuss        | Uran entdeckt           |
| `chem-lab`      | Chemielabor    | Phase 2: chemische Bindungen, Moleküle, Polymere     | Erstes stabiles Element |

Die Werkbank ist eine Vereinfachung — Quarks kann man in Realität nicht zusammenlegen
(Confinement). Sie dient dem Onboarding und macht den Bauplan sichtbar. Der Text im
Spiel (`scienceNoteDE`) benennt das explizit.

## Datenmodell

Vollständig typisiert in `src/game/content/types.ts`. Zusammenfassung:

- **Entity** — `particle | hadron | nucleus | element` (später auch `molecule`). Jede
  Entity hat `id`, `nameDE`, `scienceNoteDE`, `source`, `color`.
  - `nucleus` trägt zusätzlich `z` (Kernladungszahl), `a` (Massenzahl), `protons`,
    `neutrons`, `massMeV`, `bindingEnergyMeV`, optional `halfLifeS` (Sekunden;
    undefined = stabil).
- **Recipe** — `{ id, kind, reactor, inputs, outputs, energyMeV?, scienceNoteDE, source, unlocksReactors? }`.
  `inputs`/`outputs` sind **Multisets** (`Record<EntityId, number>`).
- **Multiset-Match**: ein Rezept passt, wenn die vom Spieler zusammengestellten
  Zutaten **exakt** den `inputs` entsprechen. Keine Übermengen, keine Untermengen.
- **freeSupply** — Teilchen mit `freeSupply: true` (Quarks, e⁻, γ, Gluon) sind
  ab Spielstart unbegrenzt aus dem Umgebungsvakuum verfügbar. Sie werden **nicht**
  aus dem Inventar abgezogen, brauchen aber trotzdem Slots in der Craft-Zone.
- **Discovered = dauerhaft verfügbar.** Sobald eine Non-freeSupply-Entity einmal
  erfolgreich gecraftet wurde, gilt sie ab da als unbegrenzt verfügbar (analog zu
  freeSupply). `availableCount(id)` liefert dann `Infinity`, `craft()` verbraucht
  sie nicht mehr aus dem Inventar. Die Discovery selbst ist der Fortschritts-Marker
  — ein einmal freigespieltes Rezept fungiert danach wie ein „Blueprint".

Der Katalog wird beim App-Start via `assertContentConsistency()` geprüft: keine
doppelten IDs, keine Rezepte auf unbekannte Entities, Hadron-Quarks existieren als
Quark-Entities, für jeden Kern gilt `Z = protons` und `A = protons + neutrons`.
Bricht früh — kaputter Content ist ein Build-Fehler, kein Laufzeit-Bug.

## Spielmodus: Normal vs. Experten

Zwei parallele Rezept-Sets, umschaltbar per Toolbar-Toggle:

- **Normal-Modus** (Default): vereinfachte Rezepte für den kompletten Aufstieg.
  - Grundmontage: Quarks → Proton/Neutron, dann `p + e⁻ → H`.
  - Elemente ab He werden direkt aus **N·p + N·n + Z·e⁻ → Element** an der
    Werkbank gebaut. Keine Kern-Zwischenprodukte, kein Sternkern nötig.
- **Experten-Modus**: die reale Physik.
  - Kerne (`nucleus`) als eigene Entities: Deuteron, Triton, Helion, Alpha,
    ¹²C, ¹⁶O, ²⁰Ne, ²⁴Mg, ²⁸Si, ⁵⁶Ni, ⁵⁶Fe (plus CNO-Zwischenkerne).
  - pp-Kette am Sternkern, α-Kette bis Eisen, Silizium-Verbrennung, CNO-Zyklus.
  - Element-Assembly an der Werkbank aus Kern + Elektronen (`⁴He + 2e⁻ → He`,
    `⁵⁶Fe + 26e⁻ → Fe`, …).

Recipe-Feld `mode: 'expert' | 'simple' | 'both'`. Fehlt = `both`. `matchRecipe`
und `availableRecipesForActiveReactor` filtern nach aktuellem Modus. Ein Reaktor
ohne Rezepte im aktuellen Modus wird in der Toolbar ausgeblendet; ein Modus-
Wechsel, der den aktiven Reaktor „leer" machen würde, springt automatisch auf
Werkbank zurück.

`expertMode` wird im `PersistedState` gespeichert; alte Saves ohne das Feld
starten im Normal-Modus.

## Craft-Loop

1. Spieler wählt Reaktor (Start = Werkbank).
2. Spieler füllt die **Craft-Zone** mit Zutaten aus:
   - **Palette** (freie Zutaten und bereits entdeckte Non-freeSupply-Entities), oder
   - direkt aus dem **Inventar**.
3. Klick auf **„Verschmelzen"**:
   - Engine sucht das eindeutige Rezept mit `reactor === activeReactor` und
     `inputs == craftZone` (Multiset-Gleichheit).
   - Kein Match → Hinweis, Craft-Zone bleibt bestehen.
   - Match:
     - Nur noch nicht discovered und nicht-freeSupply Inputs werden aus dem
       Inventar entfernt (Voraussetzung: Bestand reicht). Discovered und
       freeSupply Inputs sind unbegrenzt.
     - Outputs kommen ins Inventar (Zähler wächst monoton) und werden in
       `discovered` aufgenommen — damit sind sie ab jetzt ebenfalls unbegrenzt.
     - Falls `unlocksReactors`: neue Reaktoren werden freigeschaltet.
     - Craft-Zone wird geleert.

**Determinismus**: mehrere Rezepte mit identischem `inputs + reactor` sind ein
Content-Fehler und werden vom Konsistenzcheck geblockt.

## Progression

Progress ist implizit — kein XP-System, kein Skill-Tree. Freischaltung entsteht
ausschließlich durch:

- **Entity-Entdeckung** (`discovered`) schaltet neue Palette-Einträge frei.
- **Rezept-Nutzung** kann via `unlocksReactors` neue Reaktoren öffnen.

Damit ist die Baumstruktur des Spiels **aus den Daten ableitbar** — der Content
definiert den Fortschritt, nicht die Engine.

## UI-Grundriss (M1)

Hybrid: **3D-Bühne** (Three.js) für die live an den State gekoppelte Reaktionszone
und den Craft-Ergebnis-Flash, **DOM-Overlay** (HTML/CSS) für Inventar, Detail-Panel,
Buttons und Rezept-Katalog. Grund für den Split: DOM ist deutlich besser für Text,
Buttons und Barrierefreiheit; die Reaktion selbst wird trotzdem als 3D-Objekt sichtbar
(rotierender Ring aus Zutaten-Sphären auf einer Plattform, Ergebnis flasht mittig).

```
+---------------------------------------------------------------+
|  PSE   [Werkbank]                              v0.x · N entd. |
+-----------------+---------------------------+-----------------+
|  Inventar       |                           |  Detail         |
|  Elementar-     |                           |  □ u · Up-Quark |
|  teilchen       |    ┌─────────────────┐    |  Typ: particle  |
|  ○ u  ∞  [+]    |    │   Reaktions-    │    |  Ladung: +2/3 e |
|  ○ d  ∞  [+]    |    │   plattform     │    |  Spin: 0.5      |
|  ○ e⁻ ∞  [+]    |    │  (3D-Ring der   │    |  Masse: 2.16 MeV|
|  ○ γ  ∞  [+]    |    │   Zutaten)      │    |  Notiz: …       |
|  ○ g  ∞  [+]    |    │                 │    |  Quelle: PDG    |
|  Gebaut         |    └─────────────────┘    |                 |
|  ○ p  ×2 [+]    |                           |                 |
|  Zone: 2u+1d+3g |    (Flash bei Craft-      |                 |
|  [⚛ Reaktion]   |     Ergebnis)             |                 |
|  Rezepte:       |                           |                 |
|  2u+1d+3g → p   |                           |                 |
+-----------------+---------------------------+-----------------+
```

- **Inventar-Panel (links):** freie und nicht-freie Zutaten, jeweils mit `[+]`/`[−]`
  zum Verschieben in die Reaktionszone. `[+]` ist disabled, wenn kein Vorrat da wäre
  (Non-freeSupply-Entities). Klick auf die Zeile öffnet die Entity im Detail-Panel.
- **Reaktionszone (3D, Mitte):** Zutaten als leuchtende Sphären kreisförmig auf einer
  Metallplattform, live an den State gebunden (`subscribe`) und sanft rotierend.
- **Craft-Flash (3D, Mitte):** bei erfolgreicher Reaktion (`onCraft`) erscheint das
  Ergebnis mittig und fadet über ~1.4 s aus.
- **Detail-Panel (rechts):** zeigt die zuletzt gewählte oder neu entdeckte Entity
  mit Attributen, Wissenschaftsnotiz und Quelle.
- **Craft-Controls:** „Reaktion ausführen" (`craft()`) und „Zone leeren".
- **Rezept-Katalog:** listet die für den aktiven Reaktor definierten Rezepte —
  reine Zutaten-/Produkt-Notation als Onboarding-Hilfe.

**M1 macht Klick, nicht Drag.** Drag&Drop und in-scene-Picking auf die 3D-Sphären
sind ein Refinement für M2.

## Persistenz

- Save-Envelope in LocalStorage, versionsiert, mit Migrations-Slot (`save.ts`).
- Gespeichert wird `PersistedState` (`discovered`, `unlockedReactors`, `activeReactor`,
  `inventory`). **Nicht** die `reactionZone` — die ist ephemer und Teil von `GameState`,
  aber nicht von `PersistedState`.
- Zukünftige Save-Versionen sind rückwärtskompatibel via `migrations[v]`.

## Quellen-Politik

Jedes Rezept **muss** `source` haben. Bevorzugte Quellen in dieser Reihenfolge:

1. Peer-reviewed Publikationen / Standard-Referenzen (PDG, NIST, IUPAC, CODATA).
2. Etablierte Lehrbücher (Kernphysik, physikalische Chemie).
3. Wikipedia — nur als Einstieg, nicht als Endquelle.

`scienceNoteDE` bleibt für Spieler lesbar (2–3 Sätze). Wenn Realismus und Spielbarkeit
kollidieren (siehe Werkbank), benennt der Text den Kompromiss.

## Roadmap

- **M0** ✅ — Fundament (Vite/TS/Three.js, State-Store, Save, Vitest, CI, Pages).
- **M1** ✅ — Design-Doc, Content-Grundpaket (5 Teilchen, 2 Hadronen, H), Craft-Engine
  im Store, 3D-Reaktionszone mit Live-Binding, DOM-HUD mit Detail-Panel und
  Rezept-Katalog, erste 3 Rezepte (Proton, Neutron, H).
- **M2** ✅ — `nucleus`-Entity, Kerne Deuteron/Triton/Helion/Alpha, Positron,
  Sternkern-Reaktor (freigeschaltet durch H-Craft), vollständige pp-I-Kette
  (2p→²H+e⁺ / ²H+p→³He+γ / 2·³He→⁴He+2p), Reaktor-Wechsel-Toolbar,
  Drag&Drop von Inventar in Reaktionszone, HUD-Kategorien nach Entity-Kind.
- **M3** ✅ — Alpha-Prozess bis Eisen (Triple-α, α-Kette C→O→Ne→Mg→Si, Si-Burning,
  ⁵⁶Ni→⁵⁶Fe-β⁺-Zerfall), CNO-Zyklus (6 Schritte, ¹²C als Katalysator),
  Elemente He, C, N, O, Ne, Mg, Si, Fe mit Assembly-Rezepten an der Werkbank,
  PSE-Übersicht-Panel (Layout aller 118 Elemente, entdeckte hervorgehoben,
  Klick öffnet Detail). Zusätzlich: 3D-Atom-Visualisierung nach dem
  **Bohr-Modell** (Nukleonen-Cluster mit roten Protonen und blauen Neutronen,
  Elektronen auf schrägen Schalenbahnen) in der Hauptbühne. Das
  **Quanten-Orbitalmodell** (s/p/d/f-Wolken) lebt als Live-3D-Preview im
  Detail-Panel.
- **M4a** ✅ — Alle 118 Elemente H..Og als ElementEntity (Z, Atommasse, Elektronen-
  konfiguration, Periode/Gruppe/Block, Kategorie, CPK-Farbe, Beschreibung). Simple-
  Rezepte für Elemente Z≥2 werden im Loader generiert (`generateSimpleElementRecipes`
  in `content/index.ts`), sodass alle Atome im Normal-Modus baubar sind ohne den
  Rezept-Katalog aufzublähen. Damit ist die PSE-Übersicht vollständig gefüllt.
- **M4b** ✅ — s-Prozess am AGB-Stern (Fe→Sr→Ba→Pb via Neutronen-Einfang, magische
  Peaks bei N=50/82/126) und r-Prozess in der Supernova (Fe→Th/U in einem Burst).
  Neue schwere Kerne (Sr-88, Ba-138, Pb-208, Th-232, U-235, U-238) plus
  Element-Assembly für Sr/Ba/Pb/Th/U. Freischaltungskette H → Sternkern → AGB →
  Supernova via `unlocksReactors` an den Schlüssel-Rezepten.
- **M4c** ✅ — Live-Reaktionskammer statt starrem Ring (persistente 3D-Partikel mit
  Physik: Nukleon-Cluster, Elektron-Wolke), Instabilitäts-Feedback (nervöses Wackeln
  + Zerfall-Animation nach Valley of Stability), Fusion-Animation, Auto-Fusion nach
  2.2 s bei Rezept-Match. Ziel-Panel im HUD ("Nächstes Element", Klick öffnet Detail).
  Sound-Cues via Web Audio (Klick, Reactor, Fusion, Zerfall, Discovery), umschaltbar.
- **M5** ✅ — Chemielabor freigeschaltet durch H-Craft, MoleculeEntity mit
  Formel, Atomen, Bonds, Geometrie, Molmasse; 3D-Ball-Stick-Rendering in der
  Hauptbühne und als Preview im Detail-Panel.
- **M5+** ✅ — Content-Ausbau auf ~55 Moleküle in mehreren Wellen:
  - Anorganische Gase, Oxide, Säuren, Basen, Salze (CO, H₂O₂, O₃, SO₂/SO₃, H₂S,
    HCl, HNO₃, H₂SO₄, NaCl, NaOH, CaCO₃, NO, NO₂ …).
  - Kohlenwasserstoffe (Alkane C₂/C₃, Alken C₂H₄, Alkin C₂H₂, Aromat C₆H₆) und
    Sauerstoff-Funktionalitäten (Methanol, Ethanol, Formaldehyd, Acetaldehyd,
    Aceton, Ameisen-/Essigsäure, Harnstoff).
  - **Silikone (21 Vertreter)**: Silane (SiH₄, SiMe₄), Chlorsilane (SiCl₄,
    M-/D-/T-Cl, PhSiCl₃), Silanole (M-OH, D-diol), Silazan (HMDS),
    Alkoxysilane (TMOS, TEOS, MTMS, VinylTMOS, APTES), Cyclosiloxane
    (D3, D4, D5), lineares PDMS (HMDSO, MDM), POSS-Käfig (T8H).
- **M5-UX** ✅ — Live-Reaktionskammer mit Physik (Nukleon-Cluster, Elektron-Wolke,
  Instabilitäts-Wackeln, Zerfall nach Valley of Stability), Auto-Fusion nach
  2.2 s bei Rezept-Match. Bohr-Atom mit sauber rotierenden Elektronen als
  Hauptbühne, Quanten-Orbitalmodell als Preview im Detail-Panel.
  Maus-Drag rotiert das Atom/Molekül, Mausrad zoomt die Kamera. Sound-Cues
  via Web Audio (Klick, Reactor, Fusion, Zerfall, Discovery). Inventar filtert
  reaktor-abhängig (Chemielabor zeigt nur Atome + Moleküle), enthält
  Suchfeld, kollapsible Sektionen und Molekül-Untergruppen nach `categoryDE`.
  Ziel-Panel im HUD wählt reaktor-abhängig: "Nächstes Element" (Werkbank/
  Sternfusion) oder "Nächste Reaktion" (Chemielabor).
  PSE-Overlay zeigt Atommasse, Kategorien-Farbrand, Statistik-Kopfzeile und
  vollständige Legende.
- **M6** ✅ — Biomoleküle: Aminosäuren (Glycin, Alanin, Serin), Zucker
  (α-D-Glukose, β-D-Ribose), Nukleobasen (Adenin, Thymin, Guanin, Cytosin,
  Uracil). Neue Kategorien "Biomolekül (Aminosäure/Zucker/Nukleobase)".
- **M7** ✅ — Polymer-Monomere und -Ausschnitt: Propen, Vinylchlorid, Styrol,
  Tetrafluorethylen, Caprolactam, Terephthalsäure sowie PE-Fragment (n=3)
  als Beispiel-Ausschnitt einer Polymerkette. Neue Kategorien "Polymer-Monomer"
  und "Polymer (Ausschnitt)".
- **M8** ✅ — Astrochemie: Ionen (H₃⁺, HCO⁺), Radikale (CN·, OH·), komplexe
  organische Moleküle (Methanimin, Glykolaldehyd) und PAK (Naphthalin) —
  interstellare Chemie in eigenen Astrochemie-Kategorien.
- **M9** ✅ — Endgame-Panel: 20 Achievements (erste Reaktion, Symbol-Meilensteine
  wie H/He/C/Fe/U/Og, Kategorie-Vollständigkeit wie alle Edelgase/Alkali/
  Halogene/DNA-Basen/Silikone, Reaktor-Vollständigkeit, Katalog-Vollständigkeit)
  mit sortiertem Grid (erreicht zuerst), Progress-Bar und Entity-Kind-Statistik.
- **Wissensdatenbank** ✅ — Overlay-Panel mit allen Entities (Elementarteilchen,
  Hadronen, Atomkerne, Elemente, Moleküle), filterbar nach Kind, Status
  (entdeckt/unbekannt) und Freitextsuche über Symbol/Name/Formel/Kategorie.
  Klick öffnet Detail.
- **Custom-Verbindungen** ✅ — JSON-Editor-Overlay für nutzerdefinierte
  Moleküle. Validierung (Pflichtfelder, gültige Element-IDs, atomCounts vs.
  atoms konsistent, Bond-Indizes, Geometrie), Speicherung in LocalStorage,
  Auto-Rezept-Generierung für chem-lab (mode: both). Custom-Moleküle
  erscheinen im Inventar, im Chemielabor und in der Wissensdatenbank
  gleichwertig zu Katalog-Molekülen.
- **Struktur-Editor + SMILES-Import** ✅ — Custom-Verbindungs-Editor
  bekommt zwei Tabs: Struktur-Formular (Chemiker: Atome + Bindungen
  auswählen, kein JSON) und JSON (Power-User). SMILES-Kürzel-Notation
  parst zu Atomen/Bindungen (`CCO` → Ethanol, `CC(=O)O` → Essigsäure,
  `C1=CC=CC=C1` → Benzol Kekulé). 3D-Koordinaten via Force-directed
  Layout automatisch berechnet. Live-Vorschau (Summenformel Hill-Notation,
  Molmasse, VSEPR-Geometrie).
- **MOL/SDF-Import** ✅ — V2000-Parser (`src/game/chemistry/mol.ts`)
  für den Import aus PubChem, ChemDraw und ähnlichen Chemie-Tools.
  Datei-Upload oder Text-Paste im Struktur-Editor; 3D-Koordinaten aus
  der Datei werden 1:1 übernommen. Multi-Molekül-SDF nimmt das erste.
  Aromatische Bindungsordnung (4) mappt auf Einfachbindung.
- **Sandbox-Modus** ✅ — Toolbar-Toggle "🎨 Sandbox" schaltet auf einen
  eigenen Save-Slot (`pse.sandbox.save.v1`) mit allen 118 Elementen und
  Katalog-Molekülen vorentdeckt, allen Reaktoren offen, Chemielabor
  aktiv. Sichtbarer SANDBOX-Badge unter der Toolbar. Zurück-Schalten
  lädt den echten Fortschritts-Slot ohne Verlust.
- **Stabilitäts-Status-Chip** ✅ — Ersatz für die entfernten Plattform-
  Ringe (die bei großen Molekülen visuell clippten). Dezenter Chip im
  Reaktionszone-Panel mit 6 Zuständen: idle (⋯), stable (✓ grün),
  unstable (⚠ rot pulsiert), ready (⏳ gelb mit Progress-Bar bis Auto-
  Fusion), fusing (⚛), decaying (💥). Text-basiert, Screen-Reader-fest.
- **Reaktions-Mechanismen** ✅ — Neue Toolbar-Sektion "⚛ Mechanismen"
  mit 6 klassischen Reaktionen: SN1, SN2, elektrophile Addition
  (HBr an Ethen, Markownikow), Fischer-Veresterung, Aldol-Kondensation,
  radikalische Polymerisation (PE). Jeder Mechanismus als Schritt-für-
  Schritt-Durchgang mit Vorher/Nachher-Strukturformeln, Elektronenfluss-
  Beschreibung (curly arrows in Worten) und optionalen Beobachtungs-
  hinweisen. Quellen aus Clayden, Vollhardt, Bruice, Odian.
- **Content-Ausbau (Wellen 6-8)** ✅ — Molekül-Katalog von 55 auf 170
  Einträge gewachsen. Neue Kategorien und Vertiefungen:
  - +36 organische / pharmazeutische / astrochemische (Alkane C₄-C₈,
    Alkohole, Ether, Aromaten, Halogen-KWs, weitere Aminosäuren,
    Fructose, Coffein, Aspirin, Neurotransmitter Dopamin/Serotonin/
    Adrenalin, HCN, HC₃N).
  - +30 Polymer-Einträge in fein gegliederten Kategorien: Thermoplaste
    (PP/PS/PVC/PMMA/PVA/PAN/POM/PC/PET), Elastomere (Naturkautschuk,
    SBR), Biopolymere (PLA, Cellulose), Hochleistungspolymere (Nylon-6,
    Nylon-66, Kevlar, PEEK), Duroplast (Epoxy), leitfähiges Polymer
    (Polyacetylen), PDMS-Trimer, plus 10 fehlende Monomere (Butadien,
    Isopren, MMA, Vinylacetat, Acrylnitril, Acrylsäure, HMD,
    Adipinsäure, Bisphenol A, Melamin).
  - +25 Silikon-Tiefenzug (Master-Thesis-tauglich): funktionalisierte
    Silane (GPTMS, MPTMS, MPTES-SH, AEAPTMS, OTS, TEVS), Cyclosiloxane
    (D6, DMD, V4, H-D4), lineare PDMS (MD2M, MD3M, PDMS-oil-5,
    Dihydroxy-PDMS), POSS und Silikate (T8Me, T8Vinyl, H₄SiO₄, MQ-
    Harz), Vernetzer (TEOS-Kondensat, Karstedt-Modell, RTV), natürliche
    Silikate (α-Quarz, Olivin, Kaolinit).

## Offene Milestones

- **M10 — Reaktions-Kinetik & Gleichgewicht.** Statt binärem "passt
  oder passt nicht" ein einfaches Kinetik-Modell: Reaktions-
  geschwindigkeit hängt von Konzentrationen ab, Gleichgewicht mit
  Rückreaktion (Le Chatelier per Zutaten-Menge). Erlaubt Reaktionen
  wie Estergleichgewicht auch pädagogisch korrekt darzustellen.
- **M11 — 3D-Mechanismen-Visualisierung.** Die Text-Mechanismen aus
  M9+ um echte curly arrows als 3D-Bezier-Kurven erweitern, animiert
  über die Ball-Stick-Struktur der beteiligten Moleküle. Show, don't
  tell — für den visuellen Lerntyp.
- **M12 — Aufgaben-Modus / Lernpfade.** Vordefinierte Challenges
  ("Baue Aspirin aus Grundstoffen", "Zeige den SN2-Mechanismus für
  OH⁻ + CH₃Br", "Alle DNA-Basen in einer Session"). Auswertung als
  Achievement-Set, optional Zeitmessung. Guide-Modus mit Hinweisen.
- **M13 — Spektroskopie-Ansicht.** Zu jedem Molekül die Standard-
  Spektren (IR-Peaks für Funktionalgruppen, ¹H-NMR-Verschiebungen,
  UV/Vis-Absorption) als statisches Diagramm im Detail-Panel. Kein
  echtes DFT — kuratierte Datenbank aus Literaturwerten.
- **M14 — Enzym-Katalyse & Peptide.** Chemielabor bekommt Sub-
  Modus "Biolabor" mit Enzymen als Katalysator-Entities (können
  wiederverwendet werden, senken Aktivierungsenergie sichtbar).
  Peptid-Bildung aus Aminosäuren, DNA-Basenpaarung, einfaches
  Zentraldogma (DNA → RNA → Protein) als geführte Sequenz.
- **M15 — MOL/SDF-Export & Sharing.** Custom-Verbindungen als
  .mol-Datei exportieren (V2000-Roundtrip), URL-Share (State in
  base64-codiertem URL-Fragment), einfacher Import bereitgestellter
  Beispielsammlungen ("Master-Thesis Silikone", "Grundstoff-
  Chemie") beim ersten Start.
- **M16 — Stereo-/Isomerie-Bewusstsein.** Kennzeichnung von
  Chiralitäts-Zentren, cis/trans, R/S in der 3D-Ansicht.
  Struktur-Editor erlaubt Angabe der Stereo-Information.
  Optionale "Racemat vs. Enantiomer"-Unterscheidung im Kinetik-
  Modell (Bezug zu M10).
