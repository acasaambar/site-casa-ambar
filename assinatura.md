# Assinatura de Fábio Ranyeri (vibe coder) — guia para qualquer projeto

Sempre que o Fábio pedir **"assinatura"** em um projeto, coloque a assinatura abaixo, **adaptada ao design e à arquitetura daquele projeto** (fontes, cores, framework, onde ficam rodapé e menu). Não copie o visual da Casa Âmbar: copie a ideia.

## O que é fixo (sempre igual)
- **Selo "FR"**: círculo com fio fino e as letras FR dentro.
- **Nome**: "Fábio Ranyeri" (com acento no Fábio), no texto "Feito por Fábio Ranyeri".
- **E-mail**: **frnr.mv@icloud.com**, como link clicável (`mailto:`).
- **Só isso**: marca, nome e e-mail. Sem slogan, sem "vibe coder", sem redes, salvo se ele pedir.
- **Pequena e discreta**: texto de 12 px, opacidade de ~80 %, nunca disputa atenção com o conteúdo.

## O que se adapta ao projeto
- **Fonte das letras FR**: a fonte de títulos/marca do projeto (serifada fina, se existir); o texto usa a fonte de texto do projeto.
- **Cor**: herdar a cor do rodapé/menu onde está (`currentColor`), nunca uma cor nova.
- **Onde**:
  - Site/landing: no final do rodapé, centralizada, abaixo da linha final (copyright).
  - Painel/área interna: no pé do menu lateral (no menu estreito, só o nome sem o "Feito por"). Sem menu lateral: rodapé do painel.
  - App sem rodapé (ex.: jogo, ferramenta de uma tela): canto inferior, ou numa tela "Sobre".
  - Não colocar em e-mails para clientes nem em telas de pagamento/login, salvo pedido.
- **Tecnologia**: componente da própria stack (React: um componente `Assinatura`; HTML puro: um bloco no rodapé + CSS; Apps Script/HtmlService: bloco no template). Estilos no arquivo de estilos global do projeto.
- **Conferir**: celular (390 px) e computador sem rolagem lateral; clique no e-mail abre o app de e-mail; contraste legível em fundo claro e escuro.

## Depois de aplicar
1. Rodar os testes/lint/build do projeto.
2. Anotar no `CLAUDE.md` do projeto (seção "Assinatura do Fábio", 2 linhas: onde está e qual arquivo).
3. Copiar este `assinatura.md` para o projeto, se ainda não estiver nele.

## Referência (Casa Âmbar, React)
Componente `src/components/Assinatura.jsx` e bloco "assinatura" no fim de `src/styles.css`.

```jsx
export default function Assinatura({ className = '' }) {
  return (
    <div className={`assinatura ${className}`.trim()}>
      <span className="assinatura__selo" aria-hidden="true">FR</span>
      <span className="assinatura__txt">
        <span><span className="assinatura__por">Feito por </span>Fábio Ranyeri</span>
        <a href="mailto:frnr.mv@icloud.com">frnr.mv@icloud.com</a>
      </span>
    </div>
  );
}
```

```css
.assinatura { display: inline-flex; align-items: center; gap: 10px; color: inherit; text-transform: none; letter-spacing: 0; }
.assinatura__selo { flex: none; width: 28px; height: 28px; border-radius: 50%; border: 1px solid currentColor; opacity: 0.8;
  display: grid; place-items: center; font-family: var(--display, serif); font-size: 14px; line-height: 1; letter-spacing: -0.04em; padding-top: 1px; }
.assinatura__txt { display: grid; gap: 1px; font-size: 12px; line-height: 1.35; opacity: 0.78; min-width: 0; }
.assinatura__txt a { color: inherit; text-decoration: underline; text-underline-offset: 3px; overflow-wrap: anywhere; }
```
