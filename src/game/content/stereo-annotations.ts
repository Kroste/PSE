/**
 * Stereo-/Isomerie-Annotationen für Katalog-Moleküle, die kein
 * eigenes `stereoNoteDE` im JSON haben. Wird beim Content-Load in
 * `molecules` reinfusioniert.
 *
 * Ziel: den Chemie-Lernenden hinweisen, wo Stereochemie eine Rolle
 * spielt — ohne dass wir für jede Aminosäure/Zucker/Alken die JSON-
 * Dateien einzeln umbauen müssen.
 */
export const STEREO_NOTES: Record<string, string> = {
  // Natürliche Aminosäuren — alle L-Konfiguration (außer Glycin, ohne
  // Stereozentrum). Der α-C ist S-konfiguriert (Cystein Ausnahme wegen
  // CIP-Prioritäten des Schwefels: dort R).
  alanin: 'Chirales α-C-Atom, S-Konfiguration (L-Alanin). Alle proteinogenen Aminosäuren außer Cystein sind L=S.',
  serin: 'Chirales α-C-Atom, S-Konfiguration (L-Serin).',
  valin: 'Chirales α-C-Atom, S-Konfiguration (L-Valin).',
  leucin: 'Chirales α-C-Atom, S-Konfiguration (L-Leucin).',
  phenylalanin: 'Chirales α-C-Atom, S-Konfiguration (L-Phenylalanin).',
  cystein: 'Chirales α-C-Atom, R-Konfiguration (L-Cystein — Ausnahme wegen CIP-Priorität des Schwefels).',

  // Zucker — mehrere Stereozentren, α/β-Anomere
  glukose:
    'α-D-Glukose: 5 Stereozentren. C-1 α-Konfiguration (OH axial), C-2/3/4/5 D-Reihe (OH an C-5 rechts in Fischer-Projektion). β-Anomer ist gleich häufig; α↔β-Mutarotation in Lösung.',
  ribose:
    'β-D-Ribose: 4 Stereozentren. Baustein von RNA (2\'-OH vorhanden — Unterschied zu Desoxyribose in DNA).',
  fructose:
    'D-Fructose (Fruchtzucker): 3 Stereozentren, Ketohexose. Süßester natürlicher Zucker (~1,7x Saccharose).',

  // DNA-Basen — planar, keine Stereo, aber Tautomerie-Note
  adenin: 'Aromatisches Purin-System, planar. Keto-/Enol-Tautomerie prinzipiell möglich, aber Amino-Form dominiert stark.',

  // Alkene mit E/Z-Möglichkeit
  'C2H4': 'Ethen: symmetrische Doppelbindung, keine E/Z-Isomerie (beide C tragen 2 H). Erst ab 2-Buten wird cis/trans relevant.',

  // Naturkautschuk — cis-Verknüpfung ist entscheidend
  'naturkautschuk-fragment':
    'cis-1,4-Polyisopren — alle Doppelbindungen Z-konfiguriert. Trans-Isomer (Guttapercha) ist hart und spröde statt elastisch.',
};
