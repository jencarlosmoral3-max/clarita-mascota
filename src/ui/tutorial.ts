import type { Accion } from '../logica/acciones';
import type { Almacen } from '../logica/guardado';

export const CLAVE_TUTORIAL = 'clarita.tutorial';

type Paso = { objetivo: string; texto: string; accion?: Accion };

const PASOS: readonly Paso[] = [
  { objetivo: 'canvas[role="img"]', texto: '¡Hola! Ella es Clarita. Cuídala y te querrá cada día más.' },
  { objetivo: 'ul.medidores', texto: 'Estas barras muestran lo que necesita. Bajan con el tiempo; si una baja mucho, Clarita se pone triste.' },
  { objetivo: 'button[data-accion="alimentar"]', texto: '¿Tiene hambre? Pulsa Alimentar. Comer la ensucia un poquito.', accion: 'alimentar' },
  { objetivo: 'button[data-accion="jugar"]', texto: 'Pulsa Jugar. Se divierte, pero se cansa, le da hambre y se ensucia. Muy cansada no puede jugar.', accion: 'jugar' },
  { objetivo: 'button[data-accion="banar"]', texto: 'Pulsa Bañar para dejarla limpia. El baño la cansa y la aburre un poco.', accion: 'banar' },
  { objetivo: 'button[data-accion="dormir"]', texto: 'Con sueño, pulsa Dormir para recuperar energía. Tócala o pulsa Acariciar para mimarla.' },
  { objetivo: '.cab-botones', texto: 'Aquí activas o silencias el sonido, y con ? vuelves a ver esta guía. ¡A cuidar a Clarita!' },
];

const MARGEN = 8;
const HUECO = 12;
const RELLENO = 4;

type Opciones = { puede: (a: Accion) => boolean; tic: () => void; almacen: Almacen };

function el<K extends keyof HTMLElementTagNameMap>(tag: K, clase: string, texto?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = clase;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

export function crearTutorial(raiz: HTMLElement, { puede, tic, almacen }: Opciones) {
  let capa: HTMLElement | null = null;
  let paso = 0;
  let previo: Element | null = null;
  // La escena se dimensiona tras el primer pintado: se recoloca al terminar de medirse.
  const ro = new ResizeObserver(() => colocar());
  const refs = {} as { foco: HTMLElement; globo: HTMLElement; indicador: HTMLElement; texto: HTMLElement; siguiente: HTMLButtonElement };

  const objetivo = (): HTMLElement | null => raiz.querySelector<HTMLElement>(PASOS[paso]?.objetivo ?? '');

  function colocar(): void {
    const t = objetivo();
    if (!t || !capa) return;
    const r = t.getBoundingClientRect();
    const f = refs.foco.style;
    f.left = `${r.left - RELLENO}px`;
    f.top = `${r.top - RELLENO}px`;
    f.width = `${r.width + 2 * RELLENO}px`;
    f.height = `${r.height + 2 * RELLENO}px`;
    const g = refs.globo;
    const ancho = Math.min(320, innerWidth - 2 * MARGEN);
    g.style.width = `${ancho}px`;
    const alto = g.offsetHeight;
    const arriba = r.top - RELLENO - HUECO;
    const abajo = innerHeight - (r.bottom + RELLENO + HUECO);
    const sobre = abajo < alto && arriba > abajo;
    const y = sobre ? r.top - RELLENO - HUECO - alto : r.bottom + RELLENO + HUECO;
    const x = r.left + r.width / 2 - ancho / 2;
    g.style.left = `${Math.max(MARGEN, Math.min(innerWidth - ancho - MARGEN, x))}px`;
    g.style.top = `${Math.max(MARGEN, Math.min(innerHeight - alto - MARGEN, y))}px`;
  }

  const esperando = (): boolean => {
    const a = PASOS[paso]?.accion;
    return a !== undefined && puede(a);
  };

  function mostrar(): void {
    const p = PASOS[paso];
    if (!p) return;
    const espera = esperando();
    const ultimo = paso === PASOS.length - 1;
    refs.indicador.textContent = `Paso ${paso + 1} de ${PASOS.length}`;
    refs.texto.textContent = p.texto;
    refs.siguiente.hidden = espera;
    refs.siguiente.textContent = ultimo ? 'Listo' : 'Siguiente';
    colocar();
    ro.disconnect();
    const t = objetivo();
    if (t) ro.observe(t);
    requestAnimationFrame(colocar);
    (espera ? objetivo() : refs.siguiente)?.focus({ preventScroll: true });
  }

  // Recalcula solo si Siguiente hace falta (la acción esperada pudo dejar de ser posible), sin mover el foco.
  function actualizar(): void {
    if (!capa) return;
    const espera = esperando();
    if (espera && document.activeElement === refs.siguiente) objetivo()?.focus({ preventScroll: true });
    refs.siguiente.hidden = espera;
  }

  function avanzar(): void {
    tic();
    if (paso >= PASOS.length - 1) return cerrar();
    paso++;
    mostrar();
  }

  function cerrar(): void {
    if (!capa) return;
    try {
      almacen.setItem(CLAVE_TUTORIAL, '1');
    } catch {
      /* sin almacenamiento: se vuelve a ofrecer la próxima vez */
    }
    capa.remove();
    capa = null;
    ro.disconnect();
    window.removeEventListener('resize', colocar);
    document.removeEventListener('keydown', alTecla);
    if (previo instanceof HTMLElement) previo.focus({ preventScroll: true });
    previo = null;
  }

  function alTecla(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') cerrar();
  }

  function abrir(): void {
    const activo = document.activeElement;
    if (!capa) {
      capa = el('div', 'tuto');
      refs.foco = el('div', 'tuto-foco');
      refs.indicador = el('span', 'tuto-paso');
            refs.texto = el('p', 'tuto-texto');
      refs.texto.id = 'tuto-texto';
      refs.texto.setAttribute('aria-live', 'polite');
      const saltar = el('button', 'btn tuto-btn', 'Saltar guía');
      saltar.type = 'button';
      saltar.addEventListener('click', cerrar);
      refs.siguiente = el('button', 'btn tuto-btn tuto-sig');
      refs.siguiente.type = 'button';
      refs.siguiente.addEventListener('click', avanzar);
      const acciones = el('div', 'tuto-acciones');
      acciones.append(saltar, refs.siguiente);
      refs.globo = el('div', 'tuto-globo');
      refs.globo.setAttribute('role', 'dialog');
      refs.globo.setAttribute('aria-modal', 'false');
      refs.globo.setAttribute('aria-label', 'Guía de Clarita');
      refs.globo.setAttribute('aria-describedby', 'tuto-texto');
      refs.globo.append(refs.indicador, refs.texto, acciones);
      capa.append(refs.foco, refs.globo);
      const juego = raiz.querySelector('.juego') ?? raiz;
      juego.insertBefore(capa, juego.querySelector('.panel'));
      window.addEventListener('resize', colocar);
      document.addEventListener('keydown', alTecla);
    }
    if (activo && !capa.contains(activo)) previo = activo;
    paso = 0;
    mostrar();
  }

  return {
    abrir,
    actualizar,
    // Solo la acción que el paso espera lo hace avanzar; las demás no.
    alAccionar(a: Accion): void {
      if (capa && PASOS[paso]?.accion === a) avanzar();
    },
  };
}
