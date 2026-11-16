import {
  CARINO_POR_CUIDADO,
  MAX,
  SUBIDA_COMIDA,
  SUBIDA_DIVERSION,
  SUBIDA_DIVERSION_ACARICIAR,
  SUBIDA_HIGIENE,
  UMBRAL_CUIDADO_UTIL,
} from './balance';
import type { Estado } from './estado';

export type Accion = 'alimentar' | 'jugar' | 'banar' | 'dormir' | 'despertar' | 'acariciar' | 'alternarPijama';

// Única fuente de verdad: la UI la usa para deshabilitar botones.
export function puede(estado: Estado, accion: Accion): boolean {
  if (accion === 'alternarPijama') return true;
  if (accion === 'despertar') return estado.dormida;
  return !estado.dormida;
}

const tope = (v: number): number => Math.min(MAX, v);
const conCarino = (e: Estado, previo: number): number =>
  previo < UMBRAL_CUIDADO_UTIL ? tope(e.carino + CARINO_POR_CUIDADO) : e.carino;

export const alimentar = (e: Estado): Estado =>
  puede(e, 'alimentar') ? { ...e, comida: tope(SUBIDA_COMIDA), carino: conCarino(e, e.comida) } : e;

export const jugar = (e: Estado): Estado =>
  puede(e, 'jugar') ? { ...e, diversion: tope(SUBIDA_DIVERSION), carino: conCarino(e, e.diversion) } : e;

export const banar = (e: Estado): Estado =>
  puede(e, 'banar') ? { ...e, higiene: tope(SUBIDA_HIGIENE), carino: conCarino(e, e.higiene) } : e;

export const acariciar = (e: Estado): Estado =>
  puede(e, 'acariciar')
    ? { ...e, diversion: tope(e.diversion + SUBIDA_DIVERSION_ACARICIAR), carino: conCarino(e, e.diversion) }
    : e;

export const dormir = (e: Estado): Estado => (puede(e, 'dormir') ? { ...e, dormida: true } : e);

export const despertar = (e: Estado): Estado => (puede(e, 'despertar') ? { ...e, dormida: false } : e);

export const alternarPijama = (e: Estado): Estado => ({ ...e, pijama: !e.pijama });
