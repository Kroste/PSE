import type { Spectra } from './types';

/**
 * Kuratierte Spektroskopie-Datenbank für Katalog-Moleküle.
 * Werden zur Content-Ladezeit in die entsprechenden Moleküle gemergt
 * (analog zu Stereo-Annotationen, damit die JSON-Dateien schlank bleiben).
 *
 * Quellen: NIST Chemistry WebBook, SDBS (Spectral Database for Organic
 * Compounds, AIST), Silverstein/Webster/Kiemle Standardwerk.
 * Alle NMR-Werte in CDCl₃ (außer wo anders vermerkt), TMS = 0 ppm.
 */
export const SPECTRA: Record<string, Spectra> = {
  H2O: {
    ir: [
      { wavenumber: 3400, intensity: 'strong', assignmentDE: 'ν(O-H) — breite Bande von H-Brücken' },
      { wavenumber: 1640, intensity: 'medium', assignmentDE: 'δ(H-O-H) — Deformationsschwingung' },
    ],
    nmr1h: [{ shift: 4.79, nProtons: 2, multiplicity: 's', assignmentDE: 'H₂O (in D₂O gegen HDO)' }],
    source: 'NIST WebBook + Silverstein',
  },

  CH3OH: {
    ir: [
      { wavenumber: 3300, intensity: 'strong', assignmentDE: 'ν(O-H) breit — assoziiert' },
      { wavenumber: 2946, intensity: 'medium', assignmentDE: 'ν(C-H) methyl' },
      { wavenumber: 1035, intensity: 'strong', assignmentDE: 'ν(C-O) primär' },
    ],
    nmr1h: [
      { shift: 3.49, nProtons: 3, multiplicity: 's', assignmentDE: 'CH₃-O' },
      { shift: 2.16, nProtons: 1, multiplicity: 'br', assignmentDE: '-O-H (austauschbar)' },
    ],
    source: 'SDBS AIST',
  },

  C2H5OH: {
    ir: [
      { wavenumber: 3340, intensity: 'strong', assignmentDE: 'ν(O-H) breit' },
      { wavenumber: 2974, intensity: 'medium', assignmentDE: 'ν(C-H) asymmetrisch' },
      { wavenumber: 1050, intensity: 'strong', assignmentDE: 'ν(C-O) primär' },
    ],
    nmr1h: [
      { shift: 3.72, nProtons: 2, multiplicity: 'q', assignmentDE: '-O-CH₂- Quartett (J ≈ 7 Hz)' },
      { shift: 2.61, nProtons: 1, multiplicity: 'br', assignmentDE: '-O-H (austauschbar)' },
      { shift: 1.25, nProtons: 3, multiplicity: 't', assignmentDE: 'CH₃- Triplett (J ≈ 7 Hz)' },
    ],
    source: 'SDBS AIST',
  },

  C3H6O: {
    // Aceton
    ir: [
      { wavenumber: 1715, intensity: 'strong', assignmentDE: 'ν(C=O) — Keton' },
      { wavenumber: 1360, intensity: 'medium', assignmentDE: 'δ(CH₃)' },
    ],
    nmr1h: [{ shift: 2.17, nProtons: 6, multiplicity: 's', assignmentDE: '2× CH₃ (equivalent)' }],
    uvVis: [{ lambdaMax: 279, epsilon: 15, assignmentDE: 'n → π* schwach (Keton)' }],
    source: 'NIST WebBook',
  },

  CH3COOH: {
    ir: [
      { wavenumber: 3000, intensity: 'strong', assignmentDE: 'ν(O-H) sehr breit — dimerisiert' },
      { wavenumber: 1712, intensity: 'strong', assignmentDE: 'ν(C=O) Carbonsäure' },
      { wavenumber: 1290, intensity: 'strong', assignmentDE: 'ν(C-O)' },
    ],
    nmr1h: [
      { shift: 11.65, nProtons: 1, multiplicity: 'br', assignmentDE: '-COOH sehr entschirmt' },
      { shift: 2.10, nProtons: 3, multiplicity: 's', assignmentDE: 'CH₃-' },
    ],
    source: 'SDBS AIST',
  },

  C6H6: {
    // Benzol
    ir: [
      { wavenumber: 3030, intensity: 'medium', assignmentDE: 'ν(=C-H) aromatisch' },
      { wavenumber: 1478, intensity: 'medium', assignmentDE: 'ν(C=C) Ring' },
      { wavenumber: 675, intensity: 'strong', assignmentDE: 'δ(C-H) out-of-plane' },
    ],
    nmr1h: [{ shift: 7.36, nProtons: 6, multiplicity: 's', assignmentDE: 'aromatische H (alle equivalent)' }],
    uvVis: [
      { lambdaMax: 255, epsilon: 220, assignmentDE: 'π → π* (verboten, "B-Bande")' },
      { lambdaMax: 204, epsilon: 8700, assignmentDE: 'π → π* ("K-Bande")' },
    ],
    source: 'Silverstein Kap. 3 + NIST',
  },

  CH2O: {
    // Formaldehyd
    ir: [
      { wavenumber: 2782, intensity: 'medium', assignmentDE: 'ν(C-H) Aldehyd — Doublette' },
      { wavenumber: 1746, intensity: 'strong', assignmentDE: 'ν(C=O) Aldehyd' },
    ],
    nmr1h: [{ shift: 9.6, nProtons: 2, multiplicity: 's', assignmentDE: '-CHO (in D₂O als Methylenglykol)' }],
    uvVis: [{ lambdaMax: 293, epsilon: 12, assignmentDE: 'n → π* Carbonyl' }],
    source: 'NIST WebBook',
  },

  NH3: {
    ir: [
      { wavenumber: 3336, intensity: 'medium', assignmentDE: 'ν(N-H) asymmetrisch' },
      { wavenumber: 1626, intensity: 'medium', assignmentDE: 'δ(H-N-H)' },
    ],
    nmr1h: [{ shift: 0.7, nProtons: 3, multiplicity: 'br', assignmentDE: 'NH₃ (in CDCl₃, austauschbar)' }],
    source: 'NIST WebBook',
  },

  CO2: {
    ir: [
      { wavenumber: 2349, intensity: 'strong', assignmentDE: 'ν(C=O) asymmetrisch' },
      { wavenumber: 667, intensity: 'medium', assignmentDE: 'δ(O=C=O) — knickt Molekül' },
    ],
    // Kein NMR-aktives Proton; UV nur weit im Vakuum-UV.
    source: 'NIST WebBook',
  },

  // Silikone — direkt relevant für Master-Thesis
  SiMe4: {
    // Tetramethylsilan (der NMR-Standard!)
    ir: [
      { wavenumber: 2955, intensity: 'medium', assignmentDE: 'ν(C-H) methyl' },
      { wavenumber: 1250, intensity: 'strong', assignmentDE: 'δ(Si-CH₃) symmetrisch' },
      { wavenumber: 856, intensity: 'strong', assignmentDE: 'ρ(Si-C)' },
    ],
    nmr1h: [{ shift: 0.0, nProtons: 12, multiplicity: 's', assignmentDE: 'TMS — Referenz-Signal (definiert 0 ppm!)' }],
    source: 'Silverstein — TMS als ¹H-NMR-Referenz',
  },

  HMDSO: {
    // Hexamethyldisiloxan Me3Si-O-SiMe3
    ir: [
      { wavenumber: 1250, intensity: 'strong', assignmentDE: 'δ(Si-CH₃)' },
      { wavenumber: 1055, intensity: 'strong', assignmentDE: 'ν(Si-O-Si) asymmetrisch — charakteristisch!' },
      { wavenumber: 840, intensity: 'strong', assignmentDE: 'ρ(Si-C)' },
    ],
    nmr1h: [{ shift: 0.06, nProtons: 18, multiplicity: 's', assignmentDE: '2× Si(CH₃)₃ (equivalent)' }],
    source: 'SDBS AIST + Silverstein Silicon-Kapitel',
  },

  D4: {
    // Octamethylcyclotetrasiloxan
    ir: [
      { wavenumber: 1259, intensity: 'strong', assignmentDE: 'δ(Si-CH₃) symmetrisch' },
      { wavenumber: 1080, intensity: 'strong', assignmentDE: 'ν(Si-O-Si) — cyclischer Ring, breit' },
      { wavenumber: 795, intensity: 'medium', assignmentDE: 'ρ(Si-CH₃)' },
    ],
    nmr1h: [{ shift: 0.09, nProtons: 24, multiplicity: 's', assignmentDE: '4× Si(CH₃)₂ Ring — alle equivalent' }],
    source: 'SDBS AIST',
  },

  TEOS: {
    // Tetraethyl-Orthosilicat Si(OEt)4
    ir: [
      { wavenumber: 1080, intensity: 'strong', assignmentDE: 'ν(Si-O-C)' },
      { wavenumber: 790, intensity: 'medium', assignmentDE: 'ν(Si-O)' },
    ],
    nmr1h: [
      { shift: 3.84, nProtons: 8, multiplicity: 'q', assignmentDE: '-O-CH₂-CH₃ Quartett (J ≈ 7 Hz)' },
      { shift: 1.22, nProtons: 12, multiplicity: 't', assignmentDE: '-O-CH₂-CH₃ Triplett' },
    ],
    source: 'SDBS AIST + Ullmann Silikone',
  },
};
