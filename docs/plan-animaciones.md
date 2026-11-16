# Plan — Animaciones y dinamismo de Clarita

## Contexto

El juego está en producción (https://jencarlosmoral3-max.github.io/clarita-mascota/) pero se ve
quieto: Clarita no se mueve del centro, solo respira y parpadea a 3,3 pasos por segundo, el fondo
es una imagen fija y la interfaz no tiene ninguna animación. El CTO pidió "mejora de animaciones y
dinamismo" y eligió los cuatro frentes: Clarita reacciona a cada acción, Clarita se mueve sola,
escenario vivo e interfaz con rebote. El arte nuevo se valida con **vista previa antes de integrar**.

Hallazgo que condiciona el arte: Clarita está dibujada **de frente**. Caminar será un trotecito de
frente que se desliza, no un caminar de perfil.

## Decisiones (chairman; plan detallado y crítica de Opus)

| Tema | Decisión |
|---|---|
| Reloj | Paso lógico fijo de 100 ms con `setTimeout` encadenado que pide un `requestAnimationFrame` para dibujar; pausado con `document.hidden`. Cambiado respecto a mi idea inicial (bucle rAF puro) por objeción de Opus: 6 veces menos despertares, menos batería |
| Arte | Por parches: frame nuevo = frame existente + parches chicos `{x, y, filas}` (cola, boca, ojos, patas) + desplazamientos `dx/dy` y espejo por código. 12 parches, 1 color nuevo (lengua), **ningún frame completo nuevo** |
| Comportamiento | Máquina de estados pura en `src/escena/comportamiento.ts` (rng inyectado, testeable). `render.ts` solo consulta `{frame, x, espejo, dx, dy}` |
| Caminar de perfil | **Fuera de este plan**: exige frames completos de perfil, lo de más riesgo de no parecerse a Clarita. Se decide tras ver la vista previa |
| Rascarse | Pose más dudosa; si la vista previa no convence, se corta sin reemplazo |
| Fondo | Base cacheada como hoy + elementos animados encima. Sin tocar los generadores salvo sacar las nubes |
| Tiempos | Duración de cada paso en `SEQ` (dato de arte, lo usa la vista previa); ritmos de ocio, velocidades, vidas, nubes y transición en `src/logica/balance.ts`, sección "Animación" |
| Reduced-motion | Sigue sin bucle; todo lo nuevo tiene versión estática |
| Dirección visual | No cambia (Propuesta B). Camino único, sin bake-off; `impeccable animate` para el movimiento de la interfaz |

## Hitos

Cada hito: brief → subagente Sonnet en rama propia → chairman revisa diff y corre typecheck,
vitest, build, e2e → `/code-review` + `/ponytail-review` → fixes con Sonnet nuevo → PR → CI →
merge → handoff. Orden pensado para que M3 y M4 avancen mientras se espera la aprobación del arte.

**M1 Motor** — `src/escena/render.ts`, `src/arte/sprites.ts`, `src/logica/balance.ts`,
`src/escena/comportamiento.ts` (solo `avanzar`), `tests/e2e/juego.spec.ts`
- Reemplazar `setInterval` (`render.ts:146`) por el reloj nuevo. `avanzar(acum, dt) → [ticks, acum]`
  puro, con tope de 3 ticks por vuelta; reinicio al volver de segundo plano. Dibujar solo si hubo tick.
- `SEQ` (`sprites.ts:482`) pasa a pasos `{f, t}`; cada paso actual vale t=3: se ve igual que hoy.
- Trampa: efectos y Z cuentan ticks; escalar ×3 (`fxVida` 6→18, velocidades ÷3, fases de seno y
  `floor(t/2)`→`floor(t/6)` en `render.ts:88`).
- Cachear cada sprite compuesto en un canvas 48×48 por `frame|pijama` reutilizando `blit`
  (`render.ts:17`): un `drawImage` por tick; el espejo sale con `scale(-1,1)`.
- `tocaSprite` (`render.ts:161`) usa una `x` variable (por ahora la de `geo()`); `canvas.dataset.x`.
- Verifica: unit de `avanzar` (dt 0, dt 5000, resto conservado); e2e de toque (`juego.spec.ts:112`)
  lee `data-x`; e2e nuevo con `reducedMotion: 'reduce'` (frame constante, `data-fx` vuelve a 0).

**M2 Arte por parches + vista previa** — `src/arte/sprites.ts`, `src/arte/paleta.ts`,
`tests/unit/arte.test.ts`, `scripts/vista-previa.ts`, `package.json`, `.gitignore`
- `PARCHES` con `.` transparente y `-` "conservar la base" (sin eso un parche rectangular borra
  vecinos); `COMPUESTOS` `nombre → {base, parches}` resueltos al cargar dentro de `SP`.
- `PAL` índice 23, lengua rosa, fuera de `PJ_OFF` (`paleta.ts:5`).
- Trampa: `src/arte/*` sin importaciones entre sí, para que `node --experimental-strip-types`
  siga funcionando (igual que `scripts/iconos.ts`).
- `npm run vista-previa` genera un HTML autocontenido con los datos reales y un reproductor de
  cada secuencia: día/noche, con/sin pijama, laguna/dormitorio. El chairman lo publica como Artifact.
- Verifica: unit (parches caben en 48×48, índices válidos, compuesto ≠ base, `SEQ` apunta a frames
  existentes con `t` entero ≥ 1, 23 no está en `PJ_OFF`).
- **Compuerta: no se mergea ni se integra hasta que el CTO apruebe la vista previa.**

| Animación | Base | Parches | Ritmo |
|---|---|---|---|
| caminar (trote de frente) | idle0 | patas izq/der, rebote 1 px | 4 pasos × 2 ticks, 1 px por tick |
| sentada | sleep0 | ojos abiertos | 3–8 s |
| mover cola | idle0 | cola A/B | 2 × 1, 6 veces |
| mirar a los lados | idle0 | ojos izq/der | 8, 3, 8 ticks |
| rascarse (riesgo alto) | sentada | pata A/B | 2 × 1, 8 veces |
| comer | idle1 | boca abierta | 2 × 2, 4 veces + migas |
| jugar | idle0 | boca abierta + peluche en la boca, saltito | 4 × 2, 2 veces |
| sacudirse | blink | ninguno, dx ±1 | 10 ticks + gotas |
| feliz (caricia) | idle0 | ojos ^^ + cola A/B | 2 × 1, 7 veces + corazones |
| bostezo | sleep0 | boca muy abierta | 3, 8, 3 ticks → dormida |

**M3 Escenario vivo** (en paralelo a la espera de M2) — `src/arte/fondos.ts`, `render.ts`,
`balance.ts`, tests
- Nubes fuera de `laguna()` (`fondos.ts:11`), exportadas y pintadas encima con deriva lenta.
- Al cachear el fondo (`render.ts:59-73`) se guardan posiciones de estrellas, ventana y ondas del
  agua; titileo y destellos alternando color por fase.
- Transición laguna/dormitorio: mezcla dither Bayer 4×4 en 4 ticks; instantánea con reduced-motion.
- Verifica: unit de la máscara dither; e2e con `page.clock` (el cielo cambia en 10 s; con
  reduced-motion no). **Primero comprobar que `page.clock` controla el reloj en WebKit Linux.**

**M4 Interfaz y partículas** — `src/estilos.css`, `src/ui/interfaz.ts`, `render.ts`, `sprites.ts`,
`paleta.ts`, `balance.ts`
- Partículas como lista `{k, x, y, vx, vy, g, vida}`; `efecto()` (`render.ts:169`) agrega en vez de
  reemplazar; tope 40. Nuevas: miga, gota, estrellita.
- Keyframes: pulsación de botón, celdas de medidor que **suben** llenándose escalonadas, cambio de
  frase, pulso del cariño. La regla de `estilos.css:88` ya los apaga con reduced-motion.
- Verifica: e2e `document.getAnimations()` > 0 tras Alimentar y 0 con reduced-motion; el e2e
  existente de efectos (`juego.spec.ts:126`) sigue pasando (vidas < 2,5 s).
- Gate de UI pendiente desde H5: `web-design-guidelines` + `impeccable audit`.

**M5 Comportamiento integrado** (tras aprobación de M2) — `comportamiento.ts`, `render.ts`,
`balance.ts`, `tests/unit/comportamiento.test.ts`, `juego.spec.ts`
- `crear`, `paso(c, {animacion, xmin, xmax}, rng)`, `reaccionar(c, tipo)`, `vista(c)`.
  Reutiliza `rng` de `fondos.ts:2`. Triste: no pasea. Dormida: nada. Reacción interrumpe el ocio.
- Dormir: primero transición al dormitorio, luego bostezo. `canvas.dataset.anim`.
- Margen lateral ≥ 4 px para no romper el e2e "tocar el cielo" (`juego.spec.ts:119`).
- Verifica: unit (x siempre en rango en 10.000 ticks, misma semilla misma trayectoria, triste y
  dormida quietas, reacción congela x, camina al menos cada `OCIO_MAX_SIN_CAMINAR`); e2e con
  `page.clock` (camina sola, triste no camina, Alimentar pasa por `comer`, Dormir por `bostezo`).

## Antes de tocar código
Copiar este plan a `docs/plan-animaciones.md` y enlazarlo en `docs/handoff.md` como plan activo.

## Verificación final
`npm run typecheck && npm test && npm run build && npm run e2e`; revisión visual con Playwright
(capturas y grabación en perfil iPhone 13) de cada animación; deploy automático a Pages y
comprobación en la URL en vivo. La actualización llega sola a la app instalada sin borrar partida.

## Riesgos y no verificado
- Rendimiento y batería en iPhone real: estimados, no medidos.
- Parches dibujados por un modelo: alguna pose puede no parecerse a Clarita; la vista previa
  existe para eso y puede necesitar más de una ronda.
- El espejo voltea también el lado iluminado del pelo: se juzga en la vista previa.
- `page.clock` en WebKit Linux: sin probar; si no sirve, los e2e de movimiento se apoyan en
  esperas reales y en la garantía `OCIO_MAX_SIN_CAMINAR`.
- Codex: se intenta en cada PR; sin cuota queda "no verificado".
