// Taxas da InfinitePay: tabela por bandeira e parcela, formato antigo, líquido por forma e quem vê
const { criar } = require('./simulador.cjs');
const END_TESTE = { cep: '60150-160', endereco: 'Rua Eduardo Salgado', numero: '448', bairro: 'Aldeota', cidade: 'Fortaleza', uf: 'CE' };
const R = require('path').join(__dirname, '..', 'apps-script');
const m = criar([R + '/Codigo.gs', R + '/Seguranca.gs', R + '/Vales.gs', R + '/Bancada.gs', R + '/Relatorios.gs', R + '/Servicos.gs', R + '/Gestao.gs', R + '/Clientes.gs', R + '/Marketing.gs', R + '/Substituicoes.gs', R + '/Espera.gs', R + '/Contrato.gs']);
const { ctx, chamar, emails } = m;
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 600) : ''); } else console.log('  ✓', msg); };
const linkDe = (e) => (e.body.match(/t=([a-f0-9]+)/) || [])[1];
const hoje = ctx.hojeTexto();
ctx.configurarPlanilha();
ctx.autorizarEmails(); chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'ambar2026adm' });
const adm = chamar('b_entrar', { email: 'contato@acasaambar.com.br', senha: 'ambar2026adm' }).dados.token;
chamar('b_salvarMembro', { token: adm, membro: { email: 'bia@acasaambar.com.br', nome: 'Bia Santos', papel: 'recepcao' } });
chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'recep2026ok' });
const rec = chamar('b_entrar', { email: 'bia@acasaambar.com.br', senha: 'recep2026ok' }).dados.token;
chamar('b_salvarProfissional', { token: adm, profissional: { nome: 'Lia Esteticista', categorias: ['Estética facial', 'Estética corporal'], dias: [0, 1, 2, 3, 4, 5, 6], inicio: '06:00', fim: '23:00', comissao: 40 } });
chamar('cadastrar', { endereco: END_TESTE, cpf: '529.982.247-25', nome: 'Maria Souza', whatsapp: '85999990000', email: 'maria@gmail.com', senha: 'abc12345' });
let r;
const pct = (metodo, bandeira, parcelas) => ctx.taxaPctDaParte({ metodo, bandeira, parcelas, valor: 100 });
const col = (v1, mapa = {}) => Array.from({ length: 12 }, (_, i) => (i === 0 ? v1 : mapa[i + 1] != null ? mapa[i + 1] : null));

console.log('— valores de partida (os da Casa na InfinitePay)');
ok(pct('Cartão de débito', 'Visa', 1).pct === 1.37 && pct('Cartão de débito', 'Mastercard', 1).pct === 1.37, 'débito Visa e Mastercard 1,37%');
ok(pct('Cartão de débito', 'Elo', 1).pct === 2.58, 'débito Elo 2,58%');
ok(pct('Cartão de crédito', 'Visa', 1).pct === 3.15 && pct('Cartão de crédito', 'Elo', 1).pct === 4.91 && pct('Cartão de crédito', 'American Express', 1).pct === 4.91, 'crédito à vista: Visa 3,15% · Elo e Amex 4,91%');
ok(pct('Link InfinitePay', '', 1).pct === 4.2 && pct('Link InfinitePay', 'Visa', 1).pct === 4.2, 'link 4,2% em qualquer bandeira');
ok(pct('Cartão de crédito', 'Visa', 3).falta === true && pct('Cartão de crédito', 'Visa', 3).pct === 3.15, 'parcela sem taxa informada: usa a anterior e avisa que falta');
ok(pct('Pix', '', 1).pct === 0 && pct('Dinheiro', '', 1).pct === 0, 'Pix e dinheiro sem taxa');

console.log('— salvar a tabela');
const tabela = { pix: 0, debito: { vm: 1.37, elo: 2.58, amex: null },
  credito: { vm: col(3.15, { 2: 5.39, 3: 6.13, 12: 12.4 }), elo: col(4.91, { 2: 7, 3: 8 }), amex: col(4.91) }, link: col(4.2, { 2: 6, 3: 7 }) };
ok(!chamar('b_salvarAjustes', { token: rec, ajustes: { taxas: tabela } }).ok, 'recepção não muda as taxas');
ok(!chamar('b_salvarAjustes', { token: adm, ajustes: { taxas: { ...tabela, link: col(31) } } }).ok, 'acima de 30% recusa');
ok(!chamar('b_salvarAjustes', { token: adm, ajustes: { taxas: { ...tabela, link: Array(13).fill(1) } } }).ok, 'mais de 12 parcelas recusa');
r = chamar('b_salvarAjustes', { token: adm, ajustes: { taxas: tabela } });
ok(r.ok && r.dados.taxas.credito.vm[11] === 12.4 && r.dados.taxas.debito.amex === null, 'tabela salva e devolvida', r.dados && r.dados.taxas);
ok(pct('Cartão de crédito', 'Visa', 3).pct === 6.13 && !pct('Cartão de crédito', 'Visa', 3).falta, 'Visa 3x = 6,13%');
ok(pct('Cartão de crédito', 'Mastercard', 12).pct === 12.4, 'Mastercard 12x = 12,4% (mesma coluna da Visa)');
ok(pct('Cartão de crédito', 'Elo', 2).pct === 7, 'Elo 2x = 7%');
ok(pct('Cartão de crédito', 'Elo', 5).pct === 8 && pct('Cartão de crédito', 'Elo', 5).falta, 'Elo 5x sem taxa: usa a de 3x e marca como faltando');
ok(pct('Link InfinitePay', '', 2).pct === 6, 'link 2x = 6%');
ok(pct('Cartão de débito', 'Amex', 1).pct === 1.37, 'débito de bandeira sem linha própria usa Visa/Mastercard');
ok(pct('Cartão de crédito', 'Hipercard', 1).pct === 3.15, 'bandeira sem linha própria usa a coluna Visa/Mastercard');

console.log('— formato antigo ainda é entendido');
const velho = ctx.normalizarTaxas({ pix: 0.5, debito: 1.5, credito1: 3, credito2a6: 4, credito7a12: 6, link: 5 });
ok(velho.debito.vm === 1.5 && velho.credito.elo[0] === 3 && velho.credito.vm[3] === 4 && velho.credito.vm[8] === 6 && velho.link[11] === 5 && velho.pix === 0.5, 'taxas do formato antigo viram a tabela nova', velho);

console.log('— Financeiro e caixa');
const vender = (metodo, valor, extra = {}) => {
  const c = chamar('b_salvarComanda', { token: rec, comanda: { cliente: { nome: 'Teste Taxa', whatsapp: '85990001111' }, itens: [{ tipo: 'vale', vale: { tipo: 'valor', valor } }] } }).dados;
  return chamar('b_fecharComanda', { token: rec, id: c.id, pagamentos: [{ metodo, valor, ...extra }] });
};
chamar('b_abrirCaixa', { token: rec, abertura: 0 });
ok(vender('Cartão de crédito', 300, { parcelas: 3, bandeira: 'Visa' }).ok, 'venda crédito 3x Visa R$ 300');
ok(vender('Cartão de débito', 100, { bandeira: 'Elo' }).ok, 'venda débito Elo R$ 100');
ok(vender('Cartão de crédito', 200, { parcelas: 5, bandeira: 'Elo' }).ok, 'venda crédito 5x Elo R$ 200 (taxa de 5x não informada)');
r = chamar('b_financeiro', { token: adm, mes: hoje.slice(0, 7) });
const esperado = Math.round((300 * 0.0613 + 100 * 0.0258 + 200 * 0.08) * 100) / 100;
ok(r.ok && Math.abs(r.dados.taxas - esperado) < 0.011, 'Financeiro soma as taxas por bandeira e parcela', [r.dados.taxas, esperado]);
ok(r.dados.taxasPorBandeira.some((x) => x.nome === 'Crédito Visa') && r.dados.taxasPorBandeira.some((x) => x.nome === 'Débito Elo'), 'taxas por bandeira', r.dados.taxasPorBandeira);
ok(r.dados.semTaxa === 1, 'avisa que 1 venda parcelada ficou sem taxa cadastrada', r.dados.semTaxa);
r = chamar('b_caixa', { token: adm });
const cred = r.dados.conferir.find((f) => f.forma === 'Cartão de crédito');
ok(cred.taxa === Math.round((300 * 0.0613 + 200 * 0.08) * 100) / 100 && cred.liquido === Math.round((cred.valor - cred.taxa) * 100) / 100, 'caixa (administração): taxa e líquido do crédito', cred);
r = chamar('b_caixa', { token: rec });
ok(r.ok && r.dados.conferir.every((f) => f.taxa === undefined && f.liquido === undefined), 'caixa (recepção) não mostra taxa nem líquido');

console.log('— a calculadora da tela dá a mesma taxa que o servidor');
import(require('url').pathToFileURL(require('path').join(__dirname, '..', 'src', 'bancada', 'taxas.js')).href).then((tela) => {
  const tab = ctx.AJUSTES.taxas;
  const formas = [['pix', 'Pix'], ['debito', 'Cartão de débito'], ['credito', 'Cartão de crédito'], ['link', 'Link InfinitePay']];
  let n = 0, dif = 0;
  formas.forEach(([f, metodo]) => ['Visa', 'Mastercard', 'Elo', 'American Express', 'Amex', 'Hipercard', ''].forEach((b) => [1, 2, 3, 5, 7, 12].forEach((p) => {
    const a = tela.taxaPct(tab, f, b, p), z = ctx.taxaPctDaParte({ metodo, bandeira: b, parcelas: p, valor: 100 });
    n++; if (a.pct !== z.pct || a.falta !== z.falta) { dif++; if (dif < 4) console.log('   diferença', f, b, p, a, z); }
  })));
  ok(dif === 0, `${n} combinações iguais na tela e no servidor`);
  const c = tela.aPartirDoCobrado(450, 3.15);
  ok(c.taxa === 14.18 && c.liquido === 435.82, 'cobrei R$ 450 a 3,15%: taxa 14,18 e cai 435,82', c);
  const l = tela.aPartirDoLiquido(435.82, 3.15);
  ok(l.liquido >= 435.82 && l.liquido - 435.82 < 0.02 && Math.abs(l.cobrado - 450) < 0.02, 'para receber R$ 435,82 a 3,15%: cobrar ~R$ 450', l);
  const l2 = tela.aPartirDoLiquido(100, 4.2);
  ok(l2.liquido >= 100 && l2.liquido < 100.02, 'para receber R$ 100 a 4,2%: nunca falta centavo', l2);
  console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTUDO CERTO');
  process.exit(falhas ? 1 : 0);
});
