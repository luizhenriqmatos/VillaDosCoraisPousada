# Como colocar o "Um dia na Vila" no site

São 3 passos. Leva uns 5 minutos.

## 1. Copie duas pastas

Dentro deste zip há duas pastas com o mesmo caminho do seu projeto:

| Do zip | Para dentro do projeto `vila-dos-corais` |
|---|---|
| `src/mundo/` | `src/mundo/` (pasta nova, ao lado do `main.js`) |
| `public/mundo/` | `public/mundo/` (pasta nova, ao lado de `assets`) |

`src/mundo` é o código (motor da rolagem, textos em PT/EN/ES e o painel de datas). `public/mundo` são os 5 vídeos e as imagens de apoio.

## 2. Atualize o `index.html`

**Jeito rápido:** se você não mexeu no `index.html` desde 16/09 (a versão que está no GitHub), substitua o seu pelo `index.html` deste zip.

**Jeito seguro (se mexeu):** faça estas 3 trocas no seu `index.html`.

**Troca 1** — procure:

```html
<section class="capitulo" id="experiencias">
```

e troque por:

```html
<section class="capitulo" id="experiencias" data-mundo>
```

(É só acrescentar `data-mundo`. A lista "Os dias" dentro dela pode ficar: ela aparece se o JavaScript falhar.)

**Troca 2** — apague a seção inteira que começa com `<section class="reservar" id="reservar">` e termina no `</section>` dela, e cole no lugar:

```html
<section class="reservar reservar--painel" id="reservar">
  <div class="reservar__intro">
    <span class="olho" data-i18n="res.olho">o ano inteiro</span>
    <h2 class="brilho" data-i18n="res.titulo">há encontros que<br>começam antes</h2>
    <p data-i18n="res.p">Reserva direta, sem comissão de plataforma. Respondemos no mesmo dia.</p>
  </div>

  <form class="consulta" id="consulta" novalidate>
    <p class="consulta__titulo" data-r="titulo">Consulte suas datas</p>
    <p class="consulta__sub" data-r="sub">A gente confirma pelo WhatsApp, no mesmo dia.</p>
    <div class="consulta__datas">
      <label class="consulta__campo"><span data-r="chegada">Chegada</span><input type="date" name="chegada"></label>
      <label class="consulta__campo"><span data-r="saida">Saída</span><input type="date" name="saida"></label>
    </div>
    <div class="consulta__campo consulta__hospedes">
      <span data-r="hospedes">Hóspedes</span>
      <div class="consulta__contador">
        <button type="button" data-passo="-1" aria-label="Um hóspede a menos">–</button>
        <output name="hospedes" aria-live="polite">2</output>
        <button type="button" data-passo="1" aria-label="Um hóspede a mais">+</button>
      </div>
    </div>
    <p class="consulta__resumo" aria-live="polite"></p>
    <a class="botao consulta__enviar" id="zap" href="#">Pedir estas datas no WhatsApp</a>
    <p class="consulta__aviso" role="status" aria-live="polite"></p>
  </form>
</section>
```

O botão continua com `id="zap"`: o número do WhatsApp segue vindo do `main.js` (a constante `WHATSAPP` lá no topo), então não precisa mexer nele.

**Troca 3** — no final do arquivo, logo abaixo de:

```html
<script type="module" src="/src/main.js"></script>
```

acrescente:

```html
<script type="module" src="/src/mundo/index.js"></script>
```

## 3. Teste

No terminal do VS Code, dentro da pasta do projeto:

```
npm run dev
```

Abra o endereço que aparecer (`localhost:5173`), vá até o capítulo 06 pelo Menu e role devagar. Troque PT/EN/ES no topo: os textos do capítulo e do painel acompanham.

## Onde mexer depois

- **Textos das cenas** e quanto cada uma dura na rolagem: `src/mundo/cenas.js`.
- **Valor da diária** no painel (opcional, hoje escondido): `diaria` dentro de `CONFIG`, no topo de `src/mundo/reserva.js`.
- **Trocar os vídeos 3D pelos de IA**: `docs/PLANO-HIGGSFIELD.md`.
