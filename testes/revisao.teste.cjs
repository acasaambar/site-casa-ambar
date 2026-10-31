// Revisão pré-lançamento (out/2026): correções de segurança e operação apontadas pelos revisores.
const { m, adm, hojeS } = require('./servidor.cjs');
const { chamar, ctx } = m;
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); } else console.log('  ✓', msg); };
const rec = chamar('b_entrar', { email: 'bia@acasaambar.com.br', senha: 'recep2026ok' }).dados.token;
const cat = chamar('b_catalogoServicos', { token: adm }).dados;
let r;

console.log('— comanda: uid estranho não quebra o pacote');
{
  const pac = cat.pacotes.find((p) => p.ativo !== false);
  const sv = cat.servicos.find((s) => s.id === pac.servicoId);
  const pr = cat.profissionais.find((p) => p.ativo && (!p.servicos.length || p.servicos.some((c) => c.id === sv.id)));
  const cpf = chamar('b_novoAluno', { token: rec, nome: 'Uid Estranho', whatsapp: '85977776666' }).dados.cpf;
  const cm = chamar('b_salvarComanda', { token: rec, comanda: { cpf, itens: [{ uid: '__proto__', tipo: 'pacote', id: pac.id, nome: pac.nome, qtd: 1 }, { uid: 'constructor', tipo: 'servico', id: sv.id, nome: sv.nome, profissional: pr.nome }] } }).dados;
  ok(cm && cm.itens.every((i) => /^I\d{12}[A-Z0-9]{5}$/.test(i.uid)), 'uid fora do formato ganha um novo', cm && cm.itens.map((i) => i.uid));
  r = chamar('b_fecharComanda', { token: rec, id: cm.id, pagamentos: [{ metodo: 'Pix', valor: cm.total }] });
  ok(r.ok, 'fecha normalmente', r.erro);
  const c = chamar('b_creditosServico', { token: rec, cpf, servicoId: sv.id, data: hojeS }).dados;
  const sessoes = Number(pac.sessoes || pac.aulas_total || 0);
  ok(c && c.restantes === sessoes - 1, 'a sessão de hoje sai do pacote', c);
}

console.log('— comanda: horário de outra pessoa é recusado');
{
  const sv = cat.servicos.find((s) => s.ativo);
  const pr = cat.profissionais.find((p) => p.ativo && (!p.servicos.length || p.servicos.some((c) => c.id === sv.id)));
  let dia = ctx.somarDias(hojeS, 3); while (new Date(dia + 'T12:00:00Z').getUTCDay() % 6 === 0) dia = ctx.somarDias(dia, 1);
  const h = chamar('b_horarios', { token: rec, servicoId: sv.id, profissional: pr.nome, data: dia }).dados.horarios;
  const at = chamar('b_agendarServico', { token: rec, servicoId: sv.id, profissional: pr.nome, data: dia, hora: h[0], cliente: { nome: 'Joana Outra', whatsapp: '85966665555' }, pagamento: 'no_dia' }).dados;
  const outra = chamar('b_novoAluno', { token: rec, nome: 'Maria Errada', whatsapp: '85955554444' }).dados.cpf;
  r = chamar('b_salvarComanda', { token: rec, comanda: { cpf: outra, itens: [{ tipo: 'servico', id: sv.id, nome: sv.nome, profissional: pr.nome, atendimentoId: at.id }] } });
  ok(!r.ok && /outra pessoa/.test(r.erro), 'comanda não aceita o atendimento de outra cliente', r.erro);
  r = chamar('b_comandaDoAtendimento', { token: rec, atendimentoId: at.id });
  ok(r.ok, 'pela agenda a comanda da própria cliente abre normalmente', r.erro);
}

console.log('— venda duplicada enxerga permuta');
{
  const sv = cat.servicos.find((s) => s.ativo && s.preco > 0);
  const pr = cat.profissionais.find((p) => p.ativo && (!p.servicos.length || p.servicos.some((c) => c.id === sv.id)));
  const cpf = chamar('b_novoAluno', { token: rec, nome: 'Permuta Dupla', whatsapp: '85944443333' }).dados.cpf;
  const fecha = (extra = {}) => {
    const cm = chamar('b_salvarComanda', { token: rec, comanda: { cpf, itens: [{ tipo: 'servico', id: sv.id, nome: sv.nome, profissional: pr.nome }] } }).dados;
    return chamar('b_fecharComanda', { token: rec, id: cm.id, pagamentos: [{ metodo: 'Permuta', valor: cm.total, parceiro: '@blog' }], ...extra });
  };
  ok(fecha().ok, 'primeira permuta fecha');
  ss_semConfirmar(true);
  r = fecha();
  ok(!r.ok && r.codigo === 'VENDA_DUPLICADA', 'a mesma permuta no mesmo dia pede confirmação', r.erro);
  ss_semConfirmar(false);
}
function ss_semConfirmar(v) { m.ss.__semConfirmarSozinho = v; }

console.log('— soma dos pagamentos tem de ser exata');
{
  const sv = cat.servicos.find((s) => s.ativo && s.preco > 0);
  const pr = cat.profissionais.find((p) => p.ativo && (!p.servicos.length || p.servicos.some((c) => c.id === sv.id)));
  const cm = chamar('b_salvarComanda', { token: rec, comanda: { cliente: { nome: 'Centavo Faltando', whatsapp: '85933332222' }, itens: [{ tipo: 'servico', id: sv.id, nome: sv.nome, profissional: pr.nome }] } }).dados;
  r = chamar('b_fecharComanda', { token: rec, id: cm.id, pagamentos: [{ metodo: 'Pix', valor: Math.round((cm.total - 0.01) * 100) / 100 }] });
  ok(!r.ok && /somam/.test(r.erro), 'faltando 1 centavo é recusado', r.erro);
  r = chamar('b_fecharComanda', { token: rec, id: cm.id, pagamentos: [{ metodo: 'Permuta', valor: cm.total, parceiro: { a: 1 } }] });
  ok(!r.ok, 'parceiro da permuta que não é texto é recusado', r.erro);
}

console.log('— observação: texto, sem aspa de proteção na leitura');
{
  const sv = cat.servicos.find((s) => s.ativo);
  const pr = cat.profissionais.find((p) => p.ativo && (!p.servicos.length || p.servicos.some((c) => c.id === sv.id)));
  let dia = ctx.somarDias(hojeS, 5); while (new Date(dia + 'T12:00:00Z').getUTCDay() % 6 === 0) dia = ctx.somarDias(dia, 1);
  const h = chamar('b_horarios', { token: rec, servicoId: sv.id, profissional: pr.nome, data: dia }).dados.horarios;
  const at = chamar('b_agendarServico', { token: rec, servicoId: sv.id, profissional: pr.nome, data: dia, hora: h[1], cliente: { nome: 'Obs Formula', whatsapp: '85922221111' }, pagamento: 'no_dia' }).dados;
  ok(!chamar('b_observacaoAtendimento', { token: rec, id: at.id, obs: { a: 1 } }).ok, 'observação que não é texto é recusada');
  chamar('b_observacaoAtendimento', { token: rec, id: at.id, obs: '=chega cedo' });
  const lido = chamar('b_atendimentos', { token: rec, de: dia, dias: 1 }).dados.atendimentos.find((a) => a.id === at.id);
  ok(lido && lido.obs === '=chega cedo', 'a leitura não mostra a aspa de proteção', lido && lido.obs);
}

console.log('— recepção: estoque, marketing e prorrogação longa só com a administração');
['b_movimentarEstoque', 'b_movimentos', 'b_promocoes', 'b_publicoCampanha', 'b_registrarCampanha', 'b_campanhas'].forEach((a) => {
  ok(!chamar(a, { token: rec }).ok, `recepção não faz ${a}`);
});
{
  const cred = ctx.lerAba('Creditos').find((c) => String(c.ativo).toUpperCase() !== 'NÃO' && c.fim >= hojeS);
  r = chamar('b_ajustarCredito', { token: rec, creditoId: cred.id, fim: '2030-12-31' });
  ok(!r.ok && /60 dias/.test(r.erro), 'recepção não estende plano por anos', r.erro);
  r = chamar('b_ajustarCredito', { token: rec, creditoId: cred.id, fim: ctx.somarDias(cred.fim, 7) });
  ok(r.ok, 'recepção prorroga uma semana', r.erro);
  ok(chamar('b_ajustarCredito', { token: adm, creditoId: cred.id, fim: ctx.somarDias(cred.fim, 120) }).ok, 'administração prorroga mais');
}

console.log('— "Não é duplicada" só junta vendas do mesmo cliente e item');
{
  const pags = ctx.lerAba('Pagamentos').filter((p) => p.status === 'pago');
  const a = pags[0];
  const b = pags.find((p) => ctx.normCpf(p.cpf) !== ctx.normCpf(a.cpf));
  r = chamar('b_conferirVendas', { token: adm, orderNsus: [a.order_nsu, b.order_nsu] });
  ok(!r.ok && /mesmo cliente/.test(r.erro), 'vendas sem relação são recusadas', r.erro);
}

console.log('— lembretes da véspera rodam sozinhos (gatilho de horário)');
{
  const antes = ctx.lerAba('Registro').length;
  ctx.lembretesDiarios();
  ok(typeof ctx.lembretesDiarios === 'function', 'função lembretesDiarios existe');
  ok(ctx.lerAba('Registro').length >= antes, 'roda sem erro');
  ok(typeof ctx.backupDiario === 'function', 'função backupDiario existe');
}

if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\nTudo certo (revisão pré-lançamento)');
