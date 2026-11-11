# Assinatura FR Dev (Fábio Ranyeri) — guia para qualquer projeto

Quando o Fábio pedir **"assinatura"** em um projeto, coloque a assinatura da **FR Dev** abaixo. Ela é um pequeno anúncio de quem fez o site: precisa ser **bonita, alinhada e dar vontade de contratar**, sem roubar a cena do projeto.

## Como ela é
- **Rodapé do site: uma pílula centralizada, numa linha só, toda clicável** (abre o e-mail já com o assunto "Quero um site como o da <projeto>"):
  `[selo] Feito por  FR Dev  |  Quer um site assim? Fale com o Fábio →`
  - No celular (até 560 px) fica só `[selo] FR Dev | Fale com o Fábio →`, e em telas até 900 px ganha um respiro embaixo para o botão flutuante do WhatsApp não cobrir.
  - Ao passar o mouse: borda verde-água, sobe 1 px e a seta anda (sem animação para quem pede "menos movimento").
- **Pé do menu do painel (área interna)**: compacto, à esquerda: `[selo] FR Dev · Fábio Ranyeri` e o e-mail clicável embaixo.
- **Selo**: o símbolo da logo, quadrado claro `#F4F7F6` com **FR** em azul-noite `#0E1A2B` e a barrinha (cursor) verde-petróleo `#0F8A78`.
- **"FR Dev"**: desenhado na fonte da marca (Space Grotesk 700) em SVG: "FR" na cor do texto do rodapé, "Dev" em verde-água `#2BC4AC`.
- O resto do texto usa a fonte do próprio projeto, 12,5 px. O convite "Fale com o Fábio" em seminegrito verde-água.
- **Nunca**: duas linhas desalinhadas, texto solto ao lado do selo, selo "vazado" ou círculo com letras. Sempre conferir em 390 px e 1280 px.

## Cores da logo (artefato "Logo FR Dev" no claude.ai: versões clara, escura e ícone)
Azul-noite `#0E1A2B` · verde-água `#2BC4AC` · verde-petróleo `#0F8A78` · fundo claro `#F4F7F6` · fonte Space Grotesk 700 (marca) e Inter (texto).
Em rodapé **claro**, troque as variáveis: `--frdev-selo: #0E1A2B; --frdev-letra: #FFFFFF; --frdev-barra: #2BC4AC; --frdev-acento: #0F8A78` e a borda/fundo da pílula para tons escuros.

## O que se adapta ao projeto
- **Onde**: site → fim do rodapé, abaixo da última linha; painel → pé do menu lateral; app sem rodapé → canto inferior ou tela "Sobre". Não colocar em e-mails para clientes nem em telas de pagamento/login.
- **Tecnologia**: React → componente `Assinatura` (referência: Casa Âmbar, `src/components/Assinatura.jsx`, com `SeloFRDev` e `PalavraFRDev`); HTML puro ou Apps Script → o bloco abaixo. Troque `<projeto>` no assunto do e-mail.

## Depois de aplicar
1. Rodar os testes/lint/build do projeto e conferir 390 px e 1280 px (sem rolagem lateral, nada encostando no WhatsApp flutuante).
2. Anotar no `CLAUDE.md` do projeto (seção "Assinatura do Fábio", 2 linhas).
3. Copiar este `assinatura.md` para o projeto, se ainda não estiver nele.

## Bloco pronto (HTML puro / Apps Script)

```html
<div class="frdev-rodape">
  <a class="frdev frdev--pilula" href="mailto:frnr.mv@icloud.com?subject=Quero%20um%20site%20como%20o%20da%20<projeto>" title="frnr.mv@icloud.com"
     aria-label="Feito por FR Dev, de Fábio Ranyeri. Quer um site assim? Escreva para frnr.mv@icloud.com">
    <svg class="frdev__selo" viewBox="0 0 176 176" aria-hidden="true" focusable="false"><path class="frdev__quadrado" d="M44 0H132A44 44 0 0 1 176 44V132A44 44 0 0 1 132 176H44A44 44 0 0 1 0 132V44A44 44 0 0 1 44 0Z"/><path class="frdev__letras" d="M47.58 119.83L35.44 119.83L35.44 55.43L75.92 55.43L75.92 66.47L47.58 66.47L47.58 82.02L73.71 82.02L73.71 93.06L47.58 93.06L47.58 119.83ZM92.71 119.83L80.56 119.83L80.56 55.43L108.53 55.43Q114.60 55.43 119.11 57.55Q123.62 59.66 126.10 63.53Q128.59 67.39 128.59 72.64L128.59 72.64L128.59 73.74Q128.59 79.54 125.83 83.12Q123.07 86.71 119.02 88.37L119.02 88.37L119.02 90.02Q122.70 90.21 124.72 92.55Q126.75 94.90 126.75 98.76L126.75 98.76L126.75 119.83L114.60 119.83L114.60 100.51Q114.60 98.30 113.45 96.92Q112.30 95.54 109.64 95.54L109.64 95.54L92.71 95.54L92.71 119.83ZM92.71 66.47L92.71 84.50L107.24 84.50Q111.57 84.50 114.01 82.16Q116.44 79.81 116.44 75.95L116.44 75.95L116.44 75.03Q116.44 71.16 114.05 68.82Q111.66 66.47 107.24 66.47L107.24 66.47L92.71 66.47Z"/><rect class="frdev__barra" x="134.64" y="56" width="12" height="70" rx="3"/></svg>
    <span class="frdev__por" aria-hidden="true">Feito por</span>
    <svg class="frdev__palavra" viewBox="6.6 -70 293.9 71.4" role="img" aria-label="FR Dev" focusable="false"><path class="frdev__fr" d="M19.80 0L6.60 0L6.60-70L50.60-70L50.60-58L19.80-58L19.80-41.10L48.20-41.10L48.20-29.10L19.80-29.10L19.80 0ZM69.40 0L56.20 0L56.20-70L86.60-70Q93.20-70 98.10-67.70Q103-65.40 105.70-61.20Q108.40-57 108.40-51.30L108.40-51.30L108.40-50.10Q108.40-43.80 105.40-39.90Q102.40-36 98-34.20L98-34.20L98-32.40Q102-32.20 104.20-29.65Q106.40-27.10 106.40-22.90L106.40-22.90L106.40 0L93.20 0L93.20-21Q93.20-23.40 91.95-24.90Q90.70-26.40 87.80-26.40L87.80-26.40L69.40-26.40L69.40 0ZM69.40-58L69.40-38.40L85.20-38.40Q89.90-38.40 92.55-40.95Q95.20-43.50 95.20-47.70L95.20-47.70L95.20-48.70Q95.20-52.90 92.60-55.45Q90-58 85.20-58L85.20-58L69.40-58Z"/><path class="frdev__dev" d="M164 0L135.20 0L135.20-11.60L144.40-11.60L144.40-58.40L135.20-58.40L135.20-70L164-70Q178.10-70 185.45-62.85Q192.80-55.70 192.80-41.60L192.80-41.60L192.80-28.40Q192.80-14.30 185.45-7.15Q178.10 0 164 0L164 0ZM157.60-58L157.60-12L164.20-12Q172.20-12 175.90-16.20Q179.60-20.40 179.60-28L179.60-28L179.60-42Q179.60-49.70 175.90-53.85Q172.20-58 164.20-58L164.20-58L157.60-58ZM223.00 1.40L223.00 1.40Q215.60 1.40 209.95-1.75Q204.30-4.90 201.15-10.65Q198.00-16.40 198.00-24.20L198.00-24.20L198.00-25.40Q198.00-33.20 201.10-38.95Q204.20-44.70 209.80-47.85Q215.40-51 222.80-51L222.80-51Q230.10-51 235.50-47.75Q240.90-44.50 243.90-38.75Q246.90-33 246.90-25.40L246.90-25.40L246.90-21.10L210.80-21.10Q211.00-16 214.60-12.80Q218.20-9.60 223.40-9.60L223.40-9.60Q228.70-9.60 231.20-11.90Q233.70-14.20 235.00-17L235.00-17L245.30-11.60Q243.90-9 241.25-5.95Q238.60-2.90 234.20-0.75Q229.80 1.40 223.00 1.40ZM210.90-30.50L210.90-30.50L234.10-30.50Q233.70-34.80 230.65-37.40Q227.60-40 222.70-40L222.70-40Q217.60-40 214.60-37.40Q211.60-34.80 210.90-30.50ZM284.70 0L264.70 0L248.90-49.60L262.30-49.60L273.80-9.20L275.60-9.20L287.10-49.60L300.50-49.60L284.70 0Z"/></svg>
    <span class="frdev__sep" aria-hidden="true"></span>
    <span class="frdev__cta" aria-hidden="true"><span class="frdev__pergunta">Quer um site assim? </span><strong>Fale com o Fábio</strong><span class="frdev__seta">→</span></span>
  </a>
</div>
```

Menu do painel:

```html
<div class="frdev frdev--menu">
  <svg class="frdev__selo" viewBox="0 0 176 176" aria-hidden="true" focusable="false"><path class="frdev__quadrado" d="M44 0H132A44 44 0 0 1 176 44V132A44 44 0 0 1 132 176H44A44 44 0 0 1 0 132V44A44 44 0 0 1 44 0Z"/><path class="frdev__letras" d="M47.58 119.83L35.44 119.83L35.44 55.43L75.92 55.43L75.92 66.47L47.58 66.47L47.58 82.02L73.71 82.02L73.71 93.06L47.58 93.06L47.58 119.83ZM92.71 119.83L80.56 119.83L80.56 55.43L108.53 55.43Q114.60 55.43 119.11 57.55Q123.62 59.66 126.10 63.53Q128.59 67.39 128.59 72.64L128.59 72.64L128.59 73.74Q128.59 79.54 125.83 83.12Q123.07 86.71 119.02 88.37L119.02 88.37L119.02 90.02Q122.70 90.21 124.72 92.55Q126.75 94.90 126.75 98.76L126.75 98.76L126.75 119.83L114.60 119.83L114.60 100.51Q114.60 98.30 113.45 96.92Q112.30 95.54 109.64 95.54L109.64 95.54L92.71 95.54L92.71 119.83ZM92.71 66.47L92.71 84.50L107.24 84.50Q111.57 84.50 114.01 82.16Q116.44 79.81 116.44 75.95L116.44 75.95L116.44 75.03Q116.44 71.16 114.05 68.82Q111.66 66.47 107.24 66.47L107.24 66.47L92.71 66.47Z"/><rect class="frdev__barra" x="134.64" y="56" width="12" height="70" rx="3"/></svg>
  <span class="frdev__txt">
    <span class="frdev__linha"><svg class="frdev__palavra" viewBox="6.6 -70 293.9 71.4" role="img" aria-label="FR Dev" focusable="false"><path class="frdev__fr" d="M19.80 0L6.60 0L6.60-70L50.60-70L50.60-58L19.80-58L19.80-41.10L48.20-41.10L48.20-29.10L19.80-29.10L19.80 0ZM69.40 0L56.20 0L56.20-70L86.60-70Q93.20-70 98.10-67.70Q103-65.40 105.70-61.20Q108.40-57 108.40-51.30L108.40-51.30L108.40-50.10Q108.40-43.80 105.40-39.90Q102.40-36 98-34.20L98-34.20L98-32.40Q102-32.20 104.20-29.65Q106.40-27.10 106.40-22.90L106.40-22.90L106.40 0L93.20 0L93.20-21Q93.20-23.40 91.95-24.90Q90.70-26.40 87.80-26.40L87.80-26.40L69.40-26.40L69.40 0ZM69.40-58L69.40-38.40L85.20-38.40Q89.90-38.40 92.55-40.95Q95.20-43.50 95.20-47.70L95.20-47.70L95.20-48.70Q95.20-52.90 92.60-55.45Q90-58 85.20-58L85.20-58L69.40-58Z"/><path class="frdev__dev" d="M164 0L135.20 0L135.20-11.60L144.40-11.60L144.40-58.40L135.20-58.40L135.20-70L164-70Q178.10-70 185.45-62.85Q192.80-55.70 192.80-41.60L192.80-41.60L192.80-28.40Q192.80-14.30 185.45-7.15Q178.10 0 164 0L164 0ZM157.60-58L157.60-12L164.20-12Q172.20-12 175.90-16.20Q179.60-20.40 179.60-28L179.60-28L179.60-42Q179.60-49.70 175.90-53.85Q172.20-58 164.20-58L164.20-58L157.60-58ZM223.00 1.40L223.00 1.40Q215.60 1.40 209.95-1.75Q204.30-4.90 201.15-10.65Q198.00-16.40 198.00-24.20L198.00-24.20L198.00-25.40Q198.00-33.20 201.10-38.95Q204.20-44.70 209.80-47.85Q215.40-51 222.80-51L222.80-51Q230.10-51 235.50-47.75Q240.90-44.50 243.90-38.75Q246.90-33 246.90-25.40L246.90-25.40L246.90-21.10L210.80-21.10Q211.00-16 214.60-12.80Q218.20-9.60 223.40-9.60L223.40-9.60Q228.70-9.60 231.20-11.90Q233.70-14.20 235.00-17L235.00-17L245.30-11.60Q243.90-9 241.25-5.95Q238.60-2.90 234.20-0.75Q229.80 1.40 223.00 1.40ZM210.90-30.50L210.90-30.50L234.10-30.50Q233.70-34.80 230.65-37.40Q227.60-40 222.70-40L222.70-40Q217.60-40 214.60-37.40Q211.60-34.80 210.90-30.50ZM284.70 0L264.70 0L248.90-49.60L262.30-49.60L273.80-9.20L275.60-9.20L287.10-49.60L300.50-49.60L284.70 0Z"/></svg><span class="frdev__nome">· Fábio Ranyeri</span></span>
    <a href="mailto:frnr.mv@icloud.com">frnr.mv@icloud.com</a>
  </span>
</div>
```

```css
/* ---------- assinatura FR Dev (site e bancada) ---------- */
.frdev { --frdev-acento: #2BC4AC; --frdev-selo: #F4F7F6; --frdev-letra: #0E1A2B; --frdev-barra: #0F8A78;
  color: inherit; text-transform: none; letter-spacing: 0; }
.frdev__selo { flex: none; display: block; width: 26px; height: 26px; }
.frdev__quadrado { fill: var(--frdev-selo); }
.frdev__letras { fill: var(--frdev-letra); }
.frdev__barra { fill: var(--frdev-barra); }
.frdev__palavra { flex: none; display: block; height: 12px; width: auto; aspect-ratio: 4.116; }
.frdev__fr { fill: currentColor; }
.frdev__dev { fill: var(--frdev-acento); }

/* rodapé do site: pílula centralizada, toda clicável */
.frdev-rodape { display: flex; justify-content: center; padding: 22px 16px 4px; }
.frdev--pilula {
  display: inline-flex; align-items: center; gap: 10px; max-width: 100%;
  padding: 6px 16px 6px 6px; border-radius: 999px; text-decoration: none; white-space: nowrap;
  font-size: 12.5px; line-height: 1; color: #D9D1BA;
  border: 1px solid rgba(233, 221, 197, 0.18); background: rgba(233, 221, 197, 0.05);
  transition: border-color .25s, background .25s, transform .25s, box-shadow .25s;
}
.frdev--pilula:hover, .frdev--pilula:focus-visible {
  border-color: rgba(43, 196, 172, 0.55); background: rgba(43, 196, 172, 0.08);
  transform: translateY(-1px); box-shadow: 0 10px 24px -14px rgba(0, 0, 0, 0.6);
}
.frdev--pilula .frdev__por { opacity: 0.72; }
.frdev__sep { width: 1px; height: 16px; background: currentColor; opacity: 0.25; }
.frdev__cta { display: inline-flex; align-items: center; gap: 0; }
.frdev__cta strong { font-weight: 600; color: var(--frdev-acento); }
.frdev__pergunta { opacity: 0.72; margin-right: 0.5ch; }
.frdev__seta { display: inline-block; margin-left: 6px; color: var(--frdev-acento); transition: transform .25s; }
.frdev--pilula:hover .frdev__seta, .frdev--pilula:focus-visible .frdev__seta { transform: translateX(3px); }
@media (max-width: 560px) {
  .frdev--pilula .frdev__por, .frdev__pergunta { display: none; }
}
@media (max-width: 900px) { .frdev-rodape { padding-bottom: 84px; } } /* o WhatsApp flutuante não cobre a pílula no fim da página */
@media (prefers-reduced-motion: reduce) {
  .frdev--pilula, .frdev__seta { transition: none; }
  .frdev--pilula:hover { transform: none; }
}

/* pé do menu da bancada: compacto, alinhado à esquerda */
.frdev--menu { display: flex; align-items: center; gap: 10px; margin-top: 10px; padding-top: 12px;
  border-top: 1px solid rgba(233, 221, 197, 0.1); color: rgba(233, 221, 197, 0.82); }
.frdev--menu .frdev__selo { width: 24px; height: 24px; }
.frdev__txt { display: grid; gap: 4px; min-width: 0; font-size: 12px; line-height: 1.3; }
.frdev__linha { display: flex; align-items: center; gap: 6px; min-width: 0; }
.frdev--menu .frdev__palavra { height: 10.5px; }
.frdev__nome { opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.frdev--menu a { color: inherit; opacity: 0.85; text-decoration: underline; text-decoration-color: rgba(233, 221, 197, 0.35); text-underline-offset: 3px; overflow-wrap: anywhere; }
.frdev--menu a:hover { opacity: 1; text-decoration-color: currentColor; }
@media (max-width: 900px) { .frdev--menu a { min-height: 32px; display: inline-flex; align-items: center; } }
```

No React, troque `class` por `className`. As cores de borda/fundo da pílula e do menu estão para rodapé escuro; ajuste ao projeto.
