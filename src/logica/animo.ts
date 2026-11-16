import { UMBRAL_TRISTE } from './balance';
import type { Estado } from './estado';

export type Animo = { animacion: 'reposo' | 'triste' | 'dormida'; frase: string };

const FRASE_DORMIDA = 'Clarita está dormida';
const FRASE_REPOSO = 'Clarita está contenta';
const FRASES_NECESIDAD = {
  comida: 'Clarita tiene hambre',
  energia: 'Clarita tiene sueño',
  higiene: 'Clarita necesita un baño',
  diversion: 'Clarita quiere jugar',
} as const;

const NECESIDADES = ['comida', 'energia', 'higiene', 'diversion'] as const;

export function animo(estado: Estado): Animo {
  if (estado.dormida) return { animacion: 'dormida', frase: FRASE_DORMIDA };
  let peor: (typeof NECESIDADES)[number] = 'comida';
  for (const n of NECESIDADES) if (estado[n] < estado[peor]) peor = n;
  if (estado[peor] < UMBRAL_TRISTE) return { animacion: 'triste', frase: FRASES_NECESIDAD[peor] };
  return { animacion: 'reposo', frase: FRASE_REPOSO };
}
