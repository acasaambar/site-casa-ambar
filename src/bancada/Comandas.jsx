import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useBancada, pode } from './sessao.jsx';
import { useDados, Alertas, LinhasDePagamento, LINHA_PAGAMENTO, resumoLinhas, Carregando, Erro, Cabecalho, Modal, BotaoAcao, Vazio, Tag, BuscaAluno, Segmento, real, hora, hojeIso, somarDias, dataBR, linkWhats, primeiro,
  telFmt, numBR, plural, METODOS, useEsquecerPedidoDaRota, Aviso, Secao, Ajuda, Esqueleto, MenuMais, Kpi } from './ui.jsx';
import './css/comandas.css';
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
  const [aberta, setAberta] = useState(local.state?.nova ? { nova: true } : local.state?.abrir ? { id: local.state.abrir } : null);
  useEsquecerPedidoDaRota('nova', 'abrir');
  const [versao, setVersao] = useState(0);
  return (
    <>
      <Cabecalho titulo="Comandas" ajuda="Serviços, produtos e planos da visita, com uma ou mais formas de pagamento. Abra pela agenda (no atendimento) ou em Nova comanda. Para corrigir uma comanda fechada, abra-a e use Reabrir para corrigir (administração)."
        acoes={<button type="button" className="botao botao--cheio botao--p" onClick={() => setAberta({ nova: true })}>Nova comanda</button>}>
        A conta de cada visita e o caixa do dia
      </Cabecalho>
      <Segmento rotulo="O que mostrar" atual={vista} aoMudar={setVista} itens={[['abertas', 'Abertas'], ['fechadas', 'Fechadas'], ['caixa', 'Caixa do dia']]} />
      {vista === 'abertas' && <Abertas key={versao} aoAbrir={setAberta} />}
      {vista === 'fechadas' && <Fechadas key={versao} aoAbrir={setAberta} />}
      {vista === 'caixa' && <CaixaDoDia key={versao} diaInicial={local.state?.dia} />}
      {aberta && <ComandaModal id={aberta.id} aoFechar={() => { setAberta(null); setVersao((v) => v + 1); }} />}
    </>
  );
}

function minutosDesde(texto) {
  const t = new Date(String(texto).replace(' ', 'T') + '-03:00').getTime();
  return Math.max(0, Math.round((Date.now() - t) / 60000));
}

function tempoDesde(texto) {
  const min = minutosDesde(texto);
  if (min < 2) return 'agora';
  if (min < 60) return `há ${min} min`;
  if (min < 24 * 60) return `há ${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
  return `desde ${dataBR(texto)}`;
}

const MAX_ITENS_NOTA = 3;

function Abertas({ aoAbrir }) {
  const { dados, erro, carregando } = useDados('comandas', { status: 'aberta' });
  if (carregando && !dados) return <Esqueleto linhas={5} altura={26} />;
  const total = (dados || []).reduce((s, c) => s + c.total, 0);
  return (
    <>
      <Erro>{erro}</Erro>
      {dados && dados.length === 0 && (
        <Vazio titulo="Nenhuma comanda aberta" forma="presenca"
          acao={<button type="button" className="botao botao--cheio botao--p" onClick={() => aoAbrir({ nova: true })}>Nova comanda</button>}>
          Elas aparecem aqui quando abertas pela agenda ou por aqui.
        </Vazio>
      )}
      {dados && dados.length > 0 && (
        <p className="cm-resumo b-meta">
          <strong>{plural(dados.length, 'comanda aberta', 'comandas abertas')}</strong>
          <span>{real(total)} a receber</span>
        </p>
      )}
      <ul className="cm-notas">
        {(dados || []).map((c) => {
          const velha = minutosDesde(c.abertaEm) >= 180;
          const resto = c.itens.length - MAX_ITENS_NOTA;
          return (
            <li key={c.id}>
              <button type="button" className="cm-nota" onClick={() => aoAbrir({ id: c.id })}>
                <span className="cm-nota__topo">
                  <span className="cm-nota__quem">{c.nome}</span>
                  <span className={`cm-nota__tempo${velha ? ' cm-nota__tempo--velha' : ''}`} title={velha ? 'Aberta há bastante tempo' : undefined}>{tempoDesde(c.abertaEm)}</span>
                </span>
                {c.itens.length === 0 ? <span className="cm-nota__vazio">sem itens</span> : (
                  <span className="cm-nota__itens">
                    {c.itens.slice(0, MAX_ITENS_NOTA).map((i, k) => <span key={k} className="cm-nota__item">{i.nome}{i.qtd > 1 ? ` × ${i.qtd}` : ''}</span>)}
                    {resto > 0 && <span className="cm-nota__mais">+ {plural(resto, 'item', 'itens')}</span>}
                  </span>
                )}
                <span className="cm-nota__pe">
                  <span className="b-suave">por {c.abertaPor}</span>
                  <strong>{real(c.total)}</strong>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Fechadas({ aoAbrir }) {
  const hoje = hojeIso();
  const [de, setDe] = useState(hoje);
  const [ate, setAte] = useState(hoje);
  const [q, setQ] = useState('');
  const [forma, setForma] = useState('');
  const { dados, erro, carregando } = useDados('comandas', { status: 'fechada', de, ate });
  const formas = useMemo(() => {
    const m = new Map();
    (dados || []).forEach((c) => new Set(c.pagamentos.map((p) => p.metodo)).forEach((f) => m.set(f, (m.get(f) || 0) + 1)));
    return [...m.entries()];
  }, [dados]);
  const lista = useMemo(() => {
    const t = semAcento(q.trim());
    return (dados || []).filter((c) => (!forma || c.pagamentos.some((p) => p.metodo === forma))
      && (!t || semAcento(`${c.nome} ${c.itens.map((i) => i.nome).join(' ')}`).includes(t)));
  }, [dados, q, forma]);
  const total = lista.reduce((s, c) => s + c.total, 0);
  const atalhos = [['Hoje', hoje, hoje], ['Ontem', somarDias(hoje, -1), somarDias(hoje, -1)], ['7 dias', somarDias(hoje, -6), hoje], ['Este mês', hoje.slice(0, 8) + '01', hoje]];
  const filtrando = !!q.trim() || !!forma;
  return (
    <>
      <div className="cm-filtros">
        <div className="cm-filtros__datas">
          <label className="b-campo"><span className="rotulo">De</span><input type="date" value={de} max={ate} onChange={(e) => e.target.value && setDe(e.target.value)} /></label>
          <label className="b-campo"><span className="rotulo">Até</span><input type="date" value={ate} min={de} onChange={(e) => e.target.value && setAte(e.target.value)} /></label>
          <div className="cm-filtros__atalhos" role="group" aria-label="Períodos">
            {atalhos.map(([t, a, b]) => {
              const ativo = de === a && ate === b;
              return <button key={t} type="button" className={`b-chip${ativo ? ' b-chip--ativo' : ''}`} aria-pressed={ativo} onClick={() => { setDe(a); setAte(b); }}>{t}</button>;
            })}
          </div>
        </div>
        <label className="b-campo cm-filtros__busca"><span className="rotulo">Buscar</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cliente ou item" /></label>
      </div>
      {formas.length > 1 && (
        <div className="cm-filtros__formas" role="group" aria-label="Forma de pagamento">
          <button type="button" className={`b-chip${!forma ? ' b-chip--ativo' : ''}`} aria-pressed={!forma} onClick={() => setForma('')}>Todas</button>
          {formas.map(([f, n]) => <button key={f} type="button" className={`b-chip${forma === f ? ' b-chip--ativo' : ''}`} aria-pressed={forma === f} onClick={() => setForma(forma === f ? '' : f)}>{f} <span>{n}</span></button>)}
        </div>
      )}
      <Erro>{erro}</Erro>
      {carregando && !dados && <Esqueleto linhas={5} altura={26} />}
      {dados && dados.length > 0 && (
        <div className="b-kpis cm-kpis">
          <Kpi rotulo="Comandas" valor={lista.length} detalhe={filtrando ? `de ${dados.length} no período` : 'no período'} />
          <Kpi rotulo="Total" valor={real(total)} detalhe={lista.length ? `média ${real(total / lista.length)}` : undefined} tom="destaque" />
        </div>
      )}
      {dados && dados.length === 0 && <Vazio titulo="Nenhuma comanda fechada no período" acao={<button type="button" className="botao botao--linha botao--p" onClick={() => { setDe(somarDias(hoje, -6)); setAte(hoje); }}>Ver os últimos 7 dias</button>} />}
      {dados && dados.length > 0 && lista.length === 0 && <Vazio titulo="Nenhuma comanda com esse filtro" acao={<button type="button" className="botao botao--linha botao--p" onClick={() => { setQ(''); setForma(''); }}>Limpar filtros</button>} />}
      {lista.length > 0 && (
        <ul className="b-itens cm-fechadas">
          {lista.map((c) => (
            <li key={c.id}>
              <button type="button" className="b-item cm-fechada" onClick={() => aoAbrir({ id: c.id })}>
                <span className="cm-fechada__quando"><strong>{hora(c.fechadaEm.slice(11, 16))}</strong><small>{dataBR(c.fechadaEm).slice(0, 5)}</small></span>
                <span className="b-item__corpo">
                  <span className="b-item__titulo">{c.nome}</span>
                  <span className="cm-fechada__itens">{c.itens.map((i) => i.nome + (i.qtd > 1 ? ` × ${i.qtd}` : '')).join(' · ')}</span>
                </span>
                <span className="b-item__lado cm-fechada__lado">
                  <span className="cm-fechada__formas">
                    {c.pagamentos.length === 0 ? <Tag tom="apagado">sem cobrança</Tag> : c.pagamentos.map((p, k) => <Tag key={k}>{p.metodo}{p.bandeira ? ` ${p.bandeira}` : ''}</Tag>)}
                  </span>
                  <strong className="cm-fechada__total">{real(c.total)}</strong>
                </span>
              </button>
            </li>
          ))}
        </ul>
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
      cat.pacotes.filter((p) => p.ativo && p.servicoId === s.id).forEach((p) => itens.push({ tipo: 'pacote', id: p.id, nome: `${p.nome ? p.nome + ' · ' : ''}${s.nome} · pacote ${p.sessoes} sessões`, preco: p.preco, grupo: s.categoria,
        servicoId: s.id, sessoes: p.sessoes }));
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

function EscolherItem({ catalogo, aoEscolher, filtro, placeholder = 'Buscar serviço, produto, plano', autoFocus }) {
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
// id: comanda existente · inicial: { cpf, nome, itens } para abrir uma nova já preenchida; { vale: true } = venda de vale-presente
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
  const [corrigindoForma, setCorrigindoForma] = useState(false);
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
  const [querVale, setQuerVale] = useState(!!inicial?.vale); // veio de "Vender vale-presente": abre a folha do vale ao escolher quem compra

  useEffect(() => {
    if (!id) return;
    chamar('comanda', { id }).then((r) => { setC(r); setCodigo(r.codigo); }).catch((e) => setErro(e.message));
  }, [id, chamar]);

  // última versão que veio do servidor (a fila de "adicionar" usa sempre a mais nova, não a da hora do clique)
  const servidor = useRef(null);
  const fila = useRef(Promise.resolve());
  const [pendentes, setPendentes] = useState([]); // itens que já aparecem na comanda e ainda estão sendo salvos
  servidor.current = c; // (gravar também atualiza na hora em que a resposta chega, antes de a tela redesenhar)

  // grava e devolve a comanda nova; erro sobe para quem chamou
  async function gravar(mud) {
    setSalvando(true);
    try {
      const atual = servidor.current;
      const base = atual ? { id: atual.id, itens: atual.itens, codigo: atual.codigo, obs: atual.obs } : { itens: [], ...(cliente?.cpf ? { cpf: cliente.cpf } : semCadastro ? { cliente: semCadastro } : {}) };
      const r = await chamar('salvarComanda', { comanda: { ...base, ...(typeof mud === 'function' ? mud(atual) : mud) } });
      servidor.current = r;
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
  // o item aparece na hora; os salvamentos vão em fila (um de cada vez, sempre sobre a comanda mais nova)
  const adicionar = (i) => {
    const novo = { tipo: i.tipo, id: i.id, nome: i.nome, qtd: 1, profissional: '' };
    const marca = 'p' + Date.now() + Math.random();
    setPendentes((l) => [...l, { ...novo, marca, preco: i.preco }]);
    fila.current = fila.current
      .then(() => salvar((atual) => ({ itens: [...(atual?.itens || []), novo] })))
      .finally(() => setPendentes((l) => l.filter((x) => x.marca !== marca)));
  };
  const mudarItem = (idx, mud) => salvar({ itens: itens.map((x, k) => (k === idx ? { ...x, ...mud } : x)) });
  const gravarItem = (idx, mud) => gravar({ itens: itens.map((x, k) => (k === idx ? { ...x, ...mud } : x)) });
  const balcao = pode(membro, 'admin', 'recepcao');
  const admin = pode(membro, 'admin');
  const temVale = itens.some((i) => i.tipo === 'vale');
  const terminou = (r) => { setC(r); setPagar(false); setValesCriados(r.valesCriados || []); };

  useEffect(() => {
    if (querVale && cliente && catalogo) { setQuerVale(false); setVale({}); }
  }, [querVale, cliente, catalogo]);

  if (id && !c) return <Modal titulo="Comanda" aoFechar={aoFechar}>{erro ? <Erro>{erro}</Erro> : <Carregando />}</Modal>;
  const nomeCliente = c?.nome || cliente?.nome || semCadastro?.nome;
  const titulo = !c ? 'Nova comanda' : c.status === 'cancelada' ? 'Comanda cancelada' : fechada ? 'Comanda fechada' : 'Comanda';
  const estado = !c ? null : c.status === 'cancelada' ? ['alerta', 'cancelada'] : fechada ? ['ok', 'fechada'] : ['aviso', 'aberta'];
  // com o rodapé na tela (aberta ou recebendo), o total fica nele; no papel só entra quando não há rodapé
  const rodapeNaTela = !!c && !fechada && !cancelando;

  return (
    <Modal titulo={titulo} rotulo={c ? `Aberta em ${dataBR(c.abertaEm)} por ${c.abertaPor}` : querVale ? 'Venda de vale-presente: escolha quem compra' : 'Escolha quem vai pagar e adicione os itens'} aoFechar={aoFechar} largo>
      <div className={`cm${rodapeNaTela ? ' cm--com-rodape' : ''}`}>
        {!c && (
          <fieldset className="b-opcoes cm-quem">
            <legend className="rotulo">{querVale ? 'Quem compra o vale' : 'Cliente'}</legend>
            {cliente ? (
              <div className="b-escolhido"><div><strong>{cliente.nome}</strong><span>com cadastro</span></div><button type="button" className="botao botao--fantasma botao--p" onClick={() => setCliente(null)}>Trocar</button></div>
            ) : semCadastro ? (
              <div className="b-linha2">
                <label className="b-campo"><span className="rotulo">Nome</span><input value={semCadastro.nome} onChange={(e) => setSemCadastro({ ...semCadastro, nome: e.target.value })} placeholder="Opcional" /></label>
                <label className="b-campo"><span className="rotulo">WhatsApp</span><input inputMode="numeric" value={semCadastro.whatsapp} onChange={(e) => setSemCadastro({ ...semCadastro, whatsapp: mascaraTelefone(e.target.value) })} placeholder="Opcional" /></label>
              </div>
            ) : (
              <>
                <BuscaAluno placeholder="Nome, CPF ou WhatsApp" aoEscolher={(a) => setCliente({ cpf: a.cpf, nome: a.nome })} />
                <button type="button" className="botao botao--fantasma botao--p cm-quem__rapida" onClick={() => setSemCadastro({ nome: '', whatsapp: '' })}>Sem cadastro (venda rápida no balcão)</button>
              </>
            )}
          </fieldset>
        )}

        {aviso && <Aviso tom="ok">{aviso}</Aviso>}

        <div className="cm-papel">
          <div className="cm-papel__topo">
            <span className="cm-papel__casa">Casa Âmbar</span>
            <span className="cm-papel__ident">
              {estado && <Tag tom={estado[0]}>{estado[1]}</Tag>}
              <span className="b-suave">{c ? `nº ${c.id.slice(-5)}` : 'nova'}</span>
            </span>
          </div>
          {nomeCliente && c && <p className="cm-papel__cliente">{balcao && (c?.cpf || cliente?.cpf) ? <Link to={`/bancada/alunos/${c?.cpf || cliente.cpf}`} title="Abrir o cadastro">{nomeCliente}</Link> : nomeCliente}</p>}
          <Alertas lista={c?.alertas} compacto />
          {itens.length === 0 && pendentes.length === 0 && <p className="b-suave cm-papel__vazio">Nenhum item ainda. Busque abaixo um serviço, produto ou plano.</p>}
          <ul className="cm-itens">
            {itens.map((it, idx) => (
              <li key={it.uid || idx} className={`cm-item${it.pago ? ' cm-item--pago' : ''}${tirando === idx ? ' cm-item--saindo' : ''}`}>
                <div className="cm-item__nome">
                  <strong>{it.nome}</strong>
                  <MetaItem it={it} fechada={fechada} />
                  <NotasItem it={it} />
                  {!fechada && balcao && tirando !== idx && (
                    <span className="cm-item__acoes">
                      <button type="button" className="cm-mini" onClick={() => (it.tipo === 'vale' ? setVale({ idx }) : setEditando(idx))} disabled={salvando || (it.tipo !== 'vale' && !catalogo)}>
                        Editar
                      </button>
                      {it.tipo === 'servico' && !it.profissional && <button type="button" className="cm-mini cm-mini--alerta" onClick={() => setEditando(idx)} disabled={!catalogo}>Escolher profissional</button>}
                    </span>
                  )}
                  {!fechada && balcao && tirando !== idx && it.tipo === 'servico' && !it.pago && (it.pacote || it.pacoteDisponivel) && (
                    <button type="button" className={`cm-pacote${it.pacote ? ' cm-pacote--usando' : ''}`} disabled={salvando}
                      // pacote vendido nesta mesma comanda: a escolha é guardada à parte (o crédito só nasce ao fechar)
                      onClick={() => mudarItem(idx, it.pacoteDaComanda || it.pacoteDisponivel?.daComanda ? { semPacoteDaComanda: !!it.pacote, usarPacote: false } : { usarPacote: !it.pacote })}>
                      {it.pacote ? 'Cobrar avulso em vez do pacote' : `Usar sessão do pacote · ${plural(it.pacoteDisponivel.restantes, 'sessão restante', 'sessões restantes')}`}
                    </button>
                  )}
                  {/* serviço com combo à venda: um toque inclui o combo, e a sessão de hoje sai dele */}
                  {!fechada && balcao && tirando !== idx && it.tipo === 'servico' && !it.pago && !it.pacote && !it.pacoteDisponivel && catalogo && (() => {
                    const combos = catalogo.itens.filter((x) => x.tipo === 'pacote' && x.servicoId === it.id);
                    return combos.length > 0 && (
                      <span className="cm-combos">
                        <span className="b-suave">Vender combo:</span>
                        {combos.map((x) => (
                          <button key={x.id} type="button" className="cm-pacote" disabled={salvando} onClick={() => adicionar(x)}>
                            {plural(x.sessoes, 'sessão', 'sessões')} · {real(x.preco)}
                          </button>
                        ))}
                      </span>
                    );
                  })()}
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
                  <strong>{it.pago ? 'já pago' : it.pacote ? 'pacote' : real(it.total)}</strong>
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
                      <button type="button" className="botao botao--fantasma botao--p" onClick={() => setTirando(null)}>Voltar</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
            {pendentes.map((it) => (
              <li key={it.marca} className="cm-item cm-item--salvando" aria-busy="true">
                <div className="cm-item__nome">
                  <strong>{it.nome}</strong>
                  <span className="b-suave cm-item__meta">{ROTULO_TIPO[it.tipo]} · salvando…</span>
                </div>
                <div className="cm-item__qtd" />
                <div className="cm-item__valor"><strong>{real(it.preco || 0)}</strong></div>
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
          {((c && c.desconto > 0.009) || (c && !rodapeNaTela)) && (
            <div className="cm-totais">
              {c && c.desconto > 0.009 && <><span>Subtotal</span><span>{real(c.subtotal)}</span><span>Descontos</span><span className="cm-totais__desc">− {real(c.desconto)}</span></>}
              {!rodapeNaTela && <><span className="cm-totais__rot">Total</span><strong className="cm-totais__valor">{salvando ? '…' : real(c?.total || 0)}</strong></>}
            </div>
          )}
          {fechada && c.pagamentos.length > 0 && (
            <div className="cm-pagos">
              <span className="cm-pagos__titulo">Pagamento</span>
              <ul>
                {c.pagamentos.map((p, i) => (
                  <li key={i}>
                    <span>{p.metodo}{p.bandeira ? ` · ${p.bandeira}` : ''}{p.parcelas > 1 ? ` · ${p.parcelas}x` : ''}</span>
                    <strong>{real(p.valor)}</strong>
                  </li>
                ))}
              </ul>
              {c.fechadaEm && <span className="b-suave cm-pagos__quando">Fechada em {dataBR(c.fechadaEm)} às {hora(c.fechadaEm.slice(11, 16))} por {c.fechadaPor}</span>}
            </div>
          )}
        </div>

        {!fechada && c && (
          <section className="cm-detalhes" aria-label="Cupom e observação">
            <div className="b-linha2 cm-codigo">
              <label className="b-campo">
                <span className="rotulo">Cupom ou vale de serviço</span>
                <span className="codigo__linha">
                  <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="Código (opcional)" />
                  <button type="button" className="botao botao--linha botao--p" disabled={salvando || codigo === c.codigo} onClick={() => salvar({ codigo })}>{codigo || !c.codigo ? 'Aplicar' : 'Tirar'}</button>
                </span>
              </label>
              <label className="b-campo"><span className="rotulo">Observação da comanda</span>
                <input key={c.obs} defaultValue={c.obs} onBlur={(e) => e.target.value !== c.obs && salvar({ obs: e.target.value })} placeholder="Opcional" /></label>
            </div>
          </section>
        )}
        <Erro>{erro}</Erro>

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
              <button type="button" className="botao botao--fantasma botao--p" onClick={() => setCancelando(false)}>Voltar</button>
            </div>
          </section>
        )}

        {c?.historico?.length > 0 && (pagar || corrigindoForma) && <HistoricoComanda itens={c.historico} />}
        {corrigindoForma && c?.status === 'fechada' && <CorrigirFormas c={c} aoCancelar={() => setCorrigindoForma(false)} aoCorrigir={(r) => { setC(r); setCorrigindoForma(false); setAviso('Forma de pagamento corrigida. O caixa e os relatórios já acompanham.'); }} />}
        {pagar && c && !fechada && <Pagamento c={c} semVale={temVale} aoVoltar={() => setPagar(false)} aoFechar={terminou} />}
        {valesCriados.length > 0 && <ValesCriados lista={valesCriados} />}
        {fechada && c.status === 'fechada' && <Recibo c={c} />}

        {fechada && c.status === 'fechada' && !corrigindoForma && (
          reabrindo ? (
            admin && (
              <section className="cm-painel" aria-label="Reabrir para corrigir">
                <h3 className="cm-painel__titulo">Reabrir para corrigir</h3>
                <Aviso tom="aviso">Estorna os pagamentos, devolve o estoque e suspende as comissões. Planos, pacotes e vales-presentes vendidos nesta comanda ficam desativados até ela ser fechada de novo.</Aviso>
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
                  <button type="button" className="botao botao--fantasma botao--p" onClick={() => setReabrindo(false)}>Voltar</button>
                </div>
              </section>
            )
          ) : (balcao || admin) && (
            <div className="cm-corrigir">
              {balcao && c.pagamentos.some((p) => p.metodo !== 'Vale-presente') && (
                <button type="button" className="botao botao--linha botao--p cm-corrigir-forma" onClick={() => setCorrigindoForma(true)}>Corrigir forma de pagamento</button>
              )}
              {admin && (
                <span className="cm-corrigir__reabrir">
                  <button type="button" className="botao botao--linha botao--p" onClick={() => { setReabrindo(true); setMotivoReabrir(''); setErroReabrir(''); }}>Reabrir para corrigir</button>
                  <Ajuda titulo="Reabrir para corrigir" alinhar="direita">Só a administração. Estorna os pagamentos para lançar de novo.</Ajuda>
                </span>
              )}
            </div>
          )
        )}

        {c?.historico?.length > 0 && !(pagar || corrigindoForma) && <HistoricoComanda itens={c.historico} />}

        {!fechada && c && !pagar && !cancelando && (
          <div className="cm-rodape">
            <div className="cm-rodape__total">
              <span>Total</span>
              <strong>{salvando ? '…' : real(c.total)}</strong>
              {c.desconto > 0.009 && <small>com {real(c.desconto)} de desconto</small>}
            </div>
            <div className="cm-rodape__acoes">
              <MenuMais rotulo="Mais" className="cm-mais" itens={[{ texto: 'Cancelar comanda', acao: () => { setCancelando(true); setMotivoCancelar(''); } }]} />
              <button type="button" className="botao botao--linha" onClick={aoFechar}>Deixar aberta</button>
              {c.total > 0 || salvando ? (
                <button type="button" className="botao botao--cheio" disabled={salvando || !itens.length} onClick={() => setPagar(true)}>Receber {real(c.total)}</button>
              ) : (
                <BotaoAcao className="botao botao--cheio" disabled={!itens.length} acao={async () => {
                  setErro('');
                  try { terminou(await chamar('fecharComanda', { id: c.id, pagamentos: [] })); } catch (e) { setErro(e.message); }
                }}>Concluir (nada a cobrar)</BotaoAcao>
              )}
            </div>
          </div>
        )}
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

// linha pequena embaixo do nome: tipo, profissional, agenda, promoção… (cada parte é um pedacinho)
function MetaItem({ it, fechada }) {
  const partes = it.tipo === 'vale' ? [] : [ROTULO_TIPO[it.tipo]];
  if (it.atendimentoId) partes.push('da agenda');
  if (it.profissional) partes.push(`com ${it.profissional}`);
  if (it.pacote) partes.push(`sessão de ${it.pacoteDescricao || 'pacote'}`);
  if (it.promocao) partes.push(`promoção ${it.promocao}`);
  if (it.cupom) partes.push(`cupom ${it.cupom}`);
  if (it.vale && it.tipo !== 'vale') partes.push(`vale ${it.vale}`);
  if (it.valeCodigo) partes.push(`código ${it.valeCodigo}`);
  const falta = !fechada && it.tipo === 'servico' && !it.profissional;
  if (!partes.length && !falta && !it.pago) return null;
  return (
    <span className="b-meta cm-item__meta">
      {partes.map((p, i) => <span key={i}>{p}</span>)}
      {it.pago && <span title="Pago antes: pacote, antecipado ou cortesia">pago antes</span>}
      {falta && <span className="b-alerta-txt">falta quem atendeu</span>}
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
    linhas.push(['vale', `${v.validadeDias ? `Vale por ${v.validadeDias % 30 === 0 ? plural(v.validadeDias / 30, 'mês', 'meses') : plural(v.validadeDias, 'dia', 'dias')}` : 'Validade padrão'}${v.enviarEmail && v.email ? ' · e-mail ao fechar' : ''}${v.enviarWhats && v.whatsapp ? ' · WhatsApp ao fechar' : ''}${v.mensagem ? ' · com mensagem' : ''}`]);
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
              ? <button type="button" className="botao botao--fantasma botao--p" onClick={() => { setNovo(null); setTrocar(false); }}>Desfazer</button>
              : !trocar && <button type="button" className="botao botao--fantasma botao--p" onClick={() => setTrocar(true)}>Trocar</button>)}
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
  const [enviarWa, setEnviarWa] = useState(d.enviarWhats ?? true); // já vem marcado (só vale se o WhatsApp estiver preenchido)
  const [erro, setErro] = useState('');
  const filtroPlano = useMemo(() => (i) => i.tipo !== 'produto', []);
  const okEmail = emailOk(email);
  const okWhats = soDigitos(whats).length >= 10;
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
        mensagem: mensagem.trim(), validadeDias: validade ? Number(validade) : undefined, enviarEmail: enviar && okEmail, enviarWhats: enviarWa && w.length >= 10 });
    } catch (e) { setErro(e.message); }
  }

  return (
    <Modal titulo="Vale-presente" rotulo="Quem compra paga nesta comanda; o código nasce ao fechar" aoFechar={aoFechar}>
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
            <button type="button" className="botao botao--fantasma botao--p" onClick={() => setPlano(null)}>Trocar</button></div>
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
        <fieldset className="cm-grupo">
          <legend className="rotulo">Como entregar o vale</legend>
          <label className={`b-check${okEmail ? '' : ' b-check--apagado'}`}>
            <input type="checkbox" checked={enviar && okEmail} disabled={!okEmail} onChange={(e) => setEnviar(e.target.checked)} />
            {okEmail ? `Por e-mail para ${email.trim()}, ao fechar` : 'Por e-mail ao fechar (informe o e-mail)'}
          </label>
          <label className={`b-check${okWhats ? '' : ' b-check--apagado'}`}>
            <input type="checkbox" checked={enviarWa && okWhats} disabled={!okWhats} onChange={(e) => setEnviarWa(e.target.checked)} />
            {okWhats ? `Pelo WhatsApp para ${telFmt(soDigitos(whats))}, ao fechar` : 'Pelo WhatsApp ao fechar (informe o WhatsApp)'}
          </label>
        </fieldset>
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--cheio" acao={salvar}>{inicial ? 'Salvar vale' : 'Incluir na comanda'}</BotaoAcao>
      </div>
    </Modal>
  );
}

// depois de fechar: o código de cada vale vendido, pronto para mandar
function ValesCriados({ lista }) {
  const { chamar } = useBancada();
  const [copiado, setCopiado] = useState('');
  const [enviados, setEnviados] = useState({});
  async function copiar(v) {
    try { await navigator.clipboard.writeText(v.textoWhats); setCopiado(v.codigo); setTimeout(() => setCopiado(''), 2500); } catch { setCopiado(''); }
  }
  // o WhatsApp abre com a mensagem pronta (o envio é um toque seu: não existe envio automático sem a API paga do WhatsApp); fica anotado como enviado
  const marcar = (v) => { setEnviados((e) => ({ ...e, [v.codigo]: true })); chamar('enviarVale', { codigo: v.codigo, canal: 'whatsapp' }).catch(() => {}); };
  return (
    <section className="cm-vales" aria-label="Vales-presentes criados">
      {lista.map((v) => (
        <article key={v.codigo} className="cm-vale">
          <span className="cm-vale__rotulo">Vale-presente criado{v.nome ? ` para ${v.nome}` : ''}</span>
          <strong className="cm-vale__codigo">{v.codigo}</strong>
          <span className="cm-vale__desc">{v.descricao}</span>
          <span className="b-suave">Válido até {dataBR(v.validade)}</span>
          {v.enviarWhats && !enviados[v.codigo] && <span className="cm-vale__ok">Falta enviar pelo WhatsApp.</span>}
          {enviados[v.codigo] && <span className="cm-vale__ok">Marcado como enviado pelo WhatsApp.</span>}
          <div className="cm-vale__botoes">
            <a className="botao botao--cheio botao--p com-icone" target="_blank" rel="noreferrer" onClick={() => marcar(v)}
              href={soDigitos(v.whatsapp) ? linkWhats(v.whatsapp, v.textoWhats) : `https://wa.me/?text=${encodeURIComponent(v.textoWhats)}`}>
              <IconeWhatsapp tamanho={15} /> {soDigitos(v.whatsapp) ? `Enviar para ${telFmt(v.whatsapp)}` : 'Enviar pelo WhatsApp'}
            </a>
            <button type="button" className="botao botao--linha botao--p" onClick={() => copiar(v)}>{copiado === v.codigo ? 'Mensagem copiada' : 'Copiar mensagem'}</button>
          </div>
          {v.emailEnviado && <span className="cm-vale__ok">E-mail enviado para {v.email}.</span>}
          {!v.emailEnviado && v.email && <span className="b-suave">O e-mail não foi enviado. Mande pelo WhatsApp ou em Vendas → Vales-presente.</span>}
        </article>
      ))}
    </section>
  );
}

// rodapé preso ao pé da folha: total à esquerda, ações à direita (a ação principal é a última)
function RodapeAcao({ rotulo, valor, aviso, erro, children }) {
  return (
    <div className="cm-rodape">
      {erro && <Erro>{erro}</Erro>}
      <div className="cm-rodape__total">
        <span>{rotulo}</span>
        <strong>{real(valor)}</strong>
        {aviso}
      </div>
      <div className="cm-rodape__acoes">{children}</div>
    </div>
  );
}

// ao abrir o pagamento, leva a folha até ele (a comanda é longa e o pagamento nasce abaixo dela)
function useRolarAteAqui() {
  const ref = useRef(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }), 80);
    return () => clearTimeout(t);
  }, []);
  return ref;
}

function Pagamento({ c, semVale, aoVoltar, aoFechar }) {
  const { chamar } = useBancada();
  const refPagar = useRolarAteAqui();
  const [linhas, setLinhas] = useState([{ ...LINHA_PAGAMENTO, valor: String(c.total.toFixed(2)).replace('.', ',') }]);
  const [erro, setErro] = useState('');
  const { falta, semBandeira } = resumoLinhas(linhas, c.total);
  const troco = linhas.find((l) => l.metodo === 'Dinheiro');
  // um vale-presente vendido não se paga com outro vale
  const formas = semVale ? METODOS : METODOS.concat(['Vale-presente']);
  return (
    <>
      <section className="cm-pagar" aria-label="Pagamento" ref={refPagar}>
        <h3 className="cm-pagar__titulo">Forma de pagamento</h3>
        <LinhasDePagamento linhas={linhas} aoMudar={setLinhas} total={c.total} formas={formas} />
        {semVale && <Aviso tom="info">Esta comanda vende um vale-presente: não dá para pagar com outro vale.</Aviso>}
        {troco && <TrocoCalc valor={numBR(troco.valor)} />}
      </section>
      <RodapeAcao rotulo="A receber" valor={c.total} erro={erro} aviso={semBandeira && <small className="b-alerta-txt">Escolha a bandeira do cartão</small>}>
        <button type="button" className="botao botao--linha" onClick={aoVoltar}>Voltar</button>
        <BotaoAcao className="botao botao--cheio" disabled={Math.abs(falta) > 0.009 || semBandeira} acao={async () => {
          setErro('');
          try {
            aoFechar(await chamar('fecharComanda', { id: c.id, pagamentos: linhas.map((l) => ({ ...l, valor: numBR(l.valor) })) }));
          } catch (e) { setErro(e.message); }
        }}>Fechar comanda</BotaoAcao>
      </RodapeAcao>
    </>
  );
}

// Comanda fechada: corrigir COMO foi pago (a divisão em Pix, dinheiro, cartão…), sem reabrir. O total pago não muda.
function CorrigirFormas({ c, aoCorrigir, aoCancelar }) {
  const { chamar } = useBancada();
  const refCorrigir = useRolarAteAqui();
  const reais = (c.pagamentos || []).filter((p) => p.metodo !== 'Vale-presente');
  const vale = (c.pagamentos || []).filter((p) => p.metodo === 'Vale-presente').reduce((t, p) => t + Number(p.valor || 0), 0);
  const total = Math.round(reais.reduce((t, p) => t + Number(p.valor || 0), 0) * 100) / 100;
  const [linhas, setLinhas] = useState(() => reais.map((p) => ({ ...LINHA_PAGAMENTO, metodo: p.metodo, valor: String(p.valor).replace('.', ','), parcelas: p.parcelas || 1, bandeira: p.bandeira || '' })));
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const { falta, semBandeira } = resumoLinhas(linhas, total);
  return (
    <>
      <section className="cm-pagar cm-pagar--corrigir" aria-label="Corrigir forma de pagamento" ref={refCorrigir}>
        <h3 className="cm-pagar__titulo">Corrigir como foi pago</h3>
        <Aviso tom="info" titulo={`Total pago em dinheiro, cartão ou Pix: ${real(total)}`}>
          {vale > 0 ? `Mais ${real(vale)} em vale-presente, que não muda. ` : ''}Mude a divisão: o caixa e os relatórios acompanham.
        </Aviso>
        <LinhasDePagamento linhas={linhas} aoMudar={setLinhas} total={total} formas={METODOS} />
        <label className="b-campo"><span className="rotulo">Motivo da correção</span>
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={200} placeholder="Ex.: pagou metade no dinheiro" /></label>
      </section>
      <RodapeAcao rotulo="Total pago" valor={total} erro={erro} aviso={semBandeira && <small className="b-alerta-txt">Escolha a bandeira do cartão</small>}>
        <button type="button" className="botao botao--linha" onClick={aoCancelar}>Cancelar</button>
        <BotaoAcao className="botao botao--cheio" disabled={Math.abs(falta) > 0.009 || semBandeira || motivo.trim().length < 3} acao={async () => {
          setErro('');
          try { aoCorrigir(await chamar('corrigirFormasComanda', { id: c.id, motivo, pagamentos: linhas.map((l) => ({ ...l, valor: numBR(l.valor) })) })); } catch (e) { setErro(e.message); }
        }}>Salvar correção</BotaoAcao>
      </RodapeAcao>
    </>
  );
}

function TrocoCalc({ valor }) {
  const [recebido, setRecebido] = useState('');
  const t = numBR(recebido) - valor;
  return (
    <label className="b-campo cm-troco">
      <span className="rotulo">Troco: quanto recebeu em dinheiro?</span>
      <span className="cm-troco__linha">
        <input inputMode="decimal" value={recebido} onChange={(e) => setRecebido(e.target.value.replace(/[^\d,.]/g, ''))} placeholder="Ex.: 200" />
        {recebido && <strong className={t >= 0 ? 'cm-troco__ok' : 'cm-troco__falta'}>{t >= 0 ? `Troco ${real(t)}` : `Falta ${real(-t)}`}</strong>}
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
      <Aviso tom="ok" titulo="Comanda fechada">Os pagamentos entraram em Vendas e no caixa do dia.</Aviso>
      {c.whatsapp && (
        <div className="cm-recibo__zap">
          <a className="botao botao--cheio botao--p com-icone" href={linkWhats(c.whatsapp, texto)} target="_blank" rel="noreferrer"><IconeWhatsapp tamanho={15} /> Enviar recibo por WhatsApp</a>
          <span className="b-suave">{telFmt(c.whatsapp)}</span>
        </div>
      )}
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

// situação do caixa em uma linha: bolinha de cor + o que importa
function StatusCaixa({ tom, titulo, children, lado }) {
  return (
    <div className={`cx-status cx-status--${tom}`} role="status">
      <span className="cx-status__ponto" aria-hidden="true" />
      <div className="cx-status__corpo">
        <strong>{titulo}</strong>
        {children && <span className="b-suave">{children}</span>}
      </div>
      {lado && <div className="cx-status__lado">{lado}</div>}
    </div>
  );
}

const textoDif = (d) => (Math.abs(d) < 0.01 ? 'bateu' : d > 0 ? `+${real(d)}` : `−${real(-d)}`);

function CaixaDia({ dia, passado, admin, aoAbrirDia }) {
  const { chamar } = useBancada();
  // hoje usa a mesma chave da tela inicial (já vem pré-carregada)
  const { dados: cx, erro, carregando, setDados } = useDados('caixa', passado ? { data: dia } : {});
  const [abertura, setAbertura] = useState('');
  const [mov, setMov] = useState(null);
  const [contado, setContado] = useState('');
  const [obs, setObs] = useState('');
  const [extrato, setExtrato] = useState({}); // forma → valor do extrato da maquininha/link/Pix
  const [erroA, setErroA] = useState('');
  const aberturaDepois = /^Aberto depois/.test(cx?.obs || '');
  const faixa = passado && (
    <Aviso tom="aviso" titulo={`Caixa de ${dataBR(dia).slice(0, 5)} (dia que já passou)`}>
      Você está lançando depois: abertura, movimentos e fechamento entram em {dataBR(dia)} e ficam marcados como lançados depois.{aberturaDepois ? ` ${obsCaixa(cx.obs)}.` : ''}
    </Aviso>
  );
  if (carregando && !cx) return <>{faixa}<Esqueleto linhas={6} altura={26} /></>;
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
        <StatusCaixa tom="parado" titulo={`Caixa ${doDia} ainda não foi aberto`} />
        <section className="cx cx--fechada">
          <div className="cx__gaveta" aria-hidden="true" />
          <div className="cx__abrir">
            <h2 className="b-cartao__titulo">Abrir o caixa {doDia}</h2>
            <label className="b-campo"><span className="rotulo">Troco inicial (R$)</span>
              <input inputMode="decimal" value={abertura} onChange={(e) => setAbertura(e.target.value.replace(/[^\d,.]/g, ''))} placeholder="0,00" />
              <small className="b-suave">{passado ? 'O troco que havia na gaveta no começo daquele dia.' : 'Conte o troco da gaveta antes do primeiro atendimento.'}</small>
            </label>
            <Erro>{erroA}</Erro>
            <BotaoAcao className="botao botao--cheio" acao={() => acao('abrirCaixa', { valor: numBR(abertura) })}>{passado ? `Abrir caixa de ${dataBR(dia).slice(0, 5)}` : 'Abrir caixa'}</BotaoAcao>
            {cx.qtdVendas > 0 && <Aviso tom="info">{passado ? 'Nesse dia' : 'Hoje já'} {cx.qtdVendas === 1 ? 'entrou' : 'entraram'} {plural(cx.qtdVendas, 'venda', 'vendas')}: {real(cx.vendas)}.</Aviso>}
          </div>
        </section>
        <Lancamentos lista={cx.lancamentos} doDia={doDia} />
        {anteriores}
      </>
    );
  }

  const aberto = cx.status === 'aberto';
  const totalFormas = cx.porForma.reduce((s, f) => s + f.valor, 0);
  const quando = `${passado ? `em ${dataBR(cx.abertoEm).slice(0, 5)} ` : ''}às ${hora(cx.abertoEm.slice(11, 16))}`;

  return (
    <>
      {faixa}
      {aberto ? (
        <StatusCaixa tom="aberto" titulo={`Caixa ${doDia} aberto`} lado={!passado && aberturaDepois ? <Tag tom="aviso" title={obsCaixa(cx.obs)}>aberto depois</Tag> : undefined}>
          por {cx.abertoPor} {quando}
        </StatusCaixa>
      ) : (
        <StatusCaixa tom="fechado" titulo={`Caixa ${doDia} fechado`} lado={<Tag tom={Math.abs(cx.diferenca || 0) < 0.01 ? 'ok' : 'alerta'}>{Math.abs(cx.diferenca || 0) < 0.01 ? 'bateu' : `diferença ${real(cx.diferenca)}`}</Tag>}>
          por {cx.fechadoPor} {passado || cx.fechadoEm.slice(0, 10) !== dia ? `em ${dataBR(cx.fechadoEm).slice(0, 5)} ` : ''}às {hora(cx.fechadoEm.slice(11, 16))}
        </StatusCaixa>
      )}
      {!passado && aberto && aberturaDepois && <p className="b-suave cx-obs">{obsCaixa(cx.obs)}.</p>}
      <div className="b-kpis cx-kpis">
        <Kpi rotulo="Troco inicial" valor={real(cx.abertura)} />
        <Kpi rotulo={passado ? 'Vendas do dia' : 'Vendas de hoje'} valor={real(cx.vendas)} detalhe={plural(cx.qtdVendas, 'lançamento', 'lançamentos')} />
        <Kpi rotulo="Dinheiro na gaveta" valor={real(cx.esperado)} detalhe={passado ? 'o que devia ter no fim do dia' : 'o que deve ter agora'} tom="destaque" />
      </div>

      <div className="b-duas cx-duas">
        <div className="cx-pilha">
          <Secao titulo="Entradas por forma" className="b-cartao cx-cartao">
            {cx.porForma.length === 0 ? <p className="b-suave">Nenhuma venda ainda.</p> : (
              <ul className="cx-formas">
                {cx.porForma.map((f) => {
                  const pct = totalFormas > 0 ? Math.round((f.valor / totalFormas) * 100) : 0;
                  return (
                    <li key={f.nome}>
                      <span className="cx-formas__nome">{f.nome}</span>
                      <strong>{real(f.valor)}</strong>
                      <span className="cx-formas__barra" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
                      <small>{pct}%</small>
                    </li>
                  );
                })}
              </ul>
            )}
          </Secao>
          <Secao titulo="Dinheiro na gaveta" className="b-cartao cx-cartao">
            <dl className="cx-conta">
              <dt>Troco inicial</dt><dd>{real(cx.abertura)}</dd>
              <dt>+ vendas em dinheiro</dt><dd>{real(cx.dinheiroVendas)}</dd>
              {cx.suprimentos > 0 && <><dt>+ suprimentos</dt><dd>{real(cx.suprimentos)}</dd></>}
              {cx.sangrias > 0 && <><dt>− sangrias</dt><dd>{real(cx.sangrias)}</dd></>}
              {cx.despesas > 0 && <><dt>− despesas pagas do caixa</dt><dd>{real(cx.despesas)}</dd></>}
              <dt className="cx-conta__total">= esperado na gaveta</dt><dd className="cx-conta__total">{real(cx.esperado)}</dd>
            </dl>
          </Secao>
        </div>
        <Secao titulo="Movimentos" className="b-cartao cx-cartao"
          acoes={aberto && (
            <>
              <button type="button" className="botao botao--linha botao--p" onClick={() => setMov({ tipo: 'sangria', valor: '', motivo: '' })}>Sangria</button>
              <button type="button" className="botao botao--linha botao--p" onClick={() => setMov({ tipo: 'suprimento', valor: '', motivo: '' })}>Suprimento</button>
              <button type="button" className="botao botao--linha botao--p" onClick={() => setMov({ tipo: 'despesa', valor: '', motivo: '', categoria: 'Outros' })}>Pagar despesa</button>
            </>
          )}>
          {cx.movimentos.length === 0 && <p className="b-suave">Sem retiradas nem reforços de troco.</p>}
          <ul className="cx-mov">
            {cx.movimentos.map((m, i) => (
              <li key={i}>
                <span className="cx-mov__tipo">{ROT[m.tipo]}</span>
                <strong className={m.tipo === 'suprimento' ? 'cx-mov__entra' : 'cx-mov__sai'}>{m.tipo === 'suprimento' ? '+' : '−'} {real(m.valor)}</strong>
                <span className="b-suave cx-mov__meta">{m.motivo} · {m.retroativo ? `lançado depois, em ${dataBR(m.quando).slice(0, 5)} ${hora(m.quando.slice(11, 16))}` : hora(m.quando.slice(11, 16))} · {m.quem}</span>
              </li>
            ))}
          </ul>
        </Secao>
      </div>

      <Lancamentos lista={cx.lancamentos} doDia={doDia} />
      <Erro>{erroA}</Erro>

      {aberto ? (
        <section className="b-cartao cx-cartao cx-fechar">
          <Secao titulo={`Fechar o caixa ${doDia}`}
            ajuda={passado ? 'Informe quanto havia na gaveta no fim daquele dia. O sistema compara com o esperado.' : 'Conte o dinheiro da gaveta e informe o total. O sistema compara com o esperado.'}>
            <div className="b-linha2">
              <label className="b-campo"><span className="rotulo">Dinheiro contado (R$)</span>
                <input inputMode="decimal" value={contado} onChange={(e) => setContado(e.target.value.replace(/[^\d,.]/g, ''))} placeholder={String(cx.esperado).replace('.', ',')} />
                <small className="b-suave">Esperado: {real(cx.esperado)}</small></label>
              <label className="b-campo"><span className="rotulo">Observação</span><input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" /></label>
            </div>
            {dif != null && (
              <Aviso tom={Math.abs(dif) < 0.01 ? 'ok' : 'alerta'} titulo={Math.abs(dif) < 0.01 ? 'Bateu certinho' : dif > 0 ? `Sobrando ${real(dif)}` : `Faltando ${real(-dif)}`} />
            )}
            <ConferirExtrato conferir={cx.conferir || []} valores={extrato} aoMudar={setExtrato} />
            <div className="cx-rodape">
              <span className="cx-rodape__info">{dif == null ? 'Informe o dinheiro contado para fechar' : `Contado ${real(numBR(contado))} · esperado ${real(cx.esperado)}`}</span>
              <BotaoAcao className="botao botao--cheio" disabled={contado === ''} acao={() => acao('fecharCaixa', { contado: numBR(contado), obs,
                conferencia: Object.fromEntries(Object.entries(extrato).filter(([, v]) => v !== '').map(([k, v]) => [k, numBR(v)])) })}>Fechar caixa</BotaoAcao>
            </div>
          </Secao>
        </section>
      ) : (
        <section className="b-cartao cx-cartao cx-fechado">
          <Secao titulo="Fechamento" acoes={admin && <BotaoAcao acao={() => acao('reabrirCaixa', {})}>Reabrir caixa</BotaoAcao>}>
            <div className="b-kpis cx-kpis">
              <Kpi rotulo="Contado" valor={real(cx.contado)} />
              <Kpi rotulo="Esperado" valor={real(cx.esperado)} />
              <Kpi rotulo="Diferença" valor={real(cx.diferenca || 0)} tom={Math.abs(cx.diferenca || 0) < 0.01 ? 'ok' : 'alerta'} detalhe={Math.abs(cx.diferenca || 0) < 0.01 ? 'bateu' : cx.diferenca > 0 ? 'sobrando' : 'faltando'} />
            </div>
            {cx.obs && <p className="b-suave cx-fechado__obs">Observação: {cx.obs}</p>}
            {Math.abs(cx.depoisDoFechamento || 0) > 0.009 && (
              <Aviso tom="aviso" titulo={`Depois do fechamento ${cx.depoisDoFechamento > 0 ? 'entraram' : 'saíram'} ${real(Math.abs(cx.depoisDoFechamento))} em dinheiro`}>
                Foi uma comanda ou venda lançada mais tarde. {admin ? 'Reabra o caixa para conferir de novo.' : 'Avise a administração.'}
              </Aviso>
            )}
            {cx.conferencia?.length > 0 && (
              <ul className="cx-conf cx-conf--fechado" aria-label="Conferência com o extrato">
                <li className="cx-conf__cab" aria-hidden="true"><span>Forma</span><span className="num">Sistema</span><span className="num">Extrato</span><span>Resultado</span></li>
                {cx.conferencia.map((x) => (
                  <li key={x.forma}>
                    <span>{x.forma}</span><span className="num" data-r="Sistema">{real(x.sistema)}</span><span className="num" data-r="Extrato">{real(x.informado)}</span>
                    <Tag tom={Math.abs(x.diferenca) < 0.01 ? 'ok' : 'alerta'}>{textoDif(x.diferenca)}</Tag>
                  </li>
                ))}
              </ul>
            )}
          </Secao>
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

// cada venda do dia: hora, cliente, o quê, como pagou e quem registrou (Vendas tem o detalhe e o estorno)
function Lancamentos({ lista, doDia }) {
  if (!lista || lista.length === 0) return null;
  const comLiquido = lista.some((l) => l.liquido != null); // só a administração recebe a taxa e o líquido
  const forma = (l) => [l.metodo === 'Misto' && l.divisao ? l.divisao : l.metodo, l.bandeira && l.metodo !== 'Misto' ? l.bandeira : '', l.parcelas > 1 ? `${l.parcelas}x` : ''].filter(Boolean).join(' · ');
  const onde = (l) => (l.comanda ? `comanda ${String(l.comanda).slice(-5)}` : l.origem === 'site' ? 'pelo site' : 'balcão') + (l.por ? ` · ${l.por}` : '');
  return (
    <Secao titulo={`Lançamentos ${doDia}`} className="b-cartao cx-cartao" ajuda="Cada venda do dia. Para estornar, corrigir ou ver o recibo, use Vendas."
      acoes={<><span className="b-suave">{plural(lista.length, 'venda', 'vendas')}</span><Link className="botao botao--linha botao--p" to="/bancada/vendas">Abrir Vendas</Link></>}>
      <ul className={`cx-lanc${comLiquido ? ' cx-lanc--liquido' : ''}`}>
        <li className="cx-lanc__cab" aria-hidden="true">
          <span>Hora</span><span>Cliente</span><span>O quê</span><span>Forma</span><span className="cx-lanc__valor">Valor</span>{comLiquido && <span className="cx-lanc__valor">Líquido</span>}
        </li>
        {lista.map((l, i) => (
          <li key={i}>
            <span className="cx-lanc__hora">{l.hora ? hora(l.hora) : '—'}</span>
            <span className="cx-lanc__quem"><strong>{l.nome || 'Sem nome'}</strong><small>{onde(l)}</small></span>
            <span className="cx-lanc__item">{l.item}</span>
            <span className="cx-lanc__forma">{forma(l)}</span>
            <span className="cx-lanc__valor">{real(l.valor)}</span>
            {comLiquido && <span className="cx-lanc__valor cx-lanc__liq">{l.taxa > 0 ? <>{real(l.liquido)}<small>taxa {real(l.taxa)}</small></> : <span className="b-suave">{real(l.liquido)}</span>}</span>}
          </li>
        ))}
      </ul>
    </Secao>
  );
}

// fechamento: confere o total de cada forma com o extrato da maquininha, do link e do Pix (opcional)
function ConferirExtrato({ conferir, valores, aoMudar }) {
  const formas = conferir.filter((f) => f.valor > 0 || valores[f.forma]);
  const resto = conferir.filter((f) => !formas.includes(f));
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const lista = mostrarTodas ? conferir : formas;
  if (!conferir.length) return null;
  return (
    <fieldset className="cx-conf-campos">
      <legend className="rotulo">
        Conferir com o extrato <Tag tom="apagado">opcional</Tag>
        <Ajuda titulo="Conferir com o extrato" alinhar="esquerda">Digite o total que aparece no extrato da maquininha, do link e do banco para cada forma. Os valores com diferença ficam marcados no fechamento.</Ajuda>
      </legend>
      {lista.length === 0 && <p className="b-suave">Nenhuma venda em Pix ou cartão {mostrarTodas ? '' : 'por enquanto'}.</p>}
      <ul className="cx-conf">
        {lista.map((f) => {
          const v = valores[f.forma] ?? '';
          const d = v === '' ? null : Math.round((numBR(v) - f.valor) * 100) / 100;
          return (
            <li key={f.forma}>
              <span className="cx-conf__forma">{f.forma}{f.bandeiras.length > 0 && <small>{f.bandeiras.map((b) => `${b.nome} ${real(b.valor)}`).join(' · ')}</small>}{f.taxa > 0 && <small>taxa estimada {real(f.taxa)} · deve cair {real(f.liquido)}{f.cai ? ` em ${dataBR(f.cai)}` : ''}</small>}{!(f.taxa > 0) && f.valor > 0 && f.cai && <small>deve cair em {dataBR(f.cai)}</small>}</span>
              <span className="num cx-conf__sistema"><small>no sistema</small>{real(f.valor)}</span>
              <input className="cx-conf__campo" inputMode="decimal" value={v} placeholder="extrato" aria-label={`Total de ${f.forma} no extrato`}
                onChange={(e) => aoMudar({ ...valores, [f.forma]: e.target.value.replace(/[^\d,.]/g, '') })} />
              <span className="cx-conf__dif">{d == null ? '' : <Tag tom={Math.abs(d) < 0.01 ? 'ok' : 'alerta'}>{textoDif(d)}</Tag>}</span>
            </li>
          );
        })}
      </ul>
      {!mostrarTodas && resto.length > 0 && <button type="button" className="botao botao--fantasma botao--p cx-conf__mais" onClick={() => setMostrarTodas(true)}>Conferir também {resto.map((f) => f.forma).join(', ')}</button>}
    </fieldset>
  );
}

// administração: os últimos caixas antes do dia escolhido (abre o dia ao tocar)
function CaixasAnteriores({ lista, aoAbrir }) {
  if (!lista?.length) return null;
  return (
    <Secao titulo="Caixas anteriores" className="cx-anteriores">
      <ul className="b-itens">
        {lista.map((c) => (
          <li key={c.data}>
            <button type="button" className="b-item" onClick={() => aoAbrir(c.data)}>
              <span className="b-item__corpo">
                <span className="b-item__titulo">{dataBR(c.data)}</span>
                <span className="b-suave">{c.status === 'aberto' ? 'ficou aberto' : `esperado ${real(c.esperado)}${c.fechadoPor ? ` · ${c.fechadoPor}` : ''}`}</span>
              </span>
              <span className="b-item__lado">
                {c.status === 'aberto' || c.diferenca == null ? <Tag tom="aviso">não fechado</Tag> : Math.abs(c.diferenca) < 0.01 ? <Tag tom="ok">bateu</Tag> : <Tag tom="alerta">{real(c.diferenca)}</Tag>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Secao>
  );
}
