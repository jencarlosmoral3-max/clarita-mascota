import { expect, test } from '@playwright/test';

// Ancho y alto del IHDR de un PNG (bytes 16-23).
const dimensiones = (png: Buffer): string => `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;

interface Manifest {
  display: string;
  icons: { src: string; sizes: string }[];
}

test('manifest e iconos responden 200 con las dimensiones declaradas', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.status()).toBe(200);
  const manifest = (await res.json()) as Manifest;
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons).toHaveLength(3);
  for (const { src, sizes } of manifest.icons) {
    const icono = await request.get(`/${src}`);
    expect(icono.status(), src).toBe(200);
    expect(dimensiones(await icono.body()), src).toBe(sizes);
  }
  const apple = await request.get('/icons/apple-touch-icon.png');
  expect(apple.status()).toBe(200);
  expect(dimensiones(await apple.body())).toBe('180x180');
  // El favicon declarado en index.html responde 200.
  const html = await (await request.get('/')).text();
  const href = /<link rel="icon"[^>]*href="([^"]+)"/.exec(html)?.[1];
  expect(href).toBeDefined();
  expect((await request.get(href ?? '')).status()).toBe(200);
});
