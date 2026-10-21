/**
 * ============================================================
 *  CASA ÂMBAR — LISTA DE ESPERA E RETORNOS
 * ============================================================
 *  Lista de espera (aba Espera):
 *   - aula lotada: a aluna entra pelo site ou a recepção põe; quando uma reserva é
 *     cancelada, quem espera recebe e-mail ("abriu uma vaga") e a recepção vê na hora.
 *   - serviço sem horário: a recepção anota serviço, profissional, dia e período preferidos.
 *  Retornos: serviço com "retorno em X dias" (Catálogo) aparece em Marketing → Retornos
 *  quando a cliente passou do prazo e não tem nada marcado.
 */

var STATUS_ESPERA_ATIVO = { esperando: 1, avisado: 1 };
var PERIODOS_ESPERA = { manha: 'manhã', tarde: 'tarde', noite: 'noite' };

function esperaPublica(x) {
  return { id: String(x.id), criadoEm: String(x.criado_em || ''), tipo: String(x.tipo), aulaId: String(x.aula_id || ''), servicoId: String(x.servico_id || ''),
    servico: String(x.servico || ''), profissional: String(x.profissional || ''), data: x.data ? dataTexto(x.data) : '', periodo: String(x.periodo || ''),
    cpf: x.cpf ? normCpf(x.cpf) : '', nome: String(x.nome || ''), whatsapp: String(x.whatsapp || ''), obs: String(x.obs || ''), status: String(x.status),
    avisadoEm: String(x.avisado_em || ''), origem: String(x.origem || '') };
}

// data da aula pelo id ("2026-10-21_07:00_pilates")
function dataDaAulaId(id) { var p = String(id || '').split('_')[0]; return /^\d{4}-\d{2}-\d{2}$/.test(p) ? p : ''; }

function aulaPorId(id) {
  var data = dataDaAulaId(id);
  if (!data) return null;
  return gerarAulas(data, 1).filter(function (a) { return a.id === id; })[0] || null;
}

// ainda vale: aula que não passou; serviço sem dia ou com dia de hoje em diante
function esperaVigente(x, hoje) {
  if (!x.id || !STATUS_ESPERA_ATIVO[x.status]) return false;
  if (x.tipo === 'aula') return dataDaAulaId(x.aula_id) >= hoje;
  return !x.data || dataTexto(x.data) >= hoje;
}

// já reservou a aula (ex.: pagou a avulsa depois): não está mais esperando
function jaNaAula(x, reservas) {
  return x.tipo === 'aula' && reservas.some(function (r) { return r.aula_id === x.aula_id && normCpf(r.cpf) === normCpf(x.cpf); });
}

function bancada_espera(d) {
  var hoje = hojeTexto();
  var reservas = reservasAtivas();
  var lista = lerAba('Espera').filter(function (x) {
    if (!esperaVigente(x, hoje) || jaNaAula(x, reservas)) return false;
    if (d.tipo && x.tipo !== d.tipo) return false;
    if (d.aulaId && String(x.aula_id) !== String(d.aulaId)) return false;
    return true;
  }).map(esperaPublica).sort(function (a, b) { return a.criadoEm.localeCompare(b.criadoEm); });
  return lista;
}

function bancada_entrarEspera(d, m) {
  var tipo = d.tipo === 'aula' ? 'aula' : 'servico';
  var cliente;
  if (d.cpf) {
    var al = buscarAluno(d.cpf);
    if (!al) throw new Error('Cliente não encontrado.');
    cliente = { cpf: normCpf(al.cpf), nome: al.nome, whatsapp: String(al.whatsapp || '') };
  } else {
    if (tipo === 'aula') throw new Error('Para a lista de espera de aula, escolha alguém com cadastro.');
    var nome = String((d.cliente || {}).nome || '').replace(/\s+/g, ' ').trim();
    var whats = soDigitos((d.cliente || {}).whatsapp);
    if (nome.split(' ').length < 2) throw new Error('Informe nome e sobrenome.');
    if (whats.length < 10) throw new Error('Informe o WhatsApp com DDD.');
    cliente = { cpf: '', nome: nome.slice(0, 80), whatsapp: whats };
  }
  var linha = { id: novoId('W'), criado_em: agoraTexto(), tipo: tipo, cpf: cliente.cpf, nome: cliente.nome, whatsapp: cliente.whatsapp,
    obs: String(d.obs || '').replace(/\s+/g, ' ').trim().slice(0, 200), status: 'esperando', criado_por: m.email, origem: 'bancada' };
  if (tipo === 'aula') {
    var aula = aulaPorId(d.aulaId);
    if (!aula) throw new Error('Aula não encontrada.');
    if (inicio(aula) < new Date()) throw new Error('Esta aula já começou.');
    var ja = lerAba('Espera').filter(function (x) { return x.tipo === 'aula' && x.aula_id === aula.id && STATUS_ESPERA_ATIVO[x.status] && normCpf(x.cpf) === cliente.cpf; })[0];
    if (ja) throw new Error(primeiroNome(cliente.nome) + ' já está na lista de espera desta aula.');
    linha.aula_id = aula.id;
    linha.data = aula.data;
    linha.servico = aula.modalidade + ' ' + aula.hora + ' com ' + aula.professor;
  } else {
    var serv = listarServicos(true).filter(function (s) { return s.id === String(d.servicoId); })[0];
    if (!serv) throw new Error('Escolha o serviço.');
    var prof = String(d.profissional || '').trim();
    if (prof && !profissionalPorNome(prof)) throw new Error('Profissional não encontrada.');
    var data = /^\d{4}-\d{2}-\d{2}$/.test(String(d.data || '')) ? String(d.data) : '';
    if (data && data < hojeTexto()) throw new Error('Escolha um dia de hoje em diante (ou deixe em branco: qualquer dia).');
    linha.servico_id = serv.id;
    linha.servico = serv.nome;
    linha.profissional = prof;
    linha.data = data;
    linha.periodo = PERIODOS_ESPERA[d.periodo] ? d.periodo : '';
  }
  adicionarLinha('Espera', linha);
  registrar(m, 'lista de espera', cliente.nome + ' · ' + linha.servico);
  return esperaPublica(linha);
}

// esperando → avisado (mandou WhatsApp) · agendado (conseguiu o horário) · desistiu
function bancada_atualizarEspera(d, m) {
  var st = { esperando: 1, avisado: 1, agendado: 1, desistiu: 1 }[d.status] ? d.status : '';
  if (!st) throw new Error('Situação inválida.');
  var x = lerAba('Espera').filter(function (y) { return String(y.id) === String(d.id); })[0];
  if (!x) throw new Error('Pedido não encontrado na lista de espera.');
  var mud = { status: st, resolvido_em: st === 'agendado' || st === 'desistiu' ? agoraTexto() : '' };
  if (st === 'avisado') mud.avisado_em = agoraTexto();
  atualizarLinha('Espera', x._linha, mud);
  registrar(m, 'lista de espera → ' + st, x.nome + ' · ' + x.servico);
  return esperaPublica(Object.assign(x, mud));
}

// quem estava esperando e conseguiu (reservou a aula / agendou o serviço) sai da lista sozinho
function esperaResolvida(tipo, ref, cpf) {
  if (!cpf) return;
  try {
    lerAba('Espera').forEach(function (x) {
      if (x.tipo !== tipo || !STATUS_ESPERA_ATIVO[x.status] || normCpf(x.cpf) !== normCpf(cpf)) return;
      if (tipo === 'aula' ? String(x.aula_id) === String(ref) : String(x.servico_id) === String(ref)) {
        atualizarLinha('Espera', x._linha, { status: 'agendado', resolvido_em: agoraTexto() });
      }
    });
  } catch (e) { Logger.log('espera: ' + e.message); }
}

// abriu vaga numa aula (cancelamento): e-mail para quem espera. Quem reservar primeiro fica com a vaga.
function avisarVagaAula(aulaId) {
  try {
    var reservas = reservasAtivas();
    var lista = lerAba('Espera').filter(function (x) { return x.tipo === 'aula' && String(x.aula_id) === String(aulaId) && x.status === 'esperando' && !jaNaAula(x, reservas); });
    if (!lista.length) return 0;
    var aula = aulaPorId(aulaId);
    if (!aula || inicio(aula) < new Date()) return 0;
    var montada = montarAula(JSON.parse(JSON.stringify(aula)), reservas, '');
    if (montada.ocupadosQtd >= aula.capacidade) return 0;
    var q = quandoLembrete(aula.data);
    var h = horaCurta(aula.hora);
    var n = 0;
    lista.forEach(function (x) {
      var al = buscarAluno(x.cpf);
      if (!al || !emailValido(al.email)) return;
      try {
        enviarEmail(al.email, 'Abriu uma vaga · ' + aula.modalidade + ' ' + q.assunto + ' às ' + h, 'Abriu uma vaga',
          ['Olá, ' + primeiroNome(al.nome) + '!', 'Abriu uma vaga na aula de ' + aula.modalidade + ' ' + q.texto + ' às ' + h + ', com ' + aula.professor + '.',
            'Quem reservar primeiro fica com ela. Se não der desta vez, você continua na lista.'],
          { texto: 'Reservar agora', url: AJUSTES.siteUrl + '#/aula/' + encodeURIComponent(aula.id) });
        atualizarLinha('Espera', x._linha, { status: 'avisado', avisado_em: agoraTexto() });
        n++;
      } catch (e) { Logger.log('aviso de vaga: ' + e.message); }
    });
    return n;
  } catch (e) {
    Logger.log('aviso de vaga: ' + e.message);
    return 0;
  }
}

// ---------------- área do aluno ----------------
function entrarEspera(d) {
  var aluno = alunoDaSessao(d.token);
  var aula = aulaPorId(d.aulaId);
  if (!aula) throw new Error('Aula não encontrada.');
  if (inicio(aula) < new Date()) throw new Error('Esta aula já começou.');
  var cpf = normCpf(aluno.cpf);
  var montada = montarAula(JSON.parse(JSON.stringify(aula)), reservasAtivas(), cpf);
  if (montada.minhaReserva) throw new Error('Você já reservou esta aula.');
  if (montada.ocupadosQtd < aula.capacidade) throw new Error('Ainda há vaga nesta aula: reserve direto.');
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 15000);
  try {
    var ja = lerAba('Espera').filter(function (x) { return x.tipo === 'aula' && x.aula_id === aula.id && STATUS_ESPERA_ATIVO[x.status] && normCpf(x.cpf) === cpf; })[0];
    if (!ja) {
      adicionarLinha('Espera', { id: novoId('W'), criado_em: agoraTexto(), tipo: 'aula', aula_id: aula.id, data: aula.data,
        servico: aula.modalidade + ' ' + aula.hora + ' com ' + aula.professor, cpf: cpf, nome: aluno.nome, whatsapp: String(aluno.whatsapp || ''),
        status: 'esperando', criado_por: 'site', origem: 'site' });
    }
  } finally {
    soltarTrava(trava);
  }
  return { naEspera: true };
}

function sairEspera(d) {
  var aluno = alunoDaSessao(d.token);
  var cpf = normCpf(aluno.cpf);
  lerAba('Espera').forEach(function (x) {
    if (x.tipo === 'aula' && String(x.aula_id) === String(d.aulaId) && STATUS_ESPERA_ATIVO[x.status] && normCpf(x.cpf) === cpf) {
      atualizarLinha('Espera', x._linha, { status: 'desistiu', resolvido_em: agoraTexto() });
    }
  });
  return { naEspera: false };
}

// aulas em que a aluna está esperando (para o botão no site)
function esperasDoAluno(cpf) {
  var o = {};
  var hoje = hojeTexto();
  lerAba('Espera').forEach(function (x) { if (x.tipo === 'aula' && esperaVigente(x, hoje) && normCpf(x.cpf) === normCpf(cpf)) o[x.aula_id] = 1; });
  return o;
}

// resumo para a tela Hoje: aulas com vaga e gente esperando; serviços esperando
function resumoEspera() {
  var hoje = hojeTexto();
  var reservas = reservasAtivas();
  var lista = lerAba('Espera').filter(function (x) { return esperaVigente(x, hoje) && !jaNaAula(x, reservas); });
  var porAula = {};
  lista.forEach(function (x) { if (x.tipo === 'aula') porAula[x.aula_id] = (porAula[x.aula_id] || 0) + 1; });
  var comVaga = 0;
  var ids = Object.keys(porAula);
  if (ids.length) {
    ids.forEach(function (id) {
      var a = aulaPorId(id);
      if (a && inicio(a) > new Date() && montarAula(JSON.parse(JSON.stringify(a)), reservas, '').ocupadosQtd < a.capacidade) comVaga++;
    });
  }
  return { aulasComVaga: comVaga, servicos: lista.filter(function (x) { return x.tipo === 'servico'; }).length };
}

// ============================================================
//  RETORNOS (serviço com "retorno em X dias")
// ============================================================
function bancada_retornos(d) {
  var hoje = hojeTexto();
  var servs = {};
  listarServicos(true).forEach(function (s) { if (s.retornoDias > 0) servs[s.id] = s; });
  if (!Object.keys(servs).length) return { lista: [], semConfiguracao: true };
  var at = lerAba('Atendimentos').filter(function (a) { return a.id && a.cpf; });
  var ultimo = {}; // cpf|servico → último atendido
  var futuro = {}; // cpf → tem algo marcado de hoje em diante
  at.forEach(function (a) {
    var dt = dataTexto(a.data), cpf = normCpf(a.cpf);
    if (dt >= hoje && a.status !== 'cancelado' && a.status !== 'falta') futuro[cpf] = 1;
    if (a.status !== 'atendido' || !servs[String(a.servico_id)]) return;
    var k = cpf + '|' + a.servico_id;
    if (!ultimo[k] || dt > dataTexto(ultimo[k].data)) ultimo[k] = a;
  });
  var lista = [];
  Object.keys(ultimo).forEach(function (k) {
    var a = ultimo[k], s = servs[String(a.servico_id)], cpf = normCpf(a.cpf);
    if (futuro[cpf] || String(a.retorno || '')) return;
    var quando = somarDias(dataTexto(a.data), s.retornoDias);
    // aparece 3 dias antes do prazo e some 90 dias depois (cliente que não voltou vira campanha)
    if (quando > somarDias(hoje, 3) || quando < somarDias(hoje, -90)) return;
    lista.push({ atendimentoId: String(a.id), cpf: cpf, nome: String(a.nome), whatsapp: String(a.whatsapp || ''), servicoId: s.id, servico: s.nome,
      profissional: String(a.profissional), ultima: dataTexto(a.data), retornoEm: quando, dias: s.retornoDias });
  });
  return { lista: lista.sort(function (x, y) { return x.retornoEm.localeCompare(y.retornoEm); }) };
}

// d.como: avisado (mandou mensagem) ou dispensado. Os dois tiram da lista de retornos
function bancada_marcarRetorno(d, m) {
  var a = lerAba('Atendimentos').filter(function (x) { return x.id === d.atendimentoId; })[0];
  if (!a) throw new Error('Atendimento não encontrado.');
  var v = d.como === 'dispensado' ? 'dispensado ' + hojeTexto() : 'avisado ' + hojeTexto();
  atualizarLinha('Atendimentos', a._linha, { retorno: v });
  registrar(m, 'retorno ' + v.split(' ')[0], a.nome + ' · ' + a.servico);
  return true;
}
