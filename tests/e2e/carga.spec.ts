import { expect, test } from '@playwright/test';

test('carga sin errores de consola', async ({ page }) => {
  const errores: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  page.on('pageerror', (e) => errores.push(e.message));
  await page.goto('/');
  await expect(page.getByText('Clarita')).toBeVisible();
  expect(errores).toEqual([]);
});
