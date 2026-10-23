import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBancada, pode } from './sessao.jsx';
import { useDados, useEsquecerPedidoDaRota, Carregando, Erro, Cabecalho, Kpi, Modal, BotaoAcao, Abas, Segmento, CampoBandeira, METODOS, ehCartao, faltaBandeira,
  real, realCurto, hojeIso, somarDias, dataBR, cpfFmt, baixarCSV, plural, numBR } from './ui.jsx';
import { VenderModal, ListaPagamentos } from './Alunos.jsx';
import { ListaVales } from './Vales.jsx';

// Vendas e vales-presente (o vale é sempre vendido, pela comanda)
export default function Vendas() {
  const local = useLocation();
  const [aba, setAba] = useState(local.state?.aba === 'vales' ? 'vales' : 'vendas');
  const [abrirVale] = useState(!!local.state?.novo);
  useEsquecerPedidoDaRota('novo', 'nova');
  const abas = <Abas atual={aba} aoMudar={setAba} itens={[['vendas', 'Vendas'], ['vales', 'Vales-presente']]} />;
  if (aba === 'vendas') return <ListaVendas abas={abas} />;
  return (
    <>
      <Cabecalho titulo="Vendas">Vale-presente é sempre vendido: entra como item da comanda e o código nasce quando ela é paga.</Cabecalho>
      {abas}
      <ListaVales abrirNovo={abrirVale} />
    </>
  );
}

function ListaVendas({ abas }) {
  const local = useLocation();
  const { chamar } = useBancada();
  const [de, setDe] = useState(somarDias(hojeIso(), -30));
  const [ate, setAte] = useState(hojeIso());
  const [filtro, setFiltro] = useState(local.state?.filtro || 'todos');
  const [nova, setNova] = useState(!!local.state?.nova);
  const [aberta, setAberta] = useState(null); // venda aberta na folha (corrigir, excluir, estorno)
  const { dados, erro, carregando, recarregar } = useDados('pagamentos', { de, ate });

  const lista = useMemo(() => (dados || []).filter((p) => {
    if (filtro === 'pagos') return p.status === 'pago';
    if (filtro === 'pendentes') return p.status === 'pendente';
    if (filtro === 'estornados') return p.status === 'estornado';
    if (filtro === 'excluidas') return p.status === 'excluido';
    if (filtro === 'devolver') return /^DEVOLVER/.test(p.observacao);
    if (filtro === 'balcao') return p.origem === 'balcão';
    if (filtro === 'site') return p.origem === 'site';
    return true;
  }), [dados, filtro]);
  const pagos = (dados || []).filter((p) => p.status === 'pago');
  const total = pagos.reduce((s, p) => s + p.valor, 0);
  const devolver = (dados || []).filter((p) => /^DEVOLVER/.test(p.observacao));

  return (
    <>
      <Cabecalho titulo="Vendas" acoes={
        <>
          <button type="button" className="botao botao--linha botao--p" disabled={!lista.length} onClick={() => baixarCSV(`vendas-${de}-a-${ate}`, [
            [(p) => dataBR(p.pagoEm || p.criadoEm), 'Data'], ['nome', 'Cliente'], [(p) => cpfFmt(p.cpf), 'CPF'], ['descricao', 'Item'],
            [(p) => String(p.valorOriginal).replace('.', ','), 'Preço'], [(p) => String(p.desconto).replace('.', ','), 'Desconto'], [(p) => p.cupom || p.vale, 'Cupom/vale'],
            [(p) => String(p.valor).replace('.', ','), 'Valor cobrado'], ['metodo', 'Forma'], ['bandeira', 'Bandeira'], ['parcelas', 'Parcelas'], ['origem', 'Origem'], ['status', 'Situação'],
            ['observacao', 'Observação'], ['orderNsu', 'Código']], lista)}>Exportar CSV</button>
          <button type="button" className="botao botao--cheio botao--p" onClick={() => setNova(true)}>Registrar venda</button>
        </>
      } />
      {abas}
      <div className="b-periodo">
        <label className="b-campo"><span className="rotulo">De</span><input type="date" value={de} onChange={(e) => e.target.value && setDe(e.target.value)} /></label>
        <label className="b-campo"><span className="rotulo">Até</span><input type="date" value={ate} onChange={(e) => e.target.value && setAte(e.target.value)} /></label>
      </div>
      <section className="b-kpis">
        <Kpi rotulo="Recebido no período" valor={realCurto(total)} detalhe={plural(pagos.filter((p) => p.valor > 0).length, 'venda', 'vendas')} />
        <Kpi rotulo="Aguardando pagamento" valor={(dados || []).filter((p) => p.status === 'pendente').length} detalhe="links gerados e não pagos" />
        <Kpi rotulo="Juros a devolver" valor={devolver.length} tom={devolver.length ? 'alerta' : ''} detalhe="parcelou dentro do sem juros" />
      </section>
      <div className="b-filtros">
        {[['todos', 'Todos'], ['pagos', 'Pagos'], ['pendentes', 'Pendentes'], ['site', 'Site'], ['balcao', 'Balcão'], ['devolver', 'Juros a devolver'], ['estornados', 'Estornados'], ['excluidas', 'Excluídas']].map(([id, t]) => (
          <button key={id} type="button" className={`b-chip${filtro === id ? ' b-chip--ativo' : ''}`} onClick={() => setFiltro(id)}>{t}</button>
        ))}
      </div>
      <Erro>{erro}</Erro>
      {carregando && !dados && <Carregando />}
      {dados && (
        <ListaPagamentos lista={lista} aoAbrir={setAberta} acoes={(p) => (
          <div className="b-botoes b-botoes--coluna">
            {/^DEVOLVER/.test(p.observacao) && <BotaoAcao acao={async () => { await chamar('marcarDevolvido', { orderNsu: p.orderNsu }); recarregar(); }}>Já devolvi</BotaoAcao>}
            {p.status === 'pago' && <button type="button" className="link-acao" onClick={() => setAberta(p)}>editar</button>}
            {p.recibo && <a className="link-acao" href={p.recibo} target="_blank" rel="noreferrer">recibo</a>}
          </div>
        )} />
      )}
      {nova && <VenderModal aoFechar={() => setNova(false)} aoVender={() => { setNova(false); recarregar(); }} />}
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
  const forma = (p.metodo || '—') + (p.bandeira ? ' ' + p.bandeira : '') + (Number(p.parcelas) > 1 ? ' ' + p.parcelas + 'x' : '');
  const opcoes = [!comVale && ['corrigir', 'Corrigir'], ['excluir', 'Excluir'], ['estorno', 'Estorno']].filter(Boolean);
  return (
    <Modal rotulo={`${p.nome} · ${dataBR(p.pagoEm || p.criadoEm)}`} titulo="Venda" aoFechar={aoFechar}>
      <dl className="vd-resumo">
        <div><dt>Item</dt><dd>{p.descricao}</dd></div>
        <div><dt>Valor</dt><dd>{real(p.valor)}{p.valeUsado > 0 && <span className="b-suave"> + {real(p.valeUsado)} em vale-presente</span>}</dd></div>
        <div><dt>Forma</dt><dd>{forma}<span className="b-suave"> · {p.origem}</span></dd></div>
        {p.registradoPor && <div><dt>Lançada por</dt><dd>{p.registradoPor.split('@')[0]}{p.pagoEm ? ` · ${p.pagoEm.slice(11, 16)}` : ''}</dd></div>}
        {p.observacao && <div><dt>Observação</dt><dd>{p.observacao}</dd></div>}
      </dl>
      {p.status !== 'pago' ? (
        <p className="b-suave">Esta venda está como “{SITUACAO[p.status] || p.status}”: não há o que corrigir.</p>
      ) : p.comanda ? (
        <div className="b-form">
          <p className="aviso">Esta venda é de uma comanda. Para corrigir ou desfazer, a administração abre a comanda e usa “Reabrir para corrigir”: assim o estoque, as comissões e os outros itens acompanham.</p>
          <button type="button" className="botao botao--linha" onClick={() => navegar('/bancada/comandas', { state: { abrir: p.comanda } })}>Abrir a comanda</button>
        </div>
      ) : !doBalcao ? (
        <Estorno p={p} aoEstornar={aoMudar} />
      ) : (
        <>
          {!podeMexer && <p className="aviso">A recepção corrige ou exclui só as vendas lançadas hoje. Para esta, peça à administração.</p>}
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
  const cortesia = metodo === 'Cortesia';
  const parcela = metodo === 'Cartão de crédito' || metodo === 'Link InfinitePay';
  const valorNum = cortesia ? 0 : numBR(valor);
  const valorRuim = !cortesia && (valor.trim() === '' || isNaN(valorNum) || valorNum < 0);
  return (
    <div className="b-form">
      <label className="b-campo"><span className="rotulo">Forma de pagamento</span>
        <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>{FORMAS_CORRIGIR.map((m) => <option key={m}>{m}</option>)}</select></label>
      <div className="vd-linha">
        <CampoBandeira metodo={metodo} valor={bandeira} aoMudar={setBandeira} />
        {parcela && (
          <label className="b-campo"><span className="rotulo">Parcelas</span>
            <select value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}x</option>)}</select></label>
        )}
      </div>
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
      <p className="b-suave">Fica anotado na venda quem corrigiu, quando e como estava antes. Para trocar a cliente ou o item, exclua e registre de novo.</p>
      <Erro>{erro}</Erro>
      <BotaoAcao className="botao botao--cheio" disabled={valorRuim || motivo.trim().length < 3 || (ehCartao(metodo) && faltaBandeira(metodo, bandeira))} acao={async () => {
        setErro('');
        try { await chamar('corrigirVenda', { orderNsu: p.orderNsu, metodo, bandeira: ehCartao(metodo) || metodo === 'Link InfinitePay' ? bandeira : '', parcelas: parcela ? parcelas : 1, valor: valorNum, dataVenda, obs, motivo }); aoSalvar(); } catch (e) { setErro(e.message); }
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
      <p>Use quando a venda foi <strong>lançada por engano</strong> e o dinheiro não entrou (se entrou e foi devolvido, use Estorno).</p>
      <ul className="vd-lista b-suave">
        <li>Sai do caixa e do total de vendas (continua em “Excluídas”, com o motivo).</li>
        <li>O plano ou pacote vendido é desativado.</li>
        <li>Aula avulsa já marcada volta a ficar “A pagar”; serviço pago na agenda volta a “paga no dia”.</li>
      </ul>
      <label className="b-campo"><span className="rotulo">Motivo</span>
        <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={200} placeholder="Ex.: lancei a aula antes de a aluna pagar" /></label>
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
      <p className="b-suave">
        {p.origem === 'site'
          ? 'Faça o estorno no app da InfinitePay (Vendas → esta venda → Estornar). Depois registre aqui: o plano é desativado.'
          : 'Use quando o dinheiro entrou e foi devolvido. Registre aqui: o plano é desativado.'}
      </p>
      <label className="b-campo"><span className="rotulo">Motivo (obrigatório)</span><input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: mudou de cidade" /></label>
      <p className="b-suave">Fica registrado quem estornou, quando e o motivo.</p>
      <Erro>{erro}</Erro>
      <BotaoAcao className="botao botao--cheio botao--perigo-cheio" acao={async () => {
        try {
          if (motivo.trim().length < 3) throw new Error('Diga o motivo do estorno.'); await chamar('estornar', { orderNsu: p.orderNsu, motivo }); aoEstornar(); } catch (e) { setErro(e.message); }
      }}>Confirmar estorno</BotaoAcao>
    </div>
  );
}
