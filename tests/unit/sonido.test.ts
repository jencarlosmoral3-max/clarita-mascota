import { describe, expect, test } from 'vitest';
import { SONIDOS, crearSonido, type Reaccion } from '../../src/audio/sonido';
import type { Almacen } from '../../src/logica/guardado';

const memoria = (ini: Record<string, string> = {}): Almacen & { d: Record<string, string> } => {
  const d = { ...ini };
  return { d, getItem: (k) => d[k] ?? null, setItem: (k, v) => void (d[k] = v) };
};
const TIPOS: Reaccion[] = ['alimentar', 'jugar', 'banar', 'acariciar', 'dormir', 'despertar', 'alternarPijama', 'tic'];

describe('sonido sin AudioContext', () => {
  test('no lanza y todo es invocable', () => {
    const s = crearSonido(memoria());
    for (const t of TIPOS) s.reaccion(t);
    s.ambiente({ noche: true, dormida: false });
    s.ambiente({ noche: false, dormida: true });
    s.sincronizar();
    expect(s.activo()).toBe(true);
  });
  test('alternar escribe la clave y cambia activo', () => {
    const a = memoria();
    const s = crearSonido(a);
    s.alternar();
    expect(s.activo()).toBe(false);
    expect(a.d['clarita.sonido']).toBe('0');
    s.alternar();
    expect(s.activo()).toBe(true);
  });
  test("con '0' guardado arranca apagado", () => {
    expect(crearSonido(memoria({ 'clarita.sonido': '0' })).activo()).toBe(false);
  });
  test('almacén que lanza no rompe nada', () => {
    const s = crearSonido({ getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } });
    expect(s.activo()).toBe(true);
    expect(() => s.alternar()).not.toThrow();
    expect(s.activo()).toBe(false);
  });
});

describe('SONIDOS', () => {
  test('cada reacción tiene entrada', () => {
    for (const t of TIPOS) expect(SONIDOS.reacciones[t]).toBeDefined();
  });
  test('todo volumen está en (0, 1]', () => {
    const vols: number[] = [SONIDOS.maestro, SONIDOS.ambiente.volumen, SONIDOS.ambiente.aguaVol, SONIDOS.ambiente.colchonDormida, SONIDOS.ambiente.pajaro.v, SONIDOS.ambiente.grillo.v];
    for (const r of Object.values(SONIDOS.reacciones)) {
      const x: { tonos?: readonly { v: number }[]; ruidos?: readonly { v: number }[] } = r;
      for (const o of [...(x.tonos ?? []), ...(x.ruidos ?? [])]) vols.push(o.v);
    }
    for (const v of vols) { expect(v).toBeGreaterThan(0); expect(v).toBeLessThanOrEqual(1); }
  });
});
