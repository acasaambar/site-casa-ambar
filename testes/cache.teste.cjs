// Cache das abas (com versão): telas leem do cache, gravações trocam a versão, e dentro da trava
// a decisão (horário livre, CPF repetido) é sempre com a planilha de verdade.
const { criar } = require('./simulador.cjs');
const R = require('path').join(__dirname, '..', 'apps-script');
const m = criar([R + '/Codigo.gs', R + '/Seguranca.gs', R + '/Vales.gs', R + '/Bancada.gs', R + '/Relatorios.gs', R + '/Servicos.gs', R + '/Gestao.gs', R + '/Clientes.gs', R + '/Marketing.gs', R + '/Substituicoes.gs', R + '/Espera.gs', R + '/Contrato.gs']);
const { ctx, ss, emails } = m;
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); } else console.log('  ✓', msg); };
const linkDe = (e) => (e.body.match(/t=([a-f0-9]+)/) || [])[1];
// chamada que devolve também a medida (o chamar do simulador já devolve o JSON inteiro)
const pedir = (acao, d) => m.chamar(acao, d);
const hoje = ctx.hojeTexto();
ctx.configurarPlanilha();
ctx.autorizarEmails(); pedir('novaSenha', { t: linkDe(emails.at(-1)), senha: 'ambar2026adm' });
const adm = pedir('b_entrar', { email: 'contato@acasaambar.com.br', senha: 'ambar2026adm' }).dados.token;
pedir('b_salvarProfissional', { token: adm, profissional: { nome: 'Cintia', categorias: ['Estética facial', 'Estética corporal'], dias: [0, 1, 2, 3, 4, 5, 6], inicio: '08:00', fim: '18:00', comissao: 20 } });
let dia = ctx.somarDias(hoje, 3); while ([0, 6].includes(new Date(dia + 'T12:00:00Z').getUTCDay())) dia = ctx.somarDias(dia, 1);
const seg = ctx.segundaDe ? ctx.segundaDe(dia) : ctx.somarDias(dia, -((new Date(dia + 'T12:00:00Z').getUTCDay() + 6) % 7));
let r;

console.log('— leitura pelo cache');
{
  pedir('b_agendaSemana', { token: adm, de: seg });
  r = pedir('b_agendaSemana', { token: adm, de: seg });
  ok(r.ok && r.medida && r.medida.cache > 0, 'a segunda vez vem do cache', r.medida);
  ok(r.medida.planilha <= 1, 'quase nada da planilha na segunda vez', r.medida);
  ok(typeof r.medida.ms === 'number', 'a resposta traz o tempo no servidor');
}

console.log('— gravou, aparece na hora');
{
  r = pedir('b_agendarServico', { token: adm, servicoId: 'drenagem', profissional: 'Cintia', data: dia, hora: '10:00', cliente: { nome: 'Ana Cache', whatsapp: '85911112222' }, pagamento: 'no_dia' });
  ok(r.ok, 'agendou', r.erro);
  const id = r.dados && r.dados.id;
  r = pedir('b_agendaSemana', { token: adm, de: seg });
  ok(r.dados.atendimentos.some((a) => a.id === id && a.hora === '10:00'), 'a agenda da semana já mostra o agendamento novo');
  r = pedir('b_atualizarAtendimento', { token: adm, id, status: 'cancelado' });
  r = pedir('b_agendaSemana', { token: adm, de: seg });
  ok(!r.dados.atendimentos.some((a) => a.id === id), 'cancelou: some da agenda na hora');
  r = pedir('b_novoAluno', { token: adm, nome: 'Bruno Cache Novo', whatsapp: '85933334444' });
  ok(r.ok && r.dados.ficha && r.dados.ficha.nome === 'Bruno Cache Novo', 'cadastro novo já devolve a ficha (abre na hora)', r.erro || r.dados);
  r = pedir('b_alunos', { token: adm, busca: 'cache novo' });
  ok(r.ok && r.dados.some((a) => a.nome === 'Bruno Cache Novo'), 'a busca já acha o cliente novo');
}

console.log('— cache velho não marca dois no mesmo horário');
{
  ss.__semLimparCache = true; // mexer na planilha "à mão" sem avisar o cache
  pedir('b_agendaSemana', { token: adm, de: seg }); // cache cheio com a agenda de agora
  const s = ss.sheets.Atendimentos, cab = s.rows[0];
  const linha = cab.map((c) => ({ id: 'AMANUAL1', data: dia, hora: '14:00', duracao_min: 60, servico_id: 'drenagem', servico: 'Drenagem', categoria: 'Estética corporal',
    profissional: 'Cintia', nome: 'Feito à Mão', status: 'agendado', pagamento: 'no_dia', valor: 100 })[c] ?? '');
  s.rows.push(linha);
  r = pedir('b_agendaSemana', { token: adm, de: seg });
  ok(!r.dados.atendimentos.some((a) => a.id === 'AMANUAL1'), 'mudança à mão ainda não aparece (cópia do cache)');
  r = pedir('b_agendarServico', { token: adm, servicoId: 'drenagem', profissional: 'Cintia', data: dia, hora: '14:00', cliente: { nome: 'Carla Choque', whatsapp: '85955556666' }, pagamento: 'no_dia' });
  ok(!r.ok && /já atende|ocupado|Escolha outro/i.test(r.erro || ''), 'mas o agendamento confere a planilha de verdade e recusa', r.erro || r.dados);
  r = pedir('b_lerPlanilhaDeNovo', { token: adm });
  ok(r.ok, 'administração: ler a planilha de novo');
  r = pedir('b_agendaSemana', { token: adm, de: seg });
  ok(r.dados.atendimentos.some((a) => a.id === 'AMANUAL1'), 'depois disso a mudança à mão aparece');
  ss.__semLimparCache = false;
}

console.log('— cliente repetido: confere a planilha dentro da trava');
{
  ss.__semLimparCache = true;
  pedir('b_alunos', { token: adm });
  const s = ss.sheets.Alunos, cab = s.rows[0];
  s.rows.push(cab.map((c) => ({ cpf: '52998224725', nome: 'Maria Manual', whatsapp: '85977778888', ativo: 'SIM' })[c] ?? ''));
  r = pedir('b_novoAluno', { token: adm, cpf: '52998224725', nome: 'Maria Outra', whatsapp: '85977779999' });
  ok(!r.ok && /já tem cadastro/i.test(r.erro || ''), 'CPF que entrou à mão é recusado (sem duplicar)', r.erro || r.dados);
  ss.__semLimparCache = false;
}

console.log('— segurança');
{
  const rec = (() => {
    pedir('b_salvarMembro', { token: adm, membro: { email: 'bia@acasaambar.com.br', nome: 'Bia Santos', papel: 'recepcao' } });
    pedir('novaSenha', { t: linkDe(emails.at(-1)), senha: 'recep2026ok' });
    return pedir('b_entrar', { email: 'bia@acasaambar.com.br', senha: 'recep2026ok' }).dados.token;
  })();
  ok(!pedir('b_lerPlanilhaDeNovo', { token: rec }).ok, 'recepção não pode esvaziar o cache');
  ok(!pedir('b_lerPlanilhaDeNovo', {}).ok, 'sem login: recusado');
}

console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
