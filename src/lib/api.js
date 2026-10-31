// ============================================================
//  API — conversa com o Apps Script (Google Sheets).
//  Sem API_URL configurada, usa o modo demonstração.
// ============================================================
import { CONFIG, GRADE, PLANOS_DEMO } from '../config.js';
import { soDigitos, isoData, idDaAula, inicioDaAula } from './util.js';

export const MODO_DEMO = !CONFIG.API_URL;

function erroApi(msg, codigo, dados) {
  const e = new Error(msg);
  e.codigo = codigo || null;
  e.dados = dados || null;
  return e;
}

// ---------- medidor (tela Velocidade da bancada) ----------
// Guarda neste computador as últimas idas ao servidor: tempo total, tempo no servidor e
// quantas abas vieram da planilha ou do cache. Só números e o nome da ação (nada de dados de cliente).
const CHAVE_MEDIDAS = 'ambar_medidas';
export function lerMedidas() {
  try { return JSON.parse(localStorage.getItem(CHAVE_MEDIDAS)) || []; } catch { return []; }
}
export function limparMedidas() {
  try { localStorage.removeItem(CHAVE_MEDIDAS); } catch { /* sem armazenamento */ }
}
function anotarMedida(acao, total, medida, trocada = false) {
  try {
    const l = lerMedidas();
    l.push({ a: acao, t: Math.round(total), s: medida?.ms ?? null, p: medida?.planilha ?? null, c: medida?.cache ?? null, q: Date.now(), ...(trocada ? { x: 1 } : {}) });
    localStorage.setItem(CHAVE_MEDIDAS, JSON.stringify(l.slice(-400)));
  } catch { /* sem armazenamento */ }
}

async function chamar(acao, dados = {}) {
  if (MODO_DEMO) return demo(acao, dados);
  // etiqueta única do pedido: o servidor devolve a mesma, e só aceitamos a resposta que é deste pedido
  const rid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  let resp;
  const inicio = performance.now();
  try {
    // Sem cabeçalhos: o navegador envia como text/plain e o
    // Apps Script aceita sem bloqueio de CORS.
    resp = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({ acao, ...dados, rid }),
    });
  } catch {
    throw new Error('Sem conexão. Verifique sua internet e tente de novo.');
  }
  let json;
  try {
    json = await resp.json();
  } catch {
    throw new Error('O sistema não respondeu. Tente de novo em instantes.');
  }
  // resposta de outro pedido (já aconteceu na bancada: a lista de espera chegou no lugar do resumo do dia)
  const trocada = Boolean(json && json.rid && json.rid !== rid);
  anotarMedida(acao, performance.now() - inicio, json.medida, trocada);
  if (trocada) throw erroApi('A resposta do servidor se perdeu no caminho. Confira se a ação foi feita e, se não foi, tente de novo.', 'RESPOSTA_TROCADA');
  if (!json.ok) throw erroApi(json.erro || 'Algo deu errado. Tente de novo.', json.codigo, json.dados);
  return json.dados;
}

// Proteção contra venda duplicada: o servidor recusa com VENDA_DUPLICADA e mostra a venda que já existe.
// A janela (VendaRepetida.jsx) pergunta à equipe; se confirmar, o mesmo pedido segue com as vendas vistas e o motivo.
let perguntarVendaRepetida = null;
export function registrarPerguntaDeVendaRepetida(fn) {
  perguntarVendaRepetida = fn;
  return () => { if (perguntarVendaRepetida === fn) perguntarVendaRepetida = null; };
}

// Bancada interna: api.b('agenda', { token, de, dias })
export const bancada = async (acao, dados = {}) => {
  if (MODO_DEMO) throw new Error('A bancada funciona só com o sistema real (planilha). Ela não tem modo demonstração.');
  let envio = dados;
  for (let volta = 0; ; volta++) {
    try {
      return await chamar('b_' + acao, envio);
    } catch (e) {
      const repetidas = e.codigo === 'VENDA_DUPLICADA' ? e.dados?.repetidas : null;
      if (!repetidas?.length || !perguntarVendaRepetida || volta >= 4) throw e;
      const r = await perguntarVendaRepetida(e.dados, e.message);
      if (!r) throw erroApi('Lançamento cancelado: a venda igual já estava registrada.', 'VENDA_CANCELADA');
      envio = { ...envio, confirmarRepetida: [...new Set([...(envio.confirmarRepetida || []), ...repetidas.map((x) => x.nsu)])], motivoRepetida: r.motivo };
    }
  }
};

export const api = {
  cadastrar: (d) => chamar('cadastrar', d),
  entrar: (d) => chamar('entrar', d),
  sair: (token) => chamar('sair', { token }),
  aulas: (token) => chamar('aulas', { token }),
  aula: (token, aulaId) => chamar('aula', { token, aulaId }),
  reservar: (token, aulaId, tapete, pagarAvulsa = false, usarWellhub = false, codigo = '') => chamar('reservar', { token, aulaId, tapete, pagarAvulsa, usarWellhub, codigo }),
  cancelar: (token, reservaId) => chamar('cancelar', { token, reservaId }),
  checkin: (token, reservaId) => chamar('checkin', { token, reservaId }),
  minhasReservas: (token) => chamar('minhasReservas', { token }),
  salvarAnamnese: (token, ficha) => chamar('salvarAnamnese', { token, ficha }),
  minhaFicha: (token) => chamar('minhaFicha', { token }),
  meuPlano: (token) => chamar('meuPlano', { token }),
  comprar: (token, planoId, codigo = '') => chamar('comprar', { token, planoId, codigo }),
  contratoDoPlano: (token, planoId) => chamar('contratoDoPlano', { token, planoId }),
  assinarContrato: (token, planoId, nome, aceito, dispositivo = '', imagem = '', assinatura = '') => chamar('assinarContrato', { token, planoId, nome, aceito, dispositivo, imagem, assinatura }),
  descartarPagamento: (token, orderNsu) => chamar('descartarPagamento', { token, orderNsu }),
  validarCodigo: (token, planoId, codigo) => chamar('validarCodigo', { token, planoId, codigo }),
  resgatarVale: (token, codigo) => chamar('resgatarVale', { token, codigo }),
  esqueciSenha: (cpf, verificacao = '') => chamar('esqueciSenha', { cpf, verificacao }),
  verLinkSenha: (t) => chamar('verLinkSenha', { t }),
  novaSenha: (t, senha) => chamar('novaSenha', { t, senha }),
  salvarEmail: (token, email) => chamar('salvarEmail', { token, email }),
  salvarEndereco: (token, endereco) => chamar('salvarEndereco', { token, endereco }),
  minhaConta: (token) => chamar('minhaConta', { token }),
  salvarConta: (token, dados) => chamar('salvarConta', { token, dados }),
  trocarEmail: (token, email, senha) => chamar('trocarEmail', { token, email, senha }),
  trocarSenha: (token, senhaAtual, senha) => chamar('trocarSenha', { token, senhaAtual, senha }),
  regras: () => chamar('regras'),
  entrarEspera: (token, aulaId) => chamar('entrarEspera', { token, aulaId }),
  verConfirmacao: (t) => chamar('verConfirmacao', { t }),
  responderConfirmacao: (t, resposta, recado) => chamar('responderConfirmacao', { t, resposta, recado }),
  sairEspera: (token, aulaId) => chamar('sairEspera', { token, aulaId }),
  sairLista: (t) => chamar('sairLista', { t }),
  confirmarPagamento: (token, retorno) => chamar('confirmarPagamento', { token, ...retorno }),
  ativarWellhub: (token, wellhubId, confirmo) => chamar('ativarWellhub', { token, wellhubId, confirmo }),
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

function semanaDe(data) {
  const d = dataDeIsoUTC(data);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
function dataDeIsoUTC(iso) {
  const [y, m, dd] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, dd));
}
function demoUso(c, reservas, dataRef) {
  const minhas = reservas.filter((r) => r.credito === c.id && r.status !== 'cancelado');
  if (c.aulasSemana > 0) return minhas.filter((r) => semanaDe(r.data) === semanaDe(dataRef)).length;
  return minhas.length;
}
function demoEscolherCredito(cpf, aula, reservas) {
  const validos = LS.ler('ambar_demo_creditos', [])
    .filter((c) => c.cpf === cpf && c.modalidade === aula.modalidade && c.inicio <= aula.data && aula.data <= c.fim)
    .sort((a, b) => (a.aulasSemana > 0 ? 0 : 1) - (b.aulasSemana > 0 ? 0 : 1) || a.fim.localeCompare(b.fim));
  return validos.find((c) => demoUso(c, reservas, aula.data) < (c.aulasSemana > 0 ? c.aulasSemana : c.aulasTotal)) || null;
}
function demoCriarPagamento(aluno, plano, extras) {
  const orderNsu = 'P' + Date.now().toString(36).toUpperCase();
  const link = `${location.origin}${location.pathname}?pagamento=${orderNsu}&demo=1`;
  const pagamentos = LS.ler('ambar_demo_pagamentos', []);
  pagamentos.push({ orderNsu, cpf: aluno.cpf, planoId: plano.id, descricao: plano.nome, valor: plano.preco, status: 'pendente',
    criadoEm: new Date().toISOString(), link, reservaId: extras.reservaId || '' });
  LS.gravar('ambar_demo_pagamentos', pagamentos);
  return { order_nsu: orderNsu, link, valor: plano.preco, descricao: plano.nome };
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
  const daAula = reservas.filter((r) => r.aulaId === aula.id && r.status !== 'cancelado' && !(r.status === 'pendente' && r.expira < Date.now()));
  const minha = daAula.find((r) => r.cpf === cpf && r.status !== 'pendente');
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
  const fichas = LS.ler('ambar_demo_fichas', {});
  const publico = (a) => ({ nome: a.nome, cpf: a.cpf, whatsapp: a.whatsapp, anamnese: !!fichas[a.cpf] || a.cpf === '12345678909', endereco: true });

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
      if (!publico(a).anamnese) throw new Error('Preencha sua ficha de saúde antes de reservar.');
      // descarta tentativa anterior de pagar esta aula
      reservas.forEach((r) => { if (r.aulaId === x.id && r.cpf === a.cpf && r.status === 'pendente') r.status = 'cancelado'; });
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
      const credito = demoEscolherCredito(a.cpf, x, reservas);
      const wh = LS.ler('ambar_demo_wellhub', {})[a.cpf];
      const whPode = !wh ? { ok: false, motivo: 'Ative o Wellhub em Meu plano para reservar com ele.' }
        : reservas.some((y) => y.cpf === a.cpf && y.credito === 'WELLHUB' && y.data === x.data && y.status !== 'cancelado')
          ? { ok: false, motivo: 'Pelo Wellhub é possível 1 aula por dia.' } : { ok: true };
      if (!credito && d.usarWellhub) {
        if (!whPode.ok) throw new Error(whPode.motivo);
        r.credito = 'WELLHUB';
        reservas.push(r);
        LS.gravar('ambar_demo_reservas', reservas);
        return { ...r, credito: 'Wellhub', wellhub: true };
      }
      if (!credito) {
        const avulsa = PLANOS_DEMO.find((p) => p.id === x.modalidade.toLowerCase() + '-avulsa');
        if (!d.pagarAvulsa) throw erroApi(`Você não tem aulas de ${x.modalidade} disponíveis.`, 'SEM_CREDITO', { avulsa, wellhub: { status: wh ? 'pendente' : 'nao_informado', pode: whPode } });
        const pg = demoCriarPagamento(a, avulsa, { reservaId: r.id });
        reservas.push({ ...r, status: 'pendente', pagamento: pg.order_nsu, expira: Date.now() + 20 * 60e3 });
        LS.gravar('ambar_demo_reservas', reservas);
        return { pagamento: pg };
      }
      r.credito = credito.id;
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
    case 'minhaFicha': {
      const a = sessao(d.token);
      const f = fichas[a.cpf];
      if (!f) return null;
      return { ...f, preenchida_em: f.preenchidaEm || '', declaracao: false, consentimento: false };
    }
    case 'salvarAnamnese': {
      const a = sessao(d.token);
      const f = d.ficha || {};
      if (!f.declaracao || !f.consentimento) throw new Error('É preciso marcar a declaração e o consentimento.');
      fichas[a.cpf] = { ...f, preenchidaEm: new Date().toISOString() };
      LS.gravar('ambar_demo_fichas', fichas);
      return { ok: true, alerta: [1, 2, 3, 4, 5, 6, 7].some((n) => f['parq_' + n] === 'sim') };
    }
    case 'meuPlano': {
      const a = sessao(d.token);
      const hoje = isoData(new Date());
      const creditos = LS.ler('ambar_demo_creditos', [])
        .filter((c) => c.cpf === a.cpf && c.fim >= hoje)
        .map((c) => {
          const limite = c.aulasSemana > 0 ? c.aulasSemana : c.aulasTotal;
          const usadas = demoUso(c, reservas, hoje);
          return { ...c, usadas, limite, restantes: Math.max(0, limite - usadas) };
        });
      const pagamentos = LS.ler('ambar_demo_pagamentos', []).filter((p) => p.cpf === a.cpf).reverse();
      const whId = LS.ler('ambar_demo_wellhub', {})[a.cpf];
      return { catalogo: PLANOS_DEMO, creditos, pagamentos, wellhub: { status: whId ? 'pendente' : 'nao_informado', id: whId || '', modalidades: ['Yoga', 'Pilates'], planoMinimo: 'Gold+' } };
    }
    // contrato dos planos: o modo demonstração não tem (só a Casa real)
    case 'contratoDoPlano':
      return { ficha: !!fichas[sessao(d.token).cpf], exige: false, assinado: false };
    case 'assinarContrato':
      return { assinado: true };
    case 'comprar': {
      const a = sessao(d.token);
      const plano = PLANOS_DEMO.find((p) => p.id === d.planoId);
      if (!plano) throw new Error('Plano não encontrado.');
      if (plano.tipo === 'trimestral') throw erroApi('O plano trimestral em até 3x sem juros é feito com a nossa atendente.', 'TRIMESTRAL_ATENDENTE');
      return demoCriarPagamento(a, plano, {});
    }
    case 'ativarWellhub': {
      const a = sessao(d.token);
      if (String(d.wellhubId || '').replace(/\D/g, '').length < 6) throw new Error('Confira o seu ID Wellhub (fica no app Wellhub, no seu perfil).');
      if (!d.confirmo) throw new Error('Confirme que seu plano Wellhub é Gold+ ou superior.');
      const todos = LS.ler('ambar_demo_wellhub', {});
      todos[a.cpf] = String(d.wellhubId);
      LS.gravar('ambar_demo_wellhub', todos);
      return { status: 'pendente', id: todos[a.cpf] };
    }
    case 'confirmarPagamento': {
      const a = sessao(d.token);
      const pagamentos = LS.ler('ambar_demo_pagamentos', []);
      const pg = pagamentos.find((p) => p.orderNsu === d.orderNsu && p.cpf === a.cpf);
      if (!pg) throw new Error('Pagamento não encontrado.');
      let reserva = null;
      if (pg.status !== 'pago' && d.demo) {
        pg.status = 'pago';
        pg.pagoEm = new Date().toISOString();
        pg.metodo = 'Pix';
        pg.parcelas = 1;
        pg.recibo = '';
        pg.link = '';
        const plano = PLANOS_DEMO.find((p) => p.id === pg.planoId);
        const hoje = isoData(new Date());
        const fim = new Date();
        fim.setDate(fim.getDate() + plano.validadeDias - 1);
        const creditos = LS.ler('ambar_demo_creditos', []);
        const credito = { id: 'C' + pg.orderNsu.slice(1), cpf: a.cpf, planoId: plano.id, descricao: plano.nome, modalidade: plano.modalidade, tipo: plano.tipo,
          aulasSemana: plano.aulasSemana, aulasTotal: plano.aulasTotal, inicio: hoje, fim: isoData(fim) };
        creditos.push(credito);
        LS.gravar('ambar_demo_creditos', creditos);
        const r = reservas.find((x) => x.id === pg.reservaId);
        if (r) { r.status = 'reservado'; r.credito = credito.id; delete r.expira; }
        LS.gravar('ambar_demo_reservas', reservas);
        LS.gravar('ambar_demo_pagamentos', pagamentos);
      }
      const r = reservas.find((x) => x.id === pg.reservaId);
      if (r) reserva = { id: r.id, status: r.status, data: r.data, hora: r.hora, modalidade: r.modalidade, professor: r.professor, tapete: r.tapete };
      return { status: pg.status, descricao: pg.descricao, valor: pg.valor, recibo: pg.recibo, reserva };
    }
    case 'minhasReservas': {
      const a = sessao(d.token);
      return reservas
        .filter((r) => r.cpf === a.cpf && r.status !== 'cancelado' && r.status !== 'pendente')
        .map((r) => ({ ...r, wellhub: r.credito === 'WELLHUB' }))
        .sort((x, y) => (x.data + x.hora).localeCompare(y.data + y.hora));
    }
    case 'descartarPagamento': {
      const lista = LS.ler('ambar_demo_pagamentos', []).filter((p) => p.orderNsu !== d.orderNsu);
      LS.gravar('ambar_demo_pagamentos', lista);
      return true;
    }
    case 'regras':
      return { checkinAbreMinAntes: CONFIG.checkinAbreMinAntes, cancelarAteHorasAntes: CONFIG.cancelarAteHorasAntes, diasVisiveis: CONFIG.diasVisiveis, wellhubAtivo: true };
    case 'verConfirmacao':
    case 'responderConfirmacao':
      throw new Error('A confirmação de horário funciona só no sistema real.');
    case 'entrarEspera':
    case 'sairEspera':
      return { naEspera: acao === 'entrarEspera' };
    case 'validarCodigo':
    case 'resgatarVale':
      throw new Error('Cupons e vales funcionam só no sistema real.');
    case 'esqueciSenha':
      return { email: 'ma***@gm***.com' };
    case 'salvarEndereco':
      return publico(sessao(d.token));
    case 'salvarEmail': {
      const a = sessao(d.token);
      return { ...publico(a), email: d.email };
    }
    case 'minhaConta':
    case 'salvarConta':
    case 'trocarEmail': {
      const a = alunos[sessao(d.token).cpf];
      const x = d.dados || {};
      if (acao === 'trocarEmail' && a.senha !== (await hash(a.cpf + ':' + d.senha))) throw new Error('A senha atual não confere.');
      if (acao !== 'minhaConta') {
        Object.assign(a, x.nome ? { nome: x.nome } : {}, x.whatsapp ? { whatsapp: x.whatsapp } : {}, x.endereco ? { endereco: x.endereco } : {},
          x.nascimento != null ? { nascimento: x.nascimento } : {}, x.novidades != null ? { novidades: x.novidades } : {}, d.email ? { email: d.email } : {});
        LS.gravar('ambar_demo_alunos', alunos);
      }
      return { aluno: publico(a), nome: a.nome, cpf: a.cpf, whatsapp: a.whatsapp, email: a.email || '', nascimento: a.nascimento || '', novidades: a.novidades !== false,
        endereco: a.endereco || { cep: '60150-160', endereco: 'Rua Eduardo Salgado', numero: '448', complemento: '', bairro: 'Aldeota', cidade: 'Fortaleza', uf: 'CE' } };
    }
    case 'trocarSenha': {
      const a = alunos[sessao(d.token).cpf];
      if (a.senha !== (await hash(a.cpf + ':' + d.senhaAtual))) throw new Error('A senha atual não confere.');
      a.senha = await hash(a.cpf + ':' + d.senha);
      LS.gravar('ambar_demo_alunos', alunos);
      return { token: novoToken(a.cpf), aluno: publico(a) };
    }
    default:
      throw new Error('Ação desconhecida.');
  }
}
