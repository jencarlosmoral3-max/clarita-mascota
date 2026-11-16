import { INICIAL, MAX, MIN } from './balance';

export type Estado = {
  version: number;
  comida: number;
  energia: number;
  higiene: number;
  diversion: number;
  carino: number;
  dormida: boolean;
  pijama: boolean;
  ultimaVez: number;
};

export const VERSION_ACTUAL = 1;

export function estadoInicial(ahora: number): Estado {
  return { version: VERSION_ACTUAL, ...INICIAL, dormida: false, pijama: false, ultimaVez: ahora };
}

const medidor = (v: unknown, porDefecto: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(MAX, Math.max(MIN, v)) : porDefecto;

const booleano = (v: unknown, porDefecto: boolean): boolean => (typeof v === 'boolean' ? v : porDefecto);

// Frontera de confianza: siempre devuelve un Estado válido, nunca lanza.
export function sanear(x: unknown, ahora: number): Estado {
  const o: Record<string, unknown> = typeof x === 'object' && x !== null ? (x as Record<string, unknown>) : {};
  const ini = estadoInicial(ahora);
  return {
    version: VERSION_ACTUAL,
    comida: medidor(o.comida, ini.comida),
    energia: medidor(o.energia, ini.energia),
    higiene: medidor(o.higiene, ini.higiene),
    diversion: medidor(o.diversion, ini.diversion),
    carino: medidor(o.carino, ini.carino),
    dormida: booleano(o.dormida, ini.dormida),
    pijama: booleano(o.pijama, ini.pijama),
    ultimaVez: typeof o.ultimaVez === 'number' && Number.isFinite(o.ultimaVez) ? o.ultimaVez : ahora,
  };
}
