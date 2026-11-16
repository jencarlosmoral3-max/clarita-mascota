import { describe, expect, it } from 'vitest';
import { avanzar } from '../../src/escena/comportamiento';
import { ANIM_MAX_TICKS_POR_VUELTA, ANIM_TICK_MS } from '../../src/logica/balance';

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
