# Plan — Costos cruzados, sonido y tutorial guiado

## Contexto

Hoy las acciones solo suben su propio medidor y la energía cambia únicamente por tiempo
(`src/logica/tiempo.ts`): jugar 50 veces cansa igual que no hacer nada. No hay audio ni
ayuda de primera vez. El CTO pidió: (1) que ciertas acciones drenen otras barras y fijar
los ritmos de drenaje por tiempo, (2) sonidos de fondo y de reacción, (3) tutorial guiado.

Respuestas del CTO (2026-11-16): fondo = **ambiente** (no melodía); con poca energía
**no puede jugar**; tutorial **mixto** (pulsar botón real en Alimentar, Jugar y Bañar;
resto con "Siguiente").

## Decisiones (chairman; plan detallado y crítica de Opus)

| Tema | Decisión |
|---|---|
| Costos | Tabla `COSTO_ACCION` en `src/logica/balance.ts`, aplicada en `src/logica/acciones.ts` con `mover` (se exporta de `tiempo.ts`). Bajan hasta `PISO`, nunca a 0 |
| Cansancio | `ENERGIA_MIN_JUGAR = 20`: bajo eso `puede(e,'jugar')` es false. Sin frase nueva: 20 < `UMBRAL_TRISTE`, `animo` ya dice "Clarita tiene sueño" |
| Anti-granja (hallazgo de Opus) | Con costos se podía ganar cariño sin límite sin que pase el tiempo (Alimentar ×8 baja higiene bajo 70, Bañar da +2, repetir). Cierre: `LLENO = 95`; Alimentar, Jugar y Bañar quedan deshabilitados si su medidor ya está en 95 o más. Acariciar no se bloquea |
| Subida de Jugar | `SUBIDA_DIVERSION` baja de 100 a 60 (recomendación de Opus, la adopto): Jugar se usa dos veces y el gasto de energía pesa. Comida e higiene siguen en 100 |
| Sonido | WebAudio sintetizado, **sin archivos**: no toca precache, sin peticiones, sin licencias. Módulo `src/audio/sonido.ts` |
| Persistencia | Claves propias `clarita.sonido` y `clarita.tutorial`. No se toca `Estado`, `VERSION_ACTUAL` ni migraciones |
| Tutorial | `src/ui/tutorial.ts`, **no modal**: foco visual + globo; lo de debajo sigue funcionando. Evita `inert`, peleas de `z-index` y conflicto con la caricia en el canvas |
| UI | Dos botones 44×44 en `header.cabecera > div.fila`: Sonido (`aria-pressed`) y "?" ("Ver guía"). El chip gana elipsis. Camino único con `impeccable`; gate `web-design-guidelines` |
| Orden | En serie: M1 → M2 → M3. M3 depende de M2 (botón, `tic`, cabecera) |

### Números (todos en `balance.ts`)

| Acción | Sube | Cuesta | Bloqueada si |
|---|---|---|---|
| Jugar | diversión +60 | energía −15, higiene −10, comida −5 | energía < 20 o diversión ≥ 95 |
| Alimentar | comida +100 | higiene −4 | comida ≥ 95 |
| Bañar | higiene +100 | energía −5, diversión −5 | higiene ≥ 95 |
| Acariciar | diversión +10 | nada | — |
| Dormir, despertar, pijama | — | nada | — |

| Por hora | Comida | Diversión | Energía | Higiene |
|---|---|---|---|---|
| Despierta (antes −6/−5/−4/−3) | −8 | −6 | −5 | −2 |
| Dormida (antes −2/0/+15/0) | −3 | 0 | +12 | 0 |

De 100 a triste (30): comida ~9 h, diversión ~12 h, energía ~14 h, higiene ~35 h (la
higiene baja sobre todo por jugar y comer). Dormida se llena en ~8 h. Sin callejones:
Dormir siempre disponible; con energía baja la diversión sube con Acariciar.

## Hitos

Cada hito: brief → subagente Sonnet en rama propia → chairman revisa diff y corre
`npm run typecheck && npm test && npm run build && npm run e2e` → `/code-review` +
`/ponytail-review` → fixes con Sonnet nuevo → PR → CI → merge → handoff.

**M1 Balance** (`m1-balance`) — `src/logica/{balance,acciones,tiempo}.ts`, tests
- `balance.ts`: ritmos nuevos, `ENERGIA_MIN_JUGAR`, `LLENO`, `COSTO_ACCION`, `SUBIDA_DIVERSION = 60`.
- `tiempo.ts`: exportar `mover`. `acciones.ts`: helper `costar(e, accion)` tras la subida;
  `puede` suma energía mínima para jugar y `LLENO` para los tres cuidados.
- Actualizar: `tests/unit/tiempo.test.ts` (1 h despierta: 92/94/95/98; dormida: comida 97,
  energía +12), `tests/unit/acciones.test.ts` (jugar ya no llega a 100; "puede coincide"
  con caso energía 10 y caso medidor lleno), `tests/e2e/juego.spec.ts` ("tras 10 h la
  comida baja a ~20"; revisar tests que pulsan Jugar/Alimentar con medidor ≥ 95).
- Nuevos unit: costo exacto por acción; acariciar no cobra; costo para en `PISO` y un
  medidor en 5 se queda en 5; jugar false con energía 19 y true con 20; anti-granja
  (1000 vueltas de todas las acciones sin tiempo: cariño < 50 + 20).

**M2 Sonido** (`m2-sonido`) — `src/audio/sonido.ts` (nuevo), `src/main.ts`,
`src/ui/interfaz.ts`, `src/estilos.css`, tests
- Tabla `SONIDOS` con todos los datos (frecuencias, duraciones, volúmenes, onda, filtros,
  intervalos). `crearSonido(almacen)` → `{reaccion(tipo), ambiente({noche, dormida}),
  activo(), alternar(), sincronizar()}`. Sin `AudioContext`: todo no-op, nada lanza.
- Contexto perezoso en `pointerup`/`touchend`/`click`/`keydown` (en iOS `pointerdown` no
  desbloquea audio). Corre solo si sonido activo y página visible; si no, `suspend()`.
  `resume`/`suspend` con `.catch(() => {})`. `navigator.audioSession?.type = 'ambient'`.
- Ambiente: día = agua (buffer de ruido en bucle + paso bajo) y pájaros esporádicos;
  noche = grillos; dormida = casi silencio. `ambiente()` idempotente por clave; pájaros y
  grillos con `setTimeout`, no se programan si el contexto no corre.
- Reacciones: alimentar, jugar, bañar, acariciar, dormir, despertar, pijama, `tic`.
  Enganche en `src/main.ts` tras `puede` (acción bloqueada no suena); `ambiente` tras
  cada `pintar`; `sincronizar` en el `visibilitychange` existente.
- `interfaz.ts`: `.cab-botones` con botón Sonido (icono 8×8 `nota` vía `pintarIcono`),
  `data-accion` en los botones de acción (lo usa M3).
- Unit (sin AudioContext): no lanza; preferencia por defecto encendida; `alternar`
  escribe `clarita.sonido`; cada `Accion` sonora y `tic` tienen entrada; volúmenes en 0–1.
  e2e: Sonido cambia `aria-pressed` y persiste tras recargar; sin scroll a 375×667.

**M3 Tutorial** (`m3-tutorial`) — `src/ui/tutorial.ts` (nuevo), `src/main.ts`,
`src/ui/interfaz.ts`, `src/estilos.css`, `tests/e2e/*`
- `crearTutorial(raiz, {puede, tic})` → `{abrir(), alAccionar(a)}`. Pasos como datos
  `{objetivo, texto, accion?}`. Foco visual: div `pointer-events:none` con
  `box-shadow: 0 0 0 100vmax` sobre el rectángulo del objetivo, recalculado en `resize`.
- Globo `role="dialog" aria-modal="false"`, texto `aria-live="polite"`, Siguiente y Saltar
  ≥ 44 px. Paso con acción y `!puede(accion)` → muestra Siguiente. Foco: al botón real o
  a Siguiente; al cerrar vuelve. Escape = saltar. Reduced-motion sin transiciones.
- Saltar o Listo escriben `clarita.tutorial = '1'`. `main.ts` lo abre si falta la clave
  (también en partidas existentes) y avisa `tutorial.alAccionar` tras acción válida.
  Botón "?" (`aria-label="Ver guía"`) lo reabre.
- Textos:
  1. (Clarita) "¡Hola! Ella es Clarita. Cuídala y te querrá cada día más."
  2. (medidores) "Estas barras muestran lo que necesita. Bajan con el tiempo; si una baja mucho, Clarita se pone triste."
  3. (Alimentar) "¿Tiene hambre? Pulsa Alimentar. Comer la ensucia un poquito."
  4. (Jugar) "Pulsa Jugar. Se divierte, pero se cansa, le da hambre y se ensucia. Muy cansada no puede jugar."
  5. (Bañar) "Pulsa Bañar para dejarla limpia. El baño la cansa y la aburre un poco."
  6. (Dormir) "Con sueño, pulsa Dormir para recuperar energía. Tócala o pulsa Acariciar para mimarla."
  7. (cabecera) "Aquí activas o silencias el sonido, y con ? vuelves a ver esta guía. ¡A cuidar a Clarita!"
- e2e: `abrir()` siembra `clarita.tutorial` por defecto. Nuevos: recorrido completo con
  clics reales; Saltar + recarga no lo repite; Escape; "?" reabre; con energía 10 el paso
  Jugar muestra Siguiente; sin scroll a 375×667 con globo abierto. Comprobar que
  `carga`, `offline` y `subruta` siguen pasando sin sembrar.

## Antes de tocar código
Copiar este plan a `docs/plan-costos-sonido-tutorial.md` y enlazarlo en `docs/handoff.md`
como plan activo, con la aprobación del CTO y sus tres respuestas.

## Verificación final
`npm run typecheck && npm test && npm run build && npm run e2e`; capturas Playwright
(iPhone 13) de cada paso del tutorial y de la cabecera a 375 px; tras el deploy,
comprobación en la URL en vivo (tutorial aparece, sonido conmuta, sin errores de consola).

## Riesgos y no verificado
- iPhone real: el interruptor de silencio puede dejar mudo todo WebAudio; desbloqueo de
  audio, volumen y timbre sin oír en el dispositivo. Sonidos diseñados por un modelo sin
  oído: probable ronda de ajuste tras escucharlos.
- Si `AudioContext` de WebKit Linux ensucia la consola en e2e: se ve en el primer paso de M2.
- Ancho real de la cabecera a 375 px con dos botones: lo decide el test de sin scroll.
- Balance: números estimados, no jugados durante días. Botones deshabilitados con medidor
  lleno es comportamiento nuevo visible.
- Codex: se intenta en cada PR; sin cuota queda "no verificado".
