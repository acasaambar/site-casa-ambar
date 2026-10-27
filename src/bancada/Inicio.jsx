import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './css/shell.css';
import { useBancada, pode } from './sessao.jsx';
import { useDados, useFazServicos, Erro, realCurto, hora, primeiro, DIAS_LONGOS, MESES, diaSemana } from './ui.jsx';
import { Sol } from '../components/Marca.jsx';
import { COR_CATEGORIA } from './Servicos.jsx';
import { Icone } from './icones.jsx';

const INI = 6 * 60, FIM = 20 * 60;
const min = (h) => { const [a, b] = String(h).split(':').map(Number); return a * 60 + (b || 0); };
const pos = (m) => `${((m - INI) / (FIM - INI)) * 100}%`;

function useAgora() {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  return agora;
}

// distribui itens que se sobrepõem em linhas diferentes da mesma faixa.
// Conta pelo menos 60 min de largura: a pedra tem largura mínima para a hora escrita ("16h30")
// e um atendimento curto não pode cobrir o seguinte (ver .pedra no CSS)
const LARGURA_MIN = 60;
function emLinhas(itens) {
  const fins = [];
  return [...itens].sort((a, b) => min(a.hora) - min(b.hora)).map((x) => {
    const ini = min(x.hora);
    let l = fins.findIndex((f) => f <= ini);
    if (l < 0) { l = fins.length; fins.push(0); }
    fins[l] = ini + Math.max(x.duracao, LARGURA_MIN);
    return { ...x, linha: l };
  });
}

function Faixa({ nome, itens, m, dentro, render, unidade }) {
  const dist = emLinhas(itens);
  const linhas = Math.max(1, ...dist.map((x) => x.linha + 1));
  return (
    <div className="linha__faixa" style={{ height: linhas * 46 + 8 }}>
      <span className="linha__nome">
        <strong>{nome}</strong>
        <small>{itens.length ? `${itens.length} ${unidade}` : 'livre'}</small>
      </span>
      {dist.map((x) => {
        const ini = min(x.hora);
        const passou = dentro ? ini + x.duracao < m : m > FIM;
        const andando = dentro && ini <= m && m <= ini + x.duracao;
        return render(x, {
          left: pos(ini), width: `calc(${(x.duracao / (FIM - INI)) * 100}% - 3px)`, top: 4 + x.linha * 46, height: 42,
        }, passou, andando);
      })}
    </div>
  );
}

const horaDoRelogio = (d) => (d.getMinutes() ? `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}` : `${d.getHours()}h`);

// A linha do dia: das 6h às 20h, com o sol marcando a hora e cada aula/atendimento no lugar dele.
// "faixas" diz quais linhas aparecem (a profissional só vê as que são dela)
function LinhaDoDia({ aulas, servicos, agora, faixas = ['Yoga', 'Pilates', 'Serviços'] }) {
  const caixa = useRef(null);
  const m = agora.getHours() * 60 + agora.getMinutes();
  const dentro = m >= INI && m <= FIM;
  useEffect(() => {
    // no celular a linha rola até a hora atual (depois das 20h, mostra o fim do dia)
    const el = caixa.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    if (dentro) el.scrollLeft = ((m - INI) / (FIM - INI)) * el.scrollWidth - el.clientWidth / 3;
    else if (m > FIM) el.scrollLeft = el.scrollWidth;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const horas = [];
  for (let h = 6; h <= 20; h += 2) horas.push(h);
  const aula = (a, estilo, passou, andando) => (
    <Link key={a.id} to="/bancada/agenda" state={{ abrir: a.id }} title={`${a.modalidade} ${hora(a.hora)} com ${a.professor} · ${a.reservas} de ${a.capacidade}`}
      className={`pedra pedra--${a.modalidade.toLowerCase()}${passou ? ' pedra--passou' : ''}${andando ? ' pedra--agora' : ''}`} style={estilo}>
      <strong>{hora(a.hora)}</strong>
      <span>{a.reservas}/{a.capacidade}</span>
    </Link>
  );
  return (
    <section className="linha" aria-label="Linha do dia">
      <div className="linha__rolagem" ref={caixa}>
        <div className="linha__trilho">
          {faixas.length === 0 && <p className="linha__vazia">Nenhuma aula ou atendimento seu hoje.</p>}
          {faixas.includes('Yoga') && <Faixa nome="Yoga" unidade="aulas" itens={aulas.filter((a) => a.modalidade === 'Yoga')} m={m} dentro={dentro} render={aula} />}
          {faixas.includes('Pilates') && <Faixa nome="Pilates" unidade="aulas" itens={aulas.filter((a) => a.modalidade === 'Pilates')} m={m} dentro={dentro} render={aula} />}
          {faixas.includes('Serviços') && <Faixa nome="Serviços" unidade="atend." itens={servicos} m={m} dentro={dentro} render={(a, estilo, passou, andando) => (
            <Link key={a.id} to="/bancada/agenda" state={{ vista: 'servicos' }} title={`${hora(a.hora)} · ${a.servico} · ${a.nome} com ${a.profissional}`}
              className={`pedra pedra--s pedra--${COR_CATEGORIA[a.categoria] || 'facial'}${passou ? ' pedra--passou' : ''}${andando ? ' pedra--agora' : ''}`} style={estilo}>
              <strong>{hora(a.hora)}</strong>
              <span>{primeiro(a.nome)}</span>
            </Link>
          )} />}
          <div className="linha__horas" aria-hidden="true">
            {horas.map((h) => <span key={h} style={{ left: pos(h * 60) }}>{h}h</span>)}
          </div>
          {dentro && (
            <div className={`linha__agora${m > 18 * 60 ? ' linha__agora--fim' : ''}`} style={{ left: pos(m) }} aria-label={`Agora, ${agora.getHours()}h${String(agora.getMinutes()).padStart(2, '0')}`}>
              <Sol tamanho={26} className="linha__sol" />
              <span className="linha__agora-hora">{horaDoRelogio(agora)}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// os lembretes automáticos são pedidos uma vez só enquanto a bancada está aberta
let lembretesPedidos = false;

// tempo que falta até o início, por extenso curto: "em 35 min", "em 1 h 20"
function emQuanto(min_) {
  if (min_ < 60) return `em ${Math.max(min_, 1)} min`;
  const h = Math.floor(min_ / 60), r = min_ % 60;
  return r ? `em ${h} h ${String(r).padStart(2, '0')}` : `em ${h} h`;
}

export default function Inicio() {
  const { membro, chamar } = useBancada();
  const { dados: r, erro, carregando } = useDados('resumo', undefined, true, (d) => Array.isArray(d.proximas) && Array.isArray(d.linha));
  // lembretes da véspera por e-mail: saem sozinhos quando a recepção abre a bancada
  useEffect(() => {
    if (lembretesPedidos || !pode(membro, 'admin', 'recepcao')) return;
    lembretesPedidos = true;
    // no máximo a cada 2 h por aparelho (o servidor também confere): antes ia a cada abertura da bancada
    try { if (Date.now() - Number(localStorage.getItem('ambar_lembretes') || 0) < 2 * 3600e3) return; localStorage.setItem('ambar_lembretes', String(Date.now())); } catch { /* sem armazenamento */ }
    chamar('lembretesAuto', {}).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const agora = useAgora();
  const h = agora.getHours();
  const saud = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const balcao = pode(membro, 'admin', 'recepcao');
  // profissional: mostra só o que é dela (aulas, serviços ou os dois)
  const fazServicos = useFazServicos();
  const daAula = balcao || !!r?.aulasHoje || fazServicos === false;
  const daServico = balcao || !!r?.servicosHoje || fazServicos === true;
  const faixas = balcao ? undefined : [
    ...['Yoga', 'Pilates'].filter((mod) => (r?.linha || []).some((a) => a.modalidade === mod)),
    ...(daServico ? ['Serviços'] : []),
  ];
  const resumo = r ? [
    daAula && [r.aulasHoje, 'aula', 'aulas'],
    daServico && [r.servicosHoje || 0, 'atendimento', 'atendimentos'],
  ].filter(Boolean) : [];

  const m = h * 60 + agora.getMinutes();
  const duracaoDaAula = (id) => (r?.linha || []).find((l) => l.id === id)?.duracao || 60;
  const aSeguir = r
    ? [
        ...r.proximas.map((a) => ({ id: a.id, hora: a.hora, duracao: duracaoDaAula(a.id), titulo: `${a.modalidade} com ${a.professor}`, detalhe: `${a.reservas} de ${a.capacidade} lugares`, tipo: a.modalidade.toLowerCase(), aula: true, lotacao: a.capacidade ? a.reservas / a.capacidade : 0 })),
        ...(r.servicos || []).filter((s) => s.status !== 'atendido' && s.status !== 'falta' && min(s.hora) + s.duracao > h * 60 + agora.getMinutes())
          .map((s) => ({ id: s.id, hora: s.hora, duracao: s.duracao, titulo: s.servico, detalhe: `${s.nome} · ${s.profissional}`, tipo: COR_CATEGORIA[s.categoria] || 'facial' })),
      ].sort((a, b) => a.hora.localeCompare(b.hora)).slice(0, 6)
    : [];
  // quem está acontecendo agora e qual é o próximo
  let achouProximo = false;
  aSeguir.forEach((x) => {
    const ini = min(x.hora);
    if (ini <= m && m < ini + x.duracao) x.estado = 'agora';
    else if (ini > m && !achouProximo) { achouProximo = true; x.estado = 'proximo'; x.faltam = ini - m; }
  });

  const folgas = r?.folgasHoje || [];
  const dataTexto = r ? `${DIAS_LONGOS[diaSemana(r.hoje)]}, ${Number(r.hoje.slice(8))} de ${MESES[Number(r.hoje.slice(5, 7)) - 1]}` : ' ';
  const statusCaixa = r?.caixa === 'nao_aberto' ? ['aviso', 'caixa ainda não aberto'] : r?.caixa === 'aberto' ? ['ok', 'caixa aberto'] : ['neutro', 'caixa fechado'];

  // o que pede atenção (só aparece o que tem número)
  const atencoes = r ? [
    [r.pedidosTroca, r.pedidosTroca === 1 ? 'pedido de troca de profissional' : 'pedidos de troca de profissional', '/bancada/agenda', { vista: 'trocas' }, true],
    [r.wellhubPendentes, 'Wellhub para confirmar', '/bancada/alunos', { filtro: 'wellhub-pendente' }],
    [r.devolverJuros, 'juros para devolver', '/bancada/vendas', { filtro: 'devolver' }, true],
    [r.vencendo, 'planos vencem em 7 dias', '/bancada/alunos', { filtro: 'vencendo' }],
    [r.caixa === 'nao_aberto' ? 1 : 0, 'abrir o caixa de hoje', '/bancada/comandas', { vista: 'caixa' }, true, 'R$'],
    [r.comandasAbertas, r.comandasAbertas === 1 ? 'comanda aberta' : 'comandas abertas', '/bancada/comandas'],
    [r.estoqueBaixo, 'produtos acabando', '/bancada/estoque', { filtro: 'falta' }],
    [r.remarcar?.n, r.remarcar?.n === 1 ? 'pedido para remarcar (pelo link do lembrete)' : 'pedidos para remarcar (pelo link do lembrete)', '/bancada/agenda', { dia: r.remarcar?.dia, vista: 'dia' }],
    [r.espera?.aulasComVaga, r.espera?.aulasComVaga === 1 ? 'aula com vaga e gente na lista de espera' : 'aulas com vaga e gente na lista de espera', '/bancada/agenda', { vista: 'aulas' }],
    [r.espera?.servicos, r.espera?.servicos === 1 ? 'pedido na lista de espera de serviços' : 'pedidos na lista de espera de serviços', '/bancada/agenda', { espera: true }],
    [r.retornos, r.retornos === 1 ? 'retorno para sugerir' : 'retornos para sugerir', '/bancada/marketing', { aba: 'retornos' }],
    [r.lembretesWhats, 'lembretes de amanhã para mandar no WhatsApp', '/bancada/marketing', { aba: 'lembretes' }],
    [r.contasVencendo, 'contas vencendo', '/bancada/financeiro', { aba: 'despesas' }, true],
  ].filter(([n]) => n) : [];

  return (
    <div className="hoje">
      <header className="hoje-topo">
        <div className="hoje-topo__texto">
          <p className="hoje-topo__data">{dataTexto}</p>
          <h1 className="hoje-topo__saudacao">{saud}, {primeiro(membro.nome)}</h1>
        </div>
        {r && (
          <ul className="hoje-resumo" aria-label="Resumo do dia">
            {resumo.length > 0 && resumo.some(([n]) => n) ? resumo.map(([n, um, varios]) => (
              <li key={um}><strong>{n}</strong>{Number(n) === 1 ? um : varios}</li>
            )) : <li className="hoje-resumo__vazio">Nada na sua agenda hoje</li>}
          </ul>
        )}
      </header>
      <Erro>{erro}</Erro>
      {carregando && !r && (
        <div className="hoje-carga" role="status" aria-label="Carregando">
          <span className="hoje-carga__linha" />
          <div className="hoje-carga__nums"><span /><span /><span /><span /></div>
        </div>
      )}
      {r && (
        <>
          <LinhaDoDia aulas={r.linha || []} servicos={r.servicos || []} agora={agora} faixas={faixas} />

          <section className="hoje-nums" aria-label="Números de hoje">
            {daAula && <Numero icone="reservas" rotulo="Reservas de aula hoje" valor={r.reservasHoje} detalhe={`${r.presentesHoje} com presença marcada`}
              progresso={r.reservasHoje ? r.presentesHoje / r.reservasHoje : 0} />}
            {daServico && <Numero icone="atendimento" rotulo="Atendimentos hoje" valor={r.servicosHoje || 0} detalhe="estética e fisioterapia" />}
            {balcao && <Numero icone="moeda" rotulo="Recebido hoje" valor={realCurto(r.vendasHoje)} detalhe={statusCaixa[1]} tomDetalhe={statusCaixa[0]} />}
            {balcao && <Numero icone="mes" rotulo="Recebido no mês" valor={realCurto(r.vendasMes)} />}
            {!balcao && <Numero icone="ganhos" rotulo="Meus ganhos no mês" valor={realCurto(r.meusGanhosMes || 0)} detalhe="comissões" />}
          </section>

          {folgas.length > 0 && (
            <section className="hoje-bloqueios" aria-label="Horários bloqueados hoje">
              <h2 className="hoje-bloqueios__titulo"><Icone nome="cadeado" tamanho={16} />Horários bloqueados hoje<span className="hoje-bloqueios__n">{folgas.length}</span></h2>
              <ul>
                {folgas.map((f, i) => (
                  <li key={`${f.profissional}-${f.inicio}-${i}`}>
                    <strong>{f.profissional}</strong>
                    <span>{f.motivo}</span>
                    <em>{f.diaTodo ? 'dia todo' : `${hora(f.inicio)}–${hora(f.fim)}`}</em>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="b-duas b-duas--larga hoje-colunas">
            <section className="b-cartao hoje-cartao">
              <header className="b-cartao__topo">
                <h2 className="b-cartao__titulo">A seguir</h2>
                <Link to="/bancada/agenda" className="botao botao--fantasma botao--p">Abrir agenda<Icone nome="seta" tamanho={16} /></Link>
              </header>
              {aSeguir.length === 0 ? (
                <div className="hoje-vazio"><Icone nome="check" tamanho={22} /><span>O dia já terminou por aqui.</span></div>
              ) : (
                <ul className="hs">
                  {aSeguir.map((x) => (
                    <li key={x.id}>
                      <Link to="/bancada/agenda" state={x.aula ? { abrir: x.id } : { vista: 'servicos' }} className={`hs__item hs__item--${x.tipo}${x.estado ? ' hs__item--' + x.estado : ''}`}>
                        <strong className="hs__hora">{hora(x.hora)}</strong>
                        <span className="hs__texto">
                          <span className="hs__titulo">{x.titulo}</span>
                          <small>{x.detalhe}</small>
                        </span>
                        {x.aula && <span className="hs__lotacao" title={x.detalhe} aria-hidden="true"><i style={{ width: `${Math.min(100, Math.round(x.lotacao * 100))}%` }} /></span>}
                        {x.estado === 'agora' && <span className="hs__tag hs__tag--agora">Agora</span>}
                        {x.estado === 'proximo' && <span className="hs__tag">{emQuanto(x.faltam)}</span>}
                        <Icone nome="seta" tamanho={16} className="hs__seta" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="hoje-direita">
              {balcao ? (
                <section className="b-cartao hoje-cartao">
                  <header className="b-cartao__topo">
                    <h2 className="b-cartao__titulo">Pede atenção</h2>
                    {atencoes.length > 0 && <span className="hoje-contagem">{atencoes.length}</span>}
                  </header>
                  {atencoes.length === 0 ? (
                    <div className="hoje-vazio"><Icone nome="check" tamanho={22} /><span>Nada pendente.</span></div>
                  ) : (
                    <ul className="ha">
                      {atencoes.map(([n, texto, para, estado, urgente, simbolo]) => (
                        <li key={texto}>
                          <Link to={para} state={estado} className={`ha__item${urgente ? ' ha__item--urgente' : ''}`}>
                            <strong className="ha__n">{simbolo || n}</strong>
                            <span className="ha__texto">{texto}</span>
                            <Icone nome="seta" tamanho={16} className="ha__seta" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : (
                <section className="b-cartao hoje-cartao">
                  <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Lembretes</h2></header>
                  <ul className="hl">
                    {daAula && (
                      <li>
                        <span className="b-icone-chip"><Icone nome="reservas" /></span>
                        <span className="hl__texto"><strong>Presença nas aulas</strong><small>Marque a presença de cada pessoa e confira a ficha de saúde de quem tem o aviso “saúde: atenção”.</small></span>
                      </li>
                    )}
                    {daServico && (
                      <li>
                        <span className="b-icone-chip b-icone-chip--caramelo"><Icone nome="folha" /></span>
                        <span className="hl__texto"><strong>Ficha e evolução</strong><small>Abra o atendimento na agenda para preencher a ficha de estética e registrar a evolução com fotos.</small></span>
                      </li>
                    )}
                  </ul>
                </section>
              )}

              <nav className="hoje-atalhos" aria-label="Atalhos">
                {balcao ? (
                  <>
                    <Atalho para="/bancada/comandas" estado={{ nova: true }} icone="comanda">Abrir comanda</Atalho>
                    <Atalho para="/bancada/agenda" estado={{ vista: 'servicos', novoServico: true }} icone="agendaMais">Agendar serviço</Atalho>
                    <Atalho para="/bancada/vendas" estado={{ aba: 'vales', novo: true }} icone="presente">Vender vale‑presente</Atalho>
                    <Atalho para="/bancada/alunos" estado={{ novo: true }} icone="usuarioMais">Cadastrar cliente</Atalho>
                  </>
                ) : (
                  <>
                    <Atalho para="/bancada/ganhos" icone="ganhos">Meus ganhos</Atalho>
                    <Atalho para="/bancada/agenda" icone="agenda">Minha agenda</Atalho>
                  </>
                )}
              </nav>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// um número do dia: ícone, rótulo, valor grande e uma linha de apoio (com barrinha ou bolinha de estado quando faz sentido)
function Numero({ icone, rotulo, valor, detalhe, progresso, tomDetalhe }) {
  return (
    <div className="hn">
      <span className="hn__icone" aria-hidden="true"><Icone nome={icone} tamanho={20} /></span>
      <div className="hn__corpo">
        <span className="hn__rotulo">{rotulo}</span>
        <strong className="hn__valor">{valor}</strong>
        {detalhe && (
          <span className={`hn__detalhe${tomDetalhe ? ' hn__detalhe--' + tomDetalhe : ''}`}>
            {tomDetalhe && <i className="hn__ponto" aria-hidden="true" />}{detalhe}
          </span>
        )}
        {progresso != null && <span className="hn__barra" aria-hidden="true"><i style={{ width: `${Math.round(progresso * 100)}%` }} /></span>}
      </div>
    </div>
  );
}

function Atalho({ para, estado, icone, children }) {
  return (
    <Link to={para} state={estado} className="hoje-atalho">
      <span className="hoje-atalho__icone"><Icone nome={icone} tamanho={20} /></span>
      <span>{children}</span>
    </Link>
  );
}
