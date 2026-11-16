import { registerSW } from 'virtual:pwa-register';

interface NavegadorIOS extends Navigator {
  standalone?: boolean;
}

export function esIOS(): boolean {
  return (
    /iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function esInstalada(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as NavegadorIOS).standalone === true
  );
}

export function registrarSW(): void {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // En iOS la app instalada no navega al volver de segundo plano: sin esto nunca buscaría la versión nueva.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;
        // Sin red update() rechaza; no es un error que reportar.
        registration.update().catch(() => {});
      });
    },
  });

  // Evento solo de Safari: no está en lib.dom.
  document.addEventListener('gesturestart', (e) => e.preventDefault());
}
