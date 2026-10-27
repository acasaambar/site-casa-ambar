// Área do aluno (site): só Yoga e Pilates; combo, serviço e produto da bancada não aparecem
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
chamar('cadastrar', { endereco: END_TESTE, cpf: '529.982.247-25', nome: 'Maria Souza', whatsapp: '85999990000', email: 'maria@gmail.com', senha: 'abc12345' });
let r;
const maria = chamar('entrar', { cpf: '52998224725', senha: 'abc12345' }).dados;
ok(maria && maria.token, 'a aluna entra no site');

console.log('— combo de serviço vendido na bancada');
const pacote = ctx.listarPacotes(true)[0];
ok(!!pacote, 'há um combo/pacote de serviço cadastrado para o teste', pacote && pacote.id);
r = chamar('b_vender', { token: rec, cpf: '52998224725', planoId: pacote.id, metodo: 'Pix' });
ok(r.ok, 'recepção vende o combo (balcão)', r.erro);
const yoga = chamar('b_vender', { token: rec, cpf: '52998224725', planoId: 'yoga-avulsa', metodo: 'Pix' });
ok(yoga.ok, 'e uma aula avulsa de Yoga');

r = chamar('meuPlano', { token: maria.token });
ok(r.ok, 'meuPlano responde', r.erro);
const cred = r.dados.creditos;
ok(cred.length > 0 && cred.every((c) => c.modalidade === 'Yoga' || c.modalidade === 'Pilates'), 'a área do aluno só mostra crédito de Yoga e Pilates', cred.map((c) => c.modalidade + ' ' + c.descricao));
ok(!cred.some((c) => /combo|pacote/i.test(c.descricao)), 'o combo não aparece como plano');
ok(cred.some((c) => c.planoId === 'yoga-avulsa'), 'a aula de Yoga continua aparecendo');
ok(r.dados.pagamentos.every((p) => !/combo|pacote/i.test(p.descricao)), 'a compra do combo também não aparece em "Meus pagamentos"', r.dados.pagamentos.map((p) => p.descricao));
ok(r.dados.pagamentos.some((p) => /yoga/i.test(p.descricao)), 'a compra da aula de Yoga aparece');

console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
