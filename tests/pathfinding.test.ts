import { describe, expect, it } from 'vitest';
import { planFor, buildReachability } from '../src/game/pathfinding';
import { freeSupplyIds } from '../src/game/content';

describe('pathfinding', () => {
  it('gibt leeren Plan für free-supply Entities zurück', () => {
    const plan = planFor(freeSupplyIds[0]!, false);
    expect(plan).not.toBeNull();
    expect(plan!.steps).toHaveLength(0);
    expect(plan!.freeSupplyCount).toBe(0);
  });

  it('findet einen Plan für Wasserstoff (H)', () => {
    const plan = planFor('H', false);
    expect(plan).not.toBeNull();
    expect(plan!.steps.length).toBeGreaterThan(0);
    // Das letzte Rezept muss H produzieren
    const last = plan!.steps[plan!.steps.length - 1]!;
    expect(Object.keys(last.outputs)).toContain('H');
  });

  it('findet einen Plan für Wasser (H2O)', () => {
    const plan = planFor('H2O', false);
    expect(plan).not.toBeNull();
    // Muss chem-lab enthalten
    expect(plan!.reactors).toContain('chem-lab');
    // Und irgendwo H aufbauen
    const producesH = plan!.steps.some((s) => Object.keys(s.outputs).includes('H'));
    expect(producesH).toBe(true);
  });

  it('findet einen Plan für Aspirin', () => {
    const plan = planFor('aspirin', false);
    expect(plan).not.toBeNull();
    // Muss C, H, O irgendwo erzeugen und dann Aspirin bauen
    const finalStep = plan!.steps[plan!.steps.length - 1]!;
    expect(Object.keys(finalStep.outputs)).toContain('aspirin');
  });

  it('gibt null für unbekannte Ziel-ID zurück', () => {
    expect(planFor('this-does-not-exist', false)).toBeNull();
  });

  it('reachability enthält viele Elemente im simple mode', () => {
    const { producible } = buildReachability(false);
    // Im Normal-Modus sollten mindestens die häufigen Elemente erreichbar sein
    for (const id of ['H', 'C', 'N', 'O', 'Fe', 'H2O', 'CH4', 'C6H6']) {
      expect(producible.has(id), id).toBe(true);
    }
  });

  it('Plan-Schritte respektieren Topologie: Inputs vor Outputs', () => {
    const plan = planFor('aspirin', false);
    expect(plan).not.toBeNull();
    const produced = new Set<string>(freeSupplyIds);
    for (const [i, step] of plan!.steps.entries()) {
      for (const inputId of Object.keys(step.inputs)) {
        expect(produced.has(inputId), `Schritt ${i} braucht ${inputId}, ist aber noch nicht erzeugt`).toBe(true);
      }
      for (const outputId of Object.keys(step.outputs)) produced.add(outputId);
    }
  });
});
