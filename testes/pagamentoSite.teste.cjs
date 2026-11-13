// Pagamento pelo site que não confirma sozinho (bug de nov/2026: Pix pago, aviso da InfinitePay não confirmou,
// a reserva venceu e sumiu da agenda) + prazos do site: reservar com 12 h e cancelar até 4 h antes.
const { criar } = require('./simulador.cjs');
const R = require('path').join(__dirname, '..', 'apps-script');
const m = criar([R + '/Codigo.gs', R + '/Seguranca.gs', R + '/Vales.gs', R + '/Bancada.gs', R + '/Relatorios.gs', R + '/Servicos.gs', R + '/Gestao.gs', R + '/Clientes.gs', R + '/Marketing.gs', R + '/Substituicoes.gs', R + '/Espera.gs', R + '/Contrato.gs']);
const { ctx, chamar, emails } = m;
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 600) : ''); } else console.log('  ✓', msg); };
const linkDe = (e) => (e.body.match(/t=([a-f0-9]+)/) || [])[1];
const END = { cep: '60150-160', endereco: 'Rua Eduardo Salgado', numero: '448', bairro: 'Aldeota', cidade: 'Fortaleza', uf: 'CE' };
ctx.configurarPlanilha();
ctx.autorizarEmails(); chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'ambar2026adm' });
const adm = chamar('b_entrar', { email: 'contato@acasaambar.com.br', senha: 'ambar2026adm' }).dados.token;
chamar('b_salvarMembro', { token: adm, membro: { email: 'bia@acasaambar.com.br', nome: 'Bia Santos', papel: 'recepcao' } });
chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'recep2026ok' });
const rec = chamar('b_entrar', { email: 'bia@acasaambar.com.br', senha: 'recep2026ok' }).dados.token;
const ficha = { emergencia_nome: 'Mãe', emergencia_telefone: '85999998888', parq_1: 'nao', parq_2: 'nao', parq_3: 'nao', parq_4: 'nao', parq_5: 'nao', parq_6: 'nao', parq_7: 'nao', declaracao: true, consentimento: true, data_nascimento: '1990-05-12' };
const aluna = (cpf, nome, email) => {
  chamar('cadastrar', { endereco: END, cpf, nome, whatsapp: '8599' + cpf.slice(-7), email, senha: 'abc12345' });
  const t = chamar('entrar', { cpf, senha: 'abc12345' }).dados.token;
  chamar('salvarAnamnese', { token: t, ficha });
  return t;
};
const angela = aluna('52998224725', 'Angela Carolina', 'angela@gmail.com');
const joana = aluna('11144477735', 'Joana Lima', 'joana@gmail.com');
const pagRow = (nsu) => ctx.lerAba('Pagamentos').find((p) => String(p.order_nsu) === nsu);
const resRow = (id) => ctx.lerAba('Reservas').find((r) => String(r.id) === id);
const yogaLonge = (n) => ctx.gerarAulas().filter((a) => a.modalidade === 'Yoga' && ctx.inicio(a).getTime() > Date.now() + 26 * 3600e3)[n];
const webhook = (nsu, transacao, centavos) => { global.__valor = centavos; return chamar(undefined, { order_nsu: nsu, transaction_nsu: transacao, invoice_slug: 'slug-' + transacao }); };

console.log('— prazos novos do site');
const fonte = require('fs').readFileSync(R + '/Codigo.gs', 'utf8');
ok(/reservarAteHorasAntes: 12,/.test(fonte) && /cancelarAteHorasAntes: 4,/.test(fonte) && ctx.AJUSTES.cancelarAteHorasAntes === 4, 'padrão: reservar com 12 h e cancelar até 4 h antes (o simulador desliga o de reservar)');
m.props.AJUSTES_JSON = JSON.stringify({ reservarAteHorasAntes: 24, cancelarAteHorasAntes: 2, diasVisiveis: 9 });
ctx.novaExecucao(); ctx._ajustesAplicados = false; ctx.AJUSTES.reservarAteHorasAntes = 12; ctx.AJUSTES.cancelarAteHorasAntes = 4; ctx.aplicarAjustesSalvos();
ok(ctx.AJUSTES.reservarAteHorasAntes === 12 && ctx.AJUSTES.cancelarAteHorasAntes === 4 && ctx.AJUSTES.diasVisiveis === 9, 'Ajustes salvos com a regra antiga (24 h / 2 h) passam a valer 12 h / 4 h; o resto continua', [ctx.AJUSTES.reservarAteHorasAntes, ctx.AJUSTES.cancelarAteHorasAntes, ctx.AJUSTES.diasVisiveis]);
let r = chamar('b_salvarAjustes', { token: adm, ajustes: { reservarAteHorasAntes: 6, cancelarAteHorasAntes: 3 } });
ok(r.ok && JSON.parse(m.props.AJUSTES_JSON).regrasVersao >= 2, 'salvar Ajustes de novo marca a regra nova', r.erro);
ctx._ajustesAplicados = false; ctx.aplicarAjustesSalvos();
ok(ctx.AJUSTES.reservarAteHorasAntes === 6 && ctx.AJUSTES.cancelarAteHorasAntes === 3, 'depois de salvar, vale o que a Casa escolheu', [ctx.AJUSTES.reservarAteHorasAntes, ctx.AJUSTES.cancelarAteHorasAntes]);
chamar('b_salvarAjustes', { token: adm, ajustes: { reservarAteHorasAntes: 12, cancelarAteHorasAntes: 4 } });
ctx._ajustesAplicados = false; ctx.aplicarAjustesSalvos();
const perto12 = ctx.gerarAulas().find((a) => a.modalidade === 'Yoga' && ctx.inicio(a).getTime() > Date.now() + 2 * 3600e3 && ctx.inicio(a).getTime() < Date.now() + 11 * 3600e3);
if (perto12) {
  r = chamar('reservar', { token: angela, aulaId: perto12.id, tapete: 1, pagarAvulsa: true });
  ok(!r.ok && r.codigo === 'ANTECEDENCIA' && /12 horas/.test(r.erro), 'aula daqui a menos de 12 h: o site manda falar com a recepção', r);
}

console.log('— Pix pago, mas a InfinitePay ainda não confirmava quando o aviso chegou');
const a1 = yogaLonge(0);
r = chamar('reservar', { token: angela, aulaId: a1.id, tapete: 3, pagarAvulsa: true });
const pg1 = r.ok && r.dados.pagamento;
ok(pg1 && pg1.link, 'reserva sem plano gera o link da aula avulsa', r.erro || r.dados);
const res1 = pagRow(pg1.order_nsu).reserva_id;
r = webhook(pg1.order_nsu, 'falso-pix-1', 6300);
ok(r.ok && pagRow(pg1.order_nsu).status === 'pendente', 'conferência diz "não pago": continua pendente');
ok(String(pagRow(pg1.order_nsu).transaction_nsu) === 'falso-pix-1' && /webhook: não pago/.test(pagRow(pg1.order_nsu).conferencia), 'guarda a transação e o que a InfinitePay respondeu', pagRow(pg1.order_nsu).conferencia);
// a reserva vence (20 min) e o link vira "expirado" na planilha
ctx.atualizarLinha('Reservas', resRow(res1)._linha, { expira_ms: Date.now() - 1000 });
ctx.atualizarLinha('Pagamentos', pagRow(pg1.order_nsu)._linha, { status: 'expirado' });
ok(!ctx.reservasAtivas().some((x) => x.id === res1), 'a reserva some da agenda enquanto não confirma (era o bug)');
// a InfinitePay passa a dizer "pago" (a transação guardada não começa mais com "falso")
ctx.atualizarLinha('Pagamentos', pagRow(pg1.order_nsu)._linha, { transaction_nsu: 'pix-1', slug: 'slug-pix-1' });
global.__valor = 6300;
ctx.novaExecucao();
const n = ctx.reconferirPagamentosDoSite(null, 10);
ok(n === 1 && pagRow(pg1.order_nsu).status === 'pago', 'a reconferência (Hoje, Meu plano, acionador diário) confirma o pagamento', pagRow(pg1.order_nsu));
ok(resRow(res1).status === 'reservado' && ctx.reservasAtivas().some((x) => x.id === res1), 'e a reserva volta para a agenda', resRow(res1));
r = chamar('meuPlano', { token: angela });
ok(r.ok && r.dados.pagamentos.some((p) => p.orderNsu === pg1.order_nsu && p.status === 'pago'), '"Meu plano" mostra o pagamento como pago');

console.log('— aviso chega depois que o link já tinha vencido');
const a2 = yogaLonge(1);
r = chamar('reservar', { token: joana, aulaId: a2.id, tapete: 4, pagarAvulsa: true });
const pg2 = r.dados.pagamento;
ctx.atualizarLinha('Pagamentos', pagRow(pg2.order_nsu)._linha, { status: 'expirado' });
r = webhook(pg2.order_nsu, 'pix-2', 6300);
ok(r.ok && pagRow(pg2.order_nsu).status === 'pago', 'Pix que cai depois do link "expirado" é confirmado', pagRow(pg2.order_nsu));

console.log('— a recepção confirma à mão (o aviso nunca chegou)');
const a3 = yogaLonge(2);
r = chamar('reservar', { token: angela, aulaId: a3.id, tapete: 5, pagarAvulsa: true });
const pg3 = r.dados.pagamento;
const res3 = pagRow(pg3.order_nsu).reserva_id;
ctx.atualizarLinha('Reservas', resRow(res3)._linha, { status: 'cancelado', cancelada_em: ctx.agoraTexto() });
r = chamar('b_confirmarPagamentoSite', { token: rec, orderNsu: pg3.order_nsu, metodo: 'Pix', dataPagamento: ctx.hojeTexto() });
ok(r.ok && r.dados.status === 'pago' && r.dados.como === 'manual', 'recepção confirma o recebimento', r.erro || r.dados);
ok(r.ok && r.dados.reserva && r.dados.reserva.status === 'reservado', 'a reserva cancelada pelo vencimento volta (o tapete estava livre)', r.dados && r.dados.reserva);
const l3 = pagRow(pg3.order_nsu);
ok(l3.metodo === 'Pix' && /Confirmado à mão por Bia em/.test(l3.observacao) && l3.registrado_por === 'bia@acasaambar.com.br', 'fica anotado quem confirmou', l3.observacao);
ok(ctx.lerAba('Creditos').some((c) => String(c.origem).includes(pg3.order_nsu)), 'o crédito da aula foi criado');
r = chamar('b_confirmarPagamentoSite', { token: rec, orderNsu: pg3.order_nsu, metodo: 'Pix' });
ok(!r.ok && /já está confirmado/.test(r.erro), 'não confirma duas vezes', r.erro);
r = chamar('b_aluno', { token: rec, cpf: '52998224725' });
ok(r.ok && r.dados.pagamentos.some((p) => p.orderNsu === pg3.order_nsu && 'conferencia' in p && p.origem === 'site'), 'a ficha do cliente traz o pagamento com a conferência');

console.log('— descartar (já lançado no balcão)');
const a4 = yogaLonge(3);
r = chamar('reservar', { token: joana, aulaId: a4.id, tapete: 6, pagarAvulsa: true });
const pg4 = r.dados.pagamento;
const res4 = pagRow(pg4.order_nsu).reserva_id;
r = chamar('b_descartarPagamentoSite', { token: rec, orderNsu: pg4.order_nsu, motivo: 'já lançado no balcão' });
ok(r.ok && pagRow(pg4.order_nsu).status === 'descartado' && resRow(res4).status === 'cancelado', 'descartar tira o pagamento e libera o lugar', r.erro);
ok(/Descartado por Bia em .*já lançado no balcão/.test(pagRow(pg4.order_nsu).observacao), 'o motivo fica anotado');
r = chamar('b_confirmarPagamentoSite', { token: rec, orderNsu: 'B123', metodo: 'Pix' });
ok(!r.ok, 'venda do balcão não passa por aqui');
const tProf = (() => { chamar('b_salvarMembro', { token: adm, membro: { email: 'lia@gmail.com', nome: 'Lia Moura', papel: 'professora', professorNome: 'Lia Moura' } }); chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'liamoura2026' }); return chamar('b_entrar', { email: 'lia@gmail.com', senha: 'liamoura2026' }).dados.token; })();
r = chamar('b_confirmarPagamentoSite', { token: tProf, orderNsu: pg4.order_nsu, metodo: 'Pix' });
ok(!r.ok, 'profissional não confirma pagamento');

console.log('— cancelar pelo site só até 4 h antes');
const a5 = yogaLonge(4);
r = chamar('reservar', { token: joana, aulaId: a5.id, tapete: 7, pagarAvulsa: true });
webhook(r.dados.pagamento.order_nsu, 'pix-5', 6300);
const res5 = pagRow(r.dados.pagamento.order_nsu).reserva_id;
const inicioReal = ctx.inicio;
ctx.inicio = (x) => (String(x.aula_id || x.id) === a5.id ? new Date(Date.now() + 3 * 3600e3) : inicioReal(x));
r = chamar('cancelar', { token: joana, reservaId: res5 });
ok(!r.ok && r.codigo === 'CANCELAMENTO_PRAZO' && /4 h/.test(r.erro) && /recepção/.test(r.erro), 'a 3 h da aula: manda falar com a recepção', r);
ctx.inicio = (x) => (String(x.aula_id || x.id) === a5.id ? new Date(Date.now() + 5 * 3600e3) : inicioReal(x));
r = chamar('cancelar', { token: joana, reservaId: res5 });
ok(r.ok, 'a 5 h da aula ainda cancela pelo site', r.erro);
ctx.inicio = inicioReal;

console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
