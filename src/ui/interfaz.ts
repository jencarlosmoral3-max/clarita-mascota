import { ICONOS, type Icono } from '../arte/sprites';
import { crearEscena, type EfectoAccion } from '../escena/render';
import { puede, type Accion } from '../logica/acciones';
import { animo } from '../logica/animo';
import { MAX, MIN, UMBRAL_TRISTE } from '../logica/balance';
import type { Estado } from '../logica/estado';
import { esDeNoche } from '../logica/tiempo';

type Medidor = 'comida' | 'energia' | 'higiene' | 'diversion' | 'carino';

const MEDIDORES: readonly (readonly [Medidor, string, Icono, string])[] = [
  ['comida', 'Comida', 'bone', '#e08a2a'],
  ['energia', 'Energía', 'bolt', '#e8b82a'],
  ['higiene', 'Higiene', 'drop', '#2a79d6'],
  ['diversion', 'Diversión', 'ball', '#3f9a7a'],
  ['carino', 'Cariño', 'heart', '#d4176c'],
];

const BOTONES: readonly (readonly [Accion, string, Icono])[] = [
  ['alimentar', 'Alimentar', 'bone'],
  ['jugar', 'Jugar', 'ball'],
  ['banar', 'Bañar', 'drop'],
  ['dormir', 'Dormir', 'moon'],
  ['acariciar', 'Acariciar', 'heart'],
  ['alternarPijama', 'Pijama', 'shirt'],
];

function el<K extends keyof HTMLElementTagNameMap>(tag: K, clase?: string, texto?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (clase) e.className = clase;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

function icono(): HTMLCanvasElement {
  const c = el('canvas');
  c.width = c.height = 8;
  c.setAttribute('aria-hidden', 'true');
  return c;
}

function pintarIcono(c: HTMLCanvasElement, nombre: Icono, color: string): void {
  const g = c.getContext('2d');
  if (!g) return;
  g.clearRect(0, 0, 8, 8);
  g.fillStyle = color;
  ICONOS[nombre].forEach((fila, y) =>
    fila.forEach((v, x) => {
      if (v) g.fillRect(x, y, 1, 1);
    }),
  );
}

// Reinicia una animación CSS por clase y la limpia al terminar (con movimiento reducido no se anima).
function animar(e: HTMLElement, clase: string): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; // sin animationend: no acumular listeners ni dejar la clase
  e.classList.remove(clase);
  void e.offsetWidth;
  e.classList.add(clase);
  e.addEventListener('animationend', () => e.classList.remove(clase), { once: true });
}

const celdasEncendidas = (v: number): number => Math.min(10, Math.max(0, Math.ceil((v - MIN) / ((MAX - MIN) / 10))));

type Opciones = { alAccionar: (a: Accion) => void; sonidoActivo: boolean; alSonido: () => boolean; alGuia: () => void };

export function crearInterfaz(app: HTMLElement, { alAccionar, sonidoActivo, alSonido, alGuia }: Opciones) {
  const raiz = el('div', 'juego');
  const titulo = el('h1', undefined, 'Clarita');
  const chip = el('span', 'chip');
  const frase = el('p', 'frase');
  frase.setAttribute('aria-live', 'polite');
  const cab = el('header', 'cabecera');
  const fila = el('div', 'fila');
  const botonesCab = el('div', 'cab-botones');
  const sonidoBtn = el('button', 'cab-btn');
  sonidoBtn.type = 'button';
  sonidoBtn.setAttribute('aria-label', 'Sonido');
  const sonidoIco = icono();
  sonidoBtn.append(sonidoIco);
  const pintarSonido = (activo: boolean): void => sonidoBtn.setAttribute('aria-pressed', String(activo));
  pintarSonido(sonidoActivo);
  sonidoBtn.addEventListener('click', () => pintarSonido(alSonido()));
  const guiaBtn = el('button', 'cab-btn');
  guiaBtn.type = 'button';
  guiaBtn.setAttribute('aria-label', 'Ver guía');
  const guiaIco = icono();
  guiaBtn.append(guiaIco);
  guiaBtn.addEventListener('click', () => alGuia());
  botonesCab.append(sonidoBtn, guiaBtn);
  fila.append(titulo, chip, botonesCab);
  cab.append(fila, frase);

  const escenaEl = el('div', 'escena');
  const canvas = el('canvas');
  canvas.setAttribute('role', 'img');
  escenaEl.append(canvas);
  const escena = crearEscena(escenaEl, canvas);

  const lista = el('ul', 'medidores');
  const medidores = MEDIDORES.map(([clave, nombre, ic, color]) => {
    const li = el('li', 'medidor');
    const ico = icono();
    const celdas = el('div', 'celdas');
    celdas.setAttribute('role', 'progressbar');
    celdas.setAttribute('aria-label', nombre);
    celdas.setAttribute('aria-valuemin', String(MIN));
    celdas.setAttribute('aria-valuemax', String(MAX));
    celdas.style.setProperty('--c', color);
    const cuadros = Array.from({ length: 10 }, () => el('i'));
    celdas.append(...cuadros);
    const valor = el('span', 'valor');
    valor.setAttribute('aria-hidden', 'true');
    li.append(ico, el('span', 'nombre', nombre), celdas, valor);
    lista.append(li);
    return { clave, ico, ic, celdas, cuadros, valor, previo: undefined as number | undefined };
  });

  const botonesEl = el('div', 'botones');
  const botones = BOTONES.map(([accion, texto, ic]) => {
    const b = el('button', 'btn');
    b.type = 'button';
    b.dataset.accion = accion;
    const ico = icono();
    const rotulo = el('span', undefined, texto);
    b.append(ico, rotulo);
    botonesEl.append(b);
    return { accion, efectiva: accion as Accion, b, ico, ic, rotulo };
  });

  const panel = el('div', 'panel');
  panel.append(lista, botonesEl);
  raiz.append(cab, escenaEl, panel);
  app.replaceChildren(raiz);

  // Con la partida dormida el botón dice Despertar y emite esa acción (se calcula en pintar).
  for (const bt of botones)
    bt.b.addEventListener('click', () => {
      animar(bt.ico, 'pop');
      alAccionar(bt.efectiva);
    });
  canvas.addEventListener('pointerdown', (ev) => {
    if (ev.isPrimary && ev.button === 0 && escena.tocaSprite(ev.clientX, ev.clientY)) alAccionar('acariciar');
  });

  return {
    pintar(estado: Estado, ahora: number): void {
      const noche = esDeNoche(ahora);
      raiz.dataset.hora = noche ? 'noche' : 'dia';
      const texto = animo(estado).frase;
      if (frase.textContent !== texto) {
        const primera = frase.textContent === '';
        frase.textContent = texto;
        if (!primera) animar(frase, 'entra');
      }
      canvas.setAttribute('aria-label', `Clarita, una perrita pequeña de pelo rizado chocolate con barbita blanca. ${texto}`);
      chip.textContent = `${estado.dormida ? 'Dormitorio' : 'Laguna'} · ${noche ? 'Noche' : 'Día'}`;

      const estilo = getComputedStyle(raiz);
      const tinta = estilo.getPropertyValue('--g-ink').trim();
      const sobreAcento = estilo.getPropertyValue('--g-on-accent').trim();
      for (const m of medidores) {
        const v = Math.round(estado[m.clave]);
        const encendidas = celdasEncendidas(v);
        if (m.previo !== undefined) {
          const antes = celdasEncendidas(m.previo);
          for (let i = antes; i < encendidas; i++) {
            const c = m.cuadros[i];
            if (!c) continue;
            c.style.setProperty('--k', String(i - antes));
            animar(c, 'sube');
          }
          if (m.clave === 'carino' && v > m.previo) animar(m.ico, 'pulso');
        }
        m.previo = v;
        m.cuadros.forEach((c, i) => c.classList.toggle('on', i < encendidas));
        m.celdas.setAttribute('aria-valuenow', String(v));
        m.valor.textContent = `${v}%`;
        const bajo = m.clave !== 'carino' && v < UMBRAL_TRISTE;
        m.celdas.setAttribute('aria-valuetext', bajo ? `${v}%, bajo` : `${v}%`);
        m.valor.classList.toggle('bajo', bajo);
        pintarIcono(m.ico, m.ic, tinta);
      }
      for (const bt of botones) {
        const { accion, b, ico, ic, rotulo } = bt;
        bt.efectiva = accion === 'dormir' && estado.dormida ? 'despertar' : accion;
        b.disabled = !puede(estado, bt.efectiva);
        if (accion === 'dormir') rotulo.textContent = estado.dormida ? 'Despertar' : 'Dormir';
        const pulsado = accion === 'alternarPijama' && estado.pijama;
        if (accion === 'alternarPijama') b.setAttribute('aria-pressed', String(estado.pijama));
        pintarIcono(ico, ic, pulsado ? sobreAcento : tinta);
      }
      pintarIcono(sonidoIco, 'nota', tinta);
      pintarIcono(guiaIco, 'ayuda', tinta);
      escena.pintar(estado, ahora);
    },
    efecto(tipo: EfectoAccion): void {
      escena.efecto(tipo);
    },
  };
}
