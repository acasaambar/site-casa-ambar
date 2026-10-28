import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBancada, pode } from './sessao.jsx';
import './css/shell.css';
import { useDados, useBuscaClientes, useCamada, prenderTab, hora, hojeIso, segundaDe, cpfFmt, telFmt, dataBR, real } from './ui.jsx';
import { Icone } from './icones.jsx';

// ============================================================
//  BUSCA RÁPIDA (Ctrl+K ou "/"): clientes, comandas abertas, agenda de hoje e atalhos
// ============================================================
// id válido para aria-activedescendant (os atalhos têm espaço e acento no nome)
const idDe = (it) => (it ? 'bg-' + String(it.k).replace(/[^A-Za-z0-9_-]/g, '_') : '');
const semAcento = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// atalhos para as tarefas do dia a dia (papel: quem vê)
// ícone de cada atalho (pelo destino); o que não está aqui usa a seta
const ICONE_DO_ATALHO = {
  '/bancada/agenda': 'agenda', '/bancada/comandas': 'comandas', '/bancada/alunos': 'alunos', '/bancada/vendas': 'vendas', '/bancada/marketing': 'marketing',
  '/bancada/estoque': 'estoque', '/bancada/grade': 'grade', '/bancada/financeiro': 'financeiro', '/bancada/relatorios': 'relatorios', '/bancada/equipe': 'equipe',
  '/bancada/ajustes': 'ajustes', '/bancada/clientes': 'alunos', '/bancada/velocidade': 'velocidade', '/bancada/ganhos': 'ganhos',
};
const ATALHOS = [
  ['Agendar serviço', '/bancada/agenda', { novoServico: true, vista: 'dia' }, ['admin', 'recepcao']],
  ['Abrir comanda', '/bancada/comandas', { nova: true }, ['admin', 'recepcao']],
  ['Caixa do dia', '/bancada/comandas', { vista: 'caixa' }, ['admin', 'recepcao']],
  ['Cadastrar cliente', '/bancada/alunos', { novo: true }, ['admin', 'recepcao']],
  ['Vender vale-presente', '/bancada/comandas', { nova: true, vale: true }, ['admin', 'recepcao']],
  ['Lista de espera de serviços', '/bancada/agenda', { espera: true }, ['admin', 'recepcao']],
  ['Aulas e presença', '/bancada/agenda', { vista: 'aulas' }, ['admin', 'recepcao', 'professora']],
  ['Agenda da semana', '/bancada/agenda', { vista: 'semana' }, ['admin', 'recepcao', 'professora']],
  ['Lembretes de amanhã', '/bancada/marketing', { aba: 'lembretes' }, ['admin']],
  ['Retornos para sugerir', '/bancada/marketing', { aba: 'retornos' }, ['admin']],
  ['Vendas e estornos', '/bancada/vendas', null, ['admin']],
  ['Estoque', '/bancada/estoque', null, ['admin']],
  ['Catálogo (serviços, grade e planos)', '/bancada/grade', null, ['admin']],
  ['Financeiro', '/bancada/financeiro', null, ['admin']],
  ['Relatórios', '/bancada/relatorios', null, ['admin']],
  ['Equipe e acessos', '/bancada/equipe', null, ['admin']],
  ['Ajustes e taxas da maquininha', '/bancada/ajustes', null, ['admin']],
  ['Calculadora de taxas da InfinitePay', '/bancada/ajustes', { aba: 'calculadora' }, ['admin']],
  ['Minhas clientes', '/bancada/clientes', null, ['professora']],
  ['Velocidade deste computador', '/bancada/velocidade', null, ['admin', 'recepcao', 'professora']],
  ['Meus ganhos', '/bancada/ganhos', null, ['professora']],
];

// Ctrl+K (ou ⌘K) e "/" fora de um campo abrem a busca
export function useAtalhoBusca(abrir) {
  const ref = useRef(abrir);
  useEffect(() => { ref.current = abrir; });
  useEffect(() => {
    const tecla = (e) => {
      const campo = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName) || e.target?.isContentEditable;
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); ref.current(); }
      else if (e.key === '/' && !campo && !document.querySelector('.b-modal, .bg')) { e.preventDefault(); ref.current(); }
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, []);
}

export function BotaoBusca({ aoAbrir, className = '' }) {
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  return (
    <button type="button" className={`bg-botao ${className}`} onClick={aoAbrir} aria-label={`Buscar ${mac ? '⌘ K' : 'Ctrl K'}`} aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K">
      <Icone nome="busca" tamanho={18} tracado={1.8} />
      <span className="bg-botao__texto">Buscar</span>
      {' '}
      <kbd className="bg-botao__tecla">{mac ? '⌘ K' : 'Ctrl K'}</kbd>
    </button>
  );
}

export function Busca({ aoFechar }) {
  const { membro } = useBancada();
  const nav = useNavigate();
  const balcao = pode(membro, 'admin', 'recepcao');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const campo = useRef(null);
  const raiz = useRef(null);
  const hoje = hojeIso();
  // o que já está na memória da bancada (pré-carregado ao entrar)
  const { dados: comandas } = useDados('comandas', { status: 'aberta' }, balcao);
  // a mesma semana que a Agenda usa (já vem pré-carregada)
  const { dados: semana } = useDados('agendaSemana', { de: segundaDe(hoje) });
  const { dados: minhas } = useDados('minhasClientes', {}, !balcao);

  // foco no campo, Tab preso na busca, rolagem do fundo travada e foco devolvido ao fechar
  useCamada(raiz, { foco: () => campo.current });
  // clientes: filtra na hora a lista já carregada e confirma com o servidor por trás
  const { lista: clientes, buscando } = useBuscaClientes(q, 6, balcao);

  const grupos = useMemo(() => {
    const t = semAcento(q.trim());
    const tem = (...xs) => !t || xs.some((x) => semAcento(x).includes(t));
    const g = [];
    if (t) {
      if (balcao) g.push(['Clientes', clientes.map((c) => ({ k: 'c' + c.cpf, tipo: 'cliente', titulo: c.nome, sub: [c.semCpf ? 'sem CPF' : cpfFmt(c.cpf), telFmt(c.whatsapp), c.plano].filter(Boolean).join(' · '),
        ir: () => nav(`/bancada/alunos/${c.cpf}`, { state: { resumo: c } }) }))]);
      else g.push(['Minhas clientes', (minhas || []).filter((c) => tem(c.nome)).slice(0, 6).map((c) => ({ k: 'm' + c.ref, tipo: 'cliente', titulo: c.nome, sub: c.servicos.join(', '),
        ir: () => nav(`/bancada/clientes/${c.ref}`, { state: { nome: c.nome } }) }))]);
      g.push(['Agenda de hoje', (semana?.atendimentos || []).filter((a) => a.data === hoje && a.status !== 'cancelado' && tem(a.nome, a.servico, a.profissional)).slice(0, 5).map((a) => ({
        k: 'a' + a.id, tipo: 'agenda', quando: hora(a.hora), titulo: a.nome, sub: `${a.servico} com ${a.profissional}`, ir: () => nav('/bancada/agenda', { state: { vista: 'dia', dia: hoje } }) }))]);
      if (balcao) g.push(['Comandas abertas', (comandas || []).filter((c) => tem(c.nome, ...c.itens.map((i) => i.nome))).slice(0, 5).map((c) => ({
        k: 'q' + c.id, tipo: 'comanda', titulo: c.nome, sub: `${c.itens.map((i) => i.nome).join(' · ') || 'sem itens'} · ${real(c.total)}`, ir: () => nav('/bancada/comandas', { state: { abrir: c.id } }) }))]);
    }
    g.push([t ? 'Atalhos' : 'Ir para', ATALHOS.filter(([titulo, , , papeis]) => papeis.includes(membro.papel) && tem(titulo)).slice(0, t ? 5 : 8).map(([titulo, para, estado]) => ({
      k: 'p' + titulo, tipo: 'atalho', icone: ICONE_DO_ATALHO[para], titulo, sub: '', ir: () => nav(para, { state: estado || undefined }) }))]);
    return g.filter(([, l]) => l.length);
  }, [q, clientes, semana, comandas, minhas, balcao, membro, nav, hoje]);
  const itens = grupos.flatMap(([, l]) => l);
  useEffect(() => { setSel(0); }, [q]);
  // a opção escolhida pelas setas fica à vista dentro da lista
  useEffect(() => { document.getElementById(idDe(itens[sel]))?.scrollIntoView({ block: 'nearest' }); }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps

  const ir = (it) => { aoFechar(); it.ir(); };
  // Esc em qualquer ponto da busca fecha só ela (não fecha também a folha que estava embaixo)
  const aoTeclar = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); aoFechar(); }
    else prenderTab(e, raiz.current);
  };
  const tecla = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, itens.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter' && itens[sel]) { e.preventDefault(); ir(itens[sel]); }
  };
  let n = -1;
  const termo = q.trim();
  const inicial = (nome) => String(nome || '?').trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
  return (
    <div className="bg" ref={raiz} role="dialog" aria-modal="true" aria-label="Buscar na bancada" tabIndex={-1} onKeyDown={aoTeclar} onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="bg__caixa">
        <div className="bg__campo">
          <Icone nome="busca" tamanho={20} tracado={1.8} />
          <input ref={campo} type="search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={tecla} enterKeyHint="go"
            placeholder={balcao ? 'Cliente, comanda, horário de hoje ou tela…' : 'Cliente, horário de hoje ou tela…'} aria-label="Buscar" role="combobox" aria-expanded={itens.length > 0} aria-autocomplete="list" aria-controls="bg-lista"
            aria-activedescendant={itens[sel] ? idDe(itens[sel]) : undefined} autoComplete="off" />
          <button type="button" className="bg__fechar" aria-label="Fechar Esc" onClick={aoFechar}><span className="bg__fechar-texto">Fechar</span>{' '}<kbd>Esc</kbd></button>
        </div>
        <div className="bg__lista">
          <p className="b-so-leitor" role="status">{termo ? (itens.length ? `${itens.length} ${itens.length === 1 ? 'resultado' : 'resultados'}` : buscando ? 'Buscando clientes' : 'Nada encontrado') : ''}</p>
          <div id="bg-lista" role="listbox" aria-label="Resultados da busca" className="bg__opcoes">
          {grupos.map(([titulo, l]) => (
            <div key={titulo} className="bg__grupo" role="group" aria-label={titulo}>
              <span className="bg__titulo">{titulo}<em>{l.length}</em></span>
              {l.map((it) => {
                n++;
                const i = n;
                return (
                  <button key={it.k} id={idDe(it)} type="button" role="option" tabIndex={-1} aria-selected={i === sel} className={`bg__item bg__item--${it.tipo}`} onMouseEnter={() => setSel(i)} onClick={() => ir(it)}>
                    <span className="bg__icone" aria-hidden="true">
                      {it.tipo === 'cliente' ? inicial(it.titulo) : it.tipo === 'agenda' ? it.quando : <Icone nome={it.tipo === 'comanda' ? 'comanda' : it.icone || 'seta'} tamanho={18} />}
                    </span>
                    <span className="bg__texto"><strong>{it.titulo}</strong>{it.sub && <small>{it.sub}</small>}</span>
                    <span className="bg__enter" aria-hidden="true"><Icone nome="enter" tamanho={16} /></span>
                  </button>
                );
              })}
            </div>
          ))}
          </div>
          {termo.length >= 2 && buscando && <p className="bg__nada bg__nada--carregando">Buscando clientes…</p>}
          {termo.length >= 2 && !buscando && itens.length === 0 && (
            <div className="bg__vazio">
              <span className="bg__vazio-icone" aria-hidden="true"><Icone nome="busca" tamanho={22} /></span>
              <strong>Nada encontrado para “{termo}”</strong>
              <small>Tente só o primeiro nome, o CPF ou o WhatsApp.</small>
            </div>
          )}
        </div>
        <p className="bg__dica">
          <span><kbd>↑</kbd><kbd>↓</kbd>escolher</span>
          <span><kbd>Enter</kbd>abrir</span>
          <span><kbd>Esc</kbd>fechar</span>
          {!termo && <span className="bg__dica-hoje">hoje, {dataBR(hoje).slice(0, 5)}</span>}
        </p>
      </div>
    </div>
  );
}
