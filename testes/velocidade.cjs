// Mede quantas vezes cada ação da bancada vai à planilha (é o que deixa o Apps Script lento).
// Rode: npm run velocidade
// Leitura = getValues (cada uma custa ~0,1–0,5 s no Google); gravação = setValue/setValues/appendRow (~0,1 s cada).
const { m, adm, hojeS } = require('./servidor.cjs');
const { chamar, ss } = m;

const cont = { leituras: 0, celulas: 0, gravacoes: 0, outras: 0 };
const folha = Object.values(ss.sheets)[0];
const ProtoAba = Object.getPrototypeOf(folha);
const ProtoFaixa = Object.getPrototypeOf(folha.getRange(1, 1));
const embrulhar = (proto, nome, tipo) => {
  const orig = proto[nome];
  proto[nome] = function (...a) {
    cont[tipo]++;
    if (process.env.DETALHE && tipo !== 'outras') cont.abas.push(tipo[0] + ':' + (this.name || this.sh.name) + (this.r ? '@' + this.r + 'x' + this.nr : ''));
    const r = orig.apply(this, a);
    if (nome === 'getValues') cont.celulas += r.length * (r[0] || []).length;
    return r;
  };
};
embrulhar(ProtoFaixa, 'getValues', 'leituras');
['setValues', 'setValue'].forEach((n) => embrulhar(ProtoFaixa, n, 'gravacoes'));
embrulhar(ProtoAba, 'appendRow', 'gravacoes');
['getLastRow', 'getLastColumn'].forEach((n) => embrulhar(ProtoAba, n, 'outras'));
// consultas ao cache do Google (rápidas, ~0,02 s) contam como "outras"
const cacheOrig = m.ctx.CacheService.getScriptCache;
m.ctx.CacheService.getScriptCache = () => {
  const c = cacheOrig();
  return { get: (k) => { cont.outras++; return c.get(k); }, put: (k, v, t) => { cont.outras++; return c.put(k, v, t); }, remove: (k) => { cont.outras++; return c.remove(k); },
    getAll: (ks) => { cont.outras++; return c.getAll(ks); }, putAll: (o, t) => { cont.outras++; return c.putAll(o, t); } };
};
const ssGet = ss.getSheetByName;
ss.getSheetByName = function (n) { cont.outras++; return ssGet.call(this, n); };

const medir = (rotulo, acao, dados) => {
  Object.keys(cont).forEach((k) => (cont[k] = 0));
  cont.abas = [];
  const r = chamar(acao, { token: adm, ...dados });
  if (!r.ok) console.log('   erro em', acao, r.erro);
  // estimativa grosseira do tempo no Google: 0,25 s por leitura, 0,1 s por gravação, 0,02 s por consulta simples
  const est = cont.leituras * 0.25 + cont.gravacoes * 0.1 + cont.outras * 0.02;
  console.log(`${rotulo.padEnd(34)} leituras ${String(cont.leituras).padStart(3)}  gravações ${String(cont.gravacoes).padStart(3)}  outras ${String(cont.outras).padStart(3)}  ≈ ${est.toFixed(1)} s`);
  if (process.env.DETALHE) console.log('   ', cont.abas.join(' '));
  return { ...cont, est, r };
};

const total = [];
const t = (...a) => { const x = medir(...a); total.push(x.est); return x.r; };
console.log('— telas');
t('Hoje (resumo)', 'b_resumo', {});
t('Agenda de aulas', 'b_agenda', { de: hojeS, dias: 1 });
t('Agenda de serviços', 'b_atendimentos', { de: hojeS, dias: 1 });
t('Agenda (semana inteira)', 'b_agendaSemana', { de: m.ctx.somarDias(hojeS, -((new Date(hojeS + 'T12:00:00Z').getUTCDay() + 6) % 7)) });
const cat = t('Catálogo de serviços', 'b_catalogoServicos', {}).dados;
t('Clientes', 'b_alunos', {});
t('Comandas', 'b_comandas', {});
t('Caixa do dia', 'b_caixa', {});
t('Estoque', 'b_produtos', {});
t('Financeiro', 'b_financeiro', {});
t('Comissões', 'b_comissoes', {});
t('Relatórios', 'b_relatorio', {});
t('Vendas', 'b_pagamentos', {});
console.log('— ações');
const prof = cat.profissionais[0].nome;
const h = t('Horários livres', 'b_horarios', { servicoId: 'drenagem', profissional: prof, data: m.ctx.somarDias(hojeS, 2) }).dados;
const ag = t('Agendar serviço', 'b_agendarServico', { servicoId: 'drenagem', profissional: prof, data: m.ctx.somarDias(hojeS, 2), hora: h.horarios[0], cliente: { nome: 'Teste Velocidade', whatsapp: '85990001111' } }).dados;
t('Marcar atendido (comissão)', 'b_atualizarAtendimento', { id: ag.id, status: 'atendido' });
const cm = t('Comanda do atendimento', 'b_comandaDoAtendimento', { atendimentoId: ag.id }).dados;
t('Fechar comanda', 'b_fecharComanda', { id: cm.id, pagamentos: [{ metodo: 'Pix', valor: cm.total }] });
t('Salvar profissional', 'b_salvarProfissional', { profissional: { ...cat.profissionais[0], horarios: undefined, nomeOriginal: prof,
  servicos: cat.servicos.filter((s) => cat.profissionais[0].categorias.includes(s.categoria)).map((s) => ({ id: s.id, comissao: 30, duracao: '' })) } });
console.log('— área do aluno (site)');
const tokAluno = chamar('entrar', { cpf: '52998224725', senha: 'aluna2026' }).dados.token;
const ta = (rotulo, acao, dados) => { const x = medir(rotulo, acao, { ...dados, token: tokAluno }); total.push(x.est); return x.r; };
ta('Aulas da semana', 'aulas', {});
ta('Minhas reservas', 'minhasReservas', {});
ta('Meu plano', 'meuPlano', {});
ta('Minha conta', 'minhaConta', {});
console.log(`\nSoma estimada: ${total.reduce((a, b) => a + b, 0).toFixed(1)} s`);
