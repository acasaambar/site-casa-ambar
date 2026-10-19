import { useEffect, useMemo, useState } from 'react';
import { useBancada, pode } from './sessao.jsx';
import { useDados, Carregando, Erro, Modal, BuscaAluno, BotaoAcao, Vazio, Tag, real, hora, hojeIso, linkWhats, primeiro, telFmt, dataBR, DIAS_LONGOS,
  MESES, diaSemana } from './ui.jsx';
import { mascaraTelefone, soDigitos } from '../lib/util.js';
import { IconeWhatsapp } from '../components/Marca.jsx';

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

  const lista = dados?.atendimentos || [];
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
          <button type="button" className="botao botao--cheio botao--p" onClick={() => setNovo({ data: dia })}>Agendar serviço</button>
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
        aoReagendar={(a) => { setAberto(null); setNovo({ data: a.data, profissional: a.profissional, servicoId: a.servicoId, reagendar: a }); }} />}
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
  const profs = catalogo.profissionais.filter((p) => p.ativo && (!serv || !p.categorias.length || p.categorias.includes(serv.categoria)));

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
            <legend className="rotulo">Horário · {serv.duracao} min</legend>
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
function DetalheAtendimento({ a, aoFechar, aoMudar, aoReagendar }) {
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
                    <strong className="s-cat__preco">{real(s.preco)}</strong>
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
      {editar?.tipo === 'servico' && <EditarServico s={editar.v} categorias={dados.categorias} aoFechar={() => setEditar(null)} aoSalvar={(d) => { setDados(d); setEditar(null); }} />}
      {editar?.tipo === 'pacote' && <EditarPacote p={editar.v} servicos={dados.servicos} aoFechar={() => setEditar(null)} aoSalvar={(d) => { setDados(d); setEditar(null); }} />}
    </>
  );
}

function EditarServico({ s, categorias, aoFechar, aoSalvar }) {
  const { chamar } = useBancada();
  const [f, setF] = useState({ id: s.id || '', nome: s.nome || '', categoria: s.categoria, duracao: s.duracao || 60, preco: s.preco || '', descricao: s.descricao || '', semJurosAte: s.semJurosAte || 1, ativo: s.ativo !== false });
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
        <label className="b-check"><input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /> Disponível para agendar</label>
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--cheio" acao={async () => {
          setErro('');
          try { aoSalvar(await chamar('salvarServico', { servico: { ...f, preco: Number(String(f.preco).replace(',', '.')), duracao: Number(f.duracao), semJurosAte: Number(f.semJurosAte) } })); } catch (e) { setErro(e.message); }
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
            <div><strong>{p.nome}</strong><span className="b-suave">{p.categorias.join(', ') || 'todas as áreas'}</span></div>
            <span className="b-suave">{p.dias.map((d) => dias[d]).join(' ')}</span>
            <span className="b-suave">{p.inicio && p.fim ? `${hora(p.inicio)} às ${hora(p.fim)}` : 'horário da casa'}</span>
            <button type="button" className="link-acao" onClick={() => setEditar({ ...p, nomeOriginal: p.nome })}>editar</button>
          </li>
        ))}
      </ul>
      {editar && <EditarProfissional p={editar} categorias={dados.categorias} aoFechar={() => setEditar(null)} aoSalvar={(d) => { setDados(d); setEditar(null); }} />}
    </>
  );
}

function EditarProfissional({ p, categorias, aoFechar, aoSalvar }) {
  const { chamar } = useBancada();
  const [f, setF] = useState({ nome: p.nome || '', nomeOriginal: p.nomeOriginal, categorias: p.categorias || [], dias: p.dias || [], inicio: p.inicio || '', fim: p.fim || '', ativo: p.ativo !== false });
  const [erro, setErro] = useState('');
  const alterna = (k, v) => setF((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v] }));
  return (
    <Modal rotulo="Profissional" titulo={p.nome || 'Nova profissional'} aoFechar={aoFechar}>
      <div className="b-form">
        <label className="b-campo"><span className="rotulo">Nome (como aparece na agenda)</span><input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></label>
        <fieldset className="b-opcoes">
          <legend className="rotulo">Áreas que atende</legend>
          <div className="b-filtros">
            {categorias.map((c) => (
              <button key={c} type="button" className={`b-chip${f.categorias.includes(c) ? ' b-chip--ativo' : ''}`} onClick={() => alterna('categorias', c)}>{c}</button>
            ))}
          </div>
        </fieldset>
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
        <label className="b-check"><input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /> Atendendo</label>
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--cheio" acao={async () => {
          setErro('');
          try { aoSalvar(await chamar('salvarProfissional', { profissional: f })); } catch (e) { setErro(e.message); }
        }}>Salvar</BotaoAcao>
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
