import { useEffect, useRef, useState } from 'react';
import { Sol, Forma } from '../components/Marca.jsx';
import { useBancada } from './sessao.jsx';
import { mascaraCPF } from '../lib/util.js';

// ---------- formatos ----------
export const real = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const realCurto = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 10000) return 'R$ ' + (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil';
  return Number.isInteger(n) ? 'R$ ' + n.toLocaleString('pt-BR') : real(n);
};
export const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const DIAS_LONGOS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export function dataBR(iso) {
  if (!iso) return '';
  const [a, m, d] = String(iso).slice(0, 10).split('-');
  return d ? `${d}/${m}/${a}` : iso;
}
export function dataCurta(iso) {
  if (!iso) return '';
  const [, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return d ? `${d} ${MESES[m - 1]}` : iso;
}
export function hora(h) {
  if (!h) return '';
  const [hh, mm] = String(h).split(':');
  return mm === '00' ? `${Number(hh)}h` : `${Number(hh)}h${mm}`;
}
export function hojeIso() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function somarDias(iso, n) {
  const [a, m, d] = iso.split('-').map(Number);
  const x = new Date(a, m - 1, d + n);
  const p = (k) => String(k).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
}
export const diaSemana = (iso) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d).getDay(); };
export const cpfFmt = (c) => mascaraCPF(c || '');
export function telFmt(t) {
  const d = String(t || '').replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t || '';
}
export function linkWhats(numero, texto = '') {
  const d = String(numero || '').replace(/\D/g, '');
  if (!d) return '';
  return `https://wa.me/${d.length <= 11 ? '55' + d : d}${texto ? '?text=' + encodeURIComponent(texto) : ''}`;
}
export const primeiro = (n) => String(n || '').trim().split(' ')[0];

// CSV que o Excel abre direto (separador ; e acentos certos)
export function baixarCSV(nome, colunas, linhas) {
  const esc = (v) => {
    let s = v == null ? '' : String(v);
    // impede que o Excel execute fórmulas vindas de dados (=, +, -, @)
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const corpo = [colunas.map((c) => esc(c[1])).join(';')]
    .concat(linhas.map((l) => colunas.map((c) => esc(typeof c[0] === 'function' ? c[0](l) : l[c[0]])).join(';')))
    .join('\r\n');
  const blob = new Blob(['﻿' + corpo], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nome.endsWith('.csv') ? nome : nome + '.csv';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

// ---------- dados ----------
// const { dados, erro, carregando, recarregar } = useDados('agenda', { de, dias })
export function useDados(acao, params, ativo = true) {
  const { chamar } = useBancada();
  const [estado, setEstado] = useState({ dados: null, erro: '', carregando: true });
  const chave = JSON.stringify(params || {});
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    if (!ativo) return undefined;
    let vivo = true;
    setEstado((e) => ({ ...e, carregando: true, erro: '' }));
    chamar(acao, JSON.parse(chave))
      .then((d) => { if (vivo) setEstado({ dados: d, erro: '', carregando: false }); })
      .catch((e) => { if (vivo) setEstado((x) => ({ ...x, erro: e.message, carregando: false })); });
    return () => { vivo = false; };
  }, [acao, chave, versao, chamar, ativo]);
  return { ...estado, recarregar: () => setVersao((v) => v + 1), setDados: (d) => setEstado((e) => ({ ...e, dados: typeof d === 'function' ? d(e.dados) : d })) };
}

// ---------- peças visuais ----------
export function Carregando({ texto = 'Carregando' }) {
  return (
    <div className="b-carregando" role="status">
      <Sol tamanho={30} className="girando cor-caramelo" />
      <span>{texto}…</span>
    </div>
  );
}

export function Vazio({ titulo, children, forma = 'sutileza' }) {
  return (
    <div className="b-vazio">
      <Forma nome={forma} tamanho={46} cor="var(--caramelo)" />
      <strong>{titulo}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}

export function Cabecalho({ rotulo, titulo, children, acoes }) {
  return (
    <header className="b-cabecalho" data-secao={rotulo || undefined}>
      <div>
        <h1 className="b-titulo">{titulo}</h1>
        {children && <p className="b-cabecalho__sub">{children}</p>}
      </div>
      {acoes && <div className="b-cabecalho__acoes">{acoes}</div>}
    </header>
  );
}

export function Erro({ children }) {
  if (!children) return null;
  return <p className="erro erro--destaque" role="alert">{children}</p>;
}

export function Tag({ tom = 'neutro', children, title }) {
  return <span className={`b-tag b-tag--${tom}`} title={title}>{children}</span>;
}

export function Modal({ titulo, rotulo, aoFechar, children, largo }) {
  const ref = useRef(null);
  const fechar = useRef(aoFechar);
  fechar.current = aoFechar;
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && fechar.current?.();
    document.addEventListener('keydown', esc);
    document.body.classList.add('b-sem-rolagem');
    ref.current?.querySelector('.b-modal__corpo input:not([type=checkbox]), .b-modal__corpo select, .b-modal__corpo textarea')?.focus();
    return () => { document.removeEventListener('keydown', esc); document.body.classList.remove('b-sem-rolagem'); };
  }, []);
  return (
    <div className="b-modal" role="dialog" aria-modal="true" aria-label={titulo} onMouseDown={(e) => e.target === e.currentTarget && aoFechar?.()}>
      <div className={`b-modal__caixa${largo ? ' b-modal__caixa--largo' : ''}`} ref={ref}>
        <header className="b-modal__topo">
          <div>
            <h2 className="b-modal__titulo">{titulo}</h2>
            {rotulo && <p className="b-modal__contexto">{rotulo}</p>}
          </div>
          {aoFechar && <button type="button" className="b-fechar" aria-label="Fechar" onClick={aoFechar}>×</button>}
        </header>
        <div className="b-modal__corpo">{children}</div>
      </div>
    </div>
  );
}

export function Kpi({ rotulo, valor, detalhe, tom }) {
  return (
    <div className={`b-kpi${tom ? ' b-kpi--' + tom : ''}`}>
      <span className="b-kpi__rotulo">{rotulo}</span>
      <strong className="b-kpi__valor">{valor}</strong>
      {detalhe && <span className="b-kpi__detalhe">{detalhe}</span>}
    </div>
  );
}

export function Abas({ itens, atual, aoMudar }) {
  return (
    <div className="b-abas" role="tablist">
      {itens.map(([id, texto]) => (
        <button key={id} type="button" role="tab" aria-selected={atual === id} onClick={() => aoMudar(id)}>{texto}</button>
      ))}
    </div>
  );
}

// Busca de aluno (nome, CPF, WhatsApp ou e-mail)
export function BuscaAluno({ aoEscolher, autoFocus, placeholder = 'Buscar aluno por nome, CPF ou WhatsApp', excluir = [], motivoExcluir = 'já está nesta aula' }) {
  const { chamar } = useBancada();
  const [q, setQ] = useState('');
  const [lista, setLista] = useState([]);
  const [buscando, setBuscando] = useState(false);
  useEffect(() => {
    if (q.trim().length < 2) { setLista([]); return undefined; }
    const t = setTimeout(() => {
      setBuscando(true);
      chamar('alunos', { busca: q.trim() }).then((r) => setLista(r.slice(0, 8))).catch(() => setLista([])).finally(() => setBuscando(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q, chamar]);
  return (
    <div className="b-busca">
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} aria-label="Buscar aluno" />
      {buscando && <span className="b-busca__status">buscando…</span>}
      {lista.length > 0 && (
        <ul className="b-busca__lista">
          {lista.map((a) => (
            <li key={a.cpf}>
              <button type="button" disabled={excluir.includes(a.cpf)} onClick={() => { aoEscolher(a); setQ(''); setLista([]); }}>
                <strong>{a.nome}</strong>
                <span>{excluir.includes(a.cpf) ? motivoExcluir : `${cpfFmt(a.cpf)} · ${a.plano || 'sem plano ativo'}`}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.trim().length >= 2 && !buscando && lista.length === 0 && <p className="b-busca__nada">Nenhum aluno encontrado.</p>}
    </div>
  );
}

// botão que executa uma ação assíncrona e mostra "…" enquanto espera
export function BotaoAcao({ acao, children, className = 'botao botao--linha botao--p', confirmar, ...resto }) {
  const [ocupado, setOcupado] = useState(false);
  return (
    <button type="button" className={className} disabled={ocupado || resto.disabled} {...resto}
      onClick={async () => {
        if (confirmar && !window.confirm(confirmar)) return;
        setOcupado(true);
        try { await acao(); } finally { setOcupado(false); }
      }}>
      {ocupado ? '…' : children}
    </button>
  );
}

export const STATUS_RESERVA = {
  reservado: ['Reservado', 'neutro'],
  'check-in': ['Presente', 'ok'],
  falta: ['Faltou', 'alerta'],
  pendente: ['Aguardando pagamento', 'aviso'],
  cancelado: ['Cancelado', 'apagado'],
};
