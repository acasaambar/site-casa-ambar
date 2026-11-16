// Promoção "aulas de presente" (pedido da Casa, nov/2026: "na compra de 1 aula a pessoa ganha um crédito para outra")
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
const ficha = { emergencia_nome: 'Mãe', emergencia_telefone: '85999998888', parq_1: 'nao', parq_2: 'nao', parq_3: 'nao', parq_4: 'nao', parq_5: 'nao', parq_6: 'nao', parq_7: 'nao', declaracao: true, consentimento: true, data_nascimento: '1990-05-12' };
const aluna = (cpf, nome, email) => {
  chamar('cadastrar', { endereco: END, cpf, nome, whatsapp: '8599' + cpf.slice(-7), email, senha: 'abc12345' });
  const t = chamar('entrar', { cpf, senha: 'abc12345' }).dados.token;
  chamar('salvarAnamnese', { token: t, ficha });
  return t;
};
const ana = aluna('52998224725', 'Ana Souza', 'ana@gmail.com');
aluna('11144477735', 'Bia Lima', 'bia@gmail.com');
const creditosDe = (cpf) => ctx.lerAba('Creditos').filter((c) => String(c.cpf) === cpf);

console.log('— cadastro da promoção');
let r = chamar('b_salvarPromocao', { token: adm, promocao: { nome: 'Compra 1 ganha 2', tipo: 'bonus', valor: 1, itens: ['yoga-mensal-2x'] } });
ok(!r.ok && /plano por semana/.test(r.erro), 'não aceita plano mensal (é contado por semana)', r.erro);
r = chamar('b_salvarPromocao', { token: adm, promocao: { nome: 'Compra 1 ganha 2', tipo: 'bonus', valor: 1 } });
ok(!r.ok && /para quais aulas/.test(r.erro), 'pede para quais aulas vale', r.erro);
r = chamar('b_salvarPromocao', { token: adm, promocao: { nome: 'Compra 1 ganha 2', tipo: 'bonus', valor: 1, grupos: ['Yoga', 'Pilates'], descricao: 'Na compra de uma aula você ganha outra' } });
ok(r.ok && r.dados.some((p) => p.tipo === 'bonus' && p.valor === 1), 'promoção "aulas de presente" salva', r.erro);

console.log('— site mostra e o preço não muda');
r = chamar('meuPlano', { token: ana });
const av = r.ok && r.dados.catalogo.find((p) => p.id === 'yoga-avulsa');
ok(av && av.bonus && av.bonus.aulas === 1 && /\+1 aula de presente/.test(av.bonus.texto) && !av.promocao, 'aula avulsa aparece com "+1 aula de presente" e o mesmo preço', av);
const men = r.ok && r.dados.catalogo.find((p) => p.id === 'yoga-mensal-2x');
ok(men && !men.bonus, 'plano mensal do mesmo grupo não ganha presente');

console.log('— compra pelo site (reserva da aula avulsa)');
const yoga = ctx.gerarAulas().filter((a) => a.modalidade === 'Yoga' && ctx.inicio(a).getTime() > Date.now() + 26 * 3600e3);
r = chamar('reservar', { token: ana, aulaId: yoga[0].id, tapete: 2, pagarAvulsa: true });
const pg = r.dados.pagamento;
global.__valor = Math.round(pg.valor * 100);
chamar(undefined, { order_nsu: pg.order_nsu, transaction_nsu: 'pix-bonus', invoice_slug: 'slug-pix-bonus' });
const c1 = creditosDe('52998224725')[0];
ok(c1 && Number(c1.aulas_total) === 2 && /de presente/.test(c1.descricao), 'o crédito vem com 2 aulas (1 + 1 de presente)', c1);
const linha = ctx.lerAba('Pagamentos').find((p) => String(p.order_nsu) === pg.order_nsu);
ok(Number(linha.bonus_aulas) === 1 && linha.bonus_promocao === 'Compra 1 ganha 2' && Number(linha.valor) === Number(pg.valor), 'a venda guarda o presente e o valor continua o da aula', linha);
r = chamar('reservar', { token: ana, aulaId: yoga[1].id, tapete: 3 });
ok(r.ok && r.dados.status === 'reservado', 'a aula de presente reserva outra aula sem pagar', r.erro || r.dados);
r = chamar('reservar', { token: ana, aulaId: yoga[2].id, tapete: 4 });
ok(r.dados && !r.dados.status && r.dados.avulsa, 'depois das 2, a próxima pede pagamento de novo', r.dados);

console.log('— balcão');
r = chamar('b_vender', { token: adm, cpf: '11144477735', planoId: 'pilates-avulsa', metodo: 'Pix' });
const cB = creditosDe('11144477735')[0];
ok(r.ok && cB && Number(cB.aulas_total) === 2, 'venda no balcão também ganha a aula de presente', r.erro || cB);
r = chamar('b_simularPreco', { token: adm, planoId: 'pilates-avulsa', cpf: '11144477735' });
ok(r.ok && /\+1 aula de presente/.test(r.dados.mensagem), 'o Vender avisa a promoção', r.dados && r.dados.mensagem);
r = chamar('b_vender', { token: adm, cpf: '11144477735', planoId: 'yoga-mensal-1x', metodo: 'Pix' });
const cM = creditosDe('11144477735').find((c) => c.plano_id === 'yoga-mensal-1x');
ok(r.ok && cM && !/presente/.test(cM.descricao), 'plano mensal vendido no balcão não muda', cM);
r = chamar('b_vender', { token: adm, cpf: '11144477735', planoId: 'yoga-avulsa', metodo: 'Cortesia' });
const cC = creditosDe('11144477735').find((c) => c.plano_id === 'yoga-avulsa');
ok(r.ok && cC && Number(cC.aulas_total) === 1, 'cortesia não ganha presente', cC);

console.log('— comanda');
r = chamar('b_salvarComanda', { token: adm, comanda: { cpf: '52998224725', itens: [{ tipo: 'plano', id: 'pilates-avulsa', nome: 'Pilates · aula avulsa', qtd: 1 }] } });
const cmB = r.dados;
ok(r.ok && cmB.itens[0].bonus && /\+1 aula de presente/.test(cmB.itens[0].bonus.texto), 'a comanda mostra o presente no item (não precisa lançar nada)', r.erro || cmB.itens[0]);
r = chamar('b_fecharComanda', { token: adm, id: cmB.id, pagamentos: [{ metodo: 'Pix', valor: cmB.total }] });
const cCm = creditosDe('52998224725').find((c) => c.plano_id === 'pilates-avulsa');
ok(r.ok && cCm && Number(cCm.aulas_total) === 2, 'ao fechar a comanda, o crédito vem com a aula de presente', r.erro || cCm);

console.log('— relatório da promoção');
r = chamar('b_promocoes', { token: adm });
const pr = r.ok && r.dados.find((p) => p.nome === 'Compra 1 ganha 2');
ok(pr && pr.usos === 3 && pr.aulasDadas === 3, 'conta 3 usos e 3 aulas dadas', pr);
chamar('b_salvarPromocao', { token: adm, promocao: Object.assign({}, pr, { ativo: false }) });
r = chamar('b_vender', { token: adm, cpf: '11144477735', planoId: 'pilates-avulsa', metodo: 'Pix', confirmarRepetida: [], motivoRepetida: 'outra aula' });
const cP = creditosDe('11144477735').filter((c) => c.plano_id === 'pilates-avulsa').pop();
ok(cP && Number(cP.aulas_total) === 1, 'promoção pausada: volta a ser 1 aula', cP);

console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
