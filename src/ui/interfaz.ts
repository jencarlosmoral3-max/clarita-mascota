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

export function crearInterfaz(app: HTMLElement, alAccionar: (a: Accion) => void) {
  const raiz = el('div', 'juego');
  const titulo = el('h1', undefined, 'Clarita');
  const chip = el('span', 'chip');
  const frase = el('p', 'frase');
  frase.setAttribute('aria-live', 'polite');
  const cab = el('header', 'cabecera');
  const fila = el('div', 'fila');
  fila.append(titulo, chip);
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
    return { clave, ico, ic, celdas, cuadros, valor };
  });

  const botonesEl = el('div', 'botones');
  const botones = BOTONES.map(([accion, texto, ic]) => {
    const b = el('button', 'btn');
    b.type = 'button';
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
  for (const bt of botones) bt.b.addEventListener('click', () => alAccionar(bt.efectiva));
  canvas.addEventListener('pointerdown', (ev) => {
    if (ev.isPrimary && ev.button === 0 && escena.tocaSprite(ev.clientX, ev.clientY)) alAccionar('acariciar');
  });

  return {
    pintar(estado: Estado, ahora: number): void {
      const noche = esDeNoche(ahora);
      raiz.dataset.hora = noche ? 'noche' : 'dia';
      const texto = animo(estado).frase;
      if (frase.textContent !== texto) frase.textContent = texto;
      canvas.setAttribute('aria-label', `Clarita, una perrita pequeña de pelo rizado chocolate con barbita blanca. ${texto}`);
      chip.textContent = `${estado.dormida ? 'Dormitorio' : 'Laguna'} · ${noche ? 'Noche' : 'Día'}`;

      const estilo = getComputedStyle(raiz);
      const tinta = estilo.getPropertyValue('--g-ink').trim();
      const sobreAcento = estilo.getPropertyValue('--g-on-accent').trim();
      for (const m of medidores) {
        const v = Math.round(estado[m.clave]);
        const encendidas = Math.min(10, Math.max(0, Math.ceil((v - MIN) / ((MAX - MIN) / 10))));
        m.cuadros.forEach((c, i) => c.classList.toggle('on', i < encendidas));
        m.celdas.setAttribute('aria-valuenow', String(v));
        m.valor.textContent = `${v}%`;
        m.valor.classList.toggle('bajo', m.clave !== 'carino' && v < UMBRAL_TRISTE);
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
      escena.pintar(estado, ahora);
    },
    efecto(tipo: EfectoAccion): void {
      escena.efecto(tipo);
    },
  };
}
