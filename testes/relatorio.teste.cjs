// Relatório do mês de cada profissional (para conferir as contas e imprimir)
const { criar } = require('./simulador.cjs');
const END_TESTE = { cep: '60150-160', endereco: 'Rua Eduardo Salgado', numero: '448', bairro: 'Aldeota', cidade: 'Fortaleza', uf: 'CE' };
const R = require('path').join(__dirname, '..', 'apps-script');
const m = criar([R + '/Codigo.gs', R + '/Seguranca.gs', R + '/Vales.gs', R + '/Bancada.gs', R + '/Relatorios.gs', R + '/Servicos.gs', R + '/Gestao.gs', R + '/Clientes.gs', R + '/Marketing.gs', R + '/Substituicoes.gs', R + '/Espera.gs', R + '/Contrato.gs']);
const { ctx, chamar, emails } = m;
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 600) : ''); } else console.log('  ✓', msg); };
const linkDe = (e) => (e.body.match(/t=([a-f0-9]+)/) || [])[1];
const hoje = ctx.hojeTexto();
const mes = hoje.slice(0, 7);
ctx.configurarPlanilha();
ctx.autorizarEmails(); chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'ambar2026adm' });
const adm = chamar('b_entrar', { email: 'contato@acasaambar.com.br', senha: 'ambar2026adm' }).dados.token;
chamar('b_salvarMembro', { token: adm, membro: { email: 'bia@acasaambar.com.br', nome: 'Bia Santos', papel: 'recepcao' } });
chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'recep2026ok' });
const rec = chamar('b_entrar', { email: 'bia@acasaambar.com.br', senha: 'recep2026ok' }).dados.token;
chamar('b_salvarProfissional', { token: adm, profissional: { nome: 'Lia Esteticista', categorias: ['Estética facial', 'Estética corporal'], dias: [0, 1, 2, 3, 4, 5, 6], inicio: '06:00', fim: '23:00', comissao: 40 } });
chamar('b_salvarProfissional', { token: adm, profissional: { nome: 'Mara Facial', categorias: ['Estética facial'], dias: [0, 1, 2, 3, 4, 5, 6], inicio: '06:00', fim: '23:00', comissao: 30 } });
chamar('b_salvarMembro', { token: adm, membro: { email: 'lia@gmail.com', nome: 'Lia Moura', papel: 'professora', professorNome: 'Lia Esteticista' } });
chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'liamoura2026' });
const lia = chamar('b_entrar', { email: 'lia@gmail.com', senha: 'liamoura2026' }).dados.token;
chamar('cadastrar', { endereco: END_TESTE, cpf: '529.982.247-25', nome: 'Maria Souza', whatsapp: '85999990000', email: 'maria@gmail.com', senha: 'abc12345' });
let r;
const preco = ctx.buscarItemVenda('limpeza-pele').preco;

console.log('— um atendimento feito, uma falta, um cancelado');
const marca = (hora, status, pag) => {
  const a = chamar('b_agendarServico', { token: rec, servicoId: 'limpeza-pele', profissional: 'Lia Esteticista', data: hoje, hora, cpf: '52998224725', pagamento: pag || 'no_dia', metodo: 'Pix' });
  if (!a.ok) console.log('   erro ao marcar:', a.erro);
  if (status) chamar('b_atualizarAtendimento', { token: rec, id: a.dados.id, status });
  return a.dados;
};
const feito = marca('06:00', 'atendido', 'pago');
marca('08:00', 'falta');
marca('10:00', 'cancelado');
marca('12:00', 'atendido', 'cortesia');

r = chamar('b_relatorioProfissional', { token: adm, mes, profissional: 'Lia Esteticista' });
ok(r.ok && r.dados.profissional === 'Lia Esteticista' && r.dados.mes === mes, 'administração gera o relatório de qualquer pessoa', r.erro);
const d = r.dados || { resumo: {}, atendimentos: [] };
ok(d.resumo.atendimentos === 2 && d.resumo.faltas === 1 && d.resumo.cancelados === 1 && d.resumo.agendados === 3, 'conta atendidos, faltas, cancelados e agendados', d.resumo);
ok(d.atendimentos.length === 1 && d.atendimentos[0].cliente === 'Maria Souza' && d.atendimentos[0].hora === '06:00' && d.atendimentos[0].base === preco && d.atendimentos[0].pct === 40, 'linha do atendimento com cliente, hora, base e %', d.atendimentos);
ok(d.resumo.comissao === Math.round(preco * 40) / 100 && d.resumo.aPagar === d.resumo.comissao && d.resumo.pago === 0, 'comissão do mês = 40% (tudo a pagar)', d.resumo);
ok(d.pagamentos.length === 0 && d.anteriores.length === 0, 'sem pagamento e sem pendência anterior');

console.log('— pagar e conferir de novo');
const idC = chamar('b_comissoes', { token: adm, mes }).dados.lista.find((c) => c.profissional === 'Lia Esteticista').id;
chamar('b_pagarComissoes', { token: adm, ids: [idC], forma: 'Pix', mes });
r = chamar('b_relatorioProfissional', { token: adm, mes, profissional: 'Lia Esteticista' });
ok(r.ok && r.dados.resumo.aPagar === 0 && r.dados.resumo.pago === r.dados.resumo.comissao && r.dados.atendimentos[0].pago === true, 'depois de pagar: tudo pago', r.dados && r.dados.resumo);
ok(r.ok && r.dados.pagamentos.length === 1 && r.dados.pagamentos[0].forma === 'Pix' && r.dados.pagamentos[0].data === hoje && r.dados.pagamentos[0].valor === r.dados.resumo.pago, 'mostra como e quando foi pago', r.dados && r.dados.pagamentos);

console.log('— quem pode ver');
r = chamar('b_relatorioProfissional', { token: lia, mes, profissional: 'Mara Facial' });
ok(r.ok && r.dados.profissional === 'Lia Esteticista', 'a profissional só vê o dela (mesmo pedindo outra pessoa)', r.dados && r.dados.profissional);
r = chamar('b_relatorioProfissional', { token: rec, mes, profissional: 'Lia Esteticista' });
ok(!r.ok, 'recepção não vê (é financeiro)', r.erro);
r = chamar('b_relatorioProfissional', { token: adm, mes, profissional: '' });
ok(!r.ok, 'sem escolher a pessoa: recusa', r.erro);
r = chamar('b_relatorioProfissional', { token: adm, mes: ctx.somarDias(hoje, -70).slice(0, 7), profissional: 'Mara Facial' });
ok(r.ok && r.dados.resumo.atendimentos === 0 && r.dados.resumo.comissao === 0, 'mês sem movimento: relatório vazio, sem erro', r.erro);

console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTUDO CERTO');
process.exit(falhas ? 1 : 0);
