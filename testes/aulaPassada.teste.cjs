// Lançar aulas que já passaram (ex.: outubro, vindas do Avec) para gerar comissões e relatórios
const { m, adm } = require('./servidor.cjs');
const { ctx, chamar } = m;
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 600) : ''); } else console.log('  ✓', msg); };
const hoje = ctx.hojeTexto();
const CPF = '52998224725';
// aulas de Yoga da Ana Paula que já passaram, uma por data (a grade tem Yoga dela de manhã)
const aulasDela = (diasAtras) => ctx.gerarAulas(ctx.somarDias(hoje, -diasAtras), 7).filter((a) => a.modalidade === 'Yoga' && /ana paula/i.test(a.professor));
const passada = (diasAtras) => aulasDela(diasAtras)[0];
const reservaDe = (id) => ctx.lerAba('Reservas').find((r) => String(r.id) === String(id));

console.log('— limite de dias');
let r = chamar('b_agendar', { token: adm, aulaId: passada(140).id, cpf: CPF, tapete: 3, forma: 'cortesia' });
ok(!r.ok && /120 dias/.test(r.erro), 'aula de mais de 120 dias atrás é recusada', r.erro);

console.log('— aula antiga com a professora contando "a partir de" hoje');
chamar('b_salvarPagamentoAulas', { token: adm, wellhubValor: 0, professoras: [{ nome: 'Ana Paula', yogaPorAula: 60, desde: hoje, modalidades: ['Yoga'], ativo: true }] });
const a1 = passada(30);
r = chamar('b_agendar', { token: adm, aulaId: a1.id, cpf: CPF, tapete: 2, forma: 'cortesia' });
ok(r.ok && r.dados.passada, 'aula de 30 dias atrás entra (antes: "Esta aula é muito antiga")', r.erro);
ok(r.ok && reservaDe(r.dados.id).status === 'check-in', 'o aluno entra como presente (check-in)', r.ok && reservaDe(r.dados.id).status);
ok(r.ok && /Contar aulas a partir de/.test(r.dados.aviso), 'avisa que a comissão não conta por causa da data "a partir de"', r.dados && r.dados.aviso);

console.log('— com a data "a partir de" acertada, a comissão aparece');
chamar('b_salvarPagamentoAulas', { token: adm, wellhubValor: 0, professoras: [{ nome: 'Ana Paula', yogaPorAula: 60, desde: ctx.somarDias(hoje, -60), modalidades: ['Yoga'], ativo: true }] });
const a2 = aulasDela(30)[1] || passada(20);
r = chamar('b_agendar', { token: adm, aulaId: a2.id, cpf: '11144477735', tapete: 4, forma: 'cortesia' });
ok(r.ok && !r.dados.aviso, 'sem aviso quando a comissão vai contar', r.dados && r.dados.aviso);
const mes = a2.data.slice(0, 7);
r = chamar('b_comissoes', { token: adm, mes });
const k = (r.dados && r.dados.lista || []).filter((c) => c.origem === 'aula_fixa' && String(c.id) === 'Kaula:' + a2.id);
ok(r.ok && k.length === 1 && k[0].valor === 60 && k[0].profissional === 'Ana Paula', 'comissão da aula de Yoga de ' + a2.data + ' (R$ 60) aparece no mês dela', r.dados && r.dados.lista && r.dados.lista.filter((c) => /aula/.test(c.origem)).slice(0, 4));
r = chamar('b_relatorioProfissional', { token: adm, mes, profissional: 'Ana Paula' });
ok(r.ok && r.dados.aulas.some((l) => l.valor === 60), 'entra no relatório do mês da professora', r.dados && r.dados.aulas);

console.log('— aula avulsa já paga numa aula passada: a venda vai para o dia da aula');
const a3 = passada(15);
r = chamar('b_agendar', { token: adm, aulaId: a3.id, cpf: '39053344705', tapete: 5, forma: 'avulsa', metodo: 'Pix' });
ok(r.ok, 'lança aula avulsa paga de 15 dias atrás', r.erro);
const pg = ctx.lerAba('Pagamentos').filter((p) => String(p.cpf) === '39053344705' && /avulsa/i.test(String(p.plano_id || p.item || ''))).pop();
ok(pg && String(pg.pago_em).slice(0, 10) === a3.data, 'a venda entra no caixa do dia da aula, não no de hoje', pg && pg.pago_em);

console.log('— recepção também lança; aula de hoje continua como reserva');
const tokR = chamar('b_entrar', { email: 'bia@acasaambar.com.br', senha: 'recep2026ok' }).dados.token;
const a4 = passada(10);
r = chamar('b_agendar', { token: tokR, aulaId: a4.id, cpf: '86288366757', tapete: 6, forma: 'cortesia' });
ok(r.ok && r.dados.passada, 'recepção lança aula passada', r.erro);
const ocupados = (id) => ctx.lerAba('Reservas').filter((x) => String(x.aula_id) === id && x.status !== 'cancelado').map((x) => Number(x.tapete));
const futura = ctx.gerarAulas(ctx.somarDias(hoje, 1), 7).find((a) => a.modalidade === 'Yoga' && ocupados(a.id).length < a.capacidade);
const livre = Array.from({ length: futura.capacidade }, (_, i) => i + 1).find((n) => !ocupados(futura.id).includes(n));
r = chamar('b_agendar', { token: adm, aulaId: futura.id, cpf: '71428793860', tapete: livre, forma: 'cortesia' });
ok(r.ok && !r.dados.passada && reservaDe(r.dados.id).status === 'reservado', 'aula futura continua como reserva comum', r.ok ? reservaDe(r.dados.id).status : r.erro);

console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
