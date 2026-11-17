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
import { ENERGIA_MIN_JUGAR, LLENO, PISO } from '../../src/logica/balance';
import { estadoInicial, type Estado } from '../../src/logica/estado';
import { mulberry32 } from '../../src/escena/comportamiento';

const base = (o: Partial<Estado> = {}): Estado => ({ ...estadoInicial(0), carino: 50, ...o });

describe('cuidados', () => {
  test.each([
    ['alimentar', alimentar, 'comida', 100],
    ['jugar', jugar, 'diversion', 80],
    ['banar', banar, 'higiene', 100],
  ] as const)('%s sube su medidor desde 20 y da cariño bajo el umbral', (_n, fn, k, esperado) => {
    const r = fn(base({ [k]: 20 }));
    expect(r[k]).toBe(esperado);
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
  test.each([
    ['alimentar', alimentar, 'comida'],
    ['jugar', jugar, 'diversion'],
    ['banar', banar, 'higiene'],
  ] as const)('%s topa en 100 y nunca baja el medidor previo', (_n, fn, k) => {
    expect(fn(base({ [k]: 94.9 }))[k]).toBe(100);
    for (const v of [0, 50, 94.9]) expect(fn(base({ [k]: v }))[k]).toBeGreaterThanOrEqual(v);
  });
  const previo = { comida: 50, energia: 80, higiene: 80, diversion: 40 };
  test.each([
    ['alimentar', alimentar, { comida: 100, energia: 80, higiene: 76, diversion: 40 }],
    ['jugar', jugar, { comida: 45, energia: 65, higiene: 70, diversion: 100 }],
    ['banar', banar, { comida: 50, energia: 75, higiene: 100, diversion: 35 }],
    ['acariciar', acariciar, { comida: 50, energia: 80, higiene: 80, diversion: 50 }],
  ] as const)('%s deja los medidores exactos (costos incluidos)', (_n, fn, esperado) => {
    const r = fn(base(previo));
    expect({ comida: r.comida, energia: r.energia, higiene: r.higiene, diversion: r.diversion }).toEqual(esperado);
  });
  test('los costos paran en el piso y un medidor bajo el piso no cambia', () => {
    const r = jugar(base({ energia: 20, higiene: 12, comida: PISO }));
    expect(r.energia).toBe(PISO); // 20 - 15 = 5 < PISO: para en PISO
    expect(r.higiene).toBe(PISO);
    expect(r.comida).toBe(PISO);
    const bajo = jugar(base({ energia: 30, higiene: 5, comida: 5 }));
    expect(bajo.higiene).toBe(5);
    expect(bajo.comida).toBe(5);
    expect(bajo.energia).toBe(15);
  });
  test('puede(jugar) exige energía mínima', () => {
    expect(puede(base({ energia: ENERGIA_MIN_JUGAR - 1 }), 'jugar')).toBe(false);
    expect(puede(base({ energia: ENERGIA_MIN_JUGAR }), 'jugar')).toBe(true);
  });
  test.each([
    ['alimentar', 'comida'],
    ['jugar', 'diversion'],
    ['banar', 'higiene'],
  ] as const)('puede(%s) se bloquea con su medidor en LLENO', (accion, k) => {
    expect(puede(base({ [k]: LLENO }), accion)).toBe(false);
    expect(puede(base({ [k]: LLENO - 0.1 }), accion)).toBe(true);
  });
  test('anti-granja: repetir todos los cuidados sin tiempo no sube el cariño sin límite', () => {
    let e = estadoInicial(0);
    for (let i = 0; i < 1000; i++) e = acariciar(banar(jugar(alimentar(e))));
    expect(e.carino).toBeLessThan(50 + 20);
  });
  test.each([1, 2, 3, 4, 5])('anti-granja aleatorio (semilla %i): 10.000 cuidados al azar no inflan el cariño', (semilla) => {
    const azar = mulberry32(semilla);
    const fns = [alimentar, jugar, banar, acariciar];
    let e = estadoInicial(0);
    for (let i = 0; i < 10000; i++) e = fns[Math.floor(azar() * fns.length)]!(e);
    expect(e.carino).toBeLessThan(50 + 20);
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
  test.each([
    ['energía 10', { energia: 10, comida: 10, diversion: 10, higiene: 10 }],
    ['medidores en 100', { comida: 100, diversion: 100, higiene: 100 }],
  ])('%s', (_n, o: Partial<Estado>) => {
    const e = base(o);
    for (const [nombre, fn] of Object.entries(acciones) as [Accion, (e: Estado) => Estado][]) {
      // acariciar con diversión 100 sigue permitido pero no cambia nada (no es un cuidado): se excluye
      if (nombre === 'acariciar' && e.diversion === 100) continue;
      expect(puede(e, nombre), nombre).toBe(JSON.stringify(fn(e)) !== JSON.stringify(e));
    }
    if (o.energia === 10) expect(puede(e, 'jugar')).toBe(false);
    else for (const a of ['alimentar', 'jugar', 'banar'] as const) expect(puede(e, a)).toBe(false);
  });
});
