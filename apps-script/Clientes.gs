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
var ABAS_COM_CPF = ['Atendimentos', 'Pagamentos', 'Creditos', 'Reservas', 'Vales', 'Comandas', 'Evolucoes', 'FichasEstetica', 'Anamneses', 'AnamnesesProf', 'Espera'];

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

// ---------------- endereço (nota fiscal) e "Como nos conheceu?" ----------------
// (as opções da lista ficam no site: src/lib/clientes.js; aqui só se limpa o texto)
function textoComoConheceu(v) {
  return String(v || '').replace(/\s+/g, ' ').trim().slice(0, 60);
}

// só os campos informados (para editar sem apagar o resto)
function enderecoDe(x) {
  x = x || {};
  var o = {};
  var txt = function (v, n) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n); };
  if (x.cep != null) {
    var c = soDigitos(x.cep);
    if (c && c.length !== 8) throw new Error('O CEP tem 8 números.');
    o.cep = c ? c.slice(0, 5) + '-' + c.slice(5) : '';
  }
  if (x.endereco != null) o.endereco = txt(x.endereco, 120);
  if (x.numero != null) o.numero = txt(x.numero, 15);
  if (x.complemento != null) o.complemento = txt(x.complemento, 60);
  if (x.bairro != null) o.bairro = txt(x.bairro, 60);
  if (x.cidade != null) o.cidade = txt(x.cidade, 60);
  if (x.uf != null) {
    var uf = txt(x.uf, 2).toUpperCase();
    if (uf && !/^[A-Z]{2}$/.test(uf)) throw new Error('UF com 2 letras (ex.: CE).');
    o.uf = uf;
  }
  return o;
}

// endereço completo (para nota fiscal): só o complemento é opcional
var CAMPOS_ENDERECO = [['cep', 'CEP'], ['endereco', 'rua'], ['numero', 'número'], ['bairro', 'bairro'], ['cidade', 'cidade'], ['uf', 'UF']];
function exigirEndereco(o) {
  var falta = CAMPOS_ENDERECO.filter(function (c) { return !String(o[c[0]] || '').trim(); }).map(function (c) { return c[1]; });
  if (falta.length) throw new Error('Complete o endereço: ' + falta.join(', ') + '.');
  return o;
}
function temEndereco(a) {
  return CAMPOS_ENDERECO.every(function (c) { return String(a[c[0]] == null ? '' : a[c[0]]).trim(); });
}

// área do aluno: a aluna completa o próprio endereço
function salvarEndereco(d) {
  var aluno = alunoDaSessao(d.token);
  var e = exigirEndereco(enderecoDe(d.endereco || {}));
  atualizarLinha('Alunos', aluno._linha, e);
  return publico(buscarAluno(aluno.cpf));
}

function enderecoPublico(a) {
  return { cep: String(a.cep || ''), endereco: String(a.endereco || ''), numero: String(a.numero == null ? '' : a.numero), complemento: String(a.complemento || ''),
    bairro: String(a.bairro || ''), cidade: String(a.cidade || ''), uf: String(a.uf || '') };
}

// ============================================================
//  MINHA CONTA (área do aluno): a aluna vê e corrige os próprios dados.
//  CPF não muda (é o login). Trocar e-mail ou senha pede a senha atual.
// ============================================================
function contaPublica(a) {
  var cpf = normCpf(a.cpf);
  var nasc = ehData(a.nascimento) ? dataTexto(a.nascimento) : String(a.nascimento || '').slice(0, 10);
  // uma leitura só da ficha de saúde: diz se ela existe e traz a data de nascimento (se ainda não informada aqui)
  var s = abaSemDescartar('Anamneses'), n = s.getLastRow(), ficha = null;
  if (n >= 2) {
    var colN = ABAS.Anamneses.indexOf('data_nascimento') + 1;
    var v = s.getRange(2, 1, n - 1, colN).getValues();
    for (var i = 0; i < v.length && !ficha; i++) if (normCpf(v[i][0]) === cpf) ficha = v[i];
    if (ficha && !nasc) nasc = ehData(ficha[colN - 1]) ? dataTexto(ficha[colN - 1]) : String(ficha[colN - 1] || '').slice(0, 10);
  }
  return { aluno: publico(a, !!ficha), nome: String(a.nome || ''), cpf: cpf, whatsapp: soDigitos(a.whatsapp), email: String(a.email || ''),
    nascimento: /^\d{4}-\d{2}-\d{2}$/.test(nasc) ? nasc : '', novidades: String(a.marketing).toUpperCase() !== 'NÃO', endereco: enderecoPublico(a) };
}

function minhaConta(d) {
  return contaPublica(alunoDaSessao(d.token));
}

// dados: { nome, whatsapp, nascimento, novidades, endereco } (só o que vier é alterado)
function salvarConta(d) {
  var a = alunoDaSessao(d.token);
  var x = d.dados || {};
  var mud = {};
  if (x.nome != null) {
    var nome = String(x.nome).replace(/\s+/g, ' ').trim();
    if (nome.split(' ').length < 2) throw new Error('Informe nome e sobrenome.');
    if (nome.length > 100) throw new Error('Nome muito longo.');
    mud.nome = nome;
  }
  if (x.whatsapp != null) {
    var w = normWhats(x.whatsapp);
    if (w.length < 10 || w.length > 11) throw new Error('Informe um WhatsApp com DDD.');
    mud.whatsapp = w;
  }
  if (x.nascimento != null) {
    var n = String(x.nascimento);
    var ano = Number(n.slice(0, 4));
    if (n && (!/^\d{4}-\d{2}-\d{2}$/.test(n) || ano < 1900 || n > hojeTexto())) throw new Error('Confira a data de nascimento.');
    mud.nascimento = n;
  }
  if (x.novidades != null) mud.marketing = x.novidades ? '' : 'NÃO';
  if (x.endereco) Object.assign(mud, exigirEndereco(enderecoDe(x.endereco)));
  if (Object.keys(mud).length) atualizarLinha('Alunos', a._linha, mud);
  return contaPublica(buscarAluno(a.cpf));
}

// senha atual da aluna logada: mesmo limite de tentativas do login
function conferirSenhaAtual(a, senha) {
  var chave = 'a_' + normCpf(a.cpf);
  limitarTentativas(chave);
  if (!verificarSenha(senha, a.senha_hash, a.sal).ok) {
    registrarFalha(chave);
    Utilities.sleep(600);
    throw erroCod('A senha atual não confere.', 'SENHA_ATUAL');
  }
  limparFalhas(chave);
}

function avisarAluna(email, assunto, titulo, paragrafos) {
  if (!emailValido(email)) return;
  try {
    enviarEmail(email, assunto, titulo, paragrafos);
  } catch (e) { Logger.log('aviso da conta: ' + e.message); }
}

function trocarEmail(d) {
  var a = alunoDaSessao(d.token);
  var novo = String(d.email || '').trim().toLowerCase();
  if (!emailValido(novo)) throw new Error('Informe um e-mail válido.');
  conferirSenhaAtual(a, d.senha);
  var antigo = String(a.email || '').trim().toLowerCase();
  if (novo !== antigo) {
    atualizarLinha('Alunos', a._linha, { email: novo });
    // o e-mail antigo fica sabendo (se não foi ela, procura a recepção)
    avisarAluna(antigo, 'Seu e-mail foi alterado · Casa Âmbar', 'E-mail alterado', ['Olá, ' + primeiroNome(a.nome) + '.',
      'O e-mail da sua conta na Casa Âmbar foi trocado para ' + mascararEmail(novo) + '. A partir de agora, os avisos e o "Esqueci minha senha" vão para ele.',
      'Se não foi você, fale com a recepção pelo WhatsApp (85) 99185-6528.']);
  }
  return contaPublica(buscarAluno(a.cpf));
}

// troca a senha, desconecta os outros aparelhos e devolve uma sessão nova para este
function trocarSenha(d) {
  var a = alunoDaSessao(d.token);
  validarSenhaNova(d.senha);
  conferirSenhaAtual(a, d.senhaAtual);
  if (String(d.senha) === String(d.senhaAtual)) throw new Error('A nova senha precisa ser diferente da atual.');
  gravarSenha('Alunos', a._linha, d.senha);
  encerrarSessoes('Sessoes', 's_', normCpf(a.cpf));
  var token = criarSessao(a.cpf);
  avisarAluna(a.email, 'Sua senha foi alterada · Casa Âmbar', 'Senha alterada', ['Olá, ' + primeiroNome(a.nome) + '.',
    'A senha da sua conta na Casa Âmbar acabou de ser trocada e os outros aparelhos foram desconectados.',
    'Se não foi você, use "Esqueci minha senha" no site e fale com a recepção pelo WhatsApp (85) 99185-6528.']);
  return { token: token, aluno: publico(buscarAluno(a.cpf)) };
}

// acha (pelo WhatsApp) ou cria cliente sem CPF. Quem chama segura a trava, se precisar.
// cadastro ativo com este WhatsApp e outro nome (para perguntar antes de juntar duas pessoas)
function outroComMesmoWhats(nome, whatsapp) {
  var w = normWhats(whatsapp);
  if (w.length < 10) return null;
  var ex = lerAba('Alunos').filter(function (a) { return a.cpf && normWhats(a.whatsapp) === w && ativoSim(a.ativo); });
  if (!ex.length || ex.some(function (a) { return semAcento(a.nome) === semAcento(nome); })) return null;
  return ex[0];
}
// outraPessoa: mesmo WhatsApp, mas é outra pessoa (mãe e filha) → cria cadastro novo
function clienteSemCpf(nome, whatsapp, email, origem, outraPessoa) {
  var w = normWhats(whatsapp);
  if (w.length >= 10 && !outraPessoa) {
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
  esperarTrava(trava, 30000);
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
      var end = {};
      try { end = enderecoDe({ cep: x.cep, endereco: x.endereco, numero: x.numero, complemento: x.complemento, bairro: x.bairro, cidade: x.cidade, uf: x.uf }); } catch (e) { end = {}; }
      if (x.comoConheceu) end.como_conheceu = textoComoConheceu(x.comoConheceu);
      if (ex) {
        var mud = {};
        if (!soDigitos(ex.whatsapp) && w.length >= 10) mud.whatsapp = w;
        if (!ex.email && email) mud.email = email;
        if (!ex.nascimento && nasc) mud.nascimento = nasc;
        Object.keys(end).forEach(function (k) { if (end[k] && !String(ex[k] || '').trim()) mud[k] = end[k]; });
        if (ex._novo) { repetidos++; return; }
        if (Object.keys(mud).length) { atualizados++; if (!d.simular) atualizarLinha('Alunos', ex._linha, mud); } else repetidos++;
        return;
      }
      var id = cpf || ('9' + Utilities.formatDate(new Date(), AJUSTES.fuso, 'yyMMddHHmm') + ('0000' + seq++).slice(-4));
      var novo = { cpf: id, nome: nome, whatsapp: w, email: email, senha_hash: '', sal: '', criado_em: agoraTexto(), ativo: 'SIM',
        obs_internas: String(x.obs || '').slice(0, 500), origem_cadastro: 'importado', nascimento: nasc, _novo: true };
      Object.keys(end).forEach(function (k) { novo[k] = end[k]; });
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
    if (!cpf) throw new Error('Esta pessoa ainda não tem cadastro. Peça à recepção para cadastrar.');
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
  return pastaPrivada(PASTA_FOTOS, 'PASTA_FOTOS_ID');
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
  registrar(m, 'registrou evolução', (a ? a.nome : cpf) + (ids.length ? ' · ' + plural(ids.length, 'foto', 'fotos') : ''));
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

// profissional: só clientes que ela atende (algum atendimento com ela, de qualquer data)
function profissionalAtende(cpf, m) {
  return lerAba('Atendimentos').some(function (a) { return a.cpf && normCpf(a.cpf) === normCpf(cpf) && mesmaProfessora(a.profissional, m); });
}

// a foto só sai se pertencer a uma evolução ou anamnese que esta pessoa pode ver
function bancada_foto(d, m) {
  var id = String(d.id || '');
  if (!/^[A-Za-z0-9_-]{10,}$/.test(id)) throw new Error('Foto inválida.');
  var temFoto = function (x) { return String(x.fotos || '').split(',').indexOf(id) >= 0; };
  var e = lerAba('Evolucoes').filter(temFoto)[0] || lerAba('AnamnesesProf').filter(temFoto)[0];
  if (!e) throw new Error('Foto não encontrada.');
  if (m.papel === 'professora' && !profissionalAtende(e.cpf, m)) throw new Error('Esta cliente não é sua.');
  var b = DriveApp.getFileById(id).getBlob();
  return 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes());
}

// ============================================================
//  ANAMNESE DAS PROFISSIONAIS (texto livre, sem limite, com fotos)
//  Até ~44 mil caracteres o texto fica na planilha (rápido); acima disso vai para
//  um arquivo de texto na pasta privada do Drive e a planilha guarda só o começo.
// ============================================================
var MAX_TEXTO_ANAMNESE = 1000000;
var MAX_FOTOS_ANAMNESE = 30;

function conteudoAnamnese(texto, nome, arquivoAntigo) {
  var inline = JSON.stringify({ t: texto });
  if (inline.length <= 44000) {
    if (arquivoAntigo) { try { DriveApp.getFileById(arquivoAntigo).setTrashed(true); } catch (e) { /* já apagado */ } }
    return inline;
  }
  var id = '';
  if (arquivoAntigo) {
    try { DriveApp.getFileById(arquivoAntigo).setContent(texto); id = arquivoAntigo; } catch (e) { id = ''; }
  }
  if (!id) id = pastaFotos().createFile(Utilities.newBlob(texto, 'text/plain', nome + '.txt')).getId();
  return JSON.stringify({ arq: id, p: texto.slice(0, 1500), n: texto.length });
}

function lerConteudoAnamnese(c, completo) {
  var o = parseJson(c, {});
  if (o.arq) {
    if (!completo) return { texto: String(o.p || ''), longo: true, tamanho: numero(o.n), arquivo: String(o.arq) };
    try { return { texto: DriveApp.getFileById(o.arq).getBlob().getDataAsString(), longo: false, tamanho: numero(o.n), arquivo: String(o.arq) }; }
    catch (e) { return { texto: String(o.p || '') + '\n\n(não foi possível abrir o texto completo)', longo: false, tamanho: numero(o.n), arquivo: String(o.arq) }; }
  }
  return { texto: String(o.t || ''), longo: false, tamanho: String(o.t || '').length, arquivo: '' };
}

function anamneseProfPublica(x, m, completo) {
  var c = lerConteudoAnamnese(x.conteudo, completo);
  var autor = String(x.criado_por || '').toLowerCase();
  return { id: String(x.id), titulo: String(x.titulo || ''), texto: c.texto, longo: c.longo, tamanho: c.tamanho,
    fotos: String(x.fotos || '').split(',').filter(String), profissional: String(x.profissional || ''), autor: autor.split('@')[0],
    criadoEm: String(x.criado_em || ''), atualizadoEm: String(x.atualizado_em || ''), atualizadoPor: String(x.atualizado_por || '').split('@')[0],
    podeEditar: m.papel === 'admin' || autor === m.email };
}

function anamnesesProfDe(cpf) {
  return lerAba('AnamnesesProf').filter(function (x) { return x.id && normCpf(x.cpf) === normCpf(cpf); });
}

function bancada_anamnesesProf(d, m) {
  var cpf = cpfComAcesso(d, m);
  var a = buscarAluno(cpf);
  return { nome: a ? a.nome : '', anotacoes: anamnesesProfDe(cpf).map(function (x) { return anamneseProfPublica(x, m, false); })
    .sort(function (x, y) { return y.criadoEm.localeCompare(x.criadoEm); }) };
}

// texto completo de uma anamnese longa
function bancada_anamneseProf(d, m) {
  var x = lerAba('AnamnesesProf').filter(function (y) { return String(y.id) === String(d.id); })[0];
  if (!x) throw new Error('Anamnese não encontrada.');
  if (m.papel === 'professora' && !profissionalAtende(x.cpf, m)) throw new Error('Esta cliente não é sua.');
  return anamneseProfPublica(x, m, true);
}

// d: { atendimentoId | cpf, id (para editar), titulo, texto, fotos: [dataUrl novas], remover: [ids] }
function bancada_salvarAnamneseProf(d, m) {
  var cpf = cpfComAcesso(d, m);
  var a = buscarAluno(cpf);
  var texto = String(d.texto == null ? '' : d.texto).replace(/\r\n/g, '\n');
  if (texto.length > MAX_TEXTO_ANAMNESE) throw new Error('Texto longo demais (máximo de 1 milhão de caracteres).');
  var titulo = String(d.titulo || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  var novas = (d.fotos || []).slice(0, MAX_FOTOS_ANAMNESE);
  var ex = d.id ? lerAba('AnamnesesProf').filter(function (y) { return String(y.id) === String(d.id); })[0] : null;
  if (d.id && !ex) throw new Error('Anamnese não encontrada.');
  if (ex && normCpf(ex.cpf) !== cpf) throw new Error('Esta anamnese é de outra pessoa.');
  if (ex && m.papel !== 'admin' && String(ex.criado_por).toLowerCase() !== m.email) throw new Error('Só quem escreveu (ou a administração) pode editar.');
  var fotosAntes = ex ? String(ex.fotos || '').split(',').filter(String) : [];
  var remover = (d.remover || []).map(String).filter(function (f) { return fotosAntes.indexOf(f) >= 0; });
  if (fotosAntes.length - remover.length + novas.length > MAX_FOTOS_ANAMNESE) throw new Error('No máximo ' + MAX_FOTOS_ANAMNESE + ' fotos por anamnese.');
  if (!texto.trim() && !novas.length && fotosAntes.length === remover.length) throw new Error('Escreva a anamnese ou adicione uma foto.');
  var id = ex ? String(ex.id) : novoId('AN');
  var ids = novas.map(function (f, i) { return salvarFoto(f, cpf + ' · ' + id + ' · ' + (fotosAntes.length + i + 1)); });
  remover.forEach(function (f) { try { DriveApp.getFileById(f).setTrashed(true); } catch (e) { /* já apagada */ } });
  var fotos = fotosAntes.filter(function (f) { return remover.indexOf(f) < 0; }).concat(ids);
  var arquivoAntigo = ex ? lerConteudoAnamnese(ex.conteudo, false).arquivo : '';
  var linha = { titulo: titulo || 'Anamnese', conteudo: conteudoAnamnese(texto, cpf + ' · ' + id, arquivoAntigo), fotos: fotos.join(','),
    atualizado_por: m.email, atualizado_em: agoraTexto() };
  if (ex) atualizarLinha('AnamnesesProf', ex._linha, linha);
  else {
    linha.id = id; linha.cpf = cpf; linha.nome = a ? a.nome : ''; linha.profissional = m.professor_nome || m.nome;
    linha.criado_por = m.email; linha.criado_em = agoraTexto();
    adicionarLinha('AnamnesesProf', linha);
  }
  registrar(m, ex ? 'editou anamnese' : 'escreveu anamnese', (a ? a.nome : cpf) + ' · ' + texto.length + ' caracteres' + (fotos.length ? ' · ' + plural(fotos.length, 'foto', 'fotos') : ''));
  return bancada_anamnesesProf(d, m);
}

function bancada_excluirAnamneseProf(d, m) {
  var x = lerAba('AnamnesesProf').filter(function (y) { return String(y.id) === String(d.id); })[0];
  if (!x) throw new Error('Anamnese não encontrada.');
  if (m.papel !== 'admin' && String(x.criado_por).toLowerCase() !== m.email) throw new Error('Só quem escreveu (ou a administração) pode apagar.');
  String(x.fotos || '').split(',').filter(String).forEach(function (f) { try { DriveApp.getFileById(f).setTrashed(true); } catch (e) { /* já apagada */ } });
  var arq = lerConteudoAnamnese(x.conteudo, false).arquivo;
  if (arq) { try { DriveApp.getFileById(arq).setTrashed(true); } catch (e) { /* já apagado */ } }
  aba('AnamnesesProf').deleteRow(x._linha);
  registrar(m, 'apagou anamnese', x.nome + ' · ' + String(x.criado_em).slice(0, 10));
  return true;
}

// ============================================================
//  MINHAS CLIENTES (profissional): quem ela atende, sem CPF nem WhatsApp
//  "ref" é o id de um atendimento dela com a cliente (é por ele que a tela pede os dados)
// ============================================================
function bancada_minhasClientes(d, m) {
  var hoje = hojeTexto();
  var porCpf = {};
  lerAba('Atendimentos').forEach(function (a) {
    if (!a.id || !a.cpf || a.status === 'cancelado' || !mesmaProfessora(a.profissional, m)) return;
    var cpf = normCpf(a.cpf), dt = dataTexto(a.data);
    var c = porCpf[cpf] = porCpf[cpf] || { ref: String(a.id), refData: dt, nome: String(a.nome), ultima: '', proxima: '', atendimentos: 0, servicos: {} };
    c.atendimentos++;
    c.servicos[String(a.servico)] = 1;
    if (dt <= hoje && dt > c.ultima) c.ultima = dt;
    if (dt > hoje && (!c.proxima || dt < c.proxima)) c.proxima = dt;
    if (dt >= c.refData) { c.ref = String(a.id); c.refData = dt; }
  });
  var anams = {};
  lerAba('AnamnesesProf').forEach(function (x) { if (x.cpf) anams[normCpf(x.cpf)] = (anams[normCpf(x.cpf)] || 0) + 1; });
  return Object.keys(porCpf).map(function (cpf) {
    var c = porCpf[cpf];
    return { ref: c.ref, nome: c.nome, ultima: c.ultima, proxima: c.proxima, atendimentos: c.atendimentos, servicos: Object.keys(c.servicos).slice(0, 4), anamneses: anams[cpf] || 0 };
  }).sort(function (a, b) { return (b.proxima || b.ultima).localeCompare(a.proxima || a.ultima) || a.nome.localeCompare(b.nome); });
}

// comandas da cliente (abertas e as últimas fechadas). Profissional vê sem CPF/WhatsApp.
function bancada_comandasCliente(d, m) {
  var cpf = cpfComAcesso(d, m);
  var lista = lerAba('Comandas').filter(function (c) { return c.id && c.cpf && normCpf(c.cpf) === cpf && c.status !== 'cancelada'; }).map(comandaPublica);
  var abertas = lista.filter(function (c) { return c.status === 'aberta'; });
  var fechadas = lista.filter(function (c) { return c.status === 'fechada'; }).sort(function (a, b) { return b.fechadaEm.localeCompare(a.fechadaEm); }).slice(0, 12);
  var limpar = function (c) {
    if (m.papel === 'professora') { c.cpf = ''; c.whatsapp = ''; c.pagamentos = []; c.codigo = ''; }
    return c;
  };
  return { abertas: abertas.map(limpar), fechadas: fechadas.map(limpar) };
}

// ============================================================
//  HISTÓRICO COMPLETO (linha do tempo da cliente)
// ============================================================
// pre: listas já filtradas da cliente (ficha completa), para não reler as abas
function historicoCliente(cpf, pre) {
  pre = pre || {};
  var ev = [];
  (pre.atendimentos || lerAba('Atendimentos')).forEach(function (a) {
    if (!a.id || !a.cpf || normCpf(a.cpf) !== cpf) return;
    ev.push({ data: dataTexto(a.data), hora: horaTexto(a.hora), tipo: 'servico', titulo: a.servico, detalhe: 'com ' + a.profissional, status: String(a.status),
      valor: numero(a.valor), categoria: String(a.categoria) });
  });
  (pre.reservas || todasReservas()).forEach(function (r) {
    if (normCpf(r.cpf) !== cpf || r.status === 'pendente') return;
    ev.push({ data: r.data, hora: r.hora, tipo: 'aula', titulo: r.modalidade, detalhe: 'com ' + r.professor + (r.tapete ? ' · tapete ' + r.tapete : ''), status: String(r.status) });
  });
  (pre.pagamentos || lerAba('Pagamentos')).forEach(function (p) {
    if (!p.cpf || normCpf(p.cpf) !== cpf || p.status !== 'pago') return;
    ev.push({ data: String(p.pago_em || p.criado_em).slice(0, 10), hora: String(p.pago_em || '').slice(11, 16), tipo: String(p.tipo_item) === 'produto' ? 'produto' : 'compra',
      titulo: String(p.descricao), detalhe: (p.metodo || '') + (p.comanda ? ' · comanda' : ''), valor: numero(p.valor), status: 'pago' });
  });
  (pre.vales || lerAba('Vales')).forEach(function (v) {
    if (!v.cpf || normCpf(v.cpf) !== cpf) return;
    ev.push({ data: String(v.criado_em).slice(0, 10), hora: '', tipo: 'vale', titulo: 'Vale-presente ' + v.codigo, detalhe: String(v.motivo || v.campanha || ''), status: String(v.status) });
  });
  anamnesesProfDe(cpf).forEach(function (x) {
    var c = lerConteudoAnamnese(x.conteudo, false);
    ev.push({ data: String(x.criado_em).slice(0, 10), hora: String(x.criado_em).slice(11, 16), tipo: 'anamnese', titulo: String(x.titulo || 'Anamnese') + ' · ' + String(x.profissional || ''),
      detalhe: c.texto.slice(0, 140) + (String(x.fotos || '') ? ' · com fotos' : ''), status: '' });
  });
  evolucoesDe(cpf).forEach(function (e) {
    ev.push({ data: e.data, hora: '', tipo: 'evolucao', titulo: 'Evolução' + (e.servico ? ' · ' + e.servico : ''), detalhe: e.anotacao.slice(0, 140) + (e.fotos.length ? ' · ' + plural(e.fotos.length, 'foto', 'fotos') : ''), status: '' });
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

// ============================================================
//  EXCLUIR CLIENTE (só administração)
//  Sem histórico: o cadastro some. Com histórico (aulas, pagamentos, comandas…): anonimiza (LGPD).
//  Nome, CPF e contatos saem de todas as abas; vendas, comissões e caixa ficam com "Cliente excluído"
//  e um código interno, para o financeiro não mudar. Ficha de saúde, estética, evolução, anamneses
//  e fotos são sempre apagadas (inclusive os arquivos no Drive).
// ============================================================
var ABAS_COM_HISTORICO = ['Reservas', 'Pagamentos', 'Creditos', 'Atendimentos', 'Comandas', 'Vales'];
var NOME_EXCLUIDO = 'Cliente excluído';

function lixeiraDrive(id) {
  if (!id) return;
  try { DriveApp.getFileById(id).setTrashed(true); } catch (e) { /* já apagado */ }
}

// apaga as linhas de um CPF numa aba (de baixo para cima); antes(linha) recebe cada uma
function apagarLinhasDoCpf(nomeAba, cpf, antes) {
  var linhas = linhasDoCpf(nomeAba, cpf);
  if (!linhas.length) return 0;
  var s = aba(nomeAba);
  linhas.sort(function (a, b) { return b._linha - a._linha; }).forEach(function (l) {
    if (antes) antes(l);
    s.deleteRow(l._linha);
  });
  return linhas.length;
}

// troca CPF, nome e contatos de um CPF numa aba (coluna inteira de uma vez)
function anonimizarNaAba(nomeAba, cpf, novo) {
  var s = aba(nomeAba);
  var v = s.getDataRange().getValues();
  if (v.length < 2) return 0;
  var k = indiceColunas(v[0]);
  var trocar = { cpf: novo, nome: NOME_EXCLUIDO, whatsapp: '', email: '', resgatado_cpf: novo };
  var cols = Object.keys(trocar).filter(function (c) { return k[c] != null; });
  var n = 0;
  for (var i = 1; i < v.length; i++) {
    if (!v[i][k.cpf] || normCpf(v[i][k.cpf]) !== cpf) continue;
    n++;
    cols.forEach(function (c) { v[i][k[c]] = trocar[c]; });
  }
  if (!n) return 0;
  cols.forEach(function (c) {
    var r = s.getRange(2, k[c] + 1, v.length - 1, 1);
    if (c === 'cpf' || c === 'resgatado_cpf') r.setNumberFormat('@');
    r.setValues(v.slice(1).map(function (l) { return [l[k[c]]]; }));
  });
  return n;
}

function bancada_excluirCliente(d, m) {
  var a = buscarAluno(d.cpf);
  if (!a) throw new Error('Cliente não encontrado.');
  var cpf = normCpf(a.cpf);
  var nome = primeiroNome(a.nome);
  if (String(d.confirmacao || '').trim().toLowerCase() !== nome.toLowerCase()) throw new Error('Para confirmar, digite o primeiro nome: ' + nome + '.');
  if (lerAba('Comandas').some(function (c) { return c.status === 'aberta' && c.cpf && normCpf(c.cpf) === cpf; })) throw new Error('Feche ou cancele a comanda aberta antes de excluir.');
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 30000);
  var resultado;
  try {
    // dados de saúde e fotos: sempre apagados
    apagarLinhasDoCpf('Anamneses', cpf, function (l) { var id = (String(l.pdf || '').match(/\/d\/([\w-]+)/) || [])[1]; lixeiraDrive(id); });
    apagarLinhasDoCpf('FichasEstetica', cpf);
    apagarLinhasDoCpf('Espera', cpf);
    apagarLinhasDoCpf('Evolucoes', cpf, function (l) { String(l.fotos || '').split(',').filter(String).forEach(lixeiraDrive); });
    apagarLinhasDoCpf('AnamnesesProf', cpf, function (l) {
      String(l.fotos || '').split(',').filter(String).forEach(lixeiraDrive);
      lixeiraDrive(lerConteudoAnamnese(l.conteudo, false).arquivo);
    });
    encerrarSessoes('Sessoes', 's_', cpf);
    var links = lerAba('Redefinicoes').filter(function (r) { return r.tipo === 'aluno' && normCpf(r.id) === cpf; }).sort(function (x, y) { return y._linha - x._linha; });
    links.forEach(function (r) { aba('Redefinicoes').deleteRow(r._linha); });
    var historico = ABAS_COM_HISTORICO.some(function (n) { return linhasDoCpf(n, cpf).length > 0; });
    if (!historico) {
      aba('Alunos').deleteRow(a._linha);
      resultado = { apagado: true };
    } else {
      var novo = idSemCpf();
      ABAS_COM_HISTORICO.forEach(function (n) { anonimizarNaAba(n, cpf, novo); });
      var limpo = { cpf: novo, nome: NOME_EXCLUIDO, ativo: 'NÃO', origem_cadastro: 'excluído em ' + hojeTexto(), marketing: 'NÃO' };
      ['whatsapp', 'email', 'senha_hash', 'sal', 'wellhub', 'wellhub_id', 'wellhub_desde', 'obs_internas', 'nascimento', 'cep', 'endereco', 'numero', 'complemento',
        'bairro', 'cidade', 'uf', 'como_conheceu', 'alerta'].forEach(function (c) { limpo[c] = ''; });
      var s = aba('Alunos');
      s.getRange(a._linha, coluna('Alunos', 'cpf')).setNumberFormat('@');
      atualizarLinha('Alunos', a._linha, limpo);
      resultado = { anonimizado: true, codigo: novo };
    }
    esquecerListaClientes();
    esquecerAlertas();
    SpreadsheetApp.flush();
  } finally {
    trava.releaseLock();
  }
  registrar(m, 'excluiu cliente', resultado.apagado ? 'cadastro sem histórico' : 'anonimizado (código ' + resultado.codigo + ')');
  return resultado;
}

// ============================================================
//  ALERTAS DA CLIENTE (alergia, gestante, cuidado especial)
// ============================================================
// Vêm do alerta fixo escrito pela equipe (Alunos.alerta), da ficha de saúde (alergias, gestante)
// e da ficha de estética (alergias). Aparecem na agenda, nas aulas e na comanda.
// O mapa fica 30 min no cache; gravar em Alunos, Anamneses ou FichasEstetica pelo sistema apaga na hora.
var ABAS_DOS_ALERTAS = { Alunos: 1, Anamneses: 1, FichasEstetica: 1 };
var CHAVE_ALERTAS = 'alertas_clientes';
var NADA_A_DECLARAR = /^(n[aã]o|nenhuma?|nada|nao tenho|não tenho|desconhe[cç]o|sem alergias?|-+|n\/?a|negativo)\.?$/i;

function montarAlertas() {
  var o = {};
  var add = function (cpf, t) {
    cpf = normCpf(cpf);
    t = String(t || '').trim().replace(/\s+/g, ' ');
    if (!cpf || !t) return;
    if (t.length > 90) t = t.slice(0, 88) + '…';
    (o[cpf] = o[cpf] || []);
    if (o[cpf].indexOf(t) < 0) o[cpf].push(t);
  };
  var alergia = function (cpf, t) { t = String(t || '').trim(); if (t && !NADA_A_DECLARAR.test(t)) add(cpf, 'Alergia: ' + t); };
  var al = valoresAba('Alunos'), k = indiceColunas(al[0]);
  if (k.alerta != null) for (var i = 1; i < al.length; i++) if (al[i][k.cpf]) add(al[i][k.cpf], al[i][k.alerta]);
  var an = valoresAba('Anamneses'), ka = indiceColunas(an[0]);
  for (i = 1; i < an.length; i++) {
    if (!an[i][ka.cpf]) continue;
    alergia(an[i][ka.cpf], an[i][ka.alergias]);
    if (String(an[i][ka.gestante]).toLowerCase() === 'sim') add(an[i][ka.cpf], 'Gestante' + (an[i][ka.gestante_semanas] ? ' (' + an[i][ka.gestante_semanas] + ' semanas na ficha)' : ''));
  }
  var fe = valoresAba('FichasEstetica'), kf = indiceColunas(fe[0]);
  for (i = 1; i < fe.length; i++) if (fe[i][kf.cpf]) alergia(fe[i][kf.cpf], fe[i][kf.alergias]);
  return o;
}

var _alertas = null;
function mapaAlertas() {
  if (_alertas) return _alertas;
  var cache = CacheService.getScriptCache();
  try {
    var t = cache.get(CHAVE_ALERTAS);
    if (t) { _alertas = JSON.parse(t); return _alertas; }
  } catch (e) { /* lê da planilha */ }
  _alertas = montarAlertas();
  try { var j = JSON.stringify(_alertas); if (j.length < 95000) cache.put(CHAVE_ALERTAS, j, 1800); } catch (e) { /* sem cache */ }
  return _alertas;
}

function esquecerAlertas() {
  _alertas = null;
  try { CacheService.getScriptCache().remove(CHAVE_ALERTAS); } catch (e) { /* ignora */ }
}

function alertasDe(cpf) {
  return cpf ? (mapaAlertas()[normCpf(cpf)] || []) : [];
}
