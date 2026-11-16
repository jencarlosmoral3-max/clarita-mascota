import { expect, test } from 'vitest';
import { estadoInicial, sanear } from '../../src/logica/estado';

test('sanear nunca lanza y devuelve inicial ante basura', () => {
  for (const x of [undefined, null, 5, 'x', [], {}, () => 1]) {
    expect(sanear(x, 7)).toEqual(estadoInicial(7));
  }
});

test('sanear recorta, descarta Infinity y conserva válidos', () => {
  const r = sanear({ comida: Infinity, energia: 1e9, higiene: -1, diversion: NaN, carino: 33.5, ultimaVez: Infinity }, 9);
  expect(r.comida).toBe(estadoInicial(9).comida);
  expect(r.energia).toBe(100);
  expect(r.higiene).toBe(0);
  expect(r.diversion).toBe(estadoInicial(9).diversion);
  expect(r.carino).toBe(33.5);
  expect(r.ultimaVez).toBe(9);
});
