/**
 * ============================================================
 *  CASA ÂMBAR — CLIENTES: sem CPF, importação, histórico,
 *  ficha de estética e evolução com fotos (antes e depois)
 * ============================================================
 *  Cliente sem CPF ganha um código interno de 15 dígitos começando com 9
 *  (nunca é um CPF válido). Ela não entra na área do aluno, mas tem
 *  histórico, pacotes e comandas normalmente. Ao informar o CPF depois,
 *  tudo é transferido para o CPF (e unificado se ela já tinha cadastro).
 */

var CONDICOES_ESTETICA = ['Hipertensão', 'Diabetes', 'Marcapasso ou implante metálico', 'Epilepsia', 'Câncer (atual ou em tratamento recente)',
  'Problemas de circulação ou trombose', 'Doença de pele (psoríase, vitiligo, dermatite)', 'Herpes recorrente', 'Tendência a queloide',
  'Distúrbio de coagulação', 'Gestante ou amamentando', 'Uso de isotretinoína (Roacutan) nos últimos 6 meses'];
var PASTA_FOTOS = 'Casa Âmbar · Fotos de clientes';
// abas que guardam o CPF do cliente (para transferir quando o CPF é informado depois)
var ABAS_COM_CPF = ['Atendimentos', 'Pagamentos', 'Creditos', 'Reservas', 'Vales', 'Comandas', 'Evolucoes', 'FichasEstetica', 'Anamneses'];

function temCpfReal(id) { var d = soDigitos(id); return d.length === 11 && cpfValido(d); }

function idSemCpf() {
  for (var t = 0; t < 30; t++) {
    var id = '9' + Utilities.formatDate(new Date(), AJUSTES.fuso, 'yyMMddHHmmss') + ('0' + Math.floor(Math.random() * 100)).slice(-2);
    if (!buscarAluno(id)) return id;
  }
  throw new Error('Tente de novo em instantes.');
}

function normWhats(v) {
  var d = soDigitos(v);
  if ((d.length === 12 || d.length === 13) && d.slice(0, 2) === '55') d = d.slice(2);
  return d;
}

// acha (pelo WhatsApp) ou cria cliente sem CPF. Quem chama segura a trava, se precisar.
function clienteSemCpf(nome, whatsapp, email, origem) {
  var w = normWhats(whatsapp);
  if (w.length >= 10) {
    var ex = lerAba('Alunos').filter(function (a) { return a.cpf && normWhats(a.whatsapp) === w && ativoSim(a.ativo); });
    // prefere quem já tem CPF de verdade
    ex.sort(function (a, b) { return (temCpfReal(b.cpf) ? 1 : 0) - (temCpfReal(a.cpf) ? 1 : 0); });
    if (ex[0]) return ex[0];
  }
  var id = idSemCpf();
  adicionarLinha('Alunos', { cpf: id, nome: String(nome).trim(), whatsapp: w, email: String(email || '').trim().toLowerCase(), senha_hash: '', sal: '',
    criado_em: agoraTexto(), ativo: 'SIM', origem_cadastro: origem || 'bancada (sem CPF)' });
  SpreadsheetApp.flush();
  return buscarAluno(id);
}

// troca o código interno pelo CPF em todas as abas
function transferirCpf(de, para) {
  de = normCpf(de); para = normCpf(para);
  ABAS_COM_CPF.forEach(function (nome) {
    var col = coluna(nome, 'cpf');
    if (!col) return;
    var s = aba(nome);
    var n = s.getLastRow();
    if (n < 2) return;
    var r = s.getRange(2, col, n - 1, 1);
    var vals = r.getValues();
    var mudou = false;
    for (var i = 0; i < vals.length; i++) {
      if (vals[i][0] !== '' && normCpf(vals[i][0]) === de) { vals[i][0] = para; mudou = true; }
    }
    if (mudou) { s.getRange(2, col, n - 1, 1).setNumberFormat('@'); r.setValues(vals); }
  });
}

function informarCpf(a, cpfNovo, m) {
  var cpf = soDigitos(cpfNovo);
  if (!cpfValido(cpf)) throw new Error('CPF inválido.');
  if (temCpfReal(a.cpf)) throw new Error('Este cadastro já tem CPF.');
  var outro = buscarAluno(cpf);
  transferirCpf(a.cpf, cpf);
  if (outro) {
    // já existia cadastro com este CPF (ex.: criou conta no site): junta os dois
    var mud = {};
    if (!outro.email && a.email) mud.email = a.email;
    if (!soDigitos(outro.whatsapp) && a.whatsapp) mud.whatsapp = a.whatsapp;
    if (!outro.nascimento && a.nascimento) mud.nascimento = a.nascimento;
    if (a.obs_internas) mud.obs_internas = (String(outro.obs_internas || '') + ' ' + a.obs_internas).trim().slice(0, 1000);
    if (Object.keys(mud).length) atualizarLinha('Alunos', outro._linha, mud);
    var velho = lerAba('Alunos').filter(function (x) { return x._linha === a._linha; })[0];
    if (velho) atualizarLinha('Alunos', a._linha, { ativo: 'NÃO', origem_cadastro: 'unificado em ' + cpf });
    registrar(m, 'unificou cadastro', a.nome + ' → ' + cpf);
  } else {
    atualizarLinha('Alunos', a._linha, { cpf: cpf });
    registrar(m, 'informou CPF', a.nome);
  }
  return cpf;
}

// ============================================================
//  IMPORTAR CLIENTES (planilha exportada do Avec ou outro sistema)
// ============================================================
function dataNascimento(v) {
  var s = String(v || '').trim();
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  m = s.match(/^(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?$/);
  if (!m) return '';
  var ano = m[3] ? (m[3].length === 2 ? (Number(m[3]) > 30 ? '19' : '20') + m[3] : m[3]) : '1900';
  return ano + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
}

// linhas: [{ nome, whatsapp, email, cpf, nascimento, obs }]. simular=true só conta.
function bancada_importarClientes(d, m) {
  var linhas = (d.linhas || []).slice(0, 1000);
  var trava = LockService.getScriptLock();
  trava.waitLock(30000);
  try {
    var alunos = lerAba('Alunos');
    var porCpf = {}, porWhats = {}, porEmail = {};
    alunos.forEach(function (a) {
      if (!a.cpf) return;
      porCpf[normCpf(a.cpf)] = a;
      var w = normWhats(a.whatsapp); if (w.length >= 10) porWhats[w] = a;
      var e = String(a.email || '').trim().toLowerCase(); if (e) porEmail[e] = a;
    });
    var novos = [], atualizados = 0, ignorados = [], repetidos = 0;
    var seq = 0;
    linhas.forEach(function (x, i) {
      var nome = String(x.nome || '').replace(/\s+/g, ' ').trim();
      var cpf = soDigitos(x.cpf);
      var w = normWhats(x.whatsapp);
      var email = String(x.email || '').trim().toLowerCase();
      if (!emailValido(email)) email = '';
      if (nome.length < 2) { ignorados.push({ linha: i + 1, motivo: 'sem nome' }); return; }
      if (cpf && !cpfValido(cpf)) cpf = '';
      if (!cpf && w.length < 10 && !email) { ignorados.push({ linha: i + 1, nome: nome, motivo: 'sem CPF, WhatsApp ou e-mail' }); return; }
      var ex = (cpf && porCpf[normCpf(cpf)]) || (w.length >= 10 && porWhats[w]) || (email && porEmail[email]);
      var nasc = dataNascimento(x.nascimento);
      if (ex) {
        var mud = {};
        if (!soDigitos(ex.whatsapp) && w.length >= 10) mud.whatsapp = w;
        if (!ex.email && email) mud.email = email;
        if (!ex.nascimento && nasc) mud.nascimento = nasc;
        if (ex._novo) { repetidos++; return; }
        if (Object.keys(mud).length) { atualizados++; if (!d.simular) atualizarLinha('Alunos', ex._linha, mud); } else repetidos++;
        return;
      }
      var id = cpf || ('9' + Utilities.formatDate(new Date(), AJUSTES.fuso, 'yyMMddHHmm') + ('0000' + seq++).slice(-4));
      var novo = { cpf: id, nome: nome, whatsapp: w, email: email, senha_hash: '', sal: '', criado_em: agoraTexto(), ativo: 'SIM',
        obs_internas: String(x.obs || '').slice(0, 500), origem_cadastro: 'importado', nascimento: nasc, _novo: true };
      novos.push(novo);
      porCpf[normCpf(id)] = novo;
      if (w.length >= 10) porWhats[w] = novo;
      if (email) porEmail[email] = novo;
    });
    if (!d.simular && novos.length) {
      adicionarLinhas('Alunos', novos);
      registrar(m, 'importou clientes', novos.length + ' novos · ' + atualizados + ' atualizados');
    }
    return { novos: novos.length, atualizados: atualizados, repetidos: repetidos, ignorados: ignorados.slice(0, 50), totalIgnorados: ignorados.length,
      semCpf: novos.filter(function (n) { return !temCpfReal(n.cpf); }).length, simulado: !!d.simular };
  } finally {
    trava.releaseLock();
  }
}

// ============================================================
//  PERMISSÃO: quem pode ver os dados de uma cliente
// ============================================================
// admin e recepção: todas. Profissional: só quem ela atende (agenda de serviços).
function cpfComAcesso(d, m) {
  var cpf = '';
  if (d.atendimentoId) {
    var a = lerAba('Atendimentos').filter(function (y) { return y.id === d.atendimentoId; })[0];
    if (!a) throw new Error('Atendimento não encontrado.');
    if (m.papel === 'professora' && !mesmaProfessora(a.profissional, m)) throw new Error('Este atendimento não é seu.');
    cpf = a.cpf ? normCpf(a.cpf) : '';
    if (!cpf) throw new Error('Esta cliente não tem cadastro. Peça à recepção para cadastrar.');
    return cpf;
  }
  if (m.papel === 'professora') throw new Error('Abra pela agenda, no atendimento da cliente.');
  cpf = normCpf(d.cpf || '');
  if (!buscarAluno(cpf)) throw new Error('Cliente não encontrada.');
  return cpf;
}

// ============================================================
//  FICHA DE ESTÉTICA (anamnese de cabine)
// ============================================================
function fichaEsteticaPublica(f) {
  if (!f) return null;
  return { atualizadaEm: String(f.atualizada_em || ''), atualizadaPor: String(f.atualizada_por || '').split('@')[0], queixa: String(f.queixa || ''),
    objetivo: String(f.objetivo || ''), alergias: String(f.alergias || ''), medicamentos: String(f.medicamentos || ''),
    condicoes: String(f.condicoes || '').split(';').map(function (x) { return x.trim(); }).filter(String), acidos: String(f.acidos || ''),
    procedimentos: String(f.procedimentos || ''), exposicaoSolar: String(f.exposicao_solar || ''), fototipo: String(f.fototipo || ''),
    tipoPele: String(f.tipo_pele || ''), obs: String(f.obs || ''), consentimentoFotos: String(f.consentimento_fotos).toUpperCase() === 'SIM' };
}

function linhaFichaEstetica(cpf) {
  return lerAba('FichasEstetica').filter(function (f) { return f.cpf && normCpf(f.cpf) === normCpf(cpf); })[0] || null;
}

function bancada_prontuario(d, m) {
  var cpf = cpfComAcesso(d, m);
  var a = buscarAluno(cpf);
  var ficha = mapaAnamneses()[cpf];
  return { nome: a ? a.nome : '', cpf: m.papel === 'professora' ? '' : cpf, fichaEstetica: fichaEsteticaPublica(linhaFichaEstetica(cpf)),
    condicoes: CONDICOES_ESTETICA, evolucoes: evolucoesDe(cpf), alertaSaude: ficha ? String(ficha.parq_algum_sim) === 'SIM' : false,
    alergiasAnamnese: ficha ? String(ficha.alergias || '') : '' };
}

function bancada_salvarFichaEstetica(d, m) {
  var cpf = cpfComAcesso(d, m);
  var a = buscarAluno(cpf);
  var x = d.ficha || {};
  var t = function (v, n) { return String(v || '').slice(0, n || 500); };
  var linha = { cpf: cpf, nome: a ? a.nome : '', atualizada_em: agoraTexto(), atualizada_por: m.email, queixa: t(x.queixa), objetivo: t(x.objetivo),
    alergias: t(x.alergias), medicamentos: t(x.medicamentos),
    condicoes: (x.condicoes || []).filter(function (c) { return CONDICOES_ESTETICA.indexOf(c) >= 0; }).join('; '),
    acidos: t(x.acidos, 300), procedimentos: t(x.procedimentos), exposicao_solar: t(x.exposicaoSolar, 100), fototipo: t(x.fototipo, 20),
    tipo_pele: t(x.tipoPele, 60), obs: t(x.obs, 1000), consentimento_fotos: x.consentimentoFotos ? 'SIM' : 'NÃO' };
  var ex = linhaFichaEstetica(cpf);
  if (ex) atualizarLinha('FichasEstetica', ex._linha, linha); else adicionarLinha('FichasEstetica', linha);
  registrar(m, 'atualizou ficha de estética', a ? a.nome : cpf);
  return bancada_prontuario(d, m);
}

// ============================================================
//  EVOLUÇÃO (anotações por sessão, com fotos de antes e depois)
// ============================================================
function evolucoesDe(cpf) {
  return lerAba('Evolucoes').filter(function (e) { return e.id && normCpf(e.cpf) === normCpf(cpf); }).map(function (e) {
    return { id: String(e.id), data: dataTexto(e.data), profissional: String(e.profissional || ''), servico: String(e.servico || ''), anotacao: String(e.anotacao || ''),
      fotos: String(e.fotos || '').split(',').filter(String), atendimentoId: String(e.atendimento_id || ''), autor: String(e.criado_por || '').split('@')[0] };
  }).sort(function (a, b) { return b.data.localeCompare(a.data) || b.id.localeCompare(a.id); });
}

function pastaFotos() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('PASTA_FOTOS_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* apagada: cria outra */ }
  }
  var it = DriveApp.getFoldersByName(PASTA_FOTOS);
  var pasta = it.hasNext() ? it.next() : DriveApp.createFolder(PASTA_FOTOS);
  props.setProperty('PASTA_FOTOS_ID', pasta.getId());
  return pasta;
}

function salvarFoto(dataUrl, nome) {
  var m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) throw new Error('Foto inválida. Use JPG ou PNG.');
  if (m[2].length > 3000000) throw new Error('Foto muito grande.');
  var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), 'image/' + m[1], nome + '.' + (m[1] === 'jpeg' ? 'jpg' : m[1]));
  return pastaFotos().createFile(blob).getId();
}

function bancada_salvarEvolucao(d, m) {
  var cpf = cpfComAcesso(d, m);
  var a = buscarAluno(cpf);
  var anot = String(d.anotacao || '').trim().slice(0, 3000);
  var fotos = (d.fotos || []).slice(0, 6);
  if (!anot && !fotos.length) throw new Error('Escreva a anotação ou adicione uma foto.');
  var atend = d.atendimentoId ? lerAba('Atendimentos').filter(function (y) { return y.id === d.atendimentoId; })[0] : null;
  var id = novoId('EV');
  var ids = fotos.map(function (f, i) { return salvarFoto(f, cpf + ' · ' + id + ' · ' + (i + 1)); });
  adicionarLinha('Evolucoes', { id: id, cpf: cpf, nome: a ? a.nome : '', data: dataValida(d.data, atend ? dataTexto(atend.data) : hojeTexto()),
    profissional: atend ? atend.profissional : (m.professor_nome || m.nome), atendimento_id: atend ? atend.id : '', servico: atend ? atend.servico : String(d.servico || '').slice(0, 100),
    anotacao: anot, fotos: ids.join(','), criado_por: m.email, criado_em: agoraTexto() });
  registrar(m, 'registrou evolução', (a ? a.nome : cpf) + (ids.length ? ' · ' + ids.length + ' foto(s)' : ''));
  return bancada_prontuario(d, m);
}

function bancada_excluirEvolucao(d, m) {
  var e = lerAba('Evolucoes').filter(function (x) { return String(x.id) === String(d.id); })[0];
  if (!e) throw new Error('Registro não encontrado.');
  if (m.papel !== 'admin' && String(e.criado_por).toLowerCase() !== m.email) throw new Error('Só quem registrou (ou a administração) pode apagar.');
  String(e.fotos || '').split(',').filter(String).forEach(function (fid) {
    try { DriveApp.getFileById(fid).setTrashed(true); } catch (err) { /* já apagada */ }
  });
  aba('Evolucoes').deleteRow(e._linha);
  registrar(m, 'apagou evolução', e.nome + ' · ' + dataTexto(e.data));
  return true;
}

// a foto só sai se pertencer a uma evolução que esta pessoa pode ver
function bancada_foto(d, m) {
  var id = String(d.id || '');
  if (!/^[A-Za-z0-9_-]{10,}$/.test(id)) throw new Error('Foto inválida.');
  var e = lerAba('Evolucoes').filter(function (x) { return String(x.fotos || '').split(',').indexOf(id) >= 0; })[0];
  if (!e) throw new Error('Foto não encontrada.');
  if (m.papel === 'professora') {
    var atende = lerAba('Atendimentos').some(function (a) { return a.cpf && normCpf(a.cpf) === normCpf(e.cpf) && mesmaProfessora(a.profissional, m); });
    if (!atende) throw new Error('Esta cliente não é sua.');
  }
  var b = DriveApp.getFileById(id).getBlob();
  return 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes());
}

// ============================================================
//  HISTÓRICO COMPLETO (linha do tempo da cliente)
// ============================================================
function historicoCliente(cpf) {
  var ev = [];
  lerAba('Atendimentos').forEach(function (a) {
    if (!a.id || !a.cpf || normCpf(a.cpf) !== cpf) return;
    ev.push({ data: dataTexto(a.data), hora: horaTexto(a.hora), tipo: 'servico', titulo: a.servico, detalhe: 'com ' + a.profissional, status: String(a.status),
      valor: numero(a.valor), categoria: String(a.categoria) });
  });
  todasReservas().forEach(function (r) {
    if (normCpf(r.cpf) !== cpf || r.status === 'pendente') return;
    ev.push({ data: r.data, hora: r.hora, tipo: 'aula', titulo: r.modalidade, detalhe: 'com ' + r.professor + (r.tapete ? ' · tapete ' + r.tapete : ''), status: String(r.status) });
  });
  lerAba('Pagamentos').forEach(function (p) {
    if (!p.cpf || normCpf(p.cpf) !== cpf || p.status !== 'pago') return;
    ev.push({ data: String(p.pago_em || p.criado_em).slice(0, 10), hora: String(p.pago_em || '').slice(11, 16), tipo: String(p.tipo_item) === 'produto' ? 'produto' : 'compra',
      titulo: String(p.descricao), detalhe: (p.metodo || '') + (p.comanda ? ' · comanda' : ''), valor: numero(p.valor), status: 'pago' });
  });
  lerAba('Vales').forEach(function (v) {
    if (!v.cpf || normCpf(v.cpf) !== cpf) return;
    ev.push({ data: String(v.criado_em).slice(0, 10), hora: '', tipo: 'vale', titulo: 'Vale-presente ' + v.codigo, detalhe: String(v.motivo || v.campanha || ''), status: String(v.status) });
  });
  evolucoesDe(cpf).forEach(function (e) {
    ev.push({ data: e.data, hora: '', tipo: 'evolucao', titulo: 'Evolução' + (e.servico ? ' · ' + e.servico : ''), detalhe: e.anotacao.slice(0, 140) + (e.fotos.length ? ' · ' + e.fotos.length + ' foto(s)' : ''), status: '' });
  });
  return ev.sort(function (a, b) { return (b.data + b.hora).localeCompare(a.data + a.hora); }).slice(0, 300);
}

// última visita (aula com presença ou serviço atendido), por cliente
function ultimasVisitas() {
  var u = {};
  var marca = function (cpf, data) { if (cpf && (!u[cpf] || data > u[cpf])) u[cpf] = data; };
  var hoje = hojeTexto();
  todasReservas().forEach(function (r) { if ((r.status === 'check-in' || r.status === 'reservado') && r.data <= hoje) marca(normCpf(r.cpf), r.data); });
  lerAba('Atendimentos').forEach(function (a) { if (a.cpf && a.status === 'atendido') marca(normCpf(a.cpf), dataTexto(a.data)); });
  return u;
}
