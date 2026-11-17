// Generadores deterministas portados tal cual de mocks/propuesta-b.html (mismo rng y semillas).
function rng(a: number){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
// Nubes de la laguna (color 19 de la paleta): fuera de la grilla para poder derivar. Cada rect es [dx, dy, ancho] desde (x, y).
export type Nube={x: number,y: number,rects: [number,number,number][]};
export function nubes(W: number, H: number): Nube[]{
  const hz=Math.floor(H*.5);
  return ([[.2,.55,9],[.55,.7,6],[.86,.6,8]] as [number,number,number][]).map(([cx,cy,rx])=>({x:Math.floor(W*cx),y:Math.floor(hz*cy),
    rects:[-1,0,1].map(dy=>{const h=rx-Math.abs(dy)*3;return [-h,dy,2*h+1] as [number,number,number]})}))}
// Mezcla dither Bayer 4x4: true si el píxel (x, y) ya muestra el fondo nuevo en el paso 0..4.
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
export function mascaraDither(x: number,y: number,paso: number): boolean{return (BAYER[(y&3)*4+(x&3)]??0)<paso*4}
// Índices de la laguna que son cielo (degradado 0..3, estrellas 18 y 21, luna/sol 20): lo que una nube puede tapar.
export function esCielo(v: number): boolean{return v<=3||v===18||v===20||v===21}
export function laguna(W: number, H: number): Uint8Array{
  const g=new Uint8Array(W*H),r=rng(5),set=(x: number,y: number,v: number)=>{if(x>=0&&x<W&&y>=0&&y<H)g[y*W+x]=v};
  const hz=Math.floor(H*.5);
  for(let y=0;y<hz;y++)for(let x=0;x<W;x++){const p=y/hz*3.6,b=Math.floor(p);set(x,y,Math.min(3,b+(((x+y)&1)===0&&p-b>.72?1:0)))}
  for(let i=0;i<14;i++){const x=Math.floor(r()*W),y=3+Math.floor(r()*Math.floor(hz*.18));set(x,y,18)}
  for(let i=0;i<9;i++){const x=Math.floor(r()*W),y=Math.floor(hz*.31)+Math.floor(r()*Math.floor(hz*.2));set(x,y,21)}
  const mx=Math.floor(W*.78),my=Math.floor(hz*.42);
  for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++)if(x*x+y*y<=10)set(mx+x,my+y,20);
  const peaks=[[.04,.10*H,.5],[.30,.30*H,1.7],[.62,.15*H,.55],[1.02,.44*H,.95],[.44,.12*H,.8]] as [number,number,number][];
  for(let x=0;x<W;x++){let hh=0,lit=0;for(const [c,h,s] of peaks){const v=h-s*Math.abs(x-c*W);if(v>hh){hh=v;lit=x<c*W?1:0}}
    const top=Math.floor(hz-hh-(r()<.3?1:0));
    for(let y=Math.max(0,top);y<hz;y++){let v=4;if(lit?(x*2+y)%5<2:((x*2+y*3)%11===0||(x+y*2)%13===0))v=5;if(y-top<2&&lit)v=6;set(x,y,v)}}
  for(let y=hz-4;y<hz;y++)for(let x=0;x<W;x++)if(g[y*W+x]!==4&&g[y*W+x]!==5&&g[y*W+x]!==6||y>hz-3)set(x,y,r()<.22?8:7);
  const le=Math.floor(H*.72);
  for(let y=hz;y<le;y++){const t=(y-hz)/(le-hz);for(let x=0;x<W;x++)set(x,y,t<.12?9:(t>.7&&r()<.3?9:10))}
  for(let i=0;i<W*1.2;i++){const y=hz+1+Math.floor(r()*(le-hz-2)),x=Math.floor(r()*W),l=2+Math.floor(r()*4);for(let k=0;k<l;k++)set(x+k,y,11)}
  const top=(x: number)=>Math.floor(H*.70+H*.05*(1-x/W)+Math.sin(x/5)*.8);
  for(let x=0;x<W;x++)for(let y=top(x);y<H;y++)set(x,y,y===top(x)?14:12);
  const blob=(cx: number,cy: number,rx: number,ry: number,v: number)=>{for(let y=-ry;y<=ry;y++)for(let x=-rx;x<=rx;x++)if((x*x)/(rx*rx+.5)+(y*y)/(ry*ry+.5)<=1){const X=cx+x,Y=cy+y;if(X>=0&&X<W&&Y>=0&&Y<H&&(g[Y*W+X]??0)>=12)set(X,Y,v)}};
  for(let i=0;i<7;i++)blob(Math.floor(r()*W),Math.floor(H*.74+r()*H*.24),4+Math.floor(r()*6),2+Math.floor(r()*3),13);
  for(let i=0;i<9;i++)blob(Math.floor(r()*W),Math.floor(H*.72+r()*H*.26),3+Math.floor(r()*5),2+Math.floor(r()*2),15);
  for(let i=0;i<6;i++)blob(Math.floor(r()*W),Math.floor(H*.75+r()*H*.23),3+Math.floor(r()*4),2,14);
  for(let i=0;i<34;i++){const cx=Math.floor(r()*W),cy=Math.floor(H*.72+r()*H*.27),w=2+Math.floor(r()*3),v=r()<.55?16:17;for(let j=0;j<2;j++)for(let k=0;k<w;k++){const X=cx+k,Y=cy+j;if(X<W&&Y<H&&(g[Y*W+X]??0)>=12)set(X,Y,v)}}
  return g}
export function dormitorio(W: number, H: number): Uint8Array{
  const g=new Uint8Array(W*H),r=rng(9),set=(x: number,y: number,v: number)=>{if(x>=0&&x<W&&y>=0&&y<H)g[y*W+x]=v};
  const rect=(x: number,y: number,w: number,h: number,v: number)=>{for(let j=0;j<h;j++)for(let i=0;i<w;i++)set(x+i,y+j,v)};
  const fl=Math.floor(H*.52);
  rect(0,0,W,fl,0);rect(Math.floor(W*.72),0,W,fl,1);
  const wx=Math.floor(W*.07),wy=Math.floor(H*.09);
  rect(wx-2,wy-2,24,32,2);rect(wx,wy,20,28,16);rect(wx+9,wy,2,28,2);rect(wx,wy+13,20,2,2);
  set(wx+4,wy+4,17);set(wx+14,wy+7,17);set(wx+5,wy+20,17);set(wx+15,wy+9,18);set(wx+16,wy+9,18);set(wx+15,wy+8,18);
  const px=Math.floor(W*.52),py=Math.floor(H*.1);
  rect(px-1,py-1,24,17,2);rect(px,py,22,15,4);
  for(let x=0;x<22;x++){const h=3+Math.floor(5*Math.abs(Math.sin(x/4)));for(let y=15-h;y<15;y++)set(px+x,py+y,3)}
  const qx=Math.floor(W*.82),qy=Math.floor(H*.27);
  rect(qx,qy,13,17,5);for(let a=0;a<30;a++){set(qx+6+Math.round(Math.cos(a/4.7)*3),qy+8+Math.round(Math.sin(a/4.7)*4),6)}
  const sy=Math.floor(H*.42);rect(Math.floor(W*.5),sy,Math.floor(W*.36),2,7);
  rect(Math.floor(W*.54),sy-9,9,9,8);rect(Math.floor(W*.54)+10,sy-7,7,7,9);
  const bt=(x: number)=>Math.floor(H*.46+Math.sin(x/9)*2.2);
  for(let x=0;x<W;x++)for(let y=bt(x);y<H;y++)set(x,y,10);
  for(let i=0;i<W*H*.12;i++){const x=Math.floor(r()*W),y=Math.floor(H*.46+r()*H*.26);if(g[y*W+x]===10){const v=r()<.5?11:12;set(x,y,v);if(r()<.5)set(x+1,y,v)}}
  const st=(x: number)=>Math.floor(H*.72+Math.sin(x/12+1)*2);
  for(let x=0;x<W;x++)for(let y=st(x);y<H;y++)set(x,y,y===st(x)?15:13);
  for(let x=0;x<W;x++)for(let y=st(x)+3;y<H;y++)if((x*2+y*5)%37<2)set(x,y,14);
  for(let i=0;i<40;i++){const x=Math.floor(r()*W),y=Math.floor(H*.76+r()*H*.22);if(g[y*W+x]===13){set(x,y,r()<.5?14:15)}}
  return g}
