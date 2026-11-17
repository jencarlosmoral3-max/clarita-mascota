import { describe, expect, it } from 'vitest';
import { agregarParticulas, avanzar, pasoParticulas, type Particula } from '../../src/escena/comportamiento';
import { ANIM_MAX_TICKS_POR_VUELTA, ANIM_TICK_MS, FX_MAX, FX_PELOTA } from '../../src/logica/balance';

describe('avanzar', () => {
  it('dt 0: sin ticks', () => expect(avanzar(0, 0)).toEqual([0, 0]));
  it('dt 100: un tick', () => expect(avanzar(0, 100)).toEqual([1, 0]));
  it('dt 250: dos ticks y resto 50', () => expect(avanzar(0, 250)).toEqual([2, 50]));
  it('conserva el resto entre llamadas', () => expect(avanzar(50, 60)).toEqual([1, 10]));
  it('dt enorme: tope de ticks y resto menor que un tick', () => {
    const [n, r] = avanzar(0, 5000);
    expect(n).toBe(ANIM_MAX_TICKS_POR_VUELTA);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThan(ANIM_TICK_MS);
  });
  it('dt negativo o NaN cuenta como 0', () => {
    expect(avanzar(20, -500)).toEqual([0, 20]);
    expect(avanzar(20, NaN)).toEqual([0, 20]);
    expect(avanzar(20, Infinity)).toEqual([0, 20]);
  });
});

describe('pasoParticulas', () => {
  const p = (extra: Partial<Particula> = {}): Particula => ({ k: 'miga', x: 10, y: 20, vx: 1, vy: -2, g: 0.5, vida: 3, ...extra });
  it('mueve, acumula gravedad y descuenta vida', () => {
    const [a] = pasoParticulas([p()], 100);
    expect(a).toMatchObject({ x: 11, y: 18, vy: -1.5, vida: 2 });
    expect(pasoParticulas([a as Particula], 100)[0]).toMatchObject({ y: 16.5, vy: -1 });
  });
  it('elimina cuando la vida llega a 0', () => {
    expect(pasoParticulas([p({ vida: 1 })], 100)).toEqual([]);
    expect(pasoParticulas([p({ vida: 2 }), p({ vida: 1 })], 100)).toHaveLength(1);
  });
  it('rebota en el suelo invirtiendo vy', () => {
    const [a] = pasoParticulas([p({ k: 'ball', y: 99, vy: 2, g: 0, rebota: true })], 100);
    expect(a).toMatchObject({ y: 100, vy: -2 });
  });
  it('rebote con gravedad: la altura de cada bote no supera la del anterior', () => {
    let l: Particula[] = [p({ k: 'ball', x: 0, y: 100, vx: 0, vy: FX_PELOTA.vy, g: FX_PELOTA.g, vida: FX_PELOTA.vida, rebota: true })];
    const alturas: number[] = [];
    let min = 100;
    while (l[0]) {
      const y = l[0].y;
      l = pasoParticulas(l, 100);
      if (!l[0]) break;
      min = Math.min(min, l[0].y);
      if (l[0].y === 100 && y < 100) {
        alturas.push(100 - min);
        min = 100;
      }
    }
    expect(alturas.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < alturas.length; i++) expect(alturas[i]).toBeLessThanOrEqual(alturas[i - 1] as number);
  });
  it('espera: no se mueve ni envejece, solo descuenta', () => {
    const q = p({ espera: 2 });
    const [a] = pasoParticulas([q], 100);
    expect(a).toEqual({ ...q, espera: 1 });
    const [b] = pasoParticulas([a as Particula], 100);
    expect(b).toMatchObject({ x: 10, y: 20, vida: 3, espera: 0 });
    expect(pasoParticulas([b as Particula], 100)[0]).toMatchObject({ x: 11, y: 18, vida: 2 });
  });
  it('sin rebota atraviesa el suelo; con tope se detiene', () => {
    expect(pasoParticulas([p({ y: 99, vy: 2, g: 0 })], 100)[0]?.y).toBe(101);
    expect(pasoParticulas([p({ y: 99, vy: 2, g: 0, tope: 100 })], 100)[0]).toMatchObject({ y: 100, vy: 0 });
  });
  it('agregar respeta el tope y descarta las más viejas', () => {
    const viejas = Array.from({ length: FX_MAX }, (_, i) => p({ x: i }));
    const r = agregarParticulas(viejas, [p({ x: 500 }), p({ x: 501 })]);
    expect(r).toHaveLength(FX_MAX);
    expect(r[0]?.x).toBe(2);
    expect(r.at(-1)?.x).toBe(501);
  });
});
