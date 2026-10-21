import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useBancada, pode } from './sessao.jsx';
import { lembrar, guardarNaMemoria } from './memoria.js';
import { useDados, CampoBandeira, faltaBandeira, Carregando, Erro, Cabecalho, Tag, Modal, BotaoAcao, Vazio, Abas, BuscaAluno, STATUS_RESERVA, cpfFmt, telFmt, dataBR, dataCurta, hora, real,
  linkWhats, primeiro, baixarCSV, hojeIso, somarDias, plural, useEsquecerPedidoDaRota } from './ui.jsx';
import { ComandaModal } from './Comandas.jsx';
import { ProntuarioConteudo } from './Prontuario.jsx';
import { AnamneseConteudo } from './Anamnese.jsx';
import { FichaConteudo } from './Agenda.jsx';
import { useItensVenda, OpcoesItens } from './Servicos.jsx';
import { mascaraCPF, mascaraTelefone, soDigitos, cpfValido } from '../lib/util.js';
import { IconeWhatsapp } from '../components/Marca.jsx';
import { CamposEndereco, CampoComoConheceu } from './CamposCliente.jsx';
import { ENDERECO_VAZIO } from '../lib/clientes.js';

const WELLHUB = { confirmado: ['Wellhub', 'ok'], pendente: ['Wellhub a confirmar', 'aviso'], bloqueado: ['Wellhub recusado', 'alerta'] };

// a lista mostra os primeiros nomes e o resto sob demanda (milhares de linhas travam o celular)
const POR_PAGINA = 150;

export function Alunos() {
  const local = useLocation();
  const nav = useNavigate();
  const [busca, setBusca] = useState('');
  // a lista redesenha depois da digitação (não trava o teclado com milhares de clientes)
  const buscaAdiada = useDeferredValue(busca);
  const [mostrar, setMostrar] = useState(POR_PAGINA);
  const [filtro, setFiltro] = useState(local.state?.filtro || 'todos');
  const [novo, setNovo] = useState(!!local.state?.novo);
  useEsquecerPedidoDaRota('novo');
  const [importar, setImportar] = useState(false);
  const { membro } = useBancada();
  const { dados, erro, carregando, recarregar } = useDados('alunos', {});

  const hoje = hojeIso();
  const em7 = somarDias(hoje, 7);
  const lista = useMemo(() => {
    const q = buscaAdiada.trim().toLowerCase();
    const d = soDigitos(q);
    return (dados || []).filter((a) => {
      if (filtro === 'ativos' && !a.plano) return false;
      if (filtro === 'sem-plano' && a.plano) return false;
      if (filtro === 'sem-ficha' && a.ficha) return false;
      if (filtro === 'wellhub' && a.wellhub !== 'pendente' && a.wellhub !== 'confirmado') return false;
      if (filtro === 'wellhub-pendente' && a.wellhub !== 'pendente') return false;
      if (filtro === 'vencendo' && !(a.planoFim && a.planoFim >= hoje && a.planoFim <= em7)) return false;
      if (filtro === 'inativos' && a.ativo) return false;
      if (filtro === 'servicos' && !a.servicos) return false;
      if (filtro === 'sem-cpf' && !a.semCpf) return false;
      if (!q) return true;
      return a.nome.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || (d.length >= 3 && (a.cpf.includes(d) || a.whatsapp.includes(d)));
    });
  }, [dados, buscaAdiada, filtro, hoje, em7]);
  const abrir = (a) => nav('/bancada/alunos/' + a.cpf, { state: { resumo: a } });

  // contagem de cada filtro numa passada só (antes eram 8 passadas na lista inteira a cada tecla)
  const contagens = useMemo(() => {
    const c = { todos: 0, ativos: 0, 'sem-plano': 0, 'sem-ficha': 0, wellhub: 0, 'wellhub-pendente': 0, inativos: 0, servicos: 0, 'sem-cpf': 0, vencendo: 0 };
    (dados || []).forEach((a) => {
      c.todos++;
      if (a.plano) c.ativos++; else c['sem-plano']++;
      if (!a.ficha) c['sem-ficha']++;
      if (a.wellhub === 'pendente' || a.wellhub === 'confirmado') c.wellhub++;
      if (a.wellhub === 'pendente') c['wellhub-pendente']++;
      if (!a.ativo) c.inativos++;
      if (a.servicos) c.servicos++;
      if (a.semCpf) c['sem-cpf']++;
      if (a.planoFim && a.planoFim >= hoje && a.planoFim <= em7) c.vencendo++;
    });
    return c;
  }, [dados, hoje, em7]);
  const contagem = (f) => contagens[f] || 0;

  return (
    <>
      <Cabecalho titulo="Clientes" acoes={
        <>
          <button type="button" className="botao botao--linha botao--p" disabled={!dados} onClick={() => baixarCSV('clientes-casa-ambar', [
            ['nome', 'Nome'], [(a) => cpfFmt(a.cpf), 'CPF'], [(a) => telFmt(a.whatsapp), 'WhatsApp'], ['email', 'E-mail'], ['plano', 'Plano ativo'],
            [(a) => dataBR(a.planoFim), 'Plano até'], [(a) => dataBR(a.ultimaVisita || a.ultimaAula), 'Última visita'], ['presencas', 'Presenças em aula'], ['servicos', 'Serviços feitos'], [(a) => (a.ficha ? 'sim' : 'não'), 'Ficha'],
            ['wellhub', 'Wellhub'], [(a) => dataBR(a.criadoEm), 'Cadastro']], lista)}>Exportar CSV</button>
          {pode(membro, 'admin') && <button type="button" className="botao botao--linha botao--p" onClick={() => setImportar(true)}>Importar planilha</button>}
          <button type="button" className="botao botao--cheio botao--p" onClick={() => setNovo(true)}>Novo cliente</button>
        </>
      } />
      <div className="b-barra-busca">
        <input type="search" value={busca} onChange={(e) => { setBusca(e.target.value); setMostrar(POR_PAGINA); }} placeholder="Buscar por nome, CPF, WhatsApp ou e-mail" aria-label="Buscar cliente" />
      </div>
      <div className="b-filtros">
        {[['todos', 'Todos'], ['ativos', 'Com plano'], ['vencendo', 'Plano vence em 7 dias'], ['servicos', 'Fazem serviços'], ['sem-plano', 'Sem plano'], ['sem-ficha', 'Sem ficha'], ['sem-cpf', 'Sem CPF'],
          ['wellhub', 'Wellhub'], ['wellhub-pendente', 'Wellhub a confirmar'], ['inativos', 'Desativados']]
          .filter(([id]) => !['vencendo', 'wellhub-pendente'].includes(id) || filtro === id || contagem(id) > 0).map(([id, t]) => (
          <button key={id} type="button" className={`b-chip${filtro === id ? ' b-chip--ativo' : ''}`} onClick={() => { setFiltro(id); setMostrar(POR_PAGINA); }}>
            {t} {dados && <span>{contagem(id)}</span>}
          </button>
        ))}
      </div>
      {local.state?.aviso && <p className="aviso" role="status">{local.state.aviso}</p>}
      <Erro>{erro}</Erro>
      {carregando && !dados && <Carregando />}
      {dados && lista.length === 0 && <Vazio titulo="Ninguém por aqui">Ajuste a busca ou os filtros.</Vazio>}
      {lista.length > 0 && (
        <div className="b-tabela-caixa">
          <table className="b-tabela b-tabela--clicavel">
            <thead>
              <tr><th>Cliente</th><th>Plano</th><th>Última visita</th><th className="num">Visitas</th><th>Situação</th></tr>
            </thead>
            <tbody>
              {lista.slice(0, mostrar).map((a) => (
                <tr key={a.cpf} onClick={() => abrir(a)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && abrir(a)}>
                  <td data-rotulo="Cliente"><strong>{a.nome}</strong><span className="b-suave b-bloco b-nowrap">{telFmt(a.whatsapp)}</span></td>
                  <td data-rotulo="Plano">{a.plano || <span className="b-suave">sem plano ativo</span>}{a.planoFim && <span className="b-suave b-bloco">até {dataCurta(a.planoFim)}</span>}</td>
                  <td data-rotulo="Última visita">{a.ultimaVisita || a.ultimaAula ? dataCurta(a.ultimaVisita || a.ultimaAula) : <span className="b-suave">—</span>}</td>
                  <td data-rotulo="Visitas" className="num">{a.presencas + (a.servicos || 0)}</td>
                  <td data-rotulo="Situação">
                    <span className="b-reserva__tags">
                      {!a.ativo && <Tag tom="apagado">desativado</Tag>}
                      {a.semCpf && <Tag>sem CPF</Tag>}
                      {!a.ficha && !a.semCpf && <Tag tom="aviso">sem ficha</Tag>}
                      {a.alerta && <Tag tom="alerta">saúde: atenção</Tag>}
                      {WELLHUB[a.wellhub] && <Tag tom={WELLHUB[a.wellhub][1]}>{WELLHUB[a.wellhub][0]}</Tag>}
                      {!a.temSenha && !a.semCpf && <Tag>sem senha</Tag>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {lista.length > mostrar && (
        <p className="b-mais">
          <button type="button" className="botao botao--linha botao--p" onClick={() => setMostrar((n) => n + POR_PAGINA)}>
            Mostrar mais ({lista.length - mostrar} de {lista.length})
          </button>
        </p>
      )}
      {novo && <NovoAluno aoFechar={() => setNovo(false)} aoCriar={(cpf) => nav('/bancada/alunos/' + cpf)} />}
      {importar && <Importar aoFechar={() => setImportar(false)} aoImportar={() => { setImportar(false); recarregar(); }} />}
    </>
  );
}

// ---------- importar clientes (planilha do Avec ou de outro sistema) ----------
const CAMPOS_IMPORT = [['nome', 'Nome', /nome|cliente/i], ['whatsapp', 'WhatsApp', /whats|celular|telefone|fone|contato/i], ['email', 'E-mail', /e-?mail/i],
  ['cpf', 'CPF', /cpf|documento/i], ['nascimento', 'Nascimento', /nasc|anivers/i], ['obs', 'Observação', /obs|anota/i],
  ['cep', 'CEP', /cep/i], ['endereco', 'Rua', /endere|logradouro|^rua/i], ['numero', 'Número', /^n[uú]m|^n[º°.]/i], ['complemento', 'Complemento', /compl/i],
  ['bairro', 'Bairro', /bairro/i], ['cidade', 'Cidade', /cidade|munic/i], ['uf', 'UF', /^uf$|estado/i], ['comoConheceu', 'Como conheceu', /conhec|soube|indica|origem/i]];

function lerTabela(texto) {
  const linhas = texto.replace(/\r/g, '').split('\n').filter((l) => l.trim());
  if (!linhas.length) return [];
  const sep = linhas[0].includes('\t') ? '\t' : (linhas[0].match(/;/g) || []).length >= (linhas[0].match(/,/g) || []).length ? ';' : ',';
  return linhas.map((l) => {
    const cel = [];
    let atual = '', aspas = false;
    for (let i = 0; i < l.length; i++) {
      const ch = l[i];
      if (ch === '"') { if (aspas && l[i + 1] === '"') { atual += '"'; i++; } else aspas = !aspas; }
      else if (ch === sep && !aspas) { cel.push(atual.trim()); atual = ''; }
      else atual += ch;
    }
    cel.push(atual.trim());
    return cel;
  });
}

function Importar({ aoFechar, aoImportar }) {
  const { chamar } = useBancada();
  const [tabela, setTabela] = useState(null);
  const [mapa, setMapa] = useState({});
  const [previa, setPrevia] = useState(null);
  const [erro, setErro] = useState('');
  const [feito, setFeito] = useState(null);
  const arquivo = useRef(null);
  function carregar(texto) {
    const t = lerTabela(texto);
    if (t.length < 2) { setErro('Não encontrei linhas. Confira se a primeira linha tem os títulos das colunas.'); return; }
    setErro(''); setPrevia(null);
    setTabela(t);
    const m = {};
    CAMPOS_IMPORT.forEach(([k, , re]) => { const i = t[0].findIndex((h) => re.test(h)); if (i >= 0) m[k] = i; });
    setMapa(m);
  }
  const linhas = () => tabela.slice(1).map((l) => Object.fromEntries(CAMPOS_IMPORT.map(([k]) => [k, mapa[k] != null ? l[mapa[k]] || '' : ''])));
  async function enviar(simular) {
    setErro('');
    try {
      const todas = linhas();
      const soma = { novos: 0, atualizados: 0, repetidos: 0, totalIgnorados: 0, semCpf: 0, ignorados: [] };
      for (let i = 0; i < todas.length; i += 500) {
        const r = await chamar('importarClientes', { linhas: todas.slice(i, i + 500), simular });
        ['novos', 'atualizados', 'repetidos', 'totalIgnorados', 'semCpf'].forEach((k) => { soma[k] += r[k]; });
        soma.ignorados.push(...r.ignorados.map((x) => ({ ...x, linha: x.linha + i })));
      }
      if (simular) setPrevia(soma); else setFeito(soma);
    } catch (e) { setErro(e.message); }
  }
  return (
    <Modal titulo="Importar clientes" rotulo="Planilha exportada do Avec ou de outro sistema" aoFechar={aoFechar} largo>
      <div className="b-form">
        {feito ? (
          <>
            <p className="aviso">{plural(feito.novos, 'cadastro novo importado', 'cadastros novos importados')} · {plural(feito.atualizados, 'completado', 'completados')} · {feito.repetidos} já {feito.repetidos === 1 ? 'existia' : 'existiam'}.</p>
            <button type="button" className="botao botao--cheio" onClick={aoImportar}>Ver clientes</button>
          </>
        ) : (
          <>
            <p className="b-suave">No Avec (ou no Excel), salve a lista de clientes como <strong>CSV</strong>. Você também pode copiar as colunas da planilha e colar aqui embaixo.
              Quem já existe (mesmo CPF, WhatsApp ou e-mail) não é duplicado; só completamos o que faltar.</p>
            <input ref={arquivo} type="file" accept=".csv,.txt,text/csv,text/plain" hidden onChange={(e) => {
              const f = e.target.files[0]; if (!f) return;
              const ler = (cod) => {
                const leitor = new FileReader();
                // planilha salva no Excel pode vir em Windows-1252: tenta de novo se os acentos quebrarem
                leitor.onload = () => { const t = String(leitor.result); if (cod === 'utf-8' && t.includes('\uFFFD')) ler('windows-1252'); else carregar(t); };
                leitor.readAsText(f, cod);
              };
              ler('utf-8');
              e.target.value = '';
            }} />
            <div className="b-botoes">
              <button type="button" className="botao botao--linha botao--p" onClick={() => arquivo.current?.click()}>Escolher arquivo CSV</button>
            </div>
            <label className="b-campo"><span className="rotulo">Ou cole aqui (com a linha de títulos)</span>
              <textarea rows={4} onPaste={(e) => { e.preventDefault(); carregar(e.clipboardData.getData('text')); }} placeholder="Nome	Celular	E-mail	CPF	Nascimento" /></label>
            {tabela && (
              <>
                <p className="b-suave">{plural(tabela.length - 1, 'linha', 'linhas')}. Confira qual coluna é cada informação:</p>
                <div className="imp-mapa">
                  {CAMPOS_IMPORT.map(([k, t]) => (
                    <label key={k} className="b-campo"><span className="rotulo">{t}</span>
                      <select value={mapa[k] ?? ''} onChange={(e) => { setMapa({ ...mapa, [k]: e.target.value === '' ? undefined : Number(e.target.value) }); setPrevia(null); }}>
                        <option value="">não tem</option>
                        {tabela[0].map((h, i) => <option key={i} value={i}>{h || `coluna ${i + 1}`}</option>)}
                      </select></label>
                  ))}
                </div>
                <div className="b-tabela-caixa">
                  <table className="b-tabela"><thead><tr>{CAMPOS_IMPORT.filter(([k]) => mapa[k] != null).map(([k, t]) => <th key={k}>{t}</th>)}</tr></thead>
                    <tbody>{linhas().slice(0, 4).map((l, i) => <tr key={i}>{CAMPOS_IMPORT.filter(([k]) => mapa[k] != null).map(([k]) => <td key={k}>{l[k]}</td>)}</tr>)}</tbody></table>
                </div>
                {previa && (
                  <div className="aviso">
                    Vão entrar <strong>{plural(previa.novos, 'cadastro novo', 'cadastros novos')}</strong> ({previa.semCpf} sem CPF) · {plural(previa.atualizados, 'completado', 'completados')} · {previa.repetidos} já {previa.repetidos === 1 ? 'existe' : 'existem'} · {plural(previa.totalIgnorados, 'linha ignorada', 'linhas ignoradas')}.
                    {previa.ignorados.length > 0 && <span className="b-bloco b-suave">Ignoradas: {previa.ignorados.slice(0, 8).map((x) => `linha ${x.linha + 1}${x.nome ? ' (' + x.nome + ')' : ''}: ${x.motivo}`).join('; ')}</span>}
                  </div>
                )}
                <Erro>{erro}</Erro>
                {!previa ? (
                  <BotaoAcao className="botao botao--linha" disabled={mapa.nome == null} acao={() => enviar(true)}>Conferir antes de importar</BotaoAcao>
                ) : (
                  <BotaoAcao className="botao botao--cheio" disabled={!previa.novos && !previa.atualizados} acao={() => enviar(false)}>Importar {plural(previa.novos, 'cliente', 'clientes')}</BotaoAcao>
                )}
              </>
            )}
            {!tabela && <Erro>{erro}</Erro>}
          </>
        )}
      </div>
    </Modal>
  );
}

function NovoAluno({ aoFechar, aoCriar }) {
  const { chamar } = useBancada();
  const [f, setF] = useState({ nome: '', cpf: '', whatsapp: '', email: '', nascimento: '', enviarConvite: true, comoConheceu: '', endereco: ENDERECO_VAZIO });
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const campo = (k, m) => ({ value: f[k], onChange: (e) => setF((x) => ({ ...x, [k]: m ? m(e.target.value) : e.target.value })) });
  async function salvar(e) {
    e.preventDefault();
    setErro('');
    if (soDigitos(f.cpf) && !cpfValido(f.cpf)) return setErro('CPF inválido.');
    setEnviando(true);
    try {
      const r = await chamar('novoAluno', { ...f, cpf: soDigitos(f.cpf), whatsapp: soDigitos(f.whatsapp) });
      aoCriar(r.cpf);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }
  return (
    <Modal rotulo="Sem CPF não há acesso à área do aluno, mas ficam agenda, comandas e histórico" titulo="Novo cliente" aoFechar={aoFechar} largo>
      <form className="b-form" onSubmit={salvar} noValidate>
        <label className="b-campo"><span className="rotulo">Nome completo</span><input {...campo('nome')} autoComplete="off" /></label>
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">CPF (opcional)</span><input inputMode="numeric" {...campo('cpf', mascaraCPF)} /></label>
          <label className="b-campo"><span className="rotulo">WhatsApp</span><input inputMode="numeric" {...campo('whatsapp', mascaraTelefone)} /></label>
        </div>
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">E-mail</span><input type="email" {...campo('email')} /></label>
          <label className="b-campo"><span className="rotulo">Nascimento</span><input type="date" {...campo('nascimento')} /></label>
        </div>
        <CampoComoConheceu valor={f.comoConheceu} aoMudar={(v) => setF((x) => ({ ...x, comoConheceu: v }))} />
        <CamposEndereco valor={f.endereco} aoMudar={(v) => setF((x) => ({ ...x, endereco: v }))} />
        {soDigitos(f.cpf).length === 11 && (
          <label className="b-check">
            <input type="checkbox" checked={f.enviarConvite} onChange={(e) => setF((x) => ({ ...x, enviarConvite: e.target.checked }))} />
            Enviar convite por e-mail para criar a senha da área do aluno
          </label>
        )}
        <Erro>{erro}</Erro>
        <button type="submit" className="botao botao--cheio" disabled={enviando}>{enviando ? 'Salvando…' : 'Cadastrar'}</button>
      </form>
    </Modal>
  );
}

export function AlunoDetalhe() {
  const { cpf } = useParams();
  const nav = useNavigate();
  const local = useLocation();
  const { chamar, membro, token } = useBancada();
  const { dados: a, erro, carregando, recarregar, setDados } = useDados('aluno', { cpf });
  const [excluir, setExcluir] = useState(false);
  const [aba, setAba] = useState('resumo');
  const [editar, setEditar] = useState(false);
  const [vender, setVender] = useState(false);
  const [vale, setVale] = useState(false);
  const [comanda, setComanda] = useState(null);
  const [aviso, setAviso] = useState('');

  // enquanto a ficha completa chega, mostra o que já veio da lista (nome, contato, plano)
  const previa = local.state?.resumo?.cpf === cpf ? local.state.resumo : null;
  if (carregando && !a && previa) return (
    <>
      <Link to="/bancada/alunos" className="link-acao b-voltar">Clientes</Link>
      <Cabecalho titulo={previa.nome}>{previa.semCpf ? 'Sem CPF' : `CPF ${cpfFmt(previa.cpf)}`} · {telFmt(previa.whatsapp)}{previa.email ? ' · ' + previa.email : ''}</Cabecalho>
      <div className="b-reserva__tags b-tags-topo">{previa.plano ? <Tag tom="ok">{previa.plano}</Tag> : <Tag>sem plano ativo</Tag>}</div>
      <Carregando />
    </>
  );
  if (carregando && !a) return <Carregando />;
  if (!a) return <><Erro>{erro}</Erro><Link to="/bancada/alunos" className="link-acao">Voltar para clientes</Link></>;

  async function linkSenha() {
    setAviso('');
    try {
      const r = await chamar('enviarLinkSenha', { cpf });
      setAviso(`Link para criar senha enviado para ${r.email}.`);
    } catch (e) {
      setAviso(e.message);
    }
  }
  async function salvar(dados) {
    const r = await chamar('salvarAluno', { cpf, dados });
    if (r.cpf !== cpf) { nav('/bancada/alunos/' + r.cpf, { replace: true }); return; }
    setDados(r);
  }

  const wh = WELLHUB[a.wellhub];
  return (
    <>
      <Link to="/bancada/alunos" className="link-acao b-voltar">Clientes</Link>
      <Cabecalho titulo={a.nome} acoes={
        <>
          {a.whatsapp && <a className="botao botao--linha botao--p com-icone" href={linkWhats(a.whatsapp, `Olá, ${primeiro(a.nome)}! Aqui é da Casa Âmbar.`)} target="_blank" rel="noreferrer"><IconeWhatsapp tamanho={15} /> WhatsApp</a>}
          <button type="button" className="botao botao--linha botao--p" onClick={() => setVale(true)}>Aplicar vale</button>
          <button type="button" className="botao botao--linha botao--p" onClick={() => setVender(true)}>Vender plano</button>
          <button type="button" className="botao botao--cheio botao--p" onClick={() => setComanda(a.comandaAberta ? { id: a.comandaAberta } : { inicial: { cpf: a.cpf, nome: a.nome } })}>
            {a.comandaAberta ? 'Comanda aberta' : 'Abrir comanda'}
          </button>
        </>
      }>
        {a.semCpf ? 'Sem CPF' : `CPF ${cpfFmt(a.cpf)}`} · {telFmt(a.whatsapp)}{a.email ? ' · ' + a.email : ' · sem e-mail'} · cliente desde {dataBR(a.criadoEm)}
      </Cabecalho>
      <div className="b-reserva__tags b-tags-topo">
        {!a.ativo && <Tag tom="apagado">desativado</Tag>}
        {a.plano ? <Tag tom="ok">{a.plano}</Tag> : <Tag>sem plano ativo</Tag>}
        {a.semCpf && <Tag>sem CPF · não acessa o site</Tag>}
        {!a.marketing && <Tag>não recebe campanhas</Tag>}
        {!a.ficha && !a.semCpf && <Tag tom="aviso">sem ficha de saúde</Tag>}
        {a.alerta && <Tag tom="alerta">saúde: atenção</Tag>}
        {wh && <Tag tom={wh[1]}>{wh[0]}{a.wellhubId ? ' · ID ' + a.wellhubId : ''}</Tag>}
        {!a.temSenha && !a.semCpf && <Tag>ainda não criou senha</Tag>}
      </div>
      <Erro>{erro}</Erro>
      {aviso && <p className="aviso">{aviso}</p>}

      <Abas atual={aba} aoMudar={setAba} itens={[['resumo', 'Resumo'], ['historico', 'Histórico'], ['anamnese', 'Anamnese'], ['estetica', 'Estética'], ['planos', 'Planos e pacotes'], ['aulas', 'Aulas'],
        ['pagamentos', 'Pagamentos'], ['saude', 'Saúde']]} />

      {aba === 'resumo' && (
        <div className="b-duas">
          <section className="b-cartao">
            <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Dados</h2><button type="button" className="link-acao" onClick={() => setEditar(true)}>editar</button></header>
            <dl className="b-dados">
              <dt>WhatsApp</dt><dd>{telFmt(a.whatsapp)}</dd>
              <dt>E-mail</dt><dd>{a.email || '—'}</dd>
              <dt>Nascimento</dt><dd>{a.nascimento ? dataBR(a.nascimento) : '—'}</dd>
              <dt>Como conheceu</dt><dd>{a.comoConheceu || <button type="button" className="link-acao" onClick={() => setEditar(true)}>perguntar e anotar</button>}</dd>
              <dt>Endereço</dt><dd>{a.endereco?.endereco
                ? <>{a.endereco.endereco}{a.endereco.numero ? `, ${a.endereco.numero}` : ''}{a.endereco.complemento ? ` · ${a.endereco.complemento}` : ''}<span className="b-suave b-bloco">{[a.endereco.bairro, a.endereco.cidade && `${a.endereco.cidade}${a.endereco.uf ? '/' + a.endereco.uf : ''}`, a.endereco.cep && a.endereco.cep.replace('-', '\u2011')].filter(Boolean).join(' · ')}</span></>
                : '—'}</dd>
              <dt>Última visita</dt><dd>{a.ultimaVisita ? dataBR(a.ultimaVisita) : '—'}</dd>
              <dt>Visitas</dt><dd>{plural(a.presencas, 'aula', 'aulas')} · {plural(a.servicos || 0, 'serviço', 'serviços')}</dd>
              <dt>Já gastou</dt><dd>{real(a.totalGasto)}</dd>
              <dt>Acesso ao site</dt><dd>{a.semCpf ? 'precisa de CPF' : <>{a.temSenha ? 'com senha' : 'sem senha'} · <button type="button" className="link-acao" onClick={linkSenha}>{a.temSenha ? 'enviar link de nova senha' : 'enviar convite'}</button></>}</dd>
            </dl>
            {a.obs && <div className="b-obs"><span className="rotulo">Observações internas</span><p>{a.obs}</p></div>}
          </section>
          <section className="b-cartao">
            <header className="b-cartao__topo"><h2 className="b-cartao__titulo">Wellhub</h2></header>
            {a.wellhub === 'nao_informado' || a.wellhub === 'desligado' ? (
              <p className="b-suave">Não informou Wellhub.</p>
            ) : (
              <>
                <p>ID <strong>{a.wellhubId || '—'}</strong> · {wh ? wh[0] : a.wellhub}</p>
                <div className="b-botoes">
                  <BotaoAcao acao={() => salvar({ wellhub: 'confirmado' })} disabled={a.wellhub === 'confirmado'}>Confirmar Gold+</BotaoAcao>
                  <BotaoAcao acao={() => salvar({ wellhub: 'bloqueado' })} disabled={a.wellhub === 'bloqueado'} className="botao botao--linha botao--p botao--perigo">Recusar</BotaoAcao>
                </div>
                <p className="b-suave b-nota">Confira no Portal do Parceiro Wellhub se o plano é Gold+ ou superior.</p>
              </>
            )}
          </section>
        </div>
      )}

      {aba === 'historico' && <Historico itens={a.historico} />}
      {aba === 'estetica' && <section className="b-cartao"><ProntuarioConteudo alvo={{ cpf: a.cpf }} /></section>}
      {aba === 'anamnese' && <AnamneseConteudo alvo={{ cpf: a.cpf }} />}
      {aba === 'planos' && <Creditos a={a} aoMudar={recarregar} />}

      {aba === 'aulas' && (
        a.reservas.length === 0 ? <Vazio titulo="Nenhuma aula ainda" /> : (
          <div className="b-tabela-caixa">
            <table className="b-tabela">
              <thead><tr><th>Data</th><th>Aula</th><th>Tapete</th><th>Pago com</th><th>Situação</th></tr></thead>
              <tbody>
                {a.reservas.map((r) => {
                  const st = STATUS_RESERVA[r.status] || [r.status, 'neutro'];
                  const passou = r.data < hojeIso();
                  return (
                    <tr key={r.id}>
                      <td data-rotulo="Data">{dataBR(r.data)}</td>
                      <td data-rotulo="Aula">{r.modalidade} · {hora(r.hora)} · {r.professor}</td>
                      <td data-rotulo="Tapete">{r.tapete || '—'}</td>
                      <td data-rotulo="Pago com">{r.forma}</td>
                      <td data-rotulo="Situação"><Tag tom={st[1]}>{r.status === 'reservado' && passou ? 'sem registro' : st[0]}</Tag></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {aba === 'pagamentos' && <ListaPagamentos lista={a.pagamentos} />}

      {aba === 'saude' && (
        <section className="b-cartao">{a.ficha ? <FichaConteudo f={a.ficha} /> : <Vazio titulo="Ficha não preenchida">A ficha é preenchida pela área do aluno, em Ficha de saúde.</Vazio>}</section>
      )}

      {aba === 'resumo' && pode(membro, 'admin') && (
        <section className="b-zona-exclusao" aria-label="Excluir cliente">
          <div>
            <strong>Excluir cliente</strong>
            <span>Apaga os dados pessoais, a ficha de saúde e as fotos (pedido de exclusão, LGPD). Não dá para desfazer.</span>
          </div>
          <button type="button" className="botao botao--linha botao--p botao--perigo" onClick={() => setExcluir(true)}>Excluir cliente…</button>
        </section>
      )}

      {excluir && (
        <ExcluirCliente a={a} aoFechar={() => setExcluir(false)} aoExcluir={(r) => {
          // a lista de clientes (na memória da tela) já volta sem a pessoa
          const chave = `${token}|alunos|{}`;
          const lista = lembrar(chave);
          if (Array.isArray(lista)) guardarNaMemoria(chave, lista.filter((x) => x.cpf !== a.cpf));
          nav('/bancada/alunos', { replace: true, state: { aviso: r.apagado ? `Cadastro de ${a.nome} apagado.` : `Dados pessoais de ${a.nome} apagados. As vendas continuam no financeiro como “Cliente excluído”.` } });
        }} />
      )}
      {editar && <EditarAluno a={a} aoFechar={() => setEditar(false)} aoSalvar={async (d) => { await salvar(d); setEditar(false); }} />}
      {vender && <VenderModal aluno={a} aoFechar={() => setVender(false)} aoVender={() => { setVender(false); recarregar(); setAba('planos'); }} />}
      {vale && <AplicarVale aluno={a} aoFechar={() => setVale(false)} aoAplicar={() => { setVale(false); recarregar(); }} />}
      {comanda && <ComandaModal id={comanda.id} inicial={comanda.inicial} aoFechar={() => { setComanda(null); recarregar(); }} />}
    </>
  );
}

// ---------- excluir cliente (só administração; LGPD) ----------
function ExcluirCliente({ a, aoFechar, aoExcluir }) {
  const { chamar } = useBancada();
  const [conf, setConf] = useState('');
  const [erro, setErro] = useState('');
  const nome = primeiro(a.nome);
  const confere = conf.trim().toLowerCase() === nome.toLowerCase();
  return (
    <Modal titulo="Excluir cliente" rotulo={a.nome} aoFechar={aoFechar}>
      <div className="b-form ex-cliente">
        <p className="ex-cliente__alerta"><strong>Isto não pode ser desfeito.</strong> Use quando a pessoa pedir a exclusão dos dados (LGPD) ou para apagar um cadastro feito por engano.</p>
        <ul className="ex-cliente__lista">
          <li><strong>Sem histórico</strong> (nenhuma aula, serviço ou compra): o cadastro é apagado por inteiro.</li>
          <li><strong>Com histórico</strong>: nome, CPF, WhatsApp, e-mail e endereço são apagados em todo o sistema. As vendas continuam no financeiro como “Cliente excluído”, sem dados pessoais, para o caixa e os relatórios não mudarem.</li>
          <li><strong>Sempre</strong>: ficha de saúde, ficha de estética, evolução, anamneses e fotos são apagadas, e o acesso à área do aluno deixa de funcionar.</li>
        </ul>
        {a.comandaAberta && <p className="b-alerta-txt">Há uma comanda aberta. Feche ou cancele a comanda antes de excluir.</p>}
        <label className="b-campo">
          <span className="rotulo">Para confirmar, digite o primeiro nome: <strong>{nome}</strong></span>
          <input value={conf} onChange={(e) => setConf(e.target.value)} autoComplete="off" spellCheck={false} aria-invalid={!!conf && !confere} />
        </label>
        <Erro>{erro}</Erro>
        <div className="b-botoes">
          <BotaoAcao className="botao botao--perigo-cheio" disabled={!confere || !!a.comandaAberta} acao={async () => {
            setErro('');
            try { aoExcluir(await chamar('excluirCliente', { cpf: a.cpf, confirmacao: conf.trim() })); } catch (e) { setErro(e.message); }
          }}>Excluir definitivamente</BotaoAcao>
          <button type="button" className="botao botao--linha" onClick={aoFechar}>Voltar</button>
        </div>
      </div>
    </Modal>
  );
}

const TIPO_HIST = { aula: 'Aula', servico: 'Serviço', compra: 'Compra', produto: 'Produto', vale: 'Vale-presente', evolucao: 'Evolução', anamnese: 'Anamnese' };
function Historico({ itens }) {
  if (!itens?.length) return <Vazio titulo="Nada por aqui ainda" />;
  const linhas = [];
  itens.forEach((h, i) => {
    const ano = h.data.slice(0, 4);
    if (!i || itens[i - 1].data.slice(0, 4) !== ano) linhas.push(<li key={'a' + ano + i} className="hist__ano">{ano}</li>);
    const quando = `${dataCurta(h.data)}${h.hora ? ` · ${hora(h.hora)}` : ''}`;
    linhas.push(
      <li key={i} className={`hist__item hist__item--${h.tipo}`}>
        <span className="hist__data">{quando}</span>
        <span className="hist__ponto" aria-hidden="true" />
        <span className="hist__corpo">
          <strong>{h.titulo}</strong>
          <span className="b-suave">{TIPO_HIST[h.tipo]}{h.detalhe ? ` · ${h.detalhe}` : ''}{h.valor ? ` · ${real(h.valor)}` : ''}</span>
          <span className="b-suave hist__quando">{quando}</span>
        </span>
        {h.status && h.status !== 'pago' ? <Tag tom={h.status === 'falta' ? 'alerta' : h.status === 'cancelado' ? 'apagado' : h.status === 'atendido' || h.status === 'check-in' ? 'ok' : 'neutro'}>{
          { 'check-in': 'presente', reservado: 'reservada', atendido: 'atendido', falta: 'faltou', cancelado: 'cancelado', agendado: 'agendado', confirmado: 'confirmado', ativo: 'ativo', resgatado: 'usado', usado: 'usado' }[h.status] || h.status}</Tag> : <span />}
      </li>
    );
  });
  return <ol className="hist">{linhas}</ol>;
}

function Creditos({ a, aoMudar }) {
  const { chamar } = useBancada();
  const [prorrogar, setProrrogar] = useState(null);
  if (!a.creditos.length) return <Vazio titulo="Nenhum plano ainda">Use “Vender plano” para registrar uma compra feita no balcão.</Vazio>;
  return (
    <>
      <ul className="b-creditos">
        {a.creditos.map((c) => (
          <li key={c.id} className={c.vigente ? 'vigente' : ''}>
            <div>
              <strong>{c.descricao}</strong>
              <span className="b-suave">{dataBR(c.inicio)} a {dataBR(c.fim)} · {c.origem}</span>
            </div>
            <div className="b-creditos__uso">
              {c.porSemana ? <span>{c.usadas}/{c.limite} nesta semana</span> : <span>{c.usadas}/{c.limite} usada{c.limite > 1 ? 's' : ''}</span>}
              <Tag tom={!c.ativo ? 'apagado' : c.vigente ? 'ok' : 'neutro'}>{!c.ativo ? 'desativado' : c.vigente ? 'vigente' : c.fim < hojeIso() ? 'vencido' : 'futuro'}</Tag>
            </div>
            <div className="b-botoes">
              <button type="button" className="link-acao" onClick={() => setProrrogar(c)}>mudar validade</button>
              <BotaoAcao className="link-sair" acao={async () => { await chamar('ajustarCredito', { creditoId: c.id, ativo: !c.ativo }); aoMudar(); }}
                confirmar={c.ativo ? 'Desativar este crédito? As aulas dele deixam de poder ser reservadas.' : undefined}>
                {c.ativo ? 'desativar' : 'reativar'}
              </BotaoAcao>
            </div>
          </li>
        ))}
      </ul>
      {prorrogar && (
        <Modal rotulo={prorrogar.descricao} titulo="Mudar validade" aoFechar={() => setProrrogar(null)}>
          <Prorrogar c={prorrogar} aoSalvar={async (fim) => { await chamar('ajustarCredito', { creditoId: prorrogar.id, fim }); setProrrogar(null); aoMudar(); }} />
        </Modal>
      )}
    </>
  );
}

function Prorrogar({ c, aoSalvar }) {
  const [fim, setFim] = useState(c.fim);
  const [erro, setErro] = useState('');
  return (
    <div className="b-form">
      <p className="b-suave">Útil para atestado médico, viagem ou feriado prolongado.</p>
      <label className="b-campo"><span className="rotulo">Válido até</span><input type="date" value={fim} onChange={(e) => setFim(e.target.value)} /></label>
      <Erro>{erro}</Erro>
      <BotaoAcao className="botao botao--cheio" acao={async () => { try { await aoSalvar(fim); } catch (e) { setErro(e.message); } }}>Salvar</BotaoAcao>
    </div>
  );
}

function EditarAluno({ a, aoFechar, aoSalvar }) {
  const [f, setF] = useState({ nome: a.nome, whatsapp: telFmt(a.whatsapp), email: a.email, obs: a.obs, ativo: a.ativo, wellhubId: a.wellhubId, nascimento: a.nascimento || '',
    marketing: a.marketing !== false, cpf: '', comoConheceu: a.comoConheceu || '', endereco: { ...ENDERECO_VAZIO, ...(a.endereco || {}) } });
  const [erro, setErro] = useState('');
  const campo = (k, m) => ({ value: f[k], onChange: (e) => setF((x) => ({ ...x, [k]: m ? m(e.target.value) : e.target.value })) });
  return (
    <Modal rotulo="Cliente" titulo="Editar dados" aoFechar={aoFechar} largo>
      <div className="b-form">
        <label className="b-campo"><span className="rotulo">Nome</span><input {...campo('nome')} /></label>
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">WhatsApp</span><input inputMode="numeric" {...campo('whatsapp', mascaraTelefone)} /></label>
          <label className="b-campo"><span className="rotulo">ID Wellhub</span><input inputMode="numeric" {...campo('wellhubId')} /></label>
        </div>
        <div className="b-linha2">
          <label className="b-campo"><span className="rotulo">E-mail</span><input type="email" {...campo('email')} /></label>
          <label className="b-campo"><span className="rotulo">Nascimento</span><input type="date" {...campo('nascimento')} /></label>
        </div>
        {a.semCpf && (
          <label className="b-campo"><span className="rotulo">CPF (todo o histórico passa para o CPF; se já houver cadastro no site com ele, juntamos os dois)</span>
            <input inputMode="numeric" {...campo('cpf', mascaraCPF)} /></label>
        )}
        <CampoComoConheceu valor={f.comoConheceu} aoMudar={(v) => setF((x) => ({ ...x, comoConheceu: v }))} />
        <CamposEndereco valor={f.endereco} aoMudar={(v) => setF((x) => ({ ...x, endereco: v }))} />
        <label className="b-check"><input type="checkbox" checked={f.marketing} onChange={(e) => setF((x) => ({ ...x, marketing: e.target.checked }))} /> Recebe campanhas por e-mail</label>
        <label className="b-campo"><span className="rotulo">Observações internas</span><textarea rows={3} {...campo('obs')} placeholder="Só a equipe vê. Ex.: prefere tapete perto da janela" /></label>
        <label className="b-check"><input type="checkbox" checked={f.ativo} onChange={(e) => setF((x) => ({ ...x, ativo: e.target.checked }))} /> Cadastro ativo (pode entrar e reservar)</label>
        <Erro>{erro}</Erro>
        <BotaoAcao className="botao botao--cheio" acao={async () => {
          setErro('');
          if (f.cpf && !cpfValido(f.cpf)) { setErro('CPF inválido.'); return; }
          try { await aoSalvar({ ...f, whatsapp: soDigitos(f.whatsapp), cpf: soDigitos(f.cpf) || undefined }); } catch (e) { setErro(e.message); }
        }}>Salvar</BotaoAcao>
      </div>
    </Modal>
  );
}

const METODOS = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Link InfinitePay', 'Cortesia'];

// Venda feita no balcão (dinheiro, Pix, maquininha...). Usada também em Vendas.
export function VenderModal({ aluno: inicial, aoFechar, aoVender }) {
  const { chamar } = useBancada();
  const itens = useItensVenda();
  const [aluno, setAluno] = useState(inicial || null);
  const [planoId, setPlanoId] = useState('');
  const [metodo, setMetodo] = useState('Pix');
  const [bandeira, setBandeira] = useState('');
  const [parcelas, setParcelas] = useState(1);
  const [codigo, setCodigo] = useState('');
  const [simulado, setSimulado] = useState(null);
  const [valor, setValor] = useState('');
  const [inicio, setInicio] = useState(hojeIso());
  const [obs, setObs] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const plano = itens?.achar(planoId);

  useEffect(() => { setSimulado(null); setValor(''); }, [planoId]);

  async function aplicarCodigo() {
    setErro('');
    try {
      const r = await chamar('simularPreco', { planoId, cpf: aluno?.cpf, codigo });
      setSimulado(r);
      setValor(String(r.valorFinal).replace('.', ','));
    } catch (e) {
      setSimulado(null);
      setErro(e.message);
    }
  }

  async function confirmar() {
    setErro('');
    setEnviando(true);
    try {
      await chamar('vender', { cpf: aluno.cpf, planoId, metodo, bandeira, parcelas, codigo: simulado ? codigo : '', valor: valor === '' ? undefined : Number(String(valor).replace(',', '.')), inicio, obs });
      aoVender();
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  const final = metodo === 'Cortesia' ? 0 : valor !== '' ? Number(String(valor).replace(',', '.')) : plano?.preco;
  return (
    <Modal rotulo="Venda no balcão" titulo="Vender plano ou aula" aoFechar={aoFechar}>
      <div className="b-form">
        {!aluno ? (
          <BuscaAluno aoEscolher={setAluno} autoFocus />
        ) : (
          <div className="b-escolhido">
            <div><strong>{aluno.nome}</strong><span>{aluno.plano || 'sem plano ativo'}</span></div>
            {!inicial && <button type="button" className="link-sair" onClick={() => setAluno(null)}>trocar</button>}
          </div>
        )}
        <label className="b-campo">
          <span className="rotulo">O que foi vendido</span>
          <select value={planoId} onChange={(e) => setPlanoId(e.target.value)}>
            <option value="">{itens ? 'Escolha…' : 'Carregando…'}</option>
            <OpcoesItens itens={itens} />
          </select>
        </label>
        <div className="b-linha2">
          <label className="b-campo">
            <span className="rotulo">Recebido por</span>
            <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>{METODOS.map((m) => <option key={m}>{m}</option>)}</select>
          </label>
          {/Cartão de crédito|Link/.test(metodo) ? (
            <label className="b-campo">
              <span className="rotulo">Parcelas</span>
              <select value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}x</option>)}</select>
            </label>
          ) : (
            <label className="b-campo">
              <span className="rotulo">Começa em</span>
              <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </label>
          )}
        </div>
        <CampoBandeira metodo={metodo} valor={bandeira} aoMudar={setBandeira} />
        {plano && metodo !== 'Cortesia' && (
          <>
            <div className="b-linha2">
              <label className="b-campo">
                <span className="rotulo">Cupom ou vale (opcional)</span>
                <span className="codigo__linha">
                  <input value={codigo} onChange={(e) => { setCodigo(e.target.value.toUpperCase()); setSimulado(null); }} placeholder="Código" />
                  <button type="button" className="botao botao--linha botao--p" disabled={!codigo.trim()} onClick={aplicarCodigo}>Aplicar</button>
                </span>
              </label>
              <label className="b-campo">
                <span className="rotulo">Valor cobrado (R$)</span>
                <input inputMode="decimal" value={valor} placeholder={String(plano.preco).replace('.', ',')} onChange={(e) => setValor(e.target.value.replace(/[^\d,.]/g, ''))} />
              </label>
            </div>
            {simulado && <p className="aviso">{simulado.mensagem}</p>}
          </>
        )}
        <label className="b-campo"><span className="rotulo">Observação</span><input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" /></label>
        {plano && (
          <div className="b-total">
            <span>Total</span>
            <strong>{final === 0 ? 'Cortesia' : real(final)}</strong>
            {final < plano.preco && <s>{real(plano.preco)}</s>}
          </div>
        )}
        <Erro>{erro}</Erro>
        <button type="button" className="botao botao--cheio" disabled={!aluno || !planoId || enviando || faltaBandeira(metodo, bandeira)} onClick={confirmar}>
          {enviando ? 'Registrando…' : 'Registrar venda'}
        </button>
        <p className="b-suave b-nota">O plano entra na hora no cadastro. Pagamentos pelo site entram sozinhos — não precisa registrar aqui.</p>
      </div>
    </Modal>
  );
}

function AplicarVale({ aluno, aoFechar, aoAplicar }) {
  const { chamar } = useBancada();
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  return (
    <Modal rotulo={aluno.nome} titulo="Aplicar vale-presente" aoFechar={aoFechar}>
      <div className="b-form">
        <p className="b-suave">Vale de aula ou plano entra como crédito na hora. Vale em R$ fica ligado a este cadastro para usar na próxima compra.</p>
        <label className="b-campo"><span className="rotulo">Código</span><input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="AMBAR-XXXX-XXXX" /></label>
        <Erro>{erro}</Erro>
        {ok && <p className="aviso">{ok}</p>}
        <BotaoAcao className="botao botao--cheio" disabled={!codigo.trim()} acao={async () => {
          setErro(''); setOk('');
          try {
            const r = await chamar('aplicarVale', { cpf: aluno.cpf, codigo });
            setOk(r.mensagem.replace('Já pode reservar.', '').replace('seu plano', 'o plano de ' + primeiro(aluno.nome)));
            setTimeout(aoAplicar, 1400);
          } catch (e) { setErro(e.message); }
        }}>Aplicar</BotaoAcao>
      </div>
    </Modal>
  );
}

export function ListaPagamentos({ lista, acoes }) {
  if (!lista?.length) return <Vazio titulo="Nenhum pagamento">Os pagamentos do site e do balcão aparecem aqui.</Vazio>;
  const tom = { pago: 'ok', pendente: 'aviso', estornado: 'apagado', expirado: 'apagado', descartado: 'apagado' };
  return (
    <div className="b-tabela-caixa">
      <table className="b-tabela">
        <thead><tr><th>Data</th><th>Cliente</th><th>Item</th><th className="num">Valor</th><th>Forma</th><th>Situação</th>{acoes && <th />}</tr></thead>
        <tbody>
          {lista.map((p) => (
            <tr key={p.orderNsu}>
              <td data-rotulo="Data">{dataBR(p.pagoEm || p.criadoEm)}</td>
              <td data-rotulo="Cliente"><span className="b-nowrap">{p.nome}</span></td>
              <td data-rotulo="Item">
                {p.descricao}
                {(p.cupom || p.vale) && <span className="b-suave b-bloco">{p.cupom ? 'cupom ' + p.cupom : 'vale ' + p.vale} · −{real(p.desconto)}</span>}
                {p.observacao && <span className={`b-bloco ${/^DEVOLVER/.test(p.observacao) ? 'b-alerta-txt' : 'b-suave'}`}>{p.observacao}</span>}
              </td>
              <td data-rotulo="Valor" className="num">{real(p.valor)}</td>
              <td data-rotulo="Forma">{/* "Cartão de crédito" não quebra no meio; bandeira e parcelas podem ir para a linha de baixo */}
                {(p.metodo || '—').replace(/ /g, '\u00A0')}{p.bandeira ? ` ${p.bandeira}` : ''}{Number(p.parcelas) > 1 ? ` ${p.parcelas}x` : ''}<span className="b-suave b-bloco">{p.origem}</span></td>
              <td data-rotulo="Situação"><Tag tom={tom[p.status] || 'neutro'}>{p.status}</Tag></td>
              {acoes && <td>{acoes(p)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
