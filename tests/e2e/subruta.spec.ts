import { expect, test } from '@playwright/test';

const URL_APP = 'http://localhost:4174/clarita/';

interface Manifest {
  start_url: string;
  scope: string;
  icons: { src: string }[];
}

test('build bajo /clarita/: carga, manifest, iconos, service worker y offline', async ({ page, context, request }) => {
  const errores: string[] = [];
  const malas: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('response', (r) => { if (r.status() >= 400) malas.push(`${r.status()} ${r.url()}`); });

  await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
  await page.goto(URL_APP);
  await expect(page.locator('#app').getByRole('heading', { name: 'Clarita' })).toBeVisible();
  await expect(page.locator('#app canvas[role="img"]')).toBeVisible();

  const urlManifest = new URL('manifest.webmanifest', URL_APP);
  const res = await request.get(urlManifest.href);
  expect(res.status()).toBe(200);
  const manifest = (await res.json()) as Manifest;
  const resueltas = [manifest.start_url, manifest.scope, ...manifest.icons.map((i) => i.src)].map((u) => new URL(u, urlManifest));
  for (const u of resueltas) expect(u.pathname.startsWith('/clarita/'), u.href).toBe(true);
  for (const u of resueltas.slice(2)) expect((await request.get(u.href)).status(), u.href).toBe(200);
  expect((await request.get(`${URL_APP}icons/apple-touch-icon.png`)).status()).toBe(200);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/clarita/icons/apple-touch-icon.png');

  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toBe(URL_APP);
  if (!(await page.evaluate(() => navigator.serviceWorker.controller !== null))) await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#app').getByRole('heading', { name: 'Clarita' })).toBeVisible();

  expect(errores).toEqual([]);
  expect(malas).toEqual([]);
});
