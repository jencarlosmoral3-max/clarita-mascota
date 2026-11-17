import { describe, expect, it } from 'vitest';
import { mascaraDither, nubes } from '../../src/arte/fondos';

describe('mascaraDither', () => {
  const celdas = (paso: number) => {
    let n = 0;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (mascaraDither(x, y, paso)) n++;
    return n;
  };
  it('paso 0 nada, paso 4 todo, paso 2 la mitad de un bloque 4x4', () => {
    expect(celdas(0)).toBe(0);
    expect(celdas(4)).toBe(16);
    expect(celdas(2)).toBe(8);
  });
  it('es monótona y crece 4 celdas por paso', () => {
    for (let k = 0; k < 4; k++) {
      expect(celdas(k + 1) - celdas(k)).toBe(4);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (mascaraDither(x, y, k)) expect(mascaraDither(x, y, k + 1)).toBe(true);
    }
  });
});

describe('nubes', () => {
  it('son deterministas y caben en la escena', () => {
    for (const [W, H] of [[96, 56], [83, 85], [130, 280]] as const) {
      const a = nubes(W, H);
      expect(a).toEqual(nubes(W, H));
      expect(a.length).toBeGreaterThan(0);
      for (const n of a) {
        expect(n.x).toBeGreaterThanOrEqual(0);
        expect(n.x).toBeLessThan(W);
        expect(n.y - 1).toBeGreaterThanOrEqual(0);
        expect(n.y + 1).toBeLessThan(Math.floor(H * 0.5));
        for (const [, , w] of n.rects) expect(w).toBeGreaterThan(0);
      }
    }
  });
});
