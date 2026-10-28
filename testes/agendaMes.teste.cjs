// Agenda do mês (b_agendaMes, tela Agenda → Mês no celular): 6 semanas numa ida só, sem reservas nem dados da cliente;
// a profissional recebe só o que é dela.
const { m, adm, hojeS } = require('./servidor.cjs');
const { chamar, ctx } = m;
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); } else console.log('  ✓', msg); };
const rec = chamar('b_entrar', { email: 'bia@acasaambar.com.br', senha: 'recep2026ok' }).dados.token;
const lia = chamar('b_entrar', { email: 'lia@gmail.com', senha: 'liamoura2026' }).dados.token;
const seg = (d) => ctx.somarDias(d, -((new Date(d + 'T12:00:00Z').getUTCDay() + 6) % 7));
const de = seg(ctx.somarDias(hojeS, -(Number(hojeS.slice(8)) - 1))); // segunda em que o calendário do mês de hoje começa

const cat = chamar('b_catalogoServicos', { token: adm }).dados;
const prof = cat.profissionais.find((p) => p.ativo && p.nome.startsWith('Lia')) || cat.profissionais.find((p) => p.ativo);
const outra = cat.profissionais.find((p) => p.ativo && p.nome !== prof.nome);
const servP = cat.servicos.find((s) => s.ativo && (!prof.servicos.length || prof.servicos.some((c) => c.id === s.id)));

console.log('— forma e tamanho');
let r = chamar('b_agendaMes', { token: rec, de });
ok(r.ok, 'recepção abre o mês', r);
const mes = r.dados;
ok(mes.de === de && mes.dias === 42, '42 dias a partir da segunda pedida', { de: mes.de, dias: mes.dias });
ok(Array.isArray(mes.atendimentos) && Array.isArray(mes.aulas) && Array.isArray(mes.folgas), 'listas de atendimentos, aulas e folgas');
ok(mes.aulas.length > 0, 'traz as aulas do mês (grade do exemplo)', mes.aulas.length);
ok(mes.aulas.every((a) => !('reservas' in a) && ['id', 'data', 'hora', 'modalidade', 'professor', 'ocupadosQtd', 'capacidade'].every((k) => k in a)), 'aula só com o que o calendário mostra (sem reservas)');
ok(!chamar('b_agendaMes', { de }).ok, 'sem login: recusado');
ok(chamar('b_agendaMes', { token: adm, de, dias: 500 }).dados.dias === 42, 'no máximo 42 dias');

console.log('— atendimento aparece, sem dados da cliente');
const horas = chamar('b_horarios', { token: rec, servicoId: servP.id, profissional: prof.nome, data: hojeS }).dados.horarios;
let dia = hojeS, hora = horas[0];
if (!hora) { dia = ctx.somarDias(hojeS, 1); hora = chamar('b_horarios', { token: rec, servicoId: servP.id, profissional: prof.nome, data: dia }).dados.horarios[0]; }
const at = chamar('b_agendarServico', { token: rec, servicoId: servP.id, profissional: prof.nome, data: dia, hora, cliente: { nome: 'Mes Teste', whatsapp: '85933334444' }, pagamento: 'no_dia' }).dados;
ok(at && at.id, 'atendimento criado para o teste', at);
const d2 = ctx.somarDias(mes.de, 41) >= dia && dia >= mes.de;
const m2 = chamar('b_agendaMes', { token: rec, de }).dados;
const ach = m2.atendimentos.find((a) => a.id === at.id);
ok(d2 ? !!ach : true, 'o atendimento está no mês', m2.atendimentos.length);
ok(!ach || (!('cpf' in ach) && !('whatsapp' in ach) && !('valor' in ach) && ach.profissional === prof.nome), 'só hora, cor, status, profissional e nome');

console.log('— profissional só vê o que é dela');
if (outra) {
  const horasO = chamar('b_horarios', { token: rec, servicoId: servP.id, profissional: outra.nome, data: dia }).dados;
  if (horasO && horasO.horarios && horasO.horarios[0]) {
    const atO = chamar('b_agendarServico', { token: rec, servicoId: servP.id, profissional: outra.nome, data: dia, hora: horasO.horarios[0], cliente: { nome: 'Mes Outra', whatsapp: '85922223333' }, pagamento: 'no_dia' });
    if (atO.ok) {
      const mL = chamar('b_agendaMes', { token: lia, de });
      ok(mL.ok, 'profissional abre o mês', mL);
      ok(mL.dados.atendimentos.every((a) => a.profissional !== outra.nome || /^lia/i.test(outra.nome)), 'não vê atendimento de colega');
    }
  }
}
if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\nTudo certo (agenda do mês)');
