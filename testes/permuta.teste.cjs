// Permuta na comanda (out/2026): a Casa assume o pagamento em troca de divulgação (blogueiros etc.).
// Conta como pago, mas não entra no caixa nem na maquininha; exige "com quem"; a comissão segue sobre o valor cheio.
const { m, adm, hojeS } = require('./servidor.cjs');
const { chamar, ctx } = m;
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); } else console.log('  ✓', msg); };
const rec = chamar('b_entrar', { email: 'bia@acasaambar.com.br', senha: 'recep2026ok' }).dados.token;
const cat = chamar('b_catalogoServicos', { token: adm }).dados;
const prof = cat.profissionais.find((p) => p.ativo && p.nome.startsWith('Lia')) || cat.profissionais.find((p) => p.ativo);
const serv = cat.servicos.find((s) => s.ativo && s.preco >= 100 && (!prof.servicos.length || prof.servicos.some((c) => c.id === s.id)));
let n = 0;
// comanda nova de um serviço feito agora, para uma cliente sem cadastro (cada teste com um nome)
const comanda = (nome) => {
  const r = chamar('b_salvarComanda', { token: rec, comanda: { cliente: { nome, whatsapp: '8590000' + String(1000 + n++) }, itens: [{ tipo: 'servico', id: serv.id, nome: serv.nome, profissional: prof.nome }] } });
  if (!r.ok) console.log('   (erro ao montar a comanda)', r.erro);
  return r.dados;
};
const caixa = () => chamar('b_caixa', { token: adm, data: hojeS }).dados;
const comissoes = (ref) => ctx.lerAba('Comissoes').filter((c) => String(c.ref).indexOf(ref) === 0 && c.status !== 'cancelada');
const valor = serv.preco;

console.log('— permuta total: conta como pago, mas não entra no caixa');
const antes = caixa();
let c1 = comanda('Blogueira Total');
ok(c1 && c1.total === valor, 'comanda de ' + valor, c1 && c1.total);
let r = chamar('b_fecharComanda', { token: rec, id: c1.id, pagamentos: [{ metodo: 'Permuta', valor }] });
ok(!r.ok && /com quem/i.test(r.erro), 'sem dizer com quem é recusado', r.erro);
r = chamar('b_fecharComanda', { token: rec, id: c1.id, pagamentos: [{ metodo: 'Permuta', valor, parceiro: 'ab' }] });
ok(!r.ok && /com quem/i.test(r.erro), 'nome curto demais é recusado', r.erro);
r = chamar('b_fecharComanda', { token: rec, id: c1.id, pagamentos: [{ metodo: 'Permuta', valor, parceiro: '@blogueira_ana' }] });
ok(r.ok && r.dados.status === 'fechada', 'recepção fecha a comanda em permuta', r.erro);
const depois = caixa();
ok(depois.vendas === antes.vendas, 'o caixa não ganha nada', [antes.vendas, depois.vendas]);
ok(!(depois.porForma || []).some((f) => f.nome === 'Permuta'), 'não aparece nas entradas por forma');
ok(depois.permutaTotal === antes.permutaTotal + valor && depois.permutas.some((x) => x.com === '@blogueira_ana' && x.valor === valor), 'aparece em "Permutas do dia" com o nome do parceiro', depois.permutas);
ok(depois.esperado === antes.esperado, 'o dinheiro da gaveta não muda');
const linha = ctx.lerAba('Pagamentos').find((p) => String(p.comanda) === String(c1.id));
ok(linha && Number(linha.permuta) === valor && Number(linha.valor) === 0 && ctx.semAspaDeFormula(linha.permuta_com) === '@blogueira_ana' && linha.metodo === 'Permuta', 'a venda guarda a permuta e o parceiro', linha);
const cs = ctx.lerAba('Comissoes').filter((c) => /servico|comanda|atend/i.test(String(c.origem)) && String(c.item).indexOf('Blogueira Total') >= 0);
ok(cs.length > 0 && cs.every((c) => Number(c.base) === valor), 'a comissão segue sobre o valor cheio (a Casa paga)', cs.map((c) => c.base));

console.log('— permuta parcial: o resto é pago normalmente');
let c2 = comanda('Blogueiro Parcial');
const metade = Math.round(valor / 2);
const resto = valor - metade;
const a2 = caixa();
r = chamar('b_fecharComanda', { token: rec, id: c2.id, pagamentos: [{ metodo: 'Permuta', valor: metade, parceiro: 'Blog da Carla' }, { metodo: 'Pix', valor: resto }] });
ok(r.ok, 'permuta + Pix fecha', r.erro);
const d2 = caixa();
ok(d2.vendas === a2.vendas + resto, 'só o Pix entra no caixa', [a2.vendas, d2.vendas, resto]);
ok((d2.porForma.find((f) => f.nome === 'Pix') || {}).valor === ((a2.porForma.find((f) => f.nome === 'Pix') || {}).valor || 0) + resto, 'as entradas por forma só contam o Pix');
const l2 = ctx.lerAba('Pagamentos').find((p) => String(p.comanda) === String(c2.id));
ok(l2 && Number(l2.permuta) === metade && Number(l2.valor) === resto, 'a venda divide permuta e dinheiro', l2 && [l2.permuta, l2.valor]);

console.log('— regras');
let c3 = comanda('Duas Permutas');
r = chamar('b_fecharComanda', { token: rec, id: c3.id, pagamentos: [{ metodo: 'Permuta', valor: 10, parceiro: 'Ana' }, { metodo: 'Permuta', valor: valor - 10, parceiro: 'Bia' }] });
ok(!r.ok && /uma permuta/i.test(r.erro), 'só uma permuta por comanda', r.erro);
const cv = chamar('b_salvarComanda', { token: rec, comanda: { cliente: { nome: 'Compra Vale', whatsapp: '85900009999' }, itens: [{ tipo: 'vale', vale: { tipo: 'valor', valor: 100, nome: 'Presente' } }] } }).dados;
r = chamar('b_fecharComanda', { token: rec, id: cv.id, pagamentos: [{ metodo: 'Permuta', valor: 100, parceiro: 'Ana Blog' }] });
ok(!r.ok && /vale-presente/i.test(r.erro), 'vale-presente não se paga com permuta', r.erro);
r = chamar('b_fecharComanda', { token: rec, id: c3.id, pagamentos: [{ metodo: 'Permuta', valor: valor - 1, parceiro: 'Ana Blog' }] });
ok(!r.ok && /somam/i.test(r.erro), 'a soma tem que fechar com o total', r.erro);

console.log('— corrigir a forma de pagamento: a permuta não muda');
const chk = chamar('b_comandas', { token: adm, status: 'fechada' }).dados.find((x) => String(x.id) === String(c2.id));
r = chamar('b_corrigirFormasComanda', { token: adm, id: c2.id, motivo: 'foi no dinheiro', pagamentos: [{ metodo: 'Dinheiro', valor: resto }] });
ok(r.ok, 'troca só a parte paga (Pix → Dinheiro)', r.erro);
const fim2 = chamar('b_comandas', { token: adm, status: 'fechada' }).dados.find((x) => String(x.id) === String(c2.id));
ok(fim2 && fim2.pagamentos.some((p) => p.metodo === 'Permuta' && p.valor === metade && p.parceiro === 'Blog da Carla') && fim2.pagamentos.some((p) => p.metodo === 'Dinheiro' && p.valor === resto), 'a permuta continua igual', fim2 && fim2.pagamentos);
r = chamar('b_corrigirFormasComanda', { token: adm, id: c1.id, motivo: 'x', pagamentos: [{ metodo: 'Pix', valor }] });
ok(!r.ok, 'comanda só de permuta não tem forma para corrigir', r.erro);

console.log('— relatório e Vendas (administração)');
const rel = chamar('b_relatorio', { token: adm, de: hojeS, ate: hojeS });
const perm = rel.ok && rel.dados.financeiro.permutas;
ok(perm && perm.total === valor + metade && perm.qtd === 2, 'o relatório soma as permutas do período', perm);
ok(perm && perm.porParceiro.some((x) => x.nome === '@blogueira_ana' && x.valor === valor), 'e mostra por parceiro');
ok(rel.dados.financeiro.receita >= 0, 'o faturamento não conta a permuta');
const vendas = chamar('b_pagamentos', { token: adm, de: hojeS, ate: hojeS }).dados;
ok(vendas.some((v) => v.permuta === valor && v.permutaCom === '@blogueira_ana'), 'Vendas mostra a permuta de cada linha');

if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\nTudo certo (permuta)');
