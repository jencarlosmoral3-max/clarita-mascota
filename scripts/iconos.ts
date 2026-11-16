import { webkit } from '@playwright/test';

// Mismo valor que vite.config.ts, index.html y estilos.css.
const FONDO = '#2b1a14';
const TINTA = '#f5e6d8';

// Provisional: en H6 se reemplaza por el sprite real de Clarita.
const C = [
  '..####.',
  '.##..##',
  '##.....',
  '##.....',
  '##.....',
  '##.....',
  '.##..##',
  '..####.',
];

// Corre dentro de la página: no puede referenciar nada fuera de su cuerpo.
function dibujar(lado: number, fraccion: number, fondo: string, tinta: string, filas: string[]): void {
  const ctx = (document.getElementById('c') as HTMLCanvasElement).getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, lado, lado);
  const ancho = filas[0]?.length ?? 0;
  const celda = Math.floor((lado * fraccion) / Math.max(filas.length, ancho));
  const x0 = Math.round((lado - ancho * celda) / 2);
  const y0 = Math.round((lado - filas.length * celda) / 2);
  ctx.fillStyle = tinta;
  filas.forEach((fila, y) => {
    [...fila].forEach((c, x) => {
      if (c === '#') ctx.fillRect(x0 + x * celda, y0 + y * celda, celda, celda);
    });
  });
}

const salidas = [
  { archivo: 'icon-192.png', lado: 192, fraccion: 0.6 },
  { archivo: 'icon-512.png', lado: 512, fraccion: 0.6 },
  // Maskable: el contenido cabe en el ~80 % central (zona segura).
  { archivo: 'icon-512-maskable.png', lado: 512, fraccion: 0.5 },
  { archivo: 'apple-touch-icon.png', lado: 180, fraccion: 0.6 },
];

const browser = await webkit.launch();
for (const { archivo, lado, fraccion } of salidas) {
  const page = await browser.newPage({ viewport: { width: lado, height: lado }, deviceScaleFactor: 1 });
  await page.setContent(
    `<body style="margin:0"><canvas id="c" width="${lado}" height="${lado}" style="display:block"></canvas></body>`,
  );
  await page.evaluate(`(${dibujar.toString()})(${lado}, ${fraccion}, ${JSON.stringify(FONDO)}, ${JSON.stringify(TINTA)}, ${JSON.stringify(C)})`);
  await page.screenshot({ path: `public/icons/${archivo}` });
  await page.close();
}
await browser.close();
