import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDados, Carregando, Erro, Cabecalho, Kpi, Abas, Vazio, real, realCurto, dataBR, dataCurta, hojeIso, somarDias, MESES, linkWhats, primeiro,
  telFmt, baixarCSV } from './ui.jsx';
import { BarrasH, Colunas, MapaCalor } from './Graficos.jsx';
import { IconeWhatsapp } from '../components/Marca.jsx';

function periodoPreset(id) {
  const h = hojeIso();
  const [a, m] = h.split('-').map(Number);
  const p = (n) => String(n).padStart(2, '0');
  if (id === 'mes') return [`${a}-${p(m)}-01`, h];
  if (id === 'mes-passado') {
    const d = new Date(a, m - 2, 1);
    const fim = new Date(a, m - 1, 0);
    return [`${d.getFullYear()}-${p(d.getMonth() + 1)}-01`, `${fim.getFullYear()}-${p(fim.getMonth() + 1)}-${p(fim.getDate())}`];
  }
  if (id === '30') return [somarDias(h, -29), h];
  if (id === '90') return [somarDias(h, -89), h];
  if (id === 'ano') return [`${a}-01-01`, h];
  return null;
}

const TIPOS = { avulsa: 'Aula avulsa', mensal: 'Plano mensal', trimestral: 'Plano trimestral', servico: 'Serviço avulso', pacote: 'Pacote de serviço', outro: 'Outros' };
const pct = (v) => (v == null ? '—' : `${String(v).replace('.', ',')}%`);

export default function Relatorios() {
  const local = useLocation();
  const [preset, setPreset] = useState('mes');
  const [[de, ate], setPeriodo] = useState(periodoPreset('mes'));
  const [aba, setAba] = useState(local.state?.aba || 'financeiro');
  const { dados: r, erro, carregando, atual } = useDados('relatorio', { de, ate });

  const escolher = (id) => {
    setPreset(id);
    const p = periodoPreset(id);
    if (p) setPeriodo(p);
  };

  return (
    <>
      <Cabecalho titulo="Relatórios">Financeiro, aulas, serviços e marketing do período escolhido.</Cabecalho>
      <div className="b-periodo">
        <div className="b-filtros">
          {[['mes', 'Este mês'], ['mes-passado', 'Mês passado'], ['30', '30 dias'], ['90', '90 dias'], ['ano', 'Este ano'], ['livre', 'Escolher']].map(([id, t]) => (
            <button key={id} type="button" className={`b-chip${preset === id ? ' b-chip--ativo' : ''}`} onClick={() => escolher(id)}>{t}</button>
          ))}
        </div>
        {preset === 'livre' && (
          <>
            <label className="b-campo"><span className="rotulo">De</span><input type="date" value={de} onChange={(e) => e.target.value && setPeriodo([e.target.value, ate])} /></label>
            <label className="b-campo"><span className="rotulo">Até</span><input type="date" value={ate} onChange={(e) => e.target.value && setPeriodo([de, e.target.value])} /></label>
          </>
        )}
        <span className="b-suave">{dataBR(de)} a {dataBR(ate)}</span>
      </div>
      <Abas atual={aba} aoMudar={setAba} itens={[['financeiro', 'Financeiro'], ['aulas', 'Aulas e horários'], ['servicos', 'Serviços'], ['alunos', 'Alunos e marketing'], ['vales', 'Vales e cupons']]} />
      <Erro>{erro}</Erro>
      {carregando && !atual && <Carregando texto="Calculando" />}
      {r && atual && (
        <>
          {aba === 'financeiro' && <Financeiro f={r.financeiro} de={de} ate={ate} />}
          {aba === 'aulas' && <Aulas a={r.aulas} />}
          {aba === 'alunos' && <Alunos a={r.alunos} />}
          {aba === 'vales' && <ValesCupons v={r.vales} f={r.financeiro} />}
          {aba === 'servicos' && r.servicos && <ServicosRel s={r.servicos} />}
          <p className="b-suave b-nota">Atualizado em {r.geradoEm.slice(0, 16).split(' ').map((x, i) => (i ? x : x.split('-').reverse().join('/'))).join(' às ')}.</p>
        </>
      )}
    </>
  );
}

function Grafico({ titulo, sub, children, csv }) {
  return (
    <section className="b-cartao b-grafico">
      <header className="b-cartao__topo">
        <div>
          <h2 className="b-cartao__titulo">{titulo}</h2>
          {sub && <p className="b-suave">{sub}</p>}
        </div>
        {csv && <button type="button" className="link-acao" onClick={csv}>CSV</button>}
      </header>
      {children}
    </section>
  );
}

const rotuloSerie = (porMes) => (k, completo) => {
  if (porMes) { const [a, m] = k.split('-'); return `${MESES[Number(m) - 1]}${completo ? ' ' + a : ''}`; }
  return completo ? dataBR(k) : String(Number(k.slice(8)));
};

function Financeiro({ f, de, ate }) {
  const csvItens = (nome, itens) => () => baixarCSV(nome, [['nome', 'Item'], ['qtd', 'Quantidade'], [(i) => String(i.valor).replace('.', ','), 'Valor (R$)']], itens);
  return (
    <>
      <section className="b-kpis">
        <Kpi rotulo="Faturamento" valor={realCurto(f.receita)}
          detalhe={f.variacao == null ? 'sem período anterior para comparar' : `${f.variacao >= 0 ? '▲' : '▼'} ${pct(Math.abs(f.variacao))} vs período anterior (${realCurto(f.receitaAnterior)})`}
          tom={f.variacao == null ? '' : f.variacao >= 0 ? 'ok' : 'alerta'} />
        <Kpi rotulo="Vendas" valor={f.vendas} detalhe={`ticket médio ${real(f.ticketMedio)}`} />
        <Kpi rotulo="Conversão no site" valor={pct(f.conversaoSite)} detalhe={`${f.linksSite} pagamentos iniciados · ${f.abandonados} não concluídos`} />
        <Kpi rotulo="Descontos com cupom" valor={realCurto(f.descontosCupom)} detalhe={f.estornos ? `${f.estornos} estornos (${real(f.valorEstornado)})` : 'nenhum estorno'} />
      </section>
      <Grafico titulo={f.seriePorMes ? 'Faturamento por mês' : 'Faturamento por dia'} sub="A coluna terracota é o melhor momento do período."
        csv={() => baixarCSV(`faturamento-${de}-a-${ate}`, [['chave', 'Data'], [(s) => String(s.valor).replace('.', ','), 'Valor (R$)'], ['qtd', 'Vendas']], f.serie)}>
        <Colunas serie={f.serie} rotuloX={rotuloSerie(f.seriePorMes)} formato={real} dicaExtra={(d) => ` · ${d.qtd} venda${d.qtd === 1 ? '' : 's'}`} />
      </Grafico>
      <div className="b-duas">
        <Grafico titulo="Por modalidade" csv={csvItens('faturamento-modalidade', f.porModalidade)}>
          <BarrasH itens={f.porModalidade.map((i) => ({ ...i, detalhe: `${i.qtd} vendas` }))} formato={realCurto} />
        </Grafico>
        <Grafico titulo="Por tipo de plano" csv={csvItens('faturamento-tipo', f.porTipo)}>
          <BarrasH itens={f.porTipo.map((i) => ({ ...i, nome: TIPOS[i.nome] || i.nome, detalhe: `${i.qtd} vendas` }))} formato={realCurto} />
        </Grafico>
      </div>
      <Grafico titulo="Planos que mais vendem" sub="Ordenado pelo faturamento" csv={csvItens('planos-mais-vendidos', f.porPlano)}>
        <BarrasH itens={f.porPlano.map((i) => ({ ...i, detalhe: `${i.qtd} vendas` }))} formato={realCurto} limite={12} />
      </Grafico>
      <div className="b-duas">
        <Grafico titulo="Formas de pagamento" csv={csvItens('formas-pagamento', f.porForma)}>
          <BarrasH itens={f.porForma.map((i) => ({ ...i, detalhe: `${i.qtd} vendas` }))} formato={realCurto} />
          {f.porBandeira?.length > 0 && (
            <>
              <h3 className="b-subtitulo">Cartões por bandeira</h3>
              <BarrasH itens={f.porBandeira.map((i) => ({ ...i, detalhe: `${i.qtd} vendas` }))} formato={realCurto} />
            </>
          )}
        </Grafico>
        <Grafico titulo="Site × balcão" sub={f.porParcelas.length ? 'Cartão: ' + f.porParcelas.map((p) => `${p.nome} (${p.qtd})`).join(' · ') : ''}>
          <BarrasH itens={f.porOrigem.map((i) => ({ ...i, nome: i.nome === 'site' ? 'Pelo site' : 'No balcão', detalhe: `${i.qtd} vendas` }))} formato={realCurto} />
        </Grafico>
      </div>
      {f.jurosDevolver.length > 0 && (
        <Grafico titulo="Juros para devolver" sub="Parcelou dentro do sem juros e a InfinitePay cobrou juros. Devolva e marque em Vendas.">
          <ul className="b-lista-simples">{f.jurosDevolver.map((p) => <li key={p.orderNsu}><strong>{p.nome}</strong><span>{p.observacao}</span></li>)}</ul>
        </Grafico>
      )}
    </>
  );
}

function Aulas({ a }) {
  const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const [mod, setMod] = useState('Yoga');
  if (!a.geral.aulas) return <Vazio titulo="Ainda sem aulas realizadas no período">Os números aparecem conforme as aulas acontecem.</Vazio>;
  const passadas = a.presencas + a.faltas + a.semRegistro;
  const csvGrupo = (nome, itens) => () => baixarCSV(nome, [['nome', 'Grupo'], ['aulas', 'Aulas'], ['reservas', 'Reservas'], ['capacidade', 'Vagas'], [(i) => String(i.ocupacao).replace('.', ','), 'Ocupação %']], itens);
  return (
    <>
      <section className="b-kpis">
        <Kpi rotulo="Ocupação média" valor={pct(a.geral.ocupacao)} detalhe={`${a.geral.reservas} reservas em ${a.geral.aulas} aulas`} />
        <Kpi rotulo="Presença" valor={passadas ? pct(Math.round((a.presencas / passadas) * 1000) / 10) : '—'} detalhe={`${a.presencas} presentes · ${a.faltas} faltas · ${a.semRegistro} sem registro`} />
        <Kpi rotulo="Cancelamentos" valor={a.cancelamentos} />
        <Kpi rotulo="Pelo Wellhub" valor={a.wellhub} detalhe="reservas no período" />
      </section>
      <div className="b-duas">
        <Grafico titulo="Ocupação por modalidade" csv={csvGrupo('ocupacao-modalidade', a.porModalidade)}>
          <BarrasH itens={a.porModalidade.map((g) => ({ nome: g.nome, valor: g.ocupacao, detalhe: `${g.reservas}/${g.capacidade} vagas` }))} formato={pct} max={100} />
        </Grafico>
        <Grafico titulo="Ocupação por dia da semana" csv={csvGrupo('ocupacao-dia', a.porDiaSemana)}>
          <BarrasH itens={a.porDiaSemana.map((g) => ({ nome: g.nome, valor: g.ocupacao, detalhe: `${g.aulas} aulas` }))} formato={pct} max={100} />
        </Grafico>
      </div>
      <Grafico titulo="Mapa de ocupação" sub="Cada quadrado é um horário da semana. Quanto mais escuro, mais cheio — bom para decidir abrir ou fechar turmas.">
        <div className="b-filtros">{['Yoga', 'Pilates'].map((m) => <button key={m} type="button" className={`b-chip${mod === m ? ' b-chip--ativo' : ''}`} onClick={() => setMod(m)}>{m}</button>)}</div>
        <MapaCalor celulas={a.mapaCalor.filter((c) => c.modalidade === mod)} nomesDias={nomes} />
      </Grafico>
      <Grafico titulo="Horários mais procurados" csv={csvGrupo('horarios', a.porHorario)}>
        <BarrasH itens={a.porHorario.map((g) => ({ nome: g.nome.replace(':00', 'h').replace(':', 'h'), valor: g.ocupacao, detalhe: `${g.reservas} reservas em ${g.aulas} aulas` }))} formato={pct} max={100} limite={12} />
      </Grafico>
      <div className="b-duas">
        <Grafico titulo="Por professora" sub="Reservas no período" csv={csvGrupo('professoras', a.porProfessora)}>
          <BarrasH itens={a.porProfessora.map((g) => ({ nome: g.nome, valor: g.reservas, detalhe: `${g.aulas} aulas · ${pct(g.ocupacao)} de ocupação` }))} />
        </Grafico>
        <Grafico titulo="Como as aulas foram pagas">
          <BarrasH itens={a.porForma.map((g) => ({ nome: g.nome, valor: g.qtd }))} />
        </Grafico>
      </div>
    </>
  );
}

function ListaContatos({ titulo, sub, itens, extra, mensagem, nomeCsv }) {
  return (
    <Grafico titulo={`${titulo} (${itens.length})`} sub={sub}
      csv={itens.length ? () => baixarCSV(nomeCsv, [['nome', 'Nome'], [(i) => telFmt(i.whatsapp), 'WhatsApp'], ['email', 'E-mail'], [(i) => extra(i), 'Detalhe']], itens) : null}>
      {itens.length === 0 ? <p className="g-vazio">Ninguém nesta lista agora.</p> : (
        <ul className="b-contatos">
          {itens.slice(0, 30).map((i) => (
            <li key={i.cpf}>
              <div><strong>{i.nome}</strong><span className="b-suave">{extra(i)}</span></div>
              {i.whatsapp && (
                <a className="link-acao" href={linkWhats(i.whatsapp, mensagem(i))} target="_blank" rel="noreferrer" aria-label={`WhatsApp de ${i.nome}`}><IconeWhatsapp tamanho={16} /></a>
              )}
            </li>
          ))}
        </ul>
      )}
    </Grafico>
  );
}

function Alunos({ a }) {
  const mesAtual = MESES[new Date().getMonth()];
  return (
    <>
      <section className="b-kpis">
        <Kpi rotulo="Alunos com plano ou aula" valor={a.ativos} detalhe={`${a.comPlano} com plano mensal/trimestral`} />
        <Kpi rotulo="Novos no período" valor={a.novosNoPeriodo} detalhe={`${a.total} cadastrados no total`} />
        <Kpi rotulo="Renovação" valor={pct(a.renovacao.taxa)} detalhe={`${a.renovacao.renovaram} de ${a.renovacao.terminaram} planos que venceram`} />
        <Kpi rotulo="Sem ficha de saúde" valor={a.semFicha} tom={a.semFicha ? 'aviso' : ''} detalhe={`${a.wellhub} usam Wellhub`} />
      </section>
      <div className="b-duas">
        <Grafico titulo="Como nos conheceram" sub={`Clientes novos no período · ${a.comoConheceramTodos.filter((c) => c.nome !== 'Não informado').reduce((s, c) => s + c.qtd, 0)} de ${a.total} já responderam`}>
          {a.comoConheceram.length
            ? <BarrasH itens={a.comoConheceram.map((c) => ({ nome: c.nome, valor: c.qtd }))} formato={(v) => `${v} cliente${v === 1 ? '' : 's'}`} />
            : <p className="b-suave">Nenhum cliente novo no período.</p>}
        </Grafico>
        <Grafico titulo="Vendas por canal" sub="Quanto cada canal trouxe no período (pelo que a cliente respondeu)">
          {a.vendasPorCanal.length
            ? <BarrasH itens={a.vendasPorCanal.map((c) => ({ nome: c.nome, valor: c.valor }))} formato={realCurto} />
            : <p className="b-suave">Sem vendas no período.</p>}
        </Grafico>
      </div>
      <Grafico titulo="Bairros das clientes" sub={`${a.comEndereco} de ${a.total} clientes com endereço completo (para nota fiscal)`}>
        {a.bairros.length
          ? <BarrasH itens={a.bairros.map((c) => ({ nome: c.nome, valor: c.qtd }))} formato={(v) => `${v} cliente${v === 1 ? '' : 's'}`} limite={15} />
          : <p className="b-suave">Ainda ninguém com bairro cadastrado. Preencha o endereço em Clientes → editar.</p>}
      </Grafico>
      <Grafico titulo="Novos cadastros por mês" sub="Últimos 12 meses">
        <Colunas serie={a.novosPorMes.map((m) => ({ chave: m.chave, valor: m.qtd }))} rotuloX={rotuloSerie(true)} formato={(v) => `${v} aluno${v === 1 ? '' : 's'}`} altura={190} />
      </Grafico>
      <div className="b-duas">
        <ListaContatos titulo="Planos vencendo" sub="Nos próximos 10 dias: hora de lembrar da renovação" itens={a.vencendo} nomeCsv="planos-vencendo"
          extra={(i) => `${i.plano} · até ${dataCurta(i.fim)}`}
          mensagem={(i) => `Olá, ${primeiro(i.nome)}! Seu plano ${i.plano} na Casa Âmbar vence em ${dataBR(i.fim)}. Quer renovar para seguir sua prática?`} />
        <ListaContatos titulo={`Aniversariantes de ${mesAtual}`} sub="Que tal um vale-presente?" itens={a.aniversariantes} nomeCsv="aniversariantes"
          extra={(i) => `dia ${i.dia}`}
          mensagem={(i) => `Feliz aniversário, ${primeiro(i.nome)}! 🎂 A Casa Âmbar deseja um novo ciclo leve e cheio de presença.`} />
      </div>
      <div className="b-duas">
        <ListaContatos titulo="Sumidos" sub="Fizeram aula nos últimos 4 meses, mas não vêm há 3 semanas e estão sem plano" itens={a.sumidos} nomeCsv="alunos-sumidos"
          extra={(i) => `última aula ${dataCurta(i.ultimaAula)}`}
          mensagem={(i) => `Olá, ${primeiro(i.nome)}! Sentimos sua falta na Casa Âmbar. Que tal voltar à sua prática esta semana?`} />
        <ListaContatos titulo="Só fizeram aula avulsa" sub="Oportunidade de oferecer um plano" itens={a.soAvulsa} nomeCsv="so-avulsa"
          extra={() => 'experimentou'}
          mensagem={(i) => `Olá, ${primeiro(i.nome)}! Gostou da aula na Casa Âmbar? Temos planos mensais e trimestrais para você seguir praticando.`} />
      </div>
      <Grafico titulo="Quem mais frequentou" sub="Presenças no período">
        <BarrasH itens={a.frequentes.map((i) => ({ nome: i.nome, valor: i.presencas }))} formato={(v) => `${v}×`} limite={15} />
      </Grafico>
    </>
  );
}

function ValesCupons({ v, f }) {
  return (
    <>
      <section className="b-kpis">
        <Kpi rotulo="Vales gerados" valor={v.gerados} detalhe={`${realCurto(v.valorGerado)} em cortesias`} />
        <Kpi rotulo="Vales usados" valor={v.resgatados} detalhe={`${realCurto(v.valorResgatado)} usados no período`} />
        <Kpi rotulo="Vales em aberto" valor={v.abertos} detalhe="ainda podem ser usados" />
        <Kpi rotulo="Aulas cortesia" valor={v.aulasCortesia} detalhe="agendadas pela bancada" />
      </section>
      <div className="b-duas">
        <Grafico titulo="Vales por motivo">
          <BarrasH itens={v.porMotivo.map((i) => ({ nome: i.nome, valor: i.qtd, detalhe: realCurto(i.valor) }))} formato={(n) => `${n} vale${n === 1 ? '' : 's'}`} />
        </Grafico>
        <Grafico titulo="Cupons mais usados" sub={`Desconto total: ${real(f.descontosCupom)}`}>
          <BarrasH itens={f.cupons.map((i) => ({ nome: i.nome, valor: i.qtd, detalhe: 'desconto ' + real(i.valor) }))} formato={(n) => `${n} uso${n === 1 ? '' : 's'}`} />
        </Grafico>
      </div>
      {v.porCampanha.length > 0 && (
        <Grafico titulo="Campanhas" sub="Quantos vales de cada campanha já foram usados">
          <BarrasH itens={v.porCampanha.map((c) => ({ nome: c.nome, valor: c.qtd ? Math.round((c.resgatados / c.qtd) * 100) : 0, detalhe: `${c.resgatados} de ${c.qtd} usados` }))} formato={pct} max={100} />
        </Grafico>
      )}
    </>
  );
}


function ServicosRel({ s }) {
  if (!s.agendados && !s.receita) return <Vazio titulo="Ainda sem serviços no período">Os números aparecem conforme a recepção agenda estética e fisioterapia.</Vazio>;
  return (
    <>
      <section className="b-kpis">
        <Kpi rotulo="Faturamento com serviços" valor={realCurto(s.receita)} detalhe={`${s.pacotesVendidos} pacote${s.pacotesVendidos === 1 ? '' : 's'} vendido${s.pacotesVendidos === 1 ? '' : 's'}`} />
        <Kpi rotulo="Atendimentos" valor={s.agendados} detalhe={`${s.atendidos} já atendidos`} />
        <Kpi rotulo="Faltas" valor={pct(s.taxaFalta)} detalhe={`${s.faltas} faltas · ${s.cancelados} cancelados`} tom={s.taxaFalta > 15 ? 'alerta' : ''} />
      </section>
      <div className="b-duas">
        <Grafico titulo="Serviços mais agendados">
          <BarrasH itens={s.porServico.map((i) => ({ nome: i.nome, valor: i.qtd, detalhe: realCurto(i.valor) }))} formato={(n) => `${n}×`} limite={12} />
        </Grafico>
        <Grafico titulo="Por área de cuidado">
          <BarrasH itens={s.porCategoria.map((i) => ({ nome: i.nome, valor: i.qtd, detalhe: realCurto(i.valor) }))} formato={(n) => `${n}×`} />
        </Grafico>
      </div>
      <div className="b-duas">
        <Grafico titulo="Por profissional" sub="Atendimentos no período">
          <BarrasH itens={s.porProfissional.map((i) => ({ nome: i.nome, valor: i.qtd, detalhe: realCurto(i.valor) }))} formato={(n) => `${n}×`} />
        </Grafico>
        <Grafico titulo="Faturamento por área">
          <BarrasH itens={s.receitaPorCategoria.map((i) => ({ nome: i.nome, valor: i.valor, detalhe: `${i.qtd} vendas` }))} formato={realCurto} />
        </Grafico>
      </div>
    </>
  );
}
