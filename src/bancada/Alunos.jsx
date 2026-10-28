import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import './css/clientes.css';
import { useBancada, pode } from './sessao.jsx';
import { lembrar, guardarNaMemoria } from './memoria.js';
import { useDados, Alertas, CampoBandeira, faltaBandeira, LinhasDePagamento, LINHA_PAGAMENTO, resumoLinhas, Erro, Cabecalho, Tag, Modal, BotaoAcao, Vazio, Abas, BuscaAluno, STATUS_RESERVA, Aviso, Ajuda, Secao, Esqueleto, Kpi, MenuMais, MESES, cpfFmt, telFmt, dataBR, dataCurta, hora, real,
  linkWhats, primeiro, baixarCSV, hojeIso, somarDias, plural, numBR, useEsquecerPedidoDaRota, lembrarResultado, incluirNaListaDeClientes } from './ui.jsx';
import { ComandaModal } from './Comandas.jsx';
import { ProntuarioConteudo } from './Prontuario.jsx';
import { AnamneseConteudo } from './Anamnese.jsx';
import { FichaConteudo } from './Agenda.jsx';
import { useItensVenda, OpcoesItens, NovoAtendimento } from './Servicos.jsx';
import { mascaraCPF, mascaraTelefone, soDigitos, cpfValido } from '../lib/util.js';
import { IconeWhatsapp } from '../components/Marca.jsx';
import { CamposEndereco, CampoComoConheceu, Avatar } from './CamposCliente.jsx';
import { ENDERECO_VAZIO } from '../lib/clientes.js';

const WELLHUB = { confirmado: ['Wellhub', 'ok'], pendente: ['Wellhub a confirmar', 'aviso'], bloqueado: ['Wellhub recusado', 'alerta'] };

// a lista mostra os primeiros nomes e o resto sob demanda (milhares de linhas travam o celular)
const POR_PAGINA = 150;

export function Alunos() {
  const local = useLocation();
  const nav = useNavigate();
  const { token } = useBancada();
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
  // "Última visita" só vale com presença ou serviço feito; aula só reservada (hoje ou daqui para frente) vira "Aula reservada"
  const visitaDe = (a) => {
    const data = a.ultimaVisita || a.ultimaAula || '';
    if (a.presencas + (a.servicos || 0) > 0) return { rotulo: 'Última visita', data };
    if (data && data >= hoje) return { rotulo: 'Aula reservada', data };
    return { rotulo: 'Última visita', data: '' };
  };
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

  const temFiltro = filtro !== 'todos' || buscaAdiada.trim() !== '';
  const FILTROS = [['todos', 'Todos'], ['ativos', 'Com plano'], ['vencendo', 'Vence em 7 dias'], ['servicos', 'Fazem serviços'], ['sem-plano', 'Sem plano'], ['sem-ficha', 'Sem ficha'], ['sem-cpf', 'Sem CPF'],
    ['wellhub', 'Wellhub'], ['wellhub-pendente', 'Wellhub a confirmar'], ['inativos', 'Desativados']];
  const colunasCsv = [
    ['nome', 'Nome'], [(a) => cpfFmt(a.cpf), 'CPF'], [(a) => telFmt(a.whatsapp), 'WhatsApp'], ['email', 'E-mail'], ['plano', 'Plano ativo'],
    [(a) => dataBR(a.planoFim), 'Plano até'], [(a) => dataBR(visitaDe(a).rotulo === 'Última visita' ? visitaDe(a).data : ''), 'Última visita'], [(a) => dataBR(visitaDe(a).rotulo === 'Aula reservada' ? visitaDe(a).data : ''), 'Aula reservada'], ['presencas', 'Presenças em aula'], ['servicos', 'Serviços feitos'], [(a) => (a.ficha ? 'sim' : 'não'), 'Ficha'],
    ['wellhub', 'Wellhub'], [(a) => dataBR(a.criadoEm), 'Cadastro']];

  return (
    <>
      <Cabecalho titulo="Clientes" ajuda="Toque numa pessoa para abrir a ficha: dados, planos, aulas, histórico, pagamentos e saúde. A busca acha por nome, CPF, WhatsApp ou e-mail." acoes={
        <>
          <MenuMais rotulo="Mais" className="cl-mais-topo" itens={[
            dados && { texto: 'Exportar CSV', acao: () => baixarCSV('clientes-casa-ambar', colunasCsv, lista), extra: temFiltro ? 'do filtro' : undefined },
            pode(membro, 'admin') && { texto: 'Importar planilha', acao: () => setImportar(true) },
          ]} />
          <button type="button" className="botao botao--cheio botao--p cl-novo" onClick={() => setNovo(true)}>Novo cliente</button>
        </>
      }>
        {dados ? `${plural(contagens.todos, 'cadastro', 'cadastros')} · ${contagens.ativos} com plano ativo` : 'Cadastros, planos e histórico'}
      </Cabecalho>
      <div className="b-barra-fixa cl-barra">
        <div className="cl-busca">
          <input type="search" value={busca} onChange={(e) => { setBusca(e.target.value); setMostrar(POR_PAGINA); }} placeholder="Buscar por nome, CPF, WhatsApp ou e-mail" aria-label="Buscar cliente" />
        </div>
        <div className="cl-chips" role="group" aria-label="Filtrar clientes">
          {FILTROS.filter(([id]) => !['vencendo', 'wellhub-pendente'].includes(id) || filtro === id || contagem(id) > 0).map(([id, t]) => (
            <button key={id} type="button" className={`b-chip${filtro === id ? ' b-chip--ativo' : ''}`} aria-pressed={filtro === id} onClick={() => { setFiltro(id); setMostrar(POR_PAGINA); }}>
              {t} {dados && <span>{contagem(id)}</span>}
            </button>
          ))}
        </div>
      </div>
      {local.state?.aviso && <Aviso tom="ok">{local.state.aviso}</Aviso>}
      <Erro>{erro}</Erro>
      {carregando && !dados && <Esqueleto linhas={7} altura={56} />}
      {dados && lista.length === 0 && (
        <Vazio titulo="Ninguém por aqui" acao={temFiltro
          ? <button type="button" className="botao botao--linha botao--p" onClick={() => { setBusca(''); setFiltro('todos'); setMostrar(POR_PAGINA); }}>Limpar busca e filtros</button>
          : <button type="button" className="botao botao--cheio botao--p" onClick={() => setNovo(true)}>Novo cliente</button>}>
          {temFiltro ? 'Nenhum cadastro bate com a busca ou o filtro.' : 'Cadastre a primeira pessoa para começar.'}
        </Vazio>
      )}
      {lista.length > 0 && (
        <>
          <p className="cl-contagem" role="status">{lista.length === (dados || []).length ? plural(lista.length, 'cliente', 'clientes') : `${lista.length} de ${(dados || []).length} clientes`}</p>
          <ul className="b-itens cl-lista">
            {lista.slice(0, mostrar).map((a) => (
              <li key={a.cpf}>
                <Link to={'/bancada/alunos/' + a.cpf} state={{ resumo: a }} className={`b-item cl-linha${a.ativo ? '' : ' cl-linha--apagada'}`}>
                  <Avatar nome={a.nome} />
                  <span className="cl-linha__quem">
                    <strong className="b-item__titulo">{a.nome}</strong>
                    <span className="cl-linha__zap">{telFmt(a.whatsapp) || 'sem WhatsApp'}</span>
                  </span>
                  <span className="cl-linha__plano">
                    {a.plano ? <Tag tom="ok">{a.plano}</Tag> : <span className="b-suave">Sem plano ativo</span>}
                    {a.planoFim && <small>até {dataCurta(a.planoFim)}</small>}
                  </span>
                  <span className="cl-linha__visita">
                    <small>{visitaDe(a).rotulo}</small>
                    <strong>{visitaDe(a).data ? dataCurta(visitaDe(a).data) : '—'}</strong>
                    <em>{plural(a.presencas + (a.servicos || 0), 'visita', 'visitas')}</em>
                  </span>
                  <span className="cl-linha__tags">
                    {!a.ativo && <Tag tom="apagado">desativado</Tag>}
                    {a.semCpf && <Tag>sem CPF</Tag>}
                    {!a.ficha && !a.semCpf && <Tag tom="aviso">sem ficha</Tag>}
                    {a.alerta && <Tag tom="alerta">saúde: atenção</Tag>}
                    {WELLHUB[a.wellhub] && <Tag tom={WELLHUB[a.wellhub][1]}>{WELLHUB[a.wellhub][0]}</Tag>}
                    {!a.temSenha && !a.semCpf && <Tag>sem senha</Tag>}
                  </span>
                  <span className="cl-linha__seta" aria-hidden="true">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      {lista.length > mostrar && (
        <p className="b-mais">
          <button type="button" className="botao botao--linha botao--p" onClick={() => setMostrar((n) => n + POR_PAGINA)}>
            Mostrar mais ({lista.length - mostrar} de {lista.length})
          </button>
        </p>
      )}
      {novo && <NovoAluno aoFechar={() => setNovo(false)} aoCriar={(cpf, ficha) => {
        if (ficha) {
          lembrarResultado(token, 'aluno', { cpf }, ficha);
          incluirNaListaDeClientes(token, { cpf, nome: ficha.nome, whatsapp: ficha.whatsapp || '', email: ficha.email || '', plano: ficha.plano || '', semCpf: !!ficha.semCpf,
            ativo: true, ficha: !!ficha.ficha, temSenha: false, presencas: 0, servicos: 0, criadoEm: ficha.criadoEm || hojeIso(), wellhub: ficha.wellhub || '' });
        }
        nav('/bancada/alunos/' + cpf);
      }} />}
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
  const resultado = useRef(null);
  // a conferência aparece abaixo das colunas: leva a tela até ela para ninguém importar sem ver
  useEffect(() => { if (previa) resultado.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [previa]);
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
  const etapa = feito ? 4 : previa ? 3 : tabela ? 2 : 1;
  const usados = CAMPOS_IMPORT.filter(([k]) => mapa[k] != null);
  const grupo = (ids) => CAMPOS_IMPORT.filter(([k]) => ids.includes(k));
  const campoMapa = ([k, t]) => (
    <label key={k} className={`b-campo cl-mapa__campo${mapa[k] != null ? ' cl-mapa__campo--ok' : ''}`}><span className="rotulo">{t}{mapa[k] != null && <span className="cl-mapa__ok" aria-label="reconhecido">✓</span>}</span>
      <select value={mapa[k] ?? ''} onChange={(e) => { setMapa({ ...mapa, [k]: e.target.value === '' ? undefined : Number(e.target.value) }); setPrevia(null); }}>
        <option value="">não tem</option>
        {tabela[0].map((h, i) => <option key={i} value={i}>{h || `coluna ${i + 1}`}</option>)}
      </select></label>
  );
  return (
    <Modal titulo="Importar clientes" rotulo="Planilha do Avec ou de outro sistema" aoFechar={aoFechar} largo>
      <div className="b-form cl-import">
        <ol className="cl-passos" aria-label="Etapas">
          {['Arquivo', 'Colunas', 'Conferir'].map((t, i) => (
            <li key={t} className={etapa > i + 1 ? 'cl-passos__feito' : etapa === i + 1 ? 'cl-passos__atual' : undefined} aria-current={etapa === i + 1 ? 'step' : undefined}>
              <span className="cl-passos__n">{etapa > i + 1 ? '✓' : i + 1}</span><span className="cl-passos__t">{t}</span>
            </li>
          ))}
        </ol>
        {feito ? (
          <>
            <Aviso tom="ok" titulo="Importação concluída">{plural(feito.novos, 'cadastro novo importado', 'cadastros novos importados')} · {plural(feito.atualizados, 'completado', 'completados')} · {feito.repetidos} já {feito.repetidos === 1 ? 'existia' : 'existiam'}.</Aviso>
            <button type="button" className="botao botao--cheio" onClick={aoImportar}>Ver clientes</button>
          </>
        ) : (
          <>
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
            {tabela ? (
              <div className="cl-carregada" role="status">
                <span className="cl-carregada__ok" aria-hidden="true">✓</span>
                <span className="cl-carregada__texto"><strong>Lista carregada</strong><small>{plural(tabela.length - 1, 'linha', 'linhas')} para importar</small></span>
                <button type="button" className="botao botao--fantasma botao--p" onClick={() => { setTabela(null); setPrevia(null); setMapa({}); setErro(''); }}>Trocar lista</button>
              </div>
            ) : (
              <Secao titulo="1. Traga a lista" ajuda={<>No Avec (ou no Excel), salve a lista de clientes como <strong>CSV</strong>, ou copie as colunas da planilha e cole abaixo. Quem já existe (mesmo CPF, WhatsApp ou e-mail) não é duplicado; só completamos o que faltar.</>}>
                <div className="cl-origem">
                  <div className="cl-origem__item">
                    <strong>Arquivo CSV</strong>
                    <span className="b-suave">Exportado do Avec ou do Excel</span>
                    <button type="button" className="botao botao--linha botao--p" onClick={() => arquivo.current?.click()}>Escolher arquivo</button>
                  </div>
                  <label className="b-campo cl-origem__item"><span className="rotulo">Ou cole aqui (com a linha de títulos)</span>
                    <textarea rows={4} onPaste={(e) => { e.preventDefault(); carregar(e.clipboardData.getData('text')); }} placeholder="Nome	Celular	E-mail	CPF	Nascimento" /></label>
                </div>
              </Secao>
            )}
            {tabela && (
              <>
                <Secao titulo="2. Confira as colunas" acoes={<Tag tom={mapa.nome != null ? 'ok' : 'aviso'}>{usados.length} de {CAMPOS_IMPORT.length} reconhecidas · {plural(tabela.length - 1, 'linha', 'linhas')}</Tag>}>
                  <div className="cl-mapa">
                    <p className="cl-mapa__grupo">Dados da pessoa</p>
                    <div className="imp-mapa">{grupo(['nome', 'whatsapp', 'email', 'cpf', 'nascimento', 'obs']).map(campoMapa)}</div>
                    <p className="cl-mapa__grupo">Endereço e origem</p>
                    <div className="imp-mapa">{grupo(['cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'comoConheceu']).map(campoMapa)}</div>
                  </div>
                  <div className="b-tabela-caixa cl-previa">
                    <table className="b-tabela"><thead><tr>{usados.map(([k, t]) => <th key={k}>{t}</th>)}</tr></thead>
                      <tbody>{linhas().slice(0, 4).map((l, i) => <tr key={i}>{usados.map(([k, t]) => <td key={k} data-rotulo={t}>{l[k]}</td>)}</tr>)}</tbody></table>
                  </div>
                </Secao>
                {previa && (
                  <div ref={resultado}><Secao titulo="3. Confira o resultado">
                    <div className="cl-resumo-imp">
                      <div><strong>{previa.novos}</strong><span>{previa.novos === 1 ? 'cadastro novo' : 'cadastros novos'}{previa.semCpf ? ` · ${previa.semCpf} sem CPF` : ''}</span></div>
                      <div><strong>{previa.atualizados}</strong><span>{previa.atualizados === 1 ? 'completado' : 'completados'}</span></div>
                      <div><strong>{previa.repetidos}</strong><span>já {previa.repetidos === 1 ? 'existe' : 'existem'}</span></div>
                      <div><strong>{previa.totalIgnorados}</strong><span>{previa.totalIgnorados === 1 ? 'linha ignorada' : 'linhas ignoradas'}</span></div>
                    </div>
                    {previa.ignorados.length > 0 && (
                      <Aviso tom="aviso" titulo="Linhas ignoradas">{previa.ignorados.slice(0, 8).map((x) => `linha ${x.linha + 1}${x.nome ? ' (' + x.nome + ')' : ''}: ${x.motivo}`).join('; ')}</Aviso>
                    )}
                  </Secao></div>
                )}
                <Erro>{erro}</Erro>
                <div className="cl-rodape">
                  {!previa ? (
                    <BotaoAcao className="botao botao--linha" disabled={mapa.nome == null} acao={() => enviar(true)}>Conferir antes de importar</BotaoAcao>
                  ) : (
                    <BotaoAcao className="botao botao--cheio" disabled={!previa.novos && !previa.atualizados} acao={() => enviar(false)}>Importar {plural(previa.novos, 'cliente', 'clientes')}</BotaoAcao>
                  )}
                </div>
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
  const [duplicado, setDuplicado] = useState(''); // CPF do cadastro que já existe
  const [enviando, setEnviando] = useState(false);
  const campo = (k, m) => ({ value: f[k], onChange: (e) => setF((x) => ({ ...x, [k]: m ? m(e.target.value) : e.target.value })) });
  async function salvar(e) {
    e.preventDefault();
    setErro('');
    if (soDigitos(f.cpf) && !cpfValido(f.cpf)) return setErro('CPF inválido.');
    setEnviando(true);
    try {
      const r = await chamar('novoAluno', { ...f, cpf: soDigitos(f.cpf), whatsapp: soDigitos(f.whatsapp) });
      aoCriar(r.cpf, r.ficha);
    } catch (err) {
      setErro(err.message);
      setDuplicado(err.codigo === 'DUPLICADO' && err.dados?.cpf ? err.dados.cpf : '');
    } finally {
      setEnviando(false);
    }
  }
  return (
    <Modal rotulo="Cadastro rápido de cliente" titulo="Novo cliente" aoFechar={aoFechar} largo>
      <form className="b-form cl-form" onSubmit={salvar} noValidate>
        <section className="cl-bloco">
          <h3 className="cl-bloco__titulo">Dados da pessoa</h3>
          <label className="b-campo"><span className="rotulo">Nome completo</span><input {...campo('nome')} autoComplete="off" /></label>
          <div className="b-linha2">
            <label className="b-campo"><span className="rotulo">CPF (opcional)</span><input inputMode="numeric" {...campo('cpf', mascaraCPF)} /></label>
            <label className="b-campo"><span className="rotulo">WhatsApp</span><input inputMode="numeric" {...campo('whatsapp', mascaraTelefone)} /></label>
          </div>
          <small className="cl-dica cl-dica--linha">Sem CPF não há acesso à área do aluno, mas ficam agenda, comandas e histórico.</small>
          <div className="b-linha2">
            <label className="b-campo"><span className="rotulo">E-mail</span><input type="email" {...campo('email')} /></label>
            <label className="b-campo"><span className="rotulo">Nascimento</span><input type="date" {...campo('nascimento')} /></label>
          </div>
        </section>
        <section className="cl-bloco">
          <h3 className="cl-bloco__titulo">Origem e endereço</h3>
          <CampoComoConheceu valor={f.comoConheceu} aoMudar={(v) => setF((x) => ({ ...x, comoConheceu: v }))} />
          <CamposEndereco valor={f.endereco} aoMudar={(v) => setF((x) => ({ ...x, endereco: v }))} />
        </section>
        {soDigitos(f.cpf).length === 11 && (
          <label className="b-check cl-convite">
            <input type="checkbox" checked={f.enviarConvite} onChange={(e) => setF((x) => ({ ...x, enviarConvite: e.target.checked }))} />
            Enviar convite por e-mail para criar a senha da área do aluno
          </label>
        )}
        <div className="cl-rodape">
          <Erro>{erro}</Erro>
          {duplicado && <button type="button" className="botao botao--linha" onClick={() => aoCriar(duplicado)}>Abrir o cadastro que já existe</button>}
          <button type="submit" className="botao botao--cheio" disabled={enviando}>{enviando ? 'Salvando…' : 'Cadastrar'}</button>
        </div>
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
  const [agendarServ, setAgendarServ] = useState(false);
  const { dados: catalogoServ } = useDados('catalogoServicos', {});
  const [aviso, setAviso] = useState('');

  // enquanto a ficha completa chega, mostra o que já veio da lista (nome, contato, plano)
  const previa = local.state?.resumo?.cpf === cpf ? local.state.resumo : null;
  if (carregando && !a && previa) return (
    <>
      <Link to="/bancada/alunos" className="link-acao b-voltar cl-voltar">← Clientes</Link>
      <header className="cl-ficha">
        <div className="cl-ficha__id">
          <Avatar nome={previa.nome} tamanho="g" />
          <div className="cl-ficha__quem">
            <h1 className="b-titulo cl-ficha__nome">{previa.nome}</h1>
            <div className="cl-ficha__tags">{previa.plano ? <Tag tom="ok">{previa.plano}</Tag> : <Tag>sem plano ativo</Tag>}</div>
          </div>
        </div>
        <ul className="cl-contatos">
          <li><span>CPF</span>{previa.semCpf ? 'sem CPF' : cpfFmt(previa.cpf)}</li>
          {previa.whatsapp && <li><span>WhatsApp</span>{telFmt(previa.whatsapp)}</li>}
          {previa.email && <li><span>E-mail</span>{previa.email}</li>}
        </ul>
      </header>
      <Esqueleto linhas={5} altura={44} />
    </>
  );
  if (carregando && !a) return <Esqueleto linhas={6} altura={44} />;
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
  const semWellhub = a.wellhub === 'nao_informado' || a.wellhub === 'desligado';
  const vigentes = a.creditos.filter((c) => c.vigente && c.ativo).length;
  return (
    <>
      <Link to="/bancada/alunos" className="link-acao b-voltar cl-voltar">← Clientes</Link>
      <header className="cl-ficha">
        <div className="cl-ficha__id">
          <Avatar nome={a.nome} tamanho="g" />
          <div className="cl-ficha__quem">
            <h1 className="b-titulo cl-ficha__nome">{a.nome}</h1>
            <div className="cl-ficha__tags">
              {!a.ativo && <Tag tom="apagado">desativado</Tag>}
              {a.plano ? <Tag tom="ok">{a.plano}</Tag> : <Tag>sem plano ativo</Tag>}
              {a.semCpf && <Tag title="Sem CPF a pessoa não acessa a área do aluno">sem CPF</Tag>}
              {!a.marketing && <Tag>não recebe campanhas</Tag>}
              {!a.ficha && !a.semCpf && <Tag tom="aviso">sem ficha de saúde</Tag>}
              {a.alerta && <Tag tom="alerta">saúde: atenção</Tag>}
              {wh && <Tag tom={wh[1]}>{wh[0]}{a.wellhubId ? ' · ID ' + a.wellhubId : ''}</Tag>}
              {!a.temSenha && !a.semCpf && <Tag title="Ainda não criou a senha da área do aluno">sem senha</Tag>}
            </div>
          </div>
        </div>
        <ul className="cl-contatos">
          <li><span>CPF</span>{a.semCpf ? 'sem CPF' : cpfFmt(a.cpf)}</li>
          <li><span>WhatsApp</span>{telFmt(a.whatsapp) || '—'}</li>
          <li><span>E-mail</span>{a.email || 'sem e-mail'}</li>
          <li><span>Cliente desde</span>{dataBR(a.criadoEm)}</li>
        </ul>
        <div className="cl-ficha__acoes">
          {a.whatsapp && <a className="botao botao--linha botao--p com-icone cl-acao--zap" href={linkWhats(a.whatsapp, `Olá, ${primeiro(a.nome)}! Aqui é da Casa Âmbar.`)} target="_blank" rel="noreferrer"><IconeWhatsapp tamanho={15} /> WhatsApp</a>}
          <MenuMais className="cl-acao--mais" itens={[{ texto: 'Aplicar vale-presente', acao: () => setVale(true) }]} />
          <button type="button" className="botao botao--linha botao--p cl-acao--vender" onClick={() => setVender(true)}>Vender plano</button>
          <button type="button" className="botao botao--linha botao--p cl-acao--agendar" disabled={!catalogoServ} onClick={() => setAgendarServ(true)}>Agendar serviço</button>
          <button type="button" className="botao botao--cheio botao--p cl-acao--comanda" onClick={() => setComanda(a.comandaAberta ? { id: a.comandaAberta } : { inicial: { cpf: a.cpf, nome: a.nome } })}>
            {a.comandaAberta ? 'Comanda aberta' : 'Abrir comanda'}
          </button>
        </div>
      </header>
      <Alertas lista={a.alertas} />
      <Erro>{erro}</Erro>
      {aviso && <Aviso tom="info">{aviso}</Aviso>}

      <div className="cl-abas">
        <Abas atual={aba} aoMudar={setAba} itens={[['resumo', 'Resumo'], ['historico', 'Histórico'], ['anamnese', 'Anamnese'], ['estetica', 'Estética'],
          ['planos', vigentes ? `Planos e pacotes · ${vigentes}` : 'Planos e pacotes'], ['aulas', a.reservas.length ? `Aulas · ${a.reservas.length}` : 'Aulas'],
          ['pagamentos', a.pagamentos?.length ? `Pagamentos · ${a.pagamentos.length}` : 'Pagamentos'], ['saude', 'Saúde']]} />
      </div>

      {aba === 'resumo' && (
        <>
          <div className="b-kpis cl-kpis">
            <Kpi rotulo="Última visita" valor={a.ultimaVisita ? dataCurta(a.ultimaVisita) : '—'} detalhe={a.ultimaVisita ? dataBR(a.ultimaVisita) : 'ainda não veio'} />
            <Kpi rotulo="Aulas" valor={a.presencas} detalhe={a.presencas === 1 ? 'presença' : 'presenças'} />
            <Kpi rotulo="Serviços" valor={a.servicos || 0} detalhe="atendimentos" />
            <Kpi rotulo="Já gastou" valor={real(a.totalGasto)} detalhe="desde o cadastro" />
          </div>
          <div className="b-duas cl-resumo">
            <section className="b-cartao cl-cartao">
              <Secao titulo="Dados" acoes={<button type="button" className="botao botao--fantasma botao--p" onClick={() => setEditar(true)}>Editar</button>}>
                <dl className="cl-dados">
                  <dt>Nascimento</dt><dd>{a.nascimento ? dataBR(a.nascimento) : '—'}</dd>
                  <dt>Como conheceu</dt><dd>{a.comoConheceu || <button type="button" className="botao botao--fantasma botao--p" onClick={() => setEditar(true)}>Perguntar e anotar</button>}</dd>
                  <dt>Endereço</dt><dd>{a.endereco?.endereco
                    ? <>{a.endereco.endereco}{a.endereco.numero ? `, ${a.endereco.numero}` : ''}{a.endereco.complemento ? ` · ${a.endereco.complemento}` : ''}<span className="b-suave b-bloco">{[a.endereco.bairro, a.endereco.cidade && `${a.endereco.cidade}${a.endereco.uf ? '/' + a.endereco.uf : ''}`, a.endereco.cep && a.endereco.cep.replace('-', '‑')].filter(Boolean).join(' · ')}</span></>
                    : '—'}</dd>
                </dl>
                {a.obs && <div className="b-obs cl-obs"><span className="rotulo">Observações internas</span><p>{a.obs}</p></div>}
              </Secao>
            </section>
            <div className="cl-coluna">
              <section className="b-cartao cl-cartao">
                <Secao titulo="Área do aluno">
                  {a.semCpf ? (
                    <Aviso tom="info">Precisa de CPF para acessar o site.</Aviso>
                  ) : (
                    <div className="cl-linha-acao">
                      <Tag tom={a.temSenha ? 'ok' : 'aviso'}>{a.temSenha ? 'com senha' : 'sem senha'}</Tag>
                      <button type="button" className="botao botao--linha botao--p" onClick={linkSenha}>{a.temSenha ? 'Enviar link de nova senha' : 'Enviar convite'}</button>
                    </div>
                  )}
                </Secao>
              </section>
              <section className="b-cartao cl-cartao">
                <Secao titulo="Wellhub" ajuda="Confira no Portal do Parceiro Wellhub se o plano é Gold+ ou superior antes de confirmar.">
                  {semWellhub ? (
                    <p className="b-suave cl-nada">Não informou Wellhub.</p>
                  ) : (
                    <>
                      <div className="cl-linha-acao">
                        <span>ID <strong>{a.wellhubId || '—'}</strong></span>
                        <Tag tom={wh ? wh[1] : 'neutro'}>{wh ? wh[0] : a.wellhub}</Tag>
                      </div>
                      <div className="b-botoes">
                        <BotaoAcao acao={() => salvar({ wellhub: 'confirmado' })} disabled={a.wellhub === 'confirmado'}>Confirmar Gold+</BotaoAcao>
                        <BotaoAcao acao={() => salvar({ wellhub: 'bloqueado' })} disabled={a.wellhub === 'bloqueado'} className="botao botao--linha botao--p botao--perigo">Recusar</BotaoAcao>
                      </div>
                    </>
                  )}
                </Secao>
              </section>
            </div>
          </div>
        </>
      )}

      {aba === 'historico' && <Historico itens={a.historico} />}
      {aba === 'estetica' && <section className="b-cartao cl-cartao"><ProntuarioConteudo alvo={{ cpf: a.cpf }} /></section>}
      {aba === 'anamnese' && <AnamneseConteudo alvo={{ cpf: a.cpf }} />}
      {aba === 'planos' && <Creditos a={a} aoMudar={recarregar} />}

      {aba === 'aulas' && <AulasDoCliente reservas={a.reservas} />}

      {aba === 'pagamentos' && <PagamentosDoCliente lista={a.pagamentos} />}

      {aba === 'saude' && (
        <>
          <section className="b-cartao cl-cartao">
            <Secao titulo="Ficha de saúde">
              {a.ficha ? <FichaConteudo f={a.ficha} /> : <Vazio titulo="Ficha não preenchida">Ela é pedida na primeira reserva ou plano pelo site (também dá para preencher em Ficha de saúde).</Vazio>}
            </Secao>
          </section>
          {a.contratos?.length > 0 && (
            <section className="b-cartao cl-cartao" aria-label="Contratos assinados">
              <Secao titulo="Contratos assinados" acoes={<Tag>{a.contratos.length}</Tag>}>
                <ul className="cl-contratos">
                  {a.contratos.map((c) => (
                    <li key={c.id}>
                      <span className="b-icone-chip b-icone-chip--caramelo" aria-hidden="true">✎</span>
                      <div className="cl-contratos__corpo">
                        <strong>{c.plano}</strong>
                        <span className="b-meta"><span>assinado em {dataBR(String(c.assinadoEm).slice(0, 10))} {String(c.assinadoEm).slice(11, 16)}</span><span>versão {c.versao}</span></span>
                        <span><Tag tom={c.enviado ? 'ok' : 'aviso'} title={c.enviado ? 'Cópia enviada por e-mail depois da confirmação do pagamento' : 'A cópia só sai quando o pagamento do plano for confirmado'}>{c.enviado ? 'cópia enviada por e-mail' : 'cópia a enviar: aguarda o pagamento'}</Tag></span>
                      </div>
                      <div className="cl-contratos__links">
                        {c.pdf && <a className="botao botao--linha botao--p" href={c.pdf} target="_blank" rel="noreferrer">Abrir PDF</a>}
                        {c.assinatura && <a className="botao botao--fantasma botao--p" href={c.assinatura} target="_blank" rel="noreferrer">Ver assinatura</a>}
                      </div>
                    </li>
                  ))}
                </ul>
              </Secao>
            </section>
          )}
        </>
      )}

      {aba === 'resumo' && pode(membro, 'admin') && (
        <section className="b-zona-exclusao" aria-label="Excluir cliente">
          <div>
            <strong>Excluir cliente</strong>
            <span>Apaga dados pessoais, ficha de saúde e fotos (LGPD). Não dá para desfazer.</span>
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
      {agendarServ && catalogoServ && (
        <NovoAtendimento inicial={{ data: hojeIso(), cliente: { cpf: a.cpf, nome: a.nome, whatsapp: a.whatsapp } }} catalogo={catalogoServ}
          aoFechar={() => setAgendarServ(false)} aoSalvar={() => { setAgendarServ(false); recarregar(); setAviso('Serviço agendado. Ele aparece na Agenda do dia.'); }} />
      )}
    </>
  );
}

// ---------- aulas da pessoa: próximas e anteriores ----------
function AulasDoCliente({ reservas }) {
  if (!reservas.length) return <Vazio titulo="Nenhuma aula ainda">As reservas e presenças aparecem aqui.</Vazio>;
  const hoje = hojeIso();
  const anoAtual = hoje.slice(0, 4);
  const proximas = reservas.filter((r) => r.data >= hoje && r.status === 'reservado');
  const resto = reservas.filter((r) => !proximas.includes(r));
  const linha = (r) => {
    const st = STATUS_RESERVA[r.status] || [r.status, 'neutro'];
    const passou = r.data < hoje;
    const dia = Number(r.data.slice(8, 10));
    return (
      <li key={r.id} className="b-item cl-aula">
        <span className="cl-data" title={dataBR(r.data)}><strong>{dia}</strong><small>{MESES[Number(r.data.slice(5, 7)) - 1]}</small></span>
        <span className="b-item__corpo">
          <span className="b-item__titulo">{r.modalidade} · {hora(r.hora)}</span>
          <span className="b-meta">
            <span>com {r.professor}</span>
            {r.tapete ? <span>tapete {r.tapete}</span> : null}
            {r.forma ? <span>{r.forma}</span> : null}
            {r.data.slice(0, 4) !== anoAtual ? <span>{r.data.slice(0, 4)}</span> : null}
          </span>
        </span>
        <span className="b-item__lado"><Tag tom={st[1]}>{r.status === 'reservado' && passou ? 'sem registro' : st[0]}</Tag></span>
      </li>
    );
  };
  return (
    <div className="cl-pilha">
      {proximas.length > 0 && <Secao titulo={`Próximas · ${proximas.length}`}><ul className="b-itens">{proximas.map(linha)}</ul></Secao>}
      {resto.length > 0 && <Secao titulo={proximas.length ? `Anteriores · ${resto.length}` : `Aulas · ${resto.length}`}><ul className="b-itens">{resto.map(linha)}</ul></Secao>}
    </div>
  );
}

// ---------- pagamentos da pessoa: totais + lista ----------
function PagamentosDoCliente({ lista }) {
  const pagos = (lista || []).filter((p) => p.status === 'pago');
  const total = pagos.reduce((t, p) => t + Number(p.valor || 0), 0);
  const pendentes = (lista || []).filter((p) => p.status === 'pendente').length;
  return (
    <div className="cl-pilha">
      {lista?.length > 0 && (
        <div className="b-kpis cl-kpis">
          <Kpi rotulo="Total pago" valor={real(total)} detalhe={plural(pagos.length, 'pagamento', 'pagamentos')} />
          <Kpi rotulo="Pendentes" valor={pendentes} tom={pendentes ? 'aviso' : undefined} detalhe={pendentes ? 'aguardando pagamento' : 'nada em aberto'} />
        </div>
      )}
      <ListaPagamentos lista={lista} semCliente />
    </div>
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
      <div className="b-form ex-cliente cl-form">
        <Aviso tom="alerta" titulo="Isto não pode ser desfeito">Use quando a pessoa pedir a exclusão dos dados (LGPD) ou para apagar um cadastro feito por engano.</Aviso>
        <ul className="cl-regras">
          <li><Tag>sem histórico</Tag><span>Nenhuma aula, serviço ou compra: o cadastro é apagado por inteiro.</span></li>
          <li><Tag tom="aviso">com histórico</Tag><span>Nome, CPF, WhatsApp, e-mail e endereço são apagados em todo o sistema. As vendas continuam no financeiro como “Cliente excluído”, sem dados pessoais, para o caixa e os relatórios não mudarem.</span></li>
          <li><Tag tom="alerta">sempre</Tag><span>Ficha de saúde, ficha de estética, evolução, anamneses e fotos são apagadas, e o acesso à área do aluno deixa de funcionar.</span></li>
        </ul>
        {a.comandaAberta && <Aviso tom="aviso">Há uma comanda aberta. Feche ou cancele a comanda antes de excluir.</Aviso>}
        <label className="b-campo">
          <span className="rotulo">Para confirmar, digite o primeiro nome: <strong>{nome}</strong></span>
          <input value={conf} onChange={(e) => setConf(e.target.value)} autoComplete="off" spellCheck={false} aria-invalid={!!conf && !confere} />
        </label>
        <Erro>{erro}</Erro>
        <div className="cl-rodape cl-rodape--linha">
          <button type="button" className="botao botao--linha" onClick={aoFechar}>Voltar</button>
          <BotaoAcao className="botao botao--perigo-cheio" disabled={!confere || !!a.comandaAberta} acao={async () => {
            setErro('');
            try { aoExcluir(await chamar('excluirCliente', { cpf: a.cpf, confirmacao: conf.trim() })); } catch (e) { setErro(e.message); }
          }}>Excluir definitivamente</BotaoAcao>
        </div>
      </div>
    </Modal>
  );
}

const TIPO_HIST = { aula: 'Aula', servico: 'Serviço', compra: 'Compra', produto: 'Produto', vale: 'Vale-presente', evolucao: 'Evolução', anamnese: 'Anamnese' };
const STATUS_HIST = { 'check-in': 'presente', reservado: 'reservada', atendido: 'atendido', falta: 'faltou', cancelado: 'cancelado', agendado: 'agendado', confirmado: 'confirmado', ativo: 'ativo', resgatado: 'usado', usado: 'usado' };
function Historico({ itens }) {
  const [tipo, setTipo] = useState('todos');
  if (!itens?.length) return <Vazio titulo="Nada por aqui ainda">Aulas, atendimentos e compras desta pessoa aparecem em ordem de data.</Vazio>;
  const tipos = Object.keys(TIPO_HIST).filter((t) => itens.some((h) => h.tipo === t));
  const lista = tipo === 'todos' ? itens : itens.filter((h) => h.tipo === tipo);
  const linhas = [];
  lista.forEach((h, i) => {
    const ano = h.data.slice(0, 4);
    if (!i || lista[i - 1].data.slice(0, 4) !== ano) linhas.push(<li key={'a' + ano + i} className="cl-tl__ano">{ano}</li>);
    linhas.push(
      <li key={i} className={`cl-tl__item cl-tl__item--${h.tipo}`}>
        <span className="cl-tl__data" title={dataBR(h.data)}><strong>{Number(h.data.slice(8, 10))}</strong><small>{MESES[Number(h.data.slice(5, 7)) - 1]}</small></span>
        <span className="cl-tl__ponto" aria-hidden="true" />
        <span className="cl-tl__corpo">
          <span className="cl-tl__topo">
            <span className="cl-tl__tipo">{TIPO_HIST[h.tipo] || h.tipo}{h.hora ? ` · ${hora(h.hora)}` : ''}</span>
            {h.status && h.status !== 'pago' ? <Tag tom={h.status === 'falta' ? 'alerta' : h.status === 'cancelado' ? 'apagado' : h.status === 'atendido' || h.status === 'check-in' ? 'ok' : 'neutro'}>{STATUS_HIST[h.status] || h.status}</Tag> : null}
          </span>
          <strong className="cl-tl__titulo">{h.titulo}</strong>
          {(h.detalhe || h.valor) ? <span className="b-meta">{h.detalhe ? <span>{h.detalhe}</span> : null}{h.valor ? <span className="cl-tl__valor">{real(h.valor)}</span> : null}</span> : null}
        </span>
      </li>
    );
  });
  return (
    <div className="cl-pilha">
      {tipos.length > 1 && (
        <div className="cl-chips cl-chips--solto" role="group" aria-label="Filtrar histórico">
          <button type="button" className={`b-chip${tipo === 'todos' ? ' b-chip--ativo' : ''}`} aria-pressed={tipo === 'todos'} onClick={() => setTipo('todos')}>Tudo <span>{itens.length}</span></button>
          {tipos.map((t) => (
            <button key={t} type="button" className={`b-chip${tipo === t ? ' b-chip--ativo' : ''}`} aria-pressed={tipo === t} onClick={() => setTipo(t)}>{TIPO_HIST[t]} <span>{itens.filter((h) => h.tipo === t).length}</span></button>
          ))}
        </div>
      )}
      <ol className="cl-tl">{linhas}</ol>
    </div>
  );
}

function Creditos({ a, aoMudar }) {
  const { chamar } = useBancada();
  const [prorrogar, setProrrogar] = useState(null);
  if (!a.creditos.length) return <Vazio titulo="Nenhum plano ainda">Use “Vender plano” para registrar uma compra feita no balcão.</Vazio>;
  const emUso = a.creditos.filter((c) => c.ativo && c.vigente);
  const outros = a.creditos.filter((c) => !(c.ativo && c.vigente));
  const cartao = (c) => {
    const pct = c.limite > 0 ? Math.min(100, Math.round((c.usadas / c.limite) * 100)) : 0;
    const acabou = c.limite > 0 && c.usadas >= c.limite;
    return (
      <li key={c.id} className={`cl-plano${c.vigente && c.ativo ? ' cl-plano--vigente' : ''}${c.ativo ? '' : ' cl-plano--apagado'}`}>
        <header className="cl-plano__topo">
          <strong className="cl-plano__nome">{c.descricao}</strong>
          <Tag tom={!c.ativo ? 'apagado' : c.vigente ? 'ok' : 'neutro'}>{!c.ativo ? 'desativado' : c.vigente ? 'vigente' : c.fim < hojeIso() ? 'vencido' : 'futuro'}</Tag>
        </header>
        <div className="cl-plano__uso">
          <div className={`cl-barra-uso${acabou ? ' cl-barra-uso--cheia' : ''}`} role="img" aria-label={`${c.usadas} de ${c.limite} usadas`}><span style={{ width: `${pct}%` }} /></div>
          <span className="cl-plano__num"><strong>{c.usadas}/{c.limite}</strong> {c.porSemana ? 'nesta semana' : `usada${c.limite > 1 ? 's' : ''}`}</span>
        </div>
        <span className="b-meta"><span>{dataBR(c.inicio)} a {dataBR(c.fim)}</span><span>{c.origem}</span></span>
        <div className="cl-plano__acoes">
          <button type="button" className="botao botao--linha botao--p" onClick={() => setProrrogar(c)}>Mudar validade</button>
          <BotaoAcao className="botao botao--fantasma botao--p" acao={async () => { await chamar('ajustarCredito', { creditoId: c.id, ativo: !c.ativo }); aoMudar(); }}
            confirmar={c.ativo ? 'Desativar este crédito? As aulas dele deixam de poder ser reservadas.' : undefined}>
            {c.ativo ? 'Desativar' : 'Reativar'}
          </BotaoAcao>
        </div>
      </li>
    );
  };
  return (
    <>
      <div className="cl-pilha">
        {emUso.length > 0 && <Secao titulo={`Em uso · ${emUso.length}`}><ul className="cl-planos">{emUso.map(cartao)}</ul></Secao>}
        {outros.length > 0 && <Secao titulo={emUso.length ? `Anteriores e desativados · ${outros.length}` : `Planos · ${outros.length}`}><ul className="cl-planos">{outros.map(cartao)}</ul></Secao>}
      </div>
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
    <div className="b-form cl-form">
      <label className="b-campo"><span className="rotulo">Válido até</span><input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
        <small className="cl-dica">Útil para atestado médico, viagem ou feriado prolongado.</small></label>
      <Erro>{erro}</Erro>
      <div className="cl-rodape">
        <BotaoAcao className="botao botao--cheio" acao={async () => { try { await aoSalvar(fim); } catch (e) { setErro(e.message); } }}>Salvar</BotaoAcao>
      </div>
    </div>
  );
}

function EditarAluno({ a, aoFechar, aoSalvar }) {
  const [f, setF] = useState({ nome: a.nome, whatsapp: telFmt(a.whatsapp), email: a.email, obs: a.obs, alertaFixo: a.alertaFixo || '', ativo: a.ativo, wellhubId: a.wellhubId, nascimento: a.nascimento || '',
    marketing: a.marketing !== false, cpf: '', comoConheceu: a.comoConheceu || '', endereco: { ...ENDERECO_VAZIO, ...(a.endereco || {}) } });
  const [erro, setErro] = useState('');
  const campo = (k, m) => ({ value: f[k], onChange: (e) => setF((x) => ({ ...x, [k]: m ? m(e.target.value) : e.target.value })) });
  return (
    <Modal rotulo={a.nome} titulo="Editar dados" aoFechar={aoFechar} largo>
      <div className="b-form cl-form">
        <section className="cl-bloco">
          <h3 className="cl-bloco__titulo">Dados da pessoa</h3>
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
            <label className="b-campo"><span className="rotulo">CPF</span>
              <input inputMode="numeric" {...campo('cpf', mascaraCPF)} />
              <small className="cl-dica">Todo o histórico passa para o CPF; se já houver cadastro no site com ele, juntamos os dois.</small></label>
          )}
        </section>
        <section className="cl-bloco">
          <h3 className="cl-bloco__titulo">Origem e endereço</h3>
          <CampoComoConheceu valor={f.comoConheceu} aoMudar={(v) => setF((x) => ({ ...x, comoConheceu: v }))} />
          <CamposEndereco valor={f.endereco} aoMudar={(v) => setF((x) => ({ ...x, endereco: v }))} />
        </section>
        <section className="cl-bloco">
          <h3 className="cl-bloco__titulo">Avisos e observações</h3>
          <label className="b-campo"><span className="rotulo">Alerta fixo</span>
            <input {...campo('alertaFixo')} maxLength={200} placeholder="Ex.: alergia a látex · pressão baixa · não usar óleo de amêndoas" />
            <small className="cl-dica">Aparece na agenda, nas aulas e na comanda.</small></label>
          <label className="b-campo"><span className="rotulo">Observações internas</span><textarea rows={3} {...campo('obs')} placeholder="Só a equipe vê. Ex.: prefere tapete perto da janela" /></label>
          <label className="b-check"><input type="checkbox" checked={f.marketing} onChange={(e) => setF((x) => ({ ...x, marketing: e.target.checked }))} /> Recebe campanhas por e-mail</label>
          <label className="b-check"><input type="checkbox" checked={f.ativo} onChange={(e) => setF((x) => ({ ...x, ativo: e.target.checked }))} /> Cadastro ativo (pode entrar e reservar)</label>
        </section>
        <div className="cl-rodape">
          <Erro>{erro}</Erro>
          <BotaoAcao className="botao botao--cheio" acao={async () => {
            setErro('');
            if (f.cpf && !cpfValido(f.cpf)) { setErro('CPF inválido.'); return; }
            const dados = { ...f, whatsapp: soDigitos(f.whatsapp), cpf: soDigitos(f.cpf) || undefined };
            try { await aoSalvar(dados); } catch (e) {
              // CPF de um cadastro que já existe: junta só se a recepção confirmar que é a mesma pessoa
              if (e.codigo === 'CPF_DE_OUTRA' && window.confirm(`${e.message}\n\nOK = é a mesma pessoa: juntar os cadastros (o histórico passa para o cadastro com CPF).\nCancelar = não juntar.`)) {
                try { await aoSalvar({ ...dados, juntarCpf: true }); } catch (e2) { setErro(e2.message); }
              } else setErro(e.message);
            }
          }}>Salvar</BotaoAcao>
        </div>
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
  const [extras, setExtras] = useState([]); // outros itens da mesma venda: [{ chave, planoId, valor }]
  const [metodo, setMetodo] = useState('Pix');
  const [bandeira, setBandeira] = useState('');
  const [parcelas, setParcelas] = useState(1);
  const [codigo, setCodigo] = useState('');
  const [simulado, setSimulado] = useState(null);
  const [valor, setValor] = useState('');
  const [inicio, setInicio] = useState(hojeIso());
  const [dataVenda, setDataVenda] = useState(hojeIso()); // dia passado: entra no caixa daquele dia
  const [obs, setObs] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [formas, setFormas] = useState(null); // pago em mais de uma forma: linhas { metodo, valor, parcelas, bandeira } (null = uma forma só)
  const plano = itens?.achar(planoId);
  const varios = extras.length > 0;

  useEffect(() => { setSimulado(null); setValor(''); }, [planoId]);

  function mudarExtra(chave, mud) { setExtras((l) => l.map((x) => (x.chave === chave ? { ...x, ...mud } : x))); }

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
      const comum = { cpf: aluno.cpf, metodo: formas ? formas[0].metodo : metodo, bandeira, parcelas, inicio, dataVenda, obs, formas: formas || undefined };
      if (varios) {
        await chamar('vender', { ...comum, itens: [{ planoId, valor: valor === '' ? undefined : numBR(valor) }, ...extras.map((x) => ({ planoId: x.planoId, valor: x.valor === '' ? undefined : numBR(x.valor) }))] });
      } else {
        await chamar('vender', { ...comum, planoId, codigo: simulado ? codigo : '', valor: valor === '' ? undefined : numBR(valor) });
      }
      aoVender();
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  // total da venda: cada item pelo valor combinado ou pelo preço (o servidor aplica as promoções do dia item a item)
  const doItem = (item, v) => (metodo === 'Cortesia' ? 0 : v !== '' ? numBR(v) : item?.preco || 0);
  const linhas = [[plano, valor], ...extras.map((x) => [itens?.achar(x.planoId), x.valor])];
  const final = linhas.reduce((t, [it, v]) => t + (it ? doItem(it, v) : 0), 0);
  const cheio = linhas.reduce((t, [it]) => t + (it?.preco || 0), 0);
  const completo = !!planoId && extras.every((x) => x.planoId);
  const podeRegistrar = !!aluno && completo && !enviando && !(formas ? !resumoLinhas(formas).ok : faltaBandeira(metodo, bandeira));
  const adicionarItem = () => {
    setExtras((l) => [...l, { chave: Math.random().toString(36).slice(2), planoId: '', valor: '' }]); setCodigo(''); setSimulado(null);
    if (formas) { setMetodo(formas[0].metodo); setBandeira(formas[0].bandeira); setFormas(null); }
  };
  return (
    <Modal rotulo="Plano, aula ou serviço no balcão" titulo="Nova venda" aoFechar={aoFechar} largo>
      <div className="b-form cl-venda">
        <Passo n={1} titulo="Cliente">
          {!aluno ? (
            <BuscaAluno aoEscolher={setAluno} autoFocus />
          ) : (
            <div className="b-escolhido cl-escolhido">
              <Avatar nome={aluno.nome} tamanho="p" />
              <div><strong>{aluno.nome}</strong><span>{aluno.plano || 'sem plano ativo'}</span></div>
              {!inicial && <button type="button" className="botao botao--fantasma botao--p" onClick={() => setAluno(null)}>Trocar</button>}
            </div>
          )}
        </Passo>

        <Passo n={2} titulo={varios ? 'Itens da venda' : 'O que foi vendido'} ajuda="O plano entra na hora no cadastro. Pagamentos feitos pelo site entram sozinhos: não precisa registrar aqui.">
          <div className={varios ? 'vd-extra vd-extra--um' : undefined}>
            <label className="b-campo">
              <span className="rotulo">{varios ? 'Item 1' : 'Plano, aula ou serviço'}</span>
              <select value={planoId} onChange={(e) => setPlanoId(e.target.value)}>
                <option value="">{itens ? 'Escolha…' : 'Carregando…'}</option>
                <OpcoesItens itens={itens} comGrupo />
              </select>
            </label>
            {varios && metodo !== 'Cortesia' && (
              <label className="b-campo vd-extra__valor">
                <span className="rotulo">Valor cobrado (R$)</span>
                <input inputMode="decimal" value={valor} placeholder={plano ? String(plano.preco).replace('.', ',') : ''} onChange={(e) => setValor(e.target.value.replace(/[^\d,.]/g, ''))} />
              </label>
            )}
          </div>
          {extras.map((x, i) => (
            <div key={x.chave} className="vd-extra">
              <label className="b-campo">
                <span className="rotulo">Item {i + 2}</span>
                <select value={x.planoId} onChange={(e) => mudarExtra(x.chave, { planoId: e.target.value })}>
                  <option value="">Escolha…</option>
                  <OpcoesItens itens={itens} comGrupo />
                </select>
              </label>
              {metodo !== 'Cortesia' && (
                <label className="b-campo vd-extra__valor">
                  <span className="rotulo">Valor cobrado (R$)</span>
                  <input inputMode="decimal" value={x.valor} placeholder={itens?.achar(x.planoId) ? String(itens.achar(x.planoId).preco).replace('.', ',') : ''} onChange={(e) => mudarExtra(x.chave, { valor: e.target.value.replace(/[^\d,.]/g, '') })} />
                </label>
              )}
              <button type="button" className="botao botao--fantasma botao--p vd-extra__tirar" onClick={() => setExtras((l) => l.filter((y) => y.chave !== x.chave))}>Tirar</button>
            </div>
          ))}
          {extras.length < 11 && (
            <button type="button" className="botao botao--linha botao--p vd-mais" disabled={!itens || !planoId} onClick={adicionarItem}>+ Adicionar outro item</button>
          )}
          {plano && metodo !== 'Cortesia' && !varios && (
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
              {simulado && <Aviso tom="ok">{simulado.mensagem}</Aviso>}
            </>
          )}
          {varios && metodo !== 'Cortesia' && <Aviso tom="info">Cupom e vale-presente só valem em venda de um item; com vários itens, use a comanda. As promoções do dia valem em cada item.</Aviso>}
        </Passo>

        <Passo n={3} titulo="Pagamento">
          {formas ? (
            <div className="b-campo">
              <span className="rotulo">Dividido em {formas.length} formas</span>
              <LinhasDePagamento linhas={formas} aoMudar={(l) => setFormas(l)} formas={METODOS} minimo={2} />
              <button type="button" className="botao botao--fantasma botao--p cl-solto" onClick={() => { setMetodo(formas[0].metodo); setBandeira(formas[0].bandeira); setFormas(null); }}>Voltar para uma forma só</button>
            </div>
          ) : (
            <>
              <div className="b-linha2">
                <label className="b-campo">
                  <span className="rotulo">Recebido por</span>
                  <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>{METODOS.map((m) => <option key={m}>{m}</option>)}</select>
                </label>
                {/Cartão de crédito|Link/.test(metodo) && (
                  <label className="b-campo">
                    <span className="rotulo">Parcelas</span>
                    <select value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}x</option>)}</select>
                  </label>
                )}
                <CampoBandeira metodo={metodo} valor={bandeira} aoMudar={setBandeira} />
              </div>
              {!varios && metodo !== 'Cortesia' && (
                <button type="button" className="botao botao--fantasma botao--p cl-solto" title="Ex.: metade no débito, metade no dinheiro"
                  onClick={() => setFormas([{ ...LINHA_PAGAMENTO, metodo, bandeira, parcelas }, { ...LINHA_PAGAMENTO, metodo: metodo === 'Pix' ? 'Dinheiro' : 'Pix' }])}>
                  Dividir em mais de uma forma
                </button>
              )}
            </>
          )}
        </Passo>

        <Passo n={4} titulo="Datas e observação">
          <div className="b-linha2">
            <label className="b-campo">
              <span className="rotulo">Começa em</span>
              <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </label>
            <label className="b-campo">
              <span className="rotulo">Data da venda</span>
              <input type="date" value={dataVenda} min={somarDias(hojeIso(), -120)} max={hojeIso()}
                onChange={(e) => { const v = e.target.value; if (!v) return; setDataVenda(v); if (inicio === dataVenda) setInicio(v); }} />
            </label>
          </div>
          <label className="b-campo"><span className="rotulo">Observação</span><input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" /></label>
          {dataVenda < hojeIso() && <Aviso tom="aviso">Venda de {dataBR(dataVenda)}: entra no caixa daquele dia, não no de hoje.</Aviso>}
        </Passo>

        <div className="cl-rodape cl-rodape--total">
          <div className="cl-total" aria-live="polite">
            <span>{varios ? `Total · ${extras.length + 1} itens` : 'Total'}</span>
            <strong>{!plano ? '—' : final === 0 ? 'Cortesia' : real(final)}</strong>
            {plano && final < cheio && <s>{real(cheio)}</s>}
          </div>
          <Erro>{erro}</Erro>
          <button type="button" className="botao botao--cheio" disabled={!podeRegistrar} onClick={confirmar}>
            {enviando ? 'Registrando…' : varios ? `Registrar venda dos ${extras.length + 1} itens` : 'Registrar venda'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// passo numerado de um formulário longo (venda): título + conteúdo
function Passo({ n, titulo, ajuda, children }) {
  return (
    <section className="cl-passo">
      <header className="cl-passo__topo">
        <span className="cl-passo__n" aria-hidden="true">{n}</span>
        <h3 className="cl-passo__titulo">{titulo}</h3>
        {ajuda && <Ajuda titulo={titulo}>{ajuda}</Ajuda>}
      </header>
      <div className="cl-passo__corpo">{children}</div>
    </section>
  );
}

function AplicarVale({ aluno, aoFechar, aoAplicar }) {
  const { chamar } = useBancada();
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  return (
    <Modal rotulo={aluno.nome} titulo="Aplicar vale-presente" aoFechar={aoFechar}>
      <div className="b-form cl-form">
        <label className="b-campo"><span className="rotulo">Código do vale</span><input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="AMBAR-XXXX-XXXX" />
          <small className="cl-dica">Vale de aula ou plano entra como crédito na hora. Vale em R$ fica ligado a este cadastro para a próxima compra.</small></label>
        <Erro>{erro}</Erro>
        {ok && <Aviso tom="ok">{ok}</Aviso>}
        <div className="cl-rodape">
          <BotaoAcao className="botao botao--cheio" disabled={!codigo.trim()} acao={async () => {
            setErro(''); setOk('');
            try {
              const r = await chamar('aplicarVale', { cpf: aluno.cpf, codigo });
              setOk(r.mensagem.replace('Já pode reservar.', '').replace('seu plano', 'o plano de ' + primeiro(aluno.nome)));
              setTimeout(aoAplicar, 1400);
            } catch (e) { setErro(e.message); }
          }}>Aplicar</BotaoAcao>
        </div>
      </div>
    </Modal>
  );
}

// aoAbrir: clicar na linha abre a venda (tela Vendas: corrigir, excluir, estorno)
// semCliente: dentro da ficha da pessoa o nome é o mesmo em toda linha, então não repete
export function ListaPagamentos({ lista, acoes, aoAbrir, semCliente }) {
  if (!lista?.length) return <Vazio titulo="Nenhum pagamento">Os pagamentos do site e do balcão aparecem aqui.</Vazio>;
  const tom = { pago: 'ok', pendente: 'aviso', estornado: 'apagado', expirado: 'apagado', descartado: 'apagado', excluido: 'apagado' };
  const nomeSituacao = { excluido: 'excluída' };
  return (
    <ul className="b-itens cl-pagamentos">
      {lista.map((p) => {
        const iso = String(p.pagoEm || p.criadoEm || '').slice(0, 10);
        const [ano, mes, dia] = iso.split('-');
        const forma = `${p.metodo || '—'}${p.bandeira ? ` ${p.bandeira}` : ''}${Number(p.parcelas) > 1 ? ` ${p.parcelas}x` : ''}`;
        return (
          <li key={p.orderNsu}>
            <div className={`b-item cl-pag${aoAbrir ? ' b-linha-abre' : ''}${p.status === 'excluido' ? ' b-linha-excluida' : ''}`}
              onClick={aoAbrir ? (e) => { if (!e.target.closest('button, a')) aoAbrir(p); } : undefined}>
              <span className="cl-data" title={dataBR(iso)}><strong>{dia ? Number(dia) : '—'}</strong><small>{mes ? `${MESES[Number(mes) - 1]} ${String(ano).slice(2)}` : ''}</small></span>
              <span className="b-item__corpo">
                <span className="b-item__titulo">{p.descricao}</span>
                <span className="b-meta">
                  {!semCliente && p.nome ? <span>{p.nome}</span> : null}
                  <span>{forma}</span>
                  {p.origem ? <span>{p.origem}</span> : null}
                  {(p.cupom || p.vale) ? <span>{p.cupom ? 'cupom ' + p.cupom : 'vale ' + p.vale} · −{real(p.desconto)}</span> : null}
                </span>
                {p.observacao && <span className={`cl-pag__obs ${/^DEVOLVER/.test(p.observacao) ? 'b-alerta-txt' : 'b-suave'}`}>{p.observacao}</span>}
              </span>
              <span className="cl-pag__valor">
                <strong className={p.status === 'excluido' ? 'b-riscado' : undefined}>{real(p.valor)}</strong>
                {p.taxa > 0 && <small className="vd-liquido" title={`Taxa estimada da maquininha: ${real(p.taxa)} (${String(p.taxaPct).replace('.', ',')}%)`}>líquido {real(p.liquido)}</small>}
              </span>
              <span className="b-item__lado cl-pag__lado">
                <Tag tom={tom[p.status] || 'neutro'}>{nomeSituacao[p.status] || p.status}</Tag>
                {acoes && <span className="cl-pag__acoes">{acoes(p)}</span>}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
