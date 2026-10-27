import { useMemo, useRef, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import RelatorioProfissional from './RelatorioProfissional.jsx';
import { useBancada } from './sessao.jsx';
import { useDados, Erro, Cabecalho, Modal, BotaoAcao, Vazio, Tag, Kpi, Abas, Aviso, Secao, Ajuda, Esqueleto, SeletorMes, real, realCurto, dataBR, dataCurta, hojeIso, numBR, baixarCSV,
  METODOS, MESES, mesTexto, plural } from './ui.jsx';
import { BarrasH } from './Graficos.jsx';
import { Ic, KpiG, BotaoCsv, CartaoG, VazioG, DiaChip } from './GestaoPecas.jsx';
import './css/gestao.css';

const mesAtual = () => hojeIso().slice(0, 7);
const diaDe = (iso) => String(Number(String(iso).slice(8, 10)));
const mesAbrev = (iso) => MESES[Number(String(iso).slice(5, 7)) - 1] || '';

export default function Financeiro() {
  const local = useLocation();
  const [aba, setAba] = useState(local.state?.aba || 'mes');
  const [mes, setMes] = useState(mesAtual());
  return (
    <>
      <Cabecalho titulo="Financeiro" acoes={<SeletorMes mes={mes} aoMudar={setMes} />}
        ajuda="As vendas entram sozinhas (site, balcão e comandas). Aqui você lança despesas, paga comissões e confere os caixas.">
        Entradas, despesas, comissões e caixas do mês.
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
  if (carregando && !f) return <Esqueleto linhas={6} altura={26} />;
  if (!f) return <Erro>{erro}</Erro>;
  const varia = f.entradasAnterior > 0 ? Math.round(((f.entradas - f.entradasAnterior) / f.entradasAnterior) * 1000) / 10 : null;
  const hoje = hojeIso();
  const totalACair = (f.aCair || []).reduce((t, x) => t + x.valor, 0);
  return (
    <>
      <section className="gs-kpis gs-kpis--hero" aria-label="Resumo do mês">
        <KpiG icone="entra" rotulo="Entradas" valor={realCurto(f.entradas)}
          etiqueta={varia == null ? null : `${varia >= 0 ? '▲' : '▼'} ${String(Math.abs(varia)).replace('.', ',')}%`} etiquetaTom={varia == null ? undefined : varia >= 0 ? 'ok' : 'alerta'}
          detalhe={varia == null ? 'sem mês anterior' : 'vs mês anterior'} />
        <KpiG icone="sai" rotulo="Saídas pagas" valor={realCurto(f.saidas)} detalhe={`mês anterior ${realCurto(f.saidasAnterior)}`} />
        {f.taxasConfiguradas ? (
          <KpiG destaque icone="moeda" tom={f.liquido < 0 ? 'alerta' : undefined} rotulo="Resultado líquido" valor={realCurto(f.liquido)}
            ajuda={`Entradas − taxas da maquininha (${realCurto(f.taxas)}) − saídas pagas.`} detalhe={`depois de ${realCurto(f.taxas)} em taxas e das saídas`} />
        ) : (
          <KpiG destaque icone="moeda" tom={f.resultado < 0 ? 'alerta' : undefined} rotulo="Resultado" valor={realCurto(f.resultado)}
            ajuda="Entradas − saídas pagas." detalhe="entradas menos saídas pagas" />
        )}
        <KpiG icone="relogio" tom={f.aPagar + f.comissoesAPagar > 0 ? 'aviso' : undefined} rotulo="Ainda a pagar" valor={realCurto(f.aPagar + f.comissoesAPagar)}
          detalhe={`${plural(f.aPagarQtd, 'conta', 'contas')} · comissões ${realCurto(f.comissoesAPagar)}`} />
      </section>

      <CartaoG titulo="O mês dia a dia" ajuda="Para cima, o que entrou. Para baixo, o que saiu. Toque ou passe o mouse num dia para ver os valores."
        csv={() => baixarCSV(`fluxo-${mes}`, [['chave', 'Dia'], [(s) => String(s.entradas).replace('.', ','), 'Entradas'], [(s) => String(s.saidas).replace('.', ','), 'Saídas']], f.serie)}>
        <Fluxo serie={f.serie} />
      </CartaoG>

      <div className="gs-duas">
        <CartaoG titulo="De onde veio"><BarrasH itens={f.porGrupo} formato={realCurto} participacao /></CartaoG>
        <CartaoG titulo="Para onde foi"><BarrasH itens={f.porCategoria} formato={realCurto} tom="terracota" participacao vazio="Nenhuma despesa paga neste mês." /></CartaoG>
      </div>

      <div className="gs-duas">
        <CartaoG titulo="Formas de pagamento">
          <BarrasH itens={f.porForma} formato={realCurto} participacao />
          {f.taxas > 0 ? (
            <div className="gs-taxas">
              <div className="gs-taxas__topo">
                <span className="gs-taxas__rotulo"><Ic nome="percentual" tam={18} />Taxas da InfinitePay<Ajuda titulo="Taxas da InfinitePay">Estimativa do mês pela tabela de Ajustes → Taxas da maquininha.</Ajuda></span>
                <strong className="gs-taxas__valor">{real(f.taxas)}</strong>
              </div>
              {f.taxasPorBandeira?.length > 0 && <BarrasH itens={f.taxasPorBandeira.map((x) => ({ nome: x.nome, valor: x.valor }))} formato={real} tom="caramelo" />}
              {f.semTaxa > 0 && (
                <Aviso tom="aviso" acao={<Link to="/bancada/ajustes" className="botao botao--linha botao--p">Abrir Ajustes</Link>}>
                  {plural(f.semTaxa, 'venda parcelada está', 'vendas parceladas estão')} sem taxa cadastrada nas parcelas (usamos a última informada). Complete em Ajustes → Taxas da maquininha.
                </Aviso>
              )}
            </div>
          ) : (
            <div className="gs-taxas gs-taxas--vazia">
              <span className="gs-taxas__rotulo"><Ic nome="percentual" tam={18} />Sem taxas neste mês<Ajuda titulo="Taxas da maquininha">Ou ainda não cadastradas em Ajustes → Taxas da maquininha.</Ajuda></span>
            </div>
          )}
        </CartaoG>
        <div className="gs-coluna">
          {f.aCair?.length > 0 && (
            <CartaoG titulo="A cair na conta" ajuda="Vendas dos últimos dias no Pix, cartão e link, já sem a taxa.">
              <BarrasH itens={f.aCair.map((x) => ({ nome: x.data === hoje ? 'Hoje' : dataBR(x.data), valor: x.valor }))} formato={real} limite={31} />
              <div className="gs-total"><span>Total a cair</span><strong>{real(totalACair)}</strong></div>
            </CartaoG>
          )}
          <CartaoG titulo="Contas dos próximos dias" acoes={<button type="button" className="botao botao--fantasma botao--p" onClick={() => irPara('despesas')}>Ver despesas</button>}>
            {f.vencendo.length === 0 ? <VazioG icone="check" titulo="Nada vencendo" >Nenhuma conta nos próximos 7 dias.</VazioG> : (
              <ul className="gs-contas">{f.vencendo.map((x) => {
                const atrasada = x.data < hoje;
                return (
                  <li key={x.id}>
                    <DiaChip dia={diaDe(x.data)} mes={mesAbrev(x.data)} tom={atrasada ? 'alerta' : undefined} />
                    <span className="gs-contas__nome"><strong>{x.descricao}</strong>
                      <span>{atrasada ? <Tag tom="alerta">venceu {dataBR(x.data)}</Tag> : <>vence {dataBR(x.data)}</>}</span></span>
                    <strong className="gs-contas__valor">{real(x.valor)}</strong>
                  </li>
                );
              })}</ul>
            )}
          </CartaoG>
        </div>
      </div>
    </>
  );
}

const compactoR = (v) => (v >= 1000 ? (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil' : Math.round(v).toLocaleString('pt-BR'));

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
  // tocar fora fecha a dica
  useEffect(() => {
    if (!dica) return undefined;
    const fora = (e) => { if (caixa.current && !caixa.current.contains(e.target)) setDica(null); };
    document.addEventListener('touchstart', fora, { passive: true });
    document.addEventListener('mousedown', fora);
    return () => { document.removeEventListener('touchstart', fora); document.removeEventListener('mousedown', fora); };
  }, [dica]);
  const max = Math.max(1, ...serie.map((s) => Math.max(s.entradas, s.saidas)));
  const A = 260, meio = 122, util = 100, esq = 44;
  const larg = (L - esq - 6) / serie.length;
  const barra = Math.max(3, Math.min(16, larg - 3));
  const hoje = hojeIso();
  const iHoje = serie.findIndex((s) => s.chave === hoje);
  return (
    <div className="fluxo" ref={caixa} onMouseLeave={() => setDica(null)}>
      <svg viewBox={`0 0 ${L} ${A}`} width={L} height={A} role="img" aria-label="Entradas e saídas por dia">
        <line x1={esq} x2={L - 6} y1={meio - util} y2={meio - util} className="g-grade" />
        <line x1={esq} x2={L - 6} y1={meio + util} y2={meio + util} className="g-grade" />
        <text x={esq - 8} y={meio - util + 4} textAnchor="end" className="g-eixo">{compactoR(max)}</text>
        <text x={esq - 8} y={meio + util + 4} textAnchor="end" className="g-eixo">{compactoR(max)}</text>
        <text x={esq - 8} y={meio + 4} textAnchor="end" className="g-eixo">0</text>
        <line x1={esq} x2={L - 6} y1={meio} y2={meio} className="fluxo__eixo" />
        {serie.map((s, i) => {
          const x = esq + i * larg + (larg - barra) / 2;
          const he = (s.entradas / max) * util, hs = (s.saidas / max) * util;
          const aqui = () => setDica({ s, x: x + barra / 2, i });
          return (
            <g key={s.chave} onMouseMove={aqui} onTouchStart={aqui}>
              {dica?.i === i && <rect x={esq + i * larg} y={6} width={larg} height={A - 30} rx="4" className="g-faixa" />}
              <rect x={esq + i * larg} y={0} width={larg} height={A} fill="transparent" />
              {he > 0 && <rect x={x} y={meio - he - 1} width={barra} height={he} rx={Math.min(4, barra / 2)} className="fluxo__entra" />}
              {hs > 0 && <rect x={x} y={meio + 1} width={barra} height={hs} rx={Math.min(4, barra / 2)} className="fluxo__sai" />}
              {(((i === 0 || (i + 1) % 5 === 0) && (iHoje < 0 || Math.abs(i - iHoje) > 1)) || i === iHoje) && <text x={x + barra / 2} y={A - 4} textAnchor="middle" className={`g-eixo${s.chave === hoje ? ' g-eixo--hoje' : ''}`}>{Number(s.chave.slice(8))}</text>}
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
      <p className="g-legenda"><span><i className="g-legenda__cor" />Entradas</span><span><i className="g-legenda__cor g-legenda__cor--sai" />Saídas</span><span><i className="g-legenda__ponto" />Hoje</span></p>
    </div>
  );
}

// ---------- despesas ----------
function Despesas({ mes }) {
  const { chamar } = useBancada();
  const { dados, erro, carregando, setDados } = useDados('despesas', { mes });
  const [editar, setEditar] = useState(null);
  const [erroA, setErroA] = useState('');
  if (carregando && !dados) return <Esqueleto linhas={6} altura={26} />;
  if (!dados) return <Erro>{erro}</Erro>;
  const aPagar = dados.lista.filter((x) => x.status === 'a_pagar');
  const pagas = dados.lista.filter((x) => x.status === 'pago');
  const somaAPagar = aPagar.reduce((t, x) => t + x.valor, 0);
  const acao = async (nome, d) => { setErroA(''); try { setDados(await chamar(nome, { ...d, mes })); } catch (e) { setErroA(e.message); } };
  const Linha = ({ x }) => (
    <li className={`gs-desp gs-desp--${x.status}${x.status === 'a_pagar' && x.data < hojeIso() ? ' gs-desp--atrasada' : ''}`}>
      <DiaChip dia={diaDe(x.data)} mes={mesAbrev(x.data)} tom={x.status === 'a_pagar' ? 'terracota' : undefined} />
      <button type="button" className="gs-desp__nome" onClick={() => setEditar(x)} aria-label={`Editar ${x.descricao}`}>
        <strong>{x.descricao}</strong>
        <span className="b-meta">
          <span>{x.categoria}</span>
          {x.fornecedor && <span>{x.fornecedor}</span>}
          {x.forma && <span>{x.forma}</span>}
          {(x.automatica || x.recorrente) && <span>{x.automatica ? 'fixa (mensal)' : 'repete todo mês'}</span>}
        </span>
      </button>
      <strong className="gs-desp__valor">{real(x.valor)}</strong>
      <span className="gs-desp__acao">
        {x.status === 'a_pagar' ? (
          <BotaoAcao className="botao botao--linha botao--p" acao={() => acao('pagarDespesa', { id: x.id })}>{x.data < hojeIso() ? 'Paguei (atrasada)' : 'Paguei'}</BotaoAcao>
        ) : <Tag tom="ok">paga {x.pagoEm ? dataCurta(x.pagoEm) : ''}</Tag>}
      </span>
    </li>
  );
  return (
    <>
      <div className="gs-acoes">
        <BotaoCsv rotulo="Exportar CSV" desabilitado={!dados.lista.length} aoClicar={() => baixarCSV(`despesas-${mes}`, [
          [(x) => dataBR(x.data), 'Data'], ['descricao', 'Descrição'], ['categoria', 'Categoria'], [(x) => String(x.valor).replace('.', ','), 'Valor'], ['forma', 'Forma'],
          [(x) => (x.status === 'pago' ? 'paga' : 'a pagar'), 'Situação'], [(x) => dataBR(x.pagoEm), 'Paga em'], ['fornecedor', 'Fornecedor']], dados.lista)} />
        <button type="button" className="botao botao--cheio botao--p" onClick={() => setEditar({ data: hojeIso(), categoria: 'Outros', status: 'pago', forma: 'Pix' })}>Nova despesa</button>
      </div>
      <section className="gs-kpis gs-kpis--3" aria-label={`Despesas de ${mesTexto(mes)}`}>
        <KpiG compacto icone="recibo" rotulo="Em contas" valor={real(dados.total)} detalhe={mesTexto(mes)} />
        <KpiG compacto icone="check" tom={dados.pago > 0 ? 'ok' : undefined} rotulo="Já pagas" valor={real(dados.pago)} detalhe={plural(pagas.length, 'conta', 'contas')} />
        <KpiG compacto icone="relogio" tom={somaAPagar > 0 ? 'aviso' : undefined} rotulo="A pagar" valor={real(somaAPagar)} detalhe={plural(aPagar.length, 'conta', 'contas')} />
      </section>
      <Erro>{erroA}</Erro>
      {dados.atrasadas.length > 0 && (
        <Secao titulo="Atrasadas de meses anteriores" acoes={<Tag tom="alerta">{plural(dados.atrasadas.length, 'conta', 'contas')}</Tag>}>
          <ul className="gs-lista gs-lista--alerta">{dados.atrasadas.map((x) => <Linha key={x.id} x={x} />)}</ul>
        </Secao>
      )}
      {dados.lista.length === 0 && (
        <Vazio titulo="Nenhuma despesa neste mês" forma="presenca" acao={<button type="button" className="botao botao--cheio botao--p" onClick={() => setEditar({ data: hojeIso(), categoria: 'Outros', status: 'pago', forma: 'Pix' })}>Lançar a primeira despesa</button>}>
          Aluguel, contas, fornecedores e salários. Marque “repete todo mês” nas contas fixas.
        </Vazio>
      )}
      {aPagar.length > 0 && (
        <Secao titulo="A pagar" acoes={<span className="gs-secao-total"><Tag tom="aviso">{plural(aPagar.length, 'conta', 'contas')}</Tag><strong>{real(somaAPagar)}</strong></span>}>
          <ul className="gs-lista">{aPagar.map((x) => <Linha key={x.id} x={x} />)}</ul>
        </Secao>
      )}
      {pagas.length > 0 && (
        <Secao titulo="Pagas" acoes={<span className="gs-secao-total"><Tag tom="ok">{plural(pagas.length, 'conta', 'contas')}</Tag><strong>{real(dados.pago)}</strong></span>}>
          <ul className="gs-lista">{pagas.map((x) => <Linha key={x.id} x={x} />)}</ul>
        </Secao>
      )}
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
  if (carregando && !dados) return <Esqueleto linhas={6} altura={26} />;
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
      {semRegra.length > 0 && <Aviso tom="aviso" titulo="Sem porcentagem de comissão" acao={<Link to="/bancada/grade" className="botao botao--linha botao--p">Definir</Link>}>{semRegra.map((p) => p.nome).join(', ')}. Defina em Catálogo → Profissionais.</Aviso>}

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
          <span className="b-suave k-contagem">{filtrando ? `${plural(lista.length, 'lançamento', 'lançamentos')} com estes filtros` : `${plural(lista.length, 'lançamento', 'lançamentos')} em ${mesTexto(mes)}`}
            {dados.liquida && <Ajuda titulo="Base da comissão">A base de cada comissão é o valor depois da taxa da maquininha (Pix e dinheiro não têm taxa).</Ajuda>}</span>
          <span className="k-filtros__acoes">
            {filtrando && <button type="button" className="botao botao--linha botao--p" onClick={limpar}>Limpar filtros</button>}
            <BotaoCsv rotulo="Baixar planilha" desabilitado={!lista.length} aoClicar={exportar} />
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
  if (carregando && !dados) return <Esqueleto linhas={6} altura={26} />;
  if (!dados) return <Erro>{erro}</Erro>;
  const lista = dados.anteriores || [];
  const bateram = lista.filter((c) => c.diferenca != null && Math.abs(c.diferenca) < 0.01).length;
  const comDiferenca = lista.filter((c) => c.diferenca != null && Math.abs(c.diferenca) >= 0.01).length;
  const abertos = lista.filter((c) => c.diferenca == null).length;
  return (
    <>
      <Aviso tom="info" acao={<button type="button" className="botao botao--linha botao--p" onClick={() => nav('/bancada/comandas', { state: { vista: 'caixa' } })}>Abrir caixa de hoje</button>}>
        O caixa de hoje fica em Comandas → Caixa do dia. Toque num dia para abrir ou corrigir.
      </Aviso>
      {lista.length === 0 ? (
        <Vazio titulo="Nenhum caixa fechado ainda" forma="presenca">Feche o caixa do dia em Comandas → Caixa do dia e ele aparece aqui.</Vazio>
      ) : (
        <>
          <section className="gs-kpis gs-kpis--3" aria-label="Resumo dos caixas">
            <KpiG compacto icone="check" tom={bateram ? 'ok' : undefined} rotulo="Bateram" valor={bateram} detalhe={`de ${plural(lista.length, 'fechamento', 'fechamentos')}`} />
            <KpiG compacto icone="alerta" tom={comDiferenca ? 'alerta' : undefined} rotulo="Com diferença" valor={comDiferenca} detalhe="contado ≠ esperado" />
            <KpiG compacto icone="relogio" tom={abertos ? 'aviso' : undefined} rotulo="Não fechados" valor={abertos} detalhe="ainda sem contagem" />
          </section>
          <div className="b-tabela-caixa gs-tabela">
            <table className="b-tabela b-tabela--clicavel">
              <thead><tr><th>Dia</th><th className="num">Esperado</th><th className="num">Contado</th><th>Situação</th><th>Fechado por</th><th aria-hidden="true" /></tr></thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.data} onClick={() => abrir(c.data)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && abrir(c.data)}>
                    <td data-rotulo="Dia"><span className="gs-dia-linha"><DiaChip dia={diaDe(c.data)} mes={mesAbrev(c.data)} /><span className="gs-dia-linha__texto">{dataBR(c.data)}</span></span></td>
                    <td data-rotulo="Esperado" className="num">{real(c.esperado)}</td>
                    <td data-rotulo="Contado" className="num">{c.contado == null ? '—' : real(c.contado)}</td>
                    <td data-rotulo="Situação">{c.diferenca == null ? <Tag tom="aviso">não fechado</Tag> : Math.abs(c.diferenca) < 0.01 ? <Tag tom="ok">bateu</Tag> : <Tag tom="alerta">{c.diferenca > 0 ? 'sobrou' : 'faltou'} {real(Math.abs(c.diferenca))}</Tag>}</td>
                    <td data-rotulo="Fechado por">{c.fechadoPor || '—'}</td>
                    <td className="gs-seta" aria-hidden="true">›</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

// ---------- a profissional: meus ganhos ----------
export function MeusGanhos() {
  const [mes, setMes] = useState(mesAtual());
  const [relatorio, setRelatorio] = useState(false);
  const { dados: g, erro, carregando } = useDados('meusGanhos', { mes });
  const nomeMes = mesTexto(mes).split(' ')[0].toLowerCase();
  return (
    <>
      <Cabecalho titulo="Meus ganhos" acoes={<SeletorMes mes={mes} aoMudar={setMes} />}
        ajuda={`A administração registra quando paga.${g?.liquida ? ' A base de cada comissão é o valor depois da taxa da maquininha.' : ''}`}>
        Sua comissão de cada atendimento e venda.
      </Cabecalho>
      <Erro>{erro}</Erro>
      {carregando && !g && <Esqueleto linhas={5} altura={26} />}
      {g && (
        <>
          <section className="gs-kpis gs-kpis--hero" aria-label={`Ganhos de ${nomeMes}`}>
            <KpiG destaque icone="moeda" rotulo={`Ganhos em ${nomeMes}`} valor={real(g.total)} detalhe={plural(g.lista.length, 'lançamento', 'lançamentos')} />
            <KpiG icone="relogio" tom={g.aPagar > 0 ? 'aviso' : undefined} rotulo="A receber" valor={real(g.aPagar)} />
            <KpiG icone="check" tom={g.pago > 0 ? 'ok' : undefined} rotulo="Já recebido" valor={real(g.pago)} />
            <KpiG icone="presenca" rotulo="Atendimentos" valor={g.atendidos} detalhe={`${g.agendados} na agenda · ${plural(g.faltas, 'falta', 'faltas')}`} />
          </section>
          <Secao titulo="Lançamentos" acoes={
            <button type="button" className="botao botao--linha botao--p gs-botao-icone" onClick={() => setRelatorio(true)}><Ic nome="imprimir" tam={16} />Imprimir relatório de {nomeMes}</button>
          }>
            {relatorio && <RelatorioProfissional mes={mes} aoFechar={() => setRelatorio(false)} />}
            {g.lista.length === 0 ? <Vazio titulo="Nada neste mês ainda" forma="presenca">Cada atendimento marcado como atendido e cada aula dada aparecem aqui com a sua comissão.</Vazio> : (
              <ul className="gs-lista gs-ganhos">
                {g.lista.map((c) => (
                  <li key={c.id}>
                    <DiaChip dia={diaDe(c.data)} mes={mesAbrev(c.data)} tom={c.status === 'pago' ? undefined : 'terracota'} />
                    <span className="gs-ganhos__corpo">
                      <strong>{c.item}</strong>
                      <span className="b-meta"><span>{c.origem === 'aula_fixa' ? 'valor da aula' : `${String(c.pct).replace('.', ',')}% de ${real(c.base)}`}</span></span>
                    </span>
                    <strong className="gs-ganhos__valor">{real(c.valor)}</strong>
                    <Tag tom={c.status === 'pago' ? 'ok' : 'aviso'}>{c.status === 'pago' ? 'recebido' : 'a receber'}</Tag>
                  </li>
                ))}
              </ul>
            )}
          </Secao>
        </>
      )}
    </>
  );
}
