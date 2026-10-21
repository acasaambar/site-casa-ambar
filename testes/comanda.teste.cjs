// Comanda editável (trocar serviço/profissional, desconto, observação), vale vendido, reabrir e excluir cliente
const { criar } = require('./simulador.cjs');
const END_TESTE = { cep: '60150-160', endereco: 'Rua Eduardo Salgado', numero: '448', bairro: 'Aldeota', cidade: 'Fortaleza', uf: 'CE' };
const R = require('path').join(__dirname, '..', 'apps-script');
const m = criar([R + '/Codigo.gs', R + '/Seguranca.gs', R + '/Vales.gs', R + '/Bancada.gs', R + '/Relatorios.gs', R + '/Servicos.gs', R + '/Gestao.gs', R + '/Clientes.gs', R + '/Marketing.gs', R + '/Substituicoes.gs']);
const { ctx, chamar, emails } = m;
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); } else console.log('  ✓', msg); };
const linkDe = (e) => (e.body.match(/t=([a-f0-9]+)/) || [])[1];
const hoje = ctx.hojeTexto();
const FICHA = { emergencia_nome: 'Mãe', emergencia_telefone: '85999998888', parq_1: 'nao', parq_2: 'nao', parq_3: 'nao', parq_4: 'nao', parq_5: 'nao', parq_6: 'nao', parq_7: 'nao', declaracao: true, consentimento: true, data_nascimento: '1990-05-12' };
ctx.configurarPlanilha();
ctx.autorizarEmails(); chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'ambar2026adm' });
const adm = chamar('b_entrar', { email: 'contato@acasaambar.com.br', senha: 'ambar2026adm' }).dados.token;
chamar('b_salvarMembro', { token: adm, membro: { email: 'bia@acasaambar.com.br', nome: 'Bia Santos', papel: 'recepcao' } });
chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'recep2026ok' });
const rec = chamar('b_entrar', { email: 'bia@acasaambar.com.br', senha: 'recep2026ok' }).dados.token;
chamar('b_salvarProfissional', { token: adm, profissional: { nome: 'Lia Esteticista', categorias: ['Estética facial', 'Estética corporal'], dias: [0, 1, 2, 3, 4, 5, 6], inicio: '06:00', fim: '23:00', comissao: 40, comissaoProduto: 10 } });
chamar('b_salvarProfissional', { token: adm, profissional: { nome: 'Mara Facial', categorias: ['Estética facial', 'Estética corporal'], dias: [0, 1, 2, 3, 4, 5, 6], inicio: '06:00', fim: '23:00', comissao: 30 } });
const protetor = chamar('b_salvarProduto', { token: adm, produto: { nome: 'Protetor solar', categoria: 'Revenda (home care)', vende: true, preco: 120, custo: 60, estoqueInicial: 5 } }).dados.produtos[0].id;
const estoque = () => ctx.lerAba('Produtos').find((p) => p.id === protetor).estoque;
chamar('cadastrar', { endereco: END_TESTE, cpf: '529.982.247-25', nome: 'Maria Souza', whatsapp: '85999990000', email: 'maria@gmail.com', senha: 'abc12345' });
let r;

console.log('— comanda editável');
let dia = ctx.somarDias(hoje, 1); if (new Date(dia + 'T12:00:00Z').getUTCDay() === 0) dia = ctx.somarDias(dia, 1);
const at = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: dia, hora: '10:00', cpf: '52998224725', pagamento: 'no_dia' }).dados.id;
ok(!!at, 'atendimento da Lia (drenagem)');
let cm = chamar('b_comandaDoAtendimento', { token: rec, atendimentoId: at }).dados;
ok(cm.itens.length === 1 && cm.itens[0].uid && cm.historico.length === 1, 'comanda aberta com histórico', cm);
const itens = cm.itens.map((i) => ({ ...i }));
itens[0] = { ...itens[0], id: 'limpeza-pele', nome: 'Limpeza de Pele', profissional: 'Mara Facial', descontoTipo: 'pct', descontoValor: 10, motivoDesconto: 'Aniversário', obs: 'Pele sensível' };
itens.push({ tipo: 'produto', id: protetor, nome: 'Protetor', qtd: 2, descontoTipo: 'valor', descontoValor: 20, motivoDesconto: 'Cliente antiga' });
r = chamar('b_salvarComanda', { token: rec, comanda: { id: cm.id, itens } });
cm = r.dados;
const limp = cm.itens[0], prod = cm.itens[1];
ok(r.ok && limp.id === 'limpeza-pele' && limp.profissional === 'Mara Facial' && limp.valor === Math.round(limp.preco * 0.9 * 100) / 100 && limp.obs === 'Pele sensível' && limp.motivoDesconto === 'Aniversário',
  'troca de serviço e profissional, desconto de 10% e observação', limp);
ok(prod.valor === 100 && prod.total === 200, 'desconto de R$ 20 por unidade no produto', prod);
const atLinha = () => ctx.lerAba('Atendimentos').find((a) => a.id === at);
ok(atLinha().servico_id === 'limpeza-pele' && atLinha().profissional === 'Mara Facial', 'a agenda acompanha: serviço e profissional trocados');
ok(cm.historico.some((h) => /trocou Drenagem/.test(h.t)) && cm.historico.some((h) => /Lia Esteticista → Mara Facial/.test(h.t)) && cm.historico.some((h) => /incluiu Protetor/.test(h.t)),
  'histórico registra cada mudança, com quem fez', cm.historico);
const total1 = cm.total;
r = chamar('b_fecharComanda', { token: rec, id: cm.id, pagamentos: [{ metodo: 'Pix', valor: total1 }] });
ok(r.ok && r.dados.status === 'fechada' && r.dados.historico.some((h) => /^fechou/.test(h.t)), 'comanda fechada', r);
const kAt = () => ctx.lerAba('Comissoes').find((k) => k.id === 'K' + at);
ok(kAt() && kAt().profissional === 'Mara Facial' && Number(kAt().pct) === 30 && kAt().status === 'a_pagar', 'comissão da Mara pelo serviço trocado', kAt());
ok(estoque() === 3, 'estoque baixou 2', estoque());

console.log('— reabrir comanda fechada (só administração)');
r = chamar('b_reabrirComanda', { token: rec, id: cm.id, motivo: 'erro' });
ok(!r.ok && /não permite/.test(r.erro), 'recepção não reabre');
r = chamar('b_reabrirComanda', { token: adm, id: cm.id, motivo: '' });
ok(!r.ok && /motivo/.test(r.erro), 'pede o motivo');
r = chamar('b_reabrirComanda', { token: adm, id: cm.id, motivo: 'Cobrei o protetor a mais' });
ok(r.ok && r.dados.status === 'aberta' && r.dados.historico.some((h) => /reabriu/.test(h.t)), 'reaberta, com o motivo no histórico', r);
ok(ctx.lerAba('Pagamentos').filter((p) => p.comanda === cm.id).every((p) => p.status === 'estornado'), 'pagamentos estornados');
ok(estoque() === 5, 'estoque devolvido', estoque());
ok(kAt().status === 'cancelada', 'comissão cancelada até fechar de novo');
const itens2 = r.dados.itens.filter((i) => i.tipo !== 'produto');
r = chamar('b_salvarComanda', { token: rec, comanda: { id: cm.id, itens: itens2, motivo: 'protetor não levado' } });
ok(r.ok && r.dados.historico.some((h) => /tirou Protetor/.test(h.t) && /protetor não levado/.test(h.t)), 'tirar item com motivo fica no histórico', r.dados && r.dados.historico);
r = chamar('b_fecharComanda', { token: rec, id: cm.id, pagamentos: [{ metodo: 'Dinheiro', valor: r.dados.total }] });
ok(r.ok && kAt().status === 'a_pagar' && estoque() === 5, 'fechada de novo: comissão volta, sem baixar o protetor', [kAt(), estoque()]);

console.log('— vale-presente vendido na comanda');
r = chamar('b_salvarComanda', { token: rec, comanda: { cpf: '52998224725', itens: [{ tipo: 'vale', vale: { tipo: 'valor', valor: 150, nome: 'Júlia Lima', email: 'julia@gmail.com', whatsapp: '85988887777', mensagem: 'Feliz aniversário!', enviarEmail: true } }] } });
const cv = r.dados;
ok(r.ok && cv.total === 150 && cv.itens[0].tipo === 'vale' && /para Júlia/.test(cv.itens[0].nome), 'vale de R$ 150 como item da comanda', r);
r = chamar('b_fecharComanda', { token: rec, id: cv.id, pagamentos: [{ metodo: 'Vale-presente', valor: 150, codigo: 'X' }] });
ok(!r.ok, 'não se paga vale com vale');
const nEmails = emails.length;
r = chamar('b_fecharComanda', { token: rec, id: cv.id, pagamentos: [{ metodo: 'Cartão de crédito', valor: 150, parcelas: 1, bandeira: 'Visa' }] });
const novoVale = r.ok && r.dados.valesCriados[0];
ok(novoVale && /^AMBAR-/.test(novoVale.codigo) && novoVale.emailEnviado && /AMBAR-/.test(novoVale.textoWhats) && novoVale.whatsapp === '85988887777', 'código gerado ao fechar, com e-mail e WhatsApp prontos', r);
ok(emails.length === nEmails + 1 && emails.at(-1).to === 'julia@gmail.com', 'e-mail do vale para quem recebe');
const linhaVale = ctx.lerAba('Vales').find((v) => v.codigo === novoVale.codigo);
ok(linhaVale.origem === 'vendido' && linhaVale.comanda === cv.id && linhaVale.status === 'ativo' && Number(linhaVale.valor) === 150, 'vale registrado como vendido, ligado à comanda', linhaVale);
const pgVale = ctx.lerAba('Pagamentos').find((p) => p.comanda === cv.id);
ok(pgVale.tipo_item === 'vale' && pgVale.status === 'pago' && !ctx.lerAba('Creditos').some((c) => c.id === 'C' + String(pgVale.order_nsu).slice(1)), 'entrou como venda paga, sem criar crédito de aula');
// usar o vale em outra comanda e tentar reabrir a da venda
const outra = chamar('b_salvarComanda', { token: rec, comanda: { cliente: { nome: 'Júlia Lima', whatsapp: '85988887777' }, itens: [{ tipo: 'produto', id: protetor, qtd: 1 }] } }).dados;
r = chamar('b_fecharComanda', { token: rec, id: outra.id, pagamentos: [{ metodo: 'Vale-presente', valor: 120, codigo: novoVale.codigo }] });
ok(r.ok, 'vale usado para pagar outra comanda', r);
r = chamar('b_reabrirComanda', { token: adm, id: cv.id, motivo: 'teste' });
ok(!r.ok && /já foi usado/.test(r.erro), 'não reabre a venda de um vale já usado', r);
r = chamar('b_reabrirComanda', { token: adm, id: outra.id, motivo: 'pagou errado' });
ok(r.ok && r.dados.status === 'aberta', 'reabre a comanda que usou o vale', r);
r = chamar('b_reabrirComanda', { token: adm, id: cv.id, motivo: 'cliente desistiu' });
ok(r.ok && ctx.lerAba('Vales').find((v) => v.codigo === novoVale.codigo).status === 'cancelado', 'com o vale de volta, a venda pode ser reaberta e o vale é cancelado', r);
r = chamar('b_fecharComanda', { token: rec, id: cv.id, pagamentos: [{ metodo: 'Pix', valor: 150 }] });
const segundo = r.ok && r.dados.valesCriados[0];
ok(segundo && segundo.codigo !== novoVale.codigo, 'fechada de novo: nasce outro código', r);
r = chamar('b_reabrirComanda', { token: adm, id: cv.id, motivo: 'segunda correção' });
ok(r.ok && ctx.lerAba('Vales').find((v) => v.codigo === segundo.codigo).status === 'cancelado', 'pode reabrir de novo (o vale antigo cancelado não atrapalha)', r);

console.log('— revisão: reagendar move o atendimento, sem cobrar de novo');
{
  const diaU = (base) => { let d = base; while ([0, 6].includes(new Date(d + 'T12:00:00Z').getUTCDay())) d = ctx.somarDias(d, 1); return d; };
  const d1 = diaU(ctx.somarDias(hoje, 8)), d2 = diaU(ctx.somarDias(d1, 1));
  // pago na hora e reagendado: mesmo id, um pagamento só
  r = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: d1, hora: '10:00', cpf: '52998224725', pagamento: 'pago', metodo: 'Pix' });
  const idPago = r.dados.id;
  const pagosAntes = ctx.lerAba('Pagamentos').filter((p) => p.cpf === '52998224725' && p.status === 'pago').length;
  r = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: d2, hora: '11:00', cpf: '52998224725', pagamento: 'pago', metodo: 'Pix', reagendarId: idPago });
  const movido = ctx.lerAba('Atendimentos').find((a) => a.id === idPago);
  ok(r.ok && r.dados.id === idPago && String(movido.data).slice(0, 10) === d2 && movido.hora === '11:00' && movido.pagamento === 'pago', 'reagendar move o mesmo atendimento (continua pago)', [r, movido]);
  ok(ctx.lerAba('Pagamentos').filter((p) => p.cpf === '52998224725' && p.status === 'pago').length === pagosAntes, 'reagendar não registra outro pagamento');
  r = chamar('b_agendarServico', { token: rec, servicoId: 'limpeza-pele', profissional: 'Lia Esteticista', data: d2, hora: '14:00', cpf: '52998224725', reagendarId: idPago });
  ok(!r.ok && /não o serviço/.test(r.erro), 'horário pago não troca de serviço ao reagendar', r);
  // última sessão do pacote: reagendar não pede outro pacote
  chamar('b_vender', { token: rec, cpf: '52998224725', planoId: 'drenagem-5', metodo: 'Pix' });
  const ids = [];
  for (let i = 0; i < 5; i++) {
    r = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: ctx.somarDias(d2, 7 * (i + 1)), hora: '15:00', cpf: '52998224725', pagamento: 'pacote' });
    if (r.ok) ids.push(r.dados.id);
  }
  r = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: ctx.somarDias(d2, 7), hora: '16:00', cpf: '52998224725', pagamento: 'pacote', reagendarId: ids[4] });
  ok(ids.length === 5 && r.ok && r.dados.id === ids[4], 'reagendar a última sessão do pacote funciona', r);
  r = chamar('b_aluno', { token: rec, cpf: '52998224725' });
  const pac = r.dados.creditos.find((c) => /pacote/.test(c.descricao) && c.vigente);
  ok(pac && pac.usadas === 5 && pac.limite === 5, 'ficha mostra as sessões usadas do pacote (5/5)', pac);
  ids.forEach((id) => chamar('b_atualizarAtendimento', { token: rec, id, status: 'cancelado' }));
}

console.log('— revisão: comanda aberta e agenda não cobram duas vezes');
{
  const dA = ctx.somarDias(hoje, 0);
  r = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: ctx.somarDias(hoje, 20), hora: '08:00', cliente: { nome: 'Paula Nunes', whatsapp: '85977776666' }, pagamento: 'no_dia' });
  const atC = r.dados.id;
  const cmC = chamar('b_comandaDoAtendimento', { token: rec, atendimentoId: atC }).dados;
  r = chamar('b_atualizarAtendimento', { token: rec, id: atC, status: 'atendido', metodo: 'Pix' });
  ok(!r.ok && /comanda aberta/.test(r.erro), 'marcar atendido + receber pela agenda é recusado se já está numa comanda aberta', r);
  r = chamar('b_atualizarAtendimento', { token: rec, id: atC, status: 'cancelado' });
  ok(!r.ok && /Tire o item/.test(r.erro), 'cancelar atendimento que está numa comanda aberta pede para tirar o item antes', r);
  // item com "pago" falso vindo da tela: o servidor decide pelo atendimento
  r = chamar('b_salvarComanda', { token: rec, comanda: { id: cmC.id, itens: cmC.itens.map((i) => ({ ...i, pago: true })) } });
  ok(r.ok && r.dados.total > 0 && !r.dados.itens[0].pago, 'a tela não consegue marcar o item da agenda como "já pago"', r.dados && r.dados.itens);
  r = chamar('b_fecharComanda', { token: rec, id: cmC.id, pagamentos: [{ metodo: 'Pix', valor: r.dados.total }] });
  ok(r.ok, 'comanda do atendimento fecha', r);
  const pgC = ctx.lerAba('Pagamentos').find((p) => p.comanda === cmC.id);
  r = chamar('b_estornar', { token: rec, orderNsu: pgC.order_nsu, motivo: 'teste' });
  ok(!r.ok && /Reabrir/.test(r.erro), 'estorno de venda da comanda manda reabrir a comanda', r);
  // vale em R$ no campo do código da comanda é recusado (abatia por unidade)
  const cv = chamar('b_salvarComanda', { token: rec, comanda: { cliente: { nome: 'Rita Gomes', whatsapp: '85991234567' }, itens: [{ tipo: 'vale', vale: { tipo: 'valor', valor: 40 } }] } }).dados;
  const v40 = chamar('b_fecharComanda', { token: rec, id: cv.id, pagamentos: [{ metodo: 'Pix', valor: 40 }] }).dados.valesCriados[0].codigo;
  r = chamar('b_salvarComanda', { token: rec, comanda: { cliente: { nome: 'Rita Gomes', whatsapp: '85991234567' }, codigo: v40, itens: [{ tipo: 'produto', id: protetor, qtd: 1 }] } });
  ok(!r.ok && /na hora de receber/.test(r.erro), 'vale em R$ no campo do código: orienta usar no Receber', r);
  void dA;
}

console.log('— revisão: aula da profissional, feriado e falta na agenda');
{
  chamar('b_salvarProfissional', { token: adm, profissional: { nome: 'Kalliny', categorias: ['Estética corporal'], dias: [1, 2, 3, 4, 5], inicio: '06:00', fim: '20:00' } });
  let dU = ctx.somarDias(hoje, 3); while ([0, 6].includes(new Date(dU + 'T12:00:00Z').getUTCDay())) dU = ctx.somarDias(dU, 1);
  r = chamar('b_horarios', { token: rec, servicoId: 'drenagem', profissional: 'Kalliny', data: dU });
  ok(r.ok && !r.dados.horarios.includes('07:00') && !r.dados.horarios.includes('09:00') && r.dados.horarios.includes('10:00'), 'quem dá aula não recebe serviço no horário da própria aula', r.dados && r.dados.horarios.slice(0, 6));
  r = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Kalliny', data: dU, hora: '08:00', cliente: { nome: 'Paula Nunes', whatsapp: '85977776666' } });
  ok(!r.ok && /aula de Pilates/.test(r.erro), 'agendar em cima da aula é recusado', r);
  const dF = ctx.somarDias(dU, 7);
  chamar('b_bloquear', { token: adm, data: dF, motivo: 'Feriado' });
  r = chamar('b_horarios', { token: rec, servicoId: 'drenagem', profissional: 'Kalliny', data: dF });
  ok(r.ok && r.dados.horarios.length === 0 && /casa fechada/.test(r.dados.motivo), 'feriado (casa fechada) não oferece horário de serviço', r.dados);
  r = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Kalliny', data: dU, hora: '14:00', cliente: { nome: 'Paula Nunes', whatsapp: '85977776666' } });
  chamar('b_atualizarAtendimento', { token: rec, id: r.dados.id, status: 'falta' });
  r = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Kalliny', data: dU, hora: '14:00', cliente: { nome: 'Rita Gomes', whatsapp: '85991234567' } });
  ok(r.ok, 'falta libera o horário para encaixe', r);
}

console.log('— excluir cliente (só administração)');
chamar('b_cancelarComanda', { token: rec, id: outra.id });
chamar('b_cancelarComanda', { token: rec, id: cv.id });
r = chamar('b_novoAluno', { token: rec, cpf: '111.444.777-35', nome: 'Teste Duplicado', whatsapp: '85911110000' });
ok(r.ok, 'cadastro sem histórico', r);
r = chamar('b_excluirCliente', { token: rec, cpf: '11144477735', confirmacao: 'Teste' });
ok(!r.ok && /não permite/.test(r.erro), 'recepção não exclui');
r = chamar('b_excluirCliente', { token: adm, cpf: '11144477735', confirmacao: 'Outro' });
ok(!r.ok && /digite o primeiro nome/.test(r.erro), 'pede o primeiro nome para confirmar');
r = chamar('b_excluirCliente', { token: adm, cpf: '11144477735', confirmacao: 'teste' });
ok(r.ok && r.dados.apagado && !ctx.lerAba('Alunos').some((a) => ctx.normCpf(a.cpf) === '11144477735'), 'sem histórico: cadastro apagado', r);

const tM = chamar('entrar', { cpf: '52998224725', senha: 'abc12345' }).dados.token;
chamar('salvarAnamnese', { token: tM, ficha: FICHA });
ok(ctx.lerAba('Anamneses').some((a) => ctx.normCpf(a.cpf) === '52998224725'), 'Maria tem ficha de saúde e histórico');
const aberta = chamar('b_salvarComanda', { token: rec, comanda: { cpf: '52998224725', itens: [{ tipo: 'produto', id: protetor, qtd: 1 }] } }).dados;
r = chamar('b_excluirCliente', { token: adm, cpf: '52998224725', confirmacao: 'Maria' });
ok(!r.ok && /comanda aberta/.test(r.erro), 'comanda aberta impede a exclusão');
chamar('b_cancelarComanda', { token: rec, id: aberta.id });
const pagosAntes = ctx.lerAba('Pagamentos').filter((p) => p.status === 'pago').reduce((s, p) => s + Number(p.valor), 0);
r = chamar('b_excluirCliente', { token: adm, cpf: '52998224725', confirmacao: 'Maria' });
ok(r.ok && r.dados.anonimizado, 'com histórico: anonimizado', r);
const sobra = ['Alunos', 'Reservas', 'Pagamentos', 'Creditos', 'Atendimentos', 'Comandas', 'Anamneses', 'Sessoes'].filter((n) => ctx.lerAba(n).some((x) => x.cpf && ctx.normCpf(x.cpf) === '52998224725'));
ok(sobra.length === 0, 'o CPF sumiu de todas as abas', sobra);
ok(!JSON.stringify(m.ss.getSheetByName('Pagamentos').rows).includes('Maria Souza') && !JSON.stringify(m.ss.getSheetByName('Atendimentos').rows).includes('Maria Souza')
  && !JSON.stringify(m.ss.getSheetByName('Alunos').rows).includes('maria@gmail.com'), 'nome e e-mail sumiram');
ok(ctx.lerAba('Pagamentos').filter((p) => p.status === 'pago').reduce((s, p) => s + Number(p.valor), 0) === pagosAntes && ctx.lerAba('Pagamentos').some((p) => p.nome === 'Cliente excluído'),
  'o financeiro não muda (vendas como "Cliente excluído")');
ok(!chamar('b_alunos', { token: rec }).dados.some((a) => a.nome === 'Cliente excluído'), 'não aparece na lista de clientes');
ok(!chamar('entrar', { cpf: '52998224725', senha: 'abc12345' }).ok && !chamar('aulas', { token: tM }).ok, 'não entra mais e a sessão caiu');

console.log('— caixa de dia que já passou (só administração)');
{
  const ontem2 = ctx.somarDias(hoje, -1), amanha = ctx.somarDias(hoje, 1);
  r = chamar('b_abrirCaixa', { token: rec, data: ontem2, valor: 100 });
  ok(!r.ok && /administração/.test(r.erro), 'recepção não abre caixa de ontem');
  r = chamar('b_abrirCaixa', { token: adm, data: amanha, valor: 100 });
  ok(!r.ok && /ainda não chegou/.test(r.erro), 'nem a administração abre caixa de amanhã');
  r = chamar('b_abrirCaixa', { token: adm, data: ontem2, valor: 100 });
  ok(r.ok && r.dados.data === ontem2 && r.dados.status === 'aberto' && /Aberto depois/.test(r.dados.obs), 'administração abre o caixa de ontem (marcado como aberto depois)', r);
  r = chamar('b_movimentoCaixa', { token: adm, data: ontem2, tipo: 'despesa', valor: 30, motivo: 'Café', categoria: 'Outros' });
  ok(r.ok && r.dados.despesas === 30 && ctx.lerAba('Despesas').some((x) => String(x.data).slice(0, 10) === ontem2 && Number(x.valor) === 30), 'despesa lançada no dia certo', r);
  ok(!chamar('b_movimentoCaixa', { token: rec, data: ontem2, tipo: 'sangria', valor: 10, motivo: 'x' }).ok, 'recepção não lança em dia passado');
  r = chamar('b_fecharCaixa', { token: adm, data: ontem2, contado: 70 });
  ok(r.ok && r.dados.status === 'fechado' && r.dados.esperado === 70, 'fechado com o esperado do dia', r);
  ok(chamar('b_abrirCaixa', { token: rec, valor: 50 }).ok, 'a recepção continua abrindo o de hoje');
}

console.log('— Link InfinitePay: bandeira opcional');
{
  const nova = (valor) => chamar('b_salvarComanda', { token: rec, comanda: { cliente: { nome: 'Compra no balcão', whatsapp: '85987654321' }, itens: [{ tipo: 'vale', vale: { tipo: 'valor', valor } }] } }).dados;
  const c1 = nova(80);
  r = chamar('b_fecharComanda', { token: rec, id: c1.id, pagamentos: [{ metodo: 'Link InfinitePay', valor: 80, parcelas: 2, bandeira: 'Elo' }] });
  ok(r.ok && ctx.lerAba('Pagamentos').find((p) => p.comanda === c1.id).bandeira === 'Elo', 'link pago no cartão guarda a bandeira', r);
  const c2 = nova(90);
  r = chamar('b_fecharComanda', { token: rec, id: c2.id, pagamentos: [{ metodo: 'Link InfinitePay', valor: 90 }] });
  ok(r.ok && !ctx.lerAba('Pagamentos').find((p) => p.comanda === c2.id).bandeira, 'link sem bandeira (pago no Pix) também fecha', r);
  const c3 = nova(70);
  r = chamar('b_fecharComanda', { token: rec, id: c3.id, pagamentos: [{ metodo: 'Link InfinitePay', valor: 70, bandeira: 'Inventada' }] });
  ok(!r.ok, 'bandeira fora da lista é recusada');
  r = chamar('b_fecharComanda', { token: rec, id: c3.id, pagamentos: [{ metodo: 'Cartão de débito', valor: 70 }] });
  ok(!r.ok && /bandeira/.test(r.erro), 'no cartão da maquininha continua obrigatória', r);
}

console.log('— vale-presente na agenda (sem abrir comanda)');
{
  const vender = (valor) => {
    const c = chamar('b_salvarComanda', { token: rec, comanda: { cliente: { nome: 'Rita Gomes', whatsapp: '85991234567' }, itens: [{ tipo: 'vale', vale: { tipo: 'valor', valor } }] } }).dados;
    return chamar('b_fecharComanda', { token: rec, id: c.id, pagamentos: [{ metodo: 'Pix', valor }] }).dados.valesCriados[0].codigo;
  };
  const quem = { cliente: { nome: 'Clara Gomes', whatsapp: '85998765432' } };
  const v300 = vender(300);
  r = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: dia, hora: '14:00', ...quem, pagamento: 'pago', metodo: 'Vale-presente', codigo: 'AMBAR-XXXX-XXXX' });
  ok(!r.ok && /não encontrado/.test(r.erro), 'código errado recusado', r);
  r = chamar('b_simularPreco', { token: rec, planoId: 'drenagem', codigo: v300 });
  ok(r.ok && r.dados.vale && r.dados.valeUsado === 199 && r.dados.valorFinal === 0, 'conferir: o vale cobre a drenagem', r);
  r = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: dia, hora: '14:00', ...quem, pagamento: 'pago', metodo: 'Vale-presente', codigo: v300 });
  const at1 = ctx.lerAba('Atendimentos').find((a) => a.id === r.dados.id);
  const pg1 = ctx.lerAba('Pagamentos').find((p) => p.order_nsu === at1.order_nsu);
  ok(r.ok && at1.pagamento === 'pago' && Number(at1.valor) === 199 && pg1.vale === v300 && Number(pg1.vale_usado) === 199 && Number(pg1.valor) === 0 && pg1.metodo === 'Vale-presente',
    'agendado como pago com o vale (atendimento vale R$ 199 para a comissão)', [at1, pg1]);
  ok(chamar('b_vales', { token: rec }).dados.find((v) => v.codigo === v300).saldo === 101, 'sobram R$ 101 no vale');
  // vale menor que o serviço: o resto em outra forma
  const v50 = vender(50);
  r = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: dia, hora: '15:00', ...quem, pagamento: 'pago', metodo: 'Vale-presente', codigo: v50 });
  ok(!r.ok && /resto/.test(r.erro), 'vale menor sem forma para o resto: pede a forma', r);
  r = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: dia, hora: '15:00', ...quem, pagamento: 'no_dia' });
  const at2 = r.dados.id;
  r = chamar('b_atualizarAtendimento', { token: rec, id: at2, status: 'atendido', metodo: 'Vale-presente', codigo: v50, resto: 'Cartão de crédito', bandeira: 'Visa' });
  const a2 = ctx.lerAba('Atendimentos').find((a) => a.id === at2);
  const pg2 = ctx.lerAba('Pagamentos').find((p) => p.order_nsu === a2.order_nsu);
  ok(r.ok && a2.status === 'atendido' && Number(a2.valor) === 199 && Number(pg2.valor) === 149 && Number(pg2.vale_usado) === 50 && pg2.metodo === 'Cartão de crédito' && pg2.bandeira === 'Visa',
    'marcar atendido: R$ 50 do vale + R$ 149 no cartão Visa', [a2, pg2]);
  { const ks = ctx.lerAba('Comissoes').filter((k) => k.id === 'K' + at2); ok(ks.length === 1 && Number(ks[0].base) === 199, 'comissão sobre o valor cheio do serviço', ks); }
  ok(chamar('b_vales', { token: rec }).dados.find((v) => v.codigo === v50).status === 'usado', 'vale de R$ 50 usado');
}

console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
