// ============================================================
//  SUBSTITUIÇÕES: quando alguém da equipe não pode atender ou dar a aula
//  · TrocaProfissional: a folha da troca (um horário)
//  · AlguemNaoVem: tudo de uma pessoa no dia, com quem pode cobrir cada horário
//  · PainelTrocas: pedidos em aberto, histórico e resumo (aba "Trocas" da agenda)
//  · PedirSubstituicao: a profissional pede; administração e recepção fazem a troca
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { useBancada, pode } from './sessao.jsx';
import { useDados, Carregando, Erro, Modal, BotaoAcao, Tag, hora, hojeIso, somarDias, diaSemana, dataCurta, linkWhats, telFmt, primeiro, plural, ehDela,
  DIAS } from './ui.jsx';
import { IconeWhatsapp } from '../components/Marca.jsx';

const MOTIVOS_TROCA = ['Faltou', 'Atestado/saúde', 'Troca combinada', 'Curso/evento', 'Outro'];

// "hoje · 7h", "amanhã · 14h30", "qua, 21 out · 9h"
function quando(data, h) {
  const hoje = hojeIso();
  const dia = data === hoje ? 'hoje' : data === somarDias(hoje, 1) ? 'amanhã' : `${DIAS[diaSemana(data)]}, ${dataCurta(data)}`;
  return h ? `${dia} · ${hora(h)}` : dia;
}

const motivoTexto = (tipo, detalhe) => [tipo, String(detalhe || '').trim()].filter(Boolean).join(': ');

// situação de quem pode cobrir: [texto da etiqueta, tom, detalhe]
function situacao(c) {
  if (c.titular) return ['Titular', 'ambar', 'desfaz a troca'];
  if (c.agora) return ['Atual', 'neutro', 'continua no horário; muda só a regra da comissão'];
  if (c.ocupada) return ['Ocupada', 'alerta', c.ocupada];
  if (c.aviso) return [/^fora/.test(c.aviso) ? 'Fora do horário' : 'Atenção', 'aviso', c.aviso];
  return ['Livre', 'ok', ''];
}

// ---------- avisar os clientes (sem envio automático: a recepção manda um a um) ----------
export function AvisarClientes({ avisos = [] }) {
  const [feitos, setFeitos] = useState({});
  const [copiado, setCopiado] = useState('');
  if (!avisos.length) return <p className="b-suave tr-nota">Ninguém marcado neste horário: não há cliente para avisar.</p>;
  const copiar = async (p, i) => {
    try { await navigator.clipboard.writeText(p.texto); setCopiado(i); } catch { window.prompt('Copie a mensagem:', p.texto); }
    setFeitos((x) => ({ ...x, [i]: true }));
  };
  return (
    <div className="tr-avisar">
      <p className="tr-avisar__titulo"><strong>Avisar {avisos.length === 1 ? 'quem está marcado' : `as ${avisos.length} pessoas marcadas`}</strong>
        <span>O sistema não avisa sozinho. Abra o WhatsApp de cada pessoa com a mensagem pronta.</span></p>
      <ul className="tr-avisar__lista">
        {avisos.map((p, i) => (
          <li key={i} className={feitos[i] ? 'feito' : ''}>
            <span className="tr-avisar__quem"><strong>{p.nome}</strong><small>{p.whatsapp ? telFmt(p.whatsapp) : 'sem WhatsApp'}</small></span>
            <span className="tr-avisar__acoes">
              {p.whatsapp ? (
                <a className="botao botao--linha botao--p com-icone" href={linkWhats(p.whatsapp, p.texto)} target="_blank" rel="noreferrer"
                  onClick={() => setFeitos((x) => ({ ...x, [i]: true }))}><IconeWhatsapp tamanho={14} /> {feitos[i] ? 'Abrir de novo' : 'WhatsApp'}</a>
              ) : <Tag tom="aviso">sem WhatsApp</Tag>}
              <button type="button" className="link-acao" onClick={() => copiar(p, i)}>{copiado === i ? 'Copiada' : 'Copiar mensagem'}</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- resultado de uma troca ----------
function Resultado({ r, titular, aoDesfazer }) {
  return (
    <div className="b-form">
      <div className={`tr-feito${r.desfeita ? ' tr-feito--volta' : ''}`}>
        <strong>{r.desfeita ? 'Troca desfeita' : 'Troca feita'}</strong>
        <span>{r.desfeita ? `O horário voltou para ${r.profissional}.` : `Agora com ${r.profissional}. O horário já aparece na agenda de ${primeiro(r.profissional)}.`}</span>
      </div>
      {(r.alertas || []).map((a) => <p key={a} className="aviso">{a}</p>)}
      <AvisarClientes avisos={r.avisos} />
      {!r.desfeita && aoDesfazer && titular && (
        <BotaoAcao className="link-sair tr-desfazer" confirmar={`Desfazer a troca? O horário volta para ${titular}.`} acao={aoDesfazer}>Desfazer (voltar para {titular})</BotaoAcao>
      )}
    </div>
  );
}

// ============================================================
//  TROCAR PROFISSIONAL (um horário)
//  tipo: 'aula' | 'servico'; id: id da aula ("2026-10-20_07:00_pilates") ou do atendimento
// ============================================================
export function TrocaProfissional({ tipo, id, aoFechar, aoTerminar }) {
  const { membro, chamar } = useBancada();
  const admin = pode(membro, 'admin');
  const [d, setD] = useState(null);
  const [erroCarga, setErroCarga] = useState('');
  const [escolha, setEscolha] = useState('');
  const [regra, setRegra] = useState('substituta');
  const [motivo, setMotivo] = useState('');
  const [detalhe, setDetalhe] = useState('');
  const [erro, setErro] = useState('');
  const [confirmar, setConfirmar] = useState(null); // { texto } quando a pessoa está ocupada / fora do horário
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [mudou, setMudou] = useState(false);

  useEffect(() => {
    let vivo = true;
    chamar('opcoesSubstituicao', { tipo, ref: id })
      .then((r) => { if (vivo) { setD(r); setRegra(r.regra || 'substituta'); } })
      .catch((e) => vivo && setErroCarga(e.message));
    return () => { vivo = false; };
  }, [tipo, id, chamar]);

  const trocada = d && d.atual !== d.titular;
  // quando já está trocada, dá para manter a pessoa de agora e mudar só a regra da comissão
  const candidatos = useMemo(() => {
    if (!d) return [];
    // a titular vem primeiro (desfaz a troca); não repete o nome dela na lista
    const l = d.candidatos.filter((x, i, todos) => x.titular || !todos.some((y) => y.titular && y.nome === x.nome));
    if (trocada) l.splice(l[0]?.titular ? 1 : 0, 0, { nome: d.atual, ocupada: '', aviso: '', agora: true, comissao: null });
    return l;
  }, [d, trocada]);
  const c = candidatos.find((x) => x.nome === escolha);
  const volta = !!c?.titular;

  async function enviar(nome, opcoes = {}) {
    setErro('');
    setEnviando(true);
    try {
      const r = await chamar('substituir', { tipo, ref: id, substituto: nome, regra: opcoes.regra || regra, motivo: opcoes.motivo ?? motivoTexto(motivo, detalhe), forcar: !!opcoes.forcar });
      setConfirmar(null);
      setResultado(r);
      setMudou(true);
    } catch (e) {
      if (e.codigo === 'OCUPADA' || e.codigo === 'FORA_DO_HORARIO') setConfirmar({ texto: e.message });
      else setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  const fechar = () => (mudou ? aoTerminar?.(resultado) : aoFechar?.());
  const ehAula = tipo === 'aula';
  const titulo = ehAula ? 'Trocar quem dá a aula' : 'Trocar profissional';
  const rotulo = d ? `${d.titulo} · ${quando(d.data, d.hora)}` : ehAula ? 'Aula' : 'Atendimento';
  const precisaMotivo = !volta && !c?.agora && !d?.pedido;

  return (
    <Modal titulo={titulo} rotulo={rotulo} aoFechar={fechar} largo>
      {!d && !erroCarga && <Carregando texto="Vendo quem pode cobrir" />}
      <Erro>{erroCarga}</Erro>
      {d && resultado && <Resultado r={resultado} titular={d.titular} aoDesfazer={() => enviar(d.titular, { motivo: '' })} />}
      {d && resultado && <button type="button" className="botao botao--cheio tr-concluir" onClick={fechar}>Concluir</button>}
      {d && !resultado && (
        <div className="b-form">
          <div className="tr-agora">
            <span className="tr-agora__rotulo">{ehAula ? 'Dá a aula agora' : 'Atende agora'}</span>
            <strong>{d.atual}</strong>
            {trocada && <span className="tr-agora__titular">no lugar de {d.titular} (titular){admin && d.regra === 'titular' ? ` · comissão pela regra de ${primeiro(d.titular)}` : ''}</span>}
          </div>
          {d.pedido && (
            <p className="tr-pedido"><strong>Pedido de {d.pedido.titular || d.titular}:</strong> {d.pedido.motivo}</p>
          )}

          <fieldset className="b-opcoes tr-cand">
            <legend className="rotulo">Quem vai {ehAula ? 'dar a aula' : 'atender'}</legend>
            {candidatos.length === 0 && (
              <p className="b-suave">{ehAula ? 'Não há outra pessoa que dê aula cadastrada.' : 'Ninguém mais faz este serviço. Confira em Catálogo → Profissionais.'}</p>
            )}
            {candidatos.map((x) => {
              const [tag, tom, det] = situacao(x);
              return (
                <label key={x.nome + (x.agora ? '·agora' : '')} className={escolha === x.nome ? 'ativo' : ''}>
                  <input type="radio" name="troca-quem" checked={escolha === x.nome} onChange={() => { setEscolha(x.nome); setConfirmar(null); setErro(''); if (x.agora) setRegra(d.regra === 'titular' ? 'substituta' : 'titular'); }} />
                  <span className="tr-cand__info">
                    <strong>{x.nome}</strong>
                    {det && <small>{det}</small>}
                    {admin && x.comissao && !(x.aviso && /^sem valor/.test(x.comissao)) && <small className="tr-cand__comissao">Comissão: {x.comissao}</small>}
                  </span>
                  <Tag tom={tom}>{tag}</Tag>
                </label>
              );
            })}
          </fieldset>

          {c && !volta && (
            <fieldset className="b-opcoes tr-regra">
              <legend className="rotulo">Comissão deste horário</legend>
              <label className={regra === 'substituta' ? 'ativo' : ''}>
                <input type="radio" name="troca-regra" checked={regra === 'substituta'} onChange={() => setRegra('substituta')} />
                <span><strong>Regra de quem substitui{admin && c.comissao ? ` · ${c.comissao}` : ''}</strong><small>{c.nome} recebe pelo que tem cadastrado</small></span>
              </label>
              <label className={regra === 'titular' ? 'ativo' : ''}>
                <input type="radio" name="troca-regra" checked={regra === 'titular'} onChange={() => setRegra('titular')} />
                <span><strong>Regra de {d.titular} (titular){admin && d.comissaoTitular ? ` · ${d.comissaoTitular}` : ''}</strong><small>{c.nome} recebe pelos valores de {primeiro(d.titular)}</small></span>
              </label>
            </fieldset>
          )}

          {c && !volta && !c.agora && (
            <div className="b-linha2">
              <label className="b-campo"><span className="rotulo">Motivo{d.pedido ? ' (opcional)' : ''}</span>
                <select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                  <option value="">{d.pedido ? 'Manter o do pedido' : 'Escolha…'}</option>
                  {MOTIVOS_TROCA.map((m) => <option key={m}>{m}</option>)}
                </select></label>
              <label className="b-campo"><span className="rotulo">Detalhe (opcional)</span>
                <input value={detalhe} onChange={(e) => setDetalhe(e.target.value)} maxLength={80} placeholder="Ex.: consulta médica" /></label>
            </div>
          )}

          {confirmar && (
            <div className="aviso tr-confirmar" role="alert">
              <p>{confirmar.texto}</p>
              <div className="b-botoes">
                <BotaoAcao className="botao botao--cheio botao--p" acao={() => enviar(escolha, { forcar: true })}>Trocar mesmo assim</BotaoAcao>
                <button type="button" className="link-acao" onClick={() => { setConfirmar(null); setEscolha(''); }}>Escolher outra pessoa</button>
              </div>
            </div>
          )}
          <Erro>{erro}</Erro>
          {!confirmar && (
            <button type="button" className="botao botao--cheio" disabled={enviando || !c || (precisaMotivo && !motivo)} onClick={() => enviar(escolha)}>
              {enviando ? 'Trocando…' : !c ? 'Escolha quem vai cobrir' : volta ? `Desfazer a troca (volta para ${d.titular})` : c.agora ? 'Salvar a regra da comissão'
                : precisaMotivo && !motivo ? 'Escolha o motivo' : `Confirmar troca para ${c.nome}`}
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}

// ============================================================
//  ALGUÉM NÃO VEM: tudo da pessoa no período, trocando horário por horário
// ============================================================
export function AlguemNaoVem({ dia, aoFechar, aoTerminar }) {
  const { chamar } = useBancada();
  const { dados: catalogo } = useDados('catalogoServicos', {});
  const { dados: semana } = useDados('agenda', { de: hojeIso(), dias: 7 });
  const [f, setF] = useState({ profissional: '', data: dia && dia >= hojeIso() ? dia : hojeIso(), dias: 1, motivo: 'Faltou', detalhe: '' });
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [feitos, setFeitos] = useState({}); // ref → resultado
  const [escolhas, setEscolhas] = useState({}); // ref → nome
  const [confirmar, setConfirmar] = useState({}); // ref → mensagem
  const [erros, setErros] = useState({});
  const [detalhe, setDetalhe] = useState(null); // item aberto na folha completa
  const [bloqueio, setBloqueio] = useState('');
  const [mudou, setMudou] = useState(false);

  // quem trabalha na casa: profissionais de serviço + quem dá aula (grade dos próximos dias)
  const nomes = useMemo(() => {
    const s = new Map();
    (catalogo?.profissionais || []).filter((p) => p.ativo).forEach((p) => s.set(p.nome.toLowerCase(), p.nome));
    (semana || []).forEach((a) => [a.professor, a.titular].filter(Boolean).forEach((n) => s.has(n.toLowerCase()) || s.set(n.toLowerCase(), n)));
    return [...s.values()].sort((a, b) => a.localeCompare(b));
  }, [catalogo, semana]);

  async function ver(p = f) {
    if (!p.profissional) return;
    setErro('');
    setBuscando(true);
    try {
      const r = await chamar('ausencia', { profissional: p.profissional, data: p.data, dias: p.dias });
      setLista(r);
      // já deixa escolhida a primeira pessoa livre de cada horário
      const e = {};
      r.itens.forEach((it) => {
        const livre = it.candidatos.find((c) => !c.titular && !c.ocupada && !c.aviso) || it.candidatos.find((c) => !c.titular && !c.ocupada);
        e[it.ref] = livre ? livre.nome : '';
      });
      setEscolhas(e);
      setFeitos({}); setConfirmar({}); setErros({}); setBloqueio('');
    } catch (e) {
      setErro(e.message);
    } finally {
      setBuscando(false);
    }
  }

  async function trocar(it, forcar = false) {
    setErros((x) => ({ ...x, [it.ref]: '' }));
    try {
      const r = await chamar('substituir', { tipo: it.tipo, ref: it.ref, substituto: escolhas[it.ref], regra: 'substituta', motivo: motivoTexto(f.motivo, f.detalhe), forcar });
      setFeitos((x) => ({ ...x, [it.ref]: r }));
      setConfirmar((x) => ({ ...x, [it.ref]: '' }));
      setMudou(true);
    } catch (e) {
      if (e.codigo === 'OCUPADA' || e.codigo === 'FORA_DO_HORARIO') setConfirmar((x) => ({ ...x, [it.ref]: e.message }));
      else setErros((x) => ({ ...x, [it.ref]: e.message }));
    }
  }

  async function bloquear() {
    setErro('');
    try {
      for (let i = 0; i < f.dias; i++) {
        await chamar('salvarFolga', { profissional: lista.profissional, data: somarDias(f.data, i), diaTodo: true, motivo: motivoTexto(f.motivo, f.detalhe) || 'Não vem' });
      }
      setBloqueio(`Agenda de ${primeiro(lista.profissional)} bloqueada ${f.dias === 1 ? 'neste dia' : `por ${f.dias} dias`}: ninguém consegue marcar horário nela.`);
      setMudou(true);
    } catch (e) {
      setErro(e.message);
    }
  }

  if (detalhe) {
    return <TrocaProfissional tipo={detalhe.tipo} id={detalhe.ref} aoFechar={() => setDetalhe(null)}
      aoTerminar={(r) => { setDetalhe(null); setMudou(true); if (r) setFeitos((x) => ({ ...x, [detalhe.ref]: r })); }} />;
  }

  const campo = (k, num) => ({ value: f[k], onChange: (e) => { setF({ ...f, [k]: num ? Number(e.target.value) : e.target.value }); if (k !== 'motivo' && k !== 'detalhe') setLista(null); } });
  const pendentes = lista ? lista.itens.filter((it) => !feitos[it.ref]).length : 0;

  return (
    <Modal titulo="Alguém não vem" rotulo="Troque quem cobre cada aula e atendimento" aoFechar={() => (mudou ? aoTerminar?.() : aoFechar?.())} largo>
      <div className="b-form">
        {lista ? (
          <div className="tr-ausencia__resumo">
            <span><strong>{lista.profissional}</strong> não vem · {quando(f.data)}{f.dias > 1 ? ` e mais ${plural(f.dias - 1, 'dia', 'dias')}` : ''} · {motivoTexto(f.motivo, f.detalhe)}</span>
            <button type="button" className="link-acao" onClick={() => setLista(null)}>Mudar</button>
          </div>
        ) : (<>
        <div className="tr-ausencia__form">
          <label className="b-campo tr-ausencia__quem"><span className="rotulo">Quem não vem</span>
            <select {...campo('profissional')}>
              <option value="">{nomes.length ? 'Escolha…' : 'Carregando a equipe…'}</option>
              {nomes.map((n) => <option key={n}>{n}</option>)}
            </select></label>
          <label className="b-campo"><span className="rotulo">A partir de</span><input type="date" min={hojeIso()} {...campo('data')} /></label>
          <label className="b-campo"><span className="rotulo">Por quantos dias</span>
            <select {...campo('dias', true)}>{[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{plural(n, 'dia', 'dias')}</option>)}</select></label>
        </div>
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">Motivo</span>
            <select {...campo('motivo')}>{MOTIVOS_TROCA.map((m) => <option key={m}>{m}</option>)}</select></label>
          <label className="b-campo"><span className="rotulo">Detalhe (opcional)</span><input {...campo('detalhe')} maxLength={80} placeholder="Ex.: gripe" /></label>
        </div>
        {!lista && (
          <BotaoAcao className="botao botao--cheio" disabled={!f.profissional || buscando} acao={() => ver()}>
            {f.profissional ? `Ver os horários de ${primeiro(f.profissional)}` : 'Escolha quem não vem'}
          </BotaoAcao>
        )}
        </>)}
        <Erro>{erro}</Erro>

        {lista && (
          <>
            <div className="tr-ausencia__topo">
              <strong>{lista.itens.length === 0 ? `${lista.profissional} não tem aula nem atendimento ${f.dias === 1 ? 'neste dia' : 'nesses dias'}.`
                : `${plural(lista.itens.length, 'horário', 'horários')} de ${lista.profissional}${pendentes && pendentes < lista.itens.length ? ` · ${pendentes} sem troca` : ''}`}</strong>
              <button type="button" className="link-acao" onClick={() => ver()}>Atualizar</button>
            </div>
            <ul className="tr-itens">
              {lista.itens.map((it) => {
                const r = feitos[it.ref];
                return (
                  <li key={it.ref} className={`tr-item${r ? ' tr-item--feito' : ''}`}>
                    <div className="tr-item__topo">
                      <span className="tr-item__hora">{hora(it.hora)}</span>
                      <span className="tr-item__oque"><strong>{it.titulo}</strong><small>{quando(it.data)}{it.pedido ? ` · pediu troca: ${it.pedido.motivo}` : ''}</small></span>
                      {r && <Tag tom="ok">{r.desfeita ? `Voltou para ${r.profissional}` : `Com ${r.profissional}`}</Tag>}
                    </div>
                    {!r && (
                      <div className="tr-item__troca">
                        <label className="b-campo"><span className="rotulo">Quem cobre</span>
                          <select value={escolhas[it.ref] || ''} onChange={(e) => { setEscolhas((x) => ({ ...x, [it.ref]: e.target.value })); setConfirmar((x) => ({ ...x, [it.ref]: '' })); }}>
                            <option value="">{it.candidatos.length ? 'Escolha…' : 'Ninguém disponível'}</option>
                            {it.candidatos.filter((c, i, todos) => c.titular || !todos.some((y) => y.titular && y.nome === c.nome)).map((c) => { const [t, , det] = situacao(c); return <option key={c.nome} value={c.nome}>{c.nome} · {det && t !== 'Livre' ? det.replace(/\s*\(.*\)$/, '') : t.toLowerCase()}</option>; })}
                          </select></label>
                        <BotaoAcao className="botao botao--cheio botao--p" disabled={!escolhas[it.ref] || !!confirmar[it.ref]} acao={() => trocar(it)}>Trocar</BotaoAcao>
                        <button type="button" className="link-acao" onClick={() => setDetalhe(it)}>Mais opções</button>
                      </div>
                    )}
                    {confirmar[it.ref] && (
                      <div className="aviso tr-confirmar" role="alert">
                        <p>{confirmar[it.ref]}</p>
                        <div className="b-botoes">
                          <BotaoAcao className="botao botao--cheio botao--p" acao={() => trocar(it, true)}>Trocar mesmo assim</BotaoAcao>
                          <button type="button" className="link-acao" onClick={() => setConfirmar((x) => ({ ...x, [it.ref]: '' }))}>Escolher outra pessoa</button>
                        </div>
                      </div>
                    )}
                    <Erro>{erros[it.ref]}</Erro>
                    {r && (r.alertas || []).map((a) => <p key={a} className="aviso">{a}</p>)}
                    {r && <AvisarClientes avisos={r.avisos} />}
                  </li>
                );
              })}
            </ul>
            {lista.servicos && (
              <div className="tr-bloquear">
                {bloqueio ? <p className="tr-feito"><strong>Pronto</strong><span>{bloqueio}</span></p> : (
                  <>
                    <p><strong>Bloquear a agenda de {primeiro(lista.profissional)}</strong>
                      <span>{f.dias === 1 ? 'O dia todo, para ninguém marcar horário neste dia.' : `O dia todo, nos ${f.dias} dias, para ninguém marcar horário.`}</span></p>
                    <BotaoAcao className="botao botao--linha botao--p" acao={bloquear}>Bloquear {f.dias === 1 ? 'o dia' : `os ${f.dias} dias`}</BotaoAcao>
                  </>
                )}
              </div>
            )}
            <button type="button" className="botao botao--cheio" onClick={() => (mudou ? aoTerminar?.() : aoFechar?.())}>Concluir</button>
          </>
        )}
      </div>
    </Modal>
  );
}

// ============================================================
//  PEDIR SUBSTITUIÇÃO (profissional)
//  item = { tipo, ref, titulo, data, hora } para pedir um horário só
// ============================================================
export function PedirSubstituicao({ dia, item, aoFechar, aoEnviar }) {
  const { chamar } = useBancada();
  const [f, setF] = useState({ data: dia && dia >= hojeIso() ? dia : hojeIso(), diaTodo: true, de: '08:00', ate: '12:00', dias: 1, motivo: '' });
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState(null);
  const campo = (k, num) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: num ? Number(e.target.value) : e.target.value }) });

  async function enviar() {
    setErro('');
    try {
      const r = item
        ? await chamar('pedirSubstituicao', { tipo: item.tipo, ref: item.ref, motivo: f.motivo })
        : await chamar('pedirSubstituicao', { data: f.data, dias: f.dias, de: f.diaTodo ? '' : f.de, ate: f.diaTodo ? '' : f.ate, motivo: f.motivo });
      setEnviado(r);
    } catch (e) {
      setErro(e.message);
    }
  }

  if (enviado) {
    return (
      <Modal titulo="Pedido enviado" aoFechar={aoEnviar}>
        <div className="b-form">
          <div className="tr-feito">
            <strong>Pedido enviado para a recepção ({plural(enviado.pedidos, 'horário', 'horários')})</strong>
            <span>A recepção escolhe quem cobre e avisa os clientes. Acompanhe a resposta em Agenda → Trocas.</span>
          </div>
          <button type="button" className="botao botao--cheio" onClick={aoEnviar}>Ok</button>
        </div>
      </Modal>
    );
  }
  return (
    <Modal titulo="Pedir substituição" rotulo={item ? `${item.titulo} · ${quando(item.data, item.hora)}` : 'A recepção escolhe quem cobre seus horários'} aoFechar={aoFechar}>
      <div className="b-form">
        {!item && (
          <>
            <div className="b-linha2">
              <label className="b-campo"><span className="rotulo">A partir de</span><input type="date" min={hojeIso()} {...campo('data')} /></label>
              <label className="b-campo"><span className="rotulo">Por quantos dias</span>
                <select {...campo('dias', true)}>{Array.from({ length: 14 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{plural(n, 'dia', 'dias')}</option>)}</select></label>
            </div>
            <label className="b-check"><input type="checkbox" checked={f.diaTodo} onChange={(e) => setF({ ...f, diaTodo: e.target.checked })} /> O dia todo</label>
            {!f.diaTodo && (
              <div className="b-linha2">
                <label className="b-campo"><span className="rotulo">Das</span><input type="time" step={900} {...campo('de')} /></label>
                <label className="b-campo"><span className="rotulo">Até</span><input type="time" step={900} {...campo('ate')} /></label>
              </div>
            )}
          </>
        )}
        <label className="b-campo"><span className="rotulo">Motivo</span>
          <input {...campo('motivo')} maxLength={120} placeholder="Ex.: consulta médica, viagem, curso" required aria-invalid={!f.motivo.trim()} /></label>
        <p className="b-suave tr-nota">Seus horários continuam com você até a recepção confirmar a troca.</p>
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--cheio" disabled={!f.motivo.trim()} acao={enviar}>{f.motivo.trim() ? 'Enviar pedido' : 'Conte o motivo'}</BotaoAcao>
      </div>
    </Modal>
  );
}

// ============================================================
//  PAINEL DE TROCAS (aba da agenda)
// ============================================================
const STATUS_TROCA = {
  feita: ['Trocada', 'ok'],
  desfeita: ['Desfeita', 'apagado'],
  recusada: ['Recusada', 'alerta'],
  cancelada: ['Cancelada', 'apagado'],
  pedido: ['Pedido em aberto', 'aviso'],
};

export function PainelTrocas({ dia, aoMudar }) {
  const { membro, chamar } = useBancada();
  const balcao = pode(membro, 'admin', 'recepcao');
  const { dados, erro, carregando, recarregar } = useDados('substituicoes', {});
  const [resolver, setResolver] = useState(null);
  const [recusar, setRecusar] = useState(null); // { id, resposta }
  const [pedir, setPedir] = useState(false);
  const [aviso, setAviso] = useState('');
  const atualizar = () => { recarregar(); aoMudar?.(); };

  if (carregando && !dados) return <Carregando />;
  if (!dados) return <Erro>{erro}</Erro>;
  const hoje = hojeIso();
  const cubro = balcao ? [] : dados.historico.filter((s) => s.status === 'feita' && ehDela(s.substituto, membro) && s.data >= hoje).reverse();
  const historico = balcao ? dados.historico : dados.historico.filter((s) => !cubro.includes(s));

  return (
    <div className="tr-painel">
      <Erro>{erro}</Erro>
      {aviso && <p className="aviso" role="status">{aviso}</p>}
      {!balcao && (
        <div className="tr-painel__barra">
          <p className="b-suave">Não vai poder atender ou dar aula? Peça aqui: a recepção escolhe quem cobre e avisa os clientes.</p>
          <button type="button" className="botao botao--cheio botao--p" onClick={() => setPedir(true)}>Pedir substituição</button>
        </div>
      )}

      <section className="b-cartao">
        <header className="b-cartao__topo">
          <h2 className="b-cartao__titulo">{balcao ? 'Pedidos de troca' : 'Meus pedidos em aberto'}</h2>
          {dados.pedidos.length > 0 && <Tag tom="aviso">{plural(dados.pedidos.length, 'em aberto', 'em aberto')}</Tag>}
        </header>
        {dados.pedidos.length === 0 ? (
          <p className="b-suave">{balcao ? 'Nenhum pedido em aberto. Quando alguém da equipe pedir substituição, aparece aqui.' : 'Nenhum pedido em aberto.'}</p>
        ) : (
          <ul className="tr-pedidos">
            {dados.pedidos.map((p) => (
              <li key={p.id} className="tr-ped">
                <span className="tr-item__hora">{hora(p.hora)}</span>
                <div className="tr-ped__info">
                  <strong>{p.titulo}</strong>
                  <small>{quando(p.data)}{balcao ? ` · com ${p.titular}` : ''}</small>
                  <span className="tr-ped__motivo">“{p.motivo}”</span>
                </div>
                <div className="tr-ped__acoes">
                  {balcao ? (
                    <>
                      <button type="button" className="botao botao--cheio botao--p" onClick={() => setResolver(p)}>Resolver</button>
                      <button type="button" className="link-sair" onClick={() => setRecusar({ id: p.id, resposta: '' })}>Recusar</button>
                    </>
                  ) : (
                    <BotaoAcao className="link-sair" confirmar="Cancelar este pedido? O horário continua com você." acao={async () => {
                      setAviso('');
                      try { await chamar('cancelarPedido', { id: p.id }); atualizar(); } catch (e) { setAviso(e.message); }
                    }}>Cancelar pedido</BotaoAcao>
                  )}
                </div>
                {recusar?.id === p.id && (
                  <div className="tr-recusar">
                    <label className="b-campo"><span className="rotulo">Resposta para {primeiro(p.titular)} (opcional)</span>
                      <input value={recusar.resposta} onChange={(e) => setRecusar({ ...recusar, resposta: e.target.value })} maxLength={200} placeholder="Ex.: não temos quem cubra, vamos remarcar" autoFocus /></label>
                    <div className="b-botoes">
                      <BotaoAcao className="botao botao--linha botao--p botao--perigo" acao={async () => {
                        setAviso('');
                        try { await chamar('cancelarPedido', { id: p.id, resposta: recusar.resposta }); setRecusar(null); atualizar(); } catch (e) { setAviso(e.message); }
                      }}>Recusar pedido</BotaoAcao>
                      <button type="button" className="link-acao" onClick={() => setRecusar(null)}>Voltar</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {!balcao && cubro.length > 0 && (
        <section className="b-cartao">
          <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Horários que você cobre</h2></header>
          <ul className="tr-hist">
            {cubro.map((s) => (
              <li key={s.id} className="tr-hist__item">
                <span className="tr-hist__quando"><strong>{hora(s.hora)}</strong><small>{quando(s.data)}</small></span>
                <span className="tr-hist__info"><strong>{s.titulo}</strong><small>Você cobre {s.titular}</small></span>
                <Tag tom="ok">Com você</Tag>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="b-cartao">
        <header className="b-cartao__topo">
          <div>
            <h2 className="b-cartao__titulo">Histórico</h2>
            <p className="b-suave">Últimos 30 dias e próximos 60.</p>
          </div>
        </header>
        {historico.length === 0 ? <p className="b-suave">Nenhuma troca neste período.</p> : (
          <ul className="tr-hist">
            {historico.map((s) => {
              const st = STATUS_TROCA[s.status] || [s.status, 'neutro'];
              const quem = s.status === 'feita' || s.status === 'desfeita'
                ? (balcao ? `${s.titular} → ${s.substituto}` : s.status === 'desfeita' ? (ehDela(s.substituto, membro) ? `Você ia cobrir ${s.titular}` : `${s.substituto} ia cobrir você`)
                  : ehDela(s.substituto, membro) ? `Você cobriu ${s.titular}` : `${s.substituto} no seu lugar`)
                : balcao ? `Pedido de ${s.titular}` : 'Seu pedido';
              return (
                <li key={s.id} className="tr-hist__item">
                  <span className="tr-hist__quando"><strong>{hora(s.hora)}</strong><small>{quando(s.data)}</small></span>
                  <span className="tr-hist__info">
                    <strong>{s.titulo}</strong>
                    <small>{quem}{s.motivo ? ` · ${s.motivo}` : ''}{balcao && s.status === 'feita' && s.regra === 'titular' ? ` · comissão pela regra de ${primeiro(s.titular)}` : ''}</small>
                    {s.resposta && <small className="tr-hist__resposta">Resposta: {s.resposta}</small>}
                  </span>
                  <Tag tom={st[1]}>{st[0]}</Tag>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {balcao && dados.resumo.length > 0 && (
        <section className="b-cartao">
          <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Por pessoa</h2></header>
          <ul className="tr-resumo">
            {dados.resumo.map((p) => (
              <li key={p.nome}>
                <strong>{p.nome}</strong>
                <span>{p.substituida ? `${plural(p.substituida, 'horário passou', 'horários passaram')} para outra pessoa` : ''}{p.substituida && p.cobriu ? ' · ' : ''}{p.cobriu ? `cobriu ${plural(p.cobriu, 'horário', 'horários')}` : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {resolver && <TrocaProfissional tipo={resolver.tipo} id={resolver.ref} aoFechar={() => setResolver(null)} aoTerminar={() => { setResolver(null); atualizar(); }} />}
      {pedir && <PedirSubstituicao dia={dia} aoFechar={() => setPedir(false)} aoEnviar={() => { setPedir(false); atualizar(); }} />}
    </div>
  );
}
