import '@fontsource/pixelify-sans/latin-500.css';
import '@fontsource/pixelify-sans/latin-700.css';
import './estilos.css';
import type { EfectoAccion } from './escena/render';
import { alternarPijama, acariciar, alimentar, banar, despertar, dormir, jugar, puede, type Accion } from './logica/acciones';
import { TICK_MS } from './logica/balance';
import type { Estado } from './logica/estado';
import { cargar, guardar, type Almacen } from './logica/guardado';
import { aplicarTiempo } from './logica/tiempo';
import { esIOS, esInstalada, registrarSW } from './pwa';
import { crearInterfaz } from './ui/interfaz';

const app = document.querySelector<HTMLElement>('#app');
const instalar = document.querySelector<HTMLElement>('#instalar');

const ACCIONES: Record<Accion, (e: Estado) => Estado> = { alimentar, jugar, banar, dormir, despertar, acariciar, alternarPijama };
const EFECTOS: Partial<Record<Accion, EfectoAccion>> = { alimentar: 'alimentar', jugar: 'jugar', banar: 'banar', acariciar: 'acariciar' };

// En modo privado el acceso a localStorage puede lanzar: el juego arranca igual, sin guardar.
function abrirAlmacen(): Almacen {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem: () => {} };
  }
}

function jugarJuego(raiz: HTMLElement): void {
  const almacen = abrirAlmacen();
  const cargado = cargar(almacen, Date.now());
  const soloLectura = cargado.soloLectura;
  let estado = aplicarTiempo(cargado.estado, Date.now());

  const guardarYa = (): void => void guardar(almacen, estado, soloLectura);
  const ui = crearInterfaz(raiz, (accion) => {
    estado = aplicarTiempo(estado, Date.now());
    if (!puede(estado, accion)) return;
    estado = ACCIONES[accion](estado);
    guardarYa();
    ui.pintar(estado, Date.now());
    const efecto = EFECTOS[accion];
    if (efecto) ui.efecto(efecto);
  });

  const refrescar = (): void => {
    estado = aplicarTiempo(estado, Date.now());
    guardarYa();
    ui.pintar(estado, Date.now());
  };
  ui.pintar(estado, Date.now());
  window.setInterval(refrescar, TICK_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      estado = aplicarTiempo(estado, Date.now());
      ui.pintar(estado, Date.now());
    } else guardarYa();
  });
  window.addEventListener('pagehide', guardarYa);
  navigator.storage?.persist?.().catch(() => {});
}

// Safari y la app instalada no comparten localStorage: si juega en la pestaña y luego instala, perdería su partida.
if (esIOS() && !esInstalada()) {
  if (app) app.hidden = true;
  if (instalar) instalar.hidden = false;
} else if (app) {
  jugarJuego(app);
}

registrarSW();
