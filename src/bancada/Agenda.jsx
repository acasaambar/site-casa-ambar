import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useBancada, pode } from './sessao.jsx';
import { useDados, useFazServicos, CampoBandeira, faltaBandeira, Carregando, Erro, Cabecalho, Tag, Modal, BuscaAluno, BotaoAcao, Vazio, STATUS_RESERVA, hora, hojeIso, somarDias, diaSemana,
  DIAS, DIAS_LONGOS, MESES, linkWhats, primeiro, telFmt, plural } from './ui.jsx';
import { Ocupacao } from './Graficos.jsx';
import { IconeWhatsapp } from '../components/Marca.jsx';
import { AgendaServicos } from './Servicos.jsx';

export default function Agenda() {
  const { membro, chamar } = useBancada();
  const local = useLocation();
  const [dia, setDia] = useState(hojeIso());
  const [filtro, setFiltro] = useState('Todas');
  const [abertas, setAbertas] = useState(() => (local.state?.abrir ? { [local.state.abrir]: true } : {}));
  const [agendar, setAgendar] = useState(null);
  const [ficha, setFicha] = useState(null);
  const [aviso, setAviso] = useState('');
  const [vistaEscolhida, setVista] = useState(local.state?.abrir ? 'aulas' : null);
  const { dados, erro, carregando, recarregar, setDados } = useDados('agenda', { de: dia, dias: 1 });
  const equipeBalcao = pode(membro, 'admin', 'recepcao');
  // quem só dá aula (não atende serviços) abre a agenda direto em "Aulas e presença"
  const fazServicos = useFazServicos();
  const vista = vistaEscolhida || (fazServicos === false ? 'aulas' : 'dia');
  const modalidades = new Set((dados || []).map((a) => a.modalidade));

  const aulas = useMemo(() => (dados || []).filter((a) => filtro === 'Todas' || a.modalidade === filtro), [dados, filtro]);
  const tira = Array.from({ length: 7 }, (_, i) => somarDias(dia, i - 3));

  useEffect(() => {
    // abre sozinha a aula que está acontecendo agora
    if (!dados || Object.keys(abertas).length) return;
    const agora = Date.now();
    const atual = dados.find((a) => {
      const [h, m] = a.hora.split(':').map(Number);
      const [y, mo, d] = a.data.split('-').map(Number);
      const ini = new Date(y, mo - 1, d, h, m).getTime();
      return agora >= ini - 40 * 60e3 && agora <= ini + 60 * 60e3;
    });
    if (atual) setAbertas({ [atual.id]: true });
  }, [dados]); // eslint-disable-line react-hooks/exhaustive-deps

  async function presenca(r, status) {
    setAviso('');
    try {
      await chamar('presenca', { reservaId: r.id, status });
      setDados((lista) => lista.map((a) => ({ ...a, reservas: a.reservas.map((x) => (x.id === r.id ? { ...x, status } : x)) })));
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

  return (
    <>
      <Cabecalho titulo={`${DIAS_LONGOS[diaSemana(dia)]}, ${Number(dia.slice(8))} de ${MESES[Number(dia.slice(5, 7)) - 1]}`}
        acoes={
          <div className="b-agenda__nav">
            <button type="button" className="botao botao--linha botao--p" onClick={() => setDia(somarDias(dia, -1))} aria-label="Dia anterior">‹</button>
            <button type="button" className="botao botao--linha botao--p" onClick={() => setDia(hojeIso())} disabled={dia === hojeIso()}>Hoje</button>
            <button type="button" className="botao botao--linha botao--p" onClick={() => setDia(somarDias(dia, 1))} aria-label="Próximo dia">›</button>
            <input type="date" value={dia} onChange={(e) => e.target.value && setDia(e.target.value)} aria-label="Escolher data" className="b-data" />
          </div>
        } />

      <div className="b-tira" role="tablist" aria-label="Dias">
        {tira.map((d) => (
          <button key={d} type="button" role="tab" aria-selected={d === dia} onClick={() => setDia(d)} className={d === hojeIso() ? 'hoje' : ''}>
            <span>{DIAS[diaSemana(d)]}</span>
            <strong>{Number(d.slice(8))}</strong>
          </button>
        ))}
      </div>

      <div className="b-agenda__vista">
        <div className="b-segmento" role="tablist" aria-label="O que mostrar">
          <button type="button" role="tab" aria-selected={vista === 'dia'} onClick={() => setVista('dia')}>Agenda do dia</button>
          <button type="button" role="tab" aria-selected={vista === 'aulas'} onClick={() => setVista('aulas')}>Aulas e presença</button>
        </div>
        {vista === 'aulas' && (equipeBalcao || modalidades.size > 1) && (
          <div className="b-filtros">
            {['Todas', 'Yoga', 'Pilates'].map((f) => (
              <button key={f} type="button" className={`b-chip${filtro === f ? ' b-chip--ativo' : ''}`} onClick={() => setFiltro(f)}>{f}</button>
            ))}
          </div>
        )}
      </div>

      {vista === 'dia' && (
        <AgendaServicos dia={dia} aulas={dados || []} aoAbrirAula={(a) => {
          setFiltro('Todas');
          setAbertas({ [a.id]: true });
          setVista('aulas');
          setTimeout(() => document.getElementById('aula-' + a.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
        }} />
      )}
      {vista === 'aulas' && (<>

      <Erro>{erro || aviso}</Erro>
      {carregando && !dados && <Carregando />}
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
                  <span className="b-aula__mod">{a.modalidade} <em>com {a.professor}</em></span>
                  <Ocupacao valor={a.ocupadosQtd} total={a.capacidade} />
                </span>
                <span className="b-aula__num">
                  <strong>{a.ocupadosQtd}/{a.capacidade}</strong>
                  <small>{a.passada ? plural(presentes, 'presente', 'presentes') : a.ocupadosQtd >= a.capacidade ? 'lotada' : plural(a.capacidade - a.ocupadosQtd, 'livre', 'livres')}</small>
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
                            <strong>{r.nome}</strong>
                            <span className="b-reserva__tags">
                              {r.primeiraAula && <Tag tom="ambar">1ª aula</Tag>}
                              {r.alerta && <Tag tom="alerta" title="A ficha de saúde tem pontos de atenção">saúde: atenção</Tag>}
                              {!r.ficha && <Tag tom="aviso">sem ficha</Tag>}
                              <Tag>{r.forma}</Tag>
                              {r.status === 'pendente' && <Tag tom="aviso">{st[0]}</Tag>}
                            </span>
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
                  {equipeBalcao && (
                    <button type="button" className="botao botao--cheio botao--p b-aula__agendar" onClick={() => setAgendar(a)}>Agendar aluno</button>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      </>)}

      {agendar && <Agendar aula={agendar} aoFechar={() => setAgendar(null)} aoAgendar={() => { setAgendar(null); recarregar(); setAbertas((x) => ({ ...x, [agendar.id]: true })); }} />}
      {ficha && <FichaModal {...ficha} aoFechar={() => setFicha(null)} />}
    </>
  );
}

const FORMAS = [
  ['credito', 'Plano do aluno', 'desconta do plano ou das aulas avulsas dele'],
  ['avulsa', 'Vender aula avulsa', 'registra a venda e já agenda'],
  ['wellhub', 'Wellhub', 'check-in no app Wellhub ao chegar'],
  ['cortesia', 'Cortesia', 'aula grátis, sem descontar'],
];
const METODOS = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito'];

function Agendar({ aula, aoFechar, aoAgendar }) {
  const { chamar } = useBancada();
  const [aluno, setAluno] = useState(null);
  const [tapete, setTapete] = useState(null);
  const [forma, setForma] = useState('credito');
  const [metodo, setMetodo] = useState('Pix');
  const [bandeira, setBandeira] = useState('');
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
      await chamar('agendar', { aulaId: aula.id, cpf: aluno.cpf, tapete, forma, metodo, bandeira, encaixe });
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
                {Array.from({ length: aula.capacidade }, (_, i) => i + 1).map((n) => (
                  <button key={n} type="button" disabled={ocupados.includes(n)} aria-pressed={tapete === n} onClick={() => setTapete(n)}>{n}</button>
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
          {forma === 'avulsa' && (
            <label className="b-campo">
              <span className="rotulo">Recebido por</span>
              <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>{METODOS.map((m) => <option key={m}>{m}</option>)}</select>
            </label>
          )}
          {forma === 'avulsa' && <CampoBandeira metodo={metodo} valor={bandeira} aoMudar={setBandeira} />}
          {lotada && (
            <label className="b-check">
              <input type="checkbox" checked={encaixe} onChange={(e) => setEncaixe(e.target.checked)} /> Aula lotada: fazer encaixe mesmo assim
            </label>
          )}
          <Erro>{erro}</Erro>
          <button type="button" className="botao botao--cheio" disabled={enviando || (yoga && !tapete) || (lotada && !encaixe) || (forma === 'avulsa' && faltaBandeira(metodo, bandeira))} onClick={confirmar}>
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
