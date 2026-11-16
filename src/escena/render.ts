import { dormitorio, laguna } from '../arte/fondos';
import { FXP, PLUSH_PAL, SCN, paletaSprite } from '../arte/paleta';
import { FX, PLUSH, SEQ, SP, type Efecto, type Frame, type Grilla } from '../arte/sprites';
import { animo } from '../logica/animo';
import type { Estado } from '../logica/estado';
import { esDeNoche } from '../logica/tiempo';

export type EfectoAccion = 'alimentar' | 'jugar' | 'banar' | 'acariciar';

const ANCHO_MIN = 96; // píxeles lógicos de ancho (el sprite mide 48): en un iPhone de 3x da el mismo encuadre que el mock
const ALTO_MIN = 56; // el sprite (48) más aire arriba; si la escena es baja, la escala baja
const FRAME_MS = 300;
const FX_QUITAR_MS = 1500;

type Particula = { k: Efecto; x: number; y: number; vy: number };

function blit(ctx: CanvasRenderingContext2D, g: Grilla, pal: readonly string[], ox: number, oy: number): void {
  g.forEach((fila, y) =>
    fila.forEach((v, x) => {
      if (!v) return;
      ctx.fillStyle = pal[v] ?? '#000';
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }),
  );
}

export function crearEscena(escena: HTMLElement, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  const lo = document.createElement('canvas');
  const loCtx = lo.getContext('2d');
  const reducir = matchMedia('(prefers-reduced-motion: reduce)');
  const fondos = new Map<string, Uint8Array>();

  let estado: Estado | undefined;
  let ahora = 0;
  let W = 0;
  let H = 0;
  let t = 0;
  let timer = 0;
  let fx: Particula[] = [];
  let fxKind: EfectoAccion | undefined;
  let fxVida = 0;
  let fxT = 0;
  let fxGeo = { sy: 0, base: 0 };
  let quitar = 0;

  const geo = (laguna_: boolean) => {
    const base = Math.floor(H * (laguna_ ? 0.84 : 0.9));
    return { sx: Math.floor((W - 48) / 2), sy: base - 45, base };
  };

  function dibujar(): void {
    if (!ctx || !loCtx || !estado || !W) return;
    const lugar = estado.dormida ? 'dormitorio' : 'laguna';
    const clave = `${lugar}${W}x${H}`;
    let g = fondos.get(clave);
    if (!g) {
      g = (lugar === 'laguna' ? laguna : dormitorio)(W, H);
      fondos.set(clave, g);
    }
    const bp = SCN[lugar][esDeNoche(ahora) ? 'night' : 'day'];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        loCtx.fillStyle = bp[g[y * W + x] ?? 0] ?? '#000';
        loCtx.fillRect(x, y, 1, 1);
      }

    const { sx, sy, base } = geo(lugar === 'laguna');
    const an = animo(estado).animacion;
    const secuencia = SEQ[an];
    const bob = fx.length > 0 && (fxKind === 'alimentar' || fxKind === 'jugar');
    const frame: Frame = bob ? (t % 2 ? 'idle1' : 'idle0') : (secuencia[t % secuencia.length] ?? 'idle0');
    if (lugar === 'dormitorio') blit(loCtx, PLUSH, PLUSH_PAL, sx - 9, base - 6);
    blit(loCtx, SP[frame], paletaSprite(estado.pijama), sx, sy);
    for (const f of fx) blit(loCtx, FX[f.k], FXP, Math.round(f.x), Math.round(f.y));
    if (an === 'dormida') {
      const p = Math.floor(t / 2) % 3;
      for (let i = 0; i < 3; i++) blit(loCtx, FX.z, FXP, sx + 36 + i * 5, sy + 8 - ((p + i) % 3) * 6);
    }

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(lo, 0, 0, W, H, 0, 0, canvas.width, canvas.height);
  }

  function layout(): void {
    const dpr = window.devicePixelRatio || 1;
    // clientWidth/Height son enteros en px CSS; en px de dispositivo la escala entera queda exacta.
    const wDev = Math.floor(escena.clientWidth * dpr);
    const hDev = Math.floor(escena.clientHeight * dpr);
    const s = Math.max(1, Math.min(Math.floor(wDev / ANCHO_MIN), Math.floor(hDev / ALTO_MIN)));
    W = Math.ceil(wDev / s); // ceil: el sobrante se recorta, sin franja vacía
    H = Math.ceil(hDev / s);
    if (!W || !H) return;
    canvas.width = W * s;
    canvas.height = H * s;
    lo.width = W;
    lo.height = H;
    canvas.dataset.escala = String(s);
    canvas.style.width = `${(W * s) / dpr}px`;
    canvas.style.height = `${(H * s) / dpr}px`;
    canvas.style.left = `${Math.floor((wDev - W * s) / 2) / dpr}px`;
    canvas.style.top = `${Math.floor((hDev - H * s) / 2) / dpr}px`;
    dibujar();
  }

  function tick(): void {
    t++;
    if (fxVida > 0) {
      fxVida--;
      fxT++;
      for (const f of fx) {
        if (fxKind === 'jugar') {
          f.y = fxGeo.base - 6 - Math.round(Math.abs(Math.sin(fxT * 0.9)) * 16);
          f.x += 1;
        } else if (fxKind === 'alimentar') f.y = Math.min(f.y + f.vy, fxGeo.sy + 24);
        else f.y += f.vy;
      }
      if (!fxVida) fx = [];
    }
    dibujar();
  }

  function arrancar(): void {
    clearInterval(timer);
    if (!reducir.matches) timer = window.setInterval(tick, FRAME_MS);
    dibujar();
  }
  reducir.addEventListener('change', arrancar);
  new ResizeObserver(layout).observe(escena);

  return {
    pintar(e: Estado, ahoraMs: number): void {
      estado = e;
      ahora = ahoraMs;
      if (!W) layout();
      else dibujar();
    },
    efecto(tipo: EfectoAccion): void {
      if (!estado || !W) return;
      const { sx, sy, base } = geo(!estado.dormida);
      fxGeo = { sy, base };
      fxKind = tipo;
      fxT = 0;
      fx = [];
      if (tipo === 'acariciar') for (let i = 0; i < 5; i++) fx.push({ k: 'heart', x: sx + 8 + i * 7, y: sy + 4 - (i % 2) * 4, vy: -2 });
      if (tipo === 'banar') for (let i = 0; i < 7; i++) fx.push({ k: 'bubble', x: sx + 6 + i * 5, y: sy + 30 - (i % 3) * 8, vy: -2 });
      if (tipo === 'alimentar') fx.push({ k: 'bone', x: sx + 20, y: reducir.matches ? sy + 24 : sy - 8, vy: 4 });
      if (tipo === 'jugar') fx.push({ k: 'ball', x: sx + 38, y: base - 6, vy: 0 });
      fxVida = reducir.matches ? 0 : 6;
      dibujar();
      if (reducir.matches) {
        clearTimeout(quitar);
        quitar = window.setTimeout(() => {
          fx = [];
          dibujar();
        }, FX_QUITAR_MS);
      }
    },
  };
}
