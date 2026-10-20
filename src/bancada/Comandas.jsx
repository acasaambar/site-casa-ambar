import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useBancada, pode } from './sessao.jsx';
import { useDados, BANDEIRAS, ehCartao, faltaBandeira, Carregando, Erro, Cabecalho, Modal, BotaoAcao, Vazio, Tag, BuscaAluno, Segmento, real, hora, hojeIso, somarDias, dataBR, linkWhats, primeiro,
  telFmt, numBR, plural, METODOS } from './ui.jsx';
import { mascaraTelefone, soDigitos } from '../lib/util.js';
import { IconeWhatsapp } from '../components/Marca.jsx';

const ROTULO_TIPO = { servico: 'Serviço', pacote: 'Pacote', plano: 'Aula e plano', produto: 'Produto', vale: 'Vale-presente' };
const NOME_TIPO = { servico: 'serviço', pacote: 'pacote', plano: 'aula ou plano', produto: 'produto' };
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());
const numTxt = (v) => (v == null || v === '' ? '' : String(Math.round(Number(v) * 100) / 100).replace('.', ','));
const centavos = (v) => Math.round(Number(v || 0) * 100) / 100;
const semAcento = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ============================================================
//  PÁGINA: comandas abertas, fechadas e o caixa do dia
// ============================================================
export default function Comandas() {
  const local = useLocation();
  const [vista, setVista] = useState(local.state?.vista || 'abertas');
  const [aberta, setAberta] = useState(local.state?.nova ? { nova: true } : null);
  const [versao, setVersao] = useState(0);
  return (
    <>
      <Cabecalho titulo="Comandas" acoes={<button type="button" className="botao botao--cheio botao--p" onClick={() => setAberta({ nova: true })}>Nova comanda</button>}>
        A conta de cada visita: serviços, produtos e planos, com uma ou mais formas de pagamento.
      </Cabecalho>
      <Segmento rotulo="O que mostrar" atual={vista} aoMudar={setVista} itens={[['abertas', 'Abertas'], ['fechadas', 'Fechadas'], ['caixa', 'Caixa do dia']]} />
      {vista === 'abertas' && <Abertas key={versao} aoAbrir={setAberta} />}
      {vista === 'fechadas' && <Fechadas key={versao} aoAbrir={setAberta} />}
      {vista === 'caixa' && <CaixaDoDia key={versao} diaInicial={local.state?.dia} />}
      {aberta && <ComandaModal id={aberta.id} aoFechar={() => { setAberta(null); setVersao((v) => v + 1); }} />}
    </>
  );
}

function tempoDesde(texto) {
  const t = new Date(String(texto).replace(' ', 'T') + '-03:00').getTime();
  const min = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (min < 2) return 'agora';
  if (min < 60) return `há ${min} min`;
  if (min < 24 * 60) return `há ${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
  return `desde ${dataBR(texto)}`;
}

function Abertas({ aoAbrir }) {
  const { dados, erro, carregando } = useDados('comandas', { status: 'aberta' });
  if (carregando && !dados) return <Carregando />;
  return (
    <>
      <Erro>{erro}</Erro>
      {dados && dados.length === 0 && <Vazio titulo="Nenhuma comanda aberta" forma="presenca">Abra pela agenda (no atendimento) ou em “Nova comanda”.</Vazio>}
      <ul className="cm-notas">
        {(dados || []).map((c) => (
          <li key={c.id}>
            <button type="button" className="cm-nota" onClick={() => aoAbrir({ id: c.id })}>
              <span className="cm-nota__quem">{c.nome}</span>
              <span className="cm-nota__itens">{c.itens.map((i) => i.nome).join(' · ') || 'sem itens'}</span>
              <span className="cm-nota__pe">
                <span className="b-suave">{tempoDesde(c.abertaEm)} · {c.abertaPor}</span>
                <strong>{real(c.total)}</strong>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function Fechadas({ aoAbrir }) {
  const { membro } = useBancada();
  const [de, setDe] = useState(hojeIso());
  const [ate, setAte] = useState(hojeIso());
  const { dados, erro, carregando } = useDados('comandas', { status: 'fechada', de, ate });
  const total = (dados || []).reduce((s, c) => s + c.total, 0);
  return (
    <>
      <div className="b-periodo">
        <label className="b-campo"><span className="rotulo">De</span><input type="date" value={de} onChange={(e) => e.target.value && setDe(e.target.value)} /></label>
        <label className="b-campo"><span className="rotulo">Até</span><input type="date" value={ate} onChange={(e) => e.target.value && setAte(e.target.value)} /></label>
        {dados && <p className="b-suave">{plural(dados.length, 'comanda', 'comandas')} · {real(total)}</p>}
      </div>
      {pode(membro, 'admin') && dados?.length > 0 && <p className="b-suave cm-dica">Para corrigir uma comanda fechada, abra-a e use “Reabrir para corrigir”.</p>}
      <Erro>{erro}</Erro>
      {carregando && !dados && <Carregando />}
      {dados && dados.length === 0 && <Vazio titulo="Nenhuma comanda fechada no período" />}
      {dados && dados.length > 0 && (
        <div className="b-tabela-caixa">
          <table className="b-tabela b-tabela--clicavel">
            <thead><tr><th>Fechada</th><th>Cliente</th><th>Itens</th><th>Pagamento</th><th className="num">Total</th></tr></thead>
            <tbody>
              {dados.map((c) => (
                <tr key={c.id} onClick={() => aoAbrir({ id: c.id })} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && aoAbrir({ id: c.id })}>
                  <td data-rotulo="Fechada">{dataBR(c.fechadaEm)} {hora(c.fechadaEm.slice(11, 16))}</td>
                  <td data-rotulo="Cliente">{c.nome}</td>
                  <td data-rotulo="Itens">{c.itens.map((i) => i.nome + (i.qtd > 1 ? ` × ${i.qtd}` : '')).join(' · ')}</td>
                  <td data-rotulo="Pagamento">{c.pagamentos.map((p) => `${p.metodo}${p.bandeira ? ` ${p.bandeira}` : ''}`).join(' + ') || '—'}</td>
                  <td data-rotulo="Total" className="num">{real(c.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ============================================================
//  CATÁLOGO PARA A COMANDA
// ============================================================
export function useCatalogoComanda() {
  const { dados: planos } = useDados('planos', {});
  const { dados: cat } = useDados('catalogoServicos', {});
  return useMemo(() => {
    if (!planos || !cat) return null;
    const itens = [];
    cat.servicos.filter((s) => s.ativo).forEach((s) => {
      itens.push({ tipo: 'servico', id: s.id, nome: s.nome, preco: s.preco, grupo: s.categoria });
      cat.pacotes.filter((p) => p.ativo && p.servicoId === s.id).forEach((p) => itens.push({ tipo: 'pacote', id: p.id, nome: `${s.nome} · pacote ${p.sessoes} sessões`, preco: p.preco, grupo: s.categoria }));
    });
    (cat.produtos || []).filter((p) => p.vende).forEach((p) => itens.push({ tipo: 'produto', id: p.id, nome: p.nome, preco: p.preco, grupo: 'Produtos', estoque: p.estoque }));
    planos.filter((p) => p.ativo).forEach((p) => itens.push({ tipo: 'plano', id: p.id, nome: p.nome, preco: p.preco, grupo: p.modalidade }));
    const profs = cat.profissionais.filter((p) => p.ativo);
    return { itens, profissionais: profs.map((p) => p.nome), profs, achar: (id) => itens.find((i) => i.id === id) };
  }, [planos, cat]);
}

// quem faz o serviço primeiro (Catálogo → Profissionais); as outras pessoas depois
function profissionaisDoItem(catalogo, tipo, id) {
  if (!catalogo) return { fazem: [], outras: [] };
  if (tipo !== 'servico') return { fazem: catalogo.profissionais, outras: [] };
  const serv = catalogo.achar(id);
  const faz = (p) => (p.servicos?.length ? p.servicos.some((c) => c.id === id) : !p.categorias?.length || (serv && p.categorias.includes(serv.grupo)));
  return { fazem: catalogo.profs.filter(faz).map((p) => p.nome), outras: catalogo.profs.filter((p) => !faz(p)).map((p) => p.nome) };
}

function EscolherItem({ catalogo, aoEscolher, filtro, placeholder = 'Adicionar serviço, produto ou plano', autoFocus }) {
  const [q, setQ] = useState('');
  const [aberto, setAberto] = useState(!!autoFocus);
  const caixa = useRef(null);
  const lista = useMemo(() => {
    if (!catalogo) return [];
    const t = semAcento(q.trim());
    return catalogo.itens.filter((i) => (!filtro || filtro(i)) && (!t || semAcento(i.nome + ' ' + i.grupo).includes(t))).slice(0, 40);
  }, [catalogo, q, filtro]);
  useEffect(() => {
    const fora = (e) => { if (caixa.current && !caixa.current.contains(e.target)) setAberto(false); };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);
  const grupos = [];
  lista.forEach((i) => { const g = grupos.find((x) => x[0] === i.grupo); if (g) g[1].push(i); else grupos.push([i.grupo, [i]]); });
  return (
    <div className="cm-busca" ref={caixa}>
      <input type="search" value={q} placeholder={catalogo ? placeholder : 'Carregando catálogo…'} disabled={!catalogo} autoFocus={autoFocus}
        onFocus={() => setAberto(true)} onChange={(e) => { setQ(e.target.value); setAberto(true); }} aria-label={placeholder} />
      {aberto && lista.length > 0 && (
        <div className="cm-busca__lista" role="listbox">
          {grupos.map(([g, l]) => (
            <div key={g}>
              <span className="cm-busca__grupo">{g}</span>
              {l.map((i) => (
                <button key={i.tipo + i.id} type="button" role="option" aria-selected="false" onClick={() => { aoEscolher(i); setQ(''); setAberto(false); }}>
                  <span>{i.nome}{i.tipo === 'produto' && <small> · {i.estoque} em estoque</small>}</span>
                  <strong>{real(i.preco)}</strong>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
      {aberto && q.trim() && lista.length === 0 && <p className="b-suave cm-busca__nada">Nada encontrado com essa busca.</p>}
    </div>
  );
}

// "14h20" (hoje) ou "18/10 14h20"
function quandoHist(q) {
  const d = String(q || '').slice(0, 10);
  const h = hora(String(q || '').slice(11, 16));
  return d === hojeIso() ? h : `${dataBR(d).slice(0, 5)} ${h}`;
}

// ============================================================
//  A COMANDA (folha lateral)
// ============================================================
// id: comanda existente · inicial: { cpf, nome, itens } para abrir uma nova já preenchida
export function ComandaModal({ id, inicial, aoFechar }) {
  const { membro, chamar } = useBancada();
  const catalogo = useCatalogoComanda();
  const [c, setC] = useState(null);
  const [cliente, setCliente] = useState(inicial?.cpf ? { cpf: inicial.cpf, nome: inicial.nome } : null);
  const [semCadastro, setSemCadastro] = useState(null);
  const [codigo, setCodigo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [pagar, setPagar] = useState(false);
  const [editando, setEditando] = useState(null); // índice do item no editor
  const [vale, setVale] = useState(null); // { idx? } folha do vale-presente
  const [tirando, setTirando] = useState(null); // índice do item que vai sair
  const [motivoTirar, setMotivoTirar] = useState('');
  const [cancelando, setCancelando] = useState(false);
  const [motivoCancelar, setMotivoCancelar] = useState('');
  const [reabrindo, setReabrindo] = useState(false);
  const [motivoReabrir, setMotivoReabrir] = useState('');
  const [erroReabrir, setErroReabrir] = useState('');
  const [valesCriados, setValesCriados] = useState([]);

  useEffect(() => {
    if (!id) return;
    chamar('comanda', { id }).then((r) => { setC(r); setCodigo(r.codigo); }).catch((e) => setErro(e.message));
  }, [id, chamar]);

  // grava e devolve a comanda nova; erro sobe para quem chamou
  async function gravar(mud) {
    setSalvando(true);
    try {
      const base = c ? { id: c.id, itens: c.itens, codigo: c.codigo, obs: c.obs } : { itens: [], ...(cliente?.cpf ? { cpf: cliente.cpf } : semCadastro ? { cliente: semCadastro } : {}) };
      const r = await chamar('salvarComanda', { comanda: { ...base, ...mud } });
      setC(r);
      setAviso('');
      return r;
    } finally {
      setSalvando(false);
    }
  }
  async function salvar(mud) {
    setErro('');
    try { return await gravar(mud); } catch (e) { setErro(e.message); return null; }
  }

  const fechada = c && c.status !== 'aberta';
  const itens = c?.itens || [];
  const adicionar = (i) => salvar({ itens: [...itens, { tipo: i.tipo, id: i.id, nome: i.nome, qtd: 1, profissional: '' }] });
  const mudarItem = (idx, mud) => salvar({ itens: itens.map((x, k) => (k === idx ? { ...x, ...mud } : x)) });
  const gravarItem = (idx, mud) => gravar({ itens: itens.map((x, k) => (k === idx ? { ...x, ...mud } : x)) });
  const balcao = pode(membro, 'admin', 'recepcao');
  const admin = pode(membro, 'admin');
  const temVale = itens.some((i) => i.tipo === 'vale');
  const terminou = (r) => { setC(r); setPagar(false); setValesCriados(r.valesCriados || []); };

  if (id && !c) return <Modal titulo="Comanda" aoFechar={aoFechar}>{erro ? <Erro>{erro}</Erro> : <Carregando />}</Modal>;
  const nomeCliente = c?.nome || cliente?.nome || semCadastro?.nome;
  const titulo = !c ? 'Nova comanda' : c.status === 'cancelada' ? 'Comanda cancelada' : fechada ? 'Comanda fechada' : 'Comanda';

  return (
    <Modal titulo={titulo} rotulo={c ? `${c.nome} · aberta ${dataBR(c.abertaEm)} por ${c.abertaPor}` : 'Escolha quem vai pagar e adicione os itens'} aoFechar={aoFechar} largo>
      <div className="cm">
        {!c && (
          <fieldset className="b-opcoes">
            <legend className="rotulo">Cliente</legend>
            {cliente ? (
              <div className="b-escolhido"><div><strong>{cliente.nome}</strong><span>com cadastro</span></div><button type="button" className="link-sair" onClick={() => setCliente(null)}>trocar</button></div>
            ) : semCadastro ? (
              <div className="b-linha2">
                <label className="b-campo"><span className="rotulo">Nome</span><input value={semCadastro.nome} onChange={(e) => setSemCadastro({ ...semCadastro, nome: e.target.value })} placeholder="Opcional" /></label>
                <label className="b-campo"><span className="rotulo">WhatsApp</span><input inputMode="numeric" value={semCadastro.whatsapp} onChange={(e) => setSemCadastro({ ...semCadastro, whatsapp: mascaraTelefone(e.target.value) })} placeholder="Opcional" /></label>
              </div>
            ) : (
              <>
                <BuscaAluno placeholder="Buscar cliente por nome, CPF ou WhatsApp" aoEscolher={(a) => setCliente({ cpf: a.cpf, nome: a.nome })} />
                <button type="button" className="link-acao" onClick={() => setSemCadastro({ nome: '', whatsapp: '' })}>Sem cadastro (venda rápida no balcão)</button>
              </>
            )}
          </fieldset>
        )}

        {aviso && <p className="aviso">{aviso}</p>}

        <div className="cm-papel">
          <div className="cm-papel__topo">
            <span className="cm-papel__casa">Casa Âmbar</span>
            <span className="b-suave">{c ? `nº ${c.id.slice(-5)}` : 'nova'}</span>
          </div>
          {nomeCliente && <p className="cm-papel__cliente">{nomeCliente}</p>}
          {itens.length === 0 && <p className="b-suave cm-papel__vazio">Nenhum item ainda.</p>}
          <ul className="cm-itens">
            {itens.map((it, idx) => (
              <li key={it.uid || idx} className={`cm-item${it.pago ? ' cm-item--pago' : ''}${tirando === idx ? ' cm-item--saindo' : ''}`}>
                <div className="cm-item__nome">
                  <strong>{it.nome}</strong>
                  <MetaItem it={it} fechada={fechada} />
                  <NotasItem it={it} />
                  {!fechada && balcao && tirando !== idx && (
                    <span className="cm-item__acoes">
                      <button type="button" className="link-acao" onClick={() => (it.tipo === 'vale' ? setVale({ idx }) : setEditando(idx))} disabled={salvando || (it.tipo !== 'vale' && !catalogo)}>
                        Editar
                      </button>
                      {it.tipo === 'servico' && !it.profissional && <button type="button" className="link-acao cm-item__falta" onClick={() => setEditando(idx)} disabled={!catalogo}>escolher profissional</button>}
                    </span>
                  )}
                </div>
                <div className="cm-item__qtd">
                  {it.tipo === 'produto' && !fechada && !it.pago ? (
                    <span className="cm-qtd">
                      <button type="button" aria-label="Menos" disabled={it.qtd <= 1 || salvando} onClick={() => mudarItem(idx, { qtd: it.qtd - 1 })}>−</button>
                      <span>{it.qtd}</span>
                      <button type="button" aria-label="Mais" disabled={salvando} onClick={() => mudarItem(idx, { qtd: it.qtd + 1 })}>+</button>
                    </span>
                  ) : it.qtd > 1 ? <span>× {it.qtd}</span> : null}
                </div>
                <div className="cm-item__valor">
                  {it.desconto > 0.009 && <s>{real(it.preco * it.qtd)}</s>}
                  <strong>{it.pago ? 'já pago' : real(it.total)}</strong>
                  {it.qtd > 1 && !it.pago && <span className="b-suave">{real(it.valor)} cada</span>}
                </div>
                {!fechada && balcao && (
                  <button type="button" className="cm-item__tirar" aria-label={`Tirar ${it.nome}`} aria-expanded={tirando === idx} disabled={salvando}
                    onClick={() => { setTirando(tirando === idx ? null : idx); setMotivoTirar(''); }}>×</button>
                )}
                {tirando === idx && (
                  <div className="cm-tirar">
                    <label className="b-campo">
                      <span className="rotulo">Tirar “{it.nome}” da comanda? Motivo (opcional, fica no histórico)</span>
                      <input value={motivoTirar} onChange={(e) => setMotivoTirar(e.target.value)} maxLength={120} placeholder="Ex.: cliente desistiu" autoFocus
                        onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), setTirando(null))} />
                    </label>
                    {it.atendimentoId && <span className="b-suave">O agendamento continua na agenda; se a cliente não veio, marque lá.</span>}
                    <div className="cm-tirar__botoes">
                      <BotaoAcao className="botao botao--linha botao--p botao--perigo" acao={async () => {
                        const r = await salvar({ itens: itens.filter((_, k) => k !== idx), motivo: motivoTirar.trim() || undefined });
                        if (r) setTirando(null);
                      }}>Tirar da comanda</BotaoAcao>
                      <button type="button" className="link-acao" onClick={() => setTirando(null)}>Voltar</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {!fechada && balcao && (c || cliente || semCadastro) && (
            <div className="cm-incluir">
              <EscolherItem catalogo={catalogo} aoEscolher={adicionar} />
              <button type="button" className="botao botao--linha botao--p cm-incluir__vale" disabled={!catalogo || salvando} onClick={() => setVale({})}>
                <span aria-hidden="true">✦</span> Vale-presente
              </button>
            </div>
          )}
          <div className="cm-totais">
            {c && c.desconto > 0.009 && <><span>Subtotal</span><span>{real(c.subtotal)}</span><span>Descontos</span><span>− {real(c.desconto)}</span></>}
            <span className="cm-totais__rot">Total</span>
            <strong className="cm-totais__valor">{salvando ? '…' : real(c?.total || 0)}</strong>
          </div>
          {fechada && c.pagamentos.length > 0 && (
            <p className="cm-papel__pago">Pago com {c.pagamentos.map((p) => `${p.metodo}${p.bandeira ? ` ${p.bandeira}` : ''}${p.parcelas > 1 ? ` ${p.parcelas}x` : ''} ${real(p.valor)}`).join(' + ')} · {dataBR(c.fechadaEm)} por {c.fechadaPor}</p>
          )}
        </div>

        {!fechada && c && (
          <div className="b-linha2 cm-codigo">
            <label className="b-campo">
              <span className="rotulo">Cupom ou vale de serviço (opcional)</span>
              <span className="codigo__linha">
                <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="Código" />
                <button type="button" className="botao botao--linha botao--p" disabled={salvando || codigo === c.codigo} onClick={() => salvar({ codigo })}>{codigo || !c.codigo ? 'Aplicar' : 'Tirar'}</button>
              </span>
            </label>
            <label className="b-campo"><span className="rotulo">Observação da comanda</span>
              <input key={c.obs} defaultValue={c.obs} onBlur={(e) => e.target.value !== c.obs && salvar({ obs: e.target.value })} placeholder="Opcional" /></label>
          </div>
        )}
        <Erro>{erro}</Erro>

        {!fechada && c && !pagar && !cancelando && (
          <div className="cm-acoes">
            {c.total > 0 || salvando ? (
              <button type="button" className="botao botao--cheio" disabled={salvando || !itens.length} onClick={() => setPagar(true)}>Receber {real(c.total)}</button>
            ) : (
              <BotaoAcao className="botao botao--cheio" disabled={!itens.length} acao={async () => {
                setErro('');
                try { terminou(await chamar('fecharComanda', { id: c.id, pagamentos: [] })); } catch (e) { setErro(e.message); }
              }}>Concluir (nada a cobrar)</BotaoAcao>
            )}
            <button type="button" className="botao botao--linha" onClick={aoFechar}>Deixar aberta</button>
            <button type="button" className="link-sair" onClick={() => { setCancelando(true); setMotivoCancelar(''); }}>Cancelar comanda</button>
          </div>
        )}

        {cancelando && c && !fechada && (
          <section className="cm-painel cm-painel--perigo" aria-label="Cancelar comanda">
            <h3 className="cm-painel__titulo">Cancelar esta comanda?</h3>
            <p className="b-suave">Os itens não serão cobrados. A comanda fica guardada como cancelada.</p>
            <label className="b-campo"><span className="rotulo">Motivo (opcional, fica no histórico)</span>
              <input value={motivoCancelar} onChange={(e) => setMotivoCancelar(e.target.value)} maxLength={120} placeholder="Ex.: aberta por engano" autoFocus /></label>
            <div className="cm-acoes">
              <BotaoAcao className="botao botao--linha botao--p botao--perigo" acao={async () => {
                setErro('');
                try { await chamar('cancelarComanda', { id: c.id, motivo: motivoCancelar.trim() }); aoFechar(); } catch (e) { setErro(e.message); }
              }}>Cancelar comanda</BotaoAcao>
              <button type="button" className="link-acao" onClick={() => setCancelando(false)}>Voltar</button>
            </div>
          </section>
        )}

        {pagar && c && !fechada && <Pagamento c={c} semVale={temVale} aoVoltar={() => setPagar(false)} aoFechar={terminou} />}
        {valesCriados.length > 0 && <ValesCriados lista={valesCriados} />}
        {fechada && c.status === 'fechada' && <Recibo c={c} />}

        {fechada && c.status === 'fechada' && admin && (
          reabrindo ? (
            <section className="cm-painel" aria-label="Reabrir para corrigir">
              <h3 className="cm-painel__titulo">Reabrir para corrigir</h3>
              <p className="b-suave">Os pagamentos desta comanda são estornados, o estoque volta e as comissões ficam suspensas. Planos, pacotes e vales-presentes vendidos nela ficam desativados até a comanda ser fechada de novo.</p>
              <label className="b-campo"><span className="rotulo">Motivo da correção (obrigatório, fica no histórico)</span>
                <textarea rows={2} value={motivoReabrir} onChange={(e) => setMotivoReabrir(e.target.value)} maxLength={200} placeholder="Ex.: cobrei o protetor a mais" autoFocus /></label>
              <Erro>{erroReabrir}</Erro>
              <div className="cm-acoes">
                <BotaoAcao className="botao botao--cheio botao--p" disabled={!motivoReabrir.trim()} acao={async () => {
                  setErroReabrir('');
                  try {
                    const r = await chamar('reabrirComanda', { id: c.id, motivo: motivoReabrir.trim() });
                    setC(r); setCodigo(r.codigo); setReabrindo(false); setValesCriados([]);
                    setAviso('Comanda reaberta. Corrija o que precisar e receba de novo: os pagamentos anteriores foram estornados.');
                  } catch (e) { setErroReabrir(e.message); }
                }}>Reabrir comanda</BotaoAcao>
                <button type="button" className="link-acao" onClick={() => setReabrindo(false)}>Voltar</button>
              </div>
            </section>
          ) : (
            <div className="cm-corrigir">
              <button type="button" className="link-acao" onClick={() => { setReabrindo(true); setMotivoReabrir(''); setErroReabrir(''); }}>Reabrir para corrigir</button>
              <span className="b-suave">Só a administração. Estorna os pagamentos para lançar de novo.</span>
            </div>
          )
        )}

        {c?.historico?.length > 0 && <HistoricoComanda itens={c.historico} />}
      </div>

      {editando != null && itens[editando] && (
        <EditarItem it={itens[editando]} catalogo={catalogo} aoFechar={() => setEditando(null)}
          aoSalvar={async (mud) => { await gravarItem(editando, mud); setEditando(null); }} />
      )}
      {vale && (
        <VendaVale inicial={vale.idx != null ? itens[vale.idx]?.dadosVale : null} catalogo={catalogo} aoFechar={() => setVale(null)}
          aoSalvar={async (dados) => {
            if (vale.idx != null) await gravarItem(vale.idx, { vale: dados, dadosVale: undefined });
            else await gravar({ itens: [...itens, { tipo: 'vale', vale: dados }] });
            setVale(null);
          }} />
      )}
    </Modal>
  );
}

// linha pequena embaixo do nome: tipo, profissional, agenda, promoção…
function MetaItem({ it, fechada }) {
  const partes = it.tipo === 'vale' ? [] : [ROTULO_TIPO[it.tipo]];
  if (it.atendimentoId) partes.push('da agenda');
  if (it.profissional) partes.push(`com ${it.profissional}`);
  if (it.pago) partes.push('pago antes (pacote, antecipado ou cortesia)');
  if (it.promocao) partes.push(`promoção ${it.promocao}`);
  if (it.cupom) partes.push(`cupom ${it.cupom}`);
  if (it.vale && it.tipo !== 'vale') partes.push(`vale ${it.vale}`);
  if (it.valeCodigo) partes.push(`código ${it.valeCodigo}`);
  const falta = !fechada && it.tipo === 'servico' && !it.profissional;
  if (!partes.length && !falta) return null;
  return (
    <span className="b-suave cm-item__meta">
      {partes.join(' · ')}
      {falta && <span className="b-alerta-txt"> · falta quem atendeu</span>}
    </span>
  );
}

// desconto com motivo, observação e dados do vale
function NotasItem({ it }) {
  const linhas = [];
  if (it.valorManual != null) linhas.push(['preco', `Valor combinado${it.motivoDesconto ? `: ${it.motivoDesconto}` : ''}`]);
  else if (it.descontoTipo) linhas.push(['preco', `Desconto de ${it.descontoTipo === 'pct' ? `${numTxt(it.descontoValor)}%` : `${real(it.descontoValor)}${it.qtd > 1 ? ' cada' : ''}`}${it.motivoDesconto ? `: ${it.motivoDesconto}` : ''}`]);
  if (it.tipo === 'vale' && it.dadosVale) {
    const v = it.dadosVale;
    const para = [v.nome && `Para ${v.nome}`, v.whatsapp && telFmt(v.whatsapp), v.email].filter(Boolean).join(' · ');
    if (para) linhas.push(['vale', para]);
    linhas.push(['vale', `${v.validadeDias ? `Vale por ${v.validadeDias % 30 === 0 ? plural(v.validadeDias / 30, 'mês', 'meses') : plural(v.validadeDias, 'dia', 'dias')}` : 'Validade padrão'}${v.enviarEmail && v.email ? ' · e-mail ao fechar' : ''}${v.mensagem ? ' · com mensagem' : ''}`]);
  }
  if (it.obs) linhas.push(['obs', `Obs.: ${it.obs}`]);
  if (!linhas.length) return null;
  return linhas.map(([tipo, t], i) => <span key={i} className={`cm-item__nota cm-item__nota--${tipo}`}>{t}</span>);
}

function HistoricoComanda({ itens }) {
  const ult = itens[itens.length - 1];
  return (
    <details className="cm-hist">
      <summary>
        <span className="cm-hist__titulo">Histórico</span>
        <span className="b-suave">{plural(itens.length, 'registro', 'registros')} · último {quandoHist(ult.q)}, {ult.p}</span>
      </summary>
      <ol className="cm-hist__lista">
        {itens.map((h, i) => (
          <li key={i}>
            <span className="cm-hist__quando">{quandoHist(h.q)}</span>
            <span className="cm-hist__texto"><strong>{h.p}</strong> {h.t}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}

// ---------- editar um item: trocar, profissional, quantidade, desconto e observação ----------
function EditarItem({ it, catalogo, aoFechar, aoSalvar }) {
  const podeTrocar = !it.pago && it.tipo !== 'vale';
  const comPreco = !it.pago;
  const [novo, setNovo] = useState(null);
  const [trocar, setTrocar] = useState(false);
  const [prof, setProf] = useState(it.profissional || '');
  const [qtd, setQtd] = useState(it.qtd || 1);
  const [modo, setModo] = useState(it.valorManual != null ? 'combinado' : it.descontoTipo ? 'desconto' : 'normal');
  const [dTipo, setDTipo] = useState(it.descontoTipo || 'pct');
  const [dValor, setDValor] = useState(it.descontoTipo ? numTxt(it.descontoValor) : '');
  const [combinado, setCombinado] = useState(numTxt(it.valorManual != null ? it.valorManual : it.valor));
  const [motivo, setMotivo] = useState(it.motivoDesconto || '');
  const [obs, setObs] = useState(it.obs || '');
  const [erro, setErro] = useState('');

  const idAtual = novo?.id || it.id;
  const filtroTroca = useMemo(() => (i) => i.tipo === it.tipo && i.id !== idAtual, [it.tipo, idAtual]);
  const { fazem, outras } = profissionaisDoItem(catalogo, it.tipo, idAtual);
  const comProf = it.tipo === 'servico' || it.tipo === 'produto';

  // preço de partida (com promoção ou cupom, se houver): o desconto entra por cima
  const base = centavos(novo ? novo.preco
    : it.valorManual != null ? it.preco
      : it.descontoTipo === 'pct' ? (it.descontoValor >= 100 ? it.preco : it.valor / (1 - it.descontoValor / 100))
        : it.descontoTipo === 'valor' ? it.valor + it.descontoValor : it.valor);
  const dv = numBR(dValor);
  const unit = centavos(modo === 'combinado' ? numBR(combinado) : modo === 'desconto' ? Math.max(0, dTipo === 'pct' ? base * (1 - Math.min(dv, 100) / 100) : base - dv) : base);
  const q = it.tipo === 'produto' ? qtd : 1;

  async function salvar() {
    setErro('');
    if (comPreco && modo === 'desconto') {
      if (!(dv > 0)) return setErro('Informe o desconto.');
      if (dTipo === 'pct' && dv > 100) return setErro('O desconto vai até 100%.');
      if (dTipo === 'valor' && dv > base) return setErro(`O desconto passa do preço (${real(base)}).`);
    }
    if (comPreco && modo === 'combinado' && String(combinado).trim() === '') return setErro('Informe o valor combinado.');
    const mud = { profissional: prof, obs: obs.replace(/\s+/g, ' ').trim() };
    if (novo) { mud.id = novo.id; mud.nome = novo.nome; }
    if (it.tipo === 'produto' && !it.pago) mud.qtd = qtd;
    if (comPreco) {
      mud.valorManual = modo === 'combinado' ? numBR(combinado) : null;
      mud.descontoTipo = modo === 'desconto' ? dTipo : '';
      mud.descontoValor = modo === 'desconto' ? dv : 0;
      mud.motivoDesconto = modo === 'normal' ? '' : motivo.trim();
    }
    try { await aoSalvar(mud); } catch (e) { setErro(e.message); }
  }

  return (
    <Modal titulo="Editar item" rotulo={`${ROTULO_TIPO[it.tipo]} · ${it.nome}`} aoFechar={aoFechar}>
      <div className="b-form cm-editar">
        <fieldset className="cm-grupo">
          <legend className="rotulo">{ROTULO_TIPO[it.tipo]}</legend>
          <div className="b-escolhido">
            <div><strong>{novo ? novo.nome : it.nome}</strong><span>{novo ? `${real(novo.preco)} · no lugar de ${it.nome}` : `${real(it.preco)} na tabela`}</span></div>
            {podeTrocar && (novo
              ? <button type="button" className="link-sair" onClick={() => { setNovo(null); setTrocar(false); }}>desfazer</button>
              : !trocar && <button type="button" className="link-acao" onClick={() => setTrocar(true)}>trocar</button>)}
          </div>
          {trocar && !novo && <EscolherItem catalogo={catalogo} filtro={filtroTroca} placeholder={`Buscar outro ${NOME_TIPO[it.tipo] || 'item'}`} autoFocus aoEscolher={(i) => { setNovo(i); setTrocar(false); }} />}
          {it.pago && <p className="b-suave cm-editar__nota">Este item já foi pago antes (pacote, antecipado ou cortesia): dá para mudar a profissional e a observação. Para trocar o serviço, tire este item e inclua o novo.</p>}
          {!it.pago && it.atendimentoId && (novo || prof !== (it.profissional || '')) && <p className="b-suave cm-editar__nota">Este item veio da agenda: o agendamento muda junto.</p>}
        </fieldset>

        {comProf && (
          <label className="b-campo">
            <span className="rotulo">{it.tipo === 'produto' ? 'Indicado por (comissão de produto)' : 'Profissional (para a comissão)'}</span>
            <select value={prof} onChange={(e) => setProf(e.target.value)}>
              <option value="">{it.tipo === 'produto' ? 'Sem indicação' : 'Escolha…'}</option>
              {outras.length > 0 ? (
                <>
                  <optgroup label="Fazem este serviço">{fazem.map((p) => <option key={p}>{p}</option>)}</optgroup>
                  <optgroup label="Outras pessoas">{outras.map((p) => <option key={p}>{p}</option>)}</optgroup>
                </>
              ) : fazem.map((p) => <option key={p}>{p}</option>)}
              {prof && !fazem.includes(prof) && !outras.includes(prof) && <option>{prof}</option>}
            </select>
          </label>
        )}

        {it.tipo === 'produto' && !it.pago && (
          <div className="b-campo">
            <span className="rotulo">Quantidade</span>
            <span className="cm-qtd cm-qtd--grande">
              <button type="button" aria-label="Menos" disabled={qtd <= 1} onClick={() => setQtd(qtd - 1)}>−</button>
              <span>{qtd}</span>
              <button type="button" aria-label="Mais" disabled={qtd >= 99} onClick={() => setQtd(qtd + 1)}>+</button>
            </span>
          </div>
        )}

        {comPreco && (
          <fieldset className="cm-grupo cm-preco">
            <legend className="rotulo">Preço</legend>
            <div className="cm-seg">
              <Segmento rotulo="Preço do item" atual={modo} aoMudar={setModo} itens={[['normal', 'Preço normal'], ['desconto', 'Desconto'], ['combinado', 'Valor combinado']]} />
            </div>
            {modo === 'desconto' && (
              <div className="cm-preco__linha">
                <div className="cm-seg cm-seg--curto">
                  <Segmento rotulo="Tipo de desconto" atual={dTipo} aoMudar={setDTipo} itens={[['pct', '%'], ['valor', 'R$']]} />
                </div>
                <label className="b-campo">
                  <span className="rotulo">{dTipo === 'pct' ? 'Desconto (%)' : `Desconto (R$${q > 1 ? ' por unidade' : ''})`}</span>
                  <input inputMode="decimal" value={dValor} onChange={(e) => setDValor(e.target.value.replace(/[^\d,.]/g, ''))} placeholder={dTipo === 'pct' ? 'Ex.: 10' : 'Ex.: 20,00'} />
                </label>
              </div>
            )}
            {modo === 'combinado' && (
              <label className="b-campo">
                <span className="rotulo">Valor combinado (R${q > 1 ? ' por unidade' : ''})</span>
                <input inputMode="decimal" value={combinado} onChange={(e) => setCombinado(e.target.value.replace(/[^\d,.]/g, ''))} />
              </label>
            )}
            {modo !== 'normal' && (
              <label className="b-campo">
                <span className="rotulo">Motivo do desconto</span>
                <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={120} placeholder="Ex.: aniversário, cliente antiga" />
              </label>
            )}
            <p className="cm-preco__conta">
              {modo === 'normal'
                ? <>Fica <strong>{real(base * q)}</strong>{q > 1 && ` (${real(base)} cada)`}</>
                : <>De {real(base * q)} por <strong>{real(unit * q)}</strong>{q > 1 && ` (${real(unit)} cada)`}</>}
              {novo && modo !== 'combinado' && <span className="b-suave"> · com promoção ou cupom, o valor final aparece ao salvar</span>}
              {!novo && modo === 'desconto' && <span className="b-suave"> · o desconto entra por cima de promoção ou cupom</span>}
              {modo === 'combinado' && <span className="b-suave"> · substitui promoção e cupom</span>}
            </p>
          </fieldset>
        )}

        <label className="b-campo">
          <span className="rotulo">Observação do item <span className="b-suave">({obs.length}/200)</span></span>
          <textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value.slice(0, 200))} placeholder="Ex.: pele sensível, usar produto sem perfume" />
        </label>
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--cheio" acao={salvar}>Salvar item</BotaoAcao>
      </div>
    </Modal>
  );
}

// ---------- vale-presente vendido (vira item da comanda; o código nasce ao fechar) ----------
const VALIDADES = [['', 'Padrão da casa (Ajustes)'], ['90', '3 meses'], ['180', '6 meses'], ['365', '12 meses']];

function VendaVale({ inicial, catalogo, aoFechar, aoSalvar }) {
  const d = inicial || {};
  const [tipo, setTipo] = useState(d.tipo || 'valor');
  const [valor, setValor] = useState(d.tipo !== 'plano' && d.valor ? numTxt(d.valor) : '');
  const [plano, setPlano] = useState(() => (d.planoId ? catalogo?.achar(d.planoId) || { id: d.planoId, nome: 'Item escolhido', preco: d.valor } : null));
  const [nome, setNome] = useState(d.nome || '');
  const [whats, setWhats] = useState(d.whatsapp ? mascaraTelefone(d.whatsapp) : '');
  const [email, setEmail] = useState(d.email || '');
  const [mensagem, setMensagem] = useState(d.mensagem || '');
  const [validade, setValidade] = useState(d.validadeDias ? String(d.validadeDias) : '');
  const [enviar, setEnviar] = useState(d.enviarEmail ?? true);
  const [erro, setErro] = useState('');
  const filtroPlano = useMemo(() => (i) => i.tipo !== 'produto', []);
  const okEmail = emailOk(email);
  const opcoesValidade = validade && !VALIDADES.some(([v]) => v === validade) ? [...VALIDADES, [validade, plural(Number(validade), 'dia', 'dias')]] : VALIDADES;

  async function salvar() {
    setErro('');
    const v = numBR(valor);
    if (tipo === 'valor' && !(v >= 1 && v <= 5000)) return setErro('Informe o valor do vale (de R$ 1 a R$ 5.000).');
    if (tipo === 'plano' && !plano) return setErro('Escolha o serviço, a aula ou o plano do vale.');
    if (email.trim() && !okEmail) return setErro('Confira o e-mail de quem vai receber.');
    const w = soDigitos(whats);
    if (w && w.length < 10) return setErro('Confira o WhatsApp (com DDD).');
    try {
      await aoSalvar({ tipo, valor: tipo === 'valor' ? v : plano.preco, planoId: tipo === 'plano' ? plano.id : '', nome: nome.trim(), whatsapp: w, email: email.trim().toLowerCase(),
        mensagem: mensagem.trim(), validadeDias: validade ? Number(validade) : undefined, enviarEmail: enviar && okEmail });
    } catch (e) { setErro(e.message); }
  }

  return (
    <Modal titulo="Vale-presente" rotulo="Venda: quem compra paga nesta comanda; o código é criado ao fechar" aoFechar={aoFechar}>
      <div className="b-form">
        <fieldset className="cm-grupo">
          <legend className="rotulo">O que o vale dá</legend>
          <div className="cm-seg">
            <Segmento rotulo="Tipo de vale" atual={tipo} aoMudar={setTipo} itens={[['valor', 'Valor em R$'], ['plano', 'Um serviço ou plano']]} />
          </div>
        </fieldset>
        {tipo === 'valor' ? (
          <label className="b-campo"><span className="rotulo">Valor (R$)</span>
            <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value.replace(/[^\d,.]/g, ''))} placeholder="Ex.: 150" /></label>
        ) : plano ? (
          <div className="b-escolhido"><div><strong>{plano.nome}</strong><span>{real(plano.preco)} · preço do catálogo</span></div>
            <button type="button" className="link-sair" onClick={() => setPlano(null)}>trocar</button></div>
        ) : (
          <EscolherItem catalogo={catalogo} filtro={filtroPlano} placeholder="Buscar serviço, pacote, aula ou plano" aoEscolher={setPlano} />
        )}

        <fieldset className="cm-grupo">
          <legend className="rotulo">Para quem</legend>
          <label className="b-campo"><span className="rotulo">Nome</span><input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} placeholder="Quem vai receber" /></label>
          <div className="b-linha2">
            <label className="b-campo"><span className="rotulo">WhatsApp</span><input inputMode="numeric" value={whats} onChange={(e) => setWhats(mascaraTelefone(e.target.value))} placeholder="Opcional" /></label>
            <label className="b-campo"><span className="rotulo">E-mail</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Opcional" aria-invalid={!!email.trim() && !okEmail} /></label>
          </div>
        </fieldset>
        <label className="b-campo"><span className="rotulo">Mensagem (opcional) <span className="b-suave">({mensagem.length}/500)</span></span>
          <textarea rows={3} value={mensagem} onChange={(e) => setMensagem(e.target.value.slice(0, 500))} placeholder="Ex.: Feliz aniversário! Um momento só seu." /></label>
        <label className="b-campo"><span className="rotulo">Validade</span>
          <select value={validade} onChange={(e) => setValidade(e.target.value)}>{opcoesValidade.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
        <label className={`b-check${okEmail ? '' : ' b-check--apagado'}`}>
          <input type="checkbox" checked={enviar && okEmail} disabled={!okEmail} onChange={(e) => setEnviar(e.target.checked)} />
          {okEmail ? `Enviar por e-mail para ${email.trim()} ao fechar a comanda` : 'Enviar por e-mail ao fechar a comanda (informe o e-mail)'}
        </label>
        <p className="b-suave b-nota">Vale de cortesia (sem venda) continua em Marketing → Vales.</p>
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--cheio" acao={salvar}>{inicial ? 'Salvar vale' : 'Incluir na comanda'}</BotaoAcao>
      </div>
    </Modal>
  );
}

// depois de fechar: o código de cada vale vendido, pronto para mandar
function ValesCriados({ lista }) {
  const [copiado, setCopiado] = useState('');
  async function copiar(v) {
    try { await navigator.clipboard.writeText(v.textoWhats); setCopiado(v.codigo); setTimeout(() => setCopiado(''), 2500); } catch { setCopiado(''); }
  }
  return (
    <section className="cm-vales" aria-label="Vales-presentes criados">
      {lista.map((v) => (
        <article key={v.codigo} className="cm-vale">
          <span className="cm-vale__rotulo">Vale-presente criado{v.nome ? ` para ${v.nome}` : ''}</span>
          <strong className="cm-vale__codigo">{v.codigo}</strong>
          <span className="cm-vale__desc">{v.descricao}</span>
          <span className="b-suave">Válido até {dataBR(v.validade)}</span>
          <div className="cm-vale__botoes">
            <a className="botao botao--cheio botao--p com-icone" target="_blank" rel="noreferrer"
              href={soDigitos(v.whatsapp) ? linkWhats(v.whatsapp, v.textoWhats) : `https://wa.me/?text=${encodeURIComponent(v.textoWhats)}`}>
              <IconeWhatsapp tamanho={15} /> Enviar pelo WhatsApp
            </a>
            <button type="button" className="botao botao--linha botao--p" onClick={() => copiar(v)}>{copiado === v.codigo ? 'Mensagem copiada' : 'Copiar mensagem'}</button>
          </div>
          {v.emailEnviado && <span className="cm-vale__ok">E-mail enviado para {v.email}.</span>}
          {!v.emailEnviado && v.email && <span className="b-suave">O e-mail não foi enviado. Mande pelo WhatsApp ou em Marketing → Vales.</span>}
        </article>
      ))}
    </section>
  );
}

function Pagamento({ c, semVale, aoVoltar, aoFechar }) {
  const { chamar } = useBancada();
  const [linhas, setLinhas] = useState([{ metodo: 'Pix', valor: String(c.total.toFixed(2)).replace('.', ','), parcelas: 1, codigo: '', bandeira: '' }]);
  const [erro, setErro] = useState('');
  const soma = linhas.reduce((s, l) => s + numBR(l.valor), 0);
  const falta = Math.round((c.total - soma) * 100) / 100;
  const mudar = (i, mud) => setLinhas(linhas.map((l, k) => (k === i ? { ...l, ...mud } : l)));
  const troco = linhas.find((l) => l.metodo === 'Dinheiro');
  // um vale-presente vendido não se paga com outro vale
  const formas = semVale ? METODOS : METODOS.concat(['Vale-presente']);
  return (
    <section className="cm-pagar" aria-label="Pagamento">
      <h3 className="cm-pagar__titulo">Forma de pagamento</h3>
      {linhas.map((l, i) => (
        <div key={i} className={`cm-pagar__linha${linhas.length > 1 ? ' cm-pagar__linha--tirar' : ''}${/Cartão de crédito|Link/.test(l.metodo) ? ' cm-pagar__linha--parcelas' : ''}${ehCartao(l.metodo) || l.metodo === 'Vale-presente' ? ' cm-pagar__linha--extra' : ''}`}>
          <select className="cm-pagar__metodo" value={l.metodo} onChange={(e) => mudar(i, { metodo: e.target.value })} aria-label="Forma">
            {formas.map((m) => <option key={m}>{m}</option>)}
          </select>
          <input className="cm-pagar__valor" inputMode="decimal" value={l.valor} onChange={(e) => mudar(i, { valor: e.target.value.replace(/[^\d,.]/g, '') })} aria-label="Valor" />
          {/Cartão de crédito|Link/.test(l.metodo) && (
            <select className="cm-pagar__extra cm-pagar__parcelas" value={l.parcelas} onChange={(e) => mudar(i, { parcelas: Number(e.target.value) })} aria-label="Parcelas">
              {Array.from({ length: 12 }, (_, k) => <option key={k + 1} value={k + 1}>{k + 1}x</option>)}
            </select>
          )}
          {ehCartao(l.metodo) && (
            <select className="cm-pagar__extra cm-pagar__bandeira" value={l.bandeira} onChange={(e) => mudar(i, { bandeira: e.target.value })} aria-label="Bandeira do cartão" aria-invalid={!l.bandeira}>
              <option value="">Bandeira…</option>
              {BANDEIRAS.map((b) => <option key={b}>{b}</option>)}
            </select>
          )}
          {l.metodo === 'Vale-presente' && <input className="cm-pagar__extra" value={l.codigo} onChange={(e) => mudar(i, { codigo: e.target.value.toUpperCase() })} placeholder="AMBAR-XXXX-XXXX" aria-label="Código do vale" />}
          {linhas.length > 1 && <button type="button" className="cm-item__tirar cm-pagar__tirar" aria-label="Tirar forma" onClick={() => setLinhas(linhas.filter((_, k) => k !== i))}>×</button>}
        </div>
      ))}
      <div className="cm-pagar__resumo">
        {Math.abs(falta) > 0.009 ? (
          <span className={falta > 0 ? 'b-alerta-txt' : 'b-suave'}>{falta > 0 ? `Faltam ${real(falta)}` : `Passou ${real(-falta)}`}</span>
        ) : <span className="b-suave">Valores conferem.</span>}
        {falta > 0.009 && (
          <button type="button" className="link-acao" onClick={() => setLinhas([...linhas, { metodo: linhas[0].metodo === 'Pix' ? 'Cartão de crédito' : 'Pix', valor: String(falta.toFixed(2)).replace('.', ','), parcelas: 1, codigo: '', bandeira: '' }])}>
            + dividir: outra forma com {real(falta)}
          </button>
        )}
      </div>
      {semVale && <p className="b-suave cm-pagar__nota">Esta comanda vende um vale-presente: não dá para pagar com outro vale.</p>}
      {troco && <TrocoCalc valor={numBR(troco.valor)} />}
      <Erro>{erro}</Erro>
      <div className="cm-acoes">
        {linhas.some((l) => faltaBandeira(l.metodo, l.bandeira)) && <span className="b-alerta-txt">Escolha a bandeira do cartão.</span>}
        <BotaoAcao className="botao botao--cheio" disabled={Math.abs(falta) > 0.009 || linhas.some((l) => faltaBandeira(l.metodo, l.bandeira))} acao={async () => {
          setErro('');
          try {
            aoFechar(await chamar('fecharComanda', { id: c.id, pagamentos: linhas.map((l) => ({ ...l, valor: numBR(l.valor) })) }));
          } catch (e) { setErro(e.message); }
        }}>Fechar comanda</BotaoAcao>
        <button type="button" className="link-acao" onClick={aoVoltar}>Voltar</button>
      </div>
    </section>
  );
}

function TrocoCalc({ valor }) {
  const [recebido, setRecebido] = useState('');
  const t = numBR(recebido) - valor;
  return (
    <label className="b-campo cm-troco">
      <span className="rotulo">Recebeu em dinheiro (para calcular o troco)</span>
      <span className="cm-troco__linha">
        <input inputMode="decimal" value={recebido} onChange={(e) => setRecebido(e.target.value.replace(/[^\d,.]/g, ''))} placeholder="Ex.: 200" />
        {recebido && <strong>{t >= 0 ? `Troco ${real(t)}` : `Falta ${real(-t)}`}</strong>}
      </span>
    </label>
  );
}

function Recibo({ c }) {
  const texto = `Olá, ${primeiro(c.nome)}! Agradecemos a sua visita à Casa Âmbar ✨\n\n` +
    c.itens.map((i) => `• ${i.nome}${i.qtd > 1 ? ` × ${i.qtd}` : ''}: ${i.pago ? 'já pago' : real(i.total)}`).join('\n') +
    `\n\nTotal: ${real(c.total)} (${c.pagamentos.map((p) => p.metodo).join(' + ')})`;
  return (
    <div className="cm-recibo">
      <p className="aviso">Comanda fechada. Os pagamentos entraram em Vendas e no caixa do dia.</p>
      {c.whatsapp && <a className="botao botao--linha botao--p com-icone" href={linkWhats(c.whatsapp, texto)} target="_blank" rel="noreferrer"><IconeWhatsapp tamanho={15} /> Enviar recibo por WhatsApp</a>}
      {c.whatsapp && <span className="b-suave">{telFmt(c.whatsapp)}</span>}
    </div>
  );
}

// ============================================================
//  CAIXA DO DIA
//  A recepção mexe só no de hoje; a administração escolhe também um dia que já passou
// ============================================================
export function CaixaDoDia({ diaInicial }) {
  const { membro } = useBancada();
  const admin = pode(membro, 'admin');
  const hoje = hojeIso();
  const ontem = somarDias(hoje, -1);
  const [dia, setDia] = useState(admin && diaInicial && diaInicial <= hoje ? diaInicial : hoje);
  const passado = dia < hoje;
  return (
    <>
      {admin && (
        <div className="cx-dia">
          <label className="b-campo"><span className="rotulo">Dia do caixa</span>
            <input type="date" value={dia} max={hoje} onChange={(e) => e.target.value && e.target.value <= hoje && setDia(e.target.value)} /></label>
          <div className="cx-dia__atalhos">
            <button type="button" className={`b-chip${dia === ontem ? ' b-chip--ativo' : ''}`} aria-pressed={dia === ontem} onClick={() => setDia(ontem)}>Ontem</button>
            <button type="button" className={`b-chip${dia === hoje ? ' b-chip--ativo' : ''}`} aria-pressed={dia === hoje} onClick={() => setDia(hoje)}>Hoje</button>
          </div>
        </div>
      )}
      <CaixaDia key={dia} dia={dia} passado={passado} admin={admin} aoAbrirDia={setDia} />
    </>
  );
}

// "Aberto depois, em 2026-10-20 09:12:30, por bia" → "… em 20/10/2026 09:12, por bia"
const obsCaixa = (t) => String(t || '').replace(/(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2})(:\d{2})?/g, '$3/$2/$1 $4');

function CaixaDia({ dia, passado, admin, aoAbrirDia }) {
  const { chamar } = useBancada();
  // hoje usa a mesma chave da tela inicial (já vem pré-carregada)
  const { dados: cx, erro, carregando, setDados } = useDados('caixa', passado ? { data: dia } : {});
  const [abertura, setAbertura] = useState('');
  const [mov, setMov] = useState(null);
  const [contado, setContado] = useState('');
  const [obs, setObs] = useState('');
  const [erroA, setErroA] = useState('');
  const aberturaDepois = /^Aberto depois/.test(cx?.obs || '');
  const faixa = passado && (
    <p className="cx-passado" role="status">
      <strong>Caixa de {dataBR(dia).slice(0, 5)} (dia que já passou) — você está lançando depois</strong>
      <span>Abertura, movimentos e fechamento entram na data de {dataBR(dia)} e ficam marcados como lançados depois.</span>
      {aberturaDepois && <span className="cx-passado__obs">{obsCaixa(cx.obs)}.</span>}
    </p>
  );
  if (carregando && !cx) return <>{faixa}<Carregando /></>;
  if (!cx) return <>{faixa}<Erro>{erro}</Erro></>;
  const acao = async (nome, dados) => {
    setErroA('');
    try { setDados(await chamar(nome, { ...dados, data: dia })); return true; } catch (e) { setErroA(e.message); return false; }
  };
  const dif = contado === '' ? null : Math.round((numBR(contado) - cx.esperado) * 100) / 100;
  const ROT = { sangria: 'Sangria', suprimento: 'Suprimento', despesa: 'Despesa paga do caixa' };
  const doDia = passado ? `de ${dataBR(dia).slice(0, 5)}` : 'de hoje';
  const anteriores = admin ? <CaixasAnteriores lista={cx.anteriores} aoAbrir={aoAbrirDia} /> : null;

  if (cx.status === 'nao_aberto') {
    return (
      <>
        {faixa}
        <section className="cx cx--fechada">
          <div className="cx__gaveta" aria-hidden="true" />
          <div className="cx__abrir">
            <h2 className="b-cartao__titulo">Abrir o caixa {doDia}</h2>
            <p className="b-suave">{passado ? 'Informe o troco que havia na gaveta no começo daquele dia.' : 'Conte o troco que está na gaveta antes do primeiro atendimento.'}</p>
            <label className="b-campo"><span className="rotulo">Troco inicial (R$)</span>
              <input inputMode="decimal" value={abertura} onChange={(e) => setAbertura(e.target.value.replace(/[^\d,.]/g, ''))} placeholder="0,00" /></label>
            <Erro>{erroA}</Erro>
            <BotaoAcao className="botao botao--cheio" acao={() => acao('abrirCaixa', { valor: numBR(abertura) })}>{passado ? `Abrir caixa de ${dataBR(dia).slice(0, 5)}` : 'Abrir caixa'}</BotaoAcao>
            {cx.qtdVendas > 0 && <p className="b-suave">{passado ? 'Nesse dia' : 'Hoje já'} {cx.qtdVendas === 1 ? 'entrou' : 'entraram'} {plural(cx.qtdVendas, 'venda', 'vendas')}: {real(cx.vendas)}.</p>}
          </div>
        </section>
        {anteriores}
      </>
    );
  }

  return (
    <>
      {faixa}
      {!passado && aberturaDepois && cx.status === 'aberto' && <p className="b-suave cx-obs">{obsCaixa(cx.obs)}.</p>}
      <section className="b-kpis">
        <div className="b-kpi"><span className="b-kpi__rotulo">Troco inicial</span><strong className="b-kpi__valor">{real(cx.abertura)}</strong><span className="b-kpi__detalhe">aberto por {cx.abertoPor} {passado ? `em ${dataBR(cx.abertoEm).slice(0, 5)} ` : ''}às {hora(cx.abertoEm.slice(11, 16))}</span></div>
        <div className="b-kpi"><span className="b-kpi__rotulo">{passado ? 'Vendas do dia' : 'Vendas de hoje'}</span><strong className="b-kpi__valor">{real(cx.vendas)}</strong><span className="b-kpi__detalhe">{plural(cx.qtdVendas, 'lançamento', 'lançamentos')}</span></div>
        <div className="b-kpi b-kpi--destaque"><span className="b-kpi__rotulo">Dinheiro na gaveta</span><strong className="b-kpi__valor">{real(cx.esperado)}</strong><span className="b-kpi__detalhe">{passado ? 'o que devia ter no fim do dia' : 'o que deve ter agora'}</span></div>
      </section>
      <div className="b-duas">
        <section className="b-cartao">
          <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Entradas por forma</h2></header>
          {cx.porForma.length === 0 ? <p className="b-suave">Nenhuma venda ainda.</p> : (
            <dl className="b-dados">{cx.porForma.map((f) => <Fragment key={f.nome}><dt>{f.nome}</dt><dd>{real(f.valor)}</dd></Fragment>)}</dl>
          )}
          <dl className="b-dados cx__conta">
            <dt>Troco inicial</dt><dd>{real(cx.abertura)}</dd>
            <dt>+ vendas em dinheiro</dt><dd>{real(cx.dinheiroVendas)}</dd>
            {cx.suprimentos > 0 && <><dt>+ suprimentos</dt><dd>{real(cx.suprimentos)}</dd></>}
            {cx.sangrias > 0 && <><dt>− sangrias</dt><dd>{real(cx.sangrias)}</dd></>}
            {cx.despesas > 0 && <><dt>− despesas pagas do caixa</dt><dd>{real(cx.despesas)}</dd></>}
            <dt><strong>= esperado na gaveta</strong></dt><dd><strong>{real(cx.esperado)}</strong></dd>
          </dl>
        </section>
        <section className="b-cartao">
          <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Movimentos</h2></header>
          {cx.movimentos.length === 0 && <p className="b-suave">Sem retiradas nem reforços de troco.</p>}
          <ul className="b-lista-simples">
            {cx.movimentos.map((m, i) => (
              <li key={i}>
                <strong>{ROT[m.tipo]} · {real(m.valor)}</strong>
                <span>{m.motivo} · {m.retroativo ? `lançado depois, em ${dataBR(m.quando).slice(0, 5)} ${hora(m.quando.slice(11, 16))}` : hora(m.quando.slice(11, 16))} · {m.quem}</span>
              </li>
            ))}
          </ul>
          {cx.status === 'aberto' && (
            <div className="b-botoes">
              <button type="button" className="botao botao--linha botao--p" onClick={() => setMov({ tipo: 'sangria', valor: '', motivo: '' })}>Sangria</button>
              <button type="button" className="botao botao--linha botao--p" onClick={() => setMov({ tipo: 'suprimento', valor: '', motivo: '' })}>Suprimento</button>
              <button type="button" className="botao botao--linha botao--p" onClick={() => setMov({ tipo: 'despesa', valor: '', motivo: '', categoria: 'Outros' })}>Pagar despesa</button>
            </div>
          )}
        </section>
      </div>
      <Erro>{erroA}</Erro>
      {cx.status === 'aberto' ? (
        <section className="b-cartao cx__fechar">
          <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Fechar o caixa {doDia}</h2></header>
          <p className="b-suave">{passado ? 'Informe quanto havia na gaveta no fim daquele dia. O sistema compara com o esperado.' : 'Conte o dinheiro da gaveta e informe o total. O sistema compara com o esperado.'}</p>
          <div className="b-linha2">
            <label className="b-campo"><span className="rotulo">Dinheiro contado (R$)</span>
              <input inputMode="decimal" value={contado} onChange={(e) => setContado(e.target.value.replace(/[^\d,.]/g, ''))} placeholder={String(cx.esperado).replace('.', ',')} /></label>
            <label className="b-campo"><span className="rotulo">Observação</span><input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" /></label>
          </div>
          {dif != null && <p className={Math.abs(dif) < 0.01 ? 'aviso' : 'b-alerta-txt'}>{Math.abs(dif) < 0.01 ? 'Bateu certinho.' : dif > 0 ? `Sobrando ${real(dif)}.` : `Faltando ${real(-dif)}.`}</p>}
          <BotaoAcao className="botao botao--cheio" disabled={contado === ''} acao={() => acao('fecharCaixa', { contado: numBR(contado), obs })}>Fechar caixa</BotaoAcao>
        </section>
      ) : (
        <section className="b-cartao">
          <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Caixa fechado</h2><Tag tom={Math.abs(cx.diferenca || 0) < 0.01 ? 'ok' : 'alerta'}>{Math.abs(cx.diferenca || 0) < 0.01 ? 'bateu' : `diferença ${real(cx.diferenca)}`}</Tag></header>
          <p className="b-suave">Contado {real(cx.contado)} · esperado {real(cx.esperado)} · por {cx.fechadoPor} {passado || cx.fechadoEm.slice(0, 10) !== dia ? `em ${dataBR(cx.fechadoEm).slice(0, 5)} ` : ''}às {hora(cx.fechadoEm.slice(11, 16))}{cx.obs ? ' · ' + cx.obs : ''}</p>
          {admin && <BotaoAcao acao={() => acao('reabrirCaixa', {})}>Reabrir</BotaoAcao>}
        </section>
      )}
      {anteriores}
      {mov && (
        <Modal titulo={ROT[mov.tipo]} rotulo={`${passado ? `Caixa de ${dataBR(dia)} · ` : ''}${mov.tipo === 'sangria' ? 'Dinheiro que saiu da gaveta (ex.: depósito)' : mov.tipo === 'suprimento' ? 'Dinheiro que entrou na gaveta (ex.: reforço de troco)' : 'Conta paga com o dinheiro do caixa. Entra também em Despesas.'}`} aoFechar={() => setMov(null)}>
          <div className="b-form">
            <label className="b-campo"><span className="rotulo">Valor (R$)</span><input inputMode="decimal" value={mov.valor} onChange={(e) => setMov({ ...mov, valor: e.target.value.replace(/[^\d,.]/g, '') })} /></label>
            <label className="b-campo"><span className="rotulo">Motivo</span><input value={mov.motivo} onChange={(e) => setMov({ ...mov, motivo: e.target.value })} placeholder={mov.tipo === 'despesa' ? 'Ex.: café e água' : 'Ex.: depósito no banco'} /></label>
            {mov.tipo === 'despesa' && (
              <label className="b-campo"><span className="rotulo">Categoria</span>
                <select value={mov.categoria} onChange={(e) => setMov({ ...mov, categoria: e.target.value })}>{cx.categorias.map((x) => <option key={x}>{x}</option>)}</select></label>
            )}
            <Erro>{erroA}</Erro>
            <BotaoAcao className="botao botao--cheio" acao={async () => { if (await acao('movimentoCaixa', { ...mov, valor: numBR(mov.valor) })) setMov(null); }}>Registrar</BotaoAcao>
          </div>
        </Modal>
      )}
    </>
  );
}

// administração: os últimos caixas antes do dia escolhido (abre o dia ao tocar)
function CaixasAnteriores({ lista, aoAbrir }) {
  if (!lista?.length) return null;
  return (
    <section className="b-cartao cx-anteriores">
      <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Caixas anteriores</h2></header>
      <ul className="cx-anteriores__lista">
        {lista.map((c) => (
          <li key={c.data}>
            <button type="button" onClick={() => aoAbrir(c.data)}>
              <strong>{dataBR(c.data)}</strong>
              <span className="b-suave">{c.status === 'aberto' ? 'ficou aberto' : `esperado ${real(c.esperado)}${c.fechadoPor ? ` · ${c.fechadoPor}` : ''}`}</span>
              {c.status === 'aberto' || c.diferenca == null ? <Tag tom="aviso">não fechado</Tag> : Math.abs(c.diferenca) < 0.01 ? <Tag tom="ok">bateu</Tag> : <Tag tom="alerta">{real(c.diferenca)}</Tag>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
