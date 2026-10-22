// Vendas (out/2026): corrigir e excluir venda do balcão direto na tela Vendas.
const { m, adm, hojeS } = require('./servidor.cjs');
const { chamar, ctx } = m;
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); } else console.log('  ✓', msg); };
const rec = chamar('b_entrar', { email: 'bia@acasaambar.com.br', senha: 'recep2026ok' }).dados.token;
const caixa = () => chamar('b_caixa', { token: rec }).dados;
const pg = (nsu) => ctx.lerAba('Pagamentos').find((p) => p.order_nsu === nsu);
const cli = chamar('b_novoAluno', { token: rec, nome: 'Venda Teste', whatsapp: '85940001111' }).dados.cpf;
let r;

console.log('— corrigir forma, bandeira, parcelas e valor');
{
  const v = chamar('b_vender', { token: rec, cpf: cli, planoId: 'yoga-mensal-2x', metodo: 'Pix' }).dados;
  const antes = caixa();
  r = chamar('b_corrigirVenda', { token: rec, orderNsu: v.orderNsu, metodo: 'Cartão de crédito', parcelas: 2, valor: 350, motivo: 'foi no cartão' });
  ok(!r.ok && /bandeira/i.test(r.erro), 'cartão sem bandeira é recusado', r.erro);
  r = chamar('b_corrigirVenda', { token: rec, orderNsu: v.orderNsu, metodo: 'Cartão de crédito', bandeira: 'Visa', parcelas: 2, valor: 330, motivo: '' });
  ok(!r.ok && /motivo/i.test(r.erro), 'sem motivo é recusado', r.erro);
  r = chamar('b_corrigirVenda', { token: rec, orderNsu: v.orderNsu, metodo: 'Cartão de crédito', bandeira: 'Visa', parcelas: 2, valor: '330,00', motivo: 'foi no cartão com desconto' });
  ok(r.ok && r.dados.metodo === 'Cartão de crédito' && r.dados.bandeira === 'Visa' && Number(r.dados.parcelas) === 2 && r.dados.valor === 330, 'corrigida', r.erro || r.dados);
  ok(/Corrigida em .* \(antes: Pix · R\$\s?350,00\): foi no cartão/.test(pg(v.orderNsu).observacao), 'anota quem, quando e como estava', pg(v.orderNsu).observacao);
  const depois = caixa();
  ok(depois.vendas === antes.vendas - 20, 'caixa acompanha o valor novo', [antes.vendas, depois.vendas]);
  ok(depois.lancamentos.some((l) => l.metodo === 'Cartão de crédito' && l.bandeira === 'Visa' && l.valor === 330 && l.nome === 'Venda Teste'), 'lançamento do caixa com a forma nova');
  // de ontem: só a administração
  const p = pg(v.orderNsu);
  ctx.atualizarLinha('Pagamentos', p._linha, { pago_em: ctx.somarDias(hojeS, -1) + ' 10:00:00', criado_em: ctx.somarDias(hojeS, -1) + ' 10:00:00' });
  r = chamar('b_corrigirVenda', { token: rec, orderNsu: v.orderNsu, metodo: 'Pix', valor: 350, motivo: 'teste' });
  ok(!r.ok && /só as vendas lançadas hoje/.test(r.erro), 'recepção não corrige venda de outro dia', r.erro);
  r = chamar('b_corrigirVenda', { token: adm, orderNsu: v.orderNsu, metodo: 'Pix', valor: 350, motivo: 'voltou ao original' });
  ok(r.ok && r.dados.metodo === 'Pix' && r.dados.bandeira === '' && Number(r.dados.parcelas) === 1, 'administração corrige venda de outro dia', r.erro);
  const lia = chamar('b_entrar', { email: 'lia@gmail.com', senha: 'liamoura2026' });
  if (lia.ok) {
    ok(!chamar('b_corrigirVenda', { token: lia.dados.token, orderNsu: v.orderNsu, metodo: 'Pix', valor: 1, motivo: 'xxx' }).ok, 'profissional não corrige');
    ok(!chamar('b_excluirVenda', { token: lia.dados.token, orderNsu: v.orderNsu, motivo: 'xxx' }).ok, 'profissional não exclui');
  }

  console.log('— excluir plano já usado é recusado');
  const sem = chamar('b_agendaSemana', { token: rec, de: hojeS }).dados;
  const aula = sem.aulas.find((a) => a.modalidade === 'Yoga' && a.data > hojeS && a.ocupadosQtd < a.capacidade);
  const livre = (au) => Array.from({ length: au.capacidade }, (_, i) => i + 1).find((n) => !au.reservas.some((x) => x.tapete === n));
  r = chamar('b_agendar', { token: rec, aulaId: aula.id, cpf: cli, tapete: livre(aula), forma: 'credito' });
  ok(r.ok, 'aula marcada com o plano', r.erro);
  r = chamar('b_excluirVenda', { token: adm, orderNsu: v.orderNsu, motivo: 'teste' });
  ok(!r.ok && /1 aula marcada/.test(r.erro), 'plano com aula marcada não é excluído', r.erro);
}

console.log('— excluir aula avulsa lançada por engano');
{
  const cpf2 = chamar('b_novoAluno', { token: rec, nome: 'Avulsa Engano', whatsapp: '85940002222' }).dados.cpf;
  const sem = chamar('b_agendaSemana', { token: rec, de: hojeS }).dados;
  const aula = sem.aulas.find((a) => a.modalidade === 'Yoga' && a.data > hojeS && a.ocupadosQtd < a.capacidade);
  const livre = Array.from({ length: aula.capacidade }, (_, i) => i + 1).find((n) => !aula.reservas.some((x) => x.tapete === n));
  const antes = caixa();
  r = chamar('b_agendar', { token: rec, aulaId: aula.id, cpf: cpf2, tapete: livre, forma: 'avulsa', metodo: 'Pix' });
  ok(r.ok, 'agendou como "já pagou"', r.erro);
  ok(caixa().vendas === antes.vendas + 63, 'entrou no caixa');
  const venda = ctx.lerAba('Pagamentos').filter((p) => p.cpf === cpf2).pop();
  r = chamar('b_excluirVenda', { token: rec, orderNsu: venda.order_nsu, motivo: 'a aluna ainda não pagou' });
  ok(r.ok && r.dados.aulasAPagar === 1 && r.dados.venda.status === 'excluido', 'excluída: a aula volta a ficar a pagar', r.erro || r.dados);
  ok(caixa().vendas === antes.vendas && !caixa().lancamentos.some((l) => l.nome === 'Avulsa Engano'), 'saiu do caixa');
  const res = chamar('b_agendaSemana', { token: rec, de: hojeS }).dados.aulas.find((a) => a.id === aula.id).reservas.find((x) => x.cpf === cpf2);
  ok(res && res.aPagar && res.forma === 'A pagar', 'na aula aparece "A pagar" (e o botão Receber)', res);
  ok(ctx.lerAba('Creditos').find((c) => c.id === 'C' + venda.order_nsu.slice(1)).ativo === 'NÃO', 'crédito desativado');
  r = chamar('b_excluirVenda', { token: rec, orderNsu: venda.order_nsu, motivo: 'de novo' });
  ok(!r.ok, 'não exclui duas vezes');
  r = chamar('b_receberAula', { token: rec, reservaId: res.id, metodo: 'Dinheiro' });
  ok(r.ok && caixa().vendas === antes.vendas + 63, 'depois recebe normalmente pela aula', r.erro);
}

console.log('— serviço pago na agenda');
{
  const cat = chamar('b_catalogoServicos', { token: adm }).dados;
  const serv = cat.servicos.find((s) => s.id === 'drenagem') || cat.servicos[0];
  const prof = cat.profissionais.find((p) => p.ativo && p.categorias.includes(serv.categoria)).nome;
  let dia = hojeS, hs = [];
  for (let i = 1; i < 8 && !hs.length; i++) { dia = ctx.somarDias(hojeS, i); hs = chamar('b_horarios', { token: rec, servicoId: serv.id, profissional: prof, data: dia }).dados.horarios; }
  const at = chamar('b_agendarServico', { token: rec, servicoId: serv.id, profissional: prof, data: dia, hora: hs[0], cpf: cli, pagamento: 'pago', metodo: 'Pix' }).dados;
  ok(at && at.pagamento === 'pago', 'agendado já pago', at);
  const nsu = ctx.lerAba('Atendimentos').find((a) => a.id === at.id).order_nsu;
  r = chamar('b_corrigirVenda', { token: rec, orderNsu: nsu, metodo: 'Dinheiro', valor: 150, motivo: 'desconto combinado' });
  ok(r.ok && Number(ctx.lerAba('Atendimentos').find((a) => a.id === at.id).valor) === 150, 'corrigir o valor leva o atendimento junto (base da comissão)', r.erro);
  r = chamar('b_excluirVenda', { token: rec, orderNsu: nsu, motivo: 'vai pagar no dia' });
  const a2 = ctx.lerAba('Atendimentos').find((a) => a.id === at.id);
  ok(r.ok && r.dados.atendimentosAPagar === 1 && a2.pagamento === 'no_dia' && !a2.order_nsu, 'excluir: o atendimento volta a "paga no dia"', r.erro || a2);
}

console.log('— venda de comanda e do site não se mexem por aqui');
{
  let cm = chamar('b_salvarComanda', { token: rec, comanda: { cpf: cli, itens: [{ tipo: 'plano', id: 'yoga-avulsa', nome: 'Yoga avulsa', qtd: 1 }] } }).dados;
  chamar('b_fecharComanda', { token: rec, id: cm.id, pagamentos: [{ metodo: 'Pix', valor: cm.total }] });
  const pc = ctx.lerAba('Pagamentos').find((p) => p.comanda === cm.id);
  r = chamar('b_corrigirVenda', { token: adm, orderNsu: pc.order_nsu, metodo: 'Dinheiro', valor: 63, motivo: 'teste' });
  ok(!r.ok && /comanda/.test(r.erro), 'venda de comanda: corrigir pela comanda', r.erro);
  ok(!chamar('b_excluirVenda', { token: adm, orderNsu: pc.order_nsu, motivo: 'teste' }).ok, 'venda de comanda: não exclui por aqui');
  const lista = chamar('b_pagamentos', { token: rec, de: hojeS, ate: hojeS }).dados;
  ok(lista.find((p) => p.orderNsu === pc.order_nsu).comanda === cm.id, 'a lista traz a comanda (botão "Abrir a comanda")');
}

console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
