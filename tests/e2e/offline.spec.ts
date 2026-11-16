import { expect, test } from '@playwright/test';

test('instalada: funciona sin red tras la primera carga', async ({ page, context }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  // clientsClaim puede tardar un instante; si no controla aún, una recarga basta.
  if (!(await page.evaluate(() => navigator.serviceWorker.controller !== null))) await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#app').getByText('Clarita')).toBeVisible();
});
