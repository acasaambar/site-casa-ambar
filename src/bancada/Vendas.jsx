import { useMemo, useState } from 'react';
import './css/vendas.css';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBancada, pode } from './sessao.jsx';
import { useDados, useEsquecerPedidoDaRota, Esqueleto, Erro, Cabecalho, Kpi, Modal, BotaoAcao, Abas, Segmento, Aviso, Tag, Vazio, CampoBandeira, LinhasDePagamento, LINHA_PAGAMENTO, resumoLinhas, METODOS, ehCartao, faltaBandeira,
  real, realCurto, hojeIso, somarDias, dataBR, dataCurta, cpfFmt, baixarCSV, plural, numBR } from './ui.jsx';
import { VenderModal } from './Alunos.jsx';
import { ListaVales } from './Vales.jsx';

// Vendas e vales-presente (o vale é sempre vendido, pela comanda)
export default function Vendas() {
  const local = useLocation();
  const [aba, setAba] = useState(local.state?.aba === 'vales' ? 'vales' : 'vendas');
  const [abrirVale] = useState(!!local.state?.novo);
  useEsquecerPedidoDaRota('novo', 'nova');
  const abas = <Abas atual={aba} aoMudar={setAba} itens={[['vendas', 'Vendas'], ['duplicadas', 'Duplicadas?'], ['vales', 'Vales-presente']]} />;
  if (aba === 'vendas') return <ListaVendas abas={abas} />;
  if (aba === 'duplicadas') return <VendasDuplicadas abas={abas} />;
  return (
    <>
      <Cabecalho titulo="Vendas" ajuda="Vale-presente é sempre vendido: entra como item da comanda e o código nasce quando ela é paga.">Vales-presente vendidos e entregues</Cabecalho>
      {abas}
      <ListaVales abrirNovo={abrirVale} />
    </>
  );
}

// número do pedido da comanda vira o "nº" curto que a comanda mostra (Comanda Q261028083158AAB2F → Comanda nº AAB2F)
const obsLegivel = (t) => String(t || '').replace(/Comanda Q\d{10,}(\w{5})\b/g, 'Comanda nº $1');
// valores dos cartões inteiros, com centavos (só abrevia a partir de 100 mil)
const kpiReal = (v) => (Math.abs(Number(v || 0)) >= 100000 ? realCurto(v) : real(v));

const FILTROS = [['todos', 'Todos'], ['pagos', 'Pagos'], ['pendentes', 'Pendentes'], ['site', 'Site'], ['balcao', 'Balcão'], ['devolver', 'Juros a devolver'], ['estornados', 'Estornados'], ['excluidas', 'Excluídas']];
const passaNoFiltro = (p, filtro) => {
  if (filtro === 'pagos') return p.status === 'pago';
  if (filtro === 'pendentes') return p.status === 'pendente';
  if (filtro === 'estornados') return p.status === 'estornado';
  if (filtro === 'excluidas') return p.status === 'excluido';
  if (filtro === 'devolver') return /^DEVOLVER/.test(p.observacao);
  if (filtro === 'balcao') return p.origem === 'balcão';
  if (filtro === 'site') return p.origem === 'site';
  return true;
};
const TOM_SITUACAO = { pago: 'ok', pendente: 'aviso', estornado: 'apagado', expirado: 'apagado', descartado: 'apagado', excluido: 'apagado' };
const NOME_SITUACAO = { excluido: 'excluída' };

function ListaVendas({ abas }) {
  const local = useLocation();
  const { chamar } = useBancada();
  const [de, setDe] = useState(somarDias(hojeIso(), -30));
  const [ate, setAte] = useState(hojeIso());
  const [filtro, setFiltro] = useState(local.state?.filtro || 'todos');
  const [nova, setNova] = useState(!!local.state?.nova);
  const [aberta, setAberta] = useState(null); // venda aberta na folha (corrigir, excluir, estorno)
  const { dados, erro, carregando, recarregar } = useDados('pagamentos', { de, ate });

  const lista = useMemo(() => (dados || []).filter((p) => passaNoFiltro(p, filtro)), [dados, filtro]);
  const contagem = useMemo(() => Object.fromEntries(FILTROS.map(([id]) => [id, (dados || []).filter((p) => passaNoFiltro(p, id)).length])), [dados]);
  const pagos = (dados || []).filter((p) => p.status === 'pago');
  const total = pagos.reduce((s, p) => s + p.valor, 0);
  const verLiquido = pagos.some((p) => p.liquido != null); // só a administração recebe a taxa e o líquido
  const taxas = pagos.reduce((s, p) => s + (p.taxa || 0), 0);
  const devolver = (dados || []).filter((p) => /^DEVOLVER/.test(p.observacao));

  return (
    <>
      <Cabecalho titulo="Vendas" acoes={
        <>
          <button type="button" className="botao botao--linha botao--p" disabled={!lista.length} onClick={() => baixarCSV(`vendas-${de}-a-${ate}`, [
            [(p) => dataBR(p.pagoEm || p.criadoEm), 'Data'], ['nome', 'Cliente'], [(p) => cpfFmt(p.cpf), 'CPF'], ['descricao', 'Item'],
            [(p) => String(p.valorOriginal).replace('.', ','), 'Preço'], [(p) => String(p.desconto).replace('.', ','), 'Desconto'], [(p) => p.cupom || p.vale, 'Cupom/vale'],
            [(p) => String(p.valor).replace('.', ','), 'Valor cobrado'], ...(verLiquido ? [[(p) => (p.taxa == null ? '' : String(p.taxa).replace('.', ',')), 'Taxa estimada'], [(p) => (p.liquido == null ? '' : String(p.liquido).replace('.', ',')), 'Líquido']] : []), ['metodo', 'Forma'], ['bandeira', 'Bandeira'], ['parcelas', 'Parcelas'], ['origem', 'Origem'], ['status', 'Situação'],
            ['observacao', 'Observação'], ['orderNsu', 'Código']], lista)}>Exportar CSV</button>
          <button type="button" className="botao botao--cheio botao--p" onClick={() => setNova(true)}>Registrar venda</button>
        </>
      }>Tudo o que entrou no caixa, do site e do balcão</Cabecalho>
      {abas}
      <div className="vn-periodo" role="group" aria-label="Período">
        <label className="vn-periodo__campo"><span>De</span><input type="date" value={de} onChange={(e) => e.target.value && setDe(e.target.value)} /></label>
        <label className="vn-periodo__campo"><span>Até</span><input type="date" value={ate} onChange={(e) => e.target.value && setAte(e.target.value)} /></label>
      </div>
      <section className="b-kpis">
        <Kpi rotulo="Recebido no período" valor={kpiReal(total)} detalhe={plural(pagos.filter((p) => p.valor > 0).length, 'venda', 'vendas')} />
        {verLiquido && <Kpi rotulo="Líquido no período" valor={kpiReal(total - taxas)} detalhe={taxas > 0 ? `${real(taxas)} de taxa da maquininha` : 'sem taxas no período'} />}
        <Kpi rotulo="Aguardando pagamento" valor={(dados || []).filter((p) => p.status === 'pendente').length} detalhe="links gerados e não pagos" />
        <Kpi rotulo="Juros a devolver" valor={devolver.length} tom={devolver.length ? 'alerta' : ''} detalhe="parcelou dentro do sem juros" />
      </section>
      <div className="b-barra-fixa vn-barra">
        <div className="b-filtros vn-chips" role="group" aria-label="Filtrar vendas">
          {FILTROS.map(([id, t]) => (
            <button key={id} type="button" className={`b-chip${filtro === id ? ' b-chip--ativo' : ''}`} onClick={() => setFiltro(id)}>{t}{dados && contagem[id] > 0 && <span>{contagem[id]}</span>}</button>
          ))}
        </div>
      </div>
      <Erro>{erro}</Erro>
      {carregando && !dados && <Esqueleto linhas={6} altura={58} />}
      {dados && lista.length === 0 && (
        <Vazio titulo="Nenhuma venda aqui" forma="equilibrio" acao={
          <>
            {filtro !== 'todos' && <button type="button" className="botao botao--linha botao--p" onClick={() => setFiltro('todos')}>Ver todas</button>}
            <button type="button" className="botao botao--cheio botao--p" onClick={() => setNova(true)}>Registrar venda</button>
          </>
        }>Nada neste período e filtro. Mude as datas ou registre uma venda do balcão.</Vazio>
      )}
      {dados && lista.length > 0 && (
        <ul className="vn-lista">
          {lista.map((p) => {
            const devolverEsta = /^DEVOLVER/.test(p.observacao);
            return (
              <li key={p.orderNsu} className={`vn-venda${p.status === 'excluido' ? ' vn-venda--excluida' : ''}`} tabIndex={0} role="button" aria-label={`Abrir venda de ${p.nome}`}
                onClick={(e) => { if (!e.target.closest('button, a')) setAberta(p); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) setAberta(p); }}>
                <div className="vn-venda__corpo">
                  <span className="vn-venda__quem"><strong>{p.nome}</strong><Tag tom={TOM_SITUACAO[p.status] || 'neutro'}>{NOME_SITUACAO[p.status] || p.status}</Tag></span>
                  <span className="vn-venda__item">{p.descricao}</span>
                  {(p.cupom || p.vale || p.observacao) && (
                    <span className="vn-venda__nota">
                      {(p.cupom || p.vale) && <span className="vn-venda__desconto">{p.cupom ? 'cupom ' + p.cupom : 'vale ' + p.vale} · −{real(p.desconto)}</span>}
                      {p.observacao && <span className={devolverEsta ? 'b-alerta-txt' : undefined}>{obsLegivel(p.observacao)}</span>}
                    </span>
                  )}
                </div>
                <div className="vn-venda__valor">
                  <strong className={p.status === 'excluido' ? 'b-riscado' : undefined}>{real(p.valor)}</strong>
                  {p.taxa > 0 && <small title={`Taxa estimada da maquininha: ${real(p.taxa)} (${String(p.taxaPct).replace('.', ',')}%)`}>líquido {real(p.liquido)}</small>}
                </div>
                <div className="vn-venda__rodape">
                  <span className="vn-venda__data" title={dataBR(p.pagoEm || p.criadoEm)}>{dataCurta(p.pagoEm || p.criadoEm)}</span>
                  <span className="vn-venda__forma">
                    {p.metodo && <Tag>{p.metodo}</Tag>}
                    <small>{[p.bandeira, Number(p.parcelas) > 1 ? `${p.parcelas}x` : '', p.origem].filter(Boolean).join(' · ')}</small>
                  </span>
                  <span className="vn-venda__acoes">
                    {devolverEsta && <BotaoAcao className="botao botao--linha botao--p" acao={async () => { await chamar('marcarDevolvido', { orderNsu: p.orderNsu }); recarregar(); }}>Já devolvi</BotaoAcao>}
                    {p.status === 'pago' && <button type="button" className="botao botao--fantasma botao--p" onClick={() => setAberta(p)} aria-label={`Editar venda de ${p.nome}`}>Editar</button>}
                    {p.recibo && <a className="botao botao--fantasma botao--p" href={p.recibo} target="_blank" rel="noreferrer" aria-label={`Recibo da venda de ${p.nome}`}>Recibo</a>}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {nova && <VenderModal aoFechar={() => setNova(false)} aoVender={() => { setNova(false); recarregar(); }} />}
      {aberta && <VendaAberta p={aberta} aoFechar={() => setAberta(null)} aoMudar={() => { setAberta(null); recarregar(); }} />}
    </>
  );
}

const LIGACAO = { agenda: 'Agenda', comanda: 'Comanda', 'balcão': 'Balcão (avulsa)', site: 'Site' };
const PERIODOS = [['30', '30 dias'], ['60', '60 dias'], ['90', '90 dias'], ['120', '120 dias']];
const TIPOS_DUP = [['todas', 'Todas'], ['igual', 'Prováveis'], ['parecida', 'Para conferir']];

// Vendas que podem ter sido lançadas em dobro: mesmo cliente, item e dia (agenda + Vendas + comanda + site).
// A lista só mostra; a pessoa abre a venda e exclui, estorna, reabre a comanda ou marca "não é duplicada".
function VendasDuplicadas({ abas }) {
  const { chamar } = useBancada();
  const [dias, setDias] = useState('60');
  const [tipo, setTipo] = useState('todas');
  const [aberta, setAberta] = useState(null);
  const de = somarDias(hojeIso(), -Number(dias));
  const { dados, erro, carregando, recarregar } = useDados('vendasDuplicadas', { de, ate: hojeIso() });
  const grupos = useMemo(() => (dados?.grupos || []).filter((g) => tipo === 'todas' || g.tipo === tipo), [dados, tipo]);
  const r = dados?.resumo;
  return (
    <>
      <Cabecalho titulo="Vendas" ajuda="Duas vendas pagas do mesmo cliente, item e dia. “Provável” = o valor também é igual; “Para conferir” = só o item e o dia batem. A que costuma sobrar é a venda avulsa do balcão: a da agenda, a da comanda e a paga pelo site ficam. Nada é apagado aqui: abra a venda para excluir ou estornar." acoes={
        <button type="button" className="botao botao--linha botao--p" disabled={!grupos.length} onClick={() => baixarCSV(`vendas-duplicadas-${de}`, [
          [(l) => dataBR(l.g.dia), 'Dia'], [(l) => l.g.nome, 'Cliente'], [(l) => l.g.item, 'Item'], [(l) => (l.g.tipo === 'igual' ? 'Provável' : 'Para conferir'), 'Nível'],
          [(l) => String(l.v.total).replace('.', ','), 'Valor'], [(l) => l.v.metodo, 'Forma'], [(l) => LIGACAO[l.v.ligacao.tipo], 'Veio de'], [(l) => (l.v.sugerida ? 'Sobra' : 'Fica'), 'Sugestão'],
          [(l) => (l.v.pagoEm || '').slice(11, 16), 'Hora'], [(l) => l.v.registradoPor, 'Lançada por'], [(l) => l.v.orderNsu, 'Código']],
        grupos.flatMap((g) => g.vendas.map((v) => ({ g, v }))))}>Exportar CSV</button>
      }>Vendas que podem ter sido lançadas em dobro</Cabecalho>
      {abas}
      <div className="b-barra-fixa dp-barra">
        <Segmento rotulo="Período" atual={dias} aoMudar={setDias} itens={PERIODOS} />
        <Segmento rotulo="Nível" atual={tipo} aoMudar={setTipo} itens={TIPOS_DUP} />
      </div>
      {r && (
        <section className="b-kpis">
          <Kpi rotulo="Prováveis duplicadas" valor={r.provaveis} tom={r.provaveis ? 'alerta' : ''} detalhe={r.provaveis ? 'mesmo item, dia e valor' : 'nenhuma no período'} />
          <Kpi rotulo="Valor em dobro" valor={kpiReal(r.valorEmDobro)} tom={r.valorEmDobro ? 'alerta' : ''} detalhe="soma do que sobra nas prováveis" />
          <Kpi rotulo="Para conferir" valor={r.conferir} detalhe="valores diferentes no mesmo dia" />
        </section>
      )}
      <Erro>{erro}</Erro>
      {carregando && !dados && <Esqueleto linhas={4} altura={120} />}
      {dados && grupos.length === 0 && (
        <Vazio titulo="Nenhuma venda duplicada" forma="equilibrio" acao={tipo !== 'todas' ? <button type="button" className="botao botao--linha botao--p" onClick={() => setTipo('todas')}>Ver todas</button> : null}>
          Nada repetido nos últimos {dias} dias. Daqui para frente o sistema avisa na hora de lançar.
        </Vazio>
      )}
      <div className="dp-grupos">
        {grupos.map((g) => (
          <section key={g.chave} className={`dp-grupo dp-grupo--${g.tipo}`}>
            <header className="dp-grupo__topo">
              <div className="dp-grupo__quem">
                <strong>{g.nome}</strong>
                <span className="b-meta"><span>{g.item}</span><span>{dataBR(g.dia)}</span><span>{plural(g.vendas.length, 'venda', 'vendas')}</span></span>
              </div>
              <div className="dp-grupo__lado">
                <Tag tom={g.tipo === 'igual' ? 'alerta' : 'aviso'}>{g.tipo === 'igual' ? 'provável' : 'para conferir'}</Tag>
                {g.sobra > 0 && <strong className="dp-grupo__dobro">{real(g.sobra)} em dobro</strong>}
              </div>
            </header>
            <ul className="b-itens dp-vendas">
              {g.vendas.map((v) => (
                <li key={v.orderNsu} className={`b-item dp-venda${v.sugerida ? ' dp-venda--sobra' : ''}`}>
                  <div className="b-item__corpo">
                    <span className="b-item__titulo">{real(v.total)} <small>{v.metodo}</small></span>
                    <span className="b-meta">
                      <span>{(v.pagoEm || v.criadoEm || '').slice(11, 16) || '—'} · {v.registradoPor ? v.registradoPor.split('@')[0] : v.origem}</span>
                      <span>{LIGACAO[v.ligacao.tipo]}{v.ligacao.agenda ? ` · ${dataCurta(v.ligacao.agenda.data)} ${v.ligacao.agenda.hora}` : ''}{v.ligacao.comanda ? ` · ${v.ligacao.comanda}` : ''}</span>
                    </span>
                  </div>
                  <div className="b-item__lado">
                    {g.tipo === 'igual' && <Tag tom={v.sugerida ? 'alerta' : 'ok'}>{v.sugerida ? 'sobra' : 'fica'}</Tag>}
                    <button type="button" className="botao botao--linha botao--p" onClick={() => setAberta(v)}>Abrir</button>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="dp-grupo__rodape">
              <BotaoAcao className="botao botao--fantasma botao--p" confirmar="Marcar estas vendas como conferidas (não são duplicadas)? Elas saem da lista." acao={async () => { await chamar('conferirVendas', { orderNsus: g.vendas.map((v) => v.orderNsu) }); recarregar(); }}>Não é duplicada</BotaoAcao>
            </footer>
          </section>
        ))}
      </div>
      {aberta && <VendaAberta p={aberta} aoFechar={() => setAberta(null)} aoMudar={() => { setAberta(null); recarregar(); }} />}
    </>
  );
}

const FORMAS_CORRIGIR = [...METODOS, 'Cortesia'];

// Clicar numa venda abre esta folha: corrigir (forma, bandeira, parcelas, valor), excluir (lançada por engano) ou estorno (dinheiro devolvido)
function VendaAberta({ p, aoFechar, aoMudar }) {
  const { membro } = useBancada();
  const navegar = useNavigate();
  const admin = pode(membro, 'admin');
  const deHoje = String(p.criadoEm).slice(0, 10) === hojeIso(); // lançada hoje (mesmo com data de venda passada)
  const doBalcao = p.origem === 'balcão' && !p.comanda;
  const podeMexer = p.status === 'pago' && doBalcao && (admin || deHoje);
  const comVale = p.metodo === 'Vale-presente';
  const [vista, setVista] = useState(podeMexer && !comVale ? 'corrigir' : podeMexer ? 'excluir' : 'estorno');
  const forma = p.formas?.length > 1 ? p.formas.map((x) => `${x.metodo}${x.bandeira ? ' ' + x.bandeira : ''}${x.parcelas > 1 ? ' ' + x.parcelas + 'x' : ''} ${real(x.valor)}`).join(' + ') : (p.metodo || '—') + (p.bandeira ? ' ' + p.bandeira : '') + (Number(p.parcelas) > 1 ? ' ' + p.parcelas + 'x' : '');
  const opcoes = [!comVale && ['corrigir', 'Corrigir'], ['excluir', 'Excluir'], ['estorno', 'Estorno']].filter(Boolean);
  return (
    <Modal rotulo={`${p.nome} · ${dataBR(p.pagoEm || p.criadoEm)}`} titulo="Venda" aoFechar={aoFechar}>
      <section className="vn-resumo">
        <div className="vn-resumo__topo">
          <div className="vn-resumo__quem">
            <strong>{p.descricao}</strong>
            <span className="b-suave">{p.nome}</span>
          </div>
          <div className="vn-resumo__valor">
            <strong>{real(p.valor)}</strong>
            <Tag tom={TOM_SITUACAO[p.status] || 'neutro'}>{NOME_SITUACAO[p.status] || p.status}</Tag>
          </div>
        </div>
        {p.valeUsado > 0 && <p className="vn-resumo__vale">+ {real(p.valeUsado)} pagos em vale-presente</p>}
        <dl className="vn-dados">
          <div><dt>Forma</dt><dd>{forma}</dd></div>
          <div><dt>Origem</dt><dd>{p.origem}</dd></div>
          {p.liquido != null && p.status === 'pago' && (
            <div><dt>Líquido</dt><dd><strong>{real(p.liquido)}</strong><small>{p.taxa > 0 ? `taxa estimada ${real(p.taxa)} (${String(p.taxaPct).replace('.', ',')}%)` : 'sem taxa'}</small></dd></div>
          )}
          {p.registradoPor && <div><dt>Lançada por</dt><dd>{p.registradoPor.split('@')[0]}{p.pagoEm ? ` · ${p.pagoEm.slice(11, 16)}` : ''}</dd></div>}
          {p.observacao && <div className="vn-dados__largo"><dt>Observação</dt><dd>{obsLegivel(p.observacao)}</dd></div>}
        </dl>
      </section>
      {p.status !== 'pago' ? (
        <Aviso tom="info">Esta venda está como “{SITUACAO[p.status] || p.status}”: não há o que corrigir.</Aviso>
      ) : p.comanda ? (
        <div className="b-form">
          <Aviso tom="info" titulo="Venda de comanda" acao={<button type="button" className="botao botao--cheio botao--p" onClick={() => navegar('/bancada/comandas', { state: { abrir: p.comanda } })}>Abrir a comanda</button>}>
            Para mudar como foi pago, use “Corrigir a forma de pagamento” na comanda.
          </Aviso>
          <details className="vn-detalhes">
            <summary>E para desfazer ou mudar os itens?</summary>
            <p>A administração usa “Reabrir para corrigir”: assim o estoque, as comissões e os outros itens acompanham. A divisão entre Pix, dinheiro e cartão se corrige sem reabrir.</p>
          </details>
        </div>
      ) : !doBalcao ? (
        <Estorno p={p} aoEstornar={aoMudar} />
      ) : (
        <>
          {!podeMexer && <Aviso tom="aviso">A recepção corrige ou exclui só as vendas lançadas hoje. Para esta, peça à administração.</Aviso>}
          {podeMexer && <Segmento rotulo="O que fazer" atual={vista} aoMudar={setVista} itens={opcoes} />}
          {vista === 'corrigir' && podeMexer && <CorrigirVenda p={p} aoSalvar={aoMudar} />}
          {vista === 'excluir' && podeMexer && <ExcluirVenda p={p} aoExcluir={aoMudar} />}
          {vista === 'estorno' && <Estorno p={p} aoEstornar={aoMudar} />}
        </>
      )}
    </Modal>
  );
}

function CorrigirVenda({ p, aoSalvar }) {
  const { chamar } = useBancada();
  const [metodo, setMetodo] = useState(FORMAS_CORRIGIR.includes(p.metodo) ? p.metodo : 'Pix');
  const [bandeira, setBandeira] = useState(p.bandeira || '');
  const [parcelas, setParcelas] = useState(Number(p.parcelas) || 1);
  const [valor, setValor] = useState(String(p.valor).replace('.', ','));
  const [dataVenda, setDataVenda] = useState(String(p.pagoEm || p.criadoEm).slice(0, 10));
  const [obs, setObs] = useState(p.observacao.replace(/^(EXCLUÍDA|ESTORNADO)[^.]*\.\s*/, '').split(' · Corrigida em ')[0]);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  // dividida em mais de uma forma: linhas { metodo, valor, parcelas, bandeira } (null = uma forma só)
  const [formas, setFormas] = useState(() => (p.formas?.length > 1 ? p.formas.map((x) => ({ ...LINHA_PAGAMENTO, metodo: x.metodo, valor: String(x.valor).replace('.', ','), parcelas: x.parcelas || 1, bandeira: x.bandeira || '' })) : null));
  const cortesia = metodo === 'Cortesia';
  const parcela = metodo === 'Cartão de crédito' || metodo === 'Link InfinitePay';
  const valorNum = cortesia ? 0 : numBR(valor);
  const valorRuim = !cortesia && (valor.trim() === '' || isNaN(valorNum) || valorNum < 0);
  const somaFormas = resumoLinhas(formas || [], valorNum);
  const formasRuins = !!formas && (!somaFormas.ok || cortesia);
  return (
    <div className="b-form">
      {formas ? (
        <div className="b-campo">
          <span className="rotulo">Formas de pagamento · soma {real(somaFormas.soma)} de {real(valorNum)}</span>
          <LinhasDePagamento linhas={formas} aoMudar={(l) => setFormas(l)} total={valorNum} formas={FORMAS_CORRIGIR.filter((m) => m !== 'Cortesia')} minimo={2} />
          <button type="button" className="botao botao--fantasma botao--p vn-voltar" onClick={() => { setMetodo(formas[0].metodo); setBandeira(formas[0].bandeira); setFormas(null); }}>Voltar para uma forma só</button>
        </div>
      ) : (
        <>
          <label className="b-campo"><span className="rotulo">Forma de pagamento</span>
            <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>{FORMAS_CORRIGIR.map((m) => <option key={m}>{m}</option>)}</select></label>
          <div className="vd-linha">
            <CampoBandeira metodo={metodo} valor={bandeira} aoMudar={setBandeira} />
            {parcela && (
              <label className="b-campo"><span className="rotulo">Parcelas</span>
                <select value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}x</option>)}</select></label>
            )}
          </div>
          {!cortesia && (
            <button type="button" className="botao botao--fantasma botao--p vn-voltar" title="Ex.: metade no débito, metade no dinheiro" onClick={() => setFormas([{ ...LINHA_PAGAMENTO, metodo, bandeira, parcelas, valor: '' }, { ...LINHA_PAGAMENTO, metodo: metodo === 'Pix' ? 'Dinheiro' : 'Pix' }])}>
              Dividir em mais de uma forma
            </button>
          )}
        </>
      )}
      <div className="vd-linha">
        {!cortesia && (
          <label className="b-campo"><span className="rotulo">Valor recebido (R$)</span>
            <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} aria-invalid={valorRuim} /></label>
        )}
        <label className="b-campo"><span className="rotulo">Data da venda</span>
          <input type="date" value={dataVenda} min={somarDias(hojeIso(), -120)} max={hojeIso()} onChange={(e) => e.target.value && setDataVenda(e.target.value)} /></label>
      </div>
      <label className="b-campo"><span className="rotulo">Observação (opcional)</span>
        <input value={obs} onChange={(e) => setObs(e.target.value)} maxLength={250} /></label>
      <label className="b-campo"><span className="rotulo">Motivo da correção</span>
        <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={200} placeholder="Ex.: foi no débito, não no crédito" /></label>
      <p className="vn-nota">Fica anotado quem corrigiu, quando e como estava antes. Para trocar quem comprou ou o item, exclua e registre de novo.</p>
      <Erro>{erro}</Erro>
      <BotaoAcao className="botao botao--cheio" disabled={valorRuim || formasRuins || motivo.trim().length < 3 || (!formas && ehCartao(metodo) && faltaBandeira(metodo, bandeira))} acao={async () => {
        setErro('');
        try { await chamar('corrigirVenda', { orderNsu: p.orderNsu, metodo: formas ? formas[0].metodo : metodo, bandeira: ehCartao(metodo) || metodo === 'Link InfinitePay' ? bandeira : '', parcelas: parcela ? parcelas : 1, valor: valorNum, formas: formas ? formas.map((l) => ({ ...l, valor: numBR(l.valor) })) : undefined, dataVenda, obs, motivo }); aoSalvar(); } catch (e) { setErro(e.message); }
      }}>Salvar correção</BotaoAcao>
    </div>
  );
}

function ExcluirVenda({ p, aoExcluir }) {
  const { chamar } = useBancada();
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  return (
    <div className="b-form">
      <Aviso tom="aviso" titulo="Só para venda lançada por engano">O dinheiro não entrou. Se entrou e foi devolvido, use Estorno.</Aviso>
      <details className="vn-detalhes">
        <summary>O que acontece ao excluir</summary>
        <ul>
          <li>Sai do caixa e do total de vendas (continua em “Excluídas”, com o motivo).</li>
          <li>O plano ou pacote vendido é desativado.</li>
          <li>Aula avulsa já marcada volta a ficar “A pagar”; serviço pago na agenda volta a “paga no dia”.</li>
        </ul>
      </details>
      <label className="b-campo"><span className="rotulo">Motivo</span>
        <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={200} placeholder="Ex.: lancei a aula antes do pagamento" /></label>
      <Erro>{erro}</Erro>
      <BotaoAcao className="botao botao--cheio botao--perigo-cheio" disabled={motivo.trim().length < 3} confirmar={`Excluir a venda de ${p.nome} (${real(p.valor)})?`} acao={async () => {
        setErro('');
        try { await chamar('excluirVenda', { orderNsu: p.orderNsu, motivo }); aoExcluir(); } catch (e) { setErro(e.message); }
      }}>Excluir venda</BotaoAcao>
    </div>
  );
}

const SITUACAO = { excluido: 'excluída', estornado: 'estornada', pendente: 'aguardando pagamento', expirado: 'expirada', descartado: 'descartada' };

function Estorno({ p, aoEstornar }) {
  const { chamar } = useBancada();
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  return (
    <div className="b-form">
      <Aviso tom="info" titulo="Dinheiro devolvido">
        {p.origem === 'site'
          ? 'Faça o estorno no app da InfinitePay (Vendas → esta venda → Estornar). Depois registre aqui: o plano é desativado.'
          : 'Use quando o dinheiro entrou e foi devolvido. Registre aqui: o plano é desativado.'}
      </Aviso>
      <label className="b-campo"><span className="rotulo">Motivo (obrigatório)</span><input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: mudou de cidade" /></label>
      <p className="vn-nota">Fica registrado quem estornou, quando e o motivo.</p>
      <Erro>{erro}</Erro>
      <BotaoAcao className="botao botao--cheio botao--perigo-cheio" acao={async () => {
        try {
          if (motivo.trim().length < 3) throw new Error('Diga o motivo do estorno.'); await chamar('estornar', { orderNsu: p.orderNsu, motivo }); aoEstornar(); } catch (e) { setErro(e.message); }
      }}>Confirmar estorno</BotaoAcao>
    </div>
  );
}
