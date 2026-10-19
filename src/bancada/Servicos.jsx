import { useEffect, useMemo, useState } from 'react';
import { useBancada, pode } from './sessao.jsx';
import { useDados, Carregando, Erro, Modal, BuscaAluno, BotaoAcao, Vazio, Tag, real, hora, hojeIso, linkWhats, primeiro, telFmt, dataBR, DIAS_LONGOS,
  MESES, diaSemana } from './ui.jsx';
import { mascaraTelefone, soDigitos } from '../lib/util.js';
import { IconeWhatsapp } from '../components/Marca.jsx';
import { ComandaModal } from './Comandas.jsx';
import { ProntuarioModal } from './Prontuario.jsx';

// Cor de cada área de cuidado (tons da marca)
export const COR_CATEGORIA = {
  'Estética facial': 'facial',
  'Estética corporal': 'corporal',
  'Estética capilar': 'capilar',
  Fisioterapia: 'fisio',
};
const STATUS = {
  agendado: ['Agendado', 'neutro'],
  confirmado: ['Confirmado', 'ok'],
  atendido: ['Atendido', 'ok'],
  falta: ['Faltou', 'alerta'],
  cancelado: ['Cancelado', 'apagado'],
};
const PAGAMENTO = { no_dia: 'paga no dia', pacote: 'pacote', pago: 'pago', cortesia: 'cortesia' };
const METODOS = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Link InfinitePay'];
const INICIO_DIA = 6 * 60, FIM_DIA = 20 * 60, PX = 1.15; // pixels por minuto

const min = (h) => { const [a, b] = String(h).split(':').map(Number); return a * 60 + (b || 0); };
const fimDe = (a) => { const t = min(a.hora) + a.duracao; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };

// ============================================================
//  AGENDA DE SERVIÇOS (um dia)
// ============================================================
export function AgendaServicos({ dia }) {
  const { membro } = useBancada();
  const balcao = pode(membro, 'admin', 'recepcao');
  const { dados, erro, carregando, recarregar } = useDados('atendimentos', { de: dia, dias: 1 });
  const { dados: catalogo } = useDados('catalogoServicos', {});
  const [novo, setNovo] = useState(null);
  const [aberto, setAberto] = useState(null);
  const [bloquear, setBloquear] = useState(null);
  const [folga, setFolga] = useState(null);
  const [comanda, setComanda] = useState(null);
  const [prontuario, setProntuario] = useState(null);

  const lista = dados?.atendimentos || [];
  const folgas = dados?.folgas || [];
  const colunas = useMemo(() => {
    const nomes = new Set([...(dados?.profissionais || [])]);
    lista.forEach((a) => nomes.add(a.profissional));
    return [...nomes];
  }, [dados, lista]);

  const agora = new Date();
  const minutoAgora = agora.getHours() * 60 + agora.getMinutes();
  const ehHoje = dia === hojeIso();

  if (carregando && !dados) return <Carregando />;
  return (
    <>
      <Erro>{erro}</Erro>
      {balcao && (
        <div className="s-barra">
          <p className="b-suave">{lista.length ? `${lista.length} atendimento${lista.length > 1 ? 's' : ''} neste dia` : 'Nenhum atendimento neste dia'}</p>
          <span className="b-botoes">
            <button type="button" className="botao botao--linha botao--p" onClick={() => setBloquear({ data: dia })}>Bloquear horário</button>
            <button type="button" className="botao botao--cheio botao--p" onClick={() => setNovo({ data: dia })}>Agendar serviço</button>
          </span>
        </div>
      )}
      {colunas.length === 0 && (
        <Vazio titulo="Cadastre as profissionais" forma="presenca">
          {pode(membro, 'admin') ? 'Em Catálogo → Profissionais, cadastre quem atende cada serviço e o horário de cada uma.' : 'Peça à administração para cadastrar as profissionais em Catálogo.'}
        </Vazio>
      )}

      {colunas.length > 0 && (
        <div className="s-linha" style={{ '--colunas': colunas.length }}>
          <div className="s-linha__topo">
            <span />
            {colunas.map((c) => <strong key={c}>{c}</strong>)}
          </div>
          <div className="s-linha__corpo" style={{ height: (FIM_DIA - INICIO_DIA) * PX }}>
            <div className="s-linha__horas" aria-hidden="true">
              {Array.from({ length: (FIM_DIA - INICIO_DIA) / 60 + 1 }, (_, i) => (
                <span key={i} style={{ top: i * 60 * PX }}>{INICIO_DIA / 60 + i}h</span>
              ))}
            </div>
            {colunas.map((c) => (
              <div key={c} className="s-coluna" aria-label={`Agenda de ${c}`}>
                {Array.from({ length: (FIM_DIA - INICIO_DIA) / 60 }, (_, i) => (
                  <button key={i} type="button" className="s-coluna__hora" style={{ top: i * 60 * PX, height: 60 * PX }} disabled={!balcao}
                    aria-label={`Agendar com ${c} às ${INICIO_DIA / 60 + i}h`}
                    onClick={() => setNovo({ data: dia, profissional: c, hora: `${String(INICIO_DIA / 60 + i).padStart(2, '0')}:00` })} />
                ))}
                {folgas.filter((f) => f.profissional === c).map((f) => {
                  const ini = f.diaTodo ? INICIO_DIA : Math.max(min(f.inicio), INICIO_DIA);
                  const fim = f.diaTodo ? FIM_DIA : Math.min(min(f.fim), FIM_DIA);
                  if (fim <= ini) return null;
                  return (
                    <button key={f.id} type="button" className="s-folga" style={{ top: (ini - INICIO_DIA) * PX, height: (fim - ini) * PX }} disabled={!balcao}
                      onClick={() => setFolga(f)} title={`${f.motivo}${f.diaTodo ? ' · dia todo' : ` · ${hora(f.inicio)}–${hora(f.fim)}`}`}>
                      <span>{f.motivo}</span>
                    </button>
                  );
                })}
                {lista.filter((a) => a.profissional === c).map((a) => (
                  <button key={a.id} type="button" onClick={() => setAberto(a)}
                    className={`s-bloco s-bloco--${COR_CATEGORIA[a.categoria] || 'facial'} s-bloco--${a.status}`}
                    style={{ top: (min(a.hora) - INICIO_DIA) * PX, height: Math.max(a.duracao * PX - 3, 26) }}>
                    <span className="s-bloco__hora">{hora(a.hora)}–{hora(fimDe(a))}</span>
                    <strong>{a.nome}</strong>
                    {a.duracao >= 35 && <span className="s-bloco__serv">{a.servico}</span>}
                  </button>
                ))}
              </div>
            ))}
            {ehHoje && minutoAgora > INICIO_DIA && minutoAgora < FIM_DIA && (
              <div className="s-agora" style={{ top: (minutoAgora - INICIO_DIA) * PX }} aria-hidden="true"><i /></div>
            )}
          </div>
        </div>
      )}

      {/* no celular: lista em ordem de horário */}
      <ul className="s-lista">
        {folgas.map((f) => (
          <li key={f.id}>
            <button type="button" className="s-item s-item--folga" onClick={() => balcao && setFolga(f)}>
              <span className="s-item__hora">{f.diaTodo ? '—' : hora(f.inicio)}</span>
              <span className="s-item__quem"><strong>{f.profissional} · {f.motivo}</strong><span>{f.diaTodo ? 'dia todo' : `até ${hora(f.fim)}`}</span></span>
              <Tag tom="apagado">bloqueado</Tag>
            </button>
          </li>
        ))}
        {lista.map((a) => (
          <li key={a.id}>
            <button type="button" className={`s-item s-item--${COR_CATEGORIA[a.categoria] || 'facial'}`} onClick={() => setAberto(a)}>
              <span className="s-item__hora">{hora(a.hora)}</span>
              <span className="s-item__quem"><strong>{a.nome}</strong><span>{a.servico} · {a.profissional}</span></span>
              <Tag tom={STATUS[a.status]?.[1]}>{STATUS[a.status]?.[0]}</Tag>
            </button>
          </li>
        ))}
      </ul>

      {novo && catalogo && <NovoAtendimento inicial={novo} catalogo={catalogo} aoFechar={() => setNovo(null)} aoSalvar={() => { setNovo(null); recarregar(); }} />}
      {aberto && <DetalheAtendimento a={aberto} aoFechar={() => setAberto(null)} aoMudar={() => { setAberto(null); recarregar(); }}
        aoReagendar={(a) => { setAberto(null); setNovo({ data: a.data, profissional: a.profissional, servicoId: a.servicoId, reagendar: a }); }}
        aoComanda={async (a) => { setAberto(null); setComanda({ carregando: true, a }); }}
        aoProntuario={(a) => { setAberto(null); setProntuario(a); }} />}
      {bloquear && catalogo && <BloquearHorario inicial={bloquear} profissionais={catalogo.profissionais.filter((p) => p.ativo).map((p) => p.nome)} aoFechar={() => setBloquear(null)} aoSalvar={() => { setBloquear(null); recarregar(); }} />}
      {folga && <DetalheFolga f={folga} aoFechar={() => setFolga(null)} aoMudar={() => { setFolga(null); recarregar(); }} />}
      {comanda && <ComandaDoAtendimento a={comanda.a} aoFechar={() => { setComanda(null); recarregar(); }} />}
      {prontuario && <ProntuarioModal alvo={{ atendimentoId: prontuario.id }} nome={prontuario.nome} aoFechar={() => setProntuario(null)} />}
    </>
  );
}

// ============================================================
//  NOVO ATENDIMENTO (ou reagendar)
// ============================================================
function NovoAtendimento({ inicial, catalogo, aoFechar, aoSalvar }) {
  const { chamar } = useBancada();
  const re = inicial.reagendar;
  const [servicoId, setServicoId] = useState(inicial.servicoId || '');
  const [profissional, setProfissional] = useState(inicial.profissional || '');
  const [data, setData] = useState(inicial.data || hojeIso());
  const [horaSel, setHoraSel] = useState(inicial.hora || '');
  const [horarios, setHorarios] = useState(null);
  const [cliente, setCliente] = useState(re ? { nome: re.nome, cpf: re.cpf, whatsapp: re.whatsapp } : null);
  const [semCadastro, setSemCadastro] = useState({ nome: '', whatsapp: '' });
  const [modoCliente, setModoCliente] = useState('busca');
  const [pagamento, setPagamento] = useState(re ? re.pagamento : 'no_dia');
  const [metodo, setMetodo] = useState('Pix');
  const [pacote, setPacote] = useState(null);
  const [obs, setObs] = useState(re ? re.obs : '');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const servicos = catalogo.servicos.filter((s) => s.ativo);
  const serv = servicos.find((s) => s.id === servicoId);
  const profs = catalogo.profissionais.filter((p) => p.ativo && (!serv || fazServico(p, serv)));

  useEffect(() => {
    if (!serv || !profissional || !data) return undefined;
    let vivo = true;
    setHorarios(null);
    chamar('horarios', { servicoId, profissional, data, ignorarId: re?.id })
      .then((r) => { if (vivo) { setHorarios(r); if (inicial.hora && !r.horarios.includes(inicial.hora)) setHoraSel(''); } })
      .catch((e) => vivo && setErro(e.message));
    return () => { vivo = false; };
  }, [servicoId, profissional, data]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPacote(null);
    if (!cliente?.cpf || !servicoId) return undefined;
    let vivo = true;
    chamar('creditosServico', { cpf: cliente.cpf, servicoId, data }).then((r) => { if (vivo) { setPacote(r); if (r && !re) setPagamento('pacote'); } }).catch(() => {});
    return () => { vivo = false; };
  }, [cliente, servicoId, data]); // eslint-disable-line react-hooks/exhaustive-deps

  async function salvar() {
    setErro('');
    setEnviando(true);
    try {
      await chamar('agendarServico', {
        servicoId, profissional, data, hora: horaSel, obs, pagamento, metodo,
        cpf: cliente?.cpf || undefined,
        cliente: cliente?.cpf ? undefined : cliente ? { nome: cliente.nome, whatsapp: cliente.whatsapp } : { ...semCadastro, whatsapp: soDigitos(semCadastro.whatsapp) },
        reagendarId: re?.id,
      });
      aoSalvar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  const porCategoria = catalogo.categorias.map((c) => [c, servicos.filter((s) => s.categoria === c)]).filter(([, l]) => l.length);
  const temCliente = cliente || (modoCliente === 'novo' && semCadastro.nome.trim().split(' ').length >= 2 && soDigitos(semCadastro.whatsapp).length >= 10);

  return (
    <Modal rotulo={re ? `${re.servico} de ${primeiro(re.nome)}` : 'Estética e fisioterapia'} titulo={re ? 'Reagendar' : 'Agendar serviço'} aoFechar={aoFechar} largo>
      <div className="b-form">
        <label className="b-campo">
          <span className="rotulo">Serviço</span>
          <select value={servicoId} onChange={(e) => setServicoId(e.target.value)} disabled={!!re}>
            <option value="">Escolha…</option>
            {porCategoria.map(([c, l]) => (
              <optgroup key={c} label={c}>{l.map((s) => <option key={s.id} value={s.id}>{s.nome} · {s.duracao} min · {real(s.preco)}</option>)}</optgroup>
            ))}
          </select>
        </label>
        <div className="b-linha2">
          <label className="b-campo">
            <span className="rotulo">Profissional</span>
            <select value={profissional} onChange={(e) => setProfissional(e.target.value)}>
              <option value="">Escolha…</option>
              {profs.map((p) => <option key={p.nome}>{p.nome}</option>)}
            </select>
          </label>
          <label className="b-campo"><span className="rotulo">Dia</span><input type="date" value={data} min={hojeIso()} onChange={(e) => { setData(e.target.value); setHoraSel(''); }} /></label>
        </div>

        {serv && profissional && (
          <fieldset className="s-horarios">
            <legend className="rotulo">Horário · {horarios?.duracao || serv.duracao} min</legend>
            {!horarios && <span className="b-suave">Procurando horários livres…</span>}
            {horarios && horarios.horarios.length === 0 && <span className="b-suave">{horarios.motivo || 'Sem horário livre neste dia. Tente outro dia ou profissional.'}</span>}
            {horarios && horarios.horarios.length > 0 && (
              <div className="s-horarios__grade">
                {horarios.horarios.map((h) => (
                  <button key={h} type="button" aria-pressed={horaSel === h} onClick={() => setHoraSel(h)}>{hora(h)}</button>
                ))}
              </div>
            )}
          </fieldset>
        )}

        {!re && (
          <fieldset className="b-opcoes">
            <legend className="rotulo">Cliente</legend>
            {cliente ? (
              <div className="b-escolhido">
                <div><strong>{cliente.nome}</strong><span>{cliente.cpf ? telFmt(cliente.whatsapp) : 'sem cadastro'}</span></div>
                <button type="button" className="link-sair" onClick={() => setCliente(null)}>trocar</button>
              </div>
            ) : modoCliente === 'busca' ? (
              <>
                <BuscaAluno placeholder="Buscar cliente por nome, CPF ou WhatsApp" aoEscolher={(a) => setCliente({ nome: a.nome, cpf: a.cpf, whatsapp: a.whatsapp })} />
                <button type="button" className="link-acao" onClick={() => setModoCliente('novo')}>Cliente sem cadastro (só nome e WhatsApp)</button>
              </>
            ) : (
              <>
                <div className="b-linha2">
                  <label className="b-campo"><span className="rotulo">Nome e sobrenome</span><input value={semCadastro.nome} onChange={(e) => setSemCadastro({ ...semCadastro, nome: e.target.value })} /></label>
                  <label className="b-campo"><span className="rotulo">WhatsApp</span><input inputMode="numeric" value={semCadastro.whatsapp} onChange={(e) => setSemCadastro({ ...semCadastro, whatsapp: mascaraTelefone(e.target.value) })} /></label>
                </div>
                <button type="button" className="link-acao" onClick={() => setModoCliente('busca')}>Buscar cliente cadastrado</button>
              </>
            )}
          </fieldset>
        )}

        {!re && serv && (
          <fieldset className="b-opcoes b-opcoes--linha">
            <legend className="rotulo">Pagamento</legend>
            {pacote && (
              <label className={pagamento === 'pacote' ? 'ativo' : ''}>
                <input type="radio" checked={pagamento === 'pacote'} onChange={() => setPagamento('pacote')} />
                <span><strong>Usar o pacote</strong><small>{pacote.restantes} sessões restantes · até {dataBR(pacote.fim)}</small></span>
              </label>
            )}
            <label className={pagamento === 'no_dia' ? 'ativo' : ''}>
              <input type="radio" checked={pagamento === 'no_dia'} onChange={() => setPagamento('no_dia')} />
              <span><strong>Paga no dia</strong><small>registra o pagamento ao marcar atendido</small></span>
            </label>
            <label className={pagamento === 'pago' ? 'ativo' : ''}>
              <input type="radio" checked={pagamento === 'pago'} onChange={() => setPagamento('pago')} />
              <span><strong>Já pagou</strong><small>registra agora · {real(serv.preco)}</small></span>
            </label>
            <label className={pagamento === 'cortesia' ? 'ativo' : ''}>
              <input type="radio" checked={pagamento === 'cortesia'} onChange={() => setPagamento('cortesia')} />
              <span><strong>Cortesia</strong><small>sem cobrança</small></span>
            </label>
          </fieldset>
        )}
        {pagamento === 'pago' && !re && (
          <label className="b-campo"><span className="rotulo">Recebido por</span>
            <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>{METODOS.map((m) => <option key={m}>{m}</option>)}</select></label>
        )}
        <label className="b-campo"><span className="rotulo">Observação para a profissional</span><input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" /></label>
        <Erro>{erro}</Erro>
        <button type="button" className="botao botao--cheio" disabled={enviando || !serv || !profissional || !horaSel || (!re && !temCliente)} onClick={salvar}>
          {enviando ? 'Agendando…' : !horaSel ? 'Escolha o horário' : re ? `Mudar para ${dataBR(data)} às ${hora(horaSel)}` : `Agendar ${dataBR(data)} às ${hora(horaSel)}`}
        </button>
      </div>
    </Modal>
  );
}

// ============================================================
//  DETALHE DO ATENDIMENTO
// ============================================================
// abre (ou retoma) a comanda do atendimento e mostra a folha da comanda
function ComandaDoAtendimento({ a, aoFechar }) {
  const { chamar } = useBancada();
  const [id, setId] = useState('');
  const [erro, setErro] = useState('');
  useEffect(() => {
    chamar('comandaDoAtendimento', { atendimentoId: a.id }).then((c) => setId(c.id)).catch((e) => setErro(e.message));
  }, [a.id, chamar]);
  if (id) return <ComandaModal id={id} aoFechar={aoFechar} />;
  return <Modal titulo="Comanda" rotulo={`${a.servico} · ${a.nome}`} aoFechar={aoFechar}>{erro ? <Erro>{erro}</Erro> : <Carregando texto="Abrindo a comanda" />}</Modal>;
}

function BloquearHorario({ inicial, profissionais, aoFechar, aoSalvar }) {
  const { chamar } = useBancada();
  const [f, setF] = useState({ profissional: inicial.profissional || '', data: inicial.data || hojeIso(), diaTodo: false, inicio: '12:00', fim: '13:00', motivo: '', repetirSemanas: 0 });
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState(null);
  const campo = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });
  if (aviso) {
    return (
      <Modal titulo="Horário bloqueado" aoFechar={aoSalvar}>
        <div className="b-form">
          <p>{aviso.criadas} bloqueio{aviso.criadas > 1 ? 's' : ''} criado{aviso.criadas > 1 ? 's' : ''}.</p>
          {aviso.conflitos.length > 0 && (
            <div className="aviso"><strong>Já havia atendimento marcado nesse horário:</strong><ul>{aviso.conflitos.map((c) => <li key={c}>{c}</li>)}</ul>Reagende essas clientes pela agenda.</div>
          )}
          <button type="button" className="botao botao--cheio" onClick={aoSalvar}>Ok</button>
        </div>
      </Modal>
    );
  }
  return (
    <Modal titulo="Bloquear horário" rotulo="Folga, almoço, curso ou compromisso da profissional" aoFechar={aoFechar}>
      <div className="b-form">
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">Profissional</span>
            <select {...campo('profissional')}><option value="">Escolha…</option>{profissionais.map((p) => <option key={p}>{p}</option>)}</select></label>
          <label className="b-campo"><span className="rotulo">Dia</span><input type="date" {...campo('data')} /></label>
        </div>
        <label className="b-check"><input type="checkbox" checked={f.diaTodo} onChange={(e) => setF({ ...f, diaTodo: e.target.checked })} /> O dia todo</label>
        {!f.diaTodo && (
          <div className="b-linha2">
            <label className="b-campo"><span className="rotulo">Das</span><input type="time" step={900} {...campo('inicio')} /></label>
            <label className="b-campo"><span className="rotulo">Até</span><input type="time" step={900} {...campo('fim')} /></label>
          </div>
        )}
        <label className="b-campo"><span className="rotulo">Motivo</span><input {...campo('motivo')} placeholder="Ex.: almoço, médico, curso" /></label>
        <label className="b-campo"><span className="rotulo">Repetir</span>
          <select value={f.repetirSemanas} onChange={(e) => setF({ ...f, repetirSemanas: Number(e.target.value) })}>
            <option value={0}>Só neste dia</option>
            {[1, 3, 7, 11, 25].map((n) => <option key={n} value={n}>Toda semana, por {n + 1} semanas</option>)}
          </select></label>
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--cheio" disabled={!f.profissional} acao={async () => {
          setErro('');
          try { setAviso(await chamar('salvarFolga', f)); } catch (e) { setErro(e.message); }
        }}>Bloquear</BotaoAcao>
      </div>
    </Modal>
  );
}

function DetalheFolga({ f, aoFechar, aoMudar }) {
  const { chamar } = useBancada();
  const [erro, setErro] = useState('');
  return (
    <Modal titulo={f.motivo} rotulo={`${f.profissional} · ${dataBR(f.data)}`} aoFechar={aoFechar}>
      <div className="b-form">
        <p>{f.diaTodo ? 'Dia todo bloqueado.' : `Bloqueado das ${hora(f.inicio)} às ${hora(f.fim)}.`}</p>
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--linha botao--perigo" acao={async () => { try { await chamar('excluirFolga', { id: f.id }); aoMudar(); } catch (e) { setErro(e.message); } }}>Liberar este horário</BotaoAcao>
      </div>
    </Modal>
  );
}

function DetalheAtendimento({ a, aoFechar, aoMudar, aoReagendar, aoComanda, aoProntuario }) {
  const { membro, chamar } = useBancada();
  const balcao = pode(membro, 'admin', 'recepcao');
  const [metodo, setMetodo] = useState('Pix');
  const [erro, setErro] = useState('');
  const st = STATUS[a.status] || [a.status, 'neutro'];
  const mudar = async (status, extra = {}) => {
    setErro('');
    try { await chamar('atualizarAtendimento', { id: a.id, status, ...extra }); aoMudar(); } catch (e) { setErro(e.message); }
  };
  const dataTexto = `${DIAS_LONGOS[diaSemana(a.data)]}, ${Number(a.data.slice(8))} de ${MESES[Number(a.data.slice(5, 7)) - 1]}`;
  const lembrete = `Olá, ${primeiro(a.nome)}! Passando para confirmar seu horário na Casa Âmbar: ${a.servico}, ${dataTexto.toLowerCase()} às ${hora(a.hora)}, com ${a.profissional}. Podemos confirmar?`;
  const fechado = a.status === 'atendido' || a.status === 'cancelado';

  return (
    <Modal rotulo={a.categoria} titulo={a.servico} aoFechar={aoFechar}>
      <div className={`s-detalhe s-detalhe--${COR_CATEGORIA[a.categoria] || 'facial'}`}>
        <div className="s-detalhe__quando">
          <strong>{hora(a.hora)}<span>–{hora(fimDe(a))}</span></strong>
          <span>{dataTexto} · com {a.profissional}</span>
        </div>
        <dl className="b-dados">
          <dt>Cliente</dt><dd>{a.nome}{!a.cpf && balcao ? ' · sem cadastro' : ''}</dd>
          {a.whatsapp && <><dt>WhatsApp</dt><dd>{telFmt(a.whatsapp)}</dd></>}
          <dt>Situação</dt><dd><Tag tom={st[1]}>{st[0]}</Tag></dd>
          {balcao && <><dt>Pagamento</dt><dd>{PAGAMENTO[a.pagamento] || a.pagamento}{a.valor ? ` · ${real(a.valor)}` : ''}</dd></>}
          {a.obs && <><dt>Observação</dt><dd>{a.obs}</dd></>}
        </dl>
      </div>
      <Erro>{erro}</Erro>

      {balcao && a.status !== 'cancelado' && !(a.status === 'atendido' && a.pagamento === 'pago') && (
        <button type="button" className="botao botao--cheio s-comanda" onClick={() => aoComanda(a)}>
          {a.pagamento === 'no_dia' ? 'Receber na comanda' : 'Abrir comanda'}<small>serviço + produtos, pagamento dividido</small>
        </button>
      )}
      <button type="button" className="link-acao s-prontuario" onClick={() => aoProntuario(a)}>Ficha de estética e evolução</button>
      {!fechado && (
        <div className="s-acoes">
          {a.pagamento === 'no_dia' && balcao ? (
            <div className="s-receber">
              <label className="b-campo"><span className="rotulo">Atendido · recebido por</span>
                <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>{METODOS.map((m) => <option key={m}>{m}</option>)}</select></label>
              <BotaoAcao className="botao botao--cheio botao--p" acao={() => mudar('atendido', { metodo })}>Marcar atendido</BotaoAcao>
            </div>
          ) : (
            <BotaoAcao className="botao botao--cheio botao--p" acao={() => mudar('atendido')}>Marcar atendido</BotaoAcao>
          )}
          <div className="b-botoes">
            {balcao && a.status === 'agendado' && <BotaoAcao acao={() => mudar('confirmado')}>Confirmado pelo cliente</BotaoAcao>}
            <BotaoAcao className="botao botao--linha botao--p botao--perigo" acao={() => mudar('falta')}>Faltou</BotaoAcao>
          </div>
        </div>
      )}
      {balcao && (
        <div className="b-botoes s-rodape">
          {a.whatsapp && !fechado && (
            <a className="link-acao com-icone" href={linkWhats(a.whatsapp, lembrete)} target="_blank" rel="noreferrer"><IconeWhatsapp tamanho={14} /> Enviar lembrete</a>
          )}
          {!fechado && <button type="button" className="link-acao" onClick={() => aoReagendar(a)}>Reagendar</button>}
          {!fechado && <BotaoAcao className="link-sair" confirmar="Cancelar este atendimento?" acao={() => mudar('cancelado')}>Cancelar</BotaoAcao>}
          {(a.status === 'falta' || a.status === 'atendido') && <BotaoAcao className="link-acao" acao={() => mudar('agendado')}>Desfazer</BotaoAcao>}
        </div>
      )}
    </Modal>
  );
}

// ============================================================
//  CATÁLOGO: serviços, pacotes e profissionais (administração)
// ============================================================
export function CatalogoServicos() {
  const { dados, erro, carregando, setDados } = useDados('catalogoServicos', {});
  const [editar, setEditar] = useState(null);
  if (carregando && !dados) return <Carregando />;
  if (!dados) return <Erro>{erro}</Erro>;
  return (
    <>
      <div className="b-barra-acoes">
        <p className="b-suave">Os serviços só aparecem na bancada. A área do aluno continua só com Yoga e Pilates.</p>
        <button type="button" className="botao botao--cheio botao--p" onClick={() => setEditar({ tipo: 'servico', v: { categoria: dados.categorias[0], duracao: 60, ativo: true } })}>Novo serviço</button>
      </div>
      {dados.categorias.map((c) => {
        const lista = dados.servicos.filter((s) => s.categoria === c);
        if (!lista.length) return null;
        return (
          <section key={c} className={`s-cat s-cat--${COR_CATEGORIA[c]}`}>
            <h2 className="s-cat__titulo">{c}</h2>
            <ul className="s-cat__lista">
              {lista.map((s) => {
                const pacs = dados.pacotes.filter((p) => p.servicoId === s.id);
                return (
                  <li key={s.id} className={s.ativo ? '' : 'inativo'}>
                    <div className="s-cat__serv">
                      <strong>{s.nome}</strong>
                      <span className="b-suave">{s.duracao} min{s.descricao ? ` · ${s.descricao}` : ''}</span>
                      {pacs.length > 0 && (
                        <span className="s-cat__pacotes">
                          {pacs.map((p) => (
                            <button key={p.id} type="button" className={`s-pacote${p.ativo ? '' : ' inativo'}`} onClick={() => setEditar({ tipo: 'pacote', v: p })}>
                              {p.sessoes} sessões · {real(p.preco)}
                            </button>
                          ))}
                        </span>
                      )}
                    </div>
                    <strong className="s-cat__preco">{real(s.preco)}{s.comissao != null && <small className="b-suave b-bloco">comissão {s.comissao}%</small>}</strong>
                    <div className="b-botoes b-botoes--coluna">
                      <button type="button" className="link-acao" onClick={() => setEditar({ tipo: 'servico', v: s })}>editar</button>
                      <button type="button" className="link-acao" onClick={() => setEditar({ tipo: 'pacote', v: { servicoId: s.id, sessoes: 5, semJurosAte: 3, validadeDias: 120, ativo: true } })}>+ pacote</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {editar?.tipo === 'servico' && <EditarServico s={editar.v} categorias={dados.categorias} produtos={dados.produtos || []} aoFechar={() => setEditar(null)} aoSalvar={(d) => { setDados(d); setEditar(null); }} />}
      {editar?.tipo === 'pacote' && <EditarPacote p={editar.v} servicos={dados.servicos} aoFechar={() => setEditar(null)} aoSalvar={(d) => { setDados(d); setEditar(null); }} />}
    </>
  );
}

function EditarServico({ s, categorias, produtos = [], aoFechar, aoSalvar }) {
  const { chamar } = useBancada();
  const [f, setF] = useState({ id: s.id || '', nome: s.nome || '', categoria: s.categoria, duracao: s.duracao || 60, preco: s.preco || '', descricao: s.descricao || '', semJurosAte: s.semJurosAte || 1, ativo: s.ativo !== false,
    comissao: s.comissao == null ? '' : String(s.comissao), consumo: s.consumo || [] });
  const [erro, setErro] = useState('');
  const campo = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });
  return (
    <Modal rotulo={f.categoria} titulo={s.id ? s.nome : 'Novo serviço'} aoFechar={aoFechar}>
      <div className="b-form">
        <label className="b-campo"><span className="rotulo">Nome</span><input {...campo('nome')} /></label>
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">Área</span><select {...campo('categoria')}>{categorias.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="b-campo"><span className="rotulo">Duração (min)</span><input type="number" min={10} step={5} {...campo('duracao')} /></label>
        </div>
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">Preço (R$)</span><input inputMode="decimal" {...campo('preco')} /></label>
          <label className="b-campo"><span className="rotulo">Parcelas sem juros</span><select {...campo('semJurosAte')}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}x</option>)}</select></label>
        </div>
        <label className="b-campo"><span className="rotulo">Descrição curta</span><input {...campo('descricao')} /></label>
        <label className="b-campo"><span className="rotulo">Comissão deste serviço (%)</span>
          <input inputMode="decimal" value={f.comissao} onChange={(e) => setF({ ...f, comissao: e.target.value.replace(/[^\d,.]/g, '') })} placeholder="Vazio = a da profissional" /></label>
        <fieldset className="b-opcoes">
          <legend className="rotulo">Produtos usados em cada sessão (baixa o estoque sozinho)</legend>
          {f.consumo.map((c, i) => {
            const pr = produtos.find((x) => x.id === c.produtoId);
            return (
              <div key={i} className="s-consumo">
                <select value={c.produtoId} onChange={(e) => setF({ ...f, consumo: f.consumo.map((y, k) => (k === i ? { ...y, produtoId: e.target.value } : y)) })} aria-label="Produto">
                  <option value="">Escolha…</option>{produtos.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                </select>
                <input inputMode="decimal" value={String(c.qtd).replace('.', ',')} onChange={(e) => setF({ ...f, consumo: f.consumo.map((y, k) => (k === i ? { ...y, qtd: e.target.value.replace(/[^\d,.]/g, '') } : y)) })} aria-label="Quantidade" />
                <span className="b-suave">{pr ? pr.unidade : ''}</span>
                <button type="button" className="cm-item__tirar" aria-label="Tirar" onClick={() => setF({ ...f, consumo: f.consumo.filter((_, k) => k !== i) })}>×</button>
              </div>
            );
          })}
          {produtos.length ? <button type="button" className="link-acao" onClick={() => setF({ ...f, consumo: [...f.consumo, { produtoId: '', qtd: 1 }] })}>+ produto</button>
            : <span className="b-suave">Cadastre os insumos em Estoque para usar aqui.</span>}
        </fieldset>
        <label className="b-check"><input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /> Disponível para agendar</label>
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--cheio" acao={async () => {
          setErro('');
          try {
            aoSalvar(await chamar('salvarServico', { servico: { ...f, preco: Number(String(f.preco).replace(',', '.')), duracao: Number(f.duracao), semJurosAte: Number(f.semJurosAte),
              comissao: f.comissao === '' ? '' : Number(String(f.comissao).replace(',', '.')), consumo: f.consumo.map((c) => ({ produtoId: c.produtoId, qtd: Number(String(c.qtd).replace(',', '.')) })) } }));
          } catch (e) { setErro(e.message); }
        }}>Salvar serviço</BotaoAcao>
      </div>
    </Modal>
  );
}

function EditarPacote({ p, servicos, aoFechar, aoSalvar }) {
  const { chamar } = useBancada();
  const [f, setF] = useState({ id: p.id || '', servicoId: p.servicoId, sessoes: p.sessoes || 5, preco: p.preco || '', validadeDias: p.validadeDias || 120, semJurosAte: p.semJurosAte || 3, ativo: p.ativo !== false });
  const [erro, setErro] = useState('');
  const serv = servicos.find((s) => s.id === f.servicoId);
  const campo = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });
  const avulso = serv ? serv.preco * Number(f.sessoes || 0) : 0;
  const preco = Number(String(f.preco).replace(',', '.'));
  return (
    <Modal rotulo={serv?.nome} titulo={p.id ? `Pacote de ${p.sessoes} sessões` : 'Novo pacote'} aoFechar={aoFechar}>
      <div className="b-form">
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">Sessões</span><input type="number" min={2} max={50} {...campo('sessoes')} disabled={!!p.id} /></label>
          <label className="b-campo"><span className="rotulo">Preço do pacote (R$)</span><input inputMode="decimal" {...campo('preco')} /></label>
        </div>
        {avulso > 0 && preco > 0 && <p className="b-suave">Avulso sairia {real(avulso)} · economia de {real(avulso - preco)} ({Math.round((1 - preco / avulso) * 100)}%).</p>}
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">Validade (dias)</span><input type="number" min={7} {...campo('validadeDias')} /></label>
          <label className="b-campo"><span className="rotulo">Parcelas sem juros</span><select {...campo('semJurosAte')}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}x</option>)}</select></label>
        </div>
        <label className="b-check"><input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /> Pacote à venda</label>
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--cheio" acao={async () => {
          setErro('');
          try { aoSalvar(await chamar('salvarPacote', { pacote: { ...f, preco, sessoes: Number(f.sessoes), validadeDias: Number(f.validadeDias), semJurosAte: Number(f.semJurosAte) } })); } catch (e) { setErro(e.message); }
        }}>Salvar pacote</BotaoAcao>
      </div>
    </Modal>
  );
}

export function Profissionais() {
  const { dados, erro, carregando, setDados } = useDados('catalogoServicos', {});
  const [editar, setEditar] = useState(null);
  if (carregando && !dados) return <Carregando />;
  if (!dados) return <Erro>{erro}</Erro>;
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return (
    <>
      <div className="b-barra-acoes">
        <p className="b-suave">Quem atende os serviços de estética e fisioterapia, as áreas de cada uma e o horário. Para a profissional ver a própria agenda, crie um acesso em Equipe com o mesmo nome.</p>
        <button type="button" className="botao botao--cheio botao--p" onClick={() => setEditar({ categorias: [], dias: [1, 2, 3, 4, 5], inicio: '', fim: '', ativo: true })}>Nova profissional</button>
      </div>
      {dados.profissionais.length === 0 && <Vazio titulo="Ninguém cadastrado ainda" forma="presenca">Cadastre as esteticistas e a fisioterapeuta para começar a agendar serviços.</Vazio>}
      <ul className="b-equipe">
        {dados.profissionais.map((p) => (
          <li key={p.nome} className={p.ativo ? '' : 'inativo'}>
            <div className="b-equipe__ini" aria-hidden="true">{p.nome.slice(0, 1)}</div>
            <div><strong>{p.nome}</strong><span className="b-suave">{p.servicos?.length ? `${p.servicos.length} serviço${p.servicos.length === 1 ? '' : 's'} · ${p.categorias.join(', ')}` : p.categorias.join(', ') || 'todas as áreas'}</span></div>
            <span className="b-suave">{p.dias.map((d) => dias[d]).join(' ')}</span>
            <span className="b-suave">{p.inicio && p.fim ? `${hora(p.inicio)} às ${hora(p.fim)}` : 'horário da casa'}{p.comissao ? ` · comissão padrão ${p.comissao}%` : ''}</span>
            <button type="button" className="link-acao" onClick={() => setEditar({ ...p, nomeOriginal: p.nome })}>editar</button>
          </li>
        ))}
      </ul>
      {editar && <EditarProfissional p={editar} categorias={dados.categorias} servicos={dados.servicos} aoFechar={() => setEditar(null)} aoSalvar={(d) => { setDados(d); setEditar(null); }} />}
    </>
  );
}

// faz o serviço? Com lista de serviços (como no Avec), vale a lista; senão, a área
const fazServico = (p, serv) => (p.servicos?.length ? p.servicos.some((c) => c.id === serv.id) : !p.categorias.length || p.categorias.includes(serv.categoria));

function EditarProfissional({ p, categorias, servicos, aoFechar, aoSalvar }) {
  const { chamar } = useBancada();
  const [f, setF] = useState(() => {
    // serviços que ela faz: { id: { comissao, duracao } } (vazio = vale o padrão)
    const marcados = {};
    if (p.servicos?.length) p.servicos.forEach((c) => { marcados[c.id] = { comissao: c.comissao == null ? '' : String(c.comissao), duracao: c.duracao ? String(c.duracao) : '' }; });
    else if (p.nome) servicos.filter((s) => s.ativo && fazServico(p, s)).forEach((s) => { marcados[s.id] = { comissao: '', duracao: '' }; });
    return { nome: p.nome || '', nomeOriginal: p.nomeOriginal, dias: p.dias || [], inicio: p.inicio || '', fim: p.fim || '', ativo: p.ativo !== false,
      comissao: p.comissao ? String(p.comissao) : '', comissaoProduto: p.comissaoProduto ? String(p.comissaoProduto) : '', servicos: marcados };
  });
  const [erro, setErro] = useState('');
  const alterna = (k, v) => setF((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v] }));
  const marcar = (lista, sim) => setF((x) => {
    const m = { ...x.servicos };
    lista.forEach((s) => { if (sim) m[s.id] = m[s.id] || { comissao: '', duracao: '' }; else delete m[s.id]; });
    return { ...x, servicos: m };
  });
  const mudar = (id, campo, v) => setF((x) => ({ ...x, servicos: { ...x.servicos, [id]: { ...x.servicos[id], [campo]: v } } }));
  const num = (v) => Number(String(v).replace(',', '.')) || 0;
  const porArea = categorias.map((c) => [c, servicos.filter((s) => s.categoria === c && (s.ativo || f.servicos[s.id]))]).filter(([, l]) => l.length);
  const qtd = Object.keys(f.servicos).length;

  async function salvar() {
    setErro('');
    if (!qtd) { setErro('Marque pelo menos um serviço que ela faz.'); return; }
    const lista = Object.entries(f.servicos).map(([id, c]) => ({ id, comissao: c.comissao === '' ? '' : num(c.comissao), duracao: c.duracao === '' ? '' : num(c.duracao) }));
    try {
      aoSalvar(await chamar('salvarProfissional', { profissional: { ...f, servicos: lista, comissao: num(f.comissao), comissaoProduto: num(f.comissaoProduto) } }));
    } catch (e) { setErro(e.message); }
  }

  return (
    <Modal rotulo="Profissional" titulo={p.nome || 'Nova profissional'} aoFechar={aoFechar} largo>
      <div className="b-form">
        <label className="b-campo"><span className="rotulo">Nome (como aparece na agenda)</span><input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></label>
        <fieldset className="b-opcoes">
          <legend className="rotulo">Dias de atendimento</legend>
          <div className="b-filtros">
            {[1, 2, 3, 4, 5, 6].map((d) => (
              <button key={d} type="button" className={`b-chip${f.dias.includes(d) ? ' b-chip--ativo' : ''}`} onClick={() => alterna('dias', d)}>{DIAS_LONGOS[d]}</button>
            ))}
          </div>
        </fieldset>
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">Começa às</span><input type="time" value={f.inicio} onChange={(e) => setF({ ...f, inicio: e.target.value })} /></label>
          <label className="b-campo"><span className="rotulo">Termina às</span><input type="time" value={f.fim} onChange={(e) => setF({ ...f, fim: e.target.value })} /></label>
        </div>
        <p className="b-suave">Sem horário, vale o da casa: seg a sex 6h–20h, sáb 7h–12h.</p>
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">Comissão padrão nos serviços (%)</span><input inputMode="decimal" value={f.comissao} onChange={(e) => setF({ ...f, comissao: e.target.value.replace(/[^\d,.]/g, '') })} placeholder="Ex.: 40" /></label>
          <label className="b-campo"><span className="rotulo">Comissão nos produtos (%)</span><input inputMode="decimal" value={f.comissaoProduto} onChange={(e) => setF({ ...f, comissaoProduto: e.target.value.replace(/[^\d,.]/g, '') })} placeholder="Ex.: 10" /></label>
        </div>

        <fieldset className="pf-servicos">
          <legend className="rotulo">Serviços e comissão · {qtd} marcado{qtd === 1 ? '' : 's'}</legend>
          <p className="b-suave">Marque o que ela faz. Comissão ou tempo em branco seguem o padrão (o número cinza).</p>
          {porArea.map(([area, lista]) => {
            const n = lista.filter((s) => f.servicos[s.id]).length;
            return (
              <div key={area} className="pf-grupo">
                <div className="pf-linha pf-linha--titulo">
                  <label className="pf-nome">
                    <input type="checkbox" checked={n === lista.length} ref={(el) => { if (el) el.indeterminate = n > 0 && n < lista.length; }} onChange={(e) => marcar(lista, e.target.checked)} />
                    <strong>{area}</strong>
                  </label>
                  <span>Comissão</span>
                  <span>Tempo</span>
                </div>
                {lista.map((s) => {
                  const c = f.servicos[s.id];
                  return (
                    <div key={s.id} className={`pf-linha${c ? '' : ' pf-linha--fora'}`}>
                      <label className="pf-nome"><input type="checkbox" checked={!!c} onChange={(e) => marcar([s], e.target.checked)} /><span>{s.nome}</span></label>
                      <label className="pf-num">
                        <input inputMode="decimal" disabled={!c} value={c?.comissao ?? ''} placeholder={String(s.comissao ?? (num(f.comissao) || 0))} aria-label={`Comissão em ${s.nome}`}
                          onChange={(e) => mudar(s.id, 'comissao', e.target.value.replace(/[^\d,.]/g, ''))} />
                        <span>%</span>
                      </label>
                      <label className="pf-num">
                        <input inputMode="numeric" disabled={!c} value={c?.duracao ?? ''} placeholder={String(s.duracao)} aria-label={`Tempo de ${s.nome}`}
                          onChange={(e) => mudar(s.id, 'duracao', e.target.value.replace(/\D/g, '').slice(0, 3))} />
                        <span>min</span>
                      </label>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </fieldset>

        <label className="b-check"><input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /> Atendendo</label>
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--cheio" acao={salvar}>Salvar</BotaoAcao>
      </div>
    </Modal>
  );
}

// Tudo que pode ser vendido ou dado de presente: planos de aula, serviços e pacotes
export function useItensVenda() {
  const { dados: planos } = useDados('planos', {});
  const { dados: cat } = useDados('catalogoServicos', {});
  return useMemo(() => {
    if (!planos) return null;
    const grupos = ['Yoga', 'Pilates'].map((m) => [m, planos.filter((p) => p.ativo && p.modalidade === m).map((p) => ({ id: p.id, nome: p.nome.replace(m + ' · ', ''), preco: p.preco }))]);
    if (cat) {
      cat.categorias.forEach((c) => {
        const itens = [];
        cat.servicos.filter((s) => s.ativo && s.categoria === c).forEach((s) => {
          itens.push({ id: s.id, nome: s.nome, preco: s.preco });
          cat.pacotes.filter((p) => p.ativo && p.servicoId === s.id).forEach((p) => itens.push({ id: p.id, nome: `${s.nome} · pacote ${p.sessoes} sessões`, preco: p.preco }));
        });
        if (itens.length) grupos.push([c, itens]);
      });
    }
    const todos = grupos.flatMap(([, l]) => l);
    return { grupos, achar: (id) => todos.find((i) => i.id === id) };
  }, [planos, cat]);
}

export function OpcoesItens({ itens }) {
  if (!itens) return null;
  return itens.grupos.filter(([, l]) => l.length).map(([g, l]) => (
    <optgroup key={g} label={g}>{l.map((i) => <option key={i.id} value={i.id}>{i.nome} · {real(i.preco)}</option>)}</optgroup>
  ));
}
