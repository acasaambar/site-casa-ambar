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

console.log('— valores de partida (tabela do app da InfinitePay, plano 1 dia útil)');
const seq = (b, g) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => pct('Cartão de crédito', b, n).pct).join(' ');
ok(pct('Cartão de débito', 'Visa', 1).pct === 1.37 && pct('Cartão de débito', 'Mastercard', 1).pct === 1.37, 'débito Visa e Mastercard 1,37%');
ok(pct('Cartão de débito', 'Elo', 1).pct === 2.58, 'débito Elo 2,58%');
ok(seq('Visa') === '3.15 5.39 6.12 6.85 7.57 8.28 8.99 9.69 10.38 11.06 11.74 12.4', 'Visa de 1x a 12x', seq('Visa'));
ok(seq('Mastercard') === seq('Visa'), 'Mastercard tem a mesma tabela da Visa');
ok(seq('Elo') === '4.91 6.47 7.2 7.92 8.63 9.33 10.03 10.72 11.41 12.08 12.75 13.41', 'Elo de 1x a 12x', seq('Elo'));
ok(seq('American Express') === seq('Elo'), 'American Express tem a mesma tabela da Elo');
ok([1, 2, 3, 12].map((n) => pct('Cartão de crédito', 'Visa', n).falta).every((f) => f === false) && pct('Cartão de crédito', 'Elo', 12).falta === false, 'nenhuma parcela da maquininha está faltando');
ok(pct('Link InfinitePay', '', 1).pct === 4.2 && pct('Link InfinitePay', 'Visa', 1).pct === 4.2, 'link à vista 4,2% em qualquer bandeira');
ok(pct('Link InfinitePay', '', 3).falta === true && pct('Link InfinitePay', '', 3).pct === 4.2, 'link 3x sem taxa informada: usa a anterior e avisa que falta');
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

console.log('— tabela salva antes dos números do app');
const velho = ctx.normalizarTaxas({ pix: 0.5, debito: 1.5, credito: { vm: [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9] }, link: [4.2, 5], prazos: { link: 3 } });
ok(velho.debito.vm === 1.37 && velho.credito.vm[2] === 6.12 && velho.pix === 0.5 && velho.link[1] === 5 && velho.prazos.link === 3,
  'sem versão: débito e crédito voltam ao padrão do app; Pix, link e prazos salvos ficam', velho);
const novoSalvo = ctx.normalizarTaxas({ versao: ctx.TABELA_VERSAO, debito: { vm: 1.5, elo: 2.5 }, credito: { vm: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] } });
ok(novoSalvo.debito.vm === 1.5 && novoSalvo.credito.vm[2] === 5, 'com a versão atual: o que foi salvo vale');

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

console.log('— comissão sobre o valor líquido (sem a taxa da maquininha)');
const comissoesDe = (ref) => ctx.lerAba('Comissoes').filter((c) => String(c.id).indexOf('K' + ref) === 0);
const fecharServico = (metodo, extra) => {
  const c = chamar('b_salvarComanda', { token: rec, comanda: { cliente: { nome: 'Cliente Comissão', whatsapp: '85990002222' }, itens: [{ tipo: 'servico', id: 'drenagem', profissional: 'Lia Esteticista' }] } }).dados;
  const f = chamar('b_fecharComanda', { token: rec, id: c.id, pagamentos: [{ metodo, valor: c.total, ...extra }] });
  return { ok: f.ok, total: c.total, id: c.id, erro: f.erro, com: comissoesDe(c.id + '-0')[0] };
};
const v3 = fecharServico('Cartão de crédito', { parcelas: 3, bandeira: 'Visa' });
const esperadoBase = Math.round(v3.total * (1 - 0.0613) * 100) / 100;
ok(v3.ok && v3.com && Math.abs(Number(v3.com.base) - esperadoBase) < 0.011, `crédito 3x Visa: base da comissão = ${esperadoBase} (valor ${v3.total} − taxa de 6,13%)`, v3.com);
ok(v3.com && Math.abs(Number(v3.com.valor) - Math.round(esperadoBase * 0.4 * 100) / 100) < 0.011, 'comissão de 40% sobre o valor líquido');
const vp = fecharServico('Pix', {});
ok(vp.ok && vp.com && Number(vp.com.base) === vp.total, 'Pix não tem taxa: base = valor cheio', vp.com);
const vd = chamar('b_salvarComanda', { token: rec, comanda: { cliente: { nome: 'Cliente Dividido', whatsapp: '85990003333' }, itens: [{ tipo: 'servico', id: 'drenagem', profissional: 'Lia Esteticista' }] } }).dados;
const metade = Math.round(vd.total / 2 * 100) / 100;
chamar('b_fecharComanda', { token: rec, id: vd.id, pagamentos: [{ metodo: 'Dinheiro', valor: metade }, { metodo: 'Cartão de débito', valor: Math.round((vd.total - metade) * 100) / 100, bandeira: 'Elo' }] });
const cd = comissoesDe(vd.id + '-0')[0];
const baseDiv = Math.round(vd.total * (1 - (vd.total - metade) * 0.0258 / vd.total) * 100) / 100;
ok(cd && Math.abs(Number(cd.base) - baseDiv) < 0.02, 'comanda dividida: só a parte no débito Elo (2,58%) perde taxa', [cd && cd.base, baseDiv]);
ok(chamar('b_salvarAjustes', { token: adm, ajustes: { comissaoLiquida: false } }).ok, 'administração desliga a regra do líquido');
const vc = fecharServico('Cartão de crédito', { parcelas: 3, bandeira: 'Visa' });
ok(vc.com && Number(vc.com.base) === vc.total, 'regra desligada: base volta a ser o valor cheio', vc.com);
chamar('b_salvarAjustes', { token: adm, ajustes: { comissaoLiquida: true } });
ok(chamar('b_ajustes', { token: adm }).dados.comissaoLiquida === true, 'regra do líquido ligada de novo');
const pgBal = chamar('b_vender', { token: rec, cpf: '52998224725', planoId: 'yoga-avulsa', metodo: 'Cartão de crédito', parcelas: 3, bandeira: 'Visa' });
const pgLinha = pgBal.ok && ctx.lerAba('Pagamentos').find((p) => p.order_nsu === pgBal.dados.orderNsu);
ok(pgLinha && Math.abs(ctx.fatorDoPagamento(pgLinha) - (1 - 0.0613)) < 0.0001, 'venda do balcão no crédito 3x Visa: fator líquido 93,87%', pgLinha && ctx.fatorDoPagamento(pgLinha));

let ontem = ctx.somarDias(hoje, -1); if (new Date(ontem + 'T12:00:00Z').getUTCDay() === 0) ontem = ctx.somarDias(ontem, -1);
const ag = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: ontem, hora: '10:00', cpf: '52998224725', pagamento: 'pago', metodo: 'Cartão de crédito', parcelas: 3, bandeira: 'Visa' });
const atLinha = ag.ok && ctx.lerAba('Atendimentos').find((a) => a.id === ag.dados.id);
const cAg = atLinha && comissoesDe(atLinha.id)[0];
ok(ag.ok && cAg && Math.abs(Number(cAg.base) - Math.round(Number(atLinha.valor) * (1 - 0.0613) * 100) / 100) < 0.011, 'atendimento pago na agenda no crédito 3x: base da comissão sem a taxa', [ag.erro, atLinha && atLinha.valor, cAg && cAg.base]);

console.log('— prazo de recebimento');
ok(ctx.somarDiasUteis('2026-10-30', 1) === '2026-11-02', 'sexta + 1 dia útil = segunda');
ok(ctx.somarDiasUteis('2026-10-27', 1) === '2026-10-28' && ctx.somarDiasUteis('2026-10-27', 0) === '2026-10-27', 'terça + 1 = quarta; prazo 0 = no dia');
ok(ctx.diaQueCai({ metodo: 'Pix' }, '2026-10-30') === '2026-10-30' && ctx.diaQueCai({ metodo: 'Cartão de débito' }, '2026-10-30') === '2026-11-02' && ctx.diaQueCai({ metodo: 'Dinheiro' }, '2026-10-30') === '', 'Pix cai no dia, cartão em 1 dia útil, dinheiro não entra');
ok(chamar('b_salvarAjustes', { token: adm, ajustes: { taxas: { ...tabela, prazos: { pix: 0, debito: 1, credito: 2, link: 3 } } } }).ok && ctx.diaQueCai({ metodo: 'Link InfinitePay' }, '2026-10-26') === '2026-10-29', 'prazos editáveis (link 3 dias úteis)');
ok(!chamar('b_salvarAjustes', { token: adm, ajustes: { taxas: { ...tabela, prazos: { pix: 0, debito: 1, credito: 99, link: 1 } } } }).ok, 'prazo acima de 60 dias é recusado');
chamar('b_salvarAjustes', { token: adm, ajustes: { taxas: { ...tabela, prazos: { pix: 0, debito: 1, credito: 1, link: 1 } } } });
r = chamar('b_financeiro', { token: adm, mes: hoje.slice(0, 7) });
const aCair = (r.dados.aCair || []).reduce((s, x) => s + x.valor, 0);
// as vendas de hoje + as de ontem que ainda não caíram (a venda lançada na agenda de ontem entra no caixa de ontem)
const liquidoQueFalta = (dia) => chamar('b_caixa', { token: adm, data: dia }).dados.conferir.filter((f) => f.cai >= hoje).reduce((s, f) => s + (f.liquido || 0), 0);
const caixaHoje = liquidoQueFalta(hoje) + liquidoQueFalta(ontem);
ok(r.ok && aCair > 0 && Math.abs(aCair - caixaHoje) < 0.05, 'Financeiro lista o que ainda vai cair na conta (líquido, igual à soma dos caixas)', [aCair, caixaHoje, r.dados.aCair]);
const cx = chamar('b_caixa', { token: adm }).dados.conferir.find((f) => f.forma === 'Cartão de crédito');
ok(cx && cx.cai >= hoje, 'o caixa mostra o dia previsto para cair', cx);

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
