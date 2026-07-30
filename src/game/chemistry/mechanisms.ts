/**
 * Reaktions-Mechanismen mit Elektronenfluss (curly arrows).
 *
 * Ein Mechanismus besteht aus mehreren Schritten. Jeder Schritt zeigt
 * eine strukturformel-artige "Vorher → Nachher"-Darstellung und
 * beschreibt in Klartext, welche Elektronenpaare wandern (klassische
 * "Pfeil-Notation" der organischen Chemie).
 *
 * Bewusst textbasiert statt SVG/3D: die pädagogisch wichtige Aussage
 * ("Wo geht das Elektronenpaar hin?") lässt sich sauber in Worten
 * fassen, funktioniert mit Screen-Reader und bleibt änderungsfreundlich.
 */

import type { MechanismStep3d } from './mechanism-3d';

export type MechanismStep = {
  /** Kurzer Titel des Schritts, z. B. "Nucleophiler Angriff". */
  titleDE: string;
  /** ASCII-artige Strukturformel VOR dem Elektronenfluss. */
  before: string;
  /** Strukturformel NACH dem Schritt. */
  after: string;
  /** Text-Beschreibung der Elektronenwanderung (curly arrows). */
  electronFlowDE: string;
  /**
   * Optional: Beobachtungshinweis für den Lernenden — z. B. Was ist die
   * Triebkraft? Warum funktioniert der Schritt hier?
   */
  observationDE?: string;
  /**
   * Optional: 3D-Visualisierung des Schritts mit Atomen, Bindungen und
   * curly arrows. Wird im Detail-Overlay neben dem Text-Panel gerendert,
   * wenn vorhanden.
   */
  viz3d?: MechanismStep3d;
};

export type Mechanism = {
  id: string;
  nameDE: string;
  categoryDE:
    | 'Substitution'
    | 'Addition'
    | 'Eliminierung'
    | 'Kondensation'
    | 'Umlagerung'
    | 'Radikalreaktion'
    | 'Redox';
  /** Ein-Satz-Zusammenfassung für die Übersichts-Liste. */
  summaryDE: string;
  /** Gesamtreaktion als eine Zeile ("A + B → C + D"). */
  overallReaction: string;
  /** Wichtige Randbedingungen: Lösemittel, Temperatur, Katalysator … */
  conditionsDE: string;
  steps: MechanismStep[];
  source: string;
};

/**
 * Kernbibliothek klassischer Mechanismen. Deckt die wichtigsten
 * Reaktionstypen der Schul- und Grundstudiums-Chemie ab.
 */
export const MECHANISMS: Mechanism[] = [
  {
    id: 'sn2',
    nameDE: 'Nucleophile Substitution SN2',
    categoryDE: 'Substitution',
    summaryDE: 'Rückseitenangriff mit gleichzeitigem Abgang der Abgangsgruppe. Konzertiert, Walden-Umkehr.',
    overallReaction: 'OH⁻ + CH₃-Br → CH₃-OH + Br⁻',
    conditionsDE: 'Polar-aprotisches Lösemittel (DMSO, Aceton), starkes Nucleophil, primäres oder methyliertes C-Atom.',
    steps: [
      {
        titleDE: 'Ausgangslage',
        before: 'HO⁻    +    H₃C—Br',
        after: 'HO⁻ ⋯⋯⋯⋯⋯⋯⋯ H₃C—Br',
        electronFlowDE:
          'Nucleophil (OH⁻) nähert sich dem C-Atom auf der der Abgangsgruppe (Br) gegenüberliegenden Seite. Noch kein Elektronenfluss — nur räumliche Annäherung.',
        observationDE:
          'Rückseitenangriff ist zwingend: die drei H-Atome bilden mit dem C-Br-Zentrum eine Ebene, das OH⁻ muss von der Seite kommen, die sterisch offen ist.',
        viz3d: {
          // 0: OH-Sauerstoff (links, weit weg), 1: OH-H, 2: C (Mitte),
          // 3: Br (rechts), 4-6: die 3 H am C (nach vorn/hinten/oben)
          atoms: [
            { element: 'O', position: [-2.6, 0, 0] },
            { element: 'H', position: [-3.2, 0.55, 0] },
            { element: 'C', position: [0, 0, 0] },
            { element: 'Br', position: [1.9, 0, 0] },
            { element: 'H', position: [-0.35, 0.9, 0] },
            { element: 'H', position: [-0.35, -0.45, 0.78] },
            { element: 'H', position: [-0.35, -0.45, -0.78] },
          ],
          bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 2, to: 3, order: 1 },
            { from: 2, to: 4, order: 1 },
            { from: 2, to: 5, order: 1 },
            { from: 2, to: 6, order: 1 },
          ],
          arrows: [],
        },
      },
      {
        titleDE: 'Konzertierter Übergangszustand',
        before: 'HO⁻ ⋯⋯⋯⋯⋯⋯⋯ H₃C—Br',
        after: '[HO⋯⋯C⋯⋯Br]‡ (mit invertierten H)',
        electronFlowDE:
          'Ein Elektronenpaar wandert vom OH⁻ zum C-Atom (bildet neue C-O-Bindung). Gleichzeitig wandert das Elektronenpaar der C-Br-Bindung komplett auf das Br (heterolytische Spaltung). Die drei H-Atome klappen wie ein Regenschirm im Sturm um — Walden-Umkehr.',
        observationDE:
          'Der Übergangszustand ist trigonal-bipyramidal am C. Das ist der geschwindigkeitsbestimmende Schritt.',
        viz3d: {
          atoms: [
            { element: 'O', position: [-1.4, 0, 0] },
            { element: 'H', position: [-2.0, 0.55, 0] },
            { element: 'C', position: [0, 0, 0] },
            { element: 'Br', position: [1.4, 0, 0] },
            // H-Atome jetzt planar (trigonal-bipyramidal)
            { element: 'H', position: [0, 1.05, 0] },
            { element: 'H', position: [0, -0.52, 0.9] },
            { element: 'H', position: [0, -0.52, -0.9] },
          ],
          bonds: [
            { from: 0, to: 1, order: 1 },
            // Werdende C-O und schwindende C-Br als dashed:
            { from: 0, to: 2, order: 1, style: 'dashed' },
            { from: 2, to: 3, order: 1, style: 'dashed' },
            { from: 2, to: 4, order: 1 },
            { from: 2, to: 5, order: 1 },
            { from: 2, to: 6, order: 1 },
          ],
          arrows: [
            // OH-Elektronenpaar → C
            { from: [-1.4, 0.4, 0], to: [-0.2, 0.15, 0], curvature: 0.5 },
            // C-Br-Elektronenpaar → Br
            { from: [0.5, 0.15, 0], to: [1.4, 0.4, 0], curvature: 0.5 },
          ],
        },
      },
      {
        titleDE: 'Produkte',
        before: '[HO⋯⋯C⋯⋯Br]‡',
        after: 'HO—CH₃    +    Br⁻',
        electronFlowDE:
          'Neue C-O-Bindung vollständig geformt, Bromid-Anion trennt sich mit Elektronenpaar. Konfiguration am C ist gegenüber dem Ausgangsstoff invertiert.',
        observationDE:
          'Bei chiralem Kohlenstoff-Zentrum kehrt sich die Konfiguration exakt einmal um — deshalb heißt SN2 "stereospezifisch". Reaktionsordnung 2: v = k · [OH⁻] · [CH₃Br].',
        viz3d: {
          atoms: [
            { element: 'O', position: [-1.3, 0, 0] },
            { element: 'H', position: [-1.9, 0.55, 0] },
            { element: 'C', position: [0, 0, 0] },
            { element: 'Br', position: [2.6, 0, 0] },
            // H-Atome jetzt inverted (spiegelverkehrt zur Ausgangslage — Walden-Umkehr)
            { element: 'H', position: [0.35, 0.9, 0] },
            { element: 'H', position: [0.35, -0.45, 0.78] },
            { element: 'H', position: [0.35, -0.45, -0.78] },
          ],
          bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 0, to: 2, order: 1 },
            { from: 2, to: 4, order: 1 },
            { from: 2, to: 5, order: 1 },
            { from: 2, to: 6, order: 1 },
          ],
          arrows: [],
        },
      },
    ],
    source: 'Clayden, Greeves, Warren — Organische Chemie (2. Aufl., Kap. 15)',
  },
  {
    id: 'sn1',
    nameDE: 'Nucleophile Substitution SN1',
    categoryDE: 'Substitution',
    summaryDE: 'Zweistufig über planares Carbokation. Racemisierung, unabhängig vom Nucleophil.',
    overallReaction: '(CH₃)₃C-Br + H₂O → (CH₃)₃C-OH + HBr',
    conditionsDE: 'Polar-protisches Lösemittel (Wasser, Alkohole), tertiäres C-Atom (stabilisiert Carbokation).',
    steps: [
      {
        titleDE: 'Ionisation',
        before: '(CH₃)₃C—Br',
        after: '(CH₃)₃C⁺    +    Br⁻',
        electronFlowDE:
          'Das Elektronenpaar der C-Br-Bindung wandert komplett auf das Bromid. Zurück bleibt ein tertiäres Carbokation — planar, sp²-hybridisiert.',
        observationDE:
          'Langsamster Schritt, geschwindigkeitsbestimmend. Nur ein Reaktand beteiligt → v = k · [(CH₃)₃C-Br]. Deshalb SN1.',
        viz3d: {
          // Zentraler C mit 3 Methyl-C und einer C-Br-Bindung, die gerade bricht.
          atoms: [
            { element: 'C', position: [0, 0, 0] }, // 0: zentraler C
            { element: 'C', position: [1.4, 0.8, 0] }, // 1: Me
            { element: 'C', position: [-1.4, 0.8, 0] }, // 2: Me
            { element: 'C', position: [0, -1.5, 0] }, // 3: Me
            { element: 'Br', position: [1.6, -0.8, 0] }, // 4: Br (rausbrechend)
          ],
          bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 0, to: 2, order: 1 },
            { from: 0, to: 3, order: 1 },
            { from: 0, to: 4, order: 1, style: 'dashed' }, // schwindend
          ],
          arrows: [
            // Elektronenpaar der C-Br → Br
            { from: [0.6, -0.35, 0], to: [1.6, -0.7, 0], curvature: 0.4 },
          ],
        },
      },
      {
        titleDE: 'Nucleophiler Angriff',
        before: '(CH₃)₃C⁺    +    H₂O:',
        after: '(CH₃)₃C—OH₂⁺',
        electronFlowDE:
          'Freies Elektronenpaar am Sauerstoff des Wassers greift das leere p-Orbital des Carbokations an. Kann von beiden Seiten passieren — daher Racemisierung.',
        viz3d: {
          // Planares Carbokation + Wasser das von unten angreift
          atoms: [
            { element: 'C', position: [0, 0, 0] }, // 0: C⁺ (planar sp²)
            { element: 'C', position: [1.4, 0.7, 0] },
            { element: 'C', position: [-1.4, 0.7, 0] },
            { element: 'C', position: [0, 1.5, 0] },
            { element: 'O', position: [0, -1.7, 0] }, // 4: Wasser-O
            { element: 'H', position: [-0.7, -2.3, 0] },
            { element: 'H', position: [0.7, -2.3, 0] },
          ],
          bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 0, to: 2, order: 1 },
            { from: 0, to: 3, order: 1 },
            { from: 4, to: 5, order: 1 },
            { from: 4, to: 6, order: 1 },
            { from: 0, to: 4, order: 1, style: 'dashed' }, // werdend
          ],
          arrows: [
            // Lone-Pair vom O zum C
            { from: [0, -1.4, 0], to: [0, -0.2, 0], curvature: 0.3 },
          ],
        },
      },
      {
        titleDE: 'Deprotonierung',
        before: '(CH₃)₃C—OH₂⁺',
        after: '(CH₃)₃C—OH    +    H⁺',
        electronFlowDE:
          'Ein Wassermolekül im Lösemittel nimmt ein Proton vom Oxonium ab. Elektronenpaar der O-H-Bindung geht an O zurück.',
        observationDE: 'Aus dem H⁺ + Br⁻ wird HBr — das ist das Nebenprodukt.',
        viz3d: {
          atoms: [
            { element: 'C', position: [-1.5, 0, 0] }, // 0: t-Bu-C
            { element: 'O', position: [0, 0, 0] }, // 1: O⁺
            { element: 'H', position: [0.7, 0.9, 0] }, // 2: H am O (bleibt)
            { element: 'H', position: [0.7, -0.9, 0] }, // 3: H (geht ab)
            { element: 'O', position: [2.1, -1.5, 0] }, // 4: Wasser-O (Base)
            { element: 'H', position: [1.6, -2.3, 0] },
            { element: 'H', position: [3.0, -1.8, 0] },
          ],
          bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 1, to: 2, order: 1 },
            { from: 1, to: 3, order: 1, style: 'dashed' }, // schwindend
            { from: 4, to: 5, order: 1 },
            { from: 4, to: 6, order: 1 },
            { from: 4, to: 3, order: 1, style: 'dashed' }, // neu werdend
          ],
          arrows: [
            // Lone pair der Base zum Proton
            { from: [2.0, -1.2, 0], to: [0.75, -0.9, 0], curvature: 0.35 },
            // O-H-Bindung geht zurück zum O
            { from: [0.45, -0.65, 0], to: [0.1, -0.1, 0], curvature: 0.3 },
          ],
        },
      },
    ],
    source: 'Clayden, Greeves, Warren — Organische Chemie (2. Aufl., Kap. 15)',
  },
  {
    id: 'addition-hbr-ethen',
    nameDE: 'Elektrophile Addition (HBr an Ethen)',
    categoryDE: 'Addition',
    summaryDE: 'Markownikow-Regel: H geht an das H-reichere C, Br an das andere. Über Carbokation.',
    overallReaction: 'H₂C=CH₂ + H-Br → H₃C-CH₂-Br',
    conditionsDE: 'Unpolare Alkene, wasserfrei, Raumtemperatur. Bei asymmetrischen Alkenen: Markownikow.',
    steps: [
      {
        titleDE: 'Protonierung der Doppelbindung',
        before: 'H₂C=CH₂    +    H—Br',
        after: 'H₃C—CH₂⁺    +    Br⁻',
        electronFlowDE:
          'Das π-Elektronenpaar der C=C-Doppelbindung greift das partiell positive H⁺ des HBr an. Gleichzeitig geht das Elektronenpaar der H-Br-Bindung vollständig auf das Br. Ergebnis: primäres Carbokation + Bromid.',
        observationDE:
          'Bei Propen entstünde hier ein sekundäres Carbokation (stabiler) statt eines primären — daher Markownikow.',
        viz3d: {
          atoms: [
            { element: 'C', position: [-0.7, 0, 0] }, // 0: C1
            { element: 'C', position: [0.7, 0, 0] }, // 1: C2
            { element: 'H', position: [-1.4, 0.9, 0] }, // 2
            { element: 'H', position: [-1.4, -0.9, 0] }, // 3
            { element: 'H', position: [1.4, 0.9, 0] }, // 4
            { element: 'H', position: [1.4, -0.9, 0] }, // 5
            { element: 'H', position: [0, 2.0, 0] }, // 6: H von HBr (kommt von oben)
            { element: 'Br', position: [0.6, 2.9, 0] }, // 7: Br
          ],
          bonds: [
            { from: 0, to: 1, order: 2 }, // C=C
            { from: 0, to: 2, order: 1 },
            { from: 0, to: 3, order: 1 },
            { from: 1, to: 4, order: 1 },
            { from: 1, to: 5, order: 1 },
            { from: 6, to: 7, order: 1, style: 'dashed' }, // H-Br werdend/schwindend
          ],
          arrows: [
            // π-Elektronen von C=C → H
            { from: [0, 0.15, 0], to: [0, 1.7, 0], curvature: 0.35 },
            // H-Br-Bindungselektronen → Br
            { from: [0.3, 2.4, 0], to: [0.6, 2.9, 0], curvature: 0.35 },
          ],
        },
      },
      {
        titleDE: 'Angriff des Bromids',
        before: 'H₃C—CH₂⁺    +    Br⁻',
        after: 'H₃C—CH₂—Br',
        electronFlowDE:
          'Ein Elektronenpaar des Bromids füllt das leere p-Orbital des Carbokations. Neue C-Br-Bindung, Produkt Ethylbromid.',
        viz3d: {
          atoms: [
            { element: 'C', position: [-1.0, 0, 0] }, // 0: CH3
            { element: 'C', position: [0.4, 0, 0] }, // 1: CH2⁺ (planar sp²)
            { element: 'H', position: [-1.6, 0.9, 0] },
            { element: 'H', position: [-1.6, -0.9, 0] },
            { element: 'H', position: [-1.0, 0.0, 0.9] },
            { element: 'H', position: [0.4, 0.9, 0] },
            { element: 'H', position: [0.4, -0.9, 0] },
            { element: 'Br', position: [2.5, 0, 0] }, // 7: Br⁻
          ],
          bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 0, to: 2, order: 1 },
            { from: 0, to: 3, order: 1 },
            { from: 0, to: 4, order: 1 },
            { from: 1, to: 5, order: 1 },
            { from: 1, to: 6, order: 1 },
            { from: 1, to: 7, order: 1, style: 'dashed' }, // werdend
          ],
          arrows: [
            { from: [2.2, 0, 0], to: [0.6, 0, 0], curvature: 0.3 },
          ],
        },
      },
    ],
    source: 'Vollhardt & Schore — Organische Chemie (5. Aufl., Kap. 12)',
  },
  {
    id: 'esterification',
    nameDE: 'Fischer-Veresterung',
    categoryDE: 'Kondensation',
    summaryDE: 'Säure-katalysierte Kondensation von Carbonsäure + Alkohol zum Ester + Wasser. Gleichgewichtsreaktion.',
    overallReaction: 'CH₃-COOH + CH₃CH₂-OH ⇌ CH₃-COO-CH₂CH₃ + H₂O',
    conditionsDE: 'H₂SO₄ oder HCl als Katalysator, Überschuss eines Reaktanten oder Wasser-Entzug (Le Chatelier), Erhitzen.',
    steps: [
      {
        titleDE: 'Protonierung der Carbonyl-Gruppe',
        before: 'CH₃-C(=O)-OH    +    H⁺',
        after: 'CH₃-C(=OH⁺)-OH',
        electronFlowDE:
          'Freies Elektronenpaar am Carbonyl-Sauerstoff nimmt ein Proton auf. Der Kohlenstoff wird dadurch deutlich elektrophiler.',
        observationDE: 'Die Säure macht den Carbonyl-C für den nächsten Angriff attraktiv.',
        viz3d: {
          atoms: [
            { element: 'C', position: [-1.4, 0, 0] }, // 0: Methyl
            { element: 'C', position: [0, 0, 0] }, // 1: Carbonyl-C
            { element: 'O', position: [0, 1.3, 0] }, // 2: =O (Lone Pair greift H)
            { element: 'O', position: [1.2, -0.8, 0] }, // 3: -OH
            { element: 'H', position: [2.1, -0.5, 0] },
            { element: 'H', position: [1.2, 2.4, 0] }, // 5: H⁺ (kommt von oben)
          ],
          bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 1, to: 2, order: 2 },
            { from: 1, to: 3, order: 1 },
            { from: 3, to: 4, order: 1 },
            { from: 2, to: 5, order: 1, style: 'dashed' }, // werdend
          ],
          arrows: [
            // Lone pair vom Carbonyl-O zum Proton
            { from: [0.3, 1.5, 0], to: [1.1, 2.3, 0], curvature: 0.35 },
          ],
        },
      },
      {
        titleDE: 'Angriff des Alkohols',
        before: 'CH₃-C(=OH⁺)-OH    +    HO-CH₂CH₃',
        after: 'CH₃-C(-OH)(-OCH₂CH₃H⁺)-OH (tetraedrisch)',
        electronFlowDE:
          'Freies Elektronenpaar am O des Ethanols greift den elektrophilen C an. Die C=O-Doppelbindung wird zur C-O-Einfachbindung — π-Elektronen wandern zum O.',
        viz3d: {
          // Vereinfachte Darstellung: nur die kritischen Atome
          atoms: [
            { element: 'C', position: [-1.5, 0, 0] }, // 0: Methyl-C
            { element: 'C', position: [0, 0, 0] }, // 1: Carbonyl-C (elektrophil)
            { element: 'O', position: [0, 1.3, 0] }, // 2: protonierter Carbonyl-O
            { element: 'H', position: [0.6, 2.1, 0] }, // 3: Proton am O
            { element: 'O', position: [1.3, -0.7, 0] }, // 4: -OH
            { element: 'H', position: [2.2, -0.4, 0] }, // 5: H am OH
            { element: 'O', position: [0, -1.7, 0] }, // 6: Ethanol-O (Nucleophil, kommt von unten)
            { element: 'C', position: [1.2, -2.4, 0] }, // 7: -CH2-
            { element: 'C', position: [2.5, -1.8, 0] }, // 8: -CH3
            { element: 'H', position: [-0.6, -2.1, 0] }, // 9: H am Ethanol-O
          ],
          bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 1, to: 2, order: 2 }, // C=OH⁺
            { from: 2, to: 3, order: 1 },
            { from: 1, to: 4, order: 1 },
            { from: 4, to: 5, order: 1 },
            { from: 6, to: 7, order: 1 },
            { from: 7, to: 8, order: 1 },
            { from: 6, to: 9, order: 1 },
            { from: 1, to: 6, order: 1, style: 'dashed' }, // werdend
          ],
          arrows: [
            // Lone pair am Ethanol-O → Carbonyl-C
            { from: [0, -1.4, 0], to: [0, -0.2, 0], curvature: 0.4 },
            // π-Elektronen der C=O → O (wird zur Einfachbindung)
            { from: [0, 0.7, 0], to: [0, 1.3, 0], curvature: 0.3 },
          ],
        },
      },
      {
        titleDE: 'Protonen-Wanderung und Wasserabspaltung',
        before: 'Tetraeder-Intermediat',
        after: 'CH₃-C(=OH⁺)-OCH₂CH₃    +    H₂O',
        electronFlowDE:
          'Proton wandert vom Ethoxy-O zur OH-Gruppe (macht sie zu -OH₂⁺). Elektronenpaar der C-OH₂⁺-Bindung wandert zum O — Wasser tritt aus.',
        observationDE: 'Das ausgetretene Wasser ist die "Abgangsgruppe" dieser Kondensation.',
        viz3d: {
          atoms: [
            { element: 'C', position: [0, 0, 0] }, // 0: zentraler C (tetraedrisch)
            { element: 'O', position: [1.2, 0.9, 0] }, // 1: -OH2+ (wird Wasser)
            { element: 'H', position: [2.1, 0.7, 0] },
            { element: 'H', position: [1.5, 2.0, 0] },
            { element: 'O', position: [-1.2, 0.7, 0] }, // 4: -O-Et (bleibt)
            { element: 'C', position: [-2.0, -0.4, 0] }, // 5: Et-C
            { element: 'C', position: [-1.4, 0, 0] }, // 6: Methyl-C
            { element: 'O', position: [0.6, -1.3, 0] }, // 7: -OH (wird =O)
            { element: 'H', position: [1.5, -1.3, 0] },
          ],
          bonds: [
            { from: 0, to: 1, order: 1, style: 'dashed' }, // C-OH2 schwindend
            { from: 1, to: 2, order: 1 },
            { from: 1, to: 3, order: 1 },
            { from: 0, to: 4, order: 1 },
            { from: 4, to: 5, order: 1 },
            { from: 0, to: 6, order: 1 },
            { from: 0, to: 7, order: 1 },
            { from: 7, to: 8, order: 1 },
          ],
          arrows: [
            // C-OH2+ Bindung → O (Wasser tritt aus)
            { from: [0.6, 0.45, 0], to: [1.2, 0.9, 0], curvature: 0.3 },
          ],
        },
      },
      {
        titleDE: 'Deprotonierung zum Ester',
        before: 'CH₃-C(=OH⁺)-OCH₂CH₃',
        after: 'CH₃-C(=O)-OCH₂CH₃    +    H⁺',
        electronFlowDE:
          'Ein Wassermolekül nimmt das überschüssige Proton am Carbonyl-Sauerstoff wieder ab. Katalysator ist regeneriert.',
        viz3d: {
          atoms: [
            { element: 'C', position: [-1.5, 0, 0] }, // 0: Methyl
            { element: 'C', position: [0, 0, 0] }, // 1: Carbonyl-C
            { element: 'O', position: [0, 1.3, 0] }, // 2: =O+ (mit H)
            { element: 'H', position: [0.6, 2.1, 0] }, // 3: H (geht ab)
            { element: 'O', position: [1.3, -0.8, 0] }, // 4: -O-Et
            { element: 'C', position: [2.6, -0.4, 0] }, // 5: Et-C
            { element: 'O', position: [1.7, 2.9, 0] }, // 6: Wasser-O (Base)
            { element: 'H', position: [1.1, 3.6, 0] },
            { element: 'H', position: [2.6, 2.9, 0] },
          ],
          bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 1, to: 2, order: 2 },
            { from: 2, to: 3, order: 1, style: 'dashed' }, // schwindend
            { from: 1, to: 4, order: 1 },
            { from: 4, to: 5, order: 1 },
            { from: 6, to: 7, order: 1 },
            { from: 6, to: 8, order: 1 },
            { from: 6, to: 3, order: 1, style: 'dashed' }, // werdend
          ],
          arrows: [
            { from: [1.6, 2.9, 0], to: [0.7, 2.1, 0], curvature: 0.3 },
            { from: [0.3, 1.7, 0], to: [0, 1.3, 0], curvature: 0.3 },
          ],
        },
      },
    ],
    source: 'Bruice — Organic Chemistry (8th ed., Ch. 17)',
  },
  {
    id: 'aldol',
    nameDE: 'Aldol-Kondensation',
    categoryDE: 'Kondensation',
    summaryDE: 'C-C-Verknüpfung zweier Carbonyl-Verbindungen unter Wasserabspaltung. Grundlage vieler Bio-Synthesen.',
    overallReaction: '2 CH₃-CHO → CH₃-CH=CH-CHO + H₂O',
    conditionsDE: 'Basen-katalysiert (NaOH, Alkoholate) oder säure-katalysiert. In Wasser oder Alkoholen.',
    steps: [
      {
        titleDE: 'Enolat-Bildung',
        before: 'CH₃-CHO    +    OH⁻',
        after: '⁻CH₂-CHO (Enolat)    +    H₂O',
        electronFlowDE:
          'Base zieht α-Proton vom C neben der Carbonyl-Gruppe ab. Elektronenpaar der C-H-Bindung wandert in die Carbonyl-Ebene und wird durch Resonanz mit dem C=O stabilisiert.',
        observationDE: 'Nur α-H (nachbarn zur C=O) sind sauer genug (pKa ~20) — die Carbonyl-Gruppe stabilisiert die negative Ladung.',
        viz3d: {
          atoms: [
            { element: 'O', position: [-2.5, 0, 0] }, // 0: HO⁻ Base
            { element: 'H', position: [-3.3, 0.6, 0] },
            { element: 'C', position: [-0.7, 0, 0] }, // 2: α-C
            { element: 'H', position: [-1.4, 0.9, 0] }, // 3: α-H (schwindend)
            { element: 'H', position: [-0.7, -0.9, 0.5] },
            { element: 'C', position: [0.7, 0.7, 0] }, // 5: Carbonyl-C
            { element: 'O', position: [1.9, 0.4, 0] }, // 6: =O
            { element: 'H', position: [0.7, 1.7, 0] },
          ],
          bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 2, to: 3, order: 1, style: 'dashed' }, // C-H schwindend
            { from: 2, to: 4, order: 1 },
            { from: 2, to: 5, order: 1 },
            { from: 5, to: 6, order: 2 },
            { from: 5, to: 7, order: 1 },
            { from: 0, to: 3, order: 1, style: 'dashed' }, // neue O-H werdend
          ],
          arrows: [
            // Base greift α-H
            { from: [-2.3, 0.2, 0], to: [-1.3, 0.85, 0], curvature: 0.3 },
            // C-H-Paar → π-System der C=O (wandert in die Ebene)
            { from: [-1.05, 0.45, 0], to: [-0.35, 0.35, 0], curvature: 0.35 },
          ],
        },
      },
      {
        titleDE: 'Nucleophiler Angriff des Enolats',
        before: '⁻CH₂-CHO    +    CH₃-CHO',
        after: 'CH₃-CH(O⁻)-CH₂-CHO (Aldol)',
        electronFlowDE:
          'Enolat-Kohlenstoff greift Carbonyl-C des zweiten Aldehyds an. Neue C-C-Bindung. π-Elektronen der neuen C=O-Bindung wandern zum O — es entsteht ein Alkoxid.',
        viz3d: {
          atoms: [
            // Enolat links: ⁻CH2-CHO
            { element: 'C', position: [-2.5, 0, 0] }, // 0: Enolat-C (nucleophil)
            { element: 'C', position: [-1.4, 0.7, 0] }, // 1: Aldehyd-C
            { element: 'O', position: [-1.4, 2.0, 0] }, // 2: =O
            { element: 'H', position: [-0.6, 0.4, 0] }, // 3: H am Aldehyd
            { element: 'H', position: [-3.2, 0.6, 0] }, // 4: H am Enolat-C
            { element: 'H', position: [-3.0, -0.9, 0] }, // 5: H am Enolat-C
            // Zweiter Aldehyd rechts: CH3-CHO
            { element: 'C', position: [0, -0.5, 0] }, // 6: Carbonyl-C (Elektrophil)
            { element: 'O', position: [0.7, -1.7, 0] }, // 7: =O (wird Alkoxid)
            { element: 'H', position: [0.3, 0.5, 0] }, // 8: H am Aldehyd
            { element: 'C', position: [-1.3, -1.2, 0] }, // 9: Methyl-C
          ],
          bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 1, to: 2, order: 2 },
            { from: 1, to: 3, order: 1 },
            { from: 0, to: 4, order: 1 },
            { from: 0, to: 5, order: 1 },
            { from: 6, to: 7, order: 2 }, // C=O (wird zu Alkoxid)
            { from: 6, to: 8, order: 1 },
            { from: 6, to: 9, order: 1 },
            { from: 0, to: 6, order: 1, style: 'dashed' }, // neue C-C-Bindung
          ],
          arrows: [
            // Lone pair am Enolat-C → Elektrophiler C
            { from: [-2.3, -0.05, 0], to: [-0.2, -0.4, 0], curvature: 0.35 },
            // π-Elektronen von C=O → O
            { from: [0.4, -1.0, 0], to: [0.7, -1.7, 0], curvature: 0.35 },
          ],
        },
      },
      {
        titleDE: 'Protonierung zum β-Hydroxyaldehyd',
        before: 'CH₃-CH(O⁻)-CH₂-CHO    +    H₂O',
        after: 'CH₃-CH(OH)-CH₂-CHO (Aldol)    +    OH⁻',
        electronFlowDE:
          'Alkoxid deprotoniert ein Wassermolekül. Base regeneriert.',
        viz3d: {
          atoms: [
            { element: 'O', position: [-1.5, 0, 0] }, // 0: Alkoxid O⁻
            { element: 'C', position: [0, 0, 0] }, // 1: sp³-C
            { element: 'C', position: [0.7, 1.2, 0] }, // 2: CH2
            { element: 'C', position: [-0.7, -1.2, 0] }, // 3: Methyl
            { element: 'O', position: [-2.7, 1.5, 0] }, // 4: Wasser-O
            { element: 'H', position: [-2.0, 1.0, 0] }, // 5: Wasser-H (geht ab)
            { element: 'H', position: [-3.6, 1.2, 0] },
          ],
          bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 1, to: 2, order: 1 },
            { from: 1, to: 3, order: 1 },
            { from: 4, to: 5, order: 1, style: 'dashed' }, // schwindend
            { from: 4, to: 6, order: 1 },
            { from: 0, to: 5, order: 1, style: 'dashed' }, // werdend
          ],
          arrows: [
            // Lone pair vom Alkoxid → H
            { from: [-1.3, 0.3, 0], to: [-2.1, 1.0, 0], curvature: 0.3 },
            // O-H-Paar zurück zum O
            { from: [-2.35, 1.25, 0], to: [-2.7, 1.5, 0], curvature: 0.25 },
          ],
        },
      },
      {
        titleDE: 'Dehydratisierung zum Enal',
        before: 'CH₃-CH(OH)-CH₂-CHO',
        after: 'CH₃-CH=CH-CHO    +    H₂O',
        electronFlowDE:
          'E1cb: α-Proton wird abgezogen, das entstehende Carbanion wirft dann OH⁻ aus. Ergebnis: konjugiertes α,β-ungesättigtes Carbonyl (Enal).',
        observationDE: 'Erst bei Erwärmung — die reine Aldol-Addition (Schritt 3) ist auch isolierbar.',
        viz3d: {
          atoms: [
            { element: 'O', position: [-3.0, 1.4, 0] }, // 0: Base OH⁻
            { element: 'H', position: [-3.9, 1.6, 0] },
            { element: 'C', position: [-1.4, 0, 0] }, // 2: β-C (mit OH)
            { element: 'C', position: [0, 0.5, 0] }, // 3: α-C (mit H, das abgeht)
            { element: 'H', position: [-0.4, 1.5, 0] }, // 4: α-H (schwindend)
            { element: 'C', position: [1.4, 0, 0] }, // 5: Carbonyl-C
            { element: 'O', position: [2.5, 0.6, 0] }, // 6: =O
            { element: 'H', position: [1.4, -1.0, 0] },
            { element: 'O', position: [-2.4, -0.7, 0] }, // 8: OH (schwindend)
            { element: 'H', position: [-3.2, -1.0, 0] },
          ],
          bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 2, to: 3, order: 1 }, // wird C=C
            { from: 3, to: 4, order: 1, style: 'dashed' }, // α-H schwindend
            { from: 3, to: 5, order: 1 },
            { from: 5, to: 6, order: 2 },
            { from: 5, to: 7, order: 1 },
            { from: 2, to: 8, order: 1, style: 'dashed' }, // OH schwindend
            { from: 8, to: 9, order: 1 },
            { from: 0, to: 4, order: 1, style: 'dashed' }, // neue O-H
          ],
          arrows: [
            // Base greift α-H
            { from: [-2.8, 1.4, 0], to: [-0.4, 1.4, 0], curvature: 0.35 },
            // C-H-Paar wird zur C=C
            { from: [-0.2, 1.0, 0], to: [-0.7, 0.25, 0], curvature: 0.3 },
            // C-OH wandert zum OH (Wasser tritt aus)
            { from: [-1.9, -0.35, 0], to: [-2.4, -0.7, 0], curvature: 0.3 },
          ],
        },
      },
    ],
    source: 'Clayden — Organische Chemie (2. Aufl., Kap. 26)',
  },
  {
    id: 'peptidbindung',
    nameDE: 'Peptidbindung (Kondensation zweier Aminosäuren)',
    categoryDE: 'Kondensation',
    summaryDE:
      'Amino-Gruppe einer AS greift Carboxyl-C der zweiten an. Wasserabspaltung. In der Zelle enzymkatalysiert am Ribosom.',
    overallReaction: 'H₂N-CHR¹-COOH + H₂N-CHR²-COOH → H₂N-CHR¹-CO-NH-CHR²-COOH + H₂O',
    conditionsDE:
      'In vitro: DCC-Aktivierung oder Säurechlorid. In vivo: Ribosom mit Peptidyl-Transferase, GTP-getrieben.',
    steps: [
      {
        titleDE: 'Aktivierung der Carbonyl-Gruppe',
        before: 'H₂N-CHR¹-COOH',
        after: 'H₂N-CHR¹-CO-Aktivierung (z. B. Ester an tRNA)',
        electronFlowDE:
          'Nucleophiler Sauerstoff wird durch Kopplungs­reagenz oder tRNA-Anhang aktiviert. Am Ribosom: die COOH wird als Ester an das 3\'-OH der tRNA gebunden.',
        observationDE:
          'Ohne Aktivierung wäre die Reaktion viel zu langsam — Carboxylat und Amin bilden bevorzugt ein Salz statt eine Bindung.',
        viz3d: {
          atoms: [
            { element: 'N', position: [-2.5, 0, 0] }, // 0: H2N-
            { element: 'H', position: [-3.1, 0.8, 0] },
            { element: 'H', position: [-3.1, -0.8, 0] },
            { element: 'C', position: [-1.2, 0.4, 0] }, // 3: Cα
            { element: 'C', position: [0, 0, 0] }, // 4: Carbonyl-C
            { element: 'O', position: [0, 1.3, 0] }, // 5: =O
            { element: 'O', position: [1.2, -0.7, 0] }, // 6: -OH (schwindend)
            { element: 'H', position: [2.1, -0.4, 0] }, // 7: (geht mit Aktivator)
            { element: 'O', position: [2.7, -1.6, 0] }, // 8: Aktivator (tRNA-O)
            { element: 'C', position: [4.0, -1.5, 0] }, // 9: tRNA-C (Andeutung)
          ],
          bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 0, to: 2, order: 1 },
            { from: 0, to: 3, order: 1 },
            { from: 3, to: 4, order: 1 },
            { from: 4, to: 5, order: 2 },
            { from: 4, to: 6, order: 1, style: 'dashed' }, // -OH tritt aus
            { from: 6, to: 7, order: 1 },
            { from: 8, to: 9, order: 1 },
            { from: 4, to: 8, order: 1, style: 'dashed' }, // werdender Ester
          ],
          arrows: [
            // Lone Pair vom tRNA-O → Carbonyl-C
            { from: [2.5, -1.3, 0], to: [0.3, -0.15, 0], curvature: 0.4 },
            // C-OH-Paar → OH (raus)
            { from: [0.6, -0.35, 0], to: [1.2, -0.7, 0], curvature: 0.25 },
          ],
        },
      },
      {
        titleDE: 'Nucleophiler Angriff der Amino-Gruppe',
        before: 'H₂N-CHR²-COOH + aktivierter Carbonyl-C',
        after: 'Tetrahedral-Intermediat (C-OH, C-NHR²)',
        electronFlowDE:
          'Freies Elektronenpaar am Amin-N greift den aktivierten Carbonyl-C an. π-Elektronen der C=O wandern zum O. Neue C-N-Bindung.',
        viz3d: {
          atoms: [
            // Linke AS: aktivierter Carbonyl-C mit Abgangsgruppe
            { element: 'C', position: [-1.5, 0.7, 0] }, // 0: Carbonyl-C
            { element: 'O', position: [-1.5, 2.0, 0] }, // 1: =O
            { element: 'O', position: [-0.4, 0.1, 0] }, // 2: Abgangsgruppe (-O-Ester/tRNA)
            { element: 'C', position: [-2.7, 0.1, 0] }, // 3: Cα der linken AS
            { element: 'N', position: [-2.7, -1.3, 0] }, // 4: NH2 der linken AS
            // Rechte AS: Amino-Gruppe (Nucleophil)
            { element: 'N', position: [0.6, -0.7, 0] }, // 5: Amin-N (Nucleophil)
            { element: 'H', position: [1.1, -1.7, 0] }, // 6
            { element: 'H', position: [0.0, -1.5, 0] }, // 7
            { element: 'C', position: [1.9, -0.3, 0] }, // 8: Cα der rechten AS
          ],
          bonds: [
            { from: 0, to: 1, order: 2 }, // C=O
            { from: 0, to: 2, order: 1, style: 'dashed' }, // Abgangsgruppe schwindend
            { from: 0, to: 3, order: 1 },
            { from: 3, to: 4, order: 1 },
            { from: 5, to: 6, order: 1 },
            { from: 5, to: 7, order: 1 },
            { from: 5, to: 8, order: 1 },
            { from: 0, to: 5, order: 1, style: 'dashed' }, // neue C-N werdend
          ],
          arrows: [
            // Lone pair am Amin-N → Carbonyl-C
            { from: [0.5, -0.4, 0], to: [-1.3, 0.5, 0], curvature: 0.4 },
            // π-Elektronen der C=O → O
            { from: [-1.5, 1.3, 0], to: [-1.5, 2.0, 0], curvature: 0.3 },
          ],
        },
      },
      {
        titleDE: 'Abspaltung + Peptidbindung',
        before: 'Tetrahedral-Intermediat',
        after: 'H₂N-CHR¹-CO-NH-CHR²-COOH + H₂O (oder tRNA)',
        electronFlowDE:
          'Elektronenpaar der C-O-Bindung wandert zum abgehenden O (Hydroxyl bzw. tRNA-Ester). Neue C=O rebildet sich. Peptidbindung ist planar (partieller Doppelbindungscharakter durch N-Lone-Pair).',
        observationDE:
          'Die Peptidbindung ist wegen Resonanz planar und nur eingeschränkt drehbar — Grundlage der Sekundärstruktur (α-Helix, β-Faltblatt).',
        viz3d: {
          atoms: [
            // Tetrahedrales Intermediat + Abgangsgruppe rechts
            { element: 'N', position: [-2.0, -0.8, 0] }, // 0: N (der neue Amid-N)
            { element: 'H', position: [-2.5, -1.7, 0] },
            { element: 'C', position: [-3.4, -0.4, 0] }, // 2: Cα rechts
            { element: 'C', position: [0, 0, 0] }, // 3: zentraler C (tetraedrisch)
            { element: 'O', position: [0, 1.4, 0] }, // 4: -OH (wird =O)
            { element: 'H', position: [0.8, 2.0, 0] },
            { element: 'O', position: [1.4, -0.6, 0] }, // 6: Abgangsgruppe (schwindend)
            { element: 'C', position: [2.6, -1.2, 0] }, // 7: tRNA/Ester-Rest
            { element: 'C', position: [-1.4, 0.7, 0] }, // 8: Cα links
          ],
          bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 0, to: 2, order: 1 },
            { from: 0, to: 3, order: 1 },
            { from: 3, to: 4, order: 1 }, // wird C=O
            { from: 4, to: 5, order: 1 },
            { from: 3, to: 6, order: 1, style: 'dashed' }, // Abgang
            { from: 6, to: 7, order: 1 },
            { from: 3, to: 8, order: 1 },
          ],
          arrows: [
            // C-O-Bindungspaar → wird π-Bindung (C=O rebildet sich)
            { from: [0, 0.6, 0], to: [0, 1.4, 0], curvature: 0.3 },
            // C-Abgangsgruppen-Bindungspaar → O der Abgangsgruppe
            { from: [0.6, -0.3, 0], to: [1.4, -0.6, 0], curvature: 0.3 },
          ],
        },
      },
    ],
    source: 'Voet & Voet — Biochemistry (4th ed., Ch. 4-5)',
  },
  {
    id: 'radikal-polymerisation',
    nameDE: 'Radikalische Polymerisation (PE aus Ethen)',
    categoryDE: 'Radikalreaktion',
    summaryDE: 'Initiator → Kettenstart → Propagation → Terminierung. Grundlage der meisten Massenkunststoffe.',
    overallReaction: 'n H₂C=CH₂ → -(CH₂-CH₂)ₙ-  (Polyethylen)',
    conditionsDE: 'Peroxide (Benzoylperoxid, AIBN) als Initiator, 60-90 °C, mäßiger Druck.',
    steps: [
      {
        titleDE: 'Initiator-Zerfall',
        before: 'R-O-O-R',
        after: '2 R-O·',
        electronFlowDE:
          'Homolyse: die schwache O-O-Bindung bricht symmetrisch — jedes O behält ein Elektron. Es entstehen zwei Alkoxy-Radikale. Halbpfeile ("fish-hook") statt normaler Elektronenpaar-Pfeile.',
        observationDE: 'Wärme oder UV-Licht liefert die Aktivierungsenergie. Halbwertszeit des Initiators bestimmt die Reaktionsgeschwindigkeit.',
        viz3d: {
          atoms: [
            { element: 'C', position: [-2.4, 0, 0] }, // 0: R-C (links)
            { element: 'O', position: [-1.0, 0, 0] }, // 1: O
            { element: 'O', position: [1.0, 0, 0] }, // 2: O
            { element: 'C', position: [2.4, 0, 0] }, // 3: R-C (rechts)
          ],
          bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 1, to: 2, order: 1, style: 'dashed' }, // bricht homolytisch
            { from: 2, to: 3, order: 1 },
          ],
          arrows: [
            // Halbpfeil links (ein Elektron zum O)
            { from: [-0.3, 0.3, 0], to: [-0.9, 0.3, 0], curvature: 0.25, fullArrow: false },
            // Halbpfeil rechts (anderes Elektron zum anderen O)
            { from: [0.3, -0.3, 0], to: [0.9, -0.3, 0], curvature: 0.25, fullArrow: false },
          ],
        },
      },
      {
        titleDE: 'Kettenstart',
        before: 'R-O·    +    H₂C=CH₂',
        after: 'R-O-CH₂-CH₂·',
        electronFlowDE:
          'Radikal-Elektron und ein π-Elektron der C=C-Doppelbindung bilden eine neue σ-Bindung. Das andere π-Elektron bleibt als ungepaartes Elektron am zweiten C — neues Kohlenstoff-Radikal.',
        viz3d: {
          atoms: [
            { element: 'O', position: [-2.5, 0.3, 0] }, // 0: R-O· Radikal
            { element: 'C', position: [-3.6, -0.3, 0] }, // 1: R
            { element: 'C', position: [-0.5, 0.5, 0] }, // 2: C1 (nimmt R-O)
            { element: 'C', position: [1.0, 0.5, 0] }, // 3: C2 (wird Radikal)
            { element: 'H', position: [-1.1, 1.4, 0] },
            { element: 'H', position: [-0.5, -0.5, 0] },
            { element: 'H', position: [1.6, 1.4, 0] },
            { element: 'H', position: [1.6, -0.5, 0] },
          ],
          bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 2, to: 3, order: 2 }, // C=C
            { from: 2, to: 4, order: 1 },
            { from: 2, to: 5, order: 1 },
            { from: 3, to: 6, order: 1 },
            { from: 3, to: 7, order: 1 },
            { from: 0, to: 2, order: 1, style: 'dashed' }, // werdend
          ],
          arrows: [
            // Halbpfeil vom Radikal-O zum C1
            { from: [-2.3, 0.4, 0], to: [-0.7, 0.5, 0], curvature: 0.3, fullArrow: false },
            // Halbpfeil π-Elektron des C=C zum C2 (wird neues Radikal)
            { from: [0.3, 0.7, 0], to: [1.0, 0.7, 0], curvature: 0.25, fullArrow: false },
          ],
        },
      },
      {
        titleDE: 'Kettenwachstum (Propagation)',
        before: 'R-O-CH₂-CH₂·    +    H₂C=CH₂',
        after: 'R-O-CH₂-CH₂-CH₂-CH₂·',
        electronFlowDE:
          'Selber Mechanismus wie beim Kettenstart — nur immer wieder. Jeder Schritt hängt zwei -CH₂- ans Kettenende. In Massenkunststoffen tausendfach.',
        observationDE:
          'Bei PE tausende Wiederholungen. Bei Vinylchlorid, Styrol, Acrylnitril genauso — nur mit anderer Doppelbindung.',
        viz3d: {
          atoms: [
            // Wachsendes Kettenende (Radikal-C·) links
            { element: 'C', position: [-2.5, 0.4, 0] }, // 0: -CH2- der wachsenden Kette
            { element: 'C', position: [-1.3, -0.4, 0] }, // 1: Radikal-C· (elektronen-arm)
            { element: 'H', position: [-3.2, 1.0, 0] },
            { element: 'H', position: [-3.0, -0.4, 0] },
            { element: 'H', position: [-1.3, -1.4, 0] },
            { element: 'H', position: [-0.6, -1.0, 0] },
            // Ethen-Monomer rechts
            { element: 'C', position: [0.5, 0.5, 0] }, // 6
            { element: 'C', position: [1.9, 0.5, 0] }, // 7
            { element: 'H', position: [-0.1, 1.4, 0] },
            { element: 'H', position: [0.5, -0.5, 0] },
            { element: 'H', position: [2.5, 1.4, 0] },
            { element: 'H', position: [2.5, -0.4, 0] },
          ],
          bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 0, to: 2, order: 1 },
            { from: 0, to: 3, order: 1 },
            { from: 1, to: 4, order: 1 },
            { from: 1, to: 5, order: 1 },
            { from: 6, to: 7, order: 2 }, // C=C
            { from: 6, to: 8, order: 1 },
            { from: 6, to: 9, order: 1 },
            { from: 7, to: 10, order: 1 },
            { from: 7, to: 11, order: 1 },
            { from: 1, to: 6, order: 1, style: 'dashed' }, // neue C-C werdend
          ],
          arrows: [
            // Halbpfeil vom Radikal-C zum Ethen-C (fish-hook)
            { from: [-1.1, -0.1, 0], to: [0.4, 0.3, 0], curvature: 0.35, fullArrow: false },
            // Halbpfeil aus der C=C π-Bindung zum anderen C (das neue Radikal wird)
            { from: [1.2, 0.7, 0], to: [1.9, 0.7, 0], curvature: 0.3, fullArrow: false },
          ],
        },
      },
      {
        titleDE: 'Terminierung (Rekombination)',
        before: '~CH₂-CH₂·    +    ·CH₂-CH₂~',
        after: '~CH₂-CH₂-CH₂-CH₂~',
        electronFlowDE:
          'Zwei Radikal-Enden treffen sich, ihre ungepaarten Elektronen bilden eine neue C-C-Bindung. Kette ist tot.',
        observationDE: 'Alternative: Disproportionierung — ein Radikal überträgt sein β-H auf das andere, es entstehen ein Alken und ein Alkan.',
        viz3d: {
          atoms: [
            // Zwei Radikal-Kettenenden nähern sich in der Mitte
            { element: 'C', position: [-2.8, 0.3, 0] }, // 0: R-CH2-
            { element: 'C', position: [-1.4, -0.3, 0] }, // 1: -CH2· (Radikal links)
            { element: 'C', position: [1.4, -0.3, 0] }, // 2: ·CH2- (Radikal rechts)
            { element: 'C', position: [2.8, 0.3, 0] }, // 3: -CH2-R
            { element: 'H', position: [-3.4, 1.1, 0] },
            { element: 'H', position: [-1.4, -1.3, 0] },
            { element: 'H', position: [-1.4, -0.3, 0.9] },
            { element: 'H', position: [1.4, -1.3, 0] },
            { element: 'H', position: [1.4, -0.3, 0.9] },
            { element: 'H', position: [3.4, 1.1, 0] },
          ],
          bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 2, to: 3, order: 1 },
            { from: 0, to: 4, order: 1 },
            { from: 1, to: 5, order: 1 },
            { from: 1, to: 6, order: 1 },
            { from: 2, to: 7, order: 1 },
            { from: 2, to: 8, order: 1 },
            { from: 3, to: 9, order: 1 },
            { from: 1, to: 2, order: 1, style: 'dashed' }, // werdend
          ],
          arrows: [
            // Zwei Halbpfeile, die sich in der Mitte treffen
            { from: [-1.0, -0.1, 0], to: [0, -0.3, 0], curvature: 0.2, fullArrow: false },
            { from: [1.0, -0.1, 0], to: [0, -0.3, 0], curvature: -0.2, fullArrow: false },
          ],
        },
      },
    ],
    source: 'Odian — Principles of Polymerization (4th ed., Ch. 3)',
  },
  {
    id: 'e2-elimination',
    nameDE: 'E2-Eliminierung',
    categoryDE: 'Eliminierung',
    summaryDE:
      'Base zieht anti-periplanares β-H ab, gleichzeitig Abgangsgruppe raus, C=C-Doppelbindung entsteht. Konzertiert.',
    overallReaction: 'CH₃-CH₂-Br + NaOEt → CH₂=CH₂ + HBr + NaOEt',
    conditionsDE:
      'Starke Base (Alkoholat, DBU), sperrig für Selektivität. Anti-periplanare Geometrie am β-C nötig — kontrolliert Zaitsev/Hofmann.',
    steps: [
      {
        titleDE: 'Anti-periplanare Ausrichtung',
        before: 'H⁻ (Base) und C-Br stehen um 180° auf gegenüberliegenden Seiten',
        after: 'gleichbleibend, nur räumlich geordnet',
        electronFlowDE:
          'Damit E2 konzertiert laufen kann, muss das β-H mit der C-X-Bindung anti-periplanar stehen (Diederwinkel 180°). Bei Cyclohexan heißt das: beide axial. Bei acyclischen Systemen ist die frei rotierbare Konformation meist zugänglich.',
        observationDE:
          'Ist keine anti-periplanare Konformation möglich (z. B. sperrige Substituenten), fällt die Reaktion auf E1 oder SN1 zurück.',
        viz3d: {
          atoms: [
            // Zeigt Cβ-H und Cα-Br "gegenüber", 180° Diederwinkel
            { element: 'H', position: [0, 1.5, 0] }, // 0: β-H (oben)
            { element: 'C', position: [-0.7, 0.5, 0] }, // 1: Cβ
            { element: 'C', position: [0.7, -0.5, 0] }, // 2: Cα
            { element: 'Br', position: [0.7, -2.0, 0] }, // 3: Br (unten, anti zu H)
            { element: 'H', position: [-1.7, 0.9, 0] },
            { element: 'H', position: [-1.0, 0.0, 0.9] },
            { element: 'H', position: [1.7, -0.1, 0] },
            { element: 'H', position: [0.7, -0.6, 0.9] },
          ],
          bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 1, to: 2, order: 1 },
            { from: 2, to: 3, order: 1 },
            { from: 1, to: 4, order: 1 },
            { from: 1, to: 5, order: 1 },
            { from: 2, to: 6, order: 1 },
            { from: 2, to: 7, order: 1 },
          ],
          arrows: [],
        },
      },
      {
        titleDE: 'Konzertierter Übergang',
        before: 'Base + H-Cβ-Cα-Br',
        after: '[Base⋯H⋯Cβ=Cα⋯Br]‡',
        electronFlowDE:
          'Drei Elektronenpaare wandern GLEICHZEITIG: (1) Freies Paar der Base greift das β-H an, (2) das C-H-Bindungspaar wird zum π-Elektronenpaar der neuen C=C-Doppelbindung, (3) das C-Br-Bindungspaar geht komplett auf Br. Ein Schritt, keine Zwischenstufe.',
        observationDE:
          'Rate = k · [Substrat] · [Base] — bimolekular, deshalb "E2". Konzertiert = keine Carbokation-Zwischenstufe, keine Umlagerungen.',
        viz3d: {
          atoms: [
            // Anti-periplanares Setup: Base oben, C-Cβ-H, C-Cα-Br unten
            { element: 'O', position: [0, 2.5, 0] }, // 0: Base (Alkoholat-O)
            { element: 'H', position: [0.9, 3.0, 0] }, // 1: Base-Alkyl-Andeutung
            { element: 'H', position: [0.0, 1.4, 0] }, // 2: β-H (das abgeht)
            { element: 'C', position: [-0.7, 0.5, 0] }, // 3: Cβ
            { element: 'C', position: [0.7, -0.5, 0] }, // 4: Cα
            { element: 'Br', position: [0.7, -2.0, 0] }, // 5: Abgangsgruppe
            { element: 'H', position: [-1.7, 0.9, 0] }, // 6: Cβ-H
            { element: 'H', position: [-1.0, 0.0, 0.9] }, // 7: Cβ-H
            { element: 'H', position: [1.7, -0.1, 0] }, // 8: Cα-H
            { element: 'H', position: [0.7, -0.6, 0.9] }, // 9: Cα-H
          ],
          bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 2, to: 3, order: 1, style: 'dashed' }, // C-H schwindend
            { from: 3, to: 4, order: 1 }, // wird zu C=C
            { from: 4, to: 5, order: 1, style: 'dashed' }, // C-Br schwindend
            { from: 3, to: 6, order: 1 },
            { from: 3, to: 7, order: 1 },
            { from: 4, to: 8, order: 1 },
            { from: 4, to: 9, order: 1 },
            { from: 0, to: 2, order: 1, style: 'dashed' }, // neue O-H werdend
          ],
          arrows: [
            // Base greift β-H an
            { from: [0, 2.2, 0], to: [0, 1.7, 0], curvature: 0.25 },
            // C-H-Bindung wird zur C=C
            { from: [-0.35, 1.0, 0], to: [0, 0, 0], curvature: 0.35 },
            // C-Br-Bindung → Br
            { from: [0.7, -1.2, 0], to: [0.7, -2.0, 0], curvature: 0.3 },
          ],
        },
      },
    ],
    source: 'Clayden — Organische Chemie (2. Aufl., Kap. 17)',
  },
  {
    id: 'diels-alder',
    nameDE: 'Diels-Alder-Cycloaddition',
    categoryDE: 'Addition',
    summaryDE:
      'Konzertierte [4+2]-Cycloaddition zwischen einem Dien (s-cis) und einem Dienophil. Bildet zwei neue C-C-Bindungen gleichzeitig.',
    overallReaction: 'H₂C=CH-CH=CH₂ + H₂C=CH₂ → Cyclohexen',
    conditionsDE:
      'Thermisch (Erhitzen), keine Katalyse nötig. Dienophil-EWG (Ester, Nitrile) beschleunigt. Diels-Alder mit inverser Elektronenrichtung existiert auch.',
    steps: [
      {
        titleDE: 'Konzertierte Cycloaddition',
        before: 'Butadien (s-cis) + Ethen',
        after: 'Cyclohexen',
        electronFlowDE:
          'Sechs Elektronen wandern in einem einzigen konzertierten Schritt kreisförmig um: (1) π-Elektronen der C1=C2 des Diens werden zur neuen σ-Bindung C1-Cα des Dienophils, (2) π-Elektronen der C2-C3 des Diens werden zur neuen C2=C3-Doppelbindung im Produkt, (3) π-Elektronen der C3=C4 werden zur neuen σ-Bindung C4-Cβ des Dienophils, (4) π-Elektronen des Dienophils wandern zurück ins Dien-Gerüst. Alle drei Pfeile im Kreis.',
        observationDE:
          'Nobelpreis 1950 für Otto Diels & Kurt Alder. Konzertiert bedeutet: EIN Übergangszustand, KEIN Zwischenprodukt, stereospezifisch (cis bleibt cis). "Woodward-Hoffmann-Regel" — thermisch erlaubt für [4+2].',
        viz3d: {
          atoms: [
            // Butadien (in s-cis-Konformation, "U-Form" oben)
            { element: 'C', position: [-1.4, 0.9, 0] }, // 0: C1
            { element: 'C', position: [-0.7, 1.7, 0] }, // 1: C2
            { element: 'C', position: [0.7, 1.7, 0] }, // 2: C3
            { element: 'C', position: [1.4, 0.9, 0] }, // 3: C4
            // Dienophil (Ethen, darunter)
            { element: 'C', position: [-0.7, -0.5, 0] }, // 4: Cα
            { element: 'C', position: [0.7, -0.5, 0] }, // 5: Cβ
            // H-Atome der Enden (schematisch)
            { element: 'H', position: [-2.4, 0.6, 0] },
            { element: 'H', position: [2.4, 0.6, 0] },
            { element: 'H', position: [-1.2, 2.5, 0] },
            { element: 'H', position: [1.2, 2.5, 0] },
            { element: 'H', position: [-1.4, -0.9, 0] },
            { element: 'H', position: [-0.7, -0.5, 0.9] },
            { element: 'H', position: [1.4, -0.9, 0] },
            { element: 'H', position: [0.7, -0.5, 0.9] },
          ],
          bonds: [
            { from: 0, to: 1, order: 2 }, // C1=C2 (Dien)
            { from: 1, to: 2, order: 1 }, // C2-C3
            { from: 2, to: 3, order: 2 }, // C3=C4
            { from: 4, to: 5, order: 2 }, // Dienophil
            { from: 0, to: 4, order: 1, style: 'dashed' }, // neue Bindung 1
            { from: 3, to: 5, order: 1, style: 'dashed' }, // neue Bindung 2
            { from: 0, to: 6, order: 1 },
            { from: 3, to: 7, order: 1 },
            { from: 1, to: 8, order: 1 },
            { from: 2, to: 9, order: 1 },
            { from: 4, to: 10, order: 1 },
            { from: 4, to: 11, order: 1 },
            { from: 5, to: 12, order: 1 },
            { from: 5, to: 13, order: 1 },
          ],
          arrows: [
            // Drei Pfeile im Kreis
            { from: [-1.0, 1.3, 0], to: [-0.7, -0.1, 0], curvature: 0.3 }, // C1=C2 → neue σ
            { from: [0, 1.7, 0], to: [0, 0.7, 0], curvature: 0.3 }, // C3-C4-π → C2=C3
            { from: [1.0, 1.3, 0], to: [0.7, -0.1, 0], curvature: 0.3 }, // C3=C4 → neue σ
            // Dienophil-π zurück zum Dien
            { from: [0, -0.5, 0], to: [0, 1.0, 0], curvature: 0.4 },
          ],
        },
      },
      {
        titleDE: 'Stereospezifität: cis bleibt cis',
        before: 'Übergangszustand (schmetterlings-artig, endo/exo)',
        after: 'Cyclohexen mit erhaltener Stereochemie am Dienophil',
        electronFlowDE:
          'Kein weiterer Elektronenfluss — die Cycloaddition ist bereits abgeschlossen. Wichtig aber die räumliche Konsequenz: alle Substituenten am Dienophil, die vor der Reaktion cis (auf derselben Seite der C=C) standen, bleiben cis im Produkt. Trans bleibt trans. Ebenso beim Dien: E/Z-Konfiguration überträgt sich 1:1 in die räumliche Anordnung am neuen Ring.',
        observationDE:
          'Endo-Regel: bei Reaktionen mit sekundären orbitalen Wechselwirkungen (elektronenziehende Substituenten im Dienophil) ist das endo-Produkt kinetisch bevorzugt, obwohl das exo-Produkt thermodynamisch stabiler wäre.',
        viz3d: {
          // Cyclohexen-Produkt: 6er-Ring mit einer C=C
          atoms: [
            { element: 'C', position: [1.4, 0, 0] },
            { element: 'C', position: [0.7, 1.21, 0] },
            { element: 'C', position: [-0.7, 1.21, 0] },
            { element: 'C', position: [-1.4, 0, 0] },
            { element: 'C', position: [-0.7, -1.21, 0] },
            { element: 'C', position: [0.7, -1.21, 0] },
            { element: 'H', position: [2.3, 0.5, 0] },
            { element: 'H', position: [1.1, 2.15, 0.4] },
            { element: 'H', position: [-1.1, 2.15, 0.4] },
            { element: 'H', position: [-2.3, 0.5, 0] },
            { element: 'H', position: [-1.1, -2.15, 0.4] },
            { element: 'H', position: [-1.1, -2.15, -0.4] },
            { element: 'H', position: [1.1, -2.15, 0.4] },
            { element: 'H', position: [1.1, -2.15, -0.4] },
          ],
          bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 1, to: 2, order: 2 }, // die verbleibende C=C
            { from: 2, to: 3, order: 1 },
            { from: 3, to: 4, order: 1 },
            { from: 4, to: 5, order: 1 },
            { from: 5, to: 0, order: 1 },
            { from: 0, to: 6, order: 1 },
            { from: 1, to: 7, order: 1 },
            { from: 2, to: 8, order: 1 },
            { from: 3, to: 9, order: 1 },
            { from: 4, to: 10, order: 1 },
            { from: 4, to: 11, order: 1 },
            { from: 5, to: 12, order: 1 },
            { from: 5, to: 13, order: 1 },
          ],
          arrows: [],
        },
      },
    ],
    source: 'Diels & Alder, Liebigs Ann. Chem. 460, 98 (1928); Clayden Kap. 34',
  },
  {
    id: 'grignard',
    nameDE: 'Grignard-Addition an Aldehyd',
    categoryDE: 'Addition',
    summaryDE:
      'Grignard-Reagenz (R-MgX) greift Carbonyl-C an, Alkoxid entsteht — nach wässriger Aufarbeitung sekundärer Alkohol.',
    overallReaction: 'CH₃-MgBr + H-CHO → CH₃-CH(OH)-H (Ethanol)',
    conditionsDE:
      'Wasserfrei (!), Ether-Lösemittel (Diethylether oder THF), −78 °C bis Raumtemperatur, Aufarbeitung mit verdünnter Säure.',
    steps: [
      {
        titleDE: 'Nucleophiler Angriff des Carbanions',
        before: 'CH₃-MgBr + H-CHO',
        after: 'CH₃-CH(O⁻)-H · MgBr⁺',
        electronFlowDE:
          'Die polare C-Mg-Bindung ist so weit auf der C-Seite negativ, dass das C ein waschechtes Nucleophil ist ("Carbanion-Charakter"). Elektronenpaar der C-Mg-Bindung greift den elektrophilen Carbonyl-C an. π-Elektronen der C=O wandern zum O — es entsteht ein Magnesium-Alkoxid.',
        observationDE:
          'Grignard war die erste Reaktion, mit der man beliebige C-C-Bindungen aufbauen konnte — Nobelpreis 1912. Vorsicht mit Wasser: Grignard zerfällt sofort zu R-H + Mg(OH)Br.',
        viz3d: {
          atoms: [
            // Grignard links: CH3-MgBr (polar, C nucleophil)
            { element: 'C', position: [-2.0, 0, 0] }, // 0: Methyl-C (nucleophil)
            { element: 'H', position: [-2.6, 0.9, 0] },
            { element: 'H', position: [-2.6, -0.9, 0] },
            { element: 'H', position: [-2.0, 0.0, 0.9] },
            // Formaldehyd rechts: H-CHO
            { element: 'C', position: [0.4, -0.2, 0] }, // 4: Carbonyl-C (elektrophil)
            { element: 'O', position: [0.4, 1.1, 0] }, // 5: =O
            { element: 'H', position: [1.4, -0.6, 0] }, // 6
            { element: 'H', position: [-0.5, -0.6, 0] }, // 7
            // Magnesium-Bromid (weit rechts, wird nach dem Angriff Gegenion)
            { element: 'Mg', position: [-2.0, -1.9, 0] }, // 8: Mg (schwach an C gebunden)
            { element: 'Br', position: [-2.0, -3.4, 0] }, // 9: Br
          ],
          bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 0, to: 2, order: 1 },
            { from: 0, to: 3, order: 1 },
            { from: 4, to: 5, order: 2 }, // C=O
            { from: 4, to: 6, order: 1 },
            { from: 4, to: 7, order: 1 },
            { from: 0, to: 8, order: 1, style: 'dashed' }, // C-Mg polar/schwindend
            { from: 8, to: 9, order: 1 },
            { from: 0, to: 4, order: 1, style: 'dashed' }, // neue C-C werdend
          ],
          arrows: [
            // Elektronenpaar von C-Mg → Carbonyl-C
            { from: [-1.6, -0.15, 0], to: [0.2, -0.2, 0], curvature: 0.35 },
            // π-Elektronen der C=O → O
            { from: [0.4, 0.5, 0], to: [0.4, 1.1, 0], curvature: 0.3 },
          ],
        },
      },
      {
        titleDE: 'Wässrige Aufarbeitung',
        before: 'CH₃-CH(O⁻)-H · MgBr⁺ + H₂O/H⁺',
        after: 'CH₃-CH(OH)-H (Ethanol) + Mg(OH)Br',
        electronFlowDE:
          'Verdünnte Säure (meist NH₄Cl-Lösung) protoniert das Alkoxid — Elektronenpaar am O⁻ nimmt ein Proton auf. Ergebnis: der freie Alkohol.',
        observationDE:
          'Diese Aufarbeitung ist so Standard, dass sie oft in Reaktionsgleichungen einfach als "H₃O⁺" oder gar nicht dazugeschrieben wird. Ohne sie hätte man aber nur das Magnesium-Alkoxid.',
        viz3d: {
          atoms: [
            { element: 'C', position: [-1.5, 0, 0] }, // 0: CH3
            { element: 'C', position: [-0.2, 0, 0] }, // 1: CH
            { element: 'O', position: [0.6, 1.2, 0] }, // 2: O⁻
            { element: 'H', position: [-0.2, -1.0, 0] }, // 3: H am C
            { element: 'O', position: [2.3, 2.3, 0] }, // 4: H2O
            { element: 'H', position: [1.6, 1.9, 0] }, // 5: H (geht ab)
            { element: 'H', position: [3.1, 1.9, 0] },
          ],
          bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 1, to: 2, order: 1 },
            { from: 1, to: 3, order: 1 },
            { from: 4, to: 5, order: 1, style: 'dashed' }, // schwindend
            { from: 4, to: 6, order: 1 },
            { from: 2, to: 5, order: 1, style: 'dashed' }, // werdend
          ],
          arrows: [
            // Lone pair vom Alkoxid → H
            { from: [0.8, 1.4, 0], to: [1.6, 1.9, 0], curvature: 0.3 },
          ],
        },
      },
    ],
    source: 'Grignard, C. R. Acad. Sci. 130, 1322 (1900); Clayden Kap. 9',
  },
  {
    id: 'friedel-crafts',
    nameDE: 'Friedel-Crafts-Alkylierung',
    categoryDE: 'Substitution',
    summaryDE:
      'Elektrophile aromatische Substitution: Aromat + Alkylhalogenid unter Lewis-Säure-Katalyse. Alkyl-Kation greift den Aromaten an.',
    overallReaction: 'C₆H₆ + CH₃-Cl → C₆H₅-CH₃ (Toluol) + HCl (AlCl₃-katalysiert)',
    conditionsDE:
      'AlCl₃ (oder FeCl₃) als Lewis-Säure, kaltes Alkylhalogenid, kein Wasser. Umlagerungen möglich (primäres → sekundäres Carbokation).',
    steps: [
      {
        titleDE: 'Bildung des Elektrophils',
        before: 'CH₃-Cl + AlCl₃',
        after: 'CH₃⁺ · AlCl₄⁻ (Methylkation als Ionenpaar)',
        electronFlowDE:
          'Freies Elektronenpaar am Aluminium (formal an dessen leerem p-Orbital) zieht das Chlor ab; das C-Cl-Bindungselektronenpaar folgt komplett. Zurück bleibt ein Methylkation, das Elektrophil.',
        observationDE:
          'Bei primären Halogeniden entsteht oft KEIN freies Kation, sondern nur ein stark polarisiertes Komplex — dennoch ausreichend elektrophil.',
        viz3d: {
          atoms: [
            { element: 'C', position: [-2.0, 0, 0] }, // 0: CH3
            { element: 'H', position: [-2.7, 0.9, 0] },
            { element: 'H', position: [-2.7, -0.9, 0] },
            { element: 'H', position: [-2.0, 0, 0.9] },
            { element: 'Cl', position: [-0.4, 0, 0] }, // 4: Cl (wird gezogen)
            // AlCl3 rechts (Al mit 3 Cl)
            { element: 'Al', position: [1.4, 0, 0] }, // 5
            { element: 'Cl', position: [2.3, 1.1, 0] },
            { element: 'Cl', position: [2.3, -1.1, 0] },
            { element: 'Cl', position: [1.4, 0, 1.3] },
          ],
          bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 0, to: 2, order: 1 },
            { from: 0, to: 3, order: 1 },
            { from: 0, to: 4, order: 1, style: 'dashed' }, // C-Cl schwindend
            { from: 5, to: 6, order: 1 },
            { from: 5, to: 7, order: 1 },
            { from: 5, to: 8, order: 1 },
            { from: 4, to: 5, order: 1, style: 'dashed' }, // Cl-Al werdend
          ],
          arrows: [
            // C-Cl-Paar → Cl (heterolytisch)
            { from: [-1.4, 0.15, 0], to: [-0.4, 0.3, 0], curvature: 0.3 },
            // Al zieht Cl weg (Elektronenpaar des Cl → Al leeres p)
            { from: [-0.1, 0, 0], to: [1.0, 0, 0], curvature: 0.3 },
          ],
        },
      },
      {
        titleDE: 'Elektrophile aromatische Substitution',
        before: 'C₆H₆ + CH₃⁺',
        after: 'Wheland-Zwischenstufe (σ-Komplex) → C₆H₅-CH₃ + H⁺',
        electronFlowDE:
          'π-Elektronenpaar des Aromaten greift das Methylkation an — zwei π-Elektronen bilden die neue C-C-Bindung. Aromatizität geht temporär verloren (Wheland-Kation, cyclohexadienyl-Kation). Dann wird das Ring-H (das jetzt sp³ ist) durch AlCl₄⁻ abgezogen — Rückbildung des Aromaten, Rückgewinnung des Katalysators als HCl + AlCl₃.',
        observationDE:
          'Alkylgruppen sind aktivierend + ortho/para-dirigierend — Polyalkylierung ist bei Friedel-Crafts ein häufiges Problem. Acylierung (statt Alkylierung) umgeht das, weil die Acylgruppe desaktivierend ist.',
        viz3d: {
          atoms: [
            // Benzol-Ring (6-Eck in xy-Ebene)
            { element: 'C', position: [1.2, 0, 0] }, // 0
            { element: 'C', position: [0.6, 1.04, 0] }, // 1
            { element: 'C', position: [-0.6, 1.04, 0] }, // 2
            { element: 'C', position: [-1.2, 0, 0] }, // 3
            { element: 'C', position: [-0.6, -1.04, 0] }, // 4
            { element: 'C', position: [0.6, -1.04, 0] }, // 5
            { element: 'H', position: [1.2, 1.9, 0] }, // 6: das reagierende H (ortho zu C1)
            { element: 'H', position: [-1.2, 1.9, 0] }, // 7
            { element: 'H', position: [-2.15, 0, 0] }, // 8
            { element: 'H', position: [-1.2, -1.9, 0] }, // 9
            { element: 'H', position: [1.2, -1.9, 0] }, // 10
            // Methyl-Kation kommt von rechts an C1
            { element: 'C', position: [2.7, 0, 0] }, // 11: CH3⁺
            { element: 'H', position: [3.4, 0.9, 0] },
            { element: 'H', position: [3.4, -0.9, 0] },
            { element: 'H', position: [2.7, 0, 0.9] },
          ],
          bonds: [
            // Benzol: alternierende Doppelbindungen (Kekulé)
            { from: 0, to: 1, order: 2 },
            { from: 1, to: 2, order: 1 },
            { from: 2, to: 3, order: 2 },
            { from: 3, to: 4, order: 1 },
            { from: 4, to: 5, order: 2 },
            { from: 5, to: 0, order: 1 },
            { from: 0, to: 6, order: 1 },
            { from: 2, to: 7, order: 1 },
            { from: 3, to: 8, order: 1 },
            { from: 4, to: 9, order: 1 },
            { from: 5, to: 10, order: 1 },
            { from: 11, to: 12, order: 1 },
            { from: 11, to: 13, order: 1 },
            { from: 11, to: 14, order: 1 },
            { from: 0, to: 11, order: 1, style: 'dashed' }, // werdende C-C
          ],
          arrows: [
            // π-Elektronen des Rings → Methyl-C⁺
            { from: [0.9, 0.5, 0], to: [2.4, 0.2, 0], curvature: 0.4 },
          ],
        },
      },
    ],
    source: 'Friedel & Crafts, Compt. Rend. 84, 1450 (1877); Clayden Kap. 22',
  },
  {
    id: 'wittig',
    nameDE: 'Wittig-Reaktion',
    categoryDE: 'Kondensation',
    summaryDE:
      'Phosphor-Ylid greift Aldehyd/Keton an. Über Oxaphosphetan-Ring entsteht ein Alken + Ph₃P=O — stereoselektiv.',
    overallReaction: 'Ph₃P=CH₂ + R₂C=O → R₂C=CH₂ + Ph₃P=O',
    conditionsDE:
      'THF oder Ether als Lösemittel, tiefe Temperatur bei stabilisierten Yliden (Z-Selektivität), höhere Temperatur bei nicht-stabilisierten (E-Selektivität nach Schlosser).',
    steps: [
      {
        titleDE: 'Angriff des Ylids auf die Carbonyl-Gruppe',
        before: 'Ph₃P=CH₂ + H-CHO',
        after: 'Betain (Ph₃P⁺-CH₂-CH(O⁻)-H)',
        electronFlowDE:
          'Das Carbanion-artige C des Ylids (⁻CH₂-PPh₃⁺, Yliden-Form) hat ein freies Elektronenpaar. Dieses greift den elektrophilen Carbonyl-C an. π-Elektronen der C=O wandern zum O — es entsteht ein zwitterionisches Betain mit P⁺ und O⁻ an gegenüberliegenden Enden.',
        observationDE:
          'Der Ylid-Kohlenstoff ist ein starkes Nucleophil, weil das benachbarte Phosphor das negative Elektronenpaar durch d-Orbital-Beteiligung stabilisiert.',
        viz3d: {
          atoms: [
            { element: 'P', position: [-2.5, 0.8, 0] }, // 0: Ph3P⁺
            { element: 'C', position: [-3.5, -0.4, 0] }, { element: 'C', position: [-3.5, 1.9, 0] }, { element: 'C', position: [-2.5, 0.8, 1.3] }, // 3 Phenyl-Andeutungen
            { element: 'C', position: [-1.2, 0.0, 0] }, // 4: Ylid-C (Carbanion)
            { element: 'H', position: [-1.4, -1.0, 0] },
            { element: 'H', position: [-1.4, 0.0, 0.9] },
            // Formaldehyd rechts
            { element: 'C', position: [0.8, 0.0, 0] }, // 7: Carbonyl-C
            { element: 'O', position: [0.8, 1.3, 0] }, // 8: =O
            { element: 'H', position: [1.7, -0.4, 0] },
            { element: 'H', position: [-0.1, -0.4, 0] },
          ],
          bonds: [
            { from: 0, to: 1, order: 1 },
            { from: 0, to: 2, order: 1 },
            { from: 0, to: 3, order: 1 },
            { from: 0, to: 4, order: 1 }, // P-C (Yliden-Doppelbindungscharakter)
            { from: 4, to: 5, order: 1 },
            { from: 4, to: 6, order: 1 },
            { from: 7, to: 8, order: 2 }, // C=O
            { from: 7, to: 9, order: 1 },
            { from: 7, to: 10, order: 1 },
            { from: 4, to: 7, order: 1, style: 'dashed' }, // neue C-C werdend
          ],
          arrows: [
            // Freies Elektronenpaar am Ylid-C → Carbonyl-C
            { from: [-0.9, 0.15, 0], to: [0.6, 0.0, 0], curvature: 0.35 },
            // π-Elektronen der C=O → O
            { from: [0.8, 0.7, 0], to: [0.8, 1.3, 0], curvature: 0.3 },
          ],
        },
      },
      {
        titleDE: 'Oxaphosphetan-Ring und Zerfall',
        before: 'Betain',
        after: 'Oxaphosphetan-Ring → Alken + Ph₃P=O',
        electronFlowDE:
          'Das O⁻ dreht sich zum P⁺ und schließt einen 4-gliedrigen Oxaphosphetan-Ring. Dann fällt der Ring in einem konzertierten Schritt in zwei Fragmente auseinander: das O bekommt eine neue σ-Bindung zum P (→ P=O), der C bekommt eine neue π-Bindung zum anderen C (→ C=C). Zwei Bindungen brechen simultan, zwei entstehen — perfekte Elektronen-Buchhaltung.',
        observationDE:
          'Die extrem starke P=O-Bindung (~544 kJ/mol) ist die eigentliche Triebkraft der Wittig-Reaktion. Ph₃P=O ist ein sehr stabiles Nebenprodukt.',
        viz3d: {
          atoms: [
            // Oxaphosphetan-Ring: 4 Atome (P-C-C-O), 90°-Winkel
            { element: 'P', position: [-0.9, 0.9, 0] }, // 0
            { element: 'C', position: [0.9, 0.9, 0] }, // 1
            { element: 'C', position: [0.9, -0.9, 0] }, // 2
            { element: 'O', position: [-0.9, -0.9, 0] }, // 3
            // 3 Phenyl-Andeutungen am P
            { element: 'C', position: [-2.4, 1.6, 0] },
            { element: 'C', position: [-1.5, 2.4, 0] },
            { element: 'C', position: [-2.0, 0.5, 1.2] },
            // H am C1
            { element: 'H', position: [1.6, 1.8, 0] },
            { element: 'H', position: [1.6, 1.8, -0.5] },
            // H/R am C2
            { element: 'H', position: [1.6, -1.8, 0] },
            { element: 'H', position: [1.6, -1.8, -0.5] },
          ],
          bonds: [
            // Ring — 2 zerbrechen, 2 bleiben:
            { from: 0, to: 1, order: 1 }, // bleibt (wird Teil von P=O? nein, C bricht ab)
            { from: 1, to: 2, order: 1, style: 'dashed' }, // wird C=C
            { from: 2, to: 3, order: 1 }, // bleibt
            { from: 3, to: 0, order: 1, style: 'dashed' }, // wird P=O
            { from: 0, to: 4, order: 1 },
            { from: 0, to: 5, order: 1 },
            { from: 0, to: 6, order: 1 },
            { from: 1, to: 7, order: 1 },
            { from: 1, to: 8, order: 1 },
            { from: 2, to: 9, order: 1 },
            { from: 2, to: 10, order: 1 },
          ],
          arrows: [
            // C1-C2 σ → π (wird C=C)
            { from: [0.9, 0.3, 0], to: [0.9, -0.3, 0], curvature: 0.3 },
            // P-O σ → π (wird P=O)
            { from: [-0.9, 0.3, 0], to: [-0.9, -0.3, 0], curvature: 0.3 },
            // C1-P σ bricht (Elektronen zum C)
            { from: [-0.3, 0.9, 0], to: [0.9, 0.9, 0], curvature: 0.3 },
            // C2-O σ bricht (Elektronen zum O)
            { from: [0.3, -0.9, 0], to: [-0.9, -0.9, 0], curvature: 0.3 },
          ],
        },
      },
    ],
    source: 'Wittig & Geissler, Liebigs Ann. Chem. 580, 44 (1953); Nobelpreis 1979',
  },
];

/** Alle Kategorien in fester Reihenfolge — für die UI-Sortierung. */
export const MECHANISM_CATEGORIES: Array<Mechanism['categoryDE']> = [
  'Substitution',
  'Addition',
  'Eliminierung',
  'Kondensation',
  'Umlagerung',
  'Radikalreaktion',
  'Redox',
];

export function getMechanism(id: string): Mechanism | undefined {
  return MECHANISMS.find((m) => m.id === id);
}
