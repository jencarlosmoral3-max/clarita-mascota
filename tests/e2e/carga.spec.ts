import { expect, test, type Page } from '@playwright/test';

function recogerErrores(page: Page): string[] {
  const errores: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  page.on('pageerror', (e) => errores.push(e.message));
  return errores;
}

test('iPhone no instalada: muestra la pantalla de instalación', async ({ page }) => {
  const errores = recogerErrores(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Agrega Clarita a tu inicio' })).toBeVisible();
  await expect(page.locator('#instalar li')).toHaveCount(3);
  await expect(page.locator('#app')).toBeHidden();
  expect(errores).toEqual([]);
});

test('instalada: muestra Clarita', async ({ page }) => {
  const errores = recogerErrores(page);
  // WebKit de Playwright no puede emular display-mode: standalone; navigator.standalone sí.
  await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
  await page.goto('/');
  await expect(page.locator('#app').getByText('Clarita')).toBeVisible();
  await expect(page.locator('#instalar')).toBeHidden();
  expect(errores).toEqual([]);
});
