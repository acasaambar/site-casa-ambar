// Sino da bancada para pagamentos do site (nov/2026, pedido da Casa depois de duas reservas pagas pelo site que não apareceram):
// o aviso nasce quando a pessoa COMEÇA a pagar (antes da InfinitePay), mostra a situação ao vivo e avisa "conferir" quando
// a pessoa volta do pagamento (ou a InfinitePay avisa) sem confirmação.
const { criar } = require('./simulador.cjs');
const R = require('path').join(__dirname, '..', 'apps-script');
const m = criar([R + '/Codigo.gs', R + '/Seguranca.gs', R + '/Vales.gs', R + '/Bancada.gs', R + '/Relatorios.gs', R + '/Servicos.gs', R + '/Gestao.gs', R + '/Clientes.gs', R + '/Marketing.gs', R + '/Substituicoes.gs', R + '/Espera.gs', R + '/Contrato.gs']);
const { ctx, chamar, emails } = m;
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 700) : ''); } else console.log('  ✓', msg); };
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
const raquel = aluna('52998224725', 'Raquel Moura', 'raquel@gmail.com');
const joana = aluna('11144477735', 'Joana Lima', 'joana@gmail.com');
const pagRow = (nsu) => ctx.lerAba('Pagamentos').find((p) => String(p.order_nsu) === nsu);
const yogaLonge = (n) => ctx.gerarAulas().filter((a) => a.modalidade === 'Yoga' && ctx.inicio(a).getTime() > Date.now() + 26 * 3600e3)[n];
const webhook = (nsu, transacao, centavos) => { global.__valor = centavos; return chamar(undefined, { order_nsu: nsu, transaction_nsu: transacao, invoice_slug: 'slug-' + transacao }); };
const avisos = (tok = rec) => { ctx.novaExecucao(); return chamar('b_avisos', { token: tok }).dados.avisos; };
const doPedido = (lista, nsu) => lista.filter((a) => a.pedido === nsu);

console.log('— reserva paga pelo site: o aviso nasce antes da InfinitePay responder');
const a1 = yogaLonge(0);
let r = chamar('reservar', { token: raquel, aulaId: a1.id, tapete: 2, pagarAvulsa: true });
const pg1 = r.dados.pagamento;
ok(pg1 && pg1.order_nsu, 'reserva sem plano gera o link', r);
let lista = avisos();
let av = doPedido(lista, pg1.order_nsu)[0];
ok(av && av.tipo === 'pagando' && av.situacao === 'aguardando' && av.nome === 'Raquel Moura' && av.aulaId === a1.id && av.data === a1.data,
  'sino: "Raquel está pagando" com a aula e "aguardando a InfinitePay"', av);
ok(av && av.valor > 0 && /avulsa/i.test(av.descricao) && av.cpf === '52998224725', 'aviso traz o valor, o que foi comprado e o CPF (para abrir a ficha)', av);

console.log('— a InfinitePay avisa mas não confirma (o caso da Raquel)');
r = webhook(pg1.order_nsu, 'falso-pix-1', 6300);
lista = avisos();
const conf = doPedido(lista, pg1.order_nsu).filter((a) => a.tipo === 'conferir');
ok(conf.length === 1 && conf[0].situacao === 'aguardando' && conf[0].professor === a1.professor && conf[0].modalidade === 'Yoga', 'vira aviso "Pagamento do site para conferir" (com a aula e quem dá)', doPedido(lista, pg1.order_nsu));
ok(!doPedido(lista, pg1.order_nsu).some((a) => a.tipo === 'pagando'), 'o "pagando" do mesmo pedido sai (fica só o "conferir")');
webhook(pg1.order_nsu, 'falso-pix-1', 6300);
r = chamar('confirmarPagamento', { token: raquel, orderNsu: pg1.order_nsu, transactionNsu: 'falso-pix-1', slug: 'slug-falso-pix-1' });
ok(doPedido(avisos(), pg1.order_nsu).filter((a) => a.tipo === 'conferir').length === 1, 'um aviso "conferir" por pedido (webhook repetido e volta ao site não duplicam)');
// o link vence sem confirmar
ctx.atualizarLinha('Pagamentos', pagRow(pg1.order_nsu)._linha, { status: 'expirado' });
av = doPedido(avisos(), pg1.order_nsu).find((a) => a.tipo === 'conferir');
ok(av && av.situacao === 'nao_confirmado', 'link vencido sem confirmação: o aviso fica "não confirmado" (vermelho)', av);
const a4 = yogaLonge(3);
const pg5 = chamar('reservar', { token: joana, aulaId: a4.id, tapete: 7, pagarAvulsa: true }).dados.pagamento;
ctx.atualizarLinha('Pagamentos', pagRow(pg5.order_nsu)._linha, { status: 'expirado' });
av = doPedido(avisos(), pg5.order_nsu)[0];
ok(av && av.tipo === 'pagando' && av.situacao === 'nao_confirmado', 'sem aviso nenhum da InfinitePay e link vencido: "pagando" fica "não confirmado"', av);

console.log('— a recepção confirma o recebimento');
r = chamar('b_confirmarPagamentoSite', { token: rec, orderNsu: pg1.order_nsu, metodo: 'Pix', dia: ctx.hojeTexto() });
ok(r.ok && pagRow(pg1.order_nsu).status === 'pago', 'Confirmar recebimento marca pago', r.erro);
lista = avisos();
ok(!doPedido(lista, pg1.order_nsu).some((a) => a.tipo === 'pagando'), '"pagando" sai da lista quando o pagamento confirma');
ok(lista.some((a) => a.tipo === 'reserva' && a.aulaId === a1.id && a.nome === 'Raquel Moura'), 'e fica o aviso "Nova reserva pelo site"');
ok(doPedido(lista, pg1.order_nsu).find((a) => a.tipo === 'conferir').situacao === 'pago', 'o "conferir" mostra que já foi pago');

console.log('— Pix confirmado normalmente');
const a2 = yogaLonge(1);
r = chamar('reservar', { token: joana, aulaId: a2.id, tapete: 5, pagarAvulsa: true });
const pg2 = r.dados.pagamento;
webhook(pg2.order_nsu, 'pix-2', 6300);
lista = avisos();
ok(pagRow(pg2.order_nsu).status === 'pago' && !doPedido(lista, pg2.order_nsu).some((a) => a.tipo === 'pagando' || a.tipo === 'conferir'), 'confirmou na hora: sem "pagando" nem "conferir"', doPedido(lista, pg2.order_nsu));
ok(lista.some((a) => a.tipo === 'reserva' && a.aulaId === a2.id), 'só o aviso de reserva');

console.log('— plano comprado pelo site');
r = chamar('comprar', { token: joana, planoId: 'yoga-mensal-1x' });
const pg3 = r.dados;
ok(r.ok && pg3.order_nsu, 'compra de plano gera o link', r.erro);
av = doPedido(avisos(), pg3.order_nsu)[0];
ok(av && av.tipo === 'pagando' && !av.aulaId && /Yoga/.test(av.descricao) && av.valor > 0, 'sino: "Joana está pagando Yoga · 1x na semana"', av);
webhook(pg3.order_nsu, 'pix-3', Math.round(Number(pagRow(pg3.order_nsu).valor) * 100));
lista = avisos();
const compra = doPedido(lista, pg3.order_nsu);
ok(pagRow(pg3.order_nsu).status === 'pago' && compra.length === 1 && compra[0].tipo === 'compra' && compra[0].situacao === 'pago', 'confirmado: vira "Compra pelo site"', compra);

console.log('— descartado pela equipe');
const a3 = yogaLonge(2);
r = chamar('reservar', { token: raquel, aulaId: a3.id, tapete: 6, pagarAvulsa: true });
const pg4 = r.dados.pagamento;
r = chamar('b_descartarPagamentoSite', { token: rec, orderNsu: pg4.order_nsu, motivo: 'lançado no balcão' });
ok(r.ok, 'descartar', r.erro);
av = doPedido(avisos(), pg4.order_nsu)[0];
ok(av && av.situacao === 'descartado', 'aviso mostra "descartado pela equipe"', av);
chamar('confirmarPagamento', { token: raquel, orderNsu: pg4.order_nsu, transactionNsu: 'falso-x', slug: 'slug-x' });
ok(!doPedido(avisos(), pg4.order_nsu).some((a) => a.tipo === 'conferir'), 'depois do descarte, voltar ao site não cria "conferir"');

console.log('— quem vê o quê');
const doProf = chamar('b_entrar', { email: 'contato@acasaambar.com.br', senha: 'ambar2026adm' }).dados.token;
ok(avisos(doProf).every((a) => !a.pedido || a.cpf), 'administração recebe o CPF para abrir a ficha');
ok(!chamar('b_avisos', { token: 'x'.repeat(40) }).ok, 'sem login não vê avisos');
const fonte = require('fs').readFileSync(R + '/Codigo.gs', 'utf8');
ok(/Avisos: \[[^\]]*'nome',\s*\n[^\n]*\n\s*'descricao', 'valor', 'order_nsu'\]/.test(fonte), 'colunas novas da aba Avisos ficam no fim');

if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\nAvisos de pagamento do site: tudo certo');
