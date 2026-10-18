/**
 * ============================================================
 *  CASA ÂMBAR — BACKEND DE RESERVAS (Google Apps Script)
 *  Banco de dados: a planilha onde este script está instalado.
 * ============================================================
 *
 *  COMO INSTALAR (uma vez só):
 *  1. Crie uma planilha nova no Google Sheets (conta da Casa Âmbar) e coloque
 *     o ID dela em PLANILHA_ID, logo abaixo.
 *  2. Em script.google.com (ou Extensões → Apps Script), apague o que houver
 *     e cole este arquivo inteiro.
 *  3. No menu da esquerda, clique na engrenagem (Configurações do projeto)
 *     e marque "Mostrar arquivo de manifesto appsscript.json".
 *     Abra o appsscript.json e troque o conteúdo pelo arquivo appsscript.json da pasta.
 *  4. Salve. No topo, escolha a função "configurarPlanilha" e clique em Executar.
 *     Autorize o acesso. As abas Grade, Alunos, Reservas e Sessoes serão criadas.
 *  5. Clique em Implantar → Nova implantação → tipo "App da Web".
 *     Executar como: Eu. Quem pode acessar: Qualquer pessoa.
 *  6. Copie a URL que termina em /exec e cole em src/config.js (API_URL).
 *
 *  Sempre que mudar este código: Implantar → Gerenciar implantações →
 *  editar (lápis) → Versão: Nova versão → Implantar. A URL continua a mesma.
 */

// -------------------- PLANILHA --------------------
// ID da planilha (o trecho da URL entre /d/ e /edit)
var PLANILHA_ID = '1FM-mNF_w0FSS48rhEYp54dRrgwANpIbtTEK2nmWewdo';

var _planilha = null;
function planilha() {
  if (!_planilha) _planilha = SpreadsheetApp.openById(PLANILHA_ID);
  return _planilha;
}

// -------------------- AJUSTES --------------------
var AJUSTES = {
  diasVisiveis: 7, // quantos dias aparecem na agenda
  checkinAbreMinAntes: 30, // check-in libera X minutos antes
  cancelarAteHorasAntes: 2, // cancelamento até X horas antes
  duracaoAulaMin: 60,
  validadeSessaoDias: 30, // o aluno fica conectado por X dias
  fuso: 'America/Fortaleza',
  // Pagamentos (InfinitePay · Checkout Integrado)
  infinitepayHandle: 'acasaambar', // InfiniteTag sem o $
  siteUrl: 'https://acasaambar.github.io/site-casa-ambar/',
  apiUrl: 'https://script.google.com/macros/s/AKfycbyifKgzuxAU0V-RR639J3vs1opngMDOPWpLXMEWg7LkgB4bpyoVy4yqRXuLu7_v_DWx/exec',
  reservaPendenteMin: 20, // tapete fica guardado por X minutos enquanto a aluna paga
};

var ABAS = {
  Grade: ['ativo', 'modalidade', 'dia_semana', 'hora', 'professor', 'capacidade'],
  Alunos: ['cpf', 'nome', 'whatsapp', 'email', 'senha_hash', 'sal', 'criado_em', 'ativo'],
  Reservas: ['id', 'aula_id', 'data', 'hora', 'modalidade', 'professor', 'cpf', 'nome', 'tapete', 'status', 'criada_em', 'checkin_em', 'cancelada_em', 'credito_id', 'pagamento_nsu', 'expira_ms'],
  Sessoes: ['token', 'cpf', 'criada_em', 'expira_em'],
  Bloqueios: ['data', 'hora', 'modalidade', 'motivo'],
  Anamneses: ['cpf', 'nome', 'preenchida_em', 'data_nascimento', 'emergencia_nome', 'emergencia_parentesco', 'emergencia_telefone', 'plano_saude',
    'parq_1', 'parq_2', 'parq_3', 'parq_4', 'parq_5', 'parq_6', 'parq_7', 'parq_algum_sim',
    'comorbidades', 'comorbidade_outra', 'gestante', 'gestante_semanas', 'cirurgias', 'lesoes', 'medicamentos', 'alergias',
    'atividade_regular', 'observacoes', 'declaracao', 'consentimento', 'pdf'],
  // Catálogo do que se vende no site (edite preços e planos aqui)
  Planos: ['id', 'ativo', 'modalidade', 'tipo', 'nome', 'aulas_semana', 'aulas_total', 'validade_dias', 'preco', 'descricao'],
  Pagamentos: ['order_nsu', 'cpf', 'nome', 'plano_id', 'descricao', 'valor', 'status', 'link', 'criado_em', 'pago_em', 'metodo', 'parcelas',
    'valor_pago', 'transaction_nsu', 'slug', 'recibo', 'reserva_id', 'aula_id', 'tapete', 'observacao'],
  // Créditos de aula de cada aluno (vêm de pagamentos ou são lançados à mão pela recepção)
  Creditos: ['id', 'cpf', 'nome', 'plano_id', 'descricao', 'modalidade', 'tipo', 'aulas_semana', 'aulas_total', 'inicio', 'fim', 'origem', 'ativo'],
};

// Catálogo inicial (vai para a aba Planos na configuração)
var CATALOGO_INICIAL = [
  ['yoga-avulsa', 'SIM', 'Yoga', 'avulsa', 'Yoga · aula avulsa', 0, 1, 30, 63, 'Uma aula, válida por 30 dias'],
  ['yoga-mensal-1x', 'SIM', 'Yoga', 'mensal', 'Yoga · 1x na semana', 1, 0, 30, 200, 'Plano mensal'],
  ['yoga-mensal-2x', 'SIM', 'Yoga', 'mensal', 'Yoga · 2x na semana', 2, 0, 30, 350, 'Plano mensal'],
  ['yoga-mensal-3x', 'SIM', 'Yoga', 'mensal', 'Yoga · 3x na semana', 3, 0, 30, 480, 'Plano mensal'],
  ['yoga-mensal-4x', 'SIM', 'Yoga', 'mensal', 'Yoga · 4x na semana', 4, 0, 30, 580, 'Plano mensal'],
  ['yoga-trimestral-1x', 'SIM', 'Yoga', 'trimestral', 'Yoga · 1x na semana · trimestral', 1, 0, 90, 561, '3 meses (R$ 187/mês)'],
  ['yoga-trimestral-2x', 'SIM', 'Yoga', 'trimestral', 'Yoga · 2x na semana · trimestral', 2, 0, 90, 978, '3 meses (R$ 326/mês)'],
  ['yoga-trimestral-3x', 'SIM', 'Yoga', 'trimestral', 'Yoga · 3x na semana · trimestral', 3, 0, 90, 1344, '3 meses (R$ 448/mês)'],
  ['yoga-trimestral-4x', 'SIM', 'Yoga', 'trimestral', 'Yoga · 4x na semana · trimestral', 4, 0, 90, 1626, '3 meses (R$ 542/mês)'],
  ['pilates-avulsa', 'SIM', 'Pilates', 'avulsa', 'Pilates · aula avulsa', 0, 1, 30, 75, 'Uma aula, válida por 30 dias'],
  ['pilates-mensal-2x', 'SIM', 'Pilates', 'mensal', 'Pilates · 2x na semana', 2, 0, 30, 380, 'Plano mensal'],
  ['pilates-mensal-3x', 'SIM', 'Pilates', 'mensal', 'Pilates · 3x na semana', 3, 0, 30, 480, 'Plano mensal'],
  ['pilates-trimestral-2x', 'SIM', 'Pilates', 'trimestral', 'Pilates · 2x na semana · trimestral', 2, 0, 90, 1065, '3 meses (R$ 355/mês)'],
  ['pilates-trimestral-3x', 'SIM', 'Pilates', 'trimestral', 'Pilates · 3x na semana · trimestral', 3, 0, 90, 1347, '3 meses (R$ 449/mês)'],
];

// Nome da pasta do Google Drive onde ficam os PDFs das fichas de saúde
var PASTA_ANAMNESES = 'Casa Âmbar · Anamneses';

// Perguntas do PAR-Q (as mesmas do site), usadas no PDF
var PARQ_TEXTOS = [
  'Algum médico já disse que você possui algum problema de coração e que só deveria realizar atividade física supervisionada por profissionais de saúde?',
  'Você sente dores no peito quando pratica atividade física?',
  'No último mês, você sentiu dores no peito quando praticou atividade física?',
  'Você apresenta desequilíbrio devido a tontura e/ou perda da consciência?',
  'Você possui algum problema ósseo ou articular que poderia piorar com atividade física?',
  'Você toma atualmente algum medicamento para pressão arterial e/ou problema de coração?',
  'Sabe de alguma outra razão pela qual você não deve praticar atividade física?',
];

// ============================================================
//  1) CONFIGURAÇÃO INICIAL — execute uma vez
// ============================================================
function configurarPlanilha() {
  var ss = planilha();
  Object.keys(ABAS).forEach(function (nome) {
    var aba = ss.getSheetByName(nome) || ss.insertSheet(nome);
    if (aba.getLastRow() === 0) {
      aba.appendRow(ABAS[nome]);
      aba.getRange(1, 1, 1, ABAS[nome].length).setFontWeight('bold').setBackground('#2F3821').setFontColor('#E9DDC5');
      aba.setFrozenRows(1);
    }
  });
  // colunas de texto (para o CPF não perder zeros à esquerda)
  ss.getSheetByName('Alunos').getRange('A:C').setNumberFormat('@');
  ss.getSheetByName('Reservas').getRange('A:H').setNumberFormat('@');
  ss.getSheetByName('Grade').getRange('D:D').setNumberFormat('@');
  ss.getSheetByName('Bloqueios').getRange('A:B').setNumberFormat('@');
  ss.getSheetByName('Anamneses').getRange('A:G').setNumberFormat('@');
  ss.getSheetByName('Sessoes').getRange('A:B').setNumberFormat('@');
  ss.getSheetByName('Pagamentos').getRange('A:E').setNumberFormat('@');
  ss.getSheetByName('Creditos').getRange('A:K').setNumberFormat('@');
  ss.getSheetByName('Planos').getRange('A:E').setNumberFormat('@');
  Object.keys(ABAS).forEach(function (n) { garantirCabecalho(ss.getSheetByName(n), n); });
  var planos = ss.getSheetByName('Planos');
  if (planos.getLastRow() === 1) {
    planos.getRange(2, 1, CATALOGO_INICIAL.length, CATALOGO_INICIAL[0].length).setValues(CATALOGO_INICIAL);
  }
  pastaAnamneses(); // cria a pasta no Drive, se ainda não existir
  // testa o acesso à internet (InfinitePay) para pedir a autorização agora
  try { UrlFetchApp.fetch('https://www.infinitepay.io', { muteHttpExceptions: true }); } catch (e) { Logger.log('Aviso: ' + e.message); }

  var grade = ss.getSheetByName('Grade');
  if (grade.getLastRow() === 1) {
    var linhas = [];
    // dia_semana: 0=domingo, 1=segunda ... 6=sábado
    [[1, '06:30', 'Ana Paula'], [1, '07:30', 'Ana Paula'], [1, '18:30', 'Hanna'],
     [3, '06:30', 'Ana Paula'], [3, '07:30', 'Ana Paula'], [3, '18:30', 'Hanna'],
     [5, '06:30', 'Ana Paula'], [5, '07:30', 'Ana Paula'], [6, '07:00', 'Ana Paula']]
      .forEach(function (g) { linhas.push(['SIM', 'Yoga', g[0], g[1], g[2], 12]); });
    [1, 2, 3, 4, 5].forEach(function (d) {
      ['06:00', '07:00', '08:00', '09:00', '16:00', '17:00', '18:00', '19:00'].forEach(function (h) {
        linhas.push(['SIM', 'Pilates', d, h, Number(h.slice(0, 2)) < 12 ? 'Kalliny' : 'Sara', 4]);
      });
    });
    grade.getRange(2, 1, linhas.length, linhas[0].length).setValues(linhas);
  }
  Logger.log('Planilha configurada! Abas: ' + ss.getSheets().map(function (a) { return a.getName(); }).join(', '));
}

// Execute esta função uma vez para autorizar os pagamentos (InfinitePay).
// Ela pede ao Google a permissão "Conectar a um serviço externo".
function autorizarPagamentos() {
  var resp = UrlFetchApp.fetch('https://api.checkout.infinitepay.io/links', { method: 'get', muteHttpExceptions: true });
  Logger.log('Conexão com a InfinitePay liberada (resposta ' + resp.getResponseCode() + '). Pode fechar esta aba.');
}

// Diagnóstico: testa a criação de um link de R$ 1,00 de várias formas e mostra
// a resposta exata da InfinitePay no registro de execução. Não cobra nada.
function testarInfinitePay() {
  var base = { handle: AJUSTES.infinitepayHandle, items: [{ quantity: 1, price: 100, description: 'Teste Casa Ambar' }] };
  var nsu = 'TESTE' + Date.now();
  var variantes = [
    ['1. mínimo (handle + item)', base],
    ['2. + order_nsu', Object.assign({}, base, { order_nsu: nsu })],
    ['3. + redirect_url', Object.assign({}, base, { order_nsu: nsu + 'b', redirect_url: AJUSTES.siteUrl })],
    ['4. + webhook_url', Object.assign({}, base, { order_nsu: nsu + 'c', redirect_url: AJUSTES.siteUrl, webhook_url: AJUSTES.apiUrl })],
    ['5. + customer', Object.assign({}, base, { order_nsu: nsu + 'd', redirect_url: AJUSTES.siteUrl, webhook_url: AJUSTES.apiUrl,
      customer: { name: 'Teste Casa Ambar', phone_number: '+5585991856528' } })],
  ];
  variantes.forEach(function (v) {
    var resp = UrlFetchApp.fetch('https://api.checkout.infinitepay.io/links', {
      method: 'post', contentType: 'application/json', payload: JSON.stringify(v[1]), muteHttpExceptions: true,
    });
    Logger.log(v[0] + ' → HTTP ' + resp.getResponseCode() + ' · ' + resp.getContentText().slice(0, 400));
  });
}

// ============================================================
//  2) PORTA DE ENTRADA DO SITE
// ============================================================
function doPost(e) {
  var corpo;
  try {
    corpo = JSON.parse(e.postData.contents);
  } catch (err) {
    return responder(false, null, 'Pedido inválido.');
  }
  // aviso automático da InfinitePay (pagamento aprovado)
  if (corpo && !corpo.acao && corpo.order_nsu) {
    try {
      processarPagamento(String(corpo.order_nsu), corpo.transaction_nsu, corpo.invoice_slug || corpo.slug, 'webhook');
      return responder(true, { recebido: true });
    } catch (err) {
      return responder(false, null, err.message);
    }
  }
  try {
    var acoes = {
      cadastrar: cadastrar,
      entrar: entrar,
      sair: sair,
      aulas: listarAulas,
      aula: detalharAula,
      reservar: reservar,
      cancelar: cancelar,
      checkin: fazerCheckin,
      minhasReservas: minhasReservas,
      salvarAnamnese: salvarAnamnese,
      meuPlano: meuPlano,
      comprar: comprar,
      confirmarPagamento: confirmarPagamento,
    };
    var fn = acoes[corpo.acao];
    if (!fn) return responder(false, null, 'Ação desconhecida.');
    return responder(true, fn(corpo));
  } catch (err) {
    var msg = err.message || String(err);
    // falta de autorização do Google: mostra uma mensagem simples para a aluna
    if (/permiss|authoriz|autoriza/i.test(msg)) {
      Logger.log('Falta autorização: ' + msg);
      msg = 'Esta função está sendo ativada pela Casa Âmbar. Tente de novo mais tarde ou fale com a recepção.';
    }
    return responder(false, err.dados || null, msg, err.codigo);
  }
}

// Erro com código, para o site reagir (ex.: SEM_CREDITO abre a opção de pagar)
function erroCod(msg, codigo, dados) {
  var e = new Error(msg);
  e.codigo = codigo;
  e.dados = dados;
  return e;
}

// Versão do código (muda a cada atualização publicada)
var VERSAO = '2026-10-18 · v9 (avulsa 30 dias)';

function doGet() {
  return responder(true, { status: 'Casa Âmbar API no ar', versao: VERSAO });
}

function responder(ok, dados, erro, codigo) {
  return ContentService.createTextOutput(JSON.stringify({ ok: ok, dados: dados, erro: erro || null, codigo: codigo || null }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
//  3) ALUNOS E LOGIN (CPF + senha)
// ============================================================
function cadastrar(d) {
  var cpf = soDigitos(d.cpf);
  if (!cpfValido(cpf)) throw new Error('CPF inválido.');
  if (!d.nome || String(d.nome).trim().split(' ').length < 2) throw new Error('Informe nome e sobrenome.');
  if (soDigitos(d.whatsapp).length < 10) throw new Error('Informe um WhatsApp com DDD.');
  if (!d.senha || String(d.senha).length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');

  var trava = LockService.getScriptLock();
  trava.waitLock(15000);
  try {
    if (buscarAluno(cpf)) throw new Error('Este CPF já tem cadastro. Use "Entrar".');
    var sal = Utilities.getUuid();
    aba('Alunos').appendRow([cpf, String(d.nome).trim(), soDigitos(d.whatsapp), String(d.email || '').trim(), hashSenha(d.senha, sal), sal, agoraTexto(), 'SIM']);
  } finally {
    trava.releaseLock();
  }
  var aluno = buscarAluno(cpf);
  return { token: criarSessao(cpf), aluno: publico(aluno) };
}

function entrar(d) {
  var cpf = soDigitos(d.cpf);
  var aluno = buscarAluno(cpf);
  if (!aluno || aluno.ativo === 'NÃO' || hashSenha(d.senha, aluno.sal) !== aluno.senha_hash) {
    Utilities.sleep(600); // dificulta tentativas em massa
    throw new Error('CPF ou senha incorretos.');
  }
  return { token: criarSessao(cpf), aluno: publico(aluno) };
}

function sair(d) {
  var s = aba('Sessoes');
  var linhas = s.getDataRange().getValues();
  for (var i = linhas.length - 1; i >= 1; i--) {
    if (linhas[i][0] === d.token) s.deleteRow(i + 1);
  }
  return true;
}

function criarSessao(cpf) {
  var token = Utilities.getUuid() + Utilities.getUuid().slice(0, 8);
  var expira = new Date(Date.now() + AJUSTES.validadeSessaoDias * 86400000);
  aba('Sessoes').appendRow([token, normCpf(cpf), agoraTexto(), expira.toISOString()]);
  return token;
}

function alunoDaSessao(token) {
  if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
  var cache = CacheService.getScriptCache();
  var cpf = cache.get('s_' + token);
  if (!cpf) {
    var linhas = aba('Sessoes').getDataRange().getValues();
    for (var i = 1; i < linhas.length; i++) {
      if (linhas[i][0] === token && new Date(linhas[i][3]) > new Date()) {
        cpf = normCpf(linhas[i][1]);
        break;
      }
    }
    if (!cpf) throw new Error('Sua sessão expirou. Entre novamente.');
    cache.put('s_' + token, cpf, 21600);
  }
  var aluno = buscarAluno(cpf);
  if (!aluno || aluno.ativo === 'NÃO') throw new Error('Sua sessão expirou. Entre novamente.');
  return aluno;
}

function buscarAluno(cpf) {
  var linhas = aba('Alunos').getDataRange().getValues();
  var cab = linhas[0];
  for (var i = 1; i < linhas.length; i++) {
    if (normCpf(linhas[i][0]) === normCpf(cpf)) return objeto(cab, linhas[i]);
  }
  return null;
}

function publico(a) {
  var cpf = normCpf(a.cpf);
  return { nome: a.nome, cpf: cpf, whatsapp: String(a.whatsapp), anamnese: !!linhaAnamnese(cpf) };
}

function hashSenha(senha, sal) {
  var txt = sal + ':' + senha;
  var bytes;
  for (var i = 0; i < 200; i++) {
    bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, txt, Utilities.Charset.UTF_8);
    txt = Utilities.base64Encode(bytes) + sal;
  }
  return Utilities.base64Encode(bytes);
}

// ============================================================
//  4) AULAS
// ============================================================
function gerarAulas() {
  var grade = aba('Grade').getDataRange().getValues();
  var cab = grade[0];
  var bloqueios = aba('Bloqueios').getDataRange().getValues().slice(1).map(function (b) {
    return dataTexto(b[0]) + '|' + horaTexto(b[1]) + '|' + String(b[2]).toLowerCase();
  });
  var hoje = new Date();
  var lista = [];
  for (var i = 0; i < AJUSTES.diasVisiveis; i++) {
    var dia = new Date(hoje.getTime() + i * 86400000);
    var data = Utilities.formatDate(dia, AJUSTES.fuso, 'yyyy-MM-dd');
    var semana = Number(Utilities.formatDate(dia, AJUSTES.fuso, 'u')) % 7; // 1=seg ... 7=dom → 0
    for (var j = 1; j < grade.length; j++) {
      var g = objeto(cab, grade[j]);
      if (String(g.ativo).toUpperCase() === 'NÃO' || Number(g.dia_semana) !== semana) continue;
      var hora = horaTexto(g.hora);
      var mod = String(g.modalidade).trim();
      var chave = data + '|' + hora + '|' + mod.toLowerCase();
      if (bloqueios.indexOf(chave) >= 0 || bloqueios.indexOf(data + '||' + mod.toLowerCase()) >= 0 || bloqueios.indexOf(data + '||') >= 0) continue;
      lista.push({
        id: data + '_' + hora + '_' + mod.toLowerCase(),
        data: data,
        hora: hora,
        modalidade: mod,
        professor: g.professor,
        capacidade: Number(g.capacidade) || 12,
        duracao: AJUSTES.duracaoAulaMin,
      });
    }
  }
  return lista.sort(function (a, b) { return (a.data + a.hora).localeCompare(b.data + b.hora); });
}

function reservasAtivas() {
  var linhas = aba('Reservas').getDataRange().getValues();
  var cab = linhas[0];
  var lista = [];
  for (var i = 1; i < linhas.length; i++) {
    var r = objeto(cab, linhas[i]);
    r._linha = i + 1;
    if (r.status === 'cancelado') continue;
    if (r.status === 'pendente' && Number(r.expira_ms) && Number(r.expira_ms) < Date.now()) continue;
    lista.push(r);
  }
  return lista;
}

function montarAula(aula, reservas, cpf) {
  var daAula = reservas.filter(function (r) { return r.aula_id === aula.id; });
  var minha = daAula.filter(function (r) { return normCpf(r.cpf) === normCpf(cpf) && r.status !== 'pendente'; })[0];
  aula.ocupados = aula.modalidade === 'Yoga' ? daAula.map(function (r) { return Number(r.tapete); }) : [];
  aula.ocupadosQtd = daAula.length;
  aula.minhaReserva = minha ? { id: minha.id, tapete: minha.tapete ? Number(minha.tapete) : null } : null;
  return aula;
}

function listarAulas(d) {
  var aluno = alunoDaSessao(d.token);
  var reservas = reservasAtivas();
  return gerarAulas().map(function (a) { return montarAula(a, reservas, normCpf(aluno.cpf)); });
}

function detalharAula(d) {
  var aluno = alunoDaSessao(d.token);
  var aula = gerarAulas().filter(function (a) { return a.id === d.aulaId; })[0];
  if (!aula) throw new Error('Aula não encontrada.');
  return montarAula(aula, reservasAtivas(), normCpf(aluno.cpf));
}

// ============================================================
//  5) RESERVAS (com trava: dois alunos nunca ficam com o mesmo tapete)
// ============================================================
function reservar(d) {
  var aluno = alunoDaSessao(d.token);
  var aula = gerarAulas().filter(function (a) { return a.id === d.aulaId; })[0];
  if (!aula) throw new Error('Aula não encontrada.');
  if (inicio(aula) < new Date()) throw new Error('Esta aula já começou.');
  if (!linhaAnamnese(normCpf(aluno.cpf))) throw new Error('Preencha sua ficha de saúde antes de reservar.');

  var cpf = normCpf(aluno.cpf);
  var trava = LockService.getScriptLock();
  trava.waitLock(20000);
  try {
    // uma tentativa anterior de pagar esta mesma aula é descartada
    reservasAtivas().forEach(function (r) {
      if (r.aula_id === aula.id && normCpf(r.cpf) === cpf && r.status === 'pendente') {
        aba('Reservas').getRange(r._linha, coluna('Reservas', 'status')).setValue('cancelado');
      }
    });
    var reservas = reservasAtivas();
    var m = montarAula(aula, reservas, cpf);
    if (m.minhaReserva) throw new Error('Você já tem reserva nesta aula.');
    if (m.ocupadosQtd >= aula.capacidade) throw new Error('Aula lotada.');
    var tapete = '';
    if (aula.modalidade === 'Yoga') {
      tapete = Number(d.tapete);
      if (!tapete || tapete < 1 || tapete > aula.capacidade) throw new Error('Escolha um tapete.');
      if (m.ocupados.indexOf(tapete) >= 0) throw new Error('O tapete ' + tapete + ' acabou de ser reservado. Escolha outro.');
    }
    var id = 'R' + Utilities.formatDate(new Date(), AJUSTES.fuso, 'yyMMddHHmmss') + Math.floor(Math.random() * 90 + 10);
    var credito = escolherCredito(cpf, aula, reservas);

    if (!credito) {
      var avulsa = buscarPlano(aula.modalidade.toLowerCase() + '-avulsa');
      if (!d.pagarAvulsa || !avulsa) {
        throw erroCod('Você não tem aulas de ' + aula.modalidade + ' disponíveis.', 'SEM_CREDITO', {
          avulsa: avulsa ? planoPublico(avulsa) : null,
        });
      }
      // guarda o tapete por alguns minutos e gera o pagamento da aula avulsa
      var pg = criarPagamento(aluno, avulsa, { reserva_id: id, aula_id: aula.id, tapete: tapete });
      aba('Reservas').appendRow([id, aula.id, aula.data, aula.hora, aula.modalidade, aula.professor, cpf, aluno.nome, tapete, 'pendente', agoraTexto(), '', '',
        '', pg.order_nsu, Date.now() + AJUSTES.reservaPendenteMin * 60000]);
      SpreadsheetApp.flush();
      return { pagamento: pg };
    }

    aba('Reservas').appendRow([id, aula.id, aula.data, aula.hora, aula.modalidade, aula.professor, cpf, aluno.nome, tapete, 'reservado', agoraTexto(), '', '',
      credito.id, '', '']);
    SpreadsheetApp.flush();
    return { id: id, aulaId: aula.id, data: aula.data, hora: aula.hora, modalidade: aula.modalidade, professor: aula.professor, tapete: tapete || null, status: 'reservado', credito: credito.descricao };
  } finally {
    trava.releaseLock();
  }
}

// aula_id = "2026-10-19_06:00_pilates": fonte segura da data e da hora
function partesAula(r) {
  var p = String(r.aula_id || '').split('_');
  if (p.length >= 3 && /^\d{4}-\d{2}-\d{2}$/.test(p[0])) {
    r.data = p[0];
    r.hora = p[1];
  } else {
    r.data = dataTexto(r.data);
    r.hora = horaTexto(r.hora);
  }
  return r;
}

function acharMinhaReserva(d) {
  var aluno = alunoDaSessao(d.token);
  var r = reservasAtivas().filter(function (x) { return x.id === d.reservaId && normCpf(x.cpf) === normCpf(aluno.cpf); })[0];
  if (!r) throw new Error('Reserva não encontrada.');
  return partesAula(r);
}

function cancelar(d) {
  var r = acharMinhaReserva(d);
  var limite = inicio(r).getTime() - AJUSTES.cancelarAteHorasAntes * 3600000;
  if (Date.now() > limite) throw new Error('Cancelamento só até ' + AJUSTES.cancelarAteHorasAntes + 'h antes da aula.');
  var s = aba('Reservas');
  s.getRange(r._linha, coluna('Reservas', 'status')).setValue('cancelado');
  s.getRange(r._linha, coluna('Reservas', 'cancelada_em')).setValue(agoraTexto());
  return true;
}

function fazerCheckin(d) {
  var r = acharMinhaReserva(d);
  var ini = inicio(r).getTime();
  if (Date.now() < ini - AJUSTES.checkinAbreMinAntes * 60000) throw new Error('O check-in abre ' + AJUSTES.checkinAbreMinAntes + ' min antes da aula.');
  if (Date.now() > ini + AJUSTES.duracaoAulaMin * 60000) throw new Error('Esta aula já terminou.');
  var s = aba('Reservas');
  s.getRange(r._linha, coluna('Reservas', 'status')).setValue('check-in');
  s.getRange(r._linha, coluna('Reservas', 'checkin_em')).setValue(agoraTexto());
  return true;
}

function minhasReservas(d) {
  var aluno = alunoDaSessao(d.token);
  var linhas = aba('Reservas').getDataRange().getValues();
  var cab = linhas[0];
  var lista = [];
  for (var i = 1; i < linhas.length; i++) {
    var r = objeto(cab, linhas[i]);
    if (normCpf(r.cpf) !== normCpf(aluno.cpf) || r.status === 'cancelado' || r.status === 'pendente') continue;
    partesAula(r);
    lista.push({
      id: r.id, aulaId: r.aula_id, data: r.data, hora: r.hora,
      modalidade: r.modalidade, professor: r.professor, tapete: r.tapete ? Number(r.tapete) : null, status: r.status,
    });
  }
  return lista.sort(function (a, b) { return (a.data + a.hora).localeCompare(b.data + b.hora); });
}

// ============================================================
//  6) FICHA DE SAÚDE (ANAMNESE)
//  Salva uma linha na aba "Anamneses" (uma por aluno, a mais recente)
//  e um PDF na pasta do Drive "Casa Âmbar · Anamneses".
// ============================================================
function salvarAnamnese(d) {
  var aluno = alunoDaSessao(d.token);
  var f = d.ficha || {};
  var cpf = normCpf(aluno.cpf);

  if (!f.emergencia_nome || soDigitos(f.emergencia_telefone).length < 10) throw new Error('Informe o contato de emergência com telefone.');
  for (var i = 1; i <= 7; i++) {
    if (f['parq_' + i] !== 'sim' && f['parq_' + i] !== 'nao') throw new Error('Responda todas as perguntas do questionário.');
  }
  if (!f.declaracao || !f.consentimento) throw new Error('É preciso marcar a declaração e o consentimento.');

  var algumSim = [1, 2, 3, 4, 5, 6, 7].some(function (n) { return f['parq_' + n] === 'sim'; });
  var limpar = function (v) { return String(v == null ? '' : v).slice(0, 1000); };
  var valores = {
    cpf: cpf,
    nome: aluno.nome,
    preenchida_em: agoraTexto(),
    data_nascimento: limpar(f.data_nascimento),
    emergencia_nome: limpar(f.emergencia_nome),
    emergencia_parentesco: limpar(f.emergencia_parentesco),
    emergencia_telefone: soDigitos(f.emergencia_telefone),
    plano_saude: limpar(f.plano_saude),
    parq_algum_sim: algumSim ? 'SIM' : 'NÃO',
    comorbidades: (f.comorbidades || []).map(limpar).join(', '),
    comorbidade_outra: limpar(f.comorbidade_outra),
    gestante: limpar(f.gestante),
    gestante_semanas: limpar(f.gestante_semanas),
    cirurgias: limpar(f.cirurgias),
    lesoes: limpar(f.lesoes),
    medicamentos: limpar(f.medicamentos),
    alergias: limpar(f.alergias),
    atividade_regular: limpar(f.atividade_regular),
    observacoes: limpar(f.observacoes),
    declaracao: 'SIM',
    consentimento: 'SIM',
  };
  for (var n = 1; n <= 7; n++) valores['parq_' + n] = f['parq_' + n] === 'sim' ? 'SIM' : 'NÃO';

  // PDF no Drive
  try {
    valores.pdf = gerarPdfAnamnese(valores);
  } catch (err) {
    valores.pdf = 'erro ao gerar PDF: ' + err.message;
  }

  var linha = ABAS.Anamneses.map(function (c) { return valores[c] == null ? '' : valores[c]; });
  var trava = LockService.getScriptLock();
  trava.waitLock(15000);
  try {
    var s = aba('Anamneses');
    var existente = linhaAnamnese(cpf);
    if (existente) s.getRange(existente, 1, 1, linha.length).setValues([linha]);
    else s.appendRow(linha);
  } finally {
    trava.releaseLock();
  }
  return { ok: true, alerta: algumSim };
}

function linhaAnamnese(cpf) {
  var s = aba('Anamneses');
  if (!s || s.getLastRow() < 2) return 0;
  var cpfs = s.getRange(2, 1, s.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < cpfs.length; i++) {
    if (normCpf(cpfs[i][0]) === normCpf(cpf)) return i + 2;
  }
  return 0;
}

function pastaAnamneses() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('PASTA_ANAMNESES_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* pasta apagada: cria outra */ }
  }
  var it = DriveApp.getFoldersByName(PASTA_ANAMNESES);
  var pasta = it.hasNext() ? it.next() : DriveApp.createFolder(PASTA_ANAMNESES);
  props.setProperty('PASTA_ANAMNESES_ID', pasta.getId());
  return pasta;
}

function gerarPdfAnamnese(v) {
  var esc = function (t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var linhaInfo = function (rotulo, valor) {
    return '<tr><th>' + rotulo + '</th><td>' + (esc(valor) || '<span class="vazio">não informado</span>') + '</td></tr>';
  };
  var cpfFmt = v.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  var tel = v.emergencia_telefone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
  var parq = PARQ_TEXTOS.map(function (t, i) {
    var r = v['parq_' + (i + 1)];
    return '<tr><td>' + (i + 1) + '. ' + esc(t) + '</td><td class="resp ' + (r === 'SIM' ? 'sim' : '') + '">' + r + '</td></tr>';
  }).join('');

  var html =
    '<html><head><meta charset="utf-8"><style>' +
    'body{font-family:Helvetica,Arial,sans-serif;color:#2F3821;font-size:11px;margin:28px}' +
    'h1{font-size:20px;letter-spacing:4px;margin:0;font-weight:normal}' +
    'h2{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#7E3717;margin:22px 0 6px;border-bottom:1px solid #A6845E;padding-bottom:4px}' +
    '.topo{border-bottom:2px solid #2F3821;padding-bottom:10px;margin-bottom:6px}.sub{color:#6F784D;font-size:10px;letter-spacing:2px}' +
    'table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:5px 6px;border-bottom:1px solid #E9DDC5;vertical-align:top}' +
    'th{width:34%;color:#5B6046;font-weight:normal}.resp{width:44px;text-align:center;font-weight:bold}.sim{color:#7E3717}' +
    '.alerta{background:#F3DCD0;color:#6E2A10;padding:8px 10px;margin-top:8px}.vazio{color:#A6A08C}' +
    '.assin{margin-top:46px;display:flex}.assin div{border-top:1px solid #2F3821;width:46%;padding-top:4px;font-size:10px;margin-right:8%}' +
    '</style></head><body>' +
    '<div class="topo"><h1>CASA ÂMBAR</h1><div class="sub">FICHA DE SAÚDE · ANAMNESE</div></div>' +
    '<p>Preenchida pelo aluno no site em ' + esc(v.preenchida_em) + '.</p>' +
    '<h2>Aluno</h2><table>' + linhaInfo('Nome', v.nome) + linhaInfo('CPF', cpfFmt) + linhaInfo('Data de nascimento', v.data_nascimento) + linhaInfo('Plano de saúde', v.plano_saude) + '</table>' +
    '<h2>Contato de emergência</h2><table>' + linhaInfo('Nome', v.emergencia_nome) + linhaInfo('Parentesco', v.emergencia_parentesco) + linhaInfo('Telefone', tel) + '</table>' +
    '<h2>Questionário de prontidão para atividade física (PAR-Q)</h2><table>' + parq + '</table>' +
    (v.parq_algum_sim === 'SIM' ? '<div class="alerta">Há resposta SIM no PAR-Q: recomenda-se liberação médica antes de iniciar as atividades.</div>' : '') +
    '<h2>Histórico de saúde</h2><table>' +
    linhaInfo('Condições de saúde', [v.comorbidades, v.comorbidade_outra].filter(String).join(', ')) +
    linhaInfo('Gestante', v.gestante + (v.gestante_semanas ? ' · ' + v.gestante_semanas + ' semanas' : '')) +
    linhaInfo('Cirurgias (últimos 12 meses)', v.cirurgias) +
    linhaInfo('Lesões ou dores atuais', v.lesoes) +
    linhaInfo('Medicamentos de uso contínuo', v.medicamentos) +
    linhaInfo('Alergias', v.alergias) +
    linhaInfo('Pratica atividade física regularmente', v.atividade_regular) +
    linhaInfo('Observações para a professora', v.observacoes) + '</table>' +
    '<h2>Declarações</h2><p>O aluno declarou que as informações acima são verdadeiras e autorizou a Casa Âmbar a armazená-las ' +
    'exclusivamente para a sua segurança durante as práticas, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>' +
    '<div class="assin"><div>Assinatura do aluno</div><div>Data</div></div>' +
    '</body></html>';

  var nomeArquivo = 'Anamnese · ' + v.nome + ' · ' + v.cpf + '.pdf';
  var pasta = pastaAnamneses();
  // substitui a ficha anterior do mesmo aluno
  var antigos = pasta.searchFiles("title contains '" + v.cpf + "'");
  while (antigos.hasNext()) antigos.next().setTrashed(true);
  var pdf = Utilities.newBlob(html, 'text/html', 'ficha.html').getAs('application/pdf').setName(nomeArquivo);
  return pasta.createFile(pdf).getUrl();
}

// ============================================================
//  7) PLANOS, CRÉDITOS E PAGAMENTOS (InfinitePay)
// ============================================================
function numero(v) {
  return Number(String(v == null ? '' : v).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
}

function listarPlanos() {
  var abaPlanos = aba('Planos');
  // aba vazia (criada automaticamente): preenche com o catálogo padrão
  if (abaPlanos.getLastRow() < 2) {
    abaPlanos.getRange('A:E').setNumberFormat('@');
    abaPlanos.getRange(2, 1, CATALOGO_INICIAL.length, CATALOGO_INICIAL[0].length).setValues(CATALOGO_INICIAL);
    SpreadsheetApp.flush();
  }
  // ajuste único: aula avulsa passou a valer 30 dias (antes 60)
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('AVULSA_30_DIAS')) {
    var dadosPlanos = abaPlanos.getDataRange().getValues();
    var cabP = dadosPlanos[0];
    var colTipo = cabP.indexOf('tipo'), colVal = cabP.indexOf('validade_dias'), colDesc = cabP.indexOf('descricao');
    for (var k = 1; k < dadosPlanos.length; k++) {
      if (String(dadosPlanos[k][colTipo]) === 'avulsa' && Number(dadosPlanos[k][colVal]) === 60) {
        abaPlanos.getRange(k + 1, colVal + 1).setValue(30);
        abaPlanos.getRange(k + 1, colDesc + 1).setValue('Uma aula, válida por 30 dias');
      }
    }
    props.setProperty('AVULSA_30_DIAS', 'ok');
  }
  var linhas = abaPlanos.getDataRange().getValues();
  var cab = linhas[0];
  var lista = [];
  for (var i = 1; i < linhas.length; i++) {
    var p = objeto(cab, linhas[i]);
    if (!p.id || String(p.ativo).toUpperCase() === 'NÃO') continue;
    p.preco = numero(p.preco);
    p.aulas_semana = numero(p.aulas_semana);
    p.aulas_total = numero(p.aulas_total);
    p.validade_dias = numero(p.validade_dias) || 30;
    lista.push(p);
  }
  return lista;
}

function buscarPlano(id) {
  return listarPlanos().filter(function (p) { return p.id === id; })[0] || null;
}

function planoPublico(p) {
  return { id: p.id, modalidade: p.modalidade, tipo: p.tipo, nome: p.nome, aulasSemana: p.aulas_semana, aulasTotal: p.aulas_total, validadeDias: p.validade_dias, preco: p.preco, descricao: p.descricao };
}

function creditosDo(cpf) {
  var linhas = aba('Creditos').getDataRange().getValues();
  var cab = linhas[0];
  var lista = [];
  for (var i = 1; i < linhas.length; i++) {
    var c = objeto(cab, linhas[i]);
    if (!c.id || normCpf(c.cpf) !== normCpf(cpf) || String(c.ativo).toUpperCase() === 'NÃO') continue;
    c.inicio = dataTexto(c.inicio);
    c.fim = dataTexto(c.fim);
    c.aulas_semana = numero(c.aulas_semana);
    c.aulas_total = numero(c.aulas_total);
    lista.push(c);
  }
  return lista;
}

// segunda-feira da semana de uma data "aaaa-mm-dd"
function semanaDe(data) {
  var p = data.split('-').map(Number);
  var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  var dia = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dia);
  return d.toISOString().slice(0, 10);
}

function usoDoCredito(c, reservas, dataRef) {
  var minhas = reservas.filter(function (r) { return String(r.credito_id) === String(c.id); });
  if (c.aulas_semana > 0) {
    var sem = semanaDe(dataRef);
    return minhas.filter(function (r) { return semanaDe(partesAula(r).data) === sem; }).length;
  }
  return minhas.length;
}

// Escolhe o crédito que vai pagar esta aula (plano semanal primeiro, depois avulsas)
function escolherCredito(cpf, aula, reservas) {
  var validos = creditosDo(cpf).filter(function (c) {
    return String(c.modalidade).toLowerCase() === aula.modalidade.toLowerCase() && c.inicio <= aula.data && aula.data <= c.fim;
  });
  validos.sort(function (a, b) {
    var pa = a.aulas_semana > 0 ? 0 : 1, pb = b.aulas_semana > 0 ? 0 : 1;
    return pa - pb || String(a.fim).localeCompare(String(b.fim));
  });
  for (var i = 0; i < validos.length; i++) {
    var c = validos[i];
    var limite = c.aulas_semana > 0 ? c.aulas_semana : c.aulas_total;
    if (usoDoCredito(c, reservas, aula.data) < limite) return c;
  }
  return null;
}

function somarDias(data, dias) {
  var p = data.split('-').map(Number);
  var d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + dias));
  return d.toISOString().slice(0, 10);
}

function hojeTexto() {
  return Utilities.formatDate(new Date(), AJUSTES.fuso, 'yyyy-MM-dd');
}

function meuPlano(d) {
  var aluno = alunoDaSessao(d.token);
  var cpf = normCpf(aluno.cpf);
  var reservas = reservasAtivas();
  var hoje = hojeTexto();
  var creditos = creditosDo(cpf)
    .filter(function (c) { return c.fim >= hoje; })
    .map(function (c) {
      var limite = c.aulas_semana > 0 ? c.aulas_semana : c.aulas_total;
      var usadas = usoDoCredito(c, reservas, hoje);
      return { id: c.id, planoId: c.plano_id, descricao: c.descricao, modalidade: c.modalidade, tipo: c.tipo, aulasSemana: c.aulas_semana, aulasTotal: c.aulas_total,
        inicio: c.inicio, fim: c.fim, usadas: usadas, limite: limite, restantes: Math.max(0, limite - usadas) };
    });

  var linhas = aba('Pagamentos').getDataRange().getValues();
  var cab = linhas[0];
  var pagamentos = [];
  for (var i = 1; i < linhas.length; i++) {
    var p = objeto(cab, linhas[i]);
    if (normCpf(p.cpf) !== cpf) continue;
    pagamentos.push({ orderNsu: String(p.order_nsu), descricao: p.descricao, valor: numero(p.valor), status: p.status, criadoEm: String(p.criado_em),
      pagoEm: String(p.pago_em || ''), metodo: p.metodo, parcelas: p.parcelas, recibo: p.recibo, link: p.status === 'pendente' ? p.link : '' });
  }
  pagamentos.reverse();
  return { catalogo: listarPlanos().map(planoPublico), creditos: creditos, pagamentos: pagamentos };
}

function comprar(d) {
  var aluno = alunoDaSessao(d.token);
  var plano = buscarPlano(d.planoId);
  if (!plano) throw new Error('Plano não encontrado.');
  return criarPagamento(aluno, plano, {});
}

function criarPagamento(aluno, plano, extras) {
  var orderNsu = 'P' + Utilities.formatDate(new Date(), AJUSTES.fuso, 'yyMMddHHmmss') + Math.floor(Math.random() * 900 + 100);
  var link = infinitepayCriarLink(plano, aluno, orderNsu);
  aba('Pagamentos').appendRow([orderNsu, normCpf(aluno.cpf), aluno.nome, plano.id, plano.nome, plano.preco, 'pendente', link, agoraTexto(), '', '', '',
    '', '', '', '', extras.reserva_id || '', extras.aula_id || '', extras.tapete || '', '']);
  SpreadsheetApp.flush();
  return { order_nsu: orderNsu, link: link, valor: plano.preco, descricao: plano.nome };
}

function infinitepayCriarLink(plano, aluno, orderNsu) {
  var whats = soDigitos(aluno.whatsapp);
  var corpo = {
    handle: AJUSTES.infinitepayHandle,
    items: [{ quantity: 1, price: Math.round(plano.preco * 100), description: plano.nome }],
    order_nsu: orderNsu,
    redirect_url: AJUSTES.siteUrl + '?pagamento=' + orderNsu,
    webhook_url: AJUSTES.apiUrl,
    customer: { name: aluno.nome, phone_number: whats ? '+55' + whats : undefined, email: aluno.email || undefined },
  };
  var resp = UrlFetchApp.fetch('https://api.checkout.infinitepay.io/links', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(corpo),
    muteHttpExceptions: true,
  });
  var texto = resp.getContentText();
  if (resp.getResponseCode() >= 300) {
    Logger.log('InfinitePay links ' + resp.getResponseCode() + ': ' + texto);
    throw new Error('Não foi possível gerar o pagamento agora (código ' + resp.getResponseCode() + '). Tente de novo em instantes ou fale com a recepção.');
  }
  var j = {};
  try { j = JSON.parse(texto); } catch (e) { /* resposta em texto */ }
  var link = j.url || j.link || j.checkout_url || j.payment_url || (j.data && (j.data.url || j.data.link));
  if (!link) {
    var achado = texto.match(/https:\/\/[^"'\s]+/);
    link = achado ? achado[0] : '';
  }
  if (!link) throw new Error('A InfinitePay não devolveu o link de pagamento.');
  return link;
}

function infinitepayConferir(orderNsu, transactionNsu, slug) {
  var resp = UrlFetchApp.fetch('https://api.checkout.infinitepay.io/payment_check', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ handle: AJUSTES.infinitepayHandle, order_nsu: orderNsu, transaction_nsu: transactionNsu, slug: slug }),
    muteHttpExceptions: true,
  });
  try { return JSON.parse(resp.getContentText()); } catch (e) { return {}; }
}

// Chamado quando a aluna volta da InfinitePay para o site
function confirmarPagamento(d) {
  var aluno = alunoDaSessao(d.token);
  var pg = linhaPagamento(String(d.orderNsu || ''));
  if (!pg || normCpf(pg.cpf) !== normCpf(aluno.cpf)) throw new Error('Pagamento não encontrado.');
  if (pg.status !== 'pago' && d.transactionNsu && d.slug) processarPagamento(pg.order_nsu, d.transactionNsu, d.slug, 'retorno');
  pg = linhaPagamento(pg.order_nsu);
  var reserva = null;
  if (pg.reserva_id) {
    var r = reservasAtivas().filter(function (x) { return x.id === pg.reserva_id; })[0];
    if (r) {
      partesAula(r);
      reserva = { id: r.id, status: r.status, data: r.data, hora: r.hora, modalidade: r.modalidade, professor: r.professor, tapete: r.tapete ? Number(r.tapete) : null };
    }
  }
  return { status: pg.status, descricao: pg.descricao, valor: numero(pg.valor), recibo: pg.recibo, observacao: pg.observacao, reserva: reserva };
}

function linhaPagamento(orderNsu) {
  var linhas = aba('Pagamentos').getDataRange().getValues();
  var cab = linhas[0];
  for (var i = 1; i < linhas.length; i++) {
    if (String(linhas[i][0]) === orderNsu) {
      var p = objeto(cab, linhas[i]);
      p.order_nsu = String(p.order_nsu);
      p._linha = i + 1;
      return p;
    }
  }
  return null;
}

// Confere na InfinitePay e, se aprovado, libera o crédito (e a reserva que estava aguardando)
function processarPagamento(orderNsu, transactionNsu, slug, origem) {
  var trava = LockService.getScriptLock();
  trava.waitLock(20000);
  try {
    var pg = linhaPagamento(orderNsu);
    if (!pg) throw new Error('Pagamento ' + orderNsu + ' não encontrado.');
    if (pg.status === 'pago') return pg;
    if (!transactionNsu || !slug) return pg;

    var conf = infinitepayConferir(orderNsu, transactionNsu, slug);
    var esperado = Math.round(numero(pg.valor) * 100);
    if (!conf || !conf.paid || Number(conf.amount) < esperado) {
      Logger.log('Pagamento não confirmado (' + origem + '): ' + JSON.stringify(conf));
      return pg;
    }

    var s = aba('Pagamentos');
    var col = function (c) { return coluna('Pagamentos', c); };
    s.getRange(pg._linha, col('status')).setValue('pago');
    s.getRange(pg._linha, col('pago_em')).setValue(agoraTexto());
    s.getRange(pg._linha, col('metodo')).setValue(conf.capture_method === 'pix' ? 'Pix' : conf.capture_method === 'credit_card' ? 'Cartão' : String(conf.capture_method || ''));
    s.getRange(pg._linha, col('parcelas')).setValue(conf.installments || 1);
    s.getRange(pg._linha, col('valor_pago')).setValue(Number(conf.paid_amount || conf.amount) / 100);
    s.getRange(pg._linha, col('transaction_nsu')).setValue(String(transactionNsu));
    s.getRange(pg._linha, col('slug')).setValue(String(slug));

    // crédito novo
    var plano = buscarPlano(pg.plano_id) || { id: pg.plano_id, nome: pg.descricao, modalidade: '', tipo: 'avulsa', aulas_semana: 0, aulas_total: 1, validade_dias: 30 };
    var hoje = hojeTexto();
    var creditoId = 'C' + orderNsu.slice(1);
    aba('Creditos').appendRow([creditoId, normCpf(pg.cpf), pg.nome, plano.id, plano.nome, plano.modalidade, plano.tipo, plano.aulas_semana, plano.aulas_total,
      hoje, somarDias(hoje, plano.validade_dias - 1), 'pagamento ' + orderNsu, 'SIM']);

    // reserva que estava aguardando este pagamento
    if (pg.reserva_id) {
      var rs = aba('Reservas');
      var linhas = rs.getDataRange().getValues();
      var cab = linhas[0];
      for (var i = 1; i < linhas.length; i++) {
        var r = objeto(cab, linhas[i]);
        if (r.id !== pg.reserva_id) continue;
        var ocupado = reservasAtivas().some(function (x) {
          return x.id !== r.id && x.aula_id === r.aula_id && r.tapete && Number(x.tapete) === Number(r.tapete);
        });
        if (ocupado || r.status === 'cancelado') {
          s.getRange(pg._linha, col('observacao')).setValue('O lugar foi ocupado antes da confirmação; o crédito ficou disponível.');
        } else {
          rs.getRange(i + 1, coluna('Reservas', 'status')).setValue('reservado');
          rs.getRange(i + 1, coluna('Reservas', 'credito_id')).setValue(creditoId);
          rs.getRange(i + 1, coluna('Reservas', 'expira_ms')).setValue('');
        }
        break;
      }
    }
    SpreadsheetApp.flush();
    return linhaPagamento(orderNsu);
  } finally {
    trava.releaseLock();
  }
}

// ============================================================
//  8) UTILIDADES
// ============================================================
function aba(nome) {
  var ss = planilha();
  var s = ss.getSheetByName(nome);
  if (!s && ABAS[nome]) {
    // aba nova (ex.: Anamneses) ainda não criada: cria com o cabeçalho
    s = ss.insertSheet(nome);
    s.appendRow(ABAS[nome]);
    s.getRange(1, 1, 1, ABAS[nome].length).setFontWeight('bold').setBackground('#2F3821').setFontColor('#E9DDC5');
    s.setFrozenRows(1);
    s.getRange(nome === 'Sessoes' ? 'A:B' : 'A:G').setNumberFormat('@');
  }
  if (!s) throw new Error('Aba "' + nome + '" não encontrada. Execute configurarPlanilha.');
  garantirCabecalho(s, nome);
  return s;
}

// Acrescenta no cabeçalho as colunas novas que uma aba antiga ainda não tem
var _cabecalhoOk = {};
function garantirCabecalho(s, nome) {
  if (_cabecalhoOk[nome] || !ABAS[nome] || !s) return;
  var atual = s.getLastColumn ? s.getRange(1, 1, 1, Math.max(1, s.getLastColumn())).getValues()[0] : [];
  ABAS[nome].forEach(function (col, i) {
    if (String(atual[i] || '') !== col && atual.indexOf(col) < 0) s.getRange(1, i + 1).setValue(col);
  });
  _cabecalhoOk[nome] = true;
}

function coluna(nomeAba, campo) {
  return ABAS[nomeAba].indexOf(campo) + 1;
}

function objeto(cab, linha) {
  var o = {};
  cab.forEach(function (c, i) { o[c] = linha[i]; });
  return o;
}

function soDigitos(v) {
  return String(v || '').replace(/\D/g, '');
}

// CPF sempre com 11 dígitos (a planilha pode apagar o zero da frente)
function normCpf(v) {
  return soDigitos(v).padStart(11, '0');
}

function cpfValido(c) {
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  function calc(n) {
    var soma = 0;
    for (var i = 0; i < n; i++) soma += Number(c[i]) * (n + 1 - i);
    var r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  }
  return calc(9) === Number(c[9]) && calc(10) === Number(c[10]);
}

function agoraTexto() {
  return Utilities.formatDate(new Date(), AJUSTES.fuso, 'yyyy-MM-dd HH:mm:ss');
}

// A planilha converte "2026-10-19" e "06:00" em data/hora no fuso DELA.
// Para ler de volta o valor digitado, formatamos no mesmo fuso da planilha.
function fusoPlanilha() {
  try { return planilha().getSpreadsheetTimeZone() || AJUSTES.fuso; } catch (e) { return AJUSTES.fuso; }
}

function dataTexto(v) {
  if (v instanceof Date) return Utilities.formatDate(v, fusoPlanilha(), 'yyyy-MM-dd');
  return String(v).slice(0, 10);
}

function horaTexto(v) {
  if (v instanceof Date) return Utilities.formatDate(v, fusoPlanilha(), 'HH:mm');
  var s = String(v).trim();
  if (!s) return '';
  var p = s.split(':');
  return ('0' + p[0]).slice(-2) + ':' + ((p[1] || '00') + '0').slice(0, 2);
}

// Início da aula como data real, no fuso de Fortaleza (UTC-3)
function inicio(aula) {
  return new Date(dataTexto(aula.data) + 'T' + horaTexto(aula.hora) + ':00-03:00');
}
