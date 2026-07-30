/**
 * Kinetik-/Gleichgewichts-Overlays für Katalog-Rezepte. Wird beim
 * Content-Load in `recipes` reinfusioniert (analog zu Stereo- und
 * Spektroskopie-Annotationen). Rezept-JSON bleibt schlank.
 *
 * Für reversible Reaktionen generiert der Loader zusätzlich das
 * Rückreaktions-Rezept automatisch — im Chemielabor lassen sich beide
 * Richtungen dann durchspielen, was Le Chatelier greifbar macht.
 *
 * Literaturwerte für Aktivierungsenergien und Gleichgewichtskonstanten:
 * Atkins Physikalische Chemie, CRC Handbook, NIST-Thermodynamik.
 */

export type KineticsData = {
  reversible?: boolean;
  activationEnergyKJmol?: number;
  equilibriumConstantLog?: number;
};

export const KINETICS: Record<string, KineticsData> = {
  // Haber-Bosch-Synthese: N₂ + 3 H₂ ⇌ 2 NH₃.
  // Klassisches Gleichgewicht mit hoher Ea, industriell bei 400-500 °C
  // und 200-300 bar mit Fe-Katalysator gefahren.
  'synth-ammonia': {
    reversible: true,
    activationEnergyKJmol: 335,
    equilibriumConstantLog: -5.75, // bei 400 °C — Vorwärtsrichtung ungünstig
  },

  // Ethanol per Hydratisierung von Ethen: C₂H₄ + H₂O ⇌ C₂H₅OH.
  // Reversibel, Ea via H₃PO₄-Katalyse gesenkt. K > 1 → Produkt bevorzugt.
  'synth-ethanol': {
    reversible: true,
    activationEnergyKJmol: 89,
    equilibriumConstantLog: 1.2,
  },

  // Wasser aus H₂ und O₂ — Knallgas-Reaktion, extrem exotherm.
  // Reversibel im Prinzip (Elektrolyse), aber Ea sehr hoch (~185 kJ/mol
  // ohne Katalysator, mit Pt-Katalysator viel niedriger).
  'synth-water': {
    reversible: true,
    activationEnergyKJmol: 185,
    equilibriumConstantLog: 41, // stark produktseitig
  },

  // Methan-Synthese (Sabatier-Prozess): CO₂ + 4 H₂ → CH₄ + 2 H₂O.
  // Bei uns direkt als synth-methane. Reversibel, aber Vorwärts bevorzugt.
  'synth-methane': {
    reversible: true,
    activationEnergyKJmol: 105,
    equilibriumConstantLog: 20,
  },
};
