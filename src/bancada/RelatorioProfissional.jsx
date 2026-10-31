import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBancada } from './sessao.jsx';
import { Carregando, Erro, real, dataBR, dataCurta, mesTexto, plural } from './ui.jsx';
import { Logo } from '../components/Marca.jsx';

const pct = (n) => `${String(n).replace('.', ',')}%`;
const diaMes = (iso) => { const [a, m] = String(iso).split('-'); return { ini: `01/${m}/${a}`, fim: `${new Date(Number(a), Number(m), 0).getDate()}/${m}/${a}` }; };
const quando = (t) => { const s = String(t || ''); return s ? `${dataBR(s.slice(0, 10))} às ${s.slice(11, 16)}` : ''; };

function Situacao({ l }) {
  return l.pago ? <span className="rel-sit rel-sit--ok">paga{l.pagoEm ? ` ${dataCurta(l.pagoEm)}` : ''}</span> : <span className="rel-sit rel-sit--aberto">a pagar</span>;
}

function Tabela({ titulo, nota, linhas, colunas, total, rotuloTotal }) {
  if (!linhas.length) return null;
  return (
    <section className="rel-secao">
      <h3 className="rel-secao__titulo">{titulo}{nota && <small>{nota}</small>}</h3>
      <div className="rel-rolagem">
        <table className={`rel-tabela${colunas[1]?.rotulo === 'Hora' ? ' rel-tabela--hora' : ''}`}>
          <thead><tr>{colunas.map((c) => <th key={c.rotulo} className={c.num ? 'num' : ''}>{c.rotulo}</th>)}</tr></thead>
          <tbody>
            {linhas.map((l, i) => <tr key={i}>{colunas.map((c) => <td key={c.rotulo} data-rotulo={c.rotulo} className={c.num ? 'num' : ''}>{c.ver(l)}</td>)}</tr>)}
          </tbody>
          {total != null && (
            <tfoot><tr><td colSpan={colunas.length - 2}>{rotuloTotal}</td><td className="num"><strong>{real(total)}</strong></td><td /></tr></tfoot>
          )}
        </table>
      </div>
    </section>
  );
}

// Relatório do mês de uma pessoa da equipe: uma folha para conferir as contas e imprimir ou salvar em PDF
export default function RelatorioProfissional({ mes, profissional, aoFechar }) {
  const { chamar } = useBancada();
  const [d, setD] = useState(null);
  const [erro, setErro] = useState('');
  useEffect(() => {
    let vivo = true;
    chamar('relatorioProfissional', { mes, profissional }).then((r) => vivo && setD(r)).catch((e) => vivo && setErro(e.message));
    const tecla = (e) => { if (e.key === 'Escape') aoFechar(); };
    document.addEventListener('keydown', tecla);
    return () => { vivo = false; document.removeEventListener('keydown', tecla); };
  }, [mes, profissional]); // eslint-disable-line react-hooks/exhaustive-deps

  const r = d?.resumo;
  const per = diaMes(`${mes}-01`);
  const temAulas = r && (r.aulasYoga > 0 || r.alunosPilates > 0);
  const aPagarAgora = r ? Math.round((r.aPagar + r.anterioresAPagar) * 100) / 100 : 0;
  return createPortal(
    <div className="rel-tela" role="dialog" aria-modal="true" aria-label={`Relatório de ${profissional || 'comissões'}`}>
      <div className="rel-barra">
        <button type="button" className="botao botao--linha botao--p" onClick={aoFechar}>← Voltar</button>
        <span className="rel-barra__txt">Pré-visualização · {d ? 'pronto para imprimir' : 'montando…'}</span>
        <button type="button" className="botao botao--cheio botao--p" disabled={!d} onClick={() => window.print()}>Imprimir ou salvar em PDF</button>
      </div>
      {erro && <div className="rel-aviso"><Erro>{erro}</Erro></div>}
      {!d && !erro && <div className="rel-aviso"><Carregando /></div>}
      {d && (
        <article className="rel-folha">
          <header className="rel-topo">
            <Logo variante="verde" largura={92} />
            <div className="rel-topo__mes">
              <span className="rel-rotulo">Relatório do mês</span>
              <strong>{mesTexto(mes)}</strong>
            </div>
          </header>

          <div className="rel-quem">
            <h2>{d.profissional}</h2>
            <p>Atendimentos, aulas e comissões · de {per.ini} a {per.fim}</p>
            {d.liquida && <p className="rel-base">A base de cada comissão é o valor depois da taxa da maquininha.</p>}
          </div>

          <section className="rel-resumo" aria-label="Resumo do mês">
            <div><span>Atendimentos feitos</span><strong>{r.atendimentos}</strong><small>{plural(r.faltas, 'falta', 'faltas')}{r.cancelados ? ` · ${plural(r.cancelados, 'cancelado', 'cancelados')}` : ''}</small></div>
            {temAulas && <div><span>Aulas</span><strong>{r.aulasYoga + r.alunosPilates}</strong><small>{[r.aulasYoga > 0 && `${plural(r.aulasYoga, 'aula de Yoga', 'aulas de Yoga')}`, r.alunosPilates > 0 && `${plural(r.alunosPilates, 'aluno', 'alunos')} no Pilates`].filter(Boolean).join(' · ')}</small></div>}
            <div><span>Já pago</span><strong>{real(r.pago)}</strong><small>no mês</small></div>
            <div className="rel-resumo__destaque"><span>Comissão do mês</span><strong>{real(r.comissao)}</strong><small>{r.aPagar > 0.009 ? `${real(r.aPagar)} a pagar` : 'tudo pago'}</small></div>
          </section>

          <Tabela titulo="Atendimentos" nota={`${plural(d.atendimentos.length, 'lançamento', 'lançamentos')} com comissão`} linhas={d.atendimentos} total={d.totais.atendimentos} rotuloTotal="Total dos atendimentos"
            colunas={[
              { rotulo: 'Data', ver: (l) => dataCurta(l.data) },
              { rotulo: 'Hora', ver: (l) => l.hora || '—' },
              { rotulo: 'Cliente', ver: (l) => <>{l.cliente || '—'}{l.obs && <small className="rel-obs"> {l.obs}</small>}</> },
              { rotulo: 'Serviço', ver: (l) => l.servico },
              { rotulo: 'Base', num: true, ver: (l) => real(l.base) },
              { rotulo: '%', num: true, ver: (l) => pct(l.pct) },
              { rotulo: 'Comissão', num: true, ver: (l) => <strong>{real(l.valor)}</strong> },
              { rotulo: 'Situação', ver: (l) => <Situacao l={l} /> },
            ]} />

          <Tabela titulo="Aulas" nota="Pilates: % sobre o valor da aula de cada aluno · Yoga: valor por aula dada" linhas={d.aulas} total={d.totais.aulas} rotuloTotal="Total das aulas"
            colunas={[
              { rotulo: 'Data', ver: (l) => dataCurta(l.data) },
              { rotulo: 'Aula', ver: (l) => l.item },
              { rotulo: 'Base', num: true, ver: (l) => real(l.base) },
              { rotulo: '%', num: true, ver: (l) => (l.origem === 'aula_fixa' ? 'por aula' : pct(l.pct)) },
              { rotulo: 'Comissão', num: true, ver: (l) => <strong>{real(l.valor)}</strong> },
              { rotulo: 'Situação', ver: (l) => <Situacao l={l} /> },
            ]} />

          <Tabela titulo="Produtos e vendas na comanda" linhas={d.outras} total={d.totais.outras} rotuloTotal="Total"
            colunas={[
              { rotulo: 'Data', ver: (l) => dataCurta(l.data) },
              { rotulo: 'Item', ver: (l) => l.item },
              { rotulo: 'Base', num: true, ver: (l) => real(l.base) },
              { rotulo: '%', num: true, ver: (l) => pct(l.pct) },
              { rotulo: 'Comissão', num: true, ver: (l) => <strong>{real(l.valor)}</strong> },
              { rotulo: 'Situação', ver: (l) => <Situacao l={l} /> },
            ]} />

          {!d.atendimentos.length && !d.aulas.length && !d.outras.length && <p className="rel-vazio">Nenhum atendimento, aula ou venda com comissão em {mesTexto(mes)}.</p>}

          <div className="rel-fecho">
            <section className="rel-secao rel-secao--junto">
              <h3 className="rel-secao__titulo">Fechamento</h3>
              <dl className="rel-contas">
                {d.atendimentos.length > 0 && <div><dt>Atendimentos</dt><dd>{real(d.totais.atendimentos)}</dd></div>}
                {d.aulas.length > 0 && <div><dt>Aulas</dt><dd>{real(d.totais.aulas)}</dd></div>}
                {d.outras.length > 0 && <div><dt>Produtos e vendas</dt><dd>{real(d.totais.outras)}</dd></div>}
                <div className="rel-contas__linha"><dt>Comissão do mês</dt><dd>{real(r.comissao)}</dd></div>
                <div><dt>Já pago</dt><dd>− {real(r.pago)}</dd></div>
                <div><dt>A pagar do mês</dt><dd>{real(r.aPagar)}</dd></div>
                {r.anterioresAPagar > 0.009 && <div><dt>Pendente de meses anteriores</dt><dd>{real(r.anterioresAPagar)}</dd></div>}
                <div className="rel-contas__total"><dt>Total a pagar agora</dt><dd>{real(aPagarAgora)}</dd></div>
              </dl>
            </section>
            <section className="rel-secao rel-secao--junto">
              <h3 className="rel-secao__titulo">Pagamentos registrados</h3>
              {d.pagamentos.length === 0 ? <p className="rel-vazio rel-vazio--p">Nenhum pagamento registrado neste mês.</p> : (
                <ul className="rel-pagos">
                  {d.pagamentos.map((p, i) => <li key={i}><span>{dataBR(p.data)}</span><span>{p.forma || '—'}</span><strong>{real(p.valor)}</strong></li>)}
                </ul>
              )}
              {d.anteriores.length > 0 && (
                <p className="rel-obs-fecho">Pendentes de antes de {mesTexto(mes)}: {d.anteriores.map((l) => `${dataCurta(l.data)} · ${l.item} (${real(l.valor)})`).join('; ')}.</p>
              )}
            </section>
          </div>

          <footer className="rel-assina">
            <p className="rel-assina__data">Fortaleza, ____ de ______________ de ________</p>
            <div className="rel-assina__linhas">
              <div><span /> <strong>Casa Âmbar</strong></div>
              <div><span /> <strong>{d.profissional}</strong></div>
            </div>
            <p className="rel-assina__rodape">Gerado em {quando(d.geradoEm)}{d.geradoPor ? ` por ${d.geradoPor}` : ''} · Casa Âmbar · Rua Eduardo Salgado, 448, Aldeota, Fortaleza</p>
          </footer>
        </article>
      )}
    </div>,
    document.body,
  );
}
