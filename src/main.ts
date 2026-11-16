import './estilos.css';
import { esIOS, esInstalada, registrarSW } from './pwa';

const app = document.querySelector<HTMLElement>('#app');
const instalar = document.querySelector<HTMLElement>('#instalar');

// Safari y la app instalada no comparten localStorage: si juega en la pestaña y luego instala, perdería su partida.
if (esIOS() && !esInstalada()) {
  if (app) app.hidden = true;
  if (instalar) instalar.hidden = false;
} else if (app) {
  app.textContent = 'Clarita';
}

registrarSW();
