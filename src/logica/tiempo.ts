import {
  HORA_FIN_NOCHE,
  HORA_INICIO_NOCHE,
  MAX,
  MS_POR_HORA,
  PISO,
  RITMO_DESPIERTA,
  RITMO_DORMIDA,
  TOPE_AUSENCIA_MS,
} from './balance';
import type { Estado } from './estado';

// Un medidor ya bajo el piso no sube por el piso; los aumentos topan en MAX.
const mover = (valor: number, cambio: number): number =>
  cambio < 0 ? Math.min(valor, Math.max(PISO, valor + cambio)) : Math.min(MAX, valor + cambio);

export function aplicarTiempo(estado: Estado, ahora: number): Estado {
  const delta = ahora - estado.ultimaVez;
  if (!(delta > 0)) return { ...estado, ultimaVez: ahora };
  const horas = Math.min(delta, TOPE_AUSENCIA_MS) / MS_POR_HORA;
  const r = estado.dormida ? RITMO_DORMIDA : RITMO_DESPIERTA;
  return {
    ...estado,
    comida: mover(estado.comida, r.comida * horas),
    energia: mover(estado.energia, r.energia * horas),
    higiene: mover(estado.higiene, r.higiene * horas),
    diversion: mover(estado.diversion, r.diversion * horas),
    ultimaVez: ahora,
  };
}

export function esDeNoche(ahora: number): boolean {
  const h = new Date(ahora).getHours();
  return h >= HORA_INICIO_NOCHE || h < HORA_FIN_NOCHE;
}
