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
      },
      {
        titleDE: 'Nucleophiler Angriff',
        before: '(CH₃)₃C⁺    +    H₂O:',
        after: '(CH₃)₃C—OH₂⁺',
        electronFlowDE:
          'Freies Elektronenpaar am Sauerstoff des Wassers greift das leere p-Orbital des Carbokations an. Kann von beiden Seiten passieren — daher Racemisierung.',
      },
      {
        titleDE: 'Deprotonierung',
        before: '(CH₃)₃C—OH₂⁺',
        after: '(CH₃)₃C—OH    +    H⁺',
        electronFlowDE:
          'Ein Wassermolekül im Lösemittel nimmt ein Proton vom Oxonium ab. Elektronenpaar der O-H-Bindung geht an O zurück.',
        observationDE: 'Aus dem H⁺ + Br⁻ wird HBr — das ist das Nebenprodukt.',
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
      },
      {
        titleDE: 'Angriff des Bromids',
        before: 'H₃C—CH₂⁺    +    Br⁻',
        after: 'H₃C—CH₂—Br',
        electronFlowDE:
          'Ein Elektronenpaar des Bromids füllt das leere p-Orbital des Carbokations. Neue C-Br-Bindung, Produkt Ethylbromid.',
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
      },
      {
        titleDE: 'Angriff des Alkohols',
        before: 'CH₃-C(=OH⁺)-OH    +    HO-CH₂CH₃',
        after: 'CH₃-C(-OH)(-OCH₂CH₃H⁺)-OH (tetraedrisch)',
        electronFlowDE:
          'Freies Elektronenpaar am O des Ethanols greift den elektrophilen C an. Die C=O-Doppelbindung wird zur C-O-Einfachbindung — π-Elektronen wandern zum O.',
      },
      {
        titleDE: 'Protonen-Wanderung und Wasserabspaltung',
        before: 'Tetraeder-Intermediat',
        after: 'CH₃-C(=OH⁺)-OCH₂CH₃    +    H₂O',
        electronFlowDE:
          'Proton wandert vom Ethoxy-O zur OH-Gruppe (macht sie zu -OH₂⁺). Elektronenpaar der C-OH₂⁺-Bindung wandert zum O — Wasser tritt aus.',
        observationDE: 'Das ausgetretene Wasser ist die "Abgangsgruppe" dieser Kondensation.',
      },
      {
        titleDE: 'Deprotonierung zum Ester',
        before: 'CH₃-C(=OH⁺)-OCH₂CH₃',
        after: 'CH₃-C(=O)-OCH₂CH₃    +    H⁺',
        electronFlowDE:
          'Ein Wassermolekül nimmt das überschüssige Proton am Carbonyl-Sauerstoff wieder ab. Katalysator ist regeneriert.',
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
      },
      {
        titleDE: 'Nucleophiler Angriff des Enolats',
        before: '⁻CH₂-CHO    +    CH₃-CHO',
        after: 'CH₃-CH(O⁻)-CH₂-CHO (Aldol)',
        electronFlowDE:
          'Enolat-Kohlenstoff greift Carbonyl-C des zweiten Aldehyds an. Neue C-C-Bindung. π-Elektronen der neuen C=O-Bindung wandern zum O — es entsteht ein Alkoxid.',
      },
      {
        titleDE: 'Protonierung zum β-Hydroxyaldehyd',
        before: 'CH₃-CH(O⁻)-CH₂-CHO    +    H₂O',
        after: 'CH₃-CH(OH)-CH₂-CHO (Aldol)    +    OH⁻',
        electronFlowDE:
          'Alkoxid deprotoniert ein Wassermolekül. Base regeneriert.',
      },
      {
        titleDE: 'Dehydratisierung zum Enal',
        before: 'CH₃-CH(OH)-CH₂-CHO',
        after: 'CH₃-CH=CH-CHO    +    H₂O',
        electronFlowDE:
          'E1cb: α-Proton wird abgezogen, das entstehende Carbanion wirft dann OH⁻ aus. Ergebnis: konjugiertes α,β-ungesättigtes Carbonyl (Enal).',
        observationDE: 'Erst bei Erwärmung — die reine Aldol-Addition (Schritt 3) ist auch isolierbar.',
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
      },
      {
        titleDE: 'Nucleophiler Angriff der Amino-Gruppe',
        before: 'H₂N-CHR²-COOH + aktivierter Carbonyl-C',
        after: 'Tetrahedral-Intermediat (C-OH, C-NHR²)',
        electronFlowDE:
          'Freies Elektronenpaar am Amin-N greift den aktivierten Carbonyl-C an. π-Elektronen der C=O wandern zum O. Neue C-N-Bindung.',
      },
      {
        titleDE: 'Abspaltung + Peptidbindung',
        before: 'Tetrahedral-Intermediat',
        after: 'H₂N-CHR¹-CO-NH-CHR²-COOH + H₂O (oder tRNA)',
        electronFlowDE:
          'Elektronenpaar der C-O-Bindung wandert zum abgehenden O (Hydroxyl bzw. tRNA-Ester). Neue C=O rebildet sich. Peptidbindung ist planar (partieller Doppelbindungscharakter durch N-Lone-Pair).',
        observationDE:
          'Die Peptidbindung ist wegen Resonanz planar und nur eingeschränkt drehbar — Grundlage der Sekundärstruktur (α-Helix, β-Faltblatt).',
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
      },
      {
        titleDE: 'Kettenstart',
        before: 'R-O·    +    H₂C=CH₂',
        after: 'R-O-CH₂-CH₂·',
        electronFlowDE:
          'Radikal-Elektron und ein π-Elektron der C=C-Doppelbindung bilden eine neue σ-Bindung. Das andere π-Elektron bleibt als ungepaartes Elektron am zweiten C — neues Kohlenstoff-Radikal.',
      },
      {
        titleDE: 'Kettenwachstum (Propagation)',
        before: 'R-O-CH₂-CH₂·    +    H₂C=CH₂',
        after: 'R-O-CH₂-CH₂-CH₂-CH₂·',
        electronFlowDE:
          'Selber Mechanismus wie beim Kettenstart — nur immer wieder. Jeder Schritt hängt zwei -CH₂- ans Kettenende. In Massenkunststoffen tausendfach.',
        observationDE:
          'Bei PE tausende Wiederholungen. Bei Vinylchlorid, Styrol, Acrylnitril genauso — nur mit anderer Doppelbindung.',
      },
      {
        titleDE: 'Terminierung (Rekombination)',
        before: '~CH₂-CH₂·    +    ·CH₂-CH₂~',
        after: '~CH₂-CH₂-CH₂-CH₂~',
        electronFlowDE:
          'Zwei Radikal-Enden treffen sich, ihre ungepaarten Elektronen bilden eine neue C-C-Bindung. Kette ist tot.',
        observationDE: 'Alternative: Disproportionierung — ein Radikal überträgt sein β-H auf das andere, es entstehen ein Alken und ein Alkan.',
      },
    ],
    source: 'Odian — Principles of Polymerization (4th ed., Ch. 3)',
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
