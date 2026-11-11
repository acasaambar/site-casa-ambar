# Assinatura FR Dev (Fábio Ranyeri) — guia para qualquer projeto

Sempre que o Fábio pedir **"assinatura"** em um projeto, coloque a assinatura da **FR Dev** abaixo, **adaptada ao design e à arquitetura daquele projeto** (cores, fontes, framework, onde ficam rodapé e menu). O selo é sempre o mesmo desenho; o resto se adapta.

## O que é fixo (sempre igual)
- **Selo FR Dev**: o símbolo da logo — quadrado de cantos arredondados com **FR** e a barrinha (cursor) verde-água `#2BC4AC`. Use o SVG pronto abaixo (letras já em contorno, sem precisar carregar fonte): o quadrado pega a cor do texto (`currentColor`) e o FR fica **vazado**, mostrando o fundo; a barrinha é sempre verde-água.
- **Texto**: "Feito por **FR Dev** · Fábio Ranyeri" ("FR Dev" em seminegrito) e, embaixo, o e-mail **frnr.mv@icloud.com** como link (`mailto:`).
- **Só isso**: selo, marca, nome e e-mail. Sem slogan, sem redes, salvo se ele pedir.
- **Pequena e discreta**: selo de 22 a 26 px, texto de 12 px, ~80 % de opacidade; nunca disputa atenção com o conteúdo.

## Logo completa (para referência)
- Artefato "Logo FR Dev" (claude.ai, canvas com 3 versões: clara, escura e ícone).
- Cores: azul-noite `#0E1A2B`, verde-água `#2BC4AC` (barrinha e "Dev" no escuro), verde-petróleo `#0F8A78` ("Dev" no claro), fundo claro `#F4F7F6`.
- Fonte da marca: **Space Grotesk** 700 (letras FR, "FR Dev"); texto em Inter. Na assinatura, o texto usa a fonte do próprio projeto.
- Proporções do selo: quadrado 176, cantos 44 (25 %), FR em 92 px com espaçamento -4, barrinha 12 × 70 com cantos 3, a 6 px do R.

## O que se adapta ao projeto
- **Cor**: herdar a cor do rodapé/menu onde está (`currentColor`), nunca uma cor nova (só a barrinha é verde-água).
- **Onde**:
  - Site/landing: no final do rodapé, centralizada, abaixo da linha final (copyright).
  - Painel/área interna: no pé do menu lateral (no menu estreito, sem o "Feito por"). Sem menu lateral: rodapé do painel.
  - App sem rodapé (ex.: jogo, ferramenta de uma tela): canto inferior, ou numa tela "Sobre".
  - Não colocar em e-mails para clientes nem em telas de pagamento/login, salvo pedido.
- **Tecnologia**: componente da própria stack (React: componente `Assinatura` com o SVG; HTML puro ou Apps Script/HtmlService: o bloco HTML abaixo no rodapé + o CSS). Estilos no arquivo de estilos global do projeto.
- **Conferir**: celular (390 px) e computador sem rolagem lateral; clique no e-mail abre o app de e-mail; contraste legível em fundo claro e escuro.

## Depois de aplicar
1. Rodar os testes/lint/build do projeto.
2. Anotar no `CLAUDE.md` do projeto (seção "Assinatura do Fábio", 2 linhas: onde está e qual arquivo).
3. Copiar este `assinatura.md` para o projeto, se ainda não estiver nele.

## Referência React (Casa Âmbar)
Componente `src/components/Assinatura.jsx` (exporta `SeloFRDev` e `Assinatura`) e bloco "assinatura" no fim de `src/styles.css`.

## Bloco pronto (HTML puro / Apps Script)

```html
<div class="assinatura">
  <svg class="assinatura__selo" viewBox="0 0 176 176" aria-hidden="true" focusable="false"><path fill="currentColor" fill-rule="evenodd" d="M44 0H132A44 44 0 0 1 176 44V132A44 44 0 0 1 132 176H44A44 44 0 0 1 0 132V44A44 44 0 0 1 44 0ZM47.58 119.83L35.44 119.83L35.44 55.43L75.92 55.43L75.92 66.47L47.58 66.47L47.58 82.02L73.71 82.02L73.71 93.06L47.58 93.06L47.58 119.83ZM92.71 119.83L80.56 119.83L80.56 55.43L108.53 55.43Q114.60 55.43 119.11 57.55Q123.62 59.66 126.10 63.53Q128.59 67.39 128.59 72.64L128.59 72.64L128.59 73.74Q128.59 79.54 125.83 83.12Q123.07 86.71 119.02 88.37L119.02 88.37L119.02 90.02Q122.70 90.21 124.72 92.55Q126.75 94.90 126.75 98.76L126.75 98.76L126.75 119.83L114.60 119.83L114.60 100.51Q114.60 98.30 113.45 96.92Q112.30 95.54 109.64 95.54L109.64 95.54L92.71 95.54L92.71 119.83ZM92.71 66.47L92.71 84.50L107.24 84.50Q111.57 84.50 114.01 82.16Q116.44 79.81 116.44 75.95L116.44 75.95L116.44 75.03Q116.44 71.16 114.05 68.82Q111.66 66.47 107.24 66.47L107.24 66.47L92.71 66.47Z"/><rect x="134.64" y="56" width="12" height="70" rx="3" fill="#2BC4AC"/></svg>
  <span class="assinatura__txt">
    <span><span class="assinatura__por">Feito por </span><strong class="assinatura__marca">FR Dev</strong> · Fábio Ranyeri</span>
    <a href="mailto:frnr.mv@icloud.com">frnr.mv@icloud.com</a>
  </span>
</div>
```

```css
.assinatura { display: inline-flex; align-items: center; gap: 10px; color: inherit; text-transform: none; letter-spacing: 0; }
.assinatura__selo { flex: none; display: block; width: 26px; height: 26px; opacity: 0.85; }
.assinatura__txt { display: grid; gap: 1px; font-size: 12px; line-height: 1.35; opacity: 0.78; min-width: 0; }
.assinatura__marca { font-weight: 600; }
.assinatura__txt a { color: inherit; text-decoration: underline; text-underline-offset: 3px; overflow-wrap: anywhere; }
```

No React, troque `class` por `className` e `fill-rule` por `fillRule`.
