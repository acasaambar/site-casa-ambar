import { useMemo, useRef, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import RelatorioProfissional from './RelatorioProfissional.jsx';
import { useBancada } from './sessao.jsx';
import { useDados, Carregando, Erro, Cabecalho, Modal, BotaoAcao, Vazio, Tag, Kpi, Abas, SeletorMes, real, realCurto, dataBR, dataCurta, hojeIso, numBR, baixarCSV,
  METODOS, mesTexto, plural } from './ui.jsx';
import { BarrasH } from './Graficos.jsx';

const mesAtual = () => hojeIso().slice(0, 7);

export default function Financeiro() {
  const local = useLocation();
  const [aba, setAba] = useState(local.state?.aba || 'mes');
  const [mes, setMes] = useState(mesAtual());
  return (
    <>
      <Cabecalho titulo="Financeiro" acoes={<SeletorMes mes={mes} aoMudar={setMes} />}>
        Entradas, despesas, comissões e caixas. As vendas entram sozinhas (site, balcão e comandas).
      </Cabecalho>
      <Abas atual={aba} aoMudar={setAba} itens={[['mes', 'Visão do mês'], ['despesas', 'Despesas'], ['comissoes', 'Comissões'], ['caixas', 'Caixas']]} />
      {aba === 'mes' && <Mes mes={mes} irPara={setAba} />}
      {aba === 'despesas' && <Despesas mes={mes} />}
      {aba === 'comissoes' && <Comissoes mes={mes} />}
      {aba === 'caixas' && <Caixas />}
    </>
  );
}

// ---------- visão do mês ----------
function Mes({ mes, irPara }) {
  const { dados: f, erro, carregando } = useDados('financeiro', { mes });
  if (carregando && !f) return <Carregando />;
  if (!f) return <Erro>{erro}</Erro>;
  const varia = f.entradasAnterior > 0 ? Math.round(((f.entradas - f.entradasAnterior) / f.entradasAnterior) * 1000) / 10 : null;
  return (
    <>
      <section className="b-kpis">
        <div className="b-kpi"><span className="b-kpi__rotulo">Entradas</span><strong className="b-kpi__valor">{realCurto(f.entradas)}</strong>
          <span className="b-kpi__detalhe">{varia == null ? 'sem mês anterior' : `${varia >= 0 ? '▲' : '▼'} ${String(Math.abs(varia)).replace('.', ',')}% vs mês anterior`}</span></div>
        <div className="b-kpi"><span className="b-kpi__rotulo">Saídas pagas</span><strong className="b-kpi__valor">{realCurto(f.saidas)}</strong><span className="b-kpi__detalhe">mês anterior {realCurto(f.saidasAnterior)}</span></div>
        {f.taxasConfiguradas ? (
          <div className={`b-kpi b-kpi--destaque${f.liquido < 0 ? ' b-kpi--alerta' : ''}`}><span className="b-kpi__rotulo">Resultado líquido</span><strong className="b-kpi__valor">{realCurto(f.liquido)}</strong>
            <span className="b-kpi__detalhe">entradas − taxas da maquininha ({realCurto(f.taxas)}) − saídas</span></div>
        ) : (
          <div className={`b-kpi b-kpi--destaque${f.resultado < 0 ? ' b-kpi--alerta' : ''}`}><span className="b-kpi__rotulo">Resultado</span><strong className="b-kpi__valor">{realCurto(f.resultado)}</strong><span className="b-kpi__detalhe">entradas − saídas pagas</span></div>
        )}
        <div className={`b-kpi${f.aPagar + f.comissoesAPagar > 0 ? ' b-kpi--aviso' : ''}`}><span className="b-kpi__rotulo">Ainda a pagar</span><strong className="b-kpi__valor">{realCurto(f.aPagar + f.comissoesAPagar)}</strong>
          <span className="b-kpi__detalhe">{plural(f.aPagarQtd, 'conta', 'contas')} · comissões {realCurto(f.comissoesAPagar)}</span></div>
      </section>
      <section className="b-cartao b-grafico">
        <header className="b-cartao__topo">
          <div><h2 className="b-cartao__titulo">O mês dia a dia</h2><p className="b-suave">Para cima, o que entrou. Para baixo, o que saiu.</p></div>
          <button type="button" className="link-acao" onClick={() => baixarCSV(`fluxo-${mes}`, [['chave', 'Dia'], [(s) => String(s.entradas).replace('.', ','), 'Entradas'], [(s) => String(s.saidas).replace('.', ','), 'Saídas']], f.serie)}>CSV</button>
        </header>
        <Fluxo serie={f.serie} />
      </section>
      <div className="b-duas">
        <section className="b-cartao b-grafico"><header className="b-cartao__topo"><h2 className="b-cartao__titulo">De onde veio</h2></header>
          <BarrasH itens={f.porGrupo} formato={realCurto} /></section>
        <section className="b-cartao b-grafico"><header className="b-cartao__topo"><h2 className="b-cartao__titulo">Para onde foi</h2></header>
          <BarrasH itens={f.porCategoria} formato={realCurto} vazio="Nenhuma despesa paga neste mês." /></section>
      </div>
      <div className="b-duas">
        <section className="b-cartao b-grafico"><header className="b-cartao__topo"><h2 className="b-cartao__titulo">Formas de pagamento</h2></header>
          <BarrasH itens={f.porForma} formato={realCurto} />
          {f.taxasConfiguradas ? (
            <p className="b-suave fn-taxas">Taxas estimadas da maquininha: <strong>{real(f.taxas)}</strong>{f.taxasPorForma.length > 0 && ` (${f.taxasPorForma.map((x) => `${x.nome} ${real(x.valor)}`).join(' · ')})`}.</p>
          ) : (
            <p className="b-suave fn-taxas">Para ver o resultado líquido, cadastre as taxas em Ajustes → Taxas da maquininha.</p>
          )}
        </section>
        <section className="b-cartao">
          <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Contas dos próximos dias</h2><button type="button" className="link-acao" onClick={() => irPara('despesas')}>Ver despesas</button></header>
          {f.vencendo.length === 0 ? <p className="b-suave">Nada vencendo nos próximos 7 dias.</p> : (
            <ul className="b-lista-simples">{f.vencendo.map((x) => (
              <li key={x.id}><strong>{x.descricao} · {real(x.valor)}</strong>
                {x.data < hojeIso() ? <span className="b-alerta-txt">venceu {dataBR(x.data)}</span> : <span>vence {dataBR(x.data)}</span>}</li>
            ))}</ul>
          )}
        </section>
      </div>
    </>
  );
}

// gráfico espelhado: entradas para cima (oliva), saídas para baixo (terracota)
function Fluxo({ serie }) {
  const caixa = useRef(null);
  const [L, setL] = useState(700);
  const [dica, setDica] = useState(null);
  useEffect(() => {
    const el = caixa.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setL(el.clientWidth || 700));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const max = Math.max(1, ...serie.map((s) => Math.max(s.entradas, s.saidas)));
  const A = 240, meio = 120, util = 100, esq = 8;
  const larg = (L - esq * 2) / serie.length;
  const barra = Math.max(3, Math.min(16, larg - 3));
  const hoje = hojeIso();
  return (
    <div className="fluxo" ref={caixa} onMouseLeave={() => setDica(null)}>
      <svg viewBox={`0 0 ${L} ${A}`} width={L} height={A} role="img" aria-label="Entradas e saídas por dia">
        <line x1={esq} x2={L - esq} y1={meio} y2={meio} className="fluxo__eixo" />
        {serie.map((s, i) => {
          const x = esq + i * larg + (larg - barra) / 2;
          const he = (s.entradas / max) * util, hs = (s.saidas / max) * util;
          return (
            <g key={s.chave} onMouseMove={() => setDica({ s, x: x + barra / 2 })} onTouchStart={() => setDica({ s, x: x + barra / 2 })}>
              <rect x={esq + i * larg} y={0} width={larg} height={A} fill="transparent" />
              {he > 0 && <rect x={x} y={meio - he - 1} width={barra} height={he} rx={Math.min(3, barra / 2)} className="fluxo__entra" />}
              {hs > 0 && <rect x={x} y={meio + 1} width={barra} height={hs} rx={Math.min(3, barra / 2)} className="fluxo__sai" />}
              {(i === 0 || (i + 1) % 5 === 0) && <text x={x + barra / 2} y={A - 2} textAnchor="middle" className="g-eixo">{Number(s.chave.slice(8))}</text>}
              {s.chave === hoje && <circle cx={x + barra / 2} cy={meio} r={3.5} className="fluxo__hoje" />}
            </g>
          );
        })}
      </svg>
      {dica && (
        <div className="g-dica fluxo__dica" style={{ left: Math.min(Math.max(dica.x, 70), L - 70) }}>
          <strong>{dataCurta(dica.s.chave)}</strong>
          <span>entrou {real(dica.s.entradas)}</span>
          <span>saiu {real(dica.s.saidas)}</span>
        </div>
      )}
      <p className="fluxo__legenda"><i className="fluxo__entra" /> entradas <i className="fluxo__sai" /> saídas</p>
    </div>
  );
}

// ---------- despesas ----------
function Despesas({ mes }) {
  const { chamar } = useBancada();
  const { dados, erro, carregando, setDados } = useDados('despesas', { mes });
  const [editar, setEditar] = useState(null);
  const [erroA, setErroA] = useState('');
  if (carregando && !dados) return <Carregando />;
  if (!dados) return <Erro>{erro}</Erro>;
  const aPagar = dados.lista.filter((x) => x.status === 'a_pagar');
  const pagas = dados.lista.filter((x) => x.status === 'pago');
  const acao = async (nome, d) => { setErroA(''); try { setDados(await chamar(nome, { ...d, mes })); } catch (e) { setErroA(e.message); } };
  const Linha = ({ x }) => (
    <li className={`desp desp--${x.status}`}>
      <span className="desp__dia"><strong>{Number(x.data.slice(8))}</strong><small>{x.data.slice(0, 7) !== mes ? dataCurta(x.data) : ''}</small></span>
      <button type="button" className="desp__nome" onClick={() => setEditar(x)}>
        <strong>{x.descricao}</strong>
        <span className="b-suave">{x.categoria}{x.fornecedor ? ` · ${x.fornecedor}` : ''}{x.forma ? ` · ${x.forma}` : ''}{x.automatica ? ' · fixa (mensal)' : x.recorrente ? ' · repete todo mês' : ''}</span>
      </button>
      <strong className="desp__valor">{real(x.valor)}</strong>
      {x.status === 'a_pagar' ? (
        <BotaoAcao className="botao botao--linha botao--p" acao={() => acao('pagarDespesa', { id: x.id })}>{x.data < hojeIso() ? 'Paguei (atrasada)' : 'Paguei'}</BotaoAcao>
      ) : <Tag tom="ok">paga {x.pagoEm ? dataCurta(x.pagoEm) : ''}</Tag>}
    </li>
  );
  return (
    <>
      <div className="b-barra-acoes">
        <p className="b-suave">{mesTexto(mes)}: {real(dados.total)} em contas · {real(dados.pago)} pagas</p>
        <button type="button" className="botao botao--linha botao--p" disabled={!dados.lista.length} onClick={() => baixarCSV(`despesas-${mes}`, [
          [(x) => dataBR(x.data), 'Data'], ['descricao', 'Descrição'], ['categoria', 'Categoria'], [(x) => String(x.valor).replace('.', ','), 'Valor'], ['forma', 'Forma'],
          [(x) => (x.status === 'pago' ? 'paga' : 'a pagar'), 'Situação'], [(x) => dataBR(x.pagoEm), 'Paga em'], ['fornecedor', 'Fornecedor']], dados.lista)}>Exportar CSV</button>
        <button type="button" className="botao botao--cheio botao--p" onClick={() => setEditar({ data: hojeIso(), categoria: 'Outros', status: 'pago', forma: 'Pix' })}>Nova despesa</button>
      </div>
      <Erro>{erroA}</Erro>
      {dados.atrasadas.length > 0 && (
        <section className="b-cartao desp-atrasadas">
          <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Atrasadas de meses anteriores</h2></header>
          <ul className="desp-lista">{dados.atrasadas.map((x) => <Linha key={x.id} x={x} />)}</ul>
        </section>
      )}
      {dados.lista.length === 0 && <Vazio titulo="Nenhuma despesa neste mês" forma="presenca">Lance aluguel, contas, fornecedores e salários. Marque “repete todo mês” nas contas fixas.</Vazio>}
      {aPagar.length > 0 && <><h2 className="b-subtitulo">A pagar</h2><ul className="desp-lista">{aPagar.map((x) => <Linha key={x.id} x={x} />)}</ul></>}
      {pagas.length > 0 && <><h2 className="b-subtitulo">Pagas</h2><ul className="desp-lista">{pagas.map((x) => <Linha key={x.id} x={x} />)}</ul></>}
      {editar && <EditarDespesa x={editar} categorias={dados.categorias} aoFechar={() => setEditar(null)} aoSalvar={(d) => { setDados(d); setEditar(null); }} mes={mes} />}
    </>
  );
}

function EditarDespesa({ x, categorias, aoFechar, aoSalvar, mes }) {
  const { chamar } = useBancada();
  const [f, setF] = useState({ id: x.id, data: x.data, descricao: x.descricao || '', categoria: x.categoria, valor: x.valor ? String(x.valor).replace('.', ',') : '',
    forma: x.forma || 'Pix', status: x.status || 'pago', recorrente: !!x.recorrente, fornecedor: x.fornecedor || '', obs: x.obs || '' });
  const [erro, setErro] = useState('');
  const campo = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });
  return (
    <Modal titulo={x.id ? x.descricao : 'Nova despesa'} rotulo={x.ref === 'comissao' ? 'Pagamento de comissões' : 'Despesa'} aoFechar={aoFechar}>
      <div className="b-form">
        <label className="b-campo"><span className="rotulo">Descrição</span><input {...campo('descricao')} placeholder="Ex.: Conta de luz" /></label>
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">Valor (R$)</span><input inputMode="decimal" {...campo('valor')} /></label>
          <label className="b-campo"><span className="rotulo">{f.status === 'pago' ? 'Data' : 'Vencimento'}</span><input type="date" {...campo('data')} /></label>
        </div>
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">Categoria</span><select {...campo('categoria')}>{categorias.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="b-campo"><span className="rotulo">Forma</span><select {...campo('forma')}>{METODOS.concat(['Boleto', 'Débito automático']).map((m) => <option key={m}>{m}</option>)}</select></label>
        </div>
        <fieldset className="b-opcoes b-opcoes--linha">
          <legend className="rotulo">Situação</legend>
          <label className={f.status === 'pago' ? 'ativo' : ''}><input type="radio" checked={f.status === 'pago'} onChange={() => setF({ ...f, status: 'pago' })} /><span><strong>Já paga</strong></span></label>
          <label className={f.status === 'a_pagar' ? 'ativo' : ''}><input type="radio" checked={f.status === 'a_pagar'} onChange={() => setF({ ...f, status: 'a_pagar' })} /><span><strong>A pagar</strong></span></label>
        </fieldset>
        <label className="b-campo"><span className="rotulo">Fornecedor</span><input {...campo('fornecedor')} placeholder="Opcional" /></label>
        <label className="b-campo"><span className="rotulo">Observação</span><input {...campo('obs')} placeholder="Opcional" /></label>
        {!x.automatica && <label className="b-check"><input type="checkbox" checked={f.recorrente} onChange={(e) => setF({ ...f, recorrente: e.target.checked })} /> Repete todo mês (aluguel, internet, sistema…)</label>}
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--cheio" acao={async () => {
          setErro('');
          try { aoSalvar(await chamar('salvarDespesa', { despesa: { ...f, valor: numBR(f.valor) } })); } catch (e) { setErro(e.message); }
        }}>Salvar</BotaoAcao>
        {x.id && <BotaoAcao className="link-sair" confirmar="Excluir esta despesa?" acao={async () => {
          try { aoSalvar(await chamar('excluirDespesa', { id: x.id, mes })); } catch (e) { setErro(e.message); }
        }}>Excluir despesa</BotaoAcao>}
      </div>
    </Modal>
  );
}

// ---------- comissões ----------
const TIPOS_COMISSAO = [['todos', 'Tudo'], ['atendimento', 'Atendimentos'], ['aula', 'Aulas'], ['venda', 'Produtos e vendas']];
const SITUACOES_COMISSAO = [['todas', 'Todas'], ['a_pagar', 'A pagar'], ['pago', 'Pagas']];
const tipoDaComissao = (c) => (c.origem === 'atendimento' ? 'atendimento' : c.origem === 'aula' || c.origem === 'aula_fixa' ? 'aula' : 'venda');
const iniciais = (nome) => String(nome || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
const semAcentoJs = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function Segmentos({ rotulo, valor, aoMudar, itens }) {
  return (
    <div className="k-seg">
      <span className="k-seg__rotulo">{rotulo}</span>
      <div className="k-seg__lista" role="group" aria-label={rotulo}>
        {itens.map(([id, texto, n]) => (
          <button key={id} type="button" className={valor === id ? 'k-seg--ativo' : ''} aria-pressed={valor === id} onClick={() => aoMudar(id)}>
            {texto}{n != null && <small>{n}</small>}
          </button>
        ))}
      </div>
    </div>
  );
}

function Comissoes({ mes }) {
  const { chamar } = useBancada();
  const { dados, erro, carregando, setDados } = useDados('comissoes', { mes });
  const [sel, setSel] = useState({});
  const [forma, setForma] = useState('Pix');
  const [prof, setProf] = useState('');
  const [situacao, setSituacao] = useState('todas');
  const [tipo, setTipo] = useState('todos');
  const [busca, setBusca] = useState('');
  const [erroA, setErroA] = useState('');
  const [relatorio, setRelatorio] = useState(null);
  const todas = dados?.lista || [];
  // cada filtro conta o que sobra com os outros dois já aplicados
  const passa = (c, f) => (f.prof === undefined || !f.prof || c.profissional === f.prof)
    && (f.situacao === undefined || f.situacao === 'todas' || c.status === f.situacao)
    && (f.tipo === undefined || f.tipo === 'todos' || tipoDaComissao(c) === f.tipo)
    && (!f.busca || semAcentoJs(`${c.profissional} ${c.item}`).includes(f.busca));
  const q = semAcentoJs(busca.trim());
  const lista = useMemo(() => todas.filter((c) => passa(c, { prof, situacao, tipo, busca: q })), [todas, prof, situacao, tipo, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const contar = (f) => todas.filter((c) => passa(c, { prof, situacao, tipo, busca: q, ...f })).length;
  if (carregando && !dados) return <Carregando />;
  if (!dados) return <Erro>{erro}</Erro>;
  const inicioMes = `${mes}-01`;
  const aPagarLista = lista.filter((c) => c.status === 'a_pagar');
  const escolhidas = lista.filter((c) => sel[c.id] && c.status === 'a_pagar');
  const todasMarcadas = escolhidas.length > 0 && escolhidas.length === aPagarLista.length;
  const marcarTodas = (sim) => setSel(Object.fromEntries(aPagarLista.map((c) => [c.id, sim])));
  const soma = (xs) => xs.reduce((s, c) => s + c.valor, 0);
  const totalSel = soma(escolhidas);
  const totalLista = soma(lista);
  const totalAPagar = soma(aPagarLista);
  const totalPago = totalLista - totalAPagar;
  const semRegra = dados.profissionais.filter((p) => !p.comissao);
  const pessoasRel = [...new Set([...dados.profissionais.map((p) => p.nome), ...dados.porProfissional.map((p) => p.nome)])].sort((a, b) => a.localeCompare(b));
  const filtrando = !!prof || situacao !== 'todas' || tipo !== 'todos' || !!q;
  const limpar = () => { setProf(''); setSituacao('todas'); setTipo('todos'); setBusca(''); };
  const mesNome = mesTexto(mes).split(' ')[0].toLowerCase();
  const exportar = () => baixarCSV(`comissoes-${mes}${prof ? '-' + semAcentoJs(prof).replace(/\s+/g, '-') : ''}`, [
    ['data', 'Data'], ['profissional', 'Profissional'], ['item', 'Atendimento ou venda'], [(c) => c.base, 'Base'],
    [(c) => (c.origem === 'aula_fixa' ? 'por aula' : c.pct), '%'], [(c) => c.valor, 'Comissão'],
    [(c) => (c.status === 'pago' ? 'paga' : 'a pagar'), 'Situação'], [(c) => c.pagoEm || '', 'Paga em'],
  ], lista);
  return (
    <div className="k-comissoes">
      {semRegra.length > 0 && <p className="aviso">Sem porcentagem de comissão: {semRegra.map((p) => p.nome).join(', ')}. Defina em Catálogo → Profissionais.</p>}

      {dados.porProfissional.length > 0 && (
        <section className="k-equipe" aria-label="Comissões por pessoa">
          {dados.porProfissional.map((p) => {
            const total = p.aPagar + p.pago;
            const pct = total > 0 ? Math.round((p.pago / total) * 100) : 0;
            return (
              <article key={p.nome} className={`k-card${prof === p.nome ? ' k-card--ativo' : ''}`}>
                <button type="button" className="k-card__corpo" aria-pressed={prof === p.nome} onClick={() => setProf(prof === p.nome ? '' : p.nome)}>
                  <span className="k-card__ini" aria-hidden="true">{iniciais(p.nome)}</span>
                  <span className="k-card__nome">{p.nome}</span>
                  <span className="k-card__rotulo">A pagar</span>
                  <strong className="k-card__valor">{real(p.aPagar)}</strong>
                  <span className="k-card__barra" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
                  <span className="k-card__detalhe">{real(p.pago)} já paga · {plural(p.qtd, 'lançamento', 'lançamentos')}</span>
                </button>
                <button type="button" className="k-card__rel" onClick={() => setRelatorio(p.nome)}>Relatório de {mesNome}</button>
              </article>
            );
          })}
        </section>
      )}

      <section className="k-filtros" aria-label="Filtros">
        <div className="k-filtros__linha">
          <label className="k-busca">
            <span className="b-sr">Buscar</span>
            <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por pessoa, serviço ou produto" />
          </label>
          <label className="k-filtros__pessoa">
            <span className="b-sr">Pessoa</span>
            <select value={prof} onChange={(e) => setProf(e.target.value)} aria-label="Pessoa">
              <option value="">Todas as pessoas</option>
              {pessoasRel.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
        <div className="k-filtros__linha">
          <Segmentos rotulo="Situação" valor={situacao} aoMudar={setSituacao} itens={SITUACOES_COMISSAO.map(([id, t]) => [id, t, contar({ situacao: id })])} />
          <Segmentos rotulo="Tipo" valor={tipo} aoMudar={setTipo} itens={TIPOS_COMISSAO.map(([id, t]) => [id, t, contar({ tipo: id })])} />
        </div>
        <div className="k-filtros__rodape">
          <span className="b-suave">{filtrando ? `${plural(lista.length, 'lançamento', 'lançamentos')} com estes filtros` : `${plural(lista.length, 'lançamento', 'lançamentos')} em ${mesTexto(mes)}`}</span>
          <span className="k-filtros__acoes">
            {filtrando && <button type="button" className="botao botao--linha botao--p" onClick={limpar}>Limpar filtros</button>}
            <button type="button" className="botao botao--linha botao--p" disabled={!lista.length} onClick={exportar}>Baixar planilha</button>
            <button type="button" className="botao botao--cheio botao--p" disabled={!pessoasRel.length} onClick={() => setRelatorio(prof || pessoasRel[0])}>
              Relatório {prof ? `de ${prof.split(' ')[0]}` : 'para imprimir'}
            </button>
          </span>
        </div>
      </section>

      {relatorio && <RelatorioProfissional mes={mes} profissional={relatorio} aoFechar={() => setRelatorio(null)} />}

      {todas.length === 0 && <Vazio titulo="Nenhuma comissão neste mês" forma="presenca">Cada atendimento marcado como atendido e cada aula dada geram a comissão (valores em Catálogo).</Vazio>}
      {todas.length > 0 && (
        <section className="b-kpis k-totais">
          <Kpi rotulo={filtrando ? 'Comissão (filtro)' : `Comissão de ${mesNome}`} valor={real(totalLista)} detalhe={plural(lista.length, 'lançamento', 'lançamentos')} />
          <Kpi rotulo="A pagar" valor={real(totalAPagar)} tom={totalAPagar > 0 ? 'aviso' : undefined} detalhe={plural(aPagarLista.length, 'lançamento', 'lançamentos')} />
          <Kpi rotulo="Já paga" valor={real(totalPago)} tom={totalPago > 0 ? 'ok' : undefined} detalhe={plural(lista.length - aPagarLista.length, 'lançamento', 'lançamentos')} />
        </section>
      )}

      {todas.length > 0 && lista.length === 0 && (
        <Vazio titulo="Nada com estes filtros">Tire algum filtro para ver mais lançamentos. <button type="button" className="botao botao--linha botao--p" onClick={limpar}>Limpar filtros</button></Vazio>
      )}

      {lista.length > 0 && (
        <>
          {aPagarLista.length > 0 && (
            <label className="b-check k-todas">
              <input type="checkbox" checked={todasMarcadas} onChange={(e) => marcarTodas(e.target.checked)} /> Marcar {plural(aPagarLista.length, 'comissão a pagar', 'comissões a pagar')} ({real(totalAPagar)})
            </label>
          )}
          <div className="b-tabela-caixa k-tabela">
            <table className="b-tabela">
              <thead><tr>
                <th className="k-col-marcar"><input type="checkbox" aria-label="Marcar todas a pagar" checked={todasMarcadas} disabled={!aPagarLista.length} onChange={(e) => marcarTodas(e.target.checked)} /></th>
                <th>Data</th><th>Pessoa</th><th>Atendimento ou venda</th><th className="num">Base</th><th className="num">%</th><th className="num">Comissão</th><th>Situação</th></tr></thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.id} className={sel[c.id] && c.status === 'a_pagar' ? 'k-linha--marcada' : ''}>
                    <td className="k-marcar">{c.status === 'a_pagar' && (
                      <label><input type="checkbox" checked={!!sel[c.id]} onChange={(e) => setSel({ ...sel, [c.id]: e.target.checked })} aria-label="Pagar esta comissão" /><span aria-hidden="true">Pagar esta</span></label>
                    )}</td>
                    <td data-rotulo="Data" className="k-data">{dataCurta(c.data)}{c.data < inicioMes && <small>mês anterior</small>}</td>
                    <td data-rotulo="Pessoa" className="k-quem">{c.profissional}</td>
                    <td data-rotulo="Item"><span className="k-item">{c.item}<small>{tipoDaComissao(c) === 'atendimento' ? 'Atendimento' : tipoDaComissao(c) === 'aula' ? 'Aula' : 'Venda'}</small></span></td>
                    <td data-rotulo="Base" className="num">{real(c.base)}</td>
                    <td data-rotulo="%" className="num">{c.origem === 'aula_fixa' ? 'por aula' : `${String(c.pct).replace('.', ',')}%`}</td>
                    <td data-rotulo="Comissão" className="num"><strong>{real(c.valor)}</strong></td>
                    <td data-rotulo="Situação"><Tag tom={c.status === 'pago' ? 'ok' : 'aviso'}>{c.status === 'pago' ? `paga ${dataCurta(c.pagoEm)}` : 'a pagar'}</Tag></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr>
                <td className="k-col-marcar" />
                <td colSpan={5} className="k-total__rotulo">Total {filtrando ? 'dos filtros' : `de ${mesNome}`}</td>
                <td className="num"><strong>{real(totalLista)}</strong></td>
                <td />
              </tr></tfoot>
            </table>
          </div>
        </>
      )}

      {escolhidas.length > 0 && (
        <div className="k-pagar">
          <span><strong>{real(totalSel)}</strong> · {plural(escolhidas.length, 'comissão selecionada', 'comissões selecionadas')}</span>
          <select value={forma} onChange={(e) => setForma(e.target.value)} aria-label="Forma de pagamento">{METODOS.map((m) => <option key={m}>{m}</option>)}</select>
          <button type="button" className="botao botao--linha botao--p" onClick={() => setSel({})}>Desmarcar</button>
          <BotaoAcao className="botao botao--cheio botao--p" acao={async () => {
            setErroA('');
            try { setDados(await chamar('pagarComissoes', { ids: escolhidas.map((c) => c.id), forma, mes })); setSel({}); } catch (e) { setErroA(e.message); }
          }}>Registrar pagamento</BotaoAcao>
        </div>
      )}
      <Erro>{erroA}</Erro>
    </div>
  );
}

// ---------- caixas anteriores ----------
function Caixas() {
  const nav = useNavigate();
  const { dados, erro, carregando } = useDados('caixa', {});
  const abrir = (dia) => nav('/bancada/comandas', { state: { vista: 'caixa', dia } });
  if (carregando && !dados) return <Carregando />;
  if (!dados) return <Erro>{erro}</Erro>;
  const lista = dados.anteriores || [];
  return (
    <>
      <p className="b-suave">O caixa de hoje fica em Comandas → Caixa do dia. Aqui estão os últimos fechamentos: toque num dia para abrir, corrigir ou lançar algo que faltou.</p>
      {lista.length === 0 ? <Vazio titulo="Nenhum caixa fechado ainda" /> : (
        <div className="b-tabela-caixa">
          <table className="b-tabela b-tabela--clicavel">
            <thead><tr><th>Dia</th><th className="num">Esperado</th><th className="num">Contado</th><th className="num">Diferença</th><th>Fechado por</th></tr></thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.data} onClick={() => abrir(c.data)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && abrir(c.data)}>
                  <td data-rotulo="Dia">{dataBR(c.data)}</td>
                  <td data-rotulo="Esperado" className="num">{real(c.esperado)}</td>
                  <td data-rotulo="Contado" className="num">{c.contado == null ? '—' : real(c.contado)}</td>
                  <td data-rotulo="Diferença" className="num">{c.diferenca == null ? <Tag tom="aviso">não fechado</Tag> : Math.abs(c.diferenca) < 0.01 ? <Tag tom="ok">bateu</Tag> : <Tag tom="alerta">{real(c.diferenca)}</Tag>}</td>
                  <td data-rotulo="Fechado por">{c.fechadoPor || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ---------- a profissional: meus ganhos ----------
export function MeusGanhos() {
  const [mes, setMes] = useState(mesAtual());
  const [relatorio, setRelatorio] = useState(false);
  const { dados: g, erro, carregando } = useDados('meusGanhos', { mes });
  return (
    <>
      <Cabecalho titulo="Meus ganhos" acoes={<SeletorMes mes={mes} aoMudar={setMes} />}>Sua comissão de cada atendimento e venda. A administração registra quando paga.</Cabecalho>
      <Erro>{erro}</Erro>
      {carregando && !g && <Carregando />}
      {g && (
        <>
          <section className="b-kpis">
            <div className="b-kpi b-kpi--destaque"><span className="b-kpi__rotulo">Ganhos em {mesTexto(mes).split(' ')[0]}</span><strong className="b-kpi__valor">{real(g.total)}</strong></div>
            <div className="b-kpi"><span className="b-kpi__rotulo">A receber</span><strong className="b-kpi__valor">{real(g.aPagar)}</strong></div>
            <div className="b-kpi"><span className="b-kpi__rotulo">Já recebido</span><strong className="b-kpi__valor">{real(g.pago)}</strong></div>
            <div className="b-kpi"><span className="b-kpi__rotulo">Atendimentos</span><strong className="b-kpi__valor">{g.atendidos}</strong><span className="b-kpi__detalhe">{g.agendados} na agenda · {plural(g.faltas, 'falta', 'faltas')}</span></div>
          </section>
          <div className="k-relatorio">
            <button type="button" className="botao botao--linha botao--p" onClick={() => setRelatorio(true)}>Imprimir meu relatório de {mesTexto(mes).split(' ')[0].toLowerCase()}</button>
          </div>
          {relatorio && <RelatorioProfissional mes={mes} aoFechar={() => setRelatorio(false)} />}
          {g.lista.length === 0 ? <Vazio titulo="Nada neste mês ainda" forma="presenca" /> : (
            <ul className="b-lista-simples ganhos">
              {g.lista.map((c) => <li key={c.id}><strong>{real(c.valor)} · {c.item}</strong><span>{dataBR(c.data)} · {c.origem === 'aula_fixa' ? 'valor da aula' : `${String(c.pct).replace('.', ',')}% de ${real(c.base)}`} · {c.status === 'pago' ? 'recebido' : 'a receber'}</span></li>)}
            </ul>
          )}
        </>
      )}
    </>
  );
}
