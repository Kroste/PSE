export type Vec3 = readonly [number, number, number];

export type Bond = { readonly from: number; readonly to: number; readonly order: number };

/**
 * Force-directed 3D-Layout für ein kleines Molekül:
 * - gebundene Atome ziehen sich per Feder auf Ideallänge 1.5,
 * - alle Atompaare stoßen sich per 1/r²-Term ab (schwach, bricht bei r > 3.5 ab).
 *
 * Deterministisch dank fester Pseudozufalls-Startpositionen (Seed = Atom-Index).
 * Kein Anspruch auf reale Bindungswinkel — reicht aber, um ein Molekül
 * ordentlich in 3D zu verteilen, sodass keine Atome aufeinander liegen.
 */
export function layoutMolecule3D(
  atomCount: number,
  bonds: readonly Bond[],
  iterations = 250,
): Vec3[] {
  if (atomCount === 0) return [];
  if (atomCount === 1) return [[0, 0, 0]];

  // Pseudo-Zufalls-Startpositionen (deterministisch aus dem Atom-Index).
  const pos: [number, number, number][] = Array.from({ length: atomCount }, (_, i) => {
    const a = seededSin(i * 12.9898);
    const b = seededSin(i * 78.233);
    const c = seededSin(i * 37.719);
    return [a * 2, b * 2, c * 2];
  });

  const bondSet = new Set<string>();
  const neighborBonds: number[][] = Array.from({ length: atomCount }, () => []);
  for (const b of bonds) {
    bondSet.add(pairKey(b.from, b.to));
    neighborBonds[b.from]!.push(b.to);
    neighborBonds[b.to]!.push(b.from);
  }

  const IDEAL_LEN = 1.5;
  const SPRING_K = 0.35;
  const REPEL_K = 0.4;
  const CUTOFF = 3.5;

  const forces: [number, number, number][] = Array.from({ length: atomCount }, () => [0, 0, 0]);

  for (let step = 0; step < iterations; step++) {
    // Federn: gebundene Atome auf Ideallänge ziehen.
    for (let i = 0; i < atomCount; i++) {
      forces[i]![0] = 0;
      forces[i]![1] = 0;
      forces[i]![2] = 0;
    }
    for (const b of bonds) {
      const [dx, dy, dz] = sub(pos[b.to]!, pos[b.from]!);
      const d = Math.max(0.001, Math.hypot(dx, dy, dz));
      const err = d - IDEAL_LEN;
      const f = (SPRING_K * err) / d;
      forces[b.from]![0] += dx * f;
      forces[b.from]![1] += dy * f;
      forces[b.from]![2] += dz * f;
      forces[b.to]![0] -= dx * f;
      forces[b.to]![1] -= dy * f;
      forces[b.to]![2] -= dz * f;
    }
    // Abstoßung für nicht-gebundene Paare (kurze Reichweite).
    for (let i = 0; i < atomCount; i++) {
      for (let j = i + 1; j < atomCount; j++) {
        if (bondSet.has(pairKey(i, j))) continue;
        const [dx, dy, dz] = sub(pos[j]!, pos[i]!);
        const d = Math.hypot(dx, dy, dz);
        if (d > CUTOFF || d < 0.001) continue;
        const f = REPEL_K / (d * d * d);
        forces[i]![0] -= dx * f;
        forces[i]![1] -= dy * f;
        forces[i]![2] -= dz * f;
        forces[j]![0] += dx * f;
        forces[j]![1] += dy * f;
        forces[j]![2] += dz * f;
      }
    }
    // Anwenden, mit sanft abnehmender Schrittweite.
    const stepScale = 0.5 * (1 - step / iterations);
    for (let i = 0; i < atomCount; i++) {
      pos[i]![0] += forces[i]![0] * stepScale;
      pos[i]![1] += forces[i]![1] * stepScale;
      pos[i]![2] += forces[i]![2] * stepScale;
    }
  }

  // Auf Schwerpunkt zentrieren.
  const centroid: [number, number, number] = [0, 0, 0];
  for (const p of pos) {
    centroid[0] += p[0];
    centroid[1] += p[1];
    centroid[2] += p[2];
  }
  centroid[0] /= atomCount;
  centroid[1] /= atomCount;
  centroid[2] /= atomCount;
  return pos.map(
    (p) => [
      Math.round((p[0] - centroid[0]) * 1000) / 1000,
      Math.round((p[1] - centroid[1]) * 1000) / 1000,
      Math.round((p[2] - centroid[2]) * 1000) / 1000,
    ] as Vec3,
  );
}

function sub(a: Vec3, b: Vec3): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function seededSin(seed: number): number {
  // stabile Pseudo-Zufallszahl in [-1, 1] auf Basis von seed
  return Math.sin(seed) * 43758.5453 - Math.floor(Math.sin(seed) * 43758.5453 + 0.5);
}
