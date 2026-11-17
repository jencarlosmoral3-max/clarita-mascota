import type { Almacen } from '../logica/guardado';

export type Reaccion = 'alimentar' | 'jugar' | 'banar' | 'acariciar' | 'dormir' | 'despertar' | 'alternarPijama' | 'tic';
type Onda = OscillatorType;

// Un tono: frecuencia inicial → final (Hz), inicio relativo, duración y volumen (s / 0–1).
type Tono = { f: number; f2?: number; t: number; d: number; v: number; onda: Onda };
// Una ráfaga de ruido filtrado (paso bajo o alto).
type Ruido = { t: number; d: number; v: number; filtro: BiquadFilterType; hz: number; hz2?: number };
type Receta = { tonos?: readonly Tono[]; ruidos?: readonly Ruido[] };

export const SONIDOS = {
  maestro: 0.5,
  ataque: 0.01, // rampa de entrada de cada tono (s)
  reacciones: {
    alimentar: { ruidos: [0, 0.09, 0.18].map((t) => ({ t, d: 0.05, v: 0.3, filtro: 'highpass' as const, hz: 1800 })) },
    jugar: { tonos: [{ f: 330, f2: 880, t: 0, d: 0.18, v: 0.25, onda: 'square' }, { f: 520, f2: 1040, t: 0.14, d: 0.14, v: 0.2, onda: 'square' }] },
    banar: {
      ruidos: [{ t: 0, d: 0.5, v: 0.3, filtro: 'bandpass', hz: 700, hz2: 2400 }],
      tonos: [{ f: 500, f2: 900, t: 0.05, d: 0.08, v: 0.15, onda: 'sine' }, { f: 700, f2: 1200, t: 0.2, d: 0.08, v: 0.15, onda: 'sine' }, { f: 600, f2: 1000, t: 0.33, d: 0.08, v: 0.12, onda: 'sine' }],
    },
    acariciar: { tonos: [{ f: 523, t: 0, d: 0.18, v: 0.25, onda: 'triangle' }, { f: 659, t: 0.14, d: 0.28, v: 0.25, onda: 'triangle' }] },
    dormir: { tonos: [{ f: 440, f2: 220, t: 0, d: 0.9, v: 0.2, onda: 'sine' }] },
    despertar: { tonos: [{ f: 330, f2: 660, t: 0, d: 0.22, v: 0.22, onda: 'triangle' }] },
    alternarPijama: { tonos: [{ f: 900, f2: 600, t: 0, d: 0.04, v: 0.2, onda: 'square' }] },
    tic: { tonos: [{ f: 1200, f2: 900, t: 0, d: 0.02, v: 0.15, onda: 'square' }] },
  } satisfies Record<Reaccion, Receta>,
  ambiente: {
    volumen: 0.04, // muy por debajo de las reacciones
    aguaHz: 600,
    aguaVol: 1,
    colchonDormida: 0.01,
    pajaro: { minMs: 3000, maxMs: 9000, notas: [3, 6], hz: [2200, 3600], d: 0.07, paso: 0.09, v: 0.5 },
    grillo: { minMs: 1500, maxMs: 4000, pulsos: 4, hz: 4300, d: 0.03, paso: 0.07, v: 0.4 },
  },
} as const;

const CLAVE = 'clarita.sonido';
type CtxCtor = typeof AudioContext;
type NavAudio = Navigator & { audioSession?: { type: string } };

export function crearSonido(almacen: Almacen) {
  let encendido = true;
  try {
    encendido = almacen.getItem(CLAVE) !== '0';
  } catch {
    /* sin almacén: encendido */
  }
  const Ctor = (globalThis as { AudioContext?: CtxCtor; webkitAudioContext?: CtxCtor }).AudioContext
    ?? (globalThis as { webkitAudioContext?: CtxCtor }).webkitAudioContext;

  let ctx: AudioContext | undefined;
  let maestro: GainNode | undefined;
  let bus: GainNode | undefined; // ambiente
  let ruidoBuf: AudioBuffer | undefined;
  let clave = '';
  let ultimo = { noche: false, dormida: false };
  let continuo: AudioNode[] = [];
  let timer: number | undefined;

  const corre = (): boolean => ctx?.state === 'running';
  const rnd = (a: number, b: number): number => a + Math.random() * (b - a);

  function limpiarAmbiente(): void {
    window.clearTimeout(timer);
    timer = undefined;
    for (const n of continuo) {
      try {
        (n as AudioScheduledSourceNode).stop?.();
      } catch { /* ya parado */ }
      n.disconnect();
    }
    continuo = [];
  }

  function tono(destino: AudioNode, o: Tono, t0: number): void {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const ini = t0 + o.t;
    osc.type = o.onda;
    osc.frequency.setValueAtTime(o.f, ini);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, ini + o.d);
    g.gain.setValueAtTime(0.0001, ini);
    g.gain.linearRampToValueAtTime(o.v, ini + SONIDOS.ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, ini + o.d);
    osc.connect(g).connect(destino);
    osc.onended = () => { osc.disconnect(); g.disconnect(); };
    osc.start(ini);
    osc.stop(ini + o.d + 0.02);
  }

  function ruido(destino: AudioNode, o: Ruido, t0: number): void {
    if (!ctx || !ruidoBuf) return;
    const src = ctx.createBufferSource();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    const ini = t0 + o.t;
    src.buffer = ruidoBuf;
    f.type = o.filtro;
    f.frequency.setValueAtTime(o.hz, ini);
    if (o.hz2) f.frequency.exponentialRampToValueAtTime(o.hz2, ini + o.d);
    g.gain.setValueAtTime(0.0001, ini);
    g.gain.linearRampToValueAtTime(o.v, ini + SONIDOS.ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, ini + o.d);
    src.connect(f).connect(g).connect(destino);
    src.onended = () => { src.disconnect(); f.disconnect(); g.disconnect(); };
    src.start(ini, rnd(0, 0.5));
    src.stop(ini + o.d + 0.02);
  }

  // Programa un evento esporádico de ambiente; no hace nada si el contexto no corre.
  function programar(min: number, max: number, evento: () => void): void {
    if (!corre()) return;
    timer = window.setTimeout(() => {
      if (corre() && bus && ctx) evento();
      programar(min, max, evento);
    }, rnd(min, max));
  }

  const claveAmbiente = (): string => `${ultimo.dormida ? 'z' : ultimo.noche ? 'n' : 'd'}${corre() ? 1 : 0}`;

  function configurarAmbiente(): void {
    limpiarAmbiente();
    clave = claveAmbiente(); // refleja lo realmente configurado, también al reanudar el contexto
    const c = ctx;
    const salida = bus;
    if (!c || !salida || !ruidoBuf || !corre()) return;
    const A = SONIDOS.ambiente;
    const { noche, dormida } = ultimo;
    if (dormida) {
      const g = c.createGain();
      g.gain.value = A.colchonDormida;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = A.aguaHz / 2;
      const src = c.createBufferSource();
      src.buffer = ruidoBuf;
      src.loop = true;
      src.connect(f).connect(g).connect(salida);
      src.start();
      continuo = [src, f, g];
    } else if (noche) {
      programar(A.grillo.minMs, A.grillo.maxMs, () => {
        for (let i = 0; i < A.grillo.pulsos; i++) tono(salida, { f: A.grillo.hz, t: i * A.grillo.paso, d: A.grillo.d, v: A.grillo.v, onda: 'sine' }, c.currentTime);
      });
    } else {
      const g = c.createGain();
      g.gain.value = A.aguaVol;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = A.aguaHz;
      const src = c.createBufferSource();
      src.buffer = ruidoBuf;
      src.loop = true;
      src.connect(f).connect(g).connect(salida);
      src.start();
      continuo = [src, f, g];
      programar(A.pajaro.minMs, A.pajaro.maxMs, () => {
        const n = Math.round(rnd(A.pajaro.notas[0], A.pajaro.notas[1]));
        const base = rnd(A.pajaro.hz[0], A.pajaro.hz[1]);
        for (let i = 0; i < n; i++) {
          const f0 = base * rnd(0.9, 1.1);
          tono(salida, { f: f0, f2: f0 * rnd(0.7, 1.4), t: i * A.pajaro.paso, d: A.pajaro.d, v: A.pajaro.v, onda: 'sine' }, c.currentTime);
        }
      });
    }
  }

  const quiere = (): boolean => encendido && !document.hidden;

  function sincronizar(): void {
    if (!ctx) return;
    if (quiere() && ctx.state !== 'running') {
      ctx.resume().then(() => {
        // El resume pudo resolver tras apagar el sonido u ocultar la página.
        if (quiere()) configurarAmbiente();
        else {
          limpiarAmbiente();
          ctx?.suspend().catch(() => {});
        }
      }).catch(() => {});
    } else if (!quiere() && ctx.state === 'running') {
      limpiarAmbiente();
      ctx.suspend().catch(() => {});
    }
  }

  function crearCtx(): void {
    if (ctx || !Ctor) return;
    try {
      ctx = new Ctor();
      maestro = ctx.createGain();
      maestro.gain.value = SONIDOS.maestro;
      maestro.connect(ctx.destination);
      bus = ctx.createGain();
      bus.gain.value = SONIDOS.ambiente.volumen;
      bus.connect(maestro);
      const largo = ctx.sampleRate * 2;
      ruidoBuf = ctx.createBuffer(1, largo, ctx.sampleRate);
      const datos = ruidoBuf.getChannelData(0);
      for (let i = 0; i < largo; i++) datos[i] = Math.random() * 2 - 1;
      const sesion = (navigator as NavAudio).audioSession;
      if (sesion) sesion.type = 'ambient';
      clave = '';
      sincronizar();
      if (ctx.state === 'running') configurarAmbiente();
    } catch {
      ctx = undefined;
    }
  }

  if (Ctor && typeof document !== 'undefined') {
    // En iOS pointerdown no desbloquea el audio: se escuchan los gestos que sí.
    const evs = ['pointerup', 'touchend', 'click', 'keydown'];
    const alGesto = (): void => {
      crearCtx();
      if (ctx) {
        for (const e of evs) document.removeEventListener(e, alGesto, true);
        sincronizar();
      }
    };
    for (const e of evs) document.addEventListener(e, alGesto, true);
  }

  return {
    reaccion(tipo: Reaccion): void {
      if (!encendido || !ctx || !maestro || !corre()) return;
      const r: Receta = SONIDOS.reacciones[tipo];
      const t0 = ctx.currentTime;
      for (const o of r.ruidos ?? []) ruido(maestro, o, t0);
      for (const o of r.tonos ?? []) tono(maestro, o, t0);
    },
    ambiente(v: { noche: boolean; dormida: boolean }): void {
      ultimo = v;
      if (!ctx) return;
      if (claveAmbiente() === clave) return;
      configurarAmbiente();
    },
    activo: (): boolean => encendido,
    alternar(): boolean {
      encendido = !encendido;
      try {
        almacen.setItem(CLAVE, encendido ? '1' : '0');
      } catch { /* sin guardar */ }
      sincronizar();
      return encendido;
    },
    sincronizar,
  };
}
