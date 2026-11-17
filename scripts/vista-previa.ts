import { writeFileSync } from 'node:fs';
import { COMPUESTOS, SEQ, SP } from '../src/arte/sprites.ts';
import { paletaSprite, SCN } from '../src/arte/paleta.ts';

// Genera vista-previa.html (autocontenido): reproductores de cada secuencia y los frames compuestos junto a su base.
const fila = (r: number[]) => r.map((i) => (i === 0 ? '.' : i.toString(36))).join('');
const frames = Object.fromEntries(Object.entries(SP).map(([k, g]) => [k, g.map(fila)]));
const datos = {
  frames,
  seq: SEQ,
  compuestos: Object.fromEntries(Object.entries(COMPUESTOS).map(([k, v]) => [k, v.base])),
  pal: { pijama: paletaSprite(true), sin: paletaSprite(false) },
  fondos: {
    'Laguna de día': SCN.laguna.day[3],
    'Laguna de noche': SCN.laguna.night[3],
    Dormitorio: SCN.dormitorio.day[0],
  },
};
const json = JSON.stringify(datos).replace(/</g, '\\u003c');

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vista previa de Clarita</title>
<style>
:root { --bg:#faf7f2; --fg:#2a2220; --card:#fff; --borde:#d9cfc4; --acento:#c4185f; color-scheme: light dark; }
@media (prefers-color-scheme: dark) { :root { --bg:#17120f; --fg:#f1e9df; --card:#241d19; --borde:#4a3d35; --acento:#ff7fb5; } }
* { box-sizing: border-box; }
body { margin:0; padding:16px; background:var(--bg); color:var(--fg); font:16px/1.4 system-ui, sans-serif; }
h1 { font-size:1.4rem; margin:0 0 12px; }
h2 { font-size:1.1rem; margin:24px 0 8px; }
.ctl { display:flex; flex-wrap:wrap; gap:12px; align-items:center; position:sticky; top:0; background:var(--bg); padding:8px 0; z-index:1; }
.ctl label { display:flex; gap:6px; align-items:center; }
select, button { font:inherit; padding:6px 10px; border:1px solid var(--borde); border-radius:8px; background:var(--card); color:var(--fg); }
.grid { display:flex; flex-wrap:wrap; gap:12px; }
.card { background:var(--card); border:1px solid var(--borde); border-radius:12px; padding:8px; max-width:100%; }
.card b { display:block; margin-bottom:4px; }
.card small { color:var(--acento); }
canvas { display:block; image-rendering:pixelated; max-width:100%; height:auto; border-radius:6px; }
.par { display:flex; flex-wrap:wrap; gap:8px; }
</style>
</head>
<body>
<h1>Vista previa de Clarita</h1>
<div class="ctl">
  <label><input type="checkbox" id="pij" checked> Con pijama</label>
  <label>Fondo <select id="fon"></select></label>
  <button id="pausa" type="button">Pausa</button>
</div>
<h2>Secuencias</h2>
<div class="grid" id="seqs"></div>
<h2>Frames compuestos y su base</h2>
<div class="grid" id="comp"></div>
<script>
const D = ${json};
const E = 6, M = 4, N = 48;
const $ = (id) => document.getElementById(id);
const pij = $('pij'), fon = $('fon'), pausa = $('pausa');
Object.keys(D.fondos).forEach((k) => fon.add(new Option(k, k)));
let pausado = false, tick = 0;

function dibujar(cv, nombre, dx, dy, margen) {
  const c = cv.getContext('2d');
  c.fillStyle = D.fondos[fon.value];
  c.fillRect(0, 0, cv.width, cv.height);
  const pal = pij.checked ? D.pal.pijama : D.pal.sin;
  D.frames[nombre].forEach((fila, y) => {
    for (let x = 0; x < N; x++) {
      const ch = fila[x];
      if (ch === '.') continue;
      c.fillStyle = pal[parseInt(ch, 36)];
      c.fillRect((x + margen + dx) * E, (y + margen + (ch === 'm' ? 0 : dy)) * E, E, E); // 'm' = sombra (índice 22): se queda en el suelo
    }
  });
}
function lienzo(lado) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = lado * E;
  return cv;
}
function tarjeta(titulo, extra) {
  const d = document.createElement('div');
  d.className = 'card';
  const b = document.createElement('b');
  b.textContent = titulo;
  d.appendChild(b);
  if (extra) { const s = document.createElement('small'); s.textContent = extra; d.appendChild(s); }
  return d;
}
function pasoEn(seq, t) {
  const total = seq.reduce((a, p) => a + p.t, 0);
  let r = ((t % total) + total) % total;
  for (const p of seq) { if (r < p.t) return p; r -= p.t; }
  return seq[0];
}

const jugadores = [];
for (const [nombre, seq] of Object.entries(D.seq)) {
  const total = seq.reduce((a, p) => a + p.t, 0);
  const card = tarjeta(nombre, total + ' ticks · ' + (total / 10) + ' s');
  const cv = lienzo(N + 2 * M);
  card.appendChild(cv);
  $('seqs').appendChild(card);
  jugadores.push({ cv, seq });
}
const estaticos = [];
for (const [nombre, base] of Object.entries(D.compuestos)) {
  const card = tarjeta(nombre, 'base: ' + base);
  const par = document.createElement('div');
  par.className = 'par';
  for (const f of [base, nombre]) {
    const cv = lienzo(N);
    par.appendChild(cv);
    estaticos.push({ cv, f });
  }
  card.appendChild(par);
  $('comp').appendChild(card);
}
function pintar() {
  for (const j of jugadores) {
    const p = pasoEn(j.seq, tick);
    dibujar(j.cv, p.f, p.dx || 0, p.dy || 0, M);
  }
  for (const e of estaticos) dibujar(e.cv, e.f, 0, 0, 0);
}
setInterval(() => { if (!pausado) { tick++; pintar(); } }, 100);
[pij, fon].forEach((e) => e.addEventListener('change', pintar));
pausa.addEventListener('click', () => { pausado = !pausado; pausa.textContent = pausado ? 'Reanudar' : 'Pausa'; });
pintar();
</script>
</body>
</html>
`;
writeFileSync('vista-previa.html', html);
console.log('vista-previa.html generado');
