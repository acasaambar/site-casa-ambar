import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useBancada, pode } from './sessao.jsx';
import { useDados, preCarregar, segundaDe, Alertas, useAtualizarSozinho, useEsquecerPedidoDaRota, useFazServicos, CamposPagamento, PAGAMENTO_INICIAL, faltaPagamento, Carregando, Erro, Cabecalho, Tag, Modal, BuscaAluno, BotaoAcao, Vazio, STATUS_RESERVA, hora, hojeIso, somarDias, diaSemana,
  DIAS, DIAS_LONGOS, MESES, linkWhats, primeiro, telFmt, plural } from './ui.jsx';
import { Ocupacao } from './Graficos.jsx';
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
  const [filtro, setFiltro] = useState('Todas');
  const [abertas, setAbertas] = useState(() => (local.state?.abrir ? { [local.state.abrir]: true } : {}));
  const [agendar, setAgendar] = useState(null);
  const [ficha, setFicha] = useState(null);
  const [aviso, setAviso] = useState('');
  const [vistaEscolhida, setVista] = useState(local.state?.abrir || local.state?.vista === 'aulas' ? 'aulas' : local.state?.vista === 'trocas' ? 'trocas'
    : local.state?.vista === 'semana' ? 'semana' : local.state?.novoServico || local.state?.espera || local.state?.vista === 'dia' ? 'dia' : null);
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
  const vista = vistaEscolhida || (fazServicos === false ? 'aulas' : 'dia');

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
  const resumo = () => {
    if (!pronto) return 'Carregando…';
    if (vista === 'semana') {
      const n = Object.values(porDia).reduce((a, b) => a + b, 0);
      return `${plural(n, 'atendimento', 'atendimentos')} e ${plural(semana.aulas.length, 'aula', 'aulas')} na semana`;
    }
    const n = porDia[dia] || 0;
    const alunos = dados.reduce((t, a) => t + a.ocupadosQtd, 0);
    // quem só dá aula não vê "0 atendimentos"
    if (fazServicos === false) return `${plural(dados.length, 'aula', 'aulas')}${dados.length ? ` com ${plural(dados.reduce((t, a) => t + a.ocupadosQtd, 0), 'aluno', 'alunos')}` : ''}`;
    return (<>
      {plural(n, 'atendimento', 'atendimentos')} · {plural(dados.length, 'aula', 'aulas')}
      {dados.length > 0 && <span className="ag-resumo__alunos"> com {plural(alunos, 'aluno', 'alunos')}</span>}
    </>);
  };

  // atendimento novo, remarcado ou mudado: aparece na hora e a semana se atualiza por trás
  const aplicar = (a) => {
    if (a?.id) {
      setDados((s) => {
        if (!s) return s;
        const fimSemana = somarDias(s.de, (s.dias || 7) - 1);
        const fica = a.status !== 'cancelado' && a.data >= s.de && a.data <= fimSemana;
        const lista = s.atendimentos.filter((x) => x.id !== a.id).concat(fica ? [a] : []);
        return { ...s, atendimentos: lista.sort((x, y) => (x.data + x.hora).localeCompare(y.data + y.hora)) };
      });
    }
    recarregar();
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

  async function presenca(r, status) {
    setAviso('');
    try {
      await chamar('presenca', { reservaId: r.id, status });
      setDados((s) => ({ ...s, aulas: s.aulas.map((a) => ({ ...a, reservas: a.reservas.map((x) => (x.id === r.id ? { ...x, status } : x)) })) }));
    } catch (e) {
      setAviso(e.message);
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
  return (
    <>
      {vista === 'trocas' ? (
        <Cabecalho titulo="Trocas de profissional">{equipeBalcao ? 'Pedidos da equipe, trocas feitas e quem cobriu quem.' : 'Seus pedidos de substituição e os horários que você cobre.'}</Cabecalho>
      ) : (<>
      <Cabecalho titulo={comNumeros(vista === 'semana' ? tituloSemana(dia) : `${DIAS_LONGOS[diaSemana(dia)]}, ${Number(dia.slice(8))} de ${MESES[Number(dia.slice(5, 7)) - 1]}`)}
        acoes={
          <div className="b-agenda__nav">
            <button type="button" className="botao botao--linha botao--p" onClick={() => setDia(somarDias(dia, -anda))} aria-label={vista === 'semana' ? 'Semana anterior' : 'Dia anterior'}>‹</button>
            <button type="button" className="botao botao--linha botao--p" onClick={() => setDia(hojeIso())} disabled={dia === hojeIso()}>Hoje</button>
            <button type="button" className="botao botao--linha botao--p" onClick={() => setDia(somarDias(dia, anda))} aria-label={vista === 'semana' ? 'Próxima semana' : 'Próximo dia'}>›</button>
            <input type="date" value={dia} onChange={(e) => e.target.value && setDia(e.target.value)} aria-label="Escolher data" className="b-data" />
          </div>
        }><span className={`ag-resumo${pronto ? '' : ' ag-resumo--carregando'}`}>{resumo()}</span></Cabecalho>

      {vista !== 'semana' && <div className="b-tira ag-tira" role="tablist" aria-label="Dias da semana">
        {tira.map((d) => (
          <button key={d} type="button" role="tab" aria-selected={d === dia} onClick={() => setDia(d)} className={d === hojeIso() ? 'hoje' : ''}
            aria-label={`${DIAS_LONGOS[diaSemana(d)]}, ${Number(d.slice(8))}${porDia[d] ? ` · ${plural(porDia[d], 'atendimento', 'atendimentos')}` : ''}`}>
            <span>{DIAS[diaSemana(d)]}</span>
            <strong>{Number(d.slice(8))}</strong>
            <i className="ag-tira__n" aria-hidden="true">{porDia[d] || ''}</i>
          </button>
        ))}
      </div>}
      </>)}

      <div className="b-agenda__vista ag-barra-topo">
        <div className="b-segmento" role="tablist" aria-label="O que mostrar">
          <button type="button" role="tab" aria-selected={vista === 'dia'} onClick={() => setVista('dia')}><span className="ag-longo">Agenda do dia</span><span className="ag-curto">Dia</span></button>
          <button type="button" role="tab" aria-selected={vista === 'semana'} onClick={() => setVista('semana')}>Semana</button>
          <button type="button" role="tab" aria-selected={vista === 'aulas'} onClick={() => setVista('aulas')}><span className="ag-longo">Aulas e presença</span><span className="ag-curto">Aulas</span></button>
          <button type="button" role="tab" aria-selected={vista === 'trocas'} onClick={() => setVista('trocas')}>Trocas</button>
        </div>
        {vista === 'aulas' && (equipeBalcao || modalidades.size > 1) && (
          <div className="b-filtros">
            {['Todas', 'Yoga', 'Pilates'].map((f) => (
              <button key={f} type="button" className={`b-chip${filtro === f ? ' b-chip--ativo' : ''}`} onClick={() => setFiltro(f)}>{f}</button>
            ))}
          </div>
        )}
        <div className="ag-acoes" ref={setSlot}>
          {equipeBalcao && vista !== 'dia' && <button type="button" className="botao botao--linha botao--p" onClick={() => setNaoVem(true)}>Alguém não vem</button>}
          {!equipeBalcao && vista !== 'trocas' && <button type="button" className="botao botao--linha botao--p" onClick={() => setPedir({})}>Pedir substituição</button>}
        </div>
      </div>

      {vista === 'semana' && <AgendaSemana dia={dia} semana={pronto ? semana : null} erro={erro} aplicar={aplicar} slot={slot}
        aoAbrirDia={(d) => { setDia(d); setVista('dia'); }} />}
      {vista === 'trocas' && <PainelTrocas dia={dia} aoMudar={recarregar} />}

      {vista === 'dia' && (
        <AgendaServicos dia={dia} dados={doDia} erro={erro} recarregar={recarregar} aplicar={aplicar} slot={slot} aoNaoVem={equipeBalcao ? () => setNaoVem(true) : null}
          abrirNovo={abrirNovoServico} abrirEspera={abrirEspera} aulas={dados || []} aoAbrirAula={(a) => {
            setFiltro('Todas');
            setAbertas({ [a.id]: true });
            setVista('aulas');
            setTimeout(() => document.getElementById('aula-' + a.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
          }} />
      )}
      {vista === 'aulas' && (<>

      <Erro>{erro || aviso}</Erro>
      {!dados && !erro && <Carregando texto="Carregando as aulas" />}
      {dados && aulas.length === 0 && (
        <Vazio titulo="Sem aulas neste dia">{equipeBalcao ? 'Domingo, feriado ou dia bloqueado. Confira em Catálogo → Grade de aulas.' : 'Você não tem aula neste dia.'}</Vazio>
      )}

      <div className="b-aulas">
        {aulas.map((a) => {
          const aberta = !!abertas[a.id];
          const presentes = a.reservas.filter((r) => r.status === 'check-in').length;
          return (
            <article key={a.id} id={'aula-' + a.id} className={`b-aula b-aula--${a.modalidade.toLowerCase()}${aberta ? ' b-aula--aberta' : ''}`}>
              <button type="button" className="b-aula__topo" aria-expanded={aberta} onClick={() => setAbertas((x) => ({ ...x, [a.id]: !aberta }))}>
                <strong className="b-aula__hora">{hora(a.hora)}</strong>
                <span className="b-aula__info">
                  <span className="b-aula__mod">{a.modalidade} <em>com {a.professor}</em>{a.titular && <small className="tr-nolugar">no lugar de {a.titular}</small>}</span>
                  <Ocupacao valor={a.ocupadosQtd} total={a.capacidade} />
                </span>
                <span className="b-aula__num">
                  <strong>{a.ocupadosQtd}/{a.capacidade}</strong>
                  <small>{a.passada ? plural(presentes, 'presente', 'presentes') : a.ocupadosQtd >= a.capacidade ? 'lotada' : plural(a.capacidade - a.ocupadosQtd, 'livre', 'livres')}</small>
                  {!a.passada && a.espera?.length > 0 && <small className="b-aula__espera">{plural(a.espera.length, 'na espera', 'na espera')}</small>}
                </span>
                <span className="b-aula__seta" aria-hidden="true">{aberta ? '−' : '+'}</span>
              </button>

              {aberta && (
                <div className="b-aula__corpo">
                  {a.reservas.length === 0 && <p className="b-suave">Ninguém reservou ainda.</p>}
                  <ul className="b-reservas">
                    {a.reservas.map((r) => {
                      const st = STATUS_RESERVA[r.status] || [r.status, 'neutro'];
                      return (
                        <li key={r.id} className={`b-reserva b-reserva--${r.status}`}>
                          {a.modalidade === 'Yoga' ? (
                            <span className="b-reserva__tapete" title="Tapete">{r.tapete || '–'}</span>
                          ) : (
                            // Pilates não tem tapete: o quadrado só marca presença (✓) ou falta (×)
                            <span className="b-reserva__tapete b-reserva__tapete--sem" aria-hidden="true">{r.status === 'check-in' ? '✓' : r.status === 'falta' ? '×' : ''}</span>
                          )}
                          <div className="b-reserva__quem">
                            {/* recepção abre o cadastro pelo nome (profissional não recebe o CPF) */}
                            <strong>{equipeBalcao && r.cpf ? <Link to={`/bancada/alunos/${r.cpf}`} className="b-reserva__nome">{r.nome}</Link> : r.nome}</strong>
                            <span className="b-reserva__tags">
                              {r.primeiraAula && <Tag tom="ambar">1ª aula</Tag>}
                              {r.alerta && <Tag tom="alerta" title="A ficha de saúde tem pontos de atenção">saúde: atenção</Tag>}
                              {!r.ficha && <Tag tom="aviso">sem ficha</Tag>}
                              <Tag>{r.forma}</Tag>
                              {r.status === 'pendente' && <Tag tom="aviso">{st[0]}</Tag>}
                            </span>
                            <Alertas lista={r.alertas} compacto />
                          </div>
                          {r.status !== 'pendente' && (
                            <div className="b-reserva__acoes">
                              <button type="button" className={`b-presenca${r.status === 'check-in' ? ' b-presenca--sim' : ''}`}
                                onClick={() => presenca(r, r.status === 'check-in' ? 'reservado' : 'check-in')} aria-pressed={r.status === 'check-in'}>
                                ✓ <span>Presente</span>
                              </button>
                              <button type="button" className={`b-presenca b-presenca--falta${r.status === 'falta' ? ' b-presenca--sim' : ''}`}
                                onClick={() => presenca(r, r.status === 'falta' ? 'reservado' : 'falta')} aria-pressed={r.status === 'falta'}>
                                × <span>Faltou</span>
                              </button>
                            </div>
                          )}
                          <div className="b-reserva__mais">
                            <button type="button" className="link-acao" onClick={() => setFicha({ reservaId: r.id, nome: r.nome })}>ficha</button>
                            {r.whatsapp && (
                              <a className="link-acao" href={linkWhats(r.whatsapp, `Olá, ${primeiro(r.nome)}! Aqui é da Casa Âmbar.`)} target="_blank" rel="noreferrer" aria-label={`WhatsApp de ${r.nome}`}>
                                <IconeWhatsapp tamanho={15} />
                              </a>
                            )}
                            {equipeBalcao && (
                              <BotaoAcao className="link-sair" acao={() => cancelar(r)} confirmar={`Cancelar a reserva de ${r.nome}?`}>cancelar</BotaoAcao>
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
                    <div className="b-botoes b-aula__rodape">
                      <button type="button" className="botao botao--cheio botao--p b-aula__agendar" onClick={() => setAgendar(a)}>Agendar aluno</button>
                      <button type="button" className="botao botao--linha botao--p" onClick={() => setTrocar(a)}>Trocar quem dá a aula</button>
                    </div>
                  )}
                  {!equipeBalcao && !a.passada && !a.titular && (
                    <div className="b-botoes b-aula__rodape">
                      <button type="button" className="link-acao" onClick={() => setPedir({ item: { tipo: 'aula', ref: a.id, titulo: a.modalidade, data: a.data, hora: a.hora } })}>Pedir substituição desta aula</button>
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
  ['credito', 'Plano do aluno', 'desconta do plano ou das aulas avulsas dele'],
  ['avulsa', 'Vender aula avulsa', 'registra a venda e já agenda'],
  ['wellhub', 'Wellhub', 'check-in no app Wellhub ao chegar'],
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
    <div className="esp-aula">
      <div className="esp-aula__topo">
        <span className="rotulo">Lista de espera{lista.length ? ` · ${lista.length}` : ''}</span>
        <button type="button" className="link-acao" onClick={aoPor}>+ pôr na lista</button>
      </div>
      {lista.length === 0 && <p className="b-suave">Ninguém esperando. Quem entrar recebe e-mail quando abrir uma vaga.</p>}
      {lista.length > 0 && temVaga && <p className="esp-aula__vaga">Abriu vaga: avise quem está esperando (por ordem de chegada).</p>}
      {lista.length > 0 && (
        <ol className="esp-lista">
          {lista.map((x) => (
            <li key={x.id}>
              <span className="esp-lista__quem"><strong>{x.nome}</strong>
                <small>{x.origem === 'site' ? 'pelo site' : 'pela recepção'}{x.status === 'avisado' ? ' · aviso enviado' : ''}</small></span>
              <span className="esp-lista__acoes">
                {x.whatsapp && (
                  <a className="link-acao com-icone" href={linkWhats(x.whatsapp, `Olá, ${primeiro(x.nome)}! Abriu uma vaga na aula de ${aula.modalidade} de ${quando} às ${hora(aula.hora)}, com ${aula.professor}. Quer que a gente reserve para você?`)}
                    target="_blank" rel="noreferrer" onClick={() => x.status !== 'avisado' && mudar(x, 'avisado').catch(() => {})}><IconeWhatsapp tamanho={14} /> Avisar</a>
                )}
                {temVaga && <button type="button" className="link-acao" onClick={() => aoAgendar(x)}>Agendar</button>}
                <BotaoAcao className="link-sair" confirmar={`Tirar ${x.nome} da lista de espera?`} acao={() => mudar(x, 'desistiu')}>tirar</BotaoAcao>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function EntrarEsperaAula({ aula, aoFechar, aoSalvar }) {
  const { chamar } = useBancada();
  const [erro, setErro] = useState('');
  const excluir = [...aula.reservas.map((r) => r.cpf), ...(aula.espera || []).map((x) => x.cpf)].filter(Boolean);
  return (
    <Modal rotulo={`${aula.modalidade} · ${hora(aula.hora)} · ${aula.professor}`} titulo="Lista de espera" aoFechar={aoFechar}>
      <div className="b-form">
        <p className="b-suave">Quando alguém cancelar, quem está na lista recebe e-mail na hora, e a vaga aparece aqui para a recepção avisar pelo WhatsApp.</p>
        <BuscaAluno autoFocus excluir={excluir} motivoExcluir="já está na aula ou na lista" aoEscolher={async (a) => {
          setErro('');
          try { await chamar('entrarEspera', { tipo: 'aula', aulaId: aula.id, cpf: a.cpf }); aoSalvar(); } catch (e) { setErro(e.message); }
        }} />
        <Erro>{erro}</Erro>
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
      if (e.codigo === 'SEM_CREDITO') setForma('avulsa');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal rotulo={`${aula.modalidade} · ${hora(aula.hora)} · ${aula.professor}`} titulo="Agendar aluno" aoFechar={aoFechar}>
      {!aluno ? (
        <>
          <BuscaAluno aoEscolher={setAluno} autoFocus excluir={aula.reservas.map((r) => r.cpf).filter(Boolean)} />
          <p className="b-suave b-nota">Ainda sem cadastro? Cadastre em <strong>Clientes → Novo cliente</strong> e volte aqui.</p>
        </>
      ) : (
        <div className="b-form">
          <div className="b-escolhido">
            <div>
              <strong>{aluno.nome}</strong>
              <span>{aluno.plano || 'sem plano ativo'}{!aluno.ficha ? ' · sem ficha de saúde' : ''}</span>
            </div>
            <button type="button" className="link-sair" onClick={() => setAluno(null)}>trocar</button>
          </div>

          {yoga && (
            <fieldset className="b-tapetes">
              <legend className="rotulo">Tapete</legend>
              <div className="b-tapetes__sala">
                {/* encaixe em aula lotada: tapetes extras depois da capacidade */}
                {Array.from({ length: aula.capacidade + (lotada && encaixe ? 3 : 0) }, (_, i) => i + 1).map((n) => (
                  <button key={n} type="button" disabled={ocupados.includes(n)} aria-pressed={tapete === n} onClick={() => setTapete(n)}
                    title={n > aula.capacidade ? 'Tapete extra (encaixe)' : undefined}>{n}</button>
                ))}
              </div>
              <span className="b-suave">frente da sala</span>
            </fieldset>
          )}

          <fieldset className="b-opcoes">
            <legend className="rotulo">Como esta aula será paga</legend>
            {FORMAS.map(([id, t, d]) => (
              <label key={id} className={forma === id ? 'ativo' : ''}>
                <input type="radio" name="forma" checked={forma === id} onChange={() => setForma(id)} />
                <span><strong>{t}</strong><small>{d}</small></span>
              </label>
            ))}
          </fieldset>
          {forma === 'avulsa' && <CamposPagamento metodos={METODOS} p={pg} aoMudar={setPg} />}
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
