import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDados, Erro, Cabecalho, Abas, Segmento, Vazio, Aviso, Esqueleto, real, realCurto, dataBR, dataCurta, hojeIso, somarDias, MESES, linkWhats, primeiro,
  telFmt, baixarCSV, plural } from './ui.jsx';
import { BarrasH, Colunas, MapaCalor } from './Graficos.jsx';
import { Ic, KpiG, CartaoG, VazioG } from './GestaoPecas.jsx';
import { IconeWhatsapp } from '../components/Marca.jsx';
import './css/gestao.css';

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
const iniciaisDe = (nome) => String(nome || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
const PERIODOS = [['mes', 'Este mês'], ['mes-passado', 'Mês passado'], ['30', '30 dias'], ['90', '90 dias'], ['ano', 'Este ano'], ['livre', 'Escolher']];

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
      <Cabecalho titulo="Relatórios" ajuda="Todos os números respeitam o período escolhido. Cada gráfico tem o botão CSV para baixar a planilha.">
        Financeiro, aulas, serviços e marketing do período.
      </Cabecalho>
      <div className="b-barra-fixa gs-barra-fixa">
        <div className="gs-periodo">
          <div className="gs-periodo__chips" role="group" aria-label="Período">
            {PERIODOS.map(([id, t]) => (
              <button key={id} type="button" aria-pressed={preset === id} className={`b-chip${preset === id ? ' b-chip--ativo' : ''}`} onClick={() => escolher(id)}>{t}</button>
            ))}
          </div>
          <span className="gs-periodo__faixa"><Ic nome="calendario" tam={16} />{dataBR(de)} a {dataBR(ate)}</span>
          {preset === 'livre' && (
            <div className="gs-periodo__datas">
              <label className="b-campo"><span className="rotulo">De</span><input type="date" value={de} onChange={(e) => e.target.value && setPeriodo([e.target.value, ate])} /></label>
              <label className="b-campo"><span className="rotulo">Até</span><input type="date" value={ate} onChange={(e) => e.target.value && setPeriodo([de, e.target.value])} /></label>
            </div>
          )}
        </div>
      </div>
      <Abas atual={aba} aoMudar={setAba} itens={[['financeiro', 'Financeiro'], ['aulas', 'Aulas e horários'], ['servicos', 'Serviços'], ['alunos', 'Clientes e marketing'], ['vales', 'Vales e cupons']]} />
      <Erro>{erro}</Erro>
      {carregando && !atual && <Esqueleto linhas={6} altura={28} />}
      {r && atual && (
        <>
          {aba === 'financeiro' && <Financeiro f={r.financeiro} de={de} ate={ate} />}
          {aba === 'aulas' && <Aulas a={r.aulas} />}
          {aba === 'alunos' && <Alunos a={r.alunos} />}
          {aba === 'vales' && <ValesCupons v={r.vales} f={r.financeiro} />}
          {aba === 'servicos' && r.servicos && <ServicosRel s={r.servicos} />}
          <p className="gs-atualizado"><Ic nome="relogio" tam={15} />Atualizado em {r.geradoEm.slice(0, 16).split(' ').map((x, i) => (i ? x : x.split('-').reverse().join('/'))).join(' às ')}</p>
        </>
      )}
    </>
  );
}

// cartão de gráfico dos relatórios (título, "?", CSV)
function Grafico({ titulo, sub, ajuda, children, csv }) {
  return <CartaoG titulo={titulo} sub={sub} ajuda={ajuda} csv={csv}>{children}</CartaoG>;
}

const rotuloSerie = (porMes) => (k, completo) => {
  if (porMes) { const [a, m] = k.split('-'); return `${MESES[Number(m) - 1]}${completo ? ' ' + a : ''}`; }
  return completo ? dataBR(k) : String(Number(k.slice(8)));
};

function Financeiro({ f, de, ate }) {
  const csvItens = (nome, itens) => () => baixarCSV(nome, [['nome', 'Item'], ['qtd', 'Quantidade'], [(i) => String(i.valor).replace('.', ','), 'Valor (R$)']], itens);
  const vendasDe = (i) => ({ ...i, detalhe: plural(i.qtd, 'venda', 'vendas') });
  return (
    <>
      <section className="gs-kpis" aria-label="Resumo financeiro">
        <KpiG icone="moeda" rotulo="Faturamento" valor={realCurto(f.receita)}
          etiqueta={f.variacao == null ? null : `${f.variacao >= 0 ? '▲' : '▼'} ${pct(Math.abs(f.variacao))}`} etiquetaTom={f.variacao == null ? undefined : f.variacao >= 0 ? 'ok' : 'alerta'}
          detalhe={f.variacao == null ? 'sem período anterior para comparar' : `vs período anterior (${realCurto(f.receitaAnterior)})`} />
        <KpiG icone="recibo" rotulo="Vendas" valor={f.vendas} detalhe={`ticket médio ${real(f.ticketMedio)}`} />
        <KpiG icone="link" rotulo="Conversão no site" valor={pct(f.conversaoSite)} detalhe={`${plural(f.linksSite, 'pagamento iniciado', 'pagamentos iniciados')} · ${plural(f.abandonados, 'não concluído', 'não concluídos')}`} />
        <KpiG icone="cupom" rotulo="Descontos com cupom" valor={realCurto(f.descontosCupom)} detalhe={f.estornos ? `${f.estornos} estornos (${real(f.valorEstornado)})` : 'nenhum estorno'} />
      </section>
      <Grafico titulo={f.seriePorMes ? 'Faturamento por mês' : 'Faturamento por dia'} ajuda="Passe o mouse (ou toque) numa coluna para ver o valor e o número de vendas. A coluna terracota é o melhor momento do período."
        csv={() => baixarCSV(`faturamento-${de}-a-${ate}`, [['chave', 'Data'], [(s) => String(s.valor).replace('.', ','), 'Valor (R$)'], ['qtd', 'Vendas']], f.serie)}>
        <Colunas serie={f.serie} rotuloX={rotuloSerie(f.seriePorMes)} formato={real} legenda="Faturamento" dicaExtra={(d) => ` · ${d.qtd} venda${d.qtd === 1 ? '' : 's'}`} />
      </Grafico>
      <div className="gs-duas">
        <Grafico titulo="Por modalidade" csv={csvItens('faturamento-modalidade', f.porModalidade)}>
          <BarrasH itens={f.porModalidade.map(vendasDe)} formato={realCurto} participacao />
        </Grafico>
        <Grafico titulo="Por tipo de plano" csv={csvItens('faturamento-tipo', f.porTipo)}>
          <BarrasH itens={f.porTipo.map((i) => ({ ...vendasDe(i), nome: TIPOS[i.nome] || i.nome }))} formato={realCurto} participacao />
        </Grafico>
      </div>
      <Grafico titulo="Planos que mais vendem" sub="Ordenado pelo faturamento" csv={csvItens('planos-mais-vendidos', f.porPlano)}>
        <BarrasH itens={f.porPlano.map(vendasDe)} formato={realCurto} limite={12} />
      </Grafico>
      <div className="gs-duas">
        <Grafico titulo="Formas de pagamento" csv={csvItens('formas-pagamento', f.porForma)}>
          <BarrasH itens={f.porForma.map(vendasDe)} formato={realCurto} participacao />
          {f.porBandeira?.length > 0 && (
            <div className="gs-subbloco">
              <h3 className="gs-subbloco__titulo">Cartões por bandeira</h3>
              <BarrasH itens={f.porBandeira.map(vendasDe)} formato={realCurto} tom="caramelo" participacao />
            </div>
          )}
        </Grafico>
        <Grafico titulo="Site × balcão">
          <BarrasH itens={f.porOrigem.map((i) => ({ ...i, nome: i.nome === 'site' ? 'Pelo site' : 'No balcão', detalhe: plural(i.qtd, 'venda', 'vendas') }))} formato={realCurto} participacao />
          {f.porParcelas.length > 0 && (
            <div className="gs-subbloco">
              <h3 className="gs-subbloco__titulo">Parcelas no cartão</h3>
              <ul className="gs-chips">{f.porParcelas.map((p) => <li key={p.nome}><span>{p.nome}</span><strong>{plural(p.qtd, 'venda', 'vendas')}</strong></li>)}</ul>
            </div>
          )}
        </Grafico>
      </div>
      {f.jurosDevolver.length > 0 && (
        <Grafico titulo="Juros para devolver" ajuda="Parcelou dentro do sem juros e a InfinitePay cobrou juros. Devolva à pessoa e marque em Vendas.">
          <Aviso tom="aviso" titulo={plural(f.jurosDevolver.length, 'venda para conferir', 'vendas para conferir')} acao={<Link to="/bancada/vendas" className="botao botao--linha botao--p">Abrir Vendas</Link>}>Devolva os juros e marque em Vendas.</Aviso>
          <ul className="b-itens gs-itens">{f.jurosDevolver.map((p) => (
            <li key={p.orderNsu} className="b-item"><span className="b-item__corpo"><span className="b-item__titulo">{p.nome}</span><span className="b-suave">{p.observacao}</span></span></li>
          ))}</ul>
        </Grafico>
      )}
    </>
  );
}

function Aulas({ a }) {
  const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const [mod, setMod] = useState('Yoga');
  if (!a.geral.aulas) return <Vazio titulo="Ainda sem aulas realizadas no período" forma="presenca">Os números aparecem conforme as aulas acontecem. Tente um período maior.</Vazio>;
  const passadas = a.presencas + a.faltas + a.semRegistro;
  const csvGrupo = (nome, itens) => () => baixarCSV(nome, [['nome', 'Grupo'], ['aulas', 'Aulas'], ['reservas', 'Reservas'], ['capacidade', 'Vagas'], [(i) => String(i.ocupacao).replace('.', ','), 'Ocupação %']], itens);
  return (
    <>
      <section className="gs-kpis" aria-label="Resumo das aulas">
        <KpiG icone="barras" rotulo="Ocupação média" valor={pct(a.geral.ocupacao)} detalhe={`${plural(a.geral.reservas, 'reserva', 'reservas')} em ${plural(a.geral.aulas, 'aula', 'aulas')}`} />
        <KpiG icone="presenca" rotulo="Presença" valor={passadas ? pct(Math.round((a.presencas / passadas) * 1000) / 10) : '—'} detalhe={`${plural(a.presencas, 'presente', 'presentes')} · ${plural(a.faltas, 'falta', 'faltas')} · ${a.semRegistro} sem registro`} />
        <KpiG icone="fechar" rotulo="Cancelamentos" valor={a.cancelamentos} />
        <KpiG icone="pessoa" rotulo="Pelo Wellhub" valor={a.wellhub} detalhe="reservas no período" />
      </section>
      <div className="gs-duas">
        <Grafico titulo="Ocupação por modalidade" csv={csvGrupo('ocupacao-modalidade', a.porModalidade)}>
          <BarrasH itens={a.porModalidade.map((g) => ({ nome: g.nome, valor: g.ocupacao, detalhe: `${g.reservas}/${g.capacidade} vagas` }))} formato={pct} max={100} />
        </Grafico>
        <Grafico titulo="Ocupação por dia da semana" csv={csvGrupo('ocupacao-dia', a.porDiaSemana)}>
          <BarrasH itens={a.porDiaSemana.map((g) => ({ nome: g.nome, valor: g.ocupacao, detalhe: plural(g.aulas, 'aula', 'aulas') }))} formato={pct} max={100} />
        </Grafico>
      </div>
      <Grafico titulo="Mapa de ocupação" ajuda="Cada quadrado é um horário da semana. Quanto mais escuro, mais cheio. Bom para decidir abrir ou fechar turmas.">
        <Segmento itens={[['Yoga', 'Yoga'], ['Pilates', 'Pilates']]} atual={mod} aoMudar={setMod} rotulo="Modalidade" />
        <MapaCalor celulas={a.mapaCalor.filter((c) => c.modalidade === mod)} nomesDias={nomes} />
      </Grafico>
      <Grafico titulo="Horários mais procurados" csv={csvGrupo('horarios', a.porHorario)}>
        <BarrasH itens={a.porHorario.map((g) => ({ nome: g.nome.replace(':00', 'h').replace(':', 'h'), valor: g.ocupacao, detalhe: `${plural(g.reservas, 'reserva', 'reservas')} em ${plural(g.aulas, 'aula', 'aulas')}` }))} formato={pct} max={100} limite={12} />
      </Grafico>
      <div className="gs-duas">
        <Grafico titulo="Por profissional" sub="Reservas no período" csv={csvGrupo('profissionais', a.porProfessora)}>
          <BarrasH itens={a.porProfessora.map((g) => ({ nome: g.nome, valor: g.reservas, detalhe: `${plural(g.aulas, 'aula', 'aulas')} · ${pct(g.ocupacao)} de ocupação` }))} />
        </Grafico>
        <Grafico titulo="Como as aulas foram pagas">
          <BarrasH itens={a.porForma.map((g) => ({ nome: g.nome, valor: g.qtd }))} participacao />
        </Grafico>
      </div>
    </>
  );
}

function ListaContatos({ titulo, sub, ajuda, itens, extra, mensagem, nomeCsv }) {
  const mostrados = itens.slice(0, 30);
  return (
    <Grafico titulo={`${titulo} (${itens.length})`} sub={sub} ajuda={ajuda}
      csv={itens.length ? () => baixarCSV(nomeCsv, [['nome', 'Nome'], [(i) => telFmt(i.whatsapp), 'WhatsApp'], ['email', 'E-mail'], [(i) => extra(i), 'Detalhe']], itens) : null}>
      {itens.length === 0 ? <VazioG icone="check" titulo="Ninguém nesta lista agora" /> : (
        <>
          <ul className="gs-contatos">
            {mostrados.map((i) => (
              <li key={i.cpf || i.nome}>
                <span className="gs-contatos__ini" aria-hidden="true">{iniciaisDe(i.nome)}</span>
                <span className="gs-contatos__corpo">
                  <strong>{i.cpf ? <Link to={`/bancada/alunos/${i.cpf}`}>{i.nome}</Link> : i.nome}</strong>
                  <span>{extra(i)}</span>
                </span>
                {i.whatsapp && (
                  <a className="gs-contatos__whats" href={linkWhats(i.whatsapp, mensagem(i))} target="_blank" rel="noreferrer" aria-label={`WhatsApp de ${i.nome}`} title="Chamar no WhatsApp"><IconeWhatsapp tamanho={18} /></a>
                )}
              </li>
            ))}
          </ul>
          {itens.length > mostrados.length && <p className="gs-mais">Mostrando {mostrados.length} de {itens.length}. A lista completa está no CSV.</p>}
        </>
      )}
    </Grafico>
  );
}

function Alunos({ a }) {
  const mesAtual = MESES[new Date().getMonth()];
  const responderam = a.comoConheceramTodos.filter((c) => c.nome !== 'Não informado').reduce((s, c) => s + c.qtd, 0);
  return (
    <>
      <section className="gs-kpis" aria-label="Resumo de clientes">
        <KpiG icone="pessoa" rotulo="Clientes com plano ou aula" valor={a.ativos} detalhe={`${a.comPlano} com plano mensal/trimestral`} />
        <KpiG icone="novos" rotulo="Novos no período" valor={a.novosNoPeriodo} detalhe={`${a.total} cadastrados no total`} />
        <KpiG icone="renovar" rotulo="Renovação" valor={pct(a.renovacao.taxa)} detalhe={`${a.renovacao.renovaram} de ${a.renovacao.terminaram} planos que venceram`} />
        <KpiG icone="alerta" tom={a.semFicha ? 'aviso' : undefined} rotulo="Sem ficha de saúde" valor={a.semFicha} detalhe={`${a.wellhub} usam Wellhub`} />
      </section>
      <div className="gs-duas">
        <Grafico titulo="Como nos conheceram" sub="Clientes novos no período" ajuda={`${responderam} de ${a.total} clientes já responderam como conheceram a Casa.`}>
          {a.comoConheceram.length
            ? <BarrasH itens={a.comoConheceram.map((c) => ({ nome: c.nome, valor: c.qtd }))} formato={(v) => `${v} cliente${v === 1 ? '' : 's'}`} participacao />
            : <VazioG icone="vazio" titulo="Nenhum cliente novo no período" />}
        </Grafico>
        <Grafico titulo="Vendas por canal" sub="Quanto cada canal trouxe" ajuda="Soma das vendas do período, separadas pela resposta de “Como nos conheceu?” no cadastro.">
          {a.vendasPorCanal.length
            ? <BarrasH itens={a.vendasPorCanal.map((c) => ({ nome: c.nome, valor: c.valor }))} formato={realCurto} participacao />
            : <VazioG icone="vazio" titulo="Sem vendas no período" />}
        </Grafico>
      </div>
      <Grafico titulo="Bairros dos clientes" sub={`${a.comEndereco} de ${a.total} com endereço completo`}>
        {a.bairros.length
          ? <BarrasH itens={a.bairros.map((c) => ({ nome: c.nome, valor: c.qtd }))} formato={(v) => `${v} cliente${v === 1 ? '' : 's'}`} limite={15} participacao />
          : <VazioG icone="vazio" titulo="Ainda ninguém com bairro cadastrado">Preencha o endereço em Clientes → editar.</VazioG>}
      </Grafico>
      <Grafico titulo="Novos cadastros por mês" sub="Últimos 12 meses">
        <Colunas serie={a.novosPorMes.map((m) => ({ chave: m.chave, valor: m.qtd }))} rotuloX={rotuloSerie(true)} formato={(v) => plural(v, 'cadastro', 'cadastros')} altura={190} legenda="Novos cadastros" />
      </Grafico>
      <div className="gs-duas">
        <ListaContatos titulo="Planos vencendo" sub="Nos próximos 10 dias" ajuda="Hora de lembrar da renovação. O botão de WhatsApp já leva a mensagem pronta." itens={a.vencendo} nomeCsv="planos-vencendo"
          extra={(i) => `${i.plano} · até ${dataCurta(i.fim)}`}
          mensagem={(i) => `Olá, ${primeiro(i.nome)}! Seu plano ${i.plano} na Casa Âmbar vence em ${dataBR(i.fim)}. Quer renovar para seguir sua prática?`} />
        <ListaContatos titulo={`Aniversariantes de ${mesAtual}`} sub="Que tal um vale-presente?" itens={a.aniversariantes} nomeCsv="aniversariantes"
          extra={(i) => `dia ${i.dia}`}
          mensagem={(i) => `Feliz aniversário, ${primeiro(i.nome)}! 🎂 A Casa Âmbar deseja um novo ciclo leve e cheio de presença.`} />
      </div>
      <div className="gs-duas">
        <ListaContatos titulo="Quem sumiu" sub="Sem aula há 3 semanas e sem plano" ajuda="Fizeram aula nos últimos 4 meses, mas não vêm há 3 semanas e estão sem plano." itens={a.sumidos} nomeCsv="alunos-sumidos"
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
      <section className="gs-kpis" aria-label="Resumo de vales e cupons">
        <KpiG icone="presente" rotulo="Vales vendidos" valor={v.gerados} detalhe={`${realCurto(v.valorGerado)} em vales`} />
        <KpiG icone="check" rotulo="Vales usados" valor={v.resgatados} detalhe={`${realCurto(v.valorResgatado)} usados no período`} />
        <KpiG icone="relogio" rotulo="Vales em aberto" valor={v.abertos} detalhe="ainda podem ser usados" />
        <KpiG icone="pessoa" rotulo="Aulas cortesia" valor={v.aulasCortesia} detalhe="agendadas pela bancada" />
      </section>
      <div className="gs-duas">
        <Grafico titulo="Vales vendidos por tipo">
          <BarrasH itens={v.porTipo.map((i) => ({ nome: i.nome, valor: i.qtd, detalhe: realCurto(i.valor) }))} formato={(n) => `${n} vale${n === 1 ? '' : 's'}`} vazio="Nenhum vale vendido no período." />
        </Grafico>
        <Grafico titulo="Cupons mais usados" sub={`Desconto total: ${real(f.descontosCupom)}`}>
          <BarrasH itens={f.cupons.map((i) => ({ nome: i.nome, valor: i.qtd, detalhe: 'desconto ' + real(i.valor) }))} formato={(n) => `${n} uso${n === 1 ? '' : 's'}`} vazio="Nenhum cupom usado no período." />
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
  if (!s.agendados && !s.receita) return <Vazio titulo="Ainda sem serviços no período" forma="presenca">Os números aparecem conforme a recepção agenda estética e fisioterapia. Tente um período maior.</Vazio>;
  return (
    <>
      <section className="gs-kpis" aria-label="Resumo dos serviços">
        <KpiG icone="moeda" rotulo="Faturamento com serviços" valor={realCurto(s.receita)} detalhe={`${s.pacotesVendidos} pacote${s.pacotesVendidos === 1 ? '' : 's'} vendido${s.pacotesVendidos === 1 ? '' : 's'}`} />
        <KpiG icone="calendario" rotulo="Atendimentos" valor={s.agendados} detalhe={`${s.atendidos} já atendidos`} />
        <KpiG icone="alerta" rotulo="Faltas" valor={pct(s.taxaFalta)} detalhe={`${plural(s.faltas, 'falta', 'faltas')} · ${plural(s.cancelados, 'cancelado', 'cancelados')}`} tom={s.taxaFalta > 15 ? 'alerta' : undefined} />
      </section>
      <div className="gs-duas">
        <Grafico titulo="Serviços mais agendados">
          <BarrasH itens={s.porServico.map((i) => ({ nome: i.nome, valor: i.qtd, detalhe: realCurto(i.valor) }))} formato={(n) => `${n}×`} limite={12} />
        </Grafico>
        <Grafico titulo="Por área de cuidado">
          <BarrasH itens={s.porCategoria.map((i) => ({ nome: i.nome, valor: i.qtd, detalhe: realCurto(i.valor) }))} formato={(n) => `${n}×`} participacao />
        </Grafico>
      </div>
      <div className="gs-duas">
        <Grafico titulo="Por profissional" sub="Atendimentos no período">
          <BarrasH itens={s.porProfissional.map((i) => ({ nome: i.nome, valor: i.qtd, detalhe: realCurto(i.valor) }))} formato={(n) => `${n}×`} />
        </Grafico>
        <Grafico titulo="Faturamento por área">
          <BarrasH itens={s.receitaPorCategoria.map((i) => ({ nome: i.nome, valor: i.valor, detalhe: plural(i.qtd, 'venda', 'vendas') }))} formato={realCurto} participacao />
        </Grafico>
      </div>
    </>
  );
}
