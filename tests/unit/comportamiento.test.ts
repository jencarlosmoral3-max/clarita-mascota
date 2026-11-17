import { describe, expect, it, vi } from 'vitest';
import { SEQ, SP } from '../../src/arte/sprites';
import { agregarParticulas, avanzar, crear, mulberry32, paso, pasoParticulas, reaccionar, vista, type Comp, type Entorno, type Particula } from '../../src/escena/comportamiento';
import { ANIM_MAX_TICKS_POR_VUELTA, ANIM_TICK_MS, FX_HUESO, FX_MAX, FX_PELOTA, OCIO_CAMINAR_MIN_PX, OCIO_MAX_SIN_CAMINAR } from '../../src/logica/balance';

describe('avanzar', () => {
  it('dt 0: sin ticks', () => expect(avanzar(0, 0)).toEqual([0, 0]));
  it('dt 100: un tick', () => expect(avanzar(0, 100)).toEqual([1, 0]));
  it('dt 250: dos ticks y resto 50', () => expect(avanzar(0, 250)).toEqual([2, 50]));
  it('conserva el resto entre llamadas', () => expect(avanzar(50, 60)).toEqual([1, 10]));
  it('dt enorme: tope de ticks y resto menor que un tick', () => {
    const [n, r] = avanzar(0, 5000);
    expect(n).toBe(ANIM_MAX_TICKS_POR_VUELTA);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThan(ANIM_TICK_MS);
  });
  it('dt negativo o NaN cuenta como 0', () => {
    expect(avanzar(20, -500)).toEqual([0, 20]);
    expect(avanzar(20, NaN)).toEqual([0, 20]);
    expect(avanzar(20, Infinity)).toEqual([0, 20]);
  });
});

describe('pasoParticulas', () => {
  const p = (extra: Partial<Particula> = {}): Particula => ({ k: 'miga', x: 10, y: 20, vx: 1, vy: -2, g: 0.5, vida: 3, ...extra });
  it('mueve, acumula gravedad y descuenta vida', () => {
    const [a] = pasoParticulas([p()], 100);
    expect(a).toMatchObject({ x: 11, y: 18, vy: -1.5, vida: 2 });
    expect(pasoParticulas([a as Particula], 100)[0]).toMatchObject({ y: 16.5, vy: -1 });
  });
  it('elimina cuando la vida llega a 0', () => {
    expect(pasoParticulas([p({ vida: 1 })], 100)).toEqual([]);
    expect(pasoParticulas([p({ vida: 2 }), p({ vida: 1 })], 100)).toHaveLength(1);
  });
  it('rebota en el suelo invirtiendo vy', () => {
    const [a] = pasoParticulas([p({ k: 'ball', y: 99, vy: 2, g: 0, rebota: true })], 100);
    expect(a).toMatchObject({ y: 100, vy: -2 });
  });
  it('rebote con gravedad: la altura de cada bote no supera la del anterior', () => {
    let l: Particula[] = [p({ k: 'ball', x: 0, y: 100, vx: 0, vy: FX_PELOTA.vy, g: FX_PELOTA.g, vida: FX_PELOTA.vida, rebota: true })];
    const alturas: number[] = [];
    let min = 100;
    while (l[0]) {
      const y = l[0].y;
      l = pasoParticulas(l, 100);
      if (!l[0]) break;
      min = Math.min(min, l[0].y);
      if (l[0].y === 100 && y < 100) {
        alturas.push(100 - min);
        min = 100;
      }
    }
    expect(alturas.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < alturas.length; i++) expect(alturas[i]).toBeLessThanOrEqual(alturas[i - 1] as number);
  });
  it('espera: no se mueve ni envejece, solo descuenta', () => {
    const q = p({ espera: 2 });
    const [a] = pasoParticulas([q], 100);
    expect(a).toEqual({ ...q, espera: 1 });
    const [b] = pasoParticulas([a as Particula], 100);
    expect(b).toMatchObject({ x: 10, y: 20, vida: 3, espera: 0 });
    expect(pasoParticulas([b as Particula], 100)[0]).toMatchObject({ x: 11, y: 18, vida: 2 });
  });
  it('sin rebota atraviesa el suelo; con tope se detiene', () => {
    expect(pasoParticulas([p({ y: 99, vy: 2, g: 0 })], 100)[0]?.y).toBe(101);
    expect(pasoParticulas([p({ y: 99, vy: 2, g: 0, tope: 100 })], 100)[0]).toMatchObject({ y: 100, vy: 0 });
  });
  it('agregar respeta el tope y descarta las más viejas', () => {
    const viejas = Array.from({ length: FX_MAX }, (_, i) => p({ x: i }));
    const r = agregarParticulas(viejas, [p({ x: 500 }), p({ x: 501 })]);
    expect(r).toHaveLength(FX_MAX);
    expect(r[0]?.x).toBe(2);
    expect(r.at(-1)?.x).toBe(501);
  });
});

describe('comportamiento', () => {
  const E: Entorno = { animacion: 'reposo', xmin: 4, xmax: 44 };
  const correr = (c: Comp, n: number, e: Entorno, rng: () => number, cada?: (c: Comp) => void): Comp => {
    for (let i = 0; i < n; i++) {
      c = paso(c, e, rng);
      cada?.(c);
    }
    return c;
  };

  it('x siempre en [xmin, xmax] durante 10.000 ticks y todo frame existe en SP', () => {
    correr(crear(24), 10000, E, mulberry32(1), (c) => {
      expect(c.x).toBeGreaterThanOrEqual(E.xmin);
      expect(c.x).toBeLessThanOrEqual(E.xmax);
      expect(SP[vista(c).frame]).toBeDefined();
    });
  });

  it('misma semilla, misma trayectoria', () => {
    const tr = (sem: number) => {
      const xs: number[] = [];
      correr(crear(24), 2000, E, mulberry32(sem), (c) => xs.push(c.x));
      return xs;
    };
    expect(tr(7)).toEqual(tr(7));
    expect(tr(7)).not.toEqual(tr(8));
  });

  it('camina al menos una vez cada OCIO_MAX_SIN_CAMINAR (más un acto y una pausa)', () => {
    let sin = 0;
    let max = 0;
    let caminos = 0;
    correr(crear(24), 20000, E, mulberry32(3), (c) => {
      sin = c.seq === 'caminar' ? 0 : sin + 1;
      if (c.seq === 'caminar' && vista(c).anim === 'caminar') caminos++;
      max = Math.max(max, sin);
    });
    expect(caminos).toBeGreaterThan(0);
    expect(max).toBeLessThanOrEqual(OCIO_MAX_SIN_CAMINAR + 150);
  });

  it('triste se queda donde está y dormida va al centro, sin ocio', () => {
    const t = correr(crear(10), 3000, { ...E, animacion: 'triste' }, mulberry32(2), (c) => {
      expect(c.x).toBe(10);
      expect(vista(c).anim).toBe('triste');
    });
    expect(t.x).toBe(10);
    const d = correr(crear(10), 3000, { ...E, animacion: 'dormida' }, mulberry32(2), (c) => expect(c.x).toBe(24));
    expect(vista(d).anim).toBe('dormida');
  });

  it('dormir: espera la transición, bosteza una vez y queda dormida; despertar va a reposo', () => {
    const anims: string[] = [];
    let c = correr(crear(10), 200, { ...E, animacion: 'dormida' }, mulberry32(4), (c) => anims.push(vista(c).anim));
    expect(anims.filter((a, i) => a === 'bostezo' && anims[i - 1] !== 'bostezo')).toHaveLength(1);
    expect(anims[0]).toBe('dormida');
    expect(anims.at(-1)).toBe('dormida');
    c = paso(c, E, mulberry32(4));
    expect(vista(c).anim).toBe('reposo');
  });

  it('una reacción congela x y al terminar vuelve al ocio; la nueva reemplaza a la anterior', () => {
    const rng = mulberry32(5);
    let c = correr(crear(24), 50, E, rng);
    c = reaccionar(c, 'alimentar');
    const x0 = c.x;
    expect(vista(c).anim).toBe('comer');
    let n = 0;
    while (c.modo === 'reaccion') {
      c = paso(c, E, rng);
      if (++n > 1000) throw new Error('la reacción no termina');
      if (c.modo === 'reaccion') expect(c.x).toBe(x0);
    }
    expect(vista(c).anim).toBe('reposo');
    expect(vista(reaccionar(reaccionar(c, 'jugar'), 'banar')).anim).toBe('sacudirse');
    expect(vista(reaccionar(correr(crear(24), 1, { ...E, animacion: 'triste' }, rng), 'acariciar')).anim).toBe('feliz');
  });

  it('con peso 0, rascarse nunca aparece (y con el peso normal sí)', async () => {
    const base = new Set<string>();
    let b = crear(24);
    const r0 = mulberry32(9);
    for (let i = 0; i < 20000; i++) base.add(vista((b = paso(b, E, r0))).anim);
    expect(base.has('rascarse')).toBe(true);
    vi.resetModules();
    vi.doMock('../../src/logica/balance', async (orig) => {
      const b = await orig<typeof import('../../src/logica/balance')>();
      return { ...b, OCIO_PESOS: { ...b.OCIO_PESOS, rascarse: 0 } };
    });
    const m = await import('../../src/escena/comportamiento');
    const vistas = new Set<string>();
    let c = m.crear(24);
    const rng = m.mulberry32(9);
    for (let i = 0; i < 20000; i++) vistas.add(m.vista((c = m.paso(c, E, rng))).anim);
    vi.doUnmock('../../src/logica/balance');
    expect(vistas.has('rascarse')).toBe(false);
    expect(vistas.has('cola')).toBe(true);
  });
});

describe('reacciones sincronizadas con las partículas', () => {
  const dur = (s: keyof typeof SEQ) => SEQ[s].reduce((a, p) => a + p.t, 0);
  it('comer: espera al hueso, mastica un rato y termina con él', () => {
    const llega = Math.ceil((FX_HUESO.topeDy - FX_HUESO.desdeDy) / FX_HUESO.vy);
    expect(dur('comer')).toBeGreaterThanOrEqual(llega + 4);
    expect(dur('comer')).toBeLessThanOrEqual(FX_HUESO.vida + 2);
    expect(SEQ.comer.filter((p) => p.f === 'comerAbierta').length).toBeGreaterThan(0);
    let t = 0;
    for (const p of SEQ.comer) {
      if (t < llega) expect(p.f).not.toBe('comerAbierta'); // mientras cae, no mastica
      t += p.t;
    }
  });
  it('jugar dura lo que la pelota', () => expect(Math.abs(dur('jugar') - FX_PELOTA.vida)).toBeLessThanOrEqual(4));
});

describe('cambio de ánimo durante una reacción', () => {
  const E: Entorno = { animacion: 'reposo', xmin: 4, xmax: 44 };
  const rng = mulberry32(3);
  it('no la corta: termina y pasa al ánimo nuevo', () => {
    let c = reaccionar(crear(24), 'alimentar');
    c = paso(c, { ...E, animacion: 'triste' }, rng);
    expect(c.modo).toBe('reaccion');
    expect(c.anim).toBe('triste');
    expect(vista(c).anim).toBe('comer');
    while (c.modo === 'reaccion') c = paso(c, { ...E, animacion: 'triste' }, rng);
    expect(vista(c).anim).toBe('triste');
  });
  it('dormida sí la interrumpe', () => {
    const c = paso(reaccionar(crear(24), 'alimentar'), { ...E, animacion: 'dormida' }, rng);
    expect(c.modo).toBe('bostezo');
  });
});

describe('paseos', () => {
  it('con rango estrecho, pocos paseos acaban pegados al borde', () => {
    const e: Entorno = { animacion: 'reposo', xmin: 4, xmax: 44 };
    const rng = mulberry32(11);
    let c = crear(24);
    let paseos = 0;
    let bordes = 0;
    while (paseos < 200) {
      const n = paso(c, e, rng);
      if (c.seq !== 'caminar' && n.seq === 'caminar') {
        paseos++;
        if (n.dest === e.xmin || n.dest === e.xmax) bordes++;
        expect(Math.abs(n.dest - c.x)).toBeGreaterThanOrEqual(OCIO_CAMINAR_MIN_PX);
      }
      c = n;
    }
    expect(bordes / paseos).toBeLessThan(0.3);
  });
});
