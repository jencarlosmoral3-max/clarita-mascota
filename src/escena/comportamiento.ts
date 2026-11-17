import type { Efecto } from '../arte/sprites';
import { ANIM_MAX_TICKS_POR_VUELTA, ANIM_TICK_MS, FX_MAX } from '../logica/balance';

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
