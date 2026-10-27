import { Ajuda } from './ui.jsx';
import './css/catalogo.css';

// Peças de apresentação de Catálogo, Equipe e Ajustes (só visual: nada aqui chama o servidor).
// Candidatas a subir para ui.jsx se outras telas precisarem.

// chave liga/desliga (no lugar da caixinha de marcar): o <input type="checkbox"> continua sendo o controle
export function Interruptor({ children, detalhe, className = '', ...resto }) {
  return (
    <label className={`cg-sw ${className}`.trim()}>
      <input type="checkbox" {...resto} />
      <span className="cg-sw__trilho" aria-hidden="true" />
      <span className="cg-sw__texto">
        <span>{children}</span>
        {detalhe && <small>{detalhe}</small>}
      </span>
    </label>
  );
}

// bloco de formulário (folhas e telas): título curto + "?" + campos
export function BlocoForm({ titulo, ajuda, extra, children, className = '' }) {
  return (
    <section className={`cg-bloco ${className}`.trim()}>
      {(titulo || extra) && (
        <header className="cg-bloco__topo">
          <h3 className="cg-bloco__titulo">{titulo}{ajuda && <Ajuda titulo={typeof titulo === 'string' ? titulo : undefined}>{ajuda}</Ajuda>}</h3>
          {extra && <div className="cg-bloco__extra">{extra}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

// bolinha com a inicial do nome
export function Avatar({ nome, tom }) {
  return <span className={`cg-avatar${tom ? ` cg-avatar--${tom}` : ''}`} aria-hidden="true">{String(nome || '?').trim().slice(0, 1).toUpperCase()}</span>;
}

// faixa no alto de uma aba: resumo (contagem) + "?" à esquerda, ação principal à direita
export function Barra({ resumo, ajuda, titulo, children }) {
  return (
    <div className="cg-barra">
      <div className="cg-barra__info">
        {resumo && <span className="cg-barra__resumo">{resumo}</span>}
        {ajuda && <Ajuda titulo={titulo}>{ajuda}</Ajuda>}
      </div>
      {children && <div className="cg-barra__acoes">{children}</div>}
    </div>
  );
}
