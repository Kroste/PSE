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
- **M4b** — s-Prozess am AGB-Stern, r-Prozess an Supernova mit repräsentativen
  Kern-Zwischenschritten (Neutron-Einfang bis Blei/Uran).
- **M5** — Chemielabor: Bindungen, kleine Moleküle (H₂O, CH₄, NH₃).
- **M6+** — Polymere, Astrochemie, Endgame.
