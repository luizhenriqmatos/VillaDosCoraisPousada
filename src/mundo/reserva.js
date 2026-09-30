/* ==========================================================
   RESERVA — painel "Consulte suas datas" (inspirado no Vesper)
   ----------------------------------------------------------
   A pessoa escolhe chegada, saída e hóspedes; o botão abre o
   WhatsApp com a mensagem já escrita, no idioma do site.

   O número do WhatsApp continua vindo do main.js (constante
   WHATSAPP lá em cima). Se por algum motivo não vier, usa o
   de CONFIG abaixo.

   diaria (em CONFIG): deixe null para não mostrar valor. Se
   colocar um número (ex.: 650), o resumo mostra o total das
   noites como estimativa — o valor final é combinado no zap.
   ========================================================== */
import './reserva.css';

const CONFIG = {
  whatsapp: '5571000000000',
  diaria: null,
  maxHospedes: 10,
};

const T = {
  pt: {
    titulo: 'Consulte suas datas', sub: 'A gente confirma pelo WhatsApp, no mesmo dia.',
    chegada: 'Chegada', saida: 'Saída', hospedes: 'Hóspedes', enviar: 'Pedir estas datas no WhatsApp',
    menos: 'Um hóspede a menos', mais: 'Um hóspede a mais',
    noite: n => n === 1 ? '1 noite' : `${n} noites`, hosp: n => n === 1 ? '1 hóspede' : `${n} hóspedes`,
    estimativa: v => `${v} (estimativa)`,
    faltaData: 'Escolha a chegada e a saída.', ordem: 'A saída precisa ser depois da chegada.',
    passado: 'Escolha uma chegada a partir de hoje.',
    msg: (a, b, n, h) => `Olá! Vi o site da Vila dos Corais e queria saber se há casa disponível de ${a} a ${b} (${n}), para ${h}.`,
    msgSemData: 'Olá! Vi o site da Vila dos Corais e queria saber sobre disponibilidade.',
    locale: 'pt-BR',
  },
  en: {
    titulo: 'Check your dates', sub: 'We confirm on WhatsApp, the same day.',
    chegada: 'Check in', saida: 'Check out', hospedes: 'Guests', enviar: 'Request these dates on WhatsApp',
    menos: 'One guest less', mais: 'One guest more',
    noite: n => n === 1 ? '1 night' : `${n} nights`, hosp: n => n === 1 ? '1 guest' : `${n} guests`,
    estimativa: v => `${v} (estimate)`,
    faltaData: 'Choose your check-in and check-out.', ordem: 'Check-out must be after check-in.',
    passado: 'Choose a check-in from today on.',
    msg: (a, b, n, h) => `Hello! I saw the Vila dos Corais website and would like to know if a house is available from ${a} to ${b} (${n}), for ${h}.`,
    msgSemData: 'Hello! I saw the Vila dos Corais website and would like to ask about availability.',
    locale: 'en-US',
  },
  es: {
    titulo: 'Consulta tus fechas', sub: 'Confirmamos por WhatsApp, el mismo día.',
    chegada: 'Llegada', saida: 'Salida', hospedes: 'Huéspedes', enviar: 'Pedir estas fechas por WhatsApp',
    menos: 'Un huésped menos', mais: 'Un huésped más',
    noite: n => n === 1 ? '1 noche' : `${n} noches`, hosp: n => n === 1 ? '1 huésped' : `${n} huéspedes`,
    estimativa: v => `${v} (estimado)`,
    faltaData: 'Elige la llegada y la salida.', ordem: 'La salida debe ser después de la llegada.',
    passado: 'Elige una llegada a partir de hoy.',
    msg: (a, b, n, h) => `¡Hola! Vi el sitio de la Vila dos Corais y quisiera saber si hay una casa disponible del ${a} al ${b} (${n}), para ${h}.`,
    msgSemData: '¡Hola! Vi el sitio de la Vila dos Corais y quisiera consultar la disponibilidad.',
    locale: 'es',
  },
};

const idioma = () => {
  const l = (document.documentElement.lang || 'pt').slice(0, 2).toLowerCase();
  return T[l] ? l : 'pt';
};
// "2026-10-12" vira data local (sem o fuso empurrar para o dia anterior)
const lerData = v => { if (!v) return null; const [a, m, d] = v.split('-').map(Number); return new Date(a, m - 1, d); };
const paraCampo = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hoje = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

const form = document.getElementById('consulta');
const zap = document.getElementById('zap');
if (form && zap) iniciar();

function iniciar() {
  const numero = ((zap.getAttribute('href') || '').match(/wa\.me\/(\d+)/) || [])[1] || CONFIG.whatsapp;
  const chegada = form.elements.chegada, saida = form.elements.saida;
  const saidaHosp = form.querySelector('output[name="hospedes"]');
  const resumo = form.querySelector('.consulta__resumo');
  const aviso = form.querySelector('.consulta__aviso');
  let hospedes = parseInt(saidaHosp.textContent, 10) || 2;
  let tentou = false;

  zap.target = '_blank';
  zap.rel = 'noopener';
  chegada.min = paraCampo(hoje());

  function estado() {
    const a = lerData(chegada.value), b = lerData(saida.value);
    const noites = a && b ? Math.round((b - a) / 86400000) : 0;
    let erro = '';
    if (!a || !b) erro = 'faltaData';
    else if (a < hoje()) erro = 'passado';
    else if (noites < 1) erro = 'ordem';
    return { a, b, noites, erro };
  }

  function atualizar() {
    const l = idioma(), t = T[l];
    form.querySelectorAll('[data-r]').forEach(n => { n.textContent = t[n.dataset.r]; });
    zap.textContent = t.enviar;
    form.querySelector('[data-passo="-1"]').setAttribute('aria-label', t.menos);
    form.querySelector('[data-passo="1"]').setAttribute('aria-label', t.mais);
    saidaHosp.textContent = hospedes;

    const { a, b, noites, erro } = estado();
    const fmt = d => d.toLocaleDateString(t.locale, l === 'en'
      ? { month: 'short', day: 'numeric', year: 'numeric' }
      : { day: '2-digit', month: '2-digit', year: 'numeric' });

    let texto = t.msgSemData;
    if (!erro) {
      texto = t.msg(fmt(a), fmt(b), t.noite(noites), t.hosp(hospedes));
      let r = `${t.noite(noites)} · ${t.hosp(hospedes)}`;
      if (CONFIG.diaria) {
        const valor = (CONFIG.diaria * noites).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
        r += ` · ${t.estimativa(valor)}`;
      }
      resumo.textContent = r;
    } else {
      resumo.textContent = t.hosp(hospedes);
    }
    zap.href = `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
    aviso.textContent = tentou && erro ? t[erro] : '';
    zap.classList.toggle('is-pendente', !!erro);
  }

  chegada.addEventListener('change', () => {
    const a = lerData(chegada.value);
    if (a) {
      const minSaida = new Date(a); minSaida.setDate(minSaida.getDate() + 1);
      saida.min = paraCampo(minSaida);
      const b = lerData(saida.value);
      if (!b || b <= a) saida.value = paraCampo(minSaida);
    }
    atualizar();
  });
  saida.addEventListener('change', atualizar);
  form.querySelectorAll('[data-passo]').forEach(btn => btn.addEventListener('click', () => {
    hospedes = Math.min(CONFIG.maxHospedes, Math.max(1, hospedes + Number(btn.dataset.passo)));
    atualizar();
  }));
  zap.addEventListener('click', e => {
    tentou = true;
    if (estado().erro) { e.preventDefault(); atualizar(); (chegada.value ? saida : chegada).focus(); return; }
    atualizar();
  });
  form.addEventListener('submit', e => e.preventDefault());
  new MutationObserver(atualizar).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  atualizar();
}
