import { describe, expect, test } from 'vitest';
import { animo } from '../../src/logica/animo';
import { estadoInicial, type Estado } from '../../src/logica/estado';

const bien = (o: Partial<Estado> = {}): Estado => ({
  ...estadoInicial(0),
  comida: 80,
  energia: 80,
  higiene: 80,
  diversion: 80,
  ...o,
});

describe('animo', () => {
  test('dormida gana aunque haya necesidades', () => {
    expect(animo(bien({ dormida: true, comida: 0 })).animacion).toBe('dormida');
  });
  test('todo bien: reposo', () => {
    expect(animo(bien()).animacion).toBe('reposo');
  });
  test('exactamente en el umbral no es triste', () => {
    expect(animo(bien({ comida: 30 })).animacion).toBe('reposo');
  });
  test.each([
    ['comida', 'Clarita tiene hambre'],
    ['energia', 'Clarita tiene sueño'],
    ['higiene', 'Clarita necesita un baño'],
    ['diversion', 'Clarita quiere jugar'],
  ] as const)('%s baja: triste con su frase', (k, frase) => {
    expect(animo(bien({ [k]: 29 }))).toEqual({ animacion: 'triste', frase });
  });
  test('nombra la necesidad más baja', () => {
    expect(animo(bien({ comida: 25, higiene: 10 })).frase).toBe('Clarita necesita un baño');
  });
});
