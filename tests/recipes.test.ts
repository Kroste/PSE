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
    it('liefert genau die Werkbank-Rezepte', () => {
      const workbench = recipesForReactor('workbench');
      const ids = workbench.map((r) => r.id).sort();
      expect(ids).toEqual(['assemble-hydrogen', 'assemble-neutron', 'assemble-proton']);
    });

    it('liefert die pp-Kette am Sternkern', () => {
      const stellar = recipesForReactor('stellar-core');
      const ids = stellar.map((r) => r.id).sort();
      expect(ids).toEqual(['pp-deuteron-capture', 'pp-fusion', 'pp-i-closing']);
    });

    it('leer für noch nicht bespielte Reaktoren', () => {
      expect(recipesForReactor('supernova')).toEqual([]);
    });
  });

  describe('pp-Kette am Sternkern', () => {
    it('pp-fusion: 2 Protonen → Deuteron + Positron', () => {
      const r = matchRecipe({ proton: 2 }, 'stellar-core');
      expect(r?.id).toBe('pp-fusion');
      expect(r?.outputs).toEqual({ deuteron: 1, 'e+': 1 });
    });

    it('pp-deuteron-capture: Deuteron + Proton → Helion + γ', () => {
      const r = matchRecipe({ deuteron: 1, proton: 1 }, 'stellar-core');
      expect(r?.id).toBe('pp-deuteron-capture');
      expect(r?.outputs).toEqual({ helion: 1, gamma: 1 });
    });

    it('pp-i-closing: 2 Helion → Alpha + 2 Protonen', () => {
      const r = matchRecipe({ helion: 2 }, 'stellar-core');
      expect(r?.id).toBe('pp-i-closing');
      expect(r?.outputs).toEqual({ alpha: 1, proton: 2 });
    });

    it('pp-Kette-Rezepte laufen NICHT an der Werkbank', () => {
      expect(matchRecipe({ proton: 2 }, 'workbench')).toBeNull();
      expect(matchRecipe({ helion: 2 }, 'workbench')).toBeNull();
    });
  });
});
