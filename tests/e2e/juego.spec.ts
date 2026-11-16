import { expect, test, type Page } from '@playwright/test';

const ORIGEN = 'http://localhost:4173';
const MEDIDORES = ['Comida', 'Energía', 'Higiene', 'Diversión', 'Cariño'];
const BOTONES = ['Alimentar', 'Jugar', 'Bañar', 'Dormir', 'Acariciar', 'Pijama'];

const errores: string[] = [];
const externas: string[] = [];

test.beforeEach(({ page }) => {
  errores.length = 0;
  externas.length = 0;
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('request', (r) => { if (!r.url().startsWith(ORIGEN) && !/^(data|blob|about):/.test(r.url())) externas.push(r.url()); });
});

test.afterEach(() => {
  expect(errores).toEqual([]);
  expect(externas).toEqual([]);
});

// Instalada (WebKit no emula display-mode) y, si se pide, con partida sembrada solo la primera vez.
async function abrir(page: Page, semilla?: (ahora: number) => Record<string, unknown>): Promise<void> {
  await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
  if (semilla) {
    await page.addInitScript(
      ({ fuente }) => {
        if (localStorage.getItem('clarita.estado')) return;
        const f = new Function('ahora', `return (${fuente})(ahora)`) as (n: number) => unknown;
        localStorage.setItem('clarita.estado', JSON.stringify(f(Date.now())));
      },
      { fuente: semilla.toString() },
    );
  }
  await page.goto('/');
  await expect(page.getByRole('progressbar', { name: 'Comida' })).toBeVisible();
}

const base = (ahora: number): Record<string, unknown> => ({
  version: 1, comida: 80, energia: 80, higiene: 80, diversion: 80, carino: 50, dormida: false, pijama: false, ultimaVez: ahora,
});
const valor = (page: Page, nombre: string): Promise<number> =>
  page.getByRole('progressbar', { name: nombre }).getAttribute('aria-valuenow').then(Number);

test('se ven 5 medidores y 6 botones de al menos 44 px', async ({ page }) => {
  await abrir(page);
  for (const n of MEDIDORES) await expect(page.getByRole('progressbar', { name: n })).toBeVisible();
  for (const n of BOTONES) {
    const caja = await page.getByRole('button', { name: n }).boundingBox();
    expect(caja?.height, n).toBeGreaterThanOrEqual(44);
    expect(caja?.width, n).toBeGreaterThanOrEqual(44);
  }
});

test('Alimentar sube comida y cariño, y persiste al recargar', async ({ page }) => {
  await abrir(page, (ahora) => ({ version: 1, comida: 20, energia: 80, higiene: 80, diversion: 80, carino: 50, dormida: false, pijama: false, ultimaVez: ahora }));
  expect(await valor(page, 'Comida')).toBe(20);
  await page.getByRole('button', { name: 'Alimentar' }).click();
  expect(await valor(page, 'Comida')).toBe(100);
  expect(await valor(page, 'Cariño')).toBeGreaterThan(50);
  await page.reload();
  expect(await valor(page, 'Comida')).toBe(100);
});

test('tras 10 h de ausencia la comida baja a ~40', async ({ page }) => {
  await abrir(page, (ahora) => ({ version: 1, comida: 100, energia: 100, higiene: 100, diversion: 100, carino: 100, dormida: false, pijama: false, ultimaVez: ahora - 10 * 3600 * 1000 }));
  expect(Math.abs((await valor(page, 'Comida')) - 40)).toBeLessThanOrEqual(1);
});

test('ultimaVez en el futuro: carga sin error y los medidores no cambian', async ({ page }) => {
  await abrir(page, (ahora) => ({ version: 1, comida: 55, energia: 55, higiene: 55, diversion: 55, carino: 55, dormida: false, pijama: false, ultimaVez: ahora + 5 * 3600 * 1000 }));
  for (const n of MEDIDORES) expect(await valor(page, n), n).toBe(55);
});

test('Dormir deshabilita acciones y Despertar las reactiva', async ({ page }) => {
  await abrir(page, base);
  const acciones = ['Alimentar', 'Jugar', 'Bañar', 'Acariciar'];
  await page.getByRole('button', { name: 'Dormir' }).click();
  await expect(page.getByRole('button', { name: 'Despertar' })).toBeVisible();
  for (const n of acciones) await expect(page.getByRole('button', { name: n })).toBeDisabled();
  await page.getByRole('button', { name: 'Despertar' }).click();
  for (const n of acciones) await expect(page.getByRole('button', { name: n })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Dormir' })).toBeVisible();
});

test('Pijama alterna aria-pressed', async ({ page }) => {
  await abrir(page);
  const b = page.getByRole('button', { name: 'Pijama' });
  await expect(b).toHaveAttribute('aria-pressed', 'false');
  await b.click();
  await expect(b).toHaveAttribute('aria-pressed', 'true');
  await b.click();
  await expect(b).toHaveAttribute('aria-pressed', 'false');
});

const diversionBaja = (ahora: number): Record<string, unknown> => ({ version: 1, comida: 80, energia: 80, higiene: 80, diversion: 20, carino: 50, dormida: false, pijama: false, ultimaVez: ahora }); // autocontenida: se serializa

// Punto en px CSS dentro del canvas; (lx, ly) en píxeles lógicos (sprite: 48x48 en geo()).
async function puntoCanvas(page: Page, f: (w: number, h: number, x: number) => [number, number]): Promise<[number, number]> {
  return page.evaluate((fuente) => {
    const c = document.querySelector('canvas[role="img"]') as HTMLCanvasElement;
    const r = c.getBoundingClientRect();
    const s = Number(c.dataset.escala);
    const W = c.width / s;
    const H = c.height / s;
    const [lx, ly] = (new Function('w', 'h', 'x', `return (${fuente})(w, h, x)`) as (w: number, h: number, x: number) => [number, number])(W, H, Number(c.dataset.x));
    return [r.left + (lx / W) * r.width, r.top + (ly / H) * r.height] as [number, number];
  }, f.toString());
}

test('tocar a Clarita en el canvas acaricia', async ({ page }) => {
  await abrir(page, diversionBaja);
  const [x, y] = await puntoCanvas(page, (_w, h, x) => [x + 24, Math.floor(h * 0.84) - 45 + 24]);
  await page.mouse.click(x, y);
  expect(await valor(page, 'Diversión')).toBeGreaterThan(20);
});

test('tocar el cielo del canvas no acaricia', async ({ page }) => {
  await abrir(page, diversionBaja);
  const [x, y] = await puntoCanvas(page, () => [3, 3]);
  await page.mouse.click(x, y);
  for (const n of MEDIDORES) expect(await valor(page, n), n).toBe(n === 'Diversión' ? 20 : n === 'Cariño' ? 50 : 80);
});

test('la animación corre y los efectos desaparecen', async ({ page }) => {
  await abrir(page, diversionBaja);
  const canvas = page.getByRole('img', { name: /Clarita/ });
  const vistos = new Set<string>();
  await expect
    .poll(async () => (vistos.add((await canvas.getAttribute('data-frame')) ?? ''), vistos.size), { timeout: 3000 })
    .toBeGreaterThanOrEqual(2);
  await page.getByRole('button', { name: 'Acariciar' }).click();
  await expect.poll(async () => Number(await canvas.getAttribute('data-fx'))).toBeGreaterThan(0);
  await expect.poll(async () => Number(await canvas.getAttribute('data-fx')), { timeout: 4000 }).toBe(0);
});

test.describe('movimiento reducido', () => {
  test.use({ reducedMotion: 'reduce' });
  test('sin reloj: el frame no cambia y el efecto se borra solo', async ({ page }) => {
    await abrir(page, diversionBaja);
    const canvas = page.getByRole('img', { name: /Clarita/ });
    const f0 = await canvas.getAttribute('data-frame');
    await page.waitForTimeout(1500);
    expect(await canvas.getAttribute('data-frame')).toBe(f0);
    await page.getByRole('button', { name: 'Acariciar' }).click();
    await expect.poll(async () => Number(await canvas.getAttribute('data-fx'))).toBeGreaterThan(0);
    await expect.poll(async () => Number(await canvas.getAttribute('data-fx')), { timeout: 3000 }).toBe(0);
  });
});

for (const vp of [{ width: 390, height: 844 }, { width: 375, height: 667 }]) {
  test(`canvas con escala entera y sin scroll en ${vp.width}x${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await abrir(page);
    const r = await page.evaluate(() => {
      const c = document.querySelector('canvas[role="img"]') as HTMLCanvasElement;
      const de = document.documentElement;
      return { w: c.width, h: c.height, escala: Number(c.dataset.escala), sh: de.scrollHeight, ih: innerHeight, sw: de.scrollWidth, iw: innerWidth };
    });
    expect(Number.isInteger(r.escala) && r.escala >= 1).toBe(true);
    expect(r.w % r.escala).toBe(0);
    expect(r.h % r.escala).toBe(0);
    expect(r.w / r.escala).toBeGreaterThanOrEqual(80);
    expect(r.sh).toBeLessThanOrEqual(r.ih);
    expect(r.sw).toBeLessThanOrEqual(r.iw);
  });
}
