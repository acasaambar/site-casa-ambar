// Datas e horas da planilha: o agendamento fica no dia e na hora marcados, mesmo com a planilha
// em outro fuso (bug de out/2026: 27/10 09:00 aparecia em 26/10 01:00).
// O simulador imita o Google: appendRow transforma "2026-10-27" e "09:00" em data/hora mesmo na coluna de texto,
// e a planilha informa um fuso diferente do das datas guardadas.
const { criar } = require('./simulador.cjs');
const R = require('path').join(__dirname, '..', 'apps-script');
const m = criar([R + '/Codigo.gs', R + '/Seguranca.gs', R + '/Vales.gs', R + '/Bancada.gs', R + '/Relatorios.gs', R + '/Servicos.gs', R + '/Gestao.gs', R + '/Clientes.gs', R + '/Marketing.gs', R + '/Substituicoes.gs', R + '/Espera.gs']);
const { ctx, chamar, emails, ss } = m;
ss.__fuso = 'America/Fortaleza';
ss.__appendIgnoraTexto = true;
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 600) : ''); } else console.log('  ✓', msg); };
const linkDe = (e) => (e.body.match(/t=([a-f0-9]+)/) || [])[1];
const hoje = ctx.hojeTexto();
ctx.configurarPlanilha();
ctx.autorizarEmails(); chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'ambar2026adm' });
const adm = chamar('b_entrar', { email: 'contato@acasaambar.com.br', senha: 'ambar2026adm' }).dados.token;
chamar('b_salvarProfissional', { token: adm, profissional: { nome: 'Cintia', categorias: ['Estética facial', 'Estética corporal'], dias: [0, 1, 2, 3, 4, 5, 6], inicio: '08:00', fim: '18:00', comissao: 20 } });
let dia = ctx.somarDias(hoje, 6); while ([0, 6].includes(new Date(dia + 'T12:00:00Z').getUTCDay())) dia = ctx.somarDias(dia, 1);
const linhaDe = (id) => { const s = ss.sheets.Atendimentos; return s.rows.find((l) => l[0] === id); };
let r;

console.log('— agendar e ler de volta (planilha em outro fuso)');
{
  r = chamar('b_agendarServico', { token: adm, servicoId: 'drenagem', profissional: 'Cintia', data: dia, hora: '09:00', cliente: { nome: 'Fábio Teste', whatsapp: '85988887777' }, pagamento: 'no_dia' });
  ok(r.ok && r.dados.data === dia && r.dados.hora === '09:00', 'o agendamento volta no dia e na hora marcados', r.dados || r.erro);
  const id = r.dados && r.dados.id;
  r = chamar('b_atendimentos', { token: adm, de: dia, dias: 1 });
  const a = r.ok && r.dados.atendimentos.find((x) => x.id === id);
  ok(a && a.data === dia && a.hora === '09:00', 'a agenda do dia mostra 9h (não 6h nem outro dia)', a);
  const l = linhaDe(id);
  ok(l && l[1] === dia && l[2] === '09:00', 'a planilha fica com data e hora em texto (sem fuso)', l && l.slice(0, 3));
  r = chamar('b_horarios', { token: adm, servicoId: 'drenagem', profissional: 'Cintia', data: dia });
  ok(r.ok && !r.dados.horarios.includes('09:00') && !r.dados.horarios.includes('09:30') && r.dados.horarios.includes('08:00'), 'o horário ocupado sai dos livres', r.dados && r.dados.horarios.slice(0, 8));
  r = chamar('b_agendarServico', { token: adm, servicoId: 'drenagem', profissional: 'Cintia', data: dia, hora: '15:00', reagendarId: id });
  ok(r.ok && r.dados.data === dia && r.dados.hora === '15:00', 'reagendar leva para 15h', r.dados || r.erro);
  const reg = ss.sheets.Registro.rows.map((x) => String(x[3])).filter((t) => t.includes('→')).pop();
  ok(reg && reg.includes(dia + ' 09:00 → ' + dia + ' 15:00'), 'o registro mostra de 9h para 15h', reg);
}

console.log('— linhas antigas guardadas como data/hora pela planilha');
{
  const s = ss.sheets.Atendimentos;
  const cab = s.rows[0];
  const id = 'A' + Date.now();
  const comoData = (txt, iso) => Object.assign(new Date(iso), { _tela: txt });
  // como na planilha real: o Date do Google NÃO bate com o fuso informado; o texto da tela, sim
  const linha = cab.map((c) => ({ id, data: comoData(dia, dia + 'T05:00:00Z'), hora: comoData('11:30', '1899-12-30T16:30:00Z'), duracao_min: 90, servico_id: 'drenagem', servico: 'Drenagem',
    categoria: 'Estética corporal', profissional: 'Cintia', nome: 'Sarah Antiga', status: 'agendado', pagamento: 'no_dia', valor: 100 })[c] ?? '');
  s.rows.push(linha);
  r = chamar('b_atendimentos', { token: adm, de: dia, dias: 1 });
  const a = r.ok && r.dados.atendimentos.find((x) => x.id === id);
  ok(a && a.data === dia && a.hora === '11:30', 'lê o que a planilha mostra (11:30 no dia certo)', a);
  const l = linhaDe(id);
  ok(l && l[1] === dia && l[2] === '11:30', 'e passa a guardar como texto', l && l.slice(0, 3).map(String));
}

console.log('— formatos que a planilha pode mostrar');
{
  const d = new Date('2026-10-27T03:00:00Z');
  ok(ctx.textoDeData('27/10/2026', d) === '2026-10-27', 'dd/mm/aaaa');
  ok(ctx.textoDeData('27/10/2026 09:05:00', d) === '2026-10-27 09:05:00', 'dd/mm/aaaa hh:mm:ss');
  ok(ctx.textoDeData('2026-10-21 11:44:23', d) === '2026-10-21 11:44:23', 'aaaa-mm-dd hh:mm:ss');
  ok(ctx.textoDeData('2026-10-21 00:00:00', d) === '2026-10-21', 'meia-noite vira só a data');
  ok(ctx.textoDeData('9:00', d) === '09:00', 'hora sem zero na frente');
  ok(ctx.textoDeData('09:00:00', d) === '09:00', 'hora com segundos');
}

console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
