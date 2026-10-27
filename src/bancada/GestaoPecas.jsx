import { Ajuda } from './ui.jsx';

// Peças visuais das telas de gestão (Financeiro, Relatórios, Meus ganhos).
// Só apresentação: nenhum cálculo ou chamada de API mora aqui.

const ICONES = {
  entra: <path d="M17 7 7 17M7 8v9h9" />,
  sai: <path d="M7 17 17 7M8 7h9v9" />,
  moeda: <><circle cx="12" cy="12" r="8.5" /><path d="M14.8 9.2c-.5-.9-1.5-1.4-2.8-1.4-1.6 0-2.8.8-2.8 2s1.2 1.7 2.8 2c1.6.3 2.8.9 2.8 2.1s-1.2 2.1-2.8 2.1c-1.3 0-2.4-.6-2.9-1.5M12 6.3v1.5M12 16.2v1.5" /></>,
  relogio: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  calendario: <><rect x="4" y="5.5" width="16" height="14.5" rx="2.5" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></>,
  baixar: <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />,
  imprimir: <path d="M7 9V4h10v5M7 17H5v-6h14v6h-2M7 14h10v6H7z" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  cartao: <><rect x="3" y="6" width="18" height="12.5" rx="2.5" /><path d="M3 10.5h18M7 15h3" /></>,
  percentual: <><path d="M18 6 6 18" /><circle cx="7.5" cy="7.5" r="2" /><circle cx="16.5" cy="16.5" r="2" /></>,
  recibo: <><path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  barras: <path d="M4 20V11M10 20V4M16 20v-7M22 20H2" />,
  pessoa: <><circle cx="12" cy="8" r="3.4" /><path d="M5 20c1-3.6 3.8-5.6 7-5.6s6 2 7 5.6" /></>,
  presenca: <><circle cx="10" cy="8" r="3.4" /><path d="M3.5 20c.8-3.4 3.4-5.4 6.5-5.4M15 17.5l2 2 4-4.5" /></>,
  novos: <><circle cx="10" cy="8" r="3.4" /><path d="M3.5 20c.8-3.4 3.4-5.4 6.5-5.4M18 12v6M15 15h6" /></>,
  renovar: <path d="M20 11a8 8 0 0 0-14-4M4 5v3h3M4 13a8 8 0 0 0 14 4M20 19v-3h-3" />,
  presente: <><rect x="4" y="9.5" width="16" height="10.5" rx="1.5" /><path d="M12 9.5V20M3 6.5h18v3H3zM12 6.5C10.5 3 7 3.2 8 5.2s4 1.3 4 1.3zM12 6.5c1.5-3.5 5-3.3 4-1.3s-4 1.3-4 1.3z" /></>,
  alerta: <><path d="M12 4 21 19.5H3z" /><path d="M12 10v4.5M12 17.2v.1" /></>,
  fechar: <><circle cx="12" cy="12" r="8.5" /><path d="M9 9l6 6M15 9l-6 6" /></>,
  cupom: <><path d="M4 8a2 2 0 0 0 0 4 2 2 0 0 1 0 4v1.5h16V16a2 2 0 0 1 0-4 2 2 0 0 0 0-4V6.5H4z" /><path d="M14 8v8" strokeDasharray="1.5 2.5" /></>,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3A4 4 0 0 0 13 5.3l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1" />,
  vazio: <><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12h7" /></>,
};

export function Ic({ nome, tam = 20 }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONES[nome] || ICONES.vazio}
    </svg>
  );
}

// número grande + ícone + etiqueta de comparação (tom: ok | alerta | aviso | neutro)
export function KpiG({ icone = 'moeda', rotulo, valor, detalhe, tom, etiqueta, etiquetaTom, destaque, ajuda, compacto }) {
  return (
    <div className={`gs-kpi${tom ? ' gs-kpi--' + tom : ''}${destaque ? ' gs-kpi--destaque' : ''}${compacto ? ' gs-kpi--compacto' : ''}`}>
      <div className="gs-kpi__topo">
        <span className="b-icone-chip gs-kpi__chip"><Ic nome={icone} tam={19} /></span>
        <span className="gs-kpi__rotulo">{rotulo}{ajuda && <Ajuda titulo={typeof rotulo === 'string' ? rotulo : undefined}>{ajuda}</Ajuda>}</span>
      </div>
      <strong className="gs-kpi__valor">{valor}</strong>
      {(etiqueta || detalhe) && (
        <div className="gs-kpi__rodape">
          {etiqueta && <span className={`gs-etiqueta gs-etiqueta--${etiquetaTom || 'neutro'}`}>{etiqueta}</span>}
          {detalhe && <span className="gs-kpi__detalhe">{detalhe}</span>}
        </div>
      )}
    </div>
  );
}

export function BotaoCsv({ aoClicar, desabilitado, rotulo = 'CSV', titulo = 'Baixar planilha (CSV)' }) {
  return (
    <button type="button" className="botao botao--fantasma botao--p gs-csv" onClick={aoClicar} disabled={desabilitado} title={titulo}>
      <Ic nome="baixar" tam={16} />{rotulo}
    </button>
  );
}

// cartão de gráfico/lista: título + "?" + ações; `sub` é só para frases curtas
export function CartaoG({ titulo, ajuda, sub, csv, acoes, children, className = '' }) {
  return (
    <section className={`b-cartao b-grafico gs-cartao ${className}`.trim()}>
      <header className="gs-cartao__topo">
        <div className="gs-cartao__titulos">
          <h2 className="gs-cartao__titulo">{titulo}{ajuda && <Ajuda titulo={typeof titulo === 'string' ? titulo : undefined}>{ajuda}</Ajuda>}</h2>
          {sub && <p className="gs-cartao__sub">{sub}</p>}
        </div>
        {(csv || acoes) && <div className="gs-cartao__acoes">{acoes}{csv && <BotaoCsv aoClicar={csv} />}</div>}
      </header>
      {children}
    </section>
  );
}

// estado vazio dentro de cartão: ícone + frase + próxima ação
export function VazioG({ icone = 'check', titulo, children, acao }) {
  return (
    <div className="gs-vazio">
      <span className="b-icone-chip gs-vazio__chip"><Ic nome={icone} tam={20} /></span>
      <strong>{titulo}</strong>
      {children && <span>{children}</span>}
      {acao && <div className="gs-vazio__acao">{acao}</div>}
    </div>
  );
}

// "27" + "out": a data como pastilha
export function DiaChip({ dia, mes, tom }) {
  return <span className={`gs-dia${tom ? ' gs-dia--' + tom : ''}`}><b>{dia}</b><small>{mes}</small></span>;
}
