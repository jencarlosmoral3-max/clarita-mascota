import { SEQ, type Efecto, type Frame, type Paso, type SeqNombre } from '../arte/sprites';
import type { Animo } from '../logica/animo';
import {
  ANIM_MAX_TICKS_POR_VUELTA,
  ANIM_TICK_MS,
  BOSTEZO_ESPERA_TICKS,
  FX_MAX,
  OCIO_CAMINAR_MIN_PX,
  OCIO_MAX_SIN_CAMINAR,
  OCIO_PAUSA_TICKS,
  OCIO_PESOS,
  OCIO_SENTADA_TICKS,
} from '../logica/balance';

// Suma dt al acumulador y devuelve cuántos pasos tocan (con tope) y el resto.
export function avanzar(acum: number, dt: number): [ticks: number, acum: number] {
  const total = acum + (Number.isFinite(dt) && dt > 0 ? dt : 0);
  const n = Math.floor(total / ANIM_TICK_MS);
  if (n > ANIM_MAX_TICKS_POR_VUELTA) return [ANIM_MAX_TICKS_POR_VUELTA, total % ANIM_TICK_MS]; // descarta la deuda
  return [n, total - n * ANIM_TICK_MS];
}

// vx, vy y g en px por tick. rebota: al llegar a suelo invierte la vy de llegada. tope: y máxima; al tocarla se queda quieta.
// espera: ticks que faltan para aparecer; mientras > 0 no se mueve, no envejece y no se dibuja.
export type Particula = { k: Efecto; x: number; y: number; vx: number; vy: number; g: number; vida: number; rebota?: boolean; tope?: number; espera?: number };

// Un tick: mueve, aplica gravedad, descuenta vida y elimina las que se acaban.
export function pasoParticulas(lista: readonly Particula[], suelo: number): Particula[] {
  const out: Particula[] = [];
  for (const p of lista) {
    if (p.espera) {
      out.push({ ...p, espera: p.espera - 1 });
      continue;
    }
    const q = { ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + p.g, vida: p.vida - 1 };
    if (q.vida <= 0) continue;
    if (q.rebota && q.vy > 0 && q.y >= suelo) {
      q.y = suelo;
      q.vy = -p.vy; // la de llegada, no la ya incrementada: no gana energía
    }
    if (q.tope !== undefined && q.y >= q.tope) {
      q.y = q.tope;
      q.vy = 0;
      q.g = 0;
    }
    out.push(q);
  }
  return out;
}

// Agrega partículas respetando FX_MAX: descarta las más viejas.
export function agregarParticulas(lista: readonly Particula[], nuevas: readonly Particula[]): Particula[] {
  return [...lista, ...nuevas].slice(-FX_MAX);
}

// ---- Comportamiento de Clarita: máquina de estados pura (sin DOM; el azar entra por rng) ----

export type Reaccion = 'alimentar' | 'jugar' | 'banar' | 'acariciar';
const REACCION: Record<Reaccion, SeqNombre> = { alimentar: 'comer', jugar: 'jugar', banar: 'sacudirse', acariciar: 'feliz' };

export type Comp = {
  x: number;
  anim: Animo['animacion']; // la que se le pasó la última vez a paso()
  modo: 'ocio' | 'reaccion' | 'bostezo';
  seq: SeqNombre;
  t: number; // ticks dentro de seq; negativo: espera de la transición al dormitorio
  dur: number; // ticks que dura el acto/pausa/reacción actual
  dest: number;
  dir: 1 | -1;
  sin: number; // ticks seguidos sin caminar
  espejo: boolean;
};
export type Entorno = { animacion: Animo['animacion']; xmin: number; xmax: number };

// mulberry32: generador determinista para pruebas y capturas.
export function mulberry32(a: number): () => number {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ciclo = (seq: SeqNombre): number => SEQ[seq].reduce((a, p) => a + p.t, 0);
const entre = (r: readonly [number, number], rng: () => number): number => r[0] + Math.floor(rng() * (r[1] - r[0] + 1));
const fijar = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

// Como frameEn, pero devuelve el paso completo (con dx/dy).
export function pasoEn(seq: readonly Paso[], tick: number): Paso {
  const total = seq.reduce((a, p) => a + p.t, 0);
  let r = total > 0 ? ((tick % total) + total) % total : 0;
  for (const p of seq) {
    if (r < p.t) return p;
    r -= p.t;
  }
  return seq[0] ?? { f: 'idle0', t: 1 };
}

export function crear(x: number, animacion: Animo['animacion'] = 'reposo'): Comp {
  return { x, anim: animacion, modo: 'ocio', seq: animacion === 'reposo' ? 'reposo' : animacion, t: 0, dur: OCIO_PAUSA_TICKS[0], dest: x, dir: 1, sin: 0, espejo: false };
}

function descansar(n: Comp, rng: () => number): void {
  n.seq = 'reposo';
  n.t = 0;
  n.dur = entre(OCIO_PAUSA_TICKS, rng);
}

function sortear(rng: () => number): keyof typeof OCIO_PESOS {
  const pesos = Object.entries(OCIO_PESOS) as [keyof typeof OCIO_PESOS, number][];
  let r = rng() * pesos.reduce((a, [, p]) => a + p, 0);
  for (const [k, p] of pesos) {
    if (r < p) return k;
    r -= p;
  }
  return 'caminar';
}

function elegir(n: Comp, e: Entorno, rng: () => number): void {
  const k = n.sin >= OCIO_MAX_SIN_CAMINAR ? 'caminar' : sortear(rng);
  if (k !== 'caminar') {
    n.seq = k;
    n.t = 0;
    n.dur = k === 'sentada' ? entre(OCIO_SENTADA_TICKS, rng) : ciclo(k);
    return;
  }
  let d = e.xmin + Math.floor(rng() * (e.xmax - e.xmin + 1));
  if (Math.abs(d - n.x) < OCIO_CAMINAR_MIN_PX) d = n.x - e.xmin > e.xmax - n.x ? e.xmin : e.xmax;
  if (d === n.x) return descansar(n, rng);
  n.seq = 'caminar';
  n.t = 0;
  n.sin = 0;
  n.dest = d;
  n.dir = d > n.x ? 1 : -1;
  n.espejo = n.dir > 0;
}

// Un tick (100 ms). Devuelve un estado nuevo.
export function paso(c: Comp, e: Entorno, rng: () => number): Comp {
  const n = { ...c };
  if (e.animacion !== n.anim) {
    n.anim = e.animacion;
    n.modo = 'ocio';
    n.t = 0;
    if (n.anim === 'dormida') {
      n.modo = 'bostezo';
      n.seq = 'bostezo';
      n.t = -BOSTEZO_ESPERA_TICKS;
      n.dur = ciclo('bostezo');
      n.espejo = false;
    } else if (n.anim === 'triste') n.seq = 'triste';
    else descansar(n, rng);
  } else n.t++;
  n.x = n.anim === 'dormida' ? Math.floor((e.xmin + e.xmax) / 2) : fijar(n.x, e.xmin, e.xmax);
  if (n.modo === 'bostezo') {
    if (n.t >= n.dur) Object.assign(n, { modo: 'ocio', seq: 'dormida', t: 0 });
  } else if (n.modo === 'reaccion') {
    if (n.t >= n.dur) {
      n.modo = 'ocio';
      n.t = 0;
      if (n.anim === 'triste') n.seq = 'triste';
      else descansar(n, rng);
    }
  } else if (n.anim === 'reposo') {
    if (n.seq !== 'caminar') n.sin++;
    if (n.seq === 'caminar') {
      n.dest = fijar(n.dest, e.xmin, e.xmax);
      n.x += n.dir;
      if (n.dir > 0 ? n.x >= n.dest : n.x <= n.dest) {
        n.x = n.dest;
        descansar(n, rng);
      }
    } else if (n.t >= n.dur) {
      if (n.seq === 'reposo') elegir(n, e, rng);
      else descansar(n, rng);
    }
  }
  return n;
}

// Interrumpe el ocio y congela x mientras dura. Dormida no reacciona.
export function reaccionar(c: Comp, tipo: Reaccion): Comp {
  if (c.anim === 'dormida') return c;
  const seq = REACCION[tipo];
  return { ...c, modo: 'reaccion', seq, t: 0, dur: ciclo(seq) };
}

export function vista(c: Comp): { frame: Frame; x: number; dx: number; dy: number; espejo: boolean; anim: SeqNombre } {
  const anim: SeqNombre = c.t < 0 ? 'dormida' : c.seq;
  const p = pasoEn(SEQ[anim], Math.max(c.t, 0));
  return { frame: p.f, x: c.x, dx: p.dx ?? 0, dy: p.dy ?? 0, espejo: c.espejo, anim };
}
