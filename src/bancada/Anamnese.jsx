import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useBancada } from './sessao.jsx';
import { useDados, Carregando, Erro, Cabecalho, Abas, BotaoAcao, Vazio, Tag, real, dataBR, dataCurta } from './ui.jsx';
import { Foto, ProntuarioConteudo } from './Prontuario.jsx';
import { reduzirFoto } from './fotos.js';

const MAX_FOTOS = 30;
const quando = (t) => (t ? `${dataBR(t.slice(0, 10))} às ${t.slice(11, 16)}` : '');

// ============================================================
//  ANAMNESE (texto livre, sem limite, com fotos) — por cliente
//  alvo: { atendimentoId } (profissional) ou { cpf } (administração e recepção)
// ============================================================
export function AnamneseConteudo({ alvo }) {
  const { chamar } = useBancada();
  const chave = JSON.stringify(alvo);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState(null); // null | 'nova' | anotação
  const [ampliada, setAmpliada] = useState('');
  useEffect(() => {
    let vivo = true;
    chamar('anamnesesProf', alvo).then((r) => vivo && setDados(r)).catch((e) => vivo && setErro(e.message));
    return () => { vivo = false; };
  }, [chave]); // eslint-disable-line react-hooks/exhaustive-deps

  if (erro && !dados) return <Erro>{erro}</Erro>;
  if (!dados) return <Carregando />;
  return (
    <div className="an">
      <div className="an-topo">
        <p className="b-suave">Escreva do seu jeito: queixa, histórico, rotina, o que observou. Sem limite de tamanho. Fotos ficam numa pasta privada.</p>
        {!editando && <button type="button" className="botao botao--cheio botao--p" onClick={() => setEditando('nova')}>Nova anamnese</button>}
      </div>
      {editando && (
        <EditorAnamnese alvo={alvo} anotacao={editando === 'nova' ? null : editando} aoCancelar={() => setEditando(null)}
          aoSalvar={(r) => { setDados(r); setEditando(null); }} />
      )}
      {dados.anotacoes.length === 0 && !editando && (
        <Vazio titulo="Nenhuma anamnese ainda" forma="presenca">Toque em “Nova anamnese” para escrever a primeira.</Vazio>
      )}
      <ol className="an-lista">
        {dados.anotacoes.filter((x) => x.id !== editando?.id).map((x) => (
          <ItemAnamnese key={x.id} x={x} aoAmpliar={setAmpliada} aoEditar={() => setEditando(x)}
            aoApagar={async () => {
              try { await chamar('excluirAnamneseProf', { id: x.id }); setDados({ ...dados, anotacoes: dados.anotacoes.filter((y) => y.id !== x.id) }); }
              catch (e) { setErro(e.message); }
            }} />
        ))}
      </ol>
      <Erro>{erro}</Erro>
      {ampliada && (
        <div className="pt-ampliada" role="dialog" aria-label="Foto ampliada" onClick={() => setAmpliada('')} onKeyDown={(e) => e.key === 'Escape' && setAmpliada('')} tabIndex={-1}>
          <img src={ampliada} alt="Foto da anamnese ampliada" />
          <button type="button" className="b-fechar" aria-label="Fechar">×</button>
        </div>
      )}
    </div>
  );
}

function ItemAnamnese({ x, aoAmpliar, aoEditar, aoApagar }) {
  const { chamar } = useBancada();
  const [completo, setCompleto] = useState(null);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const texto = completo ?? x.texto;
  const comprido = texto.length > 1200;
  async function abrirTudo() {
    if (x.longo && completo == null) {
      setCarregando(true);
      try { setCompleto((await chamar('anamneseProf', { id: x.id })).texto); } finally { setCarregando(false); }
    }
    setAberto(true);
  }
  return (
    <li className="an-item">
      <header className="an-item__topo">
        <div>
          <h3>{x.titulo}</h3>
          <span className="b-suave">{x.profissional} · {quando(x.criadoEm)}{x.atualizadoEm && x.atualizadoEm !== x.criadoEm ? ` · editada ${quando(x.atualizadoEm)}` : ''}</span>
        </div>
        {x.podeEditar && (
          <span className="an-item__acoes">
            <button type="button" className="link-acao" onClick={aoEditar}>editar</button>
            <BotaoAcao className="link-sair" confirmar="Apagar esta anamnese e as fotos?" acao={aoApagar}>apagar</BotaoAcao>
          </span>
        )}
      </header>
      {texto && <div className={`an-item__texto${comprido && !aberto ? ' an-item__texto--curto' : ''}`}>{texto}</div>}
      {(x.longo && completo == null) || (comprido && !aberto) ? (
        <button type="button" className="link-acao an-item__mais" onClick={abrirTudo} disabled={carregando}>
          {carregando ? 'Abrindo…' : `Ler tudo (${x.tamanho.toLocaleString('pt-BR')} caracteres)`}
        </button>
      ) : null}
      {x.fotos.length > 0 && <div className="pt-fotos an-fotos">{x.fotos.map((id) => <Foto key={id} id={id} aoAbrir={aoAmpliar} alt="Foto da anamnese" />)}</div>}
    </li>
  );
}

function EditorAnamnese({ alvo, anotacao, aoCancelar, aoSalvar }) {
  const { chamar } = useBancada();
  const [titulo, setTitulo] = useState(anotacao?.titulo || '');
  const [texto, setTexto] = useState(anotacao && !anotacao.longo ? anotacao.texto : '');
  const [carregandoTexto, setCarregandoTexto] = useState(!!anotacao?.longo);
  const [novas, setNovas] = useState([]);
  const [remover, setRemover] = useState([]);
  const [erro, setErro] = useState('');
  const [ampliada, setAmpliada] = useState('');
  const input = useRef(null);
  const area = useRef(null);
  const [original, setOriginal] = useState(texto);

  // anamnese longa: busca o texto inteiro antes de editar
  useEffect(() => {
    if (!anotacao?.longo) return undefined;
    let vivo = true;
    chamar('anamneseProf', { id: anotacao.id }).then((r) => { if (vivo) { setTexto(r.texto); setOriginal(r.texto); setCarregandoTexto(false); } })
      .catch((e) => vivo && setErro(e.message));
    return () => { vivo = false; };
  }, [anotacao]); // eslint-disable-line react-hooks/exhaustive-deps

  // a caixa de texto cresce com o que é escrito
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight + 4, 260)}px`;
  }, [texto, carregandoTexto]);

  // não perder o que foi escrito ao fechar a aba por engano
  const mudou = texto !== original || novas.length > 0 || remover.length > 0;
  useEffect(() => {
    if (!mudou) return undefined;
    const aviso = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [mudou]);

  const fotosAtuais = (anotacao?.fotos || []).filter((f) => !remover.includes(f));
  const total = fotosAtuais.length + novas.length;
  async function adicionar(lista) {
    setErro('');
    try {
      const fotos = await Promise.all([...lista].slice(0, MAX_FOTOS - total).map(reduzirFoto));
      setNovas((x) => [...x, ...fotos]);
    } catch (e) { setErro(e.message); }
  }

  return (
    <section className="an-editor" aria-label={anotacao ? 'Editar anamnese' : 'Nova anamnese'}>
      <label className="b-campo"><span className="rotulo">Título</span>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Anamnese facial, Primeira consulta, Retorno" maxLength={120} /></label>
      <label className="b-campo"><span className="rotulo">Anamnese</span>
        {carregandoTexto ? <Carregando texto="Abrindo o texto" /> : (
          <textarea ref={area} className="an-editor__texto" value={texto} onChange={(e) => setTexto(e.target.value)}
            placeholder={'Queixa principal, histórico de saúde, medicamentos, alergias, rotina de cuidados, hábitos (sol, água, sono), expectativas, o que você observou…'} />
        )}
      </label>
      <span className="an-editor__conta">{texto.length.toLocaleString('pt-BR')} caracteres</span>

      <div className="pt-fotos an-fotos">
        {fotosAtuais.map((id) => (
          <span key={id} className="pt-foto pt-foto--nova">
            <Foto id={id} aoAbrir={setAmpliada} alt="Foto da anamnese" />
            <button type="button" aria-label="Tirar esta foto" onClick={() => setRemover((r) => [...r, id])}>×</button>
          </span>
        ))}
        {novas.map((src, i) => (
          <span key={`n${i}`} className="pt-foto pt-foto--nova"><img src={src} alt={`Foto nova ${i + 1}`} />
            <button type="button" aria-label="Tirar esta foto" onClick={() => setNovas(novas.filter((_, k) => k !== i))}>×</button></span>
        ))}
      </div>
      <div className="an-editor__acoes">
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { adicionar(e.target.files); e.target.value = ''; }} />
        <button type="button" className="botao botao--linha botao--p" disabled={total >= MAX_FOTOS} onClick={() => input.current?.click()}>
          {total ? 'Mais fotos' : 'Adicionar fotos'}
        </button>
        <span className="an-editor__dir">
          <button type="button" className="link-acao" onClick={() => { if (!mudou || window.confirm('Sair sem salvar o que foi escrito?')) aoCancelar(); }}>Cancelar</button>
          <BotaoAcao className="botao botao--cheio botao--p" disabled={carregandoTexto || (!texto.trim() && !total)} acao={async () => {
            setErro('');
            try {
              aoSalvar(await chamar('salvarAnamneseProf', { ...alvo, id: anotacao?.id, titulo, texto, fotos: novas, remover }));
            } catch (e) { setErro(e.message); }
          }}>Salvar anamnese</BotaoAcao>
        </span>
      </div>
      <Erro>{erro}</Erro>
      {ampliada && (
        <div className="pt-ampliada" role="dialog" aria-label="Foto ampliada" onClick={() => setAmpliada('')} tabIndex={-1}>
          <img src={ampliada} alt="Foto ampliada" />
        </div>
      )}
    </section>
  );
}

// ============================================================
//  COMANDAS DA CLIENTE (só leitura): abertas e as últimas fechadas
// ============================================================
export function ComandasCliente({ alvo }) {
  const { chamar } = useBancada();
  const chave = JSON.stringify(alvo);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  useEffect(() => {
    let vivo = true;
    chamar('comandasCliente', alvo).then((r) => vivo && setDados(r)).catch((e) => vivo && setErro(e.message));
    return () => { vivo = false; };
  }, [chave]); // eslint-disable-line react-hooks/exhaustive-deps
  if (erro && !dados) return <Erro>{erro}</Erro>;
  if (!dados) return <Carregando />;
  if (!dados.abertas.length && !dados.fechadas.length) return <Vazio titulo="Nenhuma comanda" forma="presenca">Quando a recepção abrir a comanda desta cliente, ela aparece aqui.</Vazio>;
  return (
    <div className="an-comandas">
      {dados.abertas.map((c) => (
        <article key={c.id} className="cm-papel an-comanda">
          <header className="cm-papel__topo"><span className="cm-papel__marca">Casa Âmbar</span><Tag tom="aviso">aberta</Tag></header>
          <ItensComanda c={c} />
          <p className="b-suave">Aberta {quando(c.abertaEm)} por {c.abertaPor}. A recepção recebe o pagamento.</p>
        </article>
      ))}
      {dados.fechadas.length > 0 && (
        <section className="b-cartao">
          <h3 className="b-cartao__titulo">Comandas anteriores</h3>
          <ul className="an-fechadas">
            {dados.fechadas.map((c) => (
              <li key={c.id}>
                <span className="an-fechadas__data">{dataCurta(c.fechadaEm.slice(0, 10))}</span>
                <span className="an-fechadas__itens">{c.itens.map((i) => `${i.nome}${i.qtd > 1 ? ` × ${i.qtd}` : ''}`).join(' · ')}</span>
                <strong>{real(c.total)}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ItensComanda({ c }) {
  return (
    <>
      <ul className="an-itens">
        {c.itens.map((i, k) => (
          <li key={k}>
            <span><strong>{i.nome}</strong>{i.qtd > 1 ? ` × ${i.qtd}` : ''}{i.profissional ? <small> · {i.profissional}</small> : null}</span>
            <span>{i.pago ? 'já pago' : real(i.total ?? (i.preco || 0) * (i.qtd || 1))}</span>
          </li>
        ))}
      </ul>
      <div className="an-total"><span>Total</span><strong>{real(c.total)}</strong></div>
    </>
  );
}

// ============================================================
//  MINHAS CLIENTES (profissional) e a página de cada uma
// ============================================================
export function MinhasClientes() {
  const { dados, erro, carregando } = useDados('minhasClientes', {});
  const [busca, setBusca] = useState('');
  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return (dados || []).filter((c) => !b || c.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(b));
  }, [dados, busca]);
  return (
    <>
      <Cabecalho titulo="Minhas clientes">Quem você atende. Toque na cliente para ver a anamnese, a ficha e a comanda.</Cabecalho>
      <div className="b-barra-busca an-busca">
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pelo nome" aria-label="Buscar cliente" />
      </div>
      <Erro>{erro}</Erro>
      {carregando && !dados && <Carregando />}
      {dados && !dados.length && <Vazio titulo="Nenhuma cliente ainda" forma="presenca">As clientes aparecem aqui quando a recepção agenda um atendimento com você.</Vazio>}
      <ul className="an-clientes">
        {lista.map((c) => (
          <li key={c.ref}>
            <Link to={`/bancada/clientes/${c.ref}`} state={{ nome: c.nome }} className="an-cliente">
              <span className="an-cliente__ini" aria-hidden="true">{c.nome.split(' ').slice(0, 2).map((x) => x[0]).join('')}</span>
              <span className="an-cliente__info">
                <strong>{c.nome}</strong>
                <span>{c.servicos.join(' · ')}</span>
                <small>{c.proxima ? `próxima: ${dataBR(c.proxima)}` : c.ultima ? `última: ${dataBR(c.ultima)}` : ''}{` · ${c.atendimentos} atendimento${c.atendimentos === 1 ? '' : 's'}`}</small>
              </span>
              {c.anamneses > 0 && <Tag tom="ok">{c.anamneses} anamnese{c.anamneses === 1 ? '' : 's'}</Tag>}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export function ClienteProfissional() {
  const { ref } = useParams();
  const local = useLocation();
  const [aba, setAba] = useState('anamnese');
  const alvo = useMemo(() => ({ atendimentoId: ref }), [ref]);
  const { dados } = useDados('minhasClientes', {});
  const nome = dados?.find((c) => c.ref === ref)?.nome || local.state?.nome || 'Cliente';
  return (
    <>
      <Link to="/bancada/clientes" className="link-acao an-voltar">← Minhas clientes</Link>
      <Cabecalho titulo={nome} />
      <Abas atual={aba} aoMudar={setAba} itens={[['anamnese', 'Anamnese'], ['ficha', 'Ficha e evolução'], ['comandas', 'Comandas']]} />
      {aba === 'anamnese' && <AnamneseConteudo alvo={alvo} />}
      {aba === 'ficha' && <ProntuarioConteudo alvo={alvo} />}
      {aba === 'comandas' && <ComandasCliente alvo={alvo} />}
    </>
  );
}
