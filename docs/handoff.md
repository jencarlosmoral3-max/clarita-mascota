# Handoff — El tamagochi de Clarita

Última actualización: 2026-11-16

## Plan activo

**[Mascota virtual de Clarita](plan-mascota-clarita.md)** — aprobado por el CTO el 2026-11-16.

| Hito | Estado |
|---|---|
| H0 andamiaje | Cerrado, PR #1 |
| H1 cascarón PWA | Código cerrado, PR #3. **Deploy pendiente** (ver bloqueos) |
| H2 bake-off visual | Propuestas publicadas. **Esperando elección del CTO** |
| H3 lógica y guardado | Cerrado, PR #2 |
| H4 render | No iniciado; depende de H2 |
| H5 UI e integración | No iniciado; depende de H4 |
| H6 iconos, actualización, entrega | No iniciado |

## Estado (2026-11-16)

- `main` verificado: `npm run typecheck` limpio, `npm test` 62/62, `npm run e2e` 5/5 (WebKit, perfil
  iPhone 13: pantalla de instalación en iPhone y iPad, modo instalada, carga sin red, manifest e iconos).
- La app aún solo muestra "Clarita". La lógica (`src/logica/`) está escrita y testeada pero no
  conectada a ninguna pantalla.
- Repo: GitHub privado `jencarlosmoral3-max/clarita-mascota`. `gh` y `git push/fetch` se corren con
  `GH_TOKEN=$(gh auth token -u jencarlosmoral3-max)`; la cuenta activa global de `gh` sigue siendo
  `JoseluisLarrazabal`.
- Plantilla Game-Studios retirada del proyecto (aprobado con el plan): está entera en
  `~/respaldo-ccgs-clarita/`. La copia global en `~/.claude` sigue.
- Fotos de referencia en `fotos de la modelo del juego/` (3 archivos), fuera del repo por `.gitignore`.

## Bloqueos que necesitan al CTO

1. **Elegir dirección visual** (A, B o híbrido):
   - A, 32×32, taste-skill: https://claude.ai/artifact/99ge2HiKEgexss3LpzwMt3
   - B, 48×48, impeccable: https://claude.ai/artifact/Q71ZUXcP2ymWXPmd8kUxTs
   - Fuentes locales (no versionadas todavía): `scratchpad/bakeoff/propuesta-{a,b}.html` de la
     sesión del 2026-11-16. Se copian a `mocks/` cuando haya elección.
   - Opinión del chairman: B. A 32 px el pelo se lee como melena de león y la silueta se pierde.
     B se parece más, pero le falta: barbita más grande, hocico más angosto, flequillo sobre los ojos.
2. **Sesión de Vercel para desplegar.** No hay CLI de Vercel instalado y la integración GitHub de la
   cuenta Vercel (`jencarlosmoral2-1127s-projects`) devuelve 401. Opciones: `npx vercel login` en la
   terminal, o reconectar GitHub en Vercel e instalar su app en `jencarlosmoral3-max`.
   El dominio de producción que se asigne es definitivo: cambiarlo tras la entrega borra la partida.
3. **EAS Simulator**: depende del deploy. `eas` no está instalado; falta comprobar si la cuenta de
   Expo tiene plan de pago (`eas simulator:availability --json`).

## Siguiente paso concreto

Con la elección visual: subagente Sonnet implementa H4 (`src/arte/`, `src/escena/render.ts`) con
la paleta y los sprites ganadores. Con la sesión de Vercel: `npm run build` y deploy de producción,
luego prueba manual en iPhone (Agregar a inicio, modo avión, notch).

## Decisiones tomadas durante la ejecución

- `guardado.cargar`: si la lectura del almacenamiento lanza, se arranca en solo lectura para no
  pisar una partida real (hallazgo de `/code-review`; el brief original pedía lo contrario).
- La pantalla de instalación también se muestra en iPad.
- Acariciar: sube diversión 10 y da cariño solo si diversión estaba bajo 70; sin relojes.
- Valores iniciales: medidores en 80, cariño en 50. Frases de ánimo en `src/logica/animo.ts`.
- TypeScript 7 (compilador nativo) y Vite 8: lo que resolvió `latest`; typecheck y build pasan.

## No verificado

- Nada en iPhone real ni en Safari de iOS. Playwright WebKit en Linux no lo sustituye.
- Actualización del service worker en la app instalada.
- Codex (regla 13): no se corrió en ninguno de los 3 PR. Pendiente de pasar sobre `src/logica/` y `src/pwa.ts`.
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
