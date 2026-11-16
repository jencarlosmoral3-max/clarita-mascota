import { describe, expect, it } from 'vitest';
import { dormitorio, laguna } from '../../src/arte/fondos';
import { PAL, SCN } from '../../src/arte/paleta';
import { FX, ICONOS, PLUSH, SP } from '../../src/arte/sprites';

describe('sprites', () => {
  for (const [nombre, g] of Object.entries(SP)) {
    it(`${nombre} es 48x48 con índices dentro de PAL`, () => {
      expect(g).toHaveLength(48);
      for (const fila of g) {
        expect(fila).toHaveLength(48);
        for (const v of fila) expect(v).toBeLessThan(PAL.length);
      }
    });
  }

  it('el peluche y los efectos son rectangulares', () => {
    for (const g of [PLUSH, ...Object.values(FX)]) for (const fila of g) expect(fila).toHaveLength(g[0]?.length ?? -1);
  });

  it('los iconos son 8x8 de 0 y 1', () => {
    for (const g of Object.values(ICONOS)) {
      expect(g).toHaveLength(8);
      for (const fila of g) {
        expect(fila).toHaveLength(8);
        for (const v of fila) expect([0, 1]).toContain(v);
      }
    }
  });
});

describe('fondos', () => {
  const gens = { laguna, dormitorio };
  for (const [nombre, gen] of Object.entries(gens) as [keyof typeof gens, typeof laguna][]) {
    for (const [W, H] of [[83, 85], [100, 60]] as const) {
      it(`${nombre} ${W}x${H}: W*H celdas dentro de ambas paletas`, () => {
        const g = gen(W, H);
        expect(g).toHaveLength(W * H);
        const tope = Math.min(SCN[nombre].day.length, SCN[nombre].night.length);
        for (const v of g) expect(v).toBeLessThan(tope);
      });
    }
  }
});
