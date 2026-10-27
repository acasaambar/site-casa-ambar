// Peças pequenas que a Agenda, os agendamentos e as trocas usam juntas (visual: css/agenda.css).
import { Ajuda } from './ui.jsx';
import { Ocupacao } from './Graficos.jsx';
import { iniciais } from './agendaUtil.js';

// uma bolinha por lugar da aula (cheia = ocupado); aula grande vira barra
export function Lugares({ total, ocupados }) {
  if (!total) return null;
  if (total > 14) return <Ocupacao valor={ocupados} total={total} />;
  return (
    <span className="ag-lugares" role="img" aria-label={`${ocupados} de ${total} lugares ocupados`}>
      {Array.from({ length: total }, (_, i) => <i key={i} className={i < ocupados ? 'cheio' : ''} />)}
    </span>
  );
}

// bloco de formulário com título (e número do passo, ajuda e ação opcionais)
export function Passo({ n, titulo, ajuda, acao, children, className = '' }) {
  return (
    <section className={`ag-passo ${className}`.trim()}>
      <header className="ag-passo__topo">
        <h3 className="ag-passo__titulo">
          {n != null && <span className="ag-passo__n" aria-hidden="true">{n}</span>}
          {titulo}
          {ajuda && <Ajuda titulo={typeof titulo === 'string' ? titulo : undefined}>{ajuda}</Ajuda>}
        </h3>
        {acao}
      </header>
      <div className="ag-passo__corpo">{children}</div>
    </section>
  );
}

// cliente já escolhido: iniciais, nome, uma linha de detalhe e "Trocar"
export function ClienteEscolhido({ nome, detalhe, aoTrocar, rotulo = 'Trocar' }) {
  return (
    <div className="ag-cliente">
      <span className="ag-cliente__ini" aria-hidden="true">{iniciais(nome) || '?'}</span>
      <span className="ag-cliente__txt"><strong>{nome}</strong>{detalhe && <small>{detalhe}</small>}</span>
      {aoTrocar && <button type="button" className="botao botao--fantasma botao--p" onClick={aoTrocar}>{rotulo}</button>}
    </div>
  );
}

// linha com um rótulo e, ao lado, o "?" com a explicação
export function RotuloComAjuda({ children, ajuda }) {
  return <div className="ag-rotulo"><span className="rotulo">{children}</span>{ajuda && <Ajuda>{ajuda}</Ajuda>}</div>;
}
