# Clarita (mascota virtual)

Mascota virtual en pixel art de una perrita llamada Clarita. PWA pensada para iPhone.

## Stack
Vite + TypeScript, canvas 2D vanilla, DOM para la interfaz, vite-plugin-pwa, vitest, Playwright (WebKit). Sin frameworks de UI ni motor de juego.

## Comandos
- `npm run dev` / `npm run build` / `npm run preview`
- `npm run typecheck` · `npm test` (vitest) · `npm run e2e` (Playwright)
- Producción en GitHub Pages: se despliega sola al mergear a `main` (`.github/workflows/pages.yml`) en https://jencarlosmoral3-max.github.io/clarita-mascota/ — no renombrar el repo: la partida guardada va atada a esa URL.

## Estructura de `src/`
- `main.ts`, `estilos.css`
- `logica/`: balance, estado, tiempo, acciones, animo, guardado
- `arte/`: paleta, sprites, fondos
- `escena/render.ts`, `ui/interfaz.ts`
- Tests en `tests/unit` y `tests/e2e`

## Reglas
- Textos de interfaz en español.
- Todos los números de balance en `src/logica/balance.ts`.
- Las fotos de referencia (`fotos de la modelo del juego/`) no entran al repo.

## Docs
Estado vivo: `docs/handoff.md`. Plan: `docs/plan-mascota-clarita.md`.
