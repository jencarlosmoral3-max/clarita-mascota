import { ANIM_MAX_TICKS_POR_VUELTA, ANIM_TICK_MS } from '../logica/balance';

// Suma dt al acumulador y devuelve cuántos pasos tocan (con tope) y el resto.
export function avanzar(acum: number, dt: number): [ticks: number, acum: number] {
  const total = acum + (Number.isFinite(dt) && dt > 0 ? dt : 0);
  const n = Math.floor(total / ANIM_TICK_MS);
  if (n > ANIM_MAX_TICKS_POR_VUELTA) return [ANIM_MAX_TICKS_POR_VUELTA, total % ANIM_TICK_MS]; // descarta la deuda
  return [n, total - n * ANIM_TICK_MS];
}
