// Troca da maquininha para a Rede (nov/2026): tabela da Rede no balcão a partir de AJUSTES.redeDesde; site, link e vendas antigas seguem a InfinitePay
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
const ontem = ctx.somarDias(hoje, -1);
const parte = (metodo, bandeira, parcelas, extra = {}) => ctx.taxaPctDaParte({ metodo, bandeira, parcelas, valor: 100, ...extra }).pct;

console.log('— tabela da Rede (proposta fechada pela Casa)');
const tr = ctx.AJUSTES.taxasRede;
ok(tr.debito.vm === 0.99 && tr.debito.elo === 1.79 && tr.debito.amex === null, 'débito Visa/Master 0,99% e Elo 1,79%', tr.debito);
ok(tr.credito.vm.join(' ') === '3.58 4.72 5.53 6.34 7.15 7.96 9.05 9.86 10.67 11.48 12.29 13.1', 'crédito Visa/Master de 1x a 12x', tr.credito.vm);
ok(tr.credito.elo.join(' ') === '4.38 5.52 6.33 7.14 7.95 8.76 9.85 10.66 11.47 12.28 13.09 13.9' && tr.credito.amex.join() === tr.credito.elo.join(), 'crédito Elo e Amex de 1x a 12x');
ok(ctx.AJUSTES.redeDesde === '', 'sem data: ainda não trocou');
ok(parte('Cartão de crédito', 'Visa', 1, { dia: hoje }) === 3.15, 'sem data, o balcão continua na InfinitePay');

console.log('— a partir da data da troca');
r = chamar('b_salvarAjustes', { token: rec, ajustes: { redeDesde: hoje } });
ok(!r.ok, 'a recepção não muda a data da troca');
r = chamar('b_salvarAjustes', { token: adm, ajustes: { redeDesde: '23/11/2026' } });
ok(!r.ok && /inválida/.test(r.erro), 'data em formato errado é recusada', r.erro);
r = chamar('b_salvarAjustes', { token: adm, ajustes: { redeDesde: hoje } });
ok(r.ok && r.dados.redeDesde === hoje && r.dados.taxasRede && r.dados.taxasRede.credito.vm[0] === 3.58, 'Ajustes salva a data e devolve as duas tabelas', r.erro || r.dados && r.dados.redeDesde);
ok(parte('Cartão de crédito', 'Visa', 1, { dia: hoje }) === 3.58 && parte('Cartão de crédito', 'Elo', 12, { dia: hoje }) === 13.9, 'crédito do balcão usa a Rede');
ok(parte('Cartão de débito', 'Mastercard', 1, { dia: hoje }) === 0.99 && parte('Cartão de débito', 'Elo', 1, { dia: hoje }) === 1.79, 'débito do balcão usa a Rede');
ok(parte('Cartão de débito', 'American Express', 1, { dia: hoje }) === 0.99, 'Amex no débito (sem linha própria) usa Visa/Master');
ok(parte('Cartão de crédito', 'Visa', 1, { dia: ontem }) === 3.15, 'venda de antes da troca continua na InfinitePay');
ok(parte('Cartão de crédito', 'Visa', 1) === 3.58, 'comanda sendo fechada agora (sem dia) usa a Rede');
ok(parte('Link InfinitePay', '', 1, { dia: hoje }) === 4.2, 'link continua na InfinitePay');
ok(parte('Cartão', 'Visa', 1, { dia: hoje, site: true }) === 3.15 && parte('Pix', '', 1, { dia: hoje, site: true }) === 0, 'pagamento pelo site continua na InfinitePay');

console.log('— vendas de verdade');
chamar('b_salvarAjustes', { token: adm, ajustes: { taxasRede: { ...tr, pix: 0.89, prazos: { pix: 0, debito: 1, credito: 2 } } } });
ok(ctx.AJUSTES.taxasRede.pix === 0.89 && ctx.AJUSTES.taxasRede.link === null && ctx.AJUSTES.taxasRede.credito.vm[0] === 3.58, 'tabela da Rede editável (Pix 0,89%) e sem link', ctx.AJUSTES.taxasRede);
ok(ctx.AJUSTES.taxas.pix === 0 && ctx.AJUSTES.taxas.credito.vm[0] === 3.15, 'a tabela da InfinitePay não mudou');
const vender = (extra) => chamar('b_vender', { token: adm, cpf: '52998224725', planoId: 'yoga-avulsa', valor: 100, ...extra });
r = vender({ metodo: 'Cartão de crédito', bandeira: 'Visa', parcelas: 1 });
ok(r.ok, 'venda no crédito hoje', r.erro);
r = vender({ metodo: 'Pix', dataVenda: ontem, confirmarRepetida: [], motivoRepetida: 'teste' });
ok(r.ok, 'venda no Pix lançada com data de ontem', r.erro);
r = vender({ metodo: 'Pix', confirmarRepetida: [], motivoRepetida: 'teste' });
r = chamar('b_pagamentos', { token: adm, de: ontem, ate: hoje });
const vendas = (r.dados.lista || r.dados).filter((p) => p.cpf === '52998224725');
const credHoje = vendas.find((p) => p.metodo === 'Cartão de crédito');
const pixOntem = vendas.find((p) => p.metodo === 'Pix' && String(p.pagoEm).slice(0, 10) === ontem);
const pixHoje = vendas.find((p) => p.metodo === 'Pix' && String(p.pagoEm).slice(0, 10) === hoje);
ok(credHoje && credHoje.taxa === 3.58 && credHoje.liquido === 96.42, 'Vendas: crédito Visa de hoje com a taxa da Rede (líquido R$ 96,42)', credHoje);
ok(pixOntem && pixOntem.taxa === 0, 'Pix de ontem (antes da troca) sem taxa', pixOntem);
ok(pixHoje && pixHoje.taxa === 0.89, 'Pix de hoje no balcão com a taxa da Rede', pixHoje);
ok(ctx.diaQueCai({ metodo: 'Cartão de crédito' }, hoje) === ctx.somarDiasUteis(hoje, 2) && ctx.diaQueCai({ metodo: 'Cartão de crédito' }, ontem) === ctx.somarDiasUteis(ontem, 1), 'prazo: Rede depois da troca, InfinitePay antes');

console.log('— a calculadora da tela dá a mesma taxa que o servidor (Rede)');
import(require('url').pathToFileURL(require('path').join(__dirname, '..', 'src', 'bancada', 'taxas.js')).href).then((tela) => {
  let n = 0, dif = 0;
  [['pix', 'Pix'], ['debito', 'Cartão de débito'], ['credito', 'Cartão de crédito']].forEach(([f, metodo]) => ['Visa', 'Mastercard', 'Elo', 'American Express', 'Hipercard', ''].forEach((b) => [1, 2, 6, 7, 12].forEach((p) => {
    const a = tela.taxaPct(ctx.AJUSTES.taxasRede, f, b, p), z = ctx.taxaPctDaParte({ metodo, bandeira: b, parcelas: p, valor: 100, dia: hoje });
    n++; if (a.pct !== z.pct || a.falta !== z.falta) { dif++; if (dif < 4) console.log('   diferença', f, b, p, a, z); }
  })));
  ok(dif === 0, `${n} combinações iguais na tela e no servidor`);
  console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTUDO CERTO');
  process.exit(falhas ? 1 : 0);
});
