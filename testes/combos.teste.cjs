// Out/2026, pedidos da recepção (vídeos):
//  1) combo vendido na comanda cobre a sessão do mesmo serviço (a cliente paga só o combo);
//  2) aula avulsa "paga depois": reserva a vaga sem entrar no caixa; recebe depois (botão Receber ou comanda);
//  3) caixa do dia mostra cada lançamento (de quem, o quê, como pagou).
const { m, adm, hojeS } = require('./servidor.cjs');
const { chamar, ctx } = m;
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); } else console.log('  ✓', msg); };
const rec = chamar('b_entrar', { email: 'bia@acasaambar.com.br', senha: 'recep2026ok' }).dados.token;
const caixa = () => chamar('b_caixa', { token: rec }).dados;
let r;

// combo: serviço próprio + pacotes de 3 e 5 sessões (como a Casa cadastrou o Combo Pausa)
const cat0 = chamar('b_catalogoServicos', { token: adm }).dados;
const prof = cat0.profissionais.filter((p) => p.ativo && p.categorias.includes('Estética corporal'))[0].nome;
r = chamar('b_salvarServico', { token: adm, servico: { nome: 'Combo Pausa Promocional', categoria: 'Estética corporal', duracao: 90, preco: 199, profissionais: [prof] } });
const serv = r.dados.servicos.find((s) => s.nome === 'Combo Pausa Promocional');
r = chamar('b_salvarPacote', { token: adm, pacote: { nome: 'Combo Pausa', servicoId: serv.id, sessoes: 3, preco: 360, validadeDias: 120, semJurosAte: 3, ativo: true } });
chamar('b_salvarPacote', { token: adm, pacote: { nome: 'Combo Pausa', servicoId: serv.id, sessoes: 5, preco: 570, validadeDias: 180, semJurosAte: 3, ativo: true } });
const pac3 = chamar('b_catalogoServicos', { token: adm }).dados.pacotes.find((p) => p.servicoId === serv.id && p.sessoes === 3);
const cli = chamar('b_novoAluno', { token: rec, nome: 'Juliana Combo Teste', whatsapp: '85911112222' }).dados.cpf;
const saldo = () => (chamar('b_creditosServico', { token: rec, cpf: cli, servicoId: serv.id, data: hojeS }).dados || {}).restantes || 0;

console.log('— combo vendido na comanda junto com o atendimento do dia');
{
  const hs = chamar('b_horarios', { token: rec, servicoId: serv.id, profissional: prof, data: hojeS }).dados.horarios;
  let dia = hojeS, hora = hs[0];
  if (!hora) { dia = ctx.somarDias(hojeS, 1); hora = chamar('b_horarios', { token: rec, servicoId: serv.id, profissional: prof, data: dia }).dados.horarios[0]; }
  const at = chamar('b_agendarServico', { token: rec, servicoId: serv.id, profissional: prof, data: dia, hora, cpf: cli, pagamento: 'no_dia' }).dados;
  ok(at && at.pagamento === 'no_dia', 'agendado para pagar no dia', at);
  let cm = chamar('b_comandaDoAtendimento', { token: rec, atendimentoId: at.id }).dados;
  ok(cm.total === 199, 'a comanda começa com a sessão avulsa (R$ 199)', cm.total);
  const itens = cm.itens.concat([{ tipo: 'pacote', id: pac3.id, nome: 'combo', qtd: 1 }]);
  cm = chamar('b_salvarComanda', { token: rec, comanda: { id: cm.id, itens } }).dados;
  const sv = cm.itens.find((i) => i.tipo === 'servico');
  ok(cm.total === 360 && sv.total === 0 && /vendido nesta comanda/.test(sv.pacoteDescricao || ''), 'com o combo incluído: a sessão sai do combo e o total é R$ 360', { total: cm.total, sv });
  // cobrar avulso (a recepção desmarca) e voltar
  let it2 = cm.itens.map((i) => (i.tipo === 'servico' ? { ...i, semPacoteDaComanda: true } : i));
  let cm2 = chamar('b_salvarComanda', { token: rec, comanda: { id: cm.id, itens: it2 } }).dados;
  ok(cm2.total === 559 && cm2.itens.find((i) => i.tipo === 'servico').pacoteDisponivel?.daComanda, '"Cobrar avulso": sessão R$ 199 + combo R$ 360, e o botão para voltar a usar o combo aparece', cm2.total);
  it2 = cm2.itens.map((i) => (i.tipo === 'servico' ? { ...i, semPacoteDaComanda: false } : i));
  cm = chamar('b_salvarComanda', { token: rec, comanda: { id: cm.id, itens: it2 } }).dados;
  ok(cm.total === 360, 'volta a usar o combo', cm.total);
  const antesVendas = caixa().vendas;
  r = chamar('b_fecharComanda', { token: rec, id: cm.id, pagamentos: [{ metodo: 'Pix', valor: 360 }] });
  ok(r.ok, 'fechou a comanda', r.erro);
  ok(saldo() === 2, 'a cliente fica com 2 sessões (3 do combo − a de hoje)', saldo());
  const a2 = chamar('b_atendimentos', { token: rec, de: dia, dias: 1 }).dados.atendimentos.find((x) => x.id === at.id);
  ok(a2 && a2.pagamento === 'pacote', 'o atendimento do dia fica pago pelo combo', a2);
  ok(caixa().vendas === antesVendas + 360, 'no caixa entra só o combo (R$ 360)', caixa().vendas - antesVendas);
  // reabrir (administração) desfaz tudo junto
  r = chamar('b_reabrirComanda', { token: adm, id: cm.id, motivo: 'teste' });
  ok(r.ok && saldo() === 0, 'reabrir desfaz: combo desativado', r.erro || saldo());
  const a3 = chamar('b_atendimentos', { token: rec, de: dia, dias: 1 }).dados.atendimentos.find((x) => x.id === at.id);
  ok(a3 && a3.pagamento === 'no_dia', 'e o atendimento volta a "paga no dia"', a3 && a3.pagamento);
  r = chamar('b_fecharComanda', { token: rec, id: cm.id, pagamentos: [{ metodo: 'Pix', valor: 360 }] });
  ok(r.ok && saldo() === 2, 'fecha de novo: 2 sessões outra vez', r.erro || saldo());
}

console.log('— dois combos na mesma comanda não cobrem mais sessões do que vendem');
{
  const cli2 = chamar('b_novoAluno', { token: rec, nome: 'Outra Pessoa Teste', whatsapp: '85933334444' }).dados.cpf;
  const itens = [{ tipo: 'servico', id: serv.id, nome: 's', qtd: 1, profissional: prof }, { tipo: 'servico', id: serv.id, nome: 's', qtd: 1, profissional: prof }];
  let cm = chamar('b_salvarComanda', { token: rec, comanda: { cpf: cli2, itens } }).dados;
  ok(cm.total === 398, 'duas sessões avulsas: R$ 398', cm.total);
  const pac5 = chamar('b_catalogoServicos', { token: adm }).dados.pacotes.find((p) => p.servicoId === serv.id && p.sessoes === 5);
  cm = chamar('b_salvarComanda', { token: rec, comanda: { id: cm.id, itens: cm.itens.concat([{ tipo: 'pacote', id: pac5.id, nome: 'c', qtd: 1 }]) } }).dados;
  ok(cm.total === 570 && cm.itens.filter((i) => i.tipo === 'servico' && i.total === 0).length === 2, 'com o combo de 5: as duas sessões saem dele', cm.total);
  r = chamar('b_fecharComanda', { token: rec, id: cm.id, pagamentos: [{ metodo: 'Dinheiro', valor: 570 }] });
  ok(r.ok && (chamar('b_creditosServico', { token: rec, cpf: cli2, servicoId: serv.id, data: hojeS }).dados || {}).restantes === 3, 'fechou: sobram 3 sessões', r.erro);
}

console.log('— aula avulsa paga depois');
{
  const sem = chamar('b_agendaSemana', { token: rec, de: ctx.somarDias(hojeS, 7 - ((new Date(hojeS + 'T12:00:00Z').getUTCDay() + 6) % 7)) }).dados;
  const aula = sem.aulas.find((a) => a.modalidade === 'Yoga' && a.ocupadosQtd < a.capacidade);
  const livre = Array.from({ length: aula.capacidade }, (_, i) => i + 1).find((n) => !aula.reservas.some((x) => x.tapete === n));
  const cpfA = chamar('b_novoAluno', { token: rec, nome: 'Marina Paga Depois', whatsapp: '85955556666' }).dados.cpf;
  const antes = caixa();
  r = chamar('b_agendar', { token: rec, aulaId: aula.id, cpf: cpfA, tapete: livre, forma: 'pagar' });
  ok(r.ok && /paga depois/.test(r.dados.forma), 'agendou como "paga depois"', r.erro || r.dados);
  ok(caixa().vendas === antes.vendas && caixa().qtdVendas === antes.qtdVendas, 'nada entrou no caixa');
  const ver = () => chamar('b_agendaSemana', { token: rec, de: sem.de }).dados.aulas.find((a) => a.id === aula.id).reservas.find((x) => x.cpf === cpfA);
  ok(ver().aPagar && ver().forma === 'A pagar', 'na aula aparece "A pagar"', ver());
  const profAula = chamar('b_agendaSemana', { token: chamar('b_entrar', { email: 'ana@gmail.com', senha: 'anapaula26' }).dados.token, de: sem.de }).dados.aulas.find((a) => a.id === aula.id);
  ok(profAula && profAula.reservas.every((x) => !x.aPagar), 'a professora não vê o botão de receber');
  r = chamar('b_receberAula', { token: rec, reservaId: ver().id, metodo: 'Pix' });
  ok(r.ok, 'recebeu', r.erro);
  ok(!ver().aPagar && /avulsa/i.test(ver().forma), 'a reserva fica paga', ver());
  const c2 = caixa();
  ok(c2.qtdVendas === antes.qtdVendas + 1 && c2.lancamentos.some((l) => l.nome === 'Marina Paga Depois' && l.metodo === 'Pix' && /avulsa/i.test(l.item)), 'entrou no caixa, com o nome dela', c2.lancamentos.slice(-2));
  r = chamar('b_receberAula', { token: rec, reservaId: ver().id, metodo: 'Pix' });
  ok(!r.ok && /já está paga/.test(r.erro), 'receber de novo é recusado', r.erro);
  const lia = chamar('b_entrar', { email: 'lia@gmail.com', senha: 'liamoura2026' });
  if (lia.ok) { r = chamar('b_receberAula', { token: lia.dados.token, reservaId: ver().id, metodo: 'Pix' }); ok(!r.ok, 'profissional não recebe'); }

  console.log('— paga depois, quitada na comanda (aula avulsa incluída na comanda)');
  const aula2 = sem.aulas.find((a) => a.modalidade === 'Yoga' && a.id !== aula.id && a.ocupadosQtd < a.capacidade);
  const livre2 = Array.from({ length: aula2.capacidade }, (_, i) => i + 1).find((n) => !aula2.reservas.some((x) => x.tapete === n));
  chamar('b_agendar', { token: rec, aulaId: aula2.id, cpf: cpfA, tapete: livre2, forma: 'pagar' });
  const ver2 = () => chamar('b_agendaSemana', { token: rec, de: sem.de }).dados.aulas.find((a) => a.id === aula2.id).reservas.find((x) => x.cpf === cpfA);
  ok(ver2().aPagar, 'segunda aula a pagar');
  let cm = chamar('b_salvarComanda', { token: rec, comanda: { cpf: cpfA, itens: [{ tipo: 'plano', id: 'yoga-avulsa', nome: 'Yoga avulsa', qtd: 1 }] } }).dados;
  r = chamar('b_fecharComanda', { token: rec, id: cm.id, pagamentos: [{ metodo: 'Dinheiro', valor: cm.total }] });
  ok(r.ok && !ver2().aPagar, 'fechou a comanda: a aula a pagar ficou paga', r.erro || ver2());
}

console.log('— caixa do dia: cada lançamento com cliente, item e forma');
{
  const c = caixa();
  ok(Array.isArray(c.lancamentos) && c.lancamentos.length === c.qtdVendas, 'um lançamento por venda', [c.lancamentos.length, c.qtdVendas]);
  ok(c.lancamentos.every((l) => 'nome' in l && 'item' in l && 'metodo' in l && typeof l.valor === 'number'), 'cada um com nome, item, forma e valor');
  ok(c.lancamentos.some((l) => l.nome === 'Juliana Combo Teste' && /Combo Pausa/.test(l.item) && l.valor === 360 && l.comanda), 'o combo da Juliana aparece com o nome dela e a comanda');
}

console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
