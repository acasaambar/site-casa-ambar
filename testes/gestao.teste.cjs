const { criar } = require('./simulador.cjs');
// endereço de exemplo (o cadastro do site exige endereço completo)
const END_TESTE = { cep: '60150-160', endereco: 'Rua Eduardo Salgado', numero: '448', bairro: 'Aldeota', cidade: 'Fortaleza', uf: 'CE' };
const R = require('path').join(__dirname, '..', 'apps-script');
const m = criar([R + '/Codigo.gs', R + '/Seguranca.gs', R + '/Vales.gs', R + '/Bancada.gs', R + '/Relatorios.gs', R + '/Servicos.gs', R + '/Gestao.gs', R + '/Clientes.gs', R + '/Marketing.gs', R + '/Substituicoes.gs']);
const { ctx, chamar, emails } = m;
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); } else console.log('  ✓', msg); };
const linkDe = (e) => (e.body.match(/t=([a-f0-9]+)/) || [])[1];
const hoje = ctx.hojeTexto();
const proxDiaUtil = (base, n) => { let d = ctx.somarDias(base, n); while ([0].includes(new Date(d + 'T12:00:00Z').getUTCDay())) d = ctx.somarDias(d, 1); return d; };
ctx.configurarPlanilha();
ctx.autorizarEmails(); chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'ambar2026adm' });
const adm = chamar('b_entrar', { email: 'contato@acasaambar.com.br', senha: 'ambar2026adm' }).dados.token;
chamar('b_salvarMembro', { token: adm, membro: { email: 'bia@acasaambar.com.br', nome: 'Bia Santos', papel: 'recepcao' } });
chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'recep2026ok' });
const rec = chamar('b_entrar', { email: 'bia@acasaambar.com.br', senha: 'recep2026ok' }).dados.token;
chamar('b_salvarMembro', { token: adm, membro: { email: 'lia@gmail.com', nome: 'Lia Esteticista', papel: 'professora', professorNome: 'Lia Esteticista' } });
chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'liaestetica1' });
const lia = chamar('b_entrar', { email: 'lia@gmail.com', senha: 'liaestetica1' }).dados.token;
chamar('b_salvarMembro', { token: adm, membro: { email: 'rosa@gmail.com', nome: 'Rosa Fisio', papel: 'professora', professorNome: 'Rosa Fisio' } });
chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'rosafisio12' });
const rosa = chamar('b_entrar', { email: 'rosa@gmail.com', senha: 'rosafisio12' }).dados.token;
let r;

console.log('— catálogo, profissionais e estoque');
r = chamar('b_salvarProfissional', { token: adm, profissional: { nome: 'Lia Esteticista', categorias: ['Estética facial', 'Estética corporal'], dias: [1, 2, 3, 4, 5, 6], inicio: '08:00', fim: '18:00', comissao: 40, comissaoProduto: 10 } });
ok(r.ok && r.dados.profissionais[0].comissao === 40, 'profissional com comissão de 40%', r);
chamar('b_salvarProfissional', { token: adm, profissional: { nome: 'Rosa Fisio', categorias: ['Fisioterapia'], dias: [1, 2, 3, 4, 5], comissao: 50 } });
r = chamar('b_salvarProduto', { token: rec, produto: { nome: 'Sérum' } });
ok(!r.ok && /não permite/.test(r.erro), 'recepção não cadastra produto');
r = chamar('b_salvarProduto', { token: adm, produto: { nome: 'Máscara de argila', categoria: 'Insumo de cabine', unidade: 'g', custo: 0.5, minimo: 100, estoqueInicial: 500 } });
ok(r.ok && r.dados.produtos[0].estoque === 500, 'insumo com estoque inicial', r);
const argila = r.dados.produtos[0].id;
r = chamar('b_salvarProduto', { token: adm, produto: { nome: 'Protetor solar FPS 50', categoria: 'Revenda (home care)', vende: true, preco: 120, custo: 60, minimo: 2, estoqueInicial: 5 } });
const protetor = r.dados.produtos.find((p) => p.nome.startsWith('Protetor')).id;
ok(r.ok && protetor, 'produto de revenda', r);
r = chamar('b_movimentarEstoque', { token: adm, produtoId: protetor, tipo: 'entrada', qtd: 3, custo: 55, lancarDespesa: true, pago: true, forma: 'Pix' });
ok(r.ok && r.dados.produtos.find((p) => p.id === protetor).estoque === 8 && r.dados.produtos.find((p) => p.id === protetor).custo === 55, 'compra entra no estoque e atualiza custo', r);
r = chamar('b_movimentarEstoque', { token: rec, produtoId: argila, tipo: 'ajuste', qtd: 480 });
ok(r.ok && r.dados.produtos.find((p) => p.id === argila).estoque === 480, 'ajuste por contagem', r);
// serviço usa 30 g de argila por sessão
r = chamar('b_catalogoServicos', { token: adm });
const limpeza = r.dados.servicos.find((s) => s.id === 'limpeza-pele');
r = chamar('b_salvarServico', { token: adm, servico: { ...limpeza, consumo: [{ produtoId: argila, qtd: 30 }] } });
ok(r.ok && r.dados.servicos.find((s) => s.id === 'limpeza-pele').consumo[0].qtd === 30, 'serviço com produto usado por sessão', r);

console.log('— promoções');
r = chamar('b_salvarPromocao', { token: adm, promocao: { nome: 'Facial da semana', tipo: 'percentual', valor: 10, grupos: ['Estética facial'], onde: 'bancada' } });
ok(r.ok && r.dados[0].situacao === 'no ar', 'promoção criada', r);
r = chamar('b_simularPreco', { token: rec, planoId: 'limpeza-pele' });
ok(r.ok && r.dados.valorFinal === 179.1 && r.dados.promocao === 'Facial da semana', 'promoção aplicada sozinha (sem código)', r);
r = chamar('b_simularPreco', { token: rec, planoId: 'drenagem' });
ok(r.ok && r.dados.valorFinal === 199, 'promoção não pega outra área', r);
chamar('b_salvarCupom', { token: adm, cupom: { codigo: 'VIP20', tipo: 'percentual', valor: 20, limitePorAluno: 1 } });
chamar('b_salvarCupom', { token: adm, cupom: { codigo: 'MINI5', tipo: 'percentual', valor: 5 } });
r = chamar('b_simularPreco', { token: rec, planoId: 'limpeza-pele', codigo: 'VIP20' });
ok(r.ok && r.dados.valorFinal === 159.2, 'cupom maior que a promoção vence', r);
r = chamar('b_simularPreco', { token: rec, planoId: 'limpeza-pele', codigo: 'MINI5' });
ok(r.ok && r.dados.valorFinal === 179.1 && /não foi usado/.test(r.dados.mensagem), 'promoção maior que o cupom: não somam', r);
r = chamar('b_salvarPromocao', { token: adm, promocao: { nome: 'Yoga de terça', tipo: 'preco_fixo', valor: 50, itens: ['yoga-avulsa'], onde: 'site' } });
r = chamar('cadastrar', { endereco: END_TESTE, cpf: '529.982.247-25', nome: 'Mariana Costa', whatsapp: '85999990000', email: 'mari@gmail.com', senha: 'aluna2026' });
const tokMari = r.dados.token;
r = chamar('meuPlano', { token: tokMari });
const av = r.dados.catalogo.find((p) => p.id === 'yoga-avulsa');
ok(av.promocao && av.promocao.preco === 50, 'site mostra o preço promocional', av);
r = chamar('comprar', { token: tokMari, planoId: 'yoga-avulsa' });
ok(r.ok && r.dados.valor === 50, 'link do site sai com o preço da promoção', r);

console.log('— bloqueio de horário da profissional');
const dia = proxDiaUtil(hoje, 1);
r = chamar('b_salvarFolga', { token: rec, profissional: 'Lia Esteticista', data: dia, inicio: '12:00', fim: '13:00', motivo: 'Almoço', repetirSemanas: 2 });
ok(r.ok && r.dados.criadas === 3, 'almoço bloqueado por 3 semanas', r);
r = chamar('b_horarios', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: dia });
ok(r.ok && !r.dados.horarios.includes('12:00') && !r.dados.horarios.includes('11:15') && r.dados.horarios.includes('13:00'), 'horários do almoço somem', r.dados && r.dados.horarios.slice(10, 22));
r = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: dia, hora: '12:00', cliente: { nome: 'Ana Teste', whatsapp: '85911112222' } });
ok(!r.ok && /bloqueado/.test(r.erro), 'não agenda no horário bloqueado', r);
const dia2 = proxDiaUtil(dia, 1);
chamar('b_salvarFolga', { token: rec, profissional: 'Lia Esteticista', data: dia2, diaTodo: true, motivo: 'Curso' });
r = chamar('b_horarios', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: dia2 });
ok(r.ok && r.dados.horarios.length === 0 && /Curso/.test(r.dados.motivo), 'dia todo bloqueado', r);
r = chamar('b_folgas', { token: lia, de: dia, dias: 30 });
ok(r.ok && r.dados.length === 4, 'profissional vê os próprios bloqueios', r);
r = chamar('b_salvarFolga', { token: lia, profissional: 'Lia Esteticista', data: dia, diaTodo: true });
ok(!r.ok, 'profissional não bloqueia sozinha');

console.log('— cliente sem CPF e comanda');
r = chamar('b_agendarServico', { token: rec, servicoId: 'limpeza-pele', profissional: 'Lia Esteticista', data: hoje, hora: '23:00', cliente: { nome: 'Paula Sem Cpf', whatsapp: '(85) 98888-1234' } });
// fora do horário: usa o horário da casa; testa direto pela comanda com agendamento manual
r = chamar('b_agendarServico', { token: rec, servicoId: 'limpeza-pele', profissional: 'Lia Esteticista', data: dia, hora: '09:00', cliente: { nome: 'Paula Sem Cpf', whatsapp: '(85) 98888-1234' } });
ok(r.ok && r.dados.cpf.length === 15 && r.dados.cpf[0] === '9', 'cliente sem CPF ganha código interno', r);
const at1 = r.dados;
const cpfPaula = at1.cpf;
r = chamar('b_alunos', { token: rec });
ok(r.ok && r.dados.some((a) => a.cpf === cpfPaula && a.semCpf), 'aparece em Clientes como "sem CPF"', r.dados && r.dados.map((a) => a.nome));
r = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: dia, hora: '14:00', cliente: { nome: 'Paula Sem Cpf', whatsapp: '85988881234' } });
ok(r.ok && r.dados.cpf === cpfPaula, 'mesmo WhatsApp: mesma cliente', r);
const at2 = r.dados;
r = chamar('b_comandaDoAtendimento', { token: rec, atendimentoId: at1.id });
ok(r.ok && r.dados.itens.length === 1 && r.dados.total === 179.1 && r.dados.itens[0].promocao === 'Facial da semana', 'comanda aberta pelo atendimento (com promoção)', r);
const cmd = r.dados;
r = chamar('b_salvarComanda', { token: rec, comanda: { id: cmd.id, itens: [...cmd.itens, { tipo: 'produto', id: protetor, qtd: 2, profissional: 'Lia Esteticista' }], obs: '=IMPORTXML("http://x")' } });
ok(r.ok && r.dados.total === 179.1 + 240 && r.dados.itens.length === 2, 'produto entra na comanda', r);
ok(String(m.ss.getSheetByName('Comandas').rows.at(-1)[13]).startsWith("'="), 'observação com fórmula neutralizada');
r = chamar('b_comandas', { token: rec });
ok(r.ok && r.dados.length === 1, 'comandas abertas', r);
r = chamar('b_comandaDoAtendimento', { token: rec, atendimentoId: at2.id });
ok(r.ok && r.dados.id === cmd.id && r.dados.itens.length === 3, 'segundo atendimento da mesma cliente entra na mesma comanda', r);
// tira o segundo
r = chamar('b_salvarComanda', { token: rec, comanda: { id: cmd.id, itens: r.dados.itens.filter((i) => i.atendimentoId !== at2.id) } });
const total = r.dados.total;
r = chamar('b_fecharComanda', { token: rec, id: cmd.id, pagamentos: [{ metodo: 'Pix', valor: 300 }] });
ok(!r.ok && /somam/.test(r.erro), 'pagamento precisa fechar o total', r);
chamar('b_abrirCaixa', { token: rec, valor: 100 });
r = chamar('b_fecharComanda', { token: rec, id: cmd.id, pagamentos: [{ metodo: 'Pix', valor: 300 }, { metodo: 'Dinheiro', valor: Math.round((total - 300) * 100) / 100 }] });
ok(r.ok && r.dados.status === 'fechada', 'comanda fechada com Pix + dinheiro', r);
const pags = chamar('b_pagamentos', { token: adm }).dados.filter((p) => p.orderNsu.startsWith('Q'));
ok(pags.length === 2 && pags.every((p) => p.status === 'pago' && p.metodo === 'Misto'), 'um pagamento por item, forma "Misto"', pags);
r = chamar('b_atendimentos', { token: rec, de: dia, dias: 1 });
const a1 = r.dados.atendimentos.find((a) => a.id === at1.id);
ok(a1.status === 'atendido' && a1.pagamento === 'pago' && a1.valor === 179.1, 'atendimento marcado atendido e pago', a1);
r = chamar('b_produtos', { token: rec });
ok(r.dados.produtos.find((p) => p.id === protetor).estoque === 6, 'venda baixou 2 protetores', r.dados.produtos);
ok(r.dados.produtos.find((p) => p.id === argila).estoque === 450, 'sessão gastou 30 g de argila', r.dados.produtos);
r = chamar('b_comissoes', { token: adm });
const kLia = r.dados.porProfissional.find((p) => p.nome === 'Lia Esteticista');
ok(kLia && kLia.aPagar === Math.round((179.1 * 0.4 + 240 * 0.1) * 100) / 100, 'comissão: 40% do serviço + 10% do produto', r.dados);
r = chamar('b_caixa', { token: rec });
ok(r.ok && r.dados.dinheiroVendas === Math.round((total - 300) * 100) / 100 && r.dados.porForma.some((f) => f.nome === 'Pix' && f.valor === 300), 'caixa separa Pix e dinheiro da comanda', r.dados);
r = chamar('b_movimentoCaixa', { token: rec, tipo: 'despesa', valor: 20, motivo: 'Café e água', categoria: 'Outros' });
r = chamar('b_movimentoCaixa', { token: rec, tipo: 'sangria', valor: 50, motivo: 'Depósito' });
const esperado = Math.round((100 + (total - 300) - 20 - 50) * 100) / 100;
ok(r.ok && r.dados.esperado === esperado, 'esperado na gaveta = abertura + dinheiro − despesa − sangria', [r.dados && r.dados.esperado, esperado]);
r = chamar('b_fecharCaixa', { token: rec, contado: esperado - 5 });
ok(r.ok && r.dados.status === 'fechado' && r.dados.diferenca === -5, 'caixa fechado com diferença de −R$ 5', r.dados);
r = chamar('b_movimentoCaixa', { token: rec, tipo: 'sangria', valor: 10, motivo: 'x' });
ok(!r.ok, 'caixa fechado não aceita movimento');

console.log('— desfazer atendimento devolve estoque e cancela comissão');
r = chamar('b_atualizarAtendimento', { token: rec, id: at1.id, status: 'agendado' });
r = chamar('b_produtos', { token: rec });
ok(r.dados.produtos.find((p) => p.id === argila).estoque === 480, 'argila devolvida', r.dados.produtos.find((p) => p.id === argila));
r = chamar('b_comissoes', { token: adm });
ok(r.dados.porProfissional.find((p) => p.nome === 'Lia Esteticista').aPagar === 24, 'sobra só a comissão do produto', r.dados.porProfissional);
chamar('b_atualizarAtendimento', { token: rec, id: at1.id, status: 'atendido' });

console.log('— comissões, despesas e financeiro');
r = chamar('b_meusGanhos', { token: lia });
ok(r.ok && r.dados.aPagar === Math.round((179.1 * 0.4 + 24) * 100) / 100, 'profissional vê os próprios ganhos', r.dados);
r = chamar('b_meusGanhos', { token: rosa });
ok(r.ok && r.dados.total === 0, 'outra profissional não vê', r.dados);
r = chamar('b_financeiro', { token: lia }); ok(!r.ok, 'profissional não vê o financeiro');
r = chamar('b_financeiro', { token: rec }); ok(!r.ok, 'recepção não vê o financeiro');
const ids = chamar('b_comissoes', { token: adm }).dados.lista.filter((c) => c.status === 'a_pagar').map((c) => c.id);
r = chamar('b_pagarComissoes', { token: adm, ids, forma: 'Pix' });
ok(r.ok && r.dados.porProfissional[0].aPagar === 0 && r.dados.porProfissional[0].pago > 0, 'comissões pagas', r.dados);
r = chamar('b_despesas', { token: adm });
const dCom = r.dados.lista.find((x) => x.categoria === 'Comissões');
ok(dCom && dCom.status === 'pago', 'pagamento de comissão vira despesa', r.dados.lista);
r = chamar('b_excluirDespesa', { token: adm, id: dCom.id });
ok(chamar('b_comissoes', { token: adm }).dados.porProfissional[0].aPagar > 0, 'excluir a despesa devolve as comissões para "a pagar"');
const mesAnt = ctx.somarDias(hoje.slice(0, 8) + '01', -1).slice(0, 7);
r = chamar('b_salvarDespesa', { token: adm, despesa: { data: mesAnt + '-10', descricao: 'Aluguel', categoria: 'Aluguel e condomínio', valor: 3500, status: 'pago', recorrente: true } });
ok(r.ok, 'aluguel recorrente lançado no mês passado', r);
r = chamar('b_despesas', { token: adm });
const alug = r.dados.lista.find((x) => x.descricao === 'Aluguel');
ok(alug && alug.status === 'a_pagar' && alug.data === hoje.slice(0, 8) + '10' && alug.automatica, 'aluguel aparece sozinho neste mês, a pagar', r.dados.lista);
r = chamar('b_despesas', { token: adm });
ok(r.dados.lista.filter((x) => x.descricao === 'Aluguel').length === 1, 'não duplica ao abrir de novo');
r = chamar('b_pagarDespesa', { token: adm, id: alug.id, forma: 'Pix' });
r = chamar('b_financeiro', { token: adm });
ok(r.ok && r.dados.saidas >= 3500 && r.dados.entradas >= total && r.dados.porGrupo.some((g) => g.nome === 'Produtos'), 'financeiro do mês: entradas, saídas e grupos', r.dados && [r.dados.entradas, r.dados.saidas, r.dados.porGrupo]);
r = chamar('b_relatorio', { token: adm });
ok(r.ok && r.dados.financeiro.porModalidade.some((x) => x.nome === 'Produtos'), 'relatório mostra Produtos', r.ok && r.dados.financeiro.porModalidade);

console.log('— cupom em comanda conta 1 uso');
r = chamar('b_salvarComanda', { token: rec, comanda: { cpf: '52998224725', itens: [{ tipo: 'produto', id: protetor, qtd: 1 }, { tipo: 'servico', id: 'drenagem', profissional: 'Lia Esteticista' }], codigo: 'VIP20' } });
ok(r.ok && r.dados.total === Math.round((120 * 0.8 + 199 * 0.8) * 100) / 100, 'cupom aplicado em todos os itens', r);
r = chamar('b_fecharComanda', { token: rec, id: r.dados.id, pagamentos: [{ metodo: 'Cartão de crédito', valor: r.dados.total, parcelas: 2, bandeira: 'Visa' }] });
ok(r.ok, 'comanda com cupom fechada', r);
r = chamar('b_simularPreco', { token: rec, planoId: 'drenagem', cpf: '52998224725', codigo: 'VIP20' });
ok(!r.ok && /já usou/.test(r.erro), 'limite de 1 uso por cliente respeitado (a comanda contou 1)', r);
r = chamar('b_salvarComanda', { token: rec, comanda: { itens: [{ tipo: 'plano', id: 'yoga-mensal-2x' }] } });
ok(!r.ok && /com cadastro/.test(r.erro), 'plano exige cliente com cadastro', r);
r = chamar('b_salvarComanda', { token: rec, comanda: { itens: [{ tipo: 'produto', id: protetor, qtd: 1 }] } });
ok(r.ok && r.dados.nome === 'Cliente do balcão', 'venda de produto sem cliente', r);
r = chamar('b_fecharComanda', { token: rec, id: r.dados.id, pagamentos: [{ metodo: 'Dinheiro', valor: 120 }] });
ok(r.ok, 'venda avulsa fechada', r);

console.log('— informar o CPF depois');
r = chamar('b_salvarAluno', { token: rec, cpf: cpfPaula, dados: { cpf: '111.444.777-35' } });
ok(r.ok && r.dados.cpf === '11144477735' && !r.dados.semCpf && r.dados.atendimentos.length === 2, 'CPF informado: histórico vai junto', r.dados && [r.dados.cpf, r.dados.atendimentos.length]);
ok(chamar('b_pagamentos', { token: adm }).dados.filter((p) => p.cpf === '11144477735').length === 2, 'pagamentos transferidos para o CPF');
r = chamar('b_aluno', { token: rec, cpf: cpfPaula });
ok(!r.ok, 'código interno antigo não existe mais');

console.log('— importação');
r = chamar('b_importarClientes', { token: rec, linhas: [] });
ok(!r.ok, 'só a administração importa');
const linhas = [
  { nome: 'Fernanda Lopes', whatsapp: '+55 85 99777-1111', email: 'fe@gmail.com', nascimento: '12/' + hoje.slice(5, 7) + '/1988' },
  { nome: 'Paula Sem Cpf', whatsapp: '85988881234', email: 'paula@gmail.com' },
  { nome: 'Gabi Rocha', cpf: '390.533.447-05', whatsapp: '85997772222' },
  { nome: 'X', whatsapp: '85997773333' },
  { nome: 'Sem Contato' },
  { nome: 'Fernanda Lopes', whatsapp: '85997771111' },
];
r = chamar('b_importarClientes', { token: adm, linhas, simular: true });
ok(r.ok && r.dados.novos === 2 && r.dados.atualizados === 1 && r.dados.totalIgnorados === 2 && r.dados.repetidos === 1, 'prévia: 2 novas, 1 atualizada, 2 ignoradas, 1 repetida', r.dados);
r = chamar('b_importarClientes', { token: adm, linhas });
ok(r.ok && r.dados.novos === 2, 'importou', r.dados);
const fer = chamar('b_alunos', { token: adm }).dados.find((a) => a.nome === 'Fernanda Lopes');
ok(fer && fer.semCpf && fer.whatsapp === '85997771111', 'WhatsApp com +55 normalizado', fer);
ok(chamar('b_aluno', { token: adm, cpf: '11144477735' }).dados.email === 'paula@gmail.com', 'e-mail completado em quem já existia');

console.log('— campanhas e descadastro');
r = chamar('b_publicoCampanha', { token: rec, filtro: { tipo: 'aniversariantes' } });
ok(r.ok && r.dados.pessoas.some((p) => p.nome === 'Fernanda Lopes' && p.dia === 12), 'aniversariantes do mês (data importada)', r.dados);
r = chamar('b_enviarCampanha', { token: rec, filtro: { tipo: 'aniversariantes' }, assunto: 'Feliz aniversário', mensagem: 'Oi, {nome}!\n\nPresente para você.' });
ok(!r.ok, 'só a administração dispara e-mail em massa');
const antes = emails.length;
r = chamar('b_enviarCampanha', { token: adm, filtro: { tipo: 'aniversariantes' }, assunto: 'Feliz aniversário, {nome}', mensagem: 'Oi, {nome}!\n\nPresente para você.' });
ok(r.ok && r.dados.enviados >= 1 && emails.length > antes, 'campanha enviada', r);
const em = emails.find((e) => e.to === 'fe@gmail.com');
ok(em && em.subject === 'Feliz aniversário, Fernanda' && /Oi, Fernanda!/.test(em.htmlBody), 'mensagem personalizada com o nome');
const t = (em.htmlBody.match(/descadastrar\?t=([a-f0-9]{32})/) || [])[1];
ok(t && !em.htmlBody.includes('descadastrar?c='), 'link de descadastro sem CPF no endereço');
r = chamar('sairLista', { t: 'f'.repeat(32) }); ok(!r.ok, 'token falso recusado');
r = chamar('sairLista', { t }); ok(r.ok && r.dados.nome === 'Fernanda', 'descadastro pelo link', r);
r = chamar('b_publicoCampanha', { token: adm, filtro: { tipo: 'aniversariantes' } });
ok(r.dados.pessoas.find((p) => p.nome === 'Fernanda Lopes').aceitaEmail === false, 'quem saiu da lista não recebe mais e-mail');
r = chamar('b_registrarCampanha', { token: rec, nome: 'Aniversário WhatsApp', filtro: { tipo: 'aniversariantes' }, total: 2, enviados: 2 });
ok(r.ok && r.dados.length === 2, 'histórico de campanhas', r.dados);

console.log('— lembretes da véspera');
const amanha = ctx.somarDias(hoje, 1);
r = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: amanha, hora: '10:00', cpf: '52998224725', pagamento: 'no_dia' });
const diaAmanha = new Date(amanha + 'T12:00:00Z').getUTCDay();
if (r.ok) {
  const n0 = emails.length;
  r = chamar('b_lembretesAuto', { token: rec });
  ok(r.ok && r.dados.enviados >= 1 && emails.length > n0 && /Seu horário amanhã/.test(emails.at(-1).subject), 'lembrete automático enviado', r);
  r = chamar('b_lembretesAuto', { token: rec });
  ok(r.ok && r.dados.pulado, 'não repete na mesma hora');
  r = chamar('b_lembretes', { token: rec });
  ok(r.ok && r.dados.lista.find((x) => x.nome === 'Mariana Costa').enviado, 'marcado como enviado', r.dados);
} else console.log('    (amanhã sem atendimento: ' + r.erro + ', dia ' + diaAmanha + ')');

console.log('— ficha de estética, evolução e fotos');
const png = 'data:image/png;base64,' + Buffer.from('fototeste').toString('base64');
r = chamar('b_prontuario', { token: lia, cpf: '11144477735' });
ok(!r.ok, 'profissional não abre ficha pelo CPF');
r = chamar('b_prontuario', { token: rosa, atendimentoId: at1.id });
ok(!r.ok && /não é seu/.test(r.erro), 'outra profissional não abre');
r = chamar('b_salvarFichaEstetica', { token: lia, atendimentoId: at1.id, ficha: { queixa: 'Manchas', condicoes: ['Hipertensão', 'inventada'], consentimentoFotos: true } });
ok(r.ok && r.dados.fichaEstetica.condicoes.length === 1 && r.dados.cpf === '', 'profissional preenche a ficha (sem ver o CPF)', r.dados);
r = chamar('b_salvarEvolucao', { token: lia, atendimentoId: at1.id, anotacao: 'Pele reagiu bem.', fotos: [png, png] });
ok(r.ok && r.dados.evolucoes[0].fotos.length === 2 && r.dados.evolucoes[0].profissional === 'Lia Esteticista', 'evolução com 2 fotos', r.dados && r.dados.evolucoes);
const fid = r.dados.evolucoes[0].fotos[0];
r = chamar('b_foto', { token: lia, id: fid });
ok(r.ok && r.dados.startsWith('data:image/png;base64,'), 'foto volta para quem atende', r);
r = chamar('b_foto', { token: rosa, id: fid }); ok(!r.ok, 'outra profissional não vê a foto');
r = chamar('b_foto', { token: adm, id: 'arquivo99999999' }); ok(!r.ok, 'arquivo que não é foto de evolução é recusado');
r = chamar('b_salvarEvolucao', { token: lia, atendimentoId: at1.id, fotos: ['data:text/html;base64,PHNjcmlwdD4='] });
ok(!r.ok && /inválida/.test(r.erro), 'só imagem é aceita');
r = chamar('b_aluno', { token: rec, cpf: '11144477735' });
ok(r.ok && r.dados.fichaEstetica && r.dados.evolucoes === 1 && r.dados.historico.some((h) => h.tipo === 'evolucao') && r.dados.historico.some((h) => h.tipo === 'produto'), 'histórico completo da cliente', r.dados && r.dados.historico.map((h) => h.tipo));
r = chamar('b_excluirEvolucao', { token: rosa, id: chamar('b_prontuario', { token: lia, atendimentoId: at1.id }).dados.evolucoes[0].id });
ok(!r.ok, 'quem não registrou não apaga');

console.log('— comissão e tempo de cada serviço por profissional (como no Avec)');
r = chamar('b_salvarProfissional', { token: adm, profissional: { nome: 'Mara Facial', dias: [1, 2, 3, 4, 5, 6], comissao: 25,
  servicos: [{ id: 'limpeza-pele', comissao: 20, duracao: 90 }, { id: 'microagulhamento-facial', comissao: 30, duracao: 50 }, { id: 'peeling-coreano', comissao: '', duracao: '' }, { id: 'nao-existe', comissao: 99 }] } });
const mara = r.ok && r.dados.profissionais.find((p) => p.nome === 'Mara Facial');
ok(mara && mara.servicos.length === 3 && mara.servicos[1].comissao === 30 && mara.servicos[1].duracao === 50 && mara.servicos[2].comissao === null,
  'serviços da profissional com comissão e tempo próprios', mara);
ok(mara && mara.categorias.join() === 'Estética facial', 'áreas saem dos serviços marcados', mara && mara.categorias);
r = chamar('b_salvarProfissional', { token: adm, profissional: { nome: 'Mara Facial', nomeOriginal: 'Mara Facial', dias: [1], servicos: [] } });
ok(!r.ok && /pelo menos um serviço/.test(r.erro), 'sem nenhum serviço marcado é recusado', r);
const diaMara = proxDiaUtil(hoje, 3);
r = chamar('b_horarios', { token: rec, servicoId: 'drenagem', profissional: 'Mara Facial', data: diaMara });
ok(r.ok && r.dados.horarios.length === 0 && /não faz/.test(r.dados.motivo), 'serviço que ela não faz não tem horário', r.dados);
r = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Mara Facial', data: diaMara, hora: '09:00', cliente: { nome: 'Teste Mara', whatsapp: '85991234567' } });
ok(!r.ok && /não faz/.test(r.erro), 'nem dá para agendar', r);
r = chamar('b_horarios', { token: rec, servicoId: 'microagulhamento-facial', profissional: 'Mara Facial', data: diaMara });
ok(r.ok && r.dados.duracao === 50, 'horários livres usam o tempo dela (50 min, o serviço tem 40)', r.dados && r.dados.duracao);
r = chamar('b_agendarServico', { token: rec, servicoId: 'microagulhamento-facial', profissional: 'Mara Facial', data: diaMara, hora: r.dados.horarios[0], cliente: { nome: 'Teste Mara', whatsapp: '85991234567' } });
ok(r.ok && r.dados.duracao === 50, 'atendimento agendado com 50 min', r);
const atMara = r.dados;
chamar('b_atualizarAtendimento', { token: rec, id: atMara.id, status: 'atendido' });
let kMara = ctx.lerAba('Comissoes').find((c) => c.ref === atMara.id);
ok(kMara && kMara.pct === 30 && kMara.valor === Math.round(atMara.valor * 30) / 100, 'comissão de 30% (a dela neste serviço)', kMara);
r = chamar('b_agendarServico', { token: rec, servicoId: 'peeling-coreano', profissional: 'Mara Facial', data: diaMara, hora: '17:00', cliente: { nome: 'Teste Mara', whatsapp: '85991234567' } });
ok(r.ok && r.dados.duracao === 40, 'sem tempo próprio, vale o do serviço', r);
chamar('b_atualizarAtendimento', { token: rec, id: r.dados.id, status: 'atendido' });
kMara = ctx.lerAba('Comissoes').find((c) => c.ref === r.dados.id);
ok(kMara && kMara.pct === 25, 'sem comissão própria, vale a padrão dela (25%)', kMara);

console.log('— cadastro do cliente: endereço e "Como nos conheceu?"');
{
  const end = { cep: '60150160', endereco: 'Rua Eduardo Salgado', numero: '448', complemento: 'Sala 2', bairro: 'Aldeota', cidade: 'Fortaleza', uf: 'ce' };
  r = chamar('b_novoAluno', { token: rec, nome: 'Clara Endereço', whatsapp: '85998887777', comoConheceu: 'Instagram', endereco: end });
  ok(r.ok, 'cliente novo com endereço', r);
  let a = chamar('b_aluno', { token: rec, cpf: r.dados.cpf }).dados;
  ok(a.comoConheceu === 'Instagram' && a.endereco.cep === '60150-160' && a.endereco.uf === 'CE' && a.endereco.numero === '448' && a.endereco.bairro === 'Aldeota', 'endereço salvo e formatado', a.endereco);
  r = chamar('b_salvarAluno', { token: rec, cpf: a.cpf, dados: { endereco: { complemento: 'Apto 101' }, comoConheceu: 'Indicação de alguém' } });
  ok(r.ok && r.dados.endereco.complemento === 'Apto 101' && r.dados.endereco.endereco === 'Rua Eduardo Salgado' && r.dados.comoConheceu === 'Indicação de alguém', 'editar um campo não apaga o resto', r.dados && r.dados.endereco);
  r = chamar('b_salvarAluno', { token: rec, cpf: a.cpf, dados: { endereco: { cep: '1234' } } });
  ok(!r.ok && /8 números/.test(r.erro), 'CEP incompleto é recusado', r);
  r = chamar('cadastrar', { endereco: END_TESTE, cpf: '71428793860', nome: 'Site Conheceu', whatsapp: '85991114444', email: 'site.c@gmail.com', senha: 'aluna2026', comoConheceu: 'Google' });
  ok(r.ok && ctx.buscarAluno('71428793860').como_conheceu === 'Google', 'cadastro do site guarda como conheceu', r);
  r = chamar('cadastrar', { cpf: '15350946056', nome: 'Sem Endereco', whatsapp: '85991115555', email: 'sem.end@gmail.com', senha: 'aluna2026' });
  ok(!r.ok && /Complete o endereço: CEP, rua, número, bairro, cidade, UF/.test(r.erro), 'cadastro do site exige endereço', r);
  r = chamar('cadastrar', { cpf: '15350946056', nome: 'Com Endereco', whatsapp: '85991115555', email: 'com.end@gmail.com', senha: 'aluna2026', endereco: { ...END_TESTE, numero: '' } });
  ok(!r.ok && /número/.test(r.erro), 'falta só o número: avisa qual', r);
  r = chamar('cadastrar', { cpf: '15350946056', nome: 'Com Endereco', whatsapp: '85991115555', email: 'com.end@gmail.com', senha: 'aluna2026', endereco: { ...END_TESTE, cep: '60150160', complemento: 'Apto 3' } });
  ok(r.ok && r.dados.aluno.endereco === true && ctx.buscarAluno('15350946056').cep === '60150-160', 'cadastro do site com endereço completo', r);
  // aluna antiga sem endereço completa pela área do aluno
  ctx.atualizarLinha('Alunos', ctx.buscarAluno('15350946056')._linha, { endereco: '', numero: '' });
  const tokEnd = chamar('entrar', { cpf: '15350946056', senha: 'aluna2026' }).dados;
  ok(tokEnd.aluno.endereco === false, 'sem endereço completo, o site avisa', tokEnd.aluno);
  r = chamar('salvarEndereco', { token: tokEnd.token, endereco: { ...END_TESTE, numero: '10' } });
  ok(r.ok && r.dados.endereco === true && ctx.buscarAluno('15350946056').numero == 10, 'aluna completa o endereço', r);
  r = chamar('salvarEndereco', { token: 'token-falso-1234567890', endereco: END_TESTE });
  ok(!r.ok, 'sem login não salva endereço');
  r = chamar('b_importarClientes', { token: adm, linhas: [{ nome: 'Importada Avec', whatsapp: '85997776666', cep: '60.170-001', endereco: 'Av. Santos Dumont', numero: '100', bairro: 'Meireles', cidade: 'Fortaleza', uf: 'CE', comoConheceu: 'Wellhub' }] });
  const imp = ctx.lerAba('Alunos').find((x) => x.nome === 'Importada Avec');
  ok(r.ok && imp && imp.cep === '60170-001' && imp.bairro === 'Meireles' && imp.como_conheceu === 'Wellhub', 'importação traz endereço e como conheceu', imp);
  r = chamar('b_relatorio', { token: adm, de: ctx.somarDias(hoje, -30), ate: hoje });
  const al = r.ok && r.dados.alunos;
  ok(al && al.comoConheceram.some((c) => c.nome === 'Google') && al.comoConheceram.some((c) => c.nome === 'Indicação de alguém') && al.bairros.some((b) => b.nome === 'Aldeota') && al.comEndereco >= 2,
    'relatório mostra canais e bairros', al && [al.comoConheceram, al.bairros, al.comEndereco]);
}

console.log('— bandeira do cartão nos pagamentos');
{
  let cm = chamar('b_salvarComanda', { token: rec, comanda: { cliente: { nome: 'Bandeira Teste', whatsapp: '85990004444' }, itens: [{ tipo: 'produto', id: protetor, qtd: 1 }] } });
  ok(cm.ok, 'comanda aberta', cm);
  cm = cm.dados;
  r = chamar('b_fecharComanda', { token: rec, id: cm.id, pagamentos: [{ metodo: 'Cartão de crédito', valor: cm.total, parcelas: 2 }] });
  ok(!r.ok && /bandeira/.test(r.erro), 'cartão sem bandeira é recusado', r);
  r = chamar('b_fecharComanda', { token: rec, id: cm.id, pagamentos: [{ metodo: 'Cartão de débito', valor: 20, bandeira: 'Elo' }, { metodo: 'Cartão de crédito', valor: cm.total - 20, parcelas: 2, bandeira: 'Visa' }] });
  ok(r.ok && r.dados.pagamentos.map((p) => p.bandeira).join() === 'Elo,Visa', 'comanda guarda a bandeira de cada cartão', r);
  const pg = ctx.lerAba('Pagamentos').filter((p) => p.comanda === cm.id);
  ok(pg.length && pg.every((p) => p.bandeira === 'Elo + Visa') && /Elo/.test(pg[0].observacao), 'a venda registra as bandeiras', pg.map((p) => p.bandeira));
  r = chamar('b_vender', { token: rec, cpf: '11144477735', planoId: 'yoga-avulsa', metodo: 'Cartão de débito', bandeira: 'Mastercard' });
  const pv = chamar('b_pagamentos', { token: adm }).dados;
  const lista = Array.isArray(pv) ? pv : pv.lista || pv.pagamentos || [];
  ok(r.ok && lista.some((p) => p.bandeira === 'Mastercard'), 'venda no balcão com bandeira aparece em Vendas', r);
  r = chamar('b_vender', { token: rec, cpf: '11144477735', planoId: 'yoga-avulsa', metodo: 'Cartão de débito', bandeira: 'Inventada' });
  ok(!r.ok && /bandeira/.test(r.erro), 'bandeira fora da lista é recusada', r);
  r = chamar('b_relatorio', { token: adm, de: ctx.somarDias(hoje, -1), ate: hoje });
  ok(r.ok && r.dados.financeiro.porBandeira.some((b) => b.nome === 'Mastercard'), 'relatório por bandeira', r.dados && r.dados.financeiro.porBandeira);
}

console.log('— horários flexíveis da profissional (turnos por dia e datas especiais)');
{
  // próxima segunda e próximo sábado
  const prox = (dow) => { let d = ctx.somarDias(hoje, 1); while (new Date(d + 'T12:00:00Z').getUTCDay() !== dow) d = ctx.somarDias(d, 1); return d; };
  const seg = prox(1), sab = prox(6), sab2 = ctx.somarDias(sab, 7);
  const base = { nome: 'Nina Turnos', comissao: 30, servicos: [{ id: 'drenagem' }] };
  r = chamar('b_salvarProfissional', { token: adm, profissional: { ...base, horarios: { 1: [['08:00', '12:00'], ['14:00', '18:00']], 6: [['08:00', '11:00']] }, especiais: { [sab2]: [['13:00', '17:00']] } } });
  const nina = r.ok && r.dados.profissionais.find((p) => p.nome === 'Nina Turnos');
  ok(nina && nina.horarios['1'].length === 2 && nina.dias.join() === '1,6' && nina.especiais[sab2], 'dois turnos na segunda, sábado curto e um sábado especial', r);
  r = chamar('b_horarios', { token: rec, servicoId: 'drenagem', profissional: 'Nina Turnos', data: seg });
  ok(r.ok && r.dados.horarios.includes('08:00') && r.dados.horarios.includes('11:00') && !r.dados.horarios.includes('11:15') && !r.dados.horarios.includes('12:30') && r.dados.horarios.includes('14:00') && r.dados.horarios.at(-1) === '17:00',
    'horários livres respeitam o intervalo do almoço', r.dados && r.dados.horarios);
  r = chamar('b_horarios', { token: rec, servicoId: 'drenagem', profissional: 'Nina Turnos', data: sab });
  ok(r.ok && r.dados.horarios.at(-1) === '10:00', 'sábado só até as 11h', r.dados && r.dados.horarios);
  r = chamar('b_horarios', { token: rec, servicoId: 'drenagem', profissional: 'Nina Turnos', data: sab2 });
  ok(r.ok && r.dados.horarios[0] === '13:00' && r.dados.horarios.at(-1) === '16:00', 'sábado especial: 13h às 17h (fora do horário da casa)', r.dados && r.dados.horarios);
  r = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Nina Turnos', data: seg, hora: '12:00', cliente: { nome: 'Teste Turno', whatsapp: '85991230000' } });
  ok(!r.ok && /Fora do horário/.test(r.erro), 'não agenda no intervalo', r);
  r = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Nina Turnos', data: seg, hora: '14:00', cliente: { nome: 'Teste Turno', whatsapp: '85991230000' } });
  ok(r.ok, 'agenda no segundo turno', r);
  r = chamar('b_atendimentos', { token: rec, de: seg, dias: 1 });
  const eqN = r.ok && r.dados.equipe.find((e) => e.nome === 'Nina Turnos');
  ok(eqN && eqN.turnos.length === 2 && eqN.turnos[1][0] === '14:00', 'agenda do dia traz os turnos', eqN);
  r = chamar('b_salvarProfissional', { token: adm, profissional: { ...base, nomeOriginal: 'Nina Turnos', horarios: { 1: [['08:00', '12:00'], ['11:00', '15:00']] } } });
  ok(!r.ok && /sobrep/.test(r.erro), 'turnos sobrepostos são recusados', r);
  r = chamar('b_salvarProfissional', { token: adm, profissional: { ...base, nomeOriginal: 'Nina Turnos', horarios: {} } });
  ok(!r.ok && /pelo menos um dia/.test(r.erro), 'sem nenhum dia é recusado', r);
  r = chamar('b_salvarProfissional', { token: adm, profissional: { ...base, nomeOriginal: 'Nina Turnos', horarios: { 1: [['08:00', '12:00']] }, especiais: { [seg]: [] } } });
  r = chamar('b_horarios', { token: rec, servicoId: 'drenagem', profissional: 'Nina Turnos', data: seg });
  ok(r.ok && r.dados.horarios.length === 0, 'data especial vazia = não atende nesse dia', r.dados);
}

console.log('— pagamento das professoras de aula (Pilates %, Yoga por aula)');
{
  // um dia que já passou com Yoga e Pilates (seg, qua ou sex)
  const passadas = ctx.gerarAulas(ctx.somarDias(hoje, -6), 6);
  const dd = [...new Set(passadas.map((a) => a.data))].reverse().find((d) => passadas.some((a) => a.data === d && a.modalidade === 'Yoga') && passadas.filter((a) => a.data === d && a.modalidade === 'Pilates' && a.professor === 'Kalliny').length >= 3);
  const pil = passadas.filter((a) => a.data === dd && a.modalidade === 'Pilates' && a.professor === 'Kalliny');
  const yog = passadas.find((a) => a.data === dd && a.modalidade === 'Yoga');
  const cpfA = '52998224725', cpfB = '39053344705';
  chamar('cadastrar', { endereco: END_TESTE, cpf: cpfA, nome: 'Alice Pilates', whatsapp: '85991112222', email: 'alice.p@gmail.com', senha: 'aluna2026' });
  chamar('cadastrar', { endereco: END_TESTE, cpf: cpfB, nome: 'Bruna Yoga', whatsapp: '85991113333', email: 'bruna.y@gmail.com', senha: 'aluna2026' });
  r = chamar('b_vender', { token: adm, cpf: cpfA, planoId: 'pilates-mensal-2x', metodo: 'Pix', inicio: ctx.somarDias(hoje, -6) });
  ok(r.ok, 'plano mensal 2x vendido', r);
  const pago = ctx.lerAba('Pagamentos').filter((p) => ctx.normCpf(p.cpf) === cpfA && p.status === 'pago').pop();
  const reserva = (aula, cpf, forma) => chamar('b_agendar', { token: adm, cpf, aulaId: aula.id, forma, tapete: aula.modalidade === 'Yoga' ? 3 + (cpf === cpfB ? 1 : 0) : undefined });
  const rA1 = reserva(pil[0], cpfA, 'credito');
  const rB1 = reserva(pil[0], cpfB, 'cortesia');
  const rA2 = reserva(pil[1], cpfA, 'wellhub');
  const rA3 = reserva(pil[2], cpfA, 'credito');
  reserva(yog, cpfA, 'cortesia'); reserva(yog, cpfB, 'cortesia');
  ok(rA1.ok && rB1.ok && rA2.ok && rA3.ok, 'reservas em aulas que já passaram', [rA1, rB1, rA2, rA3].map((x) => x.erro));
  chamar('b_presenca', { token: adm, reservaId: rA3.dados.id, status: 'falta' });
  r = chamar('b_pagamentoAulas', { token: rec });
  ok(!r.ok, 'recepção não vê o pagamento das professoras');
  r = chamar('b_pagamentoAulas', { token: adm });
  ok(r.ok && ['Kalliny', 'Sara', 'Ana Paula', 'Hanna'].every((n) => r.dados.professoras.some((p) => p.nome === n)), 'professoras vêm da grade', r.dados && r.dados.professoras.map((p) => p.nome));
  r = chamar('b_salvarPagamentoAulas', { token: adm, wellhubValor: 30, professoras: [{ nome: 'Kalliny', pilatesPct: 40, wellhubPct: 50, desde: dd }, { nome: 'Ana Paula', yogaPorAula: 60, desde: dd }, { nome: 'Sara', pilatesPct: 40, desde: ctx.somarDias(hoje, 30) }] });
  ok(r.ok && r.dados.wellhubValor === 30 && r.dados.professoras.find((p) => p.nome === 'Kalliny').pilatesPct === 40, 'valores salvos', r);
  const mesDD = dd.slice(0, 7);
  r = chamar('b_comissoes', { token: adm, mes: mesDD });
  const ks = r.dados.lista.filter((c) => c.origem === 'aula' || c.origem === 'aula_fixa');
  const kA1 = ks.find((c) => c.id === 'Kaula:' + rA1.dados.id);
  const porAula = Math.round(((Number(pago.valor) + Number(pago.vale_usado || 0)) / 8) * 100) / 100;
  ok(kA1 && kA1.base === porAula && kA1.pct === 40 && kA1.valor === Math.round(porAula * 40) / 100 && kA1.profissional === 'Kalliny', 'Pilates: 40% do valor da aula no plano (mensal 2x = 8 aulas)', kA1);
  const kWh = ks.find((c) => c.id === 'Kaula:' + rA2.dados.id);
  ok(kWh && kWh.base === 30 && kWh.valor === 15, 'Wellhub: 50% dos R$ 30 do check-in', kWh);
  ok(!ks.some((c) => c.id === 'Kaula:' + rB1.dados.id), 'cortesia não gera comissão');
  ok(!ks.some((c) => c.id === 'Kaula:' + rA3.dados.id), 'falta não gera comissão');
  const kY = ks.filter((c) => c.origem === 'aula_fixa');
  ok(kY.length === 1 && kY[0].valor === 60 && kY[0].profissional === 'Ana Paula' && /2 participantes/.test(kY[0].item), 'Yoga: R$ 60 pela aula, uma vez só', kY);
  ok(!ks.some((c) => c.profissional === 'Sara'), 'antes da data "desde" não conta');
  chamar('b_presenca', { token: adm, reservaId: rA1.dados.id, status: 'falta' });
  r = chamar('b_comissoes', { token: adm, mes: mesDD });
  ok(!r.dados.lista.some((c) => c.id === 'Kaula:' + rA1.dados.id), 'marcar falta depois tira a comissão');
  chamar('b_presenca', { token: adm, reservaId: rA1.dados.id, status: 'check-in' });
  r = chamar('b_comissoes', { token: adm, mes: mesDD });
  ok(r.dados.lista.some((c) => c.id === 'Kaula:' + rA1.dados.id && c.status === 'a_pagar'), 'presença de volta, comissão de volta');
  const n = ctx.lerAba('Comissoes').length;
  chamar('b_comissoes', { token: adm, mes: mesDD }); ctx.esquecerComissoesAulas(); chamar('b_comissoes', { token: adm, mes: mesDD });
  ok(ctx.lerAba('Comissoes').length === n, 'abrir de novo não duplica');
}

console.log('— profissional: minhas clientes, anamnese (texto sem limite + fotos) e comanda');
{
  r = chamar('b_minhasClientes', { token: lia });
  const cli = r.ok && r.dados.find((c) => c.nome === at1.nome);
  ok(cli && cli.ref && !('cpf' in cli) && !('whatsapp' in cli), 'Lia vê as clientes dela, sem CPF nem WhatsApp', r.dados);
  r = chamar('b_minhasClientes', { token: rosa });
  ok(r.ok && !r.dados.some((c) => c.nome === at1.nome), 'outra profissional não vê a cliente da Lia');
  r = chamar('b_minhasClientes', { token: rec });
  ok(!r.ok, 'recepção usa a tela Clientes (não esta)');
  const textoMedio = 'Queixa: manchas na testa.\n'.repeat(120);
  r = chamar('b_salvarAnamneseProf', { token: lia, atendimentoId: cli.ref, titulo: 'Primeira consulta', texto: textoMedio, fotos: [png] });
  ok(r.ok && r.dados.anotacoes.length === 1 && r.dados.anotacoes[0].texto === textoMedio && r.dados.anotacoes[0].fotos.length === 1 && r.dados.anotacoes[0].podeEditar, 'anamnese com texto e foto', r);
  const an1 = r.dados.anotacoes[0];
  const enorme = ('Histórico detalhado da pele, rotina, alimentação e sono. ' + 'x'.repeat(40) + '\n').repeat(1300);
  r = chamar('b_salvarAnamneseProf', { token: lia, atendimentoId: cli.ref, titulo: 'Anamnese completa', texto: enorme });
  const an2 = r.ok && r.dados.anotacoes.find((x) => x.titulo === 'Anamnese completa');
  ok(an2 && an2.longo && an2.texto.length === 1500 && an2.tamanho === enorme.length, 'texto enorme (' + enorme.length + ' caracteres) vai para o Drive; a lista traz o começo', an2 && [an2.longo, an2.texto.length, an2.tamanho]);
  r = chamar('b_anamneseProf', { token: lia, id: an2.id });
  ok(r.ok && r.dados.texto === enorme, 'abrir mostra o texto inteiro, sem cortar', r.ok && r.dados.texto.length);
  const arqLongo = Object.keys(ctx.DriveApp.arquivos).length;
  r = chamar('b_salvarAnamneseProf', { token: lia, atendimentoId: cli.ref, id: an2.id, titulo: 'Anamnese completa', texto: 'Resumo curto.' });
  ok(r.ok && r.dados.anotacoes.find((x) => x.id === an2.id).texto === 'Resumo curto.' && Object.keys(ctx.DriveApp.arquivos).length === arqLongo - 1, 'editar para texto curto volta para a planilha e apaga o arquivo', r);
  r = chamar('b_anamnesesProf', { token: rosa, atendimentoId: cli.ref });
  ok(!r.ok, 'outra profissional não abre a anamnese');
  r = chamar('b_foto', { token: rosa, id: an1.fotos[0] });
  ok(!r.ok, 'outra profissional não vê a foto da anamnese');
  r = chamar('b_foto', { token: lia, id: an1.fotos[0] });
  ok(r.ok && /^data:image/.test(r.dados), 'a foto volta para quem atende');
  r = chamar('b_anamnesesProf', { token: lia, cpf: '11144477735' });
  ok(!r.ok && /agenda/.test(r.erro), 'profissional não abre pelo CPF');
  r = chamar('b_anamnesesProf', { token: rec, cpf: ctx.normCpf(ctx.lerAba('Atendimentos').find((a) => a.id === cli.ref).cpf) });
  ok(r.ok && r.dados.anotacoes.length === 2 && !r.dados.anotacoes[0].podeEditar, 'recepção lê, mas não edita o que a Lia escreveu', r.dados && r.dados.anotacoes.map((x) => x.podeEditar));
  r = chamar('b_salvarAnamneseProf', { token: rec, cpf: ctx.normCpf(ctx.lerAba('Atendimentos').find((a) => a.id === cli.ref).cpf), id: an1.id, texto: 'mudando' });
  ok(!r.ok && /Só quem escreveu/.test(r.erro), 'só quem escreveu edita', r);
  r = chamar('b_salvarAnamneseProf', { token: lia, atendimentoId: cli.ref, id: an1.id, texto: textoMedio, remover: [an1.fotos[0]] });
  ok(r.ok && r.dados.anotacoes.find((x) => x.id === an1.id).fotos.length === 0, 'tirar uma foto da anamnese', r);
  r = chamar('b_comandasCliente', { token: lia, atendimentoId: cli.ref });
  ok(r.ok && Array.isArray(r.dados.abertas) && [...r.dados.abertas, ...r.dados.fechadas].every((c) => !c.cpf && !c.whatsapp) && r.dados.abertas.length + r.dados.fechadas.length > 0,
    'Lia vê as comandas da cliente, sem CPF nem WhatsApp', r.dados);
  r = chamar('b_comandasCliente', { token: rosa, atendimentoId: cli.ref });
  ok(!r.ok, 'outra profissional não vê a comanda');
  r = chamar('b_aluno', { token: rec, cpf: ctx.normCpf(ctx.lerAba('Atendimentos').find((a) => a.id === cli.ref).cpf) });
  ok(r.ok && r.dados.historico.some((h) => h.tipo === 'anamnese'), 'anamnese aparece no histórico da cliente');
  r = chamar('b_excluirAnamneseProf', { token: rosa, id: an2.id });
  ok(!r.ok, 'outra pessoa não apaga');
  r = chamar('b_excluirAnamneseProf', { token: adm, id: an2.id });
  ok(r.ok, 'administração apaga');
}

console.log('— velocidade: cache da sessão e do catálogo sem dados velhos');
{
  // a sessão da equipe fica no cache: desativar ou mudar o papel vale na hora
  chamar('b_salvarMembro', { token: adm, membro: { email: 'cache@gmail.com', nome: 'Teste Cache', papel: 'recepcao' } });
  chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'cacheteste12' });
  const tc = chamar('b_entrar', { email: 'cache@gmail.com', senha: 'cacheteste12' }).dados.token;
  ok(chamar('b_alunos', { token: tc }).ok && chamar('b_alunos', { token: tc }).ok, 'recepção usa a bancada (2ª vez vem do cache)');
  chamar('b_salvarMembro', { token: adm, membro: { email: 'cache@gmail.com', nome: 'Teste Cache', papel: 'professora', professorNome: 'Teste Cache' } });
  r = chamar('b_alunos', { token: tc });
  ok(!r.ok && /não permite/.test(r.erro), 'mudou para profissional: perde o acesso de recepção na hora', r);
  chamar('b_salvarMembro', { token: adm, membro: { email: 'cache@gmail.com', nome: 'Teste Cache', papel: 'recepcao', ativo: false } });
  r = chamar('b_resumo', { token: tc });
  ok(!r.ok && r.codigo === 'SESSAO_EQUIPE', 'desativada: sai na hora', r);
  // catálogo no cache: o que a bancada salva aparece na hora, e os horários voltam iguais do cache
  const aulas1 = JSON.stringify(chamar('b_grade', { token: adm }).dados);
  const aulas2 = JSON.stringify(chamar('b_grade', { token: adm }).dados);
  ok(aulas1 === aulas2 && /"hora":"\d{2}:\d{2}"/.test(aulas2), 'grade igual vinda do cache (horários continuam 06:30…)');
  const g = chamar('b_grade', { token: adm }).dados;
  r = chamar('b_salvarGrade', { token: adm, linhas: g.map((x, i) => (i === 0 ? { ...x, professor: 'Professora Nova' } : x)) });
  ok(r.ok && chamar('b_grade', { token: adm }).dados[0].professor === 'Professora Nova', 'grade salva aparece na hora (cache limpo)');
  chamar('b_salvarGrade', { token: adm, linhas: g });
  const cat = chamar('b_catalogoServicos', { token: adm }).dados;
  const sv = cat.servicos[0];
  chamar('b_salvarServico', { token: adm, servico: { ...sv, preco: sv.preco + 1 } });
  ok(chamar('b_catalogoServicos', { token: adm }).dados.servicos.find((x) => x.id === sv.id).preco === sv.preco + 1, 'preço de serviço salvo aparece na hora');
  chamar('b_salvarServico', { token: adm, servico: sv });
}

console.log('— resumo do dia');
r = chamar('b_resumo', { token: rec });
ok(r.ok && 'comandasAbertas' in r.dados && 'estoqueBaixo' in r.dados && r.dados.caixa === 'fechado', 'Hoje mostra comandas, estoque e caixa', r.dados && [r.dados.comandasAbertas, r.dados.estoqueBaixo, r.dados.caixa]);
r = chamar('b_resumo', { token: lia });
ok(r.ok && r.dados.meusGanhosMes > 0 && r.dados.vendasHoje === undefined, 'profissional vê ganhos, não o caixa', r.dados && [r.dados.meusGanhosMes, r.dados.vendasHoje]);

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO CERTO');
if (falhas) process.exitCode = 1;
