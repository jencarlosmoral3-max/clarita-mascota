# Handoff — El tamagochi de Clarita

Última actualización: 2026-11-16

## Plan activo

**[Mascota virtual de Clarita](plan-mascota-clarita.md)** — aprobado por el CTO el 2026-11-16.
Hito activo: **H0 (limpieza y andamiaje)**, en curso. Siguen H1 (shell PWA + deploy), H2 (bake-off
visual) en paralelo con H3 (lógica), H4 (render), H5 (UI), H6 (iconos y entrega).

## Estado

- PWA para iPhone: Vite + TypeScript + canvas, sin motor. Aún sin código de juego.
- Repo: GitHub privado `jencarlosmoral3-max/clarita-mascota`. Los comandos `gh`/`git push` de este
  proyecto se corren con `GH_TOKEN=$(gh auth token -u jencarlosmoral3-max)` para no cambiar la
  cuenta activa global de `gh` (sigue siendo `JoseluisLarrazabal`).
- Plantilla Game-Studios retirada del proyecto el 2026-11-16 (aprobado con el plan): movida entera
  a `~/respaldo-ccgs-clarita/`. La copia global en `~/.claude` sigue.
- Fotos de referencia en `fotos de la modelo del juego/` (3 archivos); fuera del repo por `.gitignore`.

## Siguiente paso concreto

Cerrar H0: andamiaje Vite/TS/vitest/Playwright/CI en la rama `h0-andamiaje`, PR y merge.
Verificar con `npm run typecheck && npm test && npm run build`.

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
