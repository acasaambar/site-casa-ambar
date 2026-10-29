// Observação do atendimento (campo livre no detalhe da agenda): grava, limpa, mantém o "Reagendado de …" e respeita quem pode.
const { m, adm, hojeS } = require('./servidor.cjs');
const { chamar, ctx } = m;
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); } else console.log('  ✓', msg); };
const rec = chamar('b_entrar', { email: 'bia@acasaambar.com.br', senha: 'recep2026ok' }).dados.token;
const lia = chamar('b_entrar', { email: 'lia@gmail.com', senha: 'liamoura2026' }).dados.token;
const cat = chamar('b_catalogoServicos', { token: adm }).dados;
const prof = cat.profissionais.find((p) => p.ativo && p.nome.startsWith('Lia')) || cat.profissionais.find((p) => p.ativo);
const outra = cat.profissionais.find((p) => p.ativo && p.nome !== prof.nome && !/^lia/i.test(p.nome));
const serv = cat.servicos.find((s) => s.ativo && (!prof.servicos.length || prof.servicos.some((c) => c.id === s.id)));
const proximo = (nome, ini) => { for (let i = ini; i < ini + 7; i++) { const dia = ctx.somarDias(hojeS, i); const h = chamar('b_horarios', { token: rec, servicoId: serv.id, profissional: nome, data: dia }).dados; if (h && h.horarios && h.horarios.length > 3) return { dia, hora: h.horarios[2] }; } return null; };
const q = proximo(prof.nome, 1);
const at = chamar('b_agendarServico', { token: rec, servicoId: serv.id, profissional: prof.nome, data: q.dia, hora: q.hora, cliente: { nome: 'Obs Teste', whatsapp: '85944445555' }, pagamento: 'no_dia' }).dados;
const ver = (id) => chamar('b_agendaSemana', { token: rec, de: ctx.somarDias(q.dia, -((new Date(q.dia + 'T12:00:00Z').getUTCDay() + 6) % 7)) }).dados.atendimentos.find((x) => x.id === id);

console.log('— salvar e ler');
let r = chamar('b_observacaoAtendimento', { token: rec, id: at.id, obs: '  Chega 10 min antes.\nPrefere sala silenciosa.  ' });
ok(r.ok && r.dados.obs === 'Chega 10 min antes.\nPrefere sala silenciosa.', 'recepção salva a observação (sem espaços sobrando)', r.erro || r.dados);
ok(ver(at.id).obs.includes('Chega 10 min antes.'), 'a agenda mostra a observação salva');
r = chamar('b_observacaoAtendimento', { token: rec, id: at.id, obs: 'x'.repeat(900) });
ok(r.ok && r.dados.obs.length <= 400, 'texto muito longo é cortado em 400 letras', r.dados && r.dados.obs.length);
r = chamar('b_observacaoAtendimento', { token: rec, id: at.id, obs: '' });
ok(r.ok && r.dados.obs === '', 'apagar o texto limpa a observação');
ok(!chamar('b_observacaoAtendimento', { token: rec, id: 'nao-existe', obs: 'a' }).ok, 'atendimento que não existe é recusado');
ok(!chamar('b_observacaoAtendimento', { obs: 'a', id: at.id }).ok, 'sem login: recusado');

console.log('— reagendar mantém o aviso do sistema e a observação');
chamar('b_observacaoAtendimento', { token: rec, id: at.id, obs: 'Alergia a lavanda' });
const q2 = proximo(prof.nome, 2);
if (q2 && (q2.dia !== q.dia || q2.hora !== q.hora)) {
  const re = chamar('b_agendarServico', { token: rec, servicoId: serv.id, profissional: prof.nome, data: q2.dia, hora: q2.hora, reagendarId: at.id, cpf: at.cpf || undefined, cliente: { nome: 'Obs Teste', whatsapp: '85944445555' }, pagamento: 'no_dia' });
  const dep = re.ok ? re.dados : null;
  ok(dep && /^Reagendado de /.test(dep.obs) && /Alergia a lavanda/.test(dep.obs), 'reagendado: "Reagendado de …" na frente e a observação junto', re.erro || (dep && dep.obs));
  r = chamar('b_observacaoAtendimento', { token: rec, id: at.id, obs: 'Nova observação' });
  ok(r.ok && /^Reagendado de [^.]*\.\s*Nova observação$/.test(r.dados.obs), 'editar depois mantém o "Reagendado de …" do sistema', r.dados && r.dados.obs);
}

console.log('— profissional: só o que é dela');
r = chamar('b_observacaoAtendimento', { token: lia, id: at.id, obs: 'Lia anotou' });
ok(r.ok, 'a profissional anota no próprio atendimento', r.erro);
if (outra) {
  const q3 = proximo(outra.nome, 1);
  if (q3) {
    const at2 = chamar('b_agendarServico', { token: rec, servicoId: serv.id, profissional: outra.nome, data: q3.dia, hora: q3.hora, cliente: { nome: 'Obs Outra', whatsapp: '85955556666' }, pagamento: 'no_dia' });
    if (at2.ok) ok(!chamar('b_observacaoAtendimento', { token: lia, id: at2.dados.id, obs: 'não pode' }).ok, 'a profissional não anota no atendimento de colega');
  }
}
if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\nTudo certo (observação do atendimento)');
