// Recepção só vê Hoje, Agenda, Clientes e Comandas/caixa: dinheiro (vendas, vales, cupons, estornos) e total do mês só com a administração.
const { m, adm } = require('./servidor.cjs');
const { chamar } = m;
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); } else console.log('  ✓', msg); };
const rec = chamar('b_entrar', { email: 'bia@acasaambar.com.br', senha: 'recep2026ok' }).dados.token;
const hoje = m.ctx.hojeTexto();

console.log('— ações de dinheiro: só administração');
const restritas = ['b_pagamentos', 'b_vales', 'b_cupons', 'b_estornar', 'b_marcarDevolvido', 'b_vendasDuplicadas', 'b_conferirVendas', 'b_corrigirVenda', 'b_excluirVenda'];
restritas.forEach((a) => {
  ok(!chamar(a, { token: rec, de: hoje, ate: hoje }).ok, `recepção não faz ${a}`);
});
ok(chamar('b_pagamentos', { token: adm, de: hoje, ate: hoje }).ok, 'administração lista as vendas');
ok(chamar('b_vales', { token: adm }).ok, 'administração lista os vales');

console.log('— o que a recepção continua fazendo');
ok(chamar('b_resumo', { token: rec }).ok, 'abre a tela Hoje');
ok(chamar('b_alunos', { token: rec }).ok, 'abre Clientes');
ok(chamar('b_comandas', { token: rec, status: 'aberta' }).ok, 'abre as comandas');
ok(chamar('b_caixa', { token: rec }).ok, 'abre o caixa do dia');
ok(chamar('b_agendaSemana', { token: rec, de: hoje }).ok, 'abre a agenda');

console.log('— total do mês no Hoje: só administração');
const rr = chamar('b_resumo', { token: rec }).dados;
const ra = chamar('b_resumo', { token: adm }).dados;
ok(rr.vendasMes === undefined, 'recepção não recebe o total do mês', rr.vendasMes);
ok(typeof ra.vendasMes === 'number', 'administração recebe o total do mês', ra.vendasMes);
ok(typeof rr.vendasHoje === 'number', 'recepção continua vendo o recebido de hoje (caixa do dia)');

if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\nTudo certo (recepção sem dinheiro)');
