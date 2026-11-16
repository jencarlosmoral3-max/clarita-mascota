import { expect, test } from 'vitest';
import { PISO } from '../../src/logica/balance';

test('PISO está entre 0 y 100', () => {
  expect(PISO).toBeGreaterThan(0);
  expect(PISO).toBeLessThan(100);
});
