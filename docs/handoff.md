# Handoff — El tamagochi de Clarita

Última actualización: 2026-11-16

## Plan activo

**[Mascota virtual de Clarita](plan-mascota-clarita.md)** — aprobado por el CTO el 2026-11-16.

| Hito | Estado |
|---|---|
| H0 andamiaje | Cerrado, PR #1 |
| H1 cascarón PWA | Código cerrado, PR #3. **Deploy pendiente** (ver bloqueos) |
| H2 bake-off visual | Cerrado |
| H3 lógica y guardado | Cerrado, PR #2 |
| H2 elección | CTO eligió **B** (48×48) el 2026-11-16; mock en `mocks/propuesta-b.html` |
| H4 render | Cerrado, PR #5 |
| H5 UI e integración | Cerrado, PR #5. Falta gate de UI (`web-design-guidelines`, `impeccable audit`) |
| H6 iconos, actualización, entrega | No iniciado |

## Estado (2026-11-16)

- **El juego es jugable en local**: `npm run dev` (en escritorio se juega directo; en iPhone sin
  instalar muestra la pantalla de instalación). Medidores, 6 acciones, tocar a Clarita, pijama,
  día/noche, dormitorio al dormir, animación y efectos, guardado local, offline.
- `main` verificado: `npm run typecheck` limpio, `npm test` 75/75, `npm run e2e` 16/16 (WebKit,
  perfil iPhone 13).
- Repo: GitHub privado `jencarlosmoral3-max/clarita-mascota`. `gh` y `git push/fetch` se corren con
  `GH_TOKEN=$(gh auth token -u jencarlosmoral3-max)`; la cuenta activa global de `gh` sigue siendo
  `JoseluisLarrazabal`.
- Plantilla Game-Studios retirada del proyecto: entera en `~/respaldo-ccgs-clarita/`.
- Fotos de referencia en `fotos de la modelo del juego/`, fuera del repo por `.gitignore`.
- Fuente "Pixelify Sans" autoalojada (`@fontsource/pixelify-sans`), sin peticiones externas.

## Bloqueos que necesitan al CTO

1. **Deploy a Vercel.** El CTO inició `npx vercel login` el 2026-11-16; falta confirmar que terminó
   y con qué cuenta. El dominio de producción que se asigne es definitivo: cambiarlo tras la entrega
   borra la partida.
2. **EAS Simulator**: depende del deploy. `eas` no está instalado; falta comprobar plan de pago de
   Expo (`eas simulator:availability --json`).
3. **Prueba en el iPhone real**: Agregar a inicio, modo avión, notch y barra inferior.

## Siguiente paso concreto

Deploy de producción (`npx vercel --prod` con la sesión del CTO) → prueba en iPhone / EAS Simulator →
H6: iconos con el sprite real (`scripts/iconos.ts`), prueba de actualización del service worker.
Antes de entregar: gate de UI y Codex sobre `src/`.

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
