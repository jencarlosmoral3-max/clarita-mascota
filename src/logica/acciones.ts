import {
  CARINO_POR_CUIDADO,
  COSTO_ACCION,
  ENERGIA_MIN_JUGAR,
  LLENO,
  MAX,
  SUBIDA_COMIDA,
  SUBIDA_DIVERSION,
  SUBIDA_DIVERSION_ACARICIAR,
  SUBIDA_HIGIENE,
  UMBRAL_CUIDADO_UTIL,
} from './balance';
import type { Estado } from './estado';
import { mover } from './tiempo';

export type Accion = 'alimentar' | 'jugar' | 'banar' | 'dormir' | 'despertar' | 'acariciar' | 'alternarPijama';

// Única fuente de verdad: la UI la usa para deshabilitar botones.
export function puede(estado: Estado, accion: Accion): boolean {
  if (accion === 'alternarPijama') return true;
  if (accion === 'despertar') return estado.dormida;
  if (estado.dormida) return false;
  if (accion === 'alimentar') return estado.comida < LLENO;
  if (accion === 'jugar') return estado.energia >= ENERGIA_MIN_JUGAR && estado.diversion < LLENO;
  if (accion === 'banar') return estado.higiene < LLENO;
  return true;
}

const tope = (v: number): number => Math.min(MAX, v);
const conCarino = (e: Estado, previo: number): number =>
  previo < UMBRAL_CUIDADO_UTIL ? tope(e.carino + CARINO_POR_CUIDADO) : e.carino;

const cobrar = (e: Estado, accion: keyof typeof COSTO_ACCION): Estado => {
  const r = { ...e };
  for (const [k, cambio] of Object.entries(COSTO_ACCION[accion]) as [keyof typeof r & string, number][]) {
    (r[k] as number) = mover(r[k] as number, cambio);
  }
  return r;
};

export const alimentar = (e: Estado): Estado =>
  puede(e, 'alimentar')
    ? cobrar({ ...e, comida: tope(e.comida + SUBIDA_COMIDA), carino: conCarino(e, e.comida) }, 'alimentar')
    : e;

export const jugar = (e: Estado): Estado =>
  puede(e, 'jugar')
    ? cobrar({ ...e, diversion: tope(e.diversion + SUBIDA_DIVERSION), carino: conCarino(e, e.diversion) }, 'jugar')
    : e;

export const banar = (e: Estado): Estado =>
  puede(e, 'banar')
    ? cobrar({ ...e, higiene: tope(e.higiene + SUBIDA_HIGIENE), carino: conCarino(e, e.higiene) }, 'banar')
    : e;

export const acariciar = (e: Estado): Estado =>
  puede(e, 'acariciar')
    ? { ...e, diversion: tope(e.diversion + SUBIDA_DIVERSION_ACARICIAR), carino: conCarino(e, e.diversion) }
    : e;

export const dormir = (e: Estado): Estado => (puede(e, 'dormir') ? { ...e, dormida: true } : e);

export const despertar = (e: Estado): Estado => (puede(e, 'despertar') ? { ...e, dormida: false } : e);

export const alternarPijama = (e: Estado): Estado => ({ ...e, pijama: !e.pijama });
