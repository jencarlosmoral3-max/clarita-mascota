import { expect, test, type Page } from '@playwright/test';

const errores: string[] = [];
test.beforeEach(({ page }) => {
  errores.length = 0;
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  page.on('pageerror', (e) => errores.push(e.message));
});
test.afterEach(() => expect(errores).toEqual([]));

type Semilla = Record<string, unknown>;
// La semilla se serializa con toString: no puede referenciar variables externas. Comida, diversión e higiene bajas y energía alta: los tres cuidados están disponibles.
const necesitada = (ahora: number): Semilla => ({ version: 1, comida: 20, energia: 90, higiene: 20, diversion: 20, carino: 50, dormida: false, pijama: false, ultimaVez: ahora });

async function abrir(page: Page, semilla: (ahora: number) => Semilla = necesitada): Promise<void> {
  await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
  await page.addInitScript(({ fuente }) => {
    if (localStorage.getItem('clarita.estado')) return;
    const f = new Function('ahora', `return (${fuente})(ahora)`) as (n: number) => unknown;
    localStorage.setItem('clarita.estado', JSON.stringify(f(Date.now())));
  }, { fuente: semilla.toString() });
  await page.goto('/');
  await expect(page.getByRole('progressbar', { name: 'Comida' })).toBeVisible();
}

const dialogo = (page: Page) => page.getByRole('dialog');
const clave = (page: Page) => page.evaluate(() => localStorage.getItem('clarita.tutorial'));

test('recorrido completo con clics reales; no vuelve tras recargar', async ({ page }) => {
  await abrir(page);
  await expect(dialogo(page)).toContainText('¡Hola! Ella es Clarita. Cuídala y te querrá cada día más.');
  await expect(dialogo(page)).toContainText('Paso 1 de 7');
  await dialogo(page).getByRole('button', { name: 'Siguiente' }).click();
  await dialogo(page).getByRole('button', { name: 'Siguiente' }).click();
  await expect(dialogo(page)).toContainText('Pulsa Alimentar');
  await expect(dialogo(page).getByRole('button', { name: 'Siguiente' })).toBeHidden();
  await page.getByRole('button', { name: 'Alimentar', exact: true }).click();
  await expect(dialogo(page)).toContainText('Pulsa Jugar');
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  await expect(dialogo(page)).toContainText('Pulsa Bañar');
  await page.getByRole('button', { name: 'Bañar', exact: true }).click();
  await expect(dialogo(page)).toContainText('pulsa Dormir');
  await dialogo(page).getByRole('button', { name: 'Siguiente' }).click();
  await expect(dialogo(page)).toContainText('Paso 7 de 7');
  await dialogo(page).getByRole('button', { name: 'Listo' }).click();
  await expect(dialogo(page)).toHaveCount(0);
  expect(await clave(page)).toBe('1');
  await page.reload();
  await expect(page.getByRole('progressbar', { name: 'Comida' })).toBeVisible();
  await expect(dialogo(page)).toHaveCount(0);
});

test('Saltar cierra y persiste', async ({ page }) => {
  await abrir(page);
  await dialogo(page).getByRole('button', { name: 'Saltar guía' }).click();
  await expect(dialogo(page)).toHaveCount(0);
  expect(await clave(page)).toBe('1');
  await page.reload();
  await expect(page.getByRole('progressbar', { name: 'Comida' })).toBeVisible();
  await expect(dialogo(page)).toHaveCount(0);
});

test('Escape cierra y persiste', async ({ page }) => {
  await abrir(page);
  await expect(dialogo(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialogo(page)).toHaveCount(0);
  expect(await clave(page)).toBe('1');
});

test('Ver guía reabre en el paso 1', async ({ page }) => {
  await abrir(page);
  await dialogo(page).getByRole('button', { name: 'Siguiente' }).click();
  await expect(dialogo(page)).toContainText('Paso 2 de 7');
  await page.getByRole('button', { name: 'Ver guía' }).click();
  await expect(dialogo(page)).toContainText('Paso 1 de 7');
  await dialogo(page).getByRole('button', { name: 'Saltar guía' }).click();
  await page.getByRole('button', { name: 'Ver guía' }).click();
  await expect(dialogo(page)).toContainText('Paso 1 de 7');
});

test('sin energía para jugar, el paso Jugar muestra Siguiente', async ({ page }) => {
  await abrir(page, (ahora) => ({ version: 1, comida: 20, energia: 10, higiene: 20, diversion: 20, carino: 50, dormida: false, pijama: false, ultimaVez: ahora }));
  for (let i = 0; i < 2; i++) await dialogo(page).getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Alimentar', exact: true }).click();
  await expect(dialogo(page)).toContainText('Pulsa Jugar');
  await expect(dialogo(page).getByRole('button', { name: 'Siguiente' })).toBeVisible();
});

test('en el paso Alimentar, Dormir hace aparecer Siguiente y este avanza', async ({ page }) => {
  await abrir(page);
  for (let i = 0; i < 2; i++) await dialogo(page).getByRole('button', { name: 'Siguiente' }).click();
  await expect(dialogo(page)).toContainText('Paso 3 de 7');
  await expect(dialogo(page).getByRole('button', { name: 'Siguiente' })).toBeHidden();
  await page.getByRole('button', { name: 'Dormir', exact: true }).click();
  await expect(dialogo(page).getByRole('button', { name: 'Siguiente' })).toBeVisible();
  await dialogo(page).getByRole('button', { name: 'Siguiente' }).click();
  await expect(dialogo(page)).toContainText('Paso 4 de 7');
});

test('una acción distinta a la esperada no avanza el paso', async ({ page }) => {
  await abrir(page);
  for (let i = 0; i < 2; i++) await dialogo(page).getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  await expect(dialogo(page)).toContainText('Paso 3 de 7');
  await page.getByRole('button', { name: 'Acariciar' }).click();
  await expect(dialogo(page)).toContainText('Paso 3 de 7');
});

for (const vp of [{ width: 375, height: 667 }, { width: 390, height: 844 }]) {
  test(`globo dentro del viewport y sin scroll en ${vp.width}x${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await abrir(page);
    for (let i = 0; i < 7; i++) {
      const caja = await dialogo(page).boundingBox();
      expect(caja, `paso ${i + 1}`).not.toBeNull();
      expect(caja!.x).toBeGreaterThanOrEqual(0);
      expect(caja!.y).toBeGreaterThanOrEqual(0);
      expect(caja!.x + caja!.width).toBeLessThanOrEqual(vp.width);
      expect(caja!.y + caja!.height).toBeLessThanOrEqual(vp.height);
      for (const n of ['Saltar guía', 'Siguiente', 'Listo']) {
        const loc = dialogo(page).getByRole('button', { name: n });
        const b = (await loc.count()) ? await loc.boundingBox() : null;
        if (b) expect(b.height).toBeGreaterThanOrEqual(44);
      }
      const r = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, ih: innerHeight, sw: document.documentElement.scrollWidth, iw: innerWidth }));
      expect(r.sh).toBeLessThanOrEqual(r.ih);
      expect(r.sw).toBeLessThanOrEqual(r.iw);
      const objetivo = dialogo(page).getByRole('button', { name: /Siguiente|Listo/ });
      if (i < 6 && ![2, 3, 4].includes(i)) await objetivo.click();
      else if (i === 2) await page.getByRole('button', { name: 'Alimentar', exact: true }).click();
      else if (i === 3) await page.getByRole('button', { name: 'Jugar', exact: true }).click();
      else if (i === 4) await page.getByRole('button', { name: 'Bañar', exact: true }).click();
    }
  });
}
