import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useBancada, pode } from './sessao.jsx';
import './css/agenda.css';
import { useDados, preCarregar, segundaDe, Alertas, useAtualizarSozinho, useEsquecerPedidoDaRota, useFazServicos, CamposPagamento, PAGAMENTO_INICIAL, faltaPagamento, Carregando, Esqueleto, Erro, Cabecalho, Tag, Modal, BuscaAluno, BotaoAcao, Vazio, Aviso, Ajuda, Segmento, MenuMais, STATUS_RESERVA, hora, hojeIso, somarDias, diaSemana,
  DIAS, DIAS_LONGOS, MESES, MESES_LONGOS, linkWhats, primeiro, telFmt, plural } from './ui.jsx';
import { Lugares, Passo, ClienteEscolhido } from './AgendaPecas.jsx';
import { iniciais, useCelular, mesMais, tituloMes } from './agendaUtil.js';
import { MesCelular } from './AgendaCelular.jsx';
import { IconeWhatsapp } from '../components/Marca.jsx';
import { comNumeros } from '../components/Num.jsx';
import { AgendaServicos, AgendaSemana } from './Servicos.jsx';
import { TrocaProfissional, AlguemNaoVem, PedirSubstituicao, PainelTrocas } from './Trocas.jsx';

export default function Agenda() {
  const { membro, chamar, token } = useBancada();
  const local = useLocation();
  // lembra o dia escolhido por 2 horas (sair para Clientes ou Comanda e voltar não leva de volta para hoje)
  const [dia, setDiaBruto] = useState(() => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(local.state?.dia || '')) return local.state.dia;
    try {
      const x = JSON.parse(sessionStorage.getItem('ambar_agenda_dia'));
      if (x && /^\d{4}-\d{2}-\d{2}$/.test(x.dia) && Date.now() - x.quando < 2 * 3600e3) return x.dia;
    } catch { /* sem armazenamento */ }
    return hojeIso();
  });
  const setDia = (d) => {
    setDiaBruto(d);
    try { sessionStorage.setItem('ambar_agenda_dia', JSON.stringify({ dia: d, quando: Date.now() })); } catch { /* sem armazenamento */ }
  };
  const celular = useCelular();
  // "Agenda de quem" no celular (Dia e Mês): só a equipe do balcão escolhe; fica guardado neste aparelho
  const [pessoa, setPessoaBruto] = useState(() => { try { return localStorage.getItem('ambar_agenda_pessoa') || ''; } catch { return ''; } });
  const setPessoa = (n) => { setPessoaBruto(n); try { localStorage.setItem('ambar_agenda_pessoa', n); } catch { /* sem armazenamento */ } };
  const [filtro, setFiltro] = useState('Todas');
  const [abertas, setAbertas] = useState(() => (local.state?.abrir ? { [local.state.abrir]: true } : {}));
  const [agendar, setAgendar] = useState(null);
  const [receber, setReceber] = useState(null); // aula reservada para pagar depois
  const [ficha, setFicha] = useState(null);
  const [aviso, setAviso] = useState('');
  const [vistaEscolhida, setVista] = useState(local.state?.abrir || local.state?.vista === 'aulas' ? 'aulas' : local.state?.vista === 'trocas' ? 'trocas'
    : local.state?.vista === 'semana' ? 'semana' : local.state?.vista === 'mes' ? 'mes' : local.state?.novoServico || local.state?.espera || local.state?.vista === 'dia' ? 'dia' : null);
  // "lista de espera" da tela Hoje abre a folha da lista (uma vez só)
  const [abrirEspera] = useState(!!local.state?.espera);
  const [esperaAula, setEsperaAula] = useState(null); // aula em que vai pôr alguém na lista de espera
  // "Agendar serviço" da tela Hoje abre o formulário direto (uma vez só)
  const [abrirNovoServico] = useState(!!local.state?.novoServico);
  useEsquecerPedidoDaRota('novoServico', 'espera');
  const [trocar, setTrocar] = useState(null); // aula aberta na folha de troca
  const [naoVem, setNaoVem] = useState(false);
  const [pedir, setPedir] = useState(null); // {} = período; { item } = um horário
  const [slot, setSlot] = useState(null); // lugar na barra onde a agenda do dia/semana põe os botões dela

  // A semana inteira vem numa ida só ao servidor (aulas, atendimentos, folgas e turnos):
  // trocar de dia dentro da semana é na hora, e a semana anterior e a seguinte já ficam prontas.
  const inicioSemana = segundaDe(dia);
  const { dados: semana, erro, atual, recarregar, setDados } = useDados('agendaSemana', { de: inicioSemana });
  useAtualizarSozinho(recarregar);
  const pronto = !!semana && atual; // nunca mostra outra semana enquanto esta carrega
  useEffect(() => {
    if (!pronto) return undefined;
    const t = setTimeout(() => [7, -7].forEach((n) => preCarregar(chamar, token, 'agendaSemana', { de: somarDias(inicioSemana, n) })), 700);
    return () => clearTimeout(t);
  }, [pronto, inicioSemana]); // eslint-disable-line react-hooks/exhaustive-deps

  const equipeBalcao = pode(membro, 'admin', 'recepcao');
  // quem só dá aula (não atende serviços) abre a agenda direto em "Aulas e presença"
  const fazServicos = useFazServicos();
  // o Mês só existe no celular (no computador a grade da semana já mostra tudo)
  const vista = vistaEscolhida === 'mes' && !celular ? 'dia' : vistaEscolhida || (fazServicos === false ? 'aulas' : 'dia');

  const dados = useMemo(() => (pronto ? semana.aulas.filter((a) => a.data === dia) : null), [pronto, semana, dia]);
  const doDia = useMemo(() => (pronto ? {
    atendimentos: semana.atendimentos.filter((a) => a.data === dia),
    folgas: semana.folgas.filter((f) => f.data === dia),
    equipe: semana.equipe.map((e) => ({ ...e, turnos: e.dias?.[dia] || e.turnos || [] })),
  } : null), [pronto, semana, dia]);
  const modalidades = new Set((dados || []).map((a) => a.modalidade));
  const aulas = useMemo(() => (dados || []).filter((a) => filtro === 'Todas' || a.modalidade === filtro), [dados, filtro]);

  // tira da semana (segunda a domingo) com quantos atendimentos há em cada dia
  const tira = Array.from({ length: 7 }, (_, i) => somarDias(inicioSemana, i));
  const porDia = useMemo(() => {
    const c = {};
    if (pronto) semana.atendimentos.forEach((a) => { if (a.status !== 'cancelado') c[a.data] = (c[a.data] || 0) + 1; });
    return c;
  }, [pronto, semana]);
  // "7 atendimentos · 8 aulas · 19 alunos": cada número em destaque
  const n_ = (n, um, varios) => <span key={um}><strong>{n}</strong> {Number(n) === 1 ? um : varios}</span>;
  const resumo = () => {
    if (!pronto) return <span>Carregando…</span>;
    if (vista === 'semana') {
      const n = Object.values(porDia).reduce((a, b) => a + b, 0);
      return [n_(n, 'atendimento', 'atendimentos'), n_(semana.aulas.length, 'aula', 'aulas'), <span key="s" className="ag-resumo__alunos">na semana</span>];
    }
    const n = porDia[dia] || 0;
    const alunos = dados.reduce((t, a) => t + a.ocupadosQtd, 0);
    // quem só dá aula não vê "0 atendimentos"
    if (fazServicos === false) return [n_(dados.length, 'aula', 'aulas'), dados.length > 0 && n_(alunos, 'aluno', 'alunos')];
    return [n_(n, 'atendimento', 'atendimentos'), n_(dados.length, 'aula', 'aulas'), dados.length > 0 && <span key="al" className="ag-resumo__alunos"><strong>{alunos}</strong> {alunos === 1 ? 'aluno' : 'alunos'}</span>];
  };

  // atendimento novo, remarcado ou mudado: aparece na hora e a semana se atualiza por trás
  // semRecarregar: mudança mostrada antes da resposta do servidor (buscar a semana agora traria a versão velha)
  const aplicar = (a, semRecarregar) => {
    if (a?.id) {
      setDados((s) => {
        if (!s) return s;
        const fimSemana = somarDias(s.de, (s.dias || 7) - 1);
        const fica = a.status !== 'cancelado' && a.data >= s.de && a.data <= fimSemana;
        const lista = s.atendimentos.filter((x) => x.id !== a.id).concat(fica ? [a] : []);
        return { ...s, atendimentos: lista.sort((x, y) => (x.data + x.hora).localeCompare(y.data + y.hora)) };
      });
    }
    if (semRecarregar !== true) recarregar();
  };

  useEffect(() => {
    // abre sozinha a aula que está acontecendo agora
    if (!dados || Object.keys(abertas).length) return;
    const agora = Date.now();
    const atualAgora = dados.find((a) => {
      const [h, m] = a.hora.split(':').map(Number);
      const [y, mo, d] = a.data.split('-').map(Number);
      const ini = new Date(y, mo - 1, d, h, m).getTime();
      return agora >= ini - 40 * 60e3 && agora <= ini + 60 * 60e3;
    });
    if (atualAgora) setAbertas({ [atualAgora.id]: true });
  }, [dados]); // eslint-disable-line react-hooks/exhaustive-deps

  // presença marca na hora (o servidor confirma por trás; se recusar, volta como estava e avisa)
  const marcarNaTela = (id, status) => setDados((s) => s && ({ ...s, aulas: s.aulas.map((a) => ({ ...a, reservas: a.reservas.map((x) => (x.id === id ? { ...x, status } : x)) })) }));
  async function presenca(r, status) {
    setAviso('');
    marcarNaTela(r.id, status);
    try {
      await chamar('presenca', { reservaId: r.id, status });
    } catch (e) {
      marcarNaTela(r.id, r.status);
      setAviso(`${r.nome}: ${e.message}`);
    }
  }

  async function cancelar(r) {
    setAviso('');
    try {
      await chamar('cancelarReserva', { reservaId: r.id });
      recarregar();
    } catch (e) {
      setAviso(e.message);
    }
  }

  const anda = vista === 'semana' ? 7 : 1;
  // setas do celular: dia, semana ou mês (no Mês, o dia escolhido vai para o dia 1 do outro mês)
  const ir = (n) => setDia(vista === 'mes' ? mesMais(dia, n) : somarDias(dia, n * anda));
  const hojeAqui = vista === 'mes' ? dia.slice(0, 7) === hojeIso().slice(0, 7) : vista === 'semana' ? segundaDe(dia) === segundaDe(hojeIso()) : dia === hojeIso();
  const tituloCel = vista === 'mes' ? tituloMes(dia)
    : vista === 'semana' ? (() => { const fim = somarDias(inicioSemana, 6); return `${Number(inicioSemana.slice(8))} ${MESES[Number(inicioSemana.slice(5, 7)) - 1]} – ${Number(fim.slice(8))} ${MESES[Number(fim.slice(5, 7)) - 1]}`; })()
      : `${DIAS_LONGOS[diaSemana(dia)]}, ${Number(dia.slice(8))} de ${MESES_LONGOS[Number(dia.slice(5, 7)) - 1]}`;
  // ← e → trocam de dia (de semana, na Semana) no computador, fora de campos e janelas
  useEffect(() => {
    const tecla = (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || vista === 'trocas') return;
      const alvo = e.target;
      if (alvo !== document.body && !alvo?.closest?.('.ag-tira')) return;
      if (document.querySelector('.b-modal, .bg, .b-menumais__lista')) return;
      e.preventDefault();
      setDia(somarDias(dia, e.key === 'ArrowLeft' ? -anda : anda));
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  const faixaDias = vista !== 'semana' && vista !== 'mes' && vista !== 'trocas' && <div className="b-tira ag-tira" role="tablist" aria-label="Dias da semana">
        {tira.map((d) => (
          <button key={d} type="button" role="tab" aria-selected={d === dia} onClick={() => setDia(d)} className={d === hojeIso() ? 'hoje' : ''}>
            <span className="b-so-leitor">{DIAS_LONGOS[diaSemana(d)]}, {Number(d.slice(8))}{porDia[d] ? ` · ${plural(porDia[d], 'atendimento', 'atendimentos')}` : ''}</span>
            <span aria-hidden="true">{DIAS[diaSemana(d)]}</span>
            <strong aria-hidden="true">{Number(d.slice(8))}</strong>
            <i className="ag-tira__n" aria-hidden="true">{porDia[d] || ''}</i>
          </button>
        ))}
      </div>;
  return (
    <>
      {vista === 'trocas' ? (
        <Cabecalho titulo="Trocas de profissional">{equipeBalcao ? 'Pedidos, trocas feitas e quem cobriu quem' : 'Seus pedidos e os horários que você cobre'}</Cabecalho>
      ) : celular ? (
        <div className="am-topo">
          <button type="button" className="am-seta" onClick={() => ir(-1)} aria-label={vista === 'mes' ? 'Mês anterior' : vista === 'semana' ? 'Semana anterior' : 'Dia anterior'}>‹</button>
          <div className="am-topo__centro">
            <h1>{comNumeros(tituloCel)}</h1>
            {vista !== 'mes' && <span className={`ag-resumo b-meta${pronto ? '' : ' ag-resumo--carregando'}`}>{resumo()}</span>}
          </div>
          {!hojeAqui && <button type="button" className="am-hoje" onClick={() => setDia(hojeIso())}>Hoje</button>}
          <button type="button" className="am-seta" onClick={() => ir(1)} aria-label={vista === 'mes' ? 'Próximo mês' : vista === 'semana' ? 'Próxima semana' : 'Próximo dia'}>›</button>
          {!equipeBalcao && <MenuMais rotulo="Mais opções" itens={[{ texto: 'Pedir substituição', acao: () => setPedir({}) }]} />}
        </div>
      ) : (<>
      <Cabecalho titulo={comNumeros(vista === 'semana' ? tituloSemana(dia) : `${DIAS_LONGOS[diaSemana(dia)]}, ${Number(dia.slice(8))} de ${MESES[Number(dia.slice(5, 7)) - 1]}`)}
        acoes={
          <div className="b-agenda__nav">
            <button type="button" className="botao botao--linha botao--p" onClick={() => setDia(somarDias(dia, -anda))} aria-label={vista === 'semana' ? 'Semana anterior' : 'Dia anterior'}>‹</button>
            <button type="button" className="botao botao--linha botao--p" onClick={() => setDia(hojeIso())} disabled={dia === hojeIso()}>Hoje</button>
            <button type="button" className="botao botao--linha botao--p" onClick={() => setDia(somarDias(dia, anda))} aria-label={vista === 'semana' ? 'Próxima semana' : 'Próximo dia'}>›</button>
            <input type="date" value={dia} onChange={(e) => e.target.value && setDia(e.target.value)} aria-label="Escolher data" className="b-data" />
          </div>
        }><span className={`ag-resumo b-meta${pronto ? '' : ' ag-resumo--carregando'}`}>{resumo()}</span></Cabecalho>

      {!celular && faixaDias}
      </>)}

      <div className="b-agenda__vista ag-barra-topo">
        <Segmento rotulo="O que mostrar" atual={vista} aoMudar={setVista} itens={[
          ['dia', <><span className="ag-longo">Agenda do dia</span><span className="ag-curto">Dia</span></>],
          ['semana', 'Semana'],
          ...(celular ? [['mes', 'Mês']] : []),
          ['aulas', <><span className="ag-longo">Aulas e presença</span><span className="ag-curto">Aulas</span></>],
          ['trocas', 'Trocas'],
        ]} />
        {vista === 'aulas' && (equipeBalcao || modalidades.size > 1) && (
          <div className="b-filtros">
            {['Todas', 'Yoga', 'Pilates'].map((f) => (
              <button key={f} type="button" className={`b-chip${filtro === f ? ' b-chip--ativo' : ''}`} onClick={() => setFiltro(f)}>{f}</button>
            ))}
          </div>
        )}
        <div className="ag-acoes" ref={setSlot}>
          {equipeBalcao && vista !== 'dia' && <button type="button" className="botao botao--linha botao--p" onClick={() => setNaoVem(true)}>Alguém não vem</button>}
          {!equipeBalcao && !celular && vista !== 'trocas' && <button type="button" className="botao botao--linha botao--p" onClick={() => setPedir({})}>Pedir substituição</button>}
        </div>
      </div>

      {celular && faixaDias}
      {vista === 'semana' && <AgendaSemana dia={dia} semana={pronto ? semana : null} erro={erro} aplicar={aplicar} slot={slot} celular={celular}
        aoAbrirDia={(d) => { setDia(d); setVista('dia'); }} />}
      {vista === 'mes' && <MesCelular dia={dia} pessoa={pessoa} balcao={equipeBalcao} aoEscolherPessoa={setPessoa} aoAbrirDia={(d) => { setDia(d); setVista('dia'); }} />}
      {vista === 'trocas' && <PainelTrocas dia={dia} aoMudar={recarregar} />}

      {vista === 'dia' && (
        <AgendaServicos dia={dia} dados={doDia} erro={erro} recarregar={recarregar} aplicar={aplicar} slot={slot} aoNaoVem={equipeBalcao ? () => setNaoVem(true) : null}
          abrirNovo={abrirNovoServico} abrirEspera={abrirEspera} celular={celular} pessoa={pessoa} aoEscolherPessoa={setPessoa} aulas={dados || []} aoAbrirAula={(a) => {
            setFiltro('Todas');
            setAbertas({ [a.id]: true });
            setVista('aulas');
            setTimeout(() => document.getElementById('aula-' + a.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
          }} />
      )}
      {vista === 'aulas' && (<>

      <Erro>{erro || aviso}</Erro>
      {!dados && !erro && <Esqueleto linhas={5} altura={64} />}
      {dados && aulas.length === 0 && (
        <Vazio titulo="Sem aulas neste dia" acao={pode(membro, 'admin') ? <Link className="botao botao--linha botao--p" to="/bancada/grade">Ver a grade de aulas</Link> : null}>
          {equipeBalcao ? 'Domingo, feriado ou dia bloqueado.' : 'Você não tem aula neste dia.'}
        </Vazio>
      )}

      <div className="ag-aulas">
        {aulas.map((a) => {
          const aberta = !!abertas[a.id];
          const presentes = a.reservas.filter((r) => r.status === 'check-in').length;
          const lotada = a.ocupadosQtd >= a.capacidade;
          const livres = Math.max(0, a.capacidade - a.ocupadosQtd);
          return (
            <article key={a.id} id={'aula-' + a.id} className={`ag-aula ag-aula--${a.modalidade.toLowerCase()}${aberta ? ' ag-aula--aberta' : ''}${a.passada ? ' ag-aula--passada' : ''}`}>
              <button type="button" className="ag-aula__topo" aria-expanded={aberta} onClick={() => setAbertas((x) => ({ ...x, [a.id]: !aberta }))}>
                <strong className="ag-aula__hora">{hora(a.hora)}</strong>
                <span className="ag-aula__info">
                  <span className="ag-aula__mod"><i aria-hidden="true" />{a.modalidade}<em>com {a.professor}</em></span>
                  {a.titular && <small className="ag-aula__troca">no lugar de {a.titular}</small>}
                  <Lugares total={a.capacidade} ocupados={a.ocupadosQtd} />
                </span>
                <span className="ag-aula__num">
                  <strong>{a.ocupadosQtd}<small>/{a.capacidade}</small></strong>
                  {a.passada ? <Tag tom={presentes ? 'ok' : 'neutro'}>{plural(presentes, 'presente', 'presentes')}</Tag>
                    : lotada ? <Tag tom="aviso">Lotada</Tag> : <Tag tom="ok">{plural(livres, 'livre', 'livres')}</Tag>}
                  {!a.passada && a.espera?.length > 0 && <Tag tom="ambar">{plural(a.espera.length, 'na espera', 'na espera')}</Tag>}
                </span>
                <span className="ag-aula__seta" aria-hidden="true" />
              </button>

              {aberta && (
                <div className="ag-aula__corpo">
                  {a.reservas.length === 0 && <p className="ag-aula__vazio">Ninguém reservou ainda.</p>}
                  <ul className="ag-res">
                    {a.reservas.map((r) => {
                      const st = STATUS_RESERVA[r.status] || [r.status, 'neutro'];
                      return (
                        <li key={r.id} className={`ag-res__item ag-res--${r.status}`}>
                          {a.modalidade === 'Yoga' ? (
                            <span className="ag-res__tapete" title="Tapete">{r.tapete || '–'}</span>
                          ) : (
                            // Pilates não tem tapete: o quadrado só marca presença (✓) ou falta (×)
                            <span className="ag-res__tapete ag-res__tapete--sem" aria-hidden="true">{r.status === 'check-in' ? '✓' : r.status === 'falta' ? '×' : iniciais(r.nome)}</span>
                          )}
                          <div className="ag-res__quem">
                            {/* recepção abre o cadastro pelo nome (profissional não recebe o CPF) */}
                            <strong>{equipeBalcao && r.cpf ? <Link to={`/bancada/alunos/${r.cpf}`} className="ag-res__nome">{r.nome}</Link> : r.nome}</strong>
                            <span className="ag-res__tags">
                              {r.primeiraAula && <Tag tom="ambar">1ª aula</Tag>}
                              {r.alerta && <Tag tom="alerta" title="A ficha de saúde tem pontos de atenção">saúde: atenção</Tag>}
                              {!r.ficha && <Tag tom="aviso">sem ficha</Tag>}
                              <Tag>{r.forma}</Tag>
                              {r.status === 'pendente' && <Tag tom="aviso">{st[0]}</Tag>}
                            </span>
                            <Alertas lista={r.alertas} compacto />
                          </div>
                          {r.status !== 'pendente' && (
                            <div className="ag-pres" role="group" aria-label={`Presença de ${r.nome}`}>
                              <button type="button" className={`ag-pres__botao${r.status === 'check-in' ? ' ag-pres__botao--sim' : ''}`}
                                onClick={() => presenca(r, r.status === 'check-in' ? 'reservado' : 'check-in')} aria-pressed={r.status === 'check-in'}>
                                <span aria-hidden="true">✓</span> Presente
                              </button>
                              <button type="button" className={`ag-pres__botao ag-pres__botao--falta${r.status === 'falta' ? ' ag-pres__botao--sim' : ''}`}
                                onClick={() => presenca(r, r.status === 'falta' ? 'reservado' : 'falta')} aria-pressed={r.status === 'falta'}>
                                <span aria-hidden="true">×</span> Faltou
                              </button>
                            </div>
                          )}
                          <div className="ag-res__mais">
                            {equipeBalcao && r.aPagar && (
                              <button type="button" className="botao botao--cheio botao--p" onClick={() => setReceber({ reserva: r, aula: a })}>Receber</button>
                            )}
                            <button type="button" className="botao botao--fantasma botao--p" onClick={() => setFicha({ reservaId: r.id, nome: r.nome })}>Ficha</button>
                            {r.whatsapp && (
                              <a className="ag-icone" href={linkWhats(r.whatsapp, `Olá, ${primeiro(r.nome)}! Aqui é da Casa Âmbar.`)} target="_blank" rel="noreferrer" aria-label={`WhatsApp de ${r.nome}`} title="WhatsApp">
                                <IconeWhatsapp tamanho={18} />
                              </a>
                            )}
                            {equipeBalcao && (
                              <BotaoAcao className="botao botao--fantasma botao--p ag-perigo" acao={() => cancelar(r)} confirmar={`Cancelar a reserva de ${r.nome}?`}>Cancelar</BotaoAcao>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {equipeBalcao && !a.passada && (a.espera?.length > 0 || a.ocupadosQtd >= a.capacidade) && (
                    <EsperaDaAula aula={a} aoAgendar={(x) => setAgendar({ ...a, alunoInicial: x })} aoPor={() => setEsperaAula(a)} aoMudar={recarregar} />
                  )}
                  {equipeBalcao && (
                    <div className="ag-aula__rodape">
                      <button type="button" className="botao botao--cheio botao--p" onClick={() => setAgendar(a)}>Agendar aluno</button>
                      <button type="button" className="botao botao--linha botao--p" onClick={() => setTrocar(a)}>Trocar quem dá a aula</button>
                    </div>
                  )}
                  {!equipeBalcao && !a.passada && !a.titular && (
                    <div className="ag-aula__rodape">
                      <button type="button" className="botao botao--linha botao--p" onClick={() => setPedir({ item: { tipo: 'aula', ref: a.id, titulo: a.modalidade, data: a.data, hora: a.hora } })}>Pedir substituição desta aula</button>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      </>)}

      {esperaAula && <EntrarEsperaAula aula={esperaAula} aoFechar={() => setEsperaAula(null)} aoSalvar={() => { setEsperaAula(null); recarregar(); }} />}
      {receber && <ReceberAula {...receber} aoFechar={() => setReceber(null)} aoReceber={() => { setReceber(null); recarregar(); }} />}
      {agendar && <Agendar aula={agendar} aoFechar={() => setAgendar(null)} aoAgendar={() => { setAgendar(null); recarregar(); setAbertas((x) => ({ ...x, [agendar.id]: true })); }} />}
      {ficha && <FichaModal {...ficha} aoFechar={() => setFicha(null)} />}
      {trocar && <TrocaProfissional tipo="aula" id={trocar.id} aoFechar={() => setTrocar(null)} aoTerminar={() => { setTrocar(null); recarregar(); }} />}
      {naoVem && <AlguemNaoVem dia={dia} aoFechar={() => setNaoVem(false)} aoTerminar={() => { setNaoVem(false); recarregar(); }} />}
      {pedir && <PedirSubstituicao dia={dia} item={pedir.item} aoFechar={() => setPedir(null)} aoEnviar={() => { setPedir(null); recarregar(); }} />}
    </>
  );
}

// "Semana de 20 a 26 de out" (ou "27 de out a 2 de nov")
function tituloSemana(dia) {
  const ini = somarDias(dia, -((diaSemana(dia) + 6) % 7));
  const fim = somarDias(ini, 6);
  const mes = (d) => MESES[Number(d.slice(5, 7)) - 1];
  return ini.slice(5, 7) === fim.slice(5, 7)
    ? `Semana de ${Number(ini.slice(8))} a ${Number(fim.slice(8))} de ${mes(fim)}`
    : `Semana de ${Number(ini.slice(8))} de ${mes(ini)} a ${Number(fim.slice(8))} de ${mes(fim)}`;
}

const FORMAS = [
  ['credito', 'Plano do aluno', 'desconta do plano ou das aulas avulsas'],
  ['pagar', 'Aula avulsa · paga depois', 'reserva a vaga; recebe na aula ou na comanda'],
  ['avulsa', 'Aula avulsa · já pagou', 'registra a venda agora'],
  ['wellhub', 'Wellhub', 'check-in no app ao chegar'],
  ['cortesia', 'Cortesia', 'aula grátis, sem descontar'],
];
const METODOS = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito'];

// lista de espera dentro da aula: quem espera, aviso por WhatsApp, agendar quando abrir vaga
function EsperaDaAula({ aula, aoAgendar, aoPor, aoMudar }) {
  const { chamar } = useBancada();
  const lista = aula.espera || [];
  const temVaga = aula.ocupadosQtd < aula.capacidade;
  const quando = `${DIAS_LONGOS[diaSemana(aula.data)].toLowerCase()}, ${aula.data.slice(8)}/${aula.data.slice(5, 7)}`;
  const mudar = async (x, status) => { await chamar('atualizarEspera', { id: x.id, status }); aoMudar(); };
  return (
    <section className="ag-espera">
      <header className="ag-espera__topo">
        <h3 className="ag-espera__titulo">Lista de espera{lista.length > 0 && <span className="ag-contador">{lista.length}</span>}
          <Ajuda titulo="Lista de espera">Quem entra na lista recebe e-mail quando abrir uma vaga. Aqui a recepção também pode avisar pelo WhatsApp.</Ajuda></h3>
        <button type="button" className="botao botao--fantasma botao--p" onClick={aoPor}>+ Pôr na lista</button>
      </header>
      {lista.length === 0 && <p className="ag-aula__vazio">Ninguém esperando.</p>}
      {lista.length > 0 && temVaga && <Aviso tom="ok">Abriu vaga: avise quem espera, por ordem de chegada.</Aviso>}
      {lista.length > 0 && (
        <ol className="ag-esp">
          {lista.map((x) => (
            <li key={x.id}>
              <span className="ag-esp__quem"><strong>{x.nome}</strong>
                <small>{x.origem === 'site' ? 'pelo site' : 'pela recepção'}{x.status === 'avisado' ? ' · aviso enviado' : ''}</small></span>
              <span className="ag-esp__acoes">
                {x.whatsapp && (
                  <a className="botao botao--linha botao--p com-icone" href={linkWhats(x.whatsapp, `Olá, ${primeiro(x.nome)}! Abriu uma vaga na aula de ${aula.modalidade} de ${quando} às ${hora(aula.hora)}, com ${aula.professor}. Quer que a gente reserve para você?`)}
                    target="_blank" rel="noreferrer" onClick={() => x.status !== 'avisado' && mudar(x, 'avisado').catch(() => {})}><IconeWhatsapp tamanho={15} /> Avisar</a>
                )}
                {temVaga && <button type="button" className="botao botao--cheio botao--p" onClick={() => aoAgendar(x)}>Agendar</button>}
                <BotaoAcao className="botao botao--fantasma botao--p ag-perigo" confirmar={`Tirar ${x.nome} da lista de espera?`} acao={() => mudar(x, 'desistiu')}>Tirar</BotaoAcao>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function EntrarEsperaAula({ aula, aoFechar, aoSalvar }) {
  const { chamar } = useBancada();
  const [erro, setErro] = useState('');
  const excluir = [...aula.reservas.map((r) => r.cpf), ...(aula.espera || []).map((x) => x.cpf)].filter(Boolean);
  return (
    <Modal rotulo={`${aula.modalidade} · ${hora(aula.hora)} · ${aula.professor}`} titulo="Lista de espera" aoFechar={aoFechar}>
      <div className="b-form">
        <Passo titulo="Quem entra na lista" ajuda="Quando alguém cancelar, quem está na lista recebe e-mail na hora, e a vaga aparece na aula para a recepção avisar pelo WhatsApp.">
          <BuscaAluno autoFocus excluir={excluir} motivoExcluir="já está na aula ou na lista" aoEscolher={async (a) => {
            setErro('');
            try { await chamar('entrarEspera', { tipo: 'aula', aulaId: aula.id, cpf: a.cpf }); aoSalvar(); } catch (e) { setErro(e.message); }
          }} />
        </Passo>
        <Erro>{erro}</Erro>
      </div>
    </Modal>
  );
}

// aula reservada para pagar depois: recebe agora (a venda da aula avulsa entra no caixa de hoje)
function ReceberAula({ reserva, aula, aoFechar, aoReceber }) {
  const { chamar } = useBancada();
  const [pg, setPg] = useState(PAGAMENTO_INICIAL);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  async function confirmar() {
    setErro('');
    setEnviando(true);
    try {
      await chamar('receberAula', { reservaId: reserva.id, ...pg });
      aoReceber();
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }
  return (
    <Modal rotulo={`${aula.modalidade} · ${hora(aula.hora)} · ${reserva.nome}`} titulo="Receber a aula" aoFechar={aoFechar}>
      <div className="b-form">
        <Aviso acao={<Ajuda titulo="Receber a aula">Aula avulsa reservada para pagar depois. Se for pagar junto com outras coisas, abra uma comanda e inclua a aula avulsa: ela quita esta reserva.</Ajuda>}>
          A venda entra em Vendas e no caixa de hoje.
        </Aviso>
        <CamposPagamento metodos={METODOS} p={pg} aoMudar={setPg} />
        <Erro>{erro}</Erro>
        <button type="button" className="botao botao--cheio" disabled={enviando || faltaPagamento(pg)} onClick={confirmar}>{enviando ? 'Recebendo…' : 'Receber'}</button>
      </div>
    </Modal>
  );
}

function Agendar({ aula, aoFechar, aoAgendar }) {
  const { chamar } = useBancada();
  const [aluno, setAluno] = useState(null);
  // veio da lista de espera: já abre com a pessoa escolhida (busca o plano dela)
  useEffect(() => {
    if (!aula.alunoInicial?.cpf) return undefined;
    let vivo = true;
    chamar('alunos', { busca: aula.alunoInicial.cpf }).then((l) => { if (vivo) setAluno(l.find((x) => x.cpf === aula.alunoInicial.cpf) || null); }).catch(() => {});
    return () => { vivo = false; };
  }, [aula, chamar]);
  const [tapete, setTapete] = useState(null);
  const [forma, setForma] = useState('credito');
  const [pg, setPg] = useState(PAGAMENTO_INICIAL);
  const [encaixe, setEncaixe] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const yoga = aula.modalidade === 'Yoga';
  const ocupados = aula.reservas.map((r) => r.tapete).filter(Boolean);
  const lotada = aula.ocupadosQtd >= aula.capacidade;

  async function confirmar() {
    setErro('');
    setEnviando(true);
    try {
      await chamar('agendar', { aulaId: aula.id, cpf: aluno.cpf, tapete, forma, ...pg, encaixe });
      aoAgendar();
    } catch (e) {
      setErro(e.message);
      if (e.codigo === 'SEM_CREDITO') setForma('pagar');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal rotulo={`${aula.modalidade} · ${hora(aula.hora)} · ${aula.professor}`} titulo="Agendar aluno" aoFechar={aoFechar}>
      {!aluno ? (
        <Passo titulo="Quem vai" acao={<Ajuda titulo="Sem cadastro?">Cadastre em Clientes → Novo cliente e volte aqui.</Ajuda>}>
          <BuscaAluno aoEscolher={setAluno} autoFocus excluir={aula.reservas.map((r) => r.cpf).filter(Boolean)} />
        </Passo>
      ) : (
        <div className="b-form">
          <ClienteEscolhido nome={aluno.nome} detalhe={`${aluno.plano || 'sem plano ativo'}${!aluno.ficha ? ' · sem ficha de saúde' : ''}`} aoTrocar={() => setAluno(null)} />

          {yoga && (
            <Passo titulo="Tapete">
              <fieldset className="b-tapetes">
                <legend className="ag-vh">Tapete</legend>
                <div className="b-tapetes__sala">
                  {/* encaixe em aula lotada: tapetes extras depois da capacidade */}
                  {Array.from({ length: aula.capacidade + (lotada && encaixe ? 3 : 0) }, (_, i) => i + 1).map((n) => (
                    <button key={n} type="button" disabled={ocupados.includes(n)} aria-pressed={tapete === n} onClick={() => setTapete(n)}
                      title={n > aula.capacidade ? 'Tapete extra (encaixe)' : undefined}>{n}</button>
                  ))}
                </div>
                <span className="b-suave">frente da sala</span>
              </fieldset>
            </Passo>
          )}

          <Passo titulo="Como será paga">
            <fieldset className="b-opcoes">
              <legend className="ag-vh">Como esta aula será paga</legend>
              {FORMAS.map(([id, t, d]) => (
                <label key={id} className={forma === id ? 'ativo' : ''}>
                  <input type="radio" name="forma" checked={forma === id} onChange={() => setForma(id)} />
                  <span><strong>{t}</strong><small>{d}</small></span>
                </label>
              ))}
            </fieldset>
            {forma === 'avulsa' && <CamposPagamento metodos={METODOS} p={pg} aoMudar={setPg} />}
          </Passo>
          {lotada && (
            <label className="b-check">
              <input type="checkbox" checked={encaixe} onChange={(e) => setEncaixe(e.target.checked)} /> Aula lotada: fazer encaixe mesmo assim
            </label>
          )}
          <Erro>{erro}</Erro>
          <button type="button" className="botao botao--cheio" disabled={enviando || (yoga && !tapete) || (lotada && !encaixe) || (forma === 'avulsa' && faltaPagamento(pg))} onClick={confirmar}>
            {enviando ? 'Agendando…' : yoga && !tapete ? 'Escolha o tapete' : 'Confirmar agendamento'}
          </button>
        </div>
      )}
    </Modal>
  );
}

const PARQ = [
  'Problema de coração / só com supervisão',
  'Dor no peito na atividade física',
  'Dor no peito no último mês',
  'Tontura ou perda de consciência',
  'Problema ósseo ou articular',
  'Remédio para pressão ou coração',
  'Outra razão para não praticar',
];

export function FichaModal({ reservaId, cpf, nome, aoFechar }) {
  const { dados, erro, carregando } = useDados('ficha', reservaId ? { reservaId } : { cpf });
  const f = dados?.ficha;
  return (
    <Modal rotulo="Ficha de saúde" titulo={dados?.nome || nome} aoFechar={aoFechar} largo>
      <Erro>{erro}</Erro>
      {carregando && <Carregando />}
      {dados && !f && <Vazio titulo="Ficha não preenchida">A ficha é preenchida na Área do aluno → Ficha de saúde. Peça para preencher antes da aula.</Vazio>}
      {f && <FichaConteudo f={f} />}
    </Modal>
  );
}

export function FichaConteudo({ f }) {
  const sims = PARQ.map((t, i) => [t, f['parq_' + (i + 1)]]).filter(([, v]) => v === 'SIM');
  const item = (rotulo, valor) => (valor && String(valor).trim() ? <div className="b-ficha__item"><span className="rotulo">{rotulo}</span><p>{valor}</p></div> : null);
  return (
    <div className="b-ficha">
      {sims.length > 0 ? (
        <div className="b-ficha__alerta">
          <strong>Atenção: respondeu SIM no PAR-Q</strong>
          <ul>{sims.map(([t]) => <li key={t}>{t}</li>)}</ul>
          <span>Recomenda-se liberação médica.</span>
        </div>
      ) : (
        <p className="b-ficha__ok">PAR-Q sem restrições.</p>
      )}
      <div className="b-ficha__grade">
        {item('Condições de saúde', [f.comorbidades, f.comorbidade_outra].filter(Boolean).join(', '))}
        {item('Lesões ou dores atuais', f.lesoes)}
        {item('Medicamentos de uso contínuo', f.medicamentos)}
        {item('Cirurgias recentes', f.cirurgias)}
        {item('Alergias', f.alergias)}
        {f.gestante === 'sim' && item('Gestante', 'Sim' + (f.gestante_semanas ? ` · ${f.gestante_semanas} semanas` : ''))}
        {item('Observações para a aula', f.observacoes)}
        {item('Pratica atividade física', f.atividade_regular)}
      </div>
      <div className="b-ficha__emergencia">
        <span className="rotulo">Contato de emergência</span>
        <p>
          <strong>{f.emergencia_nome}</strong> {f.emergencia_parentesco && `(${f.emergencia_parentesco})`} ·{' '}
          <a href={`tel:${f.emergencia_telefone}`}>{telFmt(f.emergencia_telefone)}</a>
        </p>
        {f.plano_saude && <p className="b-suave">Plano de saúde: {f.plano_saude}</p>}
      </div>
      <p className="b-suave">Preenchida em {String(f.preenchida_em).slice(0, 10).split('-').reverse().join('/')}
        {/^https?:/.test(f.pdf) && <> · <a href={f.pdf} target="_blank" rel="noreferrer">abrir PDF</a></>}</p>
    </div>
  );
}
