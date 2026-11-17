import { dormitorio, esCielo, laguna, mascaraDither, nubes, type Nube } from '../arte/fondos';
import { FXP, PLUSH_PAL, SCN, paletaSprite } from '../arte/paleta';
import { FX, PLUSH, SEQ, SP, type Grilla } from '../arte/sprites';
import { animo } from '../logica/animo';
import {
  ANIM_TICK_MS,
  ANIM_Z_TICKS,
  DESTELLO_FASES,
  DESTELLO_UNO_DE_CADA,
  DESTELLO_PERIODO_TICKS,
  FX_BURBUJA,
  FX_CORAZON,
  FX_ESTRELLITA,
  FX_GOTA,
  FX_HUESO,
  FX_MIGA,
  FX_PELOTA,
  FX_QUITAR_MS,
  MARGEN_X,
  NUBES_TICKS_POR_PX,
  TITILEO_FASES,
  TITILEO_PERIODO_TICKS,
  TRANSICION_TICKS_POR_PASO,
} from '../logica/balance';
import type { Estado } from '../logica/estado';
import { esDeNoche } from '../logica/tiempo';
import { agregarParticulas, avanzar, crear, paso as pasoComp, pasoParticulas, reaccionar, vista, type Comp, type Particula, type Reaccion } from './comportamiento';

export type EfectoAccion = Reaccion;

const ANCHO_MIN = 96; // píxeles lógicos de ancho (el sprite mide 48): en un iPhone de 3x da el mismo encuadre que el mock
const ALTO_MIN = 56; // el sprite (48) más aire arriba; si la escena es baja, la escala baja

type Brillo = [x: number, y: number, fase: number, alt: number]; // alt: índice de paleta al que cambia
type Fondo = { clave: string; lugar: string; c: HTMLCanvasElement; estrellas: Brillo[]; agua: Brillo[]; cielo?: Uint8Array; nubes?: Nube[] }; // cielo/nubes: solo la laguna

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
  let fondo: Fondo | undefined;
  // Píxeles del fondo anterior y del nuevo (leídos una vez) y el búfer de mezcla; solo mientras dura la transición.
  let trans: { viejo: Uint8ClampedArray; nuevo: Uint8ClampedArray; out: ImageData } | undefined;
  let paso = 0; // transición dither: 0 = ninguna, 1..4
  let pasoTicks = 0;
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
  let comp: Comp | undefined;
  let fx: Particula[] = [];
  let quitar = 0;

  const geo = (laguna_: boolean) => {
    const base = Math.floor(H * (laguna_ ? 0.84 : 0.9));
    return { sx: Math.floor((W - 48) / 2), sy: base - 45, base };
  };

  // Rango de x del sprite (48 px) con margen a cada lado.
  const rango = () => ({ xmin: MARGEN_X, xmax: Math.max(MARGEN_X, W - 48 - MARGEN_X) });

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
      const estrellas: Brillo[] = [];
      const agua: Brillo[] = [];
      const cielo = lugar === 'laguna' ? new Uint8Array(W * H) : undefined;
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const v = g[y * W + x] ?? 0;
          fctx.fillStyle = bp[v] ?? '#000';
          fctx.fillRect(x, y, 1, 1);
          if (cielo && esCielo(v)) cielo[y * W + x] = 1;
          const estrella = lugar === 'laguna' ? v === 18 || v === 21 : v === 17 || v === 18;
          // La estrella se apaga al color del cielo vecino; la onda destella al tono claro 15.
          if (momento === 'night' && estrella) {
            // Vecino de cielo de degradado más cercano en la misma fila (izquierda primero); sin él, la estrella no titila.
            const fondoCielo = (n: number) => (lugar === 'laguna' ? n <= 3 : n === 16);
            let alt = -1;
            for (let d = 1; alt < 0 && (x - d >= 0 || x + d < W); d++) {
              if (x - d >= 0 && fondoCielo(g[y * W + x - d] ?? 99)) alt = g[y * W + x - d] ?? -1;
              else if (x + d < W && fondoCielo(g[y * W + x + d] ?? 99)) alt = g[y * W + x + d] ?? -1;
            }
            if (alt >= 0) estrellas.push([x, y, (x * 31 + y * 17) % TITILEO_FASES, alt]);
          } else if (lugar === 'laguna' && v === 11 && ((Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0) % DESTELLO_UNO_DE_CADA === 0) agua.push([x, y, (x * 31 + y * 17) % DESTELLO_FASES, 15]);
        }
      const viejo = fondo && fondo.lugar !== lugar && !reducir.matches && !document.hidden && fondo.c.width === W && fondo.c.height === H ? fondo.c.getContext('2d')?.getImageData(0, 0, W, H) : undefined;
      const nuevo = viejo ? fctx.getImageData(0, 0, W, H) : undefined;
      if (viejo && nuevo) {
        trans = { viejo: viejo.data, nuevo: nuevo.data, out: new ImageData(W, H) };
        paso = 1;
        pasoTicks = 0;
      } else {
        paso = 0;
        trans = undefined;
      }
      fondo = { clave, lugar, c, estrellas, agua, cielo, nubes: cielo && nubes(W, H) };
    }
    // Reducido: t no avanza y todo queda como en el fondo original (nubes en su sitio, sin titileo).
    const tt = reducir.matches ? 0 : t;
    const dx = Math.floor(tt / NUBES_TICKS_POR_PX);
    canvas.dataset.nubes = String(dx);
    canvas.dataset.transicion = String(paso);
    if (paso && trans) {
      // Mezcla dither (W×H) solo durante los 4 ticks de la transición; los píxeles ya están leídos.
      const { viejo, nuevo, out } = trans;
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const src = mascaraDither(x, y, paso) ? nuevo : viejo;
          for (let k = 0, i = (y * W + x) * 4; k < 4; k++) out.data[i + k] = src[i + k] ?? 0;
        }
      loCtx.putImageData(out, 0, 0);
    } else {
      loCtx.drawImage(fondo.c, 0, 0);
      const bp = SCN[lugar][momento];
      if (fondo.cielo && fondo.nubes) {
        // Píxel a píxel y solo sobre cielo: las montañas y la orilla tapan la nube.
        loCtx.fillStyle = bp[19] ?? '#fff';
        for (const n of fondo.nubes)
          for (const [rx, ry, w] of n.rects) {
            const y = n.y + ry;
            if (y < 0 || y >= H) continue;
            for (let i = 0; i < w; i++) {
              const x = (((n.x + rx + dx + i) % W) + W) % W; // envoltura sin salto
              if (fondo.cielo[y * W + x]) loCtx.fillRect(x, y, 1, 1);
            }
          }
      }
      const brillar = (lista: Brillo[], periodo: number, fases: number) => {
        const f = Math.floor(tt / periodo);
        for (const [x, y, s, alt] of lista)
          if ((f + s) % fases === 0) {
            loCtx.fillStyle = bp[alt] ?? '#000';
            loCtx.fillRect(x, y, 1, 1);
          }
      };
      if (!reducir.matches) {
        brillar(fondo.estrellas, TITILEO_PERIODO_TICKS, TITILEO_FASES);
        brillar(fondo.agua, DESTELLO_PERIODO_TICKS, DESTELLO_FASES);
      }
    }

    const { sx, sy, base } = geo(lugar === 'laguna');
    const an = animo(estado).animacion;
    comp ??= crear(sx, an);
    // Si el ánimo cambió desde el último tick (Dormir/Despertar), se adelanta ya: sin un cuadro con la x vieja.
    if (comp.anim !== an) comp = pasoComp(comp, { animacion: an, ...rango() }, Math.random);
    // Reducido: quieta en el centro con el frame base de su ánimo.
    const v = reducir.matches ? { frame: SEQ[an][0]?.f ?? 'idle0', x: sx, dx: 0, dy: 0, espejo: false, anim: an } : vista(comp);
    sprX = v.x;
    const frame = v.frame;
    if (lugar === 'dormitorio') blit(loCtx, PLUSH, PLUSH_PAL, sprX - 9, base - 6);
    if (pal?.pijama !== estado.pijama) pal = { pijama: estado.pijama, p: paletaSprite(estado.pijama) };
    canvas.dataset.frame = frame;
    canvas.dataset.fx = String(fx.length);
    canvas.dataset.x = String(sprX);
    canvas.dataset.anim = v.anim;
    const ck = `${frame}|${estado.pijama}`;
    let sc = sprites.get(ck);
    if (!sc) {
      sc = document.createElement('canvas');
      sc.width = 48;
      sc.height = 48;
      const sctx = sc.getContext('2d');
      if (sctx) {
        blit(sctx, SP[frame], pal.p, 0, 0);
        sprites.set(ck, sc);
      } else {
        sc = undefined;
      }
    }
    if (sc && v.espejo) {
      loCtx.save();
      loCtx.translate(sprX + v.dx + 48, sy + v.dy);
      loCtx.scale(-1, 1);
      loCtx.drawImage(sc, 0, 0);
      loCtx.restore();
    } else if (sc) loCtx.drawImage(sc, sprX + v.dx, sy + v.dy);
    else blit(loCtx, SP[frame], pal.p, sprX + v.dx, sy + v.dy);
    for (const f of fx) if (!f.espera) blit(loCtx, FX[f.k], FXP, Math.round(f.x), Math.round(f.y));
    if (an === 'dormida') {
      const p = Math.floor(t / ANIM_Z_TICKS) % 3;
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
    if (comp) comp = { ...comp, x: Math.min(Math.max(comp.x, rango().xmin), rango().xmax) };
    canvas.dataset.escala = String(s);
    canvas.style.width = `${(W * s) / dpr}px`;
    canvas.style.height = `${(H * s) / dpr}px`;
    canvas.style.left = `${Math.floor((wDev - W * s) / 2) / dpr}px`;
    canvas.style.top = `${Math.floor((hDev - H * s) / 2) / dpr}px`;
    dibujar();
  }

  function tick(): void {
    t++;
    if (paso && ++pasoTicks >= TRANSICION_TICKS_POR_PASO) {
      pasoTicks = 0;
      if (++paso > 4) {
        paso = 0;
        trans = undefined;
      }
    }
    if (comp && estado) comp = pasoComp(comp, { animacion: animo(estado).animacion, ...rango() }, Math.random);
    if (fx.length && estado) fx = pasoParticulas(fx, geo(!estado.dormida).base - 6);
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
  }

  function arrancar(): void {
    pararReloj();
    limpiarFx();
    paso = 0;
    trans = undefined;
    if (!reducir.matches && !document.hidden) arrancarReloj();
    dibujar();
  }
  reducir.addEventListener('change', arrancar);
  // En segundo plano no corre el reloj; al volver se reinicia sin saltos.
  document.addEventListener('visibilitychange', () => {
    if (reducir.matches) return;
    if (document.hidden) pararReloj();
    else {
      arrancarReloj();
      dibujar();
    }
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
      const { sy, base } = geo(!estado.dormida);
      const sx = sprX;
      const q = reducir.matches;
      if (comp && !q) comp = reaccionar(comp, tipo);
      const nuevas: Particula[] = [];
      const add = (k: Particula['k'], x: number, y: number, vx: number, vy: number, g: number, vida: number, extra?: Partial<Particula>) =>
        nuevas.push({ k, x, y, vx, vy, g, vida, ...extra });
      const estrellas = () => {
        for (let i = 0; i < FX_ESTRELLITA.n; i++) add('estrellita', sx + 8 + i * 9, sy + 2 + (i % 2) * 8, 0, FX_ESTRELLITA.vy, 0, FX_ESTRELLITA.vida);
      };
      if (tipo === 'acariciar') {
        for (let i = 0; i < FX_CORAZON.n; i++) add('heart', sx + 8 + i * 7, sy + 4 - (i % 2) * 4, 0, FX_CORAZON.vy, 0, FX_CORAZON.vida);
        estrellas();
      }
      if (tipo === 'banar') {
        for (let i = 0; i < FX_BURBUJA.n; i++) add('bubble', sx + 6 + i * 5, sy + 30 - (i % 3) * 8, 0, FX_BURBUJA.vy, 0, FX_BURBUJA.vida);
        for (let i = 0; i < FX_GOTA.n; i++) {
          const lado = i % 2 ? 1 : -1;
          add('gota', sx + 22 + lado * 14, sy + 30, lado * (FX_GOTA.vx + (i >> 1) * FX_GOTA.dvx), FX_GOTA.vy - (i % 3) * FX_GOTA.dvy, FX_GOTA.g, FX_GOTA.vida);
        }
      }
      if (tipo === 'alimentar') {
        const llega = Math.ceil((FX_HUESO.topeDy - FX_HUESO.desdeDy) / FX_HUESO.vy); // ticks que tarda el hueso en llegar a la boca
        add('bone', sx + 20, sy + (q ? FX_HUESO.topeDy : FX_HUESO.desdeDy), 0, FX_HUESO.vy, 0, FX_HUESO.vida, { tope: sy + FX_HUESO.topeDy });
        for (let i = 0; i < FX_MIGA.n; i++) add('miga', sx + 22, sy + FX_MIGA.dy, (i - (FX_MIGA.n - 1) / 2) * FX_MIGA.vx, FX_MIGA.vy - (i % 2) * FX_MIGA.dvy, FX_MIGA.g, FX_MIGA.vida, { espera: q ? 0 : llega });
      }
      if (tipo === 'jugar') {
        add('ball', sx + 38, base - 6, FX_PELOTA.vx, q ? 0 : FX_PELOTA.vy, FX_PELOTA.g, FX_PELOTA.vida, { rebota: true });
        estrellas();
      }
      clearTimeout(quitar);
      fx = q ? nuevas : agregarParticulas(fx, nuevas); // reducido: nada avanza, la lista se reemplaza
      dibujar();
      if (q) {
        quitar = window.setTimeout(() => {
          fx = [];
          dibujar();
        }, FX_QUITAR_MS);
      }
    },
  };
}
