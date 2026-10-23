# Assinatura de Fábio Ranyeri (vibe coder)

Em todo projeto feito com o Claude, o sistema leva esta assinatura pequena e discreta, **só a marca, o nome e o e-mail**:

- **Selo "FR"**: círculo com fio fino, letras FR na fonte de títulos do projeto (Italiana, se houver).
- **Texto**: "Feito por Fábio Ranyeri" (no menu estreito da bancada, só "Fábio Ranyeri") e, embaixo, o e-mail **frnr.mv@icloud.com** como link `mailto:`.
- **Cor**: a do rodapé onde está (`currentColor`), com ~80 % de opacidade. Tamanho do texto: 12 px.
- **Onde**: rodapé do site (centralizada, abaixo da linha final) e pé do menu lateral da bancada/painel interno. Não vai em e-mails para clientes nem na área do aluno, salvo pedido.
- **Nome certo**: Fábio (com acento) Ranyeri.

Implementação de referência (React): `src/components/Assinatura.jsx` + bloco "assinatura" no fim de `src/styles.css` (projeto Casa Âmbar).

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
