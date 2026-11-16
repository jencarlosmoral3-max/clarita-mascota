// Todos los números de balance del juego viven aquí.
export const MIN = 0;
export const MAX = 100;
export const PISO = 10; // el decaimiento por tiempo nunca baja un medidor de aquí
export const UMBRAL_TRISTE = 30;
export const UMBRAL_CUIDADO_UTIL = 70;
export const TOPE_AUSENCIA_MS = 24 * 60 * 60 * 1000;
export const TICK_MS = 30 * 1000;
export const MS_POR_HORA = 60 * 60 * 1000;

// Cambio por hora de cada medidor.
export const RITMO_DESPIERTA = { comida: -6, diversion: -5, energia: -4, higiene: -3 } as const;
export const RITMO_DORMIDA = { comida: -2, diversion: 0, energia: 15, higiene: 0 } as const;

export const SUBIDA_COMIDA = 100;
export const SUBIDA_DIVERSION = 100;
export const SUBIDA_HIGIENE = 100;
// Acariciar: sube diversión un poco y da cariño solo si diversión estaba bajo UMBRAL_CUIDADO_UTIL.
export const SUBIDA_DIVERSION_ACARICIAR = 10;
export const CARINO_POR_CUIDADO = 2;

export const INICIAL = { comida: 80, energia: 80, higiene: 80, diversion: 80, carino: 50 } as const;

// Noche local: de HORA_INICIO_NOCHE:00 a HORA_FIN_NOCHE-1:59.
export const HORA_INICIO_NOCHE = 20;
export const HORA_FIN_NOCHE = 7;
