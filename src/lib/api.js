// ============================================================
//  API — conversa com o Apps Script (Google Sheets).
//  Sem API_URL configurada, usa o modo demonstração.
// ============================================================
import { CONFIG, GRADE } from '../config.js';
import { soDigitos, isoData, idDaAula, inicioDaAula } from './util.js';

export const MODO_DEMO = !CONFIG.API_URL;

async function chamar(acao, dados = {}) {
  if (MODO_DEMO) return demo(acao, dados);
  let resp;
  try {
    // Sem cabeçalhos: o navegador envia como text/plain e o
    // Apps Script aceita sem bloqueio de CORS.
    resp = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ acao, ...dados }),
    });
  } catch {
    throw new Error('Sem conexão. Verifique sua internet e tente de novo.');
  }
  let json;
  try {
    json = await resp.json();
  } catch {
    throw new Error('O sistema de reservas não respondeu. Tente de novo em instantes.');
  }
  if (!json.ok) throw new Error(json.erro || 'Algo deu errado. Tente de novo.');
  return json.dados;
}

export const api = {
  cadastrar: (d) => chamar('cadastrar', d),
  entrar: (d) => chamar('entrar', d),
  sair: (token) => chamar('sair', { token }),
  aulas: (token) => chamar('aulas', { token }),
  aula: (token, aulaId) => chamar('aula', { token, aulaId }),
  reservar: (token, aulaId, tapete) => chamar('reservar', { token, aulaId, tapete }),
  cancelar: (token, reservaId) => chamar('cancelar', { token, reservaId }),
  checkin: (token, reservaId) => chamar('checkin', { token, reservaId }),
  minhasReservas: (token) => chamar('minhasReservas', { token }),
};

// ============================================================
//  MODO DEMONSTRAÇÃO (dados no navegador)
// ============================================================
const LS = {
  ler(k, padrao) {
    try {
      return JSON.parse(localStorage.getItem(k)) ?? padrao;
    } catch {
      return padrao;
    }
  },
  gravar(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* navegador sem armazenamento: segue só em memória */
    }
  },
};

async function hash(txt) {
  if (window.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return btoa(txt);
}

function semente(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// Ocupação "de outros alunos", sempre igual para a mesma aula.
function ocupacaoFicticia(aula) {
  const rnd = semente(aula.id);
  const qtd = Math.floor(rnd() * (aula.capacidade * 0.75));
  const lugares = [...Array(aula.capacidade)].map((_, i) => i + 1);
  for (let i = lugares.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [lugares[i], lugares[j]] = [lugares[j], lugares[i]];
  }
  return lugares.slice(0, qtd);
}

function gerarAulas() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const lista = [];
  for (let i = 0; i < CONFIG.diasVisiveis; i++) {
    const d = new Date(hoje);
    d.setDate(d.getDate() + i);
    const data = isoData(d);
    GRADE.filter((g) => g.dia === d.getDay()).forEach((g) => {
      lista.push({ ...g, data, id: idDaAula(data, g.hora, g.modalidade), duracao: 60 });
    });
  }
  return lista.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
}

function sessao(token) {
  const sessoes = LS.ler('ambar_demo_sessoes', {});
  const cpf = sessoes[token];
  if (!cpf) throw new Error('Sua sessão expirou. Entre novamente.');
  const aluno = LS.ler('ambar_demo_alunos', {})[cpf];
  return aluno;
}

function montarAula(aula, reservas, cpf) {
  const daAula = reservas.filter((r) => r.aulaId === aula.id && r.status !== 'cancelado');
  const minha = daAula.find((r) => r.cpf === cpf);
  const outros = ocupacaoFicticia(aula).filter((n) => !daAula.some((r) => r.tapete === n));
  const ocupados = [...outros, ...daAula.map((r) => r.tapete)];
  return {
    ...aula,
    ocupados: aula.modalidade === 'Yoga' ? ocupados : [],
    ocupadosQtd: ocupados.length,
    minhaReserva: minha ? { id: minha.id, tapete: minha.tapete } : null,
  };
}

async function demo(acao, d) {
  await new Promise((r) => setTimeout(r, 350));
  const alunos = LS.ler('ambar_demo_alunos', {});
  const reservas = LS.ler('ambar_demo_reservas', []);

  // conta de demonstração
  if (!alunos['12345678909']) {
    alunos['12345678909'] = {
      cpf: '12345678909',
      nome: 'Mariana Demonstração',
      whatsapp: '85900000000',
      senha: await hash('12345678909:ambar123'),
    };
    LS.gravar('ambar_demo_alunos', alunos);
  }

  const novoToken = (cpf) => {
    const t = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const s = LS.ler('ambar_demo_sessoes', {});
    s[t] = cpf;
    LS.gravar('ambar_demo_sessoes', s);
    return t;
  };
  const publico = (a) => ({ nome: a.nome, cpf: a.cpf, whatsapp: a.whatsapp });

  switch (acao) {
    case 'cadastrar': {
      const cpf = soDigitos(d.cpf);
      if (alunos[cpf]) throw new Error('Este CPF já tem cadastro. Use "Entrar".');
      alunos[cpf] = { cpf, nome: d.nome.trim(), whatsapp: soDigitos(d.whatsapp), email: d.email || '', senha: await hash(cpf + ':' + d.senha) };
      LS.gravar('ambar_demo_alunos', alunos);
      return { token: novoToken(cpf), aluno: publico(alunos[cpf]) };
    }
    case 'entrar': {
      const cpf = soDigitos(d.cpf);
      const a = alunos[cpf];
      if (!a || a.senha !== (await hash(cpf + ':' + d.senha))) throw new Error('CPF ou senha incorretos.');
      return { token: novoToken(cpf), aluno: publico(a) };
    }
    case 'sair':
      return true;
    case 'aulas': {
      const a = sessao(d.token);
      return gerarAulas().map((x) => montarAula(x, reservas, a.cpf));
    }
    case 'aula': {
      const a = sessao(d.token);
      const x = gerarAulas().find((y) => y.id === d.aulaId);
      if (!x) throw new Error('Aula não encontrada.');
      return montarAula(x, reservas, a.cpf);
    }
    case 'reservar': {
      const a = sessao(d.token);
      const x = gerarAulas().find((y) => y.id === d.aulaId);
      if (!x) throw new Error('Aula não encontrada.');
      if (inicioDaAula(x) < new Date()) throw new Error('Esta aula já começou.');
      const m = montarAula(x, reservas, a.cpf);
      if (m.minhaReserva) throw new Error('Você já tem reserva nesta aula.');
      if (m.ocupadosQtd >= x.capacidade) throw new Error('Aula lotada.');
      let tapete = null;
      if (x.modalidade === 'Yoga') {
        tapete = Number(d.tapete);
        if (!tapete || tapete < 1 || tapete > x.capacidade) throw new Error('Escolha um tapete.');
        if (m.ocupados.includes(tapete)) throw new Error(`O tapete ${tapete} acabou de ser reservado. Escolha outro.`);
      }
      const r = {
        id: 'R' + Date.now().toString(36).toUpperCase(),
        aulaId: x.id, data: x.data, hora: x.hora, modalidade: x.modalidade, professor: x.professor,
        cpf: a.cpf, tapete, status: 'reservado', criadoEm: new Date().toISOString(),
      };
      reservas.push(r);
      LS.gravar('ambar_demo_reservas', reservas);
      return r;
    }
    case 'cancelar': {
      const a = sessao(d.token);
      const r = reservas.find((y) => y.id === d.reservaId && y.cpf === a.cpf);
      if (!r) throw new Error('Reserva não encontrada.');
      const limite = inicioDaAula(r).getTime() - CONFIG.cancelarAteHorasAntes * 3600e3;
      if (Date.now() > limite) throw new Error(`Cancelamento só até ${CONFIG.cancelarAteHorasAntes}h antes da aula.`);
      r.status = 'cancelado';
      LS.gravar('ambar_demo_reservas', reservas);
      return true;
    }
    case 'checkin': {
      const a = sessao(d.token);
      const r = reservas.find((y) => y.id === d.reservaId && y.cpf === a.cpf);
      if (!r) throw new Error('Reserva não encontrada.');
      const ini = inicioDaAula(r).getTime();
      if (Date.now() < ini - CONFIG.checkinAbreMinAntes * 60e3) throw new Error(`O check-in abre ${CONFIG.checkinAbreMinAntes} min antes da aula.`);
      if (Date.now() > ini + 60 * 60e3) throw new Error('Esta aula já terminou.');
      r.status = 'check-in';
      r.checkinEm = new Date().toISOString();
      LS.gravar('ambar_demo_reservas', reservas);
      return r;
    }
    case 'minhasReservas': {
      const a = sessao(d.token);
      return reservas
        .filter((r) => r.cpf === a.cpf && r.status !== 'cancelado')
        .sort((x, y) => (x.data + x.hora).localeCompare(y.data + y.hora));
    }
    default:
      throw new Error('Ação desconhecida.');
  }
}
