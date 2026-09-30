/* ==========================================================
   UM DIA NA VILA — motor da rolagem
   ----------------------------------------------------------
   A seção #experiencias fica "presa" na tela enquanto a
   pessoa rola. A posição da rolagem escolhe o quadro do
   vídeo: rolou pra baixo, o dia avança; pra cima, volta.

   Adaptado do motor "scroll-world" para viver dentro de uma
   seção do site (e não na página inteira):
   - cada vídeo é baixado inteiro (Blob): assim dá para pular
     para qualquer quadro, mesmo em hospedagem simples;
   - só baixa o que está perto da tela;
   - no celular, nunca pede um quadro novo enquanto o anterior
     ainda está sendo buscado (evita travar num dedo rápido);
   - quem pediu "menos movimento" no sistema vê só imagens.
   Textos e vídeos ficam em cenas.js.
   ========================================================== */
import './mundo.css';
import { CENAS, TEXTOS } from './cenas.js';

const IDIOMAS = ['pt', 'en', 'es'];
const idioma = () => {
  const l = (document.documentElement.lang || 'pt').slice(0, 2).toLowerCase();
  return IDIOMAS.includes(l) ? l : 'pt';
};
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const suave = x => { x = clamp(x); return x * x * (3 - 2 * x); };
// "respiro" no meio da cena: anda mais devagar onde o texto aparece.
// f(0)=0 e f(1)=1 sempre, então as emendas entre vídeos não mudam.
const respiro = (x, p) => { p = clamp(p); const c = x - 0.5; return (1 - p) * x + p * (4 * c * c * c + 0.5); };
function el(tag, classe) { const n = document.createElement(tag); if (classe) n.className = classe; return n; }

const secao = document.querySelector('[data-mundo]');
if (secao && CENAS.length) montar(secao);

function montar(secao) {
  const menosMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const toque = matchMedia('(hover: none) and (pointer: coarse)').matches;
  const estreito = matchMedia('(max-width: 860px)');
  const celular = () => toque || estreito.matches;
  const DISSOLVE = 0.08;          // largura da dissolvência nas emendas (em alturas de tela)
  const N = CENAS.length;

  /* ---------- montagem do HTML ---------- */
  secao.classList.remove('capitulo');
  secao.classList.add('mundo');
  secao.textContent = '';

  const leitura = el('div', 'mundo__leitura');                 // versão para leitor de tela
  const tituloOculto = el('h2');
  const listaOculta = el('ol');
  leitura.append(tituloOculto, listaOculta);

  const palco = el('div', 'mundo__palco');
  palco.setAttribute('aria-hidden', 'true');
  const cenas = el('div', 'mundo__cenas');
  const veuClaro = el('div', 'mundo__veu mundo__veu--claro');
  const veuEscuro = el('div', 'mundo__veu mundo__veu--escuro');
  const textos = el('div', 'mundo__textos');
  const capitulo = el('span', 'mundo__capitulo');
  const relogio = el('ol', 'mundo__relogio');
  const ponteiro = el('span', 'mundo__ponteiro');
  const dica = el('p', 'mundo__dica');
  palco.append(cenas, veuClaro, veuEscuro, capitulo, textos, relogio, dica);
  secao.append(leitura, palco);

  const SEG = CENAS.map((c, i) => {
    const cena = el('div', 'mundo__cena');
    const img = el('img', 'mundo__quadro');
    img.alt = ''; img.decoding = 'async';
    if (i > 1) img.loading = 'lazy';
    img.src = menosMovimento ? (c.calmo || c.poster) : ((celular() && c.posterCelular) || c.poster);
    cena.append(img); cenas.append(cena);
    return { c, i, cena, img, video: null, carregando: false, pronto: false,
             atual: 0, alvo: 0, visivel: false, peso: c.rolagem || 1.4, pausa: c.pausa || 0, ini: 0, fim: 0 };
  });

  const artigos = CENAS.map(c => {
    const a = el('article', 'mundo__texto');
    a.append(el('span', 'mundo__hora'), el('h3', 'mundo__titulo'), el('p', 'mundo__frase'));
    if (c.acoes) {
      const acoes = el('div', 'mundo__acoes');
      const p = el('a', 'mundo__botao'); p.href = c.acoes.principal.href;
      const s = el('a', 'mundo__elo'); s.href = c.acoes.secundaria.href;
      acoes.append(p, s); a.append(acoes);
    }
    textos.append(a);
    return a;
  });

  const pontos = CENAS.map((c, i) => {
    const li = el('li');
    const b = el('button', 'mundo__ponto'); b.type = 'button';
    b.append(el('span'), el('i'));
    b.addEventListener('click', () => irPara(i));
    li.append(b); relogio.append(li);
    return b;
  });
  relogio.append(ponteiro);

  // Os botões do relógio e os links ficam clicáveis mesmo com o palco aria-hidden:
  // quem usa leitor de tela navega pela lista em .mundo__leitura.
  palco.querySelectorAll('button, a').forEach(n => n.setAttribute('tabindex', '-1'));

  /* ---------- textos (acompanham o idioma escolhido no topo do site) ---------- */
  function escrever() {
    const l = idioma();
    secao.setAttribute('aria-label', TEXTOS.titulo[l]);
    tituloOculto.textContent = TEXTOS.titulo[l];
    capitulo.textContent = TEXTOS.capitulo[l];
    dica.textContent = TEXTOS.dica[l];
    relogio.setAttribute('aria-label', TEXTOS.relogio[l]);
    listaOculta.textContent = '';
    CENAS.forEach((c, i) => {
      const a = artigos[i];
      a.querySelector('.mundo__hora').textContent = c.hora[l];
      a.querySelector('.mundo__titulo').textContent = c.titulo[l];
      a.querySelector('.mundo__frase').textContent = c.texto[l];
      if (c.acoes) {
        a.querySelector('.mundo__botao').textContent = c.acoes.principal.texto[l];
        a.querySelector('.mundo__elo').textContent = c.acoes.secundaria.texto[l];
      }
      pontos[i].firstChild.textContent = c.hora[l];
      pontos[i].title = `${TEXTOS.irPara[l]} ${c.hora[l]} — ${c.titulo[l]}`;
      const li = el('li');
      li.textContent = `${c.hora[l]} — ${c.titulo[l]}. ${c.texto[l]}`;
      if (c.acoes) {
        const p = el('a'); p.href = c.acoes.principal.href; p.textContent = ' ' + c.acoes.principal.texto[l];
        li.append(p);
      }
      listaOculta.append(li);
    });
  }
  escrever();
  new MutationObserver(escrever).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  /* ---------- medidas ---------- */
  let vh = innerHeight, total = 0, larguraMedida = innerWidth, ativo = -1;
  function medir() {
    vh = innerHeight; larguraMedida = innerWidth;
    let soma = 0;
    SEG.forEach(s => { s.ini = soma * vh; soma += s.peso; s.fim = soma * vh; });
    total = soma;
    secao.style.height = (total * vh + vh) + 'px';
    ler();
  }
  function topoDaSecao() { return secao.getBoundingClientRect().top + scrollY; }
  function irPara(i) {
    const s = SEG[i];
    scrollTo({ top: topoDaSecao() + s.ini + (s.fim - s.ini) * 0.5, behavior: menosMovimento ? 'auto' : 'smooth' });
  }

  /* ---------- vídeos ---------- */
  let tocou = false;
  function preparar(v) {                     // iOS só pinta o quadro depois de um play
    if (!celular() || !v) return;
    try { const p = v.play(); if (p && p.then) p.then(() => { try { v.pause(); } catch (e) {} }).catch(() => {}); } catch (e) {}
  }
  function primeiroToque() {
    if (tocou) return;
    tocou = true;
    SEG.forEach(s => preparar(s.video));
  }
  addEventListener('pointerdown', primeiroToque, { once: true, passive: true });
  addEventListener('touchstart', primeiroToque, { once: true, passive: true });

  function carregar(s) {
    if (menosMovimento || s.carregando || !s.c.video) return;
    s.carregando = true;
    // versão em pé para celular, se existir (videoCelular em cenas.js)
    fetch((celular() && s.c.videoCelular) || s.c.video)
      .then(r => r.ok ? r.blob() : Promise.reject(new Error('HTTP ' + r.status)))
      .then(blob => {
        const v = document.createElement('video');
        v.className = 'mundo__video';
        v.muted = true; v.playsInline = true; v.preload = 'auto';
        v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
        v.src = URL.createObjectURL(blob);
        v.addEventListener('loadedmetadata', () => { s.pronto = true; ler(); });
        // só esconde a imagem quando o vídeo já pintou um quadro de verdade
        v.addEventListener('seeked', () => s.cena.classList.add('tem-video'), { once: true });
        v.addEventListener('loadeddata', () => { try { v.pause(); } catch (e) {} if (tocou) preparar(v); });
        s.cena.append(v); s.video = v;
      })
      .catch(() => { s.carregando = false; });
  }

  /* ---------- rolagem → estado ---------- */
  function ler() {
    const y = -secao.getBoundingClientRect().top;
    const faixa = DISSOLVE * vh;
    let ci = 0;
    for (let i = 0; i < N; i++) if (y >= SEG[i].ini) ci = i;

    for (let i = 0; i < N; i++) {
      const s = SEG[i];
      if (y > s.ini - 1.6 * vh && y < s.fim + 1.6 * vh) carregar(s);
      const local = clamp((y - s.ini) / (s.fim - s.ini));
      s.alvo = s.pausa ? respiro(local, s.pausa) : local;
      let fora = 0;
      if (y < s.ini && i > 0) fora = s.ini - y;
      else if (y > s.fim && i < N - 1) fora = y - s.fim;
      const op = suave(1 - fora / faixa);
      s.cena.style.opacity = op;
      s.visivel = op > 0.001;
      s.cena.style.zIndex = i === ci ? 3 : (op > 0.5 ? 2 : 1);
      if (!s.pronto || menosMovimento) {
        s.img.style.transform = menosMovimento ? 'none' : `scale(${(1.02 + local * 0.06).toFixed(3)})`;
      }
    }

    for (let i = 0; i < N; i++) {
      const s = SEG[i];
      const pr = clamp((y - s.ini) / (s.fim - s.ini));
      const antes = y < s.ini, depois = y > s.fim;
      let op;
      if (i === 0) op = depois ? 0 : suave(1 - Math.max(0, pr - 0.3) / 0.4);   // recebe quem chega
      else if (i === N - 1) op = antes ? 0 : suave((pr - 0.12) / 0.3);           // segura o convite no fim
      else op = (antes || depois) ? 0 : suave(1 - Math.abs(pr - 0.5) / 0.46);
      const a = artigos[i];
      a.style.opacity = op;
      a.style.transform = menosMovimento ? 'none' : `translateY(${((0.5 - pr) * 3).toFixed(2)}vh)`;
      a.style.visibility = op < 0.02 ? 'hidden' : 'visible';
      a.style.pointerEvents = op > 0.6 ? 'auto' : 'none';
    }

    if (ci !== ativo) {
      ativo = ci;
      pontos.forEach((p, k) => p.classList.toggle('is-ativo', k === ci));
      palco.style.setProperty('--mundo-destaque', CENAS[ci].destaque);
      palco.classList.toggle('is-escuro', CENAS[ci].tema === 'escuro');
    }
    ponteiro.style.transform = `scaleY(${clamp(y / (total * vh)).toFixed(4)})`;
    dica.style.opacity = clamp(1 - y / (0.35 * vh)).toFixed(3);
  }

  /* ---------- quadro a quadro, só enquanto a seção está na tela ---------- */
  let naTela = false, rodando = false;
  function quadro() {
    if (!naTela) { rodando = false; return; }
    const passo = celular() ? 0.02 : 0.008;
    for (const s of SEG) {
      const v = s.video;
      if (!v || !s.pronto || v.seeking) continue;
      if (!s.visivel && Math.abs(s.atual - s.alvo) < 0.002) continue;
      s.atual += (s.alvo - s.atual) * (menosMovimento ? 1 : 0.18);
      const t = clamp(s.atual, 0, 0.999) * (v.duration || 1);
      if (Math.abs(v.currentTime - t) > passo) { try { v.currentTime = t; } catch (e) {} }
    }
    requestAnimationFrame(quadro);
  }
  new IntersectionObserver(entradas => {
    naTela = entradas.some(e => e.isIntersecting);
    if (naTela) { carregar(SEG[0]); if (!rodando) { rodando = true; requestAnimationFrame(quadro); } }
  }, { rootMargin: '100% 0px 100% 0px' }).observe(secao);

  let agendado = false;
  addEventListener('scroll', () => {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(() => { agendado = false; ler(); });
  }, { passive: true });
  // No celular a barra de endereço some/aparece e muda só a altura: ignorar evita o "pulo".
  addEventListener('resize', () => { if (toque && innerWidth === larguraMedida) return; medir(); });
  addEventListener('orientationchange', () => setTimeout(medir, 250));
  addEventListener('load', medir);
  medir();

  // Chegou por um link com âncora (ex.: #reservar)? A seção mudou de altura: reposiciona.
  if (location.hash && location.hash.length > 1) {
    const alvo = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (alvo && alvo !== secao && !secao.contains(alvo)) requestAnimationFrame(() => alvo.scrollIntoView());
  }

  // O cursor redondo do site cresce sobre o que é clicável (os elementos daqui nasceram depois).
  const cursor = document.getElementById('cursor');
  if (cursor) palco.querySelectorAll('a, button').forEach(n => {
    n.addEventListener('mouseenter', () => cursor.classList.add('grande'));
    n.addEventListener('mouseleave', () => cursor.classList.remove('grande'));
  });
}
