import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useBancada, pode } from './sessao.jsx';
import { useDados, BANDEIRAS, ehCartao, faltaBandeira, Carregando, Erro, Cabecalho, Modal, BotaoAcao, Vazio, Tag, BuscaAluno, Segmento, real, hora, hojeIso, dataBR, linkWhats, primeiro,
  telFmt, numBR, METODOS } from './ui.jsx';
import { mascaraTelefone } from '../lib/util.js';
import { IconeWhatsapp } from '../components/Marca.jsx';

const ROTULO_TIPO = { servico: 'Serviço', pacote: 'Pacote', plano: 'Aula e plano', produto: 'Produto' };

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
      {vista === 'caixa' && <CaixaDoDia key={versao} />}
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
  const [de, setDe] = useState(hojeIso());
  const [ate, setAte] = useState(hojeIso());
  const { dados, erro, carregando } = useDados('comandas', { status: 'fechada', de, ate });
  const total = (dados || []).reduce((s, c) => s + c.total, 0);
  return (
    <>
      <div className="b-periodo">
        <label className="b-campo"><span className="rotulo">De</span><input type="date" value={de} onChange={(e) => e.target.value && setDe(e.target.value)} /></label>
        <label className="b-campo"><span className="rotulo">Até</span><input type="date" value={ate} onChange={(e) => e.target.value && setAte(e.target.value)} /></label>
        {dados && <p className="b-suave">{dados.length} comanda{dados.length === 1 ? '' : 's'} · {real(total)}</p>}
      </div>
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
    return { itens, profissionais: cat.profissionais.filter((p) => p.ativo).map((p) => p.nome) };
  }, [planos, cat]);
}

function EscolherItem({ catalogo, aoEscolher }) {
  const [q, setQ] = useState('');
  const [aberto, setAberto] = useState(false);
  const caixa = useRef(null);
  const lista = useMemo(() => {
    if (!catalogo) return [];
    const t = q.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return catalogo.itens.filter((i) => !t || (i.nome + ' ' + i.grupo).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(t)).slice(0, 40);
  }, [catalogo, q]);
  useEffect(() => {
    const fora = (e) => { if (caixa.current && !caixa.current.contains(e.target)) setAberto(false); };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);
  const grupos = [];
  lista.forEach((i) => { const g = grupos.find((x) => x[0] === i.grupo); if (g) g[1].push(i); else grupos.push([i.grupo, [i]]); });
  return (
    <div className="cm-busca" ref={caixa}>
      <input type="search" value={q} placeholder={catalogo ? 'Adicionar serviço, produto ou plano' : 'Carregando catálogo…'} disabled={!catalogo}
        onFocus={() => setAberto(true)} onChange={(e) => { setQ(e.target.value); setAberto(true); }} aria-label="Adicionar item" />
      {aberto && lista.length > 0 && (
        <div className="cm-busca__lista" role="listbox">
          {grupos.map(([g, l]) => (
            <div key={g}>
              <span className="cm-busca__grupo">{g}</span>
              {l.map((i) => (
                <button key={i.tipo + i.id} type="button" role="option" onClick={() => { aoEscolher(i); setQ(''); setAberto(false); }}>
                  <span>{i.nome}{i.tipo === 'produto' && <small> · {i.estoque} em estoque</small>}</span>
                  <strong>{real(i.preco)}</strong>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
  const [pagar, setPagar] = useState(false);
  const [editarValor, setEditarValor] = useState(null);

  useEffect(() => {
    if (!id) return;
    chamar('comanda', { id }).then((r) => { setC(r); setCodigo(r.codigo); }).catch((e) => setErro(e.message));
  }, [id, chamar]);

  async function salvar(mud) {
    setErro('');
    setSalvando(true);
    try {
      const base = c ? { id: c.id, itens: c.itens, codigo: c.codigo, obs: c.obs } : { itens: [], ...(cliente?.cpf ? { cpf: cliente.cpf } : semCadastro ? { cliente: semCadastro } : {}) };
      const r = await chamar('salvarComanda', { comanda: { ...base, ...mud } });
      setC(r);
      return r;
    } catch (e) {
      setErro(e.message);
      return null;
    } finally {
      setSalvando(false);
    }
  }

  const fechada = c && c.status !== 'aberta';
  const itens = c?.itens || [];
  const adicionar = (i) => salvar({ itens: [...itens, { tipo: i.tipo, id: i.id, nome: i.nome, qtd: 1, profissional: '' }] });
  const mudarItem = (idx, mud) => salvar({ itens: itens.map((x, k) => (k === idx ? { ...x, ...mud } : x)) });
  const tirarItem = (idx) => salvar({ itens: itens.filter((_, k) => k !== idx) });
  const balcao = pode(membro, 'admin', 'recepcao');

  if (id && !c) return <Modal titulo="Comanda" aoFechar={aoFechar}>{erro ? <Erro>{erro}</Erro> : <Carregando />}</Modal>;
  const nomeCliente = c?.nome || cliente?.nome || semCadastro?.nome;

  return (
    <Modal titulo={fechada ? 'Comanda fechada' : c ? 'Comanda' : 'Nova comanda'} rotulo={c ? `${c.nome} · aberta ${dataBR(c.abertaEm)} por ${c.abertaPor}` : 'Escolha a cliente e adicione os itens'} aoFechar={aoFechar} largo>
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

        <div className="cm-papel">
          <div className="cm-papel__topo">
            <span className="cm-papel__casa">Casa Âmbar</span>
            <span className="b-suave">{c ? `nº ${c.id.slice(-5)}` : 'nova'}</span>
          </div>
          {nomeCliente && <p className="cm-papel__cliente">{nomeCliente}</p>}
          {itens.length === 0 && <p className="b-suave cm-papel__vazio">Nenhum item ainda.</p>}
          <ul className="cm-itens">
            {itens.map((it, idx) => (
              <li key={idx} className={it.pago ? 'cm-item cm-item--pago' : 'cm-item'}>
                <div className="cm-item__nome">
                  <strong>{it.nome}</strong>
                  <span className="b-suave">
                    {ROTULO_TIPO[it.tipo]}
                    {it.atendimentoId && ' · da agenda'}
                    {it.pago && ' · já pago (pacote, antecipado ou cortesia)'}
                    {it.promocao && ` · promoção ${it.promocao}`}
                    {it.cupom && ` · cupom ${it.cupom}`}
                    {it.vale && ` · vale ${it.vale}`}
                    {it.valorManual != null && ' · valor combinado'}
                  </span>
                  {!fechada && (it.tipo === 'servico' || it.tipo === 'produto') && catalogo && (
                    <select className="cm-item__prof" value={it.profissional || ''} onChange={(e) => mudarItem(idx, { profissional: e.target.value })} disabled={!!it.atendimentoId}
                      aria-label="Profissional (para a comissão)">
                      <option value="">{it.tipo === 'produto' ? 'Sem indicação' : 'Profissional…'}</option>
                      {catalogo.profissionais.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  )}
                  {fechada && it.profissional && <span className="b-suave">com {it.profissional}</span>}
                </div>
                <div className="cm-item__qtd">
                  {it.tipo === 'produto' && !fechada ? (
                    <span className="cm-qtd">
                      <button type="button" aria-label="Menos" disabled={it.qtd <= 1 || salvando} onClick={() => mudarItem(idx, { qtd: it.qtd - 1 })}>−</button>
                      <span>{it.qtd}</span>
                      <button type="button" aria-label="Mais" disabled={salvando} onClick={() => mudarItem(idx, { qtd: it.qtd + 1 })}>+</button>
                    </span>
                  ) : it.qtd > 1 ? <span>× {it.qtd}</span> : null}
                </div>
                <div className="cm-item__valor">
                  {it.desconto > 0.009 && <s>{real(it.preco * it.qtd)}</s>}
                  <strong>{it.pago ? '—' : real(it.total)}</strong>
                  {!fechada && !it.pago && balcao && (
                    editarValor === idx ? (
                      <ValorCombinado inicial={it.valor} aoSalvar={(v) => { setEditarValor(null); mudarItem(idx, { valorManual: v }); }} aoCancelar={() => setEditarValor(null)} />
                    ) : (
                      <button type="button" className="link-acao" onClick={() => setEditarValor(idx)}>{it.valorManual != null ? 'mudar valor' : 'outro valor'}</button>
                    )
                  )}
                </div>
                {!fechada && <button type="button" className="cm-item__tirar" aria-label={`Tirar ${it.nome}`} onClick={() => tirarItem(idx)}>×</button>}
              </li>
            ))}
          </ul>
          {!fechada && (c || cliente || semCadastro) && <EscolherItem catalogo={catalogo} aoEscolher={adicionar} />}
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
                <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="CÓDIGO" />
                <button type="button" className="botao botao--linha botao--p" disabled={salvando || codigo === c.codigo} onClick={() => salvar({ codigo })}>{codigo || !c.codigo ? 'Aplicar' : 'Tirar'}</button>
              </span>
            </label>
            <label className="b-campo"><span className="rotulo">Observação</span>
              <input defaultValue={c.obs} onBlur={(e) => e.target.value !== c.obs && salvar({ obs: e.target.value })} placeholder="Opcional" /></label>
          </div>
        )}
        <Erro>{erro}</Erro>

        {!fechada && c && !pagar && (
          <div className="cm-acoes">
            {c.total > 0 || salvando ? (
              <button type="button" className="botao botao--cheio" disabled={salvando || !itens.length} onClick={() => setPagar(true)}>Receber {real(c.total)}</button>
            ) : (
              <BotaoAcao className="botao botao--cheio" disabled={!itens.length} acao={async () => {
                setErro('');
                try { setC(await chamar('fecharComanda', { id: c.id, pagamentos: [] })); } catch (e) { setErro(e.message); }
              }}>Concluir (nada a cobrar)</BotaoAcao>
            )}
            <button type="button" className="botao botao--linha" onClick={aoFechar}>Deixar aberta</button>
            <BotaoAcao className="link-sair" confirmar="Cancelar esta comanda? Os itens não serão cobrados." acao={async () => { await chamar('cancelarComanda', { id: c.id }); aoFechar(); }}>Cancelar comanda</BotaoAcao>
          </div>
        )}

        {pagar && c && !fechada && <Pagamento c={c} aoVoltar={() => setPagar(false)} aoFechar={(r) => { setC(r); setPagar(false); }} />}
        {fechada && c.status === 'fechada' && <Recibo c={c} />}
      </div>
    </Modal>
  );
}

function ValorCombinado({ inicial, aoSalvar, aoCancelar }) {
  const [v, setV] = useState(String(inicial).replace('.', ','));
  return (
    <span className="cm-valor">
      <input inputMode="decimal" value={v} onChange={(e) => setV(e.target.value.replace(/[^\d,.]/g, ''))} aria-label="Valor combinado" autoFocus
        onKeyDown={(e) => { if (e.key === 'Enter') aoSalvar(numBR(v)); if (e.key === 'Escape') aoCancelar(); }} />
      <button type="button" className="link-acao" onClick={() => aoSalvar(numBR(v))}>ok</button>
    </span>
  );
}

function Pagamento({ c, aoVoltar, aoFechar }) {
  const { chamar } = useBancada();
  const [linhas, setLinhas] = useState([{ metodo: 'Pix', valor: String(c.total.toFixed(2)).replace('.', ','), parcelas: 1, codigo: '', bandeira: '' }]);
  const [erro, setErro] = useState('');
  const soma = linhas.reduce((s, l) => s + numBR(l.valor), 0);
  const falta = Math.round((c.total - soma) * 100) / 100;
  const mudar = (i, mud) => setLinhas(linhas.map((l, k) => (k === i ? { ...l, ...mud } : l)));
  const troco = linhas.find((l) => l.metodo === 'Dinheiro');
  return (
    <section className="cm-pagar" aria-label="Pagamento">
      <h3 className="cm-pagar__titulo">Como a cliente pagou</h3>
      {linhas.map((l, i) => (
        <div key={i} className="cm-pagar__linha">
          <select value={l.metodo} onChange={(e) => mudar(i, { metodo: e.target.value })} aria-label="Forma">
            {METODOS.concat(['Vale-presente']).map((m) => <option key={m}>{m}</option>)}
          </select>
          <input inputMode="decimal" value={l.valor} onChange={(e) => mudar(i, { valor: e.target.value.replace(/[^\d,.]/g, '') })} aria-label="Valor" />
          {/Cartão de crédito|Link/.test(l.metodo) && (
            <select className="cm-pagar__extra" value={l.parcelas} onChange={(e) => mudar(i, { parcelas: Number(e.target.value) })} aria-label="Parcelas">
              {Array.from({ length: 12 }, (_, k) => <option key={k + 1} value={k + 1}>{k + 1}x</option>)}
            </select>
          )}
          {ehCartao(l.metodo) && (
            <select className="cm-pagar__extra" value={l.bandeira} onChange={(e) => mudar(i, { bandeira: e.target.value })} aria-label="Bandeira do cartão" aria-invalid={!l.bandeira}>
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
  const texto = `Olá, ${primeiro(c.nome)}! Obrigada pela visita à Casa Âmbar ✨\n\n` +
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
// ============================================================
export function CaixaDoDia() {
  const { membro, chamar } = useBancada();
  const { dados: cx, erro, carregando, setDados } = useDados('caixa', {});
  const [abertura, setAbertura] = useState('');
  const [mov, setMov] = useState(null);
  const [contado, setContado] = useState('');
  const [obs, setObs] = useState('');
  const [erroA, setErroA] = useState('');
  if (carregando && !cx) return <Carregando />;
  if (!cx) return <Erro>{erro}</Erro>;
  const acao = async (nome, dados) => {
    setErroA('');
    try { setDados(await chamar(nome, dados)); return true; } catch (e) { setErroA(e.message); return false; }
  };
  const dif = contado === '' ? null : Math.round((numBR(contado) - cx.esperado) * 100) / 100;
  const ROT = { sangria: 'Sangria', suprimento: 'Suprimento', despesa: 'Despesa paga do caixa' };

  if (cx.status === 'nao_aberto') {
    return (
      <section className="cx cx--fechada">
        <div className="cx__gaveta" aria-hidden="true" />
        <div className="cx__abrir">
          <h2 className="b-cartao__titulo">Abrir o caixa de hoje</h2>
          <p className="b-suave">Conte o troco que está na gaveta antes do primeiro atendimento.</p>
          <label className="b-campo"><span className="rotulo">Troco inicial (R$)</span>
            <input inputMode="decimal" value={abertura} onChange={(e) => setAbertura(e.target.value.replace(/[^\d,.]/g, ''))} placeholder="0,00" /></label>
          <Erro>{erroA}</Erro>
          <BotaoAcao className="botao botao--cheio" acao={() => acao('abrirCaixa', { valor: numBR(abertura) })}>Abrir caixa</BotaoAcao>
          {cx.qtdVendas > 0 && <p className="b-suave">Já entraram {cx.qtdVendas} venda(s) hoje: {real(cx.vendas)}.</p>}
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="b-kpis">
        <div className="b-kpi"><span className="b-kpi__rotulo">Troco inicial</span><strong className="b-kpi__valor">{real(cx.abertura)}</strong><span className="b-kpi__detalhe">aberto por {cx.abertoPor} às {hora(cx.abertoEm.slice(11, 16))}</span></div>
        <div className="b-kpi"><span className="b-kpi__rotulo">Vendas de hoje</span><strong className="b-kpi__valor">{real(cx.vendas)}</strong><span className="b-kpi__detalhe">{cx.qtdVendas} lançamento(s)</span></div>
        <div className="b-kpi b-kpi--destaque"><span className="b-kpi__rotulo">Dinheiro na gaveta</span><strong className="b-kpi__valor">{real(cx.esperado)}</strong><span className="b-kpi__detalhe">o que deve ter agora</span></div>
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
            {cx.movimentos.map((m, i) => <li key={i}><strong>{ROT[m.tipo]} · {real(m.valor)}</strong><span>{m.motivo} · {hora(m.quando.slice(11, 16))} · {m.quem}</span></li>)}
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
          <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Fechar o caixa</h2></header>
          <p className="b-suave">Conte o dinheiro da gaveta e informe o total. O sistema compara com o esperado.</p>
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
          <p className="b-suave">Contado {real(cx.contado)} · esperado {real(cx.esperado)} · por {cx.fechadoPor} às {hora(cx.fechadoEm.slice(11, 16))}{cx.obs ? ' · ' + cx.obs : ''}</p>
          {pode(membro, 'admin') && <BotaoAcao acao={() => acao('reabrirCaixa', {})}>Reabrir</BotaoAcao>}
        </section>
      )}
      {mov && (
        <Modal titulo={ROT[mov.tipo]} rotulo={mov.tipo === 'sangria' ? 'Dinheiro que saiu da gaveta (ex.: depósito)' : mov.tipo === 'suprimento' ? 'Dinheiro que entrou na gaveta (ex.: reforço de troco)' : 'Conta paga com o dinheiro do caixa. Entra também em Despesas.'} aoFechar={() => setMov(null)}>
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
