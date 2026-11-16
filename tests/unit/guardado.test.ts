import { describe, expect, test } from 'vitest';
import { estadoInicial, VERSION_ACTUAL } from '../../src/logica/estado';
import { CLAVE, cargar, guardar, type Almacen } from '../../src/logica/guardado';

const AHORA = 1_700_000_000_000;

function falso(inicial: Record<string, string> = {}) {
  const datos = new Map(Object.entries(inicial));
  const almacen: Almacen = {
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => void datos.set(k, v),
  };
  return { almacen, datos };
}

describe('cargar', () => {
  test('sin dato: estado inicial', () => {
    const { almacen } = falso();
    expect(cargar(almacen, AHORA)).toEqual({ estado: estadoInicial(AHORA), soloLectura: false });
  });
  test('ida y vuelta', () => {
    const { almacen } = falso();
    const e = { ...estadoInicial(5), comida: 12.5, dormida: true, pijama: true, carino: 77 };
    expect(guardar(almacen, e, false)).toBe(true);
    expect(cargar(almacen, AHORA)).toEqual({ estado: e, soloLectura: false });
  });
  test('JSON corrupto: copia cruda en .corrupto y empieza de cero', () => {
    const { almacen, datos } = falso({ [CLAVE]: '{roto' });
    expect(cargar(almacen, AHORA)).toEqual({ estado: estadoInicial(AHORA), soloLectura: false });
    expect(datos.get(CLAVE + '.corrupto')).toBe('{roto');
  });
  test.each(['null', '5', '[]', '"hola"'])('no-objeto %s', (crudo) => {
    const { almacen, datos } = falso({ [CLAVE]: crudo });
    expect(cargar(almacen, AHORA).estado).toEqual(estadoInicial(AHORA));
    expect(datos.get(CLAVE + '.corrupto')).toBe(crudo);
  });
  test('si la copia .corrupto falla, igual empieza de cero', () => {
    const almacen: Almacen = {
      getItem: () => '{roto',
      setItem: () => {
        throw new Error('cuota');
      },
    };
    expect(cargar(almacen, AHORA).estado).toEqual(estadoInicial(AHORA));
  });
  test('NaN, strings y fuera de rango se sanean', () => {
    const { almacen } = falso({
      [CLAVE]: JSON.stringify({
        version: 1,
        comida: 500,
        energia: -20,
        higiene: 'mucha',
        diversion: null,
        carino: 55,
        dormida: 'si',
        pijama: true,
        ultimaVez: 'ayer',
      }),
    });
    const { estado, soloLectura } = cargar(almacen, AHORA);
    const ini = estadoInicial(AHORA);
    expect(soloLectura).toBe(false);
    expect(estado).toEqual({
      ...ini,
      comida: 100,
      energia: 0,
      higiene: ini.higiene,
      diversion: ini.diversion,
      carino: 55,
      dormida: false,
      pijama: true,
      ultimaVez: AHORA,
    });
  });
  test('migración v0 -> v1: hambre invertida, pijama false', () => {
    const { almacen } = falso({
      [CLAVE]: JSON.stringify({ hambre: 30, energia: 60, higiene: 50, diversion: 40, carino: 20, dormida: true, ultimaVez: 99 }),
    });
    const { estado, soloLectura } = cargar(almacen, AHORA);
    expect(soloLectura).toBe(false);
    expect(estado).toEqual({
      version: VERSION_ACTUAL,
      comida: 70,
      energia: 60,
      higiene: 50,
      diversion: 40,
      carino: 20,
      dormida: true,
      pijama: false,
      ultimaVez: 99,
    });
  });
  test('versión futura: soloLectura y guardar no escribe', () => {
    const crudo = JSON.stringify({ version: 99, comida: 42, campoNuevo: 1 });
    const { almacen, datos } = falso({ [CLAVE]: crudo });
    const { estado, soloLectura } = cargar(almacen, AHORA);
    expect(soloLectura).toBe(true);
    expect(estado.comida).toBe(42);
    expect(guardar(almacen, estado, soloLectura)).toBe(false);
    expect(datos.get(CLAVE)).toBe(crudo);
  });
  test('getItem que lanza: solo lectura y guardar no pisa la partida', () => {
    let escrituras = 0;
    const almacen: Almacen = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        escrituras++;
      },
    };
    const r = cargar(almacen, AHORA);
    expect(r).toEqual({ estado: estadoInicial(AHORA), soloLectura: true });
    expect(guardar(almacen, r.estado, r.soloLectura)).toBe(false);
    expect(escrituras).toBe(0);
  });
});

describe('guardar', () => {
  test('setItem que lanza: devuelve false sin lanzar', () => {
    const almacen: Almacen = {
      getItem: () => null,
      setItem: () => {
        throw new Error('cuota');
      },
    };
    expect(guardar(almacen, estadoInicial(AHORA), false)).toBe(false);
  });
});
