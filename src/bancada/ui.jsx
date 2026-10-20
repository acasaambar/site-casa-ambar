import { useEffect, useRef, useState } from 'react';
import { Sol, Forma } from '../components/Marca.jsx';
import { useBancada } from './sessao.jsx';
import { mascaraCPF } from '../lib/util.js';
import { lembrar, temNaMemoria, guardarNaMemoria, buscar, acompanhar } from './memoria.js';

// ---------- bandeira do cartão (para conferir com o extrato da maquininha) ----------
export const BANDEIRAS = ['Visa', 'Mastercard', 'Elo', 'American Express', 'Hipercard', 'Hiper', 'Diners', 'Cabal', 'Outra'];
export const ehCartao = (m) => m === 'Cartão de crédito' || m === 'Cartão de débito';
export const faltaBandeira = (metodo, bandeira) => ehCartao(metodo) && !bandeira;

export function CampoBandeira({ metodo, valor, aoMudar, className = 'b-campo' }) {
  if (!ehCartao(metodo)) return null;
  return (
    <label className={className}>
      <span className="rotulo">Bandeira do cartão</span>
      <select value={valor} onChange={(e) => aoMudar(e.target.value)} aria-invalid={!valor} required>
        <option value="">Escolha…</option>
        {BANDEIRAS.map((b) => <option key={b}>{b}</option>)}
      </select>
    </label>
  );
}

// ---------- formatos ----------
export const real = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const realCurto = (v) => {
  const n = Number(v || 0);
  // sinal de menos colado no valor (o hífen deixava o "−" sozinho numa linha)
  if (n < 0) return '−\u2060' + realCurto(-n);
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
// cliente sem CPF tem um código interno de 15 dígitos (começa com 9)
export const semCpf = (c) => String(c || '').replace(/\D/g, '').length > 11;
export const cpfFmt = (c) => (semCpf(c) ? 'sem CPF' : mascaraCPF(c || ''));
export const METODOS = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Link InfinitePay'];
export const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const mesTexto = (m) => { const [a, n] = String(m).split('-'); return `${MESES_LONGOS[Number(n) - 1]} ${a}`; };
export const somarMes = (m, n) => { const [a, x] = String(m).split('-').map(Number); const d = new Date(a, x - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
export const numBR = (v) => Number(String(v ?? '').replace(/\./g, '').replace(',', '.')) || 0;
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
// "1 aula", "3 aulas" (sem o "aula(s)")
export const plural = (n, um, varios) => `${n} ${Number(n) === 1 ? um : varios}`;
// mesmo nome da profissional (como o servidor compara: sem acento, sem diferença de maiúsculas)
const semAcento = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
export const ehDela = (nome, membro) => !!membro && !!semAcento(nome) && semAcento(nome) === semAcento(membro.professorNome || membro.nome);

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
// Carrega os dados de uma tela. Se a tela já foi aberta antes, mostra na hora o que
// estava na memória e atualiza por trás. "atual" diz se os dados são destes parâmetros.
export function useDados(acao, params, ativo = true) {
  const { chamar, token } = useBancada();
  const chave = JSON.stringify(params || {});
  const id = `${token}|${acao}|${chave}`;
  const [estado, setEstado] = useState(() => ({ dados: lembrar(id) ?? null, erro: '', carregando: true, id: temNaMemoria(id) ? id : '' }));
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    if (!ativo) return undefined;
    let vivo = true;
    setEstado((e) => (temNaMemoria(id) ? { dados: lembrar(id), erro: '', carregando: true, id } : { ...e, carregando: true, erro: '' }));
    buscar(id, () => chamar(acao, JSON.parse(chave)), versao > 0)
      .then((d) => { if (vivo) setEstado({ dados: d, erro: '', carregando: false, id }); })
      .catch((e) => { if (vivo) setEstado((x) => ({ ...x, erro: e.message, carregando: false })); });
    return () => { vivo = false; };
  }, [id, versao, chamar, ativo]); // eslint-disable-line react-hooks/exhaustive-deps
  const { id: idDados, ...resto } = estado;
  return {
    ...resto,
    atual: idDados === id,
    recarregar: () => setVersao((v) => v + 1),
    setDados: (d) => setEstado((e) => {
      const novo = typeof d === 'function' ? d(e.dados) : d;
      guardarNaMemoria(id, novo);
      return { ...e, dados: novo, id };
    }),
  };
}

// A profissional atende serviços (está em Catálogo → Profissionais)? true / false / null (ainda carregando).
// Para a equipe do balcão é sempre true. Usa a mesma busca da agenda de hoje (já vem pré-carregada).
export function useFazServicos() {
  const { membro } = useBancada();
  const prof = membro?.papel === 'professora';
  const { dados } = useDados('atendimentos', { de: hojeIso(), dias: 1 }, prof);
  if (!prof) return true;
  if (!dados) return null;
  return (dados.equipe || []).some((e) => ehDela(e.nome, membro)) || (dados.atendimentos || []).length > 0;
}

// faixa que rola para o lado: avisa quando ainda há itens escondidos à direita (para o esmaecido da borda)
export function useMaisADireita() {
  const ref = useRef(null);
  const [mais, setMais] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const medir = () => setMais(el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
    medir();
    el.addEventListener('scroll', medir, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null;
    ro?.observe(el);
    Array.from(el.children).forEach((c) => ro?.observe(c));
    return () => { el.removeEventListener('scroll', medir); ro?.disconnect(); };
  });
  return [ref, mais];
}

// busca por trás, antes de a tela ser aberta (mesma chave do useDados)
export function preCarregar(chamar, token, acao, params = {}) {
  const id = `${token}|${acao}|${JSON.stringify(params)}`;
  if (!temNaMemoria(id)) buscar(id, () => chamar(acao, params), false, true).catch(() => {});
}

// aviso discreto enquanto alguma tela busca dados novos
export function Atualizando() {
  const [n, setN] = useState(0);
  const [visivel, setVisivel] = useState(false);
  useEffect(() => acompanhar(setN), []);
  useEffect(() => {
    if (!n) { setVisivel(false); return undefined; }
    const t = setTimeout(() => setVisivel(true), 400);
    return () => clearTimeout(t);
  }, [n]);
  if (!visivel) return null;
  return (
    <div className="b-atualizando" role="status">
      <Sol tamanho={14} className="girando" />
      <span>Atualizando…</span>
    </div>
  );
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

// folhas abertas uma sobre a outra (ex.: editar um item dentro da comanda): o Esc fecha só a de cima
const folhasAbertas = [];

export function Modal({ titulo, rotulo, aoFechar, children, largo }) {
  const ref = useRef(null);
  const fechar = useRef(aoFechar);
  fechar.current = aoFechar;
  useEffect(() => {
    const eu = {};
    folhasAbertas.push(eu);
    const esc = (e) => e.key === 'Escape' && folhasAbertas[folhasAbertas.length - 1] === eu && fechar.current?.();
    document.addEventListener('keydown', esc);
    document.body.classList.add('b-sem-rolagem');
    ref.current?.querySelector('.b-modal__corpo input:not([type=checkbox]):not([type=radio]), .b-modal__corpo select, .b-modal__corpo textarea')?.focus();
    return () => {
      document.removeEventListener('keydown', esc);
      folhasAbertas.splice(folhasAbertas.indexOf(eu), 1);
      if (!folhasAbertas.length) document.body.classList.remove('b-sem-rolagem');
    };
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

// navegação de mês: ‹ outubro 2026 ›
export function SeletorMes({ mes, aoMudar }) {
  return (
    <div className="b-mes" role="group" aria-label="Mês">
      <button type="button" onClick={() => aoMudar(somarMes(mes, -1))} aria-label="Mês anterior">‹</button>
      <strong>{mesTexto(mes)}</strong>
      <button type="button" onClick={() => aoMudar(somarMes(mes, 1))} aria-label="Próximo mês">›</button>
    </div>
  );
}

export function Segmento({ itens, atual, aoMudar, rotulo }) {
  return (
    <div className="b-segmento" role="tablist" aria-label={rotulo}>
      {itens.map(([id, t]) => <button key={id} type="button" role="tab" aria-selected={atual === id} onClick={() => aoMudar(id)}>{t}</button>)}
    </div>
  );
}

export function Abas({ itens, atual, aoMudar }) {
  const [ref, mais] = useMaisADireita();
  return (
    <div className={`b-abas${mais ? ' b-rola--mais' : ''}`} role="tablist" ref={ref}>
      {itens.map(([id, texto]) => (
        <button key={id} type="button" role="tab" aria-selected={atual === id} onClick={() => aoMudar(id)}>{texto}</button>
      ))}
    </div>
  );
}

// Busca de aluno (nome, CPF, WhatsApp ou e-mail)
export function BuscaAluno({ aoEscolher, autoFocus, placeholder = 'Buscar por nome, CPF ou WhatsApp', excluir = [], motivoExcluir = 'já está nesta aula' }) {
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
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} aria-label="Buscar cadastro" />
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
      {q.trim().length >= 2 && !buscando && lista.length === 0 && <p className="b-busca__nada">Ninguém encontrado com essa busca.</p>}
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
