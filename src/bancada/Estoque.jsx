import { useMemo, useState } from 'react';
import './css/vendas.css';
import { useLocation } from 'react-router-dom';
import { useBancada, pode } from './sessao.jsx';
import { useDados, Carregando, Esqueleto, Erro, Cabecalho, Kpi, Modal, BotaoAcao, Vazio, Tag, Aviso, real, dataBR, hora, numBR, baixarCSV, METODOS } from './ui.jsx';

const TIPOS = { entrada: 'Entrada (compra)', perda: 'Perda ou vencido', uso: 'Uso na cabine', ajuste: 'Contagem (ajustar o saldo)' };
const FILTROS_ESTOQUE = [['todos', 'Todos'], ['revenda', 'Revenda'], ['insumos', 'Insumos'], ['falta', 'Em falta'], ['inativos', 'Desativados']];
const qtdFmt = (n) => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

export default function Estoque() {
  const local = useLocation();
  const { membro } = useBancada();
  const admin = pode(membro, 'admin');
  const { dados, erro, carregando, setDados } = useDados('produtos', {});
  const [filtro, setFiltro] = useState(local.state?.filtro || 'todos');
  const [busca, setBusca] = useState('');
  const [editar, setEditar] = useState(null);
  const [mover, setMover] = useState(null);
  const [historico, setHistorico] = useState(null);

  const lista = useMemo(() => (dados?.produtos || []).filter((p) => {
    if (filtro === 'revenda' && !p.vende) return false;
    if (filtro === 'insumos' && p.vende) return false;
    if (filtro === 'falta' && !(p.minimo > 0 && p.estoque <= p.minimo)) return false;
    if (filtro !== 'inativos' && !p.ativo) return false;
    if (filtro === 'inativos' && p.ativo) return false;
    const q = busca.trim().toLowerCase();
    return !q || (p.nome + ' ' + p.marca + ' ' + p.categoria).toLowerCase().includes(q);
  }).sort((a, b) => a.nome.localeCompare(b.nome)), [dados, filtro, busca]);

  const contagem = useMemo(() => {
    const todos = dados?.produtos || [];
    return { todos: todos.filter((p) => p.ativo).length, revenda: todos.filter((p) => p.ativo && p.vende).length, insumos: todos.filter((p) => p.ativo && !p.vende).length,
      falta: todos.filter((p) => p.ativo && p.minimo > 0 && p.estoque <= p.minimo).length, inativos: todos.filter((p) => !p.ativo).length };
  }, [dados]);
  const valorEstoque = (dados?.produtos || []).filter((p) => p.ativo && p.estoque > 0).reduce((s, p) => s + p.estoque * (p.custo || 0), 0);

  return (
    <>
      <Cabecalho titulo="Estoque" acoes={
        <>
          <button type="button" className="botao botao--linha botao--p" disabled={!lista.length} onClick={() => baixarCSV('estoque-casa-ambar', [
            ['nome', 'Produto'], ['marca', 'Marca'], ['categoria', 'Categoria'], [(p) => String(p.estoque).replace('.', ','), 'Saldo'], ['unidade', 'Unidade'],
            [(p) => String(p.minimo).replace('.', ','), 'Mínimo'], ...(admin ? [[(p) => String(p.custo).replace('.', ','), 'Custo']] : []), [(p) => String(p.preco).replace('.', ','), 'Preço de venda']], lista)}>Exportar CSV</button>
          {admin && <button type="button" className="botao botao--cheio botao--p" onClick={() => setEditar({ ativo: true, vende: true, categoria: 'Revenda (home care)', unidade: 'un' })}>Novo produto</button>}
        </>
      } ajuda="A venda na comanda e o uso em cada serviço baixam o saldo sozinhos. Use “Entrada” quando chegar mercadoria, “Contar” para acertar o saldo e “Baixa” para perda ou vencido.">
        Revenda (home care) e insumos de cabine
      </Cabecalho>
      {dados && (
        <section className="b-kpis">
          <Kpi rotulo="Produtos ativos" valor={dados.produtos.filter((p) => p.ativo).length} />
          <Kpi rotulo="Em falta ou acabando" valor={dados.baixo} tom={dados.baixo ? 'alerta' : ''} detalhe="no mínimo ou abaixo" />
          {admin && <Kpi rotulo="Valor em estoque" valor={real(valorEstoque)} detalhe="pelo custo" />}
        </section>
      )}
      <div className="b-barra-fixa es-filtros">
        <div className="b-barra-busca"><input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto ou marca" aria-label="Buscar produto" /></div>
        <div className="b-filtros vn-chips" role="group" aria-label="Filtrar produtos">
          {FILTROS_ESTOQUE.map(([id, t]) => (
            <button key={id} type="button" className={`b-chip${filtro === id ? ' b-chip--ativo' : ''}`} onClick={() => setFiltro(id)}>{t}{dados && contagem[id] > 0 && <span>{contagem[id]}</span>}</button>
          ))}
        </div>
      </div>
      <Erro>{erro}</Erro>
      {carregando && !dados && <Esqueleto linhas={5} altura={64} />}
      {dados && dados.produtos.length === 0 && (
        <Vazio titulo="Nenhum produto cadastrado" forma="presenca"
          acao={admin && <button type="button" className="botao botao--cheio botao--p" onClick={() => setEditar({ ativo: true, vende: true, categoria: 'Revenda (home care)', unidade: 'un' })}>Novo produto</button>}>
          {admin ? 'Cadastre os produtos de revenda e os insumos usados na cabine.' : 'Peça à administração para cadastrar os produtos.'}
        </Vazio>
      )}
      {dados && dados.produtos.length > 0 && lista.length === 0 && (
        <Vazio titulo="Nada com esse filtro" acao={<button type="button" className="botao botao--linha botao--p" onClick={() => { setFiltro('todos'); setBusca(''); }}>Limpar filtros</button>}>
          Troque o filtro ou a busca para ver outros produtos.
        </Vazio>
      )}
      {lista.length > 0 && (
        <ul className="es-lista">
          {lista.map((p) => {
            const falta = p.minimo > 0 && p.estoque <= p.minimo;
            const zerado = p.estoque <= 0;
            const cheio = Math.max(p.minimo * 3, p.estoque, 1);
            return (
              <li key={p.id} className={`es-item${falta ? ' es-item--falta' : ''}${zerado ? ' es-item--zero' : ''}${p.ativo ? '' : ' es-item--inativo'}`}>
                <button type="button" className="es-item__nome" onClick={() => setHistorico(p)} title="Ver o histórico de movimentos">
                  <span className="es-item__titulo"><strong>{p.nome}</strong>
                    {!p.ativo && <Tag tom="apagado">desativado</Tag>}
                    {zerado && p.ativo ? <Tag tom="alerta">zerado</Tag> : falta && <Tag tom="alerta">repor</Tag>}
                  </span>
                  <span className="b-meta">
                    {p.marca && <span>{p.marca}</span>}
                    {p.categoria && <span>{p.categoria}</span>}
                    {p.vende && <span>vende por {real(p.preco)}</span>}
                  </span>
                </button>
                <div className="es-nivel" role="img" aria-label={`Saldo ${qtdFmt(p.estoque)} ${p.unidade}, mínimo ${qtdFmt(p.minimo)}`}>
                  <span className="es-nivel__linha">
                    <span className="es-nivel__qtd"><strong>{qtdFmt(p.estoque)}</strong> {p.unidade}</span>
                    {p.minimo > 0 && <small>mínimo {qtdFmt(p.minimo)}</small>}
                  </span>
                  <span className="es-barra"><i style={{ width: `${Math.max(0, Math.min(100, (p.estoque / cheio) * 100))}%` }} />{p.minimo > 0 && <b style={{ left: `${(p.minimo / cheio) * 100}%` }} />}</span>
                </div>
                <div className="es-acoes">
                  <button type="button" className="botao botao--linha botao--p" onClick={() => setMover({ p, tipo: 'entrada' })}>Entrada</button>
                  <button type="button" className="botao botao--fantasma botao--p" onClick={() => setMover({ p, tipo: 'ajuste' })}>Contar</button>
                  <button type="button" className="botao botao--fantasma botao--p" onClick={() => setMover({ p, tipo: 'perda' })}>Baixa</button>
                  {admin && <button type="button" className="botao botao--fantasma botao--p" onClick={() => setEditar(p)}>Editar</button>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {editar && dados && <EditarProduto p={editar} categorias={dados.categorias} aoFechar={() => setEditar(null)} aoSalvar={(d) => { setDados(d); setEditar(null); }} />}
      {mover && <Movimentar p={mover.p} tipoInicial={mover.tipo} admin={admin} aoFechar={() => setMover(null)} aoSalvar={(d) => { setDados(d); setMover(null); }} />}
      {historico && <Historico p={historico} aoFechar={() => setHistorico(null)} />}
    </>
  );
}

function EditarProduto({ p, categorias, aoFechar, aoSalvar }) {
  const { chamar } = useBancada();
  const novo = !p.id;
  const [f, setF] = useState({ id: p.id, nome: p.nome || '', marca: p.marca || '', categoria: p.categoria, unidade: p.unidade || 'un', vende: !!p.vende,
    preco: p.preco ? String(p.preco).replace('.', ',') : '', custo: p.custo ? String(p.custo).replace('.', ',') : '', minimo: p.minimo || '', obs: p.obs || '',
    ativo: p.ativo !== false, estoqueInicial: '' });
  const [erro, setErro] = useState('');
  const campo = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }) });
  return (
    <Modal titulo={novo ? 'Novo produto' : p.nome} rotulo="Estoque" aoFechar={aoFechar}>
      <div className="b-form">
        <label className="b-campo"><span className="rotulo">Nome</span><input {...campo('nome')} placeholder="Ex.: Protetor solar FPS 50" /></label>
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">Marca</span><input {...campo('marca')} /></label>
          <label className="b-campo"><span className="rotulo">Categoria</span><select {...campo('categoria')}>{categorias.map((c) => <option key={c}>{c}</option>)}</select></label>
        </div>
        <label className="b-check"><input type="checkbox" checked={f.vende} onChange={(e) => setF({ ...f, vende: e.target.checked })} /> Produto de revenda (aparece na comanda)</label>
        <div className="b-linha2">
          {f.vende && <label className="b-campo"><span className="rotulo">Preço de venda (R$)</span><input inputMode="decimal" {...campo('preco')} /></label>}
          <label className="b-campo"><span className="rotulo">Custo (R$ por {f.unidade || 'unidade'})</span><input inputMode="decimal" {...campo('custo')} /></label>
        </div>
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">Unidade</span>
            <select {...campo('unidade')}>{['un', 'ml', 'g', 'frasco', 'caixa', 'pacote', 'par', 'sessão'].map((u) => <option key={u}>{u}</option>)}</select></label>
          <label className="b-campo"><span className="rotulo">Avisar quando chegar a</span><input inputMode="decimal" {...campo('minimo')} placeholder="Ex.: 2" /></label>
        </div>
        {novo && <label className="b-campo"><span className="rotulo">Quanto tem agora</span><input inputMode="decimal" {...campo('estoqueInicial')} placeholder="0" /></label>}
        <label className="b-campo"><span className="rotulo">Observação</span><input {...campo('obs')} placeholder="Ex.: guardar na geladeira" /></label>
        {!novo && <label className="b-check"><input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /> Produto ativo</label>}
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--cheio" acao={async () => {
          setErro('');
          try {
            aoSalvar(await chamar('salvarProduto', { produto: { ...f, preco: numBR(f.preco), custo: numBR(f.custo), minimo: numBR(f.minimo), estoqueInicial: numBR(f.estoqueInicial) } }));
          } catch (e) { setErro(e.message); }
        }}>Salvar produto</BotaoAcao>
      </div>
    </Modal>
  );
}

function Movimentar({ p, tipoInicial, admin, aoFechar, aoSalvar }) {
  const { chamar } = useBancada();
  const [tipo, setTipo] = useState(tipoInicial);
  const [qtd, setQtd] = useState('');
  const [custo, setCusto] = useState(p.custo ? String(p.custo).replace('.', ',') : '');
  const [motivo, setMotivo] = useState('');
  const [despesa, setDespesa] = useState(false);
  const [pago, setPago] = useState(true);
  const [forma, setForma] = useState('Pix');
  const [erro, setErro] = useState('');
  const n = numBR(qtd);
  const novoSaldo = tipo === 'ajuste' ? n : tipo === 'entrada' ? p.estoque + n : p.estoque - n;
  return (
    <Modal titulo={p.nome} rotulo={`Saldo atual: ${qtdFmt(p.estoque)} ${p.unidade}`} aoFechar={aoFechar}>
      <div className="b-form">
        <fieldset className="b-opcoes">
          <legend className="rotulo">O que aconteceu</legend>
          {Object.entries(TIPOS).map(([id, t]) => (
            <label key={id} className={tipo === id ? 'ativo' : ''}><input type="radio" checked={tipo === id} onChange={() => setTipo(id)} /><span><strong>{t}</strong></span></label>
          ))}
        </fieldset>
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">{tipo === 'ajuste' ? `Quanto tem na prateleira (${p.unidade})` : `Quantidade (${p.unidade})`}</span>
            <input inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value.replace(/[^\d,.]/g, ''))} autoFocus /></label>
          {tipo === 'entrada' && <label className="b-campo"><span className="rotulo">Custo por {p.unidade} (R$)</span><input inputMode="decimal" value={custo} onChange={(e) => setCusto(e.target.value.replace(/[^\d,.]/g, ''))} /></label>}
        </div>
        {qtd !== '' && <Aviso tom={novoSaldo < 0 ? 'alerta' : 'info'}>Saldo depois: <strong>{qtdFmt(novoSaldo)} {p.unidade}</strong> (agora {qtdFmt(p.estoque)})</Aviso>}
        <label className="b-campo"><span className="rotulo">Motivo ou fornecedor</span><input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Opcional" /></label>
        {tipo === 'entrada' && admin && numBR(custo) > 0 && (
          <>
            <label className="b-check"><input type="checkbox" checked={despesa} onChange={(e) => setDespesa(e.target.checked)} /> Lançar a compra em Despesas ({real(n * numBR(custo))})</label>
            {despesa && (
              <div className="b-linha2">
                <label className="b-campo"><span className="rotulo">Forma</span><select value={forma} onChange={(e) => setForma(e.target.value)}>{METODOS.map((m) => <option key={m}>{m}</option>)}</select></label>
                <label className="b-check"><input type="checkbox" checked={pago} onChange={(e) => setPago(e.target.checked)} /> Já paga</label>
              </div>
            )}
          </>
        )}
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--cheio" disabled={qtd === ''} acao={async () => {
          setErro('');
          try {
            aoSalvar(await chamar('movimentarEstoque', { produtoId: p.id, tipo, qtd: n, custo: numBR(custo), motivo, lancarDespesa: despesa, pago, forma, fornecedor: motivo }));
          } catch (e) { setErro(e.message); }
        }}>Registrar</BotaoAcao>
      </div>
    </Modal>
  );
}

function Historico({ p, aoFechar }) {
  const { dados, erro, carregando } = useDados('movimentos', { produtoId: p.id });
  const ROT = { entrada: 'Entrada', perda: 'Baixa', uso: 'Uso', ajuste: 'Contagem', venda: 'Venda' };
  return (
    <Modal titulo={p.nome} rotulo="Movimentos do estoque" aoFechar={aoFechar}>
      <Erro>{erro}</Erro>
      {carregando && !dados && <Carregando />}
      {dados && dados.length === 0 && <Vazio titulo="Sem movimentos ainda" forma="presenca">Entradas, baixas e vendas deste produto aparecem aqui.</Vazio>}
      <ul className="es-hist">
        {(dados || []).map((x, i) => (
          <li key={i}>
            <span className={`es-hist__qtd ${x.qtd >= 0 ? 'es-hist__qtd--mais' : 'es-hist__qtd--menos'}`}>{x.qtd >= 0 ? '+' : '−'}{qtdFmt(Math.abs(x.qtd))}<small>{p.unidade}</small></span>
            <span className="es-hist__corpo">
              <strong>{ROT[x.tipo] || x.tipo}</strong>
              <span className="b-meta"><span>{dataBR(x.quando)} {hora(x.quando.slice(11, 16))}</span><span>{x.motivo || '—'}</span><span>{x.quem}</span></span>
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
