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
  ok(chamar('b_vender', { token: rec, cpf: cli, planoId: 'yoga-mensal-2x', metodo: 'Pix', dataVenda: ontem }).ok, 'mesma venda em outro dia (lançada com a data de ontem)');
  r = chamar('b_vender', { token: rec, cpf: cli, planoId: 'yoga-mensal-2x', metodo: 'Pix', dataVenda: ontem });
  ok(!r.ok && r.codigo === 'VENDA_DUPLICADA', 'mas lançar ontem duas vezes é recusado', r.erro);
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

console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
