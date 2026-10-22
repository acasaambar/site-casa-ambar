// Out/2026: combo escolhido no agendamento, data da venda e atendimento de dia passado (migração do Avec).
const { m, adm, hojeS } = require('./servidor.cjs');
const { chamar, ctx } = m;
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); } else console.log('  ✓', msg); };
const rec = chamar('b_entrar', { email: 'bia@acasaambar.com.br', senha: 'recep2026ok' }).dados.token;
const caixa = (data) => chamar('b_caixa', { token: adm, data }).dados;
let r;

const cat0 = chamar('b_catalogoServicos', { token: adm }).dados;
const prof = cat0.profissionais.filter((p) => p.ativo && p.categorias.includes('Estética corporal'))[0].nome;
r = chamar('b_salvarServico', { token: adm, servico: { nome: 'Drenagem Combo Teste', categoria: 'Estética corporal', duracao: 60, preco: 199, profissionais: [prof] } });
const serv = r.dados.servicos.find((s) => s.nome === 'Drenagem Combo Teste');
chamar('b_salvarPacote', { token: adm, pacote: { nome: 'Combo Alívio', servicoId: serv.id, sessoes: 5, preco: 945, validadeDias: 180, semJurosAte: 3, ativo: true } });
const pac5 = chamar('b_catalogoServicos', { token: adm }).dados.pacotes.find((p) => p.servicoId === serv.id && p.sessoes === 5);
const outro = cat0.servicos.find((s) => s.id !== serv.id);
const novo = (nome, w) => chamar('b_novoAluno', { token: rec, nome, whatsapp: w }).dados.cpf;
const saldo = (cpf, data = dia) => (chamar('b_creditosServico', { token: rec, cpf, servicoId: serv.id, data }).dados || {}).restantes || 0;
const livre = (dia) => chamar('b_horarios', { token: rec, servicoId: serv.id, profissional: prof, data: dia }).dados.horarios;
let dia = hojeS; for (let i = 1; i < 8; i++) { dia = ctx.somarDias(hojeS, i); if (livre(dia).length > 28) break; }
const hs0 = livre(dia); const hs = hs0.filter((h, i) => i % 4 === 0); // de hora em hora (o serviço dura 60 min)
const at = (id) => ctx.lerAba('Atendimentos').find((a) => a.id === id);

console.log('— combo escolhido no agendamento, pago no dia (comanda)');
{
  const cpf = novo('Combo Paga Dia', '85950001111');
  r = chamar('b_agendarServico', { token: rec, servicoId: serv.id, profissional: prof, data: dia, hora: hs[0], cpf, pagamento: 'no_dia', combo: outro && chamar('b_catalogoServicos', { token: adm }).dados.pacotes.find((p) => p.servicoId !== serv.id)?.id });
  ok(!r.ok || !r.dados.combo, 'combo de outro serviço não vale', r.erro);
  if (r.ok) chamar('b_atualizarAtendimento', { token: rec, id: r.dados.id, status: 'cancelado' });
  r = chamar('b_agendarServico', { token: rec, servicoId: serv.id, profissional: prof, data: dia, hora: hs[1], cpf, pagamento: 'no_dia', combo: pac5.id });
  ok(r.ok && r.dados.combo && r.dados.combo.preco === 945 && r.dados.pagamento === 'no_dia', 'agendado com o combo escolhido', r.erro || r.dados);
  const cm = chamar('b_comandaDoAtendimento', { token: rec, atendimentoId: r.dados.id }).dados;
  ok(cm.total === 945 && cm.itens.some((i) => i.tipo === 'pacote') && cm.itens.find((i) => i.tipo === 'servico').total === 0, 'a comanda já abre com o combo e a sessão sai dele', cm.total);
  r = chamar('b_fecharComanda', { token: rec, id: cm.id, pagamentos: [{ metodo: 'Cartão de crédito', bandeira: 'Visa', parcelas: 3, valor: 945 }] });
  ok(r.ok && saldo(cpf) === 4, 'fechou: ficam 4 sessões', r.erro || saldo(cpf));
}

console.log('— combo escolhido, já pagou na hora de agendar');
{
  const cpf = novo('Combo Ja Pagou', '85950002222');
  const antes = caixa().vendas;
  r = chamar('b_agendarServico', { token: rec, servicoId: serv.id, profissional: prof, data: dia, hora: hs[3], cpf, pagamento: 'pago', combo: pac5.id, metodo: 'Cartão de crédito', bandeira: 'Elo', parcelas: 3 });
  ok(r.ok && r.dados.pagamento === 'pacote' && saldo(cpf) === 4, 'vende o combo e a sessão sai dele (4 restantes)', r.erro || r.dados);
  ok(caixa().vendas === antes + 945, 'combo no caixa (R$ 945)');
  const pg = ctx.lerAba('Pagamentos').filter((p) => p.cpf === cpf).pop();
  ok(Number(pg.parcelas) === 3 && pg.bandeira === 'Elo', 'com bandeira e parcelas');
}

console.log('— combo escolhido, recebido pela agenda ao marcar atendido');
{
  const cpf = novo('Combo Na Agenda', '85950003333');
  const a1 = chamar('b_agendarServico', { token: rec, servicoId: serv.id, profissional: prof, data: hojeS < dia ? dia : dia, hora: hs[5], cpf, pagamento: 'no_dia', combo: pac5.id }).dados;
  r = chamar('b_atualizarAtendimento', { token: rec, id: a1.id, status: 'atendido', metodo: 'Pix' });
  ok(r.ok && r.dados.pagamento === 'pacote' && saldo(cpf) === 4, 'vendeu o combo e usou 1 sessão', r.erro || r.dados);
  const cpf2 = novo('So A Sessao Agenda', '85950004444');
  const a2 = chamar('b_agendarServico', { token: rec, servicoId: serv.id, profissional: prof, data: dia, hora: hs[6], cpf: cpf2, pagamento: 'no_dia', combo: pac5.id }).dados;
  r = chamar('b_atualizarAtendimento', { token: rec, id: a2.id, status: 'atendido', metodo: 'Pix', semCombo: true });
  ok(r.ok && r.dados.pagamento === 'pago' && r.dados.valor === 199 && saldo(cpf2) === 0, 'desmarcando o combo: cobra só a sessão', r.erro || r.dados);
}

console.log('— data da venda');
{
  const cpf = novo('Venda Passada', '85950005555');
  const ontem = ctx.somarDias(hojeS, -1), dez = ctx.somarDias(hojeS, -10);
  const antesHoje = caixa().vendas, antesDez = caixa(dez).vendas;
  r = chamar('b_vender', { token: rec, cpf, planoId: 'yoga-avulsa', metodo: 'Pix', dataVenda: dez });
  ok(r.ok, 'recepção lança venda com data passada', r.erro);
  ok(caixa(dez).vendas === antesDez + 63 && caixa().vendas === antesHoje, 'entra no caixa daquele dia, não no de hoje', [caixa(dez).vendas, antesDez]);
  ok(!chamar('b_vender', { token: rec, cpf, planoId: 'yoga-avulsa', metodo: 'Pix', dataVenda: ctx.somarDias(hojeS, 1) }).ok, 'data futura é recusada');
  ok(!chamar('b_vender', { token: rec, cpf, planoId: 'yoga-avulsa', metodo: 'Pix', dataVenda: ctx.somarDias(hojeS, -200) }).ok, 'mais de 120 dias é recusado');
  r = chamar('b_corrigirVenda', { token: rec, orderNsu: r.dados.orderNsu, metodo: 'Pix', valor: 63, dataVenda: ontem, motivo: 'era de ontem' });
  ok(r.ok && r.dados.pagoEm.slice(0, 10) === ontem, 'recepção corrige a data de uma venda lançada hoje', r.erro || r.dados);
  ok(caixa(dez).vendas === antesDez && caixa(ontem).lancamentos.some((l) => l.nome === 'Venda Passada'), 'muda de caixa junto');
}

console.log('— atendimento de dia passado (vindo do Avec)');
{
  const cpf = novo('Cliente Do Avec', '85950006666');
  const passado = ctx.somarDias(hojeS, -14);
  const antes = caixa(passado).vendas;
  r = chamar('b_agendarServico', { token: rec, servicoId: serv.id, profissional: prof, data: passado, hora: '06:40', cpf, pagamento: 'pago', metodo: 'Dinheiro' });
  ok(r.ok && r.dados.status === 'atendido', 'lançado como atendido (mesmo fora do turno)', r.erro || r.dados);
  ok(caixa(passado).vendas === antes + 199, 'a venda entrou no caixa daquele dia', caixa(passado).vendas - antes);
  ok(ctx.lerAba('Comissoes').some((c) => c.id === 'K' + r.dados.id && c.status === 'a_pagar'), 'comissão gerada');
  r = chamar('b_agendarServico', { token: rec, servicoId: serv.id, profissional: prof, data: passado, hora: '06:50', cpf, pagamento: 'no_dia' });
  ok(!r.ok && /já atende/.test(r.erro), 'choque de horário continua conferido', r.erro);
  r = chamar('b_agendarServico', { token: rec, servicoId: serv.id, profissional: prof, data: passado, hora: '10:00', cpf, pagamento: 'pago', combo: pac5.id, metodo: 'Pix' });
  ok(r.ok && r.dados.pagamento === 'pacote' && saldo(cpf, hojeS) === 4 && caixa(passado).lancamentos.some((l) => l.valor === 945), 'combo de dia passado: venda naquele dia e sessão usada', r.erro || r.dados);
  ok(!chamar('b_agendarServico', { token: rec, servicoId: serv.id, profissional: prof, data: ctx.somarDias(hojeS, -200), hora: '10:00', cpf, pagamento: 'no_dia' }).ok, 'mais de 120 dias é recusado');
  ok(!chamar('b_agendarServico', { token: rec, servicoId: serv.id, profissional: prof, data: passado, hora: '15:00', cpf, pagamento: 'no_dia', repetir: { cadaDias: 7, vezes: 3 } }).ok, 'série não vale para dia passado');
  r = chamar('b_agendarServico', { token: rec, servicoId: serv.id, profissional: prof, data: passado, hora: '16:00', cpf, pagamento: 'no_dia' });
  ok(r.ok && r.dados.status === 'atendido' && r.dados.pagamento === 'no_dia', '"ainda não pagou": fica atendido e a receber', r.erro || r.dados);
}

console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
