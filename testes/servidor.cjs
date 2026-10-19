// Cópia local: backend simulado em http://localhost:8787 com dados de exemplo.
// Rode: node testes/servidor.cjs   e, em outro terminal: VITE_API_URL=http://localhost:8787 npm run dev
// Servidor local: o site conversa com o backend simulado (mesmo código do Apps Script)
const http = require('http');
const { criar } = require('./simulador.cjs');
const R = require('path').join(__dirname, '..', 'apps-script');
const m = criar([R+'/Codigo.gs', R+'/Seguranca.gs', R+'/Vales.gs', R+'/Bancada.gs', R+'/Relatorios.gs', R+'/Servicos.gs', R+'/Gestao.gs', R+'/Clientes.gs', R+'/Marketing.gs']);
const { ctx, chamar, emails } = m;
ctx.configurarPlanilha();
// dados de exemplo
const linkDe = e => (e.body.match(/t=([a-f0-9]+)/) || [])[1];
ctx.autorizarEmails(); chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'ambar2026adm' });
const adm = chamar('b_entrar', { email: 'contato@acasaambar.com.br', senha: 'ambar2026adm' }).dados.token;
chamar('b_salvarMembro', { token: adm, membro: { email: 'ana@gmail.com', nome: 'Ana Paula', papel: 'professora', professorNome: 'Ana Paula' } });
chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'anapaula26' });
chamar('b_salvarMembro', { token: adm, membro: { email: 'bia@acasaambar.com.br', nome: 'Bia Santos', papel: 'recepcao' } });
chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'recep2026ok' });
const nomes = [['52998224725','Mariana Costa'],['11144477735','Joana Lima'],['39053344705','Carla Dias'],['86288366757','Beatriz Rocha'],['71428793860','Luana Freitas'],['15350946056','Paula Mendes'],['93541134780','Renata Alves']];
const toks = {};
nomes.forEach(([cpf, nome], i) => {
  const r = chamar('cadastrar', { cpf, nome, whatsapp: '8599' + String(1000000 + i * 1111).slice(0, 7), email: nome.split(' ')[0].toLowerCase() + '@gmail.com', senha: 'aluna2026' });
  toks[cpf] = r.dados.token;
  chamar('salvarAnamnese', { token: r.dados.token, ficha: { emergencia_nome: 'Mãe', emergencia_telefone: '85999998888', parq_1: 'nao', parq_2: 'nao', parq_3: 'nao', parq_4: 'nao', parq_5: i === 1 ? 'sim' : 'nao', parq_6: 'nao', parq_7: 'nao', declaracao: true, consentimento: true, lesoes: i === 1 ? 'Dor no joelho direito' : '', data_nascimento: '1990-10-' + (10 + i) } });
});
const planos = ['yoga-mensal-2x','pilates-mensal-2x','yoga-avulsa','yoga-mensal-1x','pilates-avulsa','yoga-trimestral-2x','pilates-mensal-3x'];
nomes.forEach(([cpf], i) => chamar('b_vender', { token: adm, cpf, planoId: planos[i], metodo: ['Pix','Cartão de crédito','Dinheiro','Pix','Pix','Cartão de crédito','Pix'][i], parcelas: i === 5 ? 3 : 1 }));
const aulas = ctx.gerarAulas(undefined, 3);
let k = 0;
aulas.forEach((a) => {
  nomes.forEach(([cpf], i) => {
    if ((k++ + i) % 3) return;
    const r = chamar('b_agendar', { token: adm, cpf, aulaId: a.id, tapete: a.modalidade === 'Yoga' ? (i % 12) + 1 : undefined, forma: 'credito' });
    if (!r.ok) chamar('b_agendar', { token: adm, cpf, aulaId: a.id, tapete: a.modalidade === 'Yoga' ? (i % 12) + 1 : undefined, forma: 'cortesia' });
  });
});
chamar('b_salvarCupom', { token: adm, cupom: { codigo: 'BEMVINDA10', tipo: 'percentual', valor: 10, limitePorAluno: 1, descricao: 'Primeira compra' } });
chamar('b_criarVales', { token: adm, tipo: 'plano', planoId: 'pilates-avulsa', pessoas: [{ cpf: '52998224725' }], motivo: 'Aniversário', mensagem: 'Feliz aniversário, Mari!' });
chamar('b_criarVales', { token: adm, tipo: 'valor', valor: 50, quantidade: 5, motivo: 'Campanha', campanha: 'Outubro Rosa' });
// PENDENTES de teste: um recente e um de 2 dias atrás
chamar('comprar', { token: toks['93541134780'], planoId: 'yoga-mensal-2x' });
chamar('comprar', { token: toks['93541134780'], planoId: 'yoga-avulsa' });
const pgs = m.ss.getSheetByName('Pagamentos').rows; pgs[pgs.length - 1][8] = '2026-10-16 10:00:00';
// SERVICOS_TESTE
['Lia Moura', 'Rafaela Costa', 'Dra. Paula Fisio'].forEach((nome, i) => chamar('b_salvarProfissional', { token: adm, profissional: { nome, categorias: i === 2 ? ['Fisioterapia'] : ['Estética facial', 'Estética corporal', 'Estética capilar'], dias: [1, 2, 3, 4, 5, 6], comissao: i === 2 ? 50 : 40, comissaoProduto: 10 } }));
const hojeS = ctx.hojeTexto();
const amanha = ctx.somarDias(hojeS, 1);
[[hojeS, '08:00', 'limpeza-pele', 'Lia Moura'], [hojeS, '10:00', 'drenagem', 'Lia Moura'], [hojeS, '14:00', 'microagulhamento-facial', 'Lia Moura'], [hojeS, '09:00', 'ritual-acalmar', 'Rafaela Costa'],
 [hojeS, '16:30', 'ledterapia-capilar', 'Rafaela Costa'], [hojeS, '11:00', 'fisioterapia', 'Dra. Paula Fisio'], [hojeS, '17:00', 'fisioterapia', 'Dra. Paula Fisio'],
 [amanha, '08:30', 'peeling-coreano', 'Lia Moura'], [amanha, '10:00', 'detox', 'Rafaela Costa'], [amanha, '15:00', 'fisioterapia', 'Dra. Paula Fisio']].forEach(([data, hora, servicoId, profissional], i) => {
  const r = chamar('b_agendarServico', { token: adm, servicoId, profissional, data, hora, cpf: nomes[i % nomes.length][0], pagamento: i % 3 ? 'no_dia' : 'cortesia' });
  if (!r.ok) console.log('serviço', r.erro);
});
// GESTAO_TESTE
['Lia Moura', 'Rafaela Costa', 'Dra. Paula Fisio'].forEach((nome, i) => chamar('b_salvarProfissional', { token: adm, profissional: { nome, categorias: i === 2 ? ['Fisioterapia'] : ['Estética facial', 'Estética corporal', 'Estética capilar'], dias: [1, 2, 3, 4, 5, 6], comissao: i === 2 ? 50 : 40, comissaoProduto: 10 } }));
chamar('b_salvarMembro', { token: adm, membro: { email: 'lia@gmail.com', nome: 'Lia Moura', papel: 'professora', professorNome: 'Lia Moura' } });
chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'liamoura2026' });
[['Protetor solar FPS 50', 'Revenda (home care)', 'La Roche', true, 129, 64, 2, 6], ['Sérum vitamina C', 'Revenda (home care)', 'Adcos', true, 189, 95, 2, 1],
 ['Máscara de argila verde', 'Insumo de cabine', '', false, 0, 0.4, 150, 900], ['Luvas descartáveis', 'Descartáveis', '', false, 0, 0.5, 40, 22], ['Óleo de massagem', 'Insumo de cabine', 'Granado', false, 0, 0.08, 300, 1200]]
  .forEach(([nome, categoria, marca, vende, preco, custo, minimo, est]) => chamar('b_salvarProduto', { token: adm, produto: { nome, categoria, marca, vende, preco, custo, minimo, estoqueInicial: est, unidade: vende ? 'un' : categoria === 'Descartáveis' ? 'par' : 'g' } }));
const prods = chamar('b_produtos', { token: adm }).dados.produtos;
const cat0 = chamar('b_catalogoServicos', { token: adm }).dados;
const lp = cat0.servicos.find((x) => x.id === 'limpeza-pele');
chamar('b_salvarServico', { token: adm, servico: { ...lp, consumo: [{ produtoId: prods.find((p) => p.nome.startsWith('Máscara')).id, qtd: 30 }, { produtoId: prods.find((p) => p.nome.startsWith('Luvas')).id, qtd: 1 }] } });
chamar('b_salvarPromocao', { token: adm, promocao: { nome: 'Terça da pele', descricao: 'Estética facial com 15% às terças', tipo: 'percentual', valor: 15, grupos: ['Estética facial'], dias: [2], onde: 'bancada' } });
chamar('b_salvarPromocao', { token: adm, promocao: { nome: 'Novembro leve', tipo: 'preco_fixo', valor: 169, itens: ['drenagem'], de: hojeS.slice(0, 4) + '-11-01', ate: hojeS.slice(0, 4) + '-11-30', onde: 'ambos' } });
chamar('b_salvarPromocao', { token: adm, promocao: { nome: 'Aula experimental', tipo: 'valor', valor: 13, itens: ['yoga-avulsa'], onde: 'site' } });
chamar('b_salvarFolga', { token: adm, profissional: 'Rafaela Costa', data: hojeS, inicio: '12:00', fim: '13:30', motivo: 'Almoço', repetirSemanas: 3 });
chamar('b_salvarFolga', { token: adm, profissional: 'Lia Moura', data: hojeS, inicio: '17:00', fim: '19:00', motivo: 'Curso de peeling' });
chamar('b_abrirCaixa', { token: adm, valor: 150 });
const atHoje = chamar('b_atendimentos', { token: adm, de: hojeS, dias: 1 }).dados.atendimentos.filter((a) => a.pagamento === 'no_dia');
const c1 = chamar('b_comandaDoAtendimento', { token: adm, atendimentoId: atHoje[0].id }).dados;
chamar('b_salvarComanda', { token: adm, comanda: { id: c1.id, itens: [...c1.itens, { tipo: 'produto', id: prods[0].id, qtd: 1, profissional: c1.itens[0].profissional }] } });
const c2 = chamar('b_comandaDoAtendimento', { token: adm, atendimentoId: atHoje[1].id }).dados;
const fe = chamar('b_fecharComanda', { token: adm, id: c2.id, pagamentos: [{ metodo: 'Pix', valor: 100 }, { metodo: 'Dinheiro', valor: Math.round((c2.total - 100) * 100) / 100 }] });
if (!fe.ok) console.log('comanda', fe.erro);
chamar('b_salvarComanda', { token: adm, comanda: { cliente: { nome: 'Fernanda Lopes', whatsapp: '85997771111' }, itens: [{ tipo: 'produto', id: prods[1].id, qtd: 1 }] } });
chamar('b_movimentoCaixa', { token: adm, tipo: 'despesa', valor: 32.5, motivo: 'Café, água e flores da recepção', categoria: 'Outros' });
const mesAnt = ctx.somarDias(hojeS.slice(0, 8) + '01', -1).slice(0, 7);
[['Aluguel', 'Aluguel e condomínio', 4800, '05', true], ['Energia', 'Água, luz e internet', 690, '12', true], ['Internet', 'Água, luz e internet', 149.9, '15', true], ['Sistema de pagamentos', 'Sistemas e assinaturas', 89, '20', true]]
  .forEach(([d, c, v, dia, rec]) => chamar('b_salvarDespesa', { token: adm, despesa: { data: mesAnt + '-' + dia, descricao: d, categoria: c, valor: v, status: 'pago', recorrente: rec, forma: 'Pix' } }));
chamar('b_despesas', { token: adm });
const dsp = chamar('b_despesas', { token: adm }).dados.lista;
dsp.filter((x) => x.data < hojeS && x.descricao !== 'Sistema de pagamentos').forEach((x) => chamar('b_pagarDespesa', { token: adm, id: x.id, data: x.data }));
chamar('b_salvarDespesa', { token: adm, despesa: { data: hojeS, descricao: 'Ativos Cosmobeauty', categoria: 'Produtos e insumos', valor: 1240, status: 'a_pagar', fornecedor: 'Cosmobeauty', forma: 'Boleto' } });
chamar('b_importarClientes', { token: adm, linhas: [{ nome: 'Fernanda Lopes', whatsapp: '85997771111', email: 'fe@gmail.com', nascimento: '12/' + hojeS.slice(5, 7) + '/1988' }, { nome: 'Gabriela Rocha', whatsapp: '85997772222', nascimento: '28/' + hojeS.slice(5, 7) + '/1992' }, { nome: 'Helena Prado', whatsapp: '85997773333', email: 'helena@gmail.com' }] });
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8+v/PfwAJbAPuFoL8XwAAAABJRU5ErkJggg==';
chamar('b_salvarFichaEstetica', { token: adm, atendimentoId: atHoje[0].id, ficha: { queixa: 'Manchas e poros dilatados', objetivo: 'Uniformizar o tom', tipoPele: 'Mista', fototipo: 'III', alergias: 'Ácido salicílico', condicoes: ['Hipertensão'], consentimentoFotos: true } });
chamar('b_salvarEvolucao', { token: adm, atendimentoId: atHoje[0].id, anotacao: 'Primeira sessão. Pele respondeu bem ao vapor de ozônio; leve vermelhidão na testa.\nOrientado protetor solar a cada 3h.', fotos: [png, png] });
console.log('pronto: admin contato@acasaambar.com.br / ambar2026adm · recepção bia@acasaambar.com.br / recep2026ok · prof ana@gmail.com / anapaula26');
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.end(); return; }
  let corpo = '';
  req.on('data', (c) => (corpo += c));
  req.on('end', () => {
    let out;
    try { out = ctx.doPost({ postData: { contents: corpo } }); } catch (e) { out = JSON.stringify({ ok: false, erro: String(e) }); }
    res.setHeader('Content-Type', 'application/json');
    res.end(out);
  });
}).listen(8787);
