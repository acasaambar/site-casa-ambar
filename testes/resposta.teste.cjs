// Etiqueta do pedido: toda resposta devolve a etiqueta (rid) e o nome da ação que a pediu,
// para a tela recusar uma resposta que não é do pedido dela (out/2026: a lista de espera chegou no lugar do resumo do dia).
const { criar } = require('./simulador.cjs');
const R = require('path').join(__dirname, '..', 'apps-script');
const m = criar([R + '/Codigo.gs', R + '/Seguranca.gs', R + '/Vales.gs', R + '/Bancada.gs', R + '/Relatorios.gs', R + '/Servicos.gs', R + '/Gestao.gs', R + '/Clientes.gs', R + '/Marketing.gs', R + '/Substituicoes.gs', R + '/Espera.gs']);
const { ctx, chamar } = m;
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); } else console.log('  ✓', msg); };
ctx.configurarPlanilha();

console.log('— a etiqueta volta na resposta');
let r = chamar('regras', { rid: 'abc123xyz' });
ok(r.ok && r.rid === 'abc123xyz' && r.acao === 'regras', 'resposta certa traz a mesma etiqueta e a ação', r);
r = chamar('esqueciSenha', { cpf: '123', rid: 'erro456' });
ok(!r.ok && r.rid === 'erro456' && r.acao === 'esqueciSenha', 'resposta de erro também traz a etiqueta', r);
r = chamar('b_espera', { token: 'invalido', tipo: 'servico', rid: 'bancada789' });
ok(r.rid === 'bancada789' && r.acao === 'b_espera', 'ação da bancada (mesmo recusada) traz a etiqueta', r);

console.log('— pedidos em sequência não herdam a etiqueta do anterior');
chamar('regras', { rid: 'primeiro1' });
r = chamar('regras', {});
ok(r.ok && r.rid === '', 'pedido sem etiqueta volta sem etiqueta (não a do pedido anterior)', r);

console.log('— etiqueta só com letras e números, curta');
r = chamar('regras', { rid: '<script>alert(1)</script>' + 'x'.repeat(80) });
ok(/^[a-z0-9]{0,40}$/i.test(r.rid), 'caracteres estranhos são tirados e o tamanho é limitado', r.rid);

console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
