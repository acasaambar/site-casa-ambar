import { useEffect, useState } from 'react';

// "Dra. Paula Mendes" -> "PM"
export const iniciais = (n) => String(n || '').replace(/^(dra?\.?|prof\.?)\s+/i, '').split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();

// Esc fecha a foto ampliada (e só ela: a folha que está embaixo continua aberta)
export function useEscFoto(ampliada, fechar) {
  useEffect(() => {
    if (!ampliada) return undefined;
    const tecla = (e) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); fechar(); } };
    document.addEventListener('keydown', tecla, true);
    return () => document.removeEventListener('keydown', tecla, true);
  }, [ampliada]); // eslint-disable-line react-hooks/exhaustive-deps
}

// Cor de cada área de cuidado (tons da marca); Servicos.jsx reexporta
export const COR_CATEGORIA = {
  'Estética facial': 'facial',
  'Estética corporal': 'corporal',
  'Estética capilar': 'capilar',
  Fisioterapia: 'fisio',
};

// celular (até 720 px): a agenda troca as colunas lado a lado por lista, semana compacta e calendário do mês
export function useCelular(largura = 720) {
  const consulta = `(max-width: ${largura}px)`;
  const [celular, setCelular] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(consulta).matches);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const q = window.matchMedia(consulta);
    const f = () => setCelular(q.matches);
    f();
    q.addEventListener('change', f);
    return () => q.removeEventListener('change', f);
  }, [consulta]);
  return celular;
}

// meses do calendário (Agenda → Mês): sempre no dia 1, para o "dia escolhido" cair dentro do mês certo
const MESES_NOME = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const primeiroDoMes = (iso) => `${iso.slice(0, 7)}-01`;
export const mesMais = (iso, n) => {
  const [a, m] = iso.split('-').map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
export const tituloMes = (iso) => `${MESES_NOME[Number(iso.slice(5, 7)) - 1].replace(/^./, (c) => c.toUpperCase())} de ${iso.slice(0, 4)}`;

// observação do atendimento: o "Reagendado de …" é do sistema; o resto é da equipe
export const prefixoDeReagendado = (obs) => (String(obs || '').match(/^(Reagendado de [^.]*\.\s*)+/) || [''])[0].trim();
export const obsDaEquipe = (obs) => String(obs || '').replace(/^(Reagendado de [^.]*\.\s*)+/, '').trim();

// ============================================================
//  Agenda do dia (computador e iPad): contas puras, testadas em testes/agendaDia.teste.mjs
// ============================================================
const minutos = (h) => { const [a, b] = String(h || '0:0').split(':').map(Number); return (a || 0) * 60 + (b || 0); };
const AREAS = { estetica: 'Estética', fisio: 'Fisioterapia', pilates: 'Pilates', yoga: 'Yoga' };

// o que a pessoa faz, na ordem da agenda: [['fisio', 'Fisioterapia'], ['pilates', 'Pilates']]
export function areasDaPessoa(categorias = [], modalidades = []) {
  const g = [];
  if (categorias.some((c) => String(c).startsWith('Estética'))) g.push('estetica');
  if (categorias.includes('Fisioterapia')) g.push('fisio');
  if (!g.length && categorias.length) g.push('estetica');
  if (modalidades.includes('Pilates')) g.push('pilates');
  if (modalidades.includes('Yoga')) g.push('yoga');
  return g.map((x) => [x, AREAS[x]]);
}

// itens que se cruzam na mesma coluna ficam lado a lado: { id: { faixa, faixas } }
// itens = [{ id, ini, fim }] em minutos
export function faixasLadoALado(itens) {
  const r = {};
  const ord = [...itens].sort((a, b) => a.ini - b.ini || b.fim - a.fim);
  let grupo = [];
  let fimGrupo = -1;
  const fechar = () => {
    const ocupadas = []; // fim de cada faixa
    grupo.forEach((x) => {
      let f = ocupadas.findIndex((fim) => fim <= x.ini);
      if (f < 0) { f = ocupadas.length; ocupadas.push(0); }
      ocupadas[f] = x.fim;
      r[x.id] = { faixa: f, faixas: 0 };
    });
    grupo.forEach((x) => { r[x.id].faixas = ocupadas.length; });
    grupo = [];
  };
  ord.forEach((x) => {
    if (grupo.length && x.ini >= fimGrupo) fechar();
    grupo.push(x);
    fimGrupo = grupo.length === 1 ? x.fim : Math.max(fimGrupo, x.fim);
  });
  if (grupo.length) fechar();
  return r;
}

// o que vale conferir no dia: a mesma pessoa em dois lugares, horário bloqueado com gente marcada, aula sem quem dá
// devolve [{ id, tipo: 'choque'|'bloqueio'|'semProfessor', pessoa, hora, texto, alvo: { atendimento | aula } }]
export function conferirDia({ lista = [], aulas = [], folgas = [] }) {
  const out = [];
  const hm = (m) => `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`;
  const ativos = lista.filter((a) => a.status !== 'cancelado' && a.status !== 'falta' && !a.soDaComanda);
  const at = ativos.map((a) => ({ tipo: 'atendimento', id: a.id, pessoa: a.profissional, ini: minutos(a.hora), fim: minutos(a.hora) + (Number(a.duracao) || 60), nome: `atendimento de ${a.nome}`, o: a }));
  const au = aulas.map((a) => ({ tipo: 'aula', id: a.id, pessoa: String(a.professor || '').trim(), ini: minutos(a.hora), fim: minutos(a.hora) + (Number(a.duracao) || 60), nome: `aula de ${a.modalidade}`, o: a }));
  au.filter((a) => !a.pessoa).forEach((a) => out.push({ id: `sem-${a.id}`, tipo: 'semProfessor', pessoa: '', hora: a.ini, texto: `Aula de ${a.o.modalidade} das ${hm(a.ini)} está sem quem dá a aula.`, alvo: { aula: a.o } }));
  const todos = [...at, ...au].filter((x) => x.pessoa);
  for (let i = 0; i < todos.length; i++) {
    for (let j = i + 1; j < todos.length; j++) {
      const a = todos[i], b = todos[j];
      if (a.pessoa !== b.pessoa || !(a.ini < b.fim && b.ini < a.fim)) continue;
      const [p, s] = a.ini <= b.ini ? [a, b] : [b, a];
      out.push({
        id: `choque-${p.id}-${s.id}`, tipo: 'choque', pessoa: p.pessoa, hora: p.ini,
        texto: `${p.pessoa} está em dois lugares: ${p.nome} às ${hm(p.ini)} e ${s.nome} às ${hm(s.ini)}.`,
        alvo: s.tipo === 'atendimento' ? { atendimento: s.o } : p.tipo === 'atendimento' ? { atendimento: p.o } : { aula: s.o },
      });
    }
  }
  folgas.forEach((f) => {
    const ini = f.diaTodo ? 0 : minutos(f.inicio);
    const fim = f.diaTodo ? 24 * 60 : minutos(f.fim);
    todos.filter((x) => x.pessoa === f.profissional && x.ini < fim && ini < x.fim).forEach((x) => out.push({
      id: `bloq-${f.id}-${x.id}`, tipo: 'bloqueio', pessoa: x.pessoa, hora: x.ini,
      texto: `${x.pessoa} tem ${x.nome} às ${hm(x.ini)} num horário bloqueado (${f.motivo || 'bloqueio'}).`,
      alvo: x.tipo === 'atendimento' ? { atendimento: x.o } : { aula: x.o },
    }));
  });
  return out.sort((a, b) => a.hora - b.hora);
}

// números do dia para a faixa de resumo
export function resumoDoDia({ lista = [], aulas = [] }, agoraMin = null) {
  const at = lista.filter((a) => a.status !== 'cancelado' && !a.soDaComanda);
  const conta = (s) => at.filter((a) => a.status === s).length;
  const lugares = aulas.reduce((t, a) => t + (Number(a.capacidade) || 0), 0);
  const ocupados = aulas.reduce((t, a) => t + (Number(a.ocupadosQtd) || 0), 0);
  const proximos = agoraMin == null ? [] : [
    ...at.filter((a) => (a.status === 'agendado' || a.status === 'confirmado') && minutos(a.hora) >= agoraMin).map((a) => ({ hora: a.hora, ini: minutos(a.hora), texto: a.nome, quem: a.profissional })),
    ...aulas.filter((a) => minutos(a.hora) >= agoraMin).map((a) => ({ hora: a.hora, ini: minutos(a.hora), texto: a.modalidade, quem: a.professor })),
  ].sort((a, b) => a.ini - b.ini);
  return {
    atendimentos: at.length, confirmados: conta('confirmado'), atendidos: conta('atendido'), faltas: conta('falta'),
    aulas: aulas.length, lugares, ocupados, proximo: proximos[0] || null,
  };
}
