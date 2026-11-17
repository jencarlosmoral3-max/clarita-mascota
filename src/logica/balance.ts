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

// Animación: paso lógico de 100 ms. Lo que antes contaba pasos de 300 ms ahora cuenta 3 pasos.
export const ANIM_TICK_MS = 100;
export const ANIM_MAX_TICKS_POR_VUELTA = 3;
export const ANIM_BOB_TICKS = 3; // el cuerpo alterna idle0/idle1 cada 0,3 s mientras hay efecto
export const ANIM_Z_TICKS = 6; // las Z de dormir suben un paso cada 0,6 s
export const FX_QUITAR_MS = 1500; // con movimiento reducido, el efecto estático se borra a los 1,5 s
export const FX_MAX = 40; // tope global de partículas; al pasarse se descartan las más viejas
// Partículas (velocidades en px por tick, g = gravedad por tick, vida en ticks). n = cantidad.
export const FX_CORAZON = { n: 5, vy: -0.7, vida: 18 } as const;
export const FX_BURBUJA = { n: 7, vy: -0.7, vida: 18 } as const;
export const FX_HUESO = { vy: 2, vida: 18, topeDy: 24 } as const; // topeDy: baja hasta la boca (sy + 24) y se queda
export const FX_PELOTA = { vx: 0.33, vy: -6.2, g: 1.2, vida: 18 } as const; // rebota en el suelo; salto de ~16 px
export const FX_MIGA = { n: 5, vx: 0.5, vy: -3, g: 0.7, vida: 9 } as const;
export const FX_GOTA = { n: 7, vx: 1, vy: -2.5, g: 0.6, vida: 10 } as const;
export const FX_ESTRELLITA = { n: 4, vy: -0.5, vida: 14 } as const;
export const NUBES_TICKS_POR_PX = 10; // deriva: 1 px cada 10 ticks (1 s)
export const TITILEO_PERIODO_TICKS = 6; // estrellas: cada 0,6 s cambia la fase
export const TITILEO_FASES = 5; // cada estrella se apaga 1 fase de cada 5
export const DESTELLO_PERIODO_TICKS = 5; // ondas del agua
export const DESTELLO_UNO_DE_CADA = 3; // una de cada 3 ondas del agua es destello (por hash, no por columnas)
export const DESTELLO_FASES = 6; // cada onda brilla 1 fase de cada 6
export const TRANSICION_TICKS_POR_PASO = 1; // 4 pasos de dither = 4 ticks
