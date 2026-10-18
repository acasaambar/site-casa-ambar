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
};

var ABAS = {
  Grade: ['ativo', 'modalidade', 'dia_semana', 'hora', 'professor', 'capacidade'],
  Alunos: ['cpf', 'nome', 'whatsapp', 'email', 'senha_hash', 'sal', 'criado_em', 'ativo'],
  Reservas: ['id', 'aula_id', 'data', 'hora', 'modalidade', 'professor', 'cpf', 'nome', 'tapete', 'status', 'criada_em', 'checkin_em', 'cancelada_em'],
  Sessoes: ['token', 'cpf', 'criada_em', 'expira_em'],
  Bloqueios: ['data', 'hora', 'modalidade', 'motivo'],
  Anamneses: ['cpf', 'nome', 'preenchida_em', 'data_nascimento', 'emergencia_nome', 'emergencia_parentesco', 'emergencia_telefone', 'plano_saude',
    'parq_1', 'parq_2', 'parq_3', 'parq_4', 'parq_5', 'parq_6', 'parq_7', 'parq_algum_sim',
    'comorbidades', 'comorbidade_outra', 'gestante', 'gestante_semanas', 'cirurgias', 'lesoes', 'medicamentos', 'alergias',
    'atividade_regular', 'observacoes', 'declaracao', 'consentimento', 'pdf'],
};

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
  pastaAnamneses(); // cria a pasta no Drive, se ainda não existir

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
    };
    var fn = acoes[corpo.acao];
    if (!fn) return responder(false, null, 'Ação desconhecida.');
    return responder(true, fn(corpo));
  } catch (err) {
    return responder(false, null, err.message || String(err));
  }
}

// Versão do código (muda a cada atualização publicada)
var VERSAO = '2026-10-18 · v4 (datas no fuso certo)';

function doGet() {
  return responder(true, { status: 'Casa Âmbar API no ar', versao: VERSAO });
}

function responder(ok, dados, erro) {
  return ContentService.createTextOutput(JSON.stringify({ ok: ok, dados: dados, erro: erro || null }))
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
    if (r.status !== 'cancelado') lista.push(r);
  }
  return lista;
}

function montarAula(aula, reservas, cpf) {
  var daAula = reservas.filter(function (r) { return r.aula_id === aula.id; });
  var minha = daAula.filter(function (r) { return normCpf(r.cpf) === normCpf(cpf); })[0];
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

  var trava = LockService.getScriptLock();
  trava.waitLock(20000);
  try {
    var m = montarAula(aula, reservasAtivas(), normCpf(aluno.cpf));
    if (m.minhaReserva) throw new Error('Você já tem reserva nesta aula.');
    if (m.ocupadosQtd >= aula.capacidade) throw new Error('Aula lotada.');
    var tapete = '';
    if (aula.modalidade === 'Yoga') {
      tapete = Number(d.tapete);
      if (!tapete || tapete < 1 || tapete > aula.capacidade) throw new Error('Escolha um tapete.');
      if (m.ocupados.indexOf(tapete) >= 0) throw new Error('O tapete ' + tapete + ' acabou de ser reservado. Escolha outro.');
    }
    var id = 'R' + Utilities.formatDate(new Date(), AJUSTES.fuso, 'yyMMddHHmmss') + Math.floor(Math.random() * 90 + 10);
    aba('Reservas').appendRow([id, aula.id, aula.data, aula.hora, aula.modalidade, aula.professor, normCpf(aluno.cpf), aluno.nome, tapete, 'reservado', agoraTexto(), '', '']);
    SpreadsheetApp.flush();
    return { id: id, aulaId: aula.id, data: aula.data, hora: aula.hora, modalidade: aula.modalidade, professor: aula.professor, tapete: tapete || null, status: 'reservado' };
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
    if (normCpf(r.cpf) !== normCpf(aluno.cpf) || r.status === 'cancelado') continue;
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
//  7) UTILIDADES
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
  return s;
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
