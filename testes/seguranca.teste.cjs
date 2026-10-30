// Testes de segurança: cada ação só funciona para quem pode, e os dados não vazam.
const { criar } = require('./simulador.cjs');
const END_TESTE = { cep: '60150-160', endereco: 'Rua Eduardo Salgado', numero: '448', bairro: 'Aldeota', cidade: 'Fortaleza', uf: 'CE' };
const R = require('path').join(__dirname, '..', 'apps-script');
const m = criar([R + '/Codigo.gs', R + '/Seguranca.gs', R + '/Vales.gs', R + '/Bancada.gs', R + '/Relatorios.gs', R + '/Servicos.gs', R + '/Gestao.gs', R + '/Clientes.gs', R + '/Marketing.gs', R + '/Substituicoes.gs', R + '/Espera.gs', R + '/Contrato.gs']);
const { ctx, chamar, emails } = m;
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); } else console.log('  ✓', msg); };
const linkDe = (e) => (e.body.match(/t=([a-f0-9]+)/) || [])[1];
const hoje = ctx.hojeTexto();
const proxDiaUtil = (base, n) => { let d = ctx.somarDias(base, n); while (new Date(d + 'T12:00:00Z').getUTCDay() % 6 === 0) d = ctx.somarDias(d, 1); return d; };
const FICHA = { emergencia_nome: 'Mãe', emergencia_telefone: '85999998888', parq_1: 'nao', parq_2: 'nao', parq_3: 'nao', parq_4: 'nao', parq_5: 'nao', parq_6: 'nao', parq_7: 'nao', declaracao: true, consentimento: true, data_nascimento: '1990-05-12' };
const pagar = (orderNsu, transacao, valorCentavos) => { global.__valor = valorCentavos; return chamar(undefined, { order_nsu: orderNsu, transaction_nsu: transacao, invoice_slug: 'slug-' + transacao }); };

ctx.configurarPlanilha();
ctx.autorizarEmails(); chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'ambar2026adm' });
const adm = chamar('b_entrar', { email: 'contato@acasaambar.com.br', senha: 'ambar2026adm' }).dados.token;
chamar('b_salvarMembro', { token: adm, membro: { email: 'bia@acasaambar.com.br', nome: 'Bia Santos', papel: 'recepcao' } });
chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'recep2026ok' });
const rec = chamar('b_entrar', { email: 'bia@acasaambar.com.br', senha: 'recep2026ok' }).dados.token;
chamar('b_salvarMembro', { token: adm, membro: { email: 'lia@gmail.com', nome: 'Lia Esteticista', papel: 'professora', professorNome: 'Lia Esteticista' } });
chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'liaestetica1' });
const lia = chamar('b_entrar', { email: 'lia@gmail.com', senha: 'liaestetica1' }).dados.token;
chamar('b_salvarMembro', { token: adm, membro: { email: 'ana@gmail.com', nome: 'Ana Paula', papel: 'professora', professorNome: 'Ana Paula' } });
chamar('novaSenha', { t: linkDe(emails.at(-1)), senha: 'anapaula26' });
const ana = chamar('b_entrar', { email: 'ana@gmail.com', senha: 'anapaula26' }).dados.token;
chamar('cadastrar', { endereco: END_TESTE, cpf: '529.982.247-25', nome: 'Maria Souza', whatsapp: '85999990000', email: 'maria@gmail.com', senha: 'abc12345' });
const maria = chamar('entrar', { cpf: '52998224725', senha: 'abc12345' }).dados.token;
chamar('salvarAnamnese', { token: maria, ficha: FICHA });
let r;

console.log('— só as ações públicas e as da bancada (com permissão) podem ser chamadas');
{
  const internas = ['constructor', 'toString', 'valueOf', '__proto__', 'hasOwnProperty', 'concluirPagamento', 'processarPagamento', 'criarPagamento',
    'configurarPlanilha', 'autorizarEmails', 'criarSessao', 'gravarSenha', 'executarBancada', 'bancada_alunos', 'lerAba', 'doGet'];
  const recusadas = internas.filter((a) => { const x = chamar(a, { token: adm }); return !(x.ok === false && x.erro === 'Ação desconhecida.'); });
  ok(recusadas.length === 0, 'funções internas não podem ser chamadas pelo site (' + internas.length + ' testadas)', recusadas);
  const bInternas = ['b_constructor', 'b_toString', 'b___proto__', 'b_hasOwnProperty', 'b_', 'b_eval', 'b_Function'];
  const recB = bInternas.filter((a) => { const x = chamar(a, { token: adm }); return !(x.ok === false && x.erro === 'Ação desconhecida.'); });
  ok(recB.length === 0, 'nomes "b_" falsos são recusados mesmo para a administração', recB);
  const P = ctx.PERMISSOES;
  const funcoes = Object.keys(ctx).filter((k) => k.startsWith('bancada_') && typeof ctx[k] === 'function').map((k) => k.replace(/^bancada_/, 'b_'));
  const semPermissao = funcoes.filter((k) => !Object.prototype.hasOwnProperty.call(P, k));
  ok(semPermissao.length === 0, 'toda função da bancada tem a lista de quem pode (' + funcoes.length + ' funções)', semPermissao);
  const semFuncao = Object.keys(P).filter((k) => typeof ctx[k.replace(/^b_/, 'bancada_')] !== 'function');
  ok(semFuncao.length === 0, 'toda permissão aponta para uma função que existe', semFuncao);
  const papeisInvalidos = Object.keys(P).filter((k) => !Array.isArray(P[k]) || P[k].some((p) => ['admin', 'recepcao', 'professora'].indexOf(p) < 0));
  ok(papeisInvalidos.length === 0, 'permissões só com os papéis conhecidos', papeisInvalidos);

  // ação da bancada sem sessão de equipe (sem token, com token da aluna, com token inventado)
  const tokensRuins = [undefined, '', maria, 'E' + 'a'.repeat(63), 'E' + '0'.repeat(10)];
  const vazou = [];
  Object.keys(P).forEach((acao) => tokensRuins.forEach((t) => { const x = chamar(acao, { token: t }); if (x.ok || x.codigo !== 'SESSAO_EQUIPE') vazou.push([acao, String(t).slice(0, 6), x.erro]); }));
  ok(vazou.length === 0, 'nenhuma ação da bancada funciona sem sessão da equipe (' + Object.keys(P).length * tokensRuins.length + ' tentativas)', vazou.slice(0, 5));

  // papel errado: recusado antes de abrir qualquer dado
  const soEquipe = Object.keys(P).filter((k) => P[k].indexOf('professora') < 0);
  const profPassou = soEquipe.filter((acao) => { const x = chamar(acao, { token: ana }); return x.ok || !/não permite/.test(x.erro); });
  ok(profPassou.length === 0, 'profissional não usa nenhuma das ' + soEquipe.length + ' ações da recepção/administração', profPassou);
  const soAdm = Object.keys(P).filter((k) => P[k].indexOf('recepcao') < 0 && P[k].indexOf('admin') >= 0);
  const recPassou = soAdm.filter((acao) => { const x = chamar(acao, { token: rec }); return x.ok || !/não permite/.test(x.erro); });
  ok(recPassou.length === 0, 'recepção não usa nenhuma das ' + soAdm.length + ' ações só da administração', recPassou);

  // área do aluno com token da equipe ou inventado
  const doAluno = ['aulas', 'aula', 'reservar', 'cancelar', 'checkin', 'minhasReservas', 'salvarAnamnese', 'minhaFicha', 'meuPlano', 'comprar', 'confirmarPagamento',
    'ativarWellhub', 'descartarPagamento', 'salvarEmail', 'salvarEndereco', 'validarCodigo', 'resgatarVale', 'minhaConta', 'salvarConta', 'trocarEmail', 'trocarSenha'];
  const alunoVazou = [];
  doAluno.forEach((acao) => [adm, undefined, 'A' + 'b'.repeat(40)].forEach((t) => { const x = chamar(acao, { token: t }); if (x.ok) alunoVazou.push([acao, String(t).slice(0, 4)]); }));
  ok(alunoVazou.length === 0, 'nenhuma ação da área do aluno funciona sem a sessão da própria aluna', alunoVazou);
}

console.log('— login: não revela quem tem cadastro');
{
  const a = chamar('entrar', { cpf: '390.533.447-05', senha: 'qualquer12' }).erro;
  const b = chamar('entrar', { cpf: '529.982.247-25', senha: 'errada123' }).erro;
  ok(a === b, 'CPF sem cadastro e senha errada dão a mesma mensagem', [a, b]);
  const c = chamar('b_entrar', { email: 'ninguem@gmail.com', senha: 'qualquer12' }).erro;
  const d = chamar('b_entrar', { email: 'bia@acasaambar.com.br', senha: 'errada123' }).erro;
  ok(c === d, 'equipe: e-mail desconhecido e senha errada dão a mesma mensagem', [c, d]);
}

console.log('— texto que vira fórmula na planilha é neutralizado');
{
  r = chamar('cadastrar', { endereco: { ...END_TESTE, complemento: '@SOMA(1;1)' }, cpf: '111.444.777-35', nome: '=HYPERLINK("http://x";"Clique") Lima', whatsapp: '85988887777', email: 'joana@gmail.com', senha: 'joana12345' });
  ok(r.ok, 'cadastro com nome estranho aceito', r);
  const al = ctx.lerAba('Alunos').find((a) => ctx.normCpf(a.cpf) === '11144477735');
  const linha = m.ss.getSheetByName('Alunos').rows[al._linha - 1];
  ok(linha.every((v) => typeof v !== 'string' || !/^[=+\-@]/.test(v)), 'nenhuma célula do cadastro começa com =, +, - ou @', linha);
  // a planilha devolve o texto sem o apóstrofo: ao completar um plano lançado à mão, o nome não pode virar fórmula
  m.ss.getSheetByName('Alunos').rows[al._linha - 1][1] = '=HYPERLINK("http://x";"Clique")';
  const cab = m.ss.getSheetByName('Creditos').rows[0];
  const nova = cab.map((c) => ({ cpf: '11144477735', plano_id: 'yoga-mensal-1x', inicio: hoje }[c] || ''));
  m.ss.getSheetByName('Creditos').appendRow(nova);
  ctx.novaExecucao(); ctx.valoresCreditos();
  const cr = m.ss.getSheetByName('Creditos').rows.at(-1);
  ok(cr[cab.indexOf('id')] && String(cr[cab.indexOf('nome')]).startsWith("'"), 'plano lançado à mão: nome vindo da planilha é gravado como texto', cr);
  ok(ctx.seguro({ a: '=1' }) === '{"a":"=1"}' && ctx.seguro('-5 reais') === "'-5 reais" && ctx.seguro(5) === 5, 'seguro() trata listas, texto e números');
}

console.log('— reserva aguardando pagamento não faz check-in');
{
  const aula = ctx.gerarAulas().filter((a) => a.modalidade === 'Pilates').find((a) => ctx.inicio(a) > new Date(Date.now() + 2 * 3600e3));
  r = chamar('reservar', { token: maria, aulaId: aula.id, pagarAvulsa: true });
  ok(r.ok && r.dados.pagamento && r.dados.pagamento.order_nsu, 'aula avulsa aguardando pagamento', r);
  const res = ctx.lerAba('Reservas').find((x) => x.aula_id === aula.id && x.status === 'pendente');
  r = chamar('checkin', { token: maria, reservaId: res.id });
  ok(!r.ok && /não foi confirmada/.test(r.erro), 'check-in recusado enquanto não paga', r);
  r = chamar('minhasReservas', { token: maria });
  ok(r.ok && !r.dados.some((x) => x.id === res.id), 'reserva pendente não aparece como confirmada');
  chamar('descartarPagamento', { token: maria, orderNsu: ctx.lerAba('Pagamentos').find((p) => p.reserva_id === res.id).order_nsu });
}

console.log('— vale-presente e cupom não são usados em dois pagamentos ao mesmo tempo');
{
  const cmv = chamar('b_salvarComanda', { token: rec, comanda: { cliente: { nome: 'Compra no balcão', whatsapp: '85987654321' }, itens: [{ tipo: 'vale', vale: { tipo: 'valor', valor: 100 } }] } });
  r = chamar('b_fecharComanda', { token: rec, id: cmv.dados.id, pagamentos: [{ metodo: 'Pix', valor: 100 }] });
  const vale = r.dados.valesCriados[0].codigo;
  const p1 = chamar('comprar', { token: maria, planoId: 'yoga-mensal-2x', codigo: vale });
  ok(p1.ok && p1.dados.valor === 250, '1º link com o vale (R$ 350 − R$ 100)', p1);
  r = chamar('comprar', { token: maria, planoId: 'pilates-mensal-2x', codigo: vale });
  ok(!r.ok && /saldo/.test(r.erro), '2º link com o mesmo vale recusado enquanto o 1º está em aberto', r);
  r = chamar('validarCodigo', { token: maria, codigo: vale, planoId: 'yoga-mensal-1x' });
  ok(!r.ok && /saldo/.test(r.erro), 'conferir o vale também mostra que ele está em uso', r);
  chamar('descartarPagamento', { token: maria, orderNsu: p1.dados.order_nsu });
  const p2 = chamar('comprar', { token: maria, planoId: 'yoga-mensal-2x', codigo: vale });
  ok(p2.ok && p2.dados.valor === 250, 'removido o 1º link, o vale volta a valer', p2);
  pagar(p2.dados.order_nsu, 'tx-vale', 25000);
  ok(ctx.linhaPagamento(p2.dados.order_nsu).status === 'pago', 'pago com o vale');

  chamar('b_salvarCupom', { token: adm, cupom: { codigo: 'UMAVEZ', tipo: 'percentual', valor: 10, limitePorAluno: 1 } });
  const c1 = chamar('comprar', { token: maria, planoId: 'yoga-mensal-1x', codigo: 'UMAVEZ' });
  ok(c1.ok && c1.dados.valor === 180, 'cupom de uso único num link', c1);
  r = chamar('comprar', { token: maria, planoId: 'yoga-mensal-1x', codigo: 'UMAVEZ' });
  ok(!r.ok && /já usou/.test(r.erro), 'mesmo cupom num 2º link é recusado', r);
  chamar('descartarPagamento', { token: maria, orderNsu: c1.dados.order_nsu });
  r = chamar('validarCodigo', { token: maria, codigo: 'UMAVEZ', planoId: 'yoga-mensal-1x' });
  ok(r.ok, 'removido o link, o cupom volta a valer', r);
}

console.log('— aviso de pagamento da InfinitePay');
{
  r = chamar(undefined, { order_nsu: 'X1', transaction_nsu: 't', invoice_slug: 's' });
  ok(!r.ok && r.erro === 'Pedido inválido.', 'código de pedido fora do padrão recusado', r);
  r = chamar(undefined, { order_nsu: 'P20261020120000123' });
  ok(!r.ok && r.erro === 'Pedido inválido.', 'aviso sem a transação recusado', r);
  r = chamar(undefined, { order_nsu: 'P20261020120000999', transaction_nsu: 't', invoice_slug: 's' });
  ok(!r.ok && r.erro === 'Não processado.' && !/P2026/.test(r.erro), 'pedido inexistente não revela nada', r);
  const a = chamar('comprar', { token: maria, planoId: 'yoga-mensal-1x' }).dados;
  pagar(a.order_nsu, 'tx-pouco', 100);
  ok(ctx.linhaPagamento(a.order_nsu).status === 'pendente', 'valor pago menor que o do plano não libera');
  pagar(a.order_nsu, 'falso-1', 20000);
  ok(ctx.linhaPagamento(a.order_nsu).status === 'pendente', 'transação não aprovada não libera');
  pagar(a.order_nsu, 'tx-A', 20000);
  ok(ctx.linhaPagamento(a.order_nsu).status === 'pago', 'pagamento certo libera');
  const b = chamar('comprar', { token: maria, planoId: 'yoga-mensal-3x' }).dados;
  pagar(b.order_nsu, 'tx-A', 48000);
  ok(ctx.linhaPagamento(b.order_nsu).status === 'pendente', 'a mesma transação não paga um segundo pedido');
  r = chamar('confirmarPagamento', { token: maria, orderNsu: b.order_nsu, transactionNsu: 'tx-A', slug: 's' });
  ok(r.ok && r.dados.status === 'pendente', 'nem pelo retorno do site');
  pagar(b.order_nsu, 'tx-B', 48000);
  ok(ctx.linhaPagamento(b.order_nsu).status === 'pago', 'com a transação dele, paga');
  r = chamar('confirmarPagamento', { token: chamar('entrar', { cpf: '11144477735', senha: 'joana12345' }).dados.token, orderNsu: b.order_nsu });
  ok(!r.ok && /não encontrado/.test(r.erro), 'outra aluna não vê o pagamento de ninguém', r);
}

console.log('— observação do pagamento: a aluna só vê o que é para ela');
{
  ok(ctx.observacaoParaAluna('ATENÇÃO: o vale AMBAR-XXXX não tinha mais saldo suficiente') === '', 'nota interna do vale não aparece');
  ok(ctx.observacaoParaAluna('Estornado por bia@acasaambar.com.br: cliente desistiu') === '', 'nota de estorno não aparece');
  ok(/vai devolver/.test(ctx.observacaoParaAluna('DEVOLVER R$ 12,50 de juros: pagou em 2x')), 'aviso de juros a devolver aparece');
}

console.log('— profissional: só o que é dela, sem CPF');
{
  r = chamar('b_vender', { token: rec, cpf: '52998224725', planoId: 'yoga-mensal-2x', metodo: 'Pix' });
  const aulaY = ctx.gerarAulas().filter((a) => a.modalidade === 'Yoga' && a.professor === 'Ana Paula').find((a) => ctx.inicio(a) > new Date());
  r = chamar('b_agendar', { token: rec, cpf: '52998224725', aulaId: aulaY.id, tapete: 3, forma: 'credito' });
  ok(r.ok, 'aluna na aula da Ana Paula', r);
  const ag = chamar('b_agenda', { token: ana, de: aulaY.data, dias: 1 }).dados.find((a) => a.id === aulaY.id);
  const resId = ag.reservas[0].id;
  r = chamar('b_ficha', { token: ana, reservaId: resId });
  ok(r.ok && r.dados.ficha && !('cpf' in r.dados.ficha) && !('pdf' in r.dados.ficha) && r.dados.ficha.emergencia_nome === 'Mãe', 'ficha de saúde sem CPF e sem o PDF', r.dados);
  r = chamar('b_ficha', { token: ana, cpf: '52998224725' });
  ok(!r.ok, 'profissional não abre ficha pelo CPF', r);
  r = chamar('b_ficha', { token: lia, reservaId: resId });
  ok(!r.ok && /não está nas suas aulas/.test(r.erro), 'outra profissional não abre a ficha', r);
  r = chamar('b_ficha', { token: rec, reservaId: resId });
  ok(r.ok && r.dados.ficha.cpf === '52998224725', 'recepção vê a ficha completa');

  chamar('b_salvarProfissional', { token: adm, profissional: { nome: 'Lia Esteticista', categorias: ['Estética facial', 'Estética corporal'], dias: [1, 2, 3, 4, 5, 6], inicio: '08:00', fim: '18:00', comissao: 40, comissaoProduto: 10 } });
  r = chamar('b_catalogoServicos', { token: lia });
  ok(r.ok && r.dados.servicos.length && r.dados.servicos.every((s) => s.comissao == null) && r.dados.profissionais.every((p) => p.comissao == null && p.comissaoProduto == null),
    'catálogo da profissional sem as comissões', r.dados && r.dados.profissionais);
  r = chamar('b_catalogoServicos', { token: adm });
  ok(r.ok && r.dados.profissionais.find((p) => p.nome === 'Lia Esteticista').comissao === 40, 'administração vê as comissões');

  const dia = proxDiaUtil(hoje, 2);
  r = chamar('b_agendarServico', { token: rec, servicoId: 'drenagem', profissional: 'Lia Esteticista', data: dia, hora: '10:00', cliente: { nome: 'Cliente Futuro', whatsapp: '85911112233' } });
  ok(r.ok, 'atendimento futuro da Lia', r);
  const at = r.dados.id || (r.dados.atendimento && r.dados.atendimento.id) || ctx.lerAba('Atendimentos').at(-1).id;
  r = chamar('b_atualizarAtendimento', { token: lia, id: at, status: 'atendido' });
  ok(!r.ok && /depois do horário/.test(r.erro), 'profissional não marca "atendido" antes da hora', r);
  r = chamar('b_atualizarAtendimento', { token: lia, id: at, status: 'cancelado' });
  ok(!r.ok && /atendido ou falta/.test(r.erro), 'profissional não cancela', r);
  chamar('b_atualizarAtendimento', { token: rec, id: at, status: 'cancelado' });
  r = chamar('b_atualizarAtendimento', { token: lia, id: at, status: 'agendado' });
  ok(!r.ok && /cancelado/.test(r.erro), 'profissional não reabre atendimento cancelado', r);
  r = chamar('b_atualizarAtendimento', { token: ana, id: at, status: 'falta' });
  ok(!r.ok && /não é seu/.test(r.erro), 'outra profissional não mexe no atendimento', r);
}

console.log('— descadastro de e-mails');
{
  const falsos = Array.from({ length: 6 }, (_, i) => (i + 'f').repeat(16).slice(0, 32));
  ok(falsos.every((t) => chamar('sairLista', { t }).erro === 'Link inválido.'), 'links falsos recusados');
  ok(chamar('sairLista', { t: '../../x' }).erro === 'Link inválido.', 'link com formato estranho recusado');
  r = chamar('sairLista', { t: ctx.tokenLista('52998224725') });
  ok(r.ok && r.dados.nome === 'Maria', 'link verdadeiro funciona depois das tentativas falsas', r);
  ok(ctx.lerAba('Alunos').find((a) => ctx.normCpf(a.cpf) === '52998224725').marketing === 'NÃO', 'saiu da lista');
}

console.log('— minha conta (área do aluno)');
{
  chamar('cadastrar', { endereco: END_TESTE, cpf: '390.533.447-05', nome: 'Carla Dias', whatsapp: '85977776666', email: 'carla@gmail.com', senha: 'carla12345' });
  const tc = chamar('entrar', { cpf: '39053344705', senha: 'carla12345' }).dados.token;
  const tc2 = chamar('entrar', { cpf: '39053344705', senha: 'carla12345' }).dados.token;
  r = chamar('minhaConta', { token: tc });
  ok(r.ok && r.dados.nome === 'Carla Dias' && r.dados.cpf === '39053344705' && r.dados.email === 'carla@gmail.com' && r.dados.endereco.cep === '60150-160' && r.dados.novidades === true && r.dados.nascimento === '',
    'mostra os dados do cadastro', r.dados);
  ok(!JSON.stringify(r.dados).match(/senha|sal"|v2\$/), 'sem senha nem dados internos', Object.keys(r.dados));
  chamar('salvarAnamnese', { token: tc, ficha: { ...FICHA, data_nascimento: '1991-02-03' } });
  ok(chamar('minhaConta', { token: tc }).dados.nascimento === '1991-02-03', 'data de nascimento vem da ficha de saúde');
  r = chamar('salvarConta', { token: tc, dados: { nome: '  Carla   Dias Souza ', whatsapp: '(85) 98888-7777', nascimento: '1991-02-04', novidades: false, endereco: { ...END_TESTE, numero: '500', complemento: 'Apto 3' } } });
  ok(r.ok && r.dados.nome === 'Carla Dias Souza' && r.dados.whatsapp === '85988887777' && r.dados.nascimento === '1991-02-04' && r.dados.novidades === false && r.dados.endereco.numero === '500' && r.dados.aluno.nome === 'Carla Dias Souza',
    'salva nome, WhatsApp, nascimento, novidades e endereço', r);
  const linhaC = () => ctx.lerAba('Alunos').find((a) => ctx.normCpf(a.cpf) === '39053344705');
  ok(linhaC().marketing === 'NÃO' && linhaC().complemento === 'Apto 3', 'gravado na planilha (fora das campanhas)');
  r = chamar('salvarConta', { token: tc, dados: { cpf: '52998224725', email: 'outra@x.com', senha_hash: 'x', sal: 'y', ativo: 'NÃO', obs_internas: 'x', wellhub: 'SIM' } });
  const lc = linhaC();
  ok(r.ok && ctx.normCpf(lc.cpf) === '39053344705' && lc.email === 'carla@gmail.com' && String(lc.senha_hash).startsWith('v2$') && lc.ativo === 'SIM' && !lc.obs_internas && !lc.wellhub,
    'não muda CPF, e-mail, senha, situação nem campos da recepção', lc);
  ok(!chamar('salvarConta', { token: tc, dados: { nome: 'Carla' } }).ok, 'pede nome e sobrenome');
  ok(!chamar('salvarConta', { token: tc, dados: { whatsapp: '8599' } }).ok, 'pede WhatsApp com DDD');
  ok(!chamar('salvarConta', { token: tc, dados: { nascimento: '2999-01-01' } }).ok && !chamar('salvarConta', { token: tc, dados: { nascimento: '12/02/1990' } }).ok, 'recusa data de nascimento estranha');
  r = chamar('salvarConta', { token: tc, dados: { endereco: { ...END_TESTE, bairro: '' } } });
  ok(!r.ok && /Complete o endereço: bairro/.test(r.erro), 'endereço continua completo', r);
  chamar('salvarConta', { token: tc, dados: { nome: '=HYPERLINK("x") Teste' } });
  ok(String(m.ss.getSheetByName('Alunos').rows[linhaC()._linha - 1][1]).startsWith("'"), 'nome com fórmula vira texto');
  chamar('salvarConta', { token: tc, dados: { nome: 'Carla Dias Souza' } });

  r = chamar('salvarEmail', { token: tc, email: 'invasor@gmail.com' });
  ok(!r.ok && /Minha conta/.test(r.erro) && linhaC().email === 'carla@gmail.com', 'quem já tem e-mail não troca sem a senha', r);
  r = chamar('trocarEmail', { token: tc, email: 'carla.nova@gmail.com', senha: 'errada123' });
  ok(!r.ok && r.codigo === 'SENHA_ATUAL' && linhaC().email === 'carla@gmail.com', 'trocar e-mail com senha errada: recusado', r);
  const nEmails = emails.length;
  r = chamar('trocarEmail', { token: tc, email: ' Carla.Nova@gmail.com ', senha: 'carla12345' });
  ok(r.ok && r.dados.email === 'carla.nova@gmail.com' && linhaC().email === 'carla.nova@gmail.com', 'e-mail trocado com a senha certa', r);
  ok(emails.length === nEmails + 1 && emails.at(-1).to === 'carla@gmail.com' && /e-mail foi alterado/.test(emails.at(-1).subject) && !emails.at(-1).body.includes('carla.nova@'),
    'o e-mail antigo é avisado (com o novo mascarado)', emails.at(-1));

  r = chamar('trocarSenha', { token: tc, senhaAtual: 'carla12345', senha: '123' });
  ok(!r.ok && /8 caracteres/.test(r.erro), 'senha nova fraca recusada', r);
  r = chamar('trocarSenha', { token: tc, senhaAtual: 'errada999', senha: 'novaSenha2026' });
  ok(!r.ok && r.codigo === 'SENHA_ATUAL', 'senha atual errada: recusado', r);
  r = chamar('trocarSenha', { token: tc, senhaAtual: 'carla12345', senha: 'carla12345' });
  ok(!r.ok && /diferente/.test(r.erro), 'senha nova igual à atual: recusado', r);
  r = chamar('trocarSenha', { token: tc, senhaAtual: 'carla12345', senha: 'novaSenha2026' });
  const tNovo = r.ok && r.dados.token;
  ok(tNovo && tNovo !== tc && r.dados.aluno.nome === 'Carla Dias Souza', 'senha trocada, com sessão nova', r);
  ok(!chamar('aulas', { token: tc }).ok && !chamar('aulas', { token: tc2 }).ok && chamar('aulas', { token: tNovo }).ok, 'outros aparelhos desconectados; este continua');
  ok(!chamar('entrar', { cpf: '39053344705', senha: 'carla12345' }).ok && chamar('entrar', { cpf: '39053344705', senha: 'novaSenha2026' }).ok, 'senha velha não entra; a nova entra');
  ok(emails.at(-1).to === 'carla.nova@gmail.com' && /senha foi alterada/.test(emails.at(-1).subject), 'aviso de senha trocada por e-mail');
  for (let i = 0; i < 8; i++) chamar('trocarEmail', { token: tNovo, email: 'x' + i + '@gmail.com', senha: 'chute' + i });
  r = chamar('trocarEmail', { token: tNovo, email: 'x@gmail.com', senha: 'novaSenha2026' });
  ok(!r.ok && /Muitas tentativas/.test(r.erro) && linhaC().email === 'carla.nova@gmail.com', 'sessão roubada não fica chutando a senha', r);
  r = chamar('minhaConta', { token: maria });
  ok(r.ok && r.dados.cpf === '52998224725' && r.dados.novidades === false, 'cada aluna vê só a própria conta (Maria saiu da lista antes)', r.dados && r.dados.cpf);
}

console.log('— sessões');
{
  for (let i = 0; i < 13; i++) chamar('entrar', { cpf: '52998224725', senha: 'abc12345' });
  const n = ctx.lerAba('Sessoes').filter((s) => ctx.normCpf(s.cpf) === '52998224725').length;
  ok(n <= 10, 'cada aluna guarda no máximo 10 sessões', n);
  ok(['Sessoes', 'SessoesEquipe'].every((s) => m.ss.getSheetByName(s).rows.slice(1).every((l) => /^h[a-f0-9]{64}$/.test(String(l[0])))), 'sessões gravadas só como código embaralhado (hash)');
  r = chamar('b_sair', { token: rec });
  r = chamar('b_resumo', { token: rec });
  ok(!r.ok && r.codigo === 'SESSAO_EQUIPE', 'saiu da bancada: a sessão para de valer na hora', r);
}


// ---------- revisão de out/2026 (finecomb): pedidos grandes, limites, caches, links e dados que sobravam ----------
console.log('— cadastro público: tamanho e custo');
const adm2 = chamar('b_entrar', { email: 'contato@acasaambar.com.br', senha: 'ambar2026adm' }).dados.token;
const rec2 = chamar('b_entrar', { email: 'bia@acasaambar.com.br', senha: 'recep2026ok' }).dados.token;
{
  const quantas = () => ctx.lerAba('Alunos').length;
  const antes = quantas();
  const t0 = Date.now();
  r = chamar('cadastrar', { endereco: END_TESTE, cpf: '390.533.447-05', nome: 'Carla Prado', whatsapp: '85988887777', email: 'a@' + '.'.repeat(90000) + ' x', senha: 'abc12345' });
  ok(!r.ok && Date.now() - t0 < 1500 && quantas() === antes, 'e-mail gigante: recusado na hora (sem custo quadrático) e sem criar conta', { ms: Date.now() - t0, r });
  r = chamar('cadastrar', { endereco: END_TESTE, cpf: '390.533.447-05', nome: '[ ' + 'x'.repeat(44000), whatsapp: '85988887777', email: 'carla@gmail.com', senha: 'abc12345' });
  ok(!r.ok && quantas() === antes, 'nome enorme: recusado', r);
  r = chamar('cadastrar', { endereco: END_TESTE, cpf: '390.533.447-05', nome: 'Carla Prado', whatsapp: '8'.repeat(40), email: 'carla@gmail.com', senha: 'abc12345' });
  ok(!r.ok && quantas() === antes, 'WhatsApp enorme: recusado', r);
  ok(ctx.seguro('[' + 'x'.repeat(5000)).length <= 2001, 'texto qualquer que começa com "[" volta ao teto normal');
  ok(ctx.seguro(JSON.stringify(Array.from({ length: 400 }, (_, i) => ({ item: 'serviço ' + i, valor: i })))).length > 2000, 'JSON de verdade (itens da comanda) continua cabendo');
  ok(ctx.emailValido('maria@gmail.com') && !ctx.emailValido('a'.repeat(260) + '@gmail.com'), 'e-mail normal vale; acima de 254 caracteres não');
}

console.log('— limites com janela fixa (bloqueio não se renova sozinho)');
{
  const cache = ctx.CacheService.getScriptCache();
  const barras = [];
  for (let i = 0; i < 6; i++) { try { ctx.limitarPorMinutos('teste_janela', 2, 10); barras.push(false); } catch (e) { barras.push(true); } }
  ok(barras.join() === 'false,false,true,true,true,true', 'passou do máximo: bloqueia', barras);
  const o1 = JSON.parse(cache.get('lim_teste_janela'));
  for (let i = 0; i < 5; i++) { try { ctx.limitarPorMinutos('teste_janela', 2, 10); } catch (e) { /* esperado */ } }
  const o2 = JSON.parse(cache.get('lim_teste_janela'));
  ok(o1.ate === o2.ate, 'pedidos bloqueados NÃO prolongam o prazo da janela', { o1, o2 });
  for (let i = 0; i < 5; i++) chamar('esqueciSenha', { cpf: '52998224725' });
  const e1 = JSON.parse(cache.get('esq_52998224725'));
  chamar('esqueciSenha', { cpf: '52998224725' });
  ok(e1.ate === JSON.parse(cache.get('esq_52998224725')).ate, '"esqueci minha senha": o bloqueio de 1 h não é renovado a cada pedido');
}

console.log('— link de senha deixa de valer quando a recepção troca o e-mail');
{
  const antes = emails.length;
  r = chamar('b_salvarAluno', { token: adm2, cpf: '52998224725', dados: { email: 'maria.antigo@gmail.com' } });
  chamar('b_enviarLinkSenha', { token: adm2, cpf: '52998224725' });
  const link = emails.slice(antes).map(linkDe).filter(Boolean).pop();
  r = chamar('b_salvarAluno', { token: adm2, cpf: '52998224725', dados: { email: 'maria.novo@gmail.com' } });
  ok(r.ok, 'recepção/administração troca o e-mail', r);
  if (link) { r = chamar('novaSenha', { t: link, senha: 'nova12345' }); ok(!r.ok, 'o link enviado ao e-mail antigo não troca mais a senha', r); }
  else console.log('  · (ação de link da recepção sem e-mail neste simulador: conferido só a troca)');
}

console.log('— o que a recepção NÃO vê (comissão e custo) e o que a profissional não pode');
{
  r = chamar('b_catalogoServicos', { token: rec2 });
  ok(r.ok && r.dados.profissionais.every((p) => p.comissao === null && p.comissaoProduto === null), 'recepção: catálogo sem comissão de ninguém', r.ok && r.dados.profissionais.map((p) => p.comissao));
  r = chamar('b_catalogoServicos', { token: adm2 });
  ok(r.ok && r.dados.profissionais.some((p) => p.comissao != null), 'administração continua vendo a comissão');
  chamar('b_salvarProduto', { token: adm2, produto: { nome: 'Produto Teste Custo', vende: true, preco: 50, custo: 20, categoria: 'Outros' } });
  r = chamar('b_produtos', { token: rec2 });
  ok(r.ok && r.dados.produtos.every((p) => p.custo === null), 'recepção: produtos sem custo de compra', r.ok && r.dados.produtos.map((p) => p.custo));
  r = chamar('b_produtos', { token: adm2 });
  ok(r.ok && r.dados.produtos.some((p) => p.custo === 20), 'administração vê o custo');
}

console.log('— valores de lista aceitam só o que existe (nada de "constructor")');
{
  r = chamar('b_atualizarEspera', { token: rec2, id: 'x', status: 'constructor' });
  ok(!r.ok && /inválida/.test(String(r.erro)), 'lista de espera: situação de protótipo recusada', r);
  r = chamar('b_salvarAluno', { token: rec2, cpf: '52998224725', dados: { wellhub: 'constructor' } });
  ok(!r.ok, 'Wellhub: valor de protótipo recusado', r);
}

console.log('— arquivos: conteúdo conferido pelos bytes');
{
  const b64 = (buf) => buf.toString('base64');
  const lixoPng = Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47]), Buffer.from('x'.repeat(300))]);
  let erro = ''; try { ctx.bytesDaAssinatura('data:image/png;base64,' + b64(lixoPng)); } catch (e) { erro = e.message; }
  ok(/assinatura/i.test(erro), '"PNG" que é só lixo depois dos 4 primeiros bytes: recusado como assinatura', erro);
  erro = ''; try { ctx.salvarFoto('data:image/jpeg;base64,' + b64(Buffer.from('isto não é uma foto')), 'x'); } catch (e) { erro = e.message; }
  ok(/inválida/i.test(erro), 'foto que não é JPEG de verdade: recusada', erro);
  let id = ''; try { id = ctx.salvarFoto('data:image/jpeg;base64,' + b64(Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), Buffer.from('jfif...')])), 'x'); } catch (e) { id = 'ERRO ' + e.message; }
  ok(id && !/^ERRO/.test(id), 'JPEG com o cabeçalho certo: aceito', id);
}

console.log('— trilha de leitura de ficha de saúde');
{
  const quantas = () => ctx.lerAba('Registro').filter((x) => /^leu /.test(String(x.acao))).length;
  const antes = quantas();
  chamar('b_aluno', { token: rec2, cpf: '52998224725' });
  chamar('b_aluno', { token: rec2, cpf: '52998224725' });
  ok(quantas() === antes + 1, 'abrir a ficha do cliente fica no Registro (uma linha por hora, não uma por clique)', { antes, depois: quantas() });
  chamar('b_alunos', { token: rec2 });
  ok(ctx.lerAba('Registro').some((x) => /lista de todos os clientes/.test(String(x.acao))), 'baixar a lista inteira de clientes também fica registrado');
}

console.log('— excluir cliente apaga também as anotações livres');
{
  chamar('b_salvarProfissional', { token: adm2, profissional: { nome: 'Lia Esteticista', categorias: ['Estética facial'], dias: [1, 2, 3, 4, 5, 6], inicio: '06:00', fim: '23:00', comissao: 40 } });
  chamar('cadastrar', { endereco: END_TESTE, cpf: '390.533.447-05', nome: 'Carla Prado', whatsapp: '85988887777', email: 'carla.prado@gmail.com', senha: 'abc12345' });
  const dia = proxDiaUtil(hoje, 2);
  r = chamar('b_agendarServico', { token: adm2, servicoId: 'limpeza-pele', profissional: 'Lia Esteticista', data: dia, hora: '10:00', cpf: '39053344705', pagamento: 'no_dia' });
  if (r.ok) {
    const lin = ctx.lerAba('Atendimentos').filter((a) => a.id === r.dados.id)[0];
    ctx.atualizarLinha('Atendimentos', lin._linha, { obs: 'Carla Prado é diabética; filha 85970001111' });
    r = chamar('b_atualizarAtendimento', { token: adm2, id: lin.id, status: 'cancelado' });
    r = chamar('b_excluirCliente', { token: adm2, cpf: '39053344705', confirmacao: 'Carla' });
    ok(r.ok && r.dados.anonimizado, 'cliente com histórico: anonimizado', r);
    ok(ctx.lerAba('Atendimentos').every((a) => !/diabética|85970001111/.test(String(a.obs))), 'a anotação do atendimento (saúde, telefone de terceiro) saiu');
    const sobra = ctx.lerAba('Alunos').filter((a) => /Carla Prado/.test(String(a.nome)) || (/^excluído/.test(String(a.origem_cadastro)) && (a.whatsapp || a.email)));
    ok(sobra.length === 0, 'nome e WhatsApp saíram de Alunos', sobra.map((a) => ({ nome: a.nome, whatsapp: a.whatsapp, cpf: a.cpf })));
  } else console.log('  · (agendamento de teste indisponível neste simulador: ' + r.erro + ')');
}

console.log(falhas ? '\n' + falhas + ' FALHA(S) DE SEGURANÇA' : '\nSEGURANÇA OK');
process.exit(falhas ? 1 : 0);
