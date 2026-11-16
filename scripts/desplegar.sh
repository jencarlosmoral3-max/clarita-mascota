#!/usr/bin/env bash
# Uso: scripts/desplegar.sh <url-git-del-repo-publico> <base-path>   (ej.: https://github.com/usuario/clarita.git /clarita/)
set -euo pipefail

[ "$#" -eq 2 ] || { echo "Uso: $0 <url-git-del-repo-publico> <base-path>" >&2; exit 1; }
remoto=$1
base=$2
case "$base" in /*/ | /) ;; *) echo "El base-path debe empezar y terminar con /: $base" >&2; exit 1 ;; esac

raiz=$(git rev-parse --show-toplevel)
cd "$raiz"
[ -z "$(git status --porcelain)" ] || { echo "El árbol git no está limpio." >&2; exit 1; }
[ "$(git branch --show-current)" = main ] || { echo "Hay que estar en la rama main." >&2; exit 1; }
sha=$(git rev-parse --short HEAD)

npm ci
npm run typecheck
npm test
BASE_PATH=$base npx vite build
touch dist/.nojekyll

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
cp -a dist/. "$tmp"/
cd "$tmp"
git init -q -b main
git add -A
git -c user.name=desplegar -c user.email=desplegar@localhost commit -q -m "deploy: $sha"
# Force intencional: el repo público es solo un artefacto de build, sin historia que preservar.
git push --force "$remoto" main
