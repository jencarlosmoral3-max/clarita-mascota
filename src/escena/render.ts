import { dormitorio, laguna } from '../arte/fondos';
import { FXP, PLUSH_PAL, SCN, paletaSprite } from '../arte/paleta';
import { FX, PLUSH, SEQ, SP, frameEn, type Efecto, type Frame, type Grilla } from '../arte/sprites';
import { animo } from '../logica/animo';
import { ANIM_TICKS_POR_PASO_ANTIGUO as K, ANIM_TICK_MS, FX_QUITAR_MS, FX_VIDA_TICKS } from '../logica/balance';
import type { Estado } from '../logica/estado';
import { esDeNoche } from '../logica/tiempo';
import { avanzar } from './comportamiento';

export type EfectoAccion = 'alimentar' | 'jugar' | 'banar' | 'acariciar';

const ANCHO_MIN = 96; // píxeles lógicos de ancho (el sprite mide 48): en un iPhone de 3x da el mismo encuadre que el mock
const ALTO_MIN = 56; // el sprite (48) más aire arriba; si la escena es baja, la escala baja

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
  // Solo la última entrada de cada cosa: fondo ya pintado y paleta del sprite.
  let fondo: { clave: string; c: HTMLCanvasElement } | undefined;
  let pal: { pijama: boolean; p: string[] } | undefined;
  const sprites = new Map<string, HTMLCanvasElement>(); // frame|pijama ya pintado en 48x48

  let estado: Estado | undefined;
  let ahora = 0;
  let W = 0;
  let H = 0;
  let t = 0;
  let timer = 0;
  let raf = 0;
  let ultimo = 0;
  let acum = 0;
  let sprX = 0;
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
    if (!ctx || !loCtx || !estado || !W || !H) return;
    const lugar = estado.dormida ? 'dormitorio' : 'laguna';
    const momento = esDeNoche(ahora) ? 'night' : 'day';
    const clave = `${lugar}|${momento}|${W}x${H}`;
    if (fondo?.clave !== clave) {
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const fctx = c.getContext('2d');
      if (!fctx) return;
      const g = (lugar === 'laguna' ? laguna : dormitorio)(W, H);
      const bp = SCN[lugar][momento];
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          fctx.fillStyle = bp[g[y * W + x] ?? 0] ?? '#000';
          fctx.fillRect(x, y, 1, 1);
        }
      fondo = { clave, c };
    }
    loCtx.drawImage(fondo.c, 0, 0);

    const { sx, sy, base } = geo(lugar === 'laguna');
    const an = animo(estado).animacion;
    const secuencia = SEQ[an];
    sprX = sx;
    const bob = fx.length > 0 && (fxKind === 'alimentar' || fxKind === 'jugar') && (an === 'reposo' || an === 'triste');
    const frame: Frame = bob ? (Math.floor(t / K) % 2 ? 'idle1' : 'idle0') : frameEn(secuencia, t);
    if (lugar === 'dormitorio') blit(loCtx, PLUSH, PLUSH_PAL, sx - 9, base - 6);
    if (pal?.pijama !== estado.pijama) pal = { pijama: estado.pijama, p: paletaSprite(estado.pijama) };
    canvas.dataset.frame = frame;
    canvas.dataset.fx = String(fx.length);
    canvas.dataset.x = String(sprX);
    const ck = `${frame}|${estado.pijama}`;
    let sc = sprites.get(ck);
    if (!sc) {
      sc = document.createElement('canvas');
      sc.width = 48;
      sc.height = 48;
      const sctx = sc.getContext('2d');
      if (sctx) blit(sctx, SP[frame], pal.p, 0, 0);
      sprites.set(ck, sc);
    }
    loCtx.drawImage(sc, sprX, sy);
    for (const f of fx) blit(loCtx, FX[f.k], FXP, Math.round(f.x), Math.round(f.y));
    if (an === 'dormida') {
      const p = Math.floor(t / (2 * K)) % 3;
      for (let i = 0; i < 3; i++) blit(loCtx, FX.z, FXP, sprX + 36 + i * 5, sy + 8 - ((p + i) % 3) * 6);
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
    const w = Math.ceil(wDev / s); // ceil: el sobrante se recorta, sin franja vacía
    const h = Math.ceil(hDev / s);
    if (!w || !h) return;
    W = w;
    H = h;
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
          f.y = fxGeo.base - 6 - Math.round(Math.abs(Math.sin((fxT * 0.9) / K)) * 16);
          f.x += 1 / K;
        } else if (fxKind === 'alimentar') f.y = Math.min(f.y + f.vy / K, fxGeo.sy + 24);
        else f.y += f.vy / K;
      }
      if (!fxVida) fx = [];
    }
  }

  // Reloj: setTimeout encadenado que mide el tiempo real; dibuja (un rAF) solo si hubo ticks.
  function vuelta(): void {
    const ahoraT = performance.now();
    const [n, resto] = avanzar(acum, ahoraT - ultimo);
    ultimo = ahoraT;
    acum = resto;
    for (let i = 0; i < n; i++) tick();
    if (n > 0) {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(dibujar);
    }
    timer = window.setTimeout(vuelta, ANIM_TICK_MS);
  }

  function pararReloj(): void {
    clearTimeout(timer);
    cancelAnimationFrame(raf);
  }

  function arrancarReloj(): void {
    pararReloj();
    ultimo = performance.now();
    acum = 0;
    timer = window.setTimeout(vuelta, ANIM_TICK_MS);
  }

  function limpiarFx(): void {
    clearTimeout(quitar);
    fx = [];
    fxVida = 0;
  }

  function arrancar(): void {
    pararReloj();
    limpiarFx();
    if (!reducir.matches && !document.hidden) arrancarReloj();
    dibujar();
  }
  reducir.addEventListener('change', arrancar);
  // En segundo plano no corre el reloj; al volver se reinicia sin saltos.
  document.addEventListener('visibilitychange', () => {
    if (reducir.matches) return;
    if (document.hidden) pararReloj();
    else arrancarReloj();
  });
  arrancar();
  new ResizeObserver(layout).observe(escena);

  return {
    pintar(e: Estado, ahoraMs: number): void {
      if (estado && estado.dormida !== e.dormida) limpiarFx();
      estado = e;
      ahora = ahoraMs;
      if (!W) layout();
      else dibujar();
    },
    tocaSprite(clientX: number, clientY: number): boolean {
      if (!estado || !W || !H) return false;
      const r = canvas.getBoundingClientRect();
      const x = ((clientX - r.left) / r.width) * W;
      const y = ((clientY - r.top) / r.height) * H;
      const { sy } = geo(!estado.dormida);
      return x >= sprX && x < sprX + 48 && y >= sy && y < sy + 48;
    },
    efecto(tipo: EfectoAccion): void {
      if (!estado || !W) return;
      const { sx, sy, base } = geo(!estado.dormida);
      clearTimeout(quitar);
      fxGeo = { sy, base };
      fxKind = tipo;
      fxT = 0;
      fx = [];
      if (tipo === 'acariciar') for (let i = 0; i < 5; i++) fx.push({ k: 'heart', x: sx + 8 + i * 7, y: sy + 4 - (i % 2) * 4, vy: -2 });
      if (tipo === 'banar') for (let i = 0; i < 7; i++) fx.push({ k: 'bubble', x: sx + 6 + i * 5, y: sy + 30 - (i % 3) * 8, vy: -2 });
      if (tipo === 'alimentar') fx.push({ k: 'bone', x: sx + 20, y: reducir.matches ? sy + 24 : sy - 8, vy: 4 });
      if (tipo === 'jugar') fx.push({ k: 'ball', x: sx + 38, y: base - 6, vy: 0 });
      fxVida = reducir.matches ? 0 : FX_VIDA_TICKS;
      dibujar();
      if (reducir.matches) {
        quitar = window.setTimeout(() => {
          fx = [];
          dibujar();
        }, FX_QUITAR_MS);
      }
    },
  };
}
