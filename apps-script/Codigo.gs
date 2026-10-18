/**
 * ============================================================
 *  CASA ÂMBAR — BACKEND DE RESERVAS (Google Apps Script)
 *  Banco de dados: a planilha onde este script está instalado.
 * ============================================================
 *
 *  COMO INSTALAR (uma vez só):
 *  1. Crie uma planilha nova no Google Sheets (conta da Casa Âmbar).
 *  2. Menu Extensões → Apps Script. Apague o que houver e cole este arquivo inteiro.
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
};

// ============================================================
//  1) CONFIGURAÇÃO INICIAL — execute uma vez
// ============================================================
function configurarPlanilha() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
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
  SpreadsheetApp.getUi && Logger.log('Planilha configurada!');
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
    };
    var fn = acoes[corpo.acao];
    if (!fn) return responder(false, null, 'Ação desconhecida.');
    return responder(true, fn(corpo));
  } catch (err) {
    return responder(false, null, err.message || String(err));
  }
}

function doGet() {
  return responder(true, { status: 'Casa Âmbar API no ar' });
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
  aba('Sessoes').appendRow([token, cpf, agoraTexto(), expira.toISOString()]);
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
        cpf = String(linhas[i][1]);
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
    if (soDigitos(linhas[i][0]).padStart(11, '0') === cpf) return objeto(cab, linhas[i]);
  }
  return null;
}

function publico(a) {
  return { nome: a.nome, cpf: String(a.cpf), whatsapp: String(a.whatsapp) };
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
  var minha = daAula.filter(function (r) { return String(r.cpf) === cpf; })[0];
  aula.ocupados = aula.modalidade === 'Yoga' ? daAula.map(function (r) { return Number(r.tapete); }) : [];
  aula.ocupadosQtd = daAula.length;
  aula.minhaReserva = minha ? { id: minha.id, tapete: minha.tapete ? Number(minha.tapete) : null } : null;
  return aula;
}

function listarAulas(d) {
  var aluno = alunoDaSessao(d.token);
  var reservas = reservasAtivas();
  return gerarAulas().map(function (a) { return montarAula(a, reservas, String(aluno.cpf)); });
}

function detalharAula(d) {
  var aluno = alunoDaSessao(d.token);
  var aula = gerarAulas().filter(function (a) { return a.id === d.aulaId; })[0];
  if (!aula) throw new Error('Aula não encontrada.');
  return montarAula(aula, reservasAtivas(), String(aluno.cpf));
}

// ============================================================
//  5) RESERVAS (com trava: dois alunos nunca ficam com o mesmo tapete)
// ============================================================
function reservar(d) {
  var aluno = alunoDaSessao(d.token);
  var aula = gerarAulas().filter(function (a) { return a.id === d.aulaId; })[0];
  if (!aula) throw new Error('Aula não encontrada.');
  if (inicio(aula) < new Date()) throw new Error('Esta aula já começou.');

  var trava = LockService.getScriptLock();
  trava.waitLock(20000);
  try {
    var m = montarAula(aula, reservasAtivas(), String(aluno.cpf));
    if (m.minhaReserva) throw new Error('Você já tem reserva nesta aula.');
    if (m.ocupadosQtd >= aula.capacidade) throw new Error('Aula lotada.');
    var tapete = '';
    if (aula.modalidade === 'Yoga') {
      tapete = Number(d.tapete);
      if (!tapete || tapete < 1 || tapete > aula.capacidade) throw new Error('Escolha um tapete.');
      if (m.ocupados.indexOf(tapete) >= 0) throw new Error('O tapete ' + tapete + ' acabou de ser reservado. Escolha outro.');
    }
    var id = 'R' + Utilities.formatDate(new Date(), AJUSTES.fuso, 'yyMMddHHmmss') + Math.floor(Math.random() * 90 + 10);
    aba('Reservas').appendRow([id, aula.id, aula.data, aula.hora, aula.modalidade, aula.professor, String(aluno.cpf), aluno.nome, tapete, 'reservado', agoraTexto(), '', '']);
    SpreadsheetApp.flush();
    return { id: id, aulaId: aula.id, data: aula.data, hora: aula.hora, modalidade: aula.modalidade, professor: aula.professor, tapete: tapete || null, status: 'reservado' };
  } finally {
    trava.releaseLock();
  }
}

function acharMinhaReserva(d) {
  var aluno = alunoDaSessao(d.token);
  var r = reservasAtivas().filter(function (x) { return x.id === d.reservaId && String(x.cpf) === String(aluno.cpf); })[0];
  if (!r) throw new Error('Reserva não encontrada.');
  return r;
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
    if (String(r.cpf) !== String(aluno.cpf) || r.status === 'cancelado') continue;
    lista.push({
      id: r.id, aulaId: r.aula_id, data: dataTexto(r.data), hora: horaTexto(r.hora),
      modalidade: r.modalidade, professor: r.professor, tapete: r.tapete ? Number(r.tapete) : null, status: r.status,
    });
  }
  return lista.sort(function (a, b) { return (a.data + a.hora).localeCompare(b.data + b.hora); });
}

// ============================================================
//  6) UTILIDADES
// ============================================================
function aba(nome) {
  var s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nome);
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

function dataTexto(v) {
  if (v instanceof Date) return Utilities.formatDate(v, AJUSTES.fuso, 'yyyy-MM-dd');
  return String(v).slice(0, 10);
}

function horaTexto(v) {
  if (v instanceof Date) return Utilities.formatDate(v, AJUSTES.fuso, 'HH:mm');
  var s = String(v).trim();
  if (!s) return '';
  var p = s.split(':');
  return ('0' + p[0]).slice(-2) + ':' + ((p[1] || '00') + '0').slice(0, 2);
}

// Início da aula como data real, no fuso de Fortaleza (UTC-3)
function inicio(aula) {
  return new Date(dataTexto(aula.data) + 'T' + horaTexto(aula.hora) + ':00-03:00');
}
