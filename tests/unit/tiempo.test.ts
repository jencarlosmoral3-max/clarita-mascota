import { describe, expect, test } from 'vitest';
import { MS_POR_HORA, PISO, TICK_MS } from '../../src/logica/balance';
import { estadoInicial, type Estado } from '../../src/logica/estado';
import { aplicarTiempo, esDeNoche } from '../../src/logica/tiempo';

const T0 = 1_700_000_000_000;
const base = (o: Partial<Estado> = {}): Estado => ({
  ...estadoInicial(T0),
  comida: 100,
  energia: 100,
  higiene: 100,
  diversion: 100,
  carino: 40,
  ...o,
});
const MEDIDORES = ['comida', 'energia', 'higiene', 'diversion'] as const;

describe('aplicarTiempo', () => {
  test('delta negativo: medidores intactos y reancla ultimaVez', () => {
    const e = base({ ultimaVez: T0 + MS_POR_HORA });
    expect(aplicarTiempo(e, T0)).toEqual({ ...e, ultimaVez: T0 });
  });
  test('delta 0: sin cambios', () => {
    const e = base();
    expect(aplicarTiempo(e, T0)).toEqual(e);
  });
  test('1 hora despierta: valores exactos', () => {
    const r = aplicarTiempo(base(), T0 + MS_POR_HORA);
    expect(r.comida).toBeCloseTo(94, 9);
    expect(r.diversion).toBeCloseTo(95, 9);
    expect(r.energia).toBeCloseTo(96, 9);
    expect(r.higiene).toBeCloseTo(97, 9);
    expect(r.ultimaVez).toBe(T0 + MS_POR_HORA);
  });
  test('3 semanas = 24 h, nada bajo el piso, ultimaVez real', () => {
    const fin = T0 + 21 * 24 * MS_POR_HORA;
    const tres = aplicarTiempo(base(), fin);
    const un = aplicarTiempo(base(), T0 + 24 * MS_POR_HORA);
    expect({ ...tres, ultimaVez: 0 }).toEqual({ ...un, ultimaVez: 0 });
    expect(tres.ultimaVez).toBe(fin);
    for (const k of MEDIDORES) expect(tres[k]).toBeGreaterThanOrEqual(PISO);
    expect(tres.comida).toBe(PISO);
  });
  test('dormida: comida -2, energía +15, resto quieto', () => {
    const r = aplicarTiempo(base({ dormida: true, energia: 50 }), T0 + MS_POR_HORA);
    expect(r.comida).toBeCloseTo(98, 9);
    expect(r.energia).toBeCloseTo(65, 9);
    expect(r.diversion).toBe(100);
    expect(r.higiene).toBe(100);
  });
  test('energía no pasa de 100', () => {
    expect(aplicarTiempo(base({ dormida: true, energia: 95 }), T0 + MS_POR_HORA).energia).toBe(100);
  });
  test('medidor ya bajo el piso no sube por el piso', () => {
    const r = aplicarTiempo(base({ comida: 5 }), T0 + MS_POR_HORA);
    expect(r.comida).toBe(5);
  });
  test('120 ticks de 30 s ≈ 1 hora de una llamada', () => {
    let e = base();
    for (let i = 1; i <= 120; i++) e = aplicarTiempo(e, T0 + i * TICK_MS);
    const una = aplicarTiempo(base(), T0 + MS_POR_HORA);
    for (const k of MEDIDORES) expect(e[k]).toBeCloseTo(una[k], 6);
  });
  test('carino intacto y no muta la entrada', () => {
    const e = base();
    const copia = structuredClone(e);
    const r = aplicarTiempo(e, T0 + 5 * MS_POR_HORA);
    expect(r.carino).toBe(40);
    expect(e).toEqual(copia);
    expect(r).not.toBe(e);
  });
});

describe('esDeNoche (hora local)', () => {
  const f = (h: number, m: number) => new Date(2026, 5, 15, h, m).getTime();
  test.each([
    [19, 59, false],
    [20, 0, true],
    [23, 30, true],
    [0, 0, true],
    [6, 59, true],
    [7, 0, false],
    [12, 0, false],
  ])('%i:%i -> %s', (h, m, esperado) => {
    expect(esDeNoche(f(h, m))).toBe(esperado);
  });
});
