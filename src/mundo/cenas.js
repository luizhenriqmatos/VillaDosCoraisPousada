/* ==========================================================
   UM DIA NA VILA — as cinco cenas do capítulo 06
   ----------------------------------------------------------
   Cada cena é um trecho de vídeo. Rolar a página avança o
   trecho; o último quadro de um trecho é igual ao primeiro
   do seguinte, por isso a viagem parece um voo só.

   TROCAR OS VÍDEOS (ex.: pelos gerados na Higgsfield):
   substitua os arquivos em public/mundo/ mantendo os nomes.
   Nada neste arquivo precisa mudar.

   TROCAR UM TEXTO: mude aqui nos três idiomas.

   rolagem  quantas telas de rolagem a cena dura (mais = mais lenta)
   pausa    0 a 0,6 — a câmera "respira" no meio da cena, onde o texto aparece
   tema     'claro' (texto escuro) ou 'escuro' (texto claro, para a noite)
   destaque cor da hora grande
   videoCelular / posterCelular (opcional) versão em pé (9:16)
            para telas de celular; se não existir, usa o vídeo normal
   ========================================================== */

export const CENAS = [
  {
    id: 'amanhecer',
    video: '/mundo/trecho-1.mp4', poster: '/mundo/trecho-1.webp', calmo: '/mundo/calmo-1.webp',
    rolagem: 1.5, pausa: 0.3, tema: 'claro', destaque: '#A87A70',
    hora: { pt: '5h30', en: '5:30 am', es: '5:30' },
    titulo: { pt: 'A maré acorda a Vila', en: 'The tide wakes the Vila', es: 'La marea despierta la Vila' },
    texto: {
      pt: 'Oito casas entre o rio, o recife e a mata. Aqui, quem marca a hora é o mar.',
      en: 'Eight houses between the river, the reef and the forest. Here, the sea keeps the time.',
      es: 'Ocho casas entre el río, el arrecife y el bosque. Aquí, quien marca la hora es el mar.',
    },
  },
  {
    id: 'cafe',
    video: '/mundo/trecho-2.mp4', poster: '/mundo/trecho-2.webp', calmo: '/mundo/calmo-2.webp',
    rolagem: 1.35, pausa: 0.4, tema: 'claro', destaque: '#957D64',
    hora: { pt: '7h', en: '7 am', es: '7:00' },
    titulo: { pt: 'Café na varanda', en: 'Breakfast on the veranda', es: 'Desayuno en la terraza' },
    texto: {
      pt: 'Servido até as dez, sem pressa, com o mar logo ali.',
      en: 'Served until ten, unhurried, with the sea right there.',
      es: 'Servido hasta las diez, sin prisa, con el mar ahí al lado.',
    },
  },
  {
    id: 'piscinas',
    video: '/mundo/trecho-3.mp4', poster: '/mundo/trecho-3.webp', calmo: '/mundo/calmo-3.webp',
    rolagem: 1.4, pausa: 0.35, tema: 'claro', destaque: '#4F8F8B',
    hora: { pt: '10h', en: '10 am', es: '10:00' },
    titulo: { pt: 'Piscinas naturais', en: 'Natural tide pools', es: 'Piscinas naturales' },
    texto: {
      pt: 'Na maré baixa o recife aparece e deixa piscinas mornas que duram até o fim da tarde.',
      en: 'At low tide the reef surfaces and leaves warm pools that last until late afternoon.',
      es: 'Con la marea baja el arrecife aparece y deja pozas tibias que duran hasta el atardecer.',
    },
  },
  {
    id: 'rio',
    video: '/mundo/trecho-4.mp4', poster: '/mundo/trecho-4.webp', calmo: '/mundo/calmo-4.webp',
    rolagem: 1.4, pausa: 0.35, tema: 'claro', destaque: '#A5763F',
    hora: { pt: '16h', en: '4 pm', es: '16:00' },
    titulo: { pt: 'Canoa no rio', en: 'Canoe on the river', es: 'Canoa en el río' },
    texto: {
      pt: 'Com o guia da Vila, subindo o rio que encontra o mar.',
      en: 'With the Vila guide, up the river that meets the sea.',
      es: 'Con el guía de la Vila, río arriba, donde el río encuentra el mar.',
    },
  },
  {
    id: 'jantar',
    video: '/mundo/trecho-5.mp4', poster: '/mundo/trecho-5.webp', calmo: '/mundo/calmo-5.webp',
    rolagem: 1.6, pausa: 0.25, tema: 'escuro', destaque: '#E8C9A0',
    hora: { pt: '20h', en: '8 pm', es: '20:00' },
    titulo: { pt: 'Jantar com o peixe do dia', en: 'Dinner with the catch of the day', es: 'Cena con la pesca del día' },
    texto: {
      pt: 'O peixe que chegou de manhã, da colônia daqui, vira o jantar à luz de vela.',
      en: 'The fish that came in this morning, from the local fishermen, becomes dinner by candlelight.',
      es: 'El pescado que llegó por la mañana, de los pescadores de aquí, se vuelve cena a la luz de las velas.',
    },
    acoes: {
      principal: { href: '#reservar', texto: { pt: 'Reservar sua data', en: 'Book your dates', es: 'Reservar tus fechas' } },
      secundaria: { href: '#as-casas', texto: { pt: 'Ver as casas', en: 'See the houses', es: 'Ver las casas' } },
    },
  },
];

export const TEXTOS = {
  titulo: { pt: 'Um dia na Vila', en: 'A day at the Vila', es: 'Un día en la Vila' },
  capitulo: { pt: '06 · um dia na vila', en: '06 · a day at the vila', es: '06 · un día en la vila' },
  dica: { pt: 'role para o dia passar', en: 'scroll and let the day go by', es: 'desliza y deja pasar el día' },
  irPara: { pt: 'Ir para', en: 'Go to', es: 'Ir a' },
  relogio: { pt: 'Horas do dia', en: 'Hours of the day', es: 'Horas del día' },
};
