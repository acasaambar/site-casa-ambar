// Testes de segurança: cada ação só funciona para quem pode, e os dados não vazam.
const { criar } = require('./simulador.cjs');
const END_TESTE = { cep: '60150-160', endereco: 'Rua Eduardo Salgado', numero: '448', bairro: 'Aldeota', cidade: 'Fortaleza', uf: 'CE' };
const R = require('path').join(__dirname, '..', 'apps-script');
const m = criar([R + '/Codigo.gs', R + '/Seguranca.gs', R + '/Vales.gs', R + '/Bancada.gs', R + '/Relatorios.gs', R + '/Servicos.gs', R + '/Gestao.gs', R + '/Clientes.gs', R + '/Marketing.gs']);
const { ctx, chamar, emails } = m;
let falhas = 0;
const ok = (c, msg, extra) => { if (!c) { falhas++; console.log('  ✗', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); } else console.log('  ✓', msg); };
const linkDe = (e) => (e.body.match(/t=([a-f0-9]+)/) || [])[1];
const hoje = ctx.hojeTexto();
const proxDiaUtil = (base, n) => { let d = ctx.somarDias(base, n); while (new Date(d + 'T12:00:00Z').getUTCDay() === 0) d = ctx.somarDias(d, 1); return d; };
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
    'ativarWellhub', 'descartarPagamento', 'salvarEmail', 'salvarEndereco', 'validarCodigo', 'resgatarVale'];
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
  r = chamar('b_criarVales', { token: rec, tipo: 'valor', valor: 100, quantidade: 1, campanha: 'Teste' });
  const vale = r.dados.vales[0].codigo;
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
  const b = chamar('comprar', { token: maria, planoId: 'yoga-mensal-1x' }).dados;
  pagar(b.order_nsu, 'tx-A', 20000);
  ok(ctx.linhaPagamento(b.order_nsu).status === 'pendente', 'a mesma transação não paga um segundo pedido');
  r = chamar('confirmarPagamento', { token: maria, orderNsu: b.order_nsu, transactionNsu: 'tx-A', slug: 's' });
  ok(r.ok && r.dados.status === 'pendente', 'nem pelo retorno do site');
  pagar(b.order_nsu, 'tx-B', 20000);
  ok(ctx.linhaPagamento(b.order_nsu).status === 'pago', 'com a transação dele, paga');
  r = chamar('confirmarPagamento', { token: chamar('entrar', { cpf: '11144477735', senha: 'joana12345' }).dados.token, orderNsu: b.order_nsu });
  ok(!r.ok && /não encontrado/.test(r.erro), 'outra aluna não vê o pagamento de ninguém', r);
}

console.log('— observação do pagamento: a aluna só vê o que é para ela');
{
  ok(ctx.observacaoParaAluna('ATENÇÃO: o vale AMBAR-XXXX não tinha mais saldo suficiente') === '', 'nota interna do vale não aparece');
  ok(ctx.observacaoParaAluna('Estornado por bia@acasaambar.com.br: cliente desistiu') === '', 'nota de estorno não aparece');
  ok(/vai devolver/.test(ctx.observacaoParaAluna('DEVOLVER R$ 12,50 de juros à aluna: pagou em 2x')), 'aviso de juros a devolver aparece');
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

console.log(falhas ? '\n' + falhas + ' FALHA(S) DE SEGURANÇA' : '\nSEGURANÇA OK');
process.exit(falhas ? 1 : 0);
