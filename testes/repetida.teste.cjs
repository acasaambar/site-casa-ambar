// Proteção contra venda duplicada (out/2026): mesmo cliente + mesmo item + mesmo valor + mesmo dia.
const { m, adm } = require('./servidor.cjs');
const { chamar, ctx, ss } = m;
ss.__semConfirmarSozinho = true; // aqui o teste vê a recusa de verdade (os outros testes confirmam como a tela faz)
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); } else console.log('  ✓', msg); };
const rec = chamar('b_entrar', { email: 'bia@acasaambar.com.br', senha: 'recep2026ok' }).dados.token;
const hoje = ctx.hojeTexto();
const novo = (nome, tel) => chamar('b_novoAluno', { token: rec, nome, whatsapp: tel }).dados.cpf;
const pagos = (cpf) => ctx.lerAba('Pagamentos').filter((p) => ctx.normCpf(p.cpf) === ctx.normCpf(cpf) && p.status === 'pago');
const confirma = (r, motivo = 'Outra sessão ou outro dia') => ({ confirmarRepetida: r.dados.repetidas.map((x) => x.nsu), motivoRepetida: motivo });
let r;

console.log('— balcão: a mesma venda de novo é recusada e mostra a que já existe');
{
  const cli = novo('Repetida Um', '85940002001');
  const v = chamar('b_vender', { token: rec, cpf: cli, planoId: 'yoga-mensal-2x', metodo: 'Pix' });
  ok(v.ok, 'primeira venda entra');
  r = chamar('b_vender', { token: rec, cpf: cli, planoId: 'yoga-mensal-2x', metodo: 'Pix' });
  ok(!r.ok && r.codigo === 'VENDA_DUPLICADA', 'segunda igual é recusada (VENDA_DUPLICADA)', r);
  const rep = r.dados && r.dados.repetidas && r.dados.repetidas[0];
  ok(rep && rep.nsu === v.dados.orderNsu && rep.valor === 350 && rep.origem === 'balcão' && rep.por === 'bia@acasaambar.com.br' && /^\d\d:\d\d$/.test(rep.hora),
    'a recusa traz a venda que já existe (item, valor, hora, quem, onde)', rep);
  ok(/Já existe uma venda igual hoje/.test(r.erro) && Array.isArray(r.dados.motivos) && r.dados.motivos.length >= 3, 'mensagem clara e lista de motivos para a tela');
  ok(pagos(cli).length === 1, 'nada foi lançado em dobro');
  ok(chamar('b_vender', { token: rec, cpf: cli, planoId: 'yoga-mensal-2x', metodo: 'Pix' }).codigo === 'VENDA_DUPLICADA', 'pode tentar de novo: continua recusada (clique repetido não passa)');

  console.log('— confirmar de propósito: precisa das vendas vistas e de um motivo');
  r = chamar('b_vender', { token: rec, cpf: cli, planoId: 'yoga-mensal-2x', metodo: 'Pix', confirmarRepetida: ['B000'], motivoRepetida: 'quero' });
  ok(!r.ok && r.codigo === 'VENDA_DUPLICADA', 'confirmar uma venda que não é a repetida não vale', r.erro);
  r = chamar('b_vender', { token: rec, cpf: cli, planoId: 'yoga-mensal-2x', metodo: 'Pix', confirmarRepetida: [rep.nsu], motivoRepetida: '' });
  ok(!r.ok && r.codigo === 'VENDA_DUPLICADA' && /motivo/i.test(r.erro), 'sem motivo, não registra', r.erro);
  r = chamar('b_vender', { token: rec, cpf: cli, planoId: 'yoga-mensal-2x', metodo: 'Pix', confirmarRepetida: [rep.nsu], motivoRepetida: 'Outra sessão ou outro dia' });
  ok(r.ok && pagos(cli).length === 2, 'com a venda vista e o motivo, registra', r.erro);
  const nova = ctx.lerAba('Pagamentos').find((p) => p.order_nsu === r.dados.orderNsu);
  ok(/Repetida de propósito \(Outra sessão ou outro dia\)/.test(nova.observacao), 'o motivo fica na observação da venda', nova.observacao);
  ok(chamar('b_registro', { token: adm }).dados.some((x) => x.acao === 'venda repetida confirmada' && x.quem === 'bia@acasaambar.com.br' && /Outra sessão/.test(x.detalhe)), 'e no Registro, com quem confirmou');
  r = chamar('b_vender', { token: rec, cpf: cli, planoId: 'yoga-mensal-2x', metodo: 'Pix' });
  ok(!r.ok && r.codigo === 'VENDA_DUPLICADA' && r.dados.repetidas.length === 2, 'a terceira mostra as duas que já existem', r.dados);
}

console.log('— o que NÃO é duplicada passa');
{
  const cli = novo('Repetida Dois', '85940002002');
  const outro = novo('Repetida Tres', '85940002003');
  chamar('b_vender', { token: rec, cpf: cli, planoId: 'yoga-mensal-2x', metodo: 'Pix' });
  ok(chamar('b_vender', { token: rec, cpf: outro, planoId: 'yoga-mensal-2x', metodo: 'Pix' }).ok, 'mesmo item para outra pessoa');
  ok(chamar('b_vender', { token: rec, cpf: cli, planoId: 'pilates-mensal-2x', metodo: 'Pix' }).ok, 'outro item para a mesma pessoa');
  ok(chamar('b_vender', { token: rec, cpf: cli, planoId: 'yoga-mensal-2x', metodo: 'Pix', valor: 300 }).ok, 'mesmo item com outro valor (negociado)');
  const ontem = ctx.somarDias(hoje, -1);
  const antiga = ctx.somarDias(hoje, -5), outraAntiga = ctx.somarDias(hoje, -9);
  ok(chamar('b_vender', { token: rec, cpf: outro, planoId: 'pilates-mensal-2x', metodo: 'Pix', dataVenda: antiga }).ok, 'venda com data passada (migração) entra');
  ok(chamar('b_vender', { token: rec, cpf: outro, planoId: 'pilates-mensal-2x', metodo: 'Pix', dataVenda: outraAntiga }).ok, 'outra venda igual com OUTRA data passada também entra (são sessões diferentes da migração)');
  r = chamar('b_vender', { token: rec, cpf: outro, planoId: 'pilates-mensal-2x', metodo: 'Pix', dataVenda: antiga });
  ok(!r.ok && r.codigo === 'VENDA_DUPLICADA', 'mas repetir a mesma data passada é recusado', r.erro);
  // lançada hoje e de novo com data passada (ou o contrário): o dia de recebimento muda, o de lançamento não
  r = chamar('b_vender', { token: rec, cpf: cli, planoId: 'yoga-mensal-2x', metodo: 'Pix', dataVenda: ontem });
  ok(!r.ok && r.codigo === 'VENDA_DUPLICADA', 'venda de hoje + a mesma com a data de ontem: recusada (lançada em dobro)', r.erro);
  const cliB = novo('Repetida Retro', '85940002014');
  ok(chamar('b_vender', { token: rec, cpf: cliB, planoId: 'yoga-mensal-2x', metodo: 'Pix', dataVenda: ontem }).ok, 'primeiro com a data de ontem');
  r = chamar('b_vender', { token: rec, cpf: cliB, planoId: 'yoga-mensal-2x', metodo: 'Pix' });
  ok(!r.ok && r.codigo === 'VENDA_DUPLICADA', 'e depois a mesma com a data de hoje: recusada', r.erro);
}

console.log('— estornada ou excluída não conta');
{
  const cli = novo('Repetida Quatro', '85940002004');
  const v = chamar('b_vender', { token: rec, cpf: cli, planoId: 'yoga-mensal-1x', metodo: 'Pix' }).dados;
  ok(chamar('b_estornar', { token: rec, orderNsu: v.orderNsu, motivo: 'engano' }).ok, 'venda estornada');
  ok(chamar('b_vender', { token: rec, cpf: cli, planoId: 'yoga-mensal-1x', metodo: 'Pix' }).ok, 'lançar de novo depois do estorno não pede confirmação');
  const v2 = chamar('b_vender', { token: rec, cpf: cli, planoId: 'pilates-avulsa', metodo: 'Pix' }).dados;
  ok(chamar('b_excluirVenda', { token: rec, orderNsu: v2.orderNsu, motivo: 'lancei errado' }).ok, 'venda excluída');
  ok(chamar('b_vender', { token: rec, cpf: cli, planoId: 'pilates-avulsa', metodo: 'Pix' }).ok, 'lançar de novo depois de excluir também passa');
}

console.log('— venda com vários itens');
{
  const cli = novo('Repetida Cinco', '85940002005');
  r = chamar('b_vender', { token: rec, cpf: cli, itens: [{ planoId: 'yoga-avulsa' }, { planoId: 'yoga-avulsa' }], metodo: 'Pix' });
  ok(r.ok && pagos(cli).length === 2, 'dois itens iguais na mesma venda são de propósito: passam');
  const cli2 = novo('Repetida Seis', '85940002006');
  chamar('b_vender', { token: rec, cpf: cli2, planoId: 'pilates-avulsa', metodo: 'Pix' });
  const antes = ctx.lerAba('Pagamentos').length;
  r = chamar('b_vender', { token: rec, cpf: cli2, itens: [{ planoId: 'yoga-avulsa' }, { planoId: 'pilates-avulsa' }], metodo: 'Pix' });
  ok(!r.ok && r.codigo === 'VENDA_DUPLICADA' && r.dados.repetidas.length === 1 && r.dados.repetidas[0].item === 'Pilates · aula avulsa', 'um item repetido barra a venda e mostra qual', r.erro);
  ok(ctx.lerAba('Pagamentos').length === antes, 'e nada do 1º item foi lançado antes da recusa');
  r = chamar('b_vender', { token: rec, cpf: cli2, itens: [{ planoId: 'yoga-avulsa' }, { planoId: 'pilates-avulsa' }], metodo: 'Pix', ...confirma(r) });
  ok(r.ok && pagos(cli2).length === 3, 'confirmando, a venda inteira entra', r.erro);
}

console.log('— agenda: "Já pagou" e Vendas valem como a mesma porta');
{
  const cli = novo('Repetida Sete', '85940002007');
  let dia = ctx.somarDias(hoje, 1); if (new Date(dia + 'T12:00:00Z').getUTCDay() === 0) dia = ctx.somarDias(dia, 1);
  chamar('b_salvarProfissional', { token: adm, profissional: { nome: 'Lia Esteticista', categorias: ['Estética facial', 'Estética corporal'], dias: [0, 1, 2, 3, 4, 5, 6], inicio: '06:00', fim: '23:00', comissao: 40 } });
  const ag = (hora, extra = {}) => chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: dia, hora, cpf: cli, pagamento: 'pago', metodo: 'Pix', ...extra });
  r = ag('10:00');
  ok(r.ok, 'serviço agendado como pago');
  r = ag('14:00');
  ok(!r.ok && r.codigo === 'VENDA_DUPLICADA', 'agendar o mesmo serviço pago de novo no mesmo dia é recusado', r.erro);
  ok(ctx.lerAba('Atendimentos').filter((a) => ctx.normCpf(a.cpf) === ctx.normCpf(cli)).length === 1, 'e o horário novo não foi criado');
  r = chamar('b_vender', { token: rec, cpf: cli, planoId: 'drenagem', metodo: 'Pix' });
  ok(!r.ok && r.codigo === 'VENDA_DUPLICADA' && r.dados.repetidas[0].item === 'Drenagem Linfática', 'a mesma venda direto em Vendas também é pega', r.erro);
  r = ag('14:00', confirma(r, 'Outra sessão ou outro dia'));
  ok(r.ok, 'sendo outra sessão mesmo, confirma e agenda', r.erro);
}

console.log('— comanda: serviço já vendido hoje pede confirmação; produto não');
{
  const cli = novo('Repetida Oito', '85940002008');
  const protetor = chamar('b_salvarProduto', { token: adm, produto: { nome: 'Protetor R', categoria: 'Revenda (home care)', vende: true, preco: 90, custo: 40, estoqueInicial: 9 } }).dados.produtos.find((p) => p.nome === 'Protetor R').id;
  chamar('b_vender', { token: rec, cpf: cli, planoId: 'drenagem', metodo: 'Pix' });
  const abrir = (itens) => chamar('b_salvarComanda', { token: rec, comanda: { cpf: cli, itens } }).dados;
  const c1 = abrir([{ tipo: 'servico', id: 'drenagem', profissional: 'Lia Esteticista' }]);
  const fechar = (c, extra = {}) => chamar('b_fecharComanda', { token: rec, id: c.id, pagamentos: [{ metodo: 'Pix', valor: c.total }], ...extra });
  r = fechar(c1);
  ok(!r.ok && r.codigo === 'VENDA_DUPLICADA' && r.dados.repetidas[0].origem === 'balcão', 'fechar comanda com serviço já vendido hoje pelo mesmo valor é recusado', r.erro);
  ok(chamar('b_comanda', { token: rec, id: c1.id }).dados.status === 'aberta', 'a comanda continua aberta, sem nada cobrado');
  ok(pagos(cli).length === 1, 'nenhum pagamento novo');
  r = fechar(c1, confirma(r, 'Outro item igual a pedido da pessoa'));
  ok(r.ok, 'confirmando, a comanda fecha', r.erro);
  ok(ctx.lerAba('Pagamentos').some((p) => p.comanda === c1.id && /venda repetida de propósito: Outro item igual/.test(p.observacao)), 'o motivo fica no pagamento da comanda');
  // produto comprado duas vezes no dia: normal
  const c2 = abrir([{ tipo: 'produto', id: protetor, qtd: 1 }]);
  ok(fechar(c2).ok, 'produto 1ª vez');
  const c3 = abrir([{ tipo: 'produto', id: protetor, qtd: 1 }]);
  ok(fechar(c3).ok, 'produto 2ª vez no mesmo dia: não é barrado');
  // reabrir e fechar de novo a mesma comanda não se acusa a si mesma
  const c4 = abrir([{ tipo: 'servico', id: 'limpeza-pele', profissional: 'Lia Esteticista' }]);
  ok(fechar(c4).ok, 'comanda de outro serviço fecha');
  ok(chamar('b_reabrirComanda', { token: adm, id: c4.id, motivo: 'corrigir' }).ok, 'reaberta pela administração');
  ok(fechar(c4).ok, 'fechar de novo a mesma comanda (o pagamento antigo foi estornado) passa');
}

console.log('— site: a venda paga pelo site aparece para quem lança no balcão');
{
  const cli = novo('Repetida Nove', '85940002009');
  const v = chamar('b_vender', { token: rec, cpf: cli, planoId: 'yoga-mensal-1x', metodo: 'Pix' }).dados;
  // como se a aluna tivesse pago pelo site (mesma linha, origem site)
  ctx.atualizarLinha('Pagamentos', ctx.linhaPagamento(v.orderNsu)._linha, { origem: 'site', registrado_por: '' });
  r = chamar('b_vender', { token: rec, cpf: cli, planoId: 'yoga-mensal-1x', metodo: 'Pix' });
  ok(!r.ok && r.codigo === 'VENDA_DUPLICADA' && r.dados.repetidas[0].origem === 'site' && /pelo site/.test(r.erro), 'venda do site já paga hoje: a recepção é avisada antes de lançar de novo', r.erro);
}

console.log('— lista das vendas que podem ter sido lançadas em dobro (as que já estavam na planilha)');
{
  const cli = novo('Lista Dupla', '85940002010');
  let dia = ctx.somarDias(hoje, 1); if (new Date(dia + 'T12:00:00Z').getUTCDay() === 0) dia = ctx.somarDias(dia, 1);
  // a situação da dona: "Já pagou" na agenda e de novo em Vendas (a proteção ainda não existia: lança de propósito)
  const ag = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: dia, hora: '16:00', cpf: cli, pagamento: 'pago', metodo: 'Pix' });
  ok(ag.ok, 'serviço pago na agenda');
  const solta = chamar('b_vender', { token: rec, cpf: cli, planoId: 'drenagem', metodo: 'Pix', ...confirma(chamar('b_vender', { token: rec, cpf: cli, planoId: 'drenagem', metodo: 'Pix' })) });
  ok(solta.ok, 'e de novo em Vendas (confirmado de propósito)');
  const outro = novo('Lista Parecida', '85940002011');
  chamar('b_vender', { token: rec, cpf: outro, planoId: 'yoga-mensal-1x', metodo: 'Pix' });
  chamar('b_vender', { token: rec, cpf: outro, planoId: 'yoga-mensal-1x', metodo: 'Pix', valor: 150 });
  const unico = novo('Lista Unica', '85940002012');
  chamar('b_vender', { token: rec, cpf: unico, planoId: 'yoga-mensal-1x', metodo: 'Pix' });
  r = chamar('b_vendasDuplicadas', { token: rec });
  ok(r.ok, 'a lista abre para a recepção', r.erro);
  const g = r.ok && r.dados.grupos.find((x) => x.cpf === ctx.normCpf(cli));
  ok(g && g.tipo === 'igual' && g.vendas.length === 2 && g.item === 'Drenagem Linfática', 'agenda + Vendas do mesmo serviço, valor e dia: provável duplicada', g);
  const [primeira, segunda] = g ? g.vendas : [];
  ok(primeira && primeira.ligacao.tipo === 'agenda' && primeira.ligacao.agenda.id === ag.dados.id && !primeira.sugerida, 'a venda ligada à agenda fica', primeira && primeira.ligacao);
  ok(segunda && segunda.ligacao.tipo === 'balcão' && segunda.sugerida === true && g.sobra === 199, 'a venda solta do balcão é a que sobra (R$ 199 em dobro)', segunda);
  const gp = r.dados.grupos.find((x) => x.cpf === ctx.normCpf(outro));
  ok(gp && gp.tipo === 'parecida' && gp.sobra === 0 && gp.vendas.every((x) => !x.sugerida), 'mesmo item e dia com valor diferente: só "conferir", sem sugestão', gp);
  ok(!r.dados.grupos.some((x) => x.cpf === ctx.normCpf(unico)), 'venda única não aparece');
  ok(r.dados.resumo.provaveis >= 1 && r.dados.resumo.valorEmDobro >= 199, 'resumo com a soma em dobro', r.dados.resumo);
  // resolver: excluir a solta tira o grupo da lista
  ok(chamar('b_excluirVenda', { token: rec, orderNsu: segunda.orderNsu, motivo: 'estava em dobro' }).ok, 'exclui a venda em dobro');
  r = chamar('b_vendasDuplicadas', { token: rec });
  ok(!r.dados.grupos.some((x) => x.cpf === ctx.normCpf(cli)), 'o grupo resolvido sai da lista');
  // "não é duplicada": marca o grupo e ele sai; pede as vendas do grupo
  ok(!chamar('b_conferirVendas', { token: rec, orderNsus: [gp.vendas[0].orderNsu] }).ok, 'marcar conferida exige as vendas do grupo');
  r = chamar('b_conferirVendas', { token: rec, orderNsus: gp.vendas.map((x) => x.orderNsu), motivo: 'uma é o plano, a outra é diferença' });
  ok(r.ok, 'marcado como conferido', r.erro);
  ok(!chamar('b_vendasDuplicadas', { token: rec }).dados.grupos.some((x) => x.cpf === ctx.normCpf(outro)), 'grupo conferido sai da lista');
  ok(/Conferida \(não é duplicada\) por bia/.test(ctx.lerAba('Pagamentos').find((p) => p.order_nsu === gp.vendas[0].orderNsu).observacao), 'a observação guarda quem conferiu');
  // nova venda igual no mesmo grupo conferido volta a aparecer
  chamar('b_vender', { token: rec, cpf: outro, planoId: 'yoga-mensal-1x', metodo: 'Pix', valor: 150, ...confirma(chamar('b_vender', { token: rec, cpf: outro, planoId: 'yoga-mensal-1x', metodo: 'Pix', valor: 150 })) });
  ok(chamar('b_vendasDuplicadas', { token: rec }).dados.grupos.some((x) => x.cpf === ctx.normCpf(outro)), 'uma venda nova igual depois da conferência volta a aparecer');
}

console.log('— venda ligada à agenda pelo crédito (venda de serviço + sessão usada do crédito dela)');
{
  const cli = novo('Lista Credito', '85940002013');
  let dia = ctx.somarDias(hoje, 2); if (new Date(dia + 'T12:00:00Z').getUTCDay() === 0) dia = ctx.somarDias(dia, 1);
  const v1 = chamar('b_vender', { token: rec, cpf: cli, planoId: 'limpeza-pele', metodo: 'Pix' });
  ok(v1.ok, 'venda do serviço no balcão');
  const ag = chamar('b_agendarServico', { token: rec, servicoId: 'limpeza-pele', profissional: 'Lia Esteticista', data: dia, hora: '09:00', cpf: cli, pagamento: 'pacote' });
  ok(ag.ok, 'agendado usando o crédito da venda', ag.erro);
  const v2 = chamar('b_vender', { token: rec, cpf: cli, planoId: 'limpeza-pele', metodo: 'Pix' });
  chamar('b_vender', { token: rec, cpf: cli, planoId: 'limpeza-pele', metodo: 'Pix', ...confirma(v2) });
  r = chamar('b_vendasDuplicadas', { token: rec });
  const g = r.dados.grupos.find((x) => x.cpf === ctx.normCpf(cli));
  ok(g && g.vendas[0].orderNsu === v1.dados.orderNsu && g.vendas[0].ligacao.tipo === 'agenda' && !g.vendas[0].sugerida && g.vendas[1].sugerida === true, 'a venda cujo crédito a agenda usou fica; a outra sobra', g && g.vendas.map((x) => [x.ligacao.tipo, x.sugerida]));
}

console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
