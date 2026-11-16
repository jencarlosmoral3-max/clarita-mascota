import { webkit } from '@playwright/test';
import { paletaSprite, SCN } from '../src/arte/paleta.ts';
import { SP } from '../src/arte/sprites.ts';

// Cara de Clarita (idle0, sin pijama): recorte cuadrado de la grilla 48x48.
const RECORTE = { x: 3, y: 0, n: 44 };
const FONDO = SCN.laguna.day[3] ?? '#3a82e2';
const pal = paletaSprite(false);
const cara = SP.idle0.slice(RECORTE.y, RECORTE.y + RECORTE.n).map((fila) =>
  fila.slice(RECORTE.x, RECORTE.x + RECORTE.n).map((i) => (i === 0 ? '' : (pal[i] ?? ''))),
);

// Corre dentro de la página: no puede referenciar nada fuera de su cuerpo.
function dibujar(lado: number, fraccion: number, fondo: string, px: string[][]): void {
  const ctx = (document.getElementById('c') as HTMLCanvasElement).getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, lado, lado);
  const n = px.length;
  const celda = Math.floor((lado * fraccion) / n); // escala entera: píxeles nítidos
  const o = Math.round((lado - n * celda) / 2);
  px.forEach((fila, y) =>
    fila.forEach((c, x) => {
      if (!c) return;
      ctx.fillStyle = c;
      ctx.fillRect(o + x * celda, o + y * celda, celda, celda);
    }),
  );
}

const salidas = [
  { archivo: 'icon-192.png', lado: 192, fraccion: 0.86 },
  { archivo: 'icon-512.png', lado: 512, fraccion: 0.86 },
  // Maskable: el contenido cabe en el ~80 % central (zona segura).
  { archivo: 'icon-512-maskable.png', lado: 512, fraccion: 0.6 },
  { archivo: 'apple-touch-icon.png', lado: 180, fraccion: 0.86 },
];

const browser = await webkit.launch();
for (const { archivo, lado, fraccion } of salidas) {
  const page = await browser.newPage({ viewport: { width: lado, height: lado }, deviceScaleFactor: 1 });
  await page.setContent(
    `<body style="margin:0"><canvas id="c" width="${lado}" height="${lado}" style="display:block"></canvas></body>`,
  );
  await page.evaluate(`(${dibujar.toString()})(${lado}, ${fraccion}, ${JSON.stringify(FONDO)}, ${JSON.stringify(cara)})`);
  await page.screenshot({ path: `public/icons/${archivo}` });
  await page.close();
}
await browser.close();
