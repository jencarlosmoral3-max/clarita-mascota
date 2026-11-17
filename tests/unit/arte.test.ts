import { describe, expect, it } from 'vitest';
import { dormitorio, laguna } from '../../src/arte/fondos';
import { PAL, PJ_OFF, SCN, paletaSprite } from '../../src/arte/paleta';
import { COMPUESTOS, FX, ICONOS, PARCHES, PLUSH, SEQ, SP, frameEn } from '../../src/arte/sprites';

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

describe('secuencias', () => {
  for (const [nombre, seq] of Object.entries(SEQ)) {
    it(`${nombre}: pasos con frame existente y t entero >= 1`, () => {
      expect(seq.length).toBeGreaterThan(0);
      for (const p of seq) {
        expect(SP[p.f]).toBeDefined();
        expect(Number.isInteger(p.t) && p.t >= 1).toBe(true);
      }
    });
    it(`${nombre}: frameEn recorre el ciclo y vuelve al inicio`, () => {
      const total = seq.reduce((a, p) => a + p.t, 0);
      expect(frameEn(seq, 0)).toBe(seq[0]?.f);
      expect(frameEn(seq, total)).toBe(seq[0]?.f);
      expect(frameEn(seq, total - 1)).toBe(seq[seq.length - 1]?.f);
    });
  }

  it('reposo dura 3 s (30 ticks) e incluye blink', () => {
    expect(SEQ.reposo.reduce((a, p) => a + p.t, 0)).toBe(30);
    expect(SEQ.reposo.some((p) => p.f === 'blink')).toBe(true);
    expect(frameEn(SEQ.reposo, 29)).toBe('blink');
  });
});

describe('parches y compuestos', () => {
  for (const [nombre, p] of Object.entries(PARCHES)) {
    it(`parche ${nombre}: cabe en 48x48 y solo usa índices de PAL, '.' o '-'`, () => {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y + p.filas.length).toBeLessThanOrEqual(48);
      for (const fila of p.filas) {
        expect(p.x + fila.length).toBeLessThanOrEqual(48);
        for (const c of fila) {
          if (c === '.' || c === '-') continue;
          expect(PAL[parseInt(c, 36)]).toBeDefined();
        }
      }
    });
  }

  for (const [nombre, c] of Object.entries(COMPUESTOS)) {
    it(`compuesto ${nombre} difiere de su base ${c.base}`, () => {
      expect(JSON.stringify(SP[nombre as keyof typeof COMPUESTOS])).not.toBe(JSON.stringify(SP[c.base]));
    });
  }

  for (const [nombre, c] of Object.entries(COMPUESTOS)) {
    if (!('ladeo' in c)) continue;
    it(`compuesto ladeado ${nombre}: 48x48, sin recortes ni agujeros (píxeles ±10 %)`, () => {
      const cuenta = (g: number[][]) => g.flat().filter(Boolean).length;
      const g = SP[nombre as keyof typeof COMPUESTOS];
      expect(g).toHaveLength(48);
      for (const f of g) expect(f).toHaveLength(48);
      const n = cuenta(g), b = cuenta(SP[c.base]);
      expect(Math.abs(n - b)).toBeLessThanOrEqual(b * 0.1);
      expect(JSON.stringify(g)).not.toBe(JSON.stringify(SP[c.base]));
    });
  }

  it('la lengua (23) existe y no se apaga con el pijama', () => {
    expect(PAL[23]).toBeDefined();
    expect(PJ_OFF[23]).toBeUndefined();
    expect(paletaSprite(false)[23]).toBe(PAL[23]);
  });
});
