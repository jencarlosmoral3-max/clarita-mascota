# Plan — Mascota virtual de Clarita

## Contexto

Regalo para la novia del CTO: su perrita real, Clarita, como mascota virtual en pixel art en su
iPhone. Juego original del género "mascota virtual de bolsillo"; no copia nombre, arte ni interfaz
de ningún juego existente. Textos en español. Referencia: 3 fotos en `fotos de la modelo del juego/`.

Clarita: perrita pequeña, pelo rizado chocolate con reflejos caramelo en hocico y orejas, ojos
ámbar, nariz marrón, barbita blanca, orejas caídas, cola pompón. Accesorios reales: pijama polar
rosa con dibujos blancos, arnés gris, peluche beige. Lugares reales: laguna de alta montaña y
dormitorio con frazada gris azulada.

## Decisiones

| Tema | Decisión | Quién |
|---|---|---|
| Plataforma | PWA instalable en iPhone (Safari → Agregar a inicio), offline. Sin App Store | CTO: iPhone; chairman |
| Stack | Vite + TypeScript, canvas 2D para la escena, DOM para botones y medidores, `vite-plugin-pwa`, `vitest`, Playwright | chairman |
| Motor | Ninguno. **Phaser se desinstala** (instalado hoy): 1 sprite y 6 botones no lo justifican | chairman, objeción dicha |
| Datos | `localStorage`, JSON versionado. Tiempo por timestamps al abrir; nada en segundo plano | chairman |
| Descuido | Solo se pone triste. Sin muerte ni enfermedad; medidores con piso | CTO |
| Notificaciones, sonido, respaldo del guardado | Fuera de v1 | chairman |
| Repo | GitHub privado en `jencarlosmoral3-max` (`gh auth switch`) | CTO |
| Hosting | Vercel, dominio definitivo fijado **antes** de entregar | chairman |
| Dirección visual | Bake-off: 2 propuestas como Artifacts, el CTO elige | regla 7.b |

### Cambio que revierte algo aprobado hoy: retirar la plantilla Game-Studios de este proyecto

Hoy pediste instalarla aquí. Recomiendo sacarla del proyecto (la copia global en `~/.claude` queda):

- Su `CLAUDE.md` obliga a preguntar "May I write this to…?" antes de cada escritura: los
  subagentes se quedan esperando aprobación. Choca con tu flujo chairman + Sonnet.
- `validate-write.sh` emite un aviso en cada escritura de subagente fuera de `docs/`,
  `production/`, `tests/`: ruido en contexto en cada archivo.
- Su `code-review` tapa el `/code-review` nativo (gate de la regla 2).
- Su `LICENSE` ("Copyright Donchitos") y su `README.md` etiquetarían mal tu repo.
- `session-start.sh` consulta la API de GitHub en cada sesión.

Se **mueve**, no se borra, a `~/respaldo-ccgs-clarita/`: todo `.claude/` del proyecto,
`CLAUDE.md`, `project.yaml`, `design/`, `production/`, `src/`, `docs/` salvo `handoff.md`,
`README.md`, `UPGRADING.md`, `LICENSE`, `.worktreeinclude`, `.gitattributes`, `.gitignore`.
Si prefieres conservarla, dilo al revisar el plan: el resto no cambia, pero habrá fricción.

## Mecánicas v1

- Medidores internos, todos "más es mejor", 0–100: `comida`, `energia`, `higiene`, `diversion`,
  `carino`. La etiqueta en español vive solo en la UI.
- Acciones: alimentar, jugar con el peluche, bañar, dormir/despertar, acariciar (tocar a Clarita
  **y** botón), poner/quitar pijama. Dormida: solo "Despertar".
- Balance inicial por hora, todo en `src/logica/balance.ts`:

  | Medidor | Despierta | Dormida |
  |---|---|---|
  | comida | −6 | −2 |
  | diversión | −5 | 0 |
  | energía | −4 | +15 |
  | higiene | −3 | 0 |

  Piso 10, triste bajo 30, tope de ausencia 24 h, `carino` nunca baja. De 100 a 30 en ~12 h:
  cuadra con abrirla mañana y noche. Acción da `carino +2` solo si el medidor estaba bajo 70.
- Día/noche por hora local. Fondos: laguna y dormitorio.

## Estructura

```
index.html  package.json  tsconfig.json  vite.config.ts  playwright.config.ts  vercel.json
.github/workflows/ci.yml        typecheck, vitest, build, playwright webkit
.gitignore                      node_modules dist .vercel .env* "fotos de la modelo del juego/"
CLAUDE.md                       ~30 líneas: stack, comandos, textos en español
mocks/propuesta-a.html  propuesta-b.html
scripts/iconos.ts
src/main.ts  src/estilos.css
src/logica/  balance.ts estado.ts tiempo.ts acciones.ts animo.ts guardado.ts
src/arte/    paleta.ts sprites.ts fondos.ts
src/escena/render.ts   src/ui/interfaz.ts
tests/unit/*.test.ts   tests/e2e/*.spec.ts
docs/handoff.md  docs/plan-mascota-clarita.md
```

## Hitos

Cada hito: subagente Sonnet implementa en rama → chairman revisa diff y verifica → `/code-review`
+ `/ponytail-review` (+ `/security-review` en H3 por `guardado.ts`) → fixes con Sonnet nuevo →
PR → CI verde → merge → handoff.

**H0. Limpieza y andamiaje**
1. Copiar este plan a `docs/plan-mascota-clarita.md` y enlazarlo en `docs/handoff.md` (regla 8).
2. Mover plantilla a `~/respaldo-ccgs-clarita/`. `CLAUDE.md` nuevo corto.
3. `git init`; `gh auth switch -u jencarlosmoral3-max`; `gh repo create` privado; rama de trabajo.
4. `npm uninstall phaser`; `"type": "module"`; instalar `vite typescript vitest vite-plugin-pwa
   @playwright/test`; scripts `dev build preview test e2e typecheck`; CI.
- Trampa: versión de Vite dentro de los `peerDependencies` de `vite-plugin-pwa`.
- Trampa: las fotos no entran al repo (hay personas en una).
- Verifica: `npm run typecheck && npm test && npm run build`; `grep phaser package.json` vacío; CI verde.

**H1. Shell PWA + deploy** (primero: mayor riesgo)
- Manifest: `display: standalone`, `orientation: portrait`, `background_color` = fondo del body.
  `apple-touch-icon` opaco (iOS pinta la transparencia de negro). Sin splash por dispositivo.
- Workbox: `registerType: 'autoUpdate'`, `cleanupOutdatedCaches`, `clientsClaim`, `skipWaiting`;
  `registration.update()` en cada `visibilitychange → visible`. `vercel.json`: `no-cache` para
  `/sw.js` e `/index.html`.
- CSS: `viewport-fit=cover` + `env(safe-area-inset-*)`; `position: fixed`, `overscroll-behavior:
  none`, sin selección ni callout; `touch-action: manipulation` en botones, `none` en canvas;
  `preventDefault` en `gesturestart`.
- **Pantalla "Agrégala a tu inicio"** si es iOS y no standalone: Safari y la app instalada no
  comparten guardado; si juega en la pestaña y luego instala, "pierde" a Clarita.
- Vercel: nombre de proyecto definitivo; Deployment Protection no debe cubrir producción.
  Si la integración Git no alcanza el repo de la otra cuenta, deploy por CLI.
- Verifica: `ls dist/sw.js dist/manifest.webmanifest`; E2E carga → `setOffline(true)` → recarga
  OK. **Manual en iPhone:** agregar a inicio, modo avión, notch y barra inferior.

**H2. Bake-off visual** (en paralelo con H3)
- Brief compartido con `ui-ux-pro-max`. A = taste-skill a **32×32**; B = `impeccable` a **48×48**.
  Así el bake-off decide también el tamaño (a 32 px rizo, barbita y pompón van apretados).
- Cada mock: HTML autocontenido en marco de teléfono, sprite en reposo y triste, pijama, pantalla
  completa con medidores. Sprites como grillas indexadas a paleta.
- Pijama y noche por **cambio de paleta**, sin duplicar sprites.
- Verifica: capturas Playwright 390×844; chairman publica 2 Artifacts; CTO elige A, B o híbrido.

**H3. Lógica pura**
- `aplicarTiempo(estado, ahora)`: `delta <= 0` → no aplica y reancla `ultimaVez = ahora`;
  `delta = min(delta, TOPE)`; ritmos según dormida; pisos. Tick en sesión cada 30 s con la misma función.
- `guardado.ts` (Storage inyectado): clave fija, `{version, ...}`, migraciones `n → n+1`, luego
  `sanear()` (rangos, `NaN` → inicial). JSON ilegible → copiar a `clave.corrupto` y empezar de
  cero. `version` mayor que la del código → **no escribir**. Guardar tras cada acción y en
  `pagehide`/`hidden`. `navigator.storage?.persist?.()`.
- Verifica: `npm test` con delta negativo / 0 / 3 semanas, pisos y topes, dormida vs despierta,
  cada acción, migración v0→v1, JSON corrupto, versión futura, `NaN`, y sprites (filas de igual
  largo, índices dentro de la paleta).

**H4. Render**
- Frames precompuestos en canvas offscreen. `escala = floor(min(anchoCSS, altoCSS) * dpr /
  LOGICO)`, `imageSmoothingEnabled = false`, coordenadas enteras, recalcular en `resize`.
- 6–8 fps; con `prefers-reduced-motion`, frames estáticos.
- Verifica: E2E `canvas.width % LOGICO === 0`; capturas día, noche, dormida, pijama.

**H5. UI e integración**
- `<button>` reales con texto, ≥44 px; medidores `role="progressbar"`; canvas `role="img"` con
  `aria-label` que cambia. Fuente del sistema.
- Verifica (E2E `devices['iPhone 13']`, WebKit): botones ≥44 px; acción cambia medidor; persiste
  al recargar; `ultimaVez = ahora − 10 h` baja medidores; reloj hacia atrás sin error; consola
  limpia. Gate UI: `web-design-guidelines` + `impeccable audit`.

**H6. Iconos, actualización, entrega**
- `scripts/iconos.ts` con el sprite final (180/192/512 + maskable con 10 % de margen).
- Prueba de actualización: build A instalada en el teléfono → deploy B → al volver de segundo
  plano carga B sin perder guardado.
- Checklist manual en el iPhone, en el dominio definitivo.

## Pruebas en iOS real sin Mac: EAS Simulator (pedido del CTO)

Hechos verificados hoy:
- Safari no existe para Linux y el simulador de iOS exige macOS + Xcode. `xtool` compila y
  firma apps iOS desde Linux para un iPhone físico; no trae simulador y no aplica a una PWA.
- EAS Simulator (Expo, en preview) da un simulador de iOS remoto con Safari: sirve para abrir la
  URL de Vercel en Safari real, que es justo lo que Playwright WebKit no cubre.
- Requisitos según su documentación: plan de pago de Expo, `eas-cli` reciente, sesión iniciada,
  y un proyecto enlazado a Expo (`eas init`). Sesión máxima 115 min y cuenta contra el uso del plan.
- Estado de esta máquina: `eas` **no está instalado**; no hay skills de Expo instalados. No pude
  correr `eas simulator:availability --json` (plan mode no permite instalar).
- No hay app que instalar todavía, y la app es una PWA: en el simulador no se "instala un build",
  se abre la URL en Safari y se usa "Agregar a inicio".

Pasos, dentro de H1 (tras el primer deploy):
1. `npm install -g eas-cli`; instalar Expo Skills (`expo/skills`, skill `eas-simulator`) y leer
   su `SKILL.md` antes de usarlo.
2. `eas whoami`; si no hay sesión, el CTO corre `! eas login`.
3. `eas simulator:availability --json`. Si `available` es `false`: **parar**, avisar al CTO y
   seguir con Playwright WebKit + iPhone real. No se contrata plan sin aprobación (regla 14).
4. Si está disponible: `.env.eas-simulator` al `.gitignore`; proyecto Expo mínimo solo para tener
   ID (preguntar antes de `eas init`); `eas simulator:start --platform ios --type agent-device
   --max-duration-minutes 30 --non-interactive`.
5. Abrir la URL de producción en Safari, Agregar a inicio, abrir la app instalada, recorrer las
   pantallas; capturas + grabación para el CTO. `eas simulator:stop` siempre al terminar.
6. Repetir en H5 (juego completo) y H6 (prueba de actualización).

No verificado: que el controlador remoto permita "Agregar a inicio" y abrir la app instalada; que
el modo avión se pueda simular. Si no se puede, esas dos pruebas quedan para el iPhone real.

## Riesgos y no verificado

- **Cambiar el dominio de producción después de entregar borra a Clarita** (el guardado va atado
  al origen). Igual si ella borra el ícono. Exportar/importar guardado queda para v1.1.
- Playwright WebKit en Linux no es iOS Safari: el iPhone real es el criterio final. Necesito que
  tú o ella hagan las pruebas manuales de H1 y H6.
- No verificado en dispositivo: `skipWaiting` en standalone, `storage.persist()` en Safari,
  exención de los 7 días de ITP para apps instaladas.
- Pixel art escrito por un modelo como grillas de datos: riesgo de que no se parezca a Clarita.
  El bake-off existe para atajarlo antes de construir el juego; puede hacer falta más de una ronda.
- Balance sin probar con uso real; todo en `balance.ts` para ajustarlo.
- Codex (regla 13) y cuenta de Vercel a usar: se comprueban al ejecutar.
