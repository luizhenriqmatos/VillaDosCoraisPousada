/* ============================================================================
   UM DIA NA VILA — maquete 3D que vira os 5 trechos de vídeo do capítulo 06
   ----------------------------------------------------------------------------
   Esta página NÃO vai para o site. Ela só existe para gerar os vídeos:
   o script renderizar.py abre ela num Chromium sem tela, pede quadro por quadro
   (window.cena.quadro(n)) e monta os .mp4 com ffmpeg.

   Tudo aqui é determinístico: o quadro 500 sai sempre igual. Por isso o último
   quadro de um trecho é idêntico ao primeiro do trecho seguinte — as emendas
   do vídeo não "pulam".

   Para mexer:
     PONTOS   caminho da câmera (p = onde ela está, q = para onde olha)
     HORAS    hora do dia no início/fim de cada trecho
     LUZ      cor e força da luz em cada hora
     CASAS    posição das 8 casas
   Prévia de um quadro no navegador: cena.html?w=960&h=540&f=300
   ========================================================================== */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { HorizontalTiltShiftShader } from 'three/addons/shaders/HorizontalTiltShiftShader.js';
import { VerticalTiltShiftShader } from 'three/addons/shaders/VerticalTiltShiftShader.js';

const qs = new URLSearchParams(location.search);
const W = +(qs.get('w') || 1920);
const H = +(qs.get('h') || 1080);
const FPS = +(qs.get('fps') || 24);
const SEG = +(qs.get('seg') || 9);          // segundos por trecho
const FPL = Math.round(FPS * SEG);          // quadros por trecho
const LEGS = 5;
const TOTAL = FPL * LEGS;                   // último quadro (inclusivo)

/* ---------------------------------------------------------------- util ---- */
function mulberry32(a) {
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(930);
const R = (a, b) => a + (b - a) * rnd();
const pick = arr => arr[Math.floor(rnd() * arr.length)];
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
function hash2(x, y) { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123; return h - Math.floor(h); }
function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), u), lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u), v);
}
const fbm = (x, y) => noise2(x, y) * 0.6 + noise2(x * 2.1 + 5.3, y * 2.1 - 1.7) * 0.3 + noise2(x * 4.3 - 2, y * 4.3 + 7) * 0.1;
const cor = c => (c instanceof THREE.Color) ? c : new THREE.Color(c);
const mistura = (a, b, t) => cor(a).clone().lerp(cor(b), clamp(t));
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/* ---------------------------------------------------------- paleta ---- */
const COR = {
  fundo: '#EFEEEA',
  areia: '#E4D6CB', areiaClara: '#ECE2D6', areiaMolhada: '#D2C0AF', caminho: '#E9DDCF',
  grama1: '#A9BFA4', grama2: '#95AE91', grama3: '#B8C9B0', lama: '#A89786',
  fundoRaso: '#E2D9CA', fundoFundo: '#9DAAA3',
  recife: '#7A716A', recife2: '#696159',
  coral1: '#E9C7BE', coral2: '#D9AFA6', coral3: '#E3A594',
  parede: '#F4F1EA', telhado: '#D6B4A6', telhado2: '#C9A294', madeira: '#C4A585', madeiraEsc: '#9E8166',
  porta: '#5E5A55', vidro: '#4A5157',
  tronco: '#A89480', folha1: '#6E8F72', folha2: '#80A285', folha3: '#5E7D64',
  arbusto1: '#7E9A80', arbusto2: '#8FAA8C', arbusto3: '#6F8C72',
  coco: '#8C6F4E', mangue: '#557060', mangue2: '#4A6454', raiz: '#7A6A5C',
  casco: '#F3F0EA', faixa: '#7FA9B0', canoa: '#9C7A5B',
  camisa: '#BFD3CC', pele: '#B78A6B', chapeu: '#E4D6CB', short: '#3A3C3B',
  mesa: '#B58F6A', toalha: '#FBFBFA', bule: '#2A2C2B', louca: '#FBFBFA',
  fruta1: '#E8945E', fruta2: '#F0BE55', fruta3: '#D9644F', bolo: '#E8D2AE',
  rede1: '#E3A594', rede2: '#FBFBFA',
  palha: '#CDB48E', palha2: '#BFA47C', vela: '#FFF4E0',
  panela: '#6B4A3A', moqueca: '#D9764A', arroz: '#F4EFE6', farofa: '#E2C58F', limao: '#8DBF5A', peixe: '#C98B6B',
  estrato: ['#D9C6B4', '#BCA595', '#A08B7E', '#877569', '#6E5F56'],
};

/* ------------------------------------------------ helpers de geometria ---- */
function prep(g) {
  const h = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(h.attributes)) if (k !== 'position') h.deleteAttribute(k);
  h.computeVertexNormals();
  return h;
}
function pinta(g, c, jit = 0.05) {
  g = prep(g);
  const base = cor(c);
  const n = g.attributes.position.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 3) {
    const j = 1 + (rnd() - 0.5) * 2 * jit;
    for (let k = 0; k < 3 && i + k < n; k++) {
      col[(i + k) * 3] = base.r * j; col[(i + k) * 3 + 1] = base.g * j; col[(i + k) * 3 + 2] = base.b * j;
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
const caixa = (w, h, d, x, y, z, c, jit = 0.03) => pinta(new THREE.BoxGeometry(w, h, d).translate(x, y, z), c, jit);
function haste(a, b, r0, r1, c, seg = 6, jit = 0.05) {
  const dir = new THREE.Vector3().subVectors(b, a); const len = dir.length(); dir.normalize();
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), dir));
  const m = a.clone().add(b).multiplyScalar(0.5); g.translate(m.x, m.y, m.z);
  return pinta(g, c, jit);
}
function triangulos(pts, c, jit = 0.05, duplo = false) {
  const arr = pts.slice();
  if (duplo) for (let i = 0; i < pts.length; i += 3) arr.push(pts[i], pts[i + 2], pts[i + 1]);
  return pinta(new THREE.BufferGeometry().setFromPoints(arr), c, jit);
}
function transforma(lista, x, y, z, ry = 0, s = 1) {
  const m = new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), ry), V3(s, s, s));
  for (const g of lista) g.applyMatrix4(m);
  return lista;
}

const ARGILA = [];                 // tudo que é estático e fosco
const JAN_A = [], JAN_B = [];      // janelas (A acende no amanhecer e à noite; B só à noite)
const LUZES = [];                  // lâmpadas, chamas e lanternas
const add = (...gs) => ARGILA.push(...gs);

/* ------------------------------------------------------ geografia ---- */
const IA = 44, IB = 31, NEXP = 3.4;
function raioIlha(th) {
  const c = Math.abs(Math.cos(th)), s = Math.abs(Math.sin(th));
  const r = Math.pow(Math.pow(c / IA, NEXP) + Math.pow(s / IB, NEXP), -1 / NEXP);
  return r * (1 + 0.03 * Math.sin(th * 3 + 1.3) + 0.022 * Math.sin(th * 7 + 0.4) + 0.012 * Math.sin(th * 13 + 2.2));
}
const dentroIlha = (x, z, folga = 0) => Math.hypot(x, z) < raioIlha(Math.atan2(z, x)) - folga;

const RIO = [[42, -33], [38, -24], [33.5, -16.5], [29.8, -9.8], [26.8, -3.2], [24.8, 3], [24.6, 9], [25.2, 15]];
const RIO_SEG = []; let rioTotal = 0;
for (let i = 0; i < RIO.length - 1; i++) {
  const [ax, az] = RIO[i], [bx, bz] = RIO[i + 1], L = Math.hypot(bx - ax, bz - az);
  RIO_SEG.push({ ax, az, bx, bz, L, s0: rioTotal }); rioTotal += L;
}
function rio(x, z) {
  let best = 1e9, bs = 0;
  for (const g of RIO_SEG) {
    const dx = g.bx - g.ax, dz = g.bz - g.az;
    const t = clamp(((x - g.ax) * dx + (z - g.az) * dz) / (g.L * g.L));
    const d = Math.hypot(x - (g.ax + dx * t), z - (g.az + dz * t));
    if (d < best) { best = d; bs = (g.s0 + t * g.L) / rioTotal; }
  }
  return { d: best, s: bs, hw: lerp(1.8, 3.5, smooth(bs)) + 0.3 * Math.sin(bs * 17) };
}
function pontoRio(s) {
  const alvo = clamp(s) * rioTotal;
  for (let k = 0; k < RIO_SEG.length; k++) {
    const g = RIO_SEG[k];
    if (alvo <= g.s0 + g.L || k === RIO_SEG.length - 1) {
      const t = clamp((alvo - g.s0) / g.L);
      return { x: g.ax + (g.bx - g.ax) * t, z: g.az + (g.bz - g.az) * t, dx: (g.bx - g.ax) / g.L, dz: (g.bz - g.az) / g.L };
    }
  }
}
const zPraia = x => 4.6 + 1.5 * Math.sin(x * 0.11 + 0.6) + 0.8 * Math.sin(x * 0.29 + 2.1);

const BACIAS = [
  { x: -8.5, z: 15.4, r: 2.5 }, { x: -15.5, z: 16.6, r: 2.0 }, { x: -2.2, z: 14.9, r: 2.1 },
  { x: 4.2, z: 16.5, r: 1.7 }, { x: -21.5, z: 15.6, r: 1.6 }, { x: -11.8, z: 18.9, r: 1.3 },
];

const CAMINHOS = [
  [[-11.5, -2.4], [-8, -8.5], [-2, -11.2], [5, -10.4], [10.6, -7], [12.4, -5.6]],
  [[-11.5, -2.4], [-17, -8.5], [-24, -12.5], [-30, -12.5]],
  [[-2, -11.2], [0, -17], [3, -21]],
  [[5, -10.4], [10, -14.2], [12.4, -14.4]],
  [[-17, -8.5], [-21.5, -16]],
  [[-11.5, -2.4], [-11.2, 1.8]],
];
function distSeg(x, z, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
  const t = clamp(((x - ax) * dx + (z - az) * dz) / L2);
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
}
function distCaminho(x, z) {
  let d = 1e9;
  for (const c of CAMINHOS) for (let i = 0; i < c.length - 1; i++) d = Math.min(d, distSeg(x, z, c[i][0], c[i][1], c[i + 1][0], c[i + 1][1]));
  return d;
}

function altura(x, z) {
  const dMar = z - zPraia(x);
  const terra = 0.55 + 0.5 * fbm(x * 0.07 + 3.1, z * 0.07 - 2.3) + clamp((-z - 8) * 0.018, 0, 0.4);
  let h;
  if (dMar < -7) h = terra;
  else if (dMar < 0) h = lerp(terra, 0.03, smooth((dMar + 7) / 7));
  else h = -0.12 - Math.min(dMar * 0.17, 1.5);
  if (dMar > 5.2 && dMar < 14.8 && x > -31 && x < 14) {        // recife de maré baixa
    const faixa = smooth((dMar - 5.2) / 1.6) * smooth((14.8 - dMar) / 1.6) * smooth((x + 31) / 3) * smooth((14 - x) / 3);
    let hr = lerp(h, 0.14 + 0.16 * fbm(x * 0.33 + 1, z * 0.33 + 4), faixa);
    for (const b of BACIAS) {
      const d = Math.hypot(x - b.x, z - b.z), rr = b.r * 1.15;
      if (d < rr) hr = Math.min(hr, lerp(-0.5, hr, Math.pow(smooth(d / rr), 2)));
    }
    h = hr;
  }
  const rr = rio(x, z);                                          // rio e margens
  if (rr.d < rr.hw + 2.6) h = lerp(-0.8, h, smooth((rr.d - rr.hw * 0.5) / (rr.hw * 0.5 + 2.6)));
  return h;
}
function corChao(x, z, h) {
  const dMar = z - zPraia(x), rr = rio(x, z);
  if (h < -0.04) return mistura(COR.fundoRaso, COR.fundoFundo, -h / 1.4);
  if (dMar > 4.6) { const n = fbm(x * 0.5, z * 0.5); return cor(n > 0.64 ? '#9A8F80' : n < 0.34 ? '#6F8272' : n > 0.5 ? COR.recife : COR.recife2); }
  if (rr.d < rr.hw + 2.2 && dMar < 0) return cor(COR.lama);
  if (dMar > -1.0) return cor(COR.areiaMolhada);
  if (dMar > -6.8) return cor(fbm(x * 0.3, z * 0.3) > 0.55 ? COR.areiaClara : COR.areia);
  if (distCaminho(x, z) < 0.85) return cor(COR.caminho);
  const n = fbm(x * 0.13 + 7, z * 0.13 - 3);
  return cor(n < 0.42 ? COR.grama2 : n < 0.6 ? COR.grama1 : COR.grama3);
}

/* ---------------------------------------------------- caminho da câmera ---- */
// p = posição, q = para onde olha. LIMITES = índice do ponto onde cada trecho começa/termina.
const PONTOS = [
  // 1 · 5h30 — de longe, a ilha inteira; desce sobre a Vila pelo lado da terra
  { p: [-60, 46, -66], q: [7, -7, -3] },
  { p: [-40, 30, -46], q: [0, -2, -4] },
  { p: [-22, 16, -28], q: [-8, 1, -5] },
  { p: [-6.2, 6.4, -13.0], q: [-10.5, 1.8, -4.5] },
  // 2 · 7h — contorna a casa e revela a mesa do café na varanda; sai para o mar
  { p: [-5.6, 4.2, -7.6], q: [-10.6, 1.9, -3.8] },
  { p: [-6.0, 2.9, 0.2], q: [-10.9, 1.75, -3.4] },
  // 3 · 10h — praia, recife e piscinas naturais
  { p: [-8.8, 2.7, 3.0], q: [-9.0, 0.2, 14.0] },
  { p: [-9.2, 2.6, 8.0], q: [-8.8, 0.0, 13.8] },
  { p: [-8.4, 3.2, 11.6], q: [-8.5, -0.3, 15.4] },
  { p: [-3.5, 2.8, 15.6], q: [4.2, 0.0, 16.5] },
  // 4 · 16h — foz e subida do rio, ao lado da canoa; sobe acima do mangue
  { p: [8.5, 3.2, 14.2], q: [19.5, 0.8, 8.8] },
  { p: [18.6, 2.8, 9.0], q: [24.0, 0.6, 1.8] },
  { p: [24.2, 2.4, 0.8], q: [27.6, 0.8, -7.5] },
  { p: [26.4, 2.3, -6.8], q: [30.4, 0.9, -12.6] },
  // 5 · 20h — volta para a Vila, jantar na pérgola
  { p: [28.6, 5.6, -14.8], q: [19, 1.6, -12] },
  { p: [22.5, 5.4, -14.6], q: [14, 1.4, -7.5] },
  { p: [17.8, 3.6, -11.2], q: [12.6, 1.2, -5.2] },
  { p: [16.6, 2.9, -9.6], q: [12.4, 1.1, -4.6] },
];
const LIMITES = [0, 3, 6, 10, 14, 17];
const HORAS = [4.9, 6.3, 8.4, 14.4, 18.3, 20.6];

const curvaP = new THREE.CatmullRomCurve3(PONTOS.map(o => V3(...o.p)), false, 'centripetal');
const curvaQ = new THREE.CatmullRomCurve3(PONTOS.map(o => V3(...o.q)), false, 'centripetal');
const DIV = 6000;
curvaP.arcLengthDivisions = DIV;
const comprimentos = curvaP.getLengths(DIV);
const compTotal = comprimentos[DIV];
const sLim = LIMITES.map(k => comprimentos[Math.round(k / (PONTOS.length - 1) * DIV)]);
const Ls = [], med = [];
for (let i = 0; i < LEGS; i++) { Ls[i] = sLim[i + 1] - sLim[i]; med[i] = Ls[i] / SEG; }
// velocidade nas emendas = média dos vizinhos (limitada para nunca andar para trás)
const vB = [Math.min(med[0] * 0.55, 2.4 * med[0])];
for (let i = 1; i < LEGS; i++) vB[i] = Math.min((med[i - 1] + med[i]) / 2, 2.6 * med[i - 1], 2.6 * med[i]);
vB[LEGS] = med[LEGS - 1] * 0.18;
function arcoNoQuadro(f) {
  const i = Math.min(LEGS - 1, Math.floor(f / FPL));
  const t = (f - i * FPL) / FPL, t2 = t * t, t3 = t2 * t;
  const s = sLim[i] + (t3 - 2 * t2 + t) * vB[i] * SEG + (-2 * t3 + 3 * t2) * Ls[i] + (t3 - t2) * vB[i + 1] * SEG;
  return { s, i, tau: t };
}
const AMOSTRAS = []; for (let k = 0; k <= 900; k++) AMOSTRAS.push(curvaP.getPoint(k / 900));
function livre(x, z, topo, folga, acima = 1.2) {
  for (const a of AMOSTRAS) if (a.y < topo + acima && Math.hypot(a.x - x, a.z - z) < folga) return false;
  return true;
}

/* ------------------------------------------------------------ cena ---- */
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.domElement.style.width = '100vw';
renderer.domElement.style.height = 'auto';
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(COR.fundo);
scene.fog = new THREE.Fog(new THREE.Color(COR.fundo), 120, 420);
const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 700);

const hemi = new THREE.HemisphereLight(0xffffff, 0xbbaaa0, 1.2);
scene.add(hemi);
const sol = new THREE.DirectionalLight(0xffffff, 2.5);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
Object.assign(sol.shadow.camera, { left: -58, right: 58, top: 58, bottom: -58, near: 1, far: 260 });
sol.shadow.bias = -0.0004;
sol.shadow.normalBias = 0.035;
scene.add(sol, sol.target);
const lampPergola = [V3(11.3, 2.05, -4.5), V3(13.9, 2.05, -4.5)].map(p => {
  const l = new THREE.PointLight(0xffb86b, 0, 11, 1.6); l.position.copy(p); scene.add(l); return l;
});
const lampCafe = new THREE.PointLight(0xffc27a, 0, 7, 1.6);
lampCafe.position.set(-11.2, 2.25, -3.0); scene.add(lampCafe);

/* ---------------------------------------------------------- chão ---- */
function grade(step, filtro) {
  const x0 = -IA - step, z0 = -IB - step;
  const nx = Math.ceil((2 * IA + 2 * step) / step), nz = Math.ceil((2 * IB + 2 * step) / step);
  const V = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) V.push([x0 + i * step, z0 + j * step]);
  const id = (i, j) => j * (nx + 1) + i, T = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = id(i, j), b = id(i + 1, j), c = id(i, j + 1), d = id(i + 1, j + 1);
    const tris = ((i + j) % 2 === 0) ? [[a, c, b], [b, c, d]] : [[a, c, d], [a, d, b]];
    for (const t of tris) {
      const cx = (V[t[0]][0] + V[t[1]][0] + V[t[2]][0]) / 3, cz = (V[t[0]][1] + V[t[1]][1] + V[t[2]][1]) / 3;
      if (dentroIlha(cx, cz) && filtro(cx, cz)) T.push(t);
    }
  }
  return { V, T };
}
function bordas(T) {
  const m = new Map();
  for (const t of T) for (let k = 0; k < 3; k++) {
    const a = t[k], b = t[(k + 1) % 3], key = a < b ? a + '_' + b : b + '_' + a;
    const e = m.get(key); if (e) e.n++; else m.set(key, { a, b, n: 1 });
  }
  return [...m.values()].filter(e => e.n === 1);
}
function parede(ax, az, ta, ba, bx, bz, tb, bb, c, lista) {
  const A = V3(ax, ta, az), B = V3(bx, tb, bz), Ab = V3(ax, ba, az), Bb = V3(bx, bb, bz);
  const n = new THREE.Vector3().subVectors(Ab, A).cross(new THREE.Vector3().subVectors(Bb, A));
  const ex = bx - ax, ez = bz - az;
  const pts = (n.x * -ez + n.z * ex) >= 0 ? [A, Ab, Bb, A, Bb, B] : [A, Bb, Ab, A, B, Bb];
  lista.push(triangulos(pts, c, 0.04));
}
function construirChao() {
  const { V, T } = grade(0.6, () => true);
  const E = bordas(T);
  const borda = new Set(); for (const e of E) { borda.add(e.a); borda.add(e.b); }
  for (const id of borda) { const [x, z] = V[id], th = Math.atan2(z, x), r = raioIlha(th) * 0.999; V[id] = [Math.cos(th) * r, Math.sin(th) * r]; }
  const Hh = V.map(([x, z]) => altura(x, z));
  const pos = [], col = [];
  for (const t of T) {
    const cx = (V[t[0]][0] + V[t[1]][0] + V[t[2]][0]) / 3, cz = (V[t[0]][1] + V[t[1]][1] + V[t[2]][1]) / 3;
    const c = corChao(cx, cz, (Hh[t[0]] + Hh[t[1]] + Hh[t[2]]) / 3), j = 1 + (rnd() - 0.5) * 0.06;
    for (const id of t) { pos.push(V[id][0], Hh[id], V[id][1]); col.push(c.r * j, c.g * j, c.b * j); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  add(g);
  const NIV = [-1.9, -3.7, -5.6, -7.4, -9.2], paredes = [];
  for (const e of E) {
    const [ax, az] = V[e.a], [bx, bz] = V[e.b];
    let ta = Hh[e.a], tb = Hh[e.b];
    for (let k = 0; k < NIV.length; k++) {
      parede(ax, az, ta, NIV[k], bx, bz, tb, NIV[k], COR.estrato[k], paredes);
      ta = tb = NIV[k];
    }
  }
  add(...paredes);
}

/* ---------------------------------------------------------- água ---- */
let aguaGeo, aguaBase, aguaAmp;
const matAgua = new THREE.MeshStandardMaterial({ color: '#5FBDB5', transparent: true, opacity: 0.74, roughness: 0.2, metalness: 0.05, flatShading: true });
function construirAgua() {
  const STEP = 0.9;
  const { V, T } = grade(STEP, (x, z) => altura(x, z) < 0.14);
  const E = bordas(T);
  const contorno = new Set();
  for (const e of E) for (const id of [e.a, e.b]) {
    const [x, z] = V[id];
    if (Math.hypot(x, z) > raioIlha(Math.atan2(z, x)) - STEP * 1.6) contorno.add(id);
  }
  for (const id of contorno) { const [x, z] = V[id], th = Math.atan2(z, x), r = raioIlha(th) * 0.998; V[id] = [Math.cos(th) * r, Math.sin(th) * r]; }
  const pos = [], base = [], amp = [];
  for (const t of T) for (const id of t) {
    const [x, z] = V[id];
    pos.push(x, 0, z); base.push(x, z);
    amp.push(z - zPraia(x) > 0.6 && rio(x, z).d > 4 ? 0.05 : 0.016);
  }
  aguaGeo = new THREE.BufferGeometry();
  aguaGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  aguaBase = new Float32Array(base); aguaAmp = new Float32Array(amp);
  const agua = new THREE.Mesh(aguaGeo, matAgua);
  agua.receiveShadow = true; agua.renderOrder = 2;
  scene.add(agua);
  // a "fatia" de mar vista na lateral da ilha
  const lados = [];
  for (const e of E) {
    if (!contorno.has(e.a) || !contorno.has(e.b)) continue;
    const [ax, az] = V[e.a], [bx, bz] = V[e.b];
    parede(ax, az, 0, Math.min(altura(ax, az), -0.05), bx, bz, 0, Math.min(altura(bx, bz), -0.05), '#5DB3AE', lados);
  }
  if (lados.length) {
    const m = new THREE.Mesh(mergeGeometries(lados), new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.5, roughness: 0.3, side: THREE.DoubleSide }));
    m.renderOrder = 1; scene.add(m);
  }
}
function ondas(t) {
  const p = aguaGeo.attributes.position.array;
  for (let i = 0, n = aguaAmp.length; i < n; i++) {
    const x = aguaBase[i * 2], z = aguaBase[i * 2 + 1];
    p[i * 3 + 1] = aguaAmp[i] * (0.6 * Math.sin(0.55 * x + 1.3 * t) + 0.4 * Math.sin(0.8 * z - 1.1 * t + 0.17 * x));
  }
  aguaGeo.attributes.position.needsUpdate = true;
}

/* ---------------------------------------------------------- casas ---- */
const CASAS = [
  { x: -30, z: -11.5, r: 0.25, jan: 'A' },
  { x: -22.5, z: -18, r: -0.1, jan: 'B' },
  { x: -12, z: -6.2, r: 0.0, jan: 'A', cafe: true },
  { x: -4.5, z: -15, r: 0.18, jan: 'B' },
  { x: 3.5, z: -7, r: -0.12, jan: 'B' },
  { x: 12.5, z: -16, r: 0.3, jan: 'A' },
  { x: -26, z: -25, r: 0.05, jan: 'B' },
  { x: 3.5, z: -23, r: -0.2, jan: 'B' },
];
function construirCasa(c) {
  const w = 4.6, d = 3.6, hp = 2.4, y0 = altura(c.x, c.z) - 0.05;
  const G = [], J = [];
  G.push(caixa(w + 0.5, 0.9, d + 0.5, 0, -0.15, 0, COR.areiaClara));                      // base
  G.push(caixa(w, hp, d, 0, 0.3 + hp / 2, 0, COR.parede, 0.015));                           // paredes
  const pitch = 0.52, topoParede = 0.3 + hp, cumeeira = topoParede + (d / 2) * Math.tan(pitch) + 0.1;
  const L = (d / 2 + 0.5) / Math.cos(pitch);
  for (const s of [-1, 1]) {                                                                 // telhado de duas águas
    const g = new THREE.BoxGeometry(w + 0.7, 0.16, L);
    g.rotateX(s * pitch);
    g.translate(0, cumeeira - (L / 2) * Math.sin(pitch), s * (L / 2) * Math.cos(pitch));
    G.push(pinta(g, s > 0 ? COR.telhado : COR.telhado2, 0.03));
  }
  for (const sx of [-1, 1]) {                                                                // oitões
    const x = sx * w / 2;
    G.push(triangulos([V3(x, topoParede, -d / 2), V3(x, topoParede, d / 2), V3(x, cumeeira - 0.12, 0)], COR.parede, 0.01, true));
  }
  G.push(caixa(w + 0.4, 0.16, 2.1, 0, 0.38, d / 2 + 1.05, COR.madeira));                    // deque da varanda
  for (const x of [-w / 2 - 0.05, 0, w / 2 + 0.05]) G.push(caixa(0.16, 2.1, 0.16, x, 0.46 + 1.05, d / 2 + 2.0, COR.madeiraEsc));
  { const g = new THREE.BoxGeometry(w + 0.8, 0.1, 2.5); g.rotateX(0.13); g.translate(0, 2.56, d / 2 + 1.15); G.push(pinta(g, COR.telhado2, 0.03)); }
  G.push(caixa(0.86, 1.75, 0.08, -0.6, 0.3 + 0.875, d / 2 + 0.03, COR.porta));               // porta
  const janela = (x, y, z, rot) => {
    const g = new THREE.BoxGeometry(0.95, 0.75, 0.08); if (rot) g.rotateY(Math.PI / 2); g.translate(x, y, z);
    J.push(pinta(g, COR.vidro, 0.03));
    const p = new THREE.BoxGeometry(1.1, 0.08, 0.16); if (rot) p.rotateY(Math.PI / 2);
    p.translate(x, y - 0.42, z); G.push(pinta(p, COR.toalha, 0.01));
  };
  janela(-1.75, 1.55, d / 2 + 0.03); janela(1.2, 1.55, d / 2 + 0.03);
  janela(w / 2 + 0.03, 1.55, 0, true); janela(-w / 2 - 0.03, 1.55, 0, true); janela(0.6, 1.55, -d / 2 - 0.03);
  for (const x of [-w / 2 + 0.25, w / 2 - 0.25]) {                                          // vasos na varanda
    G.push(pinta(new THREE.CylinderGeometry(0.16, 0.12, 0.3, 7).translate(x, 0.61, d / 2 + 0.35), COR.telhado2, 0.04));
    G.push(pinta(new THREE.IcosahedronGeometry(0.3, 0).scale(1, 1.15, 1).translate(x, 0.98, d / 2 + 0.35), pick([COR.folha1, COR.folha2]), 0.1));
  }
  if (c.cafe) construirCafe(G, w, d);
  transforma(G, c.x, y0, c.z, c.r); transforma(J, c.x, y0, c.z, c.r);
  add(...G); (c.jan === 'A' ? JAN_A : JAN_B).push(...J);
}
function construirCafe(G, w, d) {
  const piso = 0.46, zc = d / 2 + 1.0, xc = 1.25;
  const topo = piso + 0.72;
  G.push(caixa(1.2, 0.06, 0.8, xc, topo, zc, COR.mesa));
  for (const sx of [-0.52, 0.52]) for (const sz of [-0.32, 0.32]) G.push(caixa(0.06, 0.72, 0.06, xc + sx, piso + 0.36, zc + sz, COR.mesa));
  G.push(caixa(1.26, 0.02, 0.86, xc, topo + 0.04, zc, COR.toalha, 0.01));
  const y = topo + 0.05;
  G.push(pinta(new THREE.CylinderGeometry(0.07, 0.085, 0.2, 8).translate(xc - 0.35, y + 0.1, zc - 0.15), COR.bule, 0.02));
  G.push(pinta(new THREE.ConeGeometry(0.06, 0.06, 8).translate(xc - 0.35, y + 0.23, zc - 0.15), COR.bule, 0.02));
  G.push(haste(V3(xc - 0.29, y + 0.12, zc - 0.15), V3(xc - 0.2, y + 0.2, zc - 0.15), 0.018, 0.012, COR.bule, 5));
  for (const [dx, dz] of [[0.1, -0.22], [0.15, 0.24]]) {
    G.push(pinta(new THREE.CylinderGeometry(0.07, 0.07, 0.012, 10).translate(xc + dx, y + 0.006, zc + dz), COR.louca, 0.01));
    G.push(pinta(new THREE.CylinderGeometry(0.048, 0.04, 0.065, 8).translate(xc + dx, y + 0.045, zc + dz), COR.coral3, 0.02));
  }
  G.push(pinta(new THREE.SphereGeometry(0.17, 9, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(xc - 0.05, y + 0.17, zc + 0.02), COR.louca, 0.02));
  for (let k = 0; k < 6; k++) {
    const a = k * 1.05, r = k === 5 ? 0 : 0.085;
    G.push(pinta(new THREE.IcosahedronGeometry(R(0.055, 0.075), 1).translate(xc - 0.05 + Math.cos(a) * r, y + 0.2 + (k === 5 ? 0.05 : 0), zc + 0.02 + Math.sin(a) * r), pick([COR.fruta1, COR.fruta2, COR.fruta3]), 0.05));
  }
  G.push(pinta(new THREE.CylinderGeometry(0.17, 0.17, 0.012, 12).translate(xc + 0.38, y + 0.006, zc + 0.05), COR.louca, 0.01));
  G.push(pinta(new THREE.CylinderGeometry(0.13, 0.13, 0.09, 12).translate(xc + 0.38, y + 0.055, zc + 0.05), COR.bolo, 0.02));
  G.push(pinta(new THREE.CylinderGeometry(0.035, 0.045, 0.13, 7).translate(xc - 0.42, y + 0.065, zc + 0.26), COR.louca, 0.01));
  G.push(pinta(new THREE.IcosahedronGeometry(0.06, 0).translate(xc - 0.42, y + 0.16, zc + 0.26), COR.coral3, 0.04));
  for (const dz of [-0.62, 0.62]) {                                                          // cadeiras
    G.push(caixa(0.45, 0.05, 0.42, xc, piso + 0.45, zc + dz, COR.madeira));
    G.push(caixa(0.45, 0.5, 0.05, xc, piso + 0.72, zc + dz + Math.sign(dz) * 0.2, COR.madeira));
    for (const sx of [-0.19, 0.19]) for (const sz of [-0.17, 0.17]) G.push(caixa(0.04, 0.45, 0.04, xc + sx, piso + 0.22, zc + dz + sz, COR.madeiraEsc));
  }
  // rede entre dois esteios, do lado da janela
  const A = V3(-2.2, 1.85, d / 2 + 1.9), B = V3(-0.25, 1.85, d / 2 + 1.9), N = 14, pts = [];
  const faixa = k => (Math.floor(k / 2) % 2 === 0) ? COR.rede1 : COR.rede2;
  for (let k = 0; k < N; k++) {
    const t0 = k / N, t1 = (k + 1) / N;
    const P = t => V3(lerp(A.x, B.x, t), A.y - 0.62 * Math.sin(Math.PI * t) - 0.05, A.z);
    const w0 = 0.28 * Math.sin(Math.PI * Math.min(1, t0 * 1.2 + 0.05)) + 0.05, w1 = 0.28 * Math.sin(Math.PI * Math.min(1, t1 * 1.2 + 0.05)) + 0.05;
    const p0 = P(t0), p1 = P(t1);
    const q = [V3(p0.x, p0.y + 0.06, p0.z - w0), V3(p0.x, p0.y, p0.z), V3(p0.x, p0.y + 0.06, p0.z + w0),
               V3(p1.x, p1.y + 0.06, p1.z - w1), V3(p1.x, p1.y, p1.z), V3(p1.x, p1.y + 0.06, p1.z + w1)];
    G.push(triangulos([q[0], q[1], q[4], q[0], q[4], q[3], q[1], q[2], q[5], q[1], q[5], q[4]], faixa(k), 0.03, true));
  }
}

/* ----------------------------------------------------- vegetação ---- */
function folha(topo, phi, L, sobe) {
  const segs = 6, lado = V3(-Math.sin(phi), 0, Math.cos(phi)), sp = [], pts = [];
  for (let k = 0; k <= segs; k++) {
    const u = k / segs;
    sp.push(V3(topo.x + Math.cos(phi) * u * L, topo.y + sobe * Math.sin(u * Math.PI * 0.6) - u * u * L * 0.55, topo.z + Math.sin(phi) * u * L));
  }
  for (let k = 0; k < segs; k++) {
    const u0 = k / segs, u1 = (k + 1) / segs;
    const w0 = 0.55 * Math.sin(Math.PI * Math.min(1, u0 * 1.05 + 0.1)), w1 = 0.55 * Math.sin(Math.PI * Math.min(1, u1 * 1.05 + 0.1));
    const s0 = sp[k], s1 = sp[k + 1];
    const L0 = s0.clone().addScaledVector(lado, w0).setY(s0.y - 0.2 * w0), R0 = s0.clone().addScaledVector(lado, -w0).setY(s0.y - 0.2 * w0);
    const L1 = s1.clone().addScaledVector(lado, w1).setY(s1.y - 0.2 * w1), R1 = s1.clone().addScaledVector(lado, -w1).setY(s1.y - 0.2 * w1);
    pts.push(s0, L0, L1, s0, L1, s1, s0, s1, R1, s0, R1, R0);
  }
  return triangulos(pts, pick([COR.folha1, COR.folha2, COR.folha3]), 0.08, true);
}
function coqueiro(x, z, h = R(6.2, 9.6)) {
  const y0 = altura(x, z) - 0.1, ang = R(0, Math.PI * 2), inc = R(0.2, 1.2);
  const topo = V3(x + Math.cos(ang) * inc * h * 0.16, y0 + h, z + Math.sin(ang) * inc * h * 0.16);
  const meio = V3(x + Math.cos(ang) * inc * h * 0.03, y0 + h * 0.5, z + Math.sin(ang) * inc * h * 0.03);
  const curva = new THREE.QuadraticBezierCurve3(V3(x, y0, z), meio, topo);
  const N = 6;
  for (let i = 0; i < N; i++) add(haste(curva.getPoint(i / N), curva.getPoint((i + 1) / N), lerp(0.3, 0.17, i / N) * 1.1, lerp(0.3, 0.17, (i + 1) / N), COR.tronco, 6, 0.07));
  const nF = 9 + Math.floor(R(0, 3));
  for (let i = 0; i < nF; i++) add(folha(topo, i / nF * Math.PI * 2 + R(-0.2, 0.2), R(2.5, 3.4), R(0.35, 0.75)));
  for (let i = 0; i < 3; i++) add(pinta(new THREE.IcosahedronGeometry(0.17, 0).translate(topo.x + Math.cos(i * 2.1) * 0.24, topo.y - 0.25, topo.z + Math.sin(i * 2.1) * 0.24), COR.coco, 0.06));
}
function arbusto(x, z, s = R(0.55, 1.35)) {
  const y0 = altura(x, z);
  add(pinta(new THREE.IcosahedronGeometry(s, 0).scale(1, R(0.55, 0.85), 1).rotateY(R(0, 6)).translate(x, y0 + s * 0.35, z), pick([COR.arbusto1, COR.arbusto2, COR.arbusto3]), 0.1));
}
function mangue(x, z) {
  const y0 = altura(x, z), h = R(0.8, 1.2);
  for (let k = 0; k < 4; k++) {
    const r = R(0.7, 1.1);
    add(pinta(new THREE.IcosahedronGeometry(r, 0).scale(1.2, 0.65, 1).rotateY(R(0, 6)).translate(x + R(-0.6, 0.6), y0 + h + R(-0.1, 0.35), z + R(-0.6, 0.6)), pick([COR.mangue, COR.mangue2]), 0.1));
  }
  for (let k = 0; k < 4; k++) {
    const a = k * 1.6 + R(0, 0.5);
    add(haste(V3(x + Math.cos(a) * 0.9, y0 - 0.2, z + Math.sin(a) * 0.9), V3(x, y0 + h, z), 0.05, 0.035, COR.raiz, 4));
  }
}
const OCUPADO = [];   // círculos onde não nasce planta: casas, pérgola, mesa
function vago(x, z, raio = 0) { return OCUPADO.every(o => Math.hypot(o.x - x, o.z - z) > o.r + raio); }

/* ------------------------------------------------- mar e recife ---- */
function recife() {
  const rochas = [];
  for (let n = 0; n < 900 && rochas.length < 60; n++) {
    const x = R(-30, 13), z = zPraia(x) + R(5.8, 14.2);
    const h = altura(x, z);
    if (h < -0.08 || !dentroIlha(x, z, 1)) continue;
    if (BACIAS.some(b => Math.hypot(b.x - x, b.z - z) < b.r * 0.95)) continue;
    rochas.push([x, z]);
  }
  for (const b of BACIAS) {                                 // anel de pedra em volta de cada piscina
    const n = Math.round(b.r * 6.5);
    for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + R(-0.2, 0.2), r = b.r * R(1.0, 1.25); rochas.push([b.x + Math.cos(a) * r, b.z + Math.sin(a) * r]); }
  }
  for (const [x, z] of rochas) {
    const r = R(0.2, 0.55);
    add(pinta(new THREE.DodecahedronGeometry(r, 0).scale(1, R(0.4, 0.7), R(0.7, 1.1)).rotateY(R(0, 6)).translate(x, Math.max(altura(x, z), -0.1) + r * 0.12, z), pick([COR.recife, COR.recife2, '#857B72']), 0.08));
  }
  for (let n = 0; n < 70; n++) {                            // pedaços de coral nas bordas das piscinas
    const b = pick(BACIAS), a = R(0, Math.PI * 2), r = b.r * R(0.6, 1.1);
    const x = b.x + Math.cos(a) * r, z = b.z + Math.sin(a) * r, y = altura(x, z);
    const c = pick([COR.coral1, COR.coral2, COR.coral3]);
    add(rnd() < 0.5
      ? pinta(new THREE.ConeGeometry(R(0.06, 0.11), R(0.18, 0.34), 5).translate(x, y + 0.1, z), c, 0.06)
      : pinta(new THREE.IcosahedronGeometry(R(0.08, 0.16), 0).scale(1, 0.7, 1).translate(x, y + 0.05, z), c, 0.06));
  }
}
function barco(x, z, ry, cor1 = COR.casco, cor2 = COR.faixa) {
  const y0 = altura(x, z) + 0.12, G = [];
  G.push(pinta(new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1.35, 0.38, 0.5).translate(0, 0.36, 0), cor1, 0.02));
  G.push(pinta(new THREE.TorusGeometry(1, 0.05, 4, 16).rotateX(Math.PI / 2).scale(1.35, 1, 0.5).translate(0, 0.36, 0), cor2, 0.02));
  G.push(caixa(0.1, 0.05, 0.85, 0.3, 0.3, 0, COR.madeira));
  G.push(caixa(0.1, 0.05, 0.75, -0.55, 0.3, 0, COR.madeira));
  const m = new THREE.Matrix4().makeRotationZ(0.12);
  for (const g of G) g.applyMatrix4(m);
  add(...transforma(G, x, y0, z, ry));
}

/* ----------------------------------------------- pérgola do jantar ---- */
const PERG = { x: 12.5, z: -4.5 };
function pergola() {
  const y0 = altura(PERG.x, PERG.z) - 0.02, G = [], L = [];
  G.push(caixa(6.8, 0.4, 3.9, 0, -0.08, 0, COR.madeira));
  for (const x of [-3, 0, 3]) for (const z of [-1.65, 1.65]) G.push(caixa(0.16, 2.5, 0.16, x, 0.12 + 1.25, z, COR.madeiraEsc));
  for (const z of [-1.65, 1.65]) G.push(caixa(6.6, 0.14, 0.14, 0, 2.62, z, COR.madeiraEsc));
  for (const x of [-3, 0, 3]) G.push(caixa(0.12, 0.12, 3.6, x, 2.7, 0, COR.madeiraEsc));
  const pitch = 0.42, Lr = 2.35;
  for (const s of [-1, 1]) {
    const g = new THREE.BoxGeometry(7.3, 0.2, Lr); g.rotateX(s * pitch);
    g.translate(0, 3.32 - (Lr / 2) * Math.sin(pitch), s * (Lr / 2) * Math.cos(pitch));
    G.push(pinta(g, COR.palha, 0.06));
    const zb = s * Lr * Math.cos(pitch), yb = 3.32 - Lr * Math.sin(pitch);        // franja de palha
    for (let x = -3.55; x <= 3.56; x += 0.24) G.push(pinta(new THREE.ConeGeometry(0.13, R(0.26, 0.42), 4).rotateX(Math.PI).translate(x, yb - 0.14, zb), COR.palha2, 0.08));
  }
  const tampo = 0.12 + 0.74;
  G.push(caixa(4.6, 0.07, 0.92, 0, tampo, 0, COR.mesa));
  for (const sx of [-2.1, 2.1]) for (const sz of [-0.36, 0.36]) G.push(caixa(0.08, 0.74, 0.08, sx, 0.12 + 0.37, sz, COR.madeiraEsc));
  for (const z of [-0.8, 0.8]) {
    G.push(caixa(4.4, 0.07, 0.34, 0, 0.12 + 0.44, z, COR.mesa));
    for (const sx of [-1.9, 0, 1.9]) G.push(caixa(0.07, 0.44, 0.07, sx, 0.12 + 0.22, z, COR.madeiraEsc));
  }
  const y = tampo + 0.04;
  for (const x of [-1.7, -0.6, 0.6, 1.7]) for (const z of [-0.3, 0.3]) G.push(pinta(new THREE.CylinderGeometry(0.15, 0.15, 0.016, 12).translate(x, y + 0.008, z), COR.louca, 0.01));
  G.push(pinta(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 14).scale(2.3, 1, 1).translate(0, y + 0.01, 0), COR.louca, 0.01));
  G.push(pinta(new THREE.SphereGeometry(0.1, 8, 6).scale(3.0, 0.8, 1.05).translate(0.05, y + 0.07, 0), COR.peixe, 0.04));
  G.push(pinta(new THREE.ConeGeometry(0.1, 0.2, 4).rotateZ(Math.PI / 2).scale(1, 1, 0.5).translate(-0.37, y + 0.07, 0), COR.peixe, 0.04));
  for (const [dx, dz] of [[0.28, 0.12], [0.33, -0.1], [-0.2, 0.15]]) G.push(pinta(new THREE.IcosahedronGeometry(0.045, 0).translate(dx, y + 0.05, dz), COR.limao, 0.04));
  for (const x of [-1.15, 1.15]) {
    G.push(pinta(new THREE.CylinderGeometry(0.16, 0.13, 0.11, 10).translate(x, y + 0.055, 0.02), COR.panela, 0.03));
    G.push(pinta(new THREE.CylinderGeometry(0.14, 0.14, 0.012, 10).translate(x, y + 0.108, 0.02), COR.moqueca, 0.03));
  }
  G.push(pinta(new THREE.SphereGeometry(0.12, 8, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(-0.62, y + 0.12, -0.05), COR.louca, 0.01));
  G.push(pinta(new THREE.CylinderGeometry(0.11, 0.11, 0.01, 10).translate(-0.62, y + 0.115, -0.05), COR.arroz, 0.01));
  G.push(pinta(new THREE.SphereGeometry(0.1, 8, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(0.62, y + 0.1, 0.06), COR.louca, 0.01));
  G.push(pinta(new THREE.CylinderGeometry(0.09, 0.09, 0.01, 10).translate(0.62, y + 0.095, 0.06), COR.farofa, 0.01));
  for (const x of [-2.0, -1.45, 1.45, 2.0]) {                          // velas
    G.push(pinta(new THREE.CylinderGeometry(0.035, 0.035, 0.15, 8).translate(x, y + 0.075, 0.02), COR.vela, 0.01));
    L.push(pinta(new THREE.ConeGeometry(0.024, 0.07, 6).translate(x, y + 0.19, 0.02), '#FFE2B0', 0.01));
  }
  // varais de luz: dois postes de madeira na frente
  const P1 = V3(-5.6, 3.15, 3.3), P2 = V3(5.8, 3.15, 3.5);
  for (const P of [P1, P2]) G.push(caixa(0.14, 3.3, 0.14, P.x, 0.12 + 1.5, P.z, COR.madeiraEsc));
  const varal = (A, B, flecha) => {
    const n = Math.max(6, Math.round(A.distanceTo(B) / 0.42));
    for (let k = 1; k < n; k++) {
      const t = k / n, p = A.clone().lerp(B, t); p.y -= flecha * 4 * t * (1 - t);
      L.push(pinta(new THREE.IcosahedronGeometry(0.06, 0).translate(p.x, p.y, p.z), '#FFE2B0', 0.02));
    }
  };
  varal(V3(-3, 2.6, 1.65), P1, 0.55); varal(V3(3, 2.6, 1.65), P2, 0.55); varal(P1, P2, 0.95);
  varal(V3(-3, 2.6, -1.65), V3(3, 2.6, -1.65), 0.35);
  transforma(G, PERG.x, y0, PERG.z, 0.06); transforma(L, PERG.x, y0, PERG.z, 0.06);
  add(...G); LUZES.push(...L);
}
function lanternas() {
  const pts = [[10.4, -7.2], [8.2, -8.7], [5.7, -9.9], [2.4, -11.0], [-0.9, -11.6], [-11.0, -0.4], [-12.3, 1.2]];
  for (const [x, z] of pts) {
    const y0 = altura(x, z);
    add(caixa(0.08, 1.0, 0.08, x, y0 + 0.5, z, COR.madeiraEsc));
    add(caixa(0.24, 0.05, 0.24, x, y0 + 1.27, z, COR.bule));
    LUZES.push(caixa(0.17, 0.22, 0.17, x, y0 + 1.13, z, '#FFE2B0', 0.01));
  }
}

/* ------------------------------------------- canoa e peixes (animados) ---- */
const canoaGrupo = new THREE.Group();
let remo;
function construirCanoa() {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 });
  const G = [];
  G.push(pinta(new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(2.3, 0.3, 0.42).translate(0, 0.24, 0), COR.canoa, 0.03));
  G.push(pinta(new THREE.TorusGeometry(1, 0.035, 4, 18).rotateX(Math.PI / 2).scale(2.3, 1, 0.42).translate(0, 0.24, 0), COR.madeiraEsc, 0.02));
  G.push(caixa(0.1, 0.04, 0.7, 0.6, 0.18, 0, COR.madeira));
  const x = -1.25;                                                   // barqueiro em pé na popa
  G.push(pinta(new THREE.CapsuleGeometry(0.1, 0.34, 3, 6).translate(x, 0.45, 0), COR.short, 0.03));
  G.push(pinta(new THREE.CapsuleGeometry(0.14, 0.32, 3, 7).translate(x, 0.88, 0), COR.camisa, 0.03));
  G.push(pinta(new THREE.IcosahedronGeometry(0.12, 1).translate(x, 1.24, 0), COR.pele, 0.03));
  G.push(pinta(new THREE.CylinderGeometry(0.26, 0.26, 0.02, 12).translate(x, 1.32, 0), COR.chapeu, 0.03));
  G.push(pinta(new THREE.ConeGeometry(0.12, 0.13, 10).translate(x, 1.39, 0), COR.chapeu, 0.03));
  G.push(haste(V3(x, 1.02, 0.12), V3(x + 0.28, 0.92, 0.2), 0.04, 0.035, COR.pele, 5));
  G.push(haste(V3(x, 1.02, -0.12), V3(x + 0.26, 0.98, 0.22), 0.04, 0.035, COR.pele, 5));
  canoaGrupo.add(new THREE.Mesh(mergeGeometries(G), mat));
  remo = new THREE.Mesh(haste(V3(0, 1.4, 0), V3(0, -1.7, 0), 0.022, 0.022, COR.madeiraEsc, 5), mat);
  remo.position.set(x + 0.3, 0.2, 0.22);
  canoaGrupo.add(remo);
  canoaGrupo.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(canoaGrupo);
}
const S_CANOA = (() => {                  // ponto do rio mais perto de onde a câmera cruza a canoa
  let best = 0, bd = 1e9;
  for (let k = 0; k <= 400; k++) { const p = pontoRio(k / 400), d = Math.hypot(p.x - 30.6, p.z + 12.2); if (d < bd) { bd = d; best = k / 400; } }
  return best;
})();
function canoa(f, seg) {
  const s = S_CANOA + ((f - 3.5 * FPL) / FPS) * 0.3 / rioTotal;
  const p = pontoRio(s);
  canoaGrupo.position.set(p.x + p.dz * 0.4, 0.03 + 0.03 * Math.sin(seg * 1.7), p.z - p.dx * 0.4);
  canoaGrupo.rotation.set(0.03 * Math.sin(seg * 1.3), Math.atan2(-p.dz, p.dx), 0.02 * Math.sin(seg * 1.1));
  remo.rotation.set(0.25 + 0.12 * Math.sin(seg * 0.9), 0, -0.35 + 0.1 * Math.sin(seg * 0.9));
}
const peixes = [];
function construirPeixes() {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.6 });
  for (let k = 0; k < 11; k++) {
    const b = BACIAS[k % 4];
    const g = mergeGeometries([
      pinta(new THREE.SphereGeometry(0.08, 6, 4).scale(2.2, 0.85, 0.8), pick([COR.fruta1, COR.coral3, COR.fruta2, '#9CC9C4']), 0.04),
      pinta(new THREE.ConeGeometry(0.07, 0.12, 4).rotateZ(-Math.PI / 2).translate(-0.22, 0, 0), COR.coral2, 0.04),
    ]);
    const m = new THREE.Mesh(g, mat);
    m.userData = { b, r: b.r * R(0.25, 0.7), w: R(0.35, 0.8) * (rnd() < 0.5 ? -1 : 1), f: R(0, 6) };
    peixes.push(m); scene.add(m);
  }
}
function moverPeixes(seg) {
  for (const m of peixes) {
    const u = m.userData, a = u.f + seg * u.w;
    m.position.set(u.b.x + Math.cos(a) * u.r, -0.2, u.b.z + Math.sin(a) * u.r);
    m.rotation.y = -a - Math.sign(u.w) * Math.PI / 2;
  }
}

/* ------------------------------------------------- sombra de contato ---- */
function sombraContato() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 20, 128, 128, 128);
  gr.addColorStop(0, 'rgba(60,50,45,0.55)'); gr.addColorStop(0.6, 'rgba(60,50,45,0.22)'); gr.addColorStop(1, 'rgba(60,50,45,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(IA * 2.7, IB * 2.9), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = -16;
  scene.add(m);
  return m;
}

/* -------------------------------------------------------- montagem ---- */
construirChao();
for (const c of CASAS) { OCUPADO.push({ x: c.x, z: c.z + 1, r: 4.4 }); construirCasa(c); }
OCUPADO.push({ x: PERG.x, z: PERG.z, r: 6.2 });
pergola();
lanternas();
recife();
barco(-21, zPraia(-21) - 2.4, 0.5);
barco(-6.2, zPraia(-6.2) - 2.1, -0.35, '#F3F0EA', COR.coral3);
construirAgua();
construirCanoa();
construirPeixes();
const sombra = sombraContato();

// coqueiros: fileira da praia + miolo da Vila (fora do caminho da câmera)
for (let x = -40; x <= 21; x += 3.4) {
  const px = x + R(-1.1, 1.1), pz = zPraia(px) - R(4.6, 8.8);
  const h = R(6.2, 9.6);
  if (!dentroIlha(px, pz, 2) || rio(px, pz).d < rio(px, pz).hw + 3.2) continue;
  if (!vago(px, pz, 1.5) || !livre(px, pz, h, 4.6, 3.2)) continue;
  coqueiro(px, pz, h);
}
for (let n = 0, feitos = 0; n < 900 && feitos < 34; n++) {
  const px = R(-38, 20), pz = R(-28, -3), h = R(6.2, 9.6);
  if (!dentroIlha(px, pz, 2.5) || rio(px, pz).d < rio(px, pz).hw + 3.2 || distCaminho(px, pz) < 1.4) continue;
  if (!vago(px, pz, 1.8) || !livre(px, pz, h, 4.6, 3.2)) continue;
  OCUPADO.push({ x: px, z: pz, r: 1.8 }); coqueiro(px, pz, h); feitos++;
}
for (let n = 0, feitos = 0; n < 2000 && feitos < 170; n++) {
  const px = R(-40, 22), pz = R(-29, 1);
  if (!dentroIlha(px, pz, 1.2) || z_na_praia(px, pz) || rio(px, pz).d < rio(px, pz).hw + 1.2 || distCaminho(px, pz) < 1.1) continue;
  if (!vago(px, pz, 0.6) || !livre(px, pz, 1.6, 1.5)) continue;
  arbusto(px, pz); feitos++;
}
function z_na_praia(x, z) { return z - zPraia(x) > -6.5; }
for (let s = 0.04; s < 0.8; s += 0.028) {
  const p = pontoRio(s), hw = rio(p.x, p.z).hw;
  for (const lado of [-1, 1]) {
    const off = hw + R(1.0, 2.2), x = p.x - p.dz * off * lado, z = p.z + p.dx * off * lado;
    if (!dentroIlha(x, z, 1.5) || !vago(x, z, 1) || !livre(x, z, 2.6, 3.0)) continue;
    mangue(x, z);
  }
}

const matArgila = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.93, metalness: 0 });
const mundo = new THREE.Mesh(mergeGeometries(ARGILA), matArgila);
mundo.castShadow = true; mundo.receiveShadow = true;
scene.add(mundo);
const matJanA = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.3, emissive: new THREE.Color('#FFB968'), emissiveIntensity: 0 });
const matJanB = matJanA.clone();
scene.add(new THREE.Mesh(mergeGeometries(JAN_A), matJanA), new THREE.Mesh(mergeGeometries(JAN_B), matJanB));
const matLuz = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, emissive: new THREE.Color('#FFB05A'), emissiveIntensity: 0.2 });
scene.add(new THREE.Mesh(mergeGeometries(LUZES), matLuz));

/* ------------------------------------------------------ pós-efeitos ---- */
const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(1);
composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0, 0.55, 0.82);
composer.addPass(bloom);
const hts = new ShaderPass(HorizontalTiltShiftShader), vts = new ShaderPass(VerticalTiltShiftShader);
hts.uniforms.r.value = vts.uniforms.r.value = 0.52;
composer.addPass(hts); composer.addPass(vts);
composer.addPass(new OutputPass());

/* ------------------------------------------------------- luz por hora ---- */
// hora, elevação°, azimute°, cor do sol, força, céu, chão, força do céu, fundo, noite, amanhecer
const LUZ = [
  [4.8, -2, 55, '#F2A58E', 0.25, '#D9C9D2', '#9A8E8C', 0.42, '#E2D6DA', 0.35, 1.0],
  [5.6, 6, 60, '#F7BE9C', 0.8, '#EAD9D9', '#B3A59C', 0.5, '#ECE2DF', 0.0, 1.0],
  [6.6, 18, 65, '#FFD9B8', 1.15, '#EFE8E3', '#B9ADA3', 0.56, '#EEE9E5', 0, 0.3],
  [8.0, 35, 72, '#FFEBD6', 1.4, '#F1F0EC', '#BDB5AC', 0.62, '#EFEEEA', 0, 0],
  [11.0, 62, 95, '#FFF6EB', 1.6, '#EEF2F1', '#C0BAB2', 0.68, '#EDF0EF', 0, 0],
  [13.5, 66, 170, '#FFF3E4', 1.6, '#EFF1EE', '#C1B9AF', 0.66, '#EEF0EC', 0, 0],
  [15.8, 34, 228, '#FFD29A', 1.5, '#F5E5CF', '#C2AB94', 0.58, '#F2E5D3', 0, 0],
  [17.3, 12, 240, '#FBB27E', 1.15, '#F0D8C9', '#B39C8C', 0.52, '#EFDCCF', 0.05, 0],
  [18.2, 1, 245, '#EE8F72', 0.5, '#D4B6BC', '#8E7F80', 0.46, '#C9B2B7', 0.45, 0],
  [19.0, 25, 300, '#8FA6CC', 0.3, '#6F7A93', '#3A3D48', 0.42, '#4A5366', 0.85, 0],
  [20.7, 40, 320, '#8BA2C9', 0.28, '#4E5872', '#2B2D36', 0.38, '#2C3442', 1.0, 0],
];
function luz(h) {
  let k = 0; while (k < LUZ.length - 2 && h > LUZ[k + 1][0]) k++;
  const A = LUZ[k], B = LUZ[k + 1], a = clamp((h - A[0]) / (B[0] - A[0]));
  const el = THREE.MathUtils.degToRad(lerp(A[1], B[1], a)), az = THREE.MathUtils.degToRad(lerp(A[2], B[2], a));
  sol.position.set(Math.cos(el) * Math.sin(az) * 110, Math.max(Math.sin(el), 0.04) * 110, Math.cos(el) * Math.cos(az) * 110);
  sol.target.position.set(0, 0, 0);
  sol.color.copy(mistura(A[3], B[3], a)); sol.intensity = lerp(A[4], B[4], a) * 2.7;
  hemi.color.copy(mistura(A[5], B[5], a)); hemi.groundColor.copy(mistura(A[6], B[6], a)); hemi.intensity = lerp(A[7], B[7], a) * 2.3;
  const fundo = mistura(A[8], B[8], a);
  scene.background.copy(fundo); scene.fog.color.copy(fundo);
  const noite = lerp(A[9], B[9], a), aurora = lerp(A[10], B[10], a);
  matJanB.emissiveIntensity = 2.4 * noite;
  matJanA.emissiveIntensity = 2.4 * Math.max(noite, aurora * 0.85);
  matLuz.emissiveIntensity = 0.15 + 3.4 * noite;
  lampPergola.forEach(l => { l.intensity = 3.2 * noite; });
  lampCafe.intensity = 4 * aurora;
  bloom.strength = 0.6 * noite + 0.18 * aurora;
  bloom.enabled = bloom.strength > 0.02;
  sombra.material.opacity = 0.9 * (1 - noite);
  return { noite, aurora };
}

/* ------------------------------------------------------------ quadro ---- */
function atualizar(f) {
  f = clamp(f, 0, TOTAL);
  const { s, i, tau } = arcoNoQuadro(f);
  const t = curvaP.getUtoTmapping(clamp(s / compTotal), null);
  const p = curvaP.getPoint(t), q = curvaQ.getPoint(t);
  camera.position.copy(p); camera.lookAt(q);
  const alto = smooth(clamp((p.y - 3) / 38));
  camera.fov = lerp(46, 35, alto); camera.updateProjectionMatrix();
  luz(lerp(HORAS[i], HORAS[i + 1], tau));
  scene.fog.near = lerp(26, 150, alto); scene.fog.far = lerp(135, 480, alto);
  const amt = lerp(0.8, 2.2, alto);
  hts.uniforms.h.value = amt / W; vts.uniforms.v.value = amt / H;
  const seg = f / FPS;
  ondas(seg); canoa(f, seg); moverPeixes(seg);
}
window.cena = {
  W, H, FPS, FPL, TOTAL, LEGS,
  so(f) { atualizar(f); composer.render(); },
  quadro(f, q = 0.95) { atualizar(f); composer.render(); return renderer.domElement.toDataURL('image/jpeg', q); },
  info() { return { W, H, FPS, FPL, TOTAL, trechos: Ls.map(v => +v.toFixed(1)), vB: vB.map(v => +v.toFixed(2)), tris: mundo.geometry.attributes.position.count / 3 }; },
};
if (qs.has('f')) window.cena.so(+qs.get('f'));
window.cenaPronta = true;
