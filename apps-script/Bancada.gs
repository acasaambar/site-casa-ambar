/**
 * ============================================================
 *  CASA ÂMBAR — BANCADA INTERNA (equipe)
 * ============================================================
 *  Papéis:
 *   admin       tudo (inclui relatórios, equipe, planos, cupons e ajustes)
 *   recepcao    agenda, alunos, vendas no balcão, vales, bloqueios
 *   professora  só as próprias aulas: lista de presença e ficha de saúde
 */

var PERMISSOES = {
  b_eu: ['admin', 'recepcao', 'professora'],
  b_sair: ['admin', 'recepcao', 'professora'],
  b_resumo: ['admin', 'recepcao', 'professora'],
  b_agenda: ['admin', 'recepcao', 'professora'],
  b_presenca: ['admin', 'recepcao', 'professora'],
  b_ficha: ['admin', 'recepcao', 'professora'],
  b_agendar: ['admin', 'recepcao'],
  b_cancelarReserva: ['admin', 'recepcao'],
  b_alunos: ['admin', 'recepcao'],
  b_aluno: ['admin', 'recepcao'],
  b_salvarAluno: ['admin', 'recepcao'],
  b_novoAluno: ['admin', 'recepcao'],
  b_enviarLinkSenha: ['admin', 'recepcao'],
  b_vender: ['admin', 'recepcao'],
  b_simularPreco: ['admin', 'recepcao'],
  b_pagamentos: ['admin', 'recepcao'],
  b_estornar: ['admin', 'recepcao'],
  b_marcarDevolvido: ['admin', 'recepcao'],
  b_ajustarCredito: ['admin', 'recepcao'],
  b_vales: ['admin', 'recepcao'],
  b_criarVales: ['admin', 'recepcao'],
  b_cancelarVale: ['admin', 'recepcao'],
  b_enviarVale: ['admin', 'recepcao'],
  b_aplicarVale: ['admin', 'recepcao'],
  b_cupons: ['admin', 'recepcao'],
  b_salvarCupom: ['admin'],
  b_bloqueios: ['admin', 'recepcao'],
  b_bloquear: ['admin', 'recepcao'],
  b_desbloquear: ['admin', 'recepcao'],
  b_grade: ['admin'],
  b_salvarGrade: ['admin'],
  b_planos: ['admin', 'recepcao'],
  b_salvarPlano: ['admin'],
  b_equipe: ['admin'],
  b_salvarMembro: ['admin'],
  b_ajustes: ['admin'],
  b_salvarAjustes: ['admin'],
  b_registro: ['admin'],
  b_relatorio: ['admin'],
  // serviços
  b_catalogoServicos: ['admin', 'recepcao', 'professora'],
  b_atendimentos: ['admin', 'recepcao', 'professora'],
  b_atualizarAtendimento: ['admin', 'recepcao', 'professora'],
  b_horarios: ['admin', 'recepcao'],
  b_agendarServico: ['admin', 'recepcao'],
  b_creditosServico: ['admin', 'recepcao'],
  b_salvarServico: ['admin'],
  b_salvarPacote: ['admin'],
  b_salvarProfissional: ['admin'],
  // clientes: histórico, ficha de estética, evolução e fotos, importação
  b_prontuario: ['admin', 'recepcao', 'professora'],
  b_salvarFichaEstetica: ['admin', 'recepcao', 'professora'],
  b_salvarEvolucao: ['admin', 'recepcao', 'professora'],
  b_excluirEvolucao: ['admin', 'recepcao', 'professora'],
  b_foto: ['admin', 'recepcao', 'professora'],
  b_minhasClientes: ['professora'],
  b_anamnesesProf: ['admin', 'recepcao', 'professora'],
  b_anamneseProf: ['admin', 'recepcao', 'professora'],
  b_salvarAnamneseProf: ['admin', 'recepcao', 'professora'],
  b_excluirAnamneseProf: ['admin', 'recepcao', 'professora'],
  b_comandasCliente: ['admin', 'recepcao', 'professora'],
  b_importarClientes: ['admin'],
  // comandas e caixa
  b_comandas: ['admin', 'recepcao'],
  b_comanda: ['admin', 'recepcao'],
  b_salvarComanda: ['admin', 'recepcao'],
  b_comandaDoAtendimento: ['admin', 'recepcao'],
  b_fecharComanda: ['admin', 'recepcao'],
  b_cancelarComanda: ['admin', 'recepcao'],
  b_caixa: ['admin', 'recepcao'],
  b_abrirCaixa: ['admin', 'recepcao'],
  b_movimentoCaixa: ['admin', 'recepcao'],
  b_fecharCaixa: ['admin', 'recepcao'],
  b_reabrirCaixa: ['admin'],
  // estoque
  b_produtos: ['admin', 'recepcao'],
  b_salvarProduto: ['admin'],
  b_movimentarEstoque: ['admin', 'recepcao'],
  b_movimentos: ['admin', 'recepcao'],
  // financeiro e comissões
  b_financeiro: ['admin'],
  b_despesas: ['admin'],
  b_salvarDespesa: ['admin'],
  b_pagarDespesa: ['admin'],
  b_excluirDespesa: ['admin'],
  b_comissoes: ['admin'],
  b_pagamentoAulas: ['admin'],
  b_salvarPagamentoAulas: ['admin'],
  b_pagarComissoes: ['admin'],
  b_meusGanhos: ['professora'],
  // bloqueio de horário das profissionais
  b_folgas: ['admin', 'recepcao', 'professora'],
  b_salvarFolga: ['admin', 'recepcao'],
  b_excluirFolga: ['admin', 'recepcao'],
  // marketing
  b_promocoes: ['admin', 'recepcao'],
  b_salvarPromocao: ['admin'],
  b_excluirPromocao: ['admin'],
  b_publicoCampanha: ['admin', 'recepcao'],
  b_enviarCampanha: ['admin'],
  b_registrarCampanha: ['admin', 'recepcao'],
  b_campanhas: ['admin', 'recepcao'],
  b_lembretes: ['admin', 'recepcao'],
  b_enviarLembretes: ['admin', 'recepcao'],
  b_marcarLembrete: ['admin', 'recepcao'],
  b_lembretesAuto: ['admin', 'recepcao'],
};

function executarBancada(d) {
  var fn = globalThis[String(d.acao).replace(/^b_/, 'bancada_')];
  var papeis = PERMISSOES[d.acao];
  if (!papeis || typeof fn !== 'function') throw new Error('Ação desconhecida.');
  var membro = membroDaSessao(d.token);
  if (papeis.indexOf(membro.papel) < 0) throw new Error('Seu acesso não permite esta ação.');
  return fn(d, membro);
}

function registrar(membro, acao, detalhe) {
  try {
    adicionarLinha('Registro', { quando: agoraTexto(), quem: membro ? membro.email : 'sistema', acao: acao, detalhe: String(detalhe || '').slice(0, 500) });
  } catch (e) { Logger.log('registro: ' + e.message); }
}

// ============================================================
//  LOGIN DA EQUIPE (e-mail + senha)
// ============================================================
function buscarMembro(email) {
  email = String(email || '').trim().toLowerCase();
  if (!email) return null;
  return lerAba('Equipe').filter(function (m) { return String(m.email).trim().toLowerCase() === email; })[0] || null;
}

function membroPublico(m) {
  return { email: String(m.email).toLowerCase(), nome: m.nome, papel: m.papel, professorNome: m.professor_nome || '' };
}

function bancadaEntrar(d) {
  var email = String(d.email || '').trim().toLowerCase();
  limitarTentativas('e_' + email);
  var m = buscarMembro(email);
  var v = m && String(m.ativo).toUpperCase() !== 'NÃO' ? verificarSenha(d.senha, m.senha_hash, m.sal) : { ok: false };
  if (!v.ok) {
    registrarFalha('e_' + email);
    Utilities.sleep(600);
    // mesma mensagem para tudo: não revela quem é da equipe
    throw new Error('E-mail ou senha incorretos. Se você nunca criou uma senha, use o link do convite ou "Esqueci minha senha".');
  }
  limparFalhas('e_' + email);
  if (v.atualizar) gravarSenha('Equipe', m._linha, d.senha);
  atualizarLinha('Equipe', m._linha, { ultimo_acesso: agoraTexto() });
  var token = 'E' + Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  adicionarLinha('SessoesEquipe', { token: hashToken(token), email: email, criada_em: agoraTexto(), expira_em: new Date(Date.now() + 12 * 3600000).toISOString() });
  limparSessoesVencidas('SessoesEquipe');
  return { token: token, membro: membroPublico(m) };
}

function bancadaEsqueci(d) {
  var email = String(d.email || '').trim().toLowerCase();
  var cache = CacheService.getScriptCache();
  var n = Number(cache.get('esqE_' + email) || 0);
  if (n >= 3) throw new Error('Já enviamos o link algumas vezes. Confira a caixa de entrada e o spam.');
  var m = buscarMembro(email);
  if (m && String(m.ativo).toUpperCase() !== 'NÃO') {
    var link = criarLinkSenha('equipe', email, email, 1, 'recuperação');
    enviarEmail(email, 'Nova senha da bancada · Casa Âmbar', 'Nova senha',
      ['Olá, ' + primeiroNome(m.nome) + '.', 'Use o botão abaixo para criar uma nova senha da bancada da Casa Âmbar. O link vale por 1 hora.',
        'Se não foi você que pediu, ignore este e-mail.'], { texto: 'Criar nova senha', url: link });
  } else {
    Utilities.sleep(400);
  }
  cache.put('esqE_' + email, String(n + 1), 3600);
  // mesma resposta sempre (não revela quem tem acesso)
  return { ok: true };
}

function membroDaSessao(token) {
  if (!token || String(token).charAt(0) !== 'E' || String(token).length < 30) throw erroCod('Sua sessão da bancada expirou. Entre novamente.', 'SESSAO_EQUIPE');
  var cache = CacheService.getScriptCache();
  var h = hashToken(token);
  // sessão conferida há pouco: a pessoa vem do cache (sem ler a planilha). Sai do cache se ela for
  // desativada, mudar de papel, trocar a senha ou sair.
  var guardado = cache.get('m_' + h);
  if (guardado) {
    try { return JSON.parse(guardado); } catch (e) { /* refaz abaixo */ }
  }
  var email = cache.get('e_' + h);
  if (!email) {
    var linhas = valoresAba('SessoesEquipe');
    for (var i = 1; i < linhas.length; i++) {
      if ((linhas[i][0] === h || linhas[i][0] === token) && new Date(linhas[i][3]) > new Date()) { email = String(linhas[i][1]).toLowerCase(); break; }
    }
    if (!email) throw erroCod('Sua sessão da bancada expirou. Entre novamente.', 'SESSAO_EQUIPE');
    cache.put('e_' + h, email, 600);
  }
  var m = buscarMembro(email);
  if (!m || String(m.ativo).toUpperCase() === 'NÃO') throw erroCod('Seu acesso à bancada foi desativado.', 'SESSAO_EQUIPE');
  var pessoa = { email: String(m.email).toLowerCase(), nome: String(m.nome || ''), papel: String(m.papel), professor_nome: String(m.professor_nome || '') };
  cache.put('m_' + h, JSON.stringify(pessoa), 600);
  return pessoa;
}

// tira do cache as sessões de alguém (mudou de papel, nome de professora ou foi desativado)
function esquecerSessoesEmCache(email) {
  var cache = CacheService.getScriptCache();
  valoresAba('SessoesEquipe').slice(1).forEach(function (l) {
    if (String(l[1]).toLowerCase() !== email) return;
    try { cache.remove('m_' + l[0]); cache.remove('e_' + l[0]); } catch (e) { /* ignora */ }
  });
}

function bancada_eu(d, m) { return membroPublico(m); }

function bancada_sair(d) {
  encerrarSessaoToken(d.token);
  return true;
}

function encerrarSessaoToken(token) {
  var s = aba('SessoesEquipe');
  var h = hashToken(token);
  var linhas = s.getDataRange().getValues();
  for (var i = linhas.length - 1; i >= 1; i--) if (linhas[i][0] === h || linhas[i][0] === token) s.deleteRow(i + 1);
  try { CacheService.getScriptCache().remove('e_' + h); CacheService.getScriptCache().remove('m_' + h); } catch (e) { /* ignora */ }
}

function enviarConviteEquipe(m) {
  var link = criarLinkSenha('equipe', String(m.email).toLowerCase(), m.email, 72, 'convite');
  var papel = { admin: 'administração', recepcao: 'recepção', professora: 'professora' }[m.papel] || m.papel;
  enviarEmail(m.email, 'Seu acesso à bancada · Casa Âmbar', 'Bem-vinda à bancada',
    ['Olá, ' + primeiroNome(m.nome) + '!', 'Você recebeu acesso à bancada interna da Casa Âmbar (' + papel + ').',
      'Crie sua senha pelo botão abaixo. O link vale por 3 dias. Depois, entre sempre por ' + AJUSTES.siteUrl + '#/bancada'],
    { texto: 'Criar minha senha', url: link });
}

// ============================================================
//  DADOS DE APOIO
// ============================================================
function mapaAlunos() {
  var m = {};
  lerAba('Alunos').forEach(function (a) { m[normCpf(a.cpf)] = a; });
  return m;
}

function mapaAnamneses() {
  var m = {};
  lerAba('Anamneses').forEach(function (a) { m[normCpf(a.cpf)] = a; });
  return m;
}

function mapaCreditos() {
  var m = Object.create(null);
  var linhas = valoresCreditos();
  var cab = linhas[0];
  for (var i = 1; i < linhas.length; i++) {
    var c = objeto(cab, linhas[i]);
    c._linha = i + 1;
    c.inicio = dataTexto(c.inicio);
    c.fim = dataTexto(c.fim);
    c.aulas_semana = numero(c.aulas_semana);
    c.aulas_total = numero(c.aulas_total);
    if (c.id) m[String(c.id)] = c;
  }
  return m;
}

function todasReservas() {
  return lerAba('Reservas').map(function (r) { return partesAula(r); });
}

// aulas de um período (grade + aulas antigas que só existem nas reservas)
function aulasDoPeriodo(de, dias, reservas) {
  var lista = gerarAulas(de, dias);
  var ate = somarDias(de, dias - 1);
  var ids = {};
  lista.forEach(function (a) { ids[a.id] = a; });
  (reservas || []).forEach(function (r) {
    if (ids[r.aula_id] || r.data < de || r.data > ate || r.status === 'cancelado') return;
    var a = { id: r.aula_id, data: r.data, hora: r.hora, modalidade: r.modalidade, professor: r.professor,
      capacidade: String(r.modalidade) === 'Yoga' ? 12 : 4, duracao: AJUSTES.duracaoAulaMin, foraDaGrade: true };
    ids[a.id] = a;
    lista.push(a);
  });
  return lista.sort(function (a, b) { return (a.data + a.hora).localeCompare(b.data + b.hora); });
}

function formaDaReserva(r, creditos) {
  if (r.status === 'pendente') return 'Aguardando pagamento';
  if (String(r.credito_id) === 'WELLHUB') return 'Wellhub';
  if (String(r.credito_id) === 'CORTESIA') return 'Cortesia';
  var c = creditos[String(r.credito_id)];
  return c ? c.descricao : (r.credito_id ? String(r.credito_id) : '');
}

// ============================================================
//  RESUMO DO DIA (tela inicial)
// ============================================================
function bancada_resumo(d, m) {
  var hoje = hojeTexto();
  var reservas = todasReservas();
  var aulas = aulasDoPeriodo(hoje, 1, reservas).filter(function (a) { return m.papel !== 'professora' || mesmaProfessora(a.professor, m); });
  var ativas = reservas.filter(function (r) { return r.status !== 'cancelado' && !(r.status === 'pendente' && Number(r.expira_ms) < Date.now()); });
  var hojeR = ativas.filter(function (r) { return r.data === hoje && aulas.some(function (a) { return a.id === r.aula_id; }); });
  var r = {
    hoje: hoje,
    aulasHoje: aulas.length,
    reservasHoje: hojeR.length,
    presentesHoje: hojeR.filter(function (x) { return x.status === 'check-in'; }).length,
    linha: aulas.map(function (a) {
      return { id: a.id, hora: a.hora, duracao: a.duracao || AJUSTES.duracaoAulaMin, modalidade: a.modalidade, professor: a.professor,
        reservas: ativas.filter(function (x) { return x.aula_id === a.id; }).length, capacidade: a.capacidade };
    }),
    proximas: aulas.filter(function (a) { return inicio(a).getTime() + AJUSTES.duracaoAulaMin * 60000 > Date.now(); }).slice(0, 4).map(function (a) {
      var n = ativas.filter(function (x) { return x.aula_id === a.id; }).length;
      return { id: a.id, hora: a.hora, modalidade: a.modalidade, professor: a.professor, reservas: n, capacidade: a.capacidade };
    }),
  };
  var atend = lerAba('Atendimentos').filter(function (a) {
    return a.id && dataTexto(a.data) === hoje && a.status !== 'cancelado' && (m.papel !== 'professora' || mesmaProfessora(a.profissional, m));
  });
  r.servicosHoje = atend.length;
  r.servicos = atend.map(function (a) { return atendimentoPublico(a, m); }).sort(function (a, b) { return a.hora.localeCompare(b.hora); });
  if (m.papel !== 'professora') {
    var pagos = pagamentosPagos();
    var mes = hoje.slice(0, 7);
    r.vendasHoje = pagos.filter(function (p) { return String(p.pago_em).slice(0, 10) === hoje && numero(p.valor) > 0; }).reduce(function (s, p) { return s + numero(p.valor); }, 0);
    r.vendasMes = pagos.filter(function (p) { return String(p.pago_em).slice(0, 7) === mes; }).reduce(function (s, p) { return s + numero(p.valor); }, 0);
    r.wellhubPendentes = lerAba('Alunos').filter(function (a) { return statusWellhub(a) === 'pendente'; }).length;
    r.devolverJuros = lerAba('Pagamentos').filter(function (p) { return /^DEVOLVER/.test(String(p.observacao)); }).length;
    var mapaC = mapaCreditos();
    var em7 = somarDias(hoje, 7);
    r.vencendo = Object.keys(mapaC).map(function (k) { return mapaC[k]; }).filter(function (c) {
      return String(c.ativo).toUpperCase() !== 'NÃO' && c.tipo !== 'avulsa' && c.fim >= hoje && c.fim <= em7;
    }).length;
    r.comandasAbertas = lerAba('Comandas').filter(function (c) { return c.status === 'aberta'; }).length;
    r.estoqueBaixo = listarProdutos().filter(function (p) { return p.minimo > 0 && p.estoque <= p.minimo; }).length;
    var cx = caixaDoDia(hoje);
    r.caixa = cx ? String(cx.status) : 'nao_aberto';
    var amanha = somarDias(hoje, 1);
    r.lembretesWhats = lembretesDe(amanha).filter(function (x) { return !x.enviado && !x.email && soDigitos(x.whatsapp).length >= 10; }).length;
    if (m.papel === 'admin') {
      r.contasVencendo = lerAba('Despesas').filter(function (x) { return x.status === 'a_pagar' && dataTexto(x.data) <= somarDias(hoje, 3); }).length;
    }
  } else {
    var mg = bancada_meusGanhos({}, m);
    r.meusGanhosMes = mg.total;
  }
  r.folgasHoje = folgasDoDia(hoje).filter(function (f) { return m.papel !== 'professora' || mesmaProfessora(f.profissional, m); });
  return r;
}

function semAcento(t) {
  return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
}
// a professora/profissional só vê o que está no nome dela (comparação exata, sem acento)
function mesmaProfessora(nomeAula, m) {
  var a = semAcento(nomeAula);
  var b = semAcento(m.professor_nome || m.nome);
  return !!a && !!b && a === b;
}

// ============================================================
//  AGENDA
// ============================================================
function bancada_agenda(d, m) {
  var de = /^\d{4}-\d{2}-\d{2}$/.test(String(d.de)) ? d.de : hojeTexto();
  var dias = Math.min(Math.max(Number(d.dias) || 1, 1), 31);
  var reservas = todasReservas();
  var alunos = mapaAlunos();
  var fichas = mapaAnamneses();
  var creditos = mapaCreditos();
  var primeiras = {};
  // primeira aula de cada aluno (para a professora dar boas-vindas)
  reservas.filter(function (r) { return r.status !== 'cancelado' && r.status !== 'pendente'; })
    .sort(function (a, b) { return (a.data + a.hora).localeCompare(b.data + b.hora); })
    .forEach(function (r) { var c = normCpf(r.cpf); if (!primeiras[c]) primeiras[c] = r.id; });

  var aulas = aulasDoPeriodo(de, dias, reservas);
  if (m.papel === 'professora') aulas = aulas.filter(function (a) { return mesmaProfessora(a.professor, m); });
  return aulas.map(function (a) {
    var lista = reservas.filter(function (r) {
      if (r.aula_id !== a.id || r.status === 'cancelado') return false;
      return !(r.status === 'pendente' && Number(r.expira_ms) && Number(r.expira_ms) < Date.now());
    }).map(function (r) {
      var cpf = normCpf(r.cpf);
      var al = alunos[cpf] || {};
      var f = fichas[cpf];
      return {
        id: r.id, nome: r.nome || al.nome, cpf: m.papel === 'professora' ? '' : cpf, whatsapp: m.papel === 'professora' ? '' : String(al.whatsapp || ''),
        tapete: r.tapete ? Number(r.tapete) : null, status: r.status, forma: formaDaReserva(r, creditos),
        ficha: !!f, alerta: f ? String(f.parq_algum_sim) === 'SIM' || !!String(f.lesoes || '').trim() || String(f.gestante) === 'sim' : false,
        primeiraAula: primeiras[cpf] === r.id,
      };
    }).sort(function (x, y) { return (x.tapete || 99) - (y.tapete || 99) || String(x.nome).localeCompare(String(y.nome)); });
    a.reservas = lista;
    a.ocupadosQtd = lista.length;
    a.passada = inicio(a).getTime() + AJUSTES.duracaoAulaMin * 60000 < Date.now();
    return a;
  });
}

function acharReservaPorId(id) {
  var r = lerAba('Reservas').filter(function (x) { return x.id === id; })[0];
  if (!r) throw new Error('Reserva não encontrada.');
  return partesAula(r);
}

function bancada_presenca(d, m) {
  var r = acharReservaPorId(d.reservaId);
  if (m.papel === 'professora' && !mesmaProfessora(r.professor, m)) throw new Error('Esta aula não é sua.');
  var st = { 'check-in': 'check-in', falta: 'falta', reservado: 'reservado' }[d.status];
  if (!st) throw new Error('Situação inválida.');
  if (r.status === 'cancelado' || r.status === 'pendente') throw new Error('Esta reserva não está confirmada.');
  atualizarLinha('Reservas', r._linha, { status: st, checkin_em: st === 'check-in' ? agoraTexto() : '' });
  esquecerComissoesAulas();
  registrar(m, 'presença', r.nome + ' · ' + r.aula_id + ' → ' + st);
  return { id: r.id, status: st };
}

// Agendar pela bancada. forma: credito | wellhub | cortesia | avulsa (venda no balcão)
function bancada_agendar(d, m) {
  var cpf = normCpf(d.cpf);
  var aluno = buscarAluno(cpf);
  if (!aluno) throw new Error('Aluno não encontrado.');
  var de = String(d.aulaId).slice(0, 10);
  var aula = aulasDoPeriodo(de, 1, []).filter(function (a) { return a.id === d.aulaId; })[0];
  if (!aula) throw new Error('Aula não encontrada (confira a grade e os bloqueios).');
  if (inicio(aula).getTime() + AJUSTES.duracaoAulaMin * 60000 < Date.now() - 7 * 86400000) throw new Error('Esta aula é muito antiga.');
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 20000);
  try {
    var reservas = reservasAtivas();
    var montada = montarAula(JSON.parse(JSON.stringify(aula)), reservas, cpf);
    if (montada.minhaReserva) throw new Error(primeiroNome(aluno.nome) + ' já está nesta aula.');
    if (montada.ocupadosQtd >= aula.capacidade && !d.encaixe) throw erroCod('Aula lotada. Marque "encaixe" para passar da capacidade.', 'LOTADA');
    var tapete = '';
    if (aula.modalidade === 'Yoga') {
      tapete = Number(d.tapete);
      if (!tapete || tapete < 1) throw new Error('Escolha o tapete.');
      if (montada.ocupados.indexOf(tapete) >= 0) throw new Error('O tapete ' + tapete + ' está ocupado.');
    }
    var forma = String(d.forma || 'credito');
    var creditoId = '';
    var descricao = '';
    if (forma === 'credito') {
      var c = escolherCredito(cpf, aula, reservas);
      if (!c) throw erroCod(primeiroNome(aluno.nome) + ' não tem aulas de ' + aula.modalidade + ' disponíveis. Escolha cortesia, Wellhub ou venda uma aula avulsa.', 'SEM_CREDITO');
      creditoId = c.id; descricao = c.descricao;
    } else if (forma === 'wellhub') {
      creditoId = 'WELLHUB'; descricao = 'Wellhub';
    } else if (forma === 'cortesia') {
      creditoId = 'CORTESIA'; descricao = 'Cortesia';
    } else if (forma === 'avulsa') {
      var avulsa = buscarPlano(aula.modalidade.toLowerCase() + '-avulsa');
      if (!avulsa) throw new Error('Não há aula avulsa de ' + aula.modalidade + ' no catálogo.');
      var venda = registrarVenda(aluno, avulsa, { metodo: d.metodo, bandeira: d.bandeira, valor: d.valor, codigo: d.codigo, inicio: aula.data, obs: 'aula ' + aula.id }, m);
      creditoId = venda.creditoId; descricao = avulsa.nome + ' · ' + venda.metodo;
    } else {
      throw new Error('Forma inválida.');
    }
    var id = novoId('R');
    aba('Reservas').appendRow(linhaSegura([id, aula.id, aula.data, aula.hora, aula.modalidade, aula.professor, cpf, aluno.nome, tapete, 'reservado', agoraTexto(), '', '',
      creditoId, '', '']));
    SpreadsheetApp.flush();
    registrar(m, 'agendou', aluno.nome + ' · ' + aula.id + ' · ' + descricao);
    return { id: id, forma: descricao };
  } finally {
    trava.releaseLock();
  }
}

function bancada_cancelarReserva(d, m) {
  var r = acharReservaPorId(d.reservaId);
  if (r.status === 'cancelado') return true;
  atualizarLinha('Reservas', r._linha, { status: 'cancelado', cancelada_em: agoraTexto() });
  esquecerComissoesAulas();
  registrar(m, 'cancelou reserva', r.nome + ' · ' + r.aula_id + (d.motivo ? ' · ' + d.motivo : ''));
  return true;
}

// ============================================================
//  ALUNOS
// ============================================================
function resumoAluno(a, ctx) {
  var cpf = normCpf(a.cpf);
  var visita = ctx.visitas ? ctx.visitas[cpf] || '' : '';
  var hoje = hojeTexto();
  var creds = ctx.creditosPorCpf[cpf] || [];
  var vigentes = creds.filter(function (c) { return String(c.ativo).toUpperCase() !== 'NÃO' && c.inicio <= hoje && c.fim >= hoje; });
  var rs = ctx.reservasPorCpf[cpf] || [];
  var presencas = rs.filter(function (r) { return r.status === 'check-in'; });
  var ultima = rs.filter(function (r) { return r.data <= hoje && r.status !== 'cancelado' && r.status !== 'pendente'; }).map(function (r) { return r.data; }).sort().pop() || '';
  return {
    cpf: cpf, nome: a.nome, whatsapp: String(a.whatsapp || ''), email: String(a.email || ''), ativo: String(a.ativo).toUpperCase() !== 'NÃO',
    criadoEm: String(a.criado_em || '').slice(0, 10), ficha: !!ctx.fichas[cpf], alerta: ctx.fichas[cpf] ? String(ctx.fichas[cpf].parq_algum_sim) === 'SIM' : false,
    wellhub: statusWellhub(a), plano: vigentes.map(function (c) { return c.descricao; }).join(' + '),
    planoFim: vigentes.map(function (c) { return c.fim; }).sort().pop() || '', presencas: presencas.length, ultimaAula: ultima,
    temSenha: !!a.senha_hash, semCpf: !temCpfReal(cpf), ultimaVisita: visita, servicos: ctx.servicosPorCpf ? ctx.servicosPorCpf[cpf] || 0 : 0,
    origem: String(a.origem_cadastro || ''),
  };
}

function contextoAlunos() {
  var ctx = { creditosPorCpf: {}, reservasPorCpf: {}, fichas: mapaAnamneses() };
  var mc = mapaCreditos();
  Object.keys(mc).forEach(function (k) {
    var c = mc[k]; var cpf = normCpf(c.cpf);
    (ctx.creditosPorCpf[cpf] = ctx.creditosPorCpf[cpf] || []).push(c);
  });
  todasReservas().forEach(function (r) {
    var cpf = normCpf(r.cpf);
    (ctx.reservasPorCpf[cpf] = ctx.reservasPorCpf[cpf] || []).push(r);
  });
  ctx.mapaCreditos = mc;
  ctx.visitas = ultimasVisitas();
  ctx.servicosPorCpf = {};
  lerAba('Atendimentos').forEach(function (x) { if (x.cpf && x.status === 'atendido') ctx.servicosPorCpf[normCpf(x.cpf)] = (ctx.servicosPorCpf[normCpf(x.cpf)] || 0) + 1; });
  return ctx;
}

function bancada_alunos(d) {
  var ctx = contextoAlunos();
  var busca = String(d.busca || '').trim().toLowerCase();
  var dig = soDigitos(busca);
  return lerAba('Alunos').filter(function (a) {
    if (!a.cpf || /^unificado/.test(String(a.origem_cadastro))) return false;
    if (!busca) return true;
    return String(a.nome).toLowerCase().indexOf(busca) >= 0 || (dig.length >= 3 && (normCpf(a.cpf).indexOf(dig) >= 0 || soDigitos(a.whatsapp).indexOf(dig) >= 0)) ||
      String(a.email).toLowerCase().indexOf(busca) >= 0;
  }).map(function (a) { return resumoAluno(a, ctx); }).sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome)); });
}

function bancada_aluno(d) {
  var a = buscarAluno(d.cpf);
  if (!a) throw new Error('Aluno não encontrado.');
  var ctx = contextoAlunos();
  var cpf = normCpf(a.cpf);
  var r = resumoAluno(a, ctx);
  var reservas = todasReservas();
  var hoje = hojeTexto();
  r.obs = String(a.obs_internas || '');
  r.wellhubId = String(a.wellhub_id || '');
  r.ficha = fichaPublica(ctx.fichas[cpf]);
  r.creditos = (ctx.creditosPorCpf[cpf] || []).map(function (c) {
    var limite = c.aulas_semana > 0 ? c.aulas_semana : c.aulas_total;
    var usadas = usoDoCredito(c, reservasAtivas(), hoje);
    return { id: c.id, descricao: c.descricao, modalidade: c.modalidade, tipo: c.tipo, inicio: c.inicio, fim: c.fim, ativo: String(c.ativo).toUpperCase() !== 'NÃO',
      limite: limite, usadas: usadas, porSemana: c.aulas_semana > 0, origem: String(c.origem || ''), vigente: c.inicio <= hoje && c.fim >= hoje && String(c.ativo).toUpperCase() !== 'NÃO' };
  }).sort(function (x, y) { return String(y.fim).localeCompare(String(x.fim)); });
  r.reservas = (ctx.reservasPorCpf[cpf] || []).map(function (x) {
    return { id: x.id, aulaId: x.aula_id, data: x.data, hora: x.hora, modalidade: x.modalidade, professor: x.professor, tapete: x.tapete ? Number(x.tapete) : null,
      status: x.status, forma: formaDaReserva(x, ctx.mapaCreditos) };
  }).sort(function (x, y) { return (y.data + y.hora).localeCompare(x.data + x.hora); }).slice(0, 80);
  r.pagamentos = lerAba('Pagamentos').filter(function (p) { return normCpf(p.cpf) === cpf; }).map(pagamentoPublico).reverse();
  r.vales = lerAba('Vales').filter(function (v) { return v.cpf && normCpf(v.cpf) === cpf; }).map(valePublico);
  r.atendimentos = lerAba('Atendimentos').filter(function (x) { return x.id && x.cpf && normCpf(x.cpf) === cpf; }).map(function (x) { return atendimentoPublico(x); })
    .sort(function (x, y) { return (y.data + y.hora).localeCompare(x.data + x.hora); });
  r.historico = historicoCliente(cpf);
  r.nascimento = String(a.nascimento || '').slice(0, 10);
  r.endereco = enderecoPublico(a);
  r.comoConheceu = String(a.como_conheceu || '');
  r.marketing = String(a.marketing).toUpperCase() !== 'NÃO';
  r.fichaEstetica = !!linhaFichaEstetica(cpf);
  r.evolucoes = evolucoesDe(cpf).length;
  r.totalGasto = dinheiro(lerAba('Pagamentos').filter(function (p) { return p.status === 'pago' && p.cpf && normCpf(p.cpf) === cpf; }).reduce(function (s, p) { return s + numero(p.valor); }, 0));
  r.comandaAberta = (lerAba('Comandas').filter(function (c) { return c.status === 'aberta' && c.cpf && normCpf(c.cpf) === cpf; })[0] || {}).id || '';
  void reservas;
  return r;
}

function fichaPublica(f) {
  if (!f) return null;
  var o = {};
  ABAS.Anamneses.forEach(function (c) { o[c] = ehData(f[c]) ? dataTexto(f[c]) : String(f[c] == null ? '' : f[c]); });
  return o;
}

// professora: ficha só de quem está nas aulas dela
function bancada_ficha(d, m) {
  var cpf = normCpf(d.cpf || '');
  if (m.papel === 'professora') {
    var r = acharReservaPorId(d.reservaId);
    if (!mesmaProfessora(r.professor, m)) throw new Error('Esta aluna não está nas suas aulas.');
    cpf = normCpf(r.cpf);
  } else if (d.reservaId && !d.cpf) {
    cpf = normCpf(acharReservaPorId(d.reservaId).cpf);
  }
  var a = buscarAluno(cpf);
  var f = fichaPublica(mapaAnamneses()[cpf]);
  // professora: a ficha vem sem CPF e sem o link do PDF
  if (f && m.papel === 'professora') { delete f.cpf; delete f.pdf; }
  return { nome: a ? a.nome : '', ficha: f };
}

function bancada_salvarAluno(d, m) {
  var a = buscarAluno(d.cpf);
  if (!a) throw new Error('Aluno não encontrado.');
  var x = d.dados || {};
  var mud = {};
  if (x.nome != null) { if (String(x.nome).trim().split(' ').length < 2) throw new Error('Informe nome e sobrenome.'); mud.nome = String(x.nome).trim(); }
  if (x.whatsapp != null) { if (soDigitos(x.whatsapp).length < 10) throw new Error('WhatsApp com DDD.'); mud.whatsapp = soDigitos(x.whatsapp); }
  if (x.email != null) { if (x.email && !emailValido(x.email)) throw new Error('E-mail inválido.'); mud.email = String(x.email).trim().toLowerCase(); }
  if (x.ativo != null) mud.ativo = x.ativo ? 'SIM' : 'NÃO';
  if (x.wellhub != null) mud.wellhub = { confirmado: 'SIM', bloqueado: 'NÃO', pendente: 'pendente', nao_informado: '' }[x.wellhub];
  if (x.wellhubId != null) mud.wellhub_id = soDigitos(x.wellhubId);
  if (x.obs != null) mud.obs_internas = String(x.obs).slice(0, 1000);
  if (x.nascimento != null) mud.nascimento = /^\d{4}-\d{2}-\d{2}$/.test(String(x.nascimento)) ? x.nascimento : '';
  if (x.marketing != null) mud.marketing = x.marketing ? '' : 'NÃO';
  if (x.endereco) Object.assign(mud, enderecoDe(x.endereco));
  if (x.comoConheceu != null) mud.como_conheceu = textoComoConheceu(x.comoConheceu);
  atualizarLinha('Alunos', a._linha, mud);
  registrar(m, 'editou aluno', a.nome + ' · ' + Object.keys(mud).join(', '));
  if (x.cpf && soDigitos(x.cpf) !== normCpf(a.cpf)) {
    var trava = LockService.getScriptLock();
    esperarTrava(trava, 20000);
    try { return bancada_aluno({ cpf: informarCpf(buscarAluno(a.cpf), x.cpf, m) }); } finally { trava.releaseLock(); }
  }
  return bancada_aluno({ cpf: a.cpf });
}

function bancada_novoAluno(d, m) {
  var cpf = soDigitos(d.cpf);
  if (cpf && !cpfValido(cpf)) throw new Error('CPF inválido.');
  if (!d.nome || String(d.nome).trim().split(' ').length < 2) throw new Error('Informe nome e sobrenome.');
  if (soDigitos(d.whatsapp).length < 10) throw new Error('Informe o WhatsApp com DDD.');
  if (d.email && !emailValido(d.email)) throw new Error('E-mail inválido.');
  var nasc = /^\d{4}-\d{2}-\d{2}$/.test(String(d.nascimento || '')) ? d.nascimento : '';
  var extra = enderecoDe(d.endereco);
  if (d.comoConheceu) extra.como_conheceu = textoComoConheceu(d.comoConheceu);
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 15000);
  try {
    if (cpf) {
      if (buscarAluno(cpf)) throw new Error('Este CPF já tem cadastro.');
      adicionarLinha('Alunos', Object.assign({ cpf: cpf, nome: String(d.nome).trim(), whatsapp: soDigitos(d.whatsapp), email: String(d.email || '').trim().toLowerCase(),
        senha_hash: '', sal: '', criado_em: agoraTexto(), ativo: 'SIM', origem_cadastro: 'bancada', nascimento: nasc }, extra));
    } else {
      var w = normWhats(d.whatsapp);
      var ja = lerAba('Alunos').filter(function (a) { return a.cpf && normWhats(a.whatsapp) === w && ativoSim(a.ativo); })[0];
      if (ja) throw erroCod('Já existe cadastro com este WhatsApp: ' + ja.nome + '.', 'DUPLICADO', { cpf: normCpf(ja.cpf) });
      var nova = clienteSemCpf(String(d.nome).trim(), w, d.email, 'bancada (sem CPF)');
      cpf = normCpf(nova.cpf);
      if (nasc) extra.nascimento = nasc;
      if (Object.keys(extra).length) atualizarLinha('Alunos', nova._linha, extra);
    }
  } finally {
    trava.releaseLock();
  }
  registrar(m, 'cadastrou cliente', d.nome);
  var conviteEnviado = false;
  if (d.email && d.enviarConvite !== false && temCpfReal(cpf)) { enviarConviteAluno(buscarAluno(cpf)); conviteEnviado = true; }
  return { cpf: normCpf(cpf), conviteEnviado: conviteEnviado };
}

function enviarConviteAluno(a) {
  var link = criarLinkSenha('aluno', normCpf(a.cpf), a.email, 72, 'convite');
  enviarEmail(a.email, 'Sua área do aluno · Casa Âmbar', 'Bem-vinda à Casa Âmbar',
    ['Olá, ' + primeiroNome(a.nome) + '!', 'Seu cadastro na Casa Âmbar está pronto. Crie sua senha para reservar suas aulas, escolher o tapete e fazer o check-in pelo celular.',
      'O link vale por 3 dias. Depois, entre com seu CPF e a senha que criar.'], { texto: 'Criar minha senha', url: link });
}

function bancada_enviarLinkSenha(d, m) {
  var a = buscarAluno(d.cpf);
  if (!a) throw new Error('Aluno não encontrado.');
  if (!temCpfReal(a.cpf)) throw new Error('Cliente sem CPF não entra na área do aluno. Informe o CPF no cadastro primeiro.');
  if (!emailValido(a.email)) throw new Error('Este aluno não tem e-mail no cadastro. Cadastre o e-mail primeiro.');
  if (a.senha_hash) {
    var link = criarLinkSenha('aluno', normCpf(a.cpf), a.email, 24, 'recepção');
    enviarEmail(a.email, 'Crie uma nova senha · Casa Âmbar', 'Nova senha',
      ['Olá, ' + primeiroNome(a.nome) + '.', 'A recepção da Casa Âmbar enviou este link para você criar uma nova senha. Ele vale por 24 horas.'],
      { texto: 'Criar nova senha', url: link });
  } else {
    enviarConviteAluno(a);
  }
  registrar(m, 'enviou link de senha', a.nome);
  return { email: mascararEmail(a.email) };
}

// ============================================================
//  VENDAS NO BALCÃO E PAGAMENTOS
// ============================================================
function pagamentoPublico(p) {
  return { orderNsu: String(p.order_nsu), cpf: normCpf(p.cpf), nome: p.nome, planoId: p.plano_id, descricao: p.descricao, valor: numero(p.valor),
    valorOriginal: numero(p.valor_original) || numero(p.valor), desconto: numero(p.desconto), cupom: String(p.cupom || ''), vale: String(p.vale || ''),
    status: p.status, criadoEm: String(p.criado_em || ''), pagoEm: String(p.pago_em || ''), metodo: String(p.metodo || ''), parcelas: p.parcelas,
    valorPago: numero(p.valor_pago), origem: String(p.origem || 'site'), observacao: String(p.observacao || ''), recibo: String(p.recibo || ''),
    registradoPor: String(p.registrado_por || ''), bandeira: String(p.bandeira || '') };
}

// Venda registrada pela recepção (já recebida: Pix, dinheiro, cartão na maquininha...)
function registrarVenda(aluno, plano, o, membro) {
  var metodos = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Cortesia', 'Vale-presente', 'Link InfinitePay'];
  var metodo = metodos.indexOf(o.metodo) >= 0 ? o.metodo : '';
  if (!metodo) throw new Error('Escolha como foi pago.');
  var bandeira = bandeiraDe(metodo, o.bandeira, false);
  if (!plano) throw new Error('Item de venda não encontrado.');
  var cpf = soDigitos(aluno.cpf) ? normCpf(aluno.cpf) : '';
  var calc = calcularPreco(plano, cpf, o.codigo, { canal: 'bancada', data: /^\d{4}-\d{2}-\d{2}$/.test(String(o.inicio)) ? o.inicio : hojeTexto() });
  var valor = calc.valorFinal;
  var promocao = calc.promocao;
  var desconto = calc.desconto;
  if (o.valor != null && o.valor !== '' && !isNaN(numero(o.valor))) {
    // valor combinado no balcão
    valor = Math.max(0, numero(o.valor));
    desconto = Math.max(0, Math.round((plano.preco - valor) * 100) / 100);
    if (valor !== calc.valorFinal) promocao = '';
  }
  if (metodo === 'Cortesia') { desconto = plano.preco; valor = 0; }
  var nsu = novoNsu('B');
  adicionarLinha('Pagamentos', { order_nsu: nsu, cpf: cpf, nome: aluno.nome, plano_id: plano.id, descricao: plano.nome, valor: valor, status: 'pendente',
    criado_em: agoraTexto(), valor_original: plano.preco, desconto: desconto, cupom: calc.cupom, vale: calc.vale, vale_usado: calc.valeUsado,
    origem: 'balcão', registrado_por: membro.email, observacao: String(o.obs || '').slice(0, 300), promocao: promocao, tipo_item: plano.tipo === 'servico' || plano.tipo === 'pacote' ? plano.tipo : 'plano',
    bandeira: bandeira });
  SpreadsheetApp.flush();
  var inicioC = /^\d{4}-\d{2}-\d{2}$/.test(String(o.inicio)) ? o.inicio : hojeTexto();
  var creditoId = concluirPagamento(linhaPagamento(nsu), { metodo: metodo, parcelas: Number(o.parcelas) || 1, valor_pago: valor, inicio: inicioC,
    origemCredito: 'balcão', observacao: String(o.obs || '').slice(0, 300) });
  return { orderNsu: nsu, creditoId: creditoId, valor: valor, metodo: metodo };
}

function bancada_simularPreco(d) {
  var plano = buscarItemVenda(d.planoId);
  if (!plano) throw new Error('Plano não encontrado.');
  var r = calcularPreco(plano, d.cpf ? normCpf(d.cpf) : '', d.codigo, { canal: 'bancada', data: d.data });
  return { valorOriginal: r.valorOriginal, desconto: r.desconto, valorFinal: r.valorFinal, mensagem: r.mensagem, promocao: r.promocao };
}

function bancada_vender(d, m) {
  var aluno = buscarAluno(d.cpf);
  if (!aluno) throw new Error('Aluno não encontrado.');
  var plano = buscarItemVenda(d.planoId);
  if (!plano) throw new Error('Plano não encontrado.');
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 20000);
  try {
    var v = registrarVenda(aluno, plano, d, m);
    registrar(m, 'venda no balcão', aluno.nome + ' · ' + plano.nome + ' · R$ ' + v.valor + ' · ' + v.metodo);
    return v;
  } finally {
    trava.releaseLock();
  }
}

function bancada_pagamentos(d) {
  var de = String(d.de || somarDias(hojeTexto(), -30));
  var ate = String(d.ate || hojeTexto());
  var limite = Date.now() - PENDENTE_VALE_HORAS * 3600000;
  return lerAba('Pagamentos').map(function (p) {
    // link de pagamento antigo e não pago: aparece como expirado
    if (p.status === 'pendente' && new Date(String(p.criado_em).replace(' ', 'T') + '-03:00').getTime() < limite) p.status = 'expirado';
    return p;
  }).filter(function (p) {
    var dia = String(p.pago_em || p.criado_em).slice(0, 10);
    if (dia < de || dia > ate) return false;
    if (d.status && p.status !== d.status) return false;
    return true;
  }).map(pagamentoPublico).reverse();
}

// O estorno em si é feito na InfinitePay; aqui ele é registrado e o crédito é desativado
function bancada_estornar(d, m) {
  var pg = linhaPagamento(String(d.orderNsu));
  if (!pg) throw new Error('Pagamento não encontrado.');
  if (pg.status !== 'pago') throw new Error('Só pagamentos aprovados podem ser estornados.');
  atualizarLinha('Pagamentos', pg._linha, { status: 'estornado', observacao: ('ESTORNADO em ' + agoraTexto() + ' por ' + m.email + (d.motivo ? ': ' + d.motivo : '') + '. ' + (pg.observacao || '')).slice(0, 500) });
  var mc = mapaCreditos();
  var c = mc['C' + String(pg.order_nsu).slice(1)];
  if (c) atualizarLinha('Creditos', c._linha, { ativo: 'NÃO' });
  registrar(m, 'estorno', pg.nome + ' · ' + pg.descricao + ' · R$ ' + numero(pg.valor));
  return pagamentoPublico(linhaPagamento(pg.order_nsu));
}

function bancada_marcarDevolvido(d, m) {
  var pg = linhaPagamento(String(d.orderNsu));
  if (!pg) throw new Error('Pagamento não encontrado.');
  atualizarLinha('Pagamentos', pg._linha, { observacao: String(pg.observacao).replace(/^DEVOLVER/, 'DEVOLVIDO') + ' (registrado por ' + m.email + ' em ' + agoraTexto() + ')' });
  registrar(m, 'juros devolvidos', pg.nome + ' · ' + pg.order_nsu);
  return pagamentoPublico(linhaPagamento(pg.order_nsu));
}

function bancada_ajustarCredito(d, m) {
  var c = mapaCreditos()[String(d.creditoId)];
  if (!c) throw new Error('Crédito não encontrado.');
  var mud = {};
  if (d.fim && /^\d{4}-\d{2}-\d{2}$/.test(d.fim)) mud.fim = d.fim;
  if (d.ativo != null) mud.ativo = d.ativo ? 'SIM' : 'NÃO';
  atualizarLinha('Creditos', c._linha, mud);
  registrar(m, 'ajustou crédito', c.nome + ' · ' + c.descricao + ' · ' + JSON.stringify(mud));
  return true;
}

// ============================================================
//  VALES-PRESENTE (cortesia) E CUPONS
// ============================================================
function valePublico(v) {
  return { codigo: String(v.codigo), status: valeVencido(v) && v.status === 'ativo' ? 'vencido' : v.status, tipo: v.tipo, planoId: v.plano_id, descricao: descreverVale(v),
    valor: numero(v.valor), saldo: v.tipo === 'plano' ? null : saldoVale(v), cpf: v.cpf ? normCpf(v.cpf) : '', nome: v.nome, email: v.email,
    whatsapp: String(v.whatsapp || ''), motivo: v.motivo, campanha: v.campanha, mensagem: v.mensagem, criadoEm: String(v.criado_em || ''),
    criadoPor: v.criado_por, validade: dataTexto(v.validade || ''), resgatadoEm: String(v.resgatado_em || ''), enviado: String(v.enviado || ''),
    textoWhats: textoWhatsVale(v) };
}

function bancada_vales() {
  return lerAba('Vales').filter(function (v) { return v.codigo; }).map(valePublico).reverse();
}

// gera 1 ou vários vales (campanha). Cada pessoa: { nome, cpf, email, whatsapp }
function bancada_criarVales(d, m) {
  var tipo = d.tipo === 'valor' ? 'valor' : 'plano';
  var plano = tipo === 'plano' ? buscarItemVenda(d.planoId) : null;
  if (tipo === 'plano' && !plano) throw new Error('Escolha a aula ou o plano do vale.');
  var valor = tipo === 'valor' ? numero(d.valor) : 0;
  if (tipo === 'valor' && (valor < 1 || valor > 5000)) throw new Error('Informe o valor do vale.');
  var dias = Number(d.validadeDias) || AJUSTES.valeValidadeDias;
  var pessoas = (d.pessoas && d.pessoas.length ? d.pessoas : [{}]).slice(0, 200);
  var qtdSemNome = Math.min(Math.max(Number(d.quantidade) || 1, 1), 200);
  if (!(d.pessoas && d.pessoas.length) && qtdSemNome > 1) { pessoas = []; for (var q = 0; q < qtdSemNome; q++) pessoas.push({}); }
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 20000);
  var criados = [];
  try {
    pessoas.forEach(function (p) {
      var cpf = p.cpf ? soDigitos(p.cpf) : '';
      if (cpf && !cpfValido(cpf) && !buscarAluno(cpf)) throw new Error('CPF inválido: ' + p.cpf);
      var al = cpf ? buscarAluno(cpf) : null;
      var v = { codigo: gerarCodigoVale(), status: 'ativo', tipo: tipo, plano_id: plano ? plano.id : '', valor: plano ? plano.preco : valor,
        cpf: cpf ? normCpf(cpf) : '', nome: String(p.nome || (al ? al.nome : '')).trim(), email: String(p.email || (al ? al.email : '')).trim().toLowerCase(),
        whatsapp: soDigitos(p.whatsapp || (al ? al.whatsapp : '')), motivo: String(d.motivo || ''), campanha: String(d.campanha || ''),
        mensagem: String(d.mensagem || '').slice(0, 500), criado_em: agoraTexto(), criado_por: m.email, validade: somarDias(hojeTexto(), dias), enviado: '' };
      adicionarLinha('Vales', v);
      criados.push(v);
    });
    SpreadsheetApp.flush();
  } finally {
    trava.releaseLock();
  }
  var enviados = 0;
  if (d.enviarEmail) {
    criados.forEach(function (v) {
      if (!emailValido(v.email)) return;
      enviarEmailVale(v);
      var achado = acharVale(v.codigo);
      if (achado) atualizarLinha('Vales', achado._linha, { enviado: 'e-mail ' + agoraTexto() });
      enviados++;
    });
  }
  registrar(m, 'gerou vales', criados.length + ' × ' + (plano ? plano.nome : 'R$ ' + valor) + (d.campanha ? ' · ' + d.campanha : ''));
  return { vales: criados.map(function (v) { return valePublico(acharVale(v.codigo)); }), emailsEnviados: enviados };
}

function bancada_enviarVale(d, m) {
  var v = acharVale(d.codigo);
  if (!v) throw new Error('Vale não encontrado.');
  var email = String(d.email || v.email || '').trim().toLowerCase();
  if (d.canal === 'email') {
    if (!emailValido(email)) throw new Error('Informe o e-mail.');
    if (email !== v.email) atualizarLinha('Vales', v._linha, { email: email });
    v.email = email;
    enviarEmailVale(v);
  }
  var marca = (d.canal === 'email' ? 'e-mail' : d.canal === 'whatsapp' ? 'WhatsApp' : 'balcão') + ' ' + agoraTexto();
  atualizarLinha('Vales', v._linha, { enviado: marca });
  registrar(m, 'entregou vale', v.codigo + ' · ' + marca);
  return valePublico(acharVale(v.codigo));
}

function bancada_cancelarVale(d, m) {
  var v = acharVale(d.codigo);
  if (!v) throw new Error('Vale não encontrado.');
  if (v.status === 'resgatado' || v.status === 'usado') throw new Error('Este vale já foi usado.');
  atualizarLinha('Vales', v._linha, { status: 'cancelado' });
  registrar(m, 'cancelou vale', v.codigo);
  return valePublico(acharVale(v.codigo));
}

// balcão: aplica o vale direto na conta do aluno
function bancada_aplicarVale(d, m) {
  var aluno = buscarAluno(d.cpf);
  if (!aluno) throw new Error('Aluno não encontrado.');
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 15000);
  try {
    var r = aplicarVale(aluno, d.codigo, m.email);
    registrar(m, 'aplicou vale', d.codigo + ' · ' + aluno.nome);
    return r;
  } finally {
    trava.releaseLock();
  }
}

function cupomPublico(c, pagos) {
  var u = usosCupom(c.codigo, '', pagos);
  return { codigo: codigoLimpo(c.codigo), ativo: String(c.ativo).toUpperCase() !== 'NÃO', tipo: c.tipo, valor: numero(c.valor), modalidade: c.modalidade || 'Todas',
    tipoPlano: c.tipo_plano || 'todos', inicio: c.inicio ? dataTexto(c.inicio) : '', fim: c.fim ? dataTexto(c.fim) : '', limiteTotal: numero(c.limite_total),
    limitePorAluno: numero(c.limite_por_aluno), primeiraCompra: String(c.primeira_compra).toUpperCase() === 'SIM', descricao: c.descricao || '',
    usos: u.total, descontoTotal: u.desconto, criadoPor: c.criado_por, vencido: !!(c.fim && dataTexto(c.fim) < hojeTexto()) };
}

function bancada_cupons() {
  var pagos = pagamentosPagos();
  return lerAba('Cupons').filter(function (c) { return c.codigo; }).map(function (c) { return cupomPublico(c, pagos); }).reverse();
}

function bancada_salvarCupom(d, m) {
  var c = d.cupom || {};
  var codigo = codigoLimpo(c.codigo);
  if (!/^[A-Z0-9_-]{3,30}$/.test(codigo)) throw new Error('Código do cupom: 3 a 30 letras ou números, sem espaços.');
  if (/^AMBAR-/.test(codigo)) throw new Error('Códigos que começam com AMBAR- são dos vales-presente.');
  var tipo = c.tipo === 'valor' ? 'valor' : 'percentual';
  var valor = numero(c.valor);
  if (valor <= 0 || (tipo === 'percentual' && valor > 100)) throw new Error('Informe o desconto.');
  var linha = { codigo: codigo, ativo: c.ativo === false ? 'NÃO' : 'SIM', tipo: tipo, valor: valor, modalidade: c.modalidade || 'Todas', tipo_plano: c.tipoPlano || 'todos',
    inicio: c.inicio || '', fim: c.fim || '', limite_total: numero(c.limiteTotal) || '', limite_por_aluno: numero(c.limitePorAluno) || '',
    primeira_compra: c.primeiraCompra ? 'SIM' : 'NÃO', descricao: String(c.descricao || '').slice(0, 200) };
  var existente = acharCupom(codigo);
  if (existente) {
    atualizarLinha('Cupons', existente._linha, linha);
  } else {
    linha.criado_por = m.email;
    linha.criado_em = agoraTexto();
    adicionarLinha('Cupons', linha);
  }
  registrar(m, existente ? 'editou cupom' : 'criou cupom', codigo);
  return cupomPublico(acharCupom(codigo));
}

// ============================================================
//  GRADE, BLOQUEIOS E CATÁLOGO
// ============================================================
function bancada_bloqueios() {
  var hoje = hojeTexto();
  return lerAba('Bloqueios').map(function (b) {
    return { linha: b._linha, data: dataTexto(b.data), hora: horaTexto(b.hora), modalidade: String(b.modalidade || ''), motivo: String(b.motivo || '') };
  }).filter(function (b) { return b.data >= hoje; }).sort(function (a, b) { return (a.data + a.hora).localeCompare(b.data + b.hora); });
}

// bloqueia um dia inteiro, uma modalidade no dia ou uma aula. Cancela as reservas e devolve quem avisar.
function bancada_bloquear(d, m) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.data))) throw new Error('Informe a data.');
  var hora = d.hora ? horaTexto(d.hora) : '';
  var mod = d.modalidade || '';
  adicionarLinha('Bloqueios', { data: d.data, hora: hora, modalidade: mod, motivo: String(d.motivo || '').slice(0, 200) });
  var alunos = mapaAlunos();
  var afetados = [];
  reservasAtivas().forEach(function (r) {
    partesAula(r);
    if (r.data !== d.data) return;
    if (hora && r.hora !== hora) return;
    if (mod && String(r.modalidade).toLowerCase() !== String(mod).toLowerCase()) return;
    atualizarLinha('Reservas', r._linha, { status: 'cancelado', cancelada_em: agoraTexto() });
    var a = alunos[normCpf(r.cpf)] || {};
    afetados.push({ nome: r.nome, whatsapp: String(a.whatsapp || ''), aula: r.modalidade + ' ' + r.hora });
  });
  registrar(m, 'bloqueou', d.data + ' ' + (hora || 'dia todo') + ' ' + (mod || 'todas') + ' · ' + (d.motivo || '') + ' · ' + afetados.length + ' reservas canceladas');
  return { afetados: afetados };
}

function bancada_desbloquear(d, m) {
  var s = aba('Bloqueios');
  var linha = Number(d.linha);
  if (linha < 2 || linha > s.getLastRow()) throw new Error('Bloqueio não encontrado.');
  s.deleteRow(linha);
  registrar(m, 'desbloqueou', 'linha ' + linha);
  return true;
}

function bancada_grade() {
  return lerAba('Grade').filter(function (g) { return String(g.modalidade || '').trim(); }).map(function (g) {
    return { ativo: String(g.ativo).toUpperCase() !== 'NÃO', modalidade: String(g.modalidade), dia: Number(g.dia_semana), hora: horaTexto(g.hora),
      professor: String(g.professor), capacidade: Number(g.capacidade) || 0 };
  });
}

function bancada_salvarGrade(d, m) {
  var linhas = (d.linhas || []).map(function (g) {
    if (['Yoga', 'Pilates'].indexOf(g.modalidade) < 0) throw new Error('Modalidade inválida.');
    var h = horaTexto(g.hora);
    if (!/^\d{2}:\d{2}$/.test(h)) throw new Error('Horário inválido: ' + g.hora);
    var dia = Number(g.dia);
    if (!(dia >= 0 && dia <= 6)) throw new Error('Dia inválido.');
    return [g.ativo === false ? 'NÃO' : 'SIM', g.modalidade, dia, h, String(g.professor || '').trim(), Math.max(1, Number(g.capacidade) || (g.modalidade === 'Yoga' ? 12 : 4))];
  });
  if (!linhas.length) throw new Error('A grade não pode ficar vazia.');
  var s = aba('Grade');
  var trava = LockService.getScriptLock();
  esperarTrava(trava, 15000);
  try {
    // limpa as linhas antigas (o Sheets não deixa apagar todas) e grava a grade nova
    if (s.getLastRow() > 1) s.getRange(2, 1, s.getLastRow() - 1, 6).clearContent();
    s.getRange('D:D').setNumberFormat('@');
    s.getRange(2, 1, linhas.length, 6).setValues(linhas);
  } finally {
    trava.releaseLock();
  }
  registrar(m, 'editou a grade', linhas.length + ' horários');
  return bancada_grade();
}

function bancada_planos() {
  var linhas = lerAba('Planos');
  if (!linhas.length) listarPlanos();
  return lerAba('Planos').filter(function (p) { return p.id; }).map(function (p) {
    return { id: String(p.id), ativo: String(p.ativo).toUpperCase() !== 'NÃO', modalidade: p.modalidade, tipo: p.tipo, nome: p.nome, aulasSemana: numero(p.aulas_semana),
      aulasTotal: numero(p.aulas_total), validadeDias: numero(p.validade_dias), preco: numero(p.preco), descricao: p.descricao, semJurosAte: semJurosAte(p) };
  });
}

function bancada_salvarPlano(d, m) {
  var p = d.plano || {};
  var id = String(p.id || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  if (!id) throw new Error('Informe o código do plano.');
  if (['Yoga', 'Pilates'].indexOf(p.modalidade) < 0) throw new Error('Modalidade inválida.');
  if (['avulsa', 'mensal', 'trimestral'].indexOf(p.tipo) < 0) throw new Error('Tipo inválido.');
  if (!(numero(p.preco) > 0)) throw new Error('Informe o preço.');
  var linha = { id: id, ativo: p.ativo === false ? 'NÃO' : 'SIM', modalidade: p.modalidade, tipo: p.tipo, nome: String(p.nome || '').trim(),
    aulas_semana: p.tipo === 'avulsa' ? 0 : numero(p.aulasSemana), aulas_total: p.tipo === 'avulsa' ? Math.max(1, numero(p.aulasTotal) || 1) : 0,
    validade_dias: numero(p.validadeDias) || (p.tipo === 'trimestral' ? 90 : 30), preco: numero(p.preco), descricao: String(p.descricao || ''),
    sem_juros_ate: numero(p.semJurosAte) || '' };
  if (!linha.nome) throw new Error('Informe o nome do plano.');
  var existente = lerAba('Planos').filter(function (x) { return String(x.id) === id; })[0];
  if (existente) atualizarLinha('Planos', existente._linha, linha);
  else adicionarLinha('Planos', linha);
  registrar(m, existente ? 'editou plano' : 'criou plano', id + ' · R$ ' + linha.preco);
  return bancada_planos();
}

// ============================================================
//  EQUIPE, AJUSTES E REGISTRO
// ============================================================
function bancada_equipe() {
  return lerAba('Equipe').filter(function (x) { return x.email; }).map(function (x) {
    var p = membroPublico(x);
    p.ativo = String(x.ativo).toUpperCase() !== 'NÃO';
    p.ultimoAcesso = String(x.ultimo_acesso || '');
    p.temSenha = !!x.senha_hash;
    return p;
  });
}

function bancada_salvarMembro(d, m) {
  var x = d.membro || {};
  var email = String(x.email || '').trim().toLowerCase();
  if (!emailValido(email)) throw new Error('E-mail inválido.');
  if (['admin', 'recepcao', 'professora'].indexOf(x.papel) < 0) throw new Error('Escolha o tipo de acesso.');
  if (!String(x.nome || '').trim()) throw new Error('Informe o nome.');
  var existente = buscarMembro(email);
  var ativo = x.ativo === false ? 'NÃO' : 'SIM';
  if (existente && existente.papel === 'admin' && (x.papel !== 'admin' || ativo === 'NÃO')) {
    var outros = lerAba('Equipe').filter(function (y) { return y.papel === 'admin' && String(y.ativo).toUpperCase() !== 'NÃO' && String(y.email).toLowerCase() !== email; });
    if (!outros.length) throw new Error('A bancada precisa ter pelo menos um administrador ativo.');
  }
  var linha = { email: email, nome: String(x.nome).trim(), papel: x.papel, professor_nome: x.papel === 'professora' ? String(x.professorNome || x.nome).trim() : '', ativo: ativo };
  var convite = false;
  if (existente) {
    atualizarLinha('Equipe', existente._linha, linha);
    esquecerSessoesEmCache(email);
    if (ativo === 'NÃO') encerrarSessoes('SessoesEquipe', 'e_', email);
    if (x.reenviarConvite) { enviarConviteEquipe(buscarMembro(email)); convite = true; }
  } else {
    linha.criado_em = agoraTexto();
    adicionarLinha('Equipe', linha);
    enviarConviteEquipe(buscarMembro(email));
    convite = true;
  }
  registrar(m, existente ? 'editou acesso' : 'criou acesso', email + ' · ' + x.papel + ' · ' + ativo);
  return { equipe: bancada_equipe(), conviteEnviado: convite };
}

function bancada_ajustes() {
  return { diasVisiveis: AJUSTES.diasVisiveis, checkinAbreMinAntes: AJUSTES.checkinAbreMinAntes, cancelarAteHorasAntes: AJUSTES.cancelarAteHorasAntes,
    reservaPendenteMin: AJUSTES.reservaPendenteMin, valeValidadeDias: AJUSTES.valeValidadeDias, wellhubAtivo: AJUSTES.wellhub.ativo,
    wellhubReservasPorDia: AJUSTES.wellhub.reservasPorDia, wellhubPendentePodeReservar: AJUSTES.wellhub.pendentePodeReservar !== false, pagamentoComChave: !!chaveInfinitePay(), versao: VERSAO,
    lembreteServicos: AJUSTES.lembreteServicos !== false, lembreteAulas: !!AJUSTES.lembreteAulas,
    ultimosLembretes: PropertiesService.getScriptProperties().getProperty('LEMBRETES_ULTIMO') || '',
    emailsRestantes: (function () { try { return MailApp.getRemainingDailyQuota(); } catch (e) { return null; } })() };
}

function bancada_salvarAjustes(d, m) {
  var a = d.ajustes || {};
  var limites = { diasVisiveis: [1, 60], checkinAbreMinAntes: [5, 240], cancelarAteHorasAntes: [0, 72], reservaPendenteMin: [5, 120], valeValidadeDias: [7, 730],
    wellhubReservasPorDia: [1, 5] };
  var salvar = {};
  AJUSTES_EDITAVEIS.forEach(function (k) {
    if (a[k] == null) return;
    if (k === 'wellhubAtivo' || k === 'wellhubPendentePodeReservar' || k === 'lembreteServicos' || k === 'lembreteAulas') { salvar[k] = !!a[k]; return; }
    var n = Number(a[k]);
    if (isNaN(n) || n < limites[k][0] || n > limites[k][1]) throw new Error('Valor fora do limite em ' + k + ' (' + limites[k][0] + ' a ' + limites[k][1] + ').');
    salvar[k] = n;
  });
  var props = PropertiesService.getScriptProperties();
  var atual = {};
  try { atual = JSON.parse(props.getProperty('AJUSTES_JSON') || '{}') || {}; } catch (e) { atual = {}; }
  Object.keys(salvar).forEach(function (k) { atual[k] = salvar[k]; });
  props.setProperty('AJUSTES_JSON', JSON.stringify(atual));
  _ajustesAplicados = false;
  aplicarAjustesSalvos();
  registrar(m, 'mudou ajustes', JSON.stringify(salvar));
  return bancada_ajustes();
}

function bancada_registro(d) {
  var lista = lerAba('Registro');
  return lista.slice(-300).reverse().map(function (r) { return { quando: String(r.quando), quem: String(r.quem), acao: String(r.acao), detalhe: String(r.detalhe) }; });
}
