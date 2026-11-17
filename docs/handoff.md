# Handoff — El tamagochi de Clarita

Última actualización: 2026-11-16

## Plan activo

**[Mascota virtual de Clarita](plan-mascota-clarita.md)** — aprobado por el CTO el 2026-11-16.

| Hito | Estado |
|---|---|
| H0 andamiaje | Cerrado, PR #1 |
| H1 cascarón PWA | Cerrado, PR #3. Deploy en GitHub Pages, PR #6 y #7 |
| H2 bake-off visual | Cerrado |
| H3 lógica y guardado | Cerrado, PR #2 |
| H2 elección | CTO eligió **B** (48×48) el 2026-11-16; mock en `mocks/propuesta-b.html` |
| H4 render | Cerrado, PR #5 |
| H5 UI e integración | Cerrado, PR #5. Gate de UI corrido en M4 (PR #14) |
| H6 iconos, actualización, entrega | Iconos cerrados, PR #9. Falta prueba de actualización y checklist en iPhone real |

## Plan activo: animaciones y dinamismo

**[Animaciones y dinamismo](plan-animaciones.md)** — aprobado por el CTO el 2026-11-16. Eligió los
cuatro frentes (Clarita reacciona, se mueve sola, escenario vivo, interfaz con rebote) y validar el
arte con vista previa antes de integrar.

| Hito | Estado |
|---|---|
| M1 motor (reloj 100 ms, SEQ con duración, sprites cacheados) | Cerrado, PR #12 |
| M2 arte por parches + vista previa | En curso, rama `m2-arte`. Compuerta: aprobación del CTO |
| M3 escenario vivo | Cerrado, PR #13 |
| M4 interfaz y partículas | Cerrado, PR #14. Incluye el gate de UI pendiente desde H5 |
| M5 comportamiento integrado | No iniciado. Depende de M2 aprobado |

### M1 motor (PR #12)

- Reloj lógico de 100 ms (`setTimeout` encadenado + un `requestAnimationFrame`), pausado en segundo
  plano; con movimiento reducido no hay reloj. `avanzar` en `src/escena/comportamiento.ts`.
- `SEQ` con pasos `{f, t}` y `frameEn`; ritmo visible igual que antes. Sprite cacheado por
  `frame|pijama`; `data-x` en el canvas.
- Verificado: typecheck, 88/88 unit, build, 18/18 e2e, CI verde. `/code-review` y `/ponytail-review`.
- Hallazgos aplicados: sprite sin contexto no se cachea; redibujo al volver de segundo plano; test
  de toque sin `new Function` anidado.
- Hallazgos rechazados: redibujar solo si cambió algo (M3 y M5 cambian píxeles casi cada paso);
  deuda de pasos descartada con timers lentos (diseño: sin saltos); constante `K` de migración (M4
  reescribe las partículas); duraciones de `SEQ` en `sprites.ts` (dato de arte, decisión del plan).
- **Pendiente para M5**: `efecto()` y el peluche usan la x centrada de `geo()`, no `sprX`.
- No verificado: pausa real con `document.hidden`, rendimiento en iPhone. Codex: no verificado.

### M2 arte (en espera del CTO)

- Rama local `m2-arte` (worktree `.claude/worktrees/agent-a673d69fb0facf65c`), sin push, ya
  rebasada sobre `main` tras M4 (`bf01ee5`): typecheck, 164 unit, build y 25 e2e pasan.
- Vista previa publicada: https://claude.ai/artifact/RLJNXzwGKt55ddg3fEjjDk (se regenera con
  `npm run vista-previa` en esa rama).
- Juicio del chairman: bien cola, mirar, feliz, comer; flojas rascarse, trote, peluche, bostezo.
- Sin reviews todavía. No se integra ni se mergea hasta que el CTO apruebe.

### M3 escenario vivo (PR #13)

- Nubes fuera del fondo cacheado (derivan 1 px/s, pasan detrás de las montañas), titileo de
  estrellas de noche, destellos del agua, transición laguna/dormitorio con dither Bayer en 4 pasos.
  Con movimiento reducido todo estático.
- `page.clock` funciona en WebKit Linux con `runFor`; `fastForward` no avanza la animación (tope de
  3 pasos por vuelta). Usarlo en los e2e de M5.
- Verificado: typecheck, 93/93 unit, build, 21/21 e2e, CI verde, capturas de día, noche y transición.
- `/code-review`: aplicados 7 hallazgos (transición colgada tras resize, color de apagado de
  estrella, brillo con movimiento reducido, destellos en columnas, lectura de píxeles por dibujado,
  e2e frágil, nubes delante de montañas). Rechazado: nubes ausentes durante los 4 pasos.
- No verificado: titileo en movimiento, rendimiento en iPhone. Codex: no verificado.

### M4 interfaz y partículas (PR #14)

- Partículas `{k, x, y, vx, vy, g, vida, rebota?, tope?, espera?}` en `src/escena/comportamiento.ts`
  (`pasoParticulas`, `agregarParticulas`, tope 40). Los efectos se acumulan y salen de `sprX`.
  Nuevas: migas (esperan a que el hueso llegue a la boca), gotas, estrellitas.
- Interfaz: tecla de 2 px, pop del icono, celdas escalonadas al subir, entrada de frase, pulso del
  corazón. Duraciones en variables `--t-*` de `estilos.css`.
- **Gate de UI** (`web-design-guidelines` + `impeccable audit`, con mediciones en WebKit iPhone 13):
  sin bloqueantes. Contraste 5,3–17:1; botones 114×59 px; foco y orden de Tab correctos; sin scroll
  horizontal. Corregido: botón deshabilitado de 2,84:1 a 5,61:1 (día) y 6,30:1 (noche);
  `aria-valuetext` con "bajo"; selector muerto. Anotado sin tocar: fuente 13–14 px, `theme-color`
  fijo, frase con `nowrap`, aviso doble al lector de pantalla. El detector automático de
  `impeccable` no se corrió.
- `/code-review`: aplicados 8 hallazgos (rebote que ganaba energía, migas antes del hueso, vaivén
  atado al último efecto, listeners y efectos apilados con movimiento reducido, números sueltos,
  e2e frágil). Rechazado: reflow por celda.
- Verificado: typecheck, 100/100 unit, build, 25/25 e2e, CI verde. En vivo tras el deploy de
  `171c989`: nubes derivan, Bañar da 14 partículas, `aria-valuetext` presente, sin errores de consola.
- Observación: el hueso crema se confunde con la barbita al llegar a la boca.
- No verificado: movimiento en iPhone real, VoiceOver, Dynamic Type. Codex: no verificado.

## Estado (2026-11-16)

- **El juego es jugable en local**: `npm run dev` (en escritorio se juega directo; en iPhone sin
  instalar muestra la pantalla de instalación). Medidores, 6 acciones, tocar a Clarita, pijama,
  día/noche, dormitorio al dormir, animación y efectos, guardado local, offline.
- `main` verificado: `npm run typecheck` limpio, `npm test` 100/100, `npm run e2e` 25/25 (WebKit,
  perfil iPhone 13).
- Repo: GitHub público `jencarlosmoral3-max/clarita-mascota`. `gh` y `git push/fetch` se corren con
  `GH_TOKEN=$(gh auth token -u jencarlosmoral3-max)`; la cuenta activa global de `gh` sigue siendo
  `JoseluisLarrazabal`.
- Plantilla Game-Studios retirada del proyecto: entera en `~/respaldo-ccgs-clarita/`.
- Fotos de referencia en `fotos de la modelo del juego/`, fuera del repo por `.gitignore`.
- Fuente "Pixelify Sans" autoalojada (`@fontsource/pixelify-sans`), sin peticiones externas.

## Producción

**https://jencarlosmoral3-max.github.io/clarita-mascota/** — GitHub Pages, desplegado por
`.github/workflows/pages.yml` en cada merge a `main` (build con `BASE_PATH=/clarita-mascota/`).

- Aprobado por el CTO el 2026-11-16: pidió GitHub Pages y él mismo hizo público el repo (Pages no
  admite repos privados en el plan gratuito). Vercel descartado; `vercel.json` eliminado. Costo: 0.
- **URL definitiva. No renombrar el repo ni moverlo de cuenta**: la partida guardada va atada al
  origen y a la ruta; cambiarla borra a Clarita en el teléfono.
- Verificado en vivo el 2026-11-16 con Playwright WebKit (perfil iPhone 13): pantalla de
  instalación; en modo instalada simulado el juego carga, Alimentar y Pijama funcionan, el service
  worker registra con scope de la subruta, y tras cortar la red y recargar el juego y la partida
  siguen ahí. Sin errores de consola ni respuestas 4xx.
- Revertir: desactivar Pages en Settings → Pages, o volver el repo a privado.
- Público en el historial: nombre y correo del autor de los commits. Las fotos no están en el repo.

## Pendiente (necesita al CTO o a la dueña)

1. **Prueba en el iPhone real**: abrir la URL en Safari → Compartir → Agregar a inicio → abrir desde
   el ícono; probar modo avión; revisar notch y barra inferior.
2. **EAS Simulator** (opcional): `eas` no instalado; requiere plan de pago de Expo.

## Siguiente paso concreto

Prueba en el iPhone real (pendiente 1) y prueba de actualización del service worker: con la app
instalada, mergear cualquier cambio visible y comprobar que al volver de segundo plano carga la
versión nueva sin perder la partida. Antes de entregar: Codex sobre `src/`.

Plan de animaciones: falta que el CTO apruebe la vista previa de M2; después M5.

## H6 iconos (2026-11-16, PR #9)

- Ícono de la app = Clarita: recorte 44×44 de `idle0` (cabeza con orejas, pecho y arnés gris, que
  es su accesorio real) a escala entera sobre el azul de la laguna `#3a82e2`. Se regenera con
  `npm run iconos`.
- Tamaños: apple-touch-icon 180 (opaco), 192, 512, 512 maskable (sprite dentro de la zona segura).
  Favicon = `icon-192.png`.
- En 180 y 192 el sprite ocupa ~70 % del lado: la escala entera siguiente lo pegaría al borde.
- Verificado: typecheck, 75/75 unit, 17/17 e2e (incluye dimensiones reales de cada PNG), CI verde,
  `/code-review` y `/ponytail-review` sin hallazgos. En vivo: los 4 PNG responden 200 y son
  idénticos byte a byte a los del repo.
- **iOS guarda el ícono al instalar**: si la app ya estaba en la pantalla de inicio, hay que
  quitarla y agregarla de nuevo para ver el ícono nuevo, y eso borra la partida.
- No verificado: aspecto en la pantalla de inicio de un iPhone real. Codex: no verificado.

## Decisiones tomadas durante la ejecución

- `guardado.cargar`: si la lectura del almacenamiento lanza, se arranca en solo lectura para no
  pisar una partida real (hallazgo de `/code-review`; el brief original pedía lo contrario).
- La pantalla de instalación también se muestra en iPad.
- Tocar el canvas solo acaricia si el toque cae sobre el sprite.
- Escala del canvas: entera en píxeles de dispositivo, mínimo 96 píxeles lógicos de ancho (12 en iPhone 13).
- Hallazgo de revisión en PR #5: la animación no arrancaba y los e2e no lo cubrían; ahora hay test.
- Acariciar: sube diversión 10 y da cariño solo si diversión estaba bajo 70; sin relojes.
- Valores iniciales: medidores en 80, cariño en 50. Frases de ánimo en `src/logica/animo.ts`.
- TypeScript 7 (compilador nativo) y Vite 8: lo que resolvió `latest`; typecheck y build pasan.

## No verificado

- Nada en iPhone real ni en Safari de iOS. Playwright WebKit en Linux no lo sustituye.
- Actualización del service worker en la app instalada.
- `prefers-reduced-motion`, escena de alto 0 y dormir con efectos activos: sin test, revisados por lectura.
- Contraste y foco: revisados a ojo, no medidos.
- Codex (regla 13): no se corrió en ningún PR. Pendiente de pasar sobre `src/logica/` y `src/pwa.ts`.
- `/ponytail-review` como skill solo corrió en H0; en H1 y H3 la revisión del diff fue manual.
- Balance con uso real.

## Registro: instalación del toolkit de desarrollo de videojuegos (2026-11-16)

**Aprobado por:** CTO, en sesión, 2026-11-16 (eligió las cuatro opciones, incluida la instalación
global de Game-Studios pese a la objeción registrada abajo).
**Por qué:** pedido de instalar los repos de desarrollo de videojuegos con más estrellas de GitHub.
**Costo:** 0 (todo software libre).

| Qué | Dónde | Versión | Verificado |
|---|---|---|---|
| Godot (`godotengine/godot`, 120k estrellas) | `/usr/local/bin/godot` (sudo) | 4.7.2-stable | `godot --headless --version` → `4.7.2.stable.official.ed1daf0bf`; SHA512 del zip OK |
| godot-mcp (`Coding-Solo/godot-mcp`) | MCP scope user, `~/.claude.json` | npm `@coding-solo/godot-mcp` 0.1.1 | `claude mcp get godot` → Connected |
| Claude-Code-Game-Studios (`Donchitos`, 40k estrellas), global | `~/.claude/skills` (76) y `~/.claude/agents` (49) | commit `abc0de7` | conteos; lista exacta en `~/.claude/ccgs-global-manifest.txt` |
| Claude-Code-Game-Studios, proyecto | raíz de este proyecto (`.claude/`, `design/`, `docs/`, `production/`, `src/`, `CLAUDE.md`, `project.yaml`) | commit `abc0de7` | `diff -rq` de `.claude/` contra el origen: sin diferencias |
| Phaser (`phaserjs/phaser`, 41k estrellas) | `package.json` de este proyecto | 4.2.1 | `require('phaser/package.json').version` |

### Decisiones y objeciones

- **Objeción del chairman a la instalación global de Game-Studios** (dicha antes de instalar):
  carga 49 agentes + 76 skills en el contexto de todos los proyectos y sus skills dependen de
  rutas `.claude/scripts/...` que solo existen dentro de un proyecto con la plantilla. El CTO
  reafirmó; se ejecutó.
- **No se fusionaron en global** los hooks, `settings.json` ni la statusline de Game-Studios: su
  lista deny incluye `Bash(sudo *)` y sus hooks usan `$CLAUDE_PROJECT_DIR/.claude/hooks/...`.
  En global romperían los demás proyectos. Solo viven en este proyecto.
- **Skills omitidos en global:** `prototype` (ya existía uno global con ese nombre) y
  `code-review` (tapaba el `/code-review` nativo, gate de revisión obligatorio).
- **Excluido de la copia al proyecto:** `.git/`, `.github/`, `CONTRIBUTING.md`, `SECURITY.md`,
  `CHANGELOG.md`, `studio-tests/`. Consecuencia: `/skill-test` no tiene specs que correr.

### Riesgos abiertos

- En este proyecto, `.claude/skills/code-review` de la plantilla puede tapar el `/code-review`
  nativo. Pendiente de decisión del CTO (renombrar o borrar).
- En este proyecto, `.claude/settings.json` de la plantilla niega `sudo`, `git reset --hard`,
  `git push --force` y `rm -rf`, y activa 15 hooks en cada sesión. `hooks/update-check.sh`
  consulta la API de GitHub; `scripts/vendor-three.sh` descarga de jsdelivr.
- Revisión de seguridad de hooks/scripts: solo un grep de red/credenciales, no una auditoría.

### No verificado

- Que las tools de godot-mcp funcionen sobre un proyecto Godot real (solo se probó la conexión).
- Que los hooks de la plantilla corran bien en esta máquina (no se abrió una sesión nueva aquí).
- Que los skills globales de Game-Studios funcionen fuera de un proyecto con la plantilla.

### Cómo revertir

```bash
# Game-Studios global
cd ~/.claude && xargs -d '\n' rm -r < ccgs-global-manifest.txt && rm ccgs-global-manifest.txt
# godot-mcp
claude mcp remove -s user godot
# Godot
sudo rm /usr/local/bin/godot
# Proyecto: borrar .claude/ CLAUDE.md design/ docs/ production/ src/ project.yaml node_modules/ package*.json
```

### Otros hallazgos

- `gh` autenticado falla en búsquedas: "User flagged as spammy". La cuenta de GitHub está marcada;
  hay que revisarlo con soporte de GitHub. La búsqueda se hizo con la API pública sin autenticar.
