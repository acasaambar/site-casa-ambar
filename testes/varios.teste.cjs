// Vários itens numa venda do balcão, vários serviços de uma vez na agenda e comanda com todos os serviços do dia
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
chamar('b_salvarProfissional', { token: adm, profissional: { nome: 'Mara Facial', categorias: ['Estética facial', 'Estética corporal'], dias: [0, 1, 2, 3, 4, 5, 6], inicio: '06:00', fim: '23:00', comissao: 30 } });
chamar('cadastrar', { endereco: END_TESTE, cpf: '529.982.247-25', nome: 'Maria Souza', whatsapp: '85999990000', email: 'maria@gmail.com', senha: 'abc12345' });
let r;
let dia = ctx.somarDias(hoje, 1); if (new Date(dia + 'T12:00:00Z').getUTCDay() === 0) dia = ctx.somarDias(dia, 1);
const preco = (id) => ctx.buscarItemVenda(id).preco;
const pagBalcao = () => ctx.lerAba('Pagamentos').filter((p) => p.origem === 'balcão');

console.log('— venda do balcão com vários itens');
let antes = pagBalcao().length;
r = chamar('b_vender', { token: rec, cpf: '52998224725', itens: [{ planoId: 'yoga-avulsa' }, { planoId: 'pilates-avulsa' }, { planoId: 'drenagem-5', valor: 500 }], metodo: 'Pix' });
ok(r.ok && r.dados.vendas.length === 3, 'três itens numa venda só', r);
ok(r.ok && r.dados.valor === preco('yoga-avulsa') + preco('pilates-avulsa') + 500, 'total = soma dos itens (o último com valor combinado)', r.dados);
const novas = pagBalcao().slice(antes);
ok(novas.length === 3 && novas.every((p) => p.status === 'pago' && p.metodo === 'Pix' && /Venda com 3 itens/.test(p.observacao)), 'cada item é uma venda paga, com a observação de que é uma venda de 3 itens', novas.map((p) => [p.status, p.observacao]));
ok(novas.map((p) => p.plano_id).join() === 'yoga-avulsa,pilates-avulsa,drenagem-5', 'itens na ordem da tela');
const cid = (p) => 'C' + String(p.order_nsu).slice(1);
ok(novas.every((p) => ctx.mapaCreditos()[cid(p)] && ctx.mapaCreditos()[cid(p)].ativo !== 'NÃO'), 'cada item gerou o seu crédito');

antes = pagBalcao().length;
r = chamar('b_vender', { token: rec, cpf: '52998224725', itens: [{ planoId: 'yoga-avulsa' }, { planoId: 'pilates-avulsa' }], metodo: 'Pix', codigo: 'QUALQUER' });
ok(!r.ok && /só em venda de um item/.test(r.erro) && pagBalcao().length === antes, 'cupom ou vale com vários itens: recusado sem lançar nada', r.erro);
r = chamar('b_vender', { token: rec, cpf: '52998224725', itens: [{ planoId: 'yoga-avulsa' }, { planoId: 'nao-existe' }], metodo: 'Pix' });
ok(!r.ok && pagBalcao().length === antes, 'item que não existe: recusa a venda inteira, sem lançar nada', r.erro);
r = chamar('b_vender', { token: rec, cpf: '52998224725', itens: Array.from({ length: 13 }, () => ({ planoId: 'yoga-avulsa' })), metodo: 'Pix' });
ok(!r.ok && /até 12/.test(r.erro), 'mais de 12 itens: recusado', r.erro);
r = chamar('b_vender', { token: rec, cpf: '52998224725', planoId: 'yoga-avulsa', metodo: 'Pix' });
ok(r.ok && r.dados.orderNsu && r.dados.valor === preco('yoga-avulsa'), 'venda de um item continua igual (sem `itens`)', r);

console.log('— falha no meio da venda: o que já foi lançado é desfeito');
{
  const orig = ctx.concluirPagamento; let n = 0;
  ctx.concluirPagamento = function () { n++; if (n === 2) throw new Error('Service Spreadsheets failed (simulado)'); return orig.apply(this, arguments); };
  antes = pagBalcao().length;
  r = chamar('b_vender', { token: rec, cpf: '52998224725', itens: [{ planoId: 'yoga-avulsa' }, { planoId: 'pilates-avulsa' }, { planoId: 'drenagem-5' }], metodo: 'Pix' });
  ctx.concluirPagamento = orig;
  const tentativa = pagBalcao().slice(antes);
  ok(!r.ok, 'a venda é recusada', r);
  ok(tentativa.length >= 1 && tentativa.every((p) => p.status === 'excluido' || p.status === 'pendente'), 'nada fica como venda paga', tentativa.map((p) => p.status));
  ok(tentativa.filter((p) => p.status === 'pago').length === 0 && tentativa.every((p) => { const c = ctx.mapaCreditos()[cid(p)]; return !c || c.ativo === 'NÃO'; }), 'nenhum crédito ativo sobra');
}

console.log('— vários serviços de uma vez na agenda');
const atsDe = (cpf) => ctx.lerAba('Atendimentos').filter((a) => a.cpf && ctx.normCpf(a.cpf) === ctx.normCpf(cpf) && a.status !== 'cancelado');
const nAt = () => ctx.lerAba('Atendimentos').length;
r = chamar('b_agendarServicos', { token: rec, data: dia, pagamento: 'no_dia', cliente: { nome: 'Nova Cliente', whatsapp: '85988887777' },
  servicos: [{ servicoId: 'drenagem', profissional: 'Lia Esteticista', hora: '10:00' }, { servicoId: 'limpeza-pele', profissional: 'Mara Facial', hora: '11:30' }] });
ok(r.ok && r.dados.criados.length === 2 && r.dados.falhas.length === 0, 'dois serviços marcados de uma vez', r);
const nova = r.ok ? r.dados.criados[0].cpf : '';
ok(r.ok && r.dados.criados[1].cpf === nova && nova, 'os dois ficam no mesmo cadastro (um só cliente novo)', r.dados);
ok(ctx.lerAba('Alunos').filter((a) => /Nova Cliente/.test(a.nome)).length === 1, 'só um cadastro foi criado');

r = chamar('b_agendarServicos', { token: rec, data: dia, pagamento: 'no_dia', cpf: '52998224725',
  servicos: [{ servicoId: 'drenagem', profissional: 'Lia Esteticista', hora: '14:00' }, { servicoId: 'limpeza-pele', profissional: 'Mara Facial', hora: '14:15' }, { servicoId: 'limpeza-pele', profissional: 'Lia Esteticista', hora: '10:00' }] });
ok(r.ok && r.dados.criados.length === 1 && r.dados.falhas.length === 2, 'o que bate com outro serviço da própria pessoa ou com outra cliente volta em falhas, o resto fica marcado', r);
ok(r.ok && /mesma pessoa/.test(r.dados.falhas[0].motivo) && /já atende/.test(r.dados.falhas[1].motivo), 'cada falha diz o motivo', r.dados && r.dados.falhas);

antes = nAt();
r = chamar('b_agendarServicos', { token: rec, data: dia, pagamento: 'no_dia', cpf: '52998224725', servicos: [{ servicoId: 'nao-existe', profissional: 'Lia Esteticista', hora: '16:00' }, { servicoId: 'drenagem', profissional: 'Lia Esteticista', hora: '17:00' }] });
ok(!r.ok && nAt() === antes, 'se o primeiro falha, nada é criado', r.erro);
r = chamar('b_agendarServicos', { token: rec, data: ctx.somarDias(hoje, -1), pagamento: 'no_dia', cpf: '52998224725', servicos: [{ servicoId: 'drenagem', profissional: 'Lia Esteticista', hora: '16:00' }] });
ok(!r.ok && /hoje em diante/.test(r.erro), 'dia que já passou: recusado (use um serviço de cada vez)', r.erro);
r = chamar('b_agendarServicos', { token: rec, data: dia, pagamento: 'no_dia', cpf: '52998224725', servicos: [{ servicoId: 'drenagem', profissional: 'Lia Esteticista', hora: '16:00' }, { servicoId: 'limpeza-pele', profissional: 'Mara Facial', hora: '17:00' }], codigo: 'X' });
ok(!r.ok && /só com um serviço/.test(r.erro), 'cupom com vários serviços: recusado', r.erro);

console.log('— já pagou: cada serviço pelo preço dele');
const pagosAntes = pagBalcao().length;
r = chamar('b_agendarServicos', { token: rec, data: dia, pagamento: 'pago', metodo: 'Pix', cpf: '52998224725', servicos: [{ servicoId: 'drenagem', profissional: 'Lia Esteticista', hora: '08:00' }, { servicoId: 'limpeza-pele', profissional: 'Mara Facial', hora: '09:30' }] });
ok(r.ok && r.dados.criados.length === 2 && r.dados.falhas.length === 0 && r.dados.criados.every((a) => a.pagamento === 'pago'), 'os dois saem pagos', r);
const pg = pagBalcao().slice(pagosAntes);
ok(pg.length === 2 && pg.every((p) => p.status === 'pago'), 'duas vendas no caixa, uma por serviço', pg.map((p) => [p.plano_id, p.valor]));
ok(pg.map((p) => Number(p.valor)).sort().join() === [preco('drenagem'), preco('limpeza-pele')].sort().join(), 'cada uma pelo preço do seu serviço', pg.map((p) => p.valor));

console.log('— comanda do atendimento traz todos os serviços do dia');
const ats = atsDe(nova).sort((a, b) => String(a.hora).localeCompare(String(b.hora)));
r = chamar('b_comandaDoAtendimento', { token: rec, atendimentoId: ats[0].id });
ok(r.ok && r.dados.itens.length === 2 && r.dados.itens.map((i) => i.atendimentoId).join() === ats.map((a) => a.id).join(), 'a comanda abre com os dois serviços, na ordem do horário', r.dados && r.dados.itens);
const total = r.ok ? r.dados.total : 0;
ok(total === preco('drenagem') + preco('limpeza-pele'), 'total da comanda = os dois serviços', total);
r = chamar('b_comandaDoAtendimento', { token: rec, atendimentoId: ats[1].id });
ok(r.ok && r.dados.itens.length === 2, 'abrir pelo segundo serviço retoma a mesma comanda, sem duplicar', r.dados && r.dados.itens.length);
const maria = atsDe('52998224725').filter((a) => a.pagamento === 'pago');
r = chamar('b_comandaDoAtendimento', { token: rec, atendimentoId: maria[0].id });
ok(r.ok && r.dados.itens.every((i) => i.atendimentoId === maria[0].id || i.pago !== undefined), 'serviço já pago não arrasta os outros', r.dados && r.dados.itens.length);

console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
