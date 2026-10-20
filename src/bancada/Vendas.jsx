import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useBancada } from './sessao.jsx';
import { useDados, Carregando, Erro, Cabecalho, Kpi, Modal, BotaoAcao, Abas, real, realCurto, hojeIso, somarDias, dataBR, cpfFmt, baixarCSV, plural } from './ui.jsx';
import { VenderModal, ListaPagamentos } from './Alunos.jsx';
import { ListaVales } from './Vales.jsx';

// Vendas e vales-presente (o vale é sempre vendido, pela comanda)
export default function Vendas() {
  const local = useLocation();
  const [aba, setAba] = useState(local.state?.aba === 'vales' ? 'vales' : 'vendas');
  const abas = <Abas atual={aba} aoMudar={setAba} itens={[['vendas', 'Vendas'], ['vales', 'Vales-presente']]} />;
  if (aba === 'vendas') return <ListaVendas abas={abas} />;
  return (
    <>
      <Cabecalho titulo="Vendas">Vale-presente é sempre vendido: entra como item da comanda e o código nasce quando ela é paga.</Cabecalho>
      {abas}
      <ListaVales abrirNovo={!!local.state?.novo} />
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
  const [estornar, setEstornar] = useState(null);
  const { dados, erro, carregando, recarregar } = useDados('pagamentos', { de, ate });

  const lista = useMemo(() => (dados || []).filter((p) => {
    if (filtro === 'pagos') return p.status === 'pago';
    if (filtro === 'pendentes') return p.status === 'pendente';
    if (filtro === 'estornados') return p.status === 'estornado';
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
        {[['todos', 'Todos'], ['pagos', 'Pagos'], ['pendentes', 'Pendentes'], ['site', 'Site'], ['balcao', 'Balcão'], ['devolver', 'Juros a devolver'], ['estornados', 'Estornados']].map(([id, t]) => (
          <button key={id} type="button" className={`b-chip${filtro === id ? ' b-chip--ativo' : ''}`} onClick={() => setFiltro(id)}>{t}</button>
        ))}
      </div>
      <Erro>{erro}</Erro>
      {carregando && !dados && <Carregando />}
      {dados && (
        <ListaPagamentos lista={lista} acoes={(p) => (
          <div className="b-botoes b-botoes--coluna">
            {/^DEVOLVER/.test(p.observacao) && <BotaoAcao acao={async () => { await chamar('marcarDevolvido', { orderNsu: p.orderNsu }); recarregar(); }}>Já devolvi</BotaoAcao>}
            {p.status === 'pago' && <button type="button" className="link-sair" onClick={() => setEstornar(p)}>estorno</button>}
            {p.recibo && <a className="link-acao" href={p.recibo} target="_blank" rel="noreferrer">recibo</a>}
          </div>
        )} />
      )}
      {nova && <VenderModal aoFechar={() => setNova(false)} aoVender={() => { setNova(false); recarregar(); }} />}
      {estornar && <Estorno p={estornar} aoFechar={() => setEstornar(null)} aoEstornar={() => { setEstornar(null); recarregar(); }} />}
    </>
  );
}

function Estorno({ p, aoFechar, aoEstornar }) {
  const { chamar } = useBancada();
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  return (
    <Modal rotulo={`${p.nome} · ${real(p.valor)}`} titulo="Registrar estorno" aoFechar={aoFechar}>
      <div className="b-form">
        <p>{p.descricao}</p>
        <p className="b-suave">
          {p.origem === 'site'
            ? 'Faça o estorno no app da InfinitePay (Vendas → esta venda → Estornar). Depois registre aqui: o plano é desativado.'
            : 'Devolva o valor e registre aqui: o plano é desativado.'}
        </p>
        <label className="b-campo"><span className="rotulo">Motivo</span><input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: mudou de cidade" /></label>
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--cheio botao--perigo-cheio" acao={async () => {
          try { await chamar('estornar', { orderNsu: p.orderNsu, motivo }); aoEstornar(); } catch (e) { setErro(e.message); }
        }}>Confirmar estorno</BotaoAcao>
      </div>
    </Modal>
  );
}
