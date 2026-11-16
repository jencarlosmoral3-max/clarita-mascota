import { estadoInicial, sanear, VERSION_ACTUAL, type Estado } from './estado';

export type Almacen = { getItem(k: string): string | null; setItem(k: string, v: string): void };

export const CLAVE = 'clarita.estado';

type Crudo = Record<string, unknown>;

// MIGRACIONES[n] lleva un dato de la versión n a la n+1.
const MIGRACIONES: Record<number, (o: Crudo) => Crudo> = {
  0: ({ hambre, ...resto }) => ({
    ...resto,
    ...(typeof hambre === 'number' && Number.isFinite(hambre) ? { comida: 100 - hambre } : {}),
    pijama: false,
    version: 1,
  }),
};

export function cargar(almacen: Almacen, ahora: number): { estado: Estado; soloLectura: boolean } {
  let texto: string | null = null;
  try {
    texto = almacen.getItem(CLAVE);
  } catch {
    texto = null;
  }
  if (texto === null) return { estado: estadoInicial(ahora), soloLectura: false };

  let dato: unknown;
  try {
    dato = JSON.parse(texto);
  } catch {
    dato = undefined;
  }
  if (typeof dato !== 'object' || dato === null || Array.isArray(dato)) {
    try {
      almacen.setItem(CLAVE + '.corrupto', texto);
    } catch {
      // sin espacio o modo privado: se empieza de cero igual
    }
    return { estado: estadoInicial(ahora), soloLectura: false };
  }

  let o = dato as Crudo;
  const v = o.version;
  let version = typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : 0;
  // Versión escrita por código más nuevo (rollback): no se pisa.
  if (version > VERSION_ACTUAL) return { estado: sanear(o, ahora), soloLectura: true };
  while (version < VERSION_ACTUAL) {
    o = MIGRACIONES[version]?.(o) ?? o;
    version++;
  }
  return { estado: sanear(o, ahora), soloLectura: false };
}

export function guardar(almacen: Almacen, estado: Estado, soloLectura: boolean): boolean {
  if (soloLectura) return false;
  try {
    almacen.setItem(CLAVE, JSON.stringify(estado));
    return true;
  } catch {
    return false;
  }
}
