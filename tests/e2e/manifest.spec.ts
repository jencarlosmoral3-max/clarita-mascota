import { expect, test } from '@playwright/test';

interface Manifest {
  display: string;
  icons: { src: string }[];
}

test('manifest e iconos responden 200', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.status()).toBe(200);
  const manifest = (await res.json()) as Manifest;
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons).toHaveLength(3);
  for (const { src } of manifest.icons) {
    expect((await request.get(`/${src}`)).status(), src).toBe(200);
  }
  expect((await request.get('/icons/apple-touch-icon.png')).status()).toBe(200);
});
