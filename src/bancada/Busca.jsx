import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBancada, pode } from './sessao.jsx';
import { useDados, hora, hojeIso, cpfFmt, telFmt, dataBR, real } from './ui.jsx';

// ============================================================
//  BUSCA RÁPIDA (Ctrl+K ou "/"): clientes, comandas abertas, agenda de hoje e atalhos
// ============================================================
const semAcento = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// atalhos para as tarefas do dia a dia (papel: quem vê)
const ATALHOS = [
  ['Agendar serviço', '/bancada/agenda', { novoServico: true, vista: 'dia' }, ['admin', 'recepcao']],
  ['Abrir comanda', '/bancada/comandas', { nova: true }, ['admin', 'recepcao']],
  ['Caixa do dia', '/bancada/comandas', { vista: 'caixa' }, ['admin', 'recepcao']],
  ['Cadastrar cliente', '/bancada/alunos', { novo: true }, ['admin', 'recepcao']],
  ['Vender vale-presente', '/bancada/vendas', { aba: 'vales', novo: true }, ['admin', 'recepcao']],
  ['Lista de espera de serviços', '/bancada/agenda', { espera: true }, ['admin', 'recepcao']],
  ['Aulas e presença', '/bancada/agenda', { vista: 'aulas' }, ['admin', 'recepcao', 'professora']],
  ['Agenda da semana', '/bancada/agenda', { vista: 'semana' }, ['admin', 'recepcao', 'professora']],
  ['Lembretes de amanhã', '/bancada/marketing', { aba: 'lembretes' }, ['admin', 'recepcao']],
  ['Retornos para sugerir', '/bancada/marketing', { aba: 'retornos' }, ['admin', 'recepcao']],
  ['Vendas e estornos', '/bancada/vendas', null, ['admin', 'recepcao']],
  ['Estoque', '/bancada/estoque', null, ['admin', 'recepcao']],
  ['Catálogo (serviços, grade e planos)', '/bancada/grade', null, ['admin', 'recepcao']],
  ['Financeiro', '/bancada/financeiro', null, ['admin']],
  ['Relatórios', '/bancada/relatorios', null, ['admin']],
  ['Equipe e acessos', '/bancada/equipe', null, ['admin']],
  ['Ajustes e taxas da maquininha', '/bancada/ajustes', null, ['admin']],
  ['Minhas clientes', '/bancada/clientes', null, ['professora']],
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
    <button type="button" className={`bg-botao ${className}`} onClick={aoAbrir} aria-label={`Buscar (${mac ? '⌘' : 'Ctrl'}+K)`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
      <span className="bg-botao__texto">Buscar</span>
      <kbd className="bg-botao__tecla">{mac ? '⌘ K' : 'Ctrl K'}</kbd>
    </button>
  );
}

export function Busca({ aoFechar }) {
  const { membro, chamar } = useBancada();
  const nav = useNavigate();
  const balcao = pode(membro, 'admin', 'recepcao');
  const [q, setQ] = useState('');
  const [clientes, setClientes] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [sel, setSel] = useState(0);
  const campo = useRef(null);
  const hoje = hojeIso();
  // o que já está na memória da bancada (pré-carregado ao entrar)
  const { dados: comandas } = useDados('comandas', { status: 'aberta' }, balcao);
  const { dados: agenda } = useDados('atendimentos', { de: hoje, dias: 1 });
  const { dados: minhas } = useDados('minhasClientes', {}, !balcao);

  useEffect(() => { campo.current?.focus(); document.body.classList.add('b-sem-rolagem'); return () => document.body.classList.remove('b-sem-rolagem'); }, []);
  useEffect(() => {
    const t = q.trim();
    if (!balcao || t.length < 2) { setClientes([]); return undefined; }
    let vivo = true;
    const tm = setTimeout(() => {
      setBuscando(true);
      chamar('alunos', { busca: t }).then((l) => vivo && setClientes(l.slice(0, 6))).catch(() => vivo && setClientes([])).finally(() => vivo && setBuscando(false));
    }, 250);
    return () => { vivo = false; clearTimeout(tm); };
  }, [q, balcao, chamar]);

  const grupos = useMemo(() => {
    const t = semAcento(q.trim());
    const tem = (...xs) => !t || xs.some((x) => semAcento(x).includes(t));
    const g = [];
    if (t) {
      if (balcao) g.push(['Clientes', clientes.map((c) => ({ k: 'c' + c.cpf, titulo: c.nome, sub: [c.semCpf ? 'sem CPF' : cpfFmt(c.cpf), telFmt(c.whatsapp), c.plano].filter(Boolean).join(' · '),
        ir: () => nav(`/bancada/alunos/${c.cpf}`, { state: { resumo: c } }) }))]);
      else g.push(['Minhas clientes', (minhas || []).filter((c) => tem(c.nome)).slice(0, 6).map((c) => ({ k: 'm' + c.ref, titulo: c.nome, sub: c.servicos.join(', '),
        ir: () => nav(`/bancada/clientes/${c.ref}`, { state: { nome: c.nome } }) }))]);
      g.push(['Agenda de hoje', (agenda?.atendimentos || []).filter((a) => a.status !== 'cancelado' && tem(a.nome, a.servico, a.profissional)).slice(0, 5).map((a) => ({
        k: 'a' + a.id, titulo: `${hora(a.hora)} · ${a.nome}`, sub: `${a.servico} com ${a.profissional}`, ir: () => nav('/bancada/agenda', { state: { vista: 'dia', dia: hoje } }) }))]);
      if (balcao) g.push(['Comandas abertas', (comandas || []).filter((c) => tem(c.nome, ...c.itens.map((i) => i.nome))).slice(0, 5).map((c) => ({
        k: 'q' + c.id, titulo: c.nome, sub: `${c.itens.map((i) => i.nome).join(' · ') || 'sem itens'} · ${real(c.total)}`, ir: () => nav('/bancada/comandas', { state: { abrir: c.id } }) }))]);
    }
    g.push([t ? 'Atalhos' : 'Ir para', ATALHOS.filter(([titulo, , , papeis]) => papeis.includes(membro.papel) && tem(titulo)).slice(0, t ? 5 : 8).map(([titulo, para, estado]) => ({
      k: 'p' + titulo, titulo, sub: '', ir: () => nav(para, { state: estado || undefined }) }))]);
    return g.filter(([, l]) => l.length);
  }, [q, clientes, agenda, comandas, minhas, balcao, membro, nav, hoje]);
  const itens = grupos.flatMap(([, l]) => l);
  useEffect(() => { setSel(0); }, [q]);

  const ir = (it) => { aoFechar(); it.ir(); };
  const tecla = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); aoFechar(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, itens.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter' && itens[sel]) { e.preventDefault(); ir(itens[sel]); }
  };
  let n = -1;
  return (
    <div className="bg" role="dialog" aria-modal="true" aria-label="Buscar na bancada" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="bg__caixa">
        <div className="bg__campo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
          <input ref={campo} type="search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={tecla} enterKeyHint="go"
            placeholder={balcao ? 'Cliente, comanda, horário de hoje ou tela…' : 'Cliente, horário de hoje ou tela…'} aria-label="Buscar" aria-controls="bg-lista"
            aria-activedescendant={itens[sel] ? 'bg-' + itens[sel].k : undefined} />
          <button type="button" className="bg__fechar" onClick={aoFechar}>Fechar</button>
        </div>
        <div className="bg__lista" id="bg-lista" role="listbox">
          {grupos.map(([titulo, l]) => (
            <div key={titulo} className="bg__grupo">
              <span className="bg__titulo">{titulo}</span>
              {l.map((it) => {
                n++;
                const i = n;
                return (
                  <button key={it.k} id={'bg-' + it.k} type="button" role="option" aria-selected={i === sel} className="bg__item" onMouseEnter={() => setSel(i)} onClick={() => ir(it)}>
                    <strong>{it.titulo}</strong>{it.sub && <small>{it.sub}</small>}
                  </button>
                );
              })}
            </div>
          ))}
          {q.trim().length >= 2 && buscando && <p className="bg__nada">Buscando clientes…</p>}
          {q.trim().length >= 2 && !buscando && itens.length === 0 && <p className="bg__nada">Nada encontrado para “{q.trim()}”.</p>}
        </div>
        <p className="bg__dica">↑ ↓ para escolher · Enter para abrir · Esc para fechar{q.trim() ? '' : ` · hoje, ${dataBR(hoje).slice(0, 5)}`}</p>
      </div>
    </div>
  );
}
