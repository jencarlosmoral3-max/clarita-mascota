import { describe, expect, test } from 'vitest';
import {
  acariciar,
  alimentar,
  alternarPijama,
  banar,
  despertar,
  dormir,
  jugar,
  puede,
  type Accion,
} from '../../src/logica/acciones';
import { estadoInicial, type Estado } from '../../src/logica/estado';

const base = (o: Partial<Estado> = {}): Estado => ({ ...estadoInicial(0), carino: 50, ...o });

describe('cuidados', () => {
  test.each([
    ['alimentar', alimentar, 'comida'],
    ['jugar', jugar, 'diversion'],
    ['banar', banar, 'higiene'],
  ] as const)('%s sube su medidor a 100 y da cariño bajo el umbral', (_n, fn, k) => {
    const r = fn(base({ [k]: 20 }));
    expect(r[k]).toBe(100);
    expect(r.carino).toBe(52);
  });
  test.each([
    ['alimentar', alimentar, 'comida'],
    ['jugar', jugar, 'diversion'],
    ['banar', banar, 'higiene'],
  ] as const)('%s no da cariño con el medidor en 70 o más', (_n, fn, k) => {
    expect(fn(base({ [k]: 70 })).carino).toBe(50);
    expect(fn(base({ [k]: 69.9 })).carino).toBe(52);
  });
  test('cariño topa en 100', () => {
    expect(alimentar(base({ comida: 0, carino: 99 })).carino).toBe(100);
  });
  test('no muta la entrada', () => {
    const e = base({ comida: 10 });
    alimentar(e);
    expect(e.comida).toBe(10);
  });
});

describe('acariciar', () => {
  test('sube diversión 10 y da cariño solo si estaba bajo 70', () => {
    const bajo = acariciar(base({ diversion: 40 }));
    expect(bajo.diversion).toBe(50);
    expect(bajo.carino).toBe(52);
    const alto = acariciar(base({ diversion: 70 }));
    expect(alto.diversion).toBe(80);
    expect(alto.carino).toBe(50);
  });
  test('pulsar en bucle no sube cariño sin límite', () => {
    let e = base({ diversion: 0 });
    for (let i = 0; i < 100; i++) e = acariciar(e);
    expect(e.carino).toBe(50 + 2 * 7); // diversión 0,10,...,60 estaban bajo 70
    expect(e.diversion).toBe(100);
  });
});

describe('dormir, despertar, pijama', () => {
  test('dormir y despertar', () => {
    const d = dormir(base());
    expect(d.dormida).toBe(true);
    expect(despertar(d).dormida).toBe(false);
  });
  test('dormir dormida y despertar despierta: sin cambios', () => {
    const d = base({ dormida: true });
    expect(dormir(d)).toEqual(d);
    const a = base();
    expect(despertar(a)).toEqual(a);
  });
  test('alternarPijama funciona también dormida', () => {
    expect(alternarPijama(base()).pijama).toBe(true);
    expect(alternarPijama(base({ dormida: true, pijama: true })).pijama).toBe(false);
  });
});

describe('dormida bloquea', () => {
  const d = base({ dormida: true, comida: 10, diversion: 10, higiene: 10 });
  test.each([alimentar, jugar, banar, acariciar, dormir])('acción sin efecto', (fn) => {
    expect(fn(d)).toEqual(d);
  });
});

describe('puede coincide con el comportamiento', () => {
  const acciones: Record<Accion, (e: Estado) => Estado> = {
    alimentar,
    jugar,
    banar,
    dormir,
    despertar,
    acariciar,
    alternarPijama,
  };
  test.each([false, true])('dormida=%s', (dormida) => {
    const e = base({ dormida, comida: 10, diversion: 10, higiene: 10, pijama: false });
    for (const [nombre, fn] of Object.entries(acciones) as [Accion, (e: Estado) => Estado][]) {
      expect(puede(e, nombre), nombre).toBe(JSON.stringify(fn(e)) !== JSON.stringify(e));
    }
  });
});
