import { describe, expect, it } from 'vitest';
import { matchRecipe, multisetEquals, recipesForReactor } from '../src/game/physics/recipes';

describe('recipe engine', () => {
  describe('multisetEquals', () => {
    it('true für gleiche Multisets', () => {
      expect(multisetEquals({ u: 2, d: 1 }, { d: 1, u: 2 })).toBe(true);
    });
    it('false bei unterschiedlichen Counts', () => {
      expect(multisetEquals({ u: 2 }, { u: 1 })).toBe(false);
    });
    it('false bei zusätzlichen Zutaten', () => {
      expect(multisetEquals({ u: 2, d: 1 }, { u: 2, d: 1, g: 3 })).toBe(false);
    });
    it('ignoriert Nullen (implizit über positive Werte)', () => {
      expect(multisetEquals({ u: 2, d: 1 }, { u: 2, d: 1 })).toBe(true);
    });
  });

  describe('matchRecipe', () => {
    it('matched Proton-Rezept bei genau uud+3g in der Werkbank', () => {
      const recipe = matchRecipe({ u: 2, d: 1, g: 3 }, 'workbench');
      expect(recipe?.id).toBe('assemble-proton');
    });

    it('matched Neutron-Rezept bei udd+3g in der Werkbank', () => {
      const recipe = matchRecipe({ u: 1, d: 2, g: 3 }, 'workbench');
      expect(recipe?.id).toBe('assemble-neutron');
    });

    it('matched Wasserstoff-Rezept bei p+e-', () => {
      const recipe = matchRecipe({ proton: 1, 'e-': 1 }, 'workbench');
      expect(recipe?.id).toBe('assemble-hydrogen');
    });

    it('null bei falschem Multiset (fehlende Gluonen)', () => {
      expect(matchRecipe({ u: 2, d: 1 }, 'workbench')).toBeNull();
    });

    it('null bei falschem Multiset (zusätzliche Zutat)', () => {
      expect(matchRecipe({ u: 2, d: 1, g: 3, gamma: 1 }, 'workbench')).toBeNull();
    });

    it('null wenn Rezept im aktiven Reaktor nicht erlaubt', () => {
      expect(matchRecipe({ u: 2, d: 1, g: 3 }, 'stellar-core')).toBeNull();
    });

    it('null bei leerer Zone', () => {
      expect(matchRecipe({}, 'workbench')).toBeNull();
    });

    it('ignoriert Einträge mit count=0', () => {
      const recipe = matchRecipe({ u: 2, d: 1, g: 3, gamma: 0 }, 'workbench');
      expect(recipe?.id).toBe('assemble-proton');
    });
  });

  describe('recipesForReactor', () => {
    it('Werkbank im Normalmodus: Grundmontage + simple-Rezepte', () => {
      const workbench = recipesForReactor('workbench', false);
      const ids = workbench.map((r) => r.id);
      expect(ids).toEqual(
        expect.arrayContaining([
          'assemble-proton',
          'assemble-neutron',
          'assemble-hydrogen',
          'simple-helium',
          'simple-iron',
        ]),
      );
      expect(ids).not.toContain('assemble-helium-4');
      expect(ids).not.toContain('assemble-iron-56');
    });

    it('Werkbank im Expertenmodus: Grundmontage + Kern-basierte Rezepte, keine simple-*', () => {
      const workbench = recipesForReactor('workbench', true);
      const ids = workbench.map((r) => r.id);
      expect(ids).toEqual(
        expect.arrayContaining([
          'assemble-proton',
          'assemble-neutron',
          'assemble-hydrogen',
          'assemble-helium-4',
          'assemble-iron-56',
        ]),
      );
      expect(ids).not.toContain('simple-helium');
    });

    it('Sternkern im Expertenmodus: pp-Kette und Alpha-Prozess', () => {
      const stellar = recipesForReactor('stellar-core', true);
      const ids = stellar.map((r) => r.id);
      expect(ids).toEqual(
        expect.arrayContaining([
          'pp-fusion',
          'pp-deuteron-capture',
          'pp-i-closing',
          'triple-alpha',
          'c12-alpha-capture',
          'silicon-burning',
          'ni56-double-beta-plus',
        ]),
      );
    });

    it('Sternkern im Normalmodus: leer (alle Sternkern-Rezepte sind expert)', () => {
      expect(recipesForReactor('stellar-core', false)).toEqual([]);
    });

    it('leer für noch nicht bespielte Reaktoren', () => {
      expect(recipesForReactor('supernova')).toEqual([]);
    });
  });

  describe('pp-Kette am Sternkern', () => {
    it('pp-fusion: 2 Protonen → Deuteron + Positron', () => {
      const r = matchRecipe({ proton: 2 }, 'stellar-core', true);
      expect(r?.id).toBe('pp-fusion');
      expect(r?.outputs).toEqual({ deuteron: 1, 'e+': 1 });
    });

    it('pp-deuteron-capture: Deuteron + Proton → Helion + γ', () => {
      const r = matchRecipe({ deuteron: 1, proton: 1 }, 'stellar-core', true);
      expect(r?.id).toBe('pp-deuteron-capture');
      expect(r?.outputs).toEqual({ helion: 1, gamma: 1 });
    });

    it('pp-i-closing: 2 Helion → Alpha + 2 Protonen', () => {
      const r = matchRecipe({ helion: 2 }, 'stellar-core', true);
      expect(r?.id).toBe('pp-i-closing');
      expect(r?.outputs).toEqual({ alpha: 1, proton: 2 });
    });

    it('pp-Kette-Rezepte laufen NICHT an der Werkbank', () => {
      expect(matchRecipe({ proton: 2 }, 'workbench')).toBeNull();
      expect(matchRecipe({ helion: 2 }, 'workbench')).toBeNull();
    });
  });

  describe('Alpha-Prozess bis Eisen', () => {
    it('Triple-Alpha: 3α → ¹²C + γ', () => {
      const r = matchRecipe({ alpha: 3 }, 'stellar-core', true);
      expect(r?.id).toBe('triple-alpha');
      expect(r?.outputs).toEqual({ c12: 1, gamma: 1 });
    });

    it('α-Kette C→O→Ne→Mg→Si findet jeweils genau ein Rezept', () => {
      const steps: Array<[string, string]> = [
        ['c12', 'o16'],
        ['o16', 'ne20'],
        ['ne20', 'mg24'],
        ['mg24', 'si28'],
      ];
      for (const [from, to] of steps) {
        const r = matchRecipe({ [from]: 1, alpha: 1 }, 'stellar-core', true);
        expect(r, `${from}+α`).not.toBeNull();
        expect(r!.outputs).toEqual({ [to]: 1, gamma: 1 });
      }
    });

    it('Silizium-Verbrennung: 2·²⁸Si → ⁵⁶Ni + γ', () => {
      const r = matchRecipe({ si28: 2 }, 'stellar-core', true);
      expect(r?.id).toBe('silicon-burning');
      expect(r?.outputs).toEqual({ ni56: 1, gamma: 1 });
    });

    it('β⁺-Zerfall ⁵⁶Ni → ⁵⁶Fe + 2e⁺', () => {
      const r = matchRecipe({ ni56: 1 }, 'stellar-core', true);
      expect(r?.id).toBe('ni56-double-beta-plus');
      expect(r?.outputs).toEqual({ fe56: 1, 'e+': 2 });
    });
  });

  describe('CNO-Zyklus', () => {
    const steps: Array<{ inputs: Record<string, number>; id: string; outputs: Record<string, number> }> = [
      { inputs: { c12: 1, proton: 1 }, id: 'cno-1-c12-p', outputs: { n13: 1, gamma: 1 } },
      { inputs: { n13: 1 }, id: 'cno-2-n13-decay', outputs: { c13: 1, 'e+': 1 } },
      { inputs: { c13: 1, proton: 1 }, id: 'cno-3-c13-p', outputs: { n14: 1, gamma: 1 } },
      { inputs: { n14: 1, proton: 1 }, id: 'cno-4-n14-p', outputs: { o15: 1, gamma: 1 } },
      { inputs: { o15: 1 }, id: 'cno-5-o15-decay', outputs: { n15: 1, 'e+': 1 } },
      { inputs: { n15: 1, proton: 1 }, id: 'cno-6-n15-p', outputs: { c12: 1, alpha: 1 } },
    ];

    it.each(steps)('matcht $id im Sternkern (Expertenmodus)', ({ inputs, id, outputs }) => {
      const r = matchRecipe(inputs, 'stellar-core', true);
      expect(r?.id).toBe(id);
      expect(r?.outputs).toEqual(outputs);
    });

    it('Netto-Bilanz: 4p → ⁴He + 2e⁺, ¹²C regeneriert', () => {
      let protonsIn = 0;
      let alphasOut = 0;
      let positronsOut = 0;
      for (const step of steps) {
        protonsIn += step.inputs.proton ?? 0;
        alphasOut += step.outputs.alpha ?? 0;
        positronsOut += step.outputs['e+'] ?? 0;
      }
      expect(protonsIn).toBe(4);
      expect(alphasOut).toBe(1);
      expect(positronsOut).toBe(2);
      expect(steps[steps.length - 1]!.outputs.c12).toBe(1);
    });
  });

  describe('Element-Assembly an der Werkbank', () => {
    const elements: Array<[Record<string, number>, string, string]> = [
      [{ alpha: 1, 'e-': 2 }, 'assemble-helium-4', 'He'],
      [{ c12: 1, 'e-': 6 }, 'assemble-carbon-12', 'C'],
      [{ n14: 1, 'e-': 7 }, 'assemble-nitrogen-14', 'N'],
      [{ o16: 1, 'e-': 8 }, 'assemble-oxygen-16', 'O'],
      [{ ne20: 1, 'e-': 10 }, 'assemble-neon-20', 'Ne'],
      [{ mg24: 1, 'e-': 12 }, 'assemble-magnesium-24', 'Mg'],
      [{ si28: 1, 'e-': 14 }, 'assemble-silicon-28', 'Si'],
      [{ fe56: 1, 'e-': 26 }, 'assemble-iron-56', 'Fe'],
    ];

    it.each(elements)('%o → %s produziert %s (Expertenmodus)', (inputs, id, output) => {
      const r = matchRecipe(inputs, 'workbench', true);
      expect(r?.id).toBe(id);
      expect(r?.outputs).toEqual({ [output]: 1 });
    });
  });
});
